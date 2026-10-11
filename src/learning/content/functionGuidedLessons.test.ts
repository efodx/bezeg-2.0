import {functionGuidedLessons} from './functionGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES, getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, sceneAction} from '../runtime/lessonCatalog';
import {lineThroughPoints, moveAlongLine} from '../../analysis/linear';
import {exponentialValue, integerValues, mirrorBase} from '../../analysis/exponential';
import {amplitude, basicValue, period, phaseShift, tangentAsymptotes, trigValue, valueRange} from '../../analysis/trigonometric';
import {CONTINUOUS_PARAMETER, isContinuous, jump, leftLimit, leftSlope, rightLimit, rightSlope, valueAtJoin} from '../../analysis/continuity';
import {catalogFunction} from '../../analysis/functions';
import {differenceQuotient, isStep, secantLine} from '../../analysis/derivative';
import {exactIntegral, isBound, riemannSum, subintervalWidth} from '../../analysis/riemann';

const linearLesson = () => functionGuidedLessons.find(lesson => lesson.demonstrationId === 'linear-function')!;

test('keeps the function lessons bounded, localized, and source-backed', () => {
    expect(functionGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['linear-function', 'exponential-function', 'trigonometric-functions', 'continuity', 'derivative', 'definite-integral']);
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
    expect(sceneAction({name: 'show-function-element', value: {name: 'reference', value: true}})).toEqual({kind: 'function-visibility', target: 'reference', visible: true});
    expect(sceneAction({name: 'show-function-element', value: {name: 'tangent', value: true}})).toEqual({kind: 'function-visibility', target: 'tangent', visible: true});
    expect(element({name: 'area', value: true})).toThrow(/name must be one of mirror, reference, tangent/);
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

test('set-function-choice validates its closed name and the values allowed for that name', () => {
    const choice = (value: unknown) => () => sceneAction({name: 'set-function-choice', value: value as never});
    for (const value of ['sin', 'cos', 'tan']) {
        expect(sceneAction({name: 'set-function-choice', value: {name: 'trig-function', value}})).toEqual({kind: 'function-choice', name: 'trig-function', value});
    }
    for (const value of ['square', 'sin', 'exp']) {
        expect(sceneAction({name: 'set-function-choice', value: {name: 'derivative-function', value}})).toEqual({kind: 'function-choice', name: 'derivative-function', value});
    }
    expect(choice({name: 'derivative-function', value: 'cos'})).toThrow(/must be one of square, sin, exp/);
    expect(choice({name: 'derivative-function', value: 'tan'})).toThrow(/must be one of square, sin, exp/);
    expect(choice({name: 'area-mode', value: 'between'})).toThrow(/name must be one of trig-function, derivative-function, integral-function, sum-method/);
    expect(choice({name: 'integral-function', value: 'cos'})).toThrow(/must be one of square, sin, exp/);
    expect(choice({name: 'sum-method', value: 'upper'})).toThrow(/must be one of left, right, midpoint, trapezoid/);
    expect(choice({name: 'trig-function', value: 'sec'})).toThrow(/must be one of sin, cos, tan/);
    expect(choice({name: 'trig-function', value: 'SIN'})).toThrow(/must be one of sin, cos, tan/);
    expect(choice({name: 'trig-function', value: 1})).toThrow(/must be one of sin, cos, tan/);
    expect(choice({name: 'trig-function', value: true})).toThrow(/must be one of sin, cos, tan/);
    expect(choice({name: 'trig-function'})).toThrow(/must be one of sin, cos, tan/);
    expect(choice({name: 3, value: 'sin'})).toThrow(/name must be one of/);
    expect(choice('sin')).toThrow(/{name, value}/);
    expect(choice(null)).toThrow(/{name, value}/);
    expect(choice([])).toThrow(/{name, value}/);
});

test('scene actions accept the trigonometric parameter names and reject non-finite values', () => {
    for (const name of ['A', 'omega', 'phi', 'B']) {
        expect(sceneAction({name: 'set-function-parameter', value: {name, value: 0.5} as never})).toEqual({kind: 'function-parameter', name, value: 0.5});
        expect(() => sceneAction({name: 'set-function-parameter', value: {name, value: NaN} as never})).toThrow(/finite number/);
    }
    expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'Omega', value: 1} as never})).toThrow(/name must be one of/);
});

