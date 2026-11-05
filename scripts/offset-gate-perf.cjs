// CG-B3 performance measurement: the SHIPPED curve-offset graph (/curve-geometry/offset) on the production preview. It settles the speed factor plot's rendering.
//   node scripts/offset-gate-perf.cjs [--json out.json]     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4314/bezeg-2.0
// No injection: the real page is driven through its own controls (sliders "Razdalja d" and "Število vzorcev vzporednice", switch "Graf faktorja hitrosti").
// Method of comb-gate-perf.cjs: rAF sampling only inside the interaction, warm-up dropped, time spent inside board.update, median over runs, cases interleaved.
// Every case starts at d = -1, where the parabola has two cusps, so cuspParameters does its full work. Every case asserts it is real: the dashed offset trace
// (the overlay's data curve, stroke width 2) has at least the requested samples and changes from gesture start to end, and the plot's path changes
// with it or is absent when the plot is off; a failed assertion fails the run.
// Env: PERF_RUNS (3), PERF_RUNS_THROTTLED (3), PERF_STEPS (150), PERF_DRAG_MS (2000), PERF_ONLY (comma-separated substrings of case names), PERF_OUT or --json path.
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4314/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), runsThrottled = Number(process.env.PERF_RUNS_THROTTLED || 3);
const steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15, THROTTLE = 4, MIN_SHIFT = 1e-3, START_D = -1;
const ROUTE = 'curve-geometry/offset';

function buildCases() {
    const cases = [];
    for (const gesture of ['point', 'slider']) for (const samples of [128, 512]) for (const plot of [false, true]) for (const throttle of [0, THROTTLE]) {
        const name = `${gesture === 'point' ? 'control point' : 'd slider'}, ${samples} samples, plot ${plot ? 'on' : 'off'}${throttle ? ` | CPU/${throttle}` : ''}`;
        cases.push({name, gesture, samples, plot, throttle});
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
    return {rect: [r.x, r.y], size: [r.width, r.height], pts, objects: Object.keys(bd.objects).length};
};
/** In the page: the offset trace's finite points, the shown cusp markers and the plot's path. */
const snapshot = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    const trace = Object.values(bd.objects).find(o => o.elType === 'curve' && Object.prototype.hasOwnProperty.call(o, 'updateDataArray') && o.visProp.strokewidth === 2);
    const xs = [], ys = [];
    for (let i = 0; trace && i < (trace.dataX || []).length; i++) if (Number.isFinite(trace.dataX[i]) && Number.isFinite(trace.dataY[i])) { xs.push(trace.dataX[i]); ys.push(trace.dataY[i]); }
    const cusps = Object.values(bd.objects).filter(o => o.elType === 'point' && o.visProp.face === '<>' && o.visPropCalc.visible).length;
    const path = document.querySelector('[data-testid="offset-speed-plot-curve"]');
    return {n: xs.length, xs, ys, cusps, plot: path ? path.getAttribute('d') : null};
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
    if (s.n < c.samples) throw new Error(`the trace has ${s.n} points for ${c.samples} samples`);
    if (s.cusps < 1) throw new Error('no cusp marker at the start');
    if (c.plot ? !s.plot : s.plot !== null) throw new Error(`plot ${c.plot ? 'on' : 'off'} but its path is ${JSON.stringify(s.plot)}`);
}
function assertEnd(c, s0, s1) {
    const m = shift(s0, s1);
    if (!(s1.n > 0 && m > MIN_SHIFT)) throw new Error(`the trace did not change during the gesture (${s1.n} points, shift ${m})`);
    if (c.plot && (!s1.plot || s1.plot === s0.plot)) throw new Error('the plot did not change during the gesture');
}

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${ROUTE}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        const distance = page.getByRole('slider', {name: 'Razdalja d'});
        await distance.fill(String(START_D));
        await page.getByRole('slider', {name: 'Število vzorcev vzporednice'}).fill(String(c.samples));
        await page.getByLabel('Osti vzporednice', {exact: true}).check();
        if (c.plot) await page.getByLabel('Graf faktorja hitrosti', {exact: true}).check();
        await page.waitForTimeout(500);
        await page.evaluate(readBoard); await page.waitForTimeout(600);
        const s = await page.evaluate(readBoard);
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        let pathAt, from;
        if (c.gesture === 'slider') {
            const box = await distance.boundingBox();
            if (!box) throw new Error('no d slider');
            // Across d = -1, from about -2 to about -0.3: the cusps move, then vanish.
            const y = box.y + box.height / 2, left = box.x + box.width * 0.15, right = box.x + box.width * 0.45;
            from = [left, y];
            pathAt = f => [left + (right - left) * f, y];
        } else {
            if (!s.pts.length) throw new Error('no reachable draggable point');
            const grab = s.pts[s.pts.length - 1], span = s.size[1] * 0.12;
            from = [s.rect[0] + grab.x, s.rect[1] + grab.y];
            pathAt = f => [from[0] + span * Math.sin(2 * Math.PI * 0.75 * f), from[1] + span * (1 - Math.cos(2 * Math.PI * 0.75 * f))];
        }
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
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length,
            updates: updates.length, updateMedian: median(updates), updateP95: pct(updates, 0.95), tracePoints: s1.n, cusps: s1.cusps};
    } finally { await context.close(); }
}

async function main() {
    const {chromium} = require('playwright');
    const cases = buildCases();
    if (!cases.length) throw new Error('PERF_ONLY matched no case');
    const runsOf = c => c.throttle ? runsThrottled : runs;
    const rounds = Math.max(...cases.map(runsOf));
    setTimeout(() => { console.error('offset-gate-perf: deadline exceeded'); process.exit(2); }, cases.length * rounds * (dragMs * 2 + 25000) + 60000).unref();
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
        console.log('\ncase | runs | frame median ms | frame p95 ms | frames >25 ms per run | update median ms | update p95 ms | trace points | cusps at end');
        for (const c of cases) {
            const rs = results.get(c.name);
            if (!rs.length) continue;
            const row = {name: c.name, runs: rs.length, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), dropped: rs.map(x => x.dropped),
                updateMedian: median(rs.map(x => x.updateMedian)), updateP95: median(rs.map(x => x.updateP95)), tracePoints: rs[0].tracePoints, cusps: rs[0].cusps, raw: rs};
            rows.push(row);
            console.log(`${row.name} | ${row.runs} | ${row.median.toFixed(1)} | ${row.p95.toFixed(1)} | ${row.dropped.join('/')} | ${row.updateMedian.toFixed(2)} | ${row.updateP95.toFixed(2)} | ${row.tracePoints} | ${row.cusps}`);
        }
        if (outPath) require('fs').writeFileSync(outPath, JSON.stringify({chromium: version, runs, runsThrottled, steps, dragMs, viewport: '1440x900', rows}, null, 1));
    }
    if (failure) throw failure;
}

if (require.main === module) main().catch(err => { console.error(`offset-gate-perf FAILED: ${err.message}`); process.exit(1); });
