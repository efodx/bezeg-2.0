/**
 * Mathematical checks for the Bezier and De Casteljau lesson examples (task 01, part a).
 *
 * Expected values come from an independent Bernstein form and a small hand-written De Casteljau recurrence in this
 * file; the repository's `PolynomialBezierCurve` (eval and decasteljauScheme) is compared against them. The lesson
 * content, read through the real lesson adapter, must carry the same control points, parameters, and prose numbers
 * in both languages, and every control point must lie inside the scene's starting view.
 */
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {pilotGuidedLessons} from './guidedLessons';
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';

type Vec = readonly [number, number];

const SYMMETRIC_CUBIC: Vec[] = [[-3, -2], [-3, 2], [3, 2], [3, -2]];
const ASYMMETRIC_CUBIC: Vec[] = [[-3, -2], [-1, 3], [2, -1], [3, 2]];
const QUADRATIC: Vec[] = [[-3, -2], [0, 4], [3, -2]];
const QUARTIC_DEFAULT: Vec[] = [[-4, -3], [-3, 2], [0, 3], [3, 2], [4, -3]];

// ---- independent references ----
const binom = (n: number, k: number): number => (k === 0 || k === n ? 1 : binom(n - 1, k - 1) + binom(n - 1, k));

function bernstein(points: readonly Vec[], t: number): Vec {
    const n = points.length - 1;
    let x = 0, y = 0;
    points.forEach(([px, py], i) => {
        const w = binom(n, i) * (1 - t) ** (n - i) * t ** i;
        x += w * px;
        y += w * py;
    });
    return [x, y];
}

/** Rows P^0 .. P^n of the De Casteljau scheme, written out independently of the repository. */
function rows(points: readonly Vec[], t: number): Vec[][] {
    const out: Vec[][] = [points.map(p => [...p] as Vec)];
    while (out[out.length - 1].length > 1) {
        const prev = out[out.length - 1];
        out.push(prev.slice(1).map((q, i) => [(1 - t) * prev[i][0] + t * q[0], (1 - t) * prev[i][1] + t * q[1]] as Vec));
    }
    return out;
}

/** The repository keeps n entries in every row (in-place recurrence); only the first n-r entries of row r are meaningful. */
const repoRows = (points: readonly Vec[], t: number) => {
    const scheme = new PolynomialBezierCurve(points.map(([x, y]) => new PointImpl(x, y))).decasteljauScheme(t);
    return scheme.map((row, r) => row.slice(0, scheme.length - r));
};
const curve = (points: readonly Vec[]) => new PolynomialBezierCurve(points.map(([x, y]) => new PointImpl(x, y)));
const near = (actual: readonly [number, number] | {X(): number; Y(): number}, expected: Vec) => {
    const [ax, ay] = Array.isArray(actual) ? actual as Vec : [(actual as {X(): number}).X(), (actual as {Y(): number}).Y()];
    expect(ax).toBeCloseTo(expected[0], 12);
    expect(ay).toBeCloseTo(expected[1], 12);
};

/** Smallest fraction with denominator up to 64, formatted as the lesson prose does ("-33/16", "0"). */
function fraction(value: number): string {
    for (let d = 1; d <= 64; d++) {
        const n = Math.round(value * d);
        if (Math.abs(n / d - value) < 1e-12) {
            const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
            const k = g(n, d) || 1;
            return d / k === 1 ? `${n / k}` : `${n / k}/${d / k}`;
        }
    }
    throw new Error(`no small fraction for ${value}`);
}
const pointText = ([x, y]: Vec) => `(${fraction(x)},${fraction(y)})`;

// ---- lesson content through the real adapter ----
type Prepared = {fixture: LessonCurveFixture; view?: LessonViewBox; t?: number; evaluation?: number};
type Step = (typeof pilotGuidedLessons)[number]['steps'][number];

