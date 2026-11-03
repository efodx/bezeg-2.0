// Frame-interval measurement for the polynomial-zeros and rational-function routes on the production preview (ADR 0026 addendum, F2b):
//   node scripts/function-browser-perf.cjs     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4315/bezeg-2.0
// Copy of the method of projective-browser-perf.cjs (rAF sampling only inside the interaction). Cases: a pointer drag of the first
// draggable zero across the view and back per example, an example switch sweep, and a 1920 px drag. Env: PERF_RUNS, PERF_STEPS, PERF_DRAG_MS.
const {chromium} = require('playwright');
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4315/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15;
const EXAMPLE = /^(Example|Primer)$/;
const R = 'functions/rational-functions', P = 'functions/polynomial-zeros';
const cases = [
    ...['oblique', 'hole', 'horizontal', 'double-pole'].map(example => ({name: `S4 zero drag, example ${example}`, route: R, kind: 'drag', example})),
    {name: 'S4 example switch sweep', route: R, kind: 'switch'},
    {name: 'S3 zero drag, degree-five', route: P, kind: 'drag', example: 'degree-five'},
    {name: 'S3 zero drag, degree-five, 1920 px', route: P, kind: 'drag', example: 'degree-five', width: 1920, height: 1080},
];
const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const readBoard = () => {
    const bd = Object.values(window.JXG.boards)[0];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const pts = Object.values(bd.objects).filter(o => o.elType === 'glider' || (o.elType === 'point' && o.visProp.visible !== false && o.visPropCalc.visible && !o.visProp.fixed));
    return {rect: [r.x, r.y], size: [r.width, r.height], pts: pts.map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]])};
};
const startSampling = page => page.evaluate(() => {
    window.__perf = {stamps: [], on: true};
    const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
});
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };
const chooseExample = async (page, example) => {
    const sel = page.getByRole('combobox', {name: EXAMPLE}).first();
    await sel.selectOption(example); await page.waitForTimeout(500);
};

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: c.width || 1440, height: c.height || 900}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        let iv;
        if (c.example) await chooseExample(page, c.example);
        if (c.kind === 'drag') {
            await page.evaluate(readBoard); await page.waitForTimeout(600);
            const s = await page.evaluate(readBoard);
            if (!s.pts.length) throw new Error('no draggable point found');
            const [ox, oy] = s.rect, [px, py] = s.pts[0];
            const span = s.size[0] * 0.4;
            const pathAt = f => [px + span * Math.sin(2 * Math.PI * f) , py]; // right and back over the view, across the denominator zeros
            await startSampling(page);
            await page.mouse.move(ox + px, oy + py);
            await page.mouse.down();
            const t0 = await page.evaluate(() => performance.now());
            for (let i = 1; i <= steps; i++) { const [x, y] = pathAt(i / steps); await page.mouse.move(ox + x, oy + y); await page.waitForTimeout(dragMs / steps);
                if (i === Math.round(steps / 4)) { const m = await page.evaluate(readBoard); if (!m.pts.some((q, j) => s.pts[j] && Math.abs(q[0] - s.pts[j][0]) > 10)) throw new Error('drag moved nothing'); } }
            const t1 = await page.evaluate(() => performance.now());
            await page.mouse.up();
            const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
            iv = intervals(stamps, t0, t1);
        } else {
            await startSampling(page);
            const t0 = await page.evaluate(() => performance.now());
            const sel = page.getByRole('combobox', {name: EXAMPLE}).first();
            for (let k = 0; k < 12; k++) { await sel.selectOption(['hole', 'horizontal', 'double-pole', 'oblique'][k % 4]); await page.waitForTimeout(150); }
            const t1 = await page.evaluate(() => performance.now());
            const stamps = await page.evaluate(() => { window.__perf.on = false; return window.__perf.stamps; });
            iv = intervals(stamps, t0, t1);
        }
        const samples = c.kind === 'drag' ? iv.slice(WARMUP) : iv;
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length};
    } finally { await context.close(); }
}

(async () => {
    const browser = await chromium.launch();
    const summary = [];
    try {
        for (const c of cases) {
            const rs = [];
            for (let r = 0; r < runs; r++) rs.push(await runOnce(browser, c).catch(err => { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }));
            summary.push({name: c.name, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), max: Math.max(...rs.map(x => x.max)), dropped: rs.map(x => x.dropped).join('/'), samples: rs.map(x => x.samples).join('/')});
        }
    } finally {
        await browser.close();
        console.log('\ncase | median ms | p95 ms | max ms | frames >25 ms per run | samples per run');
        for (const s of summary) console.log(`${s.name} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${s.dropped} | ${s.samples}`);
    }
})().catch(err => { console.error(`function-browser-perf FAILED: ${err.message}`); process.exit(1); });
