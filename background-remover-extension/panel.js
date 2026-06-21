const BACKGROUND_REMOVER = globalThis.SfrankieBackgroundRemover;
const I18N = globalThis.SfrankieI18n;

// Initialize language from the panel's own synchronous store so the first paint
// is already localized (chrome.storage is async). Chosen language is mirrored to
// chrome.storage so the content + background contexts stay in sync.
let currentLang = localStorage.getItem('sfrankie_lang') === 'en' ? 'en' : 'vi';
I18N.setLang(currentLang);

const t = (key, params) => I18N.t(key, params);

/* ── i18n DOM updater ───────────────── */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  // Keep <html lang> in sync
  document.documentElement.lang = currentLang;
}

function setLang(newLang) {
  currentLang = I18N.setLang(newLang);
  localStorage.setItem('sfrankie_lang', currentLang);
  // Mirror to chrome.storage so content-script + background stay in sync
  chrome.storage?.local?.set({ sfrankie_lang: currentLang });
  applyI18n();
  refreshConnText();
  renderQueue();
}

let queueItems = [];
let activeTaskId = null;
let activeQueueItemId = null;
let isQueueRunning = false;
let isDownloadingAll = false;
let batchSettings = null;
let selectedResultItemId = null;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const queueCard = document.getElementById('queue-card');
const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const targetWidthInput = document.getElementById('target-width');
const targetHeightInput = document.getElementById('target-height');
const startBtn = document.getElementById('start-btn');
const processCard = document.getElementById('process-card');
const processStatusText = document.getElementById('process-status-text');
const processPercentText = document.getElementById('process-percent-text');
const progressBar = document.getElementById('progress-bar');
const logConsole = document.getElementById('log-console');
const resultCard = document.getElementById('result-card');
const downloadBtn = document.getElementById('download-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function logMessage(text, type = 'info') {
  const time = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const logItem = document.createElement('div');
  logItem.className = 'log-line';

  const spanTime = document.createElement('span');
  spanTime.className = 'log-item timestamp';
  spanTime.textContent = `[${time}] `;

  const spanText = document.createElement('span');
  spanText.className = `log-item ${type}`;
  spanText.textContent = text;

  logItem.appendChild(spanTime);
  logItem.appendChild(spanText);
  logConsole.appendChild(logItem);
  logConsole.scrollTop = logConsole.scrollHeight;
}

let connState = 'idle';

function refreshConnText() {
  connDot.className = `status-indicator ${connState}`;
  const key = connState === 'error' ? 'status.error'
    : connState === 'active' ? 'status.processing'
    : 'status.ready';
  connText.textContent = t(key);
}

function updateProgress(percent, statusText, isError = false) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  progressBar.style.width = `${safePercent}%`;
  processPercentText.textContent = `${safePercent}%`;
  if (statusText != null) processStatusText.textContent = statusText;

  connState = isError ? 'error' : (safePercent > 0 && safePercent < 100 ? 'active' : 'idle');
  refreshConnText();
}

function getCompletedItems() {
  return queueItems.filter(item => item.status === 'done' && item.resultDataUrl);
}

function getLatestCompletedItem() {
  return [...queueItems].reverse().find(item => item.status === 'done' && !item.isVariant) || null;
}

function getRunnableCount() {
  return queueItems.filter(item => item.status === 'pending' || item.status === 'error').length;
}

function resultItemLabel(item, index) {
  const fileName = item.file?.name || `Result ${index + 1}`;
  const dotIndex = fileName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return item.isVariant
    ? `#${index + 1} ${baseName} v${item.variantIndex}`
    : `#${index + 1} ${baseName}`;
}

function getSelectedCompletedItem() {
  const selected = getCompletedItems().find(item => item.id === selectedResultItemId);
  return selected || getLatestCompletedItem();
}

