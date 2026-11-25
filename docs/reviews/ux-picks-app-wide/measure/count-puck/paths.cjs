// Lists the board's largest SVG paths after n clicks of the count puck +. node paths.cjs --url ... [--n 5]
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const base = (args.url || 'http://127.0.0.1:4472').replace(/\/$/, '');
(async () => {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
    await page.goto(`${base}/bezeg-2.0/analysis/taylor`);
    const strip = page.locator('.puck-strip .puck-count').first();
    await strip.waitFor();
    await page.waitForTimeout(2500);
    for (let i = 0; i < Number(args.n || 5); i++) { await strip.locator('.puck-step').last().click({force: true}); await page.waitForTimeout(1500); }
    const out = await page.evaluate(() => [...document.querySelectorAll('#jgbox path, .JXG_wrap path, [id*=jxg] path')].map(p => ({id: p.id, cls: p.getAttribute('class'), len: (p.getAttribute('d') || '').length, w: p.getAttribute('stroke-width'), stroke: p.getAttribute('stroke'), filter: p.getAttribute('filter'), dash: p.getAttribute('stroke-dasharray'), d: (p.getAttribute('d') || '').slice(0, 200), anc: (() => { const a = []; for (let e = p.parentElement; e && a.length < 2; e = e.parentElement) a.push(e.tagName + '.' + (e.getAttribute('class') || '') + '#' + e.id + '[' + (e.getAttribute('data-testid') || '') + ']'); return a; })()})).sort((a, b) => b.len - a.len).slice(0, 8));
    console.log(JSON.stringify(out, null, 1));
    await browser.close();
})();
