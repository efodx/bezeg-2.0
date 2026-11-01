/**
 * Independent expected values for the guided-example highlight recipes (docs/specs/guided-example-highlights.md H2-H4).
 *
 * Everything here is computed from the lesson's own fixture data and textbook formulas, never read back from a board and
 * never imported from the app's evaluation code, so a capture only passes when the drawn geometry agrees with the maths.
 */

export type Vec = readonly [number, number];

/** Point of the Bézier curve with control points `points` at parameter `t` (de Casteljau). */
export function bezierPoint(points: readonly Vec[], t: number): Vec {
    let level = points.map(point => [point[0], point[1]] as [number, number]);
    while (level.length > 1) {
        level = level.slice(1).map((next, index) => [(1 - t) * level[index][0] + t * next[0], (1 - t) * level[index][1] + t * next[1]]);
    }
    return level[0];
}

/** Point of the rational Bézier curve: sum(w_i b_i P_i) / sum(w_i b_i), with Bernstein values b_i(t). */
export function rationalBezierPoint(points: readonly Vec[], weights: readonly number[], t: number): Vec {
    const n = points.length - 1;
    const binomial = (k: number) => Array.from({length: k}, (_, i) => (n - i) / (i + 1)).reduce((a, b) => a * b, 1);
    let denominator = 0, x = 0, y = 0;
    points.forEach((point, i) => {
        const weighted = weights[i] * binomial(i) * t ** i * (1 - t) ** (n - i);
        denominator += weighted; x += weighted * point[0]; y += weighted * point[1];
    });
    return [x / denominator, y / denominator];
}

/**
 * The quintic PH lesson curve (expansionGuidedLessons.ts `phQuinticFixture`): P_0=(-2,-1) and the hodograph
 * w(t)=(2-t^2)+i(2t-t^2) with r'(t)=w(t)^2. Returns r(t) = P_0 + the integral of w^2 over [0,t], using the monomial coefficients of w^2.
 */
const w = (t: number): Vec => [2 - t * t, 2 * t - t * t];
const derivative = (t: number): Vec => {
    const [a, b] = w(t);
    return [a * a - b * b, 2 * a * b];
};
export function phQuinticPoint(t: number): Vec {
    // w = 2 + 2i t - (1+i) t^2, so w^2 = 4 + 8i t + (-8-4i) t^2 + (4-4i) t^3 + 2i t^4.
    const coefficients: Vec[] = [[4, 0], [0, 8], [-8, -4], [4, -4], [0, 2]];
    let x = -2, y = -1;
    coefficients.forEach(([re, im], k) => { x += re * t ** (k + 1) / (k + 1); y += im * t ** (k + 1) / (k + 1); });
    return [x, y];
}
/** r'(t) = w(t)^2 as an [x, y] vector. */
export const phQuinticVelocity = derivative;

/** Offset point r(t) + d n(t) with the lesson's unit normal n = (y', -x') / |r'|, to the right of the direction of travel for d > 0. */
export function phQuinticOffsetPoint(t: number, d: number): Vec {
    const [x, y] = phQuinticPoint(t);
    const [vx, vy] = derivative(t);
    const speed = Math.hypot(vx, vy);
    return [x + d * vy / speed, y - d * vx / speed];
}

/** phi_alpha(t) = (1-alpha) t / (alpha (1-t) + (1-alpha) t), the weighted-parameterization warp (parameterizationGuidedLessons.ts `wp-phi`). */
export function weightedWarp(alpha: number, t: number): number {
    return (1 - alpha) * t / (alpha * (1 - t) + (1 - alpha) * t);
}

/** Control points of the weighted-parameterization lesson curve: the demonstration default in AlphaParamBezierCurveGraph.tsx:104. */
export const weightedKnotControlPoints: readonly Vec[] = [[-4, -3], [-3, 2], [2, 2], [3, -2]];
/** Control points of the rational lesson curve (expansionGuidedLessons.ts `rationalFixture`); the weights of the weight-2 frame. */
export const rationalControlPoints: readonly Vec[] = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
export const rationalWeightsSecondTwo: readonly number[] = [1, 2, 1, 1];

/**
 * Control points of the quintic PH curve, derived from the hodograph: with w_0=2, w_1=2+i, w_2=1+i the degree-4 Bernstein
 * coefficients of w^2 are w_0^2, w_0 w_1, (2 w_1^2 + w_0 w_2)/3, w_1 w_2, w_2^2, and P_{k+1} = P_k + (coefficient_k)/5.
 */
