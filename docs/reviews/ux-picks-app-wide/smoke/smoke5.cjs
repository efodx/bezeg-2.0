const {chromium} = require('playwright');
setTimeout(() => process.exit(2), 150000).unref();
const B = 'http://127.0.0.1:4481/bezeg-2.0/';
const errors = [];
const out = (k, v) => console.log(`${k}: ${v}`);
const readouts = page => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-readout]')].map(e => [e.getAttribute('data-readout'), (e.querySelector('dd') || e).textContent.trim()])));
(async () => {
    const browser = await chromium.launch();
    try {
        const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
        const page = await ctx.newPage();
        page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
        page.on('pageerror', e => errors.push('pageerror: ' + e.message));
        await page.goto(B + 'linear-map'); await page.waitForTimeout(3500);
        await page.locator('select').nth(1).selectOption('quarter-turn');
        await page.locator('select').nth(2).selectOption('iterate'); await page.waitForTimeout(1000);
        const btns = await page.locator('button').evaluateAll(a => a.filter(b => b.offsetParent).map(b => b.getAttribute('aria-label') || b.textContent.trim()).filter(t => /korak|Predvaj|Premor|Ponastavi|Nazaj/i.test(t)));
        out('buttons', JSON.stringify(btns));
        const step = async () => (await readouts(page)).step;
        const play = page.getByRole('button', {name: /^Predvajaj/}).first();
        out('step0', await step());
        await play.click(); await page.waitForTimeout(1500);
        const s1 = await step(); await page.waitForTimeout(1200); out('playing steps', s1 + ' -> ' + await step());
        out('play button now', await page.getByRole('button', {name: /Premor|Predvajaj/}).evaluateAll(a => a.map(b => b.textContent.trim())).then(JSON.stringify));
        // change start point while playing
        const v = page.locator('input[role=spinbutton]').nth(4);
        await v.fill('0.5'); await v.press('Enter'); await page.waitForTimeout(300);
        const s2 = await step(); await page.waitForTimeout(1500); const s3 = await step();
        out('after start edit', s2 + ' then ' + s3 + ' paused=' + (s2 === s3) + ' start=' + (await readouts(page)).start);
        out('play button after', await page.getByRole('button', {name: /Premor|Predvajaj/}).evaluateAll(a => a.map(b => b.textContent.trim())).then(JSON.stringify));
        // switch modes
        for (const m of ['basis', 'eigen', 'iterate']) { await page.locator('select').nth(2).selectOption(m); await page.waitForTimeout(700); }
        out('mode switched, readouts', JSON.stringify(await readouts(page)).slice(0, 120));
        // Esc + click during playback
        await page.getByRole('button', {name: /^Predvajaj/}).first().click().catch(() => {}); await page.waitForTimeout(500);
        await page.keyboard.press('Escape'); await page.mouse.click(5, 450); await page.waitForTimeout(500);
        out('esc ok step', await step());
    } finally { out('ERRORS', JSON.stringify(errors)); await browser.close(); }
})();
