import {analysisGuidedLessons} from './analysisGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES, getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, isGuidedLessonAvailable, sceneAction} from '../runtime/lessonCatalog';
import {FUNCTION_CHOICE_NAMES, FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES, FUNCTION_VISIBILITY_TARGETS} from '../model';
import {BISECTION_EXAMPLE_IDS, bisectionHistory} from '../../analysis/bisection';
import {
    isDifferentiableOn, matchingPoints, MEAN_VALUE_EXAMPLE_IDS, meanValueExample, secantSlope, slopeDifference, tangentLineOf, tangentSlope,
} from '../../analysis/meanValue';
import {MEAN_VALUE_EXAMPLE_MODELS} from '../../analysis/meanValueModel';
import {accumulation, accumulationPieces, accumulationTangent} from '../../analysis/accumulation';
import {catalogFunction, FUNCTION_IDS} from '../../analysis/functions';
import {DARBOUX_EXAMPLE_IDS, darbouxExample, darbouxSubintervals, darbouxTotals} from '../../analysis/darboux';
import {analyzeExtrema, EXTREMA_EXAMPLE_IDS, ExtremaExampleId, extremaExample} from '../../analysis/extrema';
import {
    chordComparison, chordLineOf, CONVEXITY_EXAMPLE_IDS, convexityExample, ConvexityExampleId, convexityVerdict, inflectionPointsIn, tangentComparison, tangentLineAt,
} from '../../analysis/convexity';

const lesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'bisection')!;
const stepById = (id: string) => lesson.steps.find(step => step.id === id)!;

