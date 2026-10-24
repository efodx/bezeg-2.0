import {parameterizationGuidedLessons} from './parameterizationGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES} from './guidedLessons';
import {sceneAction} from '../runtime/lessonCatalog';
import {alphaParameterization} from '../../graphs/curves/parametrisations/AlphaParamBezierCurveGraph';
import {PhBezierCurve} from '../../bezeg/impl/curve/ph-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';
import {PolynomialBezierCurve} from '../../bezeg/impl/curve/polynomial-bezier-curve';

const lessonFor = (id: string) => parameterizationGuidedLessons.find(lesson => lesson.demonstrationId === id)!;

// The route's default PH cubic (see UniformParamBezierCurveGraph.defaultPreset).
const defaultCurve = () => new PhBezierCurve(
    [new PointImpl(-3, -4)],
    [[-4.5, -4], [-1, 0], [-4.5, 4]].map(([x, y]) => new PointImpl(x, y)));

test('keeps the parameterization lessons bounded, localized, and source-backed', () => {
    expect(parameterizationGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['weighted-parameterization', 'uniform-parameterization']);
    for (const lesson of parameterizationGuidedLessons) {
        expect(lesson.steps).toHaveLength(5);
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
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
            expect(step.scene?.basedOn).toBe('demonstration-default');
            for (const action of step.scene?.actions ?? []) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
        expect(usedExamples).toEqual(exampleIds);
    }
});

test('the weighted lesson only uses alpha and sample actions, the mode action belongs to the PH route', () => {
    const names = (id: string) => new Set(lessonFor(id).steps.flatMap(step => step.scene?.actions ?? []).map(action => action.name));
    expect(names('weighted-parameterization')).toEqual(new Set(['set-parameterization-alpha', 'set-parameterization-samples']));
    expect(names('uniform-parameterization')).toEqual(new Set(['set-parameterization-mode', 'set-parameterization-alpha', 'set-parameterization-samples']));
    // Both lessons open with three interior samples set by explicit actions, not by the route default of 10.
    const first = (id: string) => lessonFor(id).steps[0].scene!.actions.map(action => [action.name, action.value]);
    expect(first('weighted-parameterization')).toEqual([['set-parameterization-alpha', 0.5], ['set-parameterization-samples', 3]]);
    expect(first('uniform-parameterization')).toEqual([['set-parameterization-mode', 'weighted'], ['set-parameterization-alpha', 0.5], ['set-parameterization-samples', 3]]);
});

test('the weighted worked examples match the implementation of phi_alpha', () => {
    const phi = alphaParameterization;
    // Boundary values, monotonicity, and identity at alpha = 1/2.
    for (const alpha of [0.1, 0.25, 0.5, 0.75, 0.9]) {
        expect(phi(alpha, 0)).toBeCloseTo(0, 12);
        expect(phi(alpha, 1)).toBeCloseTo(1, 12);
        let previous = -1;
        for (let i = 0; i <= 100; i++) {
            const value = phi(alpha, i / 100);
            expect(value).toBeGreaterThan(previous);
            previous = value;
        }
        for (const t of [0.1, 0.3, 0.6, 0.85]) {
            expect(phi(1 - alpha, t)).toBeCloseTo(1 - phi(alpha, 1 - t), 12);
        }
    }
    [0.1, 0.4, 0.9].forEach(t => expect(phi(0.5, t)).toBeCloseTo(t, 12));

    const quarter = [0.25, 0.5, 0.75].map(t => phi(0.25, t));
    [1 / 2, 3 / 4, 9 / 10].forEach((value, i) => expect(quarter[i]).toBeCloseTo(value, 12));
    // The closed form quoted in the calculation: phi_{1/4}(t) = 3t / (1 + 2t).
    [0.25, 0.5, 0.75].forEach(t => expect(phi(0.25, t)).toBeCloseTo(3 * t / (1 + 2 * t), 12));
    const threeQuarters = [0.25, 0.5, 0.75].map(t => phi(0.75, t));
    [1 / 10, 1 / 4, 1 / 2].forEach((value, i) => expect(threeQuarters[i]).toBeCloseTo(value, 12));
    [0.25, 0.5, 0.75].forEach(t => expect(phi(0.75, t)).toBeCloseTo(t / (3 - 2 * t), 12));

    const examples = lessonFor('weighted-parameterization').workedExamples;
    expect(examples.find(example => example.id === 'wp-quarter')!.resultLatex).toContain('\\left(\\tfrac12,\\tfrac34,\\tfrac9{10}\\right)');
    expect(examples.find(example => example.id === 'wp-three-quarters')!.resultLatex).toContain('\\left(\\tfrac1{10},\\tfrac14,\\tfrac12\\right)');

    // Interior alpha keeps samples interior; alpha 0 and 1 collapse them to the endpoints.
    [0.25, 0.5, 0.75].forEach(t => {
        expect(phi(0, t)).toBe(1);
        expect(phi(1, t)).toBe(0);
    });
});