/** Authored content (text, worked examples, frames). */
function lesson(id: 'bezier' | 'decasteljau') {
    return pilotGuidedLessons.find(l => l.demonstrationId === id)!;
}
/** Scene actions as the lesson adapter emits them (prepared-scene first). */
function adapted(id: 'bezier' | 'decasteljau', stepId: string) {
    return getLessonForDemonstration(id)!.steps.find(s => s.id === stepId)!;
}
function prepared(id: 'bezier' | 'decasteljau', stepId: string): Prepared | undefined {
    const actions = (adapted(id, stepId).scene?.actions ?? []) as readonly LessonAction[];
    const first = actions.find(a => a.kind === 'prepared-scene');
    if (!first || first.kind !== 'prepared-scene' || first.source !== 'lesson-fixture') return undefined;
    const t = actions.find(a => a.kind === 'parameter' && a.name === 't');
    const evaluation = actions.find(a => a.kind === 'curve-evaluation');
    return {
        fixture: first.curve,
        view: first.view,
        t: t && t.kind === 'parameter' ? t.value : undefined,
        evaluation: evaluation && evaluation.kind === 'curve-evaluation' ? evaluation.parameter : undefined,
    };
}
const step = (id: 'bezier' | 'decasteljau', stepId: string) => lesson(id).steps.find(s => s.id === stepId)!;
const both = (value: {sl: string; en: string}) => [value.sl, value.en];
const stepText = (s: Step) => JSON.stringify([s.explanation, s.expectedObservations, s.scene?.expectedState, s.observationPrompt]);
const exampleText = (id: 'bezier' | 'decasteljau', exampleId: string) => {
    const example = lesson(id).workedExamples.find(e => e.id === exampleId)!;
    return JSON.stringify([example.calculationLatex, example.resultLatex]);
};

describe('reference implementations agree on the lesson numbers', () => {
    test('symmetric cubic: B(1/2) = (0,1)', () => {
        near(bernstein(SYMMETRIC_CUBIC, 0.5), [0, 1]);
        near(curve(SYMMETRIC_CUBIC).eval(0.5), [0, 1]);
        near(rows(SYMMETRIC_CUBIC, 0.5).at(-1)![0], [0, 1]);
    });

    test('asymmetric cubic: B(1/2) = (3/8,3/4)', () => {
        near(bernstein(ASYMMETRIC_CUBIC, 0.5), [3 / 8, 3 / 4]);
        near(curve(ASYMMETRIC_CUBIC).eval(0.5), [3 / 8, 3 / 4]);
        expect(bernstein(ASYMMETRIC_CUBIC, 0.5)[0]).not.toBeCloseTo(bernstein(SYMMETRIC_CUBIC, 0.5)[0], 3);
    });

    test('quadratic at 1/2: first row (-3/2,1),(3/2,1), result (0,1), two new rows', () => {
        const mine = rows(QUADRATIC, 0.5);
        expect(mine.map(r => r.length)).toEqual([3, 2, 1]);
        near(mine[1][0], [-1.5, 1]);
        near(mine[1][1], [1.5, 1]);
        near(mine[2][0], [0, 1]);
        near(bernstein(QUADRATIC, 0.5), [0, 1]);
        const repo = repoRows(QUADRATIC, 0.5);
        expect(repo.map(r => r.length)).toEqual([3, 2, 1]);
        mine.forEach((row, i) => row.forEach((p, j) => near(repo[i][j], p)));
    });

    test('cubic rows at 1/2, 1/4 and 3/4', () => {
        const half = rows(SYMMETRIC_CUBIC, 0.5);
        expect(half.map(r => r.length)).toEqual([4, 3, 2, 1]);
        [[-3, 0], [0, 2], [3, 0]].forEach((p, i) => near(half[1][i], p as unknown as Vec));
        [[-1.5, 1], [1.5, 1]].forEach((p, i) => near(half[2][i], p as unknown as Vec));
        near(half[3][0], [0, 1]);

        const quarter = rows(SYMMETRIC_CUBIC, 0.25);
        [[-3, -1], [-1.5, 2], [3, 1]].forEach((p, i) => near(quarter[1][i], p as unknown as Vec));
        [[-21 / 8, -1 / 4], [-3 / 8, 7 / 4]].forEach((p, i) => near(quarter[2][i], p as unknown as Vec));
        near(quarter[3][0], [-33 / 16, 1 / 4]);

        const threeQuarter = rows(SYMMETRIC_CUBIC, 0.75);
        [[-3, 1], [1.5, 2], [3, -1]].forEach((p, i) => near(threeQuarter[1][i], p as unknown as Vec));
        [[3 / 8, 7 / 4], [21 / 8, -1 / 4]].forEach((p, i) => near(threeQuarter[2][i], p as unknown as Vec));
        near(threeQuarter[3][0], [33 / 16, 1 / 4]);

        for (const [t, expected] of [[0.25, [-33 / 16, 1 / 4]], [0.75, [33 / 16, 1 / 4]]] as const) {
            near(bernstein(SYMMETRIC_CUBIC, t), expected);
            near(curve(SYMMETRIC_CUBIC).eval(t), expected);
            const repo = repoRows(SYMMETRIC_CUBIC, t);
            expect(repo.map(r => r.length)).toEqual([4, 3, 2, 1]);
            rows(SYMMETRIC_CUBIC, t).forEach((row, i) => row.forEach((p, j) => near(repo[i][j], p)));
        }
    });

    test('retained quartic default at 1/2: (0,7/4)', () => {
        near(bernstein(QUARTIC_DEFAULT, 0.5), [0, 7 / 4]);
        near(curve(QUARTIC_DEFAULT).eval(0.5), [0, 7 / 4]);
        expect(rows(QUARTIC_DEFAULT, 0.5).map(r => r.length)).toEqual([5, 4, 3, 2, 1]);
    });
});

