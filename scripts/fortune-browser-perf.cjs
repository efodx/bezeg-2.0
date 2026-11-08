// Frame-interval measurement for the Fortune graph with 12 sites (the maximum) on a production preview:
//   node scripts/fortune-browser-perf.cjs <label>     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4323/bezeg-2.0
// The build under test decides the beach-line drawing ('arcs' or 'polyline'); <label> only names the rows. The page is
// /compgeo/fortune (a route that exists only in a temporary measurement build). The 12-site random example is loaded, the
// sweep is advanced to the step with the longest beach line (read from the beach readout), and one site is dragged back and
// forth for PERF_MOVES mouse moves (default 60, with PERF_GAP_MS = 50 ms between them: about 3 s).
// Env: PERF_RUNS (default 3). Frames are sampled by rAF only inside the drag; move-to-frame latency is the time from each
// pointermove event to the next rAF callback. The first 3 intervals and events are discarded. Fails if fewer than half the
// moves reached the page, too few frames were sampled, the drag moved nothing, or the page raised errors.
// Gap: mouse input only; headless Chromium.
const {chromium} = require('playwright');

setTimeout(() => process.exit(2), 300000).unref();
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4323/bezeg-2.0').replace(/\/$/, '');
const label = process.argv[2] || 'unlabelled';
const runs = Number(process.env.PERF_RUNS || 3), moves = Number(process.env.PERF_MOVES || 60), gapMs = Number(process.env.PERF_GAP_MS || 50);
const MIN_SAMPLES = 20, WARMUP = 3;
const viewport = {width: 1440, height: 900};
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const readBoard = () => {
    const bd = Object.values(window.JXG.boards)[0];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const pts = Object.values(bd.objects).filter(o => o.elType === 'point' && /^[A-L]$/.test(o.name || ''));
    const arcs = Object.values(bd.objects).filter(o => o.name === 'fortune-beach').length;
    return {rect: [r.x, r.y], size: [r.width, r.height], arcs, pts: pts.map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2], o.name])};
};
const beachLength = async page => page.evaluate(() => {
    const el = document.querySelector('[data-fortune="beach"]');
    return el ? el.textContent.split(': ').pop().split(', ').length : 0;
});

async function runOnce(browser) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/compgeo/fortune`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(1500);
        await page.getByLabel('Primeri mest').selectOption('random');
        await page.waitForTimeout(500);
        const next = page.locator('button[data-action="next-step"]'), reset = page.locator('button[data-action="reset"]');
        // Find the step with the longest beach line (the readout is gone at the last step).
        let best = {step: 0, length: 0}, step = 0;
        for (; step < 200; step++) {
            const len = await beachLength(page);
            if (len > best.length) best = {step, length: len};
            if ((await next.getAttribute('aria-disabled')) === 'true') break;
            await next.click();
        }
        await reset.click();
        for (let i = 0; i < best.step; i++) await next.click();
        await page.waitForTimeout(800);
        if ((await beachLength(page)) !== best.length) throw new Error(`step ${best.step} does not show the longest beach line`);
        const s = await page.evaluate(readBoard);
        if (s.pts.length !== 12) throw new Error(`expected 12 sites, page has ${s.pts.length}`);
        const [ox, oy] = s.rect, cx = s.size[0] / 2, cy = s.size[1] / 2;
        const vis = s.pts.map((p, i) => ({p, i, d: Math.hypot(p[0] - cx, p[1] - cy)})).filter(o => o.p[0] > 20 && o.p[0] < s.size[0] - 20 && o.p[1] > 20 && o.p[1] < s.size[1] - 20).sort((a, b) => a.d - b.d);
        const target = vis[0];
        if (!target) throw new Error('no visible site');
        const [px, py] = target.p;
        await page.evaluate(() => {
            const w = window; w.__perf = {stamps: [], evs: [], on: true};
            const tick = ts => { if (w.__perf.on) { w.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
            requestAnimationFrame(tick);
            document.addEventListener('pointermove', e => { if (w.__perf.on) w.__perf.evs.push(e.timeStamp); }, true);
        });
        await page.mouse.move(ox + px, oy + py);
        await page.mouse.down();
        const t0 = await page.evaluate(() => performance.now());
        let farthest = 0;
        for (let i = 1; i <= moves; i++) {
            const f = Math.sin((i / moves) * 4 * Math.PI);
            await page.mouse.move(ox + px + 90 * f, oy + py + 60 * f);
            await page.waitForTimeout(gapMs);
            if (i === Math.round(moves / 8)) {
                const mid = await page.evaluate(readBoard);
                const moved = mid.pts.find(p => p[2] === s.pts[target.i][2]);
                farthest = Math.hypot(moved[0] - px, moved[1] - py);
            }
        }
        const t1 = await page.evaluate(() => performance.now());
        await page.mouse.up();
        const {stamps, evs} = await page.evaluate(() => { window.__perf.on = false; return window.__perf; });
        const after = await page.evaluate(readBoard);
        if (!(farthest > 10)) throw new Error(`drag moved nothing (${farthest} px)`);
        if (evs.length < moves / 2) throw new Error(`only ${evs.length} pointermove events reached the page`);
        const iv = [];
        for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]);
        const lat = [];
        for (const t of evs.slice(WARMUP)) { const nxt = stamps.find(x => x >= t); if (nxt !== undefined) lat.push(nxt - t); }
        const samples = iv.slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {step: best.step, beachArcs: best.length, beachObjects: s.arcs, beachObjectsAfter: after.arcs, frames: samples.length, moves: evs.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], latMedian: median(lat), latMax: Math.max(...lat), movedPx: Math.round(farthest)};
    } finally { await context.close(); }
}

(async () => {
    const browser = await chromium.launch();
    console.log(`browser Chromium ${browser.version()} viewport ${viewport.width}x${viewport.height} dsf 1 base ${baseUrl} approach ${label}`);
    const rs = [];
    try {
        for (let r = 0; r < runs; r++) { const res = await runOnce(browser).catch(err => { throw new Error(`${label} run ${r + 1}: ${err.message}`, {cause: err}); }); rs.push(res); console.log(JSON.stringify({approach: label, run: r + 1, ...res})); }
    } finally {
        await browser.close();
        if (rs.length) {
            const m = k => median(rs.map(x => x[k]));
            console.log('\napproach | frames/run | median ms | p95 ms | max ms | move->frame median | move->frame max');
            console.log(`${label} | ${rs.map(x => x.frames).join('/')} | ${m('median').toFixed(1)} | ${m('p95').toFixed(1)} | ${Math.max(...rs.map(x => x.max)).toFixed(1)} | ${m('latMedian').toFixed(1)} | ${Math.max(...rs.map(x => x.latMax)).toFixed(1)}`);
        }
    }
})().catch(err => { console.error(`fortune-browser-perf FAILED: ${err.message}`); process.exit(1); });
