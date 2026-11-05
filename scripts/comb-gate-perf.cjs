// CG-B2-6 performance gate: the SHIPPED comb graph (/curve-geometry/comb) and evolute graph (/curve-geometry/evolute) on the production preview.
//   node scripts/comb-gate-perf.cjs [--json out.json]     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4314/bezeg-2.0
// No injection: the real page is driven through its own controls (select "Krivulja", switch "Glavnik ukrivljenosti", slider "Parameter t").
// Method of comb-browser-perf.cjs: rAF sampling only inside the interaction, warm-up dropped, time spent inside board.update, median over runs,
// cases interleaved across runs. Every case asserts it is real from the board's own objects: comb tip/teeth curves (the overlay's data curves, stroke
// widths 2.5 / 1.5) have points and change from drag start to end, or are empty when the comb is off; the evolute trace (stroke width 2) has points and
// the evolute point E moves; a failed assertion fails the run.
// Env: PERF_RUNS (3), PERF_RUNS_THROTTLED (5), PERF_STEPS (150), PERF_DRAG_MS (2000), PERF_ONLY (comma-separated substrings of case names),
// PERF_OUT or --json path.
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4314/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), runsThrottled = Number(process.env.PERF_RUNS_THROTTLED || 5);
const steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15, THROTTLE = 4, MIN_SHIFT = 1e-3;
const COMB = 'curve-geometry/comb', EVOLUTE = 'curve-geometry/evolute';

const mk = (name, route, o) => ({name, route, throttle: 0, ...o});
function buildCases() {
    const cases = [
        mk('1 cubic, comb off', COMB, {kind: 'cubic', comb: false}),
        mk('2 cubic, comb on', COMB, {kind: 'cubic', comb: true}),
        mk('3 C1 spline, comb off', COMB, {kind: 'c1', comb: false}),
        mk('4 C1 spline, comb on', COMB, {kind: 'c1', comb: true}),
        mk('5 G1 spline, comb on', COMB, {kind: 'g1', comb: true}),
        mk('6 evolute, control point drag', EVOLUTE, {evolute: 'point'}),
        mk('7 evolute, t slider drag', EVOLUTE, {evolute: 'slider'}),
    ];
    for (const n of [2, 4, 6]) {
        const base = cases.find(c => c.name.startsWith(`${n} `));
        cases.push({...base, name: `${base.name} | CPU/${THROTTLE}`, throttle: THROTTLE});
    }
    const only = (process.env.PERF_ONLY || '').toLowerCase().split(',').filter(Boolean);
    return only.length ? cases.filter(c => only.some(o => c.name.toLowerCase().includes(o))) : cases;
}

const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };

/** In the page: scroll the board into view; reachable draggable points (visible, not fixed). */
const readBoard = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const shown = o => o.visProp.visible !== false && o.visPropCalc.visible;
    const free = Object.values(bd.objects).filter(o => o.elType === 'point' && shown(o) && !o.visProp.fixed);
    const pts = free.map(o => ({x: o.coords.scrCoords[1], y: o.coords.scrCoords[2]}))
        .filter(p => bd.containerObj.contains(document.elementFromPoint(r.x + p.x, r.y + p.y)));
    return {rect: [r.x, r.y], size: [r.width, r.height], pts, freePoints: free.length, objects: Object.keys(bd.objects).length};
};
/** In the page: data of the overlay's own data curves by stroke width, and the evolute point E (face '<>'). Finite point counts and coordinates. */
const snapshot = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    const curves = Object.values(bd.objects).filter(o => o.elType === 'curve' && Object.prototype.hasOwnProperty.call(o, 'updateDataArray'));
    const byWidth = w => curves.filter(c => c.visProp.strokewidth === w);
    const data = list => {
        const xs = [], ys = [];
        for (const c of list) for (let i = 0; i < (c.dataX || []).length; i++) if (Number.isFinite(c.dataX[i]) && Number.isFinite(c.dataY[i])) { xs.push(c.dataX[i]); ys.push(c.dataY[i]); }
        return {n: xs.length, xs, ys, curves: list.length};
    };
    const e = Object.values(bd.objects).find(o => o.elType === 'point' && o.visProp.face === '<>');
    return {tip: data(byWidth(2.5)), teeth: data(byWidth(1.5)), trace: data(byWidth(2)), E: e ? [e.X(), e.Y()] : null,
        ownCurves: curves.map(c => c.visProp.strokewidth)};
};
const shift = (a, b) => {
    if (a.n !== b.n) return Infinity;
    let m = 0;
    for (let i = 0; i < a.n; i++) m = Math.max(m, Math.abs(a.xs[i] - b.xs[i]), Math.abs(a.ys[i] - b.ys[i]));
    return m;
};

