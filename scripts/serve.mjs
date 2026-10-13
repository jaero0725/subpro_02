import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = process.argv[2] === 'dist' ? path.join(root, 'dist') : root;
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/') pathname = '/index.html';
    if (directory === root && /^\/public\/originals\/result-\d{2}\.png$/.test(pathname)) {
      pathname = `/docs/THEMAN QR-${/result-(\d{2})/.exec(pathname)[1]}.png`;
    }
    const file = path.resolve(directory, `.${pathname}`);
    const relative = path.relative(directory, file);
    const allowed = /^(index\.html|src\/[^/]+\.(js|css)|public\/(assets|originals)\/[^/]+\.(webp|png)|docs\/THEMAN QR-\d{2}\.png)$/.test(relative);
    if (!allowed || relative.startsWith('..') || !(await stat(file)).isFile()) { res.writeHead(404).end('Not found'); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, host, () => console.log(`THEMAN ALIVE choice: http://${host}:${port} (${path.basename(directory)})`));
