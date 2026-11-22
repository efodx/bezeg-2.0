'use strict';

// Screenshot recipe: `just shot --base <url> [options] <route>...`. Cropped or viewport-only PNGs,
// optional contact sheets, so visual checks need neither a new Playwright script nor full-page images.

const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');

const USAGE = 'usage: just shot --base <url> [--width <px>] [--height <px>] [--selector <css>] [--out <dir>] [--wait <ms>] [--sheet] <route>...';
const MAX_TILES = 8;
const MAX_SHEET_SIDE = 1568;

function parseArgs(argv) {
    const opts = {base: '', width: 1366, height: 768, selector: '', out: '.command-logs/shots', wait: 500, sheet: false, routes: []};
    const numeric = {'--width': 'width', '--height': 'height', '--wait': 'wait'};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--sheet') opts.sheet = true;
        else if (arg === '--base' || arg === '--selector' || arg === '--out') {
            const value = argv[++i];
            if (value === undefined) return {error: `${arg} needs a value`};
            opts[arg.slice(2)] = value;
        } else if (numeric[arg]) {
            const value = argv[++i];
            if (value === undefined || !/^\d+$/.test(value) || (arg !== '--wait' && Number(value) < 1)) return {error: `${arg} needs a whole number`};
            opts[numeric[arg]] = Number(value);
        } else if (arg.startsWith('--')) return {error: `unknown option ${arg}`};
        else opts.routes.push(arg);
    }
    if (!opts.base) return {error: 'missing --base'};
    if (opts.routes.length === 0) return {error: 'no route given'};
    return {opts};
}

function joinUrl(base, route) {
    return `${base.replace(/\/+$/, '')}/${route.replace(/^\/+/, '')}`;
}

// Safe, collision-free: readable slug plus a short hash of the exact route.
function fileName(route, width) {
    let hash = 5381;
    for (const ch of route) hash = ((hash * 33) ^ ch.charCodeAt(0)) >>> 0;
    const slug = route.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'root';
    return `${slug}-${hash.toString(36)}-w${width}.png`;
}

function groupSheets(items, size = MAX_TILES) {
    const groups = [];
    for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
    return groups;
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CAPTION = 16;

// Items are {width, height} PNG sizes. One scale for all tiles (never above 1), the largest that keeps the
// sheet's longer side within MAX_SHEET_SIDE; the column count that allows the largest scale wins.
function sheetLayout(items) {
    const count = items.length;
    const maxW = Math.max(...items.map((i) => i.width));
    const maxH = Math.max(...items.map((i) => i.height));
    let best = null;
    for (let cols = 1; cols <= count; cols++) {
        const rows = Math.ceil(count / cols);
        const scale = Math.min(1, MAX_SHEET_SIDE / (cols * maxW), (MAX_SHEET_SIDE / rows - CAPTION) / maxH);
        const cellW = Math.ceil(maxW * scale);
        const cellH = Math.ceil(maxH * scale) + CAPTION;
        const candidate = {cols, rows, scale, cellW, cellH, width: cols * cellW, height: rows * cellH};
        // Equal scale: prefer more columns (fewer rows), so a row of small shots stays one row.
        if (!best || scale >= best.scale - 1e-9) best = candidate;
    }
    return best;
}

function sheetHtml(items) {
    const {cols, scale, cellW, cellH, width, height} = sheetLayout(items);
    const tiles = items.map((item) => `<figure><img src="${escapeHtml(item.src)}" alt="" width="${Math.floor(item.width * scale)}" height="${Math.floor(item.height * scale)}"><figcaption>${escapeHtml(item.route || '(root)')}</figcaption></figure>`).join('');
    return `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#fff;font:11px/${CAPTION}px sans-serif}
body{display:grid;grid-template-columns:repeat(${cols},${cellW}px);grid-auto-rows:${cellH}px;width:${width}px;height:${height}px}
figure{margin:0;box-sizing:border-box;width:${cellW}px;height:${cellH}px;background:#e4e4e4;overflow:hidden}
img{display:block;background:#fff}
figcaption{height:${CAPTION}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 2px}
</style>${tiles}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function probe(url) {
    return new Promise((resolve) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, (res) => { res.resume(); resolve(true); });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => { req.destroy(); resolve(false); });
    });
}

async function waitForBase(base, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (await probe(base)) return true;
        if (Date.now() >= deadline) return false;
        await sleep(500);
    }
}

function pngSize(file) {
    const buf = fs.readFileSync(file);
    return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
}

async function cli(argv) {
    const parsed = parseArgs(argv);
    if (parsed.error) {
        console.error(`${parsed.error}\n${USAGE}`);
        process.exitCode = 1;
        return;
    }
    const {opts} = parsed;
    if (!(await waitForBase(opts.base))) {
        console.error(`FAIL: ${opts.base} did not answer within 30 s; start it with 'just preview <port>' and check --base.`);
        process.exitCode = 1;
        return;
    }
    const {chromium} = require('@playwright/test');
    fs.mkdirSync(opts.out, {recursive: true});
    const browser = await chromium.launch({headless: true, ...(process.env.PREVIEW_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.PREVIEW_BROWSER_EXECUTABLE_PATH} : {})});
    const written = [];
    let failed = false;
    try {
        const context = await browser.newContext({viewport: {width: opts.width, height: opts.height}});
        for (const route of opts.routes) {
            const page = await context.newPage();
            try {
                await page.goto(joinUrl(opts.base, route), {waitUntil: 'load'});
                let target = null;
                if (opts.selector) {
                    target = page.locator(opts.selector).first();
                    await target.waitFor({state: 'visible', timeout: 15000});
                }
                await sleep(opts.wait);
                const file = path.join(opts.out, fileName(route, opts.width));
                if (target) await target.screenshot({path: file});
                else await page.screenshot({path: file});
                const size = pngSize(file);
                written.push({route, file});
                console.log(`ok ${route} -> ${file} ${size.width}x${size.height}`);
            } catch (error) {
                failed = true;
                console.log(`FAIL ${route}: ${String(error.message).split('\n')[0]}`);
            } finally {
                await page.close();
            }
        }
        if (opts.sheet && written.length > 0) {
            const page = await context.newPage();
            let n = 0;
            for (const group of groupSheets(written)) {
                n += 1;
                const items = group.map((entry) => ({route: entry.route, ...pngSize(entry.file), src: 'file:///' + path.resolve(entry.file).replace(/\\/g, '/')}));
                const html = path.resolve(opts.out, `sheet-${n}.html`);
                fs.writeFileSync(html, sheetHtml(items));
                const layout = sheetLayout(items);
                await page.setViewportSize({width: layout.width, height: layout.height});
                await page.goto('file:///' + html.replace(/\\/g, '/'));
                await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
                const file = path.join(opts.out, `sheet-${n}.png`);
                await page.screenshot({path: file});
                fs.unlinkSync(html);
                const size = pngSize(file);
                console.log(`sheet ${file} ${size.width}x${size.height} (${items.length} tiles)`);
            }
        }
    } finally {
        await browser.close();
    }
    if (failed) process.exitCode = 1;
}

if (require.main === module) cli(process.argv.slice(2));

module.exports = {MAX_SHEET_SIDE, MAX_TILES, USAGE, cli, fileName, groupSheets, joinUrl, parseArgs, sheetHtml, sheetLayout};
