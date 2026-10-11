import {functionGuidedLessons} from './functionGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES, getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, sceneAction} from '../runtime/lessonCatalog';
import {lineThroughPoints, moveAlongLine} from '../../analysis/linear';
import {exponentialValue, integerValues, mirrorBase} from '../../analysis/exponential';

const linearLesson = () => functionGuidedLessons.find(lesson => lesson.demonstrationId === 'linear-function')!;

test('keeps the function lessons bounded, localized, and source-backed', () => {
    expect(functionGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['linear-function', 'exponential-function']);
    for (const lesson of functionGuidedLessons) {
        expect(getGuidedLesson(lesson.demonstrationId)).toBe(lesson);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(6);
        expect(lesson.steps.map(step => step.order)).toEqual(lesson.steps.map((_, index) => index + 1));
        expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
        expect(new Set(lesson.steps.flatMap(step => step.frames.map(frame => frame.id))).size)
            .toBe(lesson.steps.reduce((sum, step) => sum + step.frames.length, 0));
        expect(lesson.sources.length).toBeGreaterThanOrEqual(2);
        expect(lesson.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
        expect(lesson.sources.some(source => source.implementationCorrespondence)).toBe(true);
        expect(lesson.workedExamples.length).toBeGreaterThan(0);
        expect(lesson.edgeCases.length).toBeGreaterThan(0);
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
            expect(step.scene).toBeDefined();
            step.formulaIds.forEach(id => expect(formulaIds.has(id)).toBe(true));
            if (step.workedExampleId) expect(exampleIds.has(step.workedExampleId)).toBe(true);
            for (const action of step.scene?.actions ?? []) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
    }
});

test('the lesson is available and adapts its scenes into typed function-parameter actions', () => {
    const lesson = getLessonForDemonstration('linear-function')!;
    expect(lesson.id).toBe('linear-function-guided');
    expect(lesson.steps).toHaveLength(5);
    expect(lesson.steps[0].scene?.actions).toEqual([{kind: 'prepared-scene', sceneId: 'linear-default', source: 'demonstration-default'}]);
    expect(lesson.steps[1].scene?.actions).toEqual([
        {kind: 'prepared-scene', sceneId: 'linear-slope-example', source: 'demonstration-default'},
        {kind: 'function-parameter', name: 'x1', value: 0},
        {kind: 'function-parameter', name: 'y1', value: 1},
        {kind: 'function-parameter', name: 'x2', value: 2},
        {kind: 'function-parameter', name: 'y2', value: 5},
    ]);
    expect(lesson.steps[2].scene?.actions.at(-1)).toEqual({kind: 'function-parameter', name: 'n', value: -2});
    expect(lesson.steps[3].scene?.actions.at(-1)).toEqual({kind: 'function-parameter', name: 'k', value: -0.5});
});

test('scene actions reject unknown names, malformed values and non-finite numbers', () => {
    const bad = (value: unknown) => () => sceneAction({name: 'set-function-parameter', value: value as never});
    expect(bad({name: 'z', value: 1})).toThrow(/name must be one of/);
    expect(bad({name: 'k', value: NaN})).toThrow(/finite number/);
    expect(bad({name: 'k', value: Infinity})).toThrow(/finite number/);
    expect(bad({name: 'k', value: '2'})).toThrow(/finite number/);
    expect(bad(2)).toThrow(/{name, value}/);
    expect(bad([1, 2])).toThrow(/{name, value}/);
    expect(bad(null)).toThrow(/{name, value}/);
    expect(sceneAction({name: 'set-function-parameter', value: {name: 'y2', value: -3}})).toEqual({kind: 'function-parameter', name: 'y2', value: -3});
});

test('the worked example and the scene values match the line mathematics', () => {
    const lesson = linearLesson();
    const example = lesson.workedExamples[0];
    expect(lineThroughPoints({x: 0, y: 1}, {x: 2, y: 5})).toEqual({kind: 'line', k: 2, n: 1});
    expect(example.calculationLatex).toContain('\\frac{5-1}{2-0}=\\frac42=2');
    expect(example.calculationLatex).toContain('n=y_1-kx_1=1-2\\cdot0=1');
    expect(example.resultLatex).toBe('y=2x+1');
    // 2 * 2 + 1 = 5 is the check stated for P2.
    expect(2 * 2 + 1).toBe(5);

    const parameters = lesson.steps.flatMap(step => step.scene?.actions ?? []).filter(action => action.name === 'set-function-parameter');
    const values = parameters.map(action => action.value as {name: string; value: number});
    expect(values.every(({value}) => Number.isFinite(value))).toBe(true);

    // Scenes that start from the default points (0,1), (2,5): the stated results of the n and k steps.
    const fromDefault = [{x: 0, y: 1}, {x: 2, y: 5}] as const;
    expect(moveAlongLine(fromDefault[0], fromDefault[1], {n: -2})).toEqual([{x: 0, y: -2}, {x: 2, y: 2}]);
    expect(moveAlongLine(fromDefault[0], fromDefault[1], {k: -0.5})).toEqual([{x: 0, y: 1}, {x: 2, y: 0}]);
    // The edge-case scene places both points on x = 1.
    expect(lineThroughPoints({x: 1, y: -1}, {x: 1, y: 3})).toEqual({kind: 'vertical', x: 1});
});

test('scene actions accept the exponential base and reject a base that is not a finite number', () => {
    expect(sceneAction({name: 'set-function-parameter', value: {name: 'a', value: 0.5}})).toEqual({kind: 'function-parameter', name: 'a', value: 0.5});
    expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'a', value: NaN}})).toThrow(/finite number/);
});

