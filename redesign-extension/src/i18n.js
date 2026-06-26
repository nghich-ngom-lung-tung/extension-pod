/* ══════════════════════════════════════
   Sfrankie GPT Auto Redesign Pro
   Shared i18n dictionary (VI / EN)
   Works as a classic script (panel iframe + content script)
   and as a side-effect module import (background service worker).
   ══════════════════════════════════════ */
(() => {
  const DICT = {
    /* ── Status pill ── */
    'status.ready':      { vi: 'SẴN SÀNG',   en: 'READY' },
    'status.processing': { vi: 'ĐANG XỬ LÝ', en: 'PROCESSING' },
    'status.error':      { vi: 'LỖI',        en: 'ERROR' },

    /* ── Static UI ── */
    'dropzone.title':       { vi: 'KÉO & THẢ ẢNH VÀO ĐÂY',  en: 'DRAG & DROP IMAGES' },
    'dropzone.sub':         { vi: 'hoặc bấm để thêm ảnh bất cứ lúc nào',  en: 'or click to add more files anytime' },
    'queue.heading':        { vi: 'HÀNG CHỜ XỬ LÝ',                       en: 'PROCESSING QUEUE' },
    'queue.clear':          { vi: 'XOÁ',                                  en: 'CLEAR' },
    'settings.title':       { vi: 'THIẾT LẬP',                            en: 'SETTINGS' },
    'label.mode':           { vi: 'CHẾ ĐỘ XỬ LÝ',                         en: 'OPERATION MODE' },
    'label.defaultStyle':   { vi: 'STYLE MẶC ĐỊNH CHO ẢNH MỚI',          en: 'DEFAULT STYLE FOR NEW IMAGES' },
    'label.customPrompt':   { vi: 'THAM SỐ PROMPT TUỲ CHỈNH',            en: 'CUSTOM PROMPT PARAMETERS' },
    'label.resolution':     { vi: 'ĐỘ PHÂN GIẢI XUẤT POD',               en: 'POD EXPORT RESOLUTION' },
    'label.output':         { vi: 'XEM TRƯỚC KẾT QUẢ',                   en: 'OUTPUT PREVIEW' },
    'placeholder.customPrompt': {
      vi: "vd: --background black --add-text 'FRANKIE' --highly-detailed",
      en: "e.g. --background black --add-text 'FRANKIE' --highly-detailed"
    },
    'btn.execute':     { vi: 'CHẠY HÀNG CHỜ',          en: 'EXECUTE QUEUE' },
    'btn.stop':        { vi: 'DỪNG',                    en: 'STOP' },
    'btn.download':    { vi: 'TẢI PNG ĐÃ RESIZE',       en: 'DOWNLOAD RESIZED PNG' },
    'btn.downloadAll': { vi: 'TẢI TẤT CẢ ĐÃ XONG',      en: 'DOWNLOAD ALL COMPLETED' },

    /* ── Modes ── */
    'mode.redesign':     { vi: 'Thiết kế lại artwork',       en: 'Redesign Artwork' },
    'modeShort.redesign':{ vi: 'Thiết kế lại',               en: 'Redesign' },
    'modeShort.extract': { vi: 'Trích xuất & Phục dựng',     en: 'Extract & Restore' },

    /* ── Styles ── */
    'style.default':    { vi: 'Mặc định (không thêm style)', en: 'Default (No extra style)' },
    'style.cyberpunk':  { vi: 'Cyberpunk Neon',              en: 'Cyberpunk Neon' },
    'style.anime':      { vi: 'Anime Retro thập niên 90',    en: '90s Retro Anime' },
    'style.watercolor': { vi: 'Tranh màu nước',              en: 'Watercolor Painting' },
    'style.cartoon':    { vi: 'Hoạt hình 3D (Pixar)',        en: '3D Cartoon (Pixar)' },
    'style.minimal':    { vi: 'Vector tối giản',             en: 'Vector Minimal' },

    /* ── Extract & Restore meta ── */
    'er.label':    { vi: 'Trích xuất & Phục dựng', en: 'Extract & Restore' },
    'er.progress': { vi: 'Đang điền câu lệnh trích xuất và phục dựng...', en: 'Filling the extract & restore command...' },

    /* ── Queue item status ── */
    'qstatus.processing': { vi: 'Đang xử lý',     en: 'Processing' },
    'qstatus.completed':  { vi: 'Hoàn thành',     en: 'Completed' },
    'qstatus.queued':     { vi: 'Đang chờ',       en: 'Queued' },
    'qstatus.failed':     { vi: 'Thất bại',       en: 'Failed' },
    'qstatus.variant':    { vi: 'Biến thể #{n}',  en: 'Variant #{n}' },

    /* ── Tooltips / titles ── */
    'title.download':     { vi: 'Tải kết quả',           en: 'Download result' },
    'title.rework':       { vi: 'Làm lại ảnh gốc này',   en: 'Rework this source image' },
    'title.remove':       { vi: 'Xoá khỏi hàng chờ',     en: 'Remove from queue' },
    'title.itemMode':     { vi: 'Chế độ cho ảnh này',    en: 'Operation mode for this image' },
    'title.itemStyle':    { vi: 'Style cho ảnh này',     en: 'Style for this image' },
    'title.selectResult': { vi: 'Chọn {name}',           en: 'Select {name}' },

    /* ── Popup chrome tooltips (content.js) ── */
    'popup.minimize':     { vi: 'Thu nhỏ / Mở rộng',     en: 'Minimize / Expand' },
    'popup.maximize':     { vi: 'Phóng to / Thu nhỏ',    en: 'Maximize / Restore' },
    'popup.close':        { vi: 'Đóng',                  en: 'Close' },

    /* ── Panel progress (process-status-text) ── */
    'progress.ready':         { vi: 'SẴN SÀNG',                       en: 'READY' },
    'progress.starting':      { vi: 'ĐANG KHỞI ĐỘNG HÀNG CHỜ...',     en: 'STARTING QUEUE...' },
    'progress.preparing':     { vi: '[{pos}] ĐANG CHUẨN BỊ {name}',   en: '[{pos}] PREPARING {name}' },
    'progress.queueComplete': { vi: 'HOÀN TẤT HÀNG CHỜ {done}/{total}', en: 'QUEUE COMPLETE {done}/{total}' },
    'progress.completed':     { vi: '[{pos}] XONG ({n} ảnh)',         en: '[{pos}] COMPLETED ({n} images)' },
    'progress.stopped':       { vi: 'ĐÃ DỪNG',                        en: 'STOPPED' },

    /* ── Panel logs ── */
    'log.invalidImage':    { vi: 'Vui lòng chọn file hình ảnh hợp lệ.', en: 'Please select valid image files.' },
    'log.added':           { vi: 'Đã thêm {n} ảnh vào hàng chờ.',       en: 'Added {n} image(s) to the queue.' },
    'log.addedRunning':    { vi: 'Đã thêm {n} ảnh vào queue đang chạy.', en: 'Added {n} image(s) to the running queue.' },
    'log.reworked':        { vi: '{name}: đã đưa về hàng chờ {mode}. Có thể đổi mode/style rồi bấm CHẠY HÀNG CHỜ.', en: '{name}: moved back to the {mode} queue. Change mode/style then press EXECUTE QUEUE.' },
    'log.startProcessing': { vi: 'Bắt đầu xử lý {n} ảnh.',             en: 'Starting to process {n} image(s).' },
    'log.itemStart':       { vi: '[{pos}] Bắt đầu: {name}',            en: '[{pos}] Starting: {name}' },
    'log.sentToWorker':    { vi: '[{pos}] Đã gửi tác vụ sang Background Worker.', en: '[{pos}] Task handed to the Background Worker.' },
    'log.itemError':       { vi: '{name}: {error}',                    en: '{name}: {error}' },
    'log.itemDone':        { vi: '{name}: hoàn thành {n} ảnh.',        en: '{name}: completed {n} image(s).' },
    'log.wait4s':          { vi: 'Đợi 4 giây trước khi xử lý ảnh tiếp theo để ổn định upload...', en: 'Waiting 4s before the next image to stabilize the upload...' },
    'log.queueDone':       { vi: 'Queue hoàn tất: {done} tác vụ thành công, {variant} variant, {error} lỗi.', en: 'Queue done: {done} succeeded, {variant} variant(s), {error} error(s).' },
    'log.resizing':        { vi: 'Đang resize và tối ưu PNG {name}...', en: 'Resizing and optimizing PNG {name}...' },
    'log.optimized':       { vi: 'PNG đã tối ưu: {mb} MB.',            en: 'Optimized PNG: {mb} MB.' },
    'log.downloaded':      { vi: 'Đã tải {name}.',                     en: 'Downloaded {name}.' },
    'log.downloadAllStart':{ vi: 'Bắt đầu tải {n} ảnh đã hoàn thành.', en: 'Downloading {n} completed image(s).' },
    'log.downloadAllDone': { vi: 'Download All hoàn tất: {ok}/{total} ảnh.', en: 'Download All done: {ok}/{total} image(s).' },
    'log.appliedMode':     { vi: 'Đã áp dụng {mode} cho {n} ảnh đang chờ.', en: 'Applied {mode} to {n} pending image(s).' },
    'log.appliedStyle':    { vi: 'Đã áp dụng {style} cho {n} ảnh đang chờ.', en: 'Applied {style} to {n} pending image(s).' },
    'log.changedMode':     { vi: '{name}: đổi mode thành {mode}.',     en: '{name}: mode changed to {mode}.' },
    'log.changedStyle':    { vi: '{name}: đổi style thành {style}.',   en: '{name}: style changed to {style}.' },
    'log.stopped':         { vi: 'Đã dừng hàng chờ theo yêu cầu.',     en: 'Queue stopped on request.' },

    /* ── Panel errors ── */
    'err.readFile':        { vi: 'Không thể đọc file {name}',          en: 'Cannot read file {name}' },
    'err.workerComm':      { vi: 'Không thể giao tiếp với Service Worker: {msg}', en: 'Cannot reach the Service Worker: {msg}' },
    'err.noResult':        { vi: 'ChatGPT không trả về ảnh kết quả hợp lệ.', en: 'ChatGPT did not return valid result images.' },
    'err.loadResult':      { vi: 'Không thể tải ảnh kết quả để resize.', en: 'Cannot load the result image to resize.' },
    'err.canvasPng':       { vi: 'Không thể tạo PNG từ canvas.',       en: 'Cannot create PNG from canvas.' },
    'err.noResultExport':  { vi: 'Không có ảnh kết quả để xuất.',      en: 'No result image to export.' },
    'err.downloadStart':   { vi: 'Không thể bắt đầu download.',        en: 'Cannot start the download.' },
    'err.taskTimeout':     { vi: 'Hết thời gian chờ — tác vụ bị treo', en: 'Timed out — task stalled' },

    /* ── content.js progress ── */
    'prog.makingClean':     { vi: 'Đang tạo các bản upload sạch từ {fmt} ({size})...', en: 'Building clean upload copies from {fmt} ({size})...' },
    'prog.preparedCopies':  { vi: 'Đã chuẩn bị {n} bản upload: {summary}.', en: 'Prepared {n} upload copies: {summary}.' },
    'prog.retryLighter':    { vi: 'Upload thất bại, đang thử lại bằng bản nhẹ hơn ({a}/{max})...', en: 'Upload failed, retrying with a lighter copy ({a}/{max})...' },
    'prog.waitUpload':      { vi: 'Đợi upload {name} ({size}) hoàn tất...', en: 'Waiting for {name} ({size}) upload to finish...' },
    'prog.waitUploadAttempt': { vi: 'Đợi upload {name} ({size}) hoàn tất (lần {a})...', en: 'Waiting for {name} ({size}) upload to finish (attempt {a})...' },
    'prog.locating':        { vi: 'Đang định vị khung nhập liệu ChatGPT...', en: 'Locating the ChatGPT input box...' },
    'prog.preparingSource': { vi: 'Đang chuẩn bị ảnh nguồn để tải lên...', en: 'Preparing the source image for upload...' },
    'prog.uploading':       { vi: 'Đang tải ảnh lên khung chat ChatGPT...', en: 'Uploading the image to the ChatGPT chat...' },
    'prog.fillRedesign':    { vi: 'Đang điền câu lệnh thiết kế lại...', en: 'Filling the redesign command...' },
    'prog.sending':         { vi: 'Đang gửi yêu cầu sinh ảnh đến ChatGPT...', en: 'Sending the image request to ChatGPT...' },
    'prog.waitingGen':      { vi: 'Đang chờ ChatGPT tạo ảnh mới. Không đóng tab trong lúc xử lý...', en: 'Waiting for ChatGPT to generate images. Do not close the tab...' },
    'prog.policyFallback':  { vi: 'Bản phục dựng chính xác chưa tạo được. Đang tự thử bản sáng tạo với tiêu đề, nhân vật và biểu tượng mới...', en: 'The exact restoration could not be created. Automatically trying an original version with a new title, characters, and symbols...' },
    'prog.redesignFallback':{ vi: 'Bản thiết kế đầu tiên chưa tạo được. Đang tự thử concept nguyên bản với bố cục, tiêu đề và nhân vật mới...', en: 'The first redesign could not be created. Automatically trying an original concept with a new composition, title, and characters...' },
    'prog.stillGen':        { vi: 'ChatGPT vẫn đang tạo ảnh, tiếp tục chờ... ({s}s)', en: 'ChatGPT is still generating, still waiting... ({s}s)' },
    'prog.extracting':      { vi: 'Đang trích xuất {n} ảnh kết quả...', en: 'Extracting {n} result image(s)...' },
    'prog.fetching':        { vi: 'Đang tải {n} ảnh về bộ nhớ tạm...', en: 'Fetching {n} image(s) into memory...' },
    'prog.uploadRejected':  { vi: 'Upload bị ChatGPT/CDN từ chối. Đang tự refresh tab GPT rồi thử lại một lần...', en: 'Upload rejected by ChatGPT/CDN. Auto-refreshing the GPT tab and retrying once...' },
    'prog.opError':         { vi: 'Thao tác lỗi: {msg}',              en: 'Operation error: {msg}' },

    /* ── content.js errors ── */
    'err.uploadFailed':   { vi: 'ChatGPT báo tải ảnh thất bại.',       en: 'ChatGPT reported the upload failed.' },
    'err.uploadTimeout':  { vi: 'Ảnh tải lên quá lâu hoặc nút gửi không sẵn sàng.', en: 'Upload took too long or the send button is not ready.' },
    'err.uploadGiveUp':   { vi: 'Không thể upload ảnh sau {max} lần: {msg}', en: 'Could not upload the image after {max} tries: {msg}' },
    'err.noSendBtn':      { vi: 'Không thể tìm thấy nút gửi (Send Button) trên trang ChatGPT.', en: 'Could not find the Send button on the ChatGPT page.' },
    'err.genTimeout':     { vi: 'Quá thời gian chờ ảnh kết quả xuất hiện (Timeout {min} phút).', en: 'Timed out waiting for result images (Timeout {min} min).' },
    'err.policyRefusal':  { vi: 'ChatGPT vẫn từ chối sau cả lần phục dựng an toàn. Đây là giới hạn policy của ảnh nguồn, không phải lỗi upload.', en: 'ChatGPT still refused after the safe reconstruction attempt. This is a source-image policy restriction, not an upload error.' },
    'err.superseded':     { vi: 'Tác vụ đã được thay thế bởi lần chạy mới.', en: 'Task was superseded by a newer run.' },
    'err.imageConvertFailed': { vi: 'Không tải được ảnh kết quả',     en: 'Failed to load result images' },
    'err.unknown':        { vi: 'Lỗi không xác định',                  en: 'Unknown error' },

    /* ── background.js ── */
    'prog.connecting':     { vi: 'Đang kết nối content script trên ChatGPT (Lần thử {i})...', en: 'Connecting to the content script on ChatGPT (attempt {i})...' },
    'err.noContentScript': { vi: 'Không thể thiết lập kết nối tới Content Script của ChatGPT.', en: 'Could not establish a connection to the ChatGPT content script.' },
    'err.tabClosed':       { vi: 'Tab đã bị đóng.',                    en: 'The tab was closed.' },
    'err.pageLoadTimeout': { vi: 'Trang web tải quá lâu hoặc không phản hồi.', en: 'The page took too long to load or is unresponsive.' },
    'prog.refreshing':     { vi: 'Đang refresh tab Custom GPT để phục hồi upload...', en: 'Refreshing the Custom GPT tab to recover the upload...' },
    'prog.refreshed':      { vi: 'Tab GPT đã refresh xong. Đang gửi lại tác vụ...', en: 'GPT tab refreshed. Re-sending the task...' },
    'err.refreshFail':     { vi: 'Thất bại sau khi refresh GPT: {msg}', en: 'Failed after refreshing GPT: {msg}' },
    'prog.checkingTabs':   { vi: 'Đang kiểm tra các tab ChatGPT...',   en: 'Checking ChatGPT tabs...' },
    'prog.locatedTab':     { vi: 'Đã định vị tab Custom GPT...',       en: 'Located the Custom GPT tab...' },
    'prog.waitPageLoad':   { vi: 'Đợi trang ChatGPT tải xong...',      en: 'Waiting for the ChatGPT page to load...' },
    'prog.pageLoaded':     { vi: 'Trang đã tải xong. Bắt đầu truyền dữ liệu thiết kế...', en: 'Page loaded. Transferring design data...' },
    'prog.dataSent':       { vi: 'Đã gửi dữ liệu thành công. ChatGPT đang xử lý upload...', en: 'Data sent. ChatGPT is processing the upload...' },
    'prog.failed':         { vi: 'Thất bại: {msg}',                    en: 'Failed: {msg}' }
  };

  let lang = 'vi';

  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  globalThis.SfrankieI18n = {
    DICT,
    getLang() { return lang; },
    setLang(value) { lang = value === 'en' ? 'en' : 'vi'; return lang; },
    t(key, params) {
      const entry = DICT[key];
      const template = entry ? (entry[lang] ?? entry.vi ?? key) : key;
      return interpolate(template, params);
    }
  };
})();
