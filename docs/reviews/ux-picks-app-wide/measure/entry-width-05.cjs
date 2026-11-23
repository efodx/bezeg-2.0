// Slot rects of every puck before and while the first puck's typed entry is open: none may move. node entry-width-05.cjs --url http://127.0.0.1:4472 [--route analysis/taylor]
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
(async () => {
    const browser = await chromium.launch();
    for (const route of (args.route || 'analysis/taylor,bezier/decasteljau,transformations').split(',')) {
        const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
        await page.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* */ } });
        await page.goto(`${(args.url || 'http://127.0.0.1:4472').replace(/\/$/, '')}/bezeg-2.0/${route}`);
        await page.locator('.puck-strip [role=slider]').first().waitFor();
        await page.waitForTimeout(1500);
        const rects = () => page.$$eval('.puck-slot', els => els.map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width].map(v => Math.round(v * 10) / 10).join(','); }));
        const before = await rects();
        await page.locator('.puck-strip [role=slider]').first().dblclick();
        await page.locator('.puck-input').first().waitFor();
        const during = await rects();
        const same = JSON.stringify(before) === JSON.stringify(during);
        console.log(route, same ? 'slots unchanged' : 'SLOTS MOVED', same ? before.length + ' slots' : JSON.stringify({before, during}));
    }
    await browser.close();
})();
