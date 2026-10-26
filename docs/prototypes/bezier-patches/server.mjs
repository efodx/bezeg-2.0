import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
const root = resolve(process.cwd());
const mime = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.map':'application/json' };
createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const file = resolve(root, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
  if (!file.startsWith(root + sep) && file !== root) { res.writeHead(403).end('forbidden'); return; }
  try { if (statSync(file).isDirectory()) { res.writeHead(404).end('not found'); return; } }
  catch { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(Number(process.env.BEZEG_SPIKE_PORT || 4177), '127.0.0.1', () => {
  const port = Number(process.env.BEZEG_SPIKE_PORT || 4177);
  console.log(`Bezier spike at http://127.0.0.1:${port}/docs/prototypes/bezier-patches/`);
});
