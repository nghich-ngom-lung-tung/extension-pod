/* ── i18n bridge ── */
const I18N = globalThis.SfrankieI18n;
const t = (key, params) => I18N?.t(key, params) ?? key;
const TARGET_CUSTOM_GPT_ID = 'g-6a35178738988191a1e1914eb7f5c8ec';
const POPUP_ID = 'sfrankie-background-remover-popup';

function isTargetCustomGptPage() {
  return window.location.href.includes(TARGET_CUSTOM_GPT_ID);
}

// Sync saved language preference
chrome.storage?.local?.get('sfrankie_lang', data => {
  if (data?.sfrankie_lang) I18N?.setLang(data.sfrankie_lang);
});
chrome.storage?.onChanged?.addListener((changes, area) => {
  if (area === 'local' && changes.sfrankie_lang) {
    I18N?.setLang(changes.sfrankie_lang.newValue);
  }
});

// Helper: Wait for element to appear in DOM
function waitForElement(selector, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const interval = 100;
    let elapsed = 0;
    const timer = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        resolve(el);
      }
      elapsed += interval;
      if (elapsed >= timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timeout waiting for selector: ${selector}`));
      }
    }, interval);
  });
}

// Helper: Convert Base64 Data URL to a File Object
async function dataURLtoFile(dataurl, filename, mimeType) {
  const res = await fetch(dataurl);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType || blob.type });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error(`Cannot create upload blob (${type}).`));
      }
    }, type, quality);
  });
}

function uploadFileName(originalName, extension, suffix = 'upload') {
  const dotIndex = originalName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const safeBase = baseName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .trim()
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'source-image';

  return `${safeBase}-${suffix}.${extension}`;
}

async function createUploadCopy(file, options) {
  const {
    maxDimension,
    maxPreferredBytes,
    jpegQuality,
    suffix,
    forceJpeg = false,
    preserveAlpha = false
  } = options;

  const bitmap = await createImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const largestDimension = Math.max(sourceWidth, sourceHeight);
  const scale = Math.min(1, maxDimension / largestDimension);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const sourceHasAlpha = (() => {
    const data = context.getImageData(0, 0, width, height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) return true;
    }
    return false;
  })();

  let outputBlob;
  let extension;

  if (preserveAlpha || (sourceHasAlpha && !forceJpeg)) {
    outputBlob = await canvasToBlob(canvas, 'image/png');
    extension = 'png';
  } else {
    const jpegCanvas = document.createElement('canvas');
    jpegCanvas.width = width;
    jpegCanvas.height = height;
    const jpegContext = jpegCanvas.getContext('2d', { alpha: false });
    jpegContext.fillStyle = '#ffffff';
    jpegContext.fillRect(0, 0, width, height);
    jpegContext.drawImage(canvas, 0, 0);
    outputBlob = await canvasToBlob(jpegCanvas, 'image/jpeg', jpegQuality);
    extension = 'jpg';
  }

  // Highly detailed artwork can remain large even after resizing. For background
  // removal, keep alpha whenever possible so transparent logos do not flatten to
  // white JPGs before ChatGPT sees them.
  if (outputBlob.size > maxPreferredBytes && !preserveAlpha) {
    const jpegCanvas = document.createElement('canvas');
    jpegCanvas.width = width;
    jpegCanvas.height = height;
    const jpegContext = jpegCanvas.getContext('2d', { alpha: false });
    jpegContext.fillStyle = '#ffffff';
    jpegContext.fillRect(0, 0, width, height);
    jpegContext.drawImage(canvas, 0, 0);
    outputBlob = await canvasToBlob(jpegCanvas, 'image/jpeg', Math.min(jpegQuality, 0.82));
    extension = 'jpg';
  }

  return {
    file: new File(
      [outputBlob],
      uploadFileName(file.name, extension, suffix),
      { type: outputBlob.type, lastModified: Date.now() }
    ),
    width,
    height
  };
}

async function prepareUploadFiles(file, taskId) {
  const sourceFormat = file.type || file.name.split('.').pop()?.toUpperCase() || 'image';
  reportProgress(
    58,
    t('prog.makingClean', { fmt: sourceFormat, size: formatFileSize(file.size) }),
    'info',
    taskId
  );

  const likelyAlphaSource = file.type === 'image/png' || file.type === 'image/webp' || /\.png$|\.webp$/i.test(file.name);
  const variants = likelyAlphaSource
    ? [
        { maxDimension: 1800, maxPreferredBytes: 8 * 1024 * 1024, jpegQuality: 0.9, suffix: 'upload', preserveAlpha: true },
        { maxDimension: 1400, maxPreferredBytes: 6 * 1024 * 1024, jpegQuality: 0.84, suffix: 'upload-small', preserveAlpha: true },
        { maxDimension: 1024, maxPreferredBytes: 4 * 1024 * 1024, jpegQuality: 0.78, suffix: 'upload-tiny', preserveAlpha: true }
      ]
    : [
        { maxDimension: 1800, maxPreferredBytes: 6 * 1024 * 1024, jpegQuality: 0.9, suffix: 'upload' },
        { maxDimension: 1400, maxPreferredBytes: 4 * 1024 * 1024, jpegQuality: 0.84, suffix: 'upload-small', forceJpeg: true },
        { maxDimension: 1024, maxPreferredBytes: 2 * 1024 * 1024, jpegQuality: 0.78, suffix: 'upload-tiny', forceJpeg: true }
      ];

  const uploadCopies = [];
  for (const variant of variants) {
    uploadCopies.push(await createUploadCopy(file, variant));
  }

  const summary = uploadCopies
    .map(copy => `${copy.file.name} ${copy.width}x${copy.height} ${formatFileSize(copy.file.size)}`)
    .join('; ');

  reportProgress(
    62,
    t('prog.preparedCopies', { n: uploadCopies.length, summary }),
    'success',
    taskId
  );
  return uploadCopies.map(copy => copy.file);
}

// Helper: Convert Image URL to Base64 (bypassing CORS by loading directly in page context)
async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error("Error reading blob as Base64"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    void error;
    return url; // Fallback to raw URL if fetch fails due to CORS
  }
}

// Send progress update to Extension
function reportProgress(percent, text, status = 'info', taskId = null) {
  chrome.runtime.sendMessage({
    type: 'BG_REMOVER_PROGRESS',
    taskId: taskId,
    percent: percent,
    text: text,
    status: status
  }, () => void chrome.runtime.lastError);
}

const ASSISTANT_CONTAINER_SELECTOR = [
  'div[data-message-author-role="assistant"]',
  'div[data-author-role="assistant"]',
  'article[data-testid*="assistant"]',
  '[data-testid*="assistant-message"]',
  '.markdown'
].join(', ');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  if (!url) return "";
  try {
    return new URL(url, window.location.href).href;
  } catch (error) {
    return url;
  }
}

function srcsetUrls(srcset) {
  if (!srcset) return [];
  return srcset
    .split(',')
    .map(item => item.trim().split(/\s+/)[0])
    .filter(Boolean)
    .map(normalizeUrl);
}

function imageUrlsFromCssValue(cssValue) {
  if (!cssValue || cssValue === 'none') return [];

  const urls = [];
  const pattern = /url\((["']?)(.*?)\1\)/g;
  let match = pattern.exec(cssValue);

  while (match) {
    if (match[2]) urls.push(normalizeUrl(match[2]));
    match = pattern.exec(cssValue);
  }

  return urls;
}

function getImageUrls(el) {
  const urls = [];
  const parentLink = el.closest('a[href]');

  if (el.currentSrc) urls.push(normalizeUrl(el.currentSrc));
  if (el.src) urls.push(normalizeUrl(el.src));
  if (el.href) urls.push(normalizeUrl(el.href));
  urls.push(...srcsetUrls(el.getAttribute('srcset')));
  if (parentLink) urls.push(normalizeUrl(parentLink.href));

  return [...new Set(urls)].filter(Boolean);
}

function getImageCandidateUrls(el) {
  const urls = getImageUrls(el);
  const tagName = el.tagName;

  if (tagName === 'IMG' || tagName === 'SOURCE') {
    return urls;
  }

  return urls.filter(isImageLikeUrl);
}

function isImageLikeUrl(url) {
  const value = normalizeUrl(url).toLowerCase();
  return (
    value.startsWith('blob:') ||
    /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(value) ||
    value.includes('/image') ||
    value.includes('/download') ||
    value.includes('oaiusercontent.com') ||
    value.includes('oaidalleapiprod') ||
    value.includes('files.oaiu') ||
    value.includes('dalle') ||
    value.includes('gpt-image') ||
    value.includes('sdmnt')
  );
}

function isLikelyGeneratedImageUrl(url) {
  const value = normalizeUrl(url).toLowerCase();
  return (
    value.startsWith('blob:') ||
    value.includes('files.oaiu') ||
    value.includes('files.oaiusercontent.com') ||
    value.includes('oaidalleapiprod') ||
    value.includes('dalle') ||
    value.includes('gpt-image') ||
    value.includes('sdmnt')
  );
}

function isLikelyPlaceholderImageUrl(url) {
  const value = normalizeUrl(url).toLowerCase();
  return (
    value.startsWith('data:image/') ||
    value.includes('checker') ||
    value.includes('checkered') ||
    value.includes('transparent-grid') ||
    value.includes('transparency-grid') ||
    value.includes('placeholder') ||
    value.includes('empty-state')
  );
}

function querySelectorAllDeep(root, selector) {
  const results = [];
  const seenRoots = new Set();

  function visit(currentRoot) {
    if (!currentRoot || seenRoots.has(currentRoot) || !currentRoot.querySelectorAll) return;
    seenRoots.add(currentRoot);

    const matches = Array.from(currentRoot.querySelectorAll(selector));
    results.push(...matches);

    Array.from(currentRoot.querySelectorAll('*')).forEach(el => {
      if (el.shadowRoot) visit(el.shadowRoot);
    });
  }

  visit(root);
  return results;
}

function getAssistantContainers() {
  return querySelectorAllDeep(document, ASSISTANT_CONTAINER_SELECTOR)
    .filter(el => !el.closest(`#${POPUP_ID}`));
}

