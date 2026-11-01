// Frame-interval measurement for point-controlled curve gestures (drag, corner resize, ring rotate) on the production preview:
//   node scripts/curve-gesture-perf.cjs        // PREVIEW_BASE_URL defaults to http://127.0.0.1:4311/bezeg-2.0
// Env: PERF_RUNS (default 3), PERF_STEPS (default 150), PERF_DRAG_MS (default 2000), PERF_CASE (substring filter on case name).
// Locates targets from the live JSXGraph board (window.JXG.boards). Named points (name starts with "$$") are the control points;
// the four unnamed unfixed points shown after selection are the bounding-box corners. Frames are sampled by rAF only inside the
// gesture. Exits non-zero if a gesture did not change the curve, < MIN_SAMPLES frames were sampled, or page errors occurred.
// Gap: mouse input only (no touch events).
const {chromium} = require('playwright');

const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4311/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3);
const steps = Number(process.env.PERF_STEPS || 150);
const dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60;
const WARMUP = 15;
const ROTATE_JITTER = Number(process.env.PERF_ROTATE_JITTER ?? 0.0137); // rad; 0 gives an exactly vertical pointer step
const ROTATE_SWEEP = Number(process.env.PERF_ROTATE_SWEEP || 0.5); // in half-turns of pi; see th0 jitter below
const routes = ['bezier/curve', 'rational/base', 'spline/c2spline'];
const desktop = {width: 1440, height: 900}, phone = {width: 390, height: 844};
const cases = [];
for (const route of routes) for (const gesture of ['drag', 'resize', 'rotate']) cases.push({route, gesture, viewport: desktop, throttle: 1, label: 'desktop 1440x900, throttle 1'});
for (const route of routes) cases.push({route, gesture: 'drag', viewport: phone, throttle: 4, label: '390x844, 4x CPU'});
for (const c of cases) c.name = `${c.route} ${c.gesture} (${c.label})`;

