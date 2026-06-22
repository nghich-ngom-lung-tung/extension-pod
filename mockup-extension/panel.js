const MOCKUP = globalThis.SfrankieMockup;
const I18N = globalThis.SfrankieI18n;

let currentLang = localStorage.getItem('sfrankie_lang') === 'en' ? 'en' : 'vi';
I18N.setLang(currentLang);
const t = (key, params) => I18N.t(key, params);

const QUEUE_STORAGE_KEY = 'sfrankie_mockup_queue';
const RESULT_KEY_PREFIX = 'sfrankie_mockup_result_';
const COLOR_SWATCHES = [
  ['black', '#050505'],
  ['white', '#f6f6f0'],
  ['navy', '#10243f'],
  ['heatherGrey', '#a7a9ac'],
  ['red', '#d81f32'],
  ['royalBlue', '#0d55b8'],
  ['forestGreen', '#24522f'],
  ['pink', '#f3a7bd'],
  ['yellow', '#ffe34a']
];

let queueItems = [];
let activeTaskId = null;
let activeQueueItemId = null;
let isQueueRunning = false;
let isDownloadingAll = false;
let selectedResult = null;
let selectedCount = 1;
let selectedDesign = null;
let selectedTemplate = null;
let persistTimer = null;

const designInput = document.getElementById('design-input');
const templateInput = document.getElementById('template-input');
const designDropzone = document.getElementById('design-dropzone');
const templateDropzone = document.getElementById('template-dropzone');
const designPreview = document.getElementById('design-preview');
const templatePreview = document.getElementById('template-preview');
const modeSelect = document.getElementById('mode-select');
const productSelect = document.getElementById('product-select');
const colorSelect = document.getElementById('color-select');
const customColor = document.getElementById('custom-color');
const sceneSelect = document.getElementById('scene-select');
const customContext = document.getElementById('custom-context');
const customCount = document.getElementById('custom-count');
const countCards = [...document.querySelectorAll('.count-card[data-count]')];
const swatchRow = document.getElementById('swatch-row');
const targetWidthInput = document.getElementById('target-width');
const targetHeightInput = document.getElementById('target-height');
const addQueueBtn = document.getElementById('add-queue-btn');
const startBtn = document.getElementById('start-btn');
const clearQueueBtn = document.getElementById('clear-queue-btn');
const queueCard = document.getElementById('queue-card');
const queueList = document.getElementById('queue-list');
const queueCount = document.getElementById('queue-count');
const processCard = document.getElementById('process-card');
const processStatusText = document.getElementById('process-status-text');
const processPercentText = document.getElementById('process-percent-text');
const progressBar = document.getElementById('progress-bar');
const logConsole = document.getElementById('log-console');
const resultCard = document.getElementById('result-card');
const resultWrapper = resultCard.querySelector('.result-preview-wrapper');
const downloadBtn = document.getElementById('download-btn');
const downloadAllBtn = document.getElementById('download-all-btn');
const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.placeholder = t(key);
  });
  document.documentElement.lang = currentLang;
}

function setLang(newLang) {
  currentLang = I18N.setLang(newLang);
  localStorage.setItem('sfrankie_lang', currentLang);
  chrome.storage?.local?.set({ sfrankie_lang: currentLang });
  applyI18n();
  refreshConnText();
  renderQueue();
  renderResults();
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = () => reject(new Error(t('err.readFile', { name: file.name })));
    reader.readAsDataURL(file);
  });
}

