import {constructionGuidedLessons} from './constructionGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES, legacyActions} from './guidedLessons';
import {sceneAction} from '../runtime/lessonCatalog';
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';
import {RationalBezierCurve} from '../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

const lessonFor = (id: string) => constructionGuidedLessons.find(lesson => lesson.demonstrationId === id)!;
const toPoints = (values: number[][]) => values.map(([x, y]) => new PointImpl(x, y));
const coordinates = (curve: PolynomialBezierCurve) => curve.getPoints().map(point => [point.X(), point.Y()]);

// Route defaults (see SubdivisionGraph1/SubdivisionGraph, RationalSubdivisionGraph2, ExtrapolationGraph, RationalExtrapolationGraph).
const subdivisionPoints = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const rationalWeights = [1, 2, 1, 1];
const extrapolationPoints = [[-4, -2], [-3, 3], [2, 3], [3, -1]];
const rationalExtrapolationPoints = [[-4, -3], [-3, 3], [3, 3], [4, -1]];


function expectPoints(actual: number[][], expected: number[][]) {
    expect(actual).toHaveLength(expected.length);
    expected.forEach(([x, y], i) => {
        expect(actual[i][0]).toBeCloseTo(x, 9);
        expect(actual[i][1]).toBeCloseTo(y, 9);
    });
}

const expectedSteps: Record<string, number> = {
    'subdivision': 5,
    'repeated-subdivision': 5,
    'rational-subdivision': 4,
    'extrapolation': 4,
    'rational-extrapolation': 4,
};

