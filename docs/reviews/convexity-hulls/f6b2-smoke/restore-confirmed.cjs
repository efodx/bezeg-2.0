// Handler 51: the smoke's restore check clicked Exit but never the confirmation. This one confirms.
const path = require('node:path');
const repo = path.resolve(__dirname, '..', '..', '..', '..');
const {chromium} = require(path.join(repo, 'node_modules', '@playwright/test'));
setTimeout(() => process.exit(2), 110000).unref();
const O = 'http://127.0.0.1:3012/bezeg-2.0';
const vals = p => p.evaluate(() => [...document.querySelectorAll('input')].filter(i => i.offsetParent && ['number', 'text', 'range'].includes(i.type)).map(i => (i.getAttribute('aria-label') || '?') + '=' + i.value).join(';'));
const sels = p => p.evaluate(() => [...document.querySelectorAll('select')].map(s => s.options[s.selectedIndex]?.text).join(','));
(async () => {
    const b = await chromium.launch(); const c = await b.newContext({viewport: {width: 1366, height: 768}, locale: 'en-US'}); const p = await c.newPage();
    await p.goto(O + '/'); await p.evaluate(() => localStorage.setItem('language', 'en')); 
    for (const [r, nexts] of [['point-in-polygon', 0], ['point-in-polygon', 3], ['hull-robustness', 0], ['hull-robustness', 8], ['convex-hull', 3]]) {
        await p.goto(`${O}/compgeo/${r}`); await p.waitForTimeout(1800);
        const before = await vals(p) + '|' + await sels(p);
        await p.getByRole('button', {name: /Learn this demonstration|Nauči|Spoznaj|Vodeni/}).first().click(); await p.waitForTimeout(1500);
        for (let i = 0; i < nexts; i++) { await p.locator('.guided-lesson-nav').nth(1).click(); await p.waitForTimeout(300); }
        const mid = await vals(p) + '|' + await sels(p);
        await p.locator('.guided-lesson-exit').first().click(); await p.waitForTimeout(400);
        await p.getByRole('button', {name: /Exit and restore graph|Zapusti in povrni graf/}).click(); await p.waitForTimeout(1000);
        const after = await vals(p) + '|' + await sels(p);
        console.log(r, 'nexts', nexts, 'lessonGone', await p.locator('.guided-lesson').count() === 0, 'changedInLesson', before !== mid, 'RESTORED', before === after);
        if (before !== after) console.log(' before', before.slice(0, 150), '\n after ', after.slice(0, 150));
    }
    await b.close();
})().catch(e => {console.error(e.message.slice(0, 300)); process.exit(1);});