const startSampling = page => page.evaluate(() => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    window.__perf = {stamps: [], updates: [], on: true};
    const update = bd.update;
    bd.update = function timedUpdate(...args) {
        const start = performance.now(), result = update.apply(this, args);
        if (window.__perf.on) window.__perf.updates.push(performance.now() - start);
        return result;
    };
    const tick = ts => { if (window.__perf.on) { window.__perf.stamps.push(ts); requestAnimationFrame(tick); } };
    requestAnimationFrame(tick);
});
const stopSampling = page => page.evaluate(() => { window.__perf.on = false; return window.__perf; });

function assertStart(c, s) {
    if (c.evolute) {
        if (!(s.trace.n > 10)) throw new Error(`evolute trace has ${s.trace.n} points at the start`);
        if (!s.E) throw new Error('no evolute point E');
    } else if (c.comb) {
        if (!(s.tip.n > 0 && s.teeth.n > 0)) throw new Error(`comb on but tip has ${s.tip.n} and teeth ${s.teeth.n} points`);
    } else if (s.tip.n !== 0 || s.teeth.n !== 0) throw new Error(`comb off but tip has ${s.tip.n} and teeth ${s.teeth.n} points`);
}
function assertEnd(c, s0, s1) {
    if (c.evolute === 'point') {
        const m = shift(s0.trace, s1.trace);
        if (!(m > MIN_SHIFT)) throw new Error(`evolute trace did not change during the drag (shift ${m})`);
    } else if (c.evolute === 'slider') {
        if (!(s1.trace.n > 10)) throw new Error('evolute trace empty at the end');
        if (!(Math.hypot(s1.E[0] - s0.E[0], s1.E[1] - s0.E[1]) > MIN_SHIFT)) throw new Error('evolute point E did not move with the t slider');
    } else if (c.comb) {
        const m = shift(s0.tip, s1.tip), mt = shift(s0.teeth, s1.teeth);
        if (!(s1.tip.n > 0 && s1.teeth.n > 0)) throw new Error('comb empty at the drag end');
        if (!(m > MIN_SHIFT && mt > MIN_SHIFT)) throw new Error(`comb did not change during the drag (tip shift ${m}, teeth shift ${mt})`);
    } else assertStart(c, s1);
}

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        if (c.kind && c.kind !== 'cubic') {
            await page.getByLabel('Krivulja', {exact: true}).selectOption(c.kind);
            await page.waitForTimeout(800);
        }
        if (c.comb) {
            await page.getByLabel('Glavnik ukrivljenosti', {exact: true}).check();
            await page.waitForTimeout(500);
        }
        await page.evaluate(readBoard); await page.waitForTimeout(600);
        const s = await page.evaluate(readBoard);
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        let from, to;
        if (c.evolute === 'slider') {
            const box = await page.getByRole('slider', {name: 'Parameter t'}).boundingBox();
            if (!box) throw new Error('no t slider');
            from = [box.x + box.width * 0.1, box.y + box.height / 2]; to = [box.x + box.width * 0.9, box.y + box.height / 2];
        } else {
            if (!s.pts.length) throw new Error('no reachable draggable point');
            const grab = c.kind === 'cubic' || c.evolute ? s.pts[s.pts.length - 1] : s.pts[Math.floor(s.pts.length / 2)];
            const span = s.size[1] * 0.12;
            from = [s.rect[0] + grab.x, s.rect[1] + grab.y];
            c.path = f => [from[0] + span * Math.sin(2 * Math.PI * 0.75 * f), from[1] + span * (1 - Math.cos(2 * Math.PI * 0.75 * f))];
        }
        const pathAt = c.evolute === 'slider' ? f => [from[0] + (to[0] - from[0]) * f, from[1]] : c.path;
        await startSampling(page);
        await page.mouse.move(from[0], from[1]);
        await page.mouse.down();
        const s0 = await page.evaluate(snapshot); assertStart(c, s0);
        const t0 = await page.evaluate(() => performance.now());
        for (let i = 1; i <= steps; i++) {
            const [x, y] = pathAt(i / steps);
            await page.mouse.move(x, y);
            await page.waitForTimeout(dragMs / steps);
        }
        const t1 = await page.evaluate(() => performance.now());
        const s1 = await page.evaluate(snapshot);
        assertEnd(c, s0, s1);
        await page.mouse.up();
        const perf = await stopSampling(page);
        const samples = intervals(perf.stamps, t0, t1).slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (perf.updates.length < MIN_SAMPLES) throw new Error(`only ${perf.updates.length} board updates: the gesture moved nothing`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b), updates = [...perf.updates].sort((a, b) => a - b);
        const objects = (await page.evaluate(readBoard)).objects;
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length,
            updates: updates.length, updateMedian: median(updates), updateP95: pct(updates, 0.95), objects,
            tipPoints: s1.tip.n, teethPoints: s1.teeth.n, tracePoints: s1.trace.n, ownCurves: s1.ownCurves.join(',')};
    } finally { await context.close(); }
}