export const phQuinticControlPoints: readonly Vec[] = (() => {
    const mul = ([a, b]: Vec, [c, d]: Vec): Vec => [a * c - b * d, a * d + b * c];
    const [w0, w1, w2]: Vec[] = [[2, 0], [2, 1], [1, 1]];
    const w1Squared = mul(w1, w1), w0w2 = mul(w0, w2);
    const coefficients: Vec[] = [mul(w0, w0), mul(w0, w1), [(2 * w1Squared[0] + w0w2[0]) / 3, (2 * w1Squared[1] + w0w2[1]) / 3], mul(w1, w2), mul(w2, w2)];
    const points: Vec[] = [[-2, -1]];
    for (const [re, im] of coefficients) points.push([points.at(-1)![0] + re / 5, points.at(-1)![1] + im / 5]);
    return points;
})();

export type CurveSamples = readonly [Vec, Vec, Vec];
/** A curve sampled at parameters 0, 1/2 and 1, the vocabulary of the capture checks. */
export const sampleCurve = (at: (t: number) => Vec): CurveSamples => [at(0), at(0.5), at(1)];

/** Blossom (polar form) of the Bézier curve with control points `points`: de Casteljau with parameter `args[k]` in round k+1. */
function blossom(points: readonly Vec[], args: readonly number[]): Vec {
    let level = points.map(point => [point[0], point[1]] as [number, number]);
    for (const a of args) {
        level = level.slice(1).map((next, i) => [(1 - a) * level[i][0] + a * next[0], (1 - a) * level[i][1] + a * next[1]]);
    }
    return level[0];
}

/**
 * Control points of the piece of the Bézier curve on the parameter interval [a, b]: the k-th is the blossom with
 * (n-k) arguments a and k arguments b. [0, t] is the left subdivision part, [t, 1] the right one, [0, s] with s > 1 the extrapolated curve.
 */
export function bezierSegmentControls(points: readonly Vec[], a: number, b: number): Vec[] {
    const n = points.length - 1;
    return points.map((_, k) => blossom(points, [...Array(n - k).fill(a), ...Array(k).fill(b)]));
}

/** The rows of the de Casteljau scheme at `t`, without the control polygon itself: rows of n, n-1, ..., 1 points. */
export function decasteljauRows(points: readonly Vec[], t: number): Vec[][] {
    const rows: Vec[][] = [];
    let level: Vec[] = [...points];
    while (level.length > 1) {
        level = level.slice(1).map((next, i) => [(1 - t) * level[i][0] + t * next[0], (1 - t) * level[i][1] + t * next[1]] as Vec);
        rows.push(level);
    }
    return rows;
}

/** Bernstein basis value b_i^n(t) = C(n,i) t^i (1-t)^(n-i), with the binomial coefficient computed by its product formula. */
export function bernsteinValue(n: number, i: number, t: number): number {
    let binomial = 1;
    for (let k = 1; k <= i; k++) binomial *= (n - i + k) / k;
    return binomial * t ** i * (1 - t) ** (n - i);
}

/** Rotates the points by `angle` radians (counterclockwise) about their mean, the pivot the affine lesson graph uses. */
export function rotateAboutMean(points: readonly Vec[], angle: number): Vec[] {
    const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length;
    const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length;
    const cos = Math.round(Math.cos(angle) * 1e12) / 1e12, sin = Math.round(Math.sin(angle) * 1e12) / 1e12;
    return points.map(([x, y]) => [cx + cos * (x - cx) - sin * (y - cy), cy + sin * (x - cx) + cos * (y - cy)] as Vec);
}

/** Lesson fixtures of the bezier-curves chapter, copied from the lesson sources named in each comment. */
/** guidedLessons.ts `bezierSymmetricFixture`. */
export const symmetricCubicControlPoints: readonly Vec[] = [[-3, -2], [-3, 2], [3, 2], [3, -2]];
/** expansionGuidedLessons.ts `affineFixture`. */
export const affineLessonControlPoints: readonly Vec[] = [[1, 0], [2, 3], [4, 2], [5, -1]];
/** Default quartic of the de Casteljau demonstrations (DecasteljauGraph.tsx preset; also the `da-*` helper-curve steps). */
export const defaultQuarticControlPoints: readonly Vec[] = [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]];
/** ElevationGraph.tsx default preset (additionalGuidedLessons.ts `elevation-cubic-example`). */
export const elevationCubicControlPoints: readonly Vec[] = [[-4, -2], [-3, 3], [2, 3], [3, -2]];
/** ExtrapolationGraph.tsx default preset (constructionGuidedLessons.ts `ex-twelve-tenths`). */
export const extrapolationCubicControlPoints: readonly Vec[] = [[-4, -2], [-3, 3], [2, 3], [3, -1]];
/** SubdivisionGraph.tsx / SubdivisionGraph1.tsx default preset (subdivision and repeated-subdivision lessons). */
export const subdivisionCubicControlPoints: readonly Vec[] = [[-4, -3], [-3, 3], [3, 3], [4, -3]];

