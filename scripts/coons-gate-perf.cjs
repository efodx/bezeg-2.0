// AB-C-P drag measurement: dragging a control point on the SHIPPED Coons patch route (/patches/coons) on the production preview.
//   node scripts/coons-gate-perf.cjs [--json out.json]     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4314/bezeg-2.0
// Method of clipping-gate-perf.cjs: the real page, a mouse drag of a point3d control point of the JSXGraph surface view (its screen position comes from the
// host's data-surface-framing attribute), rAF sampling only inside the gesture, warm-up dropped, time spent inside board.update, cases interleaved, median over runs.
// Cases (each unthrottled and CPU/4): (1) default scene, c0-1; (2) default scene, linked corner c0-3 (moves c0 and d1 end points);
// (3) linked corners off, c0-3 alone (corner status turns to mismatch); (4) reference, not pass/fail: /patches/tensor default scene, interior point p-1-1.
// Every case asserts it is real: the point moved, the projected mesh paths changed, the interior-net readout changed (cases 1-3), the corner status is
// met after cases 1-2 and mismatch after case 3, enough frames and board updates, no page error.
// Env: PERF_RUNS (3), PERF_RUNS_THROTTLED (3), PERF_STEPS (150), PERF_DRAG_MS (2000), PERF_ONLY (substrings of case names), PERF_OUT or --json path.
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4314/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), runsThrottled = Number(process.env.PERF_RUNS_THROTTLED || 3);
const steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15, THROTTLE = 4, MIN_MOVE = 5;

const DEFS = [
    {key: '1 coons c0-1 inner', route: 'patches/coons', point: 'c0-1', linked: true, status: 'met'},
    {key: '2 coons linked corner c0-3', route: 'patches/coons', point: 'c0-3', linked: true, status: 'met'},
    {key: '3 coons unlinked end c0-3', route: 'patches/coons', point: 'c0-3', also: 'd1-0', linked: false, status: 'mismatch'},
    {key: '4 tensor p-1-1 (reference)', route: 'patches/tensor', point: 'p-1-1', linked: null, status: null},
];
function buildCases() {
    const cases = [];
    for (const d of DEFS) for (const throttle of [0, THROTTLE]) cases.push({...d, name: `${d.key}${throttle ? ` | CPU/${throttle}` : ''}`, throttle});
    const only = (process.env.PERF_ONLY || '').toLowerCase().split(',').filter(Boolean);
    return only.length ? cases.filter(c => only.some(o => c.name.toLowerCase().includes(o))) : cases;
}

const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };

/** In the page: the surface host's rect, the framing points, a mesh signature, the corner status and the interior-net readout text. */
const readView = () => {
    const host = document.querySelector('[data-surface-framing]');
    const r = host.getBoundingClientRect();
    const fr = JSON.parse(host.getAttribute('data-surface-framing'));
    const paths = [...host.querySelectorAll('[data-jsx-surface-view] svg path')].map(p => p.getAttribute('d') || '');
    let h = 5381; for (const d of paths) for (let i = 0; i < d.length; i++) h = ((h * 33) ^ d.charCodeAt(i)) >>> 0;
    const st = document.querySelector('[data-corner-status]');
    let readout = null;
    if (st) { const clone = st.parentElement.cloneNode(true); const s2 = clone.querySelector('[data-corner-status]'); if (s2) s2.remove(); readout = clone.innerText || clone.textContent; readout = readout.replace(/\s+/g, ' ').trim(); }
    return {rect: [r.x, r.y, r.width, r.height], points: fr.points, paths: paths.length, hash: h, status: st ? st.getAttribute('data-corner-status') : null, readout};
};
const reachable = ([x, y]) => { const host = document.querySelector('[data-surface-framing]'); const e = document.elementFromPoint(x, y); return !!e && host.contains(e); };

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