async function main() {
    const {chromium} = require('playwright');
    const cases = buildCases();
    if (!cases.length) throw new Error('PERF_ONLY matched no case');
    const runsOf = c => c.throttle ? runsThrottled : runs;
    const rounds = Math.max(...cases.map(runsOf));
    setTimeout(() => { console.error('comb-gate-perf: deadline exceeded'); process.exit(2); }, cases.length * rounds * (dragMs * 2 + 25000) + 60000).unref();
    const jsonIdx = process.argv.indexOf('--json');
    const outPath = process.env.PERF_OUT || (jsonIdx >= 0 ? process.argv[jsonIdx + 1] : '');
    const browser = await chromium.launch();
    const results = new Map(cases.map(c => [c.name, []]));
    const version = browser.version();
    console.log(`Chromium ${version}, viewport 1440x900, ${runs} runs (${runsThrottled} throttled), ${steps} steps over ${dragMs} ms, ${cases.length} cases interleaved`);
    let failure = null;
    try {
        for (let r = 0; r < rounds; r++) {
            for (const c of cases) {
                if (r >= runsOf(c)) continue;
                try { results.get(c.name).push(await runOnce(browser, {...c})); } catch (err) { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }
            }
        }
    } catch (err) { failure = err; } finally {
        await browser.close();
        const rows = [];
        console.log('\ncase | runs | frame median ms | frame p95 ms | frames >25 ms per run | update median ms | update p95 ms | board objects | tip/teeth/trace points');
        for (const c of cases) {
            const rs = results.get(c.name);
            if (!rs.length) continue;
            const row = {name: c.name, runs: rs.length, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), dropped: rs.map(x => x.dropped),
                updateMedian: median(rs.map(x => x.updateMedian)), updateP95: median(rs.map(x => x.updateP95)), objects: rs[0].objects,
                tipPoints: rs[0].tipPoints, teethPoints: rs[0].teethPoints, tracePoints: rs[0].tracePoints, raw: rs};
            rows.push(row);
            console.log(`${row.name} | ${row.runs} | ${row.median.toFixed(1)} | ${row.p95.toFixed(1)} | ${row.dropped.join('/')} | ${row.updateMedian.toFixed(2)} | ${row.updateP95.toFixed(2)} | ${row.objects} | ${row.tipPoints}/${row.teethPoints}/${row.tracePoints}`);
        }
        if (outPath) require('fs').writeFileSync(outPath, JSON.stringify({chromium: version, runs, runsThrottled, steps, dragMs, viewport: '1440x900', rows}, null, 1));
    }
    if (failure) throw failure;
}

if (require.main === module) main().catch(err => { console.error(`comb-gate-perf FAILED: ${err.message}`); process.exit(1); });
