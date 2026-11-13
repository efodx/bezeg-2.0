// Generates the Bezeg app icon: one elder flower head in the paper-cut style of the side botanicals
// (src/sideBotanicals/elderGeometry.ts): tapered sage rays, clusters of cream five-petalled florets with ochre
// centres, lance-shaped leaflets. Florets are drawn far larger than in the gutters so the head reads at 16-34 px.
//
// Usage: node scripts/generate-app-icons.cjs [--svg-only]
// Writes the SVG sources and, through Playwright's Chromium, the PNG and ICO files referenced by index.html and
// public/manifest.json. The output is deterministic: rerun after changing the drawing and commit the results.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const r = v => Math.round(v * 10) / 10;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const norm = a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const perp = a => [-a[1], a[0]];
const rot = (a, deg) => {
    const c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180);
    return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
};
const P = p => `${r(p[0])} ${r(p[1])}`;

/** Park-Miller generator, as in the side botanicals. */
function createRng(initialSeed) {
    let seed = initialSeed;
    return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}

function bez(p) {
    const at = t => { const u = 1 - t; return [0, 1].map(i => u * u * u * p[0][i] + 3 * u * u * t * p[1][i] + 3 * u * t * t * p[2][i] + t * t * t * p[3][i]); };
    const tan = t => { const u = 1 - t; return norm([0, 1].map(i => 3 * u * u * (p[1][i] - p[0][i]) + 6 * u * t * (p[2][i] - p[1][i]) + 3 * t * t * (p[3][i] - p[2][i]))); };
    return {at, tan};
}

/** A cubic drawn as a filled shape whose width tapers from w0 to w1. */
function taper(p, w0, w1, n = 16) {
    const b = bez(p), L = [], R = [];
    for (let i = 0; i <= n; i++) {
        const t = i / n, c = b.at(t), nn = perp(b.tan(t)), w = (w0 + (w1 - w0) * Math.pow(t, .8)) / 2;
        L.push(add(c, mul(nn, w)));
        R.push(add(c, mul(nn, -w)));
    }
    const end = b.at(1);
    return `M${L.map(P).join('L')}Q${P(add(end, mul(b.tan(1), w1)))} ${P(R[n])}L${R.reverse().map(P).join('L')}Z`;
}

function leaflet(base, dir, len, wid) {
    const d = norm(dir), n = perp(d), tip = add(base, mul(d, len));
    const a1 = add(add(base, mul(d, len * .18)), mul(n, wid * 1.1)), a2 = add(add(base, mul(d, len * .7)), mul(n, wid * .7));
    const b1 = add(add(base, mul(d, len * .7)), mul(n, -wid * .7)), b2 = add(add(base, mul(d, len * .18)), mul(n, -wid * 1.1));
    return `M${P(base)}C${P(a1)} ${P(a2)} ${P(tip)}C${P(b1)} ${P(b2)} ${P(base)}Z`;
}

const circ = (c, rad) => `M${r(c[0] - rad)} ${r(c[1])}a${r(rad)} ${r(rad)} 0 1 0 ${r(rad * 2)} 0a${r(rad)} ${r(rad)} 0 1 0 ${r(-rad * 2)} 0`;

const GREEN = {tile: '#244c37', rule: '', stem: '#a9b891', ray: '#b9c6a2', leafBack: '#7d9a6c', leafFront: '#a3ba8c', shade: '#d9d0ac', floret: '#fffdf4', eye: '#d6a646'};
const CREAM = {tile: '#f7f5e9', rule: '#c9d2bb', stem: '#8d9b76', ray: '#a3ae8a', leafBack: '#bccaa6', leafFront: '#93a97b', shade: '#d6cc9f', floret: '#fffdf4', eye: '#c9973a'};

function pinnate(base, dir, len, pairs, droop) {
    const d = norm(dir);
    const end = add(add(base, mul(d, len)), [0, droop * len]);
    const ctrl = add(base, mul(d, len * .55));
    const q = u => add(add(mul(base, (1 - u) * (1 - u)), mul(ctrl, 2 * u * (1 - u))), mul(end, u * u));
    const qt = u => norm(add(mul(sub(ctrl, base), 2 * (1 - u)), mul(sub(end, ctrl), 2 * u)));
    let d1 = taper([base, add(base, mul(sub(ctrl, base), .66)), add(end, mul(sub(ctrl, end), .66)), end], 7, 3, 10);
    const ll = len * .46;
    for (let i = 0; i < pairs; i++) {
        const u = .28 + i * (.62 / pairs), p = q(u), tg = qt(u), nn = perp(tg);
        for (const s of [1, -1]) d1 += leaflet(p, norm(add(mul(tg, .75), mul(nn, s))), ll * (.9 + i * .06), ll * .3);
    }
    return d1 + leaflet(end, qt(1), ll * 1.05, ll * .31);
}