/** Homogeneous lift (w x, w y, w) of weighted planar points. */
type Homogeneous = readonly [number, number, number];
const lift = (points: readonly Vec[], weights: readonly number[]): Homogeneous[] => points.map((p, i) => [weights[i] * p[0], weights[i] * p[1], weights[i]]);
/** Projection of a homogeneous point back to the plane, together with its weight (the last coordinate). */
const project = ([x, y, z]: Homogeneous): {point: Vec; weight: number} => ({point: [x / z, y / z], weight: z});

/** Linear interpolation of homogeneous points (all three coordinates together). */
const mixHomogeneous = (a: Homogeneous, b: Homogeneous, t: number): Homogeneous => [(1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1], (1 - t) * a[2] + t * b[2]];

/**
 * Rows of the rational de Casteljau scheme at `t`, computed in homogeneous coordinates (w x, w y, w) and projected afterwards;
 * rows of n, n-1, ..., 1 points, without the control polygon itself.
 */
export function rationalDecasteljauRows(points: readonly Vec[], weights: readonly number[], t: number): Vec[][] {
    const rows: Vec[][] = [];
    let level: Homogeneous[] = lift(points, weights);
    while (level.length > 1) {
        level = level.slice(1).map((next, i) => mixHomogeneous(level[i], next, t));
        rows.push(level.map(h => project(h).point));
    }
    return rows;
}

/**
 * Control points (projected) and weights of the rational Bézier piece on the parameter interval [a, b]: the homogeneous blossom
 * of the lifted points with (n-k) arguments a and k arguments b, projected. [0, t] with t > 1 is the extrapolated curve.
 */
export function rationalSegmentControls(points: readonly Vec[], weights: readonly number[], a: number, b: number): {points: Vec[]; weights: number[]} {
    const n = points.length - 1, lifted = lift(points, weights);
    const blossomAt = (args: readonly number[]): Homogeneous => {
        let level = lifted;
        for (const arg of args) level = level.slice(1).map((next, i) => mixHomogeneous(level[i], next, arg));
        return level[0];
    };
    const projected = points.map((_, k) => project(blossomAt([...Array(n - k).fill(a), ...Array(k).fill(b)])));
    return {points: projected.map(p => p.point), weights: projected.map(p => p.weight)};
}

/**
 * Degree elevation of the rational curve by one, in homogeneous coordinates: the lifted point i is
 * (i/(n+1)) H_{i-1} + (1 - i/(n+1)) H_i, projected afterwards. Returns the n+2 projected points and their weights.
 */
export function rationalElevatedControls(points: readonly Vec[], weights: readonly number[]): {points: Vec[]; weights: number[]} {
    const n = points.length - 1, lifted = lift(points, weights);
    const elevated = Array.from({length: n + 2}, (_, i) => project(mixHomogeneous(lifted[Math.min(i, n)], lifted[Math.max(i - 1, 0)], i / (n + 1))));
    return {points: elevated.map(p => p.point), weights: elevated.map(p => p.weight)};
}

/**
 * The filled regions of the stacked Bernstein chart of `count` degree-(count-1) functions (BernsteinGraph.tsx, sum graph): region i lies between
 * the cumulative sums S_{i-1} and S_i, with S_k = b_0 + ... + b_k and S_{-1} = 0. Each region is one closed outline curve, sampled at
 * its outline parameters 0, 1/2 and 1, which are the outline vertices: the first region starts at the top-left (0, 1) corner, passes
 * (1, S_0(1)) and returns to (0, S_0(0)); the last starts at (1, S_{last-1}(1)), passes (0, S_{last-1}(0)) and returns to its start;
 * a middle region starts at (0, S_{i-1}(0)), passes (1, S_i(1)) and ends at (0, S_i(0)).
 */
export function stackedBernsteinRegionSamples(count: number, i: number): CurveSamples {
    const degree = count - 1;
    const cumulative = (k: number, t: number) => { let sum = 0; for (let j = 0; j <= k; j++) sum += bernsteinValue(degree, j, t); return sum; };
    if (i === 0) return [[0, cumulative(degree, 0)], [1, cumulative(0, 1)], [0, cumulative(0, 0)]];
    if (i === degree) return [[1, cumulative(i - 1, 1)], [0, cumulative(i - 1, 0)], [1, cumulative(i - 1, 1)]];
    return [[0, cumulative(i - 1, 0)], [1, cumulative(i, 1)], [0, cumulative(i, 0)]];
}

