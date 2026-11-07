// Static server for a copy of build/ under the /bezeg-2.0/ base, with SPA fallback to index.html for client routes.
const http = require('http');
const fs = require('fs');
const path = require('path');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm'};
const BASE = '/bezeg-2.0/';
function serve(root, port = 0) {
    const server = http.createServer((request, response) => {
        const name = decodeURIComponent(new URL(request.url, 'http://x').pathname);
        if (!name.startsWith(BASE) && name !== '/bezeg-2.0') { response.writeHead(404).end('Not found'); return; }
        const file = path.resolve(root, '.' + name.slice(BASE.length - 1));
        if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
        const send = target => fs.readFile(target, (error, bytes) => {
            if (error) { response.writeHead(404).end('Not found'); return; }
            response.writeHead(200, {'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(bytes);
        });
        fs.stat(file, (error, stat) => send(!error && stat.isFile() ? file : path.join(root, 'index.html'))); // SPA fallback
    });
    return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
module.exports = {serve};
