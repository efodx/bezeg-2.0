const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const buildRoot = path.resolve(__dirname, '../build');
const host = '127.0.0.1';
const port = Number(process.env.SMOKE_PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error(`Invalid SMOKE_PORT: ${process.env.SMOKE_PORT}`);
const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.gif': 'image/gif',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

function send(response, status, body, headers = {}) {
    response.writeHead(status, {'X-Content-Type-Options': 'nosniff', ...headers});
    response.end(body);
}

function appFile(pathname) {
    let relativePath = pathname.slice('/bezeg-2.0'.length);
    if (!relativePath || relativePath === '/') relativePath = '/index.html';
    const routeFallbackAllowed = !path.extname(relativePath);
    if (relativePath.endsWith('/')) relativePath += 'index.html';

    const file = path.resolve(buildRoot, `.${relativePath}`);
    const relative = path.relative(buildRoot, file);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
    return {file, relativePath, routeFallbackAllowed};
}

http.createServer((request, response) => {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
    } catch {
        send(response, 400, 'Invalid URL');
        return;
    }

    if (pathname !== '/bezeg-2.0' && !pathname.startsWith('/bezeg-2.0/')) {
        send(response, 404, 'Not found');
        return;
    }

    const target = appFile(pathname);
    if (!target) {
        send(response, 403, 'Forbidden');
        return;
    }

    fs.readFile(target.file, (error, contents) => {
        if (!error) {
            const contentType = contentTypes[path.extname(target.file).toLowerCase()] || 'application/octet-stream';
            send(response, 200, contents, {'Cache-Control': 'no-store', 'Content-Type': contentType});
            return;
        }

        // Only extensionless routes use the SPA shell. Missing asset URLs stay 404s.
        if (error.code === 'ENOENT' && target.routeFallbackAllowed) {
            fs.readFile(path.join(buildRoot, 'index.html'), (indexError, html) => {
                if (indexError) {
                    send(response, 404, 'Build the app with npm run build first');
                    return;
                }
                send(response, 200, html, {'Cache-Control': 'no-store', 'Content-Type': contentTypes['.html']});
            });
            return;
        }

        send(response, error.code === 'ENOENT' ? 404 : 500, 'Not found');
    });
}).listen(port, host, () => {
    console.log(`Production smoke preview: http://${host}:${port}/bezeg-2.0`);
});