function isInsideUserMessage(el) {
  return Boolean(el.closest(
    'div[data-message-author-role="user"], div[data-author-role="user"], article[data-testid*="user"]'
  ));
}

function getVisibilityInfo(el) {
  const rectSource = el.tagName === 'SOURCE'
    ? (el.closest('picture')?.querySelector('img') || el.parentElement || el)
    : el;
  const rect = rectSource.getBoundingClientRect();
  const style = window.getComputedStyle(rectSource);
  const visible = (
    rect.width >= 80 &&
    rect.height >= 80 &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0.05
  );

  return {
    visible,
    area: rect.width * rect.height
  };
}

function isVisibleElement(el, minWidth = 1, minHeight = 1) {
  if (!(el instanceof Element)) return false;
  if (el.closest(`#${POPUP_ID}`)) return false;

  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);

  return (
    rect.width >= minWidth &&
    rect.height >= minHeight &&
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity || 1) > 0.05
  );
}

function visibleTextMatches(pattern) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent || "";
    const parent = node.parentElement;
    if (text.trim() && parent && isVisibleElement(parent) && pattern.test(text)) {
      return true;
    }
    node = walker.nextNode();
  }

  return false;
}

const UPLOAD_ERROR_PATTERN = /failed upload|upload failed|could not upload|couldn't upload|files\.oaiusercontent\.com|network settings allow access|network administrator|tải lên thất bại|không thể tải lên/i;

