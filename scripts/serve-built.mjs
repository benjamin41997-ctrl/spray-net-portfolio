// Small static server used to test the production build under a GitHub Pages-style prefix.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const prefix = '/spray-net-portfolio/';
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4',
  '.vtt': 'text/vtt',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};
createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (path === '/') {
    res.writeHead(302, { Location: prefix });
    res.end();
    return;
  }
  if (!path.startsWith(prefix)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const file = resolve(root, path.slice(prefix.length) || 'index.html');
  if (!(
    file === resolve(root, 'index.html') || file.startsWith(root.endsWith(sep) ? root : root + sep)
  )) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const info = await stat(file);
    const data = await readFile(file);
    const headers = {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Accept-Ranges': 'bytes',
    };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start >= info.size || start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
        res.end();
        return;
      }
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Content-Length': end - start + 1,
      });
      res.end(data.subarray(start, end + 1));
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': info.size });
      res.end(data);
    }
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () =>
  console.log('Built portfolio: http://127.0.0.1:4173/spray-net-portfolio/'),
);