test('the weighted lesson scenes use the values stated in the prose', () => {
    const lesson = lessonFor('weighted-parameterization');
    const scenes = Object.fromEntries(lesson.steps.map(step => [step.id, step.scene!.actions.map(action => [action.name, action.value])]));
    expect(lesson.steps.map(step => step.id)).toEqual(['wp-same-curve', 'wp-quarter-calculation', 'wp-symmetry-step', 'wp-density-ten', 'wp-density']);
    expect(scenes['wp-same-curve']).toEqual([['set-parameterization-alpha', 0.5], ['set-parameterization-samples', 3]]);
    expect(scenes['wp-quarter-calculation']).toEqual([['set-parameterization-alpha', 0.25], ['set-parameterization-samples', 3]]);
    expect(scenes['wp-symmetry-step']).toEqual([['set-parameterization-alpha', 0.75], ['set-parameterization-samples', 3]]);
    expect(scenes['wp-density-ten']).toEqual([['set-parameterization-alpha', 0.25], ['set-parameterization-samples', 10]]);
    expect(scenes['wp-density']).toEqual([['set-parameterization-alpha', 0.25], ['set-parameterization-samples', 20]]);
    // No scene replaces the control points, so all comparisons share one locus.
    lesson.steps.forEach(step => expect(Object.keys(step.scene!).sort()).toEqual(['actions', 'basedOn', 'expectedState', 'id']));
    expect(lesson.steps[0].explanation.en).toContain('N=3');
    expect(lesson.steps[0].explanation.en).toContain('end points');
});

// Sample parameters as the graph computes them: N interior values i/(N+1) mapped by phi_alpha; B(0) and B(1) are not markers.
const weightedParameters = (alpha: number, count: number) =>
    Array.from({length: count}, (_, i) => alphaParameterization(alpha, (i + 1) / (count + 1)));

const bezierCurve = () => new PolynomialBezierCurve([[-4, -3], [-3, 2], [2, 2], [3, -2]].map(([x, y]) => new PointImpl(x, y)));

// Distance of a point to the curve, from a fine polyline (spacing at most about 0.01 in this scene, so the tolerance 1e-2 is the sampling bound).
const distanceToLocus = (curve: {eval(t: number): {X(): number, Y(): number}}, x: number, y: number) => {
    let best = Infinity;
    const n = 4000;
    for (let i = 0; i <= n; i++) {
        const p = curve.eval(i / n);
        best = Math.min(best, Math.hypot(p.X() - x, p.Y() - y));
    }
    return best;
};

