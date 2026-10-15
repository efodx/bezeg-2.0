import {analysisGuidedLessons} from './analysisGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES, getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, isGuidedLessonAvailable, sceneAction} from '../runtime/lessonCatalog';
import {FUNCTION_CHOICE_NAMES, FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES} from '../model';
import {BISECTION_EXAMPLE_IDS, bisectionHistory} from '../../analysis/bisection';
import {
    isDifferentiableOn, matchingPoints, MEAN_VALUE_EXAMPLE_IDS, meanValueExample, secantSlope, slopeDifference, tangentLineOf, tangentSlope,
} from '../../analysis/meanValue';
import {MEAN_VALUE_EXAMPLE_MODELS} from '../../analysis/meanValueModel';

const lesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'bisection')!;
const stepById = (id: string) => lesson.steps.find(step => step.id === id)!;

test('the analysis lessons are bounded, localized, source-backed and available', () => {
    expect(analysisGuidedLessons.map(entry => entry.demonstrationId)).toEqual(['bisection', 'mean-value']);
    for (const entry of analysisGuidedLessons) {
        expect(getGuidedLesson(entry.demonstrationId)).toBe(entry);
        expect(isGuidedLessonAvailable(entry.demonstrationId)).toBe(true);
        expect(entry.steps.length).toBeGreaterThanOrEqual(5);
        expect(entry.steps.length).toBeLessThanOrEqual(7);
        expect(entry.steps.map(step => step.order)).toEqual(entry.steps.map((_, index) => index + 1));
        expect(new Set(entry.steps.map(step => step.id)).size).toBe(entry.steps.length);
        expect(new Set(entry.steps.flatMap(step => step.frames.map(frame => frame.id))).size)
            .toBe(entry.steps.reduce((sum, step) => sum + step.frames.length, 0));
        expect(new Set(entry.steps.map(step => step.scene!.id)).size).toBe(entry.steps.length);
        expect(entry.prerequisites.length).toBeGreaterThan(0);
        expect(entry.sources.length).toBeGreaterThanOrEqual(2);
        expect(entry.sources.some(source => source.citation.startsWith('Bezeg source:'))).toBe(true);
        expect(entry.sources.some(source => source.implementationCorrespondence)).toBe(true);
        expect(entry.workedExamples.length).toBeGreaterThan(0);
        expect(entry.edgeCases.length).toBeGreaterThan(0);
        const localizedFields = [
            entry.title, entry.summary, ...entry.prerequisites, ...entry.learningGoals, ...entry.edgeCases, ...entry.unresolvedQuestions,
            ...entry.formulaBlocks.flatMap(formula => [formula.notation, formula.explanation]),
            ...entry.workedExamples.flatMap(example => [example.title, example.check]),
            ...entry.steps.flatMap(step => [step.title, step.purpose, step.explanation, step.observationPrompt, ...step.expectedObservations, step.scene!.expectedState]),
        ];
        for (const localized of localizedFields) {
            expect(localized.sl.trim()).not.toBe('');
            expect(localized.en.trim()).not.toBe('');
            expect(localized.sl).not.toBe(localized.en);
        }
        const formulaIds = new Set(entry.formulaBlocks.map(formula => formula.id));
        const exampleIds = new Set(entry.workedExamples.map(example => example.id));
        for (const step of entry.steps) {
            expect(step.frames[0].kind).toBe('explanation');
            expect(step.frames.at(-1)?.kind).toBe('observation');
            expect(step.frames.filter(frame => frame.kind === 'calculation')).toHaveLength(step.workedExampleId ? 1 : 0);
            step.formulaIds.forEach(id => expect(formulaIds.has(id)).toBe(true));
            if (step.workedExampleId) expect(exampleIds.has(step.workedExampleId)).toBe(true);
            expect(step.frames.some(frame => frame.kind === 'observation')).toBe(true);
            for (const action of step.scene!.actions) {
                expect(SUPPORTED_SCENE_ACTION_NAMES).toContain(action.name);
                expect(() => sceneAction(action)).not.toThrow();
            }
        }
    }
});

