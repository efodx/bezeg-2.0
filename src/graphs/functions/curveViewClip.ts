import JXG from "jsxgraph";

/**
 * Clips a polyline to the horizontal band `lo <= y <= hi`. Every segment is cut exactly where it crosses a band edge, so the line
 * inside the band is unchanged; parts outside are dropped and the path restarts with a `NaN` break. A non-finite point is a break.
 */
export function clipPolylineToBand(xs: readonly number[], ys: readonly number[], lo: number, hi: number): {x: number[]; y: number[]} {
    const x: number[] = [];
    const y: number[] = [];
    let lastX = NaN;
    let lastY = NaN;
    const brk = () => {
        if (x.length > 0 && !Number.isNaN(x[x.length - 1])) {
            x.push(NaN);
            y.push(NaN);
        }
        lastX = NaN;
        lastY = NaN;
    };
    for (let i = 0; i + 1 < xs.length; i++) {
        const ax = xs[i], ay = ys[i], bx = xs[i + 1], by = ys[i + 1];
        if (![ax, ay, bx, by].every(Number.isFinite)) {
            brk();
            continue;
        }
        // Liang-Barsky against the two horizontal edges.
        const dy = by - ay;
        let t0 = 0;
        let t1 = 1;
        if (dy === 0) {
            if (ay < lo || ay > hi) {
                brk();
                continue;
            }
        } else {
            const ta = (lo - ay) / dy;
            const tb = (hi - ay) / dy;
            t0 = Math.max(0, Math.min(ta, tb));
            t1 = Math.min(1, Math.max(ta, tb));
            if (t0 > t1) {
                brk();
                continue;
            }
        }
        const clampY = (v: number) => Math.min(hi, Math.max(lo, v));
        const sx = t0 === 0 ? ax : ax + t0 * (bx - ax), sy = t0 === 0 ? ay : clampY(ay + t0 * dy);
        const ex = t1 === 1 ? bx : ax + t1 * (bx - ax), ey = t1 === 1 ? by : clampY(ay + t1 * dy);
        if (sx !== lastX || sy !== lastY) {
            brk();
            x.push(sx);
            y.push(sy);
        }
        x.push(ex);
        y.push(ey);
        lastX = ex;
        lastY = ey;
    }
    if (x.length > 0 && Number.isNaN(x[x.length - 1])) {
        x.pop();
        y.pop();
    }
    return {x, y};
}

/**
 * After every plot of `curve` (a `functiongraph`), cuts its path to the view height plus `margin` view heights above and below.
 * A polynomial far off the view otherwise gives path coordinates in the millions, and stroking those costs about 180 ms a frame.
 * The path is cut on its own line, so the drawn curve inside the view does not change.
 */
/** The JSXGraph curve fields the clip touches; the typings omit `points`. */
interface PlottedCurve extends JXG.Curve {
    points: JXG.Coords[];
}

export function clipCurveToView(curve: JXG.Curve, board: JXG.Board, margin = 1): void {
    if (typeof curve.updateCurve !== "function") return;
    const plot = curve.updateCurve.bind(curve);
    curve.updateCurve = function (this: PlottedCurve) {
        plot();
        const pts = this.points;
        const [, top, , bottom] = board.getBoundingBox();
        const n = this.numberPoints ?? pts.length;
        if (!(top > bottom) || n < 2) return this;
        const h = top - bottom;
        const lo = bottom - margin * h, hi = top + margin * h;
        let outside = false;
        const xs: number[] = [], ys: number[] = [];
        for (let i = 0; i < n; i++) {
            const [, px, py] = pts[i].usrCoords;
            xs.push(px);
            ys.push(py);
            if (py < lo || py > hi) outside = true;
        }
        if (!outside) return this;
        const clipped = clipPolylineToBand(xs, ys, lo, hi);
        this.points = clipped.x.map((px, i) => new JXG.Coords(JXG.COORDS_BY_USER, [px, clipped.y[i]], board));
        this.numberPoints = this.points.length;
        return this;
    } as typeof curve.updateCurve;
}
