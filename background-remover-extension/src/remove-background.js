(() => {
  const MODE = 'remove';

  const PROMPT = ``;

  globalThis.SfrankieBackgroundRemover = Object.freeze({
    mode: MODE,
    get label() {
      return globalThis.SfrankieI18n?.t('br.label') ?? 'Remove Background';
    },
    get progressText() {
      return globalThis.SfrankieI18n?.t('br.progress') ?? 'Filling the background removal command...';
    },
    filePrefix: 'removed-bg',
    prompt: PROMPT,
    isMode(value) {
      return value === MODE;
    }
  });
})();
