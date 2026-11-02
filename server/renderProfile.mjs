// Customer previews stay fast; representative-only detailed requests use the precise model.
export function renderProfile(config, tier) {
  if (config.fastTestMode && tier !== 'detail') return {model:'gpt-image-2.5-flare',quality:'low'};
  return tier === 'detail'
    ? {model:config.detailModel,quality:'high'}
    : {model:config.previewModel,quality:'medium'};
}
