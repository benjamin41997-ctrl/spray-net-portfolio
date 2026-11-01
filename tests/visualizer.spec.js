import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { colors } from '../src/data/colors.js';
import { projects } from '../src/data/projects.js';

const endpoint = 'https://visualizer-test.invalid';
const accessCode = 'test-tablet-code-' + 'a'.repeat(32);
const operatorCode = 'test-operator-code-' + 'b'.repeat(32);
const tabletPassword = 'test-tablet-password';
const connectionKey = 'spray-net-render-connection-v1';
const kitchenColors = colors.filter(color => color.collections.includes('kitchen')).slice(0, 3);
const exteriorColors = colors.filter(color => color.systems.includes('dw') && color.systems.includes('mat')).slice(0, 3);
const photo = await readFile(new URL(`../public/${projects[0].beforeImage}`, import.meta.url));
const generatedImage = `data:image/webp;base64,${(await readFile(new URL(`../public/${projects[0].afterImage}`, import.meta.url))).toString('base64')}`;

test.use({ serviceWorkers: 'block' });

async function stubService(page, { holdFirstRender = false } = {}) {
  await page.addInitScript(endpoint => localStorage.setItem('spray-net-render-endpoint',endpoint),endpoint);
  const renders = [];
  let release;
  const firstRenderGate = new Promise(resolve => { release = resolve; });
  await page.route(`${endpoint}/api/**`, async route => {
    const request = route.request();
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type, x-visualizer-operator',
    };
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (request.url().endsWith('/api/connect')) {
      const valid = request.postDataJSON().password === tabletPassword;
      await route.fulfill({status:valid?200:401,contentType:'application/json',headers,body:JSON.stringify(valid?{ready:true,token:accessCode,operatorToken:operatorCode,operatorAuthorized:true}:{error:{message:'That password is incorrect. Please try again.'}})});
      return;
    }
    if (request.url().endsWith('/api/render')) {
      renders.push({ body: request.postDataJSON(), authorization: request.headers().authorization });
      if (holdFirstRender && renders.length === 1) await firstRenderGate;
      await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ image: generatedImage, model: 'test-image-model' }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', headers, body: JSON.stringify({ ready: true, operatorAuthorized:request.headers()['x-visualizer-operator'] === operatorCode }) });
  });
  return { renders, release };
}

async function openTools(page) {
  const active = page.getByRole('group', { name:'Project type' }).locator('button[aria-pressed="true"]');
  for (let i=0;i<8;i++) await active.click();
  await expect(page.getByRole('heading', { name:'Consultation Tools', exact:true })).toBeVisible();
}

async function openAndConnect(page) {
  await page.goto('./#/visualize');
  await expect(page.getByRole('heading', { name: 'Your Home. Your Colors.' })).toBeVisible();
  await openTools(page);
  await page.getByLabel('Tablet Password',{exact:true}).fill(tabletPassword);
  await page.getByRole('button', { name: 'Activate This Tablet', exact: true }).click();
  await expect(page.getByText('Tablet Connected',{exact:true})).toBeVisible();
  await page.getByRole('button', { name:'Close Tools', exact:true }).click();
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
  await openTools(page);
  await page.getByLabel('Consultation Label').fill('Kitchen Follow-Up');
  await page.getByRole('button', { name:'Close Tools', exact:true }).click();
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
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).token,connectionKey)).toBe(accessCode);
  expect(await page.evaluate(() => sessionStorage.getItem('spray-net-render-access'))).toBeNull();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(tabletPassword);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Picture Your Transformation' })).toBeVisible();
  await expect(page.locator('.viz-saved-item')).toHaveCount(0);
  await expect(page.getByText('Kitchen Follow-Up', { exact: true })).toHaveCount(0);
  await openTools(page);
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
  await openTools(page);
  await page.getByRole('button', { name: 'Saved Previews on This Tablet', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(1);
  expect(api.renders).toHaveLength(1);
});

