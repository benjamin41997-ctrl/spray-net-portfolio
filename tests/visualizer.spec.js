import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { colors } from '../src/data/colors.js';
import { projects } from '../src/data/projects.js';

const endpoint = 'https://visualizer-test.invalid';
const accessCode = 'test-tablet-code-' + 'a'.repeat(32);
const kitchenColors = colors.filter(color => color.collections.includes('kitchen')).slice(0, 3);
const exteriorColors = colors.filter(color => color.systems.includes('dw') && color.systems.includes('mat')).slice(0, 3);
const photo = await readFile(new URL(`../public/${projects[0].beforeImage}`, import.meta.url));
const generatedImage = `data:image/webp;base64,${(await readFile(new URL(`../public/${projects[0].afterImage}`, import.meta.url))).toString('base64')}`;

test.use({ serviceWorkers: 'block' });

async function stubService(page, { holdFirstRender = false } = {}) {
  const renders = [];
  let release;
  const firstRenderGate = new Promise(resolve => { release = resolve; });
  await page.route(`${endpoint}/api/**`, async route => {
    const request = route.request();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (request.url().endsWith('/api/render')) {
      renders.push({ body: request.postDataJSON(), authorization: request.headers().authorization });
      if (holdFirstRender && renders.length === 1) await firstRenderGate;
      await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ image: generatedImage, model: 'test-image-model' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ ready: true }) });
  });
  return { renders, release };
}

async function openAndConnect(page) {
  await page.goto('./#/visualize');
  await expect(page.getByRole('heading', { name: 'Your Home. Your Colors.' })).toBeVisible();
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
  await page.getByLabel('Image Service Address').fill(endpoint);
  await page.getByLabel('Tablet Access Code').fill(accessCode);
  await page.getByRole('button', { name: 'Connect Tablet', exact: true }).click();
  await expect(page.getByText('Connected. This tablet is ready to create previews.')).toBeVisible();
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
}

async function uploadPhoto(page) {
  await page.getByLabel('Choose home photo', { exact: true }).setInputFiles({ name: 'kitchen.webp', mimeType: 'image/webp', buffer: photo });
  await expect(page.getByAltText('Original photo of your home', { exact: true })).toBeVisible();
  await expect(page.getByText('Preparing Your Photo…', { exact: true })).toHaveCount(0);
}

async function selectColor(page, surface, color) {
  await page.getByLabel('Choose a Surface', { exact: true }).selectOption(surface);
  await page.getByLabel('Find a Color', { exact: true }).fill(color.name);
  await page.getByTitle(`${color.brand} ${color.name} ${color.code}`, { exact: true }).click();
}

async function expectSaved(page, count = 1) {
  await expect(page.locator('.viz-look-strip button')).toHaveCount(count);
  await expect(page.getByText('Saved on This Tablet', { exact: true })).toBeVisible();
  await expect(page.getByAltText('AI design preview of the selected finishes', { exact: true })).toBeVisible();
}

