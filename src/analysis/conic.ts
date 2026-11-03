/**
 * Conics from focus, directrix and numerical eccentricity (epsilon), plus the rational
 * quadratic Bezier bridge. Pure; no JSXGraph or React. The existing RationalBezierCurve is
 * class-based and tied to PointImpl/versioning, so a small local evaluator is used here.
 * Here epsilon is the numerical eccentricity |PF|/|Pd|; the linear eccentricity is c.
 */

export interface Vec2 {
    x: number;
    y: number;
}

export type ConicKind = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';

/** Directrix as the line n.P = d with unit normal n. */
export interface Directrix {
    nx: number;
    ny: number;
    d: number;
}

export interface Conic {
    kind: ConicKind;
    epsilon: number;
    /** Circle: the centre. Others: the focus F. */
    focus: Vec2;
    /** Absent for the circle. Oriented so that the normal points from the focus to the directrix. */
    directrix?: Directrix;
    /** Circle only. */
    radius?: number;
    /** Distance from the focus to the directrix (non-circle). */
    focusDirectrixDistance?: number;
}

export interface ConicMetrics {
    /** Semi-axes (ellipse, hyperbola, circle). */
    a?: number;
    b?: number;
    /** Linear eccentricity (centre to focus). */
    c?: number;
    centre?: Vec2;
    secondFocus?: Vec2;
}

export const CONIC_DEFAULT_MAX_RADIUS = 50;

/** epsilon = 0 circle, <1 ellipse, =1 (exactly) parabola, >1 hyperbola. */
export function classifyEccentricity(epsilon: number): ConicKind {
    if (!(epsilon >= 0) || !Number.isFinite(epsilon)) {
        throw new RangeError('The eccentricity must be a finite number >= 0.');
    }
    if (epsilon === 0) return 'circle';
    if (epsilon < 1) return 'ellipse';
    return epsilon === 1 ? 'parabola' : 'hyperbola';
}

/** Circle from centre and radius: epsilon = 0, no directrix. */
export function circleConic(centre: Vec2, radius: number): Conic {
    if (!(radius > 0) || !Number.isFinite(radius)) throw new RangeError('The radius must be positive.');
    return {kind: 'circle', epsilon: 0, focus: {...centre}, radius};
}

/** Conic with |PF| = epsilon |Pd|; epsilon must be > 0 (use circleConic for 0). */
export function conicFromFocusDirectrix(focus: Vec2, directrix: Directrix, epsilon: number): Conic {
    const kind = classifyEccentricity(epsilon);
    if (kind === 'circle') throw new RangeError('epsilon = 0 is a circle: use circleConic (no directrix).');
    const len = Math.hypot(directrix.nx, directrix.ny);
    if (!(len > 0)) throw new RangeError('The directrix normal must be non-zero.');
    let nx = directrix.nx / len;
    let ny = directrix.ny / len;
    let d = directrix.d / len;
    let s = d - (nx * focus.x + ny * focus.y);
    if (s < 0) {
        nx = -nx;
        ny = -ny;
        d = -d;
        s = -s;
    }
    if (!(s > 0)) throw new RangeError('The focus must not lie on the directrix.');
    return {kind, epsilon, focus: {...focus}, directrix: {nx, ny, d}, focusDirectrixDistance: s};
}

export function conicMetrics(conic: Conic): ConicMetrics {
    if (conic.kind === 'circle') {
        return {a: conic.radius, b: conic.radius, c: 0, centre: {...conic.focus}, secondFocus: {...conic.focus}};
    }
    if (conic.kind === 'parabola') return {};
    const e = conic.epsilon;
    const s = conic.focusDirectrixDistance as number;
    const dir = conic.directrix as Directrix;
    const f = conic.focus;
    const a = e * s / Math.abs(1 - e * e);
    const c = e * a;
    const sign = conic.kind === 'ellipse' ? -1 : 1;
    const b = conic.kind === 'ellipse' ? Math.sqrt(a * a - c * c) : Math.sqrt(c * c - a * a);
    return {
        a, b, c,
        centre: {x: f.x + sign * c * dir.nx, y: f.y + sign * c * dir.ny},
        secondFocus: {x: f.x + sign * 2 * c * dir.nx, y: f.y + sign * 2 * c * dir.ny},
    };
}

/** |PF| (for the circle: distance to the centre). */
export function focalDistance(conic: Conic, p: Vec2): number {
    return Math.hypot(p.x - conic.focus.x, p.y - conic.focus.y);
}

/** Distance from P to the directrix, or null for the circle. */
export function directrixDistance(conic: Conic, p: Vec2): number | null {
    if (!conic.directrix) return null;
    return Math.abs(conic.directrix.nx * p.x + conic.directrix.ny * p.y - conic.directrix.d);
}

