// AB-B-2b drag measurement: the SHIPPED Bezier clipping graph (/bezier/clipping) on the production preview.
//   node scripts/clipping-gate-perf.cjs [--json out.json]     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4314/bezeg-2.0
// No injection: the real page is driven through its own controls (tolerance select, "Next", preset import dialog, mouse drag of a control point of B).
// Method of offset-gate-perf.cjs: rAF sampling only inside the gesture, warm-up dropped, time spent inside board.update, median over runs, cases interleaved.
// Cases: (1) default crossing pair, tolerance 1e-6; (2) tangent pair B=(0,4),(2,0),(4,4), 1e-10; (3) cubic pair crossing three times, 1e-10:
//   A=(0,-3),(3,-1),(6,1),(9,3), B=(1,-4),(3,7),(6,-7),(8,5). Each runs unthrottled and at CPU/4. Before the gesture "Next" is pressed 3 times, so the first
// move also resets a mid-run view. Every case asserts it is real: B_1 moved, the step returned to 1 ("step 0"), and after the drag, stepping forward 3 times
// shows a run from the new points (inset hull path, clip readout or table differs from the pre-gesture view at the same step). A failed assertion fails the run.
// Env: PERF_RUNS (3), PERF_RUNS_THROTTLED (3), PERF_STEPS (150), PERF_DRAG_MS (2000), PERF_ONLY (comma-separated substrings of case names), PERF_OUT or --json path.
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4314/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), runsThrottled = Number(process.env.PERF_RUNS_THROTTLED || 3);
const steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15, THROTTLE = 4, MIN_MOVE = 0.05, PRE_NEXT = 3;
const ROUTE = 'bezier/clipping';

const preset = (id, box, pts) => ({'preset-compgeo-bezier-clipping': {data: [{id, boardState: {boundingBox: box},
    graphState: {initialized: true, overlays: {control: true, hull: true, fatLine: true, kept: true, discarded: true}, step: 0, clipToleranceExponent: 6},
    data: {mode: 'points', closed: false, gridStepExponent: 0, points: pts.map(([x, y]) => ({x, y}))}}]}});
const TANGENT = preset('tangent', [-5, 6, 9, -3], [[0, 0], [2, 4], [4, 0], [0, 4], [2, 0], [4, 4]]);
const CUBIC = preset('cubic3', [-3, 8, 13, -8], [[0, -3], [3, -1], [6, 1], [9, 3], [1, -4], [3, 7], [6, -7], [8, 5]]);

function buildCases() {
    const defs = [
        {key: 'crossing pair, 1e-6', file: null, exponent: 6},
        {key: 'tangent pair, 1e-10', file: TANGENT, id: 'tangent', exponent: 10},
        {key: 'cubic pair (3 crossings), 1e-10', file: CUBIC, id: 'cubic3', exponent: 10},
    ];
    const cases = [];
    for (const d of defs) for (const throttle of [0, THROTTLE]) cases.push({...d, name: `${d.key}${throttle ? ` | CPU/${throttle}` : ''}`, throttle});
    const only = (process.env.PERF_ONLY || '').toLowerCase().split(',').filter(Boolean);
    return only.length ? cases.filter(c => only.some(o => c.name.toLowerCase().includes(o))) : cases;
}

const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };

