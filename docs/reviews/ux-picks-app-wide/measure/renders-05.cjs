// Counts React component renders per pointer move during a Taylor puck drag (dev server; uses the DevTools hook). node renders-05.cjs --url http://127.0.0.1:4483
const {chromium} = require('playwright');
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => { if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]); return acc; }, []));
const base = (args.url || 'http://127.0.0.1:4483').replace(/\/$/, '');
(async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await context.addInitScript(() => {
        try { localStorage.setItem('bezeg-language', 'sl'); } catch (e) { /* */ }
        const counts = window.__renders = {commits: 0, by: {}, on: false};
        const walk = f => {
            for (; f; f = f.sibling) {
                if ((f.flags & 1) && typeof f.type === 'function' && f.alternate) { const n = f.type.displayName || f.type.name || 'anon'; counts.by[n] = (counts.by[n] || 0) + 1; }
                if (f.child) walk(f.child);
            }
        };
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
            supportsFiber: true, renderers: new Map(), inject(r) { this.renderers.set(1, r); return 1; },
            onCommitFiberRoot(id, root) { if (!counts.on) return; counts.commits++; const before = JSON.stringify(counts.by); const prev = counts.by; counts.by = {}; walk(root.current); (counts.log = counts.log || []).push(Object.keys(counts.by).join(",")); for (const k in counts.by) prev[k] = (prev[k]||0) + counts.by[k]; counts.by = prev; },
            onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {},
        };
    });
    const page = await context.newPage();
    await page.goto(`${base}/bezeg-2.0/analysis/taylor`);
    await page.locator('.puck-strip [role=slider]').first().waitFor();
    await page.waitForTimeout(2500);
    const box = await page.locator('.puck-strip [role=slider]').first().boundingBox();
    const x0 = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x0, y); await page.mouse.down();
    await page.evaluate(() => { window.__renders.on = true; });
    const steps = 30;
    for (let i = 1; i <= steps; i++) { await page.mouse.move(x0 + 5 * i, y); await page.waitForTimeout(40); }
    const r = await page.evaluate(() => { window.__renders.on = false; return window.__renders; });
    await page.mouse.up();
    console.log(r.log.slice(20,24).map(s => s.slice(0, 700)).join("\n---\n")); console.log(`commits ${r.commits} for ${steps} moves`);
    console.log(Object.entries(r.by).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${k}:${(v / steps).toFixed(1)}`).join('  '));
    await browser.close();
})();
