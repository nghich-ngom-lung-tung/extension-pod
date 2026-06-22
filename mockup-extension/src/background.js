// Import shared i18n dictionary (sets globalThis.SfrankieI18n)
importScripts('i18n.js');

const I18N = globalThis.SfrankieI18n;
const t = (key, params) => I18N.t(key, params);

// Sync saved language preference on startup
chrome.storage?.local?.get('sfrankie_lang', data => {
  if (data?.sfrankie_lang) I18N.setLang(data.sfrankie_lang);
});
// Live-update when the panel changes language
chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === 'local' && changes.sfrankie_lang) {
    I18N.setLang(changes.sfrankie_lang.newValue);
  }
});

// Handle extension action click: Focus target Custom GPT tab and toggle pop-up visibility
chrome.action.onClicked.addListener(async (tab) => {
  try {
    const tabId = await ensureGptTab();
    // Wait a brief moment to allow the tab focus state to align, then send toggle message
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_POPUP' }).catch((err) => {
        void err;
      });
    }, 500);
  } catch (error) {
    console.error("Error on action click:", error);
  }
});

const CUSTOM_GPT_ID = "g-6a35232cf06481918c6fcb52f909d9c8";
const CUSTOM_GPT_URL = "https://chatgpt.com/g/g-6a35232cf06481918c6fcb52f909d9c8-sfrankie-gpt-mockup-luxury";

// Captured results survive a panel/tab reload that lands between generation
// finishing and the panel receiving it (e.g. the refresh-and-retry flow).
const RESULT_KEY_PREFIX = 'sfrankie_mockup_result_';
const RESULT_TTL_MS = 60 * 60 * 1000; // keep unclaimed results for 1h

async function storeResult(taskId, imageUrls) {
  if (!chrome.storage?.local || !Array.isArray(imageUrls) || imageUrls.length === 0) return;
  try {
    const all = await chrome.storage.local.get(null);
    const now = Date.now();
    const stale = Object.keys(all).filter(key => {
      if (!key.startsWith(RESULT_KEY_PREFIX)) return false;
      const entry = all[key];
      return !entry || typeof entry.ts !== 'number' || now - entry.ts > RESULT_TTL_MS;
    });
    if (stale.length) await chrome.storage.local.remove(stale);
    await chrome.storage.local.set({ [RESULT_KEY_PREFIX + taskId]: { imageUrls, ts: now } });
  } catch (_) { /* storage unavailable */ }
}

// Log/status update relay helper
function relayProgress(percent, text, status = 'info', taskId = null) {
  chrome.runtime.sendMessage({
    type: 'MOCKUP_PROGRESS',
    taskId: taskId,
    percent: percent,
    text: text,
    status: status
  }, () => void chrome.runtime.lastError);
}

// Function to send message to tab with retry logic
async function sendMessageToTabWithRetry(tabId, message, maxRetries = 15) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check if tab still exists
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        throw new Error(t('err.tabClosed'));
      }
      
      const response = await chrome.tabs.sendMessage(tabId, message);
      return response;
    } catch (err) {
      relayProgress(
        15 + (i * 2),
        t('prog.connecting', { i: i + 1 }),
        'info',
        message.taskId
      );
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }
  throw new Error(t('err.noContentScript'));
}

// Helper to ensure target Custom GPT tab is open and focused
async function ensureGptTab() {
  const tabs = await chrome.tabs.query({ url: "*://chatgpt.com/*" });
  const staleWorkerTabs = tabs.filter(tab => (
    tab.url?.includes(CUSTOM_GPT_ID) &&
    tab.url.includes('#sfrankie-worker')
  ));
  for (const staleTab of staleWorkerTabs) {
    try {
      await chrome.tabs.remove(staleTab.id);
    } catch (_) { /* already closed */ }
  }

  const targetTab = tabs
    .filter(tab => tab.url?.includes(CUSTOM_GPT_ID) && !tab.url.includes('#sfrankie-worker'))
    .sort((a, b) => Number(b.active) - Number(a.active))[0] || null;
  
  let tabId = null;
  if (targetTab) {
    tabId = targetTab.id;
    await chrome.tabs.update(tabId, { active: true });
    if (targetTab.windowId) {
      await chrome.windows.update(targetTab.windowId, { focused: true });
    }
  } else {
    const newTab = await chrome.tabs.create({ url: CUSTOM_GPT_URL, active: true });
    tabId = newTab.id;
  }
  return tabId;
}

async function waitForTabComplete(tabId, timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(t('err.pageLoadTimeout'));
}

// Handle messages from SidePanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'START_MOCKUP_TASK') {
    handleMockupTask(request);
    sendResponse({ status: 'started' });
  } else if (request.type === 'ENSURE_GPT_TAB') {
    ensureGptTab();
    sendResponse({ status: 'ensured' });
  } else if (request.type === 'REQUEST_GPT_REFRESH_AND_RETRY') {
    refreshAndRetryTask(request.task);
    sendResponse({ status: 'refreshing' });
  } else if (request.type === 'MOCKUP_DONE' && request.taskId) {
    storeResult(request.taskId, request.imageUrls || []);
  }
  return true; // Keep message channel open for async operations
});

async function refreshAndRetryTask(taskData) {
  try {
    relayProgress(65, t('prog.refreshing'), 'info', taskData.taskId);
    const tabId = await ensureGptTab();
    await chrome.tabs.reload(tabId);
    await waitForTabComplete(tabId, 70000);
    await new Promise(resolve => setTimeout(resolve, 2500));
    relayProgress(68, t('prog.refreshed'), 'info', taskData.taskId);
    await sendMessageToTabWithRetry(tabId, {
      ...taskData,
      type: 'EXECUTE_MOCKUP',
      recoveredAfterRefresh: true
    }, 20);
  } catch (error) {
    console.error("Refresh retry error:", error);
    relayProgress(0, t('err.refreshFail', { msg: error.message }), 'error', taskData.taskId);
  }
}

// Main orchestrator for mockup-generation tasks
async function handleMockupTask(taskData) {
  try {
    relayProgress(15, t('prog.checkingTabs'), 'info', taskData.taskId);
    const tabId = await ensureGptTab();
    relayProgress(25, t('prog.locatedTab'), 'info', taskData.taskId);
    await waitForTabComplete(tabId, 30000);
    relayProgress(45, t('prog.pageLoaded'), 'info', taskData.taskId);
    
    // Send task parameters to content.js inside that tab
    await sendMessageToTabWithRetry(tabId, {
      type: 'EXECUTE_MOCKUP',
      taskId: taskData.taskId,
      sources: taskData.sources,
      mode: taskData.mode,
      count: taskData.count,
      productType: taskData.productType,
      productColor: taskData.productColor,
      customColor: taskData.customColor,
      sceneStyle: taskData.sceneStyle,
      customContext: taskData.customContext
    });
    
    relayProgress(60, t('prog.dataSent'), 'info', taskData.taskId);
    
  } catch (error) {
    console.error("Automation error in background:", error);
    relayProgress(0, t('prog.failed', { msg: error.message }), 'error', taskData.taskId);
  }
}
