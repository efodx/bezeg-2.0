import {functionGuidedLessons} from './functionGuidedLessons';
import {getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, sceneActions} from '../runtime/lessonCatalog';
import {lineThroughPoints, moveAlongLine} from '../../analysis/linear';
import {exponentialValue, integerValues, mirrorBase} from '../../analysis/exponential';
import {amplitude, basicValue, period, phaseShift, tangentAsymptotes, trigValue, valueRange} from '../../analysis/trigonometric';
import {CONTINUOUS_PARAMETER, isContinuous, jump, leftLimit, leftSlope, rightLimit, rightSlope, valueAtJoin} from '../../analysis/continuity';
import {catalogFunction} from '../../analysis/functions';
import {formatNumber} from '../../analysis/format';
import {differenceQuotient, isStep, secantLine} from '../../analysis/derivative';
import {exactIntegral, isBound, riemannSum, subintervalWidth} from '../../analysis/riemann';
import {isBound as isAreaBound, integralF, integralG, INTERSECTIONS, signedBetween, unsignedBetween} from '../../analysis/areaBetween';
import {arcLength as arcLengthOf, isBound as isArcBound, isSegmentCount, polylineLength} from '../../analysis/arcLength';

const linearLesson = () => functionGuidedLessons.find(lesson => lesson.demonstrationId === 'linear-function')!;

