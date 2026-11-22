const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 280000).unref();
const B = 'http://127.0.0.1:4481/bezeg-2.0/';
const errors = [];
const out = (k, v) => console.log(`${k}: ${v}`);
const readouts = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.getAttribute('data-readout'), (e.querySelector('dd') || e).textContent.trim()])));
const ranges = page => page.locator('input[type=range]');
const spins = page => page.locator('input[role=spinbutton]');
async function boardBox(page) {
    const b = await page.locator('svg:has(line[id^="jgbox_jxgBoard1"])').first().boundingBox();
    return b;
}
async function check(name, fn) {
    const before = errors.length;
    try { await fn(); out(name, 'DONE' + (errors.length > before ? ' WITH ERRORS ' + JSON.stringify(errors.slice(before)) : '')); }
    catch (e) { out(name, 'EXCEPTION ' + String(e.message).split('\n')[0]); }
}
async function openPage(ctx, route) {
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${route}] console: ${m.text()}`); });
    page.on('pageerror', e => errors.push(`[${route}] pageerror: ${e.message}`));
    await page.goto(B + route); await page.waitForTimeout(3500);
    return page;
}
async function setRangeKey(page, loc, key, n) { await loc.focus(); for (let i = 0; i < n; i++) await page.keyboard.press(key); }
async function dragRange(page, loc, frac) {
    const b = await loc.boundingBox();
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width * frac, b.y + b.height / 2, {steps: 8}); await page.mouse.up();
}
(async () => {
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
        await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) {} });

        // 1 Taylor
        let page = await openPage(ctx, 'analysis/taylor');
        await check('1a taylor controls', async () => {
            out('  start', JSON.stringify(await readouts(page)));
            const r = ranges(page);
            await dragRange(page, r.nth(0), 0.8); await page.waitForTimeout(300); out('  after drag range0', JSON.stringify(await readouts(page)));
            await setRangeKey(page, r.nth(0), 'ArrowRight', 5); await page.waitForTimeout(300); out('  after keys range0', JSON.stringify(await readouts(page)));
            await page.getByRole('button', {name: 'Povečaj število'}).click(); await page.getByRole('button', {name: 'Povečaj število'}).click(); await page.waitForTimeout(300); out('  degree +2', JSON.stringify(await readouts(page)));
            await page.getByRole('button', {name: 'Zmanjšaj število'}).click(); await page.waitForTimeout(300); out('  degree -1', JSON.stringify(await readouts(page)));
            const sp = spins(page); const n = await sp.count(); out('  spin count', n);
            await sp.nth(2).fill('1.5'); await sp.nth(2).press('Enter'); await page.waitForTimeout(300); out('  typed 1.5 in spin2', JSON.stringify(await readouts(page)));
            await page.locator('select').nth(1).selectOption({index: 1}); await page.waitForTimeout(400); out('  example idx1', JSON.stringify(await readouts(page)));
        });
        await check('1b taylor lesson', async () => {
            await page.getByRole('button', {name: /Spoznaj to demonstracijo/}).click(); await page.waitForTimeout(1500);
            const panel = page.locator('section.guided-lesson');
            out('  panel', await panel.count());
            const seq = [];
            seq.push(['start', JSON.stringify(await readouts(page)).slice(0,110)]);
            for (const [lbl, sel] of [['N1', '.guided-lesson-nav-next'], ['N2', '.guided-lesson-nav-next'], ['N3', '.guided-lesson-nav-next'], ['B1', '.guided-lesson-nav-back'], ['B2', '.guided-lesson-nav-back']]) {
                await panel.locator(sel).click(); await page.waitForTimeout(1500);
                seq.push([lbl, (await panel.locator('text=/Korak \d od/').first().textContent()) + ' ' + JSON.stringify(await readouts(page)).slice(0, 110)]);
            }
            seq.forEach(s => out('  ' + s[0], s[1]));
        });
        await check('6 preset', async () => {
            const exit = page.locator('section.guided-lesson').getByRole('button', {name: /Končaj/});
            if (await exit.count()) { await exit.first().click(); await page.waitForTimeout(800); const c = page.getByRole('button', {name: /Končaj|Da|Potrdi/}); if (await c.count()) await c.last().click().catch(() => {}); await page.waitForTimeout(800); }
            await page.goto(B + 'analysis/taylor'); await page.waitForTimeout(3000);
            const r = ranges(page);
            await page.getByRole('button', {name: 'Shrani'}).click(); await page.waitForTimeout(500); await page.getByRole('button', {name: /Shrani trenutno stanje/}).click(); await page.waitForTimeout(500);
            const dlg = page.locator('input[type=text]:not([role=spinbutton])');
            out('  text inputs after Shrani', await dlg.count());
            const name = 'smoke-' + Date.now();
            if (await dlg.count()) { await dlg.last().fill(name); }
            const before = JSON.stringify(await readouts(page));
            await page.getByRole('button', {name: /^(Shrani|Potrdi|V redu)$/}).last().click().catch(e => out('  save click', e.message.split('\n')[0]));
            await page.waitForTimeout(500);
            await setRangeKey(page, r.nth(0), 'ArrowRight', 10); await page.waitForTimeout(300);
            const changed = JSON.stringify(await readouts(page));
            out('  before', before); out('  changed', changed);
            await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/preset-state.png'});
            const sels = await page.locator('select').evaluateAll(s => s.map(x => [...x.options].map(o => o.textContent).join('|').slice(0, 200)));
            out('  selects', JSON.stringify(sels));
            const sel = page.locator('select', {has: page.locator('option', {hasText: name})});
            if (await sel.count()) { await sel.first().selectOption({label: name}); await page.waitForTimeout(500); out('  restored', JSON.stringify(await readouts(page))); }
            else out('  preset select not found', name);
        });
        await page.close();

        // 2 Transformations
        page = await openPage(ctx, 'functions/transformations');
        await check('2 transformations', async () => {
            const sp = spins(page); out('  spin count', await sp.count());
            const vals = async () => JSON.stringify(await sp.evaluateAll(a => a.map(x => x.value)));
            out('  start', await vals());
            for (let i = 0; i < 4; i++) { await sp.nth(i).fill(String(i + 2)); await sp.nth(i).press('Enter'); }
            await page.waitForTimeout(400); out('  after fields', await vals());
            const b = await boardBox(page);
            await page.screenshot({path: 'docs/reviews/ux-picks-app-wide/smoke/tr.png', clip: b});
            // drag candidates: marker search by sweeping not feasible; try JSXGraph points
            const pts = await page.evaluate(() => { const bs = window.JXG && JXG.boards ? Object.values(JXG.boards) : []; return bs.map(b => Object.values(b.objects).filter(o => o.elType === 'point' && o.visProp.visible !== false && !o.visProp.fixed).map(o => [o.name, o.X(), o.Y()])); });
            out('  jxg points', JSON.stringify(pts));
            const resetBtn = page.getByRole('button', {name: /Ponastavi|Ponastavitev|Ponastavi privzeto/});
            out('  reset buttons', await resetBtn.count());
        });
        await page.close();

        // 3 De Casteljau
        page = await openPage(ctx, 'bezier/decasteljau');
        await check('3 decasteljau', async () => {
            const play = page.getByRole('button', {name: /Predvajaj|Premor|Nadaljuj/}).first();
            const txt = async () => (await page.locator('button', {hasText: /Predvajaj|Premor|Pavza|Nadaljuj|Ponovno/}).allTextContents()).join('|');
            const t = async () => (await ranges(page).first().inputValue());
            const status = async () => (await page.locator('[role=status],[aria-live],[data-status]').allTextContents()).join('|').slice(0, 120);
            out('  initial buttons', await txt()); await play.click(); await page.waitForTimeout(600);
            out('  playing buttons', await txt() + ' t=' + await t() + ' status=' + await status());
            await dragRange(page, ranges(page).first(), 0.3); await page.waitForTimeout(200);
            const t1 = await t(); await page.waitForTimeout(800); const t2 = await t();
            out('  after drag', 'buttons=' + await txt() + ' t=' + t1 + ' later t=' + t2 + ' status=' + await status());
            await page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first().click(); await page.waitForTimeout(500);
            out('  resumed', await txt() + ' t=' + await t());
            await page.waitForTimeout(9000);
            out('  after wait', await txt() + ' t=' + await t() + ' status=' + await status());
            await page.getByRole('button', {name: 'Ponastavi'}).first().click(); await page.waitForTimeout(300);
            out('  after Ponastavi', 't=' + await t() + ' ' + await txt());
            await page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first().click(); await page.waitForTimeout(500);
            const b = await boardBox(page);
            await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.9); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(300);
            const ta = await t(); await page.waitForTimeout(700);
            out('  after board press', await txt() + ' t=' + ta + ' later t=' + await t());
            // 7 interrupt
            await page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first().click(); await page.waitForTimeout(400);
            await page.keyboard.press('Escape'); await page.mouse.click(5, 450); await page.waitForTimeout(600);
            out('  7 after Esc+click', await txt() + ' t=' + await t());
        });
        await page.close();

        // 4 Phase portrait
        page = await openPage(ctx, 'analysis/phase-portrait');
        await check('4 phase portrait', async () => {
            const txt = async () => (await page.locator('button', {hasText: /Predvajaj|Premor|Pavza|Nadaljuj|Ponovno/}).allTextContents()).join('|');
            const R = ranges(page); out('  ranges', await R.count());
            const play = () => page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first();
            const tr = async () => (await R.nth(1).inputValue());
            await play().click(); await page.waitForTimeout(700);
            out('  playing', await txt() + ' t=' + await tr());
            await dragRange(page, R.nth(1), 0.35); await page.waitForTimeout(200);
            const a = await tr(); await page.waitForTimeout(800);
            out('  after slider', await txt() + ' t=' + a + ' later t=' + await tr());
            await play().click(); await page.waitForTimeout(1500);
            out('  resumed', await txt() + ' t=' + await tr());
            await page.waitForTimeout(8000); out('  later', await txt() + ' t=' + await tr());
            await page.locator('button', {hasText: /Predvajaj|Nadaljuj/}).first().click().catch(() => {}); await page.waitForTimeout(300);
            const m = spins(page).first(); const before = await m.inputValue();
            if (/Premor|Pavza/.test(await txt())) await page.locator('button', {hasText: /Premor|Pavza/}).first().click();
            await m.fill('2'); await m.press('Enter'); await page.waitForTimeout(400);
            out('  matrix entry', before + ' -> ' + await m.inputValue() + ' ' + JSON.stringify(await readouts(page)).slice(0, 200));
            // 7
            await play().click(); await page.waitForTimeout(500);
            await page.keyboard.press('Escape'); await page.mouse.click(5, 450); await page.waitForTimeout(600);
            out('  7 after Esc+click', await txt() + ' t=' + await tr());
        });
        await page.close();

        // 5 Linear map
        page = await openPage(ctx, 'linear-map');
        await check('5 linear map', async () => {
            const sels = await page.locator('select').evaluateAll(s => s.map(x => [...x.options].map(o => o.value + '=' + o.textContent.trim().slice(0, 25)).join('|')));
            out('  selects', JSON.stringify(sels).slice(0, 600));
        });
        await page.close();
    } finally {
        out('ERRORS', JSON.stringify(errors));
        await browser.close();
    }
})();
