// CG-B2-1 curvature-comb drawing comparison on the production preview (spec docs/specs/curve-geometry-lessons.md, "Performance gate"; protocol docs/performance-plan.md):
//   node scripts/comb-browser-perf.cjs [--json out.json]     // PREVIEW_BASE_URL defaults to http://127.0.0.1:4314/bezeg-2.0
// The comb graph does not exist yet, so each approach is injected into the running page through window.JXG and the live board; no page code changes.
// Method of curvature-browser-perf.cjs: rAF sampling only inside the interaction, warm-up dropped, time spent inside board.update, median over runs,
// cases interleaved across runs (run 1 of every case, then run 2) so a load spike on the shared machine does not fall on one case.
//
// Approaches (all also draw the tip polyline, so the visual work is the same):
//   A  one JXG curve: every tooth as base, tip, NaN gap. Redrawn lazily: curve.updateDataArray runs inside board.update.
//   B  one JXG segment per tooth (endpoints are function-valued, auxiliary hidden points). Redrawn by JSXGraph's own element update inside board.update.
//   C  one SVG layer owned by the harness (absolutely positioned over the board container), one <path> of teeth and one of the tip polyline, rebuilt in a
//      wrapper after board.update returns; positions come from board.origin/unitX/unitY. The wrapper sits inside the timed board.update.
//   D  approach A with the tooth count tied to the view: one tooth per 8 CSS px of the control polygon's bounding-box diagonal, capped at 256 (min 8).
// Per tooth the in-page kernel (makeKernel, the same arithmetic as src/bezeg/impl/curve/curvature.ts sampleComb with polynomialBezierSource /
// splineSpanSource: de Casteljau r, hodograph r' and r'', kappa, left normal, tip = base - gain*kappa*N, length clamp to the span's extent, singular samples
// omitted) reads the control points live from the board on every update.
// Spline spans: the board exposes no spans, so they are rebuilt from the live points: the free (visible, non-fixed) points are the de Boor points P0..Pn-1,
// the visible fixed points are the computed Bezier points in creation order [first, (p,p2) per interior segment, last, joints J1..J(S-1)] with S=n-3 spans
// (C2CubicBezierSpline.ts); span s = [J_s, inner, inner, J_(s+1)], span 0 = [P0,P1,first,J1], last = [J,last,P(n-2),P(n-1)]. The setup asserts the count and
// that sampled span points lie on the board's own curve (so a wrong ordering fails the run). The drag moves a de Boor point (joins are computed, not
// draggable), the middle one, which moves the neighbouring joins.
// Every case asserts its comb is real (tooth count, DOM, tips follow the live points, tips changed from drag start to end); a failure fails the run.
// Env: PERF_RUNS (3), PERF_STEPS (150), PERF_DRAG_MS (2000), PERF_ONLY (comma-separated substring filters, case-insensitive), PERF_OUT or --json path, COMB_MUTATE=1 (the
// comb is not redrawn after setup: the assertions must fail).
const baseUrl = (process.env.PREVIEW_BASE_URL || 'http://127.0.0.1:4314/bezeg-2.0').replace(/\/$/, '');
const runs = Number(process.env.PERF_RUNS || 3), steps = Number(process.env.PERF_STEPS || 150), dragMs = Number(process.env.PERF_DRAG_MS || 2000);
const MIN_SAMPLES = 60, WARMUP = 15, THROTTLE = 4, TIP_TOL_PX = 1.5;
const LESSON = 'curve-geometry/curvature?example=lesson.curve-geometry.curve-curvature.curve-curvature';
const SCENES = {
    plain: {route: 'bezier/curve', label: 'plain cubic', free: 4},
    lesson: {route: LESSON, label: 'lesson cubic', free: 4, card: true},
    spline: {route: 'spline/c2spline', label: 'C2 spline', spline: true},
};