// Cluster centres of the dome relative to the umbel node (where the rays meet), y down; rows are drawn back to front.
const CLUSTERS = [
    {c: [-104, -176], back: true}, {c: [0, -204], back: true}, {c: [104, -176], back: true},
    {c: [-168, -104]}, {c: [168, -104]}, {c: [-56, -128]}, {c: [56, -128]},
];

/** One flower head: rays from the node and a dome of floret clusters. `k` scales the whole head. */
function flowerHead(C, layers, node, k, tilt) {
    const rnd = createRng(7);
    const jit = j => (rnd() - .5) * 2 * j;
    const place = v => add(node, rot(mul(v, k), tilt));
    let rays = '';
    for (const {c} of CLUSTERS) rays += taper([node, place([0, -34]), place(mul(c, .5)), place(c)], 9 * k, 5 * k, 10);
    layers.push([C.ray, rays]);
    for (const {c, back} of CLUSTERS) {
        const f = (back ? 6.1 : 6.9) * k;
        let shade = '', petals = '', eyes = '';
        const spots = [[0, 0]];
        const start = rnd() * 72;
        for (let n = 0; n < 5; n++) spots.push(rot([0, -(31 + jit(3))], start + n * 72 + jit(8)));
        for (const spot of spots) {
            const p = place(add(c, [spot[0] * 1.08, spot[1] * .92])), turn = rnd() * 72;
            shade += circ(add(p, [0, 1.3 * f]), 3.9 * f);
            for (let q = 0; q < 5; q++) petals += circ(add(p, rot([0, -2.3 * f], turn + q * 72)), 1.78 * f);
            eyes += circ(p, .82 * f);
        }
        layers.push([C.shade, shade], [C.floret, petals], [C.eye, eyes]);
    }
}

// Each design returns its paint layers and the box (plant coordinates) that the icon centres and scales.
const DESIGNS = {
    /** Upright head on a short stem with two pairs of leaflets. */
    umbel(C) {
        const layers = [], node = [0, 0], stemCurve = [[-14, 150], [-12, 96], [2, 50], node], stem = bez(stemCurve);
        const leafAt = stem.at(.34), leafTan = stem.tan(.34);
        layers.push([C.leafBack, leaflet(leafAt, rot(leafTan, 62), 132, 27) + leaflet(stem.at(.12), rot(stem.tan(.12), -58), 96, 21)]);
        layers.push([C.leafFront, leaflet(leafAt, rot(leafTan, -60), 138, 28) + leaflet(stem.at(.12), rot(stem.tan(.12), 60), 100, 22)]);
        layers.push([C.stem, taper(stemCurve, 17, 11)]);
        flowerHead(C, layers, node, 1, 0);
        return {layers, box: {minX: -226, maxX: 226, minY: -262, maxY: 150}};
    },
    /** The head alone on a short stem: the boldest reading of the umbel at tab size. */
    head(C) {
        const layers = [], node = [0, 0];
        layers.push([C.stem, taper([[-8, 96], [-7, 62], [1, 30], node], 17, 12)]);
        flowerHead(C, layers, node, 1, 0);
        return {layers, box: {minX: -226, maxX: 226, minY: -262, maxY: 96}};
    },
    /** A branch arching in from the lower left with a pinnate leaf, as the branches enter the gutters. */
    sprig(C) {
        const layers = [], node = [40, -20], limb = [[-235, 215], [-150, 200], [-20, 120], node], b = bez(limb);
        layers.push([C.leafBack, pinnate(b.at(.3), [.1, -1], 150, 2, -.05)]);
        layers.push([C.leafFront, pinnate(b.at(.4), [1, .22], 185, 2, .1)]);
        layers.push([C.stem, taper(limb, 24, 11)]);
        flowerHead(C, layers, node, .8, 14);
        return {layers, box: {minX: -235, maxX: 235, minY: -235, maxY: 235}};
    },
    /** A single five-petalled floret: the simplest mark, clearest at 16 px. */
    floret(C) {
        const layers = [], p = [0, 0];
        let petals = '';
        for (let q = 0; q < 5; q++) petals += circ(add(p, rot([0, -92], q * 72)), 71);
        let shade = '';
        for (let q = 0; q < 5; q++) shade += circ(add(p, add(rot([0, -92], q * 72), [0, 16])), 73);
        layers.push([C.shade, shade], [C.floret, petals], [C.eye, circ(p, 34)]);
        for (let q = 0; q < 5; q++) layers.push([C.eye, circ(add(p, rot([0, -58], 36 + q * 72)), 8)]);
        return {layers, box: {minX: -190, maxX: 190, minY: -190, maxY: 190}};
    },
};

