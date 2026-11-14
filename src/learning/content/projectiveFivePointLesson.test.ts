/**
 * K4 (projective-five-point): every scene lands in the state the text states (the real graph, one synchronous sequence of actions, out of
 * order and twice), and every number the lesson quotes is recomputed here with exact fractions and floating point of our own (the conic
 * from cofactors, the end tangents, the weight from barycentric coordinates of the third point, the Farin points), without the projective
 * kernel. The graph's readout is then compared with these numbers, and the quoted text with both.
 */
import {act} from '@testing-library/react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {sceneActions} from '../runtime/lessonCatalog';
import {projectiveConicsGuidedLessons} from './projectiveConicsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {FivePointGraph} from '../../graphs/projective/FivePointGraph';
import {FIVE_POINT_EXAMPLES, FivePointExampleId} from '../../graphs/projective/fivePointModel';
import {MIN_CIRCLE_PIECES} from '../../graphs/curves/rational/RationalBezierCurveCircleGraphN';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- Exact fractions of our own (bigint), independent of src/projective ------------------------------------------------------------

interface Fr {readonly n: bigint; readonly d: bigint}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const fr = (n: number | bigint, d: number | bigint = 1): Fr => {
    let top = BigInt(n);
    let bottom = BigInt(d);
    if (bottom < 0n) { top = -top; bottom = -bottom; }
    const g = gcd(top, bottom) || 1n;
    return {n: top / g, d: bottom / g};
};
const add = (a: Fr, b: Fr): Fr => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Fr, b: Fr): Fr => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Fr, b: Fr): Fr => fr(a.n * b.n, a.d * b.d);
const div = (a: Fr, b: Fr): Fr => fr(a.n * b.d, a.d * b.n);
const eq = (a: Fr, b: Fr): boolean => a.n * b.d === b.n * a.d;
const isZero = (a: Fr): boolean => a.n === 0n;
const num = (a: Fr): number => Number(a.n) / Number(a.d);
const sum = (values: readonly Fr[]): Fr => values.reduce(add, fr(0));

type V3 = readonly [Fr, Fr, Fr];
const pt = (x: Fr, y: Fr): V3 => [x, y, fr(1)];
const dot = (a: V3, b: V3): Fr => sum([mul(a[0], b[0]), mul(a[1], b[1]), mul(a[2], b[2])]);
const cross3 = (a: V3, b: V3): V3 => [sub(mul(a[1], b[2]), mul(a[2], b[1])), sub(mul(a[2], b[0]), mul(a[0], b[2])), sub(mul(a[0], b[1]), mul(a[1], b[0]))];
const det3 = (a: V3, b: V3, c: V3): Fr => dot(a, cross3(b, c));

/** Determinant of a square matrix of fractions by cofactor expansion along the first row. */
function det(m: readonly (readonly Fr[])[]): Fr {
    if (m.length === 1) return m[0][0];
    let total = fr(0);
    for (let column = 0; column < m.length; column += 1) {
        const minor = m.slice(1).map(row => row.filter((_, j) => j !== column));
        const term = mul(m[0][column], det(minor));
        total = column % 2 === 0 ? add(total, term) : sub(total, term);
    }
    return total;
}

type P = readonly [Fr, Fr];
/** The six coefficients (x^2, xy, y^2, x, y, 1) of the conic through five points: signed 5x5 minors of the 5x6 matrix. */
function cofactors(points: readonly P[]): Fr[] {
    const rows = points.map(([x, y]) => [mul(x, x), mul(x, y), mul(y, y), x, y, fr(1)]);
    return [0, 1, 2, 3, 4, 5].map(column => {
        const minor = det(rows.map(row => row.filter((_, j) => j !== column)));
        return column % 2 === 0 ? minor : sub(fr(0), minor);
    });
}
/** Whether two coefficient lists are the same conic (equal up to a non-zero scale). */
function sameConic(a: readonly Fr[], b: readonly Fr[]): boolean {
    for (let i = 0; i < a.length; i += 1) for (let j = 0; j < a.length; j += 1) if (!eq(mul(a[i], b[j]), mul(a[j], b[i]))) return false;
    return a.some(v => !isZero(v)) && b.some(v => !isZero(v));
}
const scaled = (values: readonly number[]): Fr[] => values.map(v => fr(v));