/** Self-contained comb arithmetic; serialised into the page (and required by an offline check). Mirrors curvature.ts. */
function makeKernel() {
    const SPEED_EPS = 1e-9, COMB_MIN = 8, COMB_MAX = 256, MAX_FACTOR = 1, SIGN = -1;
    function evalRows(t, rows) {
        const c = rows.map(r => [...r]), n = c.length;
        for (let r = 1; r < n; r++) for (let i = 0; i < n - r; i++) for (let k = 0; k < c[i].length; k++) c[i][k] = (1 - t) * c[i][k] + t * c[i + 1][k];
        return c[0];
    }
    const differences = rows => rows.slice(1).map((row, i) => row.map((v, k) => v - rows[i][k]));
    function polyDerivatives(rows, t) {
        const n = rows.length - 1, zero = [0, 0], p = evalRows(t, rows);
        if (n < 1) return {p, d1: zero, d2: zero};
        const delta = differences(rows), d1 = evalRows(t, delta).map(v => n * v);
        if (n < 2) return {p, d1, d2: zero};
        return {p, d1, d2: evalRows(t, differences(delta)).map(v => n * (n - 1) * v)};
    }
    function extent(rows) {
        let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
        for (const [x, y] of rows) { a = Math.min(a, x); c = Math.max(c, x); b = Math.min(b, y); d = Math.max(d, y); }
        const size = Math.hypot(c - a, d - b);
        return size > 0 ? size : 1;
    }
    /** One span as splineSpanSource(rows, 0, 1) + sampleComb(count, gain): pushes teeth into out {bx,by,tx,ty}, returns the number of singular samples. */
    function span(rows, count, gain, out) {
        const n = Math.min(COMB_MAX, Math.max(COMB_MIN, Math.round(Number.isFinite(count) ? count : COMB_MIN)));
        const scale = extent(rows), maxLength = MAX_FACTOR * scale, tStart = 0, h = 1;
        let singular = 0;
        for (let i = 0; i < n; i++) {
            const t = 0 + (1 - 0) * i / (n - 1);
            const q = polyDerivatives(rows, (t - tStart) / h);
            const d1x = q.d1[0] / h, d1y = q.d1[1] / h, d2x = q.d2[0] / (h * h), d2y = q.d2[1] / (h * h);
            const speed = Math.hypot(d1x, d1y);
            if (!Number.isFinite(speed) || speed === 0 || speed <= SPEED_EPS * scale) { singular++; continue; }
            const kappa = (d1x * d2y - d1y * d2x) / (speed * speed * speed);
            if (!Number.isFinite(kappa)) { singular++; continue; }
            const tx = d1x / speed, ty = d1y / speed, nx = -ty, ny = tx;
            const raw = SIGN * gain * kappa, clipped = Math.abs(raw) > maxLength, len = clipped ? Math.sign(raw) * maxLength : raw;
            out.bx.push(q.p[0]); out.by.push(q.p[1]); out.tx.push(q.p[0] + len * nx); out.ty.push(q.p[1] + len * ny);
        }
        return singular;
    }
    return {span, extent};
}

