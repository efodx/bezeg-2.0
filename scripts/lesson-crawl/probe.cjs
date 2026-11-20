// Throwaway probe: on a fresh graph route, focus a labelled control in a tab and press keys; report graph change.
// Usage: node probe.cjs <url> "<tab>|<accessible name regex>|<keys comma separated>" ...
const {chromium} = require('playwright');
(async () => {
    const [url, ...steps] = process.argv.slice(2);
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1440, height: 900}});
    p.setDefaultTimeout(4000);
    p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 150)));
    await p.goto(url, {waitUntil: 'networkidle'}); await p.waitForTimeout(1200);
    const sig = () => p.evaluate(() => { let g = ''; document.querySelectorAll('section.workspace-graph svg').forEach(s => { g += s.innerHTML; }); let x = 0; for (let i = 0; i < g.length; i++) x = (x * 31 + g.charCodeAt(i)) | 0; return [x, g.length]; });
    for (const step of steps) {
        const [tab, name, keys] = step.split('|');
        await p.click(`.inspector-tabs button[aria-controls="inspector-${tab}"]`);
        await p.$$eval('#workspace-inspector details', ds => ds.forEach(d => { d.open = true; }));
        const loc = p.locator(`#inspector-${tab}`).getByLabel(new RegExp(name)).first();
        const before = await sig();
        const v0 = await loc.inputValue().catch(() => '?');
        await loc.focus();
        for (const k of keys.split(',')) await p.keyboard.press(k);
        await p.waitForTimeout(600);
        const after = await sig();
        console.log(step, 'value', v0, '->', await loc.inputValue().catch(() => '?'), 'graph changed:', before[0] !== after[0], before[1], after[1]);
    }
    await b.close();
})();
