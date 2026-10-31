import { visualizerApiUrl } from '../data/visualizerSettings';

const endpointKey = 'spray-net-render-endpoint';
const tokenKey = 'spray-net-render-access';
export function connectionSettings() {
  try {
    return { endpoint: localStorage.getItem(endpointKey) || import.meta.env.VITE_VISUALIZER_API_URL || visualizerApiUrl, token: sessionStorage.getItem(tokenKey) || '' };
  } catch { return { endpoint: '', token: '' }; }
}
export function normalizeEndpoint(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Use an HTTPS service address, or localhost for testing.');
  }
  return url.href.replace(/\/$/, '');
}
export function saveConnection(endpoint, token) {
  localStorage.setItem(endpointKey, normalizeEndpoint(endpoint));
  sessionStorage.setItem(tokenKey, token.trim());
}
export function forgetConnection() { sessionStorage.removeItem(tokenKey); }
export async function callVisualizer(path, { endpoint, token, body, signal }) {
  const response = await fetch(`${normalizeEndpoint(endpoint)}${path}`, {
    method: body ? 'POST' : 'GET', mode: 'cors', cache: 'no-store', credentials: 'omit',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
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
