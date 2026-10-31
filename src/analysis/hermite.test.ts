import {
    bezierToHermite, catmullRomSegments, catmullRomTangents, hermiteDerivative, hermitePoint, hermiteToBezier,
    type HermiteSegment,
} from './hermite';
import {lagrangeCurvePoint, type Point2} from './interpolation';

const near = (actual: number, expected: number, tolerance = 1e-12) =>
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance * Math.max(1, Math.abs(expected)));
const nearPoint = (actual: readonly number[], expected: readonly number[], tolerance = 1e-12) => {
    near(actual[0], expected[0], tolerance);
    near(actual[1], expected[1], tolerance);
};

/** Independent oracle: cubic Bernstein form with binomial coefficients. */
const bernstein = (q: readonly Point2[], u: number): [number, number] => {
    const binom = [1, 3, 3, 1];
    let x = 0;
    let y = 0;
    q.forEach((c, k) => {
        const w = binom[k] * u ** k * (1 - u) ** (3 - k);
        x += w * c[0];
        y += w * c[1];
    });
    return [x, y];
};

const DEFAULT: Point2[] = [[0, 0], [1, 2], [3, 3], [4, 0]];
const SEGMENT: HermiteSegment = {p0: [1, 2], p1: [3, 3], m0: [1.5, 1.5], m1: [1.5, -1]};

describe('spec I3 golden values', () => {
    it('uniform Catmull-Rom tangents (1.5, 1.5) at (1,2) and (1.5, -1) at (3,3), one-sided at the ends', () => {
        const m = catmullRomTangents(DEFAULT);
        nearPoint(m[1], [1.5, 1.5]);
        nearPoint(m[2], [1.5, -1]);
        nearPoint(m[0], [1, 2]);
        nearPoint(m[3], [1, -3]);
    });

    it('Hermite midpoint is (2, 2.8125), equal to 1/2(P1+P2) + 1/8(m1-m2) and the four-point rule', () => {
        nearPoint(hermitePoint(SEGMENT, 0.5), [2, 2.8125]);
        const w = [-1 / 16, 9 / 16, 9 / 16, -1 / 16];
        nearPoint(hermitePoint(SEGMENT, 0.5), [
            DEFAULT.reduce((s, p, i) => s + w[i] * p[0], 0),
            DEFAULT.reduce((s, p, i) => s + w[i] * p[1], 0),
        ]);
        nearPoint(hermitePoint(SEGMENT, 0.5), lagrangeCurvePoint(DEFAULT, [0, 1, 2, 3], 1.5).point);
    });

    it('catmullRomSegments for uniform parameters equals the interior-segment tangents', () => {
        const s = catmullRomSegments(DEFAULT)[1];
        nearPoint(s.m0, [1.5, 1.5]);
        nearPoint(s.m1, [1.5, -1]);
        nearPoint(hermitePoint(s, 0.5), [2, 2.8125]);
    });
});

describe('Hermite end conditions', () => {
    it('reproduces end points and tangents', () => {
        nearPoint(hermitePoint(SEGMENT, 0), SEGMENT.p0);
        nearPoint(hermitePoint(SEGMENT, 1), SEGMENT.p1);
        nearPoint(hermiteDerivative(SEGMENT, 0), SEGMENT.m0);
        nearPoint(hermiteDerivative(SEGMENT, 1), SEGMENT.m1);
    });

    it('derivative agrees with a central finite difference', () => {
        const h = 1e-6;
        for (const u of [0.1, 0.4, 0.8]) {
            const a = hermitePoint(SEGMENT, u + h);
            const b = hermitePoint(SEGMENT, u - h);
            nearPoint(hermiteDerivative(SEGMENT, u), [(a[0] - b[0]) / (2 * h), (a[1] - b[1]) / (2 * h)], 1e-7);
        }
    });
});

describe('Bezier conversion', () => {
    it('gives control points P0, P0 + m0/3, P1 - m1/3, P1', () => {
        const q = hermiteToBezier(SEGMENT);
        nearPoint(q[0], [1, 2]);
        nearPoint(q[1], [1.5, 2.5]);
        nearPoint(q[2], [2.5, 3 + 1 / 3]);
        nearPoint(q[3], [3, 3]);
    });

    it('samples identically to the Hermite form (1e-12), also for a random-like segment', () => {
        const other: HermiteSegment = {p0: [-2, 0.7], p1: [5, -3], m0: [4, -9], m1: [-6, 2.5]};
        for (const s of [SEGMENT, other]) {
            const q = hermiteToBezier(s);
            for (let i = 0; i <= 50; i++) nearPoint(bernstein(q, i / 50), hermitePoint(s, i / 50));
        }
    });

    it('round trips through bezierToHermite', () => {
        const back = bezierToHermite(hermiteToBezier(SEGMENT));
        nearPoint(back.m0, SEGMENT.m0);
        nearPoint(back.m1, SEGMENT.m1);
    });
});

