// Throwaway verification: on a fresh route, open an inspector tab, then for each label regex report the control's
// state, why a click fails, and whether the graph changes; saves an inspector screenshot.
// Usage: node probe3.cjs <route-without-leading-slash> <tab> <shot.png> "<name regex>" ...
const {chromium} = require('playwright');
(async () => {
    const [route, tab, shot, ...names] = process.argv.slice(2);
    const b = await chromium.launch();
    const p = await b.newPage({viewport: {width: 1440, height: 900}});
    p.setDefaultTimeout(3000);
    p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 150)));
    await p.goto(`http://localhost:4399/${route}`, {waitUntil: 'networkidle'});
    await p.waitForTimeout(1200);
    await p.click(`.inspector-tabs button[aria-controls="inspector-${tab}"]`).catch(() => {});
    await p.$$eval('#workspace-inspector details', ds => ds.forEach(d => { d.open = true; }));
    const sig = () => p.evaluate(() => { let g = ''; document.querySelectorAll('section.workspace-graph svg').forEach(s => { g += s.innerHTML; }); return g.length + ':' + g.slice(-300); });
    for (const n of names) {
        const loc = p.locator(`#inspector-${tab}`).getByLabel(new RegExp(n)).or(p.locator(`#inspector-${tab}`).getByRole('button', {name: new RegExp(n)})).first();
        const info = await loc.evaluate(e => {
            const r = e.getBoundingClientRect();
            const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            const cs = getComputedStyle(e);
            return `${e.tagName}[${e.type || ''}] dis=${e.disabled} aria-dis=${e.getAttribute('aria-disabled')} vis=${cs.visibility} op=${cs.opacity} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} top=${top === e ? 'self' : (top ? top.tagName + '.' + top.className : 'none')} title=${e.title || ''}`;
        }).catch(e => 'EVAL ' + e.message.split('\n')[0]);
        const before = await sig();
        const res = await loc.click().then(() => 'clicked', e => 'CLICK ' + e.message.split('\n').slice(0, 3).join(' / '));
        await p.waitForTimeout(700);
        console.log(n, '|', info, '|', res, '| graph changed', before !== await sig());
    }
    await p.locator('#workspace-inspector').screenshot({path: shot}).catch(e => console.log('shot fail', e.message));
    await b.close();
})();
