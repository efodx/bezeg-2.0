// Standalone harness for scripts/epicycle-perf.cjs (Fourier series 06 Batch C step 1, ADR 0034 section 3). Not part of the app.
// Query: approach=a|b1|b2, N, S (trace samples), w, h.
//   a  = 2N circles and arms as individual JSXGraph objects (circle + segment + point per term)
//   b1 = arm chain as one polyline curve, circles only for the first 5 terms (JSXGraph circles)
//   b2 = arm chain as one polyline curve, all circles as one NaN-separated curve
// Formulas copied from src/analysis/closedSpline.ts and fourier.ts (equal parametrization, 16 Gauss nodes per span); nothing is imported.
(() => {
    const q = new URLSearchParams(location.search);
    const approach = q.get('approach') || 'a', W = Number(q.get('w') || 1280), H = Number(q.get('h') || 720);
    let N = Number(q.get('N') || 25);
    const S = Number(q.get('S') || 2000);
    const TWO_PI = 2 * Math.PI, SPANS = 6, NODES = 16, CIRCLE_PTS = 48, FIRST_CIRCLES = 5;
    const box = document.getElementById('box');
    box.style.width = W + 'px'; box.style.height = H + 'px';

    // closed loop of 6 cubic spans; anchor 0 is the dragged vertex
    const anchors = [], ctrl = [];
    for (let j = 0; j < SPANS; j++) {
        const th = TWO_PI * j / SPANS, r = 2.4 + 0.6 * Math.sin(3 * th + 0.5);
        anchors.push({x: r * Math.cos(th), y: r * Math.sin(th)});
    }
    for (let j = 0; j < SPANS; j++) {
        const a = anchors[j], b = anchors[(j + 1) % SPANS], dx = b.x - a.x, dy = b.y - a.y;
        ctrl.push([{x: a.x + dx / 3 - 0.5 * dy, y: a.y + dy / 3 + 0.5 * dx}, {x: b.x - dx / 3 - 0.3 * dy, y: b.y - dy / 3 + 0.3 * dx}]);
    }
    const board = JXG.JSXGraph.initBoard('box', {boundingbox: [-5, 3.5, 5, -3.5], axis: false, grid: false, showNavigation: false,
        showCopyright: false, pan: {enabled: false}, zoom: {enabled: false}, renderer: 'svg'});
    const anchorPts = anchors.map(p => board.create('point', [p.x, p.y], {name: '', size: 5, fillColor: '#37a', strokeColor: '#37a'}));
    const ctrlPts = ctrl.map(c => c.map(p => board.create('point', [p.x, p.y], {name: '', size: 3, fillColor: '#999', strokeColor: '#999', fixed: true})));

    // Gauss-Legendre nodes on [-1, 1]
    const gl = (() => {
        const x = [], w = [];
        for (let i = 0; i < NODES; i++) {
            let z = Math.cos(Math.PI * (i + 0.75) / (NODES + 0.5)), dp = 1;
            for (let it = 0; it < 50; it++) {
                let p0 = 1, p1 = z;
                for (let k = 2; k <= NODES; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; }
                dp = NODES * (z * p1 - p0) / (z * z - 1);
                const dz = p1 / dp; z -= dz;
                if (Math.abs(dz) < 1e-15) break;
            }
            x.push(z); w.push(2 / ((1 - z * z) * dp * dp));
        }
        return {x, w};
    })();
    const spanPts = j => [anchorPts[j], ctrlPts[j][0], ctrlPts[j][1], anchorPts[(j + 1) % SPANS]].map(p => [p.X(), p.Y()]);
    const bez = (P, u) => {
        let xs = P.map(p => p[0]), ys = P.map(p => p[1]);
        while (xs.length > 1) {
            const nx = [], ny = [];
            for (let i = 0; i + 1 < xs.length; i++) { nx.push((1 - u) * xs[i] + u * xs[i + 1]); ny.push((1 - u) * ys[i] + u * ys[i + 1]); }
            xs = nx; ys = ny;
        }
        return [xs[0], ys[0]];
    };

    // state caches, keyed on the loop geometry (version), N and t
    let geomKey = '', version = 0, coefN = -1, coefVersion = -1, terms = [], loopX = [], loopY = [];
    let traceKey = '', traceX = [], traceY = [], chain = null, chainKey = '', t = 0;
    const geometry = () => {
        const key = anchorPts.map(p => p.X() + ',' + p.Y()).join(';');
        if (key !== geomKey) { geomKey = key; version++; }
    };
    const loopCurve = () => { // the original loop as sampled points, 40 per span
        loopX = []; loopY = [];
        for (let j = 0; j < SPANS; j++) { const P = spanPts(j); for (let i = 0; i <= 40; i++) { const z = bez(P, i / 40); loopX.push(z[0]); loopY.push(z[1]); } }
    };
    const coefficients = () => {
        geometry();
        if (coefN === N && coefVersion === version) return;
        const nodeT = [], nodeW = [], nodeZ = [];
        for (let j = 0; j < SPANS; j++) {
            const P = spanPts(j), lo = TWO_PI * j / SPANS, hi = TWO_PI * (j + 1) / SPANS;
            for (let i = 0; i < NODES; i++) { nodeT.push((lo + hi) / 2 + (hi - lo) / 2 * gl.x[i]); nodeW.push((hi - lo) / 2 * gl.w[i]); nodeZ.push(bez(P, (1 + gl.x[i]) / 2)); }
        }
        const list = [];
        for (let k = -N; k <= N; k++) {
            let re = 0, im = 0;
            for (let i = 0; i < nodeT.length; i++) {
                const c = Math.cos(k * nodeT[i]), s = Math.sin(k * nodeT[i]); // z * e^{-ikt}
                re += nodeW[i] * (nodeZ[i][0] * c + nodeZ[i][1] * s); im += nodeW[i] * (nodeZ[i][1] * c - nodeZ[i][0] * s);
            }
            list.push({k, re: re / TWO_PI, im: im / TWO_PI, abs: Math.hypot(re, im) / TWO_PI});
        }
        const c0 = list.find(c => c.k === 0);
        terms = list.filter(c => c.k !== 0).sort((a, b) => (Math.abs(a.abs - b.abs) <= 1e-12 * Math.max(a.abs, b.abs) ? a.k - b.k : b.abs - a.abs));
        terms.unshift(c0); // chain centre
        coefN = N; coefVersion = version; loopCurve(); traceKey = ''; chainKey = '';
    };
    const traceData = () => { // full approximation z_N(s) at S samples, by the recurrence w^k = w^(k-1) w
        coefficients();
        const key = version + ':' + N + ':' + S;
        if (key === traceKey) return;
        traceKey = key; traceX = new Array(S); traceY = new Array(S);
        const byK = new Map(terms.map(c => [c.k, c]));
        for (let i = 0; i < S; i++) {
            const s = TWO_PI * i / (S - 1), wr = Math.cos(s), wi = Math.sin(s);
            const c0 = byK.get(0);
            let re = c0.re, im = c0.im, pr = 1, pi = 0;
            for (let k = 1; k <= N; k++) {
                const nr = pr * wr - pi * wi; pi = pr * wi + pi * wr; pr = nr;
                const a = byK.get(k), b = byK.get(-k); // a w^k + b conj(w^k)
                re += a.re * pr - a.im * pi + b.re * pr + b.im * pi;
                im += a.re * pi + a.im * pr + b.im * pr - b.re * pi;
            }
            traceX[i] = re; traceY[i] = im;
        }
    };
    const chainData = () => { // joint positions of the chain at time t; circle j is centred on joint j
        coefficients();
        const key = version + ':' + N + ':' + t;
        if (key === chainKey && chain) return chain;
        chainKey = key;
        const px = [terms[0].re], py = [terms[0].im], rad = [];
        for (let j = 1; j < terms.length; j++) {
            const c = terms[j], a = c.k * t, co = Math.cos(a), si = Math.sin(a);
            px.push(px[j - 1] + c.re * co - c.im * si); py.push(py[j - 1] + c.re * si + c.im * co); rad.push(c.abs);
        }
        return (chain = {px, py, rad});
    };
    const traceIndex = () => Math.max(1, Math.min(S, Math.floor((t % TWO_PI) / TWO_PI * (S - 1)) + 1));

    // drawing objects
    const base = {highlight: false, fixed: true, withLabel: false};
    const loopObj = board.create('curve', [[], []], {strokeColor: '#999', strokeWidth: 2, highlight: false});
    loopObj.updateDataArray = function () { coefficients(); this.dataX = loopX; this.dataY = loopY; };
    const traceObj = board.create('curve', [[], []], {strokeColor: '#c33', strokeWidth: 2, highlight: false});
    traceObj.updateDataArray = function () { traceData(); const n = traceIndex(); this.dataX = traceX.slice(0, n); this.dataY = traceY.slice(0, n); };

    let owned = []; // chain objects created for the current N (approaches a and b1)
    const hid = {visible: false, fixed: true, withLabel: false, name: ''};
    const joint = j => board.create('point', [() => chainData().px[j], () => chainData().py[j]], hid);
    const buildA = () => {
        const pts = [];
        coefficients();
        for (let j = 0; j <= 2 * N; j++) pts.push(joint(j));
        for (let j = 0; j < 2 * N; j++) {
            owned.push(board.create('circle', [pts[j], () => chainData().rad[j]], {...base, strokeColor: '#aaa', strokeWidth: 1}));
            owned.push(board.create('segment', [pts[j], pts[j + 1]], {...base, strokeColor: '#555', strokeWidth: 1}));
        }
        owned.push(...pts);
    };
    const buildB1 = () => {
        const pts = [];
        for (let j = 0; j < FIRST_CIRCLES; j++) pts.push(joint(j));
        for (let j = 0; j < FIRST_CIRCLES; j++) owned.push(board.create('circle', [pts[j], () => chainData().rad[j]], {...base, strokeColor: '#aaa', strokeWidth: 1}));
        owned.push(...pts);
    };
    const unit = Array.from({length: CIRCLE_PTS + 1}, (_, i) => [Math.cos(TWO_PI * i / CIRCLE_PTS), Math.sin(TWO_PI * i / CIRCLE_PTS)]);
    if (approach !== 'a') {
        const chainObj = board.create('curve', [[], []], {strokeColor: '#555', strokeWidth: 1, highlight: false});
        chainObj.updateDataArray = function () { const c = chainData(); this.dataX = c.px; this.dataY = c.py; };
    }
    if (approach === 'b2') {
        const circleObj = board.create('curve', [[], []], {strokeColor: '#aaa', strokeWidth: 1, highlight: false});
        circleObj.updateDataArray = function () {
            const c = chainData(), X = [], Y = [];
            for (let j = 0; j < c.rad.length; j++) {
                for (const u of unit) { X.push(c.px[j] + c.rad[j] * u[0]); Y.push(c.py[j] + c.rad[j] * u[1]); }
                X.push(NaN); Y.push(NaN);
            }
            this.dataX = X; this.dataY = Y;
        };
    }
    const rebuild = () => {
        board.suspendUpdate();
        for (const o of owned) board.removeObject(o);
        owned = [];
        if (approach === 'a') buildA(); else if (approach === 'b1') buildB1();
        board.unsuspendUpdate();
    };
    rebuild(); board.update();

    const api = {
        board, approach,
        point: () => { const r = board.containerObj.getBoundingClientRect(); return {x: r.x + anchorPts[0].coords.scrCoords[1], y: r.y + anchorPts[0].coords.scrCoords[2], w: W, h: H}; },
        setT(v) { t = v; board.update(); },
        setN(v) { N = v; rebuild(); board.update(); },
        counts: () => ({objects: Object.keys(board.objects).length, dom: box.querySelectorAll('*').length, terms: 2 * N + 1}),
        play(on) { // playback: one time step per animation frame
            api._on = on;
            if (!on) return;
            const tick = () => { if (!api._on) return; api.setT(t + TWO_PI / 300); requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
        },
        bench(kind, n) { // synchronous main-thread cost per operation in ms (JS only, no paint); first 20 runs are warm-up
            const out = [], ns = [10, 25, 50, 25, 10], a0 = anchors[0];
            for (let k = 0; k < n + 20; k++) {
                const t0 = performance.now();
                if (kind === 'play') api.setT(t + TWO_PI / 300);
                else if (kind === 'nsweep') api.setN(ns[k % 5]);
                else anchorPts[0].moveTo([a0.x + 0.8 * Math.sin(k / 7), a0.y + 0.8 * Math.sin(k / 5)]);
                if (k >= 20) out.push(performance.now() - t0);
            }
            out.sort((a, b) => a - b);
            return {median: out[out.length >> 1], p95: out[Math.floor(0.95 * out.length)], max: out[out.length - 1]};
        },
        ready: true,
    };
    window.H = api;
})();
