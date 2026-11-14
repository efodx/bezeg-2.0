// Baseline captures of the pages the design package changes. Usage: node baseline.mjs [origin]
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const origin = process.argv[2] ?? 'http://127.0.0.1:4332';
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'img');
const base = `${origin}/bezeg-2.0`;
const browser = await chromium.launch();

async function shot(name, url, {width = 1440, height = 900, before, clip, selector, fullPage = false} = {}) {
    const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce'});
    try {
        await page.goto(url, {waitUntil: 'networkidle'});
        await page.waitForTimeout(1200);
        if (before) await before(page);
        const target = selector ? page.locator(selector).first() : page;
        await target.screenshot({path: path.join(out, `${name}.png`), clip, fullPage});
        console.log('ok', name);
    } catch (error) {
        console.log('FAIL', name, String(error).split('\n')[0]);
    } finally {
        await page.close();
    }
}

await shot('base-home', `${base}`);
await shot('base-chapter-bezier', `${base}/learn/bezier-curves`, {before: p => p.locator('.chapter-section-heading').first().scrollIntoViewIfNeeded()});
await shot('base-chapter-family', `${base}/learn/convexity-hulls`, {before: p => p.locator('.chapter-section-heading').first().scrollIntoViewIfNeeded()});
await shot('base-lesson', `${base}/analysis/darboux?learn=1`);
await shot('base-presets', `${base}/analysis/darboux`, {before: async p => {
    console.log('buttons:', (await p.locator('button').allInnerTexts()).join(' | ').slice(0, 600));
}});
await browser.close();
