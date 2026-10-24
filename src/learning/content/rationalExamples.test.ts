/**
 * Mathematical checks for the `rational` and `rational-decasteljau` lesson examples (task 03, part a).
 *
 * The expected values come from the homogeneous form written out in this file (lift to (wP, w), interpolate, project);
 * the repository's `RationalBezierCurve` and `PolynomialBezierCurve` are compared against them. The lesson content, read
 * through the real lesson adapter, must carry the same control points, weights, parameter and view, and its prose and
 * worked examples must carry the computed numbers in both languages.
 */
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {RationalBezierCurve} from '../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import {additionalGuidedLessons} from './additionalGuidedLessons';
import {expansionGuidedLessons} from './expansionGuidedLessons';
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../model';

type Vec = readonly [number, number];
type Hom = readonly [number, number, number];

const CUBIC_POINTS: Vec[] = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const QUADRATIC_POINTS: Vec[] = [[-4, -3], [0, 3], [4, -3]];
const T = 0.5;

// ---- independent references ----
const binom = (n: number, k: number): number => (k === 0 || k === n ? 1 : binom(n - 1, k - 1) + binom(n - 1, k));

/** Weighted Bernstein form, numerator and denominator separately. */
function weightedBernstein(points: readonly Vec[], weights: readonly number[], t: number) {
    const n = points.length - 1;
    let x = 0, y = 0, d = 0;
    points.forEach(([px, py], i) => {
        const b = binom(n, i) * (1 - t) ** (n - i) * t ** i * weights[i];
        x += b * px;
        y += b * py;
        d += b;
    });
    return {numerator: [x, y] as Vec, denominator: d, value: [x / d, y / d] as Vec};
}

/** Homogeneous rows Q^(0) .. Q^(n): lift to (wP, w), interpolate all three coordinates, no division until the end. */
function homogeneousRows(points: readonly Vec[], weights: readonly number[], t: number): Hom[][] {
    const out: Hom[][] = [points.map(([x, y], i) => [weights[i] * x, weights[i] * y, weights[i]] as Hom)];
    while (out[out.length - 1].length > 1) {
        const prev = out[out.length - 1];
        out.push(prev.slice(1).map((q, i) => [0, 1, 2].map(k => (1 - t) * prev[i][k] + t * q[k]) as unknown as Hom));
    }
    return out;
}
const project = ([x, y, w]: Hom): Vec => [x / w, y / w];

const near = (actual: readonly number[], expected: readonly number[]) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 12));
};
const repoCurve = (points: readonly Vec[], weights: readonly number[]) =>
    new RationalBezierCurve(points.map(([x, y]) => new PointImpl(x, y)), [...weights]);
const repoValue = (points: readonly Vec[], weights: readonly number[], t: number): Vec => {
    const p = repoCurve(points, weights).eval(t);
    return [p.X(), p.Y()];
};
const polynomialValue = (points: readonly Vec[], t: number): Vec => {
    const p = new PolynomialBezierCurve(points.map(([x, y]) => new PointImpl(x, y))).eval(t);
    return [p.X(), p.Y()];
};

/** Smallest fraction with denominator up to 64, formatted as the worked examples do ("-9/8", "0", "3/2"). */
function parts(value: number): [number, number] {
    for (let d = 1; d <= 64; d++) {
        const n = Math.round(value * d);
        if (Math.abs(n / d - value) < 1e-12) {
            const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
            const k = g(n, d) || 1;
            return [n / k, d / k];
        }
    }
    throw new Error(`no small fraction for ${value}`);
}
const fraction = (value: number) => {
    const [n, d] = parts(value);
    return d === 1 ? `${n}` : `${n}/${d}`;
};
const tuple = (values: readonly number[]) => `(${values.map(fraction).join(',')})`;
/** Prose spelling of the absolute value: "\tfrac{9}{11}" or the integer. */
const tfrac = (value: number) => {
    const [n, d] = parts(Math.abs(value));
    return d === 1 ? `${n}` : String.raw`\tfrac{${n}}{${d}}`;
};

// ---- lesson content through the real adapter ----
type Prepared = {fixture: LessonCurveFixture; view?: LessonViewBox; t?: number; evaluation?: number};
type RationalId = 'rational' | 'rational-decasteljau';
const authored = (id: RationalId) =>
    [...expansionGuidedLessons, ...additionalGuidedLessons].find(lesson => lesson.demonstrationId === id)!;
