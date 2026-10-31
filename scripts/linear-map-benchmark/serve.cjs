// Static server for the benchmark bundle; default port 4316 (override with LINEAR_MAP_BENCH_PORT).
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../.benchmark-output/linear-map');
const types = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css'};
const defaultPort = () => Number(process.env.LINEAR_MAP_BENCH_PORT || 4316);
function serve(port = defaultPort()) {
    const server = http.createServer((request, response) => {
        let name = new URL(request.url, 'http://x').pathname;
        if (name.endsWith('/')) name += 'index.html';
        const file = path.resolve(root, '.' + name);
        if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
        fs.readFile(file, (error, bytes) => {
            if (error) { response.writeHead(404).end('Not found'); return; }
            response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store'}).end(bytes);
        });
    });
    return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}
module.exports = {serve};
if (require.main === module) serve().then(() => console.log(`http://127.0.0.1:${defaultPort()}/`));
