// Manual verification: open a guided example, step to Finish, then try labelled edit-tab controls.
// Usage: node replay.cjs <route> <example id> "<accessible name regex>" ...
const {chromium} = require('playwright');
const BASE = 'http://localhost:4399';
(async () => {
    const [route, example, ...names] = process.argv.slice(2);
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1440, height: 900}});
    p.setDefaultTimeout(4000);
    p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 150)));
    await p.goto(`${BASE}/${route.replace(/^\//, '')}?example=${example}`, {waitUntil: 'networkidle'});
    await p.locator('section.guided-lesson').waitFor({timeout: 15000});
    for (let i = 0; i < 60; i++) {
        const next = p.locator('section.guided-lesson .guided-lesson-nav-next');
        const label = (await next.getAttribute('aria-label').catch(() => '')) || '';
        await next.click().catch(e => console.log('next fail', e.message.split('\n')[0]));
        await p.waitForTimeout(500);
        if (/Končaj in raziskuj graf/.test(label)) break;
    }
    await p.click('.inspector-tabs button[aria-controls="inspector-edit"]');
    await p.$$eval('#workspace-inspector details', ds => ds.forEach(d => { d.open = true; }));
    const sig = () => p.evaluate(() => { let g = ''; document.querySelectorAll('section.workspace-graph svg').forEach(s => { g += s.innerHTML; }); return g.length + ':' + g.slice(-200); });
    for (const n of names) {
        if (n.startsWith('click:')) {  // click:<button name regex>[:count]
            const [, rx, count = '1'] = n.split(':');
            for (let i = 0; i < Number(count); i++) {
                const r = await p.locator('#inspector-edit').getByRole('button', {name: new RegExp(rx)}).first().click().then(() => 'ok', e => 'CLICK ' + e.message.split('\n')[0]);
                await p.waitForTimeout(400); console.log(n, i + 1, r);
            }
            continue;
        }
        const loc = p.locator('#inspector-edit').getByLabel(new RegExp(n)).first();
        const info = await loc.evaluate(e => { const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return `${e.tagName} dis=${e.disabled} ro=${e.readOnly} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} top=${top === e ? 'self' : (top?.className || top?.tagName)}`; }).catch(e => 'EVAL ' + e.message.split('\n')[0]);
        const before = await sig();
        const v0 = await loc.inputValue().catch(() => '?');
        const res = await loc.fill(String(Number(String(v0).replace(',', '.')) + 1 || 1)).then(() => 'filled', e => 'FILL ' + e.message.split('\n')[0]);
        await loc.press('Enter').catch(() => {});
        await p.waitForTimeout(600);
        console.log(n, '|', info, '|', res, '| value', v0, '->', await loc.inputValue().catch(() => '?'), '| graph changed', before !== await sig());
    }
    await b.close();
})();
