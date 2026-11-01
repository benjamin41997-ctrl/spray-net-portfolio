import { videos } from '../data/videos';
import { mediaUrl } from './media';

export const VIDEO_CACHE = 'spray-net-local-videos';
export const localVideos = videos.filter(video => video.type === 'local' && video.url);
const totalBytes = localVideos.reduce((sum, video) => sum + (video.bytes || 0), 0);
const listeners = new Set();
let state = { phase:'checking', savedUrls:[], loadedBytes:0, totalBytes, error:'' };
let pending;
let lastAttempt = 0;
export const getOfflineVideos = () => state;
export const subscribeOfflineVideos = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const update = next => { state = { ...state, ...next }; listeners.forEach(listener => listener()); };
const absolute = video => new URL(mediaUrl(video.url), location.href).href;
function complete(response, video) {
  return response?.status === 200 && Number(response.headers.get('content-length')) > 0 &&
    (!video.bytes || Number(response.headers.get('content-length')) === video.bytes);
}
export async function cachedVideo(video) {
  if (!('caches' in window)) return null;
  const response = await (await caches.open(VIDEO_CACHE)).match(absolute(video));
  return complete(response, video) ? response : null;
}
export function prepareOfflineVideos({ retry = false } = {}) {
  if (pending) return pending;
  if (!('caches' in window)) { update({ phase:'unsupported', error:'This browser cannot save videos for offline use.' }); return Promise.resolve(); }
  if (!retry && Date.now() - lastAttempt < 30_000) return Promise.resolve();
  lastAttempt = Date.now();
  pending = prepare().finally(() => { pending = null; });
  return pending;
}
async function prepare() {
  try {
    const cache = await caches.open(VIDEO_CACHE);
    const savedUrls = [];
    let savedBytes = 0;
    for (const video of localVideos) {
      if (complete(await cache.match(absolute(video)), video)) { savedUrls.push(video.url); savedBytes += video.bytes || 0; }
    }
    update({ savedUrls:[...savedUrls], loadedBytes:savedBytes, error:'', phase:savedUrls.length === localVideos.length ? 'ready' : navigator.onLine ? 'saving' : 'offline' });
    if (!navigator.onLine || savedUrls.length === localVideos.length) return;
    for (const video of localVideos) {
      if (savedUrls.includes(video.url)) continue;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 240_000);
      try {
        // A separate full-file request avoids Safari reusing a partial media response.
        const url = new URL(absolute(video)); url.searchParams.set('offline-cache', '1');
        const response = await fetch(url, { cache:'no-store', mode:'cors', credentials:'same-origin', signal:controller.signal });
        if (response.status !== 200) throw new Error('The complete video could not be downloaded. Reconnect and retry.');
        const chunks = []; let received = 0; let publishedAt = 0;
        if (response.body) {
          const reader = response.body.getReader();
          for (;;) {
            const { done, value } = await reader.read(); if (done) break;
            chunks.push(value); received += value.byteLength;
            if (received > 100 * 1024 * 1024) { await reader.cancel(); throw new Error('This video is too large to save.'); }
            if (Date.now() - publishedAt > 150) { update({ loadedBytes:savedBytes+received }); publishedAt = Date.now(); }
          }
        } else { const bytes = await response.arrayBuffer(); chunks.push(bytes); received = bytes.byteLength; }
        if (!received || (video.bytes && received !== video.bytes)) throw new Error('The video download was interrupted. Reconnect and retry.');
        const blob = new Blob(chunks, { type:'video/mp4' });
        await cache.put(absolute(video), new Response(blob, { status:200, headers:{ 'Content-Type':'video/mp4', 'Content-Length':String(blob.size), 'Accept-Ranges':'bytes' } }));
        savedUrls.push(video.url); savedBytes += received;
        update({ savedUrls:[...savedUrls], loadedBytes:savedBytes });
      } finally { clearTimeout(timeout); }
    }
    update({ phase:'ready', loadedBytes:savedBytes });
  } catch (error) {
    update({ phase:navigator.onLine ? 'error' : 'offline', error:error.name === 'QuotaExceededError' ? 'This device is low on storage. Free some space, then retry offline video setup.' : error.name === 'AbortError' ? 'The video download took too long. Reconnect and retry.' : error.message || 'Videos could not be saved. Reconnect and retry.' });
  }
}
