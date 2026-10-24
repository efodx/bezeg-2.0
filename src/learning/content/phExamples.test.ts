/**
 * Mathematical checks for the cubic and quintic PH lesson examples (task 02).
 *
 * The expected values are computed here independently of `ph-math.ts`: the generators are squared as exact complex
 * polynomials in the power basis (fractions), integrated, and converted to Bernstein form. The production
 * `phControlPoints`, `phSigmas` and `phOffsetRational` are then compared with those values, and the lesson content is
 * compared with the same inputs through the real lesson adapter.
 */
import {phControlPoints, phOffsetRational, phSigmas, type Vec} from '../../bezeg/impl/curve/ph-math';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {expansionGuidedLessons} from './expansionGuidedLessons';
import {pilotGuidedLessons} from './guidedLessons';
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';

// ---- exact fractions (small integers; no overflow at these sizes) ----
type Frac = readonly [num: number, den: number];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const frac = (n: number, d = 1): Frac => {
    const g = gcd(n, d) || 1;
    const s = d < 0 ? -1 : 1;
    return [(s * n) / g, (s * d) / g];
};
const add = (a: Frac, b: Frac) => frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const mulF = (a: Frac, b: Frac) => frac(a[0] * b[0], a[1] * b[1]);
const num = (a: Frac) => a[0] / a[1];
const eq = (a: Frac, b: Frac) => a[0] === b[0] && a[1] === b[1];

// ---- exact complex polynomials in the power basis: coefficient arrays of [re, im] fractions ----
type Cx = readonly [Frac, Frac];
type Poly = readonly Cx[];
const zero: Cx = [frac(0), frac(0)];
const cAdd = (a: Cx, b: Cx): Cx => [add(a[0], b[0]), add(a[1], b[1])];
const cMul = (a: Cx, b: Cx): Cx => [add(mulF(a[0], b[0]), mulF(frac(-1), mulF(a[1], b[1]))), add(mulF(a[0], b[1]), mulF(a[1], b[0]))];
const pMul = (a: Poly, b: Poly): Poly => {
    const out: Cx[] = Array.from({length: a.length + b.length - 1}, () => zero);
    a.forEach((x, i) => b.forEach((y, j) => { out[i + j] = cAdd(out[i + j], cMul(x, y)); }));
    return out;
};
const binom = (n: number, k: number): number => (k === 0 || k === n ? 1 : binom(n - 1, k - 1) + binom(n - 1, k));

/** Power-basis polynomial of w(t) = sum_i C(m,i)(1-t)^(m-i) t^i w_i for generators given as integer pairs. */
function hodographPower(generators: ReadonlyArray<readonly [number, number]>): Poly {
    const m = generators.length - 1;
    let total: Poly = [zero];
    generators.forEach(([re, im], i) => {
        // C(m,i) t^i (1-t)^(m-i)
        let term: Poly = [[frac(binom(m, i)), frac(0)]];
        for (let a = 0; a < i; a++) term = pMul(term, [[frac(0), frac(0)], [frac(1), frac(0)]]);
        for (let a = 0; a < m - i; a++) term = pMul(term, [[frac(1), frac(0)], [frac(-1), frac(0)]]);
        term = pMul(term, [[frac(re), frac(im)]]);
        const len = Math.max(total.length, term.length);
        total = Array.from({length: len}, (_, k) => cAdd(total[k] ?? zero, term[k] ?? zero));
    });
    return total;
}

