// Renders epicycles-subjects.html and saves one image per subject candidate (intake G07).
// Usage: node epicycles-subjects.mjs
import {chromium} from 'playwright';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1340, height: 900}});
page.on('pageerror', error => console.log('page error', error.message));
await page.goto(pathToFileURL(path.join(here, 'epicycles-subjects.html')).href);
await page.waitForSelector('body[data-ready]', {timeout: 60000});
for (const id of ['slovenia', 'clef', 'cat', 'flower']) {
    await page.locator(`#${id}`).screenshot({path: path.join(here, 'img', `g07-${id}.png`)});
    console.log('ok', id);
}
await browser.close();