const authoredStep = (id: RationalId, stepId: string) => authored(id).steps.find(step => step.id === stepId)!;
function prepared(id: RationalId, stepId: string): Prepared {
    const actions = (getLessonForDemonstration(id)!.steps.find(step => step.id === stepId)!.scene?.actions ?? []) as readonly LessonAction[];
    const first = actions.find(action => action.kind === 'prepared-scene');
    if (!first || first.kind !== 'prepared-scene' || first.source !== 'lesson-fixture') throw new Error(`${stepId} is not a lesson-fixture scene`);
    const t = actions.find(action => action.kind === 'parameter' && action.name === 't');
    const evaluation = actions.find(action => action.kind === 'curve-evaluation');
    return {
        fixture: first.curve,
        view: first.view,
        t: t && t.kind === 'parameter' ? t.value : undefined,
        evaluation: evaluation && evaluation.kind === 'curve-evaluation' ? evaluation.parameter : undefined,
    };
}
const prose = (id: RationalId, stepId: string, language: 'sl' | 'en') => {
    const step = authoredStep(id, stepId);
    return [step.explanation, ...step.expectedObservations, step.observationPrompt, step.scene!.expectedState]
        .map(localized => localized[language]).join('\n');
};
const exampleText = (id: RationalId, exampleId: string) => {
    const example = authored(id).workedExamples.find(item => item.id === exampleId)!;
    return `${example.calculationLatex}\n${example.resultLatex}\n${example.check.sl}\n${example.check.en}`;
};

const WEIGHTS = {equal: [1, 1, 1, 1], second2: [1, 2, 1, 1], second4: [1, 4, 1, 1]} as const;
const VALUES = {
    equal: {value: [0, 3 / 2], numerator: [0, 3 / 2], denominator: 1},
    second2: {value: [-9 / 11, 21 / 11], numerator: [-9 / 8, 21 / 8], denominator: 11 / 8},
    second4: {value: [-27 / 17, 39 / 17], numerator: [-27 / 8, 39 / 8], denominator: 17 / 8},
} as const;

describe('rational curve: independent references agree on the lesson numbers', () => {
    test.each(Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>)('weights %s at t=1/2', key => {
        const w = WEIGHTS[key];
        const ref = weightedBernstein(CUBIC_POINTS, w, T);
        near(ref.numerator, VALUES[key].numerator);
        expect(ref.denominator).toBeCloseTo(VALUES[key].denominator, 12);
        near(ref.value, VALUES[key].value);
        // The last homogeneous row is the numerator over the denominator, as in the De Casteljau construction.
        const last = homogeneousRows(CUBIC_POINTS, w, T).at(-1)![0];
        near(last, [...VALUES[key].numerator, VALUES[key].denominator]);
        near(project(last), VALUES[key].value);
        near(repoValue(CUBIC_POINTS, w, T), VALUES[key].value);
    });

    test('equal weights reduce to the polynomial Bézier curve for every parameter, also for a common factor other than 1', () => {
        for (const common of [1, 2.5]) {
            for (let i = 0; i <= 8; i++) {
                const t = i / 8;
                near(repoValue(CUBIC_POINTS, [common, common, common, common], t), polynomialValue(CUBIC_POINTS, t));
                near(weightedBernstein(CUBIC_POINTS, [common, common, common, common], t).value, polynomialValue(CUBIC_POINTS, t));
            }
        }
        near(polynomialValue(CUBIC_POINTS, T), [0, 3 / 2]);
    });

    test('the endpoints do not depend on the second weight', () => {
        for (const w of Object.values(WEIGHTS)) {
            near(repoValue(CUBIC_POINTS, w, 0), [-4, -3]);
            near(repoValue(CUBIC_POINTS, w, 1), [4, -3]);
        }
    });

    test('the share of P1 at t=1/2 is 3w/(5+3w): 3/8, 6/11, 12/17, and the point moves toward P1 without reaching it', () => {
        const shares = [1, 2, 4].map(w => (3 * w) / (5 + 3 * w));
        near(shares, [3 / 8, 6 / 11, 12 / 17]);
        const distance = (p: Vec) => Math.hypot(p[0] - CUBIC_POINTS[1][0], p[1] - CUBIC_POINTS[1][1]);
        const values = (Object.keys(WEIGHTS) as Array<keyof typeof WEIGHTS>).map(key => VALUES[key].value as unknown as Vec);
        expect(distance(values[1])).toBeLessThan(distance(values[0]));
        expect(distance(values[2])).toBeLessThan(distance(values[1]));
        expect(distance(values[2])).toBeGreaterThan(0);
    });
});

