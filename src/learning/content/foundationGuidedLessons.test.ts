import {foundationGuidedLessons} from './foundationGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES} from './guidedLessons';
import {sceneAction} from '../runtime/lessonCatalog';
import {RationalBezierCurve} from '../../bezeg/impl/curve/rational-bezier-curve';
import {PointImpl} from '../../bezeg/impl/point/point-impl';

const bernsteinLesson = () => foundationGuidedLessons.find(lesson => lesson.demonstrationId === 'bernstein')!;
const rationalLesson = () => foundationGuidedLessons.find(lesson => lesson.demonstrationId === 'rational-elevation')!;

test('keeps the foundation lessons bounded, localized, and source-backed', () => {
    expect(foundationGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['bernstein', 'rational-elevation']);
    for (const lesson of foundationGuidedLessons) {
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(6);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
        expect(new Set(lesson.steps.flatMap(step => step.frames.map(frame => frame.id))).size)
            .toBe(lesson.steps.reduce((sum, step) => sum + step.frames.length, 0));
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
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
        for (const step of lesson.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
            expect(step.frames.filter(frame => frame.kind === 'calculation')).toHaveLength(step.workedExampleId ? 1 : 0);
            step.formulaIds.forEach(id => expect(formulaIds.has(id)).toBe(true));
            if (step.workedExampleId) expect(exampleIds.has(step.workedExampleId)).toBe(true);
            for (const action of step.scene?.actions ?? []) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
    }
});

test('the Bernstein worked example matches the basis function definition', () => {
    const choose = (n: number, i: number) => {
        let result = 1;
        for (let k = 0; k < i; k++) result = result * (n - k) / (k + 1);
        return result;
    };
    const values = [0, 1, 2, 3].map(i => choose(3, i) * 0.5 ** i * 0.5 ** (3 - i));
    expect(values).toEqual([1 / 8, 3 / 8, 3 / 8, 1 / 8]);
    expect(values.reduce((a, b) => a + b, 0)).toBe(1);
    const example = bernsteinLesson().workedExamples[0];
    expect(example.resultLatex).toContain('\\tfrac18,\\tfrac38,\\tfrac38,\\tfrac18');
    expect(example.resultLatex).toContain('=1');
    const degrees = bernsteinLesson().steps.flatMap(step => step.scene?.actions ?? []).filter(action => action.name === 'set-bernstein-degree');
    expect(degrees.length).toBeGreaterThan(0);
    expect(degrees.every(action => Number.isInteger(action.value) && (action.value as number) >= 0 && (action.value as number) <= 5)).toBe(true);
    expect(bernsteinLesson().steps[0].scene?.actions).toEqual([]);
});

test('the rational elevation worked example matches RationalBezierCurve.elevate()', () => {
    const points = [[-4, -3], [-3, 3], [3, 3], [4, -3]].map(([x, y]) => new PointImpl(x, y));
    const curve = new RationalBezierCurve(points, [1, 2, 1, 1]);
    const elevated = curve.elevate();
    [1, 7 / 4, 3 / 2, 1, 1].forEach((w, i) => expect(elevated.getWeights()[i]).toBeCloseTo(w, 10));
    const expected = [[-4, -3], [-22 / 7, 15 / 7], [-1, 3], [13 / 4, 3 / 2], [4, -3]];
    expected.forEach(([x, y], i) => {
        expect(elevated.getPoints()[i].X()).toBeCloseTo(x, 10);
        expect(elevated.getPoints()[i].Y()).toBeCloseTo(y, 10);
    });
    // The unweighted blend of P0 and P1 that the lesson contrasts with Q1.
    expect(0.25 * -4 + 0.75 * -3).toBeCloseTo(-3.25, 10);
    expect(0.25 * -3 + 0.75 * 3).toBeCloseTo(1.5, 10);
    expect(Math.abs(elevated.getPoints()[1].X() - -3.25)).toBeGreaterThan(0.1);

    const example = rationalLesson().workedExamples[0];
    for (const fragment of ['\\tfrac74', '\\tfrac32', '-\\tfrac{22}{7},\\tfrac{15}{7}', 'Q_2=(-1,3)', '\\tfrac{13}{4},\\tfrac32']) {
        expect(example.resultLatex).toContain(fragment);
    }
    expect(example.calculationLatex).toContain('w=(1,2,1,1)');
    expect(example.check.en).toContain('(-3.25, 1.5)');

    const twice = elevated.elevate();
    expect(twice.getPoints()).toHaveLength(6);
    [0, 0.3, 0.5, 1].forEach(t => {
        expect(twice.eval(t).X()).toBeCloseTo(curve.eval(t).X(), 10);
        expect(twice.eval(t).Y()).toBeCloseTo(curve.eval(t).Y(), 10);
    });
    const elevateActions = rationalLesson().steps.map(step => step.scene?.actions.filter(action => action.name === 'elevate-degree').length ?? 0);
    expect(elevateActions).toEqual([0, 0, 1, 1, 2]);
});