/** The tangent line (homogeneous) of the conic `c` at the point `p` on it: the polar `M p` with the symmetric matrix M of the conic. */
function tangentAt(c: readonly Fr[], p: P): V3 {
    const [a, b, cc, d, e, f] = c;
    const half = fr(1, 2);
    const [x, y] = p;
    return [
        add(add(mul(a, x), mul(mul(b, half), y)), mul(d, half)),
        add(add(mul(mul(b, half), x), mul(cc, y)), mul(e, half)),
        add(add(mul(mul(d, half), x), mul(mul(e, half), y)), f),
    ];
}
/** The point where two lines meet, as an affine point (throws when they are parallel). */
function meet(l: V3, m: V3): P {
    const p = cross3(l, m);
    if (isZero(p[2])) throw new Error('parallel lines');
    return [div(p[0], p[2]), div(p[1], p[2])];
}
/** The weight squared of the arc P0 P1 P2 through Q: Q = a P0 + b P1 + g P2 gives w^2 = b^2 / (4 a g). */
function weightSquared(p0: P, p1: P, p2: P, q: P): Fr {
    const [v0, v1, v2, vq] = [p0, p1, p2, q].map(([x, y]) => pt(x, y));
    const whole = det3(v0, v1, v2);
    const alpha = div(det3(vq, v1, v2), whole);
    const beta = div(det3(v0, vq, v2), whole);
    const gamma = div(det3(v0, v1, vq), whole);
    return div(mul(beta, beta), mul(fr(4), mul(alpha, gamma)));
}

// ---- The scenes' points, written down by hand (the examples' numerators over 15) ----------------------------------------------------

const f15 = (n: number) => fr(n, 15);
type ExampleKey = Exclude<FivePointExampleId, 'custom'>;
const EXAMPLE_POINTS: Record<ExampleKey, readonly P[]> = {
    ellipse: [[fr(5), fr(0)], [fr(0), fr(3)], [fr(-5), fr(0)], [fr(4), fr(9, 5)], [fr(-3), fr(12, 5)]],
    hyperbola: [[fr(3), fr(0)], [fr(5), fr(16, 3)], [fr(51, 15), fr(32, 15)], [fr(-3), fr(0)], [fr(5), fr(-16, 3)]],
    parabola: [[fr(0), fr(0)], [fr(4), fr(4)], [fr(1), fr(2)], [fr(1), fr(-2)], [fr(4), fr(-4)]],
    'three-collinear': [[fr(0), fr(0)], [fr(1), fr(1)], [fr(2), fr(2)], [fr(3), fr(0)], [fr(0), fr(4)]],
    'four-collinear': [[fr(0), fr(0)], [fr(1), fr(1)], [fr(2), fr(2)], [fr(3), fr(3)], [fr(0), fr(4)]],
};
const CONIC_OF = {
    ellipse: scaled([9, 0, 25, 0, 0, -225]),
    hyperbola: scaled([16, 0, -9, 0, 0, -144]),
    parabola: scaled([0, 0, 1, -4, 0, 0]),
    // The spec's line pair (docs/specs/projective-conics-lessons.md, K4 degenerate inputs): 96x^2 - 24xy - 72y^2 - 288x + 288y = 0.
    'three-collinear': scaled([96, -24, -72, -288, 288, 0]),
};

// ---- The lesson and the scenes -----------------------------------------------------------------------------------------------------

const lesson: GuidedLesson = projectiveConicsGuidedLessons.find(entry => entry.demonstrationId === 'projective-five-point')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const fields = (step: GuidedLessonStep, language: 'sl' | 'en'): string[] =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])];
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') => fields(step, language).join(' ');