/** |PF| / |Pd|, or null for the circle or P on the directrix. */
export function focusDirectrixRatio(conic: Conic, p: Vec2): number | null {
    const dd = directrixDistance(conic, p);
    return dd === null || dd === 0 ? null : focalDistance(conic, p) / dd;
}

/** Residual |PF| - epsilon |Pd| (circle: |PC| - r); 0 on the conic. */
export function conicResidual(conic: Conic, p: Vec2): number {
    if (conic.kind === 'circle') return focalDistance(conic, p) - (conic.radius as number);
    return focalDistance(conic, p) - conic.epsilon * (directrixDistance(conic, p) as number);
}

/** Largest |residual| over points: how far a curve strays from the focus-directrix definition. */
export function maxConicDeviation(conic: Conic, points: readonly Vec2[]): number {
    let m = 0;
    for (const p of points) m = Math.max(m, Math.abs(conicResidual(conic, p)));
    return m;
}

/**
 * Parametric sampling from the focus with the polar form r = epsilon s / (1 + epsilon cos phi),
 * phi measured from the focus-to-directrix direction. Negative r gives the second hyperbola branch.
 * Unbounded branches are cut where |r| reaches maxRadius. Returns one polyline per branch
 * (ellipse and circle: one closed loop whose last point repeats the first).
 */
export function sampleConic(conic: Conic, pointsPerBranch = 200, maxRadius = CONIC_DEFAULT_MAX_RADIUS): Vec2[][] {
    const n = Math.max(2, Math.floor(pointsPerBranch));
    const f = conic.focus;
    if (conic.kind === 'circle') {
        const pts: Vec2[] = [];
        for (let i = 0; i <= n; i++) {
            const t = 2 * Math.PI * i / n;
            pts.push({
                x: f.x + (conic.radius as number) * Math.cos(t),
                y: f.y + (conic.radius as number) * Math.sin(t),
            });
        }
        return [pts];
    }
    const e = conic.epsilon;
    const s = conic.focusDirectrixDistance as number;
    const {nx, ny} = conic.directrix as Directrix;
    const at = (phi: number): Vec2 => {
        const r = e * s / (1 + e * Math.cos(phi));
        const ux = nx * Math.cos(phi) - ny * Math.sin(phi);
        const uy = ny * Math.cos(phi) + nx * Math.sin(phi);
        return {x: f.x + r * ux, y: f.y + r * uy};
    };
    const range = (from: number, to: number): Vec2[] => {
        const pts: Vec2[] = [];
        for (let i = 0; i <= n; i++) pts.push(at(from + (to - from) * i / n));
        return pts;
    };
    if (conic.kind === 'ellipse') return [range(0, 2 * Math.PI)];
    // delta = smallest allowed |1 + e cos phi| so that |r| <= maxRadius.
    const delta = Math.min(e * s / maxRadius, 1);
    const near = Math.acos(Math.max(-1, Math.min(1, (delta - 1) / e)));
    if (conic.kind === 'parabola') return [range(-near, near)];
    // The second branch (r < 0) is nearest the focus at phi = pi, where |r| = e s / (e - 1). When that exceeds
    // maxRadius (delta >= e - 1, e.g. e just above 1) the whole branch is cut, so return the first branch alone
    // instead of a degenerate polyline of repeated points.
    if (delta >= e - 1) return [range(-near, near)];
    const far = Math.acos(Math.max(-1, Math.min(1, (-delta - 1) / e)));
    return [range(-near, near), range(far, 2 * Math.PI - far)];
}

// ---- Rational quadratic Bezier bridge ----

/** Point on the rational quadratic Bezier with control points p and weights w at t. */
export function rationalQuadraticPoint(
    p: readonly [Vec2, Vec2, Vec2],
    w: readonly [number, number, number],
    t: number,
): Vec2 {
    const u = 1 - t;
    const b = [u * u * w[0], 2 * u * t * w[1], t * t * w[2]];
    const den = b[0] + b[1] + b[2];
    return {
        x: (b[0] * p[0].x + b[1] * p[1].x + b[2] * p[2].x) / den,
        y: (b[0] * p[0].y + b[1] * p[1].y + b[2] * p[2].y) / den,
    };
}

export function sampleRationalQuadratic(
    p: readonly [Vec2, Vec2, Vec2],
    w: readonly [number, number, number],
    count = 100,
): Vec2[] {
    const out: Vec2[] = [];
    for (let i = 0; i <= count; i++) out.push(rationalQuadraticPoint(p, w, i / count));
    return out;
}