function showCompletedGallery() {
  const completedItems = getCompletedItems();
  if (completedItems.length === 0) {
    selectedResultItemId = null;
    const wrapper = resultCard.querySelector('.result-preview-wrapper');
    if (wrapper) wrapper.innerHTML = '';
    resultCard.classList.add('hidden');
    return;
  }

  const wrapper = resultCard.querySelector('.result-preview-wrapper');
  if (!wrapper) return;

  if (!completedItems.some(item => item.id === selectedResultItemId)) {
    selectedResultItemId = completedItems[completedItems.length - 1].id;
  }

  wrapper.innerHTML = '';
  completedItems.forEach((item, index) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `result-gallery-cell${item.id === selectedResultItemId ? ' selected' : ''}`;
    cell.dataset.itemId = item.id;
    cell.title = t('title.selectResult', { name: item.file?.name || `result ${index + 1}` });

    const label = document.createElement('div');
    label.className = 'result-gallery-label';
    label.textContent = resultItemLabel(item, index);

    const img = document.createElement('img');
    img.src = item.resultDataUrl;
    img.alt = resultItemLabel(item, index);

    cell.appendChild(label);
    cell.appendChild(img);
    wrapper.appendChild(cell);
  });

  resultCard.classList.remove('hidden');
}

function showLatestResult(item = getLatestCompletedItem()) {
  if (item?.resultDataUrl) {
    selectedResultItemId = item.id;
  }
  showCompletedGallery();
}

function statusLabel(item) {
  if (item.status === 'processing') return t('qstatus.processing');
  if (item.status === 'done') return item.isVariant ? t('qstatus.variant', { n: item.variantIndex }) : t('qstatus.completed');
  if (item.status === 'error') return item.error || t('qstatus.failed');
  return t('qstatus.queued');
}

/* ── Queue persistence ──────────────────
   The queue lives in this iframe's memory, so closing the popup would normally
   wipe it. Mirror it to chrome.storage.local so completed results survive a
   reopen. File blobs are not serializable, so we keep only {name, type} plus
   the already-stored base64 data URLs. */
const QUEUE_STORAGE_KEY = 'sfrankie_bg_queue';
const RESULT_KEY_PREFIX = 'sfrankie_bg_result_';

function serializeQueue() {
  return queueItems.map(item => ({
    ...item,
    file: { name: item.file?.name || '', type: item.file?.type || '' }
  }));
}

let persistTimer = null;
function persistQueue() {
  // Debounce: renderQueue() fires several times per item during a batch, and each
  // write serializes the whole (base64-heavy) queue. Coalesce bursts into one write.
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      chrome.storage?.local?.set(
        { [QUEUE_STORAGE_KEY]: serializeQueue() },
        () => void chrome.runtime.lastError
      );
    } catch (_) { /* storage unavailable */ }
  }, 400);
}

// Apply a captured result set to an item (mirrors completeActiveItem without the
// blank-frame filtering, which the live path already ran before the result was stored).
function applyResultToItem(item, imageUrls) {
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return false;
  item.status = 'done';
  item.error = null;
  item.taskId = null;
  item.resultDataUrl = imageUrls[0];
  queueItems = queueItems.filter(c => !c.isVariant || c.parentItemId !== item.id);
  if (imageUrls.length > 1) {
    const extras = imageUrls.slice(1).map((url, idx) => ({
      id: createId('variant'),
      taskId: null,
      file: item.file,
      fileDataUrl: item.fileDataUrl,
      resultDataUrl: url,
      styleKey: item.styleKey,
      mode: item.mode,
      status: 'done',
      error: null,
      outputWidth: item.outputWidth,
      outputHeight: item.outputHeight,
      isVariant: true,
      parentItemId: item.id,
      variantIndex: idx + 2
    }));
    const at = queueItems.findIndex(q => q.id === item.id);
    queueItems.splice(at + 1, 0, ...extras);
  }
  return true;
}

async function recoverInterruptedItems() {
  // Items still "processing" when the panel reloaded may have finished in the
  // background. Claim any captured result; otherwise reset to pending so the
  // user can re-run them.
  const interrupted = queueItems.filter(it => it.status === 'processing');
  for (const item of interrupted) {
    let recovered = false;
    if (item.taskId && chrome.storage?.local) {
      try {
        const key = RESULT_KEY_PREFIX + item.taskId;
        const data = await chrome.storage.local.get(key);
        void chrome.runtime.lastError;
        const entry = data?.[key];
        if (entry && Array.isArray(entry.imageUrls) && entry.imageUrls.length > 0) {
          recovered = applyResultToItem(item, entry.imageUrls);
          chrome.storage.local.remove(key, () => void chrome.runtime.lastError);
        }
      } catch (_) { /* ignore */ }
    }
    if (!recovered) {
      item.status = 'pending';
      item.taskId = null;
      item.error = null;
    }
  }
}