interface Expected {
    readonly example: ExampleKey;
    readonly a: number;
    readonly b: number;
    readonly t: number;
    readonly extrapolating: boolean;
    readonly status: string;
}
const SCENES: Record<string, Expected> = {
    'five-point-predict': {example: 'ellipse', a: 0, b: 1, t: 3, extrapolating: false, status: 'ok'},
    'five-point-conic': {example: 'ellipse', a: 0, b: 1, t: 3, extrapolating: false, status: 'ok'},
    'five-point-ends': {example: 'ellipse', a: 0, b: 1, t: 3, extrapolating: false, status: 'ok'},
    'five-point-weight': {example: 'ellipse', a: 0, b: 1, t: 3, extrapolating: false, status: 'ok'},
    'five-point-bezier': {example: 'ellipse', a: 0, b: 1, t: 3, extrapolating: true, status: 'ok'},
    'five-point-parallel': {example: 'ellipse', a: 0, b: 2, t: 3, extrapolating: false, status: 'split-needed'},
    'five-point-hyperbola': {example: 'hyperbola', a: 0, b: 1, t: 2, extrapolating: true, status: 'ok'},
    'five-point-line-pair': {example: 'three-collinear', a: 0, b: 1, t: 2, extrapolating: false, status: 'line-pair'},
    'five-point-pencil': {example: 'four-collinear', a: 0, b: 1, t: 2, extrapolating: false, status: 'pencil-collinear'},
};

/** The control triangle, weight and Farin points of an arc with an `ok` status, computed here. */
function arcOf(e: Expected) {
    const points = EXAMPLE_POINTS[e.example];
    const conic = CONIC_OF[e.example as keyof typeof CONIC_OF];
    const [p0, p2, third] = [points[e.a], points[e.b], points[e.t]];
    const p1 = meet(tangentAt(conic, p0), tangentAt(conic, p2));
    const w2 = weightSquared(p0, p1, p2, third);
    const w = Math.sqrt(num(w2));
    const [x0, y0, x1, y1, x2, y2] = [p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]].map(num);
    const f1: [number, number] = [(x0 + w * x1) / (1 + w), (y0 + w * y1) / (1 + w)];
    const f2: [number, number] = [(w * x1 + x2) / (1 + w), (w * y1 + y2) / (1 + w)];
    const s: [number, number] = [(f1[0] + f2[0]) / 2, (f1[1] + f2[1]) / 2];
    return {p0, p1, p2, w2, w, f1, f2, s, ends: [[x0, y0], [x1, y1], [x2, y2]]};
}

