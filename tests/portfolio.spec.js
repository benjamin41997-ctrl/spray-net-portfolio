import { test, expect } from '@playwright/test';
import { reviews } from '../src/data/reviews.js';
import { videos } from '../src/data/videos.js';
import { projects } from '../src/data/projects.js';
import { filterProjects, youtubeEmbed } from '../src/lib/media.js';
import AxeBuilder from '@axe-core/playwright';

test('content filtering and embed URL validation', () => {
  for (const project of projects) {
    const params = new URLSearchParams({
      category: project.category,
      color: project.colorFamily,
    });
    expect(filterProjects(projects, params)).toContain(project);
  }
  expect(
    filterProjects(projects, new URLSearchParams({ category: 'Cabinets', color: 'Black' })),
  ).toHaveLength(0);
  expect(youtubeEmbed('https://www.youtube.com/embed/abcdefghijk')).toContain(
    'youtube-nocookie.com/embed/abcdefghijk',
  );
  expect(youtubeEmbed('https://www.youtube.com.evil.invalid/embed/abcdefghijk')).toBeNull();
  expect(youtubeEmbed('javascript:alert(1)')).toBeNull();
  expect(youtubeEmbed('https://www.youtube.com/watch?v=abcdefghijk')).toBeNull();
});

test('home, filters, comparison, gallery, Back, and empty state', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(
    page.getByRole('heading', { name: 'Custom Chemistry. Smarter Painting.' }),
  ).toBeVisible();
  await expect(page.locator('.brand img')).toHaveAttribute('src', /branding\/logo\.png$/);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.locator('body').evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'Lato',
  );
  await page.locator('.main-nav a').first().click();
  await expect(page.getByRole('group', { name: 'Surface type', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Vinyl Siding', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Aluminum, Fiber Cement & Engineered Wood', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(4);
  await page.getByRole('button', { name: 'Blue', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(1);
  await page.locator('.home-control').click();
  await page.locator('.cabinet-card').click();
  await expect(page.locator('.project-card')).toHaveCount(projects.filter(p => p.category === 'Cabinets').length);
  await page.getByRole('button', { name: 'Blue', exact: true }).click();
  await expect(page.locator('.project-card')).toHaveCount(projects.filter(p => p.category === 'Cabinets' && p.colorFamily === 'Blue').length);
  await page.getByRole('link', { name: /A bold finish in Hale Navy/ }).click();
  await expect(
    page.getByRole('heading', { name: 'A bold finish in Hale Navy', exact: true }),
  ).toBeVisible();
  const slider = page.getByRole('slider', { name: 'Before and now comparison' });
  await expect(page.locator('.after-label')).toHaveText('NOW');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('51');
  await page.getByRole('button', { name: 'View now image fullscreen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Next image' }).click();
  await expect(page.locator('.lightbox-bar')).toContainText('Before');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await expect(page.locator('.lightbox-stage')).toHaveClass(/is-zoomed/);
  await page.goBack();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Blue', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('.project-card').first().click();
  await page.locator('.back-link').click();
  await expect(page.getByRole('button', { name: 'Blue', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Black', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A fresh start?' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).last().click();
  await expect(page.locator('.project-card')).toHaveCount(projects.filter(p => p.category === 'Cabinets').length);
  expect(errors).toEqual([]);
});

test('network testimonials, video embed, and all information pages', async ({ page }) => {
  await page.goto('./#/reviews');
  await expect(page.locator('.review-card')).toHaveCount(reviews.length);
  await expect(page.locator('.review-card .stars')).toHaveCount(16);
  await page.getByRole('button', { name: 'Cabinets', exact: true }).click();
  await expect(page.locator('.review-card')).toHaveCount(reviews.filter(r => r.serviceType === 'Cabinets').length);
  await expect(page.locator('.review-card').filter({ hasText: 'Tina' }).locator('.stars')).toHaveCount(0);
  await expect(page.getByText('Hear what our customers love about their Spray-Net transformations.')).toBeVisible();
  await page.locator('.home-control').click();
  await page.locator('.video-nav').click();
  await expect(page.locator('.video-card')).toHaveCount(videos.length);
  await page.locator('a[href="#/videos/sherry-holmes-kitchen"]').click();
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>Embedded video test</p>' }),
  );
  await page
    .getByRole('button', { name: 'Play A kitchen transformation with Sherry Holmes' })
    .click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /youtube-nocookie.com/);
  await expect(page.locator('iframe')).toHaveAttribute(
    'sandbox',
    'allow-scripts allow-same-origin allow-presentation',
  );
  await page.locator('.home-control').click();
  await page.locator('.why-nav').click();
  await expect(page.locator('.info-card')).toHaveCount(7);
  const hrefs = await page
    .locator('.info-card')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  expect(hrefs).toHaveLength(7);
  for (const href of hrefs) {
    await page.locator(`a[href="${href}"]`).click();
    await expect(page.locator('.info-article')).toBeVisible();
    await expect(page.locator('main h1')).toBeFocused();
    await page.getByRole('link', { name: 'Why Spray-Net', exact: true }).last().click();
  }
});

test('local MP4 starts and can seek', async ({ page, browserName }) => {
  // Playwright WebKit on Windows does not ship the platform H.264 decoder.
  test.skip(
    browserName === 'webkit' && process.platform === 'win32',
    'Verify H.264 on real iPad Safari; Windows WebKit lacks codec support.',
  );
  await page.goto('./#/videos/network-exterior-process');
  await page.getByRole('button', { name: 'Play An exterior transformation, step by step' }).click();
  await expect(page.locator('video')).toBeVisible();
  await expect
    .poll(() => page.locator('video').evaluate((video) => video.currentTime))
    .toBeGreaterThan(0.1);
  await page.locator('video').evaluate((video) => {
    video.currentTime = 8;
  });
  await expect
    .poll(() => page.locator('video').evaluate((video) => video.currentTime))
    .toBeGreaterThan(7);
});

test('manifest, scoped service worker, offline reload and online video fallback', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'Playwright WebKit does not expose reliable service worker emulation; tested in Chromium.',
  );
  await page.goto('./');
  await expect(page.locator('.offline-status')).toContainText('Ready offline', { timeout: 20000 });
  await page.reload();
  const manifest = await page.evaluate(async () => {
    const url = document.querySelector('link[rel="manifest"]').href;
    return { url, data: await (await fetch(url)).json() };
  });
  expect(manifest.url).toContain('/spray-net-portfolio/manifest.webmanifest');
  expect(manifest.data.display).toBe('standalone');
  expect(manifest.data.theme_color).toBe('#003965');
  expect(manifest.data.start_url).toBe('./');
  expect(manifest.data.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
    ]),
  );
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toContain('/spray-net-portfolio/');
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Custom Chemistry. Smarter Painting.' }),
  ).toBeVisible();
  await page.locator('.cabinet-card').click();
  await page.locator('.project-card').first().click();
  expect(
    await page
      .locator('.comparison img')
      .evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
  ).toBe(true);
  await page.locator('.home-control').click();
  await page.locator('.review-nav').click();
  await expect(page.locator('.review-card')).toHaveCount(reviews.length);
  await page.locator('.home-control').click();
  await page.locator('.why-nav').click();
  await page.locator('.info-card').first().click();
  await expect(page.locator('.info-article')).toBeVisible();
  await page.locator('.home-control').click();
  await page.locator('.video-nav').click();
  await page.locator('a[href="#/videos/sherry-holmes-kitchen"]').click();
  await expect(
    page.getByRole('heading', { name: 'Internet connection required to play this video' }),
  ).toBeVisible();
  const cachedURLs = await page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      )
    ).flat(),
  );
  expect(cachedURLs.some((url) => url.includes('youtube'))).toBe(false);
  expect(
    cachedURLs.some((url) => url.includes('media/projects/chantilly-lace-kitchen/before.webp')),
  ).toBe(true);
  expect(cachedURLs.some((url) => url.includes('branding/fonts/Lato-Black.ttf'))).toBe(true);
  for (const project of projects) {
    for (const image of [project.beforeImage, project.afterImage, ...project.additionalImages]) {
      expect(cachedURLs.some((url) => url.includes(image)), `${image} is available offline`).toBe(true);
    }
  }
  for (const video of videos) {
    expect(cachedURLs.some((url) => url.includes(video.thumbnail))).toBe(true);
  }
});