test('the analysis lessons are bounded, localized, source-backed and available', () => {
    expect(analysisGuidedLessons.map(entry => entry.demonstrationId)).toEqual(['bisection', 'mean-value', 'accumulation', 'darboux', 'extrema', 'convexity']);
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

describe('the accumulation lesson', () => {
    const accumulationLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'accumulation')!;
    const accStep = (id: string) => accumulationLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('accumulation')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const sin = catalogFunction('sin');
    const square = catalogFunction('square');

    test('has the steps the spec asks for, in order, and is adapted under the guided id', () => {
        expect(accumulationLesson.steps.map(step => step.id)).toEqual([
            'accumulation-prerequisites-step', 'accumulation-reveal-step', 'accumulation-pi-step', 'accumulation-negative-step', 'accumulation-reversed-step',
            'accumulation-derivative-step', 'accumulation-free-exploration',
        ]);
        expect(adapted().id).toBe('accumulation-guided');
        expect(adapted().steps).toHaveLength(7);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(getGuidedLesson('accumulation')).toBe(accumulationLesson);
        expect(isGuidedLessonAvailable('accumulation')).toBe(true);
    });

    test('states the prerequisites, the signed integral, the orientation, the derivative with continuity as the sufficient hypothesis and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => accumulationLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/signed definite integral/);
        expect(prerequisites('en')).toMatch(/derivative/);
        expect(prerequisites('sl')).toMatch(/integrala s predznakom/);
        expect(prerequisites('sl')).toMatch(/odvoda/);
        expect(accStep('accumulation-prerequisites-step').explanation.en).toMatch(/signed integral/);
        expect(accStep('accumulation-negative-step').explanation.en).toMatch(/not the geometric area/);
        expect(accStep('accumulation-negative-step').explanation.sl).toMatch(/ne geometrijska ploščina/);
        expect(accStep('accumulation-reversed-step').explanation.en).toMatch(/A\(x\)=-\\int_x\^a f\(t\)/);
        expect(accStep('accumulation-reversed-step').explanation.en).toMatch(/reversed/);
        expect(accStep('accumulation-derivative-step').explanation.en).toMatch(/continuous at the point/);
        expect(accStep('accumulation-derivative-step').explanation.en).toMatch(/sufficient condition/);
        expect(accStep('accumulation-derivative-step').explanation.en).toMatch(/not an area/);
        expect(accStep('accumulation-derivative-step').explanation.sl).toMatch(/zadostni pogoj/);
        expect(accStep('accumulation-derivative-step').explanation.sl).toMatch(/ni ploščina/);
        expect(accumulationLesson.formulaBlocks.find(formula => formula.id === 'accumulation-derivative')!.explanation.en).toMatch(/Continuity is a sufficient condition/);
        expect(accStep('accumulation-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(accStep('accumulation-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
    });

    test('asks for a prediction before the revealing Show accumulation A, and the scene of such a step never reveals it', () => {
        for (const id of ['accumulation-prerequisites-step', 'accumulation-pi-step', 'accumulation-negative-step', 'accumulation-reversed-step', 'accumulation-free-exploration']) {
            expect(accStep(id).observationPrompt.en, id).toMatch(/Predict/);
            expect(accStep(id).observationPrompt.en, id).toMatch(/Show accumulation A/);
            expect(accStep(id).observationPrompt.sl, id).toMatch(/Napovej/);
            expect(accStep(id).observationPrompt.sl, id).toMatch(/Pokaži akumulacijo A/);
            const revealed = adaptedActions(id).some(action => action.kind === 'function-visibility' && action.visible);
            expect(revealed, id).toBe(false);
        }
        // the first area prediction (step 1) comes before the first reveal (step 2)
        expect(accStep('accumulation-reveal-step').scene!.actions).toContainEqual({name: 'show-function-element', value: {name: 'accumulation-curve', value: true}});
        expect(accumulationLesson.steps.findIndex(step => step.id === 'accumulation-prerequisites-step'))
            .toBeLessThan(accumulationLesson.steps.findIndex(step => step.id === 'accumulation-reveal-step'));
    });

    test('the scenes encode the independently derived configurations', () => {
        expect(adaptedActions('accumulation-prerequisites-step')).toEqual([{kind: 'prepared-scene', sceneId: 'accumulation-default', source: 'demonstration-default'}]);
        expect(adaptedActions('accumulation-reveal-step').slice(1)).toEqual([{kind: 'function-visibility', target: 'accumulation-curve', visible: true}]);
        expect(adaptedActions('accumulation-pi-step').slice(1)).toEqual([{kind: 'function-parameter', name: 'accum-x', value: Math.PI}]);
        expect(adaptedActions('accumulation-negative-step').slice(1)).toEqual([{kind: 'function-parameter', name: 'accum-x', value: 2 * Math.PI}]);
        expect(adaptedActions('accumulation-reversed-step').slice(1)).toEqual([
            {kind: 'function-parameter', name: 'accum-a', value: 2}, {kind: 'function-parameter', name: 'accum-x', value: 0},
        ]);
        expect(adaptedActions('accumulation-derivative-step').slice(1)).toEqual([
            {kind: 'function-parameter', name: 'accum-x', value: Math.PI / 2}, {kind: 'function-visibility', target: 'accumulation-curve', visible: true},
        ]);
        expect(adaptedActions('accumulation-free-exploration').slice(1)).toEqual([{kind: 'function-choice', name: 'accumulation-function', value: 'square'}]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives', () => {
        const rounded = (value: number) => Number(value.toFixed(4));
        // sin with a = 0: A(0) = 0, A(pi) = 2, A(2 pi) = 0; A(2) = 1 - cos 2
        expect(accumulation(sin, 0, 0)).toBe(0);
        expect(accumulation(sin, 0, Math.PI)).toBeCloseTo(2, 12);
        expect(accumulation(sin, 0, 2 * Math.PI)).toBeCloseTo(0, 12);
        expect(rounded(accumulation(sin, 0, 2))).toBe(1.4161);
        expect(accumulation(sin, 0, 2)).toBeCloseTo(1 - Math.cos(2), 12);
        expect(rounded(sin.value(2))).toBe(0.9093);
        // the parts of 2 pi: +2 and -2, and the geometric area 4 that the integral is not
        const pieces = accumulationPieces(sin, 0, 2 * Math.PI);
        expect(pieces.map(piece => [piece.sign, Math.round(piece.contribution * 1e9) / 1e9])).toEqual([['positive', 2], ['negative', -2]]);
        expect(pieces.reduce((sum, piece) => sum + Math.abs(piece.integral), 0)).toBeCloseTo(4, 12);
        // the reversed orientation: a = 2, x = 0 gives -(1 - cos 2) = cos 2 - 1
        expect(accumulation(sin, 2, 0)).toBeCloseTo(Math.cos(2) - 1, 12);
        expect(rounded(accumulation(sin, 2, 0))).toBe(-1.4161);
        expect(accumulation(sin, 2, 0)).toBeCloseTo(-accumulation(sin, 0, 2), 12);
        // the derivative at pi/2: slope f = 1 and A = 1
        expect(accumulation(sin, 0, Math.PI / 2)).toBeCloseTo(1, 12);
        expect(accumulationTangent(sin, 0, Math.PI / 2).slope).toBe(1);
        expect(rounded(Math.PI / 2)).toBe(1.5708);
        // x^2 with a = 0: A(2) = 8/3, slope f(2) = 4
        expect(accumulation(square, 0, 2)).toBeCloseTo(8 / 3, 12);
        expect(rounded(8 / 3)).toBe(2.6667);
        expect(accumulationTangent(square, 0, 2).slope).toBe(4);
        // the numbers in the prose and the worked examples
        const both = (step: string, field: 'explanation' | 'expectedObservations') => {
            const value = field === 'explanation' ? accStep(step).explanation : accStep(step).expectedObservations[0];
            return value;
        };
        expect(both('accumulation-reveal-step', 'explanation').sl).toContain('1{,}4161');
        expect(both('accumulation-reveal-step', 'explanation').en).toContain('1.4161');
        expect(both('accumulation-reveal-step', 'explanation').en).toContain('0.9093');
        expect(both('accumulation-prerequisites-step', 'expectedObservations').en).toContain('0.9093');
        expect(both('accumulation-reversed-step', 'explanation').en).toContain('-1.4161');
        expect(both('accumulation-reversed-step', 'explanation').sl).toContain('-1{,}4161');
        expect(both('accumulation-free-exploration', 'explanation').en).toContain('2.6667');
        expect(both('accumulation-free-exploration', 'explanation').sl).toContain('2{,}6667');
        expect(both('accumulation-derivative-step', 'explanation').en).toContain('A(x)=1-\\cos x');
        const worked = (id: string) => accumulationLesson.workedExamples.find(example => example.id === id)!;
        expect(worked('accumulation-sin-example').calculationLatex).toContain('A(x)=-\\cos x+\\cos 0=1-\\cos x');
        expect(worked('accumulation-sin-example').resultLatex).toContain('A(\\pi)=1-\\cos\\pi=2');
        expect(worked('accumulation-sin-example').resultLatex).toContain('A(2\\pi)=1-\\cos 2\\pi=0');
        expect(worked('accumulation-reversed-example').resultLatex).toBe('A(0)=\\cos 2-1');
        expect(worked('accumulation-derivative-example').calculationLatex).toContain('\\sin\\frac{\\pi}{2}=1');
        expect(accStep('accumulation-negative-step').explanation.en).toContain('\\(+2\\)');
        expect(accStep('accumulation-negative-step').explanation.en).toContain('\\(-2\\)');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the function choice and the accumulation-curve element', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['accum-a', 'accum-x', 'mvt-a', 'bisect-a', 'a', 'b']));
        expect(FUNCTION_CHOICE_NAMES).toContain('accumulation-function');
        expect(FUNCTION_CHOICE_VALUES['accumulation-function']).toEqual([...FUNCTION_IDS]);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('accumulation-curve');
        expect(sceneAction({name: 'set-function-parameter', value: {name: 'accum-x', value: 1}})).toEqual({kind: 'function-parameter', name: 'accum-x', value: 1});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'accumulation-function', value: 'exp'}})).toEqual({kind: 'function-choice', name: 'accumulation-function', value: 'exp'});
        expect(sceneAction({name: 'show-function-element', value: {name: 'accumulation-curve', value: true}})).toEqual({kind: 'function-visibility', target: 'accumulation-curve', visible: true});
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'accumulation-function', value: 'cos'}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'accum-b' as never, value: 1}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'accum-a', value: Number.NaN}})).toThrow(/finite/);
        expect(() => sceneAction({name: 'show-function-element', value: {name: 'accumulation-curve', value: 'yes' as never}})).toThrow(/true or false/);
    });

    test('the lesson cites the source and says how the implementation corresponds to it', () => {
        expect(accumulationLesson.sources.some(source => /§§5\.5–5\.6/.test(source.citation))).toBe(true);
        const implementation = accumulationLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/accumulation.ts');
        expect(implementation.citation).toContain('src/graphs/functions/AccumulationGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/F\(x\) - F\(a\)/);
        expect(implementation.implementationCorrespondence).toMatch(/x < a/);
    });
});