function logMessage(text, type = 'info') {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const line = document.createElement('div');
  line.className = 'log-line';
  const spanTime = document.createElement('span');
  spanTime.className = 'log-item timestamp';
  spanTime.textContent = `[${time}] `;
  const spanText = document.createElement('span');
  spanText.className = `log-item ${type}`;
  spanText.textContent = text;
  line.append(spanTime, spanText);
  logConsole.appendChild(line);
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

function serializeQueue() {
  return queueItems.map(item => ({
    ...item,
    designFile: { name: item.designFile?.name || '', type: item.designFile?.type || '' },
    templateFile: item.templateFile ? { name: item.templateFile.name || '', type: item.templateFile.type || '' } : null
  }));
}

function persistQueue() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      chrome.storage?.local?.set({ [QUEUE_STORAGE_KEY]: serializeQueue() }, () => void chrome.runtime.lastError);
    } catch (_) { /* storage unavailable */ }
  }, 400);
}

function restoreQueue(done) {
  if (!chrome.storage?.local) { done(); return; }
  chrome.storage.local.get(QUEUE_STORAGE_KEY, data => {
    void chrome.runtime.lastError;
    const saved = data?.[QUEUE_STORAGE_KEY];
    if (!Array.isArray(saved)) { done(); return; }
    queueItems = saved.map(item => ({
      ...item,
      status: item.status === 'processing' ? 'pending' : item.status,
      taskId: item.status === 'processing' ? null : item.taskId
    }));
    done();
  });
}

function getCount() {
  return Math.max(1, Math.min(10, selectedCount === 'custom' ? Number(customCount.value) || 1 : Number(selectedCount) || 1));
}

function getSettings() {
  return {
    mode: modeSelect.value,
    count: getCount(),
    productType: productSelect.value,
    productColor: colorSelect.value,
    customColor: customColor.value.trim(),
    sceneStyle: sceneSelect.value,
    customContext: customContext.value.trim(),
    outputWidth: parseInt(targetWidthInput.value, 10) || 3000,
    outputHeight: parseInt(targetHeightInput.value, 10) || 3000
  };
}

function label(keyPrefix, value) {
  return t(`${keyPrefix}.${value}`);
}

function itemName(item) {
  return item.designFile?.name || 'mockup-job';
}

function statusLabel(item) {
  if (item.status === 'processing') return t('qstatus.processing');
  if (item.status === 'done') return t('qstatus.completed');
  if (item.status === 'error') return item.error || t('qstatus.failed');
  return t('qstatus.queued');
}

function updateSourcePreview(kind, source) {
  const dropzone = kind === 'design' ? designDropzone : templateDropzone;
  const preview = kind === 'design' ? designPreview : templatePreview;
  dropzone.classList.toggle('has-file', Boolean(source));
  preview.classList.toggle('hidden', !source);
  if (source) preview.src = source.dataUrl;
  updateActionState();
}