test('the weighted comparison keeps one locus and the stated parameters for alpha 1/2, 1/4 and 3/4 with three samples', () => {
    const curve = bezierCurve();
    const expected: Record<number, number[]> = {0.5: [1 / 4, 1 / 2, 3 / 4], 0.25: [1 / 2, 3 / 4, 9 / 10], 0.75: [1 / 10, 1 / 4, 1 / 2]};
    for (const [alpha, parameters] of Object.entries(expected)) {
        const actual = weightedParameters(Number(alpha), 3);
        expect(actual).toHaveLength(3);
        actual.forEach((value, i) => expect(value).toBeCloseTo(parameters[i], 12));
        // Interior samples only: strictly between the end points.
        actual.forEach(value => { expect(value).toBeGreaterThan(0); expect(value).toBeLessThan(1); });
    }
    // Same locus: every sample at every alpha and count lies on the one fixed curve.
    for (const alpha of [0.25, 0.5, 0.75]) {
        for (const count of [3, 10, 20]) {
            weightedParameters(alpha, count).forEach(t => {
                const point = curve.eval(t);
                expect(distanceToLocus(curve, point.X(), point.Y())).toBeLessThan(1e-2);
            });
        }
    }
    // The locus check can fail: a point off the curve is rejected.
    expect(distanceToLocus(curve, 0, 0)).toBeGreaterThan(0.5);
    // The comparison is not vacuous: the samples differ between alphas and crowd as the prose says.
    const last = (alpha: number) => curve.eval(weightedParameters(alpha, 3)[2]);
    expect(Math.hypot(last(0.25).X() - last(0.75).X(), last(0.25).Y() - last(0.75).Y())).toBeGreaterThan(1);
    const ten = weightedParameters(0.25, 10);
    expect(ten).toHaveLength(10);
    const gaps = ten.map((value, i) => value - (i ? ten[i - 1] : 0));
    expect(gaps[0]).toBeGreaterThan(gaps[9]);
});