function mount() {
    const graph = createGraph('projective-five-point');
    if (!(graph instanceof FivePointGraph)) throw new Error('projective-five-point must be the five-point graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}
const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? null;
const statusNode = () => document.querySelector('[data-projective-status]');

/** A number as the graph prints it: at most four decimals, no trailing zeros, the decimal comma in Slovenian. */
const printed = (value: number, language: 'sl' | 'en', digits = 4): string => {
    const text = String(Number(value.toFixed(digits))).replace('-', '−');
    return language === 'sl' ? text.replace('.', ',') : text;
};
const printedPoint = (p: readonly number[], language: 'sl' | 'en') => `(${printed(p[0], language)}, ${printed(p[1], language)})`;
const exactPrinted = (p: P) => `(${[p[0], p[1]].map(v => (v.d === 1n ? `${v.n}` : `${v.n}/${v.d}`).replace('-', '−')).join(', ')})`;

// ---- Tests -------------------------------------------------------------------------------------------------------------------------

test('K4 has nine ordered steps, each with a scene of its own that uses five-point operations', () => {
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(9);
    for (const step of lesson.steps) {
        const operations = actionsOf(step).flatMap(action => (action.kind === 'projective' ? [action.operation] : []));
        expect(operations.length, step.id).toBeGreaterThan(0);
        expect(operations.every(operation => operation.startsWith('five-point-')), step.id).toBe(true);
    }
});

test('K4: the examples of the graph are the hand-written points, and each conic recomputes from exact cofactors (the spec\'s numbers)', () => {
    for (const [id, points] of Object.entries(EXAMPLE_POINTS)) {
        const model = FIVE_POINT_EXAMPLES[id as ExampleKey];
        model.points.forEach((p, i) => {
            expect(eq(f15(p.x), points[i][0]), `${id} point ${i} x`).toBe(true);
            expect(eq(f15(p.y), points[i][1]), `${id} point ${i} y`).toBe(true);
        });
    }
    for (const id of ['ellipse', 'hyperbola', 'parabola', 'three-collinear'] as const) {
        expect(sameConic(cofactors(EXAMPLE_POINTS[id]), CONIC_OF[id]), id).toBe(true);
    }
    // Four collinear points: every 5x5 minor vanishes, so no single conic is determined.
    expect(cofactors(EXAMPLE_POINTS['four-collinear']).every(isZero)).toBe(true);
    // The line pair is (x - y)(4x + 3y - 12) and its 3x3 determinant is zero (step 8).
    const expanded = scaled([4, -1, -3, -12, 12, 0]);
    expect(sameConic(expanded, CONIC_OF['three-collinear'])).toBe(true);
    const [a, b, c, d, e, f] = expanded;
    const half = fr(1, 2);
    expect(isZero(det([[a, mul(b, half), mul(d, half)], [mul(b, half), c, mul(e, half)], [mul(d, half), mul(e, half), f]]))).toBe(true);
    // D = (3, 0) and E = (0, 4) lie on 4x + 3y = 12.
    expect(4 * 3 + 3 * 0).toBe(12);
    expect(4 * 0 + 3 * 4).toBe(12);
    // Step 2 checks D and E on 9x^2 + 25y^2 = 225: 144 + 81 and 81 + 144.
    expect(eq(add(mul(fr(9), mul(fr(4), fr(4))), mul(fr(25), mul(fr(9, 5), fr(9, 5)))), fr(225))).toBe(true);
    expect(eq(add(mul(fr(9), mul(fr(-3), fr(-3))), mul(fr(25), mul(fr(12, 5), fr(12, 5)))), fr(225))).toBe(true);
});

test('K4: P1, the weight, the Farin points and the shoulder of the default arc, the hyperbola and the parabola (the spec\'s numbers)', () => {
    const ellipse = arcOf(SCENES['five-point-weight']);
    expect(eq(ellipse.p1[0], fr(5)) && eq(ellipse.p1[1], fr(3))).toBe(true);
    expect(eq(ellipse.w2, fr(1, 2))).toBe(true);
    expect(Math.abs(ellipse.w - Math.SQRT2 / 2)).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.f1[0] - 5)).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.f1[1] - (3 * Math.SQRT2 - 3))).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.f2[0] - (5 * Math.SQRT2 - 5))).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.f2[1] - 3)).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.s[0] - 5 / Math.SQRT2)).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.s[1] - 3 / Math.SQRT2)).toBeLessThan(1e-12);
    expect(ellipse.f1[1]).toBeCloseTo(1.2426, 4);
    expect(ellipse.f2[0]).toBeCloseTo(2.0711, 4);
    // Worked example k4-default-weight: S = M + lambda (P1 - M) with the chord midpoint M = (5/2, 3/2), lambda = sqrt2 - 1, w = lambda / (1 - lambda).
    const lambda = Math.SQRT2 - 1;
    expect(Math.abs(2.5 + lambda * (5 - 2.5) - ellipse.s[0])).toBeLessThan(1e-12);
    expect(Math.abs(1.5 + lambda * (3 - 1.5) - ellipse.s[1])).toBeLessThan(1e-12);
    expect(Math.abs(lambda / (1 - lambda) - ellipse.w)).toBeLessThan(1e-12);
    expect(Math.abs((Math.SQRT2 - 1) / (2 - Math.SQRT2) - 1 / Math.SQRT2)).toBeLessThan(1e-12);

    // S6 bridge (docs/specs/school-function-graphs-lessons.md line 121, "Bridge"): control points (5,0), (5,3), (0,3), weights 1, sqrt(2)/2, 1,
    // arc point (3.5355, 2.1213) at t = 1/2. The literal is written here, found in the spec file, and compared with this lesson's weight.
    const S6_WEIGHT = Math.SQRT2 / 2;
    const spec = fs.readFileSync(path.resolve(__dirname, '../../../docs/specs/school-function-graphs-lessons.md'), 'utf8');
    expect(spec).toContain('weights \\(1,\\tfrac{\\sqrt2}2,1\\)');
    expect(spec).toContain('control points \\((5,0),(5,3),(0,3)\\)');
    expect(spec).toContain('\\((3.5355,2.1213)\\)');
    expect(Math.abs(ellipse.w - S6_WEIGHT)).toBeLessThan(1e-12);
    expect(ellipse.s[0]).toBeCloseTo(3.5355, 4);
    expect(ellipse.s[1]).toBeCloseTo(2.1213, 4);

    const hyperbola = arcOf(SCENES['five-point-hyperbola']);
    expect(eq(hyperbola.p1[0], fr(3)) && eq(hyperbola.p1[1], fr(2))).toBe(true);
    expect(eq(hyperbola.w2, fr(4, 3))).toBe(true);
    expect(Math.abs(hyperbola.w - 2 / Math.sqrt(3))).toBeLessThan(1e-12);
    // Denominator 2(1-w)t^2 - 2(1-w)t + 1: zeros t = 1/2 +- sqrt(w^2 - 1) / (2 (w - 1)).
    const w = hyperbola.w;
    const root = Math.sqrt(w * w - 1) / (2 * (w - 1));
    const zeros = [0.5 - root, 0.5 + root];
    expect(zeros[0]).toBeCloseTo(-1.366, 3);
    expect(zeros[1]).toBeCloseTo(2.366, 3);
    for (const z of zeros) expect(Math.abs(2 * (1 - w) * z * z - 2 * (1 - w) * z + 1)).toBeLessThan(1e-12);
    // Points of the rational curve at t = 0.2, -0.3, 1.4 lie on 16x^2 - 9y^2 = 144.
    const [[x0, y0], [x1, y1], [x2, y2]] = hyperbola.ends;
    for (const t of [0.2, -0.3, 1.4]) {
        const b0 = (1 - t) * (1 - t);
        const b1 = 2 * w * t * (1 - t);
        const b2 = t * t;
        const x = (b0 * x0 + b1 * x1 + b2 * x2) / (b0 + b1 + b2);
        const y = (b0 * y0 + b1 * y1 + b2 * y2) / (b0 + b1 + b2);
        expect(Math.abs(16 * x * x - 9 * y * y - 144), `t=${t}`).toBeLessThan(1e-9);
    }
    expect(hyperbola.f1[0]).toBeCloseTo(3, 4);
    expect(hyperbola.f1[1]).toBeCloseTo(1.0718, 4);
    expect(hyperbola.f2[0]).toBeCloseTo(3.9282, 4);
    expect(hyperbola.f2[1]).toBeCloseTo(3.547, 3);
    expect(hyperbola.s[0]).toBeCloseTo(3.4641, 4);
    expect(hyperbola.s[1]).toBeCloseTo(2.3094, 4);

    const parabola = arcOf({example: 'parabola', a: 0, b: 1, t: 2, extrapolating: false, status: 'ok'});
    expect(eq(parabola.p1[0], fr(0)) && eq(parabola.p1[1], fr(2))).toBe(true);
    expect(eq(parabola.w2, fr(1))).toBe(true);
    expect(parabola.s[0]).toBeCloseTo(1, 12);
    expect(parabola.s[1]).toBeCloseTo(2, 12);
});