// Splines (batch 03b-B). The spline graphs draw ONE JSXGraph curve on [0, 1] with uniform knots (chord-length exponent alpha = 0),
// so a spline of m pieces has piece k on [k/m, (k+1)/m]. Pieces below are built from the lesson's own construction formulas.
const mix = (a: Vec, b: Vec, s: number): Vec => [(1 - s) * a[0] + s * b[0], (1 - s) * a[1] + s * b[1]];

/** Free points of the C1 quadratic fixtures (splineGuidedLessons.ts c1-* scenes). */
export const c1SplineFreePoints: readonly Vec[] = [[-4, -2], [-2, 2], [2, 2], [3, -1]];
/** Free points of the Cn fixture (cn-* scenes, n = 2, r = 1). */
export const cnSplineFreePoints: readonly Vec[] = [[-4, 1], [-2, -2], [0, -3], [4, 0]];
/** Free points of the C2 cubic fixtures (c2-* scenes). */
export const c2SplineFreePoints: readonly Vec[] = [[-6, -1], [-5, 3], [-3, -3], [3, 0], [5, 2], [6, -2]];
/** Free points of the one-sided G1 fixtures (g1-* scenes). */
export const g1SplineFreePoints: readonly Vec[] = [[-4, -1], [-2, 2], [0, 0], [4, -1]];
/** Free points of the symmetric G1 fixtures (g1s-* scenes). */
export const g1SymmetricSplineFreePoints: readonly Vec[] = [[-5, -1], [-2, 2], [2, 0], [5, 3]];

/** Point of a spline of Bézier `pieces` (uniform knots on [0, 1]); the global parameter t = 1 is the last piece's end. */
export function splinePoint(pieces: readonly (readonly Vec[])[], t: number): Vec {
    const m = pieces.length, k = Math.min(Math.floor(t * m), m - 1);
    return bezierPoint(pieces[k], t * m - k);
}

/** C1 quadratic spline of four free points: the joint is the midpoint J of p1p2 (equal spans), pieces (p0,p1,J) and (J,p2,p3). */
export function c1QuadraticPieces(p: readonly Vec[]): Vec[][] {
    const joint = mix(p[1], p[2], 1 / 2);
    return [[p[0], p[1], joint], [joint, p[2], p[3]]];
}

/** Degree-2 r = 1 spline of four free points by one-sided extrapolation: q1 = 2 p2 - p1 (uniform spacing); pieces (p0,p1,p2) and (p2,q1,p3). */
export function extrapolatedQuadraticPieces(p: readonly Vec[]): Vec[][] {
    const q1: Vec = [2 * p[2][0] - p[1][0], 2 * p[2][1] - p[1][1]];
    return [[p[0], p[1], p[2]], [p[2], q1, p[3]]];
}

/**
 * C2 cubic spline of six free points (Algorithm 5): inner points of the middle piece at the thirds of p2p3, the end pieces use the
 * midpoints d = (p1+p2)/2 and d' = (p3+p4)/2, and each joint is the midpoint of the neighbouring inner points.
 */
export function c2CubicPieces(p: readonly Vec[]): Vec[][] {
    const d1 = mix(p[1], p[2], 1 / 2), d2 = mix(p[3], p[4], 1 / 2);
    const c1 = mix(p[2], p[3], 1 / 3), c2 = mix(p[2], p[3], 2 / 3);
    const j1 = mix(d1, c1, 1 / 2), j2 = mix(c2, d2, 1 / 2);
    return [[p[0], p[1], d1, j1], [j1, c1, c2, j2], [j2, d2, p[4], p[5]]];
}

/** One-sided G1 quadratic spline of four free points and ratio b: q1 = p2 + b (p2 - p1); pieces (p0,p1,p2) and (p2,q1,p3). */
export function g1QuadraticPieces(p: readonly Vec[], b: number): Vec[][] {
    const q1: Vec = [p[2][0] + b * (p[2][0] - p[1][0]), p[2][1] + b * (p[2][1] - p[1][1])];
    return [[p[0], p[1], p[2]], [p[2], q1, p[3]]];
}

