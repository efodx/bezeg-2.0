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
        await check('1b lesson frames', async () => {
            await page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click(); await page.waitForTimeout(1500);
            const panel = page.locator('section.guided-lesson');
            const snap = async l => { const r = await readouts(page); out('  ' + l, (await panel.innerText()).match(/Korak \d+ od \d+ · Okvir \d+ od \d+/)?.[0] + ' c/n/x=' + r.center + '/' + r.degree + '/' + r.x + ' poly=' + r.polynomial + ' bound=' + r.bound + ' nextDisabled=' + await panel.locator('.guided-lesson-nav-next').isDisabled()); };
            await snap('start');
            for (const [l, s] of [['N1', 'next'], ['N2', 'next'], ['N3', 'next'], ['B1', 'back'], ['B2', 'back']]) {
                await panel.locator('.guided-lesson-nav-' + s).click(); await page.waitForTimeout(2000); await snap(l);
            }
            out('  step text', (await panel.innerText()).slice(0, 0));
        });
        await page.close();

        page = await open(ctx, 'analysis/taylor');
        await check('6 preset', async () => {
            const rng = () => page.locator('input[type=range]').first();
            const center = async () => (await readouts(page)).center;
            await rng().focus(); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
            out('  saved center', await center());
            await page.getByRole('button', {name: 'Shrani'}).click(); await page.waitForTimeout(400);
            await page.getByRole('button', {name: /Shrani trenutno stanje/}).click(); await page.waitForTimeout(600);
            const name = 'smoke-' + Date.now();
            const inp = page.locator('input[type=text]:not([role=spinbutton])').last();
            await inp.fill(name); await inp.press('Enter'); await page.waitForTimeout(800);
            await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/preset-after-save.png'});
            out('  center after save', await center());
            const sp = page.locator('input[role=spinbutton]').nth(1);
            out('  spin1 val', await sp.inputValue());
            const b = await rng().boundingBox();
            await page.mouse.click(b.x + b.width * 0.9, b.y + b.height / 2); await page.waitForTimeout(400);
            out('  changed center (click track)', await center());
            await page.getByText(name).first().click(); await page.waitForTimeout(800);
            out('  center after selecting preset', await center());
        });
        await page.close();

        page = await open(ctx, 'functions/transformations');
        await check('2 reset', async () => {
            const sp = page.locator('input[role=spinbutton]');
            const vals = async () => JSON.stringify(await sp.evaluateAll(a => a.map(x => x.value)));
            out('  default', await vals());
            await sp.nth(0).fill('5'); await sp.nth(0).press('Enter'); await sp.nth(1).fill('4'); await sp.nth(1).press('Enter'); await page.waitForTimeout(300);
            out('  edited', await vals());
            await page.getByRole('button', {name: 'Shrani'}).click(); await page.waitForTimeout(300);
            await page.getByRole('button', {name: 'Ponastavi prednastavitev'}).click(); await page.waitForTimeout(600);
            out('  after Ponastavi prednastavitev', await vals());
        });
        await page.close();

        page = await open(ctx, 'linear-map');
        await check('5 linear map', async () => {
            const sels = page.locator('select');
            const n = await sels.count();
            for (let i = 0; i < n; i++) out('  select ' + i, await sels.nth(i).evaluate(s => s.id + ' ' + [...s.options].map(o => o.value).join(',').slice(0, 140)));
        });
        await page.close();
    } finally { out('ERRORS', JSON.stringify(errors)); await browser.close(); }
})();
