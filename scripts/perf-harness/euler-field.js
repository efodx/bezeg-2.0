// Standalone harness for scripts/euler-field-perf.cjs (numerical-methods 07 step 1). Not part of the app.
// Query: approach=a|b|c|d, nx, ny, w, h. Field y' = x - y; Euler polyline from a draggable point; exact curve dashed.
(() => {
    const q = new URLSearchParams(location.search);
    const approach = q.get('approach') || 'a', W = Number(q.get('w') || 1280), H = Number(q.get('h') || 720);
    const nx = approach === 'd' ? 11 : Number(q.get('nx') || 21), ny = approach === 'd' ? 8 : Number(q.get('ny') || 15);
    const f = (x, y) => x - y;
    const box = document.getElementById('box');
    box.style.width = W + 'px'; box.style.height = H + 'px';
    const bb0 = [-5, 3, 5, -3];
    let canvas = null;
    if (approach === 'c') {
        canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = 'position:absolute;left:0;top:0;z-index:0';
        box.appendChild(canvas);
    }
    const board = JXG.JSXGraph.initBoard('box', {boundingbox: bb0, axis: false, grid: false, showNavigation: false, showCopyright: false,
        pan: {enabled: false}, zoom: {enabled: false}, renderer: 'svg'});
    if (canvas) { board.containerObj.style.position = 'absolute'; board.containerObj.style.zIndex = '1'; }

    const field = bb => { // one short segment per grid node, direction fixed in screen space
        const [xmin, ymax, xmax, ymin] = bb, sx = W / (xmax - xmin), sy = H / (ymax - ymin), L = 0.4 * Math.min(W / nx, H / ny);
        const out = [];
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
            const x = xmin + i * (xmax - xmin) / (nx - 1), y = ymin + j * (ymax - ymin) / (ny - 1);
            const vx = sx, vy = f(x, y) * sy, n = Math.hypot(vx, vy), dx = L * vx / n / sx, dy = L * vy / n / sy;
            out.push([x - dx, y - dy, x + dx, y + dy]);
        }
        return out;
    };
    let cur = field(bb0), segs = [], fieldCurve = null;
    const style = {strokeColor: '#555', strokeWidth: 1, highlight: false, fixed: true, withLabel: false};
    const hid = {visible: false, fixed: true, withLabel: false, name: ''};
    if (approach === 'a' || approach === 'd') {
        segs = cur.map(s => board.create('segment', [board.create('point', [s[0], s[1]], hid), board.create('point', [s[2], s[3]], hid)], style));
    } else if (approach === 'b') {
        fieldCurve = board.create('curve', [[], []], style);
        fieldCurve.updateDataArray = function () {
            this.dataX = []; this.dataY = [];
            for (const s of cur) { this.dataX.push(s[0], s[2], NaN); this.dataY.push(s[1], s[3], NaN); }
        };
    }
    const draw = () => { // approach c: whole field on one canvas, redrawn on every board update
        const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.beginPath();
        for (const s of field(board.getBoundingBox())) {
            const a = new JXG.Coords(JXG.COORDS_BY_USER, [s[0], s[1]], board), b = new JXG.Coords(JXG.COORDS_BY_USER, [s[2], s[3]], board);
            ctx.moveTo(a.scrCoords[1], a.scrCoords[2]); ctx.lineTo(b.scrCoords[1], b.scrCoords[2]);
        }
        ctx.stroke();
    };
    if (canvas) board.on('update', draw);

    const P = board.create('point', [-4, 2], {name: '', size: 6, fillColor: '#c33', strokeColor: '#c33'});
    let h = 0.125;
    const euler = board.create('curve', [[], []], {strokeColor: '#c33', strokeWidth: 2});
    euler.updateDataArray = function () {
        const x0 = P.X(), xEnd = board.getBoundingBox()[2], steps = Math.min(320, Math.max(1, Math.ceil((xEnd - x0) / h - 1e-9)));
        this.dataX = [x0]; this.dataY = [P.Y()];
        let x = x0, y = P.Y();
        for (let k = 0; k < steps; k++) { y += h * f(x, y); x += h; this.dataX.push(x); this.dataY.push(y); }
    };
    const exact = board.create('functiongraph', [x => x - 1 + (P.Y() - P.X() + 1) * Math.exp(P.X() - x)], {strokeColor: '#37a', dash: 2, strokeWidth: 2});
    board.update();

    window.H = {
        board, approach, nx, ny,
        point: () => { const r = board.containerObj.getBoundingClientRect(); return {x: r.x + P.coords.scrCoords[1], y: r.y + P.coords.scrCoords[2], w: W, h: H}; },
        setStep(v) { h = v; board.update(); },
        setView(bb) { // zoom or pan: the field depends on the window, so it is regenerated
            cur = field(bb);
            if (segs.length) segs.forEach((sg, i) => { sg.point1.setPosition(JXG.COORDS_BY_USER, [cur[i][0], cur[i][1]]); sg.point2.setPosition(JXG.COORDS_BY_USER, [cur[i][2], cur[i][3]]); });
            board.setBoundingBox(bb, false);
        },
        counts: () => ({objects: Object.keys(board.objects).length, dom: box.querySelectorAll('*').length, arrows: nx * ny}),
        bench(kind, n) { // synchronous main-thread cost per operation in ms (JS only, no paint); first 20 runs are warm-up
            const t = [], hs = [1, 0.5, 0.25, 0.125, 0.0625];
            for (let k = 0; k < n + 20; k++) {
                const t0 = performance.now();
                if (kind === 'drag') P.moveTo([-4 + 0.9 * Math.sin(k / 7), 2 + 0.8 * Math.sin(k / 5)]);
                else if (kind === 'step') window.H.setStep(hs[k % 5]);
                else { const z = 1 + 0.4 * Math.sin(k / 5), cx = 1.5 * Math.sin(k / 9); window.H.setView([cx - 5 * z, 3 * z, cx + 5 * z, -3 * z]); }
                if (k >= 20) t.push(performance.now() - t0);
            }
            t.sort((a, b) => a - b);
            return {median: t[t.length >> 1], p95: t[Math.floor(0.95 * t.length)], max: t[t.length - 1]};
        },
        ready: true,
    };
})();
