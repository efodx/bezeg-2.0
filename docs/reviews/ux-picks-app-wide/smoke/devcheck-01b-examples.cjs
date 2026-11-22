// Example switch on each pilot (Edit tab, default). Logs to 01b-dev-examples.log
const {chromium} = require('playwright');
const fs = require('fs');
setTimeout(() => process.exit(2), 280000).unref();
const LOG = __dirname + '/01b-dev-examples.log'; fs.writeFileSync(LOG, '');
const P = ['analysis/taylor', 'functions/transformations', 'bezier/decasteljau', 'linear-map', 'analysis/phase-portrait'];
(async () => {
    const br = await chromium.launch(); const ctx = await br.newContext({viewport: {width: 1440, height: 900}});
    await ctx.addInitScript(() => { try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) {} });
    let bad = 0;
    for (const r of P) {
        const p = await ctx.newPage(); let cur = 'load';
        p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) { bad++; fs.appendFileSync(LOG, `ERROR ${r} ${cur}: ${m.text()}\n`); } });
        p.on('pageerror', e => { bad++; fs.appendFileSync(LOG, `PAGEERROR ${r} ${cur}: ${e.message}\n`); });
        await p.goto('http://127.0.0.1:4482/bezeg-2.0/' + r); await p.waitForTimeout(5000);
        const sel = p.locator('select'); const n = await sel.count(); let done = false;
        for (let i = 0; i < n && !done; i++) {
            const opts = await sel.nth(i).evaluate(s => [...s.options].map(o => o.value));
            if (opts.length < 2 || opts.includes('en')) continue;
            for (const o of opts.slice(1, 3)) {
                cur = 'select ' + i + ' -> ' + o;
                try { await sel.nth(i).selectOption(o, {timeout: 5000}); fs.appendFileSync(LOG, `OK ${r} ${cur}\n`); } catch (e) { fs.appendFileSync(LOG, `FAIL ${r} ${cur}: ${e.message.split('\n')[0]}\n`); }
                await p.waitForTimeout(700);
            }
            done = true;
        }
        if (!done) fs.appendFileSync(LOG, `NOSELECT ${r}\n`);
        await p.close();
    }
    fs.appendFileSync(LOG, `DONE errors=${bad}\n`); await br.close();
})();