/** Bernstein control points of r(t) = P0 + integral of w^2, from the exact power-basis integral. */
function exactControlPoints(start: readonly [number, number], generators: ReadonlyArray<readonly [number, number]>) {
    const derivative = pMul(hodographPower(generators), hodographPower(generators)); // r'(t)
    const n = derivative.length; // degree of r
    const power: Cx[] = [[frac(start[0]), frac(start[1])]];
    derivative.forEach((c, k) => power.push([mulF(c[0], frac(1, k + 1)), mulF(c[1], frac(1, k + 1))]));
    // b_k = sum_{j<=k} C(k,j)/C(n,j) a_j
    const points = Array.from({length: n + 1}, (_, k) => {
        let re = frac(0);
        let im = frac(0);
        for (let j = 0; j <= k; j++) {
            const s = frac(binom(k, j), binom(n, j));
            re = add(re, mulF(s, power[j][0]));
            im = add(im, mulF(s, power[j][1]));
        }
        return [re, im] as const;
    });
    return {derivative, power, points};
}

const evalPoly = (p: Poly, t: Frac): Cx => p.reduceRight((acc, c) => cAdd(cMul(acc, [t, frac(0)]), c), zero);
const speedPolyReal = (w: Poly): Frac[] => {
    // |w(t)|^2 = w * conj(w), real polynomial
    const conj: Poly = w.map(c => [c[0], mulF(frac(-1), c[1])] as Cx);
    return pMul(w, conj).map(c => c[0]);
};
const evalReal = (p: readonly Frac[], t: Frac): Frac => p.reduceRight((acc, c) => add(mulF(acc, t), c), frac(0));
const integrate01 = (p: readonly Frac[]): Frac => p.reduce((acc, c, k) => add(acc, mulF(c, frac(1, k + 1))), frac(0));

// ---- the two lessons' inputs (written out independently of the lesson content) ----
const CUBIC = {start: [-2, -1] as const, generators: [[2, 0], [2, 1]] as const, view: [-3.2, 2.7, 3.4, -2.7] as LessonViewBox, offsets: [1, -1, 1]};
const QUINTIC = {start: [-2, -1] as const, generators: [[2, 0], [2, 1], [1, 1]] as const, view: [-3, 2.2, 2.5, -2.6] as LessonViewBox, offsets: [0.5, -0.5, 1]};

const asVec = (g: ReadonlyArray<readonly [number, number]>): Vec[] => g.map(([x, y]) => [x, y] as Vec);

// ---- numeric helpers for the production side ----
const bernstein = (n: number, k: number, t: number) => binom(n, k) * (1 - t) ** (n - k) * t ** k;
const bezierAt = (pts: ReadonlyArray<Vec>, t: number): Vec => {
    const n = pts.length - 1;
    return pts.reduce((acc, p, k) => [acc[0] + bernstein(n, k, t) * p[0], acc[1] + bernstein(n, k, t) * p[1]] as Vec, [0, 0] as Vec);
};
const rationalAt = (pts: ReadonlyArray<Vec>, weights: ReadonlyArray<number>, t: number): Vec => {
    const n = pts.length - 1;
    let x = 0; let y = 0; let w = 0;
    pts.forEach((p, k) => { const b = bernstein(n, k, t) * weights[k]; x += b * p[0]; y += b * p[1]; w += b; });
    return [x / w, y / w];
};
const speedAt = (sigmas: ReadonlyArray<number>, t: number) => sigmas.reduce((acc, s, k) => acc + s * bernstein(sigmas.length - 1, k, t), 0);
const simpson = (f: (t: number) => number, steps = 400) => {
    const h = 1 / steps;
    let s = f(0) + f(1);
    for (let i = 1; i < steps; i++) s += f(i * h) * (i % 2 === 0 ? 2 : 4);
    return (s * h) / 3;
};

