// F2b geometry routes drag baseline (unit circle, triangle solver, line geometry, isometries) on the production preview.
//   PREVIEW_BASE_URL=http://127.0.0.1:4322/bezeg-2.0 node scripts/f2b-geometry-browser-perf.cjs
// Method of function-browser-perf.cjs (rAF deltas inside the drag). Per case: PERF_RUNS (5) runs of PERF_STEPS (60) moves over PERF_DRAG_MS (1000 ms).
// The dragged point is the first draggable point that no other point overlaps (isometries: mirror 1 Q, since the P ends coincide at the origin); when all overlap, the topmost (last) one (unit circle with the second angle: the angle beta handle, which sits on theta).
// Profiles: desktop 1280x800 mouse; phone 390x844 with 4x CPU throttle (CDP) and CDP touch events. PERF_SHOT_DIR receives the triangle-solve screenshots.
const {chromium} = require('playwright');
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4322/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 5), steps = Number(process.env.PERF_STEPS || 60), dragMs = Number(process.env.PERF_DRAG_MS || 1000);
const shotDir = process.env.PERF_SHOT_DIR || 'f2b-perf-shots';
const profiles = [
    {name: 'desktop 1280x800, mouse, no throttle', width: 1280, height: 800, touch: false, cpu: 1},
    {name: 'phone 390x844, touch, 4x CPU', width: 390, height: 844, touch: true, cpu: 4},
];
const checkAll = async page => { for (const c of await page.locator('input[type=checkbox]').all()) if (!(await c.isChecked())) await c.check(); };
const cases = [
    {name: 'unit circle, angle handle, default', route: 'functions/unit-circle', orbit: true},
    {name: 'unit circle, angle handle, symmetries + cosine + second angle', route: 'functions/unit-circle', orbit: true, setup: checkAll},
    {name: 'triangle solver, vertex A, sides mode', route: 'triangle-solver'},
    {name: 'line geometry, point P', route: 'line-geometry'},
    {name: 'isometries, mirror 1 end point Q (P coincides with mirror 2), mirrors mode', route: 'isometries'},
];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const readBoard = scroll => {
    const bd = Object.values(window.JXG.boards)[0];
    if (scroll) bd.containerObj.scrollIntoView({block: 'center', behavior: 'instant'});
    const r = bd.containerObj.getBoundingClientRect();
    const pts = Object.values(bd.objects).filter(o => o.elType === 'point' && o.visPropCalc.visible && !o.visProp.fixed);
    const uniq = pts.filter(o => pts.every(q => q === o || Math.hypot(q.coords.scrCoords[1] - o.coords.scrCoords[1], q.coords.scrCoords[2] - o.coords.scrCoords[2]) > 14));
    return {rect: [r.x, r.y], size: [r.width, r.height], origin: [bd.origin.scrCoords[1], bd.origin.scrCoords[2]], pts: (uniq.length ? uniq : pts.slice().reverse()).map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]])};
};
const open = async (page, route) => {
    await page.goto(`${baseUrl}/${route}`, {waitUntil: 'load'});
    await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
    await page.waitForTimeout(1500);
};
async function runOnce(browser, p, c) {
    const context = await browser.newContext({viewport: {width: p.width, height: p.height}, deviceScaleFactor: 1, hasTouch: p.touch, isMobile: p.touch});
    try {
        const page = await context.newPage(), errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        const cdp = await context.newCDPSession(page);
        await open(page, c.route);
        if (c.setup) await c.setup(page);
        await page.waitForTimeout(400);
        if (p.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', {rate: p.cpu});
        await page.evaluate(readBoard, true); await page.waitForTimeout(900);
        const s = await page.evaluate(readBoard, false);
        if (!s.pts.length) throw new Error('no draggable point');
        const [ox, oy] = s.rect, [px, py] = s.pts[0], [cx, cy] = s.origin;
        const rad = Math.hypot(px - cx, py - cy), a0 = Math.atan2(py - cy, px - cx);
        const at = f => c.orbit ? [cx + rad * Math.cos(a0 - 2 * Math.PI * f), cy + rad * Math.sin(a0 - 2 * Math.PI * f)]
            : [px + s.size[0] * 0.12 * Math.sin(2 * Math.PI * f), py + s.size[1] * 0.08 * Math.sin(4 * Math.PI * f)];
        const send = (type, x, y) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints: type === 'touchEnd' ? [] : [{x, y}]});
        await page.evaluate(() => {
            const bd = Object.values(window.JXG.boards)[0];
            window.__perf = {stamps: [], on: true, updates: 0};
            const u = bd.update; bd.update = function (...a) { window.__perf.updates++; return u.apply(this, a); };
            const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
            requestAnimationFrame(tick);
        });
        if (p.touch) await send('touchStart', ox + px, oy + py); else { await page.mouse.move(ox + px, oy + py); await page.mouse.down(); }
        const t0 = await page.evaluate(() => performance.now());
        for (let i = 1; i <= steps; i++) {
            const [x, y] = at(i / steps);
            if (p.touch) await send('touchMove', ox + x, oy + y); else await page.mouse.move(ox + x, oy + y);
            await page.waitForTimeout(dragMs / steps);
            if (i === steps >> 2) { const m = await page.evaluate(readBoard, false); if (Math.abs(m.pts[0][0] - px) + Math.abs(m.pts[0][1] - py) < 5) throw new Error('drag moved nothing'); }
        }
        const t1 = await page.evaluate(() => performance.now());
        if (p.touch) await send('touchEnd'); else await page.mouse.up();
        const r = await page.evaluate(() => { window.__perf.on = false; return window.__perf; });
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const iv = []; for (let i = 1; i < r.stamps.length; i++) if (r.stamps[i - 1] >= t0 && r.stamps[i] <= t1) iv.push(r.stamps[i] - r.stamps[i - 1]);
        const samples = iv.slice(5); if (samples.length < 20) throw new Error(`only ${samples.length} frames`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {n: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 16.7 * 1.5).length, updates: r.updates};
    } finally { await context.close(); }
}
async function shoot(browser) {
    require('fs').mkdirSync(shotDir, {recursive: true});
    for (const p of profiles) {
        const context = await browser.newContext({viewport: {width: p.width, height: p.height}, hasTouch: p.touch, isMobile: p.touch});
        try {
            const page = await context.newPage(); await open(page, 'triangle-solver');
            await page.locator('select', {has: page.locator('option[value="solve"]')}).selectOption('solve'); await page.waitForTimeout(1200);
            await page.evaluate(readBoard, true); await page.waitForTimeout(500);
            const f = `${shotDir}/triangle-solve-${p.width}x${p.height}.png`; await page.screenshot({path: f}); console.log('screenshot', f);
        } finally { await context.close(); }
    }
}
(async () => {
    const browser = await chromium.launch();
    console.log('browser', browser.version(), 'steps', steps, 'dragMs', dragMs, 'runs', runs);
    try {
        for (const p of profiles) for (const c of cases) {
            const rs = [];
            for (let r = 0; r < runs; r++) rs.push(await runOnce(browser, p, c).catch(e => { throw new Error(`${p.name} / ${c.name} run ${r + 1}: ${e.message}`, {cause: e}); }));
            console.log(`${p.name} | ${c.name} | median/run ${rs.map(x => x.median.toFixed(1)).join(' ')} | p95/run ${rs.map(x => x.p95.toFixed(1)).join(' ')} | max ${Math.max(...rs.map(x => x.max)).toFixed(1)} | >25ms/run ${rs.map(x => x.dropped).join('/')} | frames/run ${rs.map(x => x.n).join('/')} | updates/run ${rs.map(x => x.updates).join('/')}`);
        }
        await shoot(browser);
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
