// Serves this folder (the mockup gallery) on 127.0.0.1. Usage: node serve.mjs [port]
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] ?? 4332);
const types = {'.html': 'text/html; charset=utf-8', '.png': 'image/png', '.css': 'text/css', '.json': 'application/json'};

createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.normalize(path.join(root, pathname === '/' ? 'index.html' : pathname));
    if (!file.startsWith(root) || !types[path.extname(file)]) { response.writeHead(404).end('Not found'); return; }
    try {
        response.writeHead(200, {'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store'}).end(await readFile(file));
    } catch {
        response.writeHead(404).end('Not found');
    }
}).listen(port, '127.0.0.1', () => console.log(`Gallery at http://127.0.0.1:${port}/`));