/** First and second derivative of r at t, from the control points. */
function derivatives(points: ReadonlyArray<Vec>, t: number) {
    const n = points.length - 1;
    const d1 = points.slice(1).map((p, i) => [n * (p[0] - points[i][0]), n * (p[1] - points[i][1])] as Vec);
    const d2 = d1.slice(1).map((p, i) => [(n - 1) * (p[0] - d1[i][0]), (n - 1) * (p[1] - d1[i][1])] as Vec);
    return {d1: bezierAt(d1, t), d2: bezierAt(d2, t)};
}
const curvature = (points: ReadonlyArray<Vec>, t: number) => {
    const {d1, d2} = derivatives(points, t);
    return (d1[0] * d2[1] - d1[1] * d2[0]) / Math.hypot(d1[0], d1[1]) ** 3;
};
/** Minimum over [0,1] of 1 + d*kappa, which must stay positive for a non-singular offset. */
const minOffsetFactor = (points: ReadonlyArray<Vec>, d: number) => {
    let min = Infinity;
    for (let i = 0; i <= 2000; i++) min = Math.min(min, 1 + d * curvature(points, i / 2000));
    return min;
};
const normalOffset = (points: ReadonlyArray<Vec>, t: number, d: number): Vec => {
    const p = bezierAt(points, t);
    const {d1} = derivatives(points, t);
    const speed = Math.hypot(d1[0], d1[1]);
    return [p[0] + (d * d1[1]) / speed, p[1] - (d * d1[0]) / speed];
};

// ---- lesson content through the real adapter ----
type Scene = {fixture?: LessonCurveFixture; view?: LessonViewBox; offsets: number[]; sceneIds: string[]};
function lessonScenes(id: 'ph-cubic' | 'ph-quintic'): Scene[] {
    const lesson = getLessonForDemonstration(id)!;
    return lesson.steps.flatMap(step => (step.scene ? [step.scene] : [])).map(scene => {
        const actions = scene.actions as readonly LessonAction[];
        const prepared = actions.find(a => a.kind === 'prepared-scene');
        const out: Scene = {offsets: [], sceneIds: []};
        if (prepared && prepared.kind === 'prepared-scene' && prepared.source === 'lesson-fixture') {
            out.fixture = prepared.curve;
            out.view = prepared.view;
            out.sceneIds.push(prepared.sceneId);
        }
        for (const a of actions) if (a.kind === 'parameter' && a.name === 'offset-distance') out.offsets.push(a.value);
        return out;
    });
}

const CASES = [
    {name: 'cubic', id: 'ph-cubic' as const, ...CUBIC, degree: 3},
    {name: 'quintic', id: 'ph-quintic' as const, ...QUINTIC, degree: 5},
];