describe('trigonometric-functions lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'trigonometric-functions')!;
    const lesson = () => getLessonForDemonstration('trigonometric-functions')!;

    test('is available with five steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('trigonometric-functions-guided');
        expect(lesson().steps).toHaveLength(5);
        expect(lesson().steps[0].scene?.actions).toEqual([{kind: 'prepared-scene', sceneId: 'trig-default', source: 'demonstration-default'}]);
        expect(lesson().steps[1].scene?.actions.slice(1)).toEqual([
            {kind: 'function-parameter', name: 'A', value: 2},
            {kind: 'function-parameter', name: 'B', value: -1},
        ]);
        expect(lesson().steps[2].scene?.actions.slice(1)).toEqual([
            {kind: 'function-parameter', name: 'A', value: 2},
            {kind: 'function-parameter', name: 'omega', value: 2},
            {kind: 'function-parameter', name: 'phi', value: Math.PI / 2},
            {kind: 'function-parameter', name: 'B', value: 1},
        ]);
        expect(lesson().steps[3].scene?.actions.slice(1)).toEqual([
            {kind: 'function-choice', name: 'trig-function', value: 'sin'},
            {kind: 'function-parameter', name: 'phi', value: Math.PI / 2},
            {kind: 'function-visibility', target: 'reference', visible: true},
        ]);
        expect(lesson().steps[4].scene?.actions.slice(1)).toEqual([{kind: 'function-choice', name: 'trig-function', value: 'tan'}]);
    });

    test('the worked example matches the mathematics: max 3, min -1, period pi, shift -pi/4', () => {
        const parameters = {fn: 'sin', A: 2, omega: 2, phi: Math.PI / 2, B: 1} as const;
        expect(valueRange(parameters)).toEqual([-1, 3]);
        expect(period(parameters)).toBeCloseTo(Math.PI, 12);
        expect(phaseShift(parameters)).toBeCloseTo(-Math.PI / 4, 12);
        expect(trigValue(parameters, 0)).toBeCloseTo(3, 12);
        const example = source().workedExamples[0];
        expect(example.calculationLatex).toContain('\\max=1+2=3,\\ \\min=1-2=-1');
        expect(example.calculationLatex).toContain('T=\\frac{2\\pi}{2}=\\pi');
        expect(example.calculationLatex).toContain('-\\frac{\\varphi}{\\omega}=-\\frac{\\pi/2}{2}=-\\frac{\\pi}{4}');
        expect(example.resultLatex).toBe('\\max=3,\\ \\min=-1,\\ T=\\pi,\\ -\\frac{\\varphi}{\\omega}=-\\frac{\\pi}{4}');
    });

    test('the numbers stated in the prose are correct', () => {
        // step 1: the base wave
        expect(valueRange({fn: 'sin', A: 1, B: 0})).toEqual([-1, 1]);
        expect(period({fn: 'sin', omega: 1})).toBeCloseTo(6.28, 2);
        // step 2: A = 2, B = -1
        expect(-1 + 2).toBe(1);
        expect(-1 - 2).toBe(-3);
        expect(valueRange({fn: 'sin', A: 2, B: -1})).toEqual([-3, 1]);
        expect(valueRange({fn: 'sin', A: -2, B: -1})).toEqual([-3, 1]);
        expect(amplitude({fn: 'sin', A: -2})).toBe(2);
        // step 3: -(pi/2)/2 = -pi/4 = -0.79, pi = 3.14, 2 sin(pi/2) + 1 = 3
        expect(-(Math.PI / 2) / 2).toBeCloseTo(-Math.PI / 4, 14);
        expect(Math.PI).toBeCloseTo(3.14, 2);
        expect(Math.PI / 4).toBeCloseTo(0.79, 2);
        expect(2 * Math.sin(Math.PI / 2) + 1).toBe(3);
        // step 4: cos x = sin(x + pi/2), shift -pi/2 = -1.57, maximum 1 at x = 0
        for (const x of [-4, -1, 0, 2, 5]) expect(basicValue('sin', x + Math.PI / 2)).toBeCloseTo(basicValue('cos', x), 12);
        expect(Math.PI / 2).toBeCloseTo(1.57, 2);
        expect(trigValue({fn: 'sin', A: 1, omega: 1, phi: Math.PI / 2, B: 0}, 0)).toBeCloseTo(1, 12);
        // step 5: asymptotes of tan x in view: +-pi/2 = +-1.57 and +-3 pi/2 = +-4.71, period pi
        const asymptotes = tangentAsymptotes(1, 0, -7, 7);
        expect(asymptotes.map(x => Math.round(x * 100) / 100)).toEqual([-4.71, -1.57, 1.57, 4.71]);
        expect(period({fn: 'tan', omega: 1})).toBeCloseTo(Math.PI, 12);
        expect(amplitude({fn: 'tan', A: 1})).toBeNull();
        expect(valueRange({fn: 'tan', A: 1, B: 0})).toBeNull();
        // edge case: A = 0 leaves the constant B
        expect(valueRange({fn: 'sin', A: 0, B: 2})).toEqual([2, 2]);
    });
});

