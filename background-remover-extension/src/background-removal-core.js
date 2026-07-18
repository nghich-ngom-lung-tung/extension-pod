(() => {
  const clamp = value => Math.max(0, Math.min(255, Math.round(value)));

  function redmean(r1, g1, b1, r2, g2, b2) {
    const mean = (r1 + r2) / 2;
    const r = r1 - r2;
    const g = g1 - g2;
    const b = b1 - b2;
    return Math.sqrt(((512 + mean) * r * r) / 256 + 4 * g * g + ((767 - mean) * b * b) / 256);
  }

  function edgeSamples(data, width, height) {
    const samples = [];
    const steps = 24;
    const add = (x, y) => {
      const i = (y * width + x) * 4;
      if (data[i + 3] > 10) samples.push([data[i], data[i + 1], data[i + 2]]);
    };
    for (let n = 0; n < steps; n += 1) {
      const x = Math.round(n * (width - 1) / (steps - 1));
      const y = Math.round(n * (height - 1) / (steps - 1));
      add(x, 0); add(x, height - 1); add(0, y); add(width - 1, y);
    }
    return samples;
  }

  function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] || 0;
  }

  function estimateBackground(imageData) {
    const samples = edgeSamples(imageData.data, imageData.width, imageData.height);
    if (!samples.length) return { color: [255, 255, 255], confidence: 0 };
    const color = [0, 1, 2].map(channel => median(samples.map(sample => sample[channel])));
    const distances = samples.map(sample => redmean(...sample, ...color));
    const close = distances.filter(distance => distance < 65).length;
    return { color, confidence: close / samples.length };
  }

  function autoHardCut(imageData, options = {}) {
    const threshold = options.threshold ?? 70;
    const feather = Math.max(1, options.feather ?? 24);
    const contiguous = options.contiguous !== false;
    const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const { data, width, height } = result;
    const estimate = estimateBackground(result);
    const distances = new Float32Array(width * height);
    for (let p = 0; p < distances.length; p += 1) {
      const i = p * 4;
      distances[p] = redmean(data[i], data[i + 1], data[i + 2], ...estimate.color);
    }
    const selected = new Uint8Array(width * height);
    if (contiguous) {
      const stack = [];
      for (let x = 0; x < width; x += 1) { stack.push(x, (height - 1) * width + x); }
      for (let y = 1; y < height - 1; y += 1) { stack.push(y * width, y * width + width - 1); }
      while (stack.length) {
        const p = stack.pop();
        if (selected[p] || distances[p] >= threshold) continue;
        selected[p] = 1;
        const x = p % width;
        const y = Math.floor(p / width);
        if (x > 0) stack.push(p - 1);
        if (x + 1 < width) stack.push(p + 1);
        if (y > 0) stack.push(p - width);
        if (y + 1 < height) stack.push(p + width);
      }
    }
    for (let p = 0; p < distances.length; p += 1) {
      if (!contiguous || selected[p]) {
        const distance = distances[p];
        if (distance < threshold) {
          const alphaScale = distance <= threshold - feather ? 0 : (distance - threshold + feather) / feather;
          data[p * 4 + 3] = clamp(data[p * 4 + 3] * alphaScale);
        }
      }
    }
    return { imageData: result, confidence: estimate.confidence, background: estimate.color };
  }

  function softKnockout(imageData, options = {}) {
    const strength = Math.max(0.6, Math.min(1.8, options.strength ?? 1));
    const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const estimate = estimateBackground(result);
    const dark = (estimate.color[0] * 0.299 + estimate.color[1] * 0.587 + estimate.color[2] * 0.114) < 128;
    const data = result.data;
    for (let i = 0; i < data.length; i += 4) {
      const mask = dark ? Math.max(data[i], data[i + 1], data[i + 2]) : 255 - Math.min(data[i], data[i + 1], data[i + 2]);
      data[i + 3] = clamp(data[i + 3] * Math.pow(mask / 255, strength));
    }
    return { imageData: result, confidence: estimate.confidence, background: estimate.color };
  }

  function magicWand(imageData, startX, startY, options = {}) {
    const threshold = options.threshold ?? 70;
    const feather = Math.max(1, options.feather ?? Math.round(threshold * 0.25));
    const contiguous = options.contiguous !== false;
    const result = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
    const { data, width, height } = result;
    const x0 = Math.max(0, Math.min(width - 1, Math.round(startX)));
    const y0 = Math.max(0, Math.min(height - 1, Math.round(startY)));
    const start = (y0 * width + x0) * 4;
    const color = [data[start], data[start + 1], data[start + 2]];
    const distances = new Float32Array(width * height);
    for (let p = 0; p < distances.length; p += 1) {
      const i = p * 4;
      distances[p] = redmean(data[i], data[i + 1], data[i + 2], ...color);
    }
    const selected = new Uint8Array(width * height);
    if (contiguous) {
      const stack = [y0 * width + x0];
      while (stack.length) {
        const p = stack.pop();
        if (selected[p] || distances[p] >= threshold || data[p * 4 + 3] === 0) continue;
        selected[p] = 1;
        const x = p % width;
        const y = Math.floor(p / width);
        if (x > 0) stack.push(p - 1);
        if (x + 1 < width) stack.push(p + 1);
        if (y > 0) stack.push(p - width);
        if (y + 1 < height) stack.push(p + width);
      }
    }
    for (let p = 0; p < distances.length; p += 1) {
      if ((!contiguous && distances[p] < threshold) || selected[p]) {
        const alphaScale = distances[p] <= threshold - feather
          ? 0
          : (distances[p] - threshold + feather) / feather;
        data[p * 4 + 3] = clamp(data[p * 4 + 3] * alphaScale);
      }
    }
    return result;
  }

  function findAlphaBounds(imageData, cutoff = 10) {
    const { data, width, height } = imageData;
    let left = width, top = height, right = -1, bottom = -1;
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= cutoff) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
    return right < left ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
  }

  globalThis.SfrankieBackgroundCore = Object.freeze({ redmean, estimateBackground, autoHardCut, softKnockout, magicWand, findAlphaBounds });
})();