describe('exact PH example values', () => {
    const cubic = exactControlPoints(CUBIC.start, CUBIC.generators);
    const quintic = exactControlPoints(QUINTIC.start, QUINTIC.generators);

    test('cubic control points are the settled exact fractions and match phControlPoints', () => {
        const expected: [Frac, Frac][] = [[frac(-2), frac(-1)], [frac(-2, 3), frac(-1)], [frac(2, 3), frac(-1, 3)], [frac(5, 3), frac(1)]];
        expect(cubic.points.length).toBe(4);
        cubic.points.forEach((p, k) => { expect(eq(p[0], expected[k][0])).toBe(true); expect(eq(p[1], expected[k][1])).toBe(true); });
        phControlPoints(CUBIC.start, asVec(CUBIC.generators)).forEach((p, k) => {
            expect(p[0]).toBeCloseTo(num(cubic.points[k][0]), 12);
            expect(p[1]).toBeCloseTo(num(cubic.points[k][1]), 12);
        });
    });

    test('quintic control points are the settled exact fractions and match phControlPoints', () => {
        const expected: [Frac, Frac][] = [
            [frac(-2), frac(-1)], [frac(-6, 5), frac(-1)], [frac(-2, 5), frac(-3, 5)],
            [frac(2, 15), frac(1, 15)], [frac(1, 3), frac(2, 3)], [frac(1, 3), frac(16, 15)],
        ];
        expect(quintic.points.length).toBe(6);
        quintic.points.forEach((p, k) => { expect(eq(p[0], expected[k][0])).toBe(true); expect(eq(p[1], expected[k][1])).toBe(true); });
        phControlPoints(QUINTIC.start, asVec(QUINTIC.generators)).forEach((p, k) => {
            expect(p[0]).toBeCloseTo(num(quintic.points[k][0]), 12);
            expect(p[1]).toBeCloseTo(num(quintic.points[k][1]), 12);
        });
    });

    test('hodograph midpoint values, r(1/2) of the cubic and r(1) of the quintic', () => {
        const half = frac(1, 2);
        const wc = evalPoly(hodographPower(CUBIC.generators), half);
        expect([eq(wc[0], frac(2)), eq(wc[1], frac(1, 2))]).toEqual([true, true]);
        const wq = evalPoly(hodographPower(QUINTIC.generators), half);
        expect([eq(wq[0], frac(7, 4)), eq(wq[1], frac(3, 4))]).toEqual([true, true]);
        const rc = evalPoly(cubic.power, half);
        expect([eq(rc[0], frac(-1, 24)), eq(rc[1], frac(-1, 2))]).toEqual([true, true]);
        const rq = evalPoly(quintic.power, frac(1));
        expect([eq(rq[0], frac(1, 3)), eq(rq[1], frac(16, 15))]).toEqual([true, true]);
    });

    test('speeds, midpoint speeds and arc lengths are 4+t^2, 17/4, 13/3 and 4-4t^3+2t^4, 29/8, 17/5', () => {
        const sc = speedPolyReal(hodographPower(CUBIC.generators));
        expect(sc.map(num)).toEqual([4, 0, 1]);
        expect(eq(evalReal(sc, frac(1, 2)), frac(17, 4))).toBe(true);
        expect(eq(integrate01(sc), frac(13, 3))).toBe(true);
        const sq = speedPolyReal(hodographPower(QUINTIC.generators));
        expect(sq.map(num)).toEqual([4, 0, 0, -4, 2]);
        expect(eq(evalReal(sq, frac(1, 2)), frac(29, 8))).toBe(true);
        expect(eq(integrate01(sq), frac(17, 5))).toBe(true);
    });

    test('phSigmas reproduce the speed and Simpson integration reproduces the lengths', () => {
        for (const [c, speed, half, length] of [
            [CUBIC, (t: number) => 4 + t * t, 17 / 4, 13 / 3],
            [QUINTIC, (t: number) => 4 - 4 * t ** 3 + 2 * t ** 4, 29 / 8, 17 / 5],
        ] as const) {
            const sigmas = phSigmas(asVec(c.generators));
            for (const t of [0, 0.1, 0.5, 0.77, 1]) expect(speedAt(sigmas, t)).toBeCloseTo(speed(t), 12);
            expect(speedAt(sigmas, 0.5)).toBeCloseTo(half, 12);
            expect(simpson(t => speedAt(sigmas, t))).toBeCloseTo(length, 9);
            // independent: arc length of the control-point curve by its own derivative
            const points = phControlPoints(c.start, asVec(c.generators));
            expect(simpson(t => { const {d1} = derivatives(points, t); return Math.hypot(d1[0], d1[1]); })).toBeCloseTo(length, 9);
        }
    });

    test('the quintic is genuinely degree five: w0-2w1+w2 is nonzero and the fifth difference is (0,2/5), i.e. 5! times it (0,48)', () => {
        const [w0, w1, w2] = QUINTIC.generators;
        expect([w0[0] - 2 * w1[0] + w2[0], w0[1] - 2 * w1[1] + w2[1]]).toEqual([-1, -1]);
        const pts = quintic.points.map(p => [num(p[0]), num(p[1])]);
        const diff5 = [0, 1].map(axis => pts.reduce((acc, p, k) => acc + (k % 2 === 1 ? -1 : 1) * -1 * binom(5, k) * p[axis], 0));
        // sum (-1)^(5-k) C(5,k) P_k
        expect(diff5[0]).toBeCloseTo(0, 10);
        expect(diff5[1]).toBeCloseTo(2 / 5, 10);
        expect(120 * diff5[1]).toBeCloseTo(48, 9);
        // leading r' coefficient is (-1-i)^2 = 2i, so the t^5 coefficient of r is 2i/5
        const lead = hodographPower(QUINTIC.generators)[2];
        const sq = cMul(lead, lead);
        expect([eq(sq[0], frac(0)), eq(sq[1], frac(2))]).toEqual([true, true]);
    });

    test('regularity: minimum speed is 4 (cubic) and 2 (quintic), both positive', () => {
        const cs = phSigmas(asVec(CUBIC.generators));
        const qs = phSigmas(asVec(QUINTIC.generators));
        const min = (s: number[]) => Math.min(...Array.from({length: 1001}, (_, i) => speedAt(s, i / 1000)));
        expect(min(cs)).toBeCloseTo(4, 9);
        expect(min(qs)).toBeCloseTo(2, 9);
    });
});