describe('continuity lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'continuity')!;
    const lesson = () => getLessonForDemonstration('continuity')!;

    test('is available with five steps and adapts its scenes into typed function-parameter actions', () => {
        expect(lesson().id).toBe('continuity-guided');
        expect(lesson().steps).toHaveLength(5);
        expect(lesson().steps[0].scene?.actions).toEqual([{kind: 'prepared-scene', sceneId: 'continuity-default', source: 'demonstration-default'}]);
        expect(lesson().steps[1].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'a', value: 1}]);
        expect(lesson().steps[2].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'a', value: 1}]);
        expect(lesson().steps[3].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'a', value: 1.5}]);
        expect(lesson().steps[4].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'a', value: 1.5}]);
    });

    test('the worked example matches the mathematics: a = 3 - a gives a = 3/2 and all three values are 3/2', () => {
        expect(3 / 2).toBe(CONTINUOUS_PARAMETER);
        expect(2 * CONTINUOUS_PARAMETER).toBe(3);
        expect(leftLimit(1.5)).toBe(1.5);
        expect(rightLimit(1.5)).toBe(3 - 1.5);
        expect(valueAtJoin(1.5)).toBe(1.5);
        expect(jump(1.5)).toBe(0);
        const example = source().workedExamples[0];
        expect(example.calculationLatex).toContain('a=3-a\\;\\Rightarrow\\;2a=3\\;\\Rightarrow\\;a=\\frac{3}{2}');
        expect(example.calculationLatex).toContain('\\lim_{x\\to1^+}f(x)=3-\\frac{3}{2}=\\frac{3}{2}');
        expect(example.resultLatex).toBe('a=\\frac{3}{2}');
    });

    test('the numbers stated in the prose are correct', () => {
        // steps 1 and 2: default a = 1 has f(1) = 1, left limit 1, right limit 2, jump 1, and is not continuous
        expect([valueAtJoin(1), leftLimit(1), rightLimit(1), jump(1), isContinuous(1)]).toEqual([1, 1, 2, 1, false]);
        expect(Math.abs(3 - 2 * 1)).toBe(1);
        // step 4: the neighbouring slider positions 1.45 and 1.55 have jump 0.1 and are not continuous
        for (const a of [1.45, 1.55]) {
            expect(jump(a)).toBeCloseTo(0.1, 12);
            expect(isContinuous(a)).toBe(false);
        }
        // step 5: slopes 2a = 3 and -a = -1.5 at a = 3/2, equal only when 2a = -a, i.e. a = 0 (jump 3 there)
        expect([leftSlope(1.5), rightSlope(1.5)]).toEqual([3, -1.5]);
        expect(leftSlope(0)).toBe(-rightSlope(0));
        expect([jump(0), isContinuous(0)]).toEqual([3, false]);
        // edge cases: a = 0 and a = 3 both jump by 3; |1.5 + 1e-7 - 1.5| = 1e-7 is outside the tolerance, 1e-10 inside
        expect([valueAtJoin(0), rightLimit(0), jump(0)]).toEqual([0, 3, 3]);
        expect([leftLimit(3), rightLimit(3), jump(3)]).toEqual([3, 0, 3]);
        expect(isContinuous(1.5 + 1e-7)).toBe(false);
        expect(isContinuous(1.5 + 1e-10)).toBe(true);
    });
});

