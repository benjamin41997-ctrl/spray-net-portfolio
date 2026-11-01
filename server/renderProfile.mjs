// UI testing uses one small, fast model regardless of the requested preview tier.
export function renderProfile(config, tier) {
  if (config.fastTestMode) return {model:'gpt-image-2.5-flare',quality:'low'};
  return tier === 'detail'
    ? {model:config.detailModel,quality:'high'}
    : {model:config.previewModel,quality:'medium'};
}