/** Conic type for end weights 1: middle weight < 1 ellipse, = 1 parabola, > 1 hyperbola. */
export function classifyMiddleWeight(w1: number): Exclude<ConicKind, 'circle'> {
    if (!(w1 > 0) || !Number.isFinite(w1)) throw new RangeError('The middle weight must be positive.');
    if (w1 < 1) return 'ellipse';
    return w1 === 1 ? 'parabola' : 'hyperbola';
}

/** Quarter ellipse (a, 0) to (0, b) as a rational quadratic: control points and weights. */
export function quarterEllipseBezier(a: number, b: number): {
    points: [Vec2, Vec2, Vec2];
    weights: [number, number, number];
} {
    return {
        points: [{x: a, y: 0}, {x: a, y: b}, {x: 0, y: b}],
        weights: [1, Math.SQRT1_2, 1],
    };
}

/** A rational quadratic Bezier arc (end weights 1) lying on a conic, with the conic kind it represents. */
export interface MatchedConicArc {
    kind: ConicKind;
    points: [Vec2, Vec2, Vec2];
    weights: [number, number, number];
}

/**
 * The rational quadratic Bezier arc that lies on the conic (end weights 1, so the middle weight decides the kind):
 * - ellipse and circle: the quarter arc from the vertex nearest the directrix to the co-vertex on the upper side
 *   (`quarterEllipseBezier` placed with the conic's centre and axes; the circle uses its centre and direction (1, 0));
 * - parabola and hyperbola: the arc from the vertex to the latus rectum endpoint on the upper side. P1 is the
 *   intersection of the two end tangents; the middle weight is the one for which the point at t = 1/2 satisfies
 *   |PF| = epsilon |Pd| (a quadratic in the position of that point on the line from the chord midpoint to P1, solved
 *   in the numerically stable form so that it stays accurate for epsilon near 1).
 * For epsilon = 1 the analytic solution is lambda = 1/2, i.e. the weight is exactly 1, so the parabola returns it directly
 * (no snap of a solved value is needed).
 */
export function matchedConicArc(conic: Conic): MatchedConicArc {
    const dir = conic.directrix;
    const n: Vec2 = dir ? {x: dir.nx, y: dir.ny} : {x: 1, y: 0};
    let perp: Vec2 = {x: -n.y, y: n.x};
    if (perp.y < 0 || (perp.y === 0 && perp.x < 0)) perp = {x: -perp.x, y: -perp.y};
    const place = (origin: Vec2, along: number, across: number): Vec2 =>
        ({x: origin.x + along * n.x + across * perp.x, y: origin.y + along * n.y + across * perp.y});
    if (conic.kind === 'circle' || conic.kind === 'ellipse') {
        const m = conicMetrics(conic);
        const arc = quarterEllipseBezier(m.a as number, m.b as number);
        const centre = m.centre as Vec2;
        return {
            kind: conic.kind,
            points: arc.points.map(p => place(centre, p.x, p.y)) as [Vec2, Vec2, Vec2],
            weights: arc.weights,
        };
    }
    const e = conic.epsilon;
    const ell = e * (conic.focusDirectrixDistance as number);
    const v = ell / (1 + e);
    const f = conic.focus;
    const points: [Vec2, Vec2, Vec2] = [place(f, v, 0), place(f, v, ell - e * v), place(f, 0, ell)];
    if (conic.kind === 'parabola') return {kind: 'parabola', points, weights: [1, 1, 1]};
    // Local coordinates (x along the axis from F, y across). M(lambda) = chord midpoint + lambda (P1 - chord midpoint).
    const k = 1 - e * e;
    const mx = v / 2;
    const my = ell / 2;
    const dx = v / 2;
    const dy = ell / 2 - e * v;
    const qa = k * dx * dx + dy * dy;
    const qb = 2 * (k * mx * dx + my * dy + ell * e * dx);
    const qc = k * mx * mx + my * my + 2 * ell * e * mx - ell * ell;
    const disc = Math.sqrt(Math.max(0, qb * qb - 4 * qa * qc));
    const q = -(qb + (qb < 0 ? -disc : disc)) / 2;
    const roots = [qa !== 0 ? q / qa : NaN, q !== 0 ? qc / q : NaN].filter(r => r > 0 && r < 1);
    const lambda = roots.reduce((best, r) => Math.abs(r - 0.5) < Math.abs(best - 0.5) ? r : best, roots[0]);
    if (!(lambda > 0 && lambda < 1)) throw new RangeError('No Bezier arc matches this conic.');
    return {kind: 'hyperbola', points, weights: [1, lambda / (1 - lambda), 1]};
}