describe('derivative lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'derivative')!;
    const lesson = () => getLessonForDemonstration('derivative')!;
    const square = catalogFunction('square');
    const sine = catalogFunction('sin');

    test('is available with five steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('derivative-guided');
        expect(lesson().steps).toHaveLength(5);
        expect(lesson().steps[0].scene?.actions).toEqual([{kind: 'prepared-scene', sceneId: 'derivative-default', source: 'demonstration-default'}]);
        expect(lesson().steps[1].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'h', value: 0.5}]);
        expect(lesson().steps[2].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'h', value: 0.1}]);
        expect(lesson().steps[3].scene?.actions.slice(1)).toEqual([
            {kind: 'function-parameter', name: 'h', value: -0.5},
            {kind: 'function-visibility', target: 'tangent', visible: true},
        ]);
        expect(lesson().steps[4].scene?.actions.slice(1)).toEqual([
            {kind: 'function-choice', name: 'derivative-function', value: 'sin'},
            {kind: 'function-parameter', name: 'x0', value: 1},
            {kind: 'function-parameter', name: 'h', value: 0.2},
            {kind: 'function-visibility', target: 'tangent', visible: true},
        ]);
    });

    test('every h used by a scene is allowed by the graph (|h| >= 0.01, inside [-2, 2])', () => {
        const hs = lesson().steps.flatMap(step => step.scene?.actions ?? []).filter(action => action.kind === 'function-parameter' && action.name === 'h')
            .map(action => (action as {value: number}).value);
        expect(hs).toEqual([0.5, 0.1, -0.5, 0.2]);
        hs.forEach(h => expect(isStep(h)).toBe(true));
    });

    test('the worked example matches the mathematics: ((1+h)^2-1)/h = 2+h, h=1 gives 3, h=0.5 gives 2.5, f\'(1)=2', () => {
        const example = source().workedExamples[0];
        expect(example.calculationLatex).toContain('\\frac{(1+h)^{2}-1}{h}=\\frac{2h+h^{2}}{h}=2+h');
        expect(example.calculationLatex).toContain('h=1:\\ 3');
        expect(example.calculationLatex).toContain('h=\\frac{1}{2}:\\ \\frac{5}{2}');
        expect(example.calculationLatex).toContain('h=\\frac{1}{10}:\\ \\frac{21}{10}');
        expect(example.resultLatex).toBe('f\'(1)=2');
        expect(differenceQuotient(square, 1, 1)).toBe(3);
        expect(differenceQuotient(square, 1, 0.5)).toBe(2.5);
        expect(differenceQuotient(square, 1, 0.1)).toBeCloseTo(21 / 10, 12);
        expect(square.derivative(1)).toBe(2);
        // the points named in the prose: Q = (2, 4) for h = 1, Q = (1.5, 2.25) for h = 0.5
        expect(secantLine(square, 1, 1).p1).toEqual({x: 2, y: 4});
        expect(secantLine(square, 1, 0.5).p1).toEqual({x: 1.5, y: 2.25});
    });

    test('the numbers stated in the prose are correct', () => {
        // step 3: h = 0.1 gives 2.1 and the difference 0.1; h = 0.01 gives 2.01; Q = (1.1, 1.21)
        expect(differenceQuotient(square, 1, 0.1)).toBeCloseTo(2.1, 12);
        expect(differenceQuotient(square, 1, 0.1) - square.derivative(1)).toBeCloseTo(0.1, 12);
        expect(differenceQuotient(square, 1, 0.01)).toBeCloseTo(2.01, 12);
        expect(differenceQuotient(square, 1, 0.01) - square.derivative(1)).toBeCloseTo(0.01, 12);
        expect(secantLine(square, 1, 0.1).p1.x).toBeCloseTo(1.1, 12);
        expect(secantLine(square, 1, 0.1).p1.y).toBeCloseTo(1.21, 12);
        // step 4: h = -0.5 gives Q = (0.5, 0.25) and the quotient 1.5 = 2 + h, below f'(1) = 2; h = 0.5 gives 2.5, above
        expect(secantLine(square, 1, -0.5).p1).toEqual({x: 0.5, y: 0.25});
        expect(differenceQuotient(square, 1, -0.5)).toBe(1.5);
        expect(differenceQuotient(square, 1, -0.5)).toBeLessThan(2);
        expect(differenceQuotient(square, 1, 0.5)).toBeGreaterThan(2);
        // step 5: sin at x0 = 1: h = 0.2 gives 0.4528, cos 1 = 0.5403, difference about -0.0875, h = 0.01 gives 0.5361
        expect(differenceQuotient(sine, 1, 0.2)).toBeCloseTo(0.4528405, 6);
        expect(Math.round(differenceQuotient(sine, 1, 0.2) * 1e4) / 1e4).toBe(0.4528);
        expect(Math.round(sine.derivative(1) * 1e4) / 1e4).toBe(0.5403);
        expect(Math.round((sine.derivative(1) - differenceQuotient(sine, 1, 0.2)) * 1e4) / 1e4).toBe(0.0875);
        expect(Math.round(differenceQuotient(sine, 1, 0.01) * 1e4) / 1e4).toBe(0.5361);
        // edge case: the quotient is never exactly the derivative for x^2, the difference is h
        for (const h of [-1, -0.1, 0.01, 0.5]) expect(differenceQuotient(square, 1, h) - 2).toBeCloseTo(h, 12);
        // edge case: h = 0 is the undefined 0/0
        expect(() => differenceQuotient(square, 1, 0)).toThrow(RangeError);
        expect(isStep(0.01)).toBe(true);
        expect(isStep(0.005)).toBe(false);
    });
});

