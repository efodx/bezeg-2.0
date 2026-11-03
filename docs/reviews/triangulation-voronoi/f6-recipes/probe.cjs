// Usage: node probe.cjs <route> '<json actions: [["button","name",n]|["click","css"]]>'
// Applies the actions on /compgeo/<route> of the production preview (port 4321) and prints the bounding box of the visible board points.
const {chromium} = require('playwright');
(async () => {
    const [route, spec] = process.argv.slice(2);
    const actions = JSON.parse(spec || '[]');
    const browser = await chromium.launch();
    const page = await browser.newPage({viewport: {width: 1400, height: 900}});
    await page.goto(`http://127.0.0.1:4321/bezeg-2.0/compgeo/${route}`);
    await page.locator('#jgbox').waitFor();
    for (const [kind, name, n = 1] of actions) for (let i = 0; i < n; i++) {
        if (kind === 'button') await page.getByRole('button', {name, exact: true}).click(); else await page.locator(name).click();
    }
    if (process.env.SHOT) await page.locator('#jgbox').screenshot({path: process.env.SHOT});
    const out = await page.locator('#jgbox').evaluate(c => {
        const b = Object.values(window.JXG.boards).find(x => x.container === c.id || x.containerObj === c);
        const vis = Object.values(b.objects).filter(o => o.visProp?.visible !== false && o.visProp?.visible !== 'false' && o.rendNode && getComputedStyle(o.rendNode).display !== 'none');
        const pts = vis.filter(o => o.elType === 'point').map(o => [o.name, +o.X().toFixed(2), +o.Y().toFixed(2)]);
        const circ = vis.filter(o => o.elType === 'circle').map(o => [+o.center.X().toFixed(2), +o.center.Y().toFixed(2), +o.Radius().toFixed(2)]);
        const xs = pts.map(p => p[1]), ys = pts.map(p => p[2]);
        return {bb: b.getBoundingBox().map(v => +v.toFixed(2)), x: [Math.min(...xs), Math.max(...xs)], y: [Math.min(...ys), Math.max(...ys)], n: pts.length,
            lines: vis.filter(o => ['line', 'segment'].includes(o.elType)).length, curves: vis.filter(o => o.elType === 'curve').length, circ,
            pts: pts.map(p => p.join(':')).join(' '), live: document.querySelector('[role=status]')?.textContent};
    });
    console.log(JSON.stringify(out));
    await browser.close();
})();