describe('rational De Casteljau: rows and projections', () => {
    test('quadratic, equal weights: ordinary rows (-2,0),(2,0), result (0,0), last coordinate 1', () => {
        const rows = homogeneousRows(QUADRATIC_POINTS, [1, 1, 1], T);
        near(rows[1].flat(), [-2, 0, 1, 2, 0, 1]);
        near(rows[2][0], [0, 0, 1]);
        near(repoValue(QUADRATIC_POINTS, [1, 1, 1], T), [0, 0]);
        near(polynomialValue(QUADRATIC_POINTS, T), [0, 0]);
    });

    test('quadratic, weights (1,2,1): lifted points, first row, last point (0,3/2,3/2), projection (0,1)', () => {
        const rows = homogeneousRows(QUADRATIC_POINTS, [1, 2, 1], T);
        near(rows[0].flat(), [-4, -3, 1, 0, 6, 2, 4, -3, 1]);
        near(rows[1].flat(), [-2, 3 / 2, 3 / 2, 2, 3 / 2, 3 / 2]);
        near(rows[2][0], [0, 3 / 2, 3 / 2]);
        near(project(rows[2][0]), [0, 1]);
        near(weightedBernstein(QUADRATIC_POINTS, [1, 2, 1], T).value, [0, 1]);
        near(repoValue(QUADRATIC_POINTS, [1, 2, 1], T), [0, 1]);
    });

    test('cubic, equal weights: ordinary rows, last coordinate 1 everywhere, result (0,3/2)', () => {
        const rows = homogeneousRows(CUBIC_POINTS, [1, 1, 1, 1], T);
        near(rows[1].flat(), [-7 / 2, 0, 1, 0, 3, 1, 7 / 2, 0, 1]);
        near(rows[2].flat(), [-7 / 4, 3 / 2, 1, 7 / 4, 3 / 2, 1]);
        near(rows[3][0], [0, 3 / 2, 1]);
    });

    test('cubic, weights (1,2,1,1): rows and last point (-9/8,21/8,11/8), projection (-9/11,21/11)', () => {
        const rows = homogeneousRows(CUBIC_POINTS, WEIGHTS.second2, T);
        near(rows[0].flat(), [-4, -3, 1, -6, 6, 2, 3, 3, 1, 4, -3, 1]);
        near(rows[1].flat(), [-5, 3 / 2, 3 / 2, -3 / 2, 9 / 2, 3 / 2, 7 / 2, 0, 1]);
        near(rows[2].flat(), [-13 / 4, 3, 3 / 2, 1, 9 / 4, 5 / 4]);
        near(rows[3][0], [-9 / 8, 21 / 8, 11 / 8]);
        near(project(rows[3][0]), [-9 / 11, 21 / 11]);
    });

    test.each([
        ['quadratic (1,2,1)', QUADRATIC_POINTS, [1, 2, 1]],
        ['cubic (1,1,1,1)', CUBIC_POINTS, [1, 1, 1, 1]],
        ['cubic (1,2,1,1)', CUBIC_POINTS, [1, 2, 1, 1]],
    ] as Array<[string, Vec[], number[]]>)('the repository scheme rows are the projected homogeneous rows: %s', (_name, points, weights) => {
        const mine = homogeneousRows(points, weights, T);
        const scheme = repoCurve(points, weights).decasteljauScheme(T);
        expect(scheme).toHaveLength(mine.length);
        mine.forEach((row, r) => row.forEach((q, i) => {
            const expected = project(q);
            expect(scheme[r][i].X()).toBeCloseTo(expected[0], 12);
            expect(scheme[r][i].Y()).toBeCloseTo(expected[1], 12);
        }));
    });
});

