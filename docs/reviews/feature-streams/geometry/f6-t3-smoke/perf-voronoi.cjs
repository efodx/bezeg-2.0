// F6 T3 adaptation (copy of scripts/triangulation-browser-perf.cjs; route /compgeo/voronoi, overlay cases dropped). Original: frame-interval measurement for point-set triangulation with 40 points (the maximum) on the production preview:
//   node scripts/triangulation-browser-perf.cjs     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4313/bezeg-2.0
// Cases: overlays default (triangulation on; grid, edge numbers, smallest angle off), all optional overlays off (triangulation
// off too), and edges + angles on. The 40 points are made by typing integer points into the "new point" inputs (the page must
// then hold 40 draggable points). One interior point is dragged back and forth through PERF_MOVES mouse moves.
// Env: PERF_RUNS (default 3), PERF_MOVES (default 40), PERF_GAP_MS (wait between moves, default 50). Frames are sampled by
// rAF only inside the drag; move-to-frame latency is the time from each pointermove event to the next rAF callback.
// Fails if fewer than half the moves reached the page, too few frames were sampled, the page lacks 40 points, or the page
// raised errors. Gap: mouse input only; headless Chromium.
const {chromium} = require('playwright');

setTimeout(() => process.exit(2), 300000).unref();
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4313/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), moves = Number(process.env.PERF_MOVES || 40), gapMs = Number(process.env.PERF_GAP_MS || 50);
const MIN_SAMPLES = 20, WARMUP = 3;
const viewport = {width: 1440, height: 900};
const L = {
    grid: /Mreža|Grid/, tri: /Triangulacija množice točk|Triangulation of the point set/,
    edges: /Številke robov|Edge numbers/, angles: /Najmanjši kot|Smallest angle/,
    nx: /^(Nova točka: x|New point: x)$/, ny: /^(Nova točka: y|New point: y)$/, add: /^(Dodaj točko|Add point)$/,
};
const cases = [
    {name: 'voronoi default page state (Voronoi and dual overlays as loaded)', on: null},
];
const pct = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const readBoard = () => {
    const bd = Object.values(window.JXG.boards)[0];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const pts = Object.values(bd.objects).filter(o => o.elType === 'point' && o.visProp.visible !== false && !o.visProp.fixed && o.name);
    return {rect: [r.x, r.y], size: [r.width, r.height], pts: pts.map(o => [o.coords.scrCoords[1], o.coords.scrCoords[2]])};
};

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/compgeo/voronoi`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        const count = async () => (await page.evaluate(readBoard)).pts.length;
        const nx = page.getByLabel(L.nx), ny = page.getByLabel(L.ny), add = page.getByRole('button', {name: L.add});
        let n = await count();
        for (let i = 0; n < 40 && i < 120; i++) {
            const x = -9 + (i % 10) * 2 + (i % 3), y = -6 + Math.floor(i / 10) * 2 + ((i * 7) % 3);
            await nx.fill(String(x)); await ny.fill(String(y)); await add.click();
            n = await count();
        }
        if (n !== 40) throw new Error(`expected 40 points, page has ${n}`);
        if (c.on) for (const k of ['grid', 'tri', 'edges', 'angles']) await page.getByRole('checkbox', {name: L[k]}).setChecked(c.on[k], {force: true});
        await page.waitForTimeout(1500);
        await page.evaluate(readBoard); await page.waitForTimeout(600);
        const s = await page.evaluate(readBoard);
        if (s.pts.length !== 40) throw new Error(`expected 40 points, page has ${s.pts.length}`);
        const [ox, oy] = s.rect, cx = s.size[0] / 2, cy = s.size[1] / 2;
        const vis = s.pts.map((p, i) => ({p, i, d: Math.hypot(p[0] - cx, p[1] - cy)})).filter(o => o.p[0] > 0 && o.p[0] < s.size[0] && o.p[1] > 0 && o.p[1] < s.size[1]).sort((a, b) => a.d - b.d);
        const target = vis[0];
        if (!target) throw new Error('no visible point');
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
            const f = Math.sin((i / moves) * 2 * Math.PI);
            await page.mouse.move(ox + px + 40 * f, oy + py + 25 * f);
            await page.waitForTimeout(gapMs);
            if (i === Math.round(moves / 4)) {
                const mid = await page.evaluate(readBoard);
                farthest = Math.hypot(mid.pts[target.i][0] - px, mid.pts[target.i][1] - py);
            }
        }
        const t1 = await page.evaluate(() => performance.now());
        await page.mouse.up();
        const {stamps, evs} = await page.evaluate(() => { window.__perf.on = false; return window.__perf; });
        if (!(farthest > 10)) throw new Error(`drag moved nothing (${farthest} px at quarter path)`);
        if (evs.length < moves / 2) throw new Error(`only ${evs.length} pointermove events reached the page`);
        const iv = [];
        for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]);
        const lat = [];
        for (const t of evs.slice(WARMUP)) { const nxt = stamps.find(x => x >= t); if (nxt !== undefined) lat.push(nxt - t); }
        const samples = iv.slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b);
        return {points: s.pts.length, frames: samples.length, moves: evs.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], latMedian: median(lat), latMax: Math.max(...lat), movedPx: Math.round(farthest)};
    } finally { await context.close(); }
}

(async () => {
    const browser = await chromium.launch();
    console.log(`browser Chromium ${browser.version()} viewport ${viewport.width}x${viewport.height} dsf 1 base ${baseUrl}`);
    const summary = [];
    try {
        for (const c of cases) {
            const rs = [];
            for (let r = 0; r < runs; r++) { const res = await runOnce(browser, c).catch(err => { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }); rs.push(res); console.log(JSON.stringify({case: c.name, run: r + 1, ...res})); }
            const m = k => median(rs.map(x => x[k]));
            summary.push({name: c.name, frames: rs.map(x => x.frames).join('/'), median: m('median'), p95: m('p95'), max: Math.max(...rs.map(x => x.max)), latMedian: m('latMedian'), latMax: Math.max(...rs.map(x => x.latMax))});
        }
    } finally {
        await browser.close();
        console.log('\ncase | frames/run | median ms | p95 ms | max ms | move->frame median | move->frame max');
        for (const s of summary) console.log(`${s.name} | ${s.frames} | ${s.median.toFixed(1)} | ${s.p95.toFixed(1)} | ${s.max.toFixed(1)} | ${s.latMedian.toFixed(1)} | ${s.latMax.toFixed(1)}`);
    }
})().catch(err => { console.error(`triangulation-browser-perf FAILED: ${err.message}`); process.exit(1); });