describe('lesson scenes carry these fixtures', () => {
    const cases: Array<[id: 'bezier' | 'decasteljau', stepId: string, points: Vec[], t?: number, evaluation?: number]> = [
        ['bezier', 'bezier-introduction', SYMMETRIC_CUBIC],
        ['bezier', 'bezier-control-polygon', SYMMETRIC_CUBIC],
        ['bezier', 'bezier-endpoints', SYMMETRIC_CUBIC],
        ['bezier', 'bezier-evaluation', SYMMETRIC_CUBIC, undefined, 0.5],
        ['bezier', 'bezier-influence', ASYMMETRIC_CUBIC, undefined, 0.5],
        ['decasteljau', 'decasteljau-introduction', QUADRATIC, 0.5],
        ['decasteljau', 'decasteljau-one-step', QUADRATIC, 0.5],
        ['decasteljau', 'decasteljau-final-point', QUADRATIC, 0.5],
        ['decasteljau', 'decasteljau-cubic', SYMMETRIC_CUBIC, 0.5],
        ['decasteljau', 'decasteljau-change-parameter', SYMMETRIC_CUBIC, 0.25],
        ['decasteljau', 'decasteljau-three-quarter', SYMMETRIC_CUBIC, 0.75],
    ];

    test.each(cases)('%s / %s', (id, stepId, points, t, evaluation) => {
        const p = prepared(id, stepId)!;
        expect(p).toBeDefined();
        expect(p.fixture.points).toEqual(points);
        expect(p.t).toBe(t);
        expect(p.evaluation).toBe(evaluation);
        const [left, top, right, bottom] = p.view!;
        expect(left).toBeLessThan(right);
        expect(bottom).toBeLessThan(top);
        for (const [x, y] of p.fixture.points) {
            expect(x).toBeGreaterThanOrEqual(left);
            expect(x).toBeLessThanOrEqual(right);
            expect(y).toBeGreaterThanOrEqual(bottom);
            expect(y).toBeLessThanOrEqual(top);
        }
    });

    test('the retained quartic and default cubic exploration use the demonstration default', () => {
        for (const [id, stepId] of [['decasteljau', 'decasteljau-free-exploration'], ['bezier', 'bezier-free-exploration']] as const) {
            const first = (adapted(id, stepId).scene!.actions as readonly LessonAction[])[0];
            expect(first.kind === 'prepared-scene' && first.source).toBe('demonstration-default');
        }
    });

    test('every lesson step with a calculation shows the worked example for the scene degree', () => {
        // the worked example text must list the same control points as the scene fixture
        const pairs: Array<[id: 'bezier' | 'decasteljau', stepId: string, points: Vec[]]> = [
            ['bezier', 'bezier-evaluation', SYMMETRIC_CUBIC],
            ['bezier', 'bezier-influence', ASYMMETRIC_CUBIC],
            ['decasteljau', 'decasteljau-one-step', QUADRATIC],
            ['decasteljau', 'decasteljau-cubic', SYMMETRIC_CUBIC],
            ['decasteljau', 'decasteljau-change-parameter', SYMMETRIC_CUBIC],
            ['decasteljau', 'decasteljau-three-quarter', SYMMETRIC_CUBIC],
        ];
        for (const [id, stepId, points] of pairs) {
            const s = step(id, stepId);
            const calc = exampleText(id, s.workedExampleId!);
            for (const p of points) expect(calc).toContain(`(${p[0]},${p[1]})`);
        }
    });
});