test('K4: every scene, applied in one synchronous sequence out of order and twice, lands on the state its text states', () => {
    const m = mount();
    try {
        const order = ['five-point-pencil', 'five-point-hyperbola', 'five-point-predict', 'five-point-parallel', 'five-point-bezier', 'five-point-line-pair',
            'five-point-weight', 'five-point-conic', 'five-point-ends'];
        for (const language of ['sl', 'en'] as const) {
            act(() => { setLanguage(language); });
            for (const id of [...order, ...[...order].reverse()]) {
                const e = SCENES[id];
                m.scene(id);
                const model = m.graph.model;
                // Choosing other ends than the example's makes the layout a custom one (the points stay the example's).
                const label = e.a === 0 && e.b === 1 ? e.example : 'custom';
                expect([model.example, model.a, model.b, model.t], `${id} ${language} model`).toEqual([label, e.a, e.b, e.t]);
                model.points.forEach((p, i) => {
                    expect(eq(f15(p.x), EXAMPLE_POINTS[e.example][i][0]) && eq(f15(p.y), EXAMPLE_POINTS[e.example][i][1]), `${id} point ${i}`).toBe(true);
                });
                expect(m.graph.extrapolating, `${id} ${language} extrapolation`).toBe(e.extrapolating);
                expect(statusNode()?.getAttribute('data-projective-status'), `${id} ${language} status`).toBe(e.status);
                expect(statusNode()?.getAttribute('data-projective-stale'), `${id} ${language} stale`).toBe('false');
                if (e.status === 'ok') {
                    const arc = arcOf(e);
                    expect(line('control'), `${id} ${language} control`).toContain(`P₀ = ${exactPrinted(arc.p0)}, P₁ = ${exactPrinted(arc.p1)}, P₂ = ${exactPrinted(arc.p2)}`);
                    expect(line('weight'), `${id} ${language} weight`).toContain(`w ≈ ${printed(arc.w, language)} (w² = ${arc.w2.n}/${arc.w2.d})`);
                    expect(line('farin'), `${id} ${language} farin`).toContain(`F₁ = ${printedPoint(arc.f1, language)}, F₂ = ${printedPoint(arc.f2, language)}`);
                    expect(line('farin'), `${id} ${language} shoulder`).toContain(`S = ${printedPoint(arc.s, language)}`);
                    const deviation = m.graph.scene().deviation;
                    expect(deviation, `${id} deviation`).toBeDefined();
                    expect(deviation!, `${id} deviation`).toBeLessThan(1e-9);
                    expect(line('deviation'), `${id} ${language} deviation line`).toContain('200');
                    expect(line('weight-kind'), `${id} ${language} kind`).toContain(arc.w < 1 ? 'w < 1' : 'w > 1');
                } else {
                    expect(line('weight'), `${id} ${language} no weight`).toBeNull();
                    expect(line('farin'), `${id} ${language} no Farin points`).toBeNull();
                }
            }
        }
        // The line pair and the parallel-tangent statuses, in the language now selected (English).
        m.scene('five-point-line-pair');
        expect(line('conic')).toContain('4x² − xy − 3y² − 12x + 12y = 0');
        expect(line('control')).toBeNull();
        m.scene('five-point-parallel');
        expect(line('status')).toContain('at infinity');
        expect(line('control')).toBeNull();
        m.scene('five-point-pencil');
        expect(line('conic')).toBeNull();
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

// ---- The text ----------------------------------------------------------------------------------------------------------------------

/** `\tfrac95`, `\tfrac{12}5`, `-3`, `5`: the prose forms of the rational coordinates used here. */
function parseTex(text: string): Fr {
    const match = /^(-?)(?:\\tfrac(\d|\{\d+\})(\d|\{\d+\})|(\d+))$/.exec(text.trim());
    if (!match) throw new Error(`cannot read coordinate ${text}`);
    const strip = (s: string) => s.replace(/[{}]/g, '');
    const value = match[4] !== undefined ? fr(BigInt(match[4])) : fr(BigInt(strip(match[2])), BigInt(strip(match[3])));
    return match[1] ? sub(fr(0), value) : value;
}
const parsePoint = (inner: string): P => {
    const parts = inner.split(',');
    if (parts.length !== 2) throw new Error(`cannot split ${inner}`);
    return [parseTex(parts[0]), parseTex(parts[1])];
};
const named = (...entries: readonly [string, P][]) => new Map(entries);
const ELL = EXAMPLE_POINTS.ellipse;
const HYP = EXAMPLE_POINTS.hyperbola;
const T3 = EXAMPLE_POINTS['three-collinear'];
const F4 = EXAMPLE_POINTS['four-collinear'];
const P1_DEFAULT: P = [fr(5), fr(3)];
const NAMED: Record<string, {readonly points: ReadonlyMap<string, P>; readonly minimum: number}> = {
    'five-point-predict': {points: named(['A', ELL[0]], ['B', ELL[1]], ['C', ELL[2]], ['D', ELL[3]], ['E', ELL[4]]), minimum: 5},
    'five-point-conic': {points: named(['A', ELL[0]], ['B', ELL[1]], ['C', ELL[2]], ['D', ELL[3]], ['E', ELL[4]]), minimum: 0},
    'five-point-ends': {points: named(['P_0', ELL[0]], ['P_1', P1_DEFAULT], ['P_2', ELL[1]]), minimum: 3},
    'five-point-weight': {points: named(['M', [fr(5, 2), fr(3, 2)]], ['P_1', P1_DEFAULT]), minimum: 2},
    'five-point-bezier': {points: named(['P_0', ELL[0]], ['P_1', P1_DEFAULT], ['P_2', ELL[1]]), minimum: 3},
    'five-point-parallel': {points: named(['A', ELL[0]], ['C', ELL[2]]), minimum: 2},
    'five-point-hyperbola': {points: named(['P_0', HYP[0]], ['P_1', [fr(3), fr(2)]], ['P_2', HYP[1]]), minimum: 3},
    'five-point-line-pair': {points: named(['A', T3[0]], ['B', T3[1]], ['C', T3[2]], ['D', T3[3]], ['E', T3[4]]), minimum: 5},
    'five-point-pencil': {points: named(['A', F4[0]], ['B', F4[1]], ['C', F4[2]], ['D', F4[3]], ['E', F4[4]]), minimum: 5},
};

test('K4: every point a step quotes with a name, in each text field separately, is that scene\'s point', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, {points, minimum}] of Object.entries(NAMED)) {
            let quoted = 0;
            for (const field of fields(stepOf(id), language)) {
                for (const match of field.matchAll(/(?<![A-Za-z_\\])(P_[012]|[A-EM]|P|F_[12]|S)=\(([^()]*)\)/g)) {
                    // F_1, F_2 and S are given by closed forms with roots; they are checked in the next test.
                    if (match[1] === 'F_1' || match[1] === 'F_2' || match[1] === 'S') continue;
                    const expected = points.get(match[1]);
                    expect(expected, `${id} ${language} unexpected name ${match[1]}`).toBeDefined();
                    const p = parsePoint(match[2]);
                    expect(eq(p[0], expected![0]) && eq(p[1], expected![1]), `${id} ${language} ${match[1]}=(${match[2]})`).toBe(true);
                    quoted += 1;
                }
            }
            expect(quoted, `${id} ${language} quotes at least ${minimum} points`).toBeGreaterThanOrEqual(minimum);
        }
    }
});