function restoreQueue(done) {
  if (!chrome.storage?.local) { done(); return; }
  chrome.storage.local.get(QUEUE_STORAGE_KEY, data => {
    void chrome.runtime.lastError;
    const saved = data?.[QUEUE_STORAGE_KEY];
    if (!Array.isArray(saved) || saved.length === 0) { done(); return; }
    queueItems = saved;
    recoverInterruptedItems().then(() => {
      const lastDone = [...queueItems]
        .reverse()
        .find(candidate => candidate.status === 'done' && !candidate.isVariant);
      selectedResultItemId = lastDone ? lastDone.id : null;
      done();
    });
  });
}

function renderQueue() {
  queueList.innerHTML = '';
  queueCard.classList.toggle('hidden', queueItems.length === 0);

  const sourceItems = queueItems.filter(item => !item.isVariant);
  const doneCount = sourceItems.filter(item => item.status === 'done').length;
  const variantCount = queueItems.filter(item => item.isVariant).length;
  queueCount.textContent = `${doneCount}/${sourceItems.length}${variantCount > 0 ? ` +${variantCount}` : ''}`;

  for (const item of queueItems) {
    const row = document.createElement('div');
    row.className = `queue-item ${item.status}${item.isVariant ? ' variant' : ''}`;
    row.dataset.itemId = item.id;

    const thumb = document.createElement('img');
    thumb.className = 'queue-thumb';
    thumb.src = item.resultDataUrl || item.fileDataUrl;
    thumb.alt = item.file.name;

    const meta = document.createElement('div');
    meta.className = 'queue-meta';

    const name = document.createElement('div');
    name.className = 'queue-name';
    name.textContent = item.file.name;
    name.title = item.file.name;

    const status = document.createElement('div');
    status.className = 'queue-status';
    status.textContent = statusLabel(item);
    status.title = item.error || '';

    meta.appendChild(name);
    meta.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'queue-actions';

    if (item.status === 'done') {
      const download = document.createElement('button');
      download.type = 'button';
      download.className = 'queue-action-btn';
      download.dataset.action = 'download';
      download.dataset.itemId = item.id;
      download.textContent = 'DL';
      download.title = t('title.download');
      actions.appendChild(download);

      if (!item.isVariant) {
        const rework = document.createElement('button');
        rework.type = 'button';
        rework.className = 'queue-action-btn queue-rework-btn';
        rework.dataset.action = 'rework';
        rework.dataset.itemId = item.id;
        rework.textContent = 'RW';
        rework.title = t('title.rework');
        rework.disabled = isQueueRunning;
        actions.appendChild(rework);
      }
    }

    if (item.status !== 'processing') {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'queue-action-btn';
      remove.dataset.action = 'remove';
      remove.dataset.itemId = item.id;
      remove.textContent = 'X';
      remove.title = t('title.remove');
      actions.appendChild(remove);
    }

    row.appendChild(thumb);
    row.appendChild(meta);
    row.appendChild(actions);
    queueList.appendChild(row);
  }

  updateActionState();
  persistQueue();
}