async function setSource(kind, file) {
  if (!file || !file.type.startsWith('image/')) {
    logMessage(t('log.invalidImage'), 'error');
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  const source = { file, dataUrl };
  if (kind === 'design') {
    selectedDesign = source;
    logMessage(t('log.selectedDesign', { name: file.name }), 'success');
  } else {
    selectedTemplate = source;
    logMessage(t('log.selectedTemplate', { name: file.name }), 'success');
  }
  updateSourcePreview(kind, source);
}

function clearSelectedSources() {
  selectedDesign = null;
  selectedTemplate = null;
  designInput.value = '';
  templateInput.value = '';
  updateSourcePreview('design', null);
  updateSourcePreview('template', null);
}

function addCurrentJobToQueue() {
  if (!selectedDesign) {
    logMessage(t('log.needDesign'), 'error');
    return;
  }
  const settings = getSettings();
  if (settings.mode === MOCKUP.modeTemplate && !selectedTemplate) {
    logMessage(t('log.needTemplate'), 'error');
    return;
  }

  const item = {
    id: createId('mockup'),
    taskId: null,
    designFile: selectedDesign.file,
    designDataUrl: selectedDesign.dataUrl,
    templateFile: selectedTemplate?.file || null,
    templateDataUrl: selectedTemplate?.dataUrl || null,
    ...settings,
    status: 'pending',
    error: null,
    resultDataUrls: []
  };
  queueItems.push(item);
  logMessage(t('log.added', { name: itemName(item) }), 'success');
  clearSelectedSources();
  renderQueue();
}

function getRunnableCount() {
  return queueItems.filter(item => item.status === 'pending' || item.status === 'error').length;
}

function getCompletedItems() {
  return queueItems.filter(item => item.status === 'done' && Array.isArray(item.resultDataUrls) && item.resultDataUrls.length > 0);
}

function getCompletedResults() {
  return getCompletedItems().flatMap(item => (
    item.resultDataUrls.map((url, index) => ({ item, url, index }))
  ));
}

function updateActionState() {
  const completedCount = getCompletedResults().length;
  addQueueBtn.disabled = !selectedDesign || isQueueRunning;
  startBtn.disabled = isQueueRunning || getRunnableCount() === 0;
  clearQueueBtn.disabled = isQueueRunning || queueItems.length === 0;
  downloadBtn.disabled = completedCount === 0;
  downloadAllBtn.disabled = completedCount === 0 || isDownloadingAll;
  [modeSelect, productSelect, colorSelect, customColor, sceneSelect, customContext, customCount, targetWidthInput, targetHeightInput]
    .forEach(el => { el.disabled = isQueueRunning; });
}

function renderQueue() {
  queueList.innerHTML = '';
  queueCard.classList.toggle('hidden', queueItems.length === 0);
  const doneCount = queueItems.filter(item => item.status === 'done').length;
  queueCount.textContent = `${doneCount}/${queueItems.length}`;

  for (const item of queueItems) {
    const row = document.createElement('div');
    row.className = `queue-item ${item.status}`;
    row.dataset.itemId = item.id;

    const thumb = document.createElement('img');
    thumb.className = 'queue-thumb';
    thumb.src = item.resultDataUrls?.[0] || item.designDataUrl;
    thumb.alt = itemName(item);

    const meta = document.createElement('div');
    meta.className = 'queue-meta';
    const name = document.createElement('div');
    name.className = 'queue-name';
    name.textContent = itemName(item);
    name.title = itemName(item);
    const status = document.createElement('div');
    status.className = 'queue-status';
    const modeText = label('modeShort', item.mode);
    const productText = label('product', item.productType);
    status.textContent = `${statusLabel(item)} • ${modeText} • ${productText} • ${item.count}x`;
    status.title = item.error || '';
    meta.append(name, status);

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

    row.append(thumb, meta, actions);
    queueList.appendChild(row);
  }

  updateActionState();
  persistQueue();
}

function renderResults() {
  const results = getCompletedResults();
  if (results.length === 0) {
    selectedResult = null;
    resultWrapper.innerHTML = '';
    resultCard.classList.add('hidden');
    updateActionState();
    return;
  }

  if (!selectedResult || !results.some(result => result.item.id === selectedResult.itemId && result.index === selectedResult.index)) {
    const latest = results[results.length - 1];
    selectedResult = { itemId: latest.item.id, index: latest.index };
  }

  resultWrapper.innerHTML = '';
  results.forEach((result, order) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `result-gallery-cell${selectedResult.itemId === result.item.id && selectedResult.index === result.index ? ' selected' : ''}`;
    cell.dataset.itemId = result.item.id;
    cell.dataset.index = String(result.index);
    cell.title = t('title.selectResult', { name: itemName(result.item) });

    const img = document.createElement('img');
    img.src = result.url;
    img.alt = `${itemName(result.item)} mockup ${result.index + 1}`;
    const labelEl = document.createElement('div');
    labelEl.className = 'result-gallery-label';
    labelEl.textContent = `#${order + 1} ${itemName(result.item)} v${result.index + 1}`;
    cell.append(labelEl, img);
    resultWrapper.appendChild(cell);
  });

  resultCard.classList.remove('hidden');
  updateActionState();
}

function clearQueue() {
  queueItems = queueItems.filter(item => item.status === 'processing');
  selectedResult = null;
  renderQueue();
  renderResults();
}