describe('definite integral lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'definite-integral')!;
    const lesson = () => getLessonForDemonstration('definite-integral')!;
    const square = catalogFunction('square');
    const sine = catalogFunction('sin');
    const round4 = (value: number) => Math.round(value * 1e4) / 1e4;

    test('is available with five steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('definite-integral-guided');
        expect(lesson().steps).toHaveLength(5);
        expect(lesson().steps[0].scene?.actions).toEqual([{kind: 'prepared-scene', sceneId: 'integral-default', source: 'demonstration-default'}]);
        expect(lesson().steps[1].scene?.actions.slice(1)).toEqual([{kind: 'function-choice', name: 'sum-method', value: 'right'}]);
        expect(lesson().steps[2].scene?.actions.slice(1)).toEqual([{kind: 'function-choice', name: 'sum-method', value: 'midpoint'}]);
        expect(lesson().steps[3].scene?.actions.slice(1)).toEqual([{kind: 'function-parameter', name: 'n', value: 100}]);
        expect(lesson().steps[4].scene?.actions.slice(1)).toEqual([
            {kind: 'function-choice', name: 'integral-function', value: 'sin'},
            {kind: 'function-parameter', name: 'a', value: 0},
            {kind: 'function-parameter', name: 'b', value: 2 * Math.PI},
            {kind: 'function-parameter', name: 'n', value: 12},
            {kind: 'function-choice', name: 'sum-method', value: 'midpoint'},
        ]);
    });

    test('the scene validation accepts the new names and rejects unknown names and values', () => {
        expect(sceneAction({name: 'set-function-parameter', value: {name: 'b', value: 6.28}})).toEqual({kind: 'function-parameter', name: 'b', value: 6.28});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'integral-function', value: 'exp'}})).toEqual({kind: 'function-choice', name: 'integral-function', value: 'exp'});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'sum-method', value: 'trapezoid'}})).toEqual({kind: 'function-choice', name: 'sum-method', value: 'trapezoid'});
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'sum-method', value: 'upper'}})).toThrow();
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'integral-function', value: 'cos'}})).toThrow();
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'c', value: 1} as never})).toThrow();
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'b', value: Infinity}})).toThrow();
    });

    test('every bound used by a scene is allowed by the graph and every n is an allowed integer', () => {
        const values = (name: string) => lesson().steps.flatMap(step => step.scene?.actions ?? [])
            .filter(action => action.kind === 'function-parameter' && action.name === name).map(action => (action as {value: number}).value);
        values('a').concat(values('b')).forEach(value => expect(isBound(value)).toBe(true));
        expect(values('n')).toEqual([100, 12]);
    });

    test('the worked example matches the mathematics: h = 1/2, L = 7/4, R = 15/4, M = 21/8, T = 11/4, exact 8/3', () => {
        const example = source().workedExamples[0];
        expect(example.calculationLatex).toContain('h&=\\frac{2-0}{4}=\\frac{1}{2}');
        expect(example.calculationLatex).toContain('L&=\\frac{1}{2}\\left(0+\\frac{1}{4}+1+\\frac{9}{4}\\right)=\\frac{7}{4}');
        expect(example.calculationLatex).toContain('R&=\\frac{1}{2}\\left(\\frac{1}{4}+1+\\frac{9}{4}+4\\right)=\\frac{15}{4}');
        expect(example.calculationLatex).toContain('M&=\\frac{21}{8}');
        expect(example.calculationLatex).toContain('T=\\frac{L+R}{2}=\\frac{11}{4}');
        expect(example.resultLatex).toBe('\\int_0^2 x^{2}\\,dx=\\frac{8}{3}\\approx2{,}6667');
        expect(subintervalWidth(0, 2, 4)).toBe(1 / 2);
        expect(riemannSum(square, 0, 2, 4, 'left')).toBe(7 / 4);
        expect(riemannSum(square, 0, 2, 4, 'right')).toBe(15 / 4);
        expect(riemannSum(square, 0, 2, 4, 'midpoint')).toBe(21 / 8);
        expect(riemannSum(square, 0, 2, 4, 'trapezoid')).toBe(11 / 4);
        expect(exactIntegral(square, 0, 2)).toBeCloseTo(8 / 3, 14);
        expect(round4(8 / 3)).toBe(2.6667);
    });

    test('the numbers stated in the prose are correct', () => {
        const exact = exactIntegral(square, 0, 2);
        // step 2: left 1.75 below, right 3.75 above the exact value of the increasing function
        expect([riemannSum(square, 0, 2, 4, 'left'), riemannSum(square, 0, 2, 4, 'right')]).toEqual([1.75, 3.75]);
        expect(0.5 * (0 + 0.25 + 1 + 2.25)).toBe(1.75);
        expect(0.5 * (0.25 + 1 + 2.25 + 4)).toBe(3.75);
        expect(1.75).toBeLessThan(exact);
        expect(3.75).toBeGreaterThan(exact);
        // step 3: midpoint 2.625 and trapezoid 2.75 with errors 1/24 and 1/12; left and right errors 11/12 and 13/12
        expect(0.5 * (0.0625 + 0.5625 + 1.5625 + 3.0625)).toBe(2.625);
        expect(riemannSum(square, 0, 2, 4, 'midpoint')).toBe(2.625);
        expect(riemannSum(square, 0, 2, 4, 'trapezoid')).toBe(2.75);
        expect(exact - 2.625).toBeCloseTo(1 / 24, 14);
        expect(round4(1 / 24)).toBe(0.0417);
        expect(2.75 - exact).toBeCloseTo(1 / 12, 14);
        expect(round4(1 / 12)).toBe(0.0833);
        expect(exact - 1.75).toBeCloseTo(11 / 12, 14);
        expect(3.75 - exact).toBeCloseTo(13 / 12, 14);
        // step 4: n = 100, h = 0.02: left 2.6268, right 2.7068, midpoint 2.6666, trapezoid 2.6668, all within 0.05; errors ~0.04 and < 0.0002
        expect(subintervalWidth(0, 2, 100)).toBe(0.02);
        const at100 = (method: 'left' | 'right' | 'midpoint' | 'trapezoid') => riemannSum(square, 0, 2, 100, method);
        expect([at100('left'), at100('right'), at100('midpoint'), at100('trapezoid')].map(round4)).toEqual([2.6268, 2.7068, 2.6666, 2.6668]);
        for (const method of ['left', 'right', 'midpoint', 'trapezoid'] as const) expect(Math.abs(at100(method) - exact)).toBeLessThan(0.05);
        expect(Math.abs(at100('left') - exact)).toBeCloseTo(0.04, 2);
        expect(Math.abs(at100('right') - exact)).toBeCloseTo(0.04, 2);
        expect(Math.abs(at100('midpoint') - exact)).toBeLessThan(0.0002);
        expect(Math.abs(at100('trapezoid') - exact)).toBeLessThan(0.0002);
        expect(round4(at100('left') - exact)).toBe(-0.0399);
        // step 5: sin on [0, 2*pi] has integral -cos(2pi) + cos(0) = 0, +2 above and -2 below, unsigned area 4, midpoint n = 12 sums to 0
        expect(-Math.cos(2 * Math.PI) + Math.cos(0)).toBe(0);
        expect(exactIntegral(sine, 0, 2 * Math.PI)).toBe(0);
        expect(exactIntegral(sine, 0, Math.PI)).toBeCloseTo(2, 14);
        expect(exactIntegral(sine, Math.PI, 2 * Math.PI)).toBeCloseTo(-2, 14);
        expect(riemannSum(sine, 0, 2 * Math.PI, 12, 'midpoint')).toBeCloseTo(0, 12);
        const heights = Array.from({length: 12}, (_, i) => Math.sin((i + 0.5) * Math.PI / 6));
        expect(heights.filter(height => height > 0)).toHaveLength(6);
        expect(heights.filter(height => height < 0)).toHaveLength(6);
        // edge cases: a = b gives 0; a = 2, b = 0 gives h = -0.5, integral -8/3, midpoint -2.625 and left -3.75
        expect(exactIntegral(square, 1, 1)).toBe(0);
        expect(riemannSum(square, 1, 1, 4, 'left')).toBe(0);
        expect(subintervalWidth(2, 0, 4)).toBe(-0.5);
        expect(exactIntegral(square, 2, 0)).toBeCloseTo(-8 / 3, 14);
        expect(riemannSum(square, 2, 0, 4, 'midpoint')).toBe(-2.625);
        expect(riemannSum(square, 2, 0, 4, 'left')).toBe(-3.75);
        expect(riemannSum(square, 2, 0, 4, 'left')).toBe(-riemannSum(square, 0, 2, 4, 'right'));
        // the bounds domain contains 2*pi
        expect(isBound(2 * Math.PI)).toBe(true);
    });
});