/** Runs in the page. spec: {approach, total, scene}. Installs the comb and returns the handles on window.__comb. */
function installComb({spec, kernelSource, mutate}) {
    const K = (0, eval)(`(${kernelSource})()`);
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    const objs = Object.values(bd.objects);
    const visible = o => o.visProp.visible !== false && o.visPropCalc.visible;
    const freePts = objs.filter(o => o.elType === 'point' && visible(o) && !o.visProp.fixed);
    const fixedPts = objs.filter(o => o.elType === 'point' && visible(o) && o.visProp.fixed);
    let spans;   // arrays of JXG points per span
    if (spec.spline) {
        const n = freePts.length, S = n - 3;
        if (S < 2 || fixedPts.length !== 3 * S - 3) throw new Error(`spline layout unexpected: ${n} free, ${fixedPts.length} fixed visible points`);
        const inner = fixedPts.slice(0, 2 * S - 2), joints = fixedPts.slice(2 * S - 2);
        spans = [[freePts[0], freePts[1], inner[0], joints[0]]];
        for (let s = 1; s <= S - 2; s++) spans.push([joints[s - 1], inner[2 * s - 1], inner[2 * s], joints[s]]);
        spans.push([joints[S - 2], inner[2 * S - 3], freePts[n - 2], freePts[n - 1]]);
    } else {
        if (freePts.length !== 4) throw new Error(`expected 4 free control points, found ${freePts.length}`);
        spans = [freePts];
    }
    const live = () => spans.map(sp => sp.map(p => [p.X(), p.Y()]));
    const toScr = (x, y) => [bd.origin.scrCoords[1] + x * bd.unitX, bd.origin.scrCoords[2] - y * bd.unitY];
    const polygon = () => { const all = freePts.map(p => [p.X(), p.Y()]); return all; };
    const gain = 0.4 * K.extent(polygon());
    /** Requested tooth count for the current state (fixed, or tied to the view for D). */
    const requested = () => {
        if (spec.approach !== 'D') return spec.total;
        const pts = polygon().map(([x, y]) => toScr(x, y));
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        const diag = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        return Math.min(256, Math.max(8, Math.ceil(diag / 8)));
    };
    /** Fresh comb from the live points: {bx,by,tx,ty, ends (tooth index where each span stops), singular, requested}. */
    const compute = () => {
        const out = {bx: [], by: [], tx: [], ty: []}, ends = [], rows = live(), req = requested();
        const per = Math.max(8, Math.min(256, Math.round(req / rows.length)));
        let singular = 0;
        for (const r of rows) { singular += K.span(r, per, gain, out); ends.push(out.bx.length); }
        return {...out, ends, singular, requested: per * rows.length};
    };
    const state = {c: null, dirty: true, frozen: false};
    const ensure = () => { if (state.dirty && !state.frozen) { state.c = compute(); state.dirty = false; } else if (!state.c) state.c = compute(); };
    const origUpdate = bd.update;
    const style = {strokeColor: '#c0392b', strokeWidth: 1, highlight: false, fixed: true, withLabel: false, name: '', fillColor: 'none'};
    const tipArrays = (c, conv) => {   // tip polyline per span with NaN between spans (never a line across a knot)
        const xs = [], ys = [];
        let from = 0;
        for (const end of c.ends) {
            for (let i = from; i < end; i++) { const p = conv(c.tx[i], c.ty[i]); xs.push(p[0]); ys.push(p[1]); }
            xs.push(NaN); ys.push(NaN); from = end;
        }
        return [xs, ys];
    };
    const idc = (x, y) => [x, y];
    const handles = {nodes: {}};
    if (spec.approach === 'A' || spec.approach === 'D' || spec.approach === 'B') {
        const mkTip = () => {
            const tip = bd.create('curve', [[], []], {...style, strokeColor: '#2471a3'});
            tip.updateDataArray = function () { ensure(); const [xs, ys] = tipArrays(state.c, idc); this.dataX = xs; this.dataY = ys; };
            handles.nodes.tip = tip;
        };
        if (spec.approach === 'B') {
            handles.segs = [];
            for (let i = 0; i < spec.total; i++) {
                const f = key => () => { ensure(); return i < state.c.bx.length ? state.c[key][i] : NaN; };
                handles.segs.push(bd.create('segment', [[f('bx'), f('by')], [f('tx'), f('ty')]], style));
            }
        } else {
            const teeth = bd.create('curve', [[], []], style);
            teeth.updateDataArray = function () {
                ensure();
                const c = state.c, xs = [], ys = [];
                for (let i = 0; i < c.bx.length; i++) { xs.push(c.bx[i], c.tx[i], NaN); ys.push(c.by[i], c.ty[i], NaN); }
                this.dataX = xs; this.dataY = ys;
            };
            handles.nodes.teeth = teeth;
        }
        mkTip();
        bd.update = function (...args) { state.dirty = true; return origUpdate.apply(this, args); };
    } else {
        const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('class', 'comb-harness-layer');
        svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5';
        const mk = color => { const p = document.createElementNS(NS, 'path'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', '1'); svg.appendChild(p); return p; };
        const teeth = mk('#c0392b'), tip = mk('#2471a3');
        bd.containerObj.appendChild(svg);
        const fmt = v => (Math.round(v * 100) / 100);
        const draw = () => {
            const c = state.c, d = [];
            for (let i = 0; i < c.bx.length; i++) { const a = toScr(c.bx[i], c.by[i]), b = toScr(c.tx[i], c.ty[i]); d.push(`M${fmt(a[0])} ${fmt(a[1])}L${fmt(b[0])} ${fmt(b[1])}`); }
            teeth.setAttribute('d', d.join(''));
            const [xs, ys] = tipArrays(c, toScr), t = [];
            let pen = false;
            for (let i = 0; i < xs.length; i++) { if (Number.isNaN(xs[i])) { pen = false; continue; } t.push(`${pen ? 'L' : 'M'}${fmt(xs[i])} ${fmt(ys[i])}`); pen = true; }
            tip.setAttribute('d', t.join(''));
        };
        handles.draw = draw; handles.svg = svg; handles.nodes = {teeth, tip};
        bd.update = function (...args) {
            const result = origUpdate.apply(this, args);
            if (!state.frozen) { state.dirty = true; ensure(); draw(); }
            return result;
        };
        state.dirty = true; ensure(); draw();
    }
    bd.update();                       // first render, before the timer wrapper exists
    if (mutate) state.frozen = true;   // deliberate mutation: the comb is never redrawn on drag

    const nums = s => (s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || []).map(Number);
    /** Reads what is actually drawn (DOM) and the comb recomputed fresh from the live points. */
    const snapshot = () => {
        const fresh = compute(), tipsPx = [];
        for (let i = 0; i < fresh.tx.length; i++) tipsPx.push(toScr(fresh.tx[i], fresh.ty[i]));
        let teethDom = 0, tipD;
        if (spec.approach === 'B') {
            for (const s of handles.segs) {
                const d = s.rendNode ? (s.rendNode.getAttribute('d') || '') : '';
                const x1 = s.rendNode ? s.rendNode.getAttribute('x1') : null;
                if ((d && !/NaN/.test(d) && /\d/.test(d)) || (x1 !== null && !/NaN/.test(x1))) teethDom++;
            }
            tipD = handles.nodes.tip.rendNode.getAttribute('d') || '';
        } else if (spec.approach === 'C') {
            teethDom = (handles.nodes.teeth.getAttribute('d').match(/M/g) || []).length;
            tipD = handles.nodes.tip.getAttribute('d') || '';
            if (!handles.svg.isConnected) throw new Error('SVG layer is detached');
        } else {
            teethDom = (handles.nodes.teeth.rendNode.getAttribute('d').match(/M/g) || []).length;
            tipD = handles.nodes.tip.rendNode.getAttribute('d') || '';
        }
        const drawn = nums(tipD), expect = tipsPx.flat();
        let maxErr = drawn.length === expect.length ? 0 : Infinity;
        for (let i = 0; i < Math.min(drawn.length, expect.length); i++) maxErr = Math.max(maxErr, Math.abs(drawn[i] - expect[i]));
        return {teethDom, expected: fresh.bx.length, requested: fresh.requested, singular: fresh.singular, drawnTips: drawn, tipError: maxErr,
            objects: Object.keys(bd.objects).length, gain};
    };
    // Spans must lie on the board's own curve (guards the spline ordering): sampled bases within 2 % of the control-polygon extent of the polyline.
    const curves = objs.filter(o => o.elType === 'curve' && visible(o));
    let onCurve = null;
    if (curves.length) {
        const poly = curves[0].points.filter(p => Number.isFinite(p.usrCoords[1]) && Number.isFinite(p.usrCoords[2])).map(p => [p.usrCoords[1], p.usrCoords[2]]);
        const c = compute(), tol = 0.02 * K.extent(polygon());
        const dist = (px, py) => {
            let best = Infinity;
            for (let i = 1; i < poly.length; i++) {
                const [ax, ay] = poly[i - 1], [bx, by] = poly[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
                const u = L > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
                best = Math.min(best, Math.hypot(px - (ax + u * dx), py - (ay + u * dy)));
            }
            return best;
        };
        let worst = 0;
        for (let i = 0; i < c.bx.length; i += Math.max(1, Math.floor(c.bx.length / 24))) worst = Math.max(worst, dist(c.bx[i], c.by[i]));
        onCurve = {worst, tol, polyPoints: poly.length};
    }
    window.__comb = {snapshot, state, onCurve, handles};
    return {onCurve, objects: Object.keys(bd.objects).length};
}

const mkCase = (scene, approach, total, throttle, extra = {}) => {
    const sc = SCENES[scene];
    const label = approach ? `${approach === 'D' ? 'D curve, tooth per 8 px' : `${approach} ${{A: 'curve', B: 'segments', C: 'svg'}[approach]} ${total}`}` : 'comb off';
    const name = `${sc.label} | ${label} | ${extra.width ? `${extra.width}px` : throttle ? `CPU/${throttle}` : 'CPU 1x'}`;
    return {name, scene, approach, total, throttle, ...extra};
};
function buildCases() {
    const cases = [];
    for (const throttle of [0, THROTTLE]) {
        cases.push(mkCase('plain', null, 0, throttle), mkCase('lesson', null, 0, throttle));
        for (const approach of ['A', 'B', 'C']) for (const total of [32, 64, 128, 256]) cases.push(mkCase('lesson', approach, total, throttle));
        cases.push(mkCase('lesson', 'D', 0, throttle));
        cases.push(mkCase('spline', null, 0, throttle));
        for (const approach of ['A', 'B', 'C']) for (const total of [64, 256]) cases.push(mkCase('spline', approach, total, throttle));
    }
    for (const approach of ['A', 'B', 'C']) cases.push(mkCase('lesson', approach, 256, 0, {width: 1920, height: 1080}));
    const only = (process.env.PERF_ONLY || '').toLowerCase().split(',').filter(Boolean);
    return only.length ? cases.filter(c => only.some(o => c.name.toLowerCase().includes(o))) : cases;
}

const pct = (s, q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const readBoard = () => {
    const boards = Object.values(window.JXG.boards), bd = boards[boards.length - 1];
    bd.containerObj.scrollIntoView({block: 'center'});
    const r = bd.containerObj.getBoundingClientRect();
    const shownObject = o => o.visProp.visible !== false && o.visPropCalc.visible;
    const free = Object.values(bd.objects).filter(o => o.elType === 'point' && shownObject(o) && !o.visProp.fixed);
    // Only points the pointer can reach: the lesson card may cover part of the board. index = position among the free points.
    const pts = free.map((o, index) => ({index, x: o.coords.scrCoords[1], y: o.coords.scrCoords[2]}))
        .filter(p => bd.containerObj.contains(document.elementFromPoint(r.x + p.x, r.y + p.y)));
    return {rect: [r.x, r.y], size: [r.width, r.height], pts, freePoints: free.length, objects: Object.keys(bd.objects).length};
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
const intervals = (stamps, t0, t1) => { const iv = []; for (let i = 1; i < stamps.length; i++) if (stamps[i - 1] >= t0 && stamps[i] <= t1) iv.push(stamps[i] - stamps[i - 1]); return iv; };

function assertComb(c, snap, when, expectedRequested) {
    const bad = [];
    if (snap.teethDom !== snap.expected) bad.push(`${snap.teethDom} teeth in the DOM, ${snap.expected} expected`);
    if (snap.expected + snap.singular !== snap.requested) bad.push(`${snap.expected} teeth + ${snap.singular} singular != ${snap.requested} requested`);
    if (expectedRequested !== undefined && snap.requested !== expectedRequested) bad.push(`${snap.requested} requested, expected ${expectedRequested}`);
    if (!(snap.tipError <= TIP_TOL_PX)) bad.push(`drawn tips differ from the fresh kernel by ${snap.tipError} px (limit ${TIP_TOL_PX})`);
    if (bad.length) throw new Error(`comb not real ${when}: ${bad.join('; ')}`);
}

async function runOnce(browser, c) {
    const sc = SCENES[c.scene];
    const context = await browser.newContext({viewport: {width: c.width || 1440, height: c.height || 900}, deviceScaleFactor: 1});
    try {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(String(e)));
        await page.goto(`${baseUrl}/${sc.route}`, {waitUntil: 'load'});
        await page.waitForFunction(() => window.JXG && Object.values(window.JXG.boards).length > 0, null, {timeout: 20000});
        await page.waitForTimeout(2000);
        // The lesson card covers the board's middle; a learner hides it to drag.
        if (sc.card) { await page.locator('section.guided-lesson').getByRole('button', {name: /^(Hide|Skrij)/}).first().click(); await page.waitForTimeout(400); }
        await page.evaluate(readBoard); await page.waitForTimeout(600);
        const s = await page.evaluate(readBoard);
        let setup = null;
        if (c.approach) {
            setup = await page.evaluate(installComb, {spec: {approach: c.approach, total: c.total, spline: !!sc.spline}, kernelSource: `${makeKernel}`, mutate: process.env.COMB_MUTATE === '1'});
            if (setup.onCurve && !(setup.onCurve.worst <= setup.onCurve.tol)) throw new Error(`comb spans are off the board curve: ${setup.onCurve.worst} > ${setup.onCurve.tol}`);
            await page.waitForTimeout(300);
        }
        if (c.throttle) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', {rate: c.throttle});
        if (!s.pts.length) throw new Error('no reachable draggable point');
        const grab = sc.spline ? s.pts[Math.floor(s.pts.length / 2)] : s.pts[s.pts.length - 1];
        const [ox, oy] = s.rect, span = s.size[1] * 0.12;
        const pathAt = f => [grab.x + span * Math.sin(2 * Math.PI * 0.75 * f), grab.y + span * (1 - Math.cos(2 * Math.PI * 0.75 * f))];   // 3/4 turn: ends away from the start
        await startSampling(page);
        await page.mouse.move(ox + grab.x, oy + grab.y);
        await page.mouse.down();
        let snap0 = null;
        if (c.approach) { snap0 = await page.evaluate(() => window.__comb.snapshot()); assertComb(c, snap0, 'at the drag start'); }
        const t0 = await page.evaluate(() => performance.now());
        for (let i = 1; i <= steps; i++) {
            const [x, y] = pathAt(i / steps);
            await page.mouse.move(ox + x, oy + y);
            await page.waitForTimeout(dragMs / steps);
        }
        const t1 = await page.evaluate(() => performance.now());
        let snap1 = null;
        if (c.approach) {
            snap1 = await page.evaluate(() => window.__comb.snapshot());
            let moved = snap0.drawnTips.length === snap1.drawnTips.length ? 0 : Infinity;
            if (moved === 0) for (let i = 0; i < snap0.drawnTips.length; i++) moved = Math.max(moved, Math.abs(snap0.drawnTips[i] - snap1.drawnTips[i]));
            if (!(moved > 2)) throw new Error(`comb tips did not change between the drag start and end (max shift ${moved} px)`);
            assertComb(c, snap1, 'at the drag end', c.approach === 'D' ? undefined : snap0.requested);
        }
        await page.mouse.up();
        const perf = await stopSampling(page);
        const iv = intervals(perf.stamps, t0, t1);
        const samples = iv.slice(WARMUP);
        if (samples.length < MIN_SAMPLES) throw new Error(`only ${samples.length} frame samples`);
        if (perf.updates.length < MIN_SAMPLES) throw new Error(`only ${perf.updates.length} board updates: the gesture moved nothing`);
        if (errors.length) throw new Error(`page errors: ${errors.join('; ')}`);
        const sorted = [...samples].sort((a, b) => a - b), updates = [...perf.updates].sort((a, b) => a - b);
        const objects = (await page.evaluate(readBoard)).objects;
        return {samples: samples.length, median: median(samples), p95: pct(sorted, 0.95), max: sorted[sorted.length - 1], dropped: samples.filter(x => x > 25).length,
            updates: updates.length, updateMedian: median(updates), updateP95: pct(updates, 0.95), objects, teeth: snap1 ? snap1.expected : 0, singular: snap1 ? snap1.singular : 0};
    } finally { await context.close(); }
}

async function main() {
    const {chromium} = require('playwright');
    const cases = buildCases();
    if (!cases.length) throw new Error('PERF_ONLY matched no case');
    // Deadline: generous per run (load + drag, doubled under throttle), then hard exit so a hung page cannot hold the shared machine.
    setTimeout(() => { console.error('comb-browser-perf: deadline exceeded'); process.exit(2); }, cases.length * runs * (dragMs * 2 + 25000) + 60000).unref();
    const jsonIdx = process.argv.indexOf('--json');
    const outPath = process.env.PERF_OUT || (jsonIdx >= 0 ? process.argv[jsonIdx + 1] : '');
    const browser = await chromium.launch();
    const results = new Map(cases.map(c => [c.name, []]));
    const version = browser.version();
    console.log(`Chromium ${version}, default viewport 1440x900 (1920x1080 where named), ${runs} runs, ${steps} steps over ${dragMs} ms, ${cases.length} cases interleaved`);
    let failure = null;
    try {
        for (let r = 0; r < runs; r++) {
            for (const c of cases) {
                try { results.get(c.name).push(await runOnce(browser, c)); } catch (err) { throw new Error(`${c.name} run ${r + 1}: ${err.message}`, {cause: err}); }
            }
        }
    } catch (err) { failure = err; } finally {
        await browser.close();
        const rows = [];
        console.log('\ncase | frame median ms | frame p95 ms | frames >25 ms per run | update median ms | update p95 ms | board objects | teeth');
        for (const c of cases) {
            const rs = results.get(c.name);
            if (!rs.length) continue;
            const row = {name: c.name, runs: rs.length, median: median(rs.map(x => x.median)), p95: median(rs.map(x => x.p95)), dropped: rs.map(x => x.dropped),
                updateMedian: median(rs.map(x => x.updateMedian)), updateP95: median(rs.map(x => x.updateP95)), objects: rs[0].objects, teeth: rs[0].teeth, raw: rs};
            rows.push(row);
            console.log(`${row.name} | ${row.median.toFixed(1)} | ${row.p95.toFixed(1)} | ${row.dropped.join('/')} | ${row.updateMedian.toFixed(2)} | ${row.updateP95.toFixed(2)} | ${row.objects} | ${row.teeth}`);
        }
        if (outPath) require('fs').writeFileSync(outPath, JSON.stringify({chromium: version, runs, steps, dragMs, viewport: '1440x900 (1920x1080 where named)', rows}, null, 1));
    }
    if (failure) throw failure;
}

if (require.main === module) main().catch(err => { console.error(`comb-browser-perf FAILED: ${err.message}`); process.exit(1); });
module.exports = {makeKernel};
