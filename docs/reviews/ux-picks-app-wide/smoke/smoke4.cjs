const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 200000).unref();
const B = 'http://127.0.0.1:4481/bezeg-2.0/';
const errors = [];
const out = (k, v) => console.log(`${k}: ${v}`);
const readouts = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.getAttribute('data-readout'), (e.querySelector('dd') || e).textContent.trim()])));
async function open(ctx, route) {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${route}] console: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`[${route}] pageerror: ${e.message}`));
    await page.goto(B + route); await page.waitForTimeout(3500);
    return page;
}
async function check(name, fn) { try { await fn(); out(name, 'DONE'); } catch (e) { out(name, 'EXCEPTION ' + String(e.message).split('\n')[0]); } }
(async () => {
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
        let page = await open(ctx, 'analysis/taylor');
        await check('1b lesson steps', async () => {
            await page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click(); await page.waitForTimeout(1500);
            const panel = page.locator('section.guided-lesson');
            const snap = async l => { const r = await readouts(page); out('  ' + l, (await panel.innerText()).match(/Korak \d+ od \d+ · Okvir \d+ od \d+/)?.[0] + ' c/n/x=' + r.center + '/' + r.degree + '/' + r.x + ' poly=' + r.polynomial + ' bound=' + r.bound); };
            for (let i = 1; i <= 9; i++) { await panel.locator('.guided-lesson-nav-next').click(); await page.waitForTimeout(1800); await snap('N' + i); }
            for (let i = 1; i <= 2; i++) { await panel.locator('.guided-lesson-nav-back').click(); await page.waitForTimeout(1800); await snap('B' + i); }
        });
        await page.close();

        page = await open(ctx, 'analysis/taylor');
        await check('6 preset', async () => {
            const center = async () => (await readouts(page)).center;
            const edit = async n => { await page.getByRole('button', {name: 'Uredi', exact: true}).click(); await page.waitForTimeout(300); const r = page.locator('input[type=range]').first(); await r.focus(); for (let i = 0; i < n; i++) await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300); };
            await edit(4); out('  saved center', await center());
            await page.getByRole('button', {name: 'Shrani', exact: true}).click(); await page.waitForTimeout(400);
            await page.getByRole('button', {name: /Shrani trenutno stanje/}).click(); await page.waitForTimeout(600);
            const name = 'smoke-' + Date.now();
            const inp = page.locator('input[type=text]:not([role=spinbutton])').last();
            await inp.fill(name); await inp.press('Enter'); await page.waitForTimeout(800);
            await edit(8); out('  changed center', await center());
            await page.getByRole('button', {name: 'Shrani', exact: true}).click(); await page.waitForTimeout(400);
            await page.getByRole('button', {name: 'Privzeto stanje'}).click(); await page.waitForTimeout(600);
            out('  after Privzeto', await center());
            await page.getByText(name).first().click(); await page.waitForTimeout(800);
            out('  after selecting preset', await center());
            const more = page.locator('button[aria-label*="zbriši"], button:has-text("…")');
            out('  preset menu buttons', await more.count());
        });
        await page.close();

        page = await open(ctx, 'linear-map');
        await check('5 linear map', async () => {
            await page.locator('select').nth(2).selectOption('iterate'); await page.waitForTimeout(1200);
            out('  controls', await page.evaluate(() => [...document.querySelectorAll('input,select,button')].filter(e => e.offsetParent).map(e => e.tagName[0] + ':' + (e.getAttribute('aria-label') || e.closest('label,div')?.textContent || e.textContent || '').trim().slice(0, 28) + (e.value !== undefined && e.tagName === 'INPUT' ? '=' + e.value : '')).slice(14).join(' ; ')));
            out('  readouts', JSON.stringify(await readouts(page)).slice(0, 300));
        });
        await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/lm-iterate.png', clip: {x: 1070, y: 260, width: 330, height: 640}});
        await page.close();
    } finally { out('ERRORS', JSON.stringify(errors)); await browser.close(); }
})();
