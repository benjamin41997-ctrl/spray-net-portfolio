import { colors } from '../src/data/colors.js';
import { createApi } from './api.mjs';
import { loadConfig } from './config.mjs';
import { reserveAttempt } from './limits.mjs';

export class VisualizerGate {
  constructor(state, env) {
    const config = loadConfig(env);
    this.handle = createApi({
      config,
      catalog: colors,
      reserve: () => state.storage.transaction(async transaction => {
        const previous = await transaction.get('usage');
        const next = reserveAttempt(previous, config);
        await transaction.put('usage', next);
      }),
    });
  }

  fetch(request) {
    return this.handle(request);
  }
}

export default {
  fetch(request, env) {
    // A single named durable object owns the deployment-wide quota and in-flight lock.
    const id = env.VISUALIZER_GATE.idFromName('spray-net-portfolio');
    return env.VISUALIZER_GATE.get(id).fetch(request);
  },
};