describe('the Darboux lesson', () => {
    const darbouxLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'darboux')!;
    const dStep = (id: string) => darbouxLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('darboux')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const square = darbouxExample('square');
    const sine = darbouxExample('sine');
    const rounded = (value: number) => Number(value.toFixed(4));

    test('has the steps the task asks for, in order, and is adapted under the guided id', () => {
        expect(darbouxLesson.steps.map(step => step.id)).toEqual([
            'darboux-prerequisites-step', 'darboux-bounds-step', 'darboux-refine-step', 'darboux-sine-step', 'darboux-sine-reveal-step', 'darboux-free-exploration',
        ]);
        expect(adapted().id).toBe('darboux-guided');
        expect(adapted().steps).toHaveLength(6);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(getGuidedLesson('darboux')).toBe(darbouxLesson);
        expect(isGuidedLessonAvailable('darboux')).toBe(true);
    });

    test('states the prerequisites, the infimum and supremum, the contrast with a left sample, and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => darbouxLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/partition/);
        expect(prerequisites('en')).toMatch(/infimum/);
        expect(prerequisites('en')).toMatch(/supremum/);
        expect(prerequisites('sl')).toMatch(/razdelitve/);
        expect(prerequisites('sl')).toMatch(/infimuma/);
        expect(dStep('darboux-prerequisites-step').explanation.en).toMatch(/greatest lower bound/);
        expect(dStep('darboux-prerequisites-step').explanation.en).toMatch(/least upper bound/);
        expect(dStep('darboux-prerequisites-step').explanation.sl).toMatch(/največja spodnja meja/);
        expect(dStep('darboux-sine-step').explanation.en).toMatch(/the supremum is not/);
        expect(dStep('darboux-sine-reveal-step').explanation.en).toMatch(/interior of the part/);
        expect(dStep('darboux-sine-reveal-step').explanation.en).toMatch(/value at the left endpoint/);
        expect(dStep('darboux-sine-reveal-step').explanation.en).toMatch(/not an upper estimate/);
        expect(dStep('darboux-sine-reveal-step').explanation.sl).toMatch(/levem krajišču/);
        expect(dStep('darboux-sine-reveal-step').explanation.sl).toMatch(/ni zgornja ocena/);
        expect(dStep('darboux-refine-step').explanation.en).toMatch(/bisects every part/);
        expect(dStep('darboux-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(dStep('darboux-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
        // the sums are never named as left or right sums
        for (const field of [darbouxLesson.summary, ...darbouxLesson.formulaBlocks.map(formula => formula.explanation)]) {
            expect(field.en).not.toMatch(/left sum|right sum/i);
        }
    });

    test('asks for a prediction before the revealing Show lower sum / Show upper sum, and the scene of such a step never reveals them', () => {
        for (const id of ['darboux-prerequisites-step', 'darboux-sine-step', 'darboux-free-exploration']) {
            expect(dStep(id).observationPrompt.en, id).toMatch(/Predict/);
            expect(dStep(id).observationPrompt.en, id).toMatch(/Show lower sum/);
            expect(dStep(id).observationPrompt.en, id).toMatch(/Show upper sum/);
            expect(dStep(id).observationPrompt.sl, id).toMatch(/Napovej/);
            expect(dStep(id).observationPrompt.sl, id).toMatch(/Pokaži spodnjo vsoto/);
            expect(dStep(id).observationPrompt.sl, id).toMatch(/Pokaži zgornjo vsoto/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual({kind: 'function-visibility', target: 'lower-sum', visible: false});
            expect(actions).toContainEqual({kind: 'function-visibility', target: 'upper-sum', visible: false});
        }
        for (const id of ['darboux-bounds-step', 'darboux-sine-reveal-step']) {
            expect(adaptedActions(id)).toContainEqual({kind: 'function-visibility', target: 'lower-sum', visible: true});
            expect(adaptedActions(id)).toContainEqual({kind: 'function-visibility', target: 'upper-sum', visible: true});
        }
        // each prediction precedes its reveal
        const order = (id: string) => darbouxLesson.steps.findIndex(step => step.id === id);
        expect(order('darboux-prerequisites-step')).toBeLessThan(order('darboux-bounds-step'));
        expect(order('darboux-sine-step')).toBeLessThan(order('darboux-sine-reveal-step'));
    });

    test('the scenes encode the independently derived configurations', () => {
        expect(adaptedActions('darboux-prerequisites-step')).toEqual([
            {kind: 'prepared-scene', sceneId: 'darboux-prerequisites-scene', source: 'demonstration-default'},
            {kind: 'function-visibility', target: 'lower-sum', visible: false}, {kind: 'function-visibility', target: 'upper-sum', visible: false},
        ]);
        expect(adaptedActions('darboux-refine-step').slice(1)).toEqual([{kind: 'function-parameter', name: 'darboux-n', value: 8}]);
        expect(adaptedActions('darboux-sine-step').slice(1)).toEqual([
            {kind: 'function-choice', name: 'darboux-example', value: 'sine'}, {kind: 'function-parameter', name: 'darboux-b', value: Math.PI},
            {kind: 'function-parameter', name: 'darboux-n', value: 1}, {kind: 'function-visibility', target: 'lower-sum', visible: false},
            {kind: 'function-visibility', target: 'upper-sum', visible: false},
        ]);
        expect(adaptedActions('darboux-free-exploration').slice(1, 2)).toEqual([{kind: 'function-choice', name: 'darboux-example', value: 'sine'}]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives', () => {
        const x2 = (n: number) => darbouxTotals(square, 0, 2, n);
        expect(x2(4)).toMatchObject({lower: 1.75, upper: 3.75});
        expect(x2(4).integral).toBeCloseTo(8 / 3, 12);
        expect(x2(4).gap).toBe(2);
        expect([x2(8).lower, x2(8).upper, x2(8).gap]).toEqual([2.1875, 3.1875, 1]);
        expect([rounded(x2(16).lower), rounded(x2(16).upper), x2(16).gap]).toEqual([2.4219, 2.9219, 0.5]);
        expect(rounded(8 / 3)).toBe(2.6667);
        // the infima and suprema on the four parts of x^2
        expect(darbouxSubintervals(square, 0, 2, 4).map(part => [part.inf, part.sup])).toEqual([[0, 0.25], [0.25, 1], [1, 2.25], [2.25, 4]]);
        // sin x on [0, pi] with one part: inf 0, sup 1 at pi/2, L = 0, U = pi, integral 2; the left sample 0 * pi is below the integral
        const one = darbouxSubintervals(sine, 0, Math.PI, 1)[0];
        expect([one.inf, one.sup]).toEqual([0, 1]);
        const sineOne = darbouxTotals(sine, 0, Math.PI, 1);
        expect(sineOne.lower).toBe(0);
        expect(sineOne.upper).toBeCloseTo(Math.PI, 12);
        expect(sineOne.integral).toBeCloseTo(2, 12);
        expect(rounded(Math.PI)).toBe(3.1416);
        expect(sine.value(0) * Math.PI).toBeLessThan(sineOne.integral);
        // sin x on [0, 2 pi] with four parts: L = -pi, U = pi, integral 0, gap 2 pi
        const full = darbouxTotals(sine, 0, 2 * Math.PI, 4);
        expect(full.lower).toBeCloseTo(-Math.PI, 12);
        expect(full.upper).toBeCloseTo(Math.PI, 12);
        expect(full.integral).toBeCloseTo(0, 12);
        expect(rounded(full.gap)).toBe(6.2832);
        expect(darbouxSubintervals(sine, 0, 2 * Math.PI, 4).map(part => [Math.round(part.inf) + 0, Math.round(part.sup) + 0])).toEqual([[0, 1], [0, 1], [-1, 0], [-1, 0]]);
        // the numbers in the prose
        expect(dStep('darboux-bounds-step').explanation.en).toContain('1.75');
        expect(dStep('darboux-bounds-step').explanation.sl).toContain('1{,}75');
        expect(dStep('darboux-bounds-step').explanation.en).toContain('3.75');
        expect(dStep('darboux-bounds-step').explanation.en).toContain('2.6667');
        expect(dStep('darboux-bounds-step').explanation.sl).toContain('2{,}6667');
        expect(dStep('darboux-bounds-step').title.sl).toContain('1{,}75\\le\\frac83\\le3{,}75');
        expect(dStep('darboux-refine-step').explanation.en).toContain('2.1875');
        expect(dStep('darboux-refine-step').explanation.en).toContain('3.1875');
        expect(dStep('darboux-refine-step').expectedObservations[0].en).toContain('2.4219');
        expect(dStep('darboux-refine-step').expectedObservations[0].en).toContain('2.9219');
        expect(dStep('darboux-sine-reveal-step').explanation.en).toContain('3.1416');
        expect(dStep('darboux-free-exploration').explanation.sl).toContain('-3{,}1416');
        expect(dStep('darboux-free-exploration').expectedObservations[0].en).toContain('6.2832');
        const worked = (id: string) => darbouxLesson.workedExamples.find(example => example.id === id)!;
        expect(worked('darboux-square-example').resultLatex).toBe('\\frac74\\le\\frac83\\le\\frac{15}{4}');
        expect(worked('darboux-sine-example').resultLatex).toBe('0\\le2\\le\\pi');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice and the two sum elements', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['darboux-a', 'darboux-b', 'darboux-n', 'accum-a', 'mvt-a', 'a', 'b', 'n']));
        expect(FUNCTION_CHOICE_NAMES).toContain('darboux-example');
        expect(FUNCTION_CHOICE_VALUES['darboux-example']).toEqual([...DARBOUX_EXAMPLE_IDS]);
        expect(FUNCTION_VISIBILITY_TARGETS).toEqual(expect.arrayContaining(['lower-sum', 'upper-sum']));
        expect(sceneAction({name: 'set-function-parameter', value: {name: 'darboux-n', value: 8}})).toEqual({kind: 'function-parameter', name: 'darboux-n', value: 8});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'darboux-example', value: 'sine'}})).toEqual({kind: 'function-choice', name: 'darboux-example', value: 'sine'});
        expect(sceneAction({name: 'show-function-element', value: {name: 'lower-sum', value: false}})).toEqual({kind: 'function-visibility', target: 'lower-sum', visible: false});
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'darboux-example', value: 'cos'}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'darboux-c' as never, value: 1}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'darboux-a', value: Number.NaN}})).toThrow(/finite/);
        expect(() => sceneAction({name: 'show-function-element', value: {name: 'upper-sum', value: 'yes' as never}})).toThrow(/true or false/);
    });

    test('the lesson cites the source and says how the implementation corresponds to it', () => {
        expect(darbouxLesson.sources.some(source => /§5\.3/.test(source.citation))).toBe(true);
        const implementation = darbouxLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/darboux.ts');
        expect(implementation.citation).toContain('src/graphs/functions/DarbouxGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/never sampled/);
        expect(implementation.implementationCorrespondence).toMatch(/nested/);
    });
});