/** In the page: scroll the board into view; screen position and model coordinates of B_1 if reachable. */
const readBoard = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const p = Object.values(bd.objects).find(o => o.elType === 'point' && o.name === 'B_1' && o.visPropCalc.visible);
    if (!p) return {rect: [r.x, r.y], size: [r.width, r.height], pt: null};
    const pt = {x: p.coords.scrCoords[1], y: p.coords.scrCoords[2], ux: p.X(), uy: p.Y()};
    pt.reachable = bd.containerObj.contains(document.elementFromPoint(r.x + pt.x, r.y + pt.y));
    return {rect: [r.x, r.y], size: [r.width, r.height], pt};
};
const readB1 = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    const p = Object.values(bd.objects).find(o => o.elType === 'point' && o.name === 'B_1');
    return p ? [p.X(), p.Y()] : null;
};
const readView = () => {
    const g = k => document.querySelector(`[data-bezier-clipping="${k}"]`);
    const t = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
    const stepNo = Number(((t(g('step')) || '').match(/\d+/) || [])[0]);
    return {step: stepNo, stepText: t(g('step')), clips: t(g('clips')), hull: g('inset-hull') ? g('inset-hull').getAttribute('d') : null,
        rows: [...document.querySelectorAll('[data-bezier-clipping="row"]')].map(t).join('|')};
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

async function pressNext(page, n) {
    const next = page.locator('[data-action="next-step"]');
    for (let i = 0; i < n; i++) { await next.click(); await page.waitForTimeout(150); }
}

async function loadFile(page, c) {
    const fs = require('fs'), path = require('path');
    const file = path.join(require('os').tmpdir(), `clipping-perf-${c.id}.json`);
    fs.writeFileSync(file, JSON.stringify(c.file));
    await page.getByRole('button', {name: 'Shrani', exact: true}).last().click();
    await page.getByRole('button', {name: 'Uvozi prednastavitve'}).click();
    await page.locator('input[type=file]').setInputFiles(file);
    await page.waitForTimeout(800);
    await page.locator('[role=dialog]').getByRole('button', {name: 'Uvozi', exact: true}).first().click();
    await page.waitForTimeout(500);
    await page.locator('select[aria-label="Prednastavitve"]').selectOption({label: c.id});
    await page.waitForTimeout(800);
    await page.getByRole('button', {name: 'Uredi', exact: true}).last().click();
    await page.waitForTimeout(500);
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
        if (c.file) await loadFile(page, c);
        await page.locator('select[data-bezier-clipping="tolerance"]').selectOption({value: String(c.exponent)});
        await page.waitForTimeout(500);
        const first = await page.evaluate(readView);
        await pressNext(page, PRE_NEXT);
        await page.evaluate(readBoard); await page.waitForTimeout(600);
        const s = await page.evaluate(readBoard);
        if (!s.pt) throw new Error('no B_1 point on the board');
        if (!s.pt.reachable) throw new Error('B_1 is not reachable (covered or off the board) ' + JSON.stringify(s));
        const before = await page.evaluate(readView);
        if (!(before.step > 1)) throw new Error(`the pre-gesture view is not mid-run (step ${before.step})`);
        if (!before.hull) throw new Error('no inset hull path before the gesture');
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        const span = s.size[1] * 0.12, from = [s.rect[0] + s.pt.x, s.rect[1] + s.pt.y];
        const pathAt = f => [from[0] + span * Math.sin(2 * Math.PI * 0.75 * f), from[1] + span * (1 - Math.cos(2 * Math.PI * 0.75 * f))];
        await startSampling(page);
        await page.mouse.move(from[0], from[1]);
        await page.mouse.down();
        const t0 = await page.evaluate(() => performance.now());
        for (let i = 1; i <= steps; i++) {
            const [x, y] = pathAt(i / steps);
            await page.mouse.move(x, y);
            await page.waitForTimeout(dragMs / steps);
        }
        const t1 = await page.evaluate(() => performance.now());
        const during = await page.evaluate(readB1);
        await page.mouse.up();
        const perf = await stopSampling(page);
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: 1});
        const moved = Math.hypot(during[0] - s.pt.ux, during[1] - s.pt.uy);
        if (!(moved > MIN_MOVE)) throw new Error(`B_1 did not move (${moved})`);
        const after = await page.evaluate(readView);
        if (after.step !== 1) throw new Error(`the step did not return to 0 (counter ${after.step})`);
        await pressNext(page, PRE_NEXT);
        const stepped = await page.evaluate(readView);
        if (stepped.step !== before.step) throw new Error(`stepping forward gave counter ${stepped.step}, expected ${before.step}`);
        // Early steps can coincide between runs, so the new run is compared with the old one at step 0 (counter text includes the run length).
        const key = v => JSON.stringify([v.stepText, v.clips, v.hull, v.rows]);
        if (key(after) === key(first)) throw new Error('the run did not change: step 0 view (counter, clip readout, inset hull, table) equals the pre-gesture step 0 view');
        const samples = intervals(perf.stamps, t0, t1).slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (perf.updates.length < MIN_SAMPLES) throw new Error(`only ${perf.updates.length} board updates: the gesture moved nothing`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b), updates = [...perf.updates].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length,
            updates: updates.length, updateMedian: median(updates), updateP95: pct(updates, 0.95), moved, runBefore: first.stepText, runAfter: after.stepText};
    } finally { await context.close(); }
}

async function main() {
    const {chromium} = require('playwright');
    const cases = buildCases();
    if (!cases.length) throw new Error('PERF_ONLY matched no case');
    const runsOf = c => c.throttle ? runsThrottled : runs;
    const rounds = Math.max(...cases.map(runsOf));
    setTimeout(() => { console.error('clipping-gate-perf: deadline exceeded'); process.exit(2); }, cases.length * rounds * (dragMs * 2 + 25000) + 60000).unref();
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
        console.log('\ncase | runs | frame median ms | frame p95 ms | frames >25 ms per run | update median ms | update p95 ms');
        for (const c of cases) {
            const rs = results.get(c.name);
            if (!rs.length) continue;
            const row = {name: c.name, runs: rs.length, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), dropped: rs.map(x => x.dropped),
                updateMedian: median(rs.map(x => x.updateMedian)), updateP95: median(rs.map(x => x.updateP95)), raw: rs};
            rows.push(row);
            console.log(`${row.name} | ${row.runs} | ${row.median.toFixed(1)} | ${row.p95.toFixed(1)} | ${row.dropped.join('/')} | ${row.updateMedian.toFixed(2)} | ${row.updateP95.toFixed(2)}`);
        }
        if (outPath) require('fs').writeFileSync(outPath, JSON.stringify({chromium: version, runs, runsThrottled, steps, dragMs, viewport: '1440x900', rows}, null, 1));
    }
    if (failure) throw failure;
}

if (require.main === module) main().catch(err => { console.error(`clipping-gate-perf FAILED: ${err.message}`); process.exit(1); });
