'use strict';
// Resolves a control label on a route the way the capture drivers do (an exact-label input, else the board puck; Orodja unfolded when the control hides there)
// and prints how it resolved, its start value and visibility.
//   node scripts/puck-label-check.cjs <route>=<label> [<route>=<label>]...      PREVIEW_BASE_URL defaults to http://127.0.0.1:4483/bezeg-2.0
const {chromium} = require('playwright');
const {puckControl, revealInTools} = require('./puck-control.cjs');
const base = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4483/bezeg-2.0').replace(/\/$/, '');

async function resolve(page, route, label, kind) {
    await page.goto(`${base}/${route}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000}).catch(() => {});
    await page.waitForTimeout(1500);
    let control = page.getByLabel(label, {exact: true}).and(page.locator('input'));
    let how = 'input';
    if (await control.count() === 0) { const puck = await puckControl(page, kind, label); if (puck) { control = puck; how = 'puck'; } }
    const count = await control.count();
    if (count !== 1) return `${route} "${label}": ${count} matches`;
    const visible = control.isPuck ? await control.isVisible() : await revealInTools(page, control);
    return `${route} "${label}": ${how}, visible=${visible}, value=${await control.inputValue()}`;
}

(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    for (const arg of process.argv.slice(2)) {
        const [route, rest] = [arg.slice(0, arg.indexOf('=')), arg.slice(arg.indexOf('=') + 1)];
        const [label, kind = 'range'] = rest.split('|');
        const page = await context.newPage();
        try { console.log(await resolve(page, route, label, kind)); } catch (e) { console.log(`${route} "${label}": error ${String(e.message).slice(0, 100)}`); }
        await page.close();
    }
    await browser.close();
})();
