// Contact sheets of catalogue captures, for choosing the H02 homepage pool. Usage: node pool-sheet.mjs <name> <id,id,...>
import {chromium} from 'playwright';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {rmSync, writeFileSync} from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const catalog = path.resolve(here, '../../../../src/images/demonstrations/catalog');
const [name, list] = process.argv.slice(2);
const ids = list.split(',');
const html = `<body style="margin:0;padding:10px;background:#f7f5e9;font:13px system-ui"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${ids.map(id =>
    `<figure style="margin:0;background:#fffdf5;border:1px solid #d6dccb;border-radius:8px;overflow:hidden"><img style="display:block;width:100%" src="${pathToFileURL(path.join(catalog, `${id}.png`)).href}"><figcaption style="padding:3px 8px;font-weight:600">${id}</figcaption></figure>`).join('')}</div></body>`;
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1500, height: 800}});
// A file page, because a blank-origin page may not load file images.
const sheet = path.join(here, 'img', `${name}.html`);
writeFileSync(sheet, html);
await page.goto(pathToFileURL(sheet).href, {waitUntil: 'load'});
rmSync(sheet);
await page.screenshot({path: path.join(here, 'img', `${name}.png`), fullPage: true});
await browser.close();
console.log('ok', name);