describe('the extrema lesson', () => {
    const extremaLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'extrema')!;
    const eStep = (id: string) => extremaLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('extrema')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const analyze = (id: ExtremaExampleId, a: number, b: number) => analyzeExtrema(extremaExample(id), a, b);
    const rounded = (value: number) => Number(value.toFixed(4));
    const predictionSteps = ['extrema-prerequisites-step', 'extrema-cube-step', 'extrema-abs-step', 'extrema-sine-step', 'extrema-tie-step'];
    const revealSteps = ['extrema-square-step', 'extrema-free-exploration'];

    test('has the steps the task asks for, in order, and is adapted under the guided id', () => {
        expect(extremaLesson.steps.map(step => step.id)).toEqual([
            'extrema-prerequisites-step', 'extrema-square-step', 'extrema-cube-step', 'extrema-abs-step', 'extrema-sine-step', 'extrema-tie-step', 'extrema-free-exploration',
        ]);
        expect(adapted().id).toBe('extrema-guided');
        expect(adapted().steps).toHaveLength(7);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(getGuidedLesson('extrema')).toBe(extremaLesson);
        expect(isGuidedLessonAvailable('extrema')).toBe(true);
    });

    test('states the prerequisites, the convention (local relative to the interval), the sources and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => extremaLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/derivative/);
        expect(prerequisites('en')).toMatch(/closed interval/);
        expect(prerequisites('sl')).toMatch(/odvoda/);
        expect(prerequisites('sl')).toMatch(/zaprtega intervala/);
        expect(eStep('extrema-prerequisites-step').explanation.en).toMatch(/relative to the selected interval/);
        expect(eStep('extrema-prerequisites-step').explanation.en).toMatch(/only on the side that lies in the interval/);
        expect(eStep('extrema-prerequisites-step').explanation.sl).toMatch(/glede na izbrani interval/);
        expect(eStep('extrema-square-step').explanation.en).toMatch(/relative to the interval/);
        expect(extremaLesson.summary.en).toMatch(/relative to the selected interval/);
        expect(extremaLesson.summary.en).toMatch(/every tied candidate is global/);
        expect(eStep('extrema-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(eStep('extrema-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
        expect(extremaLesson.sources.some(source => /Globevnik/.test(source.citation) && /Analiza I/.test(source.citation))).toBe(true);
        const implementation = extremaLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/extrema.ts');
        expect(implementation.citation).toContain('src/graphs/functions/ExtremaGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/never sampled/);
        expect(implementation.implementationCorrespondence).toMatch(/relative to the selected interval/);
        expect(implementation.implementationCorrespondence).toMatch(/tied candidates are all global/);
    });

    test('asks for a prediction before every classification reveal, and the scene of a prediction step never reveals', () => {
        for (const id of predictionSteps) {
            expect(eStep(id).observationPrompt.en, id).toMatch(/Predict/);
            expect(eStep(id).observationPrompt.en, id).toMatch(/Show classification/);
            expect(eStep(id).observationPrompt.sl, id).toMatch(/Napovej/);
            expect(eStep(id).observationPrompt.sl, id).toMatch(/Pokaži klasifikacijo/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual({kind: 'function-visibility', target: 'extrema-classification', visible: false});
        }
        for (const id of revealSteps) {
            expect(adaptedActions(id)).toContainEqual({kind: 'function-visibility', target: 'extrema-classification', visible: true});
            expect(eStep(id).frames.map(frame => frame.kind)).toEqual(['explanation', 'calculation', 'observation']);
        }
        // the first prediction precedes its reveal, and so does the tie prediction
        const order = (id: string) => extremaLesson.steps.findIndex(step => step.id === id);
        expect(order('extrema-prerequisites-step')).toBeLessThan(order('extrema-square-step'));
        expect(order('extrema-tie-step')).toBeLessThan(order('extrema-free-exploration'));
        // a prediction step shows no calculation frame, which would give the answer away
        for (const id of predictionSteps) expect(eStep(id).frames.map(frame => frame.kind), id).toEqual(['explanation', 'observation']);
    });

    test('the scenes encode the independently derived configurations', () => {
        expect(adaptedActions('extrema-prerequisites-step')).toEqual([
            {kind: 'prepared-scene', sceneId: 'extrema-prerequisites-scene', source: 'demonstration-default'},
            {kind: 'function-visibility', target: 'extrema-classification', visible: false},
        ]);
        expect(adaptedActions('extrema-cube-step').slice(1)).toEqual([
            {kind: 'function-choice', name: 'extrema-example', value: 'cube'}, {kind: 'function-visibility', target: 'extrema-classification', visible: false},
        ]);
        expect(adaptedActions('extrema-abs-step').slice(1, 2)).toEqual([{kind: 'function-choice', name: 'extrema-example', value: 'abs'}]);
        expect(adaptedActions('extrema-sine-step').slice(1, 2)).toEqual([{kind: 'function-choice', name: 'extrema-example', value: 'sine'}]);
        for (const id of ['extrema-tie-step', 'extrema-free-exploration']) {
            expect(adaptedActions(id).slice(1, 4)).toEqual([
                {kind: 'function-choice', name: 'extrema-example', value: 'sine'}, {kind: 'function-parameter', name: 'extrema-a', value: 0},
                {kind: 'function-parameter', name: 'extrema-b', value: Math.PI},
            ]);
        }
    });

    test('the numbers stated in the prose are the ones the mathematics gives', () => {
        // x^2 on [-1, 2]
        const square = analyze('square', -1, 2);
        expect(square.candidates.map(candidate => [candidate.x, candidate.value, candidate.local])).toEqual([[-1, 1, 'localMaximum'], [0, 0, 'localMinimum'], [2, 4, 'localMaximum']]);
        expect([square.globalMinimum, square.globalMinimumAt, square.globalMaximum, square.globalMaximumAt]).toEqual([0, [0], 4, [2]]);
        expect(square.pieces.map(piece => piece.sign)).toEqual([-1, 1]);
        expect(square.candidates[0].isGlobalMaximum).toBe(false);
        expect(extremaExample('square').value(-1.1)).toBeCloseTo(1.21, 12);
        // x^3 on [-1, 1]: 0 is stationary and neither
        const cube = analyze('cube', -1, 1);
        expect(cube.candidates.map(candidate => [candidate.x, candidate.local])).toEqual([[-1, 'localMinimum'], [0, 'neither'], [1, 'localMaximum']]);
        expect([cube.globalMinimum, cube.globalMaximum]).toEqual([-1, 1]);
        expect(cube.pieces.map(piece => piece.sign)).toEqual([1, 1]);
        // |x| on [-1, 1]: corner minimum, endpoints tie
        const abs = analyze('abs', -1, 1);
        expect(abs.candidates.map(candidate => [candidate.kind, candidate.derivative, candidate.local])).toEqual([
            ['endpoint', -1, 'localMaximum'], ['corner', undefined, 'localMinimum'], ['endpoint', 1, 'localMaximum'],
        ]);
        expect([abs.globalMinimumAt, abs.globalMaximumAt]).toEqual([[0], [-1, 1]]);
        // sin x on [-4, 4]
        const sine = analyze('sine', -4, 4);
        expect(sine.candidates.map(candidate => [rounded(candidate.x), rounded(candidate.value), candidate.local])).toEqual([
            [-4, 0.7568, 'localMaximum'], [-1.5708, -1, 'localMinimum'], [1.5708, 1, 'localMaximum'], [4, -0.7568, 'localMinimum'],
        ]);
        expect([sine.globalMinimum, sine.globalMaximum]).toEqual([-1, 1]);
        expect(sine.candidates.filter(candidate => candidate.isGlobalMinimum || candidate.isGlobalMaximum).map(candidate => candidate.kind)).toEqual(['stationary', 'stationary']);
        // sin x on [0, pi]: the endpoints tie as global minima
        const tie = analyze('sine', 0, Math.PI);
        expect(tie.candidates.map(candidate => [candidate.local, candidate.isGlobalMinimum, candidate.isGlobalMaximum])).toEqual([
            ['localMinimum', true, false], ['localMaximum', false, true], ['localMinimum', true, false],
        ]);
        expect(tie.globalMinimumAt).toEqual([0, Math.PI]);
        expect(rounded(Math.PI)).toBe(3.1416);
        // the numbers in the prose
        expect(eStep('extrema-square-step').explanation.sl).toContain('f(-1{,}1)=1{,}21');
        expect(eStep('extrema-square-step').explanation.en).toContain('f(-1.1)=1.21');
        expect(eStep('extrema-sine-step').explanation.sl).toContain('0{,}7568');
        expect(eStep('extrema-sine-step').explanation.en).toContain('-0.7568');
        expect(eStep('extrema-sine-step').explanation.en).toContain('f(-4)\\approx0.7568');
        const worked = (id: string) => extremaLesson.workedExamples.find(example => example.id === id)!;
        expect(worked('extrema-square-example').resultLatex).toBe('\\min f=f(0)=0,\\qquad \\max f=f(2)=4');
        expect(worked('extrema-sine-tie-example').resultLatex).toContain('f(0)=f(\\pi)=0');
        // the handoff step explains the tie in words
        expect(eStep('extrema-free-exploration').explanation.en).toMatch(/both endpoints are local minima/);
        expect(eStep('extrema-free-exploration').explanation.en).toMatch(/both are global minima/);
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice and the classification element', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['extrema-a', 'extrema-b', 'darboux-a', 'mvt-a', 'a', 'b', 'n']));
        expect(FUNCTION_CHOICE_NAMES).toContain('extrema-example');
        expect(FUNCTION_CHOICE_VALUES['extrema-example']).toEqual([...EXTREMA_EXAMPLE_IDS]);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('extrema-classification');
        expect(sceneAction({name: 'set-function-parameter', value: {name: 'extrema-a', value: 0}})).toEqual({kind: 'function-parameter', name: 'extrema-a', value: 0});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'extrema-example', value: 'abs'}})).toEqual({kind: 'function-choice', name: 'extrema-example', value: 'abs'});
        expect(sceneAction({name: 'show-function-element', value: {name: 'extrema-classification', value: false}})).toEqual({kind: 'function-visibility', target: 'extrema-classification', visible: false});
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'extrema-example', value: 'cos'}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'extrema-c' as never, value: 1}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'extrema-a', value: Number.NaN}})).toThrow(/finite/);
        expect(() => sceneAction({name: 'show-function-element', value: {name: 'extrema-classification', value: 'yes' as never}})).toThrow(/true or false/);
    });
});

