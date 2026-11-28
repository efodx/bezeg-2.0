'use strict';
// Lists, per route, the board pucks (accessible names by role) and the labelled inputs the Orodja card holds, so a recipe or clip row's control label can be checked against what the page offers.
//   node scripts/puck-route-probe.cjs <path>...        PREVIEW_BASE_URL defaults to http://127.0.0.1:4483/bezeg-2.0
const {chromium} = require('playwright');
const base = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4483/bezeg-2.0').replace(/\/$/, '');

async function probe(page, route) {
    await page.goto(`${base}/${route.replace(/^\/(bezeg-2\.0\/)?/, '')}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000}).catch(() => {});
    await page.waitForTimeout(1500);
    const read = () => page.evaluate(() => {
        const pucks = [...document.querySelectorAll('.puck-strip [role=slider],.puck-strip [role=spinbutton],.puck-strip [role=switch],.puck-strip [role=radiogroup]')]
            .map(e => `${e.getAttribute('role')}:${e.getAttribute('aria-label') || ''}[${e.getAttribute('aria-valuenow')},${e.getAttribute('aria-valuemin')}..${e.getAttribute('aria-valuemax')}]`);
        const inputs = [...document.querySelectorAll('input,select')].filter(e => !e.closest('.puck-strip') && e.offsetParent !== null)
            .map(e => `${e.type}:${e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.id}`);
        return {pucks, inputs};
    });
    const closed = await read();
    const fold = page.locator('[data-card-id="tools"] .board-card-fold[aria-expanded="false"]');
    let opened = closed;
    if (await fold.count() === 1) { await fold.click(); await page.waitForTimeout(300); opened = await read(); }
    // One ArrowRight on each range or count puck shows its keyboard step.
    const steps = [];
    for (const role of ['slider', 'spinbutton']) {
        const all = page.locator(`.puck-strip [role=${role}]`);
        for (let i = 0; i < await all.count(); i++) {
            const el = all.nth(i), before = Number(await el.getAttribute('aria-valuenow'));
            await el.focus(); await el.press('ArrowRight');
            steps.push(`${await el.getAttribute('aria-label')}: +${(Number(await el.getAttribute('aria-valuenow')) - before).toFixed(4)}`);
        }
    }
    return {route, pucks: closed.pucks, steps, toolsInputs: opened.inputs};
}

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    for (const route of process.argv.slice(2)) {
        const page = await context.newPage();
        try { console.log(JSON.stringify(await probe(page, route))); } catch (e) { console.log(JSON.stringify({route, error: String(e.message).slice(0, 120)})); }
        await page.close();
    }
    await browser.close();
})();
