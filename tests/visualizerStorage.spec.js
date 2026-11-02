import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const moduleSources = {
  '/visualizerStorage.js': await readFile(new URL('../src/lib/visualizerStorage.js', import.meta.url), 'utf8'),
  '/visualizerPhoto.js': await readFile(new URL('../src/lib/visualizerPhoto.js', import.meta.url), 'utf8'),
};

test.beforeEach(async ({ page }) => {
  await page.route('https://visualizer-test.invalid/**', (route) => {
    const source = moduleSources[new URL(route.request().url()).pathname];
    return route.fulfill({
      contentType: source ? 'text/javascript' : 'text/html',
      body: source || '<!doctype html><html lang="en"><title>Local photo helper tests</title><body></body></html>',
    });
  });
  await page.goto('https://visualizer-test.invalid/');
});

test('saved renderings retain both photos and selections across reloads and can be deleted', async ({ page }) => {
  await page.evaluate(async () => {
    const { saveRender } = await import('/visualizerStorage.js');
    const originalPhoto = new Blob(['original photo'], { type: 'image/jpeg' });
    const renderPhoto = new Blob(['generated image'], { type: 'image/png' });
    await saveRender({
      id: 'first', originalPhoto, renderPhoto,rawRenderPhoto:new Blob(['unlabelled'],{type:'image/webp'}),corrections:['Keep the brick unchanged.'],regions:[],
      design: { room: 'kitchen', cabinetColor: 'Chantilly Lace', twoTone: true },
      consultationLabel: '  Kitchen Consultation  ', createdAt: '2026-10-29T12:00:00Z',
    });
    await saveRender({ id: 'second', originalPhoto, renderPhoto, design: { room: 'exterior' }, createdAt: '2026-10-30T12:00:00Z' });
  });
  await page.reload();
  const stored = await page.evaluate(async () => {
    const { getRender, listRenders, deleteRender, storageSummary } = await import('/visualizerStorage.js');
    const records = await listRenders();
    const first = await getRender('first');
    const result = {
      order: records.map((record) => record.id),
      label: first.consultationLabel,
      design: first.design,
      original: await first.originalPhoto.text(),
      rendered: await first.renderPhoto.text(), raw:await first.rawRenderPhoto.text(), corrections:first.corrections,
      countBefore: (await storageSummary()).count,
    };
    await deleteRender('first');
    result.deleted = await getRender('first');
    result.countAfter = (await storageSummary()).count;
    return result;
  });
  expect(stored).toEqual({
    order: ['second', 'first'], label: 'Kitchen Consultation',
    design: { room: 'kitchen', cabinetColor: 'Chantilly Lace', twoTone: true },
    original: 'original photo', rendered: 'generated image', raw:'unlabelled', corrections:['Keep the brick unchanged.'],countBefore: 2, deleted: null, countAfter: 1,
  });
});

test('failed saves report storage problems without a success record', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { saveRender, listRenders } = await import('/visualizerStorage.js');
    await listRenders();
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => { throw new DOMException('Device quota reached.', 'QuotaExceededError'); };
    let message;
    try {
      await saveRender({
        originalPhoto: new Blob(['original'], { type: 'image/jpeg' }),
        renderPhoto: new Blob(['render'], { type: 'image/png' }), design: {},
      });
    } catch (error) {
      message = error.message;
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }
    return { message, count: (await listRenders()).length };
  });
  expect(result.message).toContain('out of storage');
  expect(result.count).toBe(0);
});

test('preparing a local photo resizes it and produces an opaque JPEG without network traffic', async ({ page }) => {
  await page.evaluate(async () => { window.photoModule = await import('/visualizerPhoto.js'); });
  const requests = [];
  page.on('request', (request) => requests.push(request.url()));
  const result = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = 1800;
    const context = canvas.getContext('2d');
    context.fillStyle = '#b00000';
    context.fillRect(0, 0, 1500, 1800);
    const source = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const prepared = await window.photoModule.preparePhoto(new File([source], 'kitchen.png', { type: 'image/png' }));
    const image = new Image();
    image.src = prepared.dataUrl;
    await image.decode();
    canvas.width = prepared.width;
    canvas.height = prepared.height;
    context.drawImage(image, 0, 0);
    return {
      type: prepared.blob.type, width: prepared.width, height: prepared.height,
      jpegDataUrl: prepared.dataUrl.startsWith('data:image/jpeg;base64,'),
      whiteBackground: [...context.getImageData(prepared.width - 10, 10, 1, 1).data],
    };
  });
  expect(result).toEqual({ type: 'image/jpeg', width: 1600, height: 960, jpegDataUrl: true, whiteBackground: [255, 255, 255, 255] });
  expect(requests).toEqual([]);
});

test('camera orientation is applied and not carried as metadata into the prepared photo', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { preparePhoto } = await import('/visualizerPhoto.js');
    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 80;
    const source = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg'));
    const bytes = new Uint8Array(await source.arrayBuffer());
    // EXIF orientation 6: display this camera JPEG rotated 90 degrees clockwise.
    const exif = new Uint8Array([0xff, 0xe1, 0, 34, 69, 120, 105, 102, 0, 0, 73, 73, 42, 0, 8, 0, 0, 0, 1, 0, 18, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0]);
    const photo = new File([bytes.slice(0, 2), exif, bytes.slice(2)], 'camera.jpg', { type: 'image/jpeg' });
    const prepared = await preparePhoto(photo);
    const encoded = new Uint8Array(await prepared.blob.arrayBuffer());
    const hasExif = encoded.some((value, index) => value === 69 && encoded[index + 1] === 120 && encoded[index + 2] === 105 && encoded[index + 3] === 102);
    return { width: prepared.width, height: prepared.height, hasExif };
  });
  expect(result).toEqual({ width: 80, height: 120, hasExif: false });
});

test('invalid formats, very large files, and excessive decoded dimensions have useful errors', async ({ page }) => {
  const messages = await page.evaluate(async () => {
    const { preparePhoto } = await import('/visualizerPhoto.js');
    const hugePng = new Uint8Array(24);
    const header = new DataView(hugePng.buffer);
    header.setUint32(0, 0x89504e47);
    header.setUint32(4, 0x0d0a1a0a);
    header.setUint32(16, 20000);
    header.setUint32(20, 20000);
    const photos = [
      new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' }),
      new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' }),
      new File([hugePng], 'oversized.png', { type: 'image/png' }),
      new File(['invalid HEIC'], 'photo.heic', { type: 'image/heic' }),
    ];
    const errors = [];
    for (const photo of photos) {
      try { await preparePhoto(photo); } catch (error) { errors.push(error.message); }
    }
    return errors;
  });
  expect(messages).toHaveLength(4);
  expect(messages[0]).toContain('JPEG, PNG, WebP, or HEIC');
  expect(messages[1]).toContain('smaller than 20 MB');
  expect(messages[2]).toContain('under 64 megapixels');
  expect(messages[3]).toContain('HEIC');
  expect(messages[3]).toContain('JPEG copy');
});