/** One large floret of overall radius R, as in design `floret`; later florets overlap earlier ones with their shade. */
function bigFloret(C, layers, p, R, turn, drop = [0, .1]) {
    let shade = '', petals = '', dots = '';
    for (let q = 0; q < 5; q++) {
        const at = add(p, rot([0, -.56 * R], turn + q * 72));
        shade += circ(add(at, mul(drop, R)), .45 * R);
        petals += circ(at, .435 * R);
        dots += circ(add(p, rot([0, -.36 * R], turn + 36 + q * 72)), .05 * R);
    }
    layers.push([C.shade, shade], [C.floret, petals], [C.eye, circ(p, .21 * R) + dots]);
}

Object.assign(DESIGNS, {
    /** Three large florets: a cluster rather than a lone blossom. */
    trio(C) {
        const layers = [];
        bigFloret(C, layers, [0, -78], 104, 0);
        bigFloret(C, layers, [-88, 52], 104, 20);
        bigFloret(C, layers, [88, 52], 104, -14);
        return {layers, box: {minX: -195, maxX: 195, minY: -190, maxY: 165}};
    },
    /** Three large florets on a forked stem: the smallest drawing that still shows an umbel. */
    trioStem(C) {
        const layers = [], node = [0, 138];
        const centres = [[0, -96], [-104, 6], [104, 6]];
        let rays = '';
        for (const c of centres) rays += taper([node, add(node, [0, -30]), add(node, mul(sub(c, node), .55)), c], 22, 15, 10);
        layers.push([C.stem, taper([[-8, 222], [-7, 190], [0, 162], node], 30, 24)], [C.ray, rays]);
        centres.forEach((c, i) => bigFloret(C, layers, c, 96, [0, 20, -14][i]));
        return {layers, box: {minX: -200, maxX: 200, minY: -196, maxY: 222}};
    },
    /** Five large florets on rays fanning from one stem: the umbel reduced to what survives at 16 px. */
    fan(C) {
        const layers = [], node = [0, 20];
        const centres = [[-168, -78], [168, -78], [-92, -156], [92, -156], [0, -186]];
        let rays = '';
        for (const c of centres) rays += taper([node, add(node, [0, -30]), add(node, mul(sub(c, node), .55)), c], 17, 11, 10);
        layers.push([C.stem, taper([[-8, 150], [-7, 104], [1, 60], node], 26, 19)], [C.ray, rays]);
        centres.forEach((c, i) => bigFloret(C, layers, c, 68, [10, -24, 30, -6, 16][i]));
        return {layers, box: {minX: -236, maxX: 236, minY: -256, maxY: 150}};
    },
    /** Seven large florets packed into a dome on a short stem with its rays showing below. */
    dome(C) {
        const layers = [], node = [0, 150];
        const centres = [[-118, -70], [0, -112], [118, -70], [-150, 22], [150, 22], [-52, 4], [56, 2]];
        let rays = '';
        for (const c of centres) rays += taper([node, add(node, [0, -24]), add(node, mul(sub(c, node), .55)), c], 15, 9, 10);
        layers.push([C.stem, taper([[-6, 215], [-5, 190], [0, 170], node], 24, 19)], [C.ray, rays]);
        centres.forEach((c, i) => bigFloret(C, layers, c, 74, [0, 22, -12, 30, 8, -20, 14][i]));
        return {layers, box: {minX: -224, maxX: 224, minY: -190, maxY: 215}};
    },
    /** The single floret with elder's long stamens and a pair of leaflets behind it. */
    floretLeaf(C) {
        const layers = [], p = [0, -20];
        layers.push([C.leafBack, leaflet([0, 40], [-1, .62], 215, 52)], [C.leafFront, leaflet([0, 40], [1, .62], 215, 52)]);
        bigFloret(C, layers, p, 150, 0);
        return {layers, box: {minX: -195, maxX: 195, minY: -180, maxY: 185}};
    },
});

