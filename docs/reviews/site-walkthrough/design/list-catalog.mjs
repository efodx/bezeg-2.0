// Lists catalogue entries from a running preview and writes pool.json (title, family, image) for the H02 pool.
// Usage: node list-catalog.mjs [origin]
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const POOL = ['analysis/epicycles', 'analysis/fixed-point', 'analysis/accumulation', 'functions/integral', 'functions/inverse',
    'complex-multiplication', 'bezier/subdivision-2', 'analysis/darboux', 'bezier/decasteljau'];

const origin = process.argv[2] ?? 'http://127.0.0.1:4332';
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
await page.goto(`${origin}/bezeg-2.0/demonstrations`, {waitUntil: 'networkidle'});
// Open every family so each card is in the document.
await page.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
await page.waitForTimeout(500);
const entries = await page.evaluate((pool) => pool.map(route => {
    const link = document.querySelector(`a[href="/bezeg-2.0/${route}"]`);
    let card = link;
    while (card && !card.querySelector('img')) card = card.parentElement;
    const section = link?.closest('section, details');
    return {
        route,
        found: Boolean(link),
        title: card?.querySelector('h3, h4')?.textContent?.trim() ?? null,
        family: section?.querySelector('h2, summary')?.textContent?.trim().slice(0, 60) ?? null,
        img: card?.querySelector('img')?.getAttribute('src') ?? null,
        cardClass: card?.className ?? null,
    };
}), POOL);
console.log(JSON.stringify(entries, null, 1));
writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'pool.json'), JSON.stringify(entries, null, 1));
await browser.close();