function reworkQueueItem(itemId) {
  const item = queueItems.find(candidate => candidate.id === itemId);
  if (!item) return;
  item.status = 'pending';
  item.error = null;
  item.taskId = null;
  item.resultDataUrls = [];
  logMessage(t('log.reworked', { name: itemName(item) }));
  renderQueue();
  renderResults();
}

function removeQueueItem(itemId) {
  queueItems = queueItems.filter(item => item.id !== itemId);
  renderQueue();
  renderResults();
}

function currentQueuePosition(itemId) {
  const runnable = queueItems.filter(item => item.status === 'pending' || item.status === 'processing' || item.status === 'done');
  const index = runnable.findIndex(item => item.id === itemId);
  return { index, label: `${Math.max(1, index + 1)}/${Math.max(1, runnable.length)}` };
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
  activeQueueItemId = nextItem.id;
  activeTaskId = nextItem.taskId;

  const position = currentQueuePosition(nextItem.id);
  updateProgress(5, t('progress.preparing', { pos: position.label, name: itemName(nextItem) }));
  logMessage(t('log.itemStart', { pos: position.label, name: itemName(nextItem) }));
  renderQueue();

  const sources = [{
    role: 'design',
    dataUrl: nextItem.designDataUrl,
    name: nextItem.designFile.name,
    type: nextItem.designFile.type
  }];
  if (nextItem.mode === MOCKUP.modeTemplate && nextItem.templateDataUrl) {
    sources.push({
      role: 'template',
      dataUrl: nextItem.templateDataUrl,
      name: nextItem.templateFile.name,
      type: nextItem.templateFile.type
    });
  }

  chrome.runtime.sendMessage({
    type: 'START_MOCKUP_TASK',
    taskId: nextItem.taskId,
    sources,
    mode: nextItem.mode,
    count: nextItem.count,
    productType: nextItem.productType,
    productColor: nextItem.productColor,
    customColor: nextItem.customColor,
    sceneStyle: nextItem.sceneStyle,
    customContext: nextItem.customContext
  }, () => {
    if (!chrome.runtime.lastError) {
      logMessage(t('log.sentToWorker', { pos: position.label }));
      return;
    }
    failActiveItem(t('err.workerComm', { msg: chrome.runtime.lastError.message }));
  });
}

function failActiveItem(errorMessage) {
  const item = queueItems.find(candidate => candidate.id === activeQueueItemId);
  if (!item) return;
  item.status = 'error';
  item.error = errorMessage || t('err.unknown');
  logMessage(t('log.itemError', { name: itemName(item), error: item.error }), 'error');
  activeTaskId = null;
  activeQueueItemId = null;
  renderQueue();
  setTimeout(processNextQueueItem, 700);
}

function completeActiveItem(imageUrls) {
  const item = queueItems.find(candidate => candidate.id === activeQueueItemId);
  if (!item) return;
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
    failActiveItem(t('err.noResult'));
    return;
  }

  item.status = 'done';
  item.error = null;
  item.resultDataUrls = imageUrls;
  selectedResult = { itemId: item.id, index: imageUrls.length - 1 };
  logMessage(t('log.itemDone', { name: itemName(item), n: imageUrls.length }), 'success');

  if (item.taskId && chrome.storage?.local) {
    chrome.storage.local.remove(RESULT_KEY_PREFIX + item.taskId, () => void chrome.runtime.lastError);
  }

  activeTaskId = null;
  activeQueueItemId = null;
  renderQueue();
  renderResults();

  if (getRunnableCount() > 0) {
    logMessage(t('log.waitBrief'));
    setTimeout(processNextQueueItem, 1500);
  } else {
    processNextQueueItem();
  }
}