function getVisibleUploadErrorElements() {
  const elements = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();

  while (node) {
    const text = node.textContent || "";
    const parent = node.parentElement;
    if (
      text.trim() &&
      parent &&
      !parent.closest(`#${POPUP_ID}`) &&
      isVisibleElement(parent) &&
      UPLOAD_ERROR_PATTERN.test(text)
    ) {
      elements.push(parent);
    }
    node = walker.nextNode();
  }

  return [...new Set(elements)];
}

async function clearFailedUploadUi() {
  const errorElements = getVisibleUploadErrorElements();

  for (const errorElement of errorElements) {
    let container = errorElement;
    for (let depth = 0; container && depth < 5; depth += 1) {
      const buttons = Array.from(container.querySelectorAll('button, [role="button"]'));
      const dismissButton = buttons.find(button => {
        const label = [
          button.getAttribute('aria-label'),
          button.getAttribute('title'),
          button.textContent
        ].filter(Boolean).join(' ').toLowerCase();

        return /close|dismiss|remove|retry|đóng|xóa|thử lại|×|x/.test(label);
      });

      if (dismissButton) {
        dismissButton.click();
        break;
      }
      container = container.parentElement;
    }
  }

  const attachmentRemoveButtons = querySelectorAllDeep(document, 'button, [role="button"]')
    .filter(button => !button.closest(`#${POPUP_ID}`))
    .filter(button => {
      const label = [
        button.getAttribute('aria-label'),
        button.getAttribute('title')
      ].filter(Boolean).join(' ').toLowerCase();

      return /remove (file|attachment|image)|xóa (tệp|file|ảnh)|remove uploaded/.test(label);
    });

  attachmentRemoveButtons.forEach(button => button.click());
  if (errorElements.length > 0 || attachmentRemoveButtons.length > 0) {
    await sleep(750);
  }
}

function dispatchFilePaste(textarea, file) {
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);

  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer
  });

  textarea.focus();
  textarea.dispatchEvent(pasteEvent);
}

