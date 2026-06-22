(() => {
  const MODE_AUTO = 'auto';
  const MODE_TEMPLATE = 'template';

  const COLOR_TEXT = {
    keep: 'Keep template color',
    black: 'Black',
    white: 'White',
    navy: 'Navy Blue',
    heatherGrey: 'Heather Grey',
    red: 'Red',
    royalBlue: 'Royal Blue',
    forestGreen: 'Forest Green',
    pink: 'Pink',
    yellow: 'Yellow'
  };

  const PRODUCT_TEXT = {
    auto: 'Auto Detect',
    tshirt: 'T-Shirt',
    oversizedTshirt: 'Oversized T-Shirt',
    hoodie: 'Hoodie',
    sweatshirt: 'Sweatshirt',
    longSleeve: 'Long Sleeve Shirt',
    polo: 'Polo Shirt'
  };

  const SCENE_TEXT = {
    luxuryStudio: 'Luxury Studio',
    ecommerce: 'Minimal E-commerce',
    lifestyleModel: 'Lifestyle Model',
    urbanStreet: 'Urban Street',
    flatLay: 'Premium Flat Lay',
    holidayGift: 'Holiday Gift',
    socialAd: 'Social Media Ad'
  };

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function buildPrompt(task = {}) {
    const mode = task.mode === MODE_TEMPLATE ? MODE_TEMPLATE : MODE_AUTO;
    const count = Math.max(1, Math.min(10, Number(task.count) || 1));
    const product = PRODUCT_TEXT[task.productType] || PRODUCT_TEXT.auto;
    const color = task.productColor === 'custom'
      ? clean(task.customColor) || 'Custom color'
      : COLOR_TEXT[task.productColor] || COLOR_TEXT.keep;
    const scene = SCENE_TEXT[task.sceneStyle] || SCENE_TEXT.luxuryStudio;
    const context = clean(task.customContext);

    const lines = [
      'Create premium luxury product mockup image(s) from the uploaded artwork.',
      `Mode: ${mode === MODE_TEMPLATE ? 'Apply artwork to uploaded blank template/product photo' : 'Auto-generate luxury mockup scene'}.`,
      `Images count: ${count}.`,
      `Product type: ${product}.`,
      `Product color: ${color}.`,
      `Scene style: ${scene}.`
    ];

    if (mode === MODE_TEMPLATE) {
      lines.push('Use the first uploaded image as the artwork/design and the second uploaded image as the blank template. Preserve the template pose, perspective, lighting, shadows, folds, fabric/product texture, and realism.');
    } else {
      lines.push('Use the uploaded image as the artwork/design. Create realistic, professional, high-end mockup presentation images.');
    }

    if (context) {
      lines.push(`Extra context: ${context}.`);
    }

    lines.push('Output only the final mockup image(s).');
    return lines.join(' ');
  }

  globalThis.SfrankieMockup = Object.freeze({
    modeAuto: MODE_AUTO,
    modeTemplate: MODE_TEMPLATE,
    get label() {
      return globalThis.SfrankieI18n?.t('mk.label') ?? 'Luxury Mockup';
    },
    get progressText() {
      return globalThis.SfrankieI18n?.t('mk.progress') ?? 'Filling the mockup request...';
    },
    filePrefix: 'mockup',
    buildPrompt,
    isMode(value) {
      return value === MODE_AUTO || value === MODE_TEMPLATE;
    }
  });
})();