/** Symmetric G1 quadratic spline of four free points and ratio beta: joint J = (1-beta) p1 + beta p2; pieces (p0,p1,J) and (J,p2,p3). */
export function g1SymmetricPieces(p: readonly Vec[], beta: number): Vec[][] {
    const joint = mix(p[1], p[2], beta);
    return [[p[0], p[1], joint], [joint, p[2], p[3]]];
}

/** k-th derivative (k = 1, 2) of the Bézier piece with control points `c` on a parameter interval of length `span`, at its start or end. */
export function pieceDerivative(c: readonly Vec[], k: 1 | 2, span: number, atEnd: boolean): Vec {
    const n = c.length - 1, o = atEnd ? n - k : 0;
    const factor = (k === 1 ? n : n * (n - 1)) / span ** k;
    const at = (i: number) => c[o + i];
    return k === 1
        ? [factor * (at(1)[0] - at(0)[0]), factor * (at(1)[1] - at(0)[1])]
        : [factor * (at(2)[0] - 2 * at(1)[0] + at(0)[0]), factor * (at(2)[1] - 2 * at(1)[1] + at(0)[1])];
}

// PH parametrization and spline parameterization (task 04 part A, worker 2). Derived from the lesson fixtures and textbook formulas.

/** A PH curve by its start point and generators w_0..w_m: r(t) = start + the integral of w(t)^2, w the degree-m Bernstein polynomial. */
export interface PhFixture {
    readonly start: Vec;
    readonly generators: readonly Vec[];
}
/** Cubic PH lesson curve (guidedLessons.ts `phCubicFixture`): the card scenes of the PH cubic cards start from it. */
/** Default curve of the uniform-parameterization graph (UniformParamBezierCurveGraph.tsx `defaultPreset`), a quintic PH curve. */
export const uniformParameterizationFixture: PhFixture = {start: [-3, -4], generators: [[-4.5, -4], [-1, 0], [-4.5, 4]]};

const cmul = ([a, b]: Vec, [c, d]: Vec): Vec => [a * c - b * d, a * d + b * c];

/** Hodograph w(t) = sum w_i C(m,i) t^i (1-t)^(m-i): the generators are the Bernstein coefficients of w. */
export function phHodograph(fixture: PhFixture, t: number): Vec {
    const m = fixture.generators.length - 1;
    let x = 0, y = 0;
    fixture.generators.forEach(([re, im], i) => { const b = bernsteinValue(m, i, t); x += b * re; y += b * im; });
    return [x, y];
}
/** Velocity r'(t) = w(t)^2. */
export function phVelocityOf(fixture: PhFixture, t: number): Vec {
    const w = phHodograph(fixture, t);
    return cmul(w, w);
}
/** Speed |r'(t)| = |w(t)|^2, a polynomial in t. */
export function phSpeedOf(fixture: PhFixture, t: number): number {
    const [a, b] = phHodograph(fixture, t);
    return a * a + b * b;
}


/** 5-point Gauss-Legendre rule on [0, 1] as [node, weight]: exact up to degree 9 (the speed of a degree-m hodograph has degree 2m <= 4 here). */
const GAUSS: readonly (readonly [number, number])[] = [
    [0.5, 0.5 * 0.5688888888888889],
    [0.5 - 0.5 * 0.5384693101056831, 0.5 * 0.4786286704993665], [0.5 + 0.5 * 0.5384693101056831, 0.5 * 0.4786286704993665],
    [0.5 - 0.5 * 0.906179845938664, 0.5 * 0.2369268850561891], [0.5 + 0.5 * 0.906179845938664, 0.5 * 0.2369268850561891],
];
/** Integral of `f` over [a, b] by the Gauss rule on the whole interval. */
function gaussIntegral(f: (t: number) => number, a: number, b: number): number {
    return GAUSS.reduce((sum, [x, weight]) => sum + weight * f(a + (b - a) * x), 0) * (b - a);
}

/** r(t) = start + the integral of the velocity over [0, t], by exact quadrature. */
export function phPointOf(fixture: PhFixture, t: number): Vec {
    return [fixture.start[0] + gaussIntegral(s => phVelocityOf(fixture, s)[0], 0, t), fixture.start[1] + gaussIntegral(s => phVelocityOf(fixture, s)[1], 0, t)];
}
/** Arc length between parameters a and b: the integral of the speed. */
export function phArcLength(fixture: PhFixture, a: number, b: number): number {
    return gaussIntegral(s => phSpeedOf(fixture, s), a, b);
}

/**
 * Control points of the PH curve: with m+1 generators the degree-2m Bernstein coefficients of w^2 are
 * c_k = sum over i+j=k of C(m,i) C(m,j) / C(2m,k) * w_i w_j, and P_{k+1} = P_k + c_k / (2m+1).
 */