describe('offsets used by the lessons', () => {
    test('the cubic curvature is 4/(4+t^2)^2 and the quintic maximum curvature is 1 at t=1', () => {
        const cp = phControlPoints(CUBIC.start, asVec(CUBIC.generators));
        for (const t of [0, 0.3, 0.5, 1]) expect(curvature(cp, t)).toBeCloseTo(4 / (4 + t * t) ** 2, 10);
        const qp = phControlPoints(QUINTIC.start, asVec(QUINTIC.generators));
        let max = -Infinity;
        for (let i = 0; i <= 1000; i++) max = Math.max(max, curvature(qp, i / 1000));
        expect(max).toBeCloseTo(1, 9);
        expect(curvature(qp, 1)).toBeCloseTo(1, 9);
    });

    for (const c of CASES) {
        test(`${c.name}: every lesson offset is non-singular (1 + d*kappa > 0 on [0,1]) and equals r + d*N`, () => {
            const points = phControlPoints(c.start, asVec(c.generators));
            const sigmas = phSigmas(asVec(c.generators));
            for (const d of lessonScenes(c.id).flatMap(s => s.offsets)) {
                expect(minOffsetFactor(points, d)).toBeGreaterThan(0.3);
                const rational = phOffsetRational(points, sigmas, d);
                for (const t of [0, 0.2, 0.5, 0.8, 1]) {
                    const got = rationalAt(rational.points, rational.weights, t);
                    const want = normalOffset(points, t, d);
                    expect(got[0]).toBeCloseTo(want[0], 9);
                    expect(got[1]).toBeCloseTo(want[1], 9);
                }
            }
        });
    }

    test('d > 0 is the right of the direction of travel: the cubic offset at t=0 is (0,-d) below the start', () => {
        const points = phControlPoints(CUBIC.start, asVec(CUBIC.generators));
        const rational = phOffsetRational(points, phSigmas(asVec(CUBIC.generators)), 1);
        const start = rationalAt(rational.points, rational.weights, 0);
        expect(start[0]).toBeCloseTo(-2, 12);
        expect(start[1]).toBeCloseTo(-2, 12);
    });

    test('the normal distance is exactly |d| while the vertical shift of the cubic offset is 1 at t=0 and 3/5 at t=1', () => {
        const points = phControlPoints(CUBIC.start, asVec(CUBIC.generators));
        for (const t of [0, 0.5, 1]) {
            const base = bezierAt(points, t);
            const off = normalOffset(points, t, 1);
            expect(Math.hypot(off[0] - base[0], off[1] - base[1])).toBeCloseTo(1, 12);
        }
        const sigmas = phSigmas(asVec(CUBIC.generators));
        const rational = phOffsetRational(points, sigmas, 1);
        const shift = (t: number) => bezierAt(points, t)[1] - rationalAt(rational.points, rational.weights, t)[1];
        expect(shift(0)).toBeCloseTo(1, 10);
        expect(shift(1)).toBeCloseTo(3 / 5, 10);
        const end = rationalAt(rational.points, rational.weights, 1);
        expect(end[0] - bezierAt(points, 1)[0]).toBeCloseTo(4 / 5, 10);
    });

    test('the guard rejects offsets that would be singular: cubic d=-4 and quintic d=-1', () => {
        expect(minOffsetFactor(phControlPoints(CUBIC.start, asVec(CUBIC.generators)), -4)).toBeLessThan(1e-9);
        expect(minOffsetFactor(phControlPoints(QUINTIC.start, asVec(QUINTIC.generators)), -1)).toBeLessThan(1e-9);
        expect(minOffsetFactor(phControlPoints(CUBIC.start, asVec(CUBIC.generators)), -1)).toBeGreaterThan(0.7);
    });
});

