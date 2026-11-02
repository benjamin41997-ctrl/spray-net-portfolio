import {ConsultationStore} from './consultations.mjs';
import { colors } from '../src/data/colors.js';
import { createApi } from './api.mjs';
import { loadConfig } from './config.mjs';
import { reserveAttempt } from './limits.mjs';
import { connectionFingerprint, reserveConnectionAttempt } from './pairing.mjs';

export class VisualizerGate {
  constructor(state, env) {
    const config = loadConfig(env);
    this.handle = createApi({
      config,
      ...(env.CONSULTATION_MEDIA?{consultations:new ConsultationStore({storage:state.storage,bucket:env.CONSULTATION_MEDIA,catalog:colors})}:{}),
      catalog: colors,
      reserveConnection: request => state.storage.transaction(async transaction => {
        const previous = await transaction.get('connectionAttempts');
        await transaction.put('connectionAttempts', reserveConnectionAttempt(previous, connectionFingerprint(request)));
      }),
      reserveAnalysis: () => state.storage.transaction(async transaction => {
        const previous=await transaction.get('analysisUsage');
        await transaction.put('analysisUsage',reserveAttempt(previous,{...config,maxTenMinutes:30,maxHourly:30,minIntervalMs:1000}));
      }),
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