test('the lesson states its prerequisites, the hypotheses, existence without uniqueness, the counterexample and the handoff', () => {
    expect(lesson.prerequisites.map(item => item.en).join(' ')).toMatch(/continuity/);
    expect(lesson.prerequisites.map(item => item.sl).join(' ')).toMatch(/zveznost/);
    expect(stepById('bisection-bracket-step').explanation.en).toMatch(/at least one root/);
    expect(stepById('bisection-bracket-step').explanation.en).toMatch(/not uniqueness/);
    expect(stepById('bisection-bracket-step').explanation.sl).toMatch(/ne pa enoličnosti/);
    expect(stepById('bisection-counterexample-step').explanation.en).toMatch(/no root at all/);
    expect(stepById('bisection-counterexample-step').explanation.en).toMatch(/not satisfied/);
    expect(stepById('bisection-exact-or-approximate').explanation.en).toMatch(/irrational/);
    expect(stepById('bisection-exact-or-approximate').explanation.en).toMatch(/never exactly/);
    expect(stepById('bisection-free-exploration').explanation.en).toMatch(/explore on your own/i);
    expect(stepById('bisection-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
    // a prediction is asked for before the revealing Next step in the steps that reveal a result
    for (const id of ['bisection-bracket-step', 'bisection-first-step', 'bisection-three-steps', 'bisection-counterexample-step']) {
        expect(stepById(id).observationPrompt.en).toMatch(/Predict/);
        expect(stepById(id).observationPrompt.en).toMatch(/Next step/);
        expect(stepById(id).observationPrompt.sl).toMatch(/Napovej/);
        expect(stepById(id).observationPrompt.sl).toMatch(/Naslednji korak/);
    }
});

test('the lesson scenes encode the independently derived steps and the worked example values', () => {
    const adaptedLesson = getLessonForDemonstration('bisection')!;
    const run = (id: string) => adaptedLesson.steps.find(step => step.id === id)!.scene!.actions;
    expect(run('bisection-bracket-step')).toEqual([{kind: 'prepared-scene', sceneId: 'bisection-default', source: 'demonstration-default'}]);
    const advance = {kind: 'animation', animationId: 'bisection', command: 'next-step'};
    expect(run('bisection-first-step').slice(1)).toEqual([advance]);
    expect(run('bisection-three-steps').slice(1)).toEqual([advance, advance, advance]);
    expect(run('bisection-exact-or-approximate').slice(1)).toEqual(Array(5).fill(advance));
    expect(run('bisection-counterexample-step').slice(1)).toEqual([
        {kind: 'function-choice', name: 'bisection-example', value: 'sign-step'}, advance, advance, advance,
    ]);
    expect(run('bisection-free-exploration').slice(1)).toEqual([
        {kind: 'function-choice', name: 'bisection-example', value: 'cubic'}, {kind: 'function-parameter', name: 'bisect-a', value: -1.5},
    ]);

    // the numbers stated in the prose are the ones the mathematics gives
    const three = bisectionHistory('square-minus-two', 1, 2, 3);
    expect(three.steps.map(step => step.mid)).toEqual([1.5, 1.25, 1.375]);
    expect(three.steps.map(step => step.fMid)).toEqual([0.25, -0.4375, -0.109375]);
    const example = lesson.workedExamples[0];
    expect(example.calculationLatex).toContain('m_1=\\frac32,\\ f(m_1)=\\frac14');
    expect(example.calculationLatex).toContain('m_2=\\frac54,\\ f(m_2)=-\\frac{7}{16}');
    expect(example.calculationLatex).toContain('m_3=\\frac{11}{8},\\ f(m_3)=-\\frac{7}{64}');
    expect(1 / 4).toBe(0.25);
    expect(-7 / 16).toBe(-0.4375);
    expect(-7 / 64).toBe(-0.109375);
    expect(11 / 8).toBe(three.currentA);
    expect(three.currentWidth).toBe(1 / 8);
    expect(stepById('bisection-three-steps').explanation.sl).toContain('-0{,}109375');
    expect(stepById('bisection-three-steps').explanation.en).toContain('-0.109375');
    expect(stepById('bisection-three-steps').expectedObservations[0].en).toContain('0.25');
    const five = bisectionHistory('square-minus-two', 1, 2, 5);
    expect([five.currentA, five.currentB, five.currentWidth]).toEqual([1.40625, 1.4375, 1 / 32]);
    expect(stepById('bisection-exact-or-approximate').explanation.en).toContain('[1.40625,\\,1.4375]');
    expect(five.currentA < Math.SQRT2 && Math.SQRT2 < five.currentB).toBe(true);
    const jump = bisectionHistory('sign-step', -1, 1, 3);
    expect([jump.currentA, jump.currentB]).toEqual([-0.25, 0]);
    expect(jump.hypothesisSatisfied).toBe(false);
    expect(jump.bracket).toBe('opposite-signs');
    expect(stepById('bisection-counterexample-step').expectedObservations[0].en).toContain('[-0.25,\\,0]');
    const cubic = bisectionHistory('cubic', -1.5, 2, 0);
    expect([cubic.fa, cubic.fb]).toEqual([-1.875, 6]);
});

test('the lesson-facing vocabulary is closed: new parameter names, the example choice and the bisection command', () => {
    expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['bisect-a', 'bisect-b']));
    expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['a', 'b']));
    expect(FUNCTION_CHOICE_NAMES).toContain('bisection-example');
    expect(FUNCTION_CHOICE_VALUES['bisection-example']).toEqual([...BISECTION_EXAMPLE_IDS]);
    expect(sceneAction({name: 'set-function-parameter', value: {name: 'bisect-b', value: 1.5}})).toEqual({kind: 'function-parameter', name: 'bisect-b', value: 1.5});
    expect(sceneAction({name: 'set-function-choice', value: {name: 'bisection-example', value: 'cubic'}})).toEqual({kind: 'function-choice', name: 'bisection-example', value: 'cubic'});
    expect(() => sceneAction({name: 'set-function-choice', value: {name: 'bisection-example', value: 'sin'}})).toThrow(/must be one of/);
    expect(sceneAction({name: 'run-bisection-command', value: 'next-step'})).toEqual({kind: 'animation', animationId: 'bisection', command: 'next-step'});
    expect(sceneAction({name: 'run-bisection-command', value: 'reset'})).toEqual({kind: 'animation', animationId: 'bisection', command: 'reset'});
    for (const bad of ['play', 'pause', 'replay', 'stop', '', 1, true, null]) {
        expect(() => sceneAction({name: 'run-bisection-command', value: bad as never})).toThrow(/next-step.*reset/);
    }
});