test('K4: the decimals of the Farin points, shoulder, weights and zeros, in each text field separately, equal the scene', () => {
    const ellipse = arcOf(SCENES['five-point-weight']);
    const hyperbola = arcOf(SCENES['five-point-hyperbola']);
    const root = Math.sqrt(hyperbola.w * hyperbola.w - 1) / (2 * (hyperbola.w - 1));
    const wanted: Record<string, readonly number[]> = {
        'five-point-weight': [ellipse.w, ellipse.f1[0], ellipse.f1[1], ellipse.f2[0], ellipse.f2[1], ellipse.s[0], ellipse.s[1]],
        'five-point-hyperbola': [hyperbola.w, 0.5 - root, 0.5 + root, hyperbola.f1[0], hyperbola.f1[1], hyperbola.f2[0], hyperbola.f2[1], hyperbola.s[0], hyperbola.s[1]],
        'five-point-ends': [], 'five-point-bezier': [], 'five-point-conic': [], 'five-point-predict': [],
        'five-point-parallel': [], 'five-point-line-pair': [], 'five-point-pencil': [],
    };
    for (const language of ['sl', 'en'] as const) {
        for (const [id, values] of Object.entries(wanted)) {
            const seen = new Set<number>();
            for (const field of fields(stepOf(id), language)) {
                // Decimals after \approx: a single number or a point (x; y) / (x, y), with {,} or . as the decimal sign.
                const singles = [...field.matchAll(/\\approx\s*(-?\d+(?:\{,\}\d+|\.\d+)?)/g)].map(match => match[1]);
                const pairs = [...field.matchAll(/\\approx\s*\(([^()]*)\)/g)].flatMap(match => match[1].split(/;|,\\ /).map(part => part.replace(/\\ /g, '').trim()));
                for (const raw of [...singles, ...pairs]) {
                    const value = Number(raw.replace('{,}', '.'));
                    const digits = (raw.split(/\{,\}|\./)[1] ?? '').length;
                    const index = values.findIndex(v => Math.abs(v - value) <= 0.5 * 10 ** -digits + 1e-12);
                    expect(index, `${id} ${language} ${raw} is a scene value`).toBeGreaterThanOrEqual(0);
                    seen.add(index);
                }
            }
            if (values.length > 0) expect(seen.size, `${id} ${language} states its values`).toBeGreaterThanOrEqual(values.length - 2);
        }
    }
    // Closed forms of the default arc (step 4): F1 = (5, 3 sqrt2 - 3), F2 = (5 sqrt2 - 5, 3), S = (5 sqrt2 / 2, 3 sqrt2 / 2).
    expect(Math.abs(ellipse.f1[1] - (3 * Math.SQRT2 - 3))).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.f2[0] - (5 * Math.SQRT2 - 5))).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.s[0] - (5 * Math.SQRT2) / 2)).toBeLessThan(1e-12);
    expect(Math.abs(ellipse.s[1] - (3 * Math.SQRT2) / 2)).toBeLessThan(1e-12);
    // The text quotes these closed forms and the zeros' denominator.
    const text = prose(stepOf('five-point-weight'), 'sl');
    expect(text).toContain('F_1=(5,3\\sqrt2-3)');
    expect(text).toContain('F_2=(5\\sqrt2-5,3)');
    expect(text).toContain('S=(\\tfrac{5\\sqrt2}2,\\tfrac{3\\sqrt2}2)');
});