function updateActionState() {
  const completedCount = getCompletedItems().length;
  startBtn.disabled = isQueueRunning || getRunnableCount() === 0;
  clearQueueBtn.disabled = isQueueRunning || queueItems.length === 0;
  downloadBtn.disabled = completedCount === 0;
  downloadAllBtn.disabled = completedCount === 0 || isDownloadingAll;

  targetWidthInput.disabled = isQueueRunning;
  targetHeightInput.disabled = isQueueRunning;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error(t('err.readFile', { name: file.name })));
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
  if (files.length === 0) {
    logMessage(t('log.invalidImage'), 'error');
    return;
  }

  const newItems = [];
  for (const file of files) {
    try {
      const fileDataUrl = await fileToDataUrl(file);
      newItems.push({
        id: createId('item'),
        taskId: null,
        file,
        fileDataUrl,
        resultDataUrl: null,
        mode: BACKGROUND_REMOVER.mode,
        styleKey: 'balanced',
        status: 'pending',
        error: null,
        outputWidth: null,
        outputHeight: null
      });
    } catch (error) {
      logMessage(error.message, 'error');
    }
  }

  queueItems.push(...newItems);
  if (newItems.length > 0) {
    logMessage(t(isQueueRunning ? 'log.addedRunning' : 'log.added', { n: newItems.length }));
  }
  renderQueue();
}

function removeQueueItem(itemId) {
  const item = queueItems.find(candidate => candidate.id === itemId);
  if (!item || item.status === 'processing') return;

  queueItems = queueItems.filter(candidate => (
    candidate.id !== itemId &&
    candidate.parentItemId !== itemId
  ));
  showLatestResult();
  renderQueue();
}

function reworkQueueItem(itemId) {
  const item = queueItems.find(candidate => candidate.id === itemId && !candidate.isVariant);
  if (!item || item.status === 'processing' || isQueueRunning) return;

  const removedIds = new Set([
    item.id,
    ...queueItems
      .filter(candidate => candidate.isVariant && candidate.parentItemId === item.id)
      .map(candidate => candidate.id)
  ]);

  queueItems = queueItems.filter(candidate => (
    !candidate.isVariant || candidate.parentItemId !== item.id
  ));

  item.taskId = null;
  item.resultDataUrl = null;
  item.mode = BACKGROUND_REMOVER.mode;
  item.styleKey = 'balanced';
  item.status = 'pending';
  item.error = null;
  item.outputWidth = null;
  item.outputHeight = null;

  if (removedIds.has(selectedResultItemId)) {
    selectedResultItemId = null;
  }

  showCompletedGallery();
  renderQueue();
  logMessage(t('log.reworked', { name: item.file.name }));
}

function clearQueue() {
  if (isQueueRunning) return;

  activeTaskId = null;
  activeQueueItemId = null;
  queueItems = [];
  fileInput.value = '';
  showLatestResult(null);
  processCard.classList.add('hidden');
  logConsole.innerHTML = '';
  updateProgress(0, t('progress.ready'));
  renderQueue();
}

function getBatchSettings() {
  const width = parseInt(targetWidthInput.value, 10) || 3000;
  const height = parseInt(targetHeightInput.value, 10) || 3600;

  return {
    width,
    height
  };
}

function currentQueuePosition(itemId) {
  const sourceItems = queueItems.filter(item => !item.isVariant);
  const index = sourceItems.findIndex(item => item.id === itemId);
  return {
    index: Math.max(0, index),
    label: `${Math.max(0, index) + 1}/${sourceItems.length}`
  };
}

function startQueue() {
  if (isQueueRunning || getRunnableCount() === 0) return;

  queueItems.forEach(item => {
    if (item.status === 'error') {
      item.status = 'pending';
      item.error = null;
    }
  });

  isQueueRunning = true;
  batchSettings = getBatchSettings();
  processCard.classList.remove('hidden');
  logConsole.innerHTML = '';
  updateProgress(0, t('progress.starting'));
  logMessage(t('log.startProcessing', { n: queueItems.filter(item => item.status === 'pending').length }));
  renderQueue();
  processNextQueueItem();
}