export function phControlPointsOf(fixture: PhFixture): Vec[] {
    const m = fixture.generators.length - 1, degree = 2 * m;
    const binomial = (n: number, k: number) => bernsteinValue(n, k, 0.5) * 2 ** n;
    const points: Vec[] = [fixture.start];
    for (let k = 0; k <= degree; k++) {
        let re = 0, im = 0;
        for (let i = 0; i <= m; i++) {
            const j = k - i;
            if (j < 0 || j > m) continue;
            const [pr, pi] = cmul(fixture.generators[i], fixture.generators[j]), factor = binomial(m, i) * binomial(m, j) / binomial(degree, k);
            re += factor * pr; im += factor * pi;
        }
        const last = points.at(-1)!;
        points.push([last[0] + re / (degree + 1), last[1] + im / (degree + 1)]);
    }
    return points;
}

/** Parameters t_k, k = 1..count, with arc length s(t_k) = k / (count + 1) of the whole length (uniform parameterization by arc length). */
export function uniformArcLengthParameters(fixture: PhFixture, count: number): number[] {
    const total = phArcLength(fixture, 0, 1);
    return Array.from({length: count}, (_, index) => {
        const target = (index + 1) / (count + 1) * total;
        let low = 0, high = 1;
        for (let iteration = 0; iteration < 80; iteration++) {
            const mid = (low + high) / 2;
            if (phArcLength(fixture, 0, mid) < target) low = mid; else high = mid;
        }
        return (low + high) / 2;
    });
}

/** Free points of the spline-parameterization lesson (splineGuidedLessons.ts `splineParameterizationFixture`). */
export const splineParameterizationPoints: readonly Vec[] = [[-7, -2], [-7, 1.5], [-5, 0.5], [-4, 1.5], [-3.2, -1], [4, 2.5], [6, -1.5], [2, -3.5]];
const distance = (a: Vec, b: Vec) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Chords whose lengths give the knot spans: |p0 p2|, |p2 p3|, ..., |p(n-3) p(n-1)| (the end spans each cover two polygon legs). */
export function splineKnotChords(points: readonly Vec[]): number[] {
    const n = points.length;
    return [distance(points[0], points[2]), ...Array.from({length: n - 5}, (_, i) => distance(points[i + 2], points[i + 3])), distance(points[n - 3], points[n - 1])];
}
/** Unnormalised knot intervals |chord|^alpha. */
export function splineKnotIntervals(points: readonly Vec[], alpha: number): number[] {
    return splineKnotChords(points).map(chord => chord ** alpha);
}
/** Knots on [0, 1]: cumulative sums of the intervals divided by their total. */
export function splineKnots(points: readonly Vec[], alpha: number): number[] {
    const intervals = splineKnotIntervals(points, alpha), total = intervals.reduce((a, b) => a + b, 0);
    return intervals.reduce<number[]>((knots, interval) => [...knots, knots.at(-1)! + interval / total], [0]);
}

/**
 * Bezier pieces of the C2 cubic spline with free points p_0..p_{n-1} (n - 3 pieces) and knots u: the end pieces interpolate the end
 * points; inner Bezier points divide the legs p_l p_{l+1} by the three neighbouring spans and each joint divides the segment between
 * its neighbouring inner points by the two spans around it. C2 continuity is checked in the tests, not assumed.
 */