test('K4: the theorem has a source and the drag is an illustration; the arc is one side; the circle note is named; the S6 weight is quoted', () => {
    expect(MIN_CIRCLE_PIECES).toBe(3);
    for (const language of ['sl', 'en'] as const) {
        const theorem = lesson.formulaBlocks.find(block => block.id === 'five-point-conic')!.explanation[language];
        expect(theorem).toMatch(language === 'sl' ? /Izrek \(pet točk\)[\s\S]*FMF[\s\S]*Coxeter[\s\S]*ilustracija/ : /Theorem \(five points\)[\s\S]*FMF[\s\S]*Coxeter[\s\S]*illustration/);
        expect(JSON.stringify(lesson.sources)).toContain('Coxeter');
        const step = (id: string) => prose(stepOf(id), language);
        // Acceptance 4: parallel tangents at the chosen ends, and the circle lesson's note named in prose.
        expect(step('five-point-parallel')).toContain(`\\mathrm{MIN\\_CIRCLE\\_PIECES}=${MIN_CIRCLE_PIECES}`);
        expect(step('five-point-parallel')).toMatch(language === 'sl' ? /lekcija o krožnici/ : /circle lesson/);
        // Acceptance 5: the arc is one side only and the complementary arc is the extrapolation.
        expect(step('five-point-bezier')).toMatch(language === 'sl' ? /le ena stran stožnice[\s\S]*Dopolnilni lok je nadaljevanje/ : /only one side of the conic[\s\S]*complementary arc is the continuation/);
        // The overlay deviation is a sampled check, not a proof.
        expect(step('five-point-bezier')).toMatch(language === 'sl' ? /vzorčni preizkus, ne dokaz/ : /sampled check, not a proof/);
        // Acceptance 1: the weight sqrt2/2 of S6 is quoted in the weight step.
        expect(step('five-point-weight')).toContain('w=\\tfrac{\\sqrt2}2');
        expect(JSON.stringify(lesson.sources)).toContain('school-function-graphs-lessons.md');
    }
});

test('K4: the strict scene operations refuse bad values and the other graphs\' operations', () => {
    const m = mount();
    try {
        const apply = (action: LessonAction) => () => m.capabilities.apply(action);
        expect(apply({kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 5})).toThrow();
        expect(apply({kind: 'projective', operation: 'five-point-place', index: 0, x: 1.5, y: 0})).toThrow();
        expect(apply({kind: 'projective', operation: 'pole-polar-place', x: 1, y: 1})).toThrow();
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