function processNextQueueItem() {
  if (!isQueueRunning) return;

  const nextItem = queueItems.find(item => item.status === 'pending');
  if (!nextItem) {
    finishQueue();
    return;
  }

  nextItem.status = 'processing';
  nextItem.error = null;
  nextItem.taskId = createId('task');
  nextItem.outputWidth = batchSettings.width;
  nextItem.outputHeight = batchSettings.height;
  activeQueueItemId = nextItem.id;
  activeTaskId = nextItem.taskId;

  const position = currentQueuePosition(nextItem.id);
  updateProgress(5, t('progress.preparing', { pos: position.label, name: nextItem.file.name }));
  logMessage(t('log.itemStart', { pos: position.label, name: nextItem.file.name }));
  renderQueue();

  const taskData = {
    type: 'START_BACKGROUND_TASK',
    taskId: nextItem.taskId,
    fileDataUrl: nextItem.fileDataUrl,
    fileName: nextItem.file.name,
    fileType: nextItem.file.type,
    mode: nextItem.mode || BACKGROUND_REMOVER.mode,
    stylePrompt: '',
    customPrompt: '',
    width: batchSettings.width,
    height: batchSettings.height
  };

  chrome.runtime.sendMessage(taskData, () => {
    if (!chrome.runtime.lastError) {
      logMessage(t('log.sentToWorker', { pos: position.label }));
      return;
    }

    failActiveItem(t('err.workerComm', { msg: chrome.runtime.lastError.message }));
  });
}

function failActiveItem(errorText) {
  const item = queueItems.find(candidate => candidate.id === activeQueueItemId);
  if (!item) return;

  item.status = 'error';
  item.error = errorText;
  logMessage(t('log.itemError', { name: item.file.name, error: errorText }), 'error');
  activeTaskId = null;
  activeQueueItemId = null;
  renderQueue();
  setTimeout(processNextQueueItem, 700);
}

async function isLikelyBlankResult(dataUrl) {
  const img = await loadImage(dataUrl);
  const sampleSize = 64;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  ctx.clearRect(0, 0, sampleSize, sampleSize);
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  let visible = 0;
  let nonWhite = 0;
  let checkerLike = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 12) continue;
    visible += 1;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 242 || g < 242 || b < 242) nonWhite += 1;
    const isLightChecker = r >= 215 && r <= 245 && g >= 215 && g <= 245 && b >= 215 && b <= 245;
    const isWhiteChecker = r >= 248 && g >= 248 && b >= 248;
    if (isLightChecker || isWhiteChecker) checkerLike += 1;
  }

  const totalPixels = sampleSize * sampleSize;
  const visibleRatio = visible / totalPixels;
  const nonWhiteRatio = nonWhite / totalPixels;
  const checkerRatio = checkerLike / totalPixels;
  return (
    visibleRatio < 0.01 ||
    (visibleRatio > 0.95 && nonWhiteRatio < 0.015) ||
    (visibleRatio > 0.95 && checkerRatio > 0.92)
  );
}

async function completeActiveItem(imageUrls) {
  const item = queueItems.find(candidate => candidate.id === activeQueueItemId);
  if (!item) return;
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    failActiveItem(t('err.noResult'));
    return;
  }

  const filteredUrls = imageUrls.length === 1 ? [...imageUrls] : [];
  if (imageUrls.length > 1) {
    for (const url of imageUrls) {
      try {
        if (!(await isLikelyBlankResult(url))) {
          filteredUrls.push(url);
        }
      } catch (error) {
        filteredUrls.push(url);
      }
    }
  }

  if (filteredUrls.length === 0) {
    filteredUrls.push(...imageUrls);
  }

  // First image goes to the original queue item
  item.status = 'done';
  item.error = null;
  item.resultDataUrl = filteredUrls[0];
  queueItems = queueItems.filter(candidate => (
    !candidate.isVariant || candidate.parentItemId !== item.id
  ));

  // Additional images beyond the first become variant sibling items
  if (filteredUrls.length > 1) {
    const extraItems = filteredUrls.slice(1).map((url, idx) => ({
      id: createId('variant'),
      taskId: null,
      file: item.file,
      fileDataUrl: item.fileDataUrl,
      resultDataUrl: url,
      styleKey: item.styleKey,
      mode: item.mode,
      status: 'done',
      error: null,
      outputWidth: item.outputWidth,
      outputHeight: item.outputHeight,
      isVariant: true,
      parentItemId: item.id,
      variantIndex: idx + 2   // variant #2, #3, etc.
    }));

    // Insert the variant items right after the original
    const originalIndex = queueItems.findIndex(q => q.id === item.id);
    queueItems.splice(originalIndex + 1, 0, ...extraItems);
  }

  // Keep every completed queue result visible and select the newest source result.
  selectedResultItemId = item.id;
  showCompletedGallery();

  logMessage(t('log.itemDone', { name: item.file.name, n: filteredUrls.length }), 'success');

  // The live path captured this result; drop the background's backup copy.
  if (item.taskId && chrome.storage?.local) {
    chrome.storage.local.remove(RESULT_KEY_PREFIX + item.taskId, () => void chrome.runtime.lastError);
  }
  activeTaskId = null;
  activeQueueItemId = null;
  renderQueue();

  if (getRunnableCount() > 0) {
    logMessage(t('log.wait4s'));
    setTimeout(processNextQueueItem, 1500);
  } else {
    processNextQueueItem();
  }
}