function dispatchFileInput(file) {
  const inputs = querySelectorAllDeep(document, 'input[type="file"]')
    .filter(input => !input.closest(`#${POPUP_ID}`))
    .filter(input => {
      const accept = (input.getAttribute('accept') || "").toLowerCase();
      return !accept || accept.includes('image') || accept.includes('*/*');
    });

  const input = inputs[inputs.length - 1];
  if (!input) return false;

  try {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const filesSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;

    if (filesSetter) {
      filesSetter.call(input, dataTransfer.files);
    } else {
      input.files = dataTransfer.files;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  } catch (error) {
    void error;
    return false;
  }
}

async function waitForUploadReady(timeoutMs = 30000) {
  const startedAt = Date.now();
  let readySince = null;

  while (Date.now() - startedAt < timeoutMs) {
    const sendButton = document.querySelector('button[data-testid="send-button"]');
    const sendReady = Boolean(sendButton && !sendButton.disabled);
    const hasUploadError = getVisibleUploadErrorElements().length > 0;

    if (hasUploadError && Date.now() - startedAt > 1200) {
      const error = new Error(t('err.uploadFailed'));
      error.code = 'UPLOAD_FAILED';
      throw error;
    }

    if (sendReady && !hasUploadError) {
      if (!readySince) readySince = Date.now();
      if (Date.now() - readySince >= 1500) return sendButton;
    } else {
      readySince = null;
    }

    await sleep(500);
  }

  const error = new Error(t('err.uploadTimeout'));
  error.code = 'UPLOAD_TIMEOUT';
  throw error;
}

async function uploadFileWithRetry(textarea, uploadFiles, taskId, maxAttempts = 3) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await clearFailedUploadUi();
    const file = uploadFiles[Math.min(attempt - 1, uploadFiles.length - 1)];

    if (attempt > 1) {
      reportProgress(
        66,
        t('prog.retryLighter', { a: attempt, max: maxAttempts }),
        'info',
        taskId
      );
    }

    const usedDirectInput = dispatchFileInput(file);
    if (!usedDirectInput) {
      dispatchFilePaste(textarea, file);
    }
    reportProgress(
      70,
      attempt > 1
        ? t('prog.waitUploadAttempt', { name: file.name, size: formatFileSize(file.size), a: attempt })
        : t('prog.waitUpload', { name: file.name, size: formatFileSize(file.size) }),
      'info',
      taskId
    );

    try {
      return await waitForUploadReady();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts) break;

      await clearFailedUploadUi();
      await sleep(attempt * 4000);
    }
  }

  const error = new Error(t('err.uploadGiveUp', { max: maxAttempts, msg: lastError?.message || t('err.unknown') }));
  error.code = 'UPLOAD_RECOVERY_NEEDED';
  throw error;
}

function isChatGptGenerationInProgress() {
  const statusTextPattern = /setting the scene|sketching it out|one last tweak|making edits|almost there|creating image|generating image|drawing|rendering|working on it|finalizing|polishing/i;
  return visibleTextMatches(statusTextPattern);
}

const CONTENT_POLICY_REFUSAL_PATTERN = /image we created may violate our content policies|may violate (?:our )?content polic(?:y|ies)|can't (?:help|assist) with (?:that|this) (?:image|request)|cannot (?:help|assist) with (?:that|this) (?:image|request)/i;

function getVisibleContentPolicyRefusalContainers() {
  return getAssistantContainers().filter(container => {
    if (!isVisibleElement(container)) return false;
    return CONTENT_POLICY_REFUSAL_PATTERN.test(container.textContent || "");
  });
}

function hasNewContentPolicyRefusal(knownPolicyRefusals) {
  return getVisibleContentPolicyRefusalContainers()
    .some(container => !knownPolicyRefusals.has(container));
}

function getFinalImageControls() {
  return querySelectorAllDeep(document, 'button, [role="button"]')
    .filter(el => !el.closest(`#${POPUP_ID}`))
    .filter(el => !isInsideUserMessage(el))
    .filter(el => {
      const text = (el.textContent || "").trim().toLowerCase();
      const label = (el.getAttribute('aria-label') || "").trim().toLowerCase();
      const title = (el.getAttribute('title') || "").trim().toLowerCase();

      return (
        text === 'edit' ||
        text === 'chỉnh sửa' ||
        label.includes('edit image') ||
        label.includes('download image') ||
        label.includes('chỉnh sửa ảnh') ||
        label.includes('tải xuống ảnh') ||
        title.includes('edit image') ||
        title.includes('download image') ||
        title.includes('chỉnh sửa ảnh') ||
        title.includes('tải xuống ảnh')
      );
    });
}