test('two-tone kitchen changes send the original photo, save automatically, and retain designs after reload', async ({ page }) => {
  const api = await stubService(page);
  const unexpectedRequests = [];
  page.on('request', request => {
    if (/api\.openai\.com/.test(request.url())) unexpectedRequests.push(request.url());
  });
  await openAndConnect(page);
  await uploadPhoto(page);
  await page.getByLabel('Consultation Label').fill('Kitchen Follow-Up');
  await page.getByRole('button', { name: 'Two-Tone', exact: true }).click();
  await selectColor(page, 'upperCabinets', kitchenColors[0]);
  await selectColor(page, 'lowerCabinets', kitchenColors[1]);
  await selectColor(page, 'island', kitchenColors[2]);
  await page.getByText('Hardware, Backsplash & Countertops', { exact: true }).click();
  await page.getByLabel('Hardware Style', { exact: true }).selectOption('bar');
  await page.getByLabel('Hardware Finish', { exact: true }).selectOption('matte-black');
  await page.getByLabel('Backsplash', { exact: true }).selectOption('white-subway');
  await page.getByLabel('Countertops', { exact: true }).selectOption('white-quartz');
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expectSaved(page);
  expect(api.renders[0].body.design).toEqual({
    mode: 'kitchen', sidingMaterial: 'other', surfaces: { upperCabinets: kitchenColors[0].id, lowerCabinets: kitchenColors[1].id, island: kitchenColors[2].id },
    hardwareStyle: 'bar', hardwareFinish: 'matte-black', backsplash: 'white-subway', countertop: 'white-quartz',
  });
  expect(api.renders[0].body.quality).toBe('preview');
  expect(api.renders[0].authorization).toBe(`Bearer ${accessCode}`);
  expect(api.renders[0].body.image).toMatch(/^data:image\/jpeg;base64,/);
  expect(api.renders[0].body.image).not.toBe(generatedImage);

  await selectColor(page, 'island', kitchenColors[1]);
  await page.getByRole('button', { name: 'Create Detailed Preview', exact: true }).click();
  await expectSaved(page, 2);
  expect(api.renders[1].body.image).toBe(api.renders[0].body.image);
  expect(api.renders[1].body.quality).toBe('detail');
  expect(api.renders[1].body.design.surfaces.island).toBe(kitchenColors[1].id);
  expect(unexpectedRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('spray-net-render-access'))).toBeNull();
  expect(await page.evaluate(() => sessionStorage.getItem('spray-net-render-access'))).toBe(accessCode);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Picture Your Transformation' })).toBeVisible();
  await expect(page.locator('.viz-saved-item')).toHaveCount(0);
  await expect(page.getByText('Kitchen Follow-Up', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(0);
  await page.getByRole('button', { name: 'Saved Previews on This Tablet', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(2);
  await page.locator('.viz-saved-item').first().click();
  await expect(page.getByAltText('AI design preview of the selected finishes', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create My Preview', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Show Original', exact: true }).click();
  await expect(page.getByAltText('Original photo of your home', { exact: true })).toBeVisible();
});

test('a rendering continues while the customer browses the portfolio and returns to the same design', async ({ page }) => {
  const api = await stubService(page, { holdFirstRender: true });
  await openAndConnect(page);
  await uploadPhoto(page);
  await selectColor(page, 'cabinets', kitchenColors[0]);
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expect.poll(() => api.renders.length).toBe(1);
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Reviews', exact: true }).click();
  await expect(page.getByText('Your design preview is being created.', { exact: true })).toBeVisible();
  api.release();
  await expect(page.getByText('Your design preview is ready.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Return to Your Design', exact: true }).click();
  await expectSaved(page);
  await expect(page.locator('.viz-selection strong')).toHaveText(kitchenColors[0].name);
  await page.getByRole('button', { name: 'View Fullscreen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Fullscreen design photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Close Fullscreen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Fullscreen design photo' })).not.toBeVisible();
});

test('exterior surfaces are independent and going offline blocks paid generation', async ({ page, context }) => {
  const api = await stubService(page);
  await openAndConnect(page);
  await page.getByRole('button', { name: 'Home Exterior', exact: true }).click();
  await uploadPhoto(page);
  await selectColor(page, 'siding', exteriorColors[0]);
  await selectColor(page, 'frontDoor', exteriorColors[1]);
  await selectColor(page, 'windows', exteriorColors[2]);
  await selectColor(page, 'soffits', exteriorColors[0]);
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expectSaved(page);
  expect(api.renders[0].body.design.mode).toBe('exterior');
  expect(api.renders[0].body.design.sidingMaterial).toBe('other');
  expect(api.renders[0].body.design.surfaces).toEqual({ siding: exteriorColors[0].id, frontDoor: exteriorColors[1].id, windows: exteriorColors[2].id, soffits: exteriorColors[0].id });
  await context.setOffline(true);
  await expect(page.getByText('Connect to the internet to create a new preview. Saved images and color selections still work offline.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create My Preview', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Create Detailed Preview', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Show Original', exact: true }).click();
  await expect(page.getByAltText('Original photo of your home', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Saved Previews on This Tablet', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(1);
  expect(api.renders).toHaveLength(1);
});

test('new consultations clear previous customer photos and filters without deleting the saved library', async ({ page }) => {
  await stubService(page);
  await openAndConnect(page);
  await uploadPhoto(page);
  await page.getByLabel('Consultation Label').fill('Previous Customer');
  await selectColor(page, 'cabinets', kitchenColors[0]);
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expectSaved(page);
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Saved Previews on This Tablet', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Start a New Consultation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Picture Your Transformation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Consultation Tools', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.viz-saved-item')).toHaveCount(0);
  await expect(page.getByText('Previous Customer', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Consultation Label')).toHaveValue('');
  await expect(page.getByLabel('Find a Color', { exact: true })).toHaveValue('');
  await expect(page.locator('.viz-look-strip button')).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(0);
  await page.getByRole('button', { name: 'Saved Previews on This Tablet', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(1);

  const scripts = (await readdir(new URL('../dist/assets/', import.meta.url))).filter(file => file.endsWith('.js'));
  for (const script of scripts) {
    const source = await readFile(new URL(`../dist/assets/${script}`, import.meta.url), 'utf8');
    expect(source).not.toMatch(/sk-(?:proj-)?[A-Za-z0-9_-]{30,}/);
    expect(source).not.toContain(accessCode);
  }
  await expect(page.locator('a[target="_blank"]')).toHaveCount(0);
});

test('private tablet pairing connects without typing and removes the access code from the address', async ({ page }) => {
  const api = await stubService(page);
  const encoded = Buffer.from(JSON.stringify({ endpoint, token: accessCode })).toString('base64url');
  const outgoingUrls = [];
  page.on('request', request => outgoingUrls.push(request.url()));
  await page.goto(`./#/visualize?tablet=${encoded}`);
  await expect(page).toHaveURL(/#\/visualize$/);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('spray-net-render-access'))).toBe(accessCode);
  expect(await page.evaluate(() => localStorage.getItem('spray-net-render-access'))).toBeNull();
  await expect(page.getByRole('button', { name: 'Consultation Tools', exact: true })).toHaveAttribute('aria-expanded', 'false');
  await uploadPhoto(page);
  await selectColor(page, 'cabinets', kitchenColors[0]);
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expectSaved(page);
  expect(api.renders[0].authorization).toBe(`Bearer ${accessCode}`);
  expect(outgoingUrls.some(url => url.includes(accessCode) || url.includes(encoded))).toBe(false);
  await page.getByRole('button', { name: 'Consultation Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await page.getByLabel('Tablet connection setup file', { exact: true }).setInputFiles({
    name: 'tablet-connection.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ endpoint, token: accessCode })),
  });
  await expect(page.getByText('Connected. This tablet is ready to create previews.')).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem('spray-net-render-access'))).toBe(accessCode);
});