function finishQueue() {
  isQueueRunning = false;
  activeTaskId = null;
  activeQueueItemId = null;

  const sourceItems = queueItems.filter(item => !item.isVariant);
  const doneCount = sourceItems.filter(item => item.status === 'done').length;
  const variantCount = queueItems.filter(item => item.isVariant).length;
  const errorCount = sourceItems.filter(item => item.status === 'error').length;
  updateProgress(100, t('progress.queueComplete', { done: doneCount, total: sourceItems.length }));
  logMessage(
    t('log.queueDone', { done: doneCount, variant: variantCount, error: errorCount }),
    errorCount > 0 ? 'error' : 'success'
  );
  showLatestResult();
  renderQueue();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t('err.loadResult')));
    img.src = src;
  });
}

function canvasToNativePngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error(t('err.canvasPng')));
    }, 'image/png');
  });
}

async function createResizedPngBlob(item) {
  if (!item || !item.resultDataUrl) {
    throw new Error(t('err.noResultExport'));
  }

  const width = item.outputWidth || parseInt(targetWidthInput.value, 10) || 3000;
  const height = item.outputHeight || parseInt(targetHeightInput.value, 10) || 3600;
  const img = await loadImage(item.resultDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const safeMargin = 0.05;
  const availableWidth = width * (1 - safeMargin * 2);
  const availableHeight = height * (1 - safeMargin * 2);
  const scale = Math.min(availableWidth / img.naturalWidth, availableHeight / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

  return canvasToNativePngBlob(canvas);
}

function outputFileName(item) {
  const width = item.outputWidth || parseInt(targetWidthInput.value, 10) || 3000;
  const height = item.outputHeight || parseInt(targetHeightInput.value, 10) || 3600;
  const originalName = item.file?.name || 'removed-background.png';
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const safeName = baseName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  const variantSuffix = item.isVariant ? `_v${item.variantIndex}` : '';
  return `GPT_Background_Remover/${BACKGROUND_REMOVER.filePrefix}_${safeName}${variantSuffix}_${width}x${height}.png`;
}

function downloadBlob(blob, filename) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);

    if (chrome.downloads?.download) {
      chrome.downloads.download({
        url,
        filename,
        conflictAction: 'uniquify',
        saveAs: false
      }, downloadId => {
        const error = chrome.runtime.lastError;
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        if (error || !downloadId) {
          reject(new Error(error?.message || t('err.downloadStart')));
          return;
        }
        resolve(downloadId);
      });
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.split('/').pop();
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    resolve();
  });
}

async function downloadQueueItem(item) {
  if (!item?.resultDataUrl) return;
  logMessage(t('log.resizing', { name: item.file.name }));
  const blob = await createResizedPngBlob(item);
  logMessage(t('log.optimized', { mb: (blob.size / (1024 * 1024)).toFixed(2) }));
  await downloadBlob(blob, outputFileName(item));
  logMessage(t('log.downloaded', { name: item.file.name }), 'success');
}

