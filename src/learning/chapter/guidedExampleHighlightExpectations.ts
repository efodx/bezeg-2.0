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