describe('rational lesson: scenes carry the fixtures', () => {
    const rationalScenes: Array<[string, readonly number[]]> = [
        ['rational-base-weights', WEIGHTS.equal],
        ['rational-base-evaluation', WEIGHTS.second2],
        ['rational-base-heavy', WEIGHTS.second4],
        ['rational-base-endpoints', WEIGHTS.second4],
        ['rational-base-analysis', WEIGHTS.equal],
    ];
    const decasteljauScenes: Array<[string, readonly Vec[], readonly number[]]> = [
        ['rational-decasteljau-idea', QUADRATIC_POINTS, [1, 1, 1]],
        ['rational-decasteljau-homogeneous', QUADRATIC_POINTS, [1, 2, 1]],
        ['rational-decasteljau-projection', QUADRATIC_POINTS, [1, 2, 1]],
        ['rational-decasteljau-cubic-equal', CUBIC_POINTS, [1, 1, 1, 1]],
        ['rational-decasteljau-weight-effect', CUBIC_POINTS, [1, 2, 1, 1]],
        ['rational-decasteljau-analysis', CUBIC_POINTS, [1, 2, 1, 1]],
    ];
    const insideView = (p: Prepared) => {
        const [left, top, right, bottom] = p.view!;
        expect(left).toBeLessThan(right);
        expect(bottom).toBeLessThan(top);
        for (const [x, y] of p.fixture.points) {
            expect(x).toBeGreaterThanOrEqual(left);
            expect(x).toBeLessThanOrEqual(right);
            expect(y).toBeGreaterThanOrEqual(bottom);
            expect(y).toBeLessThanOrEqual(top);
        }
    };

    test.each(rationalScenes)('rational / %s keeps the points, the parameter 1/2 and the view', (stepId, weights) => {
        const p = prepared('rational', stepId);
        expect(p.fixture.points).toEqual(CUBIC_POINTS);
        expect(p.fixture.weights).toEqual(weights);
        expect(p.evaluation).toBe(T);
        insideView(p);
    });

    test.each(decasteljauScenes)('rational-decasteljau / %s', (stepId, points, weights) => {
        const p = prepared('rational-decasteljau', stepId);
        expect(p.fixture.points).toEqual(points);
        expect(p.fixture.weights).toEqual(weights);
        expect(p.fixture.weights).toHaveLength(points.length);
        expect(p.t).toBe(T);
        insideView(p);
    });

    test('the comparison scenes share one view so the points do not jump', () => {
        const views = [...rationalScenes.map(([id]) => prepared('rational', id).view), ...decasteljauScenes.map(([id]) => prepared('rational-decasteljau', id).view)];
        views.forEach(view => expect(view).toEqual(views[0]));
    });
});