test('the lesson adapts into typed actions for the graph and offers no frame animation', () => {
    const adapted = getLessonForDemonstration('bisection')!;
    expect(adapted.id).toBe('bisection-guided');
    expect(adapted.steps).toHaveLength(6);
    expect(adapted.steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
    expect(adapted.steps[3].scene?.actions.at(-1)).toEqual({kind: 'animation', animationId: 'bisection', command: 'next-step'});
});

describe('the mean value lesson', () => {
    const mean = analysisGuidedLessons.find(entry => entry.demonstrationId === 'mean-value')!;
    const meanStep = (id: string) => mean.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('mean-value')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;

    test('has the steps the spec asks for, in order, and is adapted under the guided id', () => {
        expect(mean.steps.map(step => step.id)).toEqual([
            'mean-value-prerequisites-step', 'mean-value-reveal-step', 'mean-value-move-c-step', 'mean-value-cube-step', 'mean-value-abs-step', 'mean-value-free-exploration',
        ]);
        expect(adapted().id).toBe('mean-value-guided');
        expect(adapted().steps).toHaveLength(6);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(getGuidedLesson('mean-value')).toBe(mean);
        expect(isGuidedLessonAvailable('mean-value')).toBe(true);
    });

    test('states the prerequisites, the hypotheses, existence without uniqueness, the corner and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => mean.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/continuity/);
        expect(prerequisites('en')).toMatch(/differentiab/);
        expect(prerequisites('en')).toMatch(/secant slope/);
        expect(prerequisites('en')).toMatch(/tangent/);
        expect(prerequisites('sl')).toMatch(/zveznosti/);
        expect(prerequisites('sl')).toMatch(/odvedljivosti/);
        expect(prerequisites('sl')).toMatch(/naklona sekante/);
        expect(meanStep('mean-value-prerequisites-step').explanation.en).toMatch(/at least one point/);
        expect(mean.formulaBlocks[0].explanation.en).toMatch(/not that there is only one/);
        expect(mean.formulaBlocks[0].explanation.sl).toMatch(/ne pa, da je ena sama/);
        expect(meanStep('mean-value-cube-step').explanation.en).toMatch(/not that there is only one/);
        expect(meanStep('mean-value-abs-step').explanation.en).toMatch(/corner/);
        expect(meanStep('mean-value-abs-step').explanation.en).toMatch(/no tangent/);
        expect(meanStep('mean-value-abs-step').explanation.en).toMatch(/hypothesis of differentiability/);
        expect(meanStep('mean-value-abs-step').explanation.sl).toMatch(/predpostavka odvedljivosti/);
        expect(meanStep('mean-value-reveal-step').explanation.en).toMatch(/numerical comparison.*not a proof/);
        expect(meanStep('mean-value-reveal-step').explanation.sl).toMatch(/številčna primerjava.*ne dokaz/);
        expect(meanStep('mean-value-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(meanStep('mean-value-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
    });

    test('asks for a prediction before the revealing Show matching point in every step that waits for the press', () => {
        for (const id of ['mean-value-prerequisites-step', 'mean-value-cube-step', 'mean-value-abs-step', 'mean-value-free-exploration']) {
            expect(meanStep(id).observationPrompt.en).toMatch(/Predict/);
            expect(meanStep(id).observationPrompt.en).toMatch(/Show matching point/);
            expect(meanStep(id).observationPrompt.sl).toMatch(/Napovej/);
            expect(meanStep(id).observationPrompt.sl).toMatch(/Pokaži ujemajočo točko/);
            // the scene of a step that asks for the prediction never reveals the matching points itself
            const revealed = adaptedActions(id).some(action => action.kind === 'function-visibility' && action.visible);
            expect(revealed, id).toBe(false);
        }
        // the first reveal comes in the step after the first prediction
        expect(meanStep('mean-value-reveal-step').scene!.actions).toContainEqual({name: 'show-function-element', value: {name: 'matching-points', value: true}});
        expect(mean.steps.findIndex(step => step.id === 'mean-value-prerequisites-step')).toBeLessThan(mean.steps.findIndex(step => step.id === 'mean-value-reveal-step'));
    });

    test('the scenes encode the independently derived configurations', () => {
        expect(adaptedActions('mean-value-prerequisites-step')).toEqual([{kind: 'prepared-scene', sceneId: 'mean-value-default', source: 'demonstration-default'}]);
        expect(adaptedActions('mean-value-reveal-step').slice(1)).toEqual([
            {kind: 'function-parameter', name: 'mvt-c', value: 1}, {kind: 'function-visibility', target: 'matching-points', visible: true},
        ]);
        expect(adaptedActions('mean-value-move-c-step').slice(1)).toEqual([{kind: 'function-parameter', name: 'mvt-c', value: 1.5}]);
        expect(adaptedActions('mean-value-cube-step').slice(1)).toEqual([{kind: 'function-choice', name: 'mean-value-example', value: 'cube'}]);
        expect(adaptedActions('mean-value-abs-step').slice(1)).toEqual([
            {kind: 'function-choice', name: 'mean-value-example', value: 'abs'}, {kind: 'function-parameter', name: 'mvt-c', value: 0},
        ]);
        expect(adaptedActions('mean-value-free-exploration').slice(1)).toEqual([
            {kind: 'function-choice', name: 'mean-value-example', value: 'abs'}, {kind: 'function-parameter', name: 'mvt-a', value: 0},
        ]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives', () => {
        const square = meanValueExample('square');
        const cube = meanValueExample('cube');
        const abs = meanValueExample('abs');
        // x^2 on [0, 2]: secant slope 2, tangent slope 1 at c = 0.5 (difference -1), matching point c = 1, difference 1 at c = 1.5
        expect(secantSlope(square, 0, 2)).toBe(2);
        expect(tangentSlope(square, 0, 0.5, 2)).toBe(1);
        expect(slopeDifference(square, 0, 0.5, 2)).toBe(-1);
        expect(matchingPoints(square, 0, 2)).toEqual({kind: 'points', points: [1]});
        expect(slopeDifference(square, 0, 1, 2)).toBe(0);
        expect(tangentSlope(square, 0, 1.5, 2)).toBe(3);
        expect(slopeDifference(square, 0, 1.5, 2)).toBe(1);
        expect(MEAN_VALUE_EXAMPLE_MODELS.square).toMatchObject({a: 0, b: 2, c: 0.5});
        // x^3 on [-1, 1]: secant slope 1, c = +-1/sqrt(3), slope 3c^2 = 1 at both, flat tangent at the default c = 0
        expect(secantSlope(cube, -1, 1)).toBe(1);
        const matches = matchingPoints(cube, -1, 1);
        expect(matches.kind).toBe('points');
        const [low, high] = matches.kind === 'points' ? matches.points : [];
        expect(high).toBeCloseTo(1 / Math.sqrt(3), 12);
        expect(low).toBeCloseTo(-1 / Math.sqrt(3), 12);
        expect(high).toBeCloseTo(0.5774, 4);
        expect(3 * high * high).toBeCloseTo(1, 12);
        expect(tangentSlope(cube, -1, 0, 1)).toBe(0);
        expect(slopeDifference(cube, -1, 0, 1)).toBe(-1);
        expect(MEAN_VALUE_EXAMPLE_MODELS.cube).toMatchObject({a: -1, b: 1, c: 0});
        // |x| on [-1, 1]: secant slope 0, derivative +-1, undefined (no tangent) at the corner c = 0, no match, hypothesis fails
        expect(secantSlope(abs, -1, 1)).toBe(0);
        expect([abs.derivative(-0.5), abs.derivative(0.5), abs.derivative(0)]).toEqual([-1, 1, undefined]);
        expect(tangentLineOf(abs, -1, 0, 1)).toBeUndefined();
        expect(matchingPoints(abs, -1, 1)).toEqual({kind: 'points', points: []});
        expect(isDifferentiableOn(abs, -1, 1)).toBe(false);
        // |x| on [0, 1]: differentiable on (0, 1), secant slope 1 = derivative, every point matches, difference 0 at c = 0.5
        expect(isDifferentiableOn(abs, 0, 1)).toBe(true);
        expect(secantSlope(abs, 0, 1)).toBe(1);
        expect(matchingPoints(abs, 0, 1)).toEqual({kind: 'interval', from: 0, to: 1});
        expect(slopeDifference(abs, 0, 0.5, 1)).toBe(0);
        // the formulas in the worked examples and the numbers in the prose
        const calculation = (id: string) => mean.workedExamples.find(example => example.id === id)!.calculationLatex;
        expect(calculation('mean-value-x2-example')).toContain('\\frac{2^2-0^2}{2-0}=2');
        expect(calculation('mean-value-x2-example')).toContain('f^{\\prime}(c)=2c=2\\ \\Longrightarrow\\ c=1');
        expect(calculation('mean-value-x3-example')).toContain('\\frac{1^3-(-1)^3}{1-(-1)}=1');
        expect(calculation('mean-value-x3-example')).toContain('3c^2=1');
        expect(calculation('mean-value-x3-example')).toContain('c=\\pm\\frac{1}{\\sqrt3}');
        expect(calculation('mean-value-abs-example')).toContain('\\frac{|1|-|-1|}{1-(-1)}=0');
        expect(meanStep('mean-value-cube-step').explanation.sl).toContain('\\approx\\pm0{,}5774');
        expect(meanStep('mean-value-cube-step').explanation.en).toContain('\\approx\\pm0.5774');
        expect(meanStep('mean-value-prerequisites-step').explanation.sl).toContain('=\\frac{4-0}{2}=2');
        expect(meanStep('mean-value-move-c-step').explanation.en).toContain('2c=3');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice and the matching-points element', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['mvt-a', 'mvt-b', 'mvt-c', 'a', 'b', 'bisect-a', 'bisect-b']));
        expect(FUNCTION_CHOICE_NAMES).toContain('mean-value-example');
        expect(FUNCTION_CHOICE_VALUES['mean-value-example']).toEqual([...MEAN_VALUE_EXAMPLE_IDS]);
        expect(sceneAction({name: 'set-function-parameter', value: {name: 'mvt-c', value: 1}})).toEqual({kind: 'function-parameter', name: 'mvt-c', value: 1});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'mean-value-example', value: 'abs'}})).toEqual({kind: 'function-choice', name: 'mean-value-example', value: 'abs'});
        expect(sceneAction({name: 'show-function-element', value: {name: 'matching-points', value: true}})).toEqual({kind: 'function-visibility', target: 'matching-points', visible: true});
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'mean-value-example', value: 'sin'}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'mvt-d' as never, value: 1}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'mvt-c', value: Number.NaN}})).toThrow(/finite/);
        expect(() => sceneAction({name: 'show-function-element', value: {name: 'matching-points', value: 'yes' as never}})).toThrow(/true or false/);
        expect(() => sceneAction({name: 'show-function-element', value: {name: 'corners' as never, value: true}})).toThrow(/must be one of/);
    });

    test('the lesson cites the source and says how the implementation corresponds to it', () => {
        expect(mean.sources.some(source => /§4\.4/.test(source.citation))).toBe(true);
        const implementation = mean.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/meanValue.ts');
        expect(implementation.citation).toContain('src/graphs/functions/MeanValueGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/computed analytically/);
        expect(implementation.implementationCorrespondence).toMatch(/a < c < b/);
    });
});
