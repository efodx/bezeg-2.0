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
        await check('1b lesson', async () => {
            await page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click(); await page.waitForTimeout(1500);
            const panel = page.locator('section.guided-lesson');
            const snap = async l => out('  ' + l, (await panel.innerText()).match(/Korak \d+ od \d+/)?.[0] + ' ' + (await readouts(page)).center + '/' + (await readouts(page)).degree + '/' + (await readouts(page)).x + ' poly=' + (await readouts(page)).polynomial + ' bound=' + (await readouts(page)).bound);
            await snap('start');
            for (const [l, s] of [['N1', 'next'], ['N2', 'next'], ['N3', 'next'], ['B1', 'back'], ['B2', 'back']]) {
                await panel.locator('.guided-lesson-nav-' + s).click(); await page.waitForTimeout(1800); await snap(l);
            }
        });
        await page.close();

        page = await open(ctx, 'analysis/taylor');
        await check('6 preset', async () => {
            const rng = page.locator('input[type=range]').first();
            await rng.focus(); for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
            const saved = (await readouts(page)).center; out('  center to save', saved);
            await page.getByRole('button', {name: 'Shrani'}).click(); await page.waitForTimeout(400);
            await page.getByRole('button', {name: /Shrani trenutno stanje/}).click(); await page.waitForTimeout(600);
            const name = 'smoke-' + Date.now();
            const inp = page.locator('input[type=text]:not([role=spinbutton])').last();
            out('  name input visible', await inp.isVisible());
            await inp.fill(name); await inp.press('Enter'); await page.waitForTimeout(800);
            await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/preset-after-save.png'});
            await rng.focus(); for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowRight');
            out('  changed center', (await readouts(page)).center);
            const info = await page.evaluate(() => [...document.querySelectorAll('button,[role=option],[role=menuitem],select')].filter(e => e.offsetParent).map(e => e.tagName + ':' + (e.textContent || '').trim().slice(0, 30)).filter(s => /smoke|Prednastav|Predloga|Moje/i.test(s)));
            out('  candidates', JSON.stringify(info));
            const item = page.getByText(name).first();
            out('  name visible', await item.count());
            if (await item.count()) { await item.click(); await page.waitForTimeout(700); out('  restored center', (await readouts(page)).center); }
            // cleanup: remove created preset
            const del = page.getByRole('button', {name: new RegExp('Izbriši|Odstrani')});
            out('  delete buttons', await del.count());
        });
        await page.close();

        page = await open(ctx, 'functions/transformations');
        await check('2 drag/reset', async () => {
            const sp = page.locator('input[role=spinbutton]');
            const vals = async () => JSON.stringify(await sp.evaluateAll(a => a.map(x => x.value)));
            const jx = () => page.evaluate(() => Object.values(JXG.boards).map(b => Object.values(b.objects).filter(o => o.elType === 'point' && !o.visProp.fixed).map(o => [o.X(), o.Y()])));
            out('  fields', await vals()); out('  pts', JSON.stringify(await jx()));
            const svg = page.locator('svg:has(line[id^="jgbox_jxgBoard1"])').first(); const bb = await svg.boundingBox();
            const pos = await page.evaluate(() => { const b = Object.values(JXG.boards)[0]; return Object.values(b.objects).filter(o => o.elType === 'point' && !o.visProp.fixed).map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]]); });
            out('  scr', JSON.stringify(pos) + ' bb ' + JSON.stringify(bb));
            for (const p of pos) {
                const x = bb.x + p[0], y = bb.y + p[1];
                const before = await vals();
                await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 40, y - 30, {steps: 6}); await page.mouse.up(); await page.waitForTimeout(400);
                out('  drag ' + JSON.stringify(p) + ' fields changed', before !== await vals());
                out('  pts after', JSON.stringify(await jx())); out('  fields', await vals());
            }
            const tops = await page.evaluate(() => [...document.querySelectorAll('button')].filter(e => e.offsetParent).map(e => e.textContent.trim()).filter(Boolean).join(' | '));
            out('  buttons', tops.slice(0, 400));
        });
        await page.close();

        page = await open(ctx, 'linear-map');
        await check('5 linear map', async () => {
            const opts = await page.locator('select').nth(1).evaluate(s => [...s.options].map(o => o.value + '=' + o.textContent.trim().slice(0, 30)).join('|'));
            out('  select1 options', opts);
            const opts0 = await page.locator('select').nth(0).evaluate(s => s.value); out('  select0 value', opts0);
            const modes = await page.evaluate(() => [...document.querySelectorAll('[role=tab],[role=radio],button')].filter(e => e.offsetParent).map(e => e.textContent.trim().slice(0, 25)).join('|'));
            out('  buttons/tabs', modes.slice(0, 500));
        });
        await page.close();
    } finally { out('ERRORS', JSON.stringify(errors)); await browser.close(); }
})();
