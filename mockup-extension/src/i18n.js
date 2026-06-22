(() => {
  const DICT = {
    'status.ready': { vi: 'SẴN SÀNG', en: 'READY' },
    'status.processing': { vi: 'ĐANG XỬ LÝ', en: 'PROCESSING' },
    'status.error': { vi: 'LỖI', en: 'ERROR' },

    'settings.title': { vi: 'THIẾT LẬP MOCKUP', en: 'MOCKUP SETTINGS' },
    'source.design': { vi: 'thiết kế', en: 'design' },
    'source.template': { vi: 'phôi mockup', en: 'template' },
    'source.designTitle': { vi: 'CHỌN THIẾT KẾ', en: 'DESIGN IMAGE' },
    'source.designSub': { vi: 'kéo thả artwork hoặc click chọn', en: 'drop artwork or click to choose' },
    'source.templateTitle': { vi: 'PHÔI MOCKUP', en: 'BLANK TEMPLATE' },
    'source.templateSub': { vi: 'tuỳ chọn: áo/người mẫu/sản phẩm trống', en: 'optional shirt/model/product template' },

    'label.mode': { vi: 'CHẾ ĐỘ MOCKUP', en: 'MOCKUP MODE' },
    'label.count': { vi: 'SỐ LƯỢNG MOCKUP', en: 'IMAGES COUNT' },
    'label.product': { vi: 'LOẠI SẢN PHẨM', en: 'PRODUCT TYPE' },
    'label.color': { vi: 'MÀU ÁO / SẢN PHẨM', en: 'SHIRT / PRODUCT COLOR' },
    'label.scene': { vi: 'SCENE STYLE', en: 'SCENE STYLE' },
    'label.context': { vi: 'MÔ TẢ BỔ SUNG', en: 'CUSTOM CONTEXT' },
    'label.resolution': { vi: 'ĐỘ PHÂN GIẢI XUẤT', en: 'EXPORT RESOLUTION' },
    'label.output': { vi: 'XEM TRƯỚC MOCKUP', en: 'MOCKUP PREVIEW' },

    'mode.auto': { vi: 'Auto Luxury Mockup', en: 'Auto Luxury Mockup' },
    'mode.template': { vi: 'Apply To Template', en: 'Apply To Template' },
    'modeShort.auto': { vi: 'Auto Luxury', en: 'Auto Luxury' },
    'modeShort.template': { vi: 'Apply Template', en: 'Apply Template' },
    'mk.label': { vi: 'Luxury Mockup', en: 'Luxury Mockup' },
    'mk.progress': { vi: 'Đang điền yêu cầu tạo mockup...', en: 'Filling the mockup request...' },

    'count.one': { vi: 'ảnh', en: 'image' },
    'count.multi': { vi: 'ảnh', en: 'images' },
    'count.hero': { vi: 'hero', en: 'hero' },
    'count.listing': { vi: 'listing set', en: 'listing set' },
    'count.proSet': { vi: 'pro set', en: 'pro set' },
    'count.custom': { vi: 'Tuỳ nhập', en: 'Custom' },
    'hint.countSet': {
      vi: '3 ảnh: người mẫu + áo gấp/packaging + áo riêng. 5+ ảnh sẽ tăng thêm model/lifestyle angles.',
      en: '3 images: model + folded/packaging + product-only. 5+ adds more model/lifestyle angles.'
    },

    'product.auto': { vi: 'Auto Detect', en: 'Auto Detect' },
    'product.tshirt': { vi: 'T-Shirt', en: 'T-Shirt' },
    'product.oversizedTshirt': { vi: 'Oversized T-Shirt', en: 'Oversized T-Shirt' },
    'product.hoodie': { vi: 'Hoodie', en: 'Hoodie' },
    'product.sweatshirt': { vi: 'Sweatshirt', en: 'Sweatshirt' },
    'product.longSleeve': { vi: 'Long Sleeve Shirt', en: 'Long Sleeve Shirt' },
    'product.polo': { vi: 'Polo Shirt', en: 'Polo Shirt' },

    'color.keep': { vi: 'Mặc định của phôi (Keep template color)', en: 'Keep template color' },
    'color.black': { vi: 'Black (Đen)', en: 'Black' },
    'color.white': { vi: 'White (Trắng)', en: 'White' },
    'color.navy': { vi: 'Navy Blue (Xanh navy)', en: 'Navy Blue' },
    'color.heatherGrey': { vi: 'Heather Grey (Xám)', en: 'Heather Grey' },
    'color.red': { vi: 'Red (Đỏ)', en: 'Red' },
    'color.royalBlue': { vi: 'Royal Blue (Xanh dương)', en: 'Royal Blue' },
    'color.forestGreen': { vi: 'Forest Green (Xanh lá)', en: 'Forest Green' },
    'color.pink': { vi: 'Pink (Hồng)', en: 'Pink' },
    'color.yellow': { vi: 'Yellow (Vàng)', en: 'Yellow' },
    'color.custom': { vi: 'Custom Color', en: 'Custom Color' },

    'scene.luxuryStudio': { vi: 'Luxury Studio', en: 'Luxury Studio' },
    'scene.ecommerce': { vi: 'Minimal E-commerce', en: 'Minimal E-commerce' },
    'scene.lifestyleModel': { vi: 'Lifestyle Model', en: 'Lifestyle Model' },
    'scene.urbanStreet': { vi: 'Urban Street', en: 'Urban Street' },
    'scene.flatLay': { vi: 'Premium Flat Lay', en: 'Premium Flat Lay' },
    'scene.holidayGift': { vi: 'Holiday Gift', en: 'Holiday Gift' },
    'scene.socialAd': { vi: 'Social Media Ad', en: 'Social Media Ad' },

    'placeholder.context': {
      vi: 'Ví dụ: urban street setting, professional editorial photography, dynamic shadows...',
      en: 'e.g. urban street setting, professional editorial photography, dynamic shadows...'
    },

    'queue.heading': { vi: 'HÀNG CHỜ MOCKUP', en: 'MOCKUP QUEUE' },
    'queue.clear': { vi: 'XÓA', en: 'CLEAR' },
    'btn.addQueue': { vi: 'THÊM VÀO HÀNG ĐỢI', en: 'ADD TO QUEUE' },
    'btn.execute': { vi: 'TẠO MOCKUP HÀNG CHỜ', en: 'GENERATE MOCKUP QUEUE' },
    'btn.download': { vi: 'TẢI MOCKUP PNG', en: 'DOWNLOAD MOCKUP PNG' },
    'btn.downloadAll': { vi: 'TẢI TẤT CẢ MOCKUP', en: 'DOWNLOAD ALL MOCKUPS' },

    'qstatus.processing': { vi: 'Đang xử lý', en: 'Processing' },
    'qstatus.completed': { vi: 'Hoàn thành', en: 'Completed' },
    'qstatus.queued': { vi: 'Đang chờ', en: 'Queued' },
    'qstatus.failed': { vi: 'Thất bại', en: 'Failed' },
    'qstatus.variant': { vi: 'Biến thể #{n}', en: 'Variant #{n}' },

    'title.download': { vi: 'Tải mockup PNG', en: 'Download mockup PNG' },
    'title.rework': { vi: 'Tạo lại mockup cho job này', en: 'Generate this mockup job again' },
    'title.remove': { vi: 'Xóa khỏi hàng chờ', en: 'Remove from queue' },
    'title.selectResult': { vi: 'Chọn {name}', en: 'Select {name}' },

    'progress.ready': { vi: 'SẴN SÀNG', en: 'READY' },
    'progress.starting': { vi: 'ĐANG KHỞI ĐỘNG HÀNG CHỜ...', en: 'STARTING QUEUE...' },
    'progress.preparing': { vi: '[{pos}] ĐANG CHUẨN BỊ {name}', en: '[{pos}] PREPARING {name}' },
    'progress.queueComplete': { vi: 'HOÀN TẤT HÀNG CHỜ {done}/{total}', en: 'QUEUE COMPLETE {done}/{total}' },
    'progress.completed': { vi: '[{pos}] XONG ({n} ảnh)', en: '[{pos}] COMPLETED ({n} images)' },

    'log.invalidImage': { vi: 'Vui lòng chọn file hình ảnh hợp lệ.', en: 'Please select valid image files.' },
    'log.needDesign': { vi: 'Cần chọn ảnh thiết kế trước khi thêm vào hàng đợi.', en: 'Choose a design image before adding to the queue.' },
    'log.needTemplate': { vi: 'Mode Apply To Template cần thêm ảnh phôi mockup.', en: 'Apply To Template mode needs a blank template image.' },
    'log.selectedDesign': { vi: 'Đã chọn thiết kế: {name}', en: 'Selected design: {name}' },
    'log.selectedTemplate': { vi: 'Đã chọn phôi: {name}', en: 'Selected template: {name}' },
    'log.added': { vi: 'Đã thêm {name} vào hàng chờ mockup.', en: 'Added {name} to the mockup queue.' },
    'log.reworked': { vi: '{name}: đã đưa về hàng chờ mockup.', en: '{name}: moved back to the mockup queue.' },
    'log.startProcessing': { vi: 'Bắt đầu tạo mockup {n} job.', en: 'Starting {n} mockup job(s).' },
    'log.itemStart': { vi: '[{pos}] Bắt đầu: {name}', en: '[{pos}] Starting: {name}' },
    'log.sentToWorker': { vi: '[{pos}] Đã gửi tác vụ sang Background Worker.', en: '[{pos}] Task handed to the Background Worker.' },
    'log.itemError': { vi: '{name}: {error}', en: '{name}: {error}' },
    'log.itemDone': { vi: '{name}: hoàn thành {n} ảnh mockup.', en: '{name}: completed {n} mockup image(s).' },
    'log.waitBrief': { vi: 'Đợi một chút trước job tiếp theo để ổn định upload...', en: 'Waiting briefly before the next job to stabilize upload...' },
    'log.queueDone': { vi: 'Queue hoàn tất: {done} thành công, {variant} variant, {error} lỗi.', en: 'Queue done: {done} succeeded, {variant} variant(s), {error} error(s).' },
    'log.resizing': { vi: 'Đang tạo PNG mockup {name}...', en: 'Creating mockup PNG for {name}...' },
    'log.optimized': { vi: 'PNG hoàn tất: {mb} MB.', en: 'PNG ready: {mb} MB.' },
    'log.downloaded': { vi: 'Đã tải {name}.', en: 'Downloaded {name}.' },
    'log.downloadAllStart': { vi: 'Bắt đầu tải {n} mockup đã hoàn thành.', en: 'Downloading {n} completed mockup(s).' },
    'log.downloadAllDone': { vi: 'Download All hoàn tất: {ok}/{total} ảnh.', en: 'Download All done: {ok}/{total} image(s).' },

    'prog.makingClean': { vi: 'Đang tạo bản upload sạch từ {fmt} ({size})...', en: 'Building clean upload copies from {fmt} ({size})...' },
    'prog.preparedCopies': { vi: 'Đã chuẩn bị {n} bản upload: {summary}.', en: 'Prepared {n} upload copies: {summary}.' },
    'prog.retryLighter': { vi: 'Upload thất bại, đang thử bản nhẹ hơn ({a}/{max})...', en: 'Upload failed, retrying with a lighter copy ({a}/{max})...' },
    'prog.waitUpload': { vi: 'Đợi upload {name} ({size}) hoàn tất...', en: 'Waiting for {name} ({size}) upload to finish...' },
    'prog.waitUploadAttempt': { vi: 'Đợi upload {name} ({size}) hoàn tất (lần {a})...', en: 'Waiting for {name} ({size}) upload to finish (attempt {a})...' },
    'prog.locating': { vi: 'Đang định vị khung nhập liệu ChatGPT...', en: 'Locating the ChatGPT input box...' },
    'prog.preparingSource': { vi: 'Đang chuẩn bị ảnh nguồn để tải lên...', en: 'Preparing source images for upload...' },
    'prog.preparingNamedSource': { vi: 'Đang chuẩn bị ảnh {role} ({n}/{total})...', en: 'Preparing {role} image ({n}/{total})...' },
    'prog.uploading': { vi: 'Đang tải ảnh lên ChatGPT...', en: 'Uploading images to ChatGPT...' },
    'prog.uploadingNamedSource': { vi: 'Đang tải ảnh {role} lên ChatGPT ({n}/{total})...', en: 'Uploading {role} image to ChatGPT ({n}/{total})...' },
    'prog.sending': { vi: 'Đang gửi yêu cầu tạo mockup...', en: 'Sending the mockup request...' },
    'prog.waitingGen': { vi: 'Đang chờ ChatGPT tạo mockup...', en: 'Waiting for ChatGPT to create mockups...' },
    'prog.stillGen': { vi: 'ChatGPT vẫn đang xử lý, tiếp tục chờ... ({s}s)', en: 'ChatGPT is still processing, still waiting... ({s}s)' },
    'prog.extracting': { vi: 'Đang trích xuất {n} ảnh kết quả...', en: 'Extracting {n} result image(s)...' },
    'prog.fetching': { vi: 'Đang tải {n} ảnh về bộ nhớ tạm...', en: 'Fetching {n} image(s) into memory...' },
    'prog.uploadRejected': { vi: 'Upload bị từ chối. Đang refresh GPT rồi thử lại một lần...', en: 'Upload rejected. Refreshing the GPT tab and retrying once...' },
    'prog.opError': { vi: 'Thao tác lỗi: {msg}', en: 'Operation error: {msg}' },
    'prog.connecting': { vi: 'Đang kết nối content script (lần {i})...', en: 'Connecting to the content script (attempt {i})...' },
    'prog.refreshing': { vi: 'Đang refresh tab Mockup Luxury GPT...', en: 'Refreshing the Mockup Luxury GPT tab...' },
    'prog.refreshed': { vi: 'Tab GPT đã refresh. Đang gửi lại tác vụ...', en: 'GPT tab refreshed. Re-sending the task...' },
    'prog.checkingTabs': { vi: 'Đang kiểm tra các tab ChatGPT...', en: 'Checking ChatGPT tabs...' },
    'prog.locatedTab': { vi: 'Đã định vị tab Mockup Luxury GPT...', en: 'Located the Mockup Luxury GPT tab...' },
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
    'err.genStalled': { vi: 'ChatGPT xử lý quá lâu mà chưa trả ảnh ({min} phút). Hãy refresh GPT rồi thử lại.', en: 'ChatGPT has been processing too long without returning an image ({min} min). Refresh the GPT and try again.' },
    'err.policyRefusal': { vi: 'ChatGPT từ chối xử lý ảnh do chính sách nội dung.', en: 'ChatGPT refused to process the image due to content policy.' },
    'err.superseded': { vi: 'Tác vụ đã được thay thế bởi lần chạy mới.', en: 'Task was superseded by a newer run.' },
    'err.unknown': { vi: 'Lỗi không xác định', en: 'Unknown error' },
    'err.noContentScript': { vi: 'Không thể kết nối content script trên ChatGPT.', en: 'Could not establish a connection to the ChatGPT content script.' },
    'err.tabClosed': { vi: 'Tab đã bị đóng.', en: 'The tab was closed.' },
    'err.pageLoadTimeout': { vi: 'Trang tải quá lâu hoặc không phản hồi.', en: 'The page took too long to load or is unresponsive.' },
    'err.refreshFail': { vi: 'Thất bại sau khi refresh GPT: {msg}', en: 'Failed after refreshing GPT: {msg}' },
    'err.noSource': { vi: 'Không có ảnh nguồn để tạo mockup.', en: 'No source image was provided for mockup generation.' }
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