test('new consultations clear previous customer photos and filters without deleting the saved library', async ({ page }) => {
  await stubService(page);
  await openAndConnect(page);
  await uploadPhoto(page);
  await openTools(page);
  await page.getByLabel('Consultation Label').fill('Previous Customer');
  await page.getByRole('button', { name:'Close Tools', exact:true }).click();
  await selectColor(page, 'cabinets', kitchenColors[0]);
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expectSaved(page);
  await openTools(page);
  await page.getByRole('button', { name: 'Saved Previews on This Tablet', exact: true }).click();
  await expect(page.locator('.viz-saved-item')).toHaveCount(1);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Start a New Consultation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Picture Your Transformation' })).toBeVisible();
  await expect(page.getByRole('heading', { name:'Consultation Tools', exact:true })).toHaveCount(0);
  await expect(page.locator('.viz-saved-item')).toHaveCount(0);
  await expect(page.getByText('Previous Customer', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Consultation Label')).toHaveCount(0);
  await expect(page.getByLabel('Find a Color', { exact: true })).toHaveValue('');
  await expect(page.locator('.viz-look-strip button')).toHaveCount(0);
  await openTools(page);
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

test('legacy tablet pairing still connects and can reconnect by password without a setup file', async ({ page }) => {
  const api = await stubService(page);
  const encoded = Buffer.from(JSON.stringify({ endpoint, token: accessCode })).toString('base64url');
  const outgoingUrls = [];
  page.on('request', request => outgoingUrls.push(request.url()));
  await page.goto(`./#/visualize?tablet=${encoded}`);
  await expect(page).toHaveURL(/#\/visualize$/);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').token,connectionKey)).toBe(accessCode);
  expect(await page.evaluate(() => localStorage.getItem('spray-net-render-access'))).toBeNull();
  await expect(page.getByRole('heading', { name:'Consultation Tools', exact:true })).toHaveCount(0);
  await uploadPhoto(page);
  await selectColor(page, 'cabinets', kitchenColors[0]);
  await page.getByRole('button', { name: 'Create My Preview', exact: true }).click();
  await expectSaved(page);
  expect(api.renders[0].authorization).toBe(`Bearer ${accessCode}`);
  expect(outgoingUrls.some(url => url.includes(accessCode) || url.includes(encoded))).toBe(false);
  await openTools(page);
  await page.getByRole('button', { name: 'Forget This Tablet', exact: true }).click();
  await page.getByLabel('Tablet Password',{exact:true}).fill(tabletPassword);
  await page.getByRole('button',{name:'Activate This Tablet',exact:true}).click();
  await expect(page.getByText('Tablet Connected',{exact:true})).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).token,connectionKey)).toBe(accessCode);
});

test('multiple uploaded angles render independently without generating on upload', async ({ page }) => {
  const api=await stubService(page); await openAndConnect(page);
  const other=await readFile(new URL(`../public/${projects[1].beforeImage}`,import.meta.url));
  await page.getByLabel('Choose home photo',{exact:true}).setInputFiles([
    {name:'kitchen-angle-one.webp',mimeType:'image/webp',buffer:photo},
    {name:'kitchen-angle-two.webp',mimeType:'image/webp',buffer:other},
  ]);
  await expect(page.getByRole('button',{name:'Select Photo 2',exact:true})).toBeVisible();
  expect(api.renders).toHaveLength(0);
  await selectColor(page,'cabinets',kitchenColors[0]);
  await page.getByRole('button',{name:'Create My Preview',exact:true}).click();await expectSaved(page);
  await page.getByRole('button',{name:'Select Photo 2',exact:true}).click();
  await expect(page.locator('.viz-look-strip button')).toHaveCount(0);
  await expect(page.getByAltText('Original photo of your home',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Create My Preview',exact:true}).click();await expectSaved(page);
  expect(api.renders).toHaveLength(2);expect(api.renders[0].body.image).not.toBe(api.renders[1].body.image);
  await page.getByRole('button',{name:'Select Photo 1',exact:true}).click();await expectSaved(page);
  await expect(page.getByRole('button',{name:'Select Photo 1',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.viz-photo-stage img')).toHaveCSS('object-fit','contain');
  expect(await page.locator('.viz-photo-stage img').evaluate(node=>node.getBoundingClientRect().height)).toBeLessThanOrEqual(340);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('operator menu requires a five-second hold and hides its controls again when closed', async ({page}) => {
  await page.goto('./#/visualize');
  await expect(page.getByLabel('Consultation Label')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Start a New Consultation',exact:true})).toHaveCount(0);
  const type=page.getByRole('button',{name:'Kitchen & Cabinets',exact:true});
  await type.scrollIntoViewIfNeeded();const box=await type.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await expect(page.getByRole('heading',{name:'Consultation Tools',exact:true})).toHaveCount(0);
  await page.waitForTimeout(5200); // Exercise the actual deliberate hold, including browser pointer events.
  await page.mouse.up();
  await expect(page.getByRole('heading',{name:'Consultation Tools',exact:true})).toBeVisible();
  await expect(page.getByLabel('Consultation Label')).toBeVisible();
  await page.getByRole('button',{name:'Close Tools',exact:true}).click();
  await expect(page.getByLabel('Consultation Label')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Consultation Tools',exact:true})).toHaveCount(0);
});

test('custom prompts stay in operator controls and do not carry into normal renders', async ({page}) => {
  const api=await stubService(page);await page.goto('./#/visualize');
  await openTools(page);await expect(page.getByLabel('Custom Instructions',{exact:true})).toBeDisabled();
  await page.getByLabel('Tablet Password',{exact:true}).fill(tabletPassword);
  await page.getByRole('button',{name:'Activate This Tablet',exact:true}).click();
  await expect(page.getByLabel('Custom Instructions',{exact:true})).toBeEnabled();
  await uploadPhoto(page);
  const text='Make the island a muted sage green and keep the existing countertop.';
  await page.getByLabel('Custom Instructions',{exact:true}).fill(text);expect(api.renders).toHaveLength(0);
  await page.getByRole('button',{name:'Create Custom Preview',exact:true}).click();await expectSaved(page);
  expect(api.renders[0].body.customPrompt).toBe(text);
  await page.getByRole('button',{name:'Close Tools',exact:true}).click();
  await expect(page.getByLabel('Custom Instructions',{exact:true})).toHaveCount(0);
  await selectColor(page,'cabinets',kitchenColors[0]);
  await page.getByRole('button',{name:'Create My Preview',exact:true}).click();await expectSaved(page,2);
  expect(api.renders[1].body.customPrompt).toBeUndefined();
  await openTools(page);await expect(page.getByLabel('Custom Instructions',{exact:true})).toHaveValue('');
});

test('official Sherwin-Williams references can be found with compact color codes', async ({page}) => {
  await page.goto('./#/visualize');
  await page.getByLabel('Find a Color',{exact:true}).fill('SW7008');
  await expect(page.getByTitle('Sherwin-Williams Alabaster SW 7008',{exact:true})).toBeVisible();
  const refs=colors.filter(color=>color.brand==='Sherwin-Williams');
  expect(refs).toHaveLength(1731);expect(new Set(colors.map(color=>color.id)).size).toBe(colors.length);
  expect(colors.find(color=>color.id==='sw-7008').hex).toBe('#EDEAE0');
});

test('password access survives a fresh browser session until Forget This Tablet is used', async ({page,context,browser}) => {
  await stubService(page);await openAndConnect(page);
  const stored=await context.storageState();
  expect(JSON.stringify(stored)).not.toContain(tabletPassword);
  const next=await browser.newContext({storageState:stored,serviceWorkers:'block'});
  try {
    const reopened=await next.newPage();await stubService(reopened);await reopened.goto(page.url());
    await openTools(reopened);
    await expect(reopened.getByText('Tablet Connected',{exact:true})).toBeVisible();
    await expect(reopened.getByLabel('Custom Instructions',{exact:true})).toBeEnabled();
    await expect(reopened.getByLabel('Tablet Password',{exact:true})).toHaveCount(0);
    await reopened.getByRole('button',{name:'Forget This Tablet',exact:true}).click();
    await expect(reopened.getByLabel('Tablet Password',{exact:true})).toBeVisible();
    expect(await reopened.evaluate(key=>localStorage.getItem(key),connectionKey)).toBeNull();
    await reopened.reload();await openTools(reopened);
    await expect(reopened.getByLabel('Tablet Password',{exact:true})).toBeVisible();
    await expect(reopened.getByLabel('Custom Instructions',{exact:true})).toBeDisabled();
  } finally {await next.close();}
});

test('incorrect passwords and unavailable persistent storage never claim the tablet is activated', async ({page}) => {
  await stubService(page);await page.goto('./#/visualize');await openTools(page);
  await page.getByLabel('Tablet Password',{exact:true}).fill('an-incorrect-password');
  await page.getByRole('button',{name:'Activate This Tablet',exact:true}).click();
  await expect(page.getByText('That password is incorrect. Please try again.',{exact:true})).toBeVisible();
  expect(await page.evaluate(key=>localStorage.getItem(key),connectionKey)).toBeNull();
  await page.evaluate(key=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('Full','QuotaExceededError');return original.call(this,name,value);};
  },connectionKey);
  await page.getByLabel('Tablet Password',{exact:true}).fill(tabletPassword);
  await page.getByRole('button',{name:'Activate This Tablet',exact:true}).click();
  await expect(page.getByText('This browser cannot remember tablet access. Allow site storage, then try again.',{exact:true})).toBeVisible();
  await expect(page.getByText('Tablet Connected',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Custom Instructions',{exact:true})).toBeDisabled();
});
