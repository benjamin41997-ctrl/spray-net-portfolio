const models = new Set([
  'gpt-image-2.5-flare',
  'gpt-image-2.5-sunburst',
  'gpt-image-2.5-flare-2026-09-08',
  'gpt-image-2.5-sunburst-2026-09-08',
]);

function integer(env, name, fallback, min, max) {
  const value = env[name] || fallback;
  if (!/^\d+$/.test(String(value)) || Number(value) < min || Number(value) > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return Number(value);
}

function model(env, name, fallback) {
  const value = env[name] || fallback;
  if (!models.has(value)) throw new Error(`${name} is not an allowed image model.`);
  return value;
}

function allowedOrigin(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== value || url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new Error('VISUALIZER_ALLOWED_ORIGINS requires exact HTTPS origins or localhost HTTP origins, without paths.');
  }
  return value;
}

export function loadConfig(env = process.env) {
  const apiKey = env.OPENAI_API_KEY?.trim() || '';
  const accessToken = env.VISUALIZER_ACCESS_TOKEN?.trim() || '';
  const operatorToken = env.VISUALIZER_OPERATOR_TOKEN?.trim() || '';
  const tabletPassword = env.VISUALIZER_TABLET_PASSWORD?.trim() || '';
  const fastTestMode = env.VISUALIZER_FAST_TEST_MODE ?? 'false';
  if (!['true','false'].includes(fastTestMode)) throw new Error('VISUALIZER_FAST_TEST_MODE must be true or false.');
  if (tabletPassword && (tabletPassword.length < 12 || tabletPassword.length > 128 || /[\u0000-\u001F]/.test(tabletPassword))) throw new Error('VISUALIZER_TABLET_PASSWORD must contain 12–128 characters without control characters.');
  if (operatorToken && !/^[A-Za-z0-9_-]{43,128}$/.test(operatorToken)) throw new Error('VISUALIZER_OPERATOR_TOKEN must be a random 43–128 character secret.');
  if (accessToken && !/^[A-Za-z0-9_-]{43,128}$/.test(accessToken)) {
    throw new Error('VISUALIZER_ACCESS_TOKEN must be a random 43–128 character base64url or hex secret.');
  }
  const allowedOrigins = new Set((env.VISUALIZER_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean).map(allowedOrigin));
  // A daily cap is deliberately explicit: missing secrets or cap never enables billing.
  const maxDaily = env.VISUALIZER_MAX_DAILY_RENDERS ? integer(env, 'VISUALIZER_MAX_DAILY_RENDERS', '', 1, 200) : 0;
  return {
    apiKey,
    accessToken,
    operatorToken,
    tabletPassword,
    fastTestMode:fastTestMode === 'true',
    allowedOrigins,
    configured: Boolean(apiKey && accessToken && allowedOrigins.size && maxDaily),
    maxDaily,
    maxHourly: integer(env, 'VISUALIZER_MAX_HOURLY_RENDERS', 12, 1, 60),
    minIntervalMs: integer(env, 'VISUALIZER_MIN_INTERVAL_SECONDS', 5, 1, 60) * 1000,
    timeoutMs: integer(env, 'VISUALIZER_TIMEOUT_SECONDS', 240, 30, 300) * 1000,
    previewModel: model(env, 'VISUALIZER_PREVIEW_MODEL', 'gpt-image-2.5-flare'),
    detailModel: model(env, 'VISUALIZER_DETAIL_MODEL', 'gpt-image-2.5-sunburst'),
    dataFile: env.VISUALIZER_USAGE_FILE || 'server/.local/usage.json',
    host: env.VISUALIZER_HOST || '127.0.0.1',
    port: integer(env, 'VISUALIZER_PORT', 8787, 1, 65535),
  };
}