describe('prose and worked examples carry the computed numbers in both languages', () => {
    const rationalValues: Array<[string, keyof typeof VALUES, number]> = [
        ['rational-base-weights', 'equal', 1],
        ['rational-base-evaluation', 'second2', 2],
        ['rational-base-heavy', 'second4', 4],
    ];

    test.each(rationalValues)('rational / %s', (stepId, key, w1) => {
        const share = (3 * w1) / (5 + 3 * w1);
        const expected = [...VALUES[key].value, ...(key === 'equal' ? [] : [share, VALUES[key].denominator])];
        for (const language of ['sl', 'en'] as const) {
            const text = prose('rational', stepId, language);
            for (const value of expected) expect(text).toContain(tfrac(value));
        }
    });

    test('rational / the earlier point is repeated for comparison in the next two steps', () => {
        for (const language of ['sl', 'en'] as const) {
            for (const stepId of ['rational-base-evaluation', 'rational-base-heavy']) {
                const text = prose('rational', stepId, language);
                expect(text).toContain(tfrac(3 / 2));
            }
            expect(prose('rational', 'rational-base-heavy', language)).toContain(tfrac(VALUES.second2.value[0]));
            expect(prose('rational', 'rational-base-heavy', language)).toContain(tfrac(3 / 8));
            expect(prose('rational', 'rational-base-heavy', language)).toContain(tfrac(6 / 11));
        }
    });

    test('rational / the endpoint step names both endpoints and all three weight vectors', () => {
        for (const language of ['sl', 'en'] as const) {
            const text = prose('rational', 'rational-base-endpoints', language);
            for (const token of ['(-4,-3)', '(4,-3)', '(1,1,1,1)', '(1,2,1,1)', '(1,4,1,1)']) expect(text).toContain(token);
        }
    });

    test.each([
        ['rational-base-equal', 'equal', WEIGHTS.equal],
        ['rational-base-midpoint', 'second2', WEIGHTS.second2],
        ['rational-base-heavy', 'second4', WEIGHTS.second4],
    ] as const)('rational / worked example %s', (exampleId, key, weights) => {
        const text = exampleText('rational', exampleId);
        expect(text).toContain(`w=(${weights.join(',')})`);
        expect(text).toContain(`B}(1/2)=`);
        expect(text).toContain(tuple(VALUES[key].value));
        expect(text).toContain(tuple(VALUES[key].numerator));
        expect(text).toContain(fraction(VALUES[key].denominator));
        expect(text).toContain(CUBIC_POINTS.map(p => `(${p.join(',')})`).join(','));
    });

    test('rational / the second-weight formula lists the shares 3/8, 6/11, 12/17', () => {
        const formula = authored('rational').formulaBlocks.find(item => item.id === 'rational-base-second-weight')!;
        for (const share of [3 / 8, 6 / 11, 12 / 17]) {
            const [n, d] = parts(share);
            expect(formula.latex).toMatch(new RegExp(String.raw`\\frac\{?${n}\}?\{?${d}\}?`));
        }
    });

    test('rational-decasteljau / quadratic opening prose and worked example', () => {
        const equal = homogeneousRows(QUADRATIC_POINTS, [1, 1, 1], T);
        const weighted = homogeneousRows(QUADRATIC_POINTS, [1, 2, 1], T);
        for (const language of ['sl', 'en'] as const) {
            const idea = prose('rational-decasteljau', 'rational-decasteljau-idea', language);
            for (const token of [tuple(equal[1][0].slice(0, 2)), tuple(equal[1][1].slice(0, 2)), tuple(equal[2][0].slice(0, 2)), '(1,1,1)']) expect(idea).toContain(token);
            const rowText = prose('rational-decasteljau', 'rational-decasteljau-homogeneous', language);
            expect(rowText).toContain(tuple(weighted[0][1]));
            expect(rowText).toContain(String.raw`(-2,\tfrac{3}{2},\tfrac{3}{2})`);
            const projection = prose('rational-decasteljau', 'rational-decasteljau-projection', language);
            expect(projection).toContain(String.raw`(0,\tfrac{3}{2},\tfrac{3}{2})`);
            expect(projection).toContain(tuple(project(weighted[2][0])));
            expect(projection).toContain(tuple([0, 0]));
        }
        const text = exampleText('rational-decasteljau', 'rational-decasteljau-quadratic');
        expect(text).toContain(weighted[0].map(q => tuple(q)).join(','));
        expect(text).toContain(weighted[1].map(q => tuple(q)).join(','));
        expect(text).toContain(tuple(weighted[2][0]));
        expect(text).toContain(`${fraction(weighted[2][0][2])}`);
        expect(text).toContain(tuple(project(weighted[2][0])));
    });

    test('rational-decasteljau / cubic prose and worked example', () => {
        const equal = homogeneousRows(CUBIC_POINTS, [1, 1, 1, 1], T);
        const weighted = homogeneousRows(CUBIC_POINTS, WEIGHTS.second2, T);
        for (const language of ['sl', 'en'] as const) {
            const equalText = prose('rational-decasteljau', 'rational-decasteljau-cubic-equal', language);
            for (const q of [...equal[1], ...equal[2], equal[3][0]]) {
                const [x, y] = q;
                for (const value of [x, y]) expect(equalText).toContain(tfrac(value));
            }
            const weightedText = prose('rational-decasteljau', 'rational-decasteljau-weight-effect', language);
            for (const value of [weighted[3][0][0], weighted[3][0][1], weighted[3][0][2], ...project(weighted[3][0]), weighted[1][0][2], weighted[2][1][2]]) {
                expect(weightedText).toContain(tfrac(value));
            }
            expect(weightedText).toContain(tfrac(equal[3][0][1]));
        }
        const text = exampleText('rational-decasteljau', 'rational-decasteljau-midpoint');
        expect(text).toContain(weighted[0].map(q => tuple(q)).join(','));
        expect(text).toContain(weighted[1].map(q => tuple(q)).join(','));
        expect(text).toContain(weighted[2].map(q => tuple(q)).join(','));
        expect(text).toContain(tuple(weighted[3][0]));
        expect(text).toContain(tuple(project(weighted[3][0])));
        expect(text).toContain(tuple(equal[3][0].slice(0, 2)));
    });

    test('rational-decasteljau / both languages differ and every worked-example check is localized', () => {
        for (const id of ['rational', 'rational-decasteljau'] as const) {
            for (const example of authored(id).workedExamples) {
                expect(example.check.sl.trim()).not.toBe('');
                expect(example.check.sl).not.toBe(example.check.en);
            }
        }
    });
});
