// Generates the Bezeg app icon: a single elder floret in the paper-cut style of the side botanicals
// (src/sideBotanicals/elderGeometry.ts): five round cream petals over a soft shade, an ochre centre and five anthers,
// on the shell's dark green. The owner chose it over fuller umbel drawings because it stays clear down to 16 px.
//
// Usage: node scripts/generate-app-icons.cjs [--svg-only]
// Writes the SVG sources and, through Playwright's Chromium, the PNG and ICO files referenced by index.html and
// public/manifest.json. The output is deterministic: rerun after changing the drawing and commit the results.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const C = {tile: '#244c37', shade: '#d9d0ac', floret: '#fffdf4', eye: '#d6a646'};
const SIZE = 512;

const r = v => Math.round(v * 10) / 10;
const unit = v => Math.round(v * 1000) / 1000;
const circle = (cx, cy, radius) => `<circle cx="${unit(cx)}" cy="${unit(cy)}" r="${unit(radius)}"/>`;
const around = (distance, deg) => [Math.sin(deg * Math.PI / 180) * distance, -Math.cos(deg * Math.PI / 180) * distance];

/** The floret centred on the origin with overall radius 1. */
function floret() {
    let shade = '', petals = '', eye = circle(0, 0, .21);
    for (let q = 0; q < 5; q++) {
        const [x, y] = around(.56, q * 72), [ax, ay] = around(.36, 36 + q * 72);
        shade += circle(x, y + .1, .45);
        petals += circle(x, y, .435);
        eye += circle(ax, ay, .05);
    }
    return `<g fill="${C.shade}">${shade}</g><g fill="${C.floret}">${petals}</g><g fill="${C.eye}">${eye}</g>`;
}

/**
 * shape 'rounded': a rounded tile with transparent corners (browser tab, header, manifest purpose "any").
 * shape 'bleed': a full square whose artwork stays inside the maskable safe zone (Android adaptive icons, iOS home screen).
 */
function iconSvg(shape) {
    const radius = SIZE * (shape === 'bleed' ? .3 : .345);
    const tile = shape === 'bleed' ? `<rect width="${SIZE}" height="${SIZE}" fill="${C.tile}"/>` : `<rect width="${SIZE}" height="${SIZE}" rx="112" fill="${C.tile}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}">${tile}<g transform="translate(${SIZE / 2} ${r(SIZE / 2 - radius * .03)}) scale(${r(radius)})">${floret()}</g></svg>\n`;
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
        const images = [];
        for (const size of [16, 32, 48]) images.push({size, png: await render(rounded, size)});
        out('favicon.ico', ico(images));
    } finally {
        await browser.close();
    }
}

if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = {iconSvg};
