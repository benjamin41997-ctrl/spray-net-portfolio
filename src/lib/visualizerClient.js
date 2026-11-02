import { visualizerApiUrl } from '../data/visualizerSettings';

const endpointKey = 'spray-net-render-endpoint';
const tokenKey = 'spray-net-render-access';
const operatorKey = 'spray-net-render-operator';
const connectionKey = 'spray-net-render-connection-v1';
export function connectionSettings() {
  const endpoint = import.meta.env.VITE_VISUALIZER_API_URL || visualizerApiUrl;
  try {
    const saved = JSON.parse(localStorage.getItem(connectionKey) || 'null');
    if (saved?.version === 1 && typeof saved.endpoint === 'string' && typeof saved.token === 'string') return saved;
    const legacy = { endpoint:localStorage.getItem(endpointKey) || endpoint, token:sessionStorage.getItem(tokenKey) || '', operatorToken:sessionStorage.getItem(operatorKey) || '' };
    if (legacy.token) saveConnection(legacy.endpoint, legacy.token, legacy.operatorToken);
    return legacy;
  } catch { return { endpoint, token:'', operatorToken:'' }; }
}
export function normalizeEndpoint(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Use an HTTPS service address, or localhost for testing.');
  }
  return url.href.replace(/\/$/, '');
}
export function saveConnection(endpoint, token, operatorToken = '') {
  const saved = {version:1, endpoint:normalizeEndpoint(endpoint), token:token.trim(), operatorToken:operatorToken.trim()};
  try { localStorage.setItem(connectionKey, JSON.stringify(saved)); }
  catch { throw new Error('This browser cannot remember tablet access. Allow site storage, then try again.'); }
  sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(operatorKey);
}
export function forgetConnection() { localStorage.removeItem(connectionKey); sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(operatorKey); }
export async function connectTablet(password) {
  const {endpoint} = connectionSettings();
  const data = await callVisualizer('/api/connect', {endpoint, body:{password}, signal:AbortSignal.timeout(15_000)});
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(data.token || '') || (data.operatorToken && !/^[A-Za-z0-9_-]{43,128}$/.test(data.operatorToken))) throw new Error('The service returned an invalid tablet connection.');
  saveConnection(endpoint, data.token, data.operatorToken || '');
  try { await navigator.storage?.persist?.(); } catch { /* Some tablet browsers manage persistence automatically. */ }
  return data;
}
export async function callVisualizer(path, { endpoint, token, operatorToken, body, signal }) {
  const response = await fetch(`${normalizeEndpoint(endpoint)}${path}`, {
    method: body ? 'POST' : 'GET', mode: 'cors', cache: 'no-store', credentials: 'omit',
    headers: { ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(operatorToken && (path === '/api/session' || body?.customPrompt || body?.feedback || body?.correction || body?.corrections?.length || body?.quality === 'detail') ? { 'X-Visualizer-Operator':operatorToken } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `The image service could not complete this request (${response.status}).`);
  if (!data) throw new Error('The image service returned an unreadable response.');
  return data;
}
export function imageDataBlob(data) {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(data || '');
  if (!match || data.length > 30_000_000) throw new Error('The image service returned an invalid image.');
  return new Blob([Uint8Array.from(atob(match[2]), c => c.charCodeAt(0))], { type: match[1] });
}
