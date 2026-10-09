const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const benchmarkRoot = path.resolve(__dirname, '../../.benchmark-output');
const appRoot = path.resolve(__dirname, '../../build');
const host = process.env.BENCHMARK_HOST || '127.0.0.1';
const port = Number(process.env.BENCHMARK_PORT || 3001);
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'};
http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    const appRequest = pathname === '/bezeg-2.0' || pathname.startsWith('/bezeg-2.0/');
    const root = appRequest ? appRoot : benchmarkRoot;
    if (appRequest) pathname = pathname.slice('/bezeg-2.0'.length) || '/';
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
        if (error) {
            if (appRequest && !path.extname(pathname)) {
                fs.readFile(path.join(appRoot, 'index.html'), (appError, html) => {
                    if (appError) { response.writeHead(404).end('Build the app with npm run build first'); return; }
                    response.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-store'}).end(html);
                });
            } else response.writeHead(404).end('Not found');
            return;
        }
        response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'});
        response.end(bytes);
    });
}).listen(port, host, () => {
    console.log(`Production benchmark: http://${host}:${port}/current/ (or /before/ and /after/)`);
    if (host === '0.0.0.0') {
        Object.values(os.networkInterfaces()).flat().filter(address => address && address.family === 'IPv4' && !address.internal)
            .forEach(address => console.log(`LAN benchmark: http://${address.address}:${port}/before/ and /after/`));
    }
});