export function alphaC2SplinePieces(points: readonly Vec[], alpha: number): Vec[][] {
    const n = points.length, u = splineKnots(points, alpha), pieces = n - 3;
    const lerp = (a: Vec, b: Vec, wa: number, wb: number): Vec => [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1]];
    const bez: Vec[][] = Array.from({length: pieces}, () => new Array<Vec>(4));
    bez[0][0] = points[0]; bez[0][1] = points[1];
    let d1 = u[1] - u[0], d2 = u[2] - u[1];
    bez[0][2] = lerp(points[1], points[2], d2 / (d1 + d2), d1 / (d1 + d2));
    for (let l = 2; l < n - 3; l++) {
        const a = u[l - 1] - u[l - 2], b = u[l] - u[l - 1], c = u[l + 1] - u[l], sum = a + b + c;
        bez[l - 1][1] = lerp(points[l], points[l + 1], (b + c) / sum, a / sum);
        bez[l - 1][2] = lerp(points[l], points[l + 1], c / sum, (a + b) / sum);
    }
    d1 = u[u.length - 2] - u[u.length - 3]; d2 = u[u.length - 1] - u[u.length - 2];
    bez[pieces - 1][1] = lerp(points[n - 3], points[n - 2], d2 / (d1 + d2), d1 / (d1 + d2));
    for (let l = 1; l < n - 3; l++) {
        d1 = u[l] - u[l - 1]; d2 = u[l + 1] - u[l];
        const joint = lerp(bez[l - 1][2], bez[l][1], d2 / (d1 + d2), d1 / (d1 + d2));
        bez[l - 1][3] = joint; bez[l][0] = joint;
    }
    bez[pieces - 1][2] = points[n - 2]; bez[pieces - 1][3] = points[n - 1];
    return bez;
}
/** Spline point at the global parameter t in [0, 1], locating the piece by the knots. */
export function alphaC2SplinePoint(points: readonly Vec[], alpha: number, t: number): Vec {
    const pieces = alphaC2SplinePieces(points, alpha), u = splineKnots(points, alpha);
    const k = Math.min(Math.max(u.findIndex((knot, index) => index < pieces.length && t >= knot && t < u[index + 1]), 0), pieces.length - 1);
    return bezierPoint(pieces[t >= 1 ? pieces.length - 1 : k], t >= 1 ? 1 : (t - u[k]) / (u[k + 1] - u[k]));
}
/** The joints (shared end points of consecutive pieces). */
export const alphaC2SplineJoints = (points: readonly Vec[], alpha: number): Vec[] => alphaC2SplinePieces(points, alpha).slice(0, -1).map(piece => piece[3]);
/** Positions of the `count` sample markers: the spline at t = i / (count + 1), i = 1..count. */
export const alphaC2SplineSamples = (points: readonly Vec[], alpha: number, count: number): Vec[] =>
    Array.from({length: count}, (_, i) => alphaC2SplinePoint(points, alpha, (i + 1) / (count + 1)));

// PH offsets and singularities (task 04 part A, worker 3).

/** Cubic PH lesson curve (guidedLessons.ts `phCubicFixture`): start (-2,-1), generators (2,0), (2,1); r'(t) = ((1-t) w0 + t w1)^2. */
export const phCubicFixture: PhFixture = {start: [-2, -1], generators: [[2, 0], [2, 1]]};
/** Quintic PH lesson curve (expansionGuidedLessons.ts `phQuinticFixture`) as a generator fixture; equals phQuinticPoint. */
export const phQuinticFixture: PhFixture = {start: [-2, -1], generators: [[2, 0], [2, 1], [1, 1]]};

/** Offset point O(t) = r(t) + d n(t) with n = (y', -x') / |r'|, the right normal (d > 0 lies right of the direction of travel). */
export function phOffsetPointOf(fixture: PhFixture, d: number, t: number): Vec {
    const [x, y] = phPointOf(fixture, t), [vx, vy] = phVelocityOf(fixture, t), speed = Math.hypot(vx, vy);
    return [x + d * vy / speed, y - d * vx / speed];
}

/**
 * Proper crossings of a polyline: pairs of non-adjacent segments (i, j) whose interiors cross, with the crossing point.
 * An empty or one-point polyline has none.
 */
export function polylineSelfIntersections(points: readonly Vec[]): {i: number; j: number; point: Vec}[] {
    const found: {i: number; j: number; point: Vec}[] = [];
    for (let i = 0; i + 1 < points.length; i++) {
        const [ax, ay] = points[i], [bx, by] = points[i + 1];
        for (let j = i + 2; j + 1 < points.length; j++) {
            const [cx, cy] = points[j], [dx, dy] = points[j + 1];
            const denominator = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
            if (denominator === 0) continue;
            const s = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denominator;
            const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denominator;
            if (s > 0 && s < 1 && u > 0 && u < 1) found.push({i, j, point: [ax + s * (bx - ax), ay + s * (by - ay)]});
        }
    }
    return found;
}

/** Crossings of the offset polyline at distance d (segments = polyline resolution over t in [0, 1]); `i`/`j` are segment indices. */
export function phOffsetSelfIntersections(fixture: PhFixture, d: number, segments = 2000): {i: number; j: number; point: Vec}[] {
    return polylineSelfIntersections(Array.from({length: segments + 1}, (_, k) => phOffsetPointOf(fixture, d, k / segments)));
}

// ---- Functions and calculus (batch 04b). Independent of the app's analysis modules: closed forms and quadrature only. ----