test('the uniform lesson numbers match the PH implementation', () => {
    const curve = defaultCurve();
    const simpson = (f: (t: number) => number, n = 2000) => {
        const h = 1 / n;
        let sum = f(0) + f(1);
        for (let i = 1; i < n; i++) sum += f(i * h) * (i % 2 ? 4 : 2);
        return sum * h / 3;
    };
    const L = curve.s(1);
    expect(L).toBeCloseTo(1003 / 60, 10);
    expect(L).toBeCloseTo(simpson(t => curve.sigma(t)), 8);
    expect(L.toFixed(2)).toBe('16.72');
    expect((L / 4).toFixed(2)).toBe('4.18');
    // Speed is the length of the derivative, which equals |w|^2 for the squared hodograph.
    const h = 1e-6;
    const speedFromDerivative = (t: number) => {
        const a = curve.eval(t + h), b = curve.eval(t - h);
        return Math.hypot(a.X() - b.X(), a.Y() - b.Y()) / (2 * h);
    };
    [0.2, 0.5, 0.8].forEach(t => expect(speedFromDerivative(t)).toBeCloseTo(curve.sigma(t), 4));
    expect(curve.sigma(0)).toBeCloseTo(36.25, 10);
    expect(curve.sigma(1)).toBeCloseTo(36.25, 10);
    expect(curve.sigma(0.5)).toBeCloseTo(7.5625, 10);
    expect(curve.sigma(0.5).toFixed(2)).toBe('7.56');

    // N = 3: solve s(t_k) = k L / 4 independently by bisection.
    const solve = (target: number) => {
        let lo = 0, hi = 1;
        for (let i = 0; i < 80; i++) {
            const mid = (lo + hi) / 2;
            if (curve.s(mid) < target) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
    };
    const exact = [1, 2, 3].map(k => solve(k * L / 4));
    expect(exact[0].toFixed(3)).toBe('0.149');
    expect(exact[1]).toBeCloseTo(0.5, 10);
    expect(exact[2].toFixed(3)).toBe('0.851');
    expect(exact[2]).toBeCloseTo(1 - exact[0], 10);
    // The implementation's Newton inversion agrees with the exact solutions.
    const ds = L / 4;
    let t = 0;
    const inverted = [1, 2, 3].map(k => (t = curve.tk(t, ds, k)));
    inverted.forEach((value, i) => expect(value).toBeCloseTo(exact[i], 6));
    const example = lessonFor('uniform-parameterization').workedExamples[0];
    expect(example.calculationLatex).toContain('\\tfrac{1003}{60}');
    expect(example.resultLatex).toBe('t_1\\approx 0.149,\\quad t_2=\\tfrac12,\\quad t_3\\approx 0.851');
});

test('uniform samples are approximately, not exactly, equally spaced, unlike weighted samples at alpha 1/2', () => {
    const curve = defaultCurve();
    const L = curve.s(1);
    const N = 10;
    const ds = L / (N + 1);
    let t = 0;
    const uniform = Array.from({length: N}, (_, i) => (t = curve.tk(t, ds, i + 1)));
    const weighted = Array.from({length: N}, (_, i) => alphaParameterization(0.5, (i + 1) / (N + 1)));
    uniform.forEach((value, i) => expect(Math.abs(curve.s(value) - (i + 1) * ds)).toBeLessThan(1e-6 * L));
    weighted.forEach((value, i) => expect(value).toBeCloseTo((i + 1) / (N + 1), 12));
    const chords = (ts: number[]) => {
        const all = [0, ...ts, 1].map(value => curve.eval(value));
        return all.slice(1).map((p, i) => Math.hypot(p.X() - all[i].X(), p.Y() - all[i].Y()));
    };
    const ratio = (values: number[]) => Math.max(...values) / Math.min(...values);
    const uniformRatio = ratio(chords(uniform));
    const weightedRatio = ratio(chords(weighted));
    expect(uniformRatio).toBeGreaterThan(1);
    expect(uniformRatio).toBeLessThan(1.1);
    expect(weightedRatio).toBeGreaterThan(4);
    expect(weightedRatio).toBeLessThan(4.2);
    // Arc-length gaps of the weighted samples are visibly unequal; the middle ones are the shortest.
    const gaps = weighted.map((value, i) => curve.s(value) - (i ? curve.s(weighted[i - 1]) : 0));
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeGreaterThan(3);
    const middle = gaps[Math.floor(N / 2)];
    expect(middle).toBeLessThan(gaps[0]);
    expect(middle).toBeLessThan(gaps[N - 1]);

    // Prose says "about 4 times" and "approximately equal"; it never claims exact equality.
    const lesson = lessonFor('uniform-parameterization');
    expect(lesson.steps[4].explanation.en).toContain('about 4 times');
    const equalArc = lesson.formulaBlocks.find(formula => formula.id === 'up-equal-arc')!;
    expect(equalArc.explanation.en).toContain('approximately equal, not exactly equal');
    expect(JSON.stringify(lesson.steps).replace(/not exactly equal/g, '')).not.toMatch(/exactly equal|precisely equal/);
});

const weightedParameters10 = (alpha: number) => weightedParameters(alpha, 10);

test('uniform lesson: equal arcs versus unequal chords, inversion tolerance, shared locus, and prose figures', () => {
    const curve = defaultCurve();
    const L = curve.s(1);
    const uniformTs = (N: number) => {
        let t = 0;
        return Array.from({length: N}, (_, i) => (t = curve.tk(t, L / (N + 1), i + 1)));
    };
    const pieces = (ts: number[], f: (a: number, b: number) => number) => {
        const all = [0, ...ts, 1];
        return all.slice(1).map((value, i) => f(all[i], value));
    };
    const chord = (a: number, b: number) => Math.hypot(curve.eval(b).X() - curve.eval(a).X(), curve.eval(b).Y() - curve.eval(a).Y());
    // Arc length by Simpson integration of the speed, independent of curve.s.
    const arc = (a: number, b: number, n = 400) => {
        const h = (b - a) / n;
        let sum = curve.sigma(a) + curve.sigma(b);
        for (let i = 1; i < n; i++) sum += curve.sigma(a + i * h) * (i % 2 ? 4 : 2);
        return sum * h / 3;
    };

    // Inversion tolerance: one predictor step and four Newton corrections, no stopping criterion. The recorded error is about
    // 1e-8 L at N = 3 and rounding level for N >= 10; the lesson states "below 1e-6 L".
    let worst = 0;
    for (let N = 1; N <= 40; N++) {
        uniformTs(N).forEach((value, i) => { worst = Math.max(worst, Math.abs(arc(0, value) - (i + 1) * L / (N + 1)) / L); });
    }
    expect(worst).toBeLessThan(1e-6);
    expect(worst).toBeGreaterThan(1e-10); // approximate, not exact
    expect(L / 4).toBeCloseTo(4.18, 2);

    // N = 3: weighted arcs 5.92, 2.43, 2.43, 5.92; uniform arcs 4.18 each, uniform chords 4.18, 3.91, 3.91, 4.18.
    pieces(weightedParameters(0.5, 3), arc).forEach((value, i) => expect(value).toBeCloseTo([5.92, 2.43, 2.43, 5.92][i], 2));
    pieces(uniformTs(3), arc).forEach(value => expect(Math.abs(value - L / 4)).toBeLessThan(1e-6 * L));
    const chords3 = pieces(uniformTs(3), chord);
    chords3.forEach((value, i) => expect(value).toBeCloseTo([4.18, 3.91, 3.91, 4.18][i], 2));
    expect(chords3[1] / chords3[0]).toBeGreaterThan(0.92);
    expect(chords3[1] / chords3[0]).toBeLessThan(0.95); // "about 6% shorter"

    // N = 10: 11 equal arcs L/11 = 1.52; chords 1.52 near the ends and 1.44 in the middle (about 5% shorter).
    const uniform10 = uniformTs(10);
    pieces(uniform10, arc).forEach(value => expect(value).toBeCloseTo(1.52, 2));
    const chords10 = pieces(uniform10, chord);
    expect(chords10[0]).toBeCloseTo(1.52, 2);
    expect(chords10[5]).toBeCloseTo(1.44, 2);
    expect(chords10[5] / chords10[0]).toBeGreaterThan(0.93);
    expect(chords10[5] / chords10[0]).toBeLessThan(0.96);
    chords10.forEach((value, i) => expect(value).toBeLessThanOrEqual(pieces(uniform10, arc)[i] + 1e-9));

    // Weighted alpha = 1/2 at the same count: arcs 2.81 near the ends down to 0.69 in the middle (about 4 times).
    const weighted10 = weightedParameters10(0.5);
    weighted10.forEach((value, i) => expect(value).toBeCloseTo((i + 1) / 11, 12));
    const arcs10 = pieces(weighted10, arc);
    expect(arcs10[0]).toBeCloseTo(2.81, 2);
    expect(arcs10[5]).toBeCloseTo(0.69, 2);
    expect(arcs10[0] / arcs10[5]).toBeGreaterThan(3.9);
    expect(arcs10[0] / arcs10[5]).toBeLessThan(4.2);

    // Same locus: weighted and uniform samples at the same count lie on the one PH curve.
    [...weighted10, ...uniform10].forEach(t => {
        const point = curve.eval(t);
        expect(distanceToLocus(curve, point.X(), point.Y())).toBeLessThan(1e-2);
    });

    // The scenes compare modes at one count and geometry: steps 4 and 5 both use 10 samples, steps 1 to 3 use 3.
    const lesson = lessonFor('uniform-parameterization');
    const counts = lesson.steps.map(step => step.scene!.actions.find(action => action.name === 'set-parameterization-samples')!.value);
    expect(counts).toEqual([3, 3, 3, 10, 10]);
    expect(lesson.steps.map(step => step.scene!.actions.find(action => action.name === 'set-parameterization-mode')!.value))
        .toEqual(['weighted', 'weighted', 'uniform', 'uniform', 'weighted']);
    lesson.steps.forEach(step => expect(Object.keys(step.scene!).sort()).toEqual(['actions', 'basedOn', 'expectedState', 'id']));

    // The prose figures appear in both languages.
    const prose = JSON.stringify([lesson.steps, lesson.formulaBlocks, lesson.edgeCases]);
    for (const needle of ['5{,}92', '2{,}43', '4{,}18', '3{,}91', '1{,}52', '1{,}44', '2{,}81', '0{,}69', 'tetiv']) expect(prose).toContain(needle);
    for (const needle of ['5.92', '2.43', '4.18', '3.91', '1.52', '1.44', '2.81', '0.69', 'chord', 'one predictor step and four corrections']) expect(prose).toContain(needle);

    // Each figure sits in the step that explains it (a figure edited in one place cannot hide behind a repeat elsewhere).
    const [, , chordStep, tenStep, contrastStep] = lesson.steps;
    expect(chordStep.explanation.sl).toContain('\\(3{,}91\\), \\(3{,}91\\)');
    expect(chordStep.explanation.en).toContain('\\(3.91\\), \\(3.91\\)');
    expect(tenStep.explanation.sl).toContain('\\(1{,}44\\)');
    expect(tenStep.explanation.en).toContain('\\(1.44\\)');
    expect(contrastStep.explanation.sl).toContain('\\(2{,}81\\)');
    expect(contrastStep.explanation.en).toContain('\\(0.69\\)');
});
