import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

// Serve two actual generated service workers to reproduce a deployed update
// while an installed copy still controls an open consultation.
test('a waiting portfolio update can be applied without closing every window', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'WebKit service-worker emulation is unreliable.');
  const root = resolve('dist');
  let release = 1;
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      const file = resolve(root, path.slice('/spray-net-portfolio/'.length) || 'index.html');
      if (!path.startsWith('/spray-net-portfolio/') || !file.startsWith(root + sep)) {
        res.writeHead(404).end();
        return;
      }
      let body = await readFile(file);
      if (file.endsWith(`${sep}sw.js`)) {
        body = body.toString().replace(/url:"index.html",revision:"[^"]+"/, `url:"index.html",revision:"test-release-${release}"`);
      }
      if (file.endsWith(`${sep}index.html`)) {
        body = body.toString().replace('<html lang="en">', `<html lang="en" data-test-release="${release}">`);
      }
      const types = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.webmanifest': 'application/manifest+json' };
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/spray-net-portfolio/`);
    await expect(page.locator('.offline-status')).toContainText('Ready offline', { timeout: 20000 });
    await page.reload();
    await page.locator('.cabinet-card').click();
    await page.locator('.project-card').first().click();
    release = 2;
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
    await expect(page.getByRole('button', { name: 'Update now', exact: true })).toBeVisible({ timeout: 20000 });
    // Installing the update must not interrupt the project or reload the old shell.
    await expect(page.locator('html')).toHaveAttribute('data-test-release', '1');
    await expect(page).toHaveURL(/projects\/chantilly-lace-kitchen$/);
    // A reload with a worker already waiting must still offer the update.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Update now', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Update now', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-test-release', '2');
    await expect(page.locator('.update-banner')).toHaveCount(0);
    await expect(page).toHaveURL(/projects\/chantilly-lace-kitchen$/);
    await page.context().setOffline(true);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-test-release', '2');
    await expect(page.locator('.comparison img').first()).toBeVisible();
  } finally {
    await page.context().setOffline(false);
    server.closeAllConnections();
    await new Promise((done) => server.close(done));
  }
});