function findImageUrlNearControl(control) {
  let root = control.parentElement;

  for (let depth = 0; root && depth < 8; depth += 1) {
    const candidates = getImageCandidates(root)
      .filter(candidate => candidate.area >= 20000)
      .filter(candidate => candidate.generated || candidate.element.tagName === 'IMG')
      .sort((a, b) => {
        if (a.generated !== b.generated) return a.generated ? -1 : 1;
        if (a.element.tagName !== b.element.tagName) return a.element.tagName === 'IMG' ? -1 : 1;
        return b.area - a.area;
      });

    if (candidates.length > 0) {
      return candidates[0].url;
    }

    root = root.parentElement;
  }

  return null;
}

function findNewFinalImageUrl(knownFinalControls) {
  const newControls = getFinalImageControls()
    .filter(control => !knownFinalControls.has(control))
    .reverse();

  for (const control of newControls) {
    const imageUrl = findImageUrlNearControl(control);
    if (imageUrl) return imageUrl;
  }

  return null;
}

function findAllNewFinalImageUrls(knownFinalControls) {
  const urls = [];
  const seen = new Set();
  const newControls = getFinalImageControls()
    .filter(control => !knownFinalControls.has(control));

  for (const control of newControls) {
    const imageUrl = findImageUrlNearControl(control);
    if (imageUrl && !seen.has(imageUrl)) {
      seen.add(imageUrl);
      urls.push(imageUrl);
    }
  }

  return urls;
}

function getImageCandidates(root = document) {
  const candidates = [];
  const seenUrls = new Set();
  const elements = querySelectorAllDeep(root, 'img, source[srcset], a[href]');

  for (const el of elements) {
    if (el.closest(`#${POPUP_ID}`)) continue;
    if (isInsideUserMessage(el)) continue;

    const visibility = getVisibilityInfo(el);
    const urls = getImageCandidateUrls(el);
    if (urls.length === 0) continue;

    for (const url of urls) {
      if (seenUrls.has(url)) continue;
      if (isLikelyPlaceholderImageUrl(url)) continue;
      seenUrls.add(url);
      candidates.push({
        url,
        element: el,
        visible: visibility.visible,
        area: visibility.area,
        generated: isLikelyGeneratedImageUrl(url)
      });
    }
  }

  return candidates;
}

function collectImageUrls(root = document) {
  const urls = new Set();
  getImageCandidates(root).forEach(candidate => urls.add(candidate.url));
  return urls;
}

function findAllNewImageUrls(knownImageUrls, knownAssistantCount) {
  const assistantContainers = getAssistantContainers();
  const preferredContainers = assistantContainers.length > knownAssistantCount
    ? assistantContainers.slice(knownAssistantCount)
    : assistantContainers;

  const found = [];
  const seenUrls = new Set();
  const seenElements = new Set();

  function addCandidates(candidates) {
    for (const candidate of candidates) {
      if (knownImageUrls.has(candidate.url) || seenUrls.has(candidate.url)) continue;
      if (candidate.area < 20000) continue;
      if (candidate.element.tagName === 'A') continue;
      if (!candidate.generated && candidate.element.tagName !== 'IMG') continue;

      const elementKey = candidate.element.tagName === 'SOURCE'
        ? (candidate.element.closest('picture')?.querySelector('img') || candidate.element)
        : candidate.element;

      if (seenElements.has(elementKey)) continue;
      seenElements.add(elementKey);
      seenUrls.add(candidate.url);
      found.push(candidate);
    }
  }

  // Scan preferred (new) assistant containers first
  for (const container of preferredContainers) {
    addCandidates(getImageCandidates(container));
  }

  // Fallback: also check whole document for generated URLs not yet captured
  const globalCandidates = getImageCandidates(document)
    .filter(c => c.generated);
  addCandidates(globalCandidates);

  // Sort: generated first, then visible-large first
  return found
    .sort((a, b) => {
      if (a.generated !== b.generated) return a.generated ? -1 : 1;
      if (a.visible !== b.visible) return a.visible ? -1 : 1;
      return b.area - a.area;
    })
    .map(c => c.url);
}

