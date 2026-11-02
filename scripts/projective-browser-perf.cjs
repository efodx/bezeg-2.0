// Frame-interval measurement for the projective routes on the production preview (ADR 0033, slice 06):
//   node scripts/projective-browser-perf.cjs     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4315/bezeg-2.0
// Slice 07d adds K4 five-point drags (ellipse, hyperbola, parabola; extrapolation on), K4 arc-end/third-point changes and a K5 c-slider keyboard sweep.
// Cases: K2 Pascal handle drag on the ellipse, parabola and hyperbola; K3 P drag; K2 and K3 conic switch (clicks every 150 ms).
// Env: PERF_RUNS (default 3), PERF_STEPS (default 150), PERF_DRAG_MS (default 2000). Frames are sampled by rAF only inside the
// interaction. Fails if a drag moved nothing, too few frames were sampled, or the page raised errors. Gap: mouse input only.
const {chromium} = require('playwright');

const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4315/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15;
const viewport = {width: 1440, height: 900};
const CONIC = {ellipse: /^(Ellipse|Elipsa)$/, parabola: /^Parabola$/, hyperbola: /^(Hyperbola|Hiperbola)$/};
const GROUP = /^(Conic|Stožnica)$/;
const EXAMPLE_GROUP = /^(Example|Primer)$/;
const EXTRAPOLATION = /Continue the arc|Nadaljuj lok/;
const cases = [
    ...['ellipse', 'parabola', 'hyperbola'].map(c => ({name: `K2 Pascal handle drag (${c})`, route: 'projective/pascal', kind: 'drag', conic: c})),
    {name: 'K3 P drag (ellipse)', route: 'projective/pole-polar', kind: 'drag', conic: 'ellipse'},
    {name: 'K2 conic switch (ellipse/parabola/hyperbola)', route: 'projective/pascal', kind: 'switch'},
    {name: 'K3 conic switch (ellipse/parabola/hyperbola)', route: 'projective/pole-polar', kind: 'switch'},
    ...['ellipse', 'hyperbola', 'parabola'].map(c => ({name: `K4 point drag (${c})`, route: 'projective/five-point', kind: 'drag', example: c})),
    {name: 'K4 point drag (hyperbola, extrapolation on)', route: 'projective/five-point', kind: 'drag', example: 'hyperbola', extrapolation: true},
    {name: 'K4 arc-end and third-point changes (ellipse)', route: 'projective/five-point', kind: 'selects'},
    {name: 'K5 c slider sweep by keyboard (-3..3)', route: 'projective/three-views', kind: 'slider'},
];
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// In the page: board origin and the unfixed visible points in board-relative screen px.
const readBoard = () => {
    const bd = Object.values(window.JXG.boards)[0];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const pts = Object.values(bd.objects).filter(o => o.elType === 'point' && o.visProp.visible !== false && !o.visProp.fixed && o.name);
    return {rect: [r.x, r.y], size: [r.width, r.height], pts: pts.map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]])};
};
const startSampling = page => page.evaluate(() => {
    window.__perf = {stamps: [], on: true};
    const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
});
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        const group = page.getByRole('group', {name: GROUP});
        let iv;
        const exampleGroup = page.getByRole('group', {name: EXAMPLE_GROUP});
        if (c.route.endsWith('five-point') && c.example && c.example !== 'ellipse') { await exampleGroup.getByRole('button', {name: CONIC[c.example]}).click(); await page.waitForTimeout(500); }
        if (c.extrapolation) { await page.getByLabel(EXTRAPOLATION).check(); await page.waitForTimeout(500); }
        if (c.kind === 'drag') {
            if (c.conic && c.conic !== 'ellipse') { await group.getByRole('button', {name: CONIC[c.conic]}).click(); await page.waitForTimeout(500); }
            await page.evaluate(readBoard); await page.waitForTimeout(600); // the first scrollIntoView settles before positions are read
            const s = await page.evaluate(readBoard);
            if (!s.pts.length) throw new Error('no draggable point found');
            const [ox, oy] = s.rect, [px, py] = s.pts[0];
            const cx = s.size[0] / 2, cy = s.size[1] / 2, R = Math.hypot(px - cx, py - cy), th0 = Math.atan2(py - cy, px - cx);
            const pathAt = f => c.route.endsWith('pascal') ? [cx + R * Math.cos(th0 + 0.5 * Math.PI * f), cy + R * Math.sin(th0 + 0.5 * Math.PI * f)] : [px + 150 * f, py + 40 * f];
            await startSampling(page);
            await page.mouse.move(ox + px, oy + py);
            await page.mouse.down();
            const t0 = await page.evaluate(() => performance.now());
            for (let i = 1; i <= steps; i++) { const [x, y] = pathAt(i / steps); await page.mouse.move(ox + x, oy + y); await page.waitForTimeout(dragMs / steps); }
            const t1 = await page.evaluate(() => performance.now());
            await page.mouse.up();
            const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
            const e = await page.evaluate(readBoard);
            const moved = Math.max(...e.pts.map((q, i) => Math.hypot(q[0] - s.pts[i][0], q[1] - s.pts[i][1])));
            if (!(moved > 10)) throw new Error(`drag moved nothing (${moved} px) ${JSON.stringify([s, e])}`);
            iv = intervals(stamps, t0, t1);
        } else if (c.kind === 'selects') {
            const selects = page.locator('select');
            await startSampling(page);
            const t0 = await page.evaluate(() => performance.now());
            for (let k = 0; k < 12; k++) { const sel = selects.nth(k % 2 ? 2 : 0), n = await sel.locator('option').count(); await sel.selectOption({index: (k >> 1) % n}); await page.waitForTimeout(120); }
            const t1 = await page.evaluate(() => performance.now());
            const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
            iv = intervals(stamps, t0, t1);
        } else if (c.kind === 'slider') {
            const slider = page.locator('input[type=range]').first();
            await slider.focus();
            for (let k = 0; k < 30; k++) await slider.press('ArrowLeft');
            await startSampling(page);
            const t0 = await page.evaluate(() => performance.now());
            for (let k = 0; k < 60; k++) { await slider.press('ArrowRight'); await page.waitForTimeout(30); }
            for (let k = 0; k < 60; k++) { await slider.press('ArrowLeft'); await page.waitForTimeout(30); }
            const t1 = await page.evaluate(() => performance.now());
            const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
            iv = intervals(stamps, t0, t1);
        } else {
            await startSampling(page);
            const t0 = await page.evaluate(() => performance.now());
            for (let k = 0; k < 9; k++) { await group.getByRole('button', {name: CONIC[['parabola', 'hyperbola', 'ellipse'][k % 3]]}).click(); await page.waitForTimeout(150); }
            const t1 = await page.evaluate(() => performance.now());
            const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
            iv = intervals(stamps, t0, t1);
        }
        const samples = c.kind === 'drag' ? iv.slice(WARMUP) : iv;
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1]};
    } finally { await context.close(); }
}

(async () => {
    const browser = await chromium.launch();
    const summary = [];
    try {
        for (const c of cases) {
            const rs = [];
            for (let r = 0; r < runs; r++) { const res = await runOnce(browser, c).catch(err => { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }); rs.push(res); console.log(JSON.stringify({case: c.name, run: r + 1, ...res})); }
            summary.push({name: c.name, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), max: Math.max(...rs.map(x => x.max)), samples: rs.map(x => x.samples).join('/')});
        }
    } finally {
        await browser.close();
        console.log('\ncase | median ms | p95 ms | max ms | samples per run');
        for (const s of summary) console.log(`${s.name} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${s.samples}`);
    }
})().catch(err => { console.error(`projective-browser-perf FAILED: ${err.message}`); process.exit(1); });
