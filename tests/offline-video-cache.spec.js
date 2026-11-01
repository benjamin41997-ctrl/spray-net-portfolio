import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const helper = (await readFile(new URL('../src/lib/offlineVideos.js',import.meta.url),'utf8'))
  .replace("import { videos } from '../data/videos';", "const videos = [{type:'local',url:'clip.mp4',bytes:6}];")
  .replace("import { mediaUrl } from './media';", "const mediaUrl = value => value;");
test.beforeEach(async ({page}) => {
  await page.route('https://offline-video-test.invalid/**', route => {
    const module = route.request().url().endsWith('helper.js');
    return route.fulfill({contentType:module?'text/javascript':'text/html',body:module?helper:'<!doctype html><html><title>Offline video test</title></html>'});
  });
  await page.goto('https://offline-video-test.invalid/');
});
test('video cache rejects partial content and retries with a complete file', async ({page}) => {
  await page.route('**/clip.mp4?offline-cache=1', route => route.fulfill({status:206,body:'abc',headers:{'Content-Range':'bytes 0-2/6'}}));
  await page.evaluate(async () => { const m=await import('/helper.js'); await m.prepareOfflineVideos(); });
  expect(await page.evaluate(async () => (await import('/helper.js')).getOfflineVideos().phase)).toBe('error');
  expect(await page.evaluate(async () => (await (await caches.open('spray-net-local-videos')).keys()).length)).toBe(0);
  await page.route('**/clip.mp4?offline-cache=1', route => route.fulfill({status:200,body:'abcdef',contentType:'video/mp4'}));
  const result=await page.evaluate(async () => { const m=await import('/helper.js');await m.prepareOfflineVideos({retry:true});const response=await m.cachedVideo(m.localVideos[0]);return {state:m.getOfflineVideos(),body:await response.text(),status:response.status}; });
  expect(result.state.phase).toBe('ready'); expect(result.state.savedUrls).toEqual(['clip.mp4']);
  expect(result.body).toBe('abcdef'); expect(result.status).toBe(200);
  await page.reload();
  const state=await page.evaluate(async () => { const m=await import('/helper.js');await m.prepareOfflineVideos();return m.getOfflineVideos(); });
  expect(state.phase).toBe('ready');
});
test('interrupted and quota-failed saves never advertise a ready video', async ({page}) => {
  await page.route('**/clip.mp4?offline-cache=1', route => route.fulfill({status:200,body:'abc',contentType:'video/mp4'}));
  await page.evaluate(async () => { const m=await import('/helper.js');await m.prepareOfflineVideos(); });
  expect(await page.evaluate(async () => (await import('/helper.js')).getOfflineVideos().savedUrls)).toEqual([]);
  await page.route('**/clip.mp4?offline-cache=1', route => route.fulfill({status:200,body:'abcdef',contentType:'video/mp4'}));
  await page.evaluate(async () => { Cache.prototype.put=async()=>{throw new DOMException('full','QuotaExceededError');};const m=await import('/helper.js');await m.prepareOfflineVideos({retry:true}); });
  const state=await page.evaluate(async () => (await import('/helper.js')).getOfflineVideos());
  expect(state.phase).toBe('error'); expect(state.savedUrls).toEqual([]); expect(state.error).toContain('storage');
});
