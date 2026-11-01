import { test, expect } from '@playwright/test';
import { videos } from '../src/data/videos.js';

test('comparison accepts touch anywhere on the photo, dragging, and keyboard input', async ({ page }) => {
  await page.goto('./#/projects/hale-navy-kitchen');
  const comparison = page.locator('.comparison');
  const slider = page.getByRole('slider', { name:'Before and now comparison' });
  await comparison.scrollIntoViewIfNeeded();
  const box = await comparison.boundingBox();
  // These taps are far away from the handle and the native range track.
  await page.touchscreen.tap(box.x + box.width * .8, box.y + box.height * .22);
  await expect(slider).toHaveValue('80');
  await page.touchscreen.tap(box.x + box.width * .2, box.y + box.height * .77);
  await expect(slider).toHaveValue('20');
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .74, box.y + box.height * .6, { steps:6 });
  await page.mouse.up();
  await expect(slider).toHaveValue('74');
  await slider.focus(); await slider.press('ArrowRight');
  await expect(slider).toHaveValue('75');
  await expect(comparison).toHaveCSS('touch-action','pan-y');
  expect(await page.locator('.comparison-divider > span').evaluate(node => node.getBoundingClientRect().width)).toBeGreaterThanOrEqual(64);
  await page.getByRole('button', { name:'View now image fullscreen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name:'Close fullscreen viewer' }).click();
  await expect(slider).toHaveValue('75');
});

test('complete local videos are saved before playback and can play and seek offline', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Service worker emulation and H.264 are not reliable in Windows Playwright WebKit. Cache helpers are tested separately in WebKit.');
  test.setTimeout(90_000);
  const downloads = [];
  page.on('request', request => { if (request.url().includes('offline-cache=')) downloads.push(request); });
  await page.goto('./#/videos');
  await expect(page.getByRole('heading', { name:'Local Videos Ready Offline', exact:true })).toBeVisible({ timeout:60_000 });
  await expect(page.locator('.offline-status')).toContainText('Ready offline');
  expect(downloads).toHaveLength(videos.filter(video => video.type === 'local').length);
  expect(downloads.every(request => !request.headers().range)).toBe(true);
  const stored = await page.evaluate(async () => {
    const cache = await caches.open('spray-net-local-videos');
    return Promise.all((await cache.keys()).map(async request => { const response = await cache.match(request); return {url:request.url,status:response.status,size:(await response.blob()).size}; }));
  });
  for (const video of videos.filter(item => item.type === 'local')) {
    expect(stored).toContainEqual({url:expect.stringContaining(video.url),status:200,size:video.bytes});
  }
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('heading', { name:'Local Videos Ready Offline', exact:true })).toBeVisible();
  await page.locator('a[href="#/videos/network-exterior-process"]').click();
  await page.getByRole('button', { name:'Play An exterior transformation, step by step' }).click();
  await expect(page.locator('video source')).toHaveAttribute('src',/^blob:/);
  await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(.1);
  await page.locator('video').evaluate(video => { video.currentTime = 25; });
  await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(24);
});
