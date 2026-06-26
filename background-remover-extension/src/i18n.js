(() => {
  const DICT = {
    'status.ready': { vi: 'SẴN SÀNG', en: 'READY' },
    'status.processing': { vi: 'ĐANG XỬ LÝ', en: 'PROCESSING' },
    'status.error': { vi: 'LỖI', en: 'ERROR' },

    'dropzone.title': { vi: 'KÉO & THẢ ẢNH VÀO ĐÂY', en: 'DRAG & DROP IMAGES' },
    'dropzone.sub': { vi: 'hoặc bấm để thêm ảnh bất cứ lúc nào', en: 'or click to add more files anytime' },
    'queue.heading': { vi: 'HÀNG CHỜ XỬ LÝ', en: 'PROCESSING QUEUE' },
    'queue.clear': { vi: 'XÓA', en: 'CLEAR' },
    'settings.title': { vi: 'THIẾT LẬP', en: 'SETTINGS' },
    'label.resolution': { vi: 'ĐỘ PHÂN GIẢI XUẤT PNG', en: 'PNG EXPORT RESOLUTION' },
    'label.output': { vi: 'XEM TRƯỚC KẾT QUẢ', en: 'OUTPUT PREVIEW' },
    'btn.execute': { vi: 'XÓA NỀN HÀNG CHỜ', en: 'REMOVE BACKGROUNDS' },
    'btn.stop': { vi: 'DỪNG', en: 'STOP' },
    'btn.download': { vi: 'TẢI PNG TRONG SUỐT', en: 'DOWNLOAD TRANSPARENT PNG' },
    'btn.downloadAll': { vi: 'TẢI TẤT CẢ ẢNH ĐÃ XONG', en: 'DOWNLOAD ALL COMPLETED' },

    'br.label': { vi: 'Xóa nền', en: 'Remove Background' },
    'br.progress': { vi: 'Đang dùng hướng dẫn GPT mặc định, không gửi prompt bổ sung...', en: 'Using the GPT default instructions without extra prompt text...' },

    'qstatus.processing': { vi: 'Đang xử lý', en: 'Processing' },
    'qstatus.completed': { vi: 'Hoàn thành', en: 'Completed' },
    'qstatus.queued': { vi: 'Đang chờ', en: 'Queued' },
    'qstatus.failed': { vi: 'Thất bại', en: 'Failed' },
    'qstatus.variant': { vi: 'Biến thể #{n}', en: 'Variant #{n}' },

    'title.download': { vi: 'Tải PNG trong suốt', en: 'Download transparent PNG' },
    'title.rework': { vi: 'Xử lý lại ảnh nguồn này', en: 'Process this source image again' },
    'title.remove': { vi: 'Xóa khỏi hàng chờ', en: 'Remove from queue' },
    'title.selectResult': { vi: 'Chọn {name}', en: 'Select {name}' },

    'popup.minimize': { vi: 'Thu nhỏ / Mở rộng', en: 'Minimize / Expand' },
    'popup.maximize': { vi: 'Phóng to / Thu nhỏ', en: 'Maximize / Restore' },
    'popup.close': { vi: 'Đóng', en: 'Close' },

    'progress.ready': { vi: 'SẴN SÀNG', en: 'READY' },
    'progress.starting': { vi: 'ĐANG KHỞI ĐỘNG HÀNG CHỜ...', en: 'STARTING QUEUE...' },
    'progress.preparing': { vi: '[{pos}] ĐANG CHUẨN BỊ {name}', en: '[{pos}] PREPARING {name}' },
    'progress.queueComplete': { vi: 'HOÀN TẤT HÀNG CHỜ {done}/{total}', en: 'QUEUE COMPLETE {done}/{total}' },
    'progress.completed': { vi: '[{pos}] XONG ({n} ảnh)', en: '[{pos}] COMPLETED ({n} images)' },

    'log.invalidImage': { vi: 'Vui lòng chọn file hình ảnh hợp lệ.', en: 'Please select valid image files.' },
    'log.added': { vi: 'Đã thêm {n} ảnh vào hàng chờ.', en: 'Added {n} image(s) to the queue.' },
    'log.addedRunning': { vi: 'Đã thêm {n} ảnh vào queue đang chạy.', en: 'Added {n} image(s) to the running queue.' },
    'log.reworked': { vi: '{name}: đã đưa về hàng chờ xóa nền.', en: '{name}: moved back to the background removal queue.' },
    'log.startProcessing': { vi: 'Bắt đầu xóa nền {n} ảnh.', en: 'Starting background removal for {n} image(s).' },
    'log.itemStart': { vi: '[{pos}] Bắt đầu: {name}', en: '[{pos}] Starting: {name}' },
    'log.sentToWorker': { vi: '[{pos}] Đã gửi tác vụ sang Background Worker.', en: '[{pos}] Task handed to the Background Worker.' },
    'log.itemError': { vi: '{name}: {error}', en: '{name}: {error}' },
    'log.itemDone': { vi: '{name}: hoàn thành {n} ảnh.', en: '{name}: completed {n} image(s).' },
    'log.wait4s': { vi: 'Đợi một chút trước ảnh tiếp theo để ổn định upload...', en: 'Waiting briefly before the next image to stabilize the upload...' },
    'log.queueDone': { vi: 'Queue hoàn tất: {done} thành công, {variant} variant, {error} lỗi.', en: 'Queue done: {done} succeeded, {variant} variant(s), {error} error(s).' },
    'log.resizing': { vi: 'Đang tạo PNG trong suốt {name}...', en: 'Creating transparent PNG for {name}...' },
    'log.optimized': { vi: 'PNG hoàn tất: {mb} MB.', en: 'PNG ready: {mb} MB.' },
    'log.downloaded': { vi: 'Đã tải {name}.', en: 'Downloaded {name}.' },
    'log.downloadAllStart': { vi: 'Bắt đầu tải {n} ảnh đã hoàn thành.', en: 'Downloading {n} completed image(s).' },
    'log.downloadAllDone': { vi: 'Download All hoàn tất: {ok}/{total} ảnh.', en: 'Download All done: {ok}/{total} image(s).' },

    'prog.makingClean': { vi: 'Đang tạo bản upload sạch từ {fmt} ({size})...', en: 'Building clean upload copies from {fmt} ({size})...' },
    'prog.preparedCopies': { vi: 'Đã chuẩn bị {n} bản upload: {summary}.', en: 'Prepared {n} upload copies: {summary}.' },
    'prog.retryLighter': { vi: 'Upload thất bại, đang thử bản nhẹ hơn ({a}/{max})...', en: 'Upload failed, retrying with a lighter copy ({a}/{max})...' },
    'prog.waitUpload': { vi: 'Đợi upload {name} ({size}) hoàn tất...', en: 'Waiting for {name} ({size}) upload to finish...' },
    'prog.waitUploadAttempt': { vi: 'Đợi upload {name} ({size}) hoàn tất (lần {a})...', en: 'Waiting for {name} ({size}) upload to finish (attempt {a})...' },
    'prog.locating': { vi: 'Đang định vị khung nhập liệu ChatGPT...', en: 'Locating the ChatGPT input box...' },
    'prog.preparingSource': { vi: 'Đang chuẩn bị ảnh nguồn để tải lên...', en: 'Preparing the source image for upload...' },
    'prog.uploading': { vi: 'Đang tải ảnh lên ChatGPT...', en: 'Uploading the image to ChatGPT...' },
    'prog.sending': { vi: 'Đang gửi yêu cầu xóa nền...', en: 'Sending the background removal request...' },
    'prog.waitingGen': { vi: 'Đang chờ ChatGPT tạo ảnh nền trong suốt...', en: 'Waiting for ChatGPT to create the transparent result...' },
    'prog.stillGen': { vi: 'ChatGPT vẫn đang xử lý, tiếp tục chờ... ({s}s)', en: 'ChatGPT is still processing, still waiting... ({s}s)' },
    'prog.extracting': { vi: 'Đang trích xuất {n} ảnh kết quả...', en: 'Extracting {n} result image(s)...' },
    'prog.fetching': { vi: 'Đang tải {n} ảnh về bộ nhớ tạm...', en: 'Fetching {n} image(s) into memory...' },
    'prog.uploadRejected': { vi: 'Upload bị từ chối. Đang refresh GPT rồi thử lại một lần...', en: 'Upload rejected. Refreshing the GPT tab and retrying once...' },
    'prog.opError': { vi: 'Thao tác lỗi: {msg}', en: 'Operation error: {msg}' },
    'prog.connecting': { vi: 'Đang kết nối content script (lần {i})...', en: 'Connecting to the content script (attempt {i})...' },
    'prog.refreshing': { vi: 'Đang refresh tab Background Remover GPT...', en: 'Refreshing the Background Remover GPT tab...' },
    'prog.refreshed': { vi: 'Tab GPT đã refresh. Đang gửi lại tác vụ...', en: 'GPT tab refreshed. Re-sending the task...' },
    'prog.checkingTabs': { vi: 'Đang kiểm tra các tab ChatGPT...', en: 'Checking ChatGPT tabs...' },
    'prog.locatedTab': { vi: 'Đã định vị tab Background Remover GPT...', en: 'Located the Background Remover GPT tab...' },
    'prog.waitPageLoad': { vi: 'Đợi trang ChatGPT tải xong...', en: 'Waiting for the ChatGPT page to load...' },
    'prog.pageLoaded': { vi: 'Trang đã tải xong. Bắt đầu truyền dữ liệu...', en: 'Page loaded. Transferring image data...' },
    'prog.dataSent': { vi: 'Đã gửi dữ liệu. ChatGPT đang xử lý upload...', en: 'Data sent. ChatGPT is processing the upload...' },
    'prog.failed': { vi: 'Thất bại: {msg}', en: 'Failed: {msg}' },

    'err.readFile': { vi: 'Không thể đọc file {name}', en: 'Cannot read file {name}' },
    'err.workerComm': { vi: 'Không thể giao tiếp với Service Worker: {msg}', en: 'Cannot reach the Service Worker: {msg}' },
    'err.noResult': { vi: 'ChatGPT không trả về ảnh kết quả hợp lệ.', en: 'ChatGPT did not return valid result images.' },
    'err.loadResult': { vi: 'Không thể tải ảnh kết quả để xuất.', en: 'Cannot load the result image for export.' },
    'err.canvasPng': { vi: 'Không thể tạo PNG từ canvas.', en: 'Cannot create PNG from canvas.' },
    'err.noResultExport': { vi: 'Không có ảnh kết quả để xuất.', en: 'No result image to export.' },
    'err.downloadStart': { vi: 'Không thể bắt đầu download.', en: 'Cannot start the download.' },
    'err.uploadFailed': { vi: 'ChatGPT báo tải ảnh thất bại.', en: 'ChatGPT reported the upload failed.' },
    'err.uploadTimeout': { vi: 'Ảnh tải lên quá lâu hoặc nút gửi chưa sẵn sàng.', en: 'Upload took too long or the send button is not ready.' },
    'err.uploadGiveUp': { vi: 'Không thể upload ảnh sau {max} lần: {msg}', en: 'Could not upload the image after {max} tries: {msg}' },
    'err.noSendBtn': { vi: 'Không tìm thấy nút gửi trên ChatGPT.', en: 'Could not find the Send button on ChatGPT.' },
    'err.genTimeout': { vi: 'Quá thời gian chờ ảnh kết quả ({min} phút).', en: 'Timed out waiting for result images ({min} min).' },
    'err.genStalled': { vi: 'ChatGPT xử lý quá lâu mà chưa trả ảnh ({min} phút). Tác vụ có thể đã kẹt; hãy refresh GPT rồi thử lại.', en: 'ChatGPT has been processing too long without returning an image ({min} min). The task may be stuck; refresh the GPT and try again.' },
    'err.policyRefusal': { vi: 'ChatGPT từ chối xử lý ảnh do chính sách nội dung.', en: 'ChatGPT refused to process the image due to content policy.' },
    'err.superseded': { vi: 'Tác vụ đã được thay thế bởi lần chạy mới.', en: 'Task was superseded by a newer run.' },
    'err.unknown': { vi: 'Lỗi không xác định', en: 'Unknown error' },
    'err.noContentScript': { vi: 'Không thể kết nối content script trên ChatGPT.', en: 'Could not establish a connection to the ChatGPT content script.' },
    'err.tabClosed': { vi: 'Tab đã bị đóng.', en: 'The tab was closed.' },
    'err.pageLoadTimeout': { vi: 'Trang tải quá lâu hoặc không phản hồi.', en: 'The page took too long to load or is unresponsive.' },
    'err.refreshFail': { vi: 'Thất bại sau khi refresh GPT: {msg}', en: 'Failed after refreshing GPT: {msg}' },
    'err.taskTimeout': { vi: 'Hết thời gian chờ — tác vụ bị treo', en: 'Timed out — task stalled' },
    'err.imageConvertFailed': { vi: 'Không tải được ảnh kết quả', en: 'Failed to load result images' }
  };

  let lang = 'vi';

  function interpolate(template, params) {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  globalThis.SfrankieI18n = {
    DICT,
    getLang() {
      return lang;
    },
    setLang(value) {
      lang = value === 'en' ? 'en' : 'vi';
      return lang;
    },
    t(key, params) {
      const entry = DICT[key];
      const template = entry ? (entry[lang] ?? entry.vi ?? key) : key;
      return interpolate(template, params);
    }
  };
})();
