(() => {
  const MODE = 'extract';

  const PROMPT = `CRITICAL MODE: EXTRACT AND RESTORE. Turn the visible design into a clean, flat, front-facing standalone artwork. Remove the wall, frame, garment, product, mockup, folds, shadows, labels, and photographed surroundings. For an ordinary original design, preserve its composition, wording, colors, and style closely. If it features recognizable entertainment or commercial branding, keep only the broad layout, palette, and visual energy, then use a new fictional title, original characters, and original symbols. Make it polished and print-ready. Output only the final image.`;

  const POLICY_FALLBACK_PROMPT = `Redesign the pictured graphic as a fresh original standalone artwork. Keep the broad panel layout, color palette, action-filled mood, and visual energy, but invent a new fictional title, new characters, new vehicles, and new symbols. Do not include the wall, frame, room, or mockup. Make the artwork flat, front-facing, polished, and print-ready. Output only the final image.`;

  globalThis.SfrankieExtractRestore = Object.freeze({
    mode: MODE,
    // Dynamic getters so they return the translated text at call time
    get label()        { return globalThis.SfrankieI18n?.t('er.label') ?? 'Extract & Restore'; },
    get progressText() { return globalThis.SfrankieI18n?.t('er.progress') ?? 'Filling the extract & restore command...'; },
    filePrefix: 'extracted',
    prompt: PROMPT,
    policyFallbackPrompt: POLICY_FALLBACK_PROMPT,
    isMode(value) {
      return value === MODE;
    }
  });
})();