async function waitForAllGeneratedImages(
  knownImageUrls,
  knownAssistantCount,
  knownFinalControls,
  knownPolicyRefusals,
  taskId,
  runId,
  timeoutMs = 300000,
  stalledTimeoutMs = null
) {
  const startedAt = Date.now();
  let lastProgressAt = 0;
  let lastImageChangeAt = null;
  let sawFinalControlResult = false;
  const collectedUrls = new Set();

  while (Date.now() - startedAt < timeoutMs) {
    if (runId !== activeAutomationRunId) {
      const err = new Error(t('err.superseded'));
      err.code = 'TASK_SUPERSEDED';
      throw err;
    }

    const elapsedMs = Date.now() - startedAt;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    if (hasNewContentPolicyRefusal(knownPolicyRefusals)) {
      const error = new Error(t('err.policyRefusal'));
      error.code = 'CONTENT_POLICY_REFUSAL';
      throw error;
    }

    if (elapsedSeconds >= 30 && elapsedSeconds - lastProgressAt >= 30) {
      lastProgressAt = elapsedSeconds;
      const percent = Math.min(89, 85 + Math.floor(elapsedSeconds / 45));
      reportProgress(percent, t('prog.stillGen', { s: elapsedSeconds }), 'info', taskId);
    }

    const finalControlUrls = findAllNewFinalImageUrls(knownFinalControls);
    const scanUrls = findAllNewImageUrls(knownImageUrls, knownAssistantCount);
    const candidateUrls = [
      ...finalControlUrls,
      ...scanUrls
    ];

    if (
      stalledTimeoutMs &&
      elapsedMs >= stalledTimeoutMs &&
      collectedUrls.size === 0 &&
      isChatGptGenerationInProgress()
    ) {
      throw new Error(t('err.genStalled', { min: Math.round(stalledTimeoutMs / 60000) }));
    }

    let foundNewUrl = false;
    for (const url of candidateUrls) {
      if (!collectedUrls.has(url)) {
        collectedUrls.add(url);
        foundNewUrl = true;
      }
    }

    if (finalControlUrls.some(url => collectedUrls.has(url))) {
      sawFinalControlResult = true;
    }

    if (foundNewUrl) {
      lastImageChangeAt = Date.now();
    }

    if (collectedUrls.size > 0 && lastImageChangeAt) {
      const stableForMs = Date.now() - lastImageChangeAt;
      const stillGenerating = isChatGptGenerationInProgress();
      const readyStableMs = sawFinalControlResult ? 1200 : 3000;
      const staleLoadingStableMs = sawFinalControlResult ? 3500 : 8000;

      // A clean completion returns quickly. If stale loading text remains in the DOM,
      // final image controls plus a longer stable window still prove completion.
      if ((!stillGenerating && stableForMs >= readyStableMs) || stableForMs >= staleLoadingStableMs) {
        return [...collectedUrls];
      }
    }

    await sleep(500);
  }

  const timeoutMinutes = Math.round(timeoutMs / 60000);
  throw new Error(t('err.genTimeout', { min: timeoutMinutes }));
}

let popupContainer = null;