describe('the convexity lesson', () => {
    const convexityLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'convexity')!;
    const cStep = (id: string) => convexityLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('convexity')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const example = (id: ConvexityExampleId) => convexityExample(id);
    const hide = {kind: 'function-visibility', target: 'second-derivative', visible: false};
    const show = {kind: 'function-visibility', target: 'second-derivative', visible: true};
    const predictionSteps = ['convexity-prerequisites-step', 'convexity-negative-step', 'convexity-cube-step', 'convexity-quartic-step'];
    const revealSteps = ['convexity-chord-step', 'convexity-tangent-step', 'convexity-free-exploration'];

    test('has the steps the task asks for, in order, and is adapted under the guided id', () => {
        expect(convexityLesson.steps.map(step => step.id)).toEqual([
            'convexity-prerequisites-step', 'convexity-chord-step', 'convexity-tangent-step', 'convexity-negative-step', 'convexity-cube-step',
            'convexity-quartic-step', 'convexity-free-exploration',
        ]);
        expect(adapted().id).toBe('convexity-guided');
        expect(adapted().steps).toHaveLength(7);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(getGuidedLesson('convexity')).toBe(convexityLesson);
        expect(isGuidedLessonAvailable('convexity')).toBe(true);
    });

    test('states the prerequisites, the hypothesis behind every claim, the sources and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => convexityLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/second derivative/);
        expect(prerequisites('en')).toMatch(/chord/);
        expect(prerequisites('sl')).toMatch(/drugi odvod/);
        expect(prerequisites('sl')).toMatch(/tetive/);
        expect(cStep('convexity-tangent-step').explanation.en).toMatch(/not in \\\(\[a,b\]\\\)/);
        expect(cStep('convexity-tangent-step').explanation.en).toMatch(/only where the hypothesis allows it/);
        expect(cStep('convexity-tangent-step').explanation.sl).toMatch(/le tam, kjer hipoteza to dovoljuje/);
        expect(convexityLesson.summary.en).toMatch(/nothing is claimed/);
        expect(convexityLesson.summary.en).toMatch(/A zero of the second derivative alone is not an inflection/);
        expect(cStep('convexity-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(cStep('convexity-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
        expect(convexityLesson.sources.some(source => /Globevnik/.test(source.citation) && /Analiza I/.test(source.citation))).toBe(true);
        expect(convexityLesson.unresolvedQuestions.map(item => item.en).join(' ')).toMatch(/not checked in the PDF/);
        const implementation = convexityLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/convexity.ts');
        expect(implementation.citation).toContain('src/graphs/functions/ConvexityGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/never from sampling/);
        expect(implementation.implementationCorrespondence).toMatch(/only when t lies in \[a, b\]/);
    });

    test('asks for a prediction before every second-derivative reveal, and the scene of a prediction step never reveals', () => {
        for (const id of predictionSteps) {
            expect(cStep(id).observationPrompt.en, id).toMatch(/Predict/);
            expect(cStep(id).observationPrompt.en, id).toMatch(/Show second derivative/);
            expect(cStep(id).observationPrompt.sl, id).toMatch(/Napovej/);
            expect(cStep(id).observationPrompt.sl, id).toMatch(/Pokaži drugi odvod/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual(hide);
            // a prediction step shows no calculation frame, which would give the answer away
            expect(cStep(id).frames.map(frame => frame.kind), id).toEqual(['explanation', 'observation']);
        }
        for (const id of revealSteps) {
            expect(adaptedActions(id)).toContainEqual(show);
            expect(cStep(id).frames.map(frame => frame.kind)).toEqual(['explanation', 'calculation', 'observation']);
        }
        const order = (id: string) => convexityLesson.steps.findIndex(step => step.id === id);
        expect(order('convexity-prerequisites-step')).toBeLessThan(order('convexity-chord-step'));
        expect(order('convexity-quartic-step')).toBeLessThan(order('convexity-free-exploration'));
    });

    test('the scenes encode the independently derived configurations', () => {
        expect(adaptedActions('convexity-prerequisites-step')).toEqual([{kind: 'prepared-scene', sceneId: 'convexity-prerequisites-scene', source: 'demonstration-default'}, hide]);
        expect(adaptedActions('convexity-chord-step').slice(1)).toEqual([show]);
        expect(adaptedActions('convexity-tangent-step').slice(1)).toEqual([show]);
        expect(adaptedActions('convexity-negative-step').slice(1)).toEqual([{kind: 'function-choice', name: 'convexity-example', value: 'negSquare'}, hide]);
        expect(adaptedActions('convexity-cube-step').slice(1)).toEqual([{kind: 'function-choice', name: 'convexity-example', value: 'cube'}, hide]);
        expect(adaptedActions('convexity-quartic-step').slice(1)).toEqual([{kind: 'function-choice', name: 'convexity-example', value: 'quartic'}, hide]);
        expect(adaptedActions('convexity-free-exploration').slice(1)).toEqual([{kind: 'function-choice', name: 'convexity-example', value: 'quartic'}, show]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives (exact identities checked independently)', () => {
        const square = example('square');
        const grid = (a: number, b: number, n = 60) => Array.from({length: n + 1}, (_, i) => a + ((b - a) * i) / n);
        // x^2 on [-1, 1.5]: the chord is y = 0.5x + 1.5 and f - chord = (x + 1)(x - 1.5) <= 0
        const chord = chordLineOf(square, -1, 1.5);
        expect([chord.slope, chord.intercept]).toEqual([0.5, 1.5]);
        for (const x of grid(-1, 1.5)) expect(square.value(x) - (0.5 * x + 1.5)).toBeCloseTo((x + 1) * (x - 1.5), 12);
        expect(grid(-1, 1.5).every(x => square.value(x) - chord.slope * x - chord.intercept <= 1e-12)).toBe(true);
        expect(square.secondDerivative(0)).toBe(2);
        expect(convexityVerdict(square, -1, 1.5)).toEqual({kind: 'convex'});
        // the tangent at 0.5 is y = x - 0.25 with f - tangent = (x - 0.5)^2; at t = 1.8 the claim is withdrawn although (x - 1.8)^2 >= 0
        const tangent = tangentLineAt(square, 0.5);
        expect([tangent.slope, tangent.intercept]).toEqual([1, -0.25]);
        for (const x of grid(-1, 1.5)) expect(square.value(x) - (x - 0.25)).toBeCloseTo((x - 0.5) ** 2, 12);
        expect(tangentComparison(square, -1, 1.5, 0.5)).toEqual({kind: 'above'});
        expect(tangentComparison(square, -1, 1.5, 1.8)).toEqual({kind: 'none', reason: 'tangent-outside-interval'});
        const outside = tangentLineAt(square, 1.8);
        for (const x of grid(-1, 1.5)) expect(square.value(x) - (outside.slope * x + outside.intercept)).toBeCloseTo((x - 1.8) ** 2, 12);
        // -x^2 reverses both: chord y = -0.5x - 1.5, f - chord = -(x + 1)(x - 1.5) >= 0; tangent y = -x + 0.25, f - tangent = -(x - 0.5)^2
        const negative = example('negSquare');
        const negativeChord = chordLineOf(negative, -1, 1.5);
        expect([negativeChord.slope, negativeChord.intercept]).toEqual([-0.5, -1.5]);
        for (const x of grid(-1, 1.5)) expect(negative.value(x) - (-0.5 * x - 1.5)).toBeCloseTo(-(x + 1) * (x - 1.5), 12);
        const negativeTangent = tangentLineAt(negative, 0.5);
        expect([negativeTangent.slope, negativeTangent.intercept]).toEqual([-1, 0.25]);
        for (const x of grid(-1, 1.5)) expect(negative.value(x) - (-x + 0.25)).toBeCloseTo(-((x - 0.5) ** 2), 12);
        expect(chordComparison(negative, -1, 1.5)).toEqual({kind: 'above'});
        expect(tangentComparison(negative, -1, 1.5, 0.5)).toEqual({kind: 'below'});
        // x^3: f'' = 6x changes sign at 0; the chord on [-1, 1.5] is y = 1.75x + 0.75 and f - chord = (x + 1)(x + 0.5)(x - 1.5)
        const cube = example('cube');
        const cubeChord = chordLineOf(cube, -1, 1.5);
        expect([cubeChord.slope, cubeChord.intercept]).toEqual([1.75, 0.75]);
        for (const x of grid(-1, 1.5)) expect(cube.value(x) - (1.75 * x + 0.75)).toBeCloseTo((x + 1) * (x + 0.5) * (x - 1.5), 12);
        expect(grid(-1, 1.5).some(x => cube.value(x) > 1.75 * x + 0.75 + 1e-9) && grid(-1, 1.5).some(x => cube.value(x) < 1.75 * x + 0.75 - 1e-9)).toBe(true);
        expect(convexityVerdict(cube, -1, 1.5)).toEqual({kind: 'none', reason: 'sign-changes'});
        expect(inflectionPointsIn(cube, -1, 1.5)).toEqual([0]);
        expect(convexityVerdict(cube, 0, 2)).toEqual({kind: 'convex'});
        expect(convexityVerdict(cube, -2, 0)).toEqual({kind: 'concave'});
        // x^4 on [-1, 1]: chord y = 1, f - 1 = (x^2 - 1)(x^2 + 1); tangent at 0.5 is y = 0.5x - 0.1875 with f - tangent = (x - 0.5)^2 (x^2 + x + 0.75)
        const quartic = example('quartic');
        const quarticChord = chordLineOf(quartic, -1, 1);
        expect([quarticChord.slope, quarticChord.intercept]).toEqual([0, 1]);
        for (const x of grid(-1, 1)) expect(quartic.value(x) - 1).toBeCloseTo((x * x - 1) * (x * x + 1), 12);
        const quarticTangent = tangentLineAt(quartic, 0.5);
        expect([quarticTangent.slope, quarticTangent.intercept]).toEqual([0.5, -0.1875]);
        for (const x of grid(-1, 1)) expect(quartic.value(x) - (0.5 * x - 0.1875)).toBeCloseTo((x - 0.5) ** 2 * (x * x + x + 0.75), 12);
        expect(1 - 4 * 0.75).toBeLessThan(0);
        expect(quartic.secondDerivative(0)).toBe(0);
        expect(convexityVerdict(quartic, -1, 1)).toEqual({kind: 'convex'});
        expect(inflectionPointsIn(quartic, -1, 1)).toEqual([]);
        // the numbers in the prose
        expect(cStep('convexity-chord-step').explanation.sl).toContain('y=0{,}5x+1{,}5');
        expect(cStep('convexity-chord-step').explanation.en).toContain('y=0.5x+1.5');
        expect(cStep('convexity-tangent-step').explanation.en).toContain('y=x-0.25');
        expect(cStep('convexity-cube-step').explanation.en).toContain('y=-0.5x-1.5');
        expect(cStep('convexity-cube-step').explanation.en).toContain('y=-x+0.25');
        expect(cStep('convexity-quartic-step').explanation.en).toContain('y=1.75x+0.75');
        expect(cStep('convexity-quartic-step').explanation.en).toContain('(x+1)(x+0.5)(x-1.5)');
        expect(cStep('convexity-free-exploration').explanation.en).toContain('y=0.5x-0.1875');
        const worked = (id: string) => convexityLesson.workedExamples.find(item => item.id === id)!;
        expect(worked('convexity-chord-example').resultLatex).toContain('(x+1)\\left(x-\\tfrac32\\right)\\le0');
        expect(worked('convexity-tangent-example').resultLatex).toContain('\\left(x-\\tfrac12\\right)^2\\ge0');
        expect(worked('convexity-quartic-example').calculationLatex).toContain('f^{\\prime\\prime}(0)=0');
        // the handoff and the cube step name the intervals the lesson restricts its claims to
        expect(cStep('convexity-cube-step').observationPrompt.en).toContain('\\(a=0\\) and \\(b=2\\)');
        expect(cStep('convexity-cube-step').observationPrompt.en).toContain('\\(a=-2\\) and \\(b=0\\)');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice and the second-derivative element', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['convexity-a', 'convexity-b', 'convexity-t', 'extrema-a', 'mvt-a', 'a', 'b', 'n']));
        expect(FUNCTION_CHOICE_NAMES).toContain('convexity-example');
        expect(FUNCTION_CHOICE_VALUES['convexity-example']).toEqual([...CONVEXITY_EXAMPLE_IDS]);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('second-derivative');
        expect(sceneAction({name: 'set-function-parameter', value: {name: 'convexity-t', value: 1.8}})).toEqual({kind: 'function-parameter', name: 'convexity-t', value: 1.8});
        expect(sceneAction({name: 'set-function-choice', value: {name: 'convexity-example', value: 'cube'}})).toEqual({kind: 'function-choice', name: 'convexity-example', value: 'cube'});
        expect(sceneAction({name: 'show-function-element', value: {name: 'second-derivative', value: false}})).toEqual({kind: 'function-visibility', target: 'second-derivative', visible: false});
        expect(() => sceneAction({name: 'set-function-choice', value: {name: 'convexity-example', value: 'abs'}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'convexity-c' as never, value: 1}})).toThrow(/must be one of/);
        expect(() => sceneAction({name: 'set-function-parameter', value: {name: 'convexity-a', value: Number.NaN}})).toThrow(/finite/);
        expect(() => sceneAction({name: 'show-function-element', value: {name: 'second-derivative', value: 'yes' as never}})).toThrow(/true or false/);
    });
});