function finishQueue() {
  isQueueRunning = false;
  activeTaskId = null;
  activeQueueItemId = null;
  const doneCount = queueItems.filter(item => item.status === 'done').length;
  const variantCount = getCompletedResults().length - doneCount;
  const errorCount = queueItems.filter(item => item.status === 'error').length;
  updateProgress(100, t('progress.queueComplete', { done: doneCount, total: queueItems.length }));
  logMessage(t('log.queueDone', { done: doneCount, variant: Math.max(0, variantCount), error: errorCount }), errorCount > 0 ? 'error' : 'success');
  renderQueue();
  renderResults();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t('err.loadResult')));
    img.src = src;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error(t('err.canvasPng')));
    }, 'image/png');
  });
}

async function createResizedPngBlob(result) {
  if (!result?.url) throw new Error(t('err.noResultExport'));
  const width = result.item.outputWidth || parseInt(targetWidthInput.value, 10) || 3000;
  const height = result.item.outputHeight || parseInt(targetHeightInput.value, 10) || 3000;
  const img = await loadImage(result.url);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const drawWidth = img.naturalWidth * scale;
  const drawHeight = img.naturalHeight * scale;
  const drawX = (width - drawWidth) / 2;
  const drawY = (height - drawHeight) / 2;
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  return canvasToPngBlob(canvas);
}

function outputFileName(result) {
  const item = result.item;
  const originalName = itemName(item);
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const safeName = baseName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_');
  const width = item.outputWidth || parseInt(targetWidthInput.value, 10) || 3000;
  const height = item.outputHeight || parseInt(targetHeightInput.value, 10) || 3000;
  return `GPT_Mockup_Luxury/mockup_${safeName}_${item.sceneStyle}_v${result.index + 1}_${width}x${height}.png`;
}

function downloadBlob(blob, filename) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    if (chrome.downloads?.download) {
      chrome.downloads.download({ url, filename, conflictAction: 'uniquify', saveAs: false }, downloadId => {
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

function getSelectedResult() {
  const results = getCompletedResults();
  return results.find(result => selectedResult && result.item.id === selectedResult.itemId && result.index === selectedResult.index) || results[results.length - 1] || null;
}

async function downloadResult(result) {
  if (!result) return;
  logMessage(t('log.resizing', { name: itemName(result.item) }));
  const blob = await createResizedPngBlob(result);
  logMessage(t('log.optimized', { mb: (blob.size / (1024 * 1024)).toFixed(2) }));
  await downloadBlob(blob, outputFileName(result));
  logMessage(t('log.downloaded', { name: itemName(result.item) }), 'success');
}

async function downloadAllCompleted() {
  const results = getCompletedResults();
  if (results.length === 0 || isDownloadingAll) return;
  isDownloadingAll = true;
  updateActionState();
  logMessage(t('log.downloadAllStart', { n: results.length }));
  let ok = 0;
  for (const result of results) {
    try {
      await downloadResult(result);
      ok += 1;
      await new Promise(resolve => setTimeout(resolve, 250));
    } catch (error) {
      logMessage(error.message, 'error');
    }
  }
  logMessage(t('log.downloadAllDone', { ok, total: results.length }), ok === results.length ? 'success' : 'error');
  isDownloadingAll = false;
  updateActionState();
}

function bindDropzone(dropzone, input, kind) {
  dropzone.addEventListener('click', () => input.click());
  input.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) setSource(kind, file);
  });

  dropzone.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dropzone.classList.remove('dragover');
    const file = event.dataTransfer.files?.[0];
    if (file) setSource(kind, file);
  });
}

function renderSwatches() {
  swatchRow.innerHTML = '';
  for (const [key, color] of COLOR_SWATCHES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `color-swatch${colorSelect.value === key ? ' active' : ''}`;
    button.dataset.color = key;
    button.style.background = color;
    button.title = t(`color.${key}`);
    swatchRow.appendChild(button);
  }
}

function syncColorControls() {
  customColor.classList.toggle('hidden', colorSelect.value !== 'custom');
  renderSwatches();
}

