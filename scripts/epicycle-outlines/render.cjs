'use strict';
/*
 * Draws each outline and its Fourier partial sums at N = 5, 20 and 50, computed with the model's own analyzeEpicycle and
 * epicycleTrace, side by side in docs/reviews/site-walkthrough/graphs/g07/<id>.svg. With --png <dir> it also writes a PNG of the
 * same four drawings (for looking at them with an image viewer). Usage: node scripts/epicycle-outlines/render.cjs [--png dir]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
require.extensions['.ts'] = (module, filename) => {
    const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}});
    module._compile(out.outputText, filename);
};
const model = require(path.join(root, 'src/analysis/epicycleModel.ts'));

const NS = [5, 20, 50];
const PANEL = 360;
const SCALE = 60; // pixels per unit; the range [-3, 3] fills a panel

const toPixel = (re, im, panel) => [panel * PANEL + PANEL / 2 + re * SCALE, PANEL / 2 - im * SCALE];

function drawings(id) {
    const m = model.epicycleExample(id);
    const analysis = model.analyzeEpicycle(m);
    const panels = [{title: 'outline', points: m.vertices.map((v) => ({re: v.x, im: v.y}))}];
    for (const N of NS) {
        panels.push({title: `N = ${N}`, points: model.epicycleTrace(analysis, N), error: model.maxTraceError(analysis, N)});
    }
    return {m, panels};
}

function svg(id) {
    const {panels} = drawings(id);
    const parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL * 4}" height="${PANEL}" viewBox="0 0 ${PANEL * 4} ${PANEL}">`, `<rect width="${PANEL * 4}" height="${PANEL}" fill="#fff"/>`];
    panels.forEach((p, i) => {
        const d = p.points.map((q, j) => `${j ? 'L' : 'M'}${toPixel(q.re, q.im, i).map((v) => v.toFixed(1)).join(' ')}`).join('') + 'Z';
        parts.push(`<rect x="${i * PANEL + 0.5}" y="0.5" width="${PANEL - 1}" height="${PANEL - 1}" fill="none" stroke="#ccc"/>`);
        parts.push(`<path d="${d}" fill="${i === 0 ? '#e3ecd9' : 'none'}" stroke="${i === 0 ? '#4d6b3a' : '#1f5fa8'}" stroke-width="2" stroke-linejoin="round"/>`);
        const label = p.error === undefined ? `${id}: outline` : `${p.title}, max error ${p.error.toFixed(3)}`;
        parts.push(`<text x="${i * PANEL + 10}" y="20" font-family="sans-serif" font-size="13" fill="#333">${label}</text>`);
    });
    parts.push('</svg>');
    return parts.join('\n') + '\n';
}

function png(id) {
    const {panels} = drawings(id);
    const width = PANEL * 4;
    const height = PANEL;
    const pixels = Buffer.alloc(width * height, 255);
    const set = (x, y, v) => {
        x = Math.round(x);
        y = Math.round(y);
        if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = v;
    };
    const line = (x0, y0, x1, y1, v) => {
        const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2));
        for (let s = 0; s <= steps; s++) {
            const x = x0 + ((x1 - x0) * s) / steps;
            const y = y0 + ((y1 - y0) * s) / steps;
            for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(x + dx, y + dy, v);
        }
    };
    panels.forEach((p, i) => {
        for (let y = 0; y < height; y++) set(i * PANEL, y, 200);
        p.points.forEach((q, j) => {
            const r = p.points[(j + 1) % p.points.length];
            const [x0, y0] = toPixel(q.re, q.im, i);
            const [x1, y1] = toPixel(r.re, r.im, i);
            line(x0, y0, x1, y1, i === 0 ? 90 : 0);
        });
    });
    const raw = Buffer.alloc((width + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (width + 1)] = 0;
        pixels.copy(raw, y * (width + 1) + 1, y * width, (y + 1) * width);
    }
    const crcTable = Array.from({length: 256}, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
    });
    const crc = (buf) => {
        let c = 0xffffffff;
        for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
        return (c ^ 0xffffffff) >>> 0;
    };
    const chunk = (type, data) => {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const body = Buffer.concat([Buffer.from(type), data]);
        const sum = Buffer.alloc(4);
        sum.writeUInt32BE(crc(body));
        return Buffer.concat([len, body, sum]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(width, 0);
    header.writeUInt32BE(height, 4);
    header[8] = 8; // bit depth
    header[9] = 0; // greyscale
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const pngDir = process.argv[2] === '--png' ? path.resolve(process.argv[3]) : null;
const out = path.join(root, 'docs/reviews/site-walkthrough/graphs/g07');
fs.mkdirSync(out, {recursive: true});
for (const id of model.EPICYCLE_OUTLINE_IDS) {
    fs.writeFileSync(path.join(out, `${id}.svg`), svg(id));
    if (pngDir) {
        fs.mkdirSync(pngDir, {recursive: true});
        fs.writeFileSync(path.join(pngDir, `${id}.png`), png(id));
    }
    const {panels} = drawings(id);
    console.log(id, panels.slice(1).map((p) => `${p.title}: ${p.error.toFixed(4)}`).join('; '));
}
