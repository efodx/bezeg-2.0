/**
 * Cubic Hermite segments, Catmull-Rom tangents and the Hermite-to-Bezier conversion for the interpolation lessons (I3).
 * Pure mathematics: no React, JSXGraph or localization imports.
 *
 * A segment lives on the local parameter u in [0, 1]: H(0)=p0, H(1)=p1, H'(0)=m0, H'(1)=m1, where m0, m1 are
 * derivatives with respect to u. For a chain with global parameters t_i the local tangent of segment i is
 * (t_{i+1} - t_i) times the global derivative, so adjacent segments share the global derivative and the chain is C1.
 *
 * Catmull-Rom (this module): the global derivative at an interior point is (P_{i+1} - P_{i-1}) / (t_{i+1} - t_{i-1}),
 * which is the spec's m_i = (P_{i+1} - P_{i-1}) / 2 for uniform parameters; end tangents are one-sided
 * (P_1 - P_0)/(t_1 - t_0). `tension` scales every tangent (1 = Catmull-Rom, 0 = zero tangents).
 * Coincident consecutive points throw a RangeError (zero chord) for both rules, so the chain is always well defined.
 */
import {curveParameters, type ParameterRule, type Point2} from './interpolation';

export interface HermiteSegment {
    p0: Point2;
    p1: Point2;
    /** Derivative with respect to the local parameter u at u = 0. */
    m0: Point2;
    /** Derivative with respect to the local parameter u at u = 1. */
    m1: Point2;
}

/** Hermite basis values h00, h10, h01, h11 at u. */
export const hermiteBasis = (u: number): [number, number, number, number] => {
    const u2 = u * u;
    const u3 = u2 * u;
    return [2 * u3 - 3 * u2 + 1, u3 - 2 * u2 + u, -2 * u3 + 3 * u2, u3 - u2];
};

export const hermitePoint = (s: HermiteSegment, u: number): [number, number] => {
    const [h00, h10, h01, h11] = hermiteBasis(u);
    return [
        h00 * s.p0[0] + h10 * s.m0[0] + h01 * s.p1[0] + h11 * s.m1[0],
        h00 * s.p0[1] + h10 * s.m0[1] + h01 * s.p1[1] + h11 * s.m1[1],
    ];
};

/** H'(u) with respect to the local parameter. */
export const hermiteDerivative = (s: HermiteSegment, u: number): [number, number] => {
    const u2 = u * u;
    const d00 = 6 * u2 - 6 * u;
    const d10 = 3 * u2 - 4 * u + 1;
    const d01 = -6 * u2 + 6 * u;
    const d11 = 3 * u2 - 2 * u;
    return [
        d00 * s.p0[0] + d10 * s.m0[0] + d01 * s.p1[0] + d11 * s.m1[0],
        d00 * s.p0[1] + d10 * s.m0[1] + d01 * s.p1[1] + d11 * s.m1[1],
    ];
};

/** Bezier control points P0, P0 + m0/3, P1 - m1/3, P1 of the same cubic. */
export const hermiteToBezier = (s: HermiteSegment): [Point2, Point2, Point2, Point2] => [
    s.p0,
    [s.p0[0] + s.m0[0] / 3, s.p0[1] + s.m0[1] / 3],
    [s.p1[0] - s.m1[0] / 3, s.p1[1] - s.m1[1] / 3],
    s.p1,
];

/** Inverse conversion: tangents 3(Q1 - Q0) and 3(Q3 - Q2). */
export const bezierToHermite = (q: readonly [Point2, Point2, Point2, Point2]): HermiteSegment => ({
    p0: q[0], p1: q[3],
    m0: [3 * (q[1][0] - q[0][0]), 3 * (q[1][1] - q[0][1])],
    m1: [3 * (q[3][0] - q[2][0]), 3 * (q[3][1] - q[2][1])],
});

const chainParameters = (points: readonly Point2[], rule: ParameterRule): number[] => {
    if (points.length < 2) throw new RangeError('Catmull-Rom needs at least 2 points.');
    const t = curveParameters(points, rule);
    for (let i = 1; i < t.length; i++) {
        if (!(t[i] > t[i - 1])) throw new RangeError(`Points ${i - 1} and ${i} coincide: zero chord length.`);
    }
    // Uniform parameters never see the chord, so reject coincident points explicitly.
    for (let i = 1; i < points.length; i++) {
        if (points[i][0] === points[i - 1][0] && points[i][1] === points[i - 1][1]) {
            throw new RangeError(`Points ${i - 1} and ${i} coincide: zero chord length.`);
        }
    }
    return t;
};

/** Global-parameter derivative at each point (see module comment). Needs at least 2 points. */
export const catmullRomTangents = (points: readonly Point2[], rule: ParameterRule = 'uniform', tension = 1): Point2[] => {
    if (!Number.isFinite(tension)) throw new RangeError('Tension must be finite.');
    const t = chainParameters(points, rule);
    return points.map((_, i): Point2 => {
        const a = Math.max(i - 1, 0);
        const b = Math.min(i + 1, points.length - 1);
        const dt = t[b] - t[a];
        return [
            tension * (points[b][0] - points[a][0]) / dt,
            tension * (points[b][1] - points[a][1]) / dt,
        ];
    });
};

/** Hermite segments of the Catmull-Rom chain, local tangents scaled by each segment's parameter length. */
export const catmullRomSegments = (points: readonly Point2[], rule: ParameterRule = 'uniform', tension = 1): HermiteSegment[] => {
    const m = catmullRomTangents(points, rule, tension);
    const t = curveParameters(points, rule);
    return points.slice(0, -1).map((p0, i) => {
        const h = t[i + 1] - t[i];
        return {
            p0, p1: points[i + 1],
            m0: [h * m[i][0], h * m[i][1]] as Point2,
            m1: [h * m[i + 1][0], h * m[i + 1][1]] as Point2,
        };
    });
};