bindDropzone(designDropzone, designInput, 'design');
bindDropzone(templateDropzone, templateInput, 'template');

countCards.forEach(card => {
  card.addEventListener('click', () => {
    selectedCount = Number(card.dataset.count);
    document.querySelectorAll('.count-card').forEach(el => el.classList.remove('active'));
    card.classList.add('active');
    updateActionState();
  });
});

customCount.addEventListener('focus', () => {
  selectedCount = 'custom';
  document.querySelectorAll('.count-card').forEach(el => el.classList.remove('active'));
  customCount.closest('.count-card').classList.add('active');
});

swatchRow.addEventListener('click', event => {
  const swatch = event.target.closest('.color-swatch[data-color]');
  if (!swatch) return;
  colorSelect.value = swatch.dataset.color;
  syncColorControls();
});

colorSelect.addEventListener('change', syncColorControls);
addQueueBtn.addEventListener('click', addCurrentJobToQueue);
startBtn.addEventListener('click', startQueue);
clearQueueBtn.addEventListener('click', clearQueue);

const settingsToggle = document.getElementById('settings-toggle');
settingsToggle?.addEventListener('click', () => {
  const card = settingsToggle.closest('.settings-card');
  const collapsed = card.classList.toggle('collapsed');
  settingsToggle.setAttribute('aria-expanded', String(!collapsed));
});

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
    const result = getCompletedResults().find(candidate => candidate.item.id === item.id);
    button.disabled = true;
    try {
      await downloadResult(result);
    } catch (error) {
      logMessage(error.message, 'error');
    } finally {
      button.disabled = false;
    }
  }
});

resultCard.addEventListener('click', event => {
  const cell = event.target.closest('.result-gallery-cell[data-item-id]');
  if (!cell) return;
  selectedResult = { itemId: cell.dataset.itemId, index: Number(cell.dataset.index) || 0 };
  renderResults();
});

downloadBtn.addEventListener('click', async () => {
  downloadBtn.disabled = true;
  try {
    await downloadResult(getSelectedResult());
  } catch (error) {
    logMessage(error.message, 'error');
  } finally {
    updateActionState();
  }
});

downloadAllBtn.addEventListener('click', downloadAllCompleted);

chrome.runtime.onMessage.addListener(message => {
  if (!activeTaskId || message.taskId !== activeTaskId) return;
  const activeItem = queueItems.find(item => item.id === activeQueueItemId);
  if (!activeItem) return;
  const position = currentQueuePosition(activeItem.id);

  if (message.type === 'MOCKUP_PROGRESS') {
    const { percent, text, status } = message;
    logMessage(`[${position.label}] ${text}`, status === 'error' ? 'error' : (status === 'success' ? 'success' : 'info'));
    updateProgress(percent, `[${position.label}] ${text}`, status === 'error');
    if (status === 'error') failActiveItem(text);
    return;
  }

  if (message.type === 'MOCKUP_DONE') {
    const imageUrls = message.imageUrls || (message.imageUrl ? [message.imageUrl] : []);
    updateProgress(100, t('progress.completed', { pos: position.label, n: imageUrls.length }));
    completeActiveItem(imageUrls);
  }
});

const langToggle = document.getElementById('lang-toggle');
if (langToggle) {
  langToggle.querySelectorAll('.lang-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
  langToggle.addEventListener('click', event => {
    const btn = event.target.closest('.lang-opt[data-lang]');
    if (!btn) return;
    setLang(btn.dataset.lang);
    langToggle.querySelectorAll('.lang-opt').forEach(option => {
      option.classList.toggle('active', option.dataset.lang === currentLang);
    });
  });
}

applyI18n();
syncColorControls();
updateProgress(0, t('progress.ready'));
restoreQueue(() => {
  renderQueue();
  renderResults();
});
chrome.runtime.sendMessage({ type: 'ENSURE_GPT_TAB' });