test('show-function-element validates its closed target and boolean value', () => {
    const element = (value: unknown) => () => sceneAction({name: 'show-function-element', value: value as never});
    expect(sceneAction({name: 'show-function-element', value: {name: 'mirror', value: true}})).toEqual({kind: 'function-visibility', target: 'mirror', visible: true});
    expect(sceneAction({name: 'show-function-element', value: {name: 'mirror', value: false}})).toEqual({kind: 'function-visibility', target: 'mirror', visible: false});
    expect(element({name: 'tangent', value: true})).toThrow(/name must be one of mirror/);
    expect(element({name: 'mirror', value: 1})).toThrow(/true or false/);
    expect(element({name: 'mirror', value: 'true'})).toThrow(/true or false/);
    expect(element({name: 'mirror'})).toThrow(/true or false/);
    expect(element(true)).toThrow(/{name, value}/);
    expect(element(null)).toThrow(/{name, value}/);
    expect(element([])).toThrow(/{name, value}/);
});

describe('exponential-function lesson', () => {
    const lesson = () => getLessonForDemonstration('exponential-function')!;
    const example = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'exponential-function')!.workedExamples[0];

    test('is available with five steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('exponential-function-guided');
        expect(lesson().steps).toHaveLength(5);
        expect(lesson().steps[2].scene?.actions.at(-1)).toEqual({kind: 'function-parameter', name: 'a', value: 0.5});
        expect(lesson().steps[3].scene?.actions.slice(1)).toEqual([
            {kind: 'function-parameter', name: 'a', value: 2},
            {kind: 'function-visibility', target: 'mirror', visible: true},
        ]);
    });

    test('the worked example matches the mathematics: f(0..3) = 1, 2, 4, 8', () => {
        expect(integerValues(2, 0, 3)).toEqual([1, 2, 4, 8]);
        expect(example().calculationLatex).toContain('f(0)=2^0=1,\\quad f(1)=2\\cdot1=2,\\quad f(2)=2\\cdot2=4,\\quad f(3)=2\\cdot4=8');
        expect(example().resultLatex).toBe('f(0),f(1),f(2),f(3)=1,\\,2,\\,4,\\,8');
    });

    test('the numbers stated in the prose are correct', () => {
        expect(integerValues(0.5, 0, 3)).toEqual([1, 0.5, 0.25, 0.125]);
        expect(exponentialValue(mirrorBase(2), -1)).toBe(2);
        expect(exponentialValue(2, -10)).toBe(1 / 1024);
        expect(1 / 1024).toBeCloseTo(0.001, 3);
        expect(exponentialValue(0.1, -4)).toBeCloseTo(10000, 6);
        expect(Math.pow(-2, 0.5)).toBeNaN();
    });
});