const VARIANTS = {
    F: {design: 'trio', palette: GREEN, label: 'Three florets'},
    G: {design: 'fan', palette: GREEN, label: 'Five-floret umbel'},
    H: {design: 'dome', palette: GREEN, label: 'Seven-floret dome'},
    I: {design: 'floretLeaf', palette: GREEN, label: 'Floret with leaflets'},
    K: {design: 'trioStem', palette: GREEN, label: 'Three florets on a forked stem'},
    A: {design: 'umbel', palette: GREEN, label: 'Umbel with leaves'},
    B: {design: 'head', palette: GREEN, label: 'Flower head only'},
    C: {design: 'umbel', palette: CREAM, label: 'Paper cut on cream'},
    D: {design: 'sprig', palette: GREEN, label: 'Arching sprig'},
    E: {design: 'floret', palette: GREEN, label: 'Single floret'},
};

/**
 * shape 'rounded': a rounded tile with transparent corners (browser tab, header, manifest purpose "any").
 * shape 'bleed': a full square whose artwork stays inside the maskable safe zone (Android adaptive icons, iOS home screen).
 */
function iconSvg(shape, variant = 'A') {
    const {design, palette: C} = VARIANTS[variant];
    const {layers, box} = DESIGNS[design](C);
    const size = 512, fill = shape === 'bleed' ? .7 : .8;
    const w = box.maxX - box.minX, h = box.maxY - box.minY;
    const k = r(size * fill / Math.max(w, h) * 100) / 100;
    const tx = r(size / 2 - k * (box.minX + box.maxX) / 2), ty = r(size / 2 - k * (box.minY + box.maxY) / 2);
    const rule = C.rule && shape !== 'bleed' ? ` stroke="${C.rule}" stroke-width="8"` : '';
    const tile = shape === 'bleed' ? `<rect width="${size}" height="${size}" fill="${C.tile}"/>` : `<rect x="4" y="4" width="${size - 8}" height="${size - 8}" rx="110" fill="${C.tile}"${rule}/>`;
    const art = layers.map(([fill2, d]) => `<path fill="${fill2}" d="${d}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${tile}<g transform="translate(${tx} ${ty}) scale(${k})">${art}</g></svg>\n`;
}

/** An .ico container holding PNG images (supported by every current browser and by Windows since Vista). */
function ico(images) {
    const header = Buffer.alloc(6 + 16 * images.length);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(images.length, 4);
    let offset = header.length;
    images.forEach(({size, png}, i) => {
        const at = 6 + 16 * i;
        header.writeUInt8(size % 256, at);
        header.writeUInt8(size % 256, at + 1);
        header.writeUInt16LE(1, at + 4);
        header.writeUInt16LE(32, at + 6);
        header.writeUInt32LE(png.length, at + 8);
        header.writeUInt32LE(offset, at + 12);
        offset += png.length;
    });
    return Buffer.concat([header, ...images.map(image => image.png)]);
}

async function main() {
    const rounded = iconSvg('rounded'), bleed = iconSvg('bleed');
    fs.writeFileSync(path.join(root, 'src/images/elderflower.svg'), rounded);
    fs.writeFileSync(path.join(root, 'public/favicon.svg'), rounded);
    if (process.argv.includes('--svg-only')) return;

    const {chromium} = require('@playwright/test');
    const browser = await chromium.launch();
    const page = await browser.newPage({deviceScaleFactor: 1});
    const render = async (svg, size) => {
        await page.setViewportSize({width: size, height: size});
        await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
        return page.screenshot({omitBackground: true, clip: {x: 0, y: 0, width: size, height: size}});
    };
    try {
        const out = (name, data) => fs.writeFileSync(path.join(root, 'public', name), data);
        out('icon-192.png', await render(rounded, 192));
        out('icon-512.png', await render(rounded, 512));
        out('icon-maskable-192.png', await render(bleed, 192));
        out('icon-maskable-512.png', await render(bleed, 512));
        out('apple-touch-icon.png', await render(bleed, 180));
        const sizes = [16, 32, 48];
        const images = [];
        for (const size of sizes) images.push({size, png: await render(rounded, size)});
        out('favicon.ico', ico(images));
    } finally {
        await browser.close();
    }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = {iconSvg, VARIANTS};