test('inactivity resets to home and clears filters', async ({ page }) => {
  await page.clock.install();
  await page.goto('./#/projects?collection=cabinets&color=Blue');
  await expect(page.locator('.project-card')).toHaveCount(projects.filter(p => p.category === 'Cabinets' && p.colorFamily === 'Blue').length);
  await page.clock.runFor(10 * 60_000 + 1000);
  await expect(page).toHaveURL(/#\/$/);
  await page.locator('.cabinet-card').click();
  await expect(page.locator('.project-card')).toHaveCount(projects.filter(p => p.category === 'Cabinets').length);
});

test('responsive layouts, loaded images, and no external navigation', async ({ page }) => {
  for (const size of [
    { width: 1180, height: 820 },
    { width: 834, height: 1194 },
    { width: 1024, height: 1366 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const route of [
      '/',
      '/projects',
      '/projects/hale-navy-kitchen',
      '/projects/commercial-metal-building',
      '/reviews',
      '/videos',
      '/why',
      '/why/paint-comparison',
    ]) {
      await page.goto(`./#${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${route} at ${size.width}px`).toBe(false);
      expect(await page.locator('a[target="_blank"], a[download], a[href^="http"]').count()).toBe(
        0,
      );
    }
  }
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('./');
  await expect
    .poll(() =>
      page
        .locator('.home-cards img')
        .evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/home-${test.info().project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.screenshot({
    path: `test-results/home-portrait-${test.info().project.name}.png`,
    fullPage: true,
    animations: 'disabled',
  });
});

test('direct image link closes safely and invalid routes recover', async ({ page }) => {
  await page.goto('./#/projects/hale-navy-kitchen?photo=0');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close fullscreen viewer' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'A bold finish in Hale Navy', exact: true }),
  ).toBeVisible();
  await page.goto('./#/unknown');
  await expect(page.getByRole('heading', { name: 'A new direction.' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page.locator('.home-cards')).toBeVisible();
});

test('major screens meet automated WCAG AA accessibility checks', async ({ page, browserName }) => {
  const violations = [];
  test.skip(
    browserName !== 'chromium',
    'One complete semantic/contrast scan covers the shared markup.',
  );
  for (const route of [
    '/',
    '/projects',
    '/projects/hale-navy-kitchen',
    '/reviews',
    '/videos',
    '/why',
    '/why/warranty',
  ]) {
    await page.goto(`./#${route}`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    violations.push(
      ...results.violations.map((v) => ({
        route,
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    );
  }
  expect(violations).toEqual([]);
});

test('network provenance, paired photos, and corporate reference sheets', async ({ page }) => {
  expect(projects.length).toBeGreaterThanOrEqual(53);
  expect(new Set(projects.map((project) => project.category)).size).toBe(7);
  for (const project of projects) {
    expect(project.location).toBe('');
    expect(project.review).toBe('');
    expect(project.rating).toBeNull();
    expect(project.attribution).toBe('Spray-Net network project');
  }
  await page.goto('./#/projects/commercial-metal-building');
  await expect(page.locator('.comparison-pair img')).toHaveCount(2);
  await page.getByRole('button', { name: 'Slider', exact: true }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.getByRole('button', { name: 'Side by side', exact: true }).click();
  await expect(page.getByRole('slider')).not.toBeVisible();
  await page.goto('./#/why/paint-comparison');
  await page.getByRole('button', { name: 'View Cabinet coating comparison fullscreen' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.resource-sheet')).toHaveCount(2);
  await page.goto('./#/why/coating-technology?sheet=stucco-technology');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close fullscreen viewer' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