const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Runs in the page. Returns the board origin (viewport px) and control points, corners and a curve point in board-relative screen px.
const readBoard = () => {
    const bd = Object.values(window.JXG.boards)[0];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const pts = Object.values(bd.objects).filter(o => o.elType === 'point' && o.visProp.visible !== false);
    const ctrl = pts.filter(o => (o.name || '').startsWith('$$')).map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]]);
    const corners = pts.filter(o => !o.name && !o.visProp.fixed).map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]]);
    const curves = Object.values(bd.objects).filter(o => o.elType === 'curve').sort((a, b) => b.points.length - a.points.length);
    const q = curves[0].points[Math.floor(curves[0].points.length / 2)];
    return {rect: [r.x, r.y], ctrl, corners, mid: [q.scrCoords[1], q.scrCoords[2]]};
};

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: c.viewport, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2500);
        const sel0 = await page.evaluate(readBoard);
        if (sel0.ctrl.length < 4) throw new Error(`found ${sel0.ctrl.length} control points`);
        await page.waitForTimeout(200);
        const sel1 = await page.evaluate(readBoard);
        await page.mouse.click(sel1.rect[0] + sel1.mid[0], sel1.rect[1] + sel1.mid[1]);
        await page.waitForTimeout(500);
        const s = await page.evaluate(readBoard);
        if (s.corners.length !== 4) throw new Error(`curve not selected (${s.corners.length} bounding-box corners, expected 4)`);
        const ox = s.rect[0], oy = s.rect[1];
        const xs = s.corners.map(p => p[0]), ys = s.corners.map(p => p[1]);
        const minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
        const cx = s.ctrl.reduce((a, p) => a + p[0], 0) / s.ctrl.length, cy = s.ctrl.reduce((a, p) => a + p[1], 0) / s.ctrl.length;
        let start, pathAt;
        if (c.gesture === 'drag') {
            start = s.mid; // on the curve, inside the box
            pathAt = f => [start[0] + 150 * f, start[1] + 50 * f];
        } else if (c.gesture === 'resize') {
            start = [maxX, minY]; // top-right bounding-box corner handle
            pathAt = f => [start[0] + 80 * f, start[1] - 40 * f];
        } else {
            start = [maxX + 9, (minY + maxY) / 2]; // padded ring (0.3 user units), outside the box and its corner handles
            const R = Math.hypot(start[0] - cx, start[1] - cy), th0 = Math.atan2(start[1] - cy, start[0] - cx) + ROTATE_JITTER; // jitter: AbstractJXGPointControlledCurve.rotate divides by (xCenter - x), so a step exactly vertical over the centre yields NaN
            pathAt = f => [cx + R * Math.cos(th0 + ROTATE_SWEEP * Math.PI * f), cy + R * Math.sin(th0 + ROTATE_SWEEP * Math.PI * f)];
        }
        await page.evaluate(() => {
            window.__perf = {stamps: [], on: true};
            const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
            requestAnimationFrame(tick);
        });
        await page.mouse.move(ox + start[0], oy + start[1]);
        await page.mouse.down();
        const t0 = await page.evaluate(() => performance.now());
        for (let i = 1; i <= steps; i++) {
            const [x, y] = pathAt(i / steps);
            await page.mouse.move(ox + x, oy + y);
            await page.waitForTimeout(dragMs / steps);
        }
        const t1 = await page.evaluate(() => performance.now());
        await page.mouse.up();
        const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
        const e = await page.evaluate(readBoard);
        if (!e.ctrl.every(q => Number.isFinite(q[0]) && Number.isFinite(q[1]))) throw new Error('control points are not finite after the gesture: ' + JSON.stringify(e.ctrl));
        const n = s.ctrl.length;
        if (e.ctrl.length !== n) throw new Error('control point count changed');
        const ex = e.ctrl.reduce((a, p) => a + p[0], 0) / n, ey = e.ctrl.reduce((a, p) => a + p[1], 0) / n;
        const ext = pts => [Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]))];
        let effect;
        if (c.gesture === 'drag') {
            effect = Math.hypot(ex - cx, ey - cy);
            if (effect < 20) throw new Error(`drag did not move the curve (centroid moved ${effect.toFixed(1)} px)`);
        } else if (c.gesture === 'resize') {
            const [w0, h0] = ext(s.ctrl), [w1, h1] = ext(e.ctrl);
            effect = Math.max(Math.abs(w1 - w0), Math.abs(h1 - h0));
            if (effect < 10) throw new Error(`resize did not change the control-point extent (${effect.toFixed(1)} px)`);
        } else {
            const a0 = Math.atan2(s.ctrl[0][1] - cy, s.ctrl[0][0] - cx), a1 = Math.atan2(e.ctrl[0][1] - ey, e.ctrl[0][0] - ex);
            effect = Math.abs(Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)));
            if (effect < 0.2) throw new Error(`rotate did not turn the curve (${effect.toFixed(3)} rad)`);
        }
        const iv = [];
        for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]);
        const samples = iv.slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples (< ${MIN_SAMPLES})`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], effect};
    } finally {
        await context.close();
    }
}

(async () => {
    const browser = await chromium.launch();
    const summary = [];
    try {
        for (const c of cases) {
            if (process.env.PERF_CASE && !c.name.includes(process.env.PERF_CASE)) continue;
            const results = [];
            for (let r = 0; r < runs; r++) {
                let res;
                try { res = await runOnce(browser, c); } catch (err) { throw new Error(`${c.name} run ${r + 1}: ${err.message}`); }
                results.push(res);
                console.log(JSON.stringify({case: c.name, run: r + 1, ...Object.fromEntries(Object.entries(res).map(([k, v]) => [k, Math.round(v * 100) / 100]))}));
            }
            summary.push({name: c.name, median: median(results.map(x => x.median)), medMin: Math.min(...results.map(x => x.median)), medMax: Math.max(...results.map(x => x.median)),
                p95: median(results.map(x => x.p95)), p95Min: Math.min(...results.map(x => x.p95)), p95Max: Math.max(...results.map(x => x.p95)), samples: results.map(x => x.samples).join('/')});
        }
    } finally {
        await browser.close();
        console.log('\ncase | median ms (range) | p95 ms (range) | samples per run');
        for (const s of summary) console.log(`${s.name} | ${s.median.toFixed(1)} (${s.medMin.toFixed(1)}-${s.medMax.toFixed(1)}) | ${s.p95.toFixed(1)} (${s.p95Min.toFixed(1)}-${s.p95Max.toFixed(1)}) | ${s.samples}`);
    }
})().catch(err => { console.error(`curve-gesture-perf FAILED: ${err.message}`); process.exit(1); });