/** Integral of `f` over [a, b] by the Gauss rule on `panels` equal subintervals (error far below 1e-9 for the smooth lesson integrands). */
export function integrate(f: (x: number) => number, a: number, b: number, panels = 64): number {
    let sum = 0;
    for (let k = 0; k < panels; k++) sum += gaussIntegral(f, a + (b - a) * k / panels, a + (b - a) * (k + 1) / panels);
    return sum;
}

/** Length of the polyline through the n + 1 equally spaced points of the graph of `f` on [a, b]. */
export function chordSum(f: (x: number) => number, a: number, b: number, n: number): number {
    let total = 0;
    for (let i = 1; i <= n; i++) {
        const x0 = a + (b - a) * (i - 1) / n, x1 = a + (b - a) * i / n;
        total += Math.hypot(x1 - x0, f(x1) - f(x0));
    }
    return total;
}

/** Arc length of the graph of `f` on [a, b] from its derivative: the integral of sqrt(1 + f'^2). */
export const graphArcLength = (derivativeOfF: (x: number) => number, a: number, b: number): number =>
    integrate(x => Math.sqrt(1 + derivativeOfF(x) ** 2), a, b);

/** Left Riemann sum with n equal rectangles. */
export function leftRiemannSum(f: (x: number) => number, a: number, b: number, n: number): number {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += f(a + (b - a) * i / n);
    return sum * (b - a) / n;
}

/** The lesson pair of the area-between example: f = (x - 2)^2 and g = 3 - (x - 2)^2. */
export const areaLessonF = (x: number): number => (x - 2) ** 2;
export const areaLessonG = (x: number): number => 3 - (x - 2) ** 2;

/** Area between two graphs on [a, b]: the integral of upper - lower. */
export const areaBetween = (upper: (x: number) => number, lower: (x: number) => number, a: number, b: number): number =>
    integrate(x => upper(x) - lower(x), a, b);

/** Smallest value of upper - lower over `samples` + 1 points of [a, b]; nonnegative exactly when `upper` is nowhere below `lower` there. */
export function lowestMargin(upper: (x: number) => number, lower: (x: number) => number, a: number, b: number, samples = 400): number {
    let lowest = Infinity;
    for (let i = 0; i <= samples; i++) {
        const x = a + (b - a) * i / samples;
        lowest = Math.min(lowest, upper(x) - lower(x));
    }
    return lowest;
}

/** The continuity lesson rule: a x^2 for x <= 1 and 3 - a x for x > 1. */
export const continuityRule = (a: number, x: number): number => x <= 1 ? a * x * x : 3 - a * x;
/** Value at 1 and the one-sided values read just beside 1 (distance 1e-9), straight from the rule. */
export function continuityValues(a: number): {value: number; fromLeft: number; fromRight: number; jump: number} {
    const value = continuityRule(a, 1), fromLeft = continuityRule(a, 1 - 1e-9), fromRight = continuityRule(a, 1 + 1e-9);
    return {value, fromLeft, fromRight, jump: Math.abs(fromRight - fromLeft)};
}

/** Slope of the secant of `f` through x and x + h (h is not 0). */
export function secantSlope(f: (x: number) => number, x: number, h: number): number {
    if (h === 0) throw new Error('secantSlope needs h != 0');
    return (f(x + h) - f(x)) / h;
}
/** Derivative by the symmetric difference quotient with a small step. */
export const centralDifference = (f: (x: number) => number, x: number, step = 1e-5): number => (f(x + step) - f(x - step)) / (2 * step);

/** Slope and intercept of the line through two points with different x. */
export function lineThrough(p: Vec, q: Vec): {slope: number; intercept: number} {
    if (p[0] === q[0]) throw new Error('lineThrough needs different x');
    const slope = (q[1] - p[1]) / (q[0] - p[0]);
    return {slope, intercept: p[1] - slope * p[0]};
}

export interface TrigParameters {readonly A: number; readonly omega: number; readonly phi: number; readonly B: number}
/** A sin(omega x + phi) + B. */
export const trigValue = (p: TrigParameters, x: number): number => p.A * Math.sin(p.omega * x + p.phi) + p.B;
/** Largest and smallest value over one period [0, 2 pi / omega] by dense sampling, with the x of the first maximum. */
export function trigExtremes(p: TrigParameters, samples = 4000): {max: number; min: number; xOfMax: number} {
    const period = 2 * Math.PI / p.omega;
    let max = -Infinity, min = Infinity, xOfMax = NaN;
    for (let i = 0; i <= samples; i++) {
        const x = period * i / samples, y = trigValue(p, x);
        if (y > max + 1e-12) { max = y; xOfMax = x; }
        min = Math.min(min, y);
    }
    return {max, min, xOfMax};
}