async function runOnce(browser, c) {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${c.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0 && document.querySelector('[data-surface-framing]'), null, {timeout: 20000});
        await page.waitForTimeout(2500);
        if (c.linked === false) {
            const sw = page.getByLabel('Povezani vogali', {exact: true});
            await sw.click(); await page.waitForTimeout(1500);
            if (await sw.isChecked()) throw new Error('linked corners did not switch off');
        }
        if (c.linked === true) {
            for (const label of ['Kontrolna mreža', 'Senčena krpa']) if (!(await page.getByLabel(label, {exact: true}).isChecked())) throw new Error(`${label} is off`);
        }
        await page.waitForTimeout(600);
        const before = await page.evaluate(readView);
        const pt = before.points.find(p => p.id === c.point);
        if (!pt) throw new Error(`no framing point ${c.point}`);
        const from = [before.rect[0] + pt.x, before.rect[1] + pt.y];
        if (!(await page.evaluate(reachable, from))) throw new Error('control point is off the surface host');
        if (c.linked && before.status !== 'met') throw new Error(`status before: ${before.status}`);
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        const span = before.rect[3] * 0.12;
        const pathAt = f => [from[0] + span * Math.sin(2 * Math.PI * 0.75 * f), from[1] + span * (1 - Math.cos(2 * Math.PI * 0.75 * f))];
        await startSampling(page);
        await page.mouse.move(from[0], from[1]); await page.waitForTimeout(300);
        await page.mouse.down();
        const t0 = await page.evaluate(() => performance.now());
        for (let i = 1; i <= steps; i++) {
            const [x, y] = pathAt(i / steps);
            await page.mouse.move(x, y);
            await page.waitForTimeout(dragMs / steps);
        }
        const t1 = await page.evaluate(() => performance.now());
        await page.mouse.up();
        const perf = await stopSampling(page);
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: 1});
        await page.waitForTimeout(500);
        const after = await page.evaluate(readView);
        // Unlinked, the two end points of the corner share a place and the topmost one is grabbed: either may be the one that moved (never both).
        const shift = id => { const a = before.points.find(p => p.id === id), b = after.points.find(p => p.id === id); return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0; };
        const moved = Math.max(shift(c.point), c.also ? shift(c.also) : 0);
        if (c.also && shift(c.point) > MIN_MOVE && shift(c.also) > MIN_MOVE) throw new Error('both end points moved with linked corners off: ' + after.status + ' ' + (await page.getByLabel('Povezani vogali', {exact: true}).isChecked()) + ' ' + JSON.stringify([before.points.filter(p => /c0-3|d1-0/.test(p.id)), after.points.filter(p => /c0-3|d1-0/.test(p.id))]));
        // The camera must not have been orbited by a missed grab (it would move every point): an untouched point stays.
        const ref = before.points.find(p => p.id === (c.route.endsWith('coons') ? 'c1-1' : 'p-3-3')), refAfter = after.points.find(p => ref && p.id === ref.id);
        if (!ref || !refAfter || Math.hypot(ref.x - refAfter.x, ref.y - refAfter.y) > 0.5) throw new Error('an untouched point moved: the press missed the control point and orbited the camera');
        if (!(moved > MIN_MOVE)) throw new Error(`control point ${c.point} did not move (${moved} px)`);
        if (after.hash === before.hash) throw new Error('the projected mesh paths did not change');
        if (c.linked !== null && (!before.readout || after.readout === before.readout)) throw new Error(`interior-net readout did not change: ${before.readout}`);
        if (c.status && after.status !== c.status) throw new Error(`corner status after: ${after.status}, expected ${c.status}`);
        const samples = intervals(perf.stamps, t0, t1).slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (perf.updates.length < MIN_SAMPLES) throw new Error(`only ${perf.updates.length} board updates: the gesture moved nothing`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b), updates = [...perf.updates].sort((a, b) => a - b);
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length,
            updates: updates.length, updateMedian: median(updates), updateP95: pct(updates, 0.95), movedPx: moved, meshPaths: after.paths, statusAfter: after.status};
    } finally { await context.close(); }
}

async function main() {
    const {chromium} = require('playwright');
    const cases = buildCases();
    if (!cases.length) throw new Error('PERF_ONLY matched no case');
    const runsOf = c => c.throttle ? runsThrottled : runs;
    const rounds = Math.max(...cases.map(runsOf));
    setTimeout(() => { console.error('coons-gate-perf: deadline exceeded'); process.exit(2); }, cases.length * rounds * (dragMs * 2 + 25000) + 60000).unref();
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

if (require.main === module) main().catch(err => { console.error(`coons-gate-perf FAILED: ${err.message}`); process.exit(1); });
