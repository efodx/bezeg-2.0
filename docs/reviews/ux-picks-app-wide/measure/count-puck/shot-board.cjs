// node shot-board.cjs --url http://127.0.0.1:4472 --out before  : board screenshots at degrees 2, 6, 10 (dash off via CSS so only the path is compared)
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
(async () => {
    const browser = await chromium.launch();
    const page = await (await browser.newContext({viewport: {width: 1440, height: 900}})).newPage();
    await page.goto(`${args.url}/bezeg-2.0/analysis/taylor`);
    const strip = page.locator('.puck-strip .puck-count').first();
    await strip.waitFor();
    await page.waitForTimeout(2500);
    await page.addStyleTag({content: '.workspace-board-stage svg path{stroke-dasharray:none !important}'});
    const box = page.locator('.workspace-board-stage').first();
    let n = 0;
    for (const target of [2, 6, 10]) {
        while (n < target) { await strip.locator('.puck-step').last().click({force: true}); n++; await page.waitForTimeout(300); }
        await page.waitForTimeout(1200);
        await box.screenshot({path: `${args.out}-${target}.png`});
    }
    await browser.close();
})();