async function downloadAllCompleted() {
  if (isDownloadingAll) return;
  const completedItems = getCompletedItems();
  if (completedItems.length === 0) return;

  isDownloadingAll = true;
  updateActionState();
  logMessage(t('log.downloadAllStart', { n: completedItems.length }));

  let successCount = 0;
  for (const item of completedItems) {
    try {
      await downloadQueueItem(item);
      successCount += 1;
    } catch (error) {
      logMessage(t('log.itemError', { name: item.file.name, error: error.message }), 'error');
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  isDownloadingAll = false;
  updateActionState();
  logMessage(t('log.downloadAllDone', { ok: successCount, total: completedItems.length }), 'success');
}

dropzone.addEventListener('click', () => {
  fileInput.click();
});

dropzone.addEventListener('keydown', event => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', event => {
  if (event.target.files.length > 0) {
    addFiles(event.target.files);
  }
  fileInput.value = '';
});

dropzone.addEventListener('dragover', event => {
  event.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', event => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  if (event.dataTransfer.files.length > 0) {
    addFiles(event.dataTransfer.files);
  }
});

const settingsToggle = document.getElementById('settings-toggle');
if (settingsToggle) {
  settingsToggle.addEventListener('click', () => {
    const card = settingsToggle.closest('.settings-card');
    if (!card) return;
    const collapsed = card.classList.toggle('collapsed');
    settingsToggle.setAttribute('aria-expanded', String(!collapsed));
  });
}

clearQueueBtn.addEventListener('click', clearQueue);
startBtn.addEventListener('click', startQueue);

queueList.addEventListener('click', async event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const item = queueItems.find(candidate => candidate.id === button.dataset.itemId);
  if (!item) return;

  if (button.dataset.action === 'remove') {
    removeQueueItem(item.id);
    return;
  }

  if (button.dataset.action === 'rework') {
    reworkQueueItem(item.id);
    return;
  }

  if (button.dataset.action === 'download') {
    button.disabled = true;
    try {
      await downloadQueueItem(item);
    } catch (error) {
      logMessage(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }
});

downloadBtn.addEventListener('click', async () => {
  const selectedItem = getSelectedCompletedItem();
  if (!selectedItem) return;

  downloadBtn.disabled = true;
  try {
    await downloadQueueItem(selectedItem);
  } catch (error) {
    logMessage(error.message, 'error');
  } finally {
    updateActionState();
  }
});

downloadAllBtn.addEventListener('click', downloadAllCompleted);

resultCard.addEventListener('click', event => {
  const cell = event.target.closest('.result-gallery-cell[data-item-id]');
  if (!cell) return;

  const item = getCompletedItems().find(candidate => candidate.id === cell.dataset.itemId);
  if (!item) return;

  selectedResultItemId = item.id;
  showCompletedGallery();
});

chrome.runtime.onMessage.addListener(message => {
  if (!activeTaskId || message.taskId !== activeTaskId) return;

  const activeItem = queueItems.find(item => item.id === activeQueueItemId);
  if (!activeItem) return;
  const position = currentQueuePosition(activeItem.id);

  if (message.type === 'BG_REMOVER_PROGRESS') {
    const { percent, text, status } = message;
    logMessage(
      `[${position.label}] ${text}`,
      status === 'error' ? 'error' : (status === 'success' ? 'success' : 'info')
    );
    updateProgress(percent, `[${position.label}] ${text}`, status === 'error');

    if (status === 'error') {
      failActiveItem(text);
    }
    return;
  }

  if (message.type === 'BG_REMOVER_DONE') {
    const imageUrls = message.imageUrls || (message.imageUrl ? [message.imageUrl] : []);
    updateProgress(100, t('progress.completed', { pos: position.label, n: imageUrls.length }));
    completeActiveItem(imageUrls);
  }
});

/* ── Lang toggle UI ─────────────────── */
const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
  // Highlight the active button on load
  langToggle.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  langToggle.addEventListener('click', e => {
    const btn = e.target.closest('.lang-opt[data-lang]');
    if (!btn) return;
    setLang(btn.dataset.lang);
    langToggle.querySelectorAll('.lang-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === currentLang);
    });
  });
}

applyI18n();
updateProgress(0, t('progress.ready'));
restoreQueue(() => {
  renderQueue();
  showCompletedGallery();
});
chrome.runtime.sendMessage({ type: 'ENSURE_GPT_TAB' });