function createPopup() {
  if (!isTargetCustomGptPage() || document.getElementById(POPUP_ID)) return;
  
  popupContainer = document.createElement('div');
  popupContainer.id = POPUP_ID;
  popupContainer.style.cssText = `
    position: fixed;
    top: 50px;
    right: 50px;
    width: 430px;
    height: 700px;
    z-index: 2147483647;
    border: 1px solid rgba(255, 205, 120, 0.18);
    border-radius: 16px;
    background-color: rgba(11, 10, 8, 0.72);
    background-image:
      radial-gradient(420px 320px at 85% -10%, rgba(255, 182, 39, 0.20), transparent 70%),
      radial-gradient(360px 300px at -10% 110%, rgba(200, 144, 42, 0.16), transparent 70%);
    -webkit-backdrop-filter: blur(22px);
    backdrop-filter: blur(22px);
    box-shadow: 0 24px 70px rgba(0,0,0,0.92), 0 0 26px rgba(255, 182, 39, 0.12), inset 0 1px 0 rgba(255, 235, 190, 0.16);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: 'Fira Code', monospace;
  `;
  
  // Header / Drag Handle
  const header = document.createElement('div');
  header.style.cssText = `
    height: 40px;
    background: rgba(255, 210, 120, 0.06);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
    cursor: move;
    border-bottom: 1px solid rgba(255, 205, 120, 0.16);
    box-shadow: inset 0 1px 0 rgba(255, 235, 190, 0.18);
    user-select: none;
  `;

  // Left Title
  const title = document.createElement('div');
  title.innerHTML = `
    <span style="color:#ffb627; margin-right:7px; text-shadow:0 0 10px rgba(255,182,39,0.5);">◆</span>
    <span style="display:inline-flex; flex-direction:column; gap:1px; vertical-align:middle;">
      <span>BG <b style="color:#ffb627;">REMOVER</b> PRO</span>
      <span style="font-size:7px; color:#9a9180; letter-spacing:0.08em;">made by Sfrankie</span>
    </span>
  `;
  title.style.cssText = `
    font-size: 11px;
    color: #f6f2e9;
    font-weight: 500;
    font-family: 'Fira Code', monospace;
    pointer-events: none;
    letter-spacing: 0.12em;
  `;

  // Right Control Buttons Group
  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = `
    display: flex;
    gap: 6px;
    align-items: center;
  `;

  // Helper function to style individual control buttons
  function createControlBtn(content, hoverBg, hoverColor) {
    const btn = document.createElement('span');
    btn.innerHTML = content;
    btn.style.cssText = `
      width: 24px;
      height: 24px;
      background: rgba(255, 210, 120, 0.06);
      border: 1px solid rgba(255, 205, 120, 0.14);
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #9a9180;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      font-family: 'Fira Code', monospace;
      line-height: 1;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = hoverBg || 'rgba(255, 182, 39, 0.15)';
      btn.style.color = hoverColor || '#ffb627';
      btn.style.borderColor = hoverBg || 'rgba(255, 182, 39, 0.4)';
      btn.style.boxShadow = '0 0 12px rgba(255, 182, 39, 0.25)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 210, 120, 0.06)';
      btn.style.color = '#9a9180';
      btn.style.borderColor = 'rgba(255, 205, 120, 0.14)';
      btn.style.boxShadow = 'none';
    });
    
    return btn;
  }

  // 1. Minimize Button
  let isMinimized = false;
  const minBtn = createControlBtn('<span style="transform: translateY(-2px); display: inline-block;">_</span>', 'rgba(255, 182, 39, 0.15)', '#ffb627');
  minBtn.title = "Thu nhỏ / Mở rộng";
  minBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMinimized = !isMinimized;
    if (isMinimized) {
      popupContainer.style.height = '40px';
      iframe.style.display = 'none';
      minBtn.innerHTML = '<span style="transform: translateY(0px); display: inline-block;">□</span>';
    } else {
      popupContainer.style.height = '640px';
      iframe.style.display = 'block';
      minBtn.innerHTML = '<span style="transform: translateY(-2px); display: inline-block;">_</span>';
    }
  });

  // 2. Maximize Button (toggles height/width for better editor view)
  let isMaximized = false;
  const maxBtn = createControlBtn('▢', 'rgba(255, 182, 39, 0.15)', '#ffb627');
  maxBtn.title = "Phóng to / Thu nhỏ";
  maxBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isMaximized = !isMaximized;
    if (isMaximized) {
      popupContainer.style.width = '550px';
      popupContainer.style.height = '800px';
      maxBtn.innerHTML = '⧉'; // restore icon
    } else {
      popupContainer.style.width = '380px';
      popupContainer.style.height = isMinimized ? '40px' : '640px';
      maxBtn.innerHTML = '▢';
    }
  });

  // 3. Close Button
  const closeBtn = createControlBtn('✕', 'rgba(255, 95, 86, 0.85)', '#fff');
  closeBtn.title = "Đóng";
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePopup();
  });

  btnGroup.appendChild(minBtn);
  btnGroup.appendChild(maxBtn);
  btnGroup.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(btnGroup);
  
  // Iframe
  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('panel.html');
  iframe.style.cssText = `
    flex: 1;
    border: none;
    background: transparent;
    width: 100%;
    height: 100%;
  `;
  
  popupContainer.appendChild(header);
  popupContainer.appendChild(iframe);
  document.body.appendChild(popupContainer);
  
  // Dragging event handling
  let isDragging = false;
  let startX, startY;
  let initialX, initialY;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = popupContainer.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    // Add drag cover to prevent losing mouse focus inside the iframe
    const cover = document.createElement('div');
    cover.id = 'sfrankie-bg-remover-drag-cover';
    cover.style.cssText = 'position: absolute; top: 40px; left: 0; width: 100%; height: calc(100% - 40px); z-index: 99999; background: transparent;';
    popupContainer.appendChild(cover);
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let newX = initialX + dx;
    let newY = initialY + dy;
    
    const maxX = window.innerWidth - popupContainer.offsetWidth;
    const maxY = window.innerHeight - popupContainer.offsetHeight;
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    popupContainer.style.left = `${newX}px`;
    popupContainer.style.top = `${newY}px`;
    popupContainer.style.right = 'auto';
    popupContainer.style.bottom = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      const cover = document.getElementById('sfrankie-bg-remover-drag-cover');
      if (cover) cover.remove();
    }
  });
}

function togglePopup() {
  if (!popupContainer) {
    createPopup();
  } else {
    if (popupContainer.style.display === 'none') {
      popupContainer.style.display = 'flex';
    } else {
      popupContainer.style.display = 'none';
    }
  }
}

// Listen for tasks from Background Script
let activeAutomationRunId = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_BACKGROUND_REMOVAL') {
    if (!isTargetCustomGptPage()) {
      sendResponse({ status: 'wrong-page' });
      return true;
    }
    activeAutomationRunId += 1;
    executeBackgroundRemoval(message, activeAutomationRunId);
    sendResponse({ status: 'received' });
  } else if (message.type === 'TOGGLE_POPUP') {
    togglePopup();
    sendResponse({ status: 'toggled' });
  }
  return true;
});

// Main Automation Flow
async function executeBackgroundRemoval(task, runId) {
  try {
    reportProgress(50, t('prog.locating'), 'info', task.taskId);
    
    // 1. Wait for prompt textarea
    const textarea = await waitForElement('#prompt-textarea', 20000);
    reportProgress(55, t('prog.preparingSource'), 'info', task.taskId);
    
    // 2. Reconstruct the source and create a lightweight upload copy when needed.
    // The original queue file and high-resolution downloaded result remain untouched.
    const sourceFile = await dataURLtoFile(task.fileDataUrl, task.fileName, task.fileType);
    const uploadFiles = await prepareUploadFiles(sourceFile, task.taskId);
    
    // 3. Upload the image with automatic retries for transient CDN/network failures
    reportProgress(65, t('prog.uploading'), 'info', task.taskId);
    let sendBtn = await uploadFileWithRetry(textarea, uploadFiles, task.taskId);
    
    // 5. Inject prompt
    const backgroundRemover = globalThis.SfrankieBackgroundRemover;
    reportProgress(
      75,
      backgroundRemover.progressText,
      'info',
      task.taskId
    );
    
    let compiledPrompt = backgroundRemover.prompt;
    
    if (compiledPrompt.trim()) {
      textarea.focus();
      document.execCommand('insertText', false, compiledPrompt);
    }
    
    // Wait for DOM to register text value
    await sleep(500);
    
    // 6. Click the Send Button
    reportProgress(80, t('prog.sending'), 'info', task.taskId);
    sendBtn = document.querySelector('button[data-testid="send-button"]');
    if (!sendBtn || sendBtn.disabled) {
      throw new Error(t('err.noSendBtn'));
    }

    let knownImageUrls = collectImageUrls(document);
    let knownAssistantCount = getAssistantContainers().length;
    let knownFinalControls = new Set(getFinalImageControls());
    let knownPolicyRefusals = new Set(getVisibleContentPolicyRefusalContainers());
    sendBtn.click();

    // 7. Wait for ChatGPT to finish generating ALL images
    reportProgress(
      85,
      t('prog.waitingGen'),
      'info',
      task.taskId
    );
    const generationTimeoutMs = 7 * 60 * 1000;
    const stalledTimeoutMs = sourceFile.size < 512 * 1024
      ? 3 * 60 * 1000
      : null;
    const targetImageUrls = await waitForAllGeneratedImages(
      knownImageUrls,
      knownAssistantCount,
      knownFinalControls,
      knownPolicyRefusals,
      task.taskId,
      runId,
      generationTimeoutMs,
      stalledTimeoutMs
    );

    // 8. Extract ALL result images
    reportProgress(90, t('prog.extracting', { n: targetImageUrls.length }), 'info', task.taskId);
    reportProgress(95, t('prog.fetching', { n: targetImageUrls.length }), 'info', task.taskId);

    // Convert each image to Base64 in parallel to bypass CORS
    const base64Urls = await Promise.all(
      targetImageUrls.map(url => fetchImageAsBase64(url))
    );

    // Send all images back to panel
    chrome.runtime.sendMessage({
      type: 'BG_REMOVER_DONE',
      taskId: task.taskId,
      imageUrls: base64Urls
    }, () => void chrome.runtime.lastError);
    
  } catch (error) {
    if (error.code === 'TASK_SUPERSEDED') {
      return;
    }
    if (error.code === 'UPLOAD_RECOVERY_NEEDED' && !task.recoveredAfterRefresh) {
      reportProgress(
        64,
        t('prog.uploadRejected'),
        'info',
        task.taskId
      );
      chrome.runtime.sendMessage({
        type: 'REQUEST_GPT_REFRESH_AND_RETRY',
        task
      });
      return;
    }
    console.error("Automation Error:", error);
    reportProgress(0, t('prog.opError', { msg: error.message }), 'error', task.taskId);
  }
}

// Automatically render the popup when content script loads on ChatGPT
createPopup();