test('keeps the function lessons bounded, localized, and source-backed', () => {
    expect(functionGuidedLessons.map(lesson => lesson.demonstrationId)).toEqual(['linear-function', 'exponential-function', 'trigonometric-functions', 'continuity', 'derivative', 'definite-integral', 'area-between-curves', 'arc-length']);
    for (const lesson of functionGuidedLessons) {
        expect(getGuidedLesson(lesson.demonstrationId)).toBe(lesson);
        expect(lesson.steps.length).toBeGreaterThanOrEqual(4);
        expect(lesson.steps.length).toBeLessThanOrEqual(7);
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
            // action names and parameters are checked by the `LessonAction` type; the adapter must accept the whole scene
            expect(() => sceneActions(step.scene!)).not.toThrow();
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

test('the worked example and the scene values match the line mathematics', () => {
    const lesson = linearLesson();
    const example = lesson.workedExamples[0];
    expect(lineThroughPoints({x: 0, y: 1}, {x: 2, y: 5})).toEqual({kind: 'line', k: 2, n: 1});
    expect(example.calculationLatex).toContain('\\frac{5-1}{2-0}=\\frac42=2');
    expect(example.calculationLatex).toContain('n=y_1-kx_1=1-2\\cdot0=1');
    expect(example.resultLatex).toBe('y=2x+1');
    // the check stated for P2: the line through both points passes through P2 = (2, 5)
    const line = lineThroughPoints({x: 0, y: 1}, {x: 2, y: 5});
    expect(line.kind === 'line' && line.k * 2 + line.n).toBe(5);

    const values = lesson.steps.flatMap(step => step.scene?.actions ?? []).flatMap(action => action.kind === 'function-parameter' ? [action] : []);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every(({value}) => Number.isFinite(value))).toBe(true);

    // Scenes that start from the default points (0,1), (2,5): the stated results of the n and k steps.
    const fromDefault = [{x: 0, y: 1}, {x: 2, y: 5}] as const;
    expect(moveAlongLine(fromDefault[0], fromDefault[1], {n: -2})).toEqual([{x: 0, y: -2}, {x: 2, y: 2}]);
    expect(moveAlongLine(fromDefault[0], fromDefault[1], {k: -0.5})).toEqual([{x: 0, y: 1}, {x: 2, y: 0}]);
    // The edge-case scene places both points on x = 1.
    expect(lineThroughPoints({x: 1, y: -1}, {x: 1, y: 3})).toEqual({kind: 'vertical', x: 1});
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

describe('trigonometric-functions lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'trigonometric-functions')!;
    const lesson = () => getLessonForDemonstration('trigonometric-functions')!;

    test('is available with seven steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('trigonometric-functions-guided');
        expect(lesson().steps).toHaveLength(7);
        expect(lesson().steps.map(step => step.id)).toEqual(['trig-base-sine', 'trig-amplitude', 'trig-vertical-shift', 'trig-frequency', 'trig-phase-cosine', 'trig-combined', 'trig-tangent']);
        const reference = {kind: 'function-visibility', target: 'reference', visible: true};
        const rest = (index: number) => lesson().steps[index].scene?.actions.slice(1);
        expect(lesson().steps[0].scene?.actions).toEqual([{kind: 'prepared-scene', sceneId: 'trig-default', source: 'demonstration-default'}]);
        // each introductory comparison changes exactly one parameter against the fixed dashed reference
        expect(rest(1)).toEqual([{kind: 'function-parameter', name: 'A', value: 2}, reference]);
        expect(rest(2)).toEqual([{kind: 'function-parameter', name: 'B', value: 1}, reference]);
        expect(rest(3)).toEqual([{kind: 'function-parameter', name: 'omega', value: 2}, reference]);
        expect(rest(4)).toEqual([
            {kind: 'function-choice', name: 'trig-function', value: 'sin'},
            {kind: 'function-parameter', name: 'phi', value: Math.PI / 2},
            reference,
        ]);
        expect(rest(5)).toEqual([
            {kind: 'function-parameter', name: 'A', value: 2},
            {kind: 'function-parameter', name: 'omega', value: 2},
            {kind: 'function-parameter', name: 'phi', value: Math.PI / 2},
            {kind: 'function-parameter', name: 'B', value: 1},
        ]);
        expect(rest(6)).toEqual([{kind: 'function-choice', name: 'trig-function', value: 'tan'}]);
    });

    test('each introductory comparison changes one quantity against sin x and agrees with its displayed formula', () => {
        const baseline = {fn: 'sin', A: 1, omega: 1, phi: 0, B: 0} as const;
        const scenes = {amplitude: {...baseline, A: 2}, vertical: {...baseline, B: 1}, frequency: {...baseline, omega: 2}, phase: {...baseline, phi: Math.PI / 2}};
        // the actions of each scene set exactly the parameter named here (checked against the lesson content)
        const setParameter = (index: number) => lesson().steps[index].scene!.actions
            .filter(action => action.kind === 'function-parameter').map(action => (action as {name: string}).name);
        expect([2, 3, 4, 5].map(i => setParameter(i - 1))).toEqual([['A'], ['B'], ['omega'], ['phi']]);
        // amplitude: range [-2, 2], same period, same shift, same midline
        expect(valueRange(scenes.amplitude)).toEqual([-2, 2]);
        expect(period(scenes.amplitude)).toBeCloseTo(period(baseline), 12);
        expect(phaseShift(scenes.amplitude)).toBe(phaseShift(baseline));
        expect(amplitude(scenes.amplitude)).toBe(2);
        expect(trigValue(scenes.amplitude, 1.3)).toBeCloseTo(2 * Math.sin(1.3), 12);
        // vertical shift: range [0, 2], every point is 1 higher, amplitude and period unchanged
        expect(valueRange(scenes.vertical)).toEqual([0, 2]);
        expect(amplitude(scenes.vertical)).toBe(1);
        expect(period(scenes.vertical)).toBeCloseTo(period(baseline), 12);
        for (const x of [-3, -1, 0, 0.5, 2, 4]) expect(trigValue(scenes.vertical, x) - trigValue(baseline, x)).toBeCloseTo(1, 12);
        // frequency: period pi (half of 2 pi), range unchanged, sin 2x
        expect(period(scenes.frequency)).toBeCloseTo(Math.PI, 12);
        expect(valueRange(scenes.frequency)).toEqual(valueRange(baseline));
        expect(phaseShift(scenes.frequency)).toBe(0);
        for (const x of [-3, -1, 0, 0.5, 2, 4]) {
            expect(trigValue(scenes.frequency, x)).toBeCloseTo(Math.sin(2 * x), 12);
            expect(trigValue(scenes.frequency, x + Math.PI)).toBeCloseTo(trigValue(scenes.frequency, x), 12);
        }
        // phase: shift -phi/omega = -pi/2 means to the left; a negative phi moves the graph to the right
        expect(phaseShift(scenes.phase)).toBeCloseTo(-Math.PI / 2, 12);
        expect(phaseShift({...baseline, phi: -Math.PI / 2})).toBeCloseTo(Math.PI / 2, 12);
        expect(phaseShift({...baseline, omega: 2, phi: Math.PI / 2})).toBeCloseTo(-Math.PI / 4, 12);
        expect(period(scenes.phase)).toBeCloseTo(period(baseline), 12);
        expect(valueRange(scenes.phase)).toEqual(valueRange(baseline));
        // the left shift: the shifted graph at x equals the baseline at x + pi/2 and its maximum sits at x = 0
        for (const x of [-3, -1, 0, 0.5, 2, 4]) expect(trigValue(scenes.phase, x)).toBeCloseTo(Math.sin(x + Math.PI / 2), 12);
        expect(trigValue(scenes.phase, -Math.PI / 2)).toBeCloseTo(0, 12);
        expect(trigValue({...baseline, phi: -Math.PI / 2}, Math.PI)).toBeCloseTo(1, 12);
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
        // step 2: A = 2 (B = 0), range [-2, 2]; step 3: B = 1, range [0, 2]
        expect(valueRange({fn: 'sin', A: 2, B: 0})).toEqual([-2, 2]);
        expect(valueRange({fn: 'sin', A: -2, B: 0})).toEqual([-2, 2]);
        expect(valueRange({fn: 'sin', A: 1, B: 1})).toEqual([0, 2]);
        expect(valueRange({fn: 'sin', A: 2, B: -1})).toEqual([-3, 1]);
        expect(amplitude({fn: 'sin', A: -2})).toBe(2);
        // step 6: shift -pi/4 = -0.79, period pi = 3.14, and f(0) = 2 sin(pi/2) + 1 = 3
        const example = {fn: 'sin' as const, A: 2, omega: 2, phi: Math.PI / 2, B: 1};
        expect(phaseShift(example)).toBeCloseTo(-Math.PI / 4, 14);
        expect(formatNumber(Math.PI / 4, 'en')).toBe('0.79');
        expect(formatNumber(period(example), 'en')).toBe('3.14');
        expect(trigValue(example, 0)).toBeCloseTo(3, 12);
        // step 5: cos x = sin(x + pi/2), shift -pi/2 = -1.57, maximum 1 at x = 0
        for (const x of [-4, -1, 0, 2, 5]) expect(basicValue('sin', x + Math.PI / 2)).toBeCloseTo(basicValue('cos', x), 12);
        expect(formatNumber(Math.PI / 2, 'en')).toBe('1.57');
        expect(trigValue({fn: 'sin', A: 1, omega: 1, phi: Math.PI / 2, B: 0}, 0)).toBeCloseTo(1, 12);
        // step 7: asymptotes of tan x in view: +-pi/2 = +-1.57 and +-3 pi/2 = +-4.71, period pi
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
        expect(CONTINUOUS_PARAMETER).toBe(1.5);
        expect(isContinuous(CONTINUOUS_PARAMETER)).toBe(true);
        expect(leftLimit(1.5)).toBe(1.5);
        expect(rightLimit(1.5)).toBe(1.5);
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
        expect(riemannSum(square, 0, 2, 4, 'left')).toBeLessThan(exact);
        expect(riemannSum(square, 0, 2, 4, 'right')).toBeGreaterThan(exact);
        // step 3: midpoint 2.625 and trapezoid 2.75 with errors 1/24 and 1/12; left and right errors 11/12 and 13/12
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

describe('area between curves lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'area-between-curves')!;
    const lesson = () => getLessonForDemonstration('area-between-curves')!;
    const S = Math.sqrt(1.5);
    const round4 = (value: number) => Math.round(value * 1e4) / 1e4;

    test('is available with five steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('area-between-curves-guided');
        expect(lesson().steps).toHaveLength(5);
        const rest = (index: number) => lesson().steps[index].scene?.actions.slice(1);
        expect(lesson().steps[0].scene?.actions[0]).toEqual({kind: 'prepared-scene', sceneId: 'area-difference-scene', source: 'demonstration-default'});
        // the lesson opens with the between-region on [1, 3] and only then splits it into the areas under g and f
        expect(rest(0)).toEqual([
            {kind: 'function-choice', name: 'area-mode', value: 'between'},
            {kind: 'function-parameter', name: 'a', value: 1},
            {kind: 'function-parameter', name: 'b', value: 3},
        ]);
        expect(lesson().steps[1].scene?.actions[0]).toEqual({kind: 'prepared-scene', sceneId: 'area-under-g-scene', source: 'demonstration-default'});
        expect(rest(1)).toEqual([
            {kind: 'function-choice', name: 'area-mode', value: 'under-g'},
            {kind: 'function-parameter', name: 'a', value: 1},
            {kind: 'function-parameter', name: 'b', value: 3},
        ]);
        expect(rest(2)).toEqual([]);
        expect(rest(3)).toEqual([
            {kind: 'function-choice', name: 'area-mode', value: 'between'},
            {kind: 'function-parameter', name: 'a', value: 0},
            {kind: 'function-parameter', name: 'b', value: 4},
        ]);
        expect(rest(4)).toEqual([
            {kind: 'function-choice', name: 'area-mode', value: 'between'},
            {kind: 'function-parameter', name: 'a', value: 1},
            {kind: 'function-parameter', name: 'b', value: 3.5},
        ]);
    });

    test('every bound used by a scene is allowed by the graph', () => {
        const values = lesson().steps.flatMap(step => step.scene?.actions ?? [])
            .filter(action => action.kind === 'function-parameter').map(action => (action as {value: number}).value);
        expect(values).toEqual([1, 3, 1, 3, 0, 4, 1, 3.5]);
        values.forEach(value => expect(isAreaBound(value)).toBe(true));
    });

    test('the worked example matches the mathematics: 6 sqrt(1.5) - (4/3)(1.5)^(3/2) = 4 sqrt(1.5) = 2 sqrt(6) = 4.8990', () => {
        const example = source().workedExamples[0];
        expect(example.calculationLatex).toContain('\\int_{-\\sqrt{1{,}5}}^{\\sqrt{1{,}5}}\\bigl(3-2u^2\\bigr)du');
        expect(example.calculationLatex).toContain('\\Bigl[3u-\\tfrac23u^3\\Bigr]_{-\\sqrt{1{,}5}}^{\\sqrt{1{,}5}}');
        expect(example.calculationLatex).toContain('6\\sqrt{1{,}5}-\\tfrac43\\,(1{,}5)^{3/2}');
        expect(example.calculationLatex).toContain('6\\sqrt{1{,}5}-2\\sqrt{1{,}5}');
        expect(example.resultLatex).toBe('A=4\\sqrt{1{,}5}=2\\sqrt6\\approx4{,}8990');
        // the u-substitution: the integral of 3 - 2u^2 from -s to s is 6s - (4/3)s^3 with s^2 = 1.5
        expect(6 * S - (4 / 3) * Math.pow(1.5, 1.5)).toBeCloseTo(4 * S, 12);
        expect((4 / 3) * Math.pow(1.5, 1.5)).toBeCloseTo(2 * S, 12);
        expect(4 * S).toBeCloseTo(2 * Math.sqrt(6), 12);
        expect(round4(4 * S)).toBe(4.899);
        expect(signedBetween(...INTERSECTIONS)).toBeCloseTo(4 * S, 12);
        expect(unsignedBetween(...INTERSECTIONS)).toBeCloseTo(4 * S, 12);
    });

    test('the numbers stated in the prose are correct', () => {
        // intersections (x-2)^2 = 3/2
        expect([round4(INTERSECTIONS[0]), round4(INTERSECTIONS[1])]).toEqual([0.7753, 3.2247]);
        // the default (intersection) bounds: under g 5 sqrt(1.5) = 6.1237, under f sqrt(1.5) = 1.2247
        expect(integralG(...INTERSECTIONS)).toBeCloseTo(5 * S, 12);
        expect(round4(5 * S)).toBe(6.1237);
        expect(integralF(...INTERSECTIONS)).toBeCloseTo(S, 12);
        expect(round4(S)).toBe(1.2247);
        // steps 1-2: [1, 3] gives 14/3, with the integrals 16/3 and 2/3 and the antiderivative 3x - (2/3)(x-2)^3
        const D = (x: number) => 3 * x - (2 / 3) * Math.pow(x - 2, 3);
        expect(D(3) - D(1)).toBeCloseTo(14 / 3, 12);
        expect((9 - 2 / 3) - (3 + 2 / 3)).toBeCloseTo(14 / 3, 12);
        expect(signedBetween(1, 3)).toBeCloseTo(14 / 3, 12);
        expect(unsignedBetween(1, 3)).toBeCloseTo(14 / 3, 12);
        expect(round4(14 / 3)).toBe(4.6667);
        expect(integralG(1, 3)).toBeCloseTo(16 / 3, 12);
        expect(integralF(1, 3)).toBeCloseTo(2 / 3, 12);
        expect(round4(16 / 3)).toBe(5.3333);
        expect(round4(2 / 3)).toBe(0.6667);
        // step 4: [0, 4]
        expect(signedBetween(0, 4)).toBeCloseTo(4 / 3, 12);
        expect(round4(4 / 3)).toBe(1.3333);
        expect(unsignedBetween(0, 4)).toBeCloseTo(2 * Math.sqrt(6) + 2 * (2 * S - 2 / 3), 12);
        expect(round4(unsignedBetween(0, 4))).toBe(8.4646);
        expect(round4(2 / 3 - 2 * S)).toBe(-1.7828);
        expect(signedBetween(0, INTERSECTIONS[0])).toBeCloseTo(2 / 3 - 2 * S, 12);
        expect(4 * S + 2 * (2 / 3 - 2 * S)).toBeCloseTo(4 / 3, 12);
        expect(integralF(0, 4)).toBeCloseTo(16 / 3, 12);
        expect(integralG(0, 4)).toBeCloseTo(20 / 3, 12);
        expect(round4(20 / 3)).toBe(6.6667);
        // swapped bounds flip the signed value and keep the area
        expect(signedBetween(4, 0)).toBeCloseTo(-4 / 3, 12);
        expect(unsignedBetween(4, 0)).toBeCloseTo(unsignedBetween(0, 4), 12);
        // step 5: [1, 3.5]: signed 55/12 = 4.5833, area 4.9823; the last piece beyond 3.2247 contributes -0.1995 and +0.1995
        // swapped bounds reverse the signed integral and keep the geometric area on the narrow crossing scene too
        expect(signedBetween(3.5, 1)).toBeCloseTo(-55 / 12, 12);
        expect(unsignedBetween(3.5, 1)).toBeCloseTo(unsignedBetween(1, 3.5), 12);
        expect(signedBetween(3, 1)).toBeCloseTo(-14 / 3, 12);
        expect(unsignedBetween(3, 1)).toBeCloseTo(14 / 3, 12);
        // the crossing scenes separate signed from geometric: equal on [1, 3], different on [0, 4] and [1, 3.5]
        expect(unsignedBetween(0, 4) - signedBetween(0, 4)).toBeGreaterThan(1);
        expect(unsignedBetween(1, 3.5) - signedBetween(1, 3.5)).toBeGreaterThan(0.39);
        expect(signedBetween(1, 3.5)).toBeCloseTo(55 / 12, 12);
        expect(round4(55 / 12)).toBe(4.5833);
        expect(round4(unsignedBetween(1, 3.5))).toBe(4.9823);
        expect(round4(-signedBetween(INTERSECTIONS[1], 3.5))).toBe(0.1995);
        expect(unsignedBetween(1, 3.5) - signedBetween(1, 3.5)).toBeCloseTo(2 * -signedBetween(INTERSECTIONS[1], 3.5), 12);
        // b = 3.2 (before the intersection): equal; b = 3.3 (after): integral smaller, area larger
        expect(round4(signedBetween(1, 3.2))).toBe(4.7813);
        expect(unsignedBetween(1, 3.2)).toBeCloseTo(signedBetween(1, 3.2), 12);
        expect(round4(signedBetween(1, 3.3))).toBe(4.7687);
        expect(round4(unsignedBetween(1, 3.3))).toBe(4.797);
        expect(signedBetween(1, 3.3)).toBeLessThan(signedBetween(1, 3.2));
        expect(unsignedBetween(1, 3.3)).toBeGreaterThan(unsignedBetween(1, 3.2));
        // edge cases: g crosses the axis at 2 -+ sqrt(3) = 0.2679, 3.7321; a = b gives 0
        expect([round4(2 - Math.sqrt(3)), round4(2 + Math.sqrt(3))]).toEqual([0.2679, 3.7321]);
        expect(Object.is(unsignedBetween(2, 2), 0)).toBe(true);
    });
});

describe('arc length lesson', () => {
    const source = () => functionGuidedLessons.find(entry => entry.demonstrationId === 'arc-length')!;
    const lesson = () => getLessonForDemonstration('arc-length')!;
    const round4 = (value: number) => Math.round(value * 1e4) / 1e4;
    const L = arcLengthOf(0, Math.PI);

    test('is available with five steps and adapts its scenes into typed actions', () => {
        expect(lesson().id).toBe('arc-length-guided');
        expect(lesson().steps).toHaveLength(5);
        const rest = (index: number) => lesson().steps[index].scene?.actions.slice(1);
        expect(lesson().steps[0].scene?.actions[0]).toEqual({kind: 'prepared-scene', sceneId: 'arc-chord-scene', source: 'demonstration-default'});
        expect(rest(0)).toEqual([{kind: 'function-parameter', name: 'n', value: 1}]);
        expect(rest(1)).toEqual([]);
        expect(rest(2)).toEqual([{kind: 'function-parameter', name: 'n', value: 10}]);
        expect(rest(3)).toEqual([{kind: 'function-parameter', name: 'n', value: 100}]);
        expect(rest(4)).toEqual([{kind: 'function-parameter', name: 'b', value: 2 * Math.PI}]);
    });

    test('every value used by a scene is allowed by the graph', () => {
        const actions = lesson().steps.flatMap(step => step.scene?.actions ?? []).filter(action => action.kind === 'function-parameter') as { name: string; value: number }[];
        expect(actions.map(action => [action.name, action.value])).toEqual([['n', 1], ['n', 10], ['n', 100], ['b', 2 * Math.PI]]);
        actions.filter(action => action.name === 'n').forEach(action => expect(isSegmentCount(action.value)).toBe(true));
        actions.filter(action => action.name === 'b').forEach(action => expect(isArcBound(action.value)).toBe(true));
    });

    test('the worked example matches the mathematics: 2 sqrt((pi/2)^2 + 1) = 3.7242 and n = 1 gives pi', () => {
        const example = source().workedExamples[0];
        expect(example.resultLatex).toBe('P_2=2\\sqrt{\\left(\\tfrac{\\pi}{2}\\right)^2+1}\\approx3{,}7242');
        expect(example.calculationLatex).toContain('\\left(\\tfrac{\\pi}{2},1\\right)');
        const chord = Math.sqrt((Math.PI / 2) ** 2 + 1);
        expect(round4(chord)).toBe(1.8621);
        expect(round4(2 * chord)).toBe(3.7242);
        expect(polylineLength(0, Math.PI, 2)).toBeCloseTo(2 * chord, 12);
        expect(polylineLength(0, Math.PI, 1)).toBeCloseTo(Math.PI, 12);
        expect(round4(Math.PI)).toBe(3.1416);
    });

    test('the numbers stated in the prose are correct', () => {
        expect(round4(L)).toBe(3.8202);
        expect(round4(polylineLength(0, Math.PI, 2))).toBe(3.7242);
        expect(round4(polylineLength(0, Math.PI, 10))).toBe(3.8153);
        expect(round4(polylineLength(0, Math.PI, 100))).toBe(3.8201);
        // differences in the readout: 0.0960, 0.0049 and less than 0.0001
        expect(round4(L - polylineLength(0, Math.PI, 2))).toBe(0.096);
        expect(round4(L - polylineLength(0, Math.PI, 10))).toBe(0.0049);
        expect(L - polylineLength(0, Math.PI, 100)).toBeLessThan(0.0001);
        expect(L - polylineLength(0, Math.PI, 100)).toBeGreaterThan(0);
        expect(round4(L - Math.PI)).toBeGreaterThan(0.6);
        // the polylines never exceed the arc, also at the endpoints of the observation in step 5
        for (const n of [1, 2, 10, 100]) expect(polylineLength(0, Math.PI, n)).toBeLessThanOrEqual(L);
        // step 5 and the edge case: [0, 2 pi] with n = 2 has both vertices on the x-axis
        expect(polylineLength(0, 2 * Math.PI, 2)).toBeCloseTo(2 * Math.PI, 12);
        expect(round4(2 * Math.PI)).toBe(6.2832);
        expect(round4(arcLengthOf(0, 2 * Math.PI))).toBe(7.6404);
        expect(arcLengthOf(0, 2 * Math.PI)).toBeCloseTo(2 * L, 8);
        // swapped endpoints and a = b
        expect(arcLengthOf(2 * Math.PI, 0)).toBe(arcLengthOf(0, 2 * Math.PI));
        expect(polylineLength(2 * Math.PI, 0, 2)).toBeCloseTo(polylineLength(0, 2 * Math.PI, 2), 12);
        expect(arcLengthOf(1, 1)).toBe(0);
        // derivation: the chord of a small piece is close to sqrt(1 + f'(x)^2) dx for sin
        const dx = 1e-3;
        const x = 0.7;
        expect(Math.hypot(dx, Math.sin(x + dx) - Math.sin(x))).toBeCloseTo(Math.sqrt(1 + Math.cos(x) ** 2) * dx, 6);
        // at x = pi/2 the single chord (y = 0) is 1 below the top of the arch
        expect(Math.sin(Math.PI / 2) - 0).toBe(1);
    });
});
