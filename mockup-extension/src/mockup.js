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

  function shotPlanForCount(count) {
    const heroModel = 'Hero model shot: a realistic adult model wearing the apparel, clear front design visibility, premium editorial or lifestyle setting.';
    const secondModel = 'Second model/lifestyle shot: a different adult model pose, camera angle, or premium environment while keeping the design clearly visible.';
    const folded = 'Folded packaging shot: the apparel neatly folded in premium gift or e-commerce packaging with tasteful neutral props and realistic fabric texture.';
    const detail = 'Hanger or styled flat-lay detail shot: show the apparel in a premium styled scene with depth, shadows, and useful listing context.';
    const productOnly = 'Product-only hero shot: the full apparel shown without a person on a premium studio or lifestyle backdrop with soft shadows, depth, and subtle context.';

    if (count <= 1) return [heroModel];
    if (count === 2) return [heroModel, productOnly];
    if (count === 3) return [heroModel, folded, productOnly];
    if (count === 4) return [heroModel, secondModel, folded, productOnly];

    const shots = [heroModel, secondModel, folded, detail, productOnly];

    const extras = [
      'Additional model shot: use a clearly different adult model, pose, crop, camera angle, and environment from all earlier model shots.',
      'Close-up apparel detail shot: highlight print quality, fabric texture, seams, and realistic design placement in a premium styled setting.',
      'Alternate lifestyle model shot: use a different composition and environment while preserving exact artwork readability.',
      'Alternate packaging or folded presentation: create a distinct premium e-commerce presentation without repeating earlier layouts.',
      'Alternate product-only shot: use a different premium contextual backdrop and camera angle, never an empty white background.'
    ];

    const requested = Math.max(1, count);
    const result = shots.slice(0, Math.min(requested, shots.length));
    let extraIndex = 0;
    while (result.length < requested) {
      result.push(extras[extraIndex % extras.length]);
      extraIndex += 1;
    }
    return result;
  }

  function listingSetText(count) {
    if (count <= 1) {
      return 'one hero model/lifestyle mockup';
    }
    if (count === 2) {
      return 'one model/lifestyle shot and one product-only apparel shot';
    }
    if (count === 3) {
      return 'one model/lifestyle shot, one folded or packaging flat-lay shot, and one product-only apparel shot';
    }
    if (count === 4) {
      return 'two model/lifestyle shots, one folded or packaging shot, and one product-only apparel shot';
    }
    if (count === 5) {
      return 'two model/lifestyle shots, one folded or packaging flat-lay shot, one hanger/detail/flat-lay shot, and one product-only apparel shot';
    }
    return 'a varied listing set with multiple model/lifestyle shots plus folded, packaging, detail, flat-lay, and product-only shots';
  }

  function buildShotPrompts(task = {}) {
    const mode = task.mode === MODE_TEMPLATE ? MODE_TEMPLATE : MODE_AUTO;
    const count = Math.max(1, Math.min(10, Number(task.count) || 1));
    const product = PRODUCT_TEXT[task.productType] || PRODUCT_TEXT.auto;
    const color = task.productColor === 'keep' && mode === MODE_AUTO
      ? 'Premium default apparel color that suits the design'
      : task.productColor === 'custom'
      ? clean(task.customColor) || 'Custom color'
      : COLOR_TEXT[task.productColor] || COLOR_TEXT.keep;
    const scene = SCENE_TEXT[task.sceneStyle] || SCENE_TEXT.luxuryStudio;
    const context = clean(task.customContext);

    if (count > 1 && mode === MODE_AUTO) {
      const promptLines = [
        `GENERATE MOCKUPS: Use image #1 as the shirt design.`,
        `Create ${count} premium realistic ${product} mockup images for a ${color} shirt.`,
        `Listing set: ${listingSetText(count)}.`,
        `Style: ${scene}.`,
        'Keep the design layout, colors, placement, and proportions close to the source.',
        'Output only the final generated mockup images sequentially.'
      ];

      if (context) {
        promptLines.splice(4, 0, context);
      }

      return [promptLines.join(' ')];
    }

    const shotPlans = shotPlanForCount(count);

    return shotPlans.map((shotPlan, index) => {
      const isModelShot = /model/i.test(shotPlan);
      const sceneForShot = isModelShot && task.sceneStyle === 'flatLay'
        ? 'Premium lifestyle/editorial model photography'
        : scene;
      const lines = [
        `Generate 1 premium ${product} mockup image from the original uploaded design.`,
        `Shot ${index + 1}/${count}: ${shotPlan}`,
        `Apparel color: ${color}.`,
        `Style: ${sceneForShot}.`
      ];

      if (mode === MODE_TEMPLATE) {
        lines.push(index === 0
          ? 'Use image #1 as the artwork and image #2 as the blank template/reference.'
          : 'Keep using the original artwork and template/reference.');
      }

      if (context) {
        lines.push(context);
      }

      lines.push('Keep the design layout, colors, text style, placement, and proportions close to the source.');
      lines.push('One complete photo only; no collage, grid, extra labels, tags, watermarks, or random text.');
      lines.push('Output only the final image.');
      return lines.join(' ');
    });
  }

  function buildPrompt(task = {}) {
    return buildShotPrompts(task)[0];
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
    buildShotPrompts,
    isMode(value) {
      return value === MODE_AUTO || value === MODE_TEMPLATE;
    }
  });
})();