describe('Catmull-Rom chains', () => {
    const wiggly: Point2[] = [[0, 0], [1, 2], [3, 3], [4, 0], [7, -1], [8, 4]];

    it('interpolates every point and is C1 at the interior joins (uniform and chord)', () => {
        for (const rule of ['uniform', 'chord'] as const) {
            const segments = catmullRomSegments(wiggly, rule);
            expect(segments).toHaveLength(wiggly.length - 1);
            segments.forEach((s, i) => {
                nearPoint(hermitePoint(s, 0), wiggly[i]);
                nearPoint(hermitePoint(s, 1), wiggly[i + 1]);
            });
            // C1 in the global parameter: derivative / segment length matches on both sides.
            const t = [0];
            wiggly.slice(1).forEach((p, i) => t.push(t[i] + (rule === 'uniform' ? 1 : Math.hypot(p[0] - wiggly[i][0], p[1] - wiggly[i][1]))));
            for (let i = 1; i < segments.length; i++) {
                const left = hermiteDerivative(segments[i - 1], 1);
                const right = hermiteDerivative(segments[i], 0);
                nearPoint([left[0] / (t[i] - t[i - 1]), left[1] / (t[i] - t[i - 1])],
                    [right[0] / (t[i + 1] - t[i]), right[1] / (t[i + 1] - t[i])]);
            }
        }
    });

    it('is only C1: the second derivatives (via Bezier) differ at a join', () => {
        const [a, b] = catmullRomSegments(DEFAULT);
        const qa = hermiteToBezier(a);
        const qb = hermiteToBezier(b);
        // B''(1) of the left segment = 6(Q1 - 2Q2 + Q3); B''(0) of the right = 6(Q0 - 2Q1 + Q2).
        const left = 6 * (qa[1][1] - 2 * qa[2][1] + qa[3][1]);
        const right = 6 * (qb[0][1] - 2 * qb[1][1] + qb[2][1]);
        expect(Math.abs(left - right)).toBeGreaterThan(1);
    });

    it('is local: moving point i changes only segments i-2..i+1 (at most four, not two: neighbour tangents move)', () => {
        const moved = wiggly.map((p, i): Point2 => (i === 3 ? [4.5, 1] : p));
        const before = catmullRomSegments(wiggly);
        const after = catmullRomSegments(moved);
        const changed = before.filter((s, i) => JSON.stringify(s) !== JSON.stringify(after[i])).length;
        expect(changed).toBe(4);
        expect(JSON.stringify(before[0])).toBe(JSON.stringify(after[0]));
        // Only the two segments adjacent to the moved point change their end positions.
        expect(before.filter((s, i) => JSON.stringify([s.p0, s.p1]) !== JSON.stringify([after[i].p0, after[i].p1]))).toHaveLength(2);
    });

    it('tension scales tangents; zero tension gives zero tangents', () => {
        nearPoint(catmullRomTangents(DEFAULT, 'uniform', 0.5)[1], [0.75, 0.75]);
        nearPoint(catmullRomTangents(DEFAULT, 'uniform', 0)[1], [0, 0]);
    });

    it('chord-length tangents use the parameter span: P1 tangent is (P2 - P0) / (t2 - t0)', () => {
        const t1 = Math.hypot(1, 2);
        const t2 = t1 + Math.hypot(2, 1);
        nearPoint(catmullRomTangents(DEFAULT, 'chord')[1], [3 / t2, 3 / t2]);
    });

    it('rejects coincident consecutive points and too few points', () => {
        const dup: Point2[] = [[0, 0], [1, 1], [1, 1], [2, 0]];
        expect(() => catmullRomTangents(dup, 'chord')).toThrow(/zero chord/);
        expect(() => catmullRomTangents(dup, 'uniform')).toThrow(/zero chord/);
        expect(() => catmullRomSegments([[0, 0]])).toThrow(RangeError);
        expect(() => catmullRomTangents(DEFAULT, 'uniform', Number.NaN)).toThrow(RangeError);
    });
});