describe('lesson content carries exactly these inputs', () => {
    for (const c of CASES) {
        test(`${c.name}: every geometry scene uses the same fixture and view, with the settled offsets in order`, () => {
            const scenes = lessonScenes(c.id);
            expect(scenes.length).toBeGreaterThanOrEqual(4);
            const expectedFixture: LessonCurveFixture = {points: [c.start as unknown as [number, number]], hodographs: c.generators as unknown as [number, number][]};
            for (const scene of scenes) {
                expect(scene.fixture).toEqual(expectedFixture);
                expect(scene.view).toEqual(c.view);
            }
            expect(scenes.flatMap(s => s.offsets)).toEqual(c.offsets);
        });

        test(`${c.name}: the view contains the control polygon, the curve and every offset with margin`, () => {
            const [left, top, right, bottom] = c.view;
            const points = phControlPoints(c.start, asVec(c.generators));
            const sigmas = phSigmas(asVec(c.generators));
            const shown: Vec[] = [...points];
            for (let i = 0; i <= 200; i++) shown.push(bezierAt(points, i / 200));
            for (const d of lessonScenes(c.id).flatMap(s => s.offsets)) {
                const rational = phOffsetRational(points, sigmas, d);
                for (let i = 0; i <= 200; i++) shown.push(rationalAt(rational.points, rational.weights, i / 200));
            }
            for (const [x, y] of shown) {
                expect(x).toBeGreaterThan(left + 0.5);
                expect(x).toBeLessThan(right - 0.5);
                expect(y).toBeLessThan(top - 0.5);
                expect(y).toBeGreaterThan(bottom + 0.5);
            }
        });

        test(`${c.name}: the lesson text no longer carries the old default-scene numbers`, () => {
            const json = JSON.stringify([getLessonForDemonstration(c.id), (c.id === 'ph-cubic' ? pilotGuidedLessons : expansionGuidedLessons).find(l => l.demonstrationId === c.id)]);
            for (const old of ['-4.2', '-4{,}2', '9.3025', '9,3025', '7.890625', '-3.05', '-3{,}3', '-0.225', '(1,\\\\,-1)']) {
                expect(json).not.toContain(old);
            }
        });
    }

    test('the adapter emits lesson-fixture prepared scenes first, then the actions', () => {
        for (const c of CASES) {
            const lesson = getLessonForDemonstration(c.id)!;
            for (const step of lesson.steps) {
                if (!step.scene) continue;
                const first = step.scene.actions[0] as LessonAction;
                expect(first.kind).toBe('prepared-scene');
                expect(first.kind === 'prepared-scene' && first.source).toBe('lesson-fixture');
            }
        }
    });

    test('lesson text states the settled results in both languages', () => {
        const cubic = JSON.stringify(getLessonForDemonstration('ph-cubic'));
        const quintic = JSON.stringify(getLessonForDemonstration('ph-quintic'));
        for (const needle of ['tfrac{13}{3}', 'tfrac{17}{4}', 'tfrac{16}{3}', '4+t^2']) expect(cubic).toContain(needle.replace(/\\/g, '\\\\'));
        for (const needle of ['tfrac{17}{5}', 'tfrac{29}{8}', '4-4t^3+2t^4']) expect(quintic).toContain(needle.replace(/\\/g, '\\\\'));
    });
});