test('keeps the construction lessons bounded, localized, and source-backed', () => {
    expect(constructionGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(Object.keys(expectedSteps));
    for (const lesson of constructionGuidedLessons) {
        expect(lesson.steps).toHaveLength(expectedSteps[lesson.demonstrationId]);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(6);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
        expect(new Set(lesson.steps.flatMap(step => step.frames.map(frame => frame.id))).size)
            .toBe(lesson.steps.reduce((sum, step) => sum + step.frames.length, 0));
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
        expect(lesson.sources.some(source => Boolean(source.implementationCorrespondence))).toBe(true);
        expect(lesson.workedExamples.length).toBeGreaterThan(0);
        const localizedFields = [
            lesson.title, lesson.summary, ...lesson.prerequisites, ...lesson.learningGoals, ...lesson.edgeCases, ...lesson.unresolvedQuestions,
            ...lesson.formulaBlocks.flatMap(formula => [formula.notation, formula.explanation]),
            ...lesson.workedExamples.flatMap(example => [example.title, example.check]),
            ...lesson.steps.flatMap(step => [step.title, step.purpose, step.explanation, step.observationPrompt, ...step.expectedObservations, ...(step.scene ? [step.scene.expectedState] : [])]),
        ];
        for (const localized of localizedFields) {
            expect(localized.sl.trim()).not.toBe('');
            expect(localized.en.trim()).not.toBe('');
            expect(localized.sl).not.toBe(localized.en);
        }
        const formulaIds = new Set(lesson.formulaBlocks.map(formula => formula.id));
        const exampleIds = new Set(lesson.workedExamples.map(example => example.id));
        expect(formulaIds.size).toBe(lesson.formulaBlocks.length);
        const usedExamples = new Set<string>();
        for (const step of lesson.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
            expect(step.frames.filter(frame => frame.kind === 'calculation')).toHaveLength(step.workedExampleId ? 1 : 0);
            step.formulaIds.forEach(id => expect(formulaIds.has(id)).toBe(true));
            if (step.workedExampleId) {
                expect(exampleIds.has(step.workedExampleId)).toBe(true);
                usedExamples.add(step.workedExampleId);
            }
            // Only the rational-extrapolation steps that show far-away control points use a fixture with a widened view.
            const fixtureSteps = lesson.demonstrationId === 'rational-extrapolation' ? ['rex-example', 'rex-negative-weight'] : [];
            expect(step.scene?.basedOn).toBe(fixtureSteps.includes(step.id) ? 'lesson-fixture' : 'demonstration-default');
            for (const action of legacyActions(step.scene?.actions)) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
        expect(usedExamples).toEqual(exampleIds);
        expect(legacyActions(lesson.steps[0].scene?.actions).every(action => action.name === 'show-weights')).toBe(true);
    }
});

test('each lesson only uses the action families of its own graph', () => {
    const names = (id: string) => new Set(lessonFor(id).steps.flatMap(step => legacyActions(step.scene?.actions)).map(action => action.name));
    expect(names('subdivision')).toEqual(new Set(['set-subdivision-parameter', 'subdivide']));
    expect(names('repeated-subdivision')).toEqual(new Set(['subdivide']));
    expect(names('rational-subdivision')).toEqual(new Set(['show-weights', 'set-subdivision-parameter', 'subdivide']));
    expect(names('extrapolation')).toEqual(new Set(['set-extrapolation-parameter', 'extrapolate']));
    expect(names('rational-extrapolation')).toEqual(new Set(['show-weights', 'set-extrapolation-parameter', 'extrapolate']));
    // The repeated-subdivision lesson never exceeds the five-step cap in a single scene.
    for (const step of lessonFor('repeated-subdivision').steps) {
        expect((legacyActions(step.scene?.actions)).filter(action => action.name === 'subdivide').length).toBeLessThanOrEqual(5);
    }
    expect(lessonFor('repeated-subdivision').steps.map(step => step.scene!.actions.length)).toEqual([0, 1, 2, 3, 4]);
});

test('subdivision worked example and split identities match the implementation', () => {
    const curve = new PolynomialBezierCurve(toPoints(subdivisionPoints));
    const [left, right] = curve.subdivide(0.5);
    expectPoints(coordinates(left), [[-4, -3], [-3.5, 0], [-1.75, 1.5], [0, 1.5]]);
    expectPoints(coordinates(right), [[0, 1.5], [1.75, 1.5], [3.5, 0], [4, -3]]);
    expect(curve.eval(0.5).X()).toBeCloseTo(0, 12);
    expect(curve.eval(0.5).Y()).toBeCloseTo(1.5, 12);
    const example = lessonFor('subdivision').workedExamples[0];
    expect(example.resultLatex).toContain('(-4,-3),\\bigl(-\\tfrac72,0\\bigr),\\bigl(-\\tfrac74,\\tfrac32\\bigr),\\bigl(0,\\tfrac32\\bigr)');
    expect(example.resultLatex).toContain('\\bigl(0,\\tfrac32\\bigr),\\bigl(\\tfrac74,\\tfrac32\\bigr),\\bigl(\\tfrac72,0\\bigr),(4,-3)');
    // L(u) = B(tu), R(u) = B(t + (1 - t)u) for several t, and the shared point is B(t).
    for (const t of [0.01, 0.3, 0.5, 0.77, 0.99]) {
        const [l, r] = curve.subdivide(t);
        expect(l.getPoints()[3].X()).toBeCloseTo(r.getPoints()[0].X(), 12);
        expect(l.getPoints()[3].Y()).toBeCloseTo(r.getPoints()[0].Y(), 12);
        expect(l.getPoints()[3].X()).toBeCloseTo(curve.eval(t).X(), 12);
        for (const u of [0, 0.2, 0.5, 0.9, 1]) {
            expect(l.eval(u).X()).toBeCloseTo(curve.eval(t * u).X(), 10);
            expect(l.eval(u).Y()).toBeCloseTo(curve.eval(t * u).Y(), 10);
            expect(r.eval(u).X()).toBeCloseTo(curve.eval(t + (1 - t) * u).X(), 10);
            expect(r.eval(u).Y()).toBeCloseTo(curve.eval(t + (1 - t) * u).Y(), 10);
        }
    }
    // The uneven-cut step states the shared point at t = 3/10 as about (-2.02, 0.78).
    const joint = curve.eval(0.3);
    expect(joint.X()).toBeCloseTo(-2.02, 2);
    expect(joint.Y()).toBeCloseTo(0.78, 2);
    const scene = lessonFor('subdivision').steps.map(step => step.scene!.actions);
    expect(scene[1]).toEqual([{name: 'set-subdivision-parameter', value: 0.3}]);
    expect(scene[3]).toEqual([{name: 'set-subdivision-parameter', value: 0.5}, {name: 'subdivide', value: true}]);
    expect(scene[4]).toEqual([{name: 'set-subdivision-parameter', value: 0.3}, {name: 'subdivide', value: true}]);
});

test('repeated subdivision gives 2^k covering pieces whose polygons approach the curve about four times closer per step', () => {
    const curve = new PolynomialBezierCurve(toPoints(subdivisionPoints));
    let pieces: PolynomialBezierCurve[] = [curve];
    const distances: number[] = [];
    for (let k = 0; k <= 5; k++) {
        expect(pieces).toHaveLength(2 ** k);
        // Pieces are in parameter order; piece j traces B on [j/2^k, (j+1)/2^k].
        let maximum = 0;
        pieces.forEach((piece, j) => {
            for (const u of [0, 0.25, 0.5, 0.75, 1]) {
                const s = (j + u) / 2 ** k;
                expect(piece.eval(u).X()).toBeCloseTo(curve.eval(s).X(), 9);
                expect(piece.eval(u).Y()).toBeCloseTo(curve.eval(s).Y(), 9);
            }
            piece.getPoints().forEach((point, i) => {
                const s = (j + i / 3) / 2 ** k;
                maximum = Math.max(maximum, Math.hypot(point.X() - curve.eval(s).X(), point.Y() - curve.eval(s).Y()));
            });
        });
        distances.push(maximum);
        pieces = pieces.flatMap(piece => piece.subdivide(0.5));
    }
    // Stated in the lesson: d_0 ~ 2.38, d_1 ~ 0.62, d_2 ~ 0.16, d_3 ~ 0.040, d_4 ~ 0.010, d_5 ~ 0.0025.
    [2.38336, 0.62223, 0.15907, 0.04022, 0.01011, 0.00254].forEach((expected, k) => expect(distances[k]).toBeCloseTo(expected, 4));
    [2.38, 0.62, 0.16, 0.040, 0.010, 0.0025].forEach((stated, k) => expect(Math.abs(distances[k] - stated)).toBeLessThan(stated * 0.03 + 1e-12));
    for (let k = 1; k < distances.length; k++) {
        expect(distances[k]).toBeLessThan(distances[k - 1]);
        expect(distances[k] / distances[k - 1]).toBeGreaterThan(0.24);
        expect(distances[k] / distances[k - 1]).toBeLessThan(0.27);
    }
    const example = lessonFor('repeated-subdivision').workedExamples[0];
    expect(example.resultLatex).toBe('d_0\\approx2.38,\\ d_1\\approx0.62,\\ d_2\\approx0.16,\\ d_3\\approx0.040,\\ d_4\\approx0.010,\\ d_5\\approx0.0025');
});

test('rational subdivision worked example and weights match RationalBezierCurve.subdivide', () => {
    const curve = new RationalBezierCurve(toPoints(subdivisionPoints), rationalWeights);
    const [left, right] = curve.subdivide(0.5);
    expectPoints(coordinates(left), [[-4, -3], [-10 / 3, 1], [-13 / 6, 2], [-9 / 11, 21 / 11]]);
    expectPoints(coordinates(right), [[-9 / 11, 21 / 11], [4 / 5, 9 / 5], [7 / 2, 0], [4, -3]]);
    left.getWeights().forEach((w, i) => expect(w).toBeCloseTo([1, 3 / 2, 3 / 2, 11 / 8][i], 12));
    right.getWeights().forEach((w, i) => expect(w).toBeCloseTo([11 / 8, 5 / 4, 1, 1][i], 12));
    // The shared point is B(1/2) and its weight is the denominator of the original curve.
    expect(curve.eval(0.5).X()).toBeCloseTo(-9 / 11, 12);
    expect(curve.eval(0.5).Y()).toBeCloseTo(21 / 11, 12);
    const denominator = (t: number) => rationalWeights.reduce((sum, w, i) => sum + [1, 3, 3, 1][i] * (1 - t) ** (3 - i) * t ** i * w, 0);
    expect(denominator(0.5)).toBeCloseTo(11 / 8, 12);
    expect(denominator(0.3)).toBeCloseTo(1.441, 12);
    for (const t of [0.01, 0.3, 0.5, 0.9, 0.99]) {
        const [l, r] = curve.subdivide(t);
        expect(l.getWeights()[3]).toBeCloseTo(denominator(t), 10);
        expect(r.getWeights()[0]).toBeCloseTo(denominator(t), 10);
        expect(l.getWeights()[0]).toBeCloseTo(1, 12);
        expect(r.getWeights()[3]).toBeCloseTo(1, 12);
        for (const u of [0, 0.2, 0.5, 0.9, 1]) {
            const onLeft = curve.eval(t * u);
            const onRight = curve.eval(t + (1 - t) * u);
            expect(l.eval(u).X()).toBeCloseTo(onLeft.X(), 9);
            expect(l.eval(u).Y()).toBeCloseTo(onLeft.Y(), 9);
            expect(r.eval(u).X()).toBeCloseTo(onRight.X(), 9);
            expect(r.eval(u).Y()).toBeCloseTo(onRight.Y(), 9);
        }
    }
    // Weights of the pieces differ from the original (1, 2, 1, 1) even though the curve is the same.
    expect(left.getWeights()).not.toEqual(rationalWeights);
});

test('polynomial extrapolation worked example and E(u)=B(tu) match the implementation', () => {
    const curve = new PolynomialBezierCurve(toPoints(extrapolationPoints));
    const extended = curve.extrapolate(1.2);
    expectPoints(coordinates(extended), [[-4, -2], [-14 / 5, 4], [104 / 25, 14 / 5], [382 / 125, -484 / 125]]);
    expectPoints(coordinates(extended), [[-4, -2], [-2.8, 4], [4.16, 2.8], [3.056, -3.872]]);
    expect(curve.eval(1.2).X()).toBeCloseTo(3.056, 12);
    expect(curve.eval(1.2).Y()).toBeCloseTo(-3.872, 12);
    // Row 1 and row 2 of the worked example.
    const rows = curve.decasteljauScheme(1.2).map(row => row.map(point => [point.X(), point.Y()]));
    // Rows keep stale trailing entries, so only the first 4 - r points of row r belong to the scheme.
    expectPoints(rows[1].slice(0, 3), [[-14 / 5, 4], [3, 3], [16 / 5, -9 / 5]]);
    expectPoints(rows[2].slice(0, 2), [[104 / 25, 14 / 5], [81 / 25, -69 / 25]]);
    // t = 3/2 control points stated in the largest-extension step.
    expectPoints(coordinates(curve.extrapolate(1.5)), [[-4, -2], [-2.5, 5.5], [8, 1.75], [0.5, -9.875]]);
    expect(curve.eval(1.5).X()).toBeCloseTo(0.5, 12);
    expect(curve.eval(1.5).Y()).toBeCloseTo(-9.875, 12);
    for (const t of [1, 1.2, 1.35, 1.5]) {
        const e = curve.extrapolate(t);
        [0, 0.25, 0.5, 1 / t, 1].forEach(u => {
            expect(e.eval(u).X()).toBeCloseTo(curve.eval(t * u).X(), 9);
            expect(e.eval(u).Y()).toBeCloseTo(curve.eval(t * u).Y(), 9);
        });
        // It retraces the original on [0, 1/t] and ends beyond it at B(t).
        expect(e.eval(1 / t).X()).toBeCloseTo(curve.eval(1).X(), 9);
        expect(e.eval(1).X()).toBeCloseTo(curve.eval(t).X(), 9);
    }
    // Control points leave the curve quickly: the farthest control point is farther from the origin the larger t is.
    const spread = (t: number) => Math.max(...coordinates(curve.extrapolate(t)).map(([x, y]) => Math.hypot(x, y)));
    expect(spread(1.5)).toBeGreaterThan(spread(1.2));
    expect(spread(1.2)).toBeGreaterThan(spread(1));
});

test('rational extrapolation worked example, weights, and the absence of a pole', () => {
    const curve = new RationalBezierCurve(toPoints(rationalExtrapolationPoints), rationalWeights);
    const denominator = (s: number) => rationalWeights.reduce((sum, w, i) => sum + [1, 3, 3, 1][i] * (1 - s) ** (3 - i) * s ** i * w, 0);
    // Closed forms used by the lesson.
    for (const t of [1, 1.2, 1.366, 1.5]) {
        const e = curve.extrapolate(t);
        const expectedWeights = [1, 1 + t, 1 + 2 * t - 2 * t * t, 1 + 3 * t - 6 * t * t + 3 * t ** 3];
        e.getWeights().forEach((w, i) => expect(w).toBeCloseTo(expectedWeights[i], 9));
        expect(e.getWeights()[3]).toBeCloseTo(denominator(t), 9);
    }
    // t = 6/5.
    const extended = curve.extrapolate(1.2);
    expectPoints(coordinates(extended), [[-4, -3], [-32 / 11, 39 / 11], [176 / 13, 33 / 13], [436 / 143, -3]]);
    coordinates(extended).forEach(([x, y], i) => {
        expect(x).toBeCloseTo([-4, -2.9091, 13.5385, 3.049][i], 3);
        expect(y).toBeCloseTo([-3, 3.5455, 2.5385, -3][i], 3);
    });
    extended.getWeights().forEach((w, i) => expect(w).toBeCloseTo([1, 11 / 5, 13 / 25, 143 / 125][i], 12));
    expect(extended.getWeights().map(w => Number(w.toFixed(3)))).toEqual([1, 2.2, 0.52, 1.144]);
    expect(Math.min(...extended.getWeights())).toBeGreaterThan(0);
    // t = 3/2: the stated weights, one of them negative.
    const large = curve.extrapolate(1.5);
    large.getWeights().forEach((w, i) => expect(w).toBeCloseTo([1, 5 / 2, -1 / 2, 17 / 8][i], 12));
    expect(large.getPoints()[2].X()).toBeCloseTo(-29.5, 9);
    expect(large.getPoints()[2].Y()).toBeCloseTo(6, 9);
    // The third weight vanishes at (1 + sqrt 3) / 2 and is negative beyond it.
    const critical = (1 + Math.sqrt(3)) / 2;
    expect(critical).toBeCloseTo(1.366, 3);
    expect(1 + 2 * critical - 2 * critical ** 2).toBeCloseTo(0, 12);
    expect(curve.extrapolate(1.4).getWeights()[2]).toBeLessThan(0);
    expect(curve.extrapolate(1.3).getWeights()[2]).toBeGreaterThan(0);
    // The original denominator D(s) = 1 + 3s - 6s^2 + 3s^3 stays at least 1 on [0, 3/2]: no pole, and E(u) = B(tu).
    let minimum = Infinity;
    for (let i = 0; i <= 1500; i++) {
        const s = i / 1000;
        expect(denominator(s)).toBeCloseTo(1 + 3 * s - 6 * s * s + 3 * s ** 3, 12);
        minimum = Math.min(minimum, denominator(s));
    }
    expect(minimum).toBeGreaterThanOrEqual(1 - 1e-12);
    expect(denominator(1.5)).toBeCloseTo(17 / 8, 12);
    for (const t of [1, 1.2, 1.366, 1.4, 1.5]) {
        const e = curve.extrapolate(t);
        [0, 0.25, 0.5, 1 / t, 0.9, 1].forEach(u => {
            expect(Number.isFinite(e.eval(u).X())).toBe(true);
            expect(e.eval(u).X()).toBeCloseTo(curve.eval(t * u).X(), 8);
            expect(e.eval(u).Y()).toBeCloseTo(curve.eval(t * u).Y(), 8);
        });
    }
    const example = lessonFor('rational-extrapolation').workedExamples[0];
    expect(example.resultLatex).toContain('\\tfrac{176}{13},\\tfrac{33}{13}');
    expect(example.resultLatex).toContain('_{143/125}');
});