describe('prose numbers match the geometry in both languages', () => {
    const expectBoth = (content: string, expected: string[]) => {
        for (const fragment of expected) expect(content).toContain(fragment);
    };
    /** The fragment must appear in the Slovenian and in the English explanation. */
    const expectExplained = (s: Step, fragment: string) => {
        expect(s.explanation.sl).toContain(fragment);
        expect(s.explanation.en).toContain(fragment);
    };

    test('Bezier midpoints', () => {
        const symmetric = pointText(bernstein(SYMMETRIC_CUBIC, 0.5));
        const asymmetric = pointText(bernstein(ASYMMETRIC_CUBIC, 0.5));
        expect(symmetric).toBe('(0,1)');
        expect(asymmetric).toBe('(3/8,3/4)');
        const evaluation = step('bezier', 'bezier-evaluation');
        expectExplained(evaluation, '=' + symmetric);
        expectExplained(step('bezier', 'bezier-influence'), asymmetric);
        expect(stepText(evaluation)).toContain(symmetric);
        expect(exampleText('bezier', 'bezier-cubic-midpoint')).toContain(`=${symmetric}`);
        expect(exampleText('bezier', 'bezier-asymmetric-midpoint')).toContain(`=${asymmetric}`);
        expect(JSON.stringify(lesson('bezier'))).not.toContain('7/8');
    });

    test('De Casteljau quadratic rows and result', () => {
        const mine = rows(QUADRATIC, 0.5);
        const firstRow = mine[1].map(pointText);
        expect(firstRow).toEqual(['(-3/2,1)', '(3/2,1)']);
        for (const fragment of firstRow) expectExplained(step('decasteljau', 'decasteljau-one-step'), fragment);
        const result = pointText(mine[2][0]);
        expectExplained(step('decasteljau', 'decasteljau-final-point'), result);
        const example = exampleText('decasteljau', 'decasteljau-quadratic-midpoint');
        for (const fragment of [...firstRow, result]) expect(example).toContain(fragment);
    });

    test('De Casteljau cubic rows at 1/2, 1/4 and 3/4', () => {
        for (const [t, stepId, exampleId] of [
            [0.5, 'decasteljau-cubic', 'decasteljau-cubic-midpoint'],
            [0.25, 'decasteljau-change-parameter', 'decasteljau-cubic-quarter'],
            [0.75, 'decasteljau-three-quarter', 'decasteljau-cubic-three-quarter'],
        ] as const) {
            const scheme = rows(SYMMETRIC_CUBIC, t);
            const example = exampleText('decasteljau', exampleId);
            const proseStep = step('decasteljau', stepId);
            // the worked example lists every row, point by point, in the same order as the independent scheme
            scheme.slice(1).forEach(row => expect(example).toContain(row.map(pointText).join(',')));
            // and the prose carries the first row (t = 1/4, 3/4 or 1/2) and the result in both languages
            const result = pointText(scheme[3][0]);
            expectExplained(proseStep, result);
            if (t !== 0.5) expectExplained(proseStep, scheme[1].map(pointText).join(','));
        }
        expectBoth(JSON.stringify(step('decasteljau', 'decasteljau-three-quarter')), ['33/16']);
    });

    test('retained quartic example', () => {
        const scheme = rows(QUARTIC_DEFAULT, 0.5);
        const example = exampleText('decasteljau', 'decasteljau-degree-four-midpoint');
        scheme.slice(1).forEach(row => expect(example).toContain(row.map(pointText).join(',')));
        expectExplained(step('decasteljau', 'decasteljau-free-exploration'), pointText(scheme[4][0]));
    });

    test('step counts and degree statements', () => {
        expect(step('decasteljau', 'decasteljau-introduction').expectedObservations.map(o => o.en).join()).toMatch(/three starting points, two points/);
        expect(step('decasteljau', 'decasteljau-introduction').expectedObservations.map(o => o.sl).join()).toMatch(/treh začetnih točkah nastaneta dve/);
        expect(step('decasteljau', 'decasteljau-cubic').expectedObservations.map(o => o.en).join()).toMatch(/Four starting points give rows of three, two, and one/);
        expect(JSON.stringify(step('decasteljau', 'decasteljau-free-exploration').explanation)).toContain('four rows');
        expect(both(step('decasteljau', 'decasteljau-free-exploration').explanation).join()).toContain('štiri vrstice');
    });
});
