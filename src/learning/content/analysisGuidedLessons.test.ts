import {analysisGuidedLessons} from './analysisGuidedLessons';
import {getGuidedLesson} from './guidedLessons';
import {taylorAbsoluteError, taylorExample, taylorPolynomial} from '../../analysis/taylor';
import {isTermInBand, sequenceMinThreshold, sequenceThresholdWorks} from '../../analysis/sequence';
import {uniformExample, uniformLimit, uniformPointwiseError, uniformPointwiseThreshold, uniformSupremum, uniformThreshold} from '../../analysis/uniformConvergence';
import {getLessonForDemonstration, isGuidedLessonAvailable, sceneActions} from '../runtime/lessonCatalog';
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
    expect(analysisGuidedLessons.map(entry => entry.demonstrationId)).toEqual(['bisection', 'mean-value', 'accumulation', 'darboux', 'extrema', 'convexity', 'taylor', 'sequence', 'uniform-convergence', 'fixed-point']);
    for (const entry of analysisGuidedLessons) {
        expect(getGuidedLesson(entry.demonstrationId)).toBe(entry);
        expect(isGuidedLessonAvailable(entry.demonstrationId)).toBe(true);
        expect(entry.steps.length).toBeGreaterThanOrEqual(5);
        expect(entry.steps.length).toBeLessThanOrEqual(8);
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
            // action names and parameters are checked by the `LessonAction` type; the adapter must accept the whole scene
            expect(() => sceneActions(step.scene!)).not.toThrow();
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
        expect(meanStep('mean-value-reveal-step').scene!.actions).toContainEqual({kind: 'function-visibility', target: 'matching-points', visible: true});
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
        expect(accStep('accumulation-reveal-step').scene!.actions).toContainEqual({kind: 'function-visibility', target: 'accumulation-curve', visible: true});
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
    });
});

describe('the taylor lesson', () => {
    const taylorLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'taylor')!;
    const tStep = (id: string) => taylorLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('taylor')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const hide = {kind: 'function-visibility', target: 'taylor-bound', visible: false};
    const show = {kind: 'function-visibility', target: 'taylor-bound', visible: true};
    const predictionSteps = ['taylor-prerequisites-step', 'taylor-exp-low-degrees-step', 'taylor-sine-prediction-step', 'taylor-geometric-step', 'taylor-flat-prediction-step'];
    const revealSteps = ['taylor-exp-step', 'taylor-sine-step', 'taylor-free-exploration'];
    const param = (name: string, value: number) => ({kind: 'function-parameter', name, value});
    const example = (value: string) => ({kind: 'function-choice', name: 'taylor-example', value});

    test('has the steps the task asks for, in order, and is adapted under the guided id', () => {
        expect(taylorLesson.steps.map(step => step.id)).toEqual([
            'taylor-prerequisites-step', 'taylor-exp-low-degrees-step', 'taylor-exp-step', 'taylor-sine-prediction-step', 'taylor-sine-step',
            'taylor-geometric-step', 'taylor-flat-prediction-step', 'taylor-free-exploration',
        ]);
        expect(adapted().id).toBe('taylor-guided');
        expect(adapted().steps).toHaveLength(8);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(taylorLesson.steps.reduce((count, step) => count + step.frames.length, 0)).toBe(20);
        expect(getGuidedLesson('taylor')).toBe(taylorLesson);
        expect(isGuidedLessonAvailable('taylor')).toBe(true);
    });

    test('states the prerequisites, the hypothesis behind the bound, the finite-versus-series distinction, the sources and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => taylorLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/higher derivatives/);
        expect(prerequisites('en')).toMatch(/factorials/);
        expect(prerequisites('sl')).toMatch(/višjih odvodov/);
        expect(prerequisites('sl')).toMatch(/fakultet/);
        expect(tStep('taylor-exp-step').explanation.en).toMatch(/assumption is that \\\(M\\\) is an upper bound/);
        expect(tStep('taylor-exp-step').explanation.en).toContain('M=\\max(e^c,e^x)=e<3');
        expect(tStep('taylor-sine-step').explanation.en).toMatch(/\\\(M=1\\\)/);
        expect(taylorLesson.summary.en).toMatch(/kept apart from the infinite Taylor series/);
        expect(taylorLesson.summary.sl).toMatch(/ločiti od neskončne Taylorjeve vrste/);
        expect(tStep('taylor-free-exploration').explanation.en).toMatch(/finite polynomial/);
        expect(tStep('taylor-free-exploration').explanation.en).toMatch(/to the wrong value/);
        expect(tStep('taylor-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(tStep('taylor-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
        expect(tStep('taylor-free-exploration').explanation.en).toMatch(/derivatives elsewhere/);
        expect(taylorLesson.sources.some(source => /Globevnik/.test(source.citation) && /Analiza I/.test(source.citation))).toBe(true);
        expect(taylorLesson.unresolvedQuestions.map(item => item.en).join(' ')).toMatch(/not checked in the PDF/);
        const implementation = taylorLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/taylor.ts');
        expect(implementation.citation).toContain('src/graphs/functions/TaylorGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/never symbolic differentiation/);
        expect(implementation.implementationCorrespondence).toMatch(/none for the flat function/);
    });

    test('asks for a prediction before every bound reveal, and the scene of a prediction step never reveals', () => {
        for (const id of predictionSteps) {
            expect(tStep(id).observationPrompt.en, id).toMatch(/Predict/);
            expect(tStep(id).observationPrompt.sl, id).toMatch(/Napovej/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual(hide);
            // The opening calculation only teaches the initial readout; later predictions reveal no answer.
            expect(tStep(id).frames.map(frame => frame.kind), id).toEqual(id === 'taylor-prerequisites-step'
                ? ['explanation', 'calculation', 'observation'] : ['explanation', 'observation']);
        }
        for (const id of ['taylor-prerequisites-step', 'taylor-sine-prediction-step', 'taylor-flat-prediction-step']) {
            expect(tStep(id).observationPrompt.en, id).toMatch(/Show error bound/);
            expect(tStep(id).observationPrompt.sl, id).toMatch(/Pokaži oceno napake/);
        }
        expect(tStep('taylor-geometric-step').observationPrompt.en).toMatch(/\+ button/);
        const opening = adapted().steps[0].frames!;
        expect(opening[0].body!.en).toContain('higher derivatives');
        expect(opening[0].body!.en).toContain('factorials');
        expect(opening[0].notation!.map(item => item.en).join(' ')).toContain('has derivatives at the center through order');
        expect(adapted().steps[2].frames![0].notation!.map(item => item.en).join(' ')).toContain('times differentiable between');
        expect(opening[1].workedExample!.calculation.en).toContain('T_1(1)=1+1=2');
        expect(opening[1].workedExample!.calculation.en).not.toMatch(/T_[36]|5040/);
        expect(opening[1].workedExample!.check.en).toContain('bound stays hidden');
        for (const id of revealSteps) {
            expect(adaptedActions(id)).toContainEqual(show);
            expect(tStep(id).frames.map(frame => frame.kind)).toEqual(['explanation', 'calculation', 'observation']);
        }
        const order = (id: string) => taylorLesson.steps.findIndex(step => step.id === id);
        expect(order('taylor-prerequisites-step')).toBeLessThan(order('taylor-exp-low-degrees-step'));
        expect(order('taylor-exp-low-degrees-step')).toBeLessThan(order('taylor-exp-step'));
        expect(order('taylor-sine-prediction-step')).toBeLessThan(order('taylor-sine-step'));
        expect(order('taylor-flat-prediction-step')).toBeLessThan(order('taylor-free-exploration'));
    });

    test('the scenes encode the independently derived configurations', () => {
        expect(adaptedActions('taylor-prerequisites-step')).toEqual([{kind: 'prepared-scene', sceneId: 'taylor-prerequisites-scene', source: 'demonstration-default'}, hide]);
        expect(adaptedActions('taylor-exp-low-degrees-step').slice(1)).toEqual([param('taylor-degree', 2), hide]);
        expect(adaptedActions('taylor-exp-step').slice(1)).toEqual([param('taylor-degree', 6), show]);
        expect(adaptedActions('taylor-sine-prediction-step').slice(1)).toEqual([example('sine'), hide]);
        expect(adaptedActions('taylor-sine-step').slice(1)).toEqual([example('sine'), show]);
        expect(adaptedActions('taylor-geometric-step').slice(1)).toEqual([example('geometric'), param('taylor-x', -1.5), param('taylor-degree', 1), hide]);
        expect(adaptedActions('taylor-flat-prediction-step').slice(1)).toEqual([example('flat'), hide]);
        expect(adaptedActions('taylor-free-exploration').slice(1)).toEqual([example('flat'), show]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives (independent arithmetic)', () => {
        const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
        // e^x about 0 at x = 1: T_3 = 8/3, T_6 = 1957/720 by exact integer arithmetic over the common denominator 720
        const numerator = (n: number) => Array.from({length: n + 1}, (_, k) => 720 / factorial(k)).reduce((sum, term) => sum + term, 0);
        expect(numerator(1)).toBe(1440);
        expect(numerator(3)).toBe(1920); // 1920 / 720 = 8/3
        expect(numerator(6)).toBe(1957);
        const t3 = numerator(3) / 720;
        const t6 = numerator(6) / 720;
        expect(t3).toBeCloseTo(8 / 3, 14);
        expect(Math.E - 2).toBeCloseTo(0.71828, 5);
        expect(Math.E - t3).toBeCloseTo(0.0516, 4);
        expect(Math.E - t6).toBeCloseTo(0.000226, 6);
        expect(Math.E / factorial(7)).toBeCloseTo(0.000539, 6);
        expect(Math.E / factorial(7)).toBeGreaterThan(Math.E - t6);
        expect(Math.E).toBeLessThan(3);
        // the repo's own evaluation agrees: e^x about 0 at x = 1 for degrees 1, 2, 3, 6 (degrees 1, 2, 3 are compared before 6)
        const exp = taylorExample('exp');
        const polynomialValues = [1, 2, 3, 6].map(n => taylorPolynomial(exp, 0, n, 1));
        expect(polynomialValues[0]).toBeCloseTo(2, 14);
        expect(polynomialValues[1]).toBeCloseTo(5 / 2, 14);
        expect(polynomialValues[2]).toBeCloseTo(8 / 3, 14);
        expect(polynomialValues[3]).toBeCloseTo(1957 / 720, 14);
        const errors = [1, 2, 3, 6].map(n => taylorAbsoluteError(exp, 0, n, 1));
        expect(errors[0]).toBeCloseTo(0.71828, 5);
        expect(errors[1]).toBeCloseTo(0.21828, 5);
        expect(errors[2]).toBeCloseTo(0.051615, 6);
        expect(errors[3]).toBeCloseTo(0.000226, 6);
        expect(errors[0]).toBeGreaterThan(errors[1]);
        expect(errors[1]).toBeGreaterThan(errors[2]);
        expect(errors[2]).toBeGreaterThan(errors[3]);
        // the Lagrange bound with M = e < 3 holds at every compared degree (hypothesis: M bounds |f^(n+1)| between c and x)
        [1, 2, 3, 6].forEach((n, index) => expect(errors[index]).toBeLessThanOrEqual(Math.E / factorial(n + 1)));
        // the prose of the low-degree step states these values
        const low = tStep('taylor-exp-low-degrees-step').explanation;
        expect(low.en).toContain('\\frac52');
        for (const value of ['0.7183', '0.2183', '0.0516']) expect(low.en).toContain(value);
        for (const value of ['0{,}7183', '0{,}2183', '0{,}0516']) expect(low.sl).toContain(value);
        expect([errors[0], errors[1], errors[2]].map(error => error.toFixed(4))).toEqual(['0.7183', '0.2183', '0.0516']);
        expect(tStep('taylor-exp-step').explanation.en).toContain('0.2183');
        // sin x about 0 at x = 2: T_3 = 2 - 8/6 = 2/3, error about 0.2426, bound 16/24; T_5 = 14/15, error about 0.0240, bound 4/45
        expect(2 - 8 / 6).toBeCloseTo(2 / 3, 14);
        expect(Math.sin(2)).toBeCloseTo(0.9093, 4);
        expect(Math.sin(2) - 2 / 3).toBeCloseTo(0.2426, 4);
        expect(2 ** 4 / factorial(4)).toBeCloseTo(2 / 3, 14);
        expect(2 - 8 / 6 + 32 / 120).toBeCloseTo(14 / 15, 14);
        expect(Math.abs(Math.sin(2) - 14 / 15)).toBeCloseTo(0.0240, 4);
        expect(2 ** 6 / factorial(6)).toBeCloseTo(4 / 45, 14);
        // 1/(1 - x) about 0 at x = -1.5: f = 0.4, partial sums by direct addition, errors 0.9, 2.025, 4.55625; at x = 0.5 errors 0.125 and 0.03125
        const partial = (x: number, n: number) => { let sum = 0; for (let k = 0; k <= n; k++) sum += x ** k; return sum; };
        expect(1 / 2.5).toBe(0.4);
        expect(Math.abs(0.4 - partial(-1.5, 1))).toBeCloseTo(0.9, 12);
        expect(Math.abs(0.4 - partial(-1.5, 3))).toBeCloseTo(2.025, 12);
        expect(Math.abs(0.4 - partial(-1.5, 5))).toBeCloseTo(4.55625, 12);
        expect(partial(-1.5, 1)).toBeCloseTo(-0.5, 14);
        expect(Math.abs(2 - partial(0.5, 3))).toBeCloseTo(0.125, 14);
        expect(Math.abs(2 - partial(0.5, 5))).toBeCloseTo(0.03125, 14);
        // 9/10, 81/40 and 729/160 are the three errors
        expect(9 / 10).toBeCloseTo(0.9, 14);
        expect(81 / 40).toBeCloseTo(2.025, 14);
        expect(729 / 160).toBeCloseTo(4.55625, 14);
        // the flat function: f(1) = e^-1 > 0 while every polynomial is 0
        expect(Math.exp(-1)).toBeCloseTo(0.3679, 4);
        // the numbers in the prose
        expect(tStep('taylor-exp-step').explanation.en).toContain('\\frac{1957}{720}');
        expect(tStep('taylor-exp-step').explanation.en).toContain('\\frac83');
        expect(tStep('taylor-exp-step').explanation.en).toContain('0.000539');
        expect(tStep('taylor-exp-step').explanation.en).toContain('0.000226');
        expect(tStep('taylor-exp-step').explanation.sl).toContain('0{,}000539');
        expect(tStep('taylor-sine-step').explanation.en).toContain('\\frac{16}{24}=\\frac23');
        expect(tStep('taylor-sine-step').explanation.en).toContain('0.2426');
        expect(tStep('taylor-geometric-step').explanation.en).toContain('f(-1.5)=\\frac{1}{2.5}=0.4');
        expect(tStep('taylor-flat-prediction-step').explanation.en).toContain('2.025');
        expect(tStep('taylor-flat-prediction-step').explanation.en).toContain('0.03125');
        expect(tStep('taylor-free-exploration').explanation.en).toContain('0.3679');
        const worked = (id: string) => taylorLesson.workedExamples.find(item => item.id === id)!;
        expect(worked('taylor-exp-example').calculationLatex).toContain('\\tfrac{1957}{720}');
        expect(worked('taylor-sine-example').calculationLatex).toContain('\\frac{2^{4}}{4!}=\\frac{16}{24}=\\frac23');
        expect(worked('taylor-geometric-example').resultLatex).toContain('\\tfrac{81}{40}');
        expect(worked('taylor-flat-example').resultLatex).toContain('\\frac1e>0');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice and the bound element', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['taylor-center', 'taylor-degree', 'taylor-x', 'convexity-a', 'extrema-a', 'n']));
        expect(FUNCTION_CHOICE_NAMES).toContain('taylor-example');
        expect(FUNCTION_CHOICE_VALUES['taylor-example']).toEqual(['exp', 'sine', 'geometric', 'flat']);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('taylor-bound');
    });
});

describe('the sequence lesson', () => {
    const sequenceLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'sequence')!;
    const qStep = (id: string) => sequenceLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('sequence')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const hide = {kind: 'function-visibility', target: 'sequence-certificate', visible: false};
    const show = {kind: 'function-visibility', target: 'sequence-certificate', visible: true};
    const advance = {kind: 'animation', animationId: 'sequence', command: 'next-step'};
    const predictionSteps = ['sequence-definition-step', 'sequence-small-epsilon-step', 'sequence-alternating-step', 'sequence-oscillation-step', 'sequence-unbounded-step', 'sequence-free-exploration'];
    const param = (name: string, value: number) => ({kind: 'function-parameter', name, value});
    const example = (value: string) => ({kind: 'function-choice', name: 'sequence-example', value});
    /** The default scene shows one term, so a scene with `count` terms adds count - 1 steps. */
    const advances = (count: number) => Array(count - 1).fill(advance);

    test('has the steps the task asks for, in order, and is adapted under the guided id', () => {
        expect(sequenceLesson.steps.map(step => step.id)).toEqual([
            'sequence-definition-step', 'sequence-threshold-step', 'sequence-small-epsilon-step', 'sequence-alternating-step', 'sequence-oscillation-step',
            'sequence-unbounded-step', 'sequence-free-exploration',
        ]);
        expect(adapted().id).toBe('sequence-guided');
        expect(adapted().steps).toHaveLength(7);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(sequenceLesson.steps.reduce((count, step) => count + step.frames.length, 0)).toBe(15);
        expect(getGuidedLesson('sequence')).toBe(sequenceLesson);
        expect(isGuidedLessonAvailable('sequence')).toBe(true);
    });

    test('states the prerequisites, the quantifiers, the strict inequality, the finite-window warning, the sources and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => sequenceLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/index/);
        expect(prerequisites('en')).toMatch(/absolute value/);
        expect(prerequisites('en')).toMatch(/inequalities/);
        expect(prerequisites('sl')).toMatch(/indeksom/);
        expect(prerequisites('sl')).toMatch(/absolutne vrednosti/);
        expect(prerequisites('sl')).toMatch(/neenačbami/);
        expect(qStep('sequence-definition-step').explanation.en).toMatch(/First .* is chosen, only then/);
        expect(qStep('sequence-definition-step').explanation.sl).toMatch(/Najprej je izbran/);
        expect(qStep('sequence-threshold-step').explanation.en).toMatch(/the band is open/);
        expect(qStep('sequence-threshold-step').explanation.sl).toMatch(/pas pa je odprt/);
        expect(qStep('sequence-small-epsilon-step').explanation.en).toMatch(/not from the shown terms/);
        expect(qStep('sequence-small-epsilon-step').explanation.en).toMatch(/never a proof/);
        expect(qStep('sequence-oscillation-step').explanation.en).toMatch(/this \\\(\\varepsilon\\\) is satisfied/);
        expect(qStep('sequence-oscillation-step').explanation.en).toMatch(/no proof/);
        expect(qStep('sequence-oscillation-step').explanation.sl).toMatch(/ni dokaz/);
        expect(qStep('sequence-oscillation-step').explanation.en).toContain('\\varepsilon\\le1+|L|');
        expect(qStep('sequence-unbounded-step').explanation.en).toMatch(/for good/);
        expect(qStep('sequence-free-exploration').explanation.en).toMatch(/explore on your own/i);
        expect(qStep('sequence-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
        expect(qStep('sequence-free-exploration').explanation.en).toMatch(/not the limit/);
        expect(sequenceLesson.summary.en).toMatch(/a finite window of terms does not prove convergence/);
        expect(sequenceLesson.sources.some(source => /Globevnik/.test(source.citation) && /Analiza I/.test(source.citation) && /§§2\.4 and 2\.5/.test(source.citation))).toBe(true);
        expect(sequenceLesson.unresolvedQuestions.map(item => item.en).join(' ')).toMatch(/not checked in the PDF/);
        const implementation = sequenceLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/sequence.ts');
        expect(implementation.citation).toContain('src/graphs/functions/SequenceGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/integer count of hundredths/);
        expect(implementation.implementationCorrespondence).toMatch(/never from the shown terms/);
    });

    test('asks for a prediction before every certificate reveal, and the scene of a prediction step never reveals', () => {
        for (const id of predictionSteps) {
            expect(qStep(id).observationPrompt.en, id).toMatch(/Predict|Compute/);
            expect(qStep(id).observationPrompt.sl, id).toMatch(/Napovej|izračunaj/);
            expect(qStep(id).observationPrompt.en, id).toMatch(/Show certificate/);
            expect(qStep(id).observationPrompt.sl, id).toMatch(/Pokaži certifikat/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual(hide);
            // a prediction step shows no calculation frame, which would give the answer away
            expect(qStep(id).frames.map(frame => frame.kind), id).toEqual(['explanation', 'observation']);
        }
        // the one step that explains the least working threshold shows the certificate, with its calculation
        expect(adaptedActions('sequence-threshold-step')).toContainEqual(show);
        expect(qStep('sequence-threshold-step').frames.map(frame => frame.kind)).toEqual(['explanation', 'calculation', 'observation']);
        const order = (id: string) => sequenceLesson.steps.findIndex(step => step.id === id);
        expect(order('sequence-definition-step')).toBeLessThan(order('sequence-threshold-step'));
    });

    test('the scenes encode the independently derived configurations', () => {
        const scene = (id: string) => ({kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'});
        expect(adaptedActions('sequence-definition-step')).toEqual([scene('sequence-definition-scene'), param('sequence-epsilon', 0.25), ...advances(12), hide]);
        expect(adaptedActions('sequence-threshold-step').slice(1)).toEqual([...advances(12), param('sequence-threshold', 11), show]);
        expect(adaptedActions('sequence-small-epsilon-step').slice(1)).toEqual([param('sequence-epsilon', 0.01), ...advances(40), hide]);
        expect(adaptedActions('sequence-alternating-step').slice(1)).toEqual([example('alternating-reciprocal'), ...advances(12), hide]);
        expect(adaptedActions('sequence-oscillation-step').slice(1)).toEqual([example('alternating-sign'), param('sequence-epsilon', 1.5), ...advances(12), hide]);
        expect(adaptedActions('sequence-unbounded-step').slice(1)).toEqual([example('natural'), ...advances(12), hide]);
        expect(adaptedActions('sequence-free-exploration').slice(1)).toEqual([param('sequence-threshold', 11), ...advances(12), hide]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives (independent integer arithmetic)', () => {
        // N works exactly when N * epsilon > 1; with epsilon = k / 100 that is the integer test N * k > 100
        const works = (n: number, hundredths: number) => n * hundredths > 100;
        const least = (hundredths: number) => { let n = 1; while (!works(n, hundredths)) n++; return n; };
        expect(least(10)).toBe(11);
        expect(works(5, 10)).toBe(false);
        expect(works(10, 10)).toBe(false);
        expect(works(11, 10)).toBe(true);
        expect(11 * 10 / 100).toBeCloseTo(1.1, 12);
        expect(least(1)).toBe(101);
        expect(works(100, 1)).toBe(false);
        expect(works(101, 1)).toBe(true);
        // terms of 1/n: the fifth is 0.2, the eleventh is 0.0909, the fortieth 0.025
        expect(1 / 5).toBe(0.2);
        expect(1 / 11).toBeCloseTo(0.0909, 4);
        expect(1 / 40).toBe(0.025);
        expect(1 / 101).toBeCloseTo(0.0099, 4);
        expect(1 / 40).toBeGreaterThan(0.01);
        // shown terms inside the open band at epsilon = 0.1 (k = 10): those with 1 / n < 0.1, that is 100 < 10 n
        const inBand = (count: number, hundredths: number) => Array.from({length: count}, (_, index) => index + 1).filter(n => 100 < n * hundredths).length;
        expect(inBand(8, 10)).toBe(0);
        expect(inBand(12, 10)).toBe(2);
        // at epsilon = 0.01 (k = 1) none of the forty terms is inside: 1 / n < 0.01 needs n > 100
        expect(inBand(40, 1)).toBe(0);
        // (-1)^n against L = 0: every distance is 1, inside the band for epsilon = 1.5, outside for epsilon = 0.5 and for epsilon = 1 (strict inequality)
        expect(1 < 1.5).toBe(true);
        expect(1 < 0.5).toBe(false);
        expect(1 < 1).toBe(false);
        // the farther of -1 and 1 from L is at distance 1 + |L|
        for (const limit of [-2, -0.5, 0, 0.7, 2]) expect(Math.max(Math.abs(1 - limit), Math.abs(-1 - limit))).toBeCloseTo(1 + Math.abs(limit), 12);
        // a_n = n against L + epsilon: above it from n = 1 for L = 0 and epsilon = 0.5, from n = 3 for L = 2
        expect(Math.floor(0 + 0.5) + 1).toBe(1);
        expect(Math.floor(2 + 0.5) + 1).toBe(3);
        expect(2 > 2.5).toBe(false);
        expect(3 > 2.5).toBe(true);
        // the numbers in the prose
        expect(qStep('sequence-threshold-step').explanation.en).toContain('N\\varepsilon=1.1>1');
        expect(qStep('sequence-threshold-step').explanation.sl).toContain('N\\varepsilon=1{,}1>1');
        expect(qStep('sequence-small-epsilon-step').explanation.en).toContain('+1=101\\)');
        expect(qStep('sequence-small-epsilon-step').explanation.en).toContain('a_{40}=0.025');
        expect(qStep('sequence-small-epsilon-step').expectedObservations[1].en).toContain('0.0099');
        expect(qStep('sequence-threshold-step').expectedObservations[0].en).toContain('0.0909');
        expect(qStep('sequence-threshold-step').expectedObservations[0].sl).toContain('0{,}0909');
        const worked = sequenceLesson.workedExamples[0];
        expect(worked.calculationLatex).toContain('N_{\\min}=\\left\\lfloor10\\right\\rfloor+1=11');
        expect(worked.resultLatex).toContain('\\tfrac1{10}=\\varepsilon');
        expect(worked.resultLatex).toContain('\\tfrac1{11}<\\tfrac1{10}');
        expect(sequenceLesson.formulaBlocks.find(block => block.id === 'sequence-oscillating-distance')!.latex).toContain('=1+|L|');
    });

    test('opens with epsilon = 1/4: a_4 is on the open-band boundary, the tail n >= 5 is inside, and every classification uses one convention', () => {
        // exact fractions: 1/4 is not below 1/4 (boundary), 1/5 is
        expect(1 * 4 < 1 * 4).toBe(false);
        expect(1 * 5 > 1 * 4).toBe(true);
        expect(sequenceMinThreshold(0.25)).toBe(5);
        expect(sequenceThresholdWorks(0.25, 4)).toBe(false);
        expect(sequenceThresholdWorks(0.25, 5)).toBe(true);
        expect(isTermInBand('reciprocal', 4, 0, 0.25)).toBe(false);
        expect(isTermInBand('reciprocal', 5, 0, 0.25)).toBe(true);
        // the certificate N and the classification of every term agree (tail convention n >= N, strict inequality)
        for (let n = 1; n <= 1000; n++) expect(isTermInBand('reciprocal', n, 0, 0.25), String(n)).toBe(n >= sequenceMinThreshold(0.25));
        const shown = Array.from({length: 12}, (_, index) => index + 1);
        expect(shown.filter(n => isTermInBand('reciprocal', n, 0, 0.25))).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
        // the smaller-band examples are kept and consistent
        expect(sequenceMinThreshold(0.1)).toBe(11);
        expect(sequenceMinThreshold(0.01)).toBe(101);
        // a loose band around (-1)^n contains every term yet is no convergence: epsilon <= 1 contains none
        expect(shown.every(n => isTermInBand('alternating-sign', n, 0, 1.5))).toBe(true);
        expect(shown.some(n => isTermInBand('alternating-sign', n, 0, 1))).toBe(false);
        // the prose
        const step = qStep('sequence-definition-step');
        expect(step.explanation.en).toContain('a_4=0.25');
        expect(step.explanation.en).toContain('a_5=0.2');
        expect(step.explanation.en).toMatch(/first twelve terms/);
        expect(step.explanation.en).toMatch(/do not prove convergence/);
        expect(step.explanation.sl).toContain('a_4=0{,}25');
        expect(step.expectedObservations[0].en).toMatch(/eight of them/);
        expect(step.expectedObservations[1].en).toContain('least working \\(N\\) is \\(5\\)');
        expect(step.expectedObservations[1].en).toContain('|a_4|=0.25=');
        expect(step.expectedObservations[1].en).not.toMatch(/does not work.*At/);
        expect(qStep('sequence-threshold-step').explanation.en).toContain('At \\(\\varepsilon=\\frac14\\), \\(N=5\\) worked');
        expect(sequenceLesson.learningGoals[0].en).toContain('N=4');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice, the certificate element and the sequence command', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['sequence-epsilon', 'sequence-limit', 'sequence-threshold', 'taylor-x', 'n']));
        expect(FUNCTION_CHOICE_NAMES).toContain('sequence-example');
        expect(FUNCTION_CHOICE_VALUES['sequence-example']).toEqual(['reciprocal', 'alternating-reciprocal', 'alternating-sign', 'natural']);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('sequence-certificate');
        expect(adapted().steps.flatMap(step => step.scene!.actions)).toContainEqual({kind: 'animation', animationId: 'sequence', command: 'next-step'});
    });
});

describe('the fixed-point lesson', () => {
    const fixedLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'fixed-point')!;
    const fStep = (id: string) => fixedLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('fixed-point')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const hide = {kind: 'function-visibility', target: 'fixed-point-bound', visible: false};
    const show = {kind: 'function-visibility', target: 'fixed-point-bound', visible: true};
    const advance = {kind: 'animation', animationId: 'fixed-point', command: 'next-step'};
    const advances = (count: number) => Array(count).fill(advance);
    const example = (value: string) => ({kind: 'function-choice', name: 'fixed-point-example', value});
    const param = (name: string, value: number) => ({kind: 'function-parameter', name, value});
    const ids = ['fixed-point-cobweb-step', 'fixed-point-next-iterate-step', 'fixed-point-contraction-step', 'fixed-point-cosine-step', 'fixed-point-rounding-step',
        'fixed-point-reflection-step', 'fixed-point-free-exploration'];
    const predictionSteps = ids.filter(id => id !== 'fixed-point-contraction-step');

    test('has the steps the task asks for, in order, and is adapted under the guided id', () => {
        expect(fixedLesson.steps.map(step => step.id)).toEqual(ids);
        expect(adapted().id).toBe('fixed-point-guided');
        expect(adapted().steps).toHaveLength(7);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(fixedLesson.steps.reduce((count, step) => count + step.frames.length, 0)).toBe(15);
        expect(getGuidedLesson('fixed-point')).toBe(fixedLesson);
        expect(isGuidedLessonAvailable('fixed-point')).toBe(true);
    });

    test('states the prerequisites, the hypotheses, the rounding warning, the two-cycle without a divergence claim, the sources and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => fixedLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/composition/);
        expect(prerequisites('en')).toMatch(/convergence of a sequence/);
        expect(prerequisites('sl')).toMatch(/sestavljanja/);
        expect(prerequisites('sl')).toMatch(/konvergence zaporedja/);
        expect(fStep('fixed-point-cobweb-step').explanation.en).toMatch(/vertically to the curve/);
        expect(fStep('fixed-point-cobweb-step').explanation.sl).toMatch(/navpično do krivulje/);
        expect(fStep('fixed-point-contraction-step').explanation.en).toMatch(/maps the closed interval/);
        expect(fStep('fixed-point-contraction-step').explanation.en).toMatch(/not that the iterate is exactly/);
        expect(fStep('fixed-point-cosine-step').explanation.en).toMatch(/subset of the interval/);
        expect(fStep('fixed-point-cosine-step').explanation.sl).toMatch(/podmnožica intervala/);
        expect(fStep('fixed-point-rounding-step').explanation.en).toMatch(/do not prove that the iterate is an exact fixed point/);
        expect(fStep('fixed-point-rounding-step').explanation.en).toMatch(/rounding, not as a proof/);
        expect(fStep('fixed-point-rounding-step').explanation.sl).toMatch(/ne dokažeta/);
        expect(fStep('fixed-point-reflection-step').explanation.en).toMatch(/does not by itself prove divergence/);
        expect(fStep('fixed-point-reflection-step').explanation.sl).toMatch(/samo po sebi divergence ne dokazuje/);
        expect(fStep('fixed-point-reflection-step').explanation.en).toMatch(/two-cycle/);
        expect(fStep('fixed-point-free-exploration').explanation.en).toMatch(/Explore on your own/);
        expect(fStep('fixed-point-free-exploration').explanation.sl).toMatch(/Raziskuj sam/);
        // the lesson never asserts that the reflection diverges (it only says that a failing hypothesis does not prove it)
        for (const language of ['sl', 'en'] as const) {
            const reflection = fStep('fixed-point-reflection-step');
            expect([reflection.explanation[language], ...reflection.expectedObservations.map(item => item[language])].join(' ')).not.toMatch(/is divergent|diverges to|je divergentna|divergira k/);
        }
        expect(fixedLesson.sources.some(source => /Globevnik/.test(source.citation) && /Analiza I/.test(source.citation) && /§8\.6/.test(source.citation))).toBe(true);
        expect(fixedLesson.unresolvedQuestions.map(item => item.en).join(' ')).toMatch(/not checked in the PDF/);
        const implementation = fixedLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/fixedPoint.ts');
        expect(implementation.citation).toContain('src/graphs/functions/FixedPointGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/exact hundredths/);
        expect(implementation.implementationCorrespondence).toMatch(/never as an exact fixed point/);
    });

    test('asks for a prediction before every reveal, and the scene of a prediction step never shows the bound', () => {
        for (const id of predictionSteps) {
            expect(fStep(id).observationPrompt.en, id).toMatch(/[Pp]redict|Compute/);
            expect(fStep(id).observationPrompt.sl, id).toMatch(/[Nn]apovej|[Ii]zračunaj/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual(hide);
            // a prediction step shows no calculation frame, which would give the answer away
            expect(fStep(id).frames.map(frame => frame.kind), id).toEqual(['explanation', 'observation']);
        }
        // the cosine, rounding and reflection steps ask the learner to press the graph's own control
        for (const id of ['fixed-point-cosine-step', 'fixed-point-rounding-step', 'fixed-point-reflection-step']) {
            expect(fStep(id).observationPrompt.en, id).toMatch(/Show error bound/);
            expect(fStep(id).observationPrompt.sl, id).toMatch(/Pokaži oceno napake/);
        }
        expect(fStep('fixed-point-next-iterate-step').observationPrompt.en).toMatch(/Next step/);
        expect(fStep('fixed-point-next-iterate-step').observationPrompt.sl).toMatch(/Naslednji korak/);
        // the one step that explains the contraction shows the bound, with its calculation
        expect(adaptedActions('fixed-point-contraction-step')).toContainEqual(show);
        expect(fStep('fixed-point-contraction-step').frames.map(frame => frame.kind)).toEqual(['explanation', 'calculation', 'observation']);
        // the results of the predictions are recapped in the next step
        expect(fStep('fixed-point-next-iterate-step').expectedObservations[1].en).toContain('0.75');
        expect(fStep('fixed-point-next-iterate-step').explanation.en).toContain('x_1=\\frac12');
    });

    test('the scenes encode the independently derived configurations', () => {
        const scene = (id: string) => ({kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'});
        expect(adaptedActions('fixed-point-cobweb-step')).toEqual([scene('fixed-point-cobweb-scene'), hide]);
        expect(adaptedActions('fixed-point-next-iterate-step').slice(1)).toEqual([...advances(1), hide]);
        expect(adaptedActions('fixed-point-contraction-step').slice(1)).toEqual([...advances(3), show]);
        expect(adaptedActions('fixed-point-cosine-step').slice(1)).toEqual([example('cosine'), ...advances(8), hide]);
        expect(adaptedActions('fixed-point-rounding-step').slice(1)).toEqual([param('fixed-point-digits', 8), ...advances(27), hide]);
        expect(adaptedActions('fixed-point-reflection-step').slice(1)).toEqual([example('reflection'), ...advances(4), hide]);
        expect(adaptedActions('fixed-point-free-exploration').slice(1)).toEqual([example('cosine'), param('fixed-point-x0', 1), hide]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives (independent arithmetic)', () => {
        // affine (x + 1) / 2 from 0: x_k = 1 - 2^-k, the a posteriori bound q/(1 - q) |x_k - x_{k-1}| = 2^-k for q = 1/2
        const affine = [0];
        for (let k = 1; k <= 30; k++) affine.push((affine[k - 1] + 1) / 2);
        expect([affine[1], affine[2], affine[3]]).toEqual([0.5, 0.75, 0.875]);
        expect(affine[3] - affine[2]).toBe(0.125);
        const bound = (k: number) => Math.abs(affine[k] - affine[k - 1]);
        const stop = (tolerance: number) => affine.findIndex((_, k) => k >= 1 && bound(k) < tolerance);
        expect(stop(1e-3)).toBe(10);
        expect(bound(9)).toBeGreaterThanOrEqual(1e-3);
        expect(stop(1e-6)).toBe(20);
        expect(bound(19)).toBeGreaterThanOrEqual(1e-6);
        expect(stop(1e-8)).toBe(27);
        expect(bound(26)).toBeGreaterThanOrEqual(1e-8);
        expect(2 ** -27).toBeCloseTo(7.45e-9, 11);
        expect(1 - affine[27]).toBe(2 ** -27);
        expect(affine[27].toFixed(6)).toBe('1.000000');
        expect(affine[27]).not.toBe(1);
        // cosine: q = sin 1, the fixed point is the Dottie number 0.7390851332151607 (reference value, not computed by the app)
        const q = Math.sin(1);
        const star = 0.7390851332151607;
        const cosine = [0];
        for (let k = 1; k <= 30; k++) cosine.push(Math.cos(cosine[k - 1]));
        expect(q).toBeCloseTo(0.8415, 4);
        expect(cosine[8]).toBeCloseTo(0.722102, 6);
        expect(Math.abs(cosine[8] - star)).toBeCloseTo(0.017, 3);
        const posteriori = (k: number) => q / (1 - q) * Math.abs(cosine[k] - cosine[k - 1]);
        const priori = (k: number) => q ** k / (1 - q) * Math.abs(cosine[1] - cosine[0]);
        expect(posteriori(8)).toBeCloseTo(0.2222, 4);
        expect(priori(8)).toBeCloseTo(1.586, 3);
        expect(posteriori(8)).toBeGreaterThan(Math.abs(cosine[8] - star));
        expect(priori(8)).toBeGreaterThan(Math.abs(cosine[8] - star));
        expect(cosine.findIndex((_, k) => k >= 1 && posteriori(k) < 1e-3)).toBe(22);
        const fromOne = [1];
        for (let k = 1; k <= 30; k++) fromOne.push(Math.cos(fromOne[k - 1]));
        const fromOneBound = (k: number) => q / (1 - q) * Math.abs(fromOne[k] - fromOne[k - 1]);
        expect(fromOne.findIndex((_, k) => k >= 1 && fromOneBound(k) < 1e-3)).toBe(21);
        expect(fromOne[21]).toBeCloseTo(0.739018, 6);
        expect(fromOneBound(21)).toBeCloseTo(0.000882, 6);
        // 1 - x: the two-cycle 0.2, 0.8 (T(T(x)) = x) and |T'| = 1
        expect(1 - 0.2).toBe(0.8);
        expect(Math.round((1 - 0.8) * 100)).toBe(20);
        // the numbers in the prose
        expect(fStep('fixed-point-contraction-step').expectedObservations[1].en).toContain('step \\(10\\)');
        expect(fStep('fixed-point-contraction-step').expectedObservations[1].en).toContain('step \\(20\\)');
        expect(fStep('fixed-point-cosine-step').expectedObservations[1].en).toContain('step \\(22\\)');
        expect(fStep('fixed-point-cosine-step').expectedObservations[1].sl).toContain('0{,}2222');
        expect(fStep('fixed-point-cosine-step').expectedObservations[1].sl).toContain('1{,}586');
        expect(fStep('fixed-point-rounding-step').expectedObservations[1].en).toContain('7.451\\cdot10^{-9}');
        expect(fStep('fixed-point-free-exploration').expectedObservations[0].en).toContain('step \\(21\\)');
        const worked = fixedLesson.workedExamples[0];
        expect(worked.calculationLatex).toContain('1-2^{-k}');
        expect(worked.resultLatex).toContain('2^{-10}=\\tfrac1{1024}<10^{-3}');
        expect(fixedLesson.formulaBlocks.find(block => block.id === 'fixed-point-reflection')!.latex).toContain('T(T(x))=x');
    });

    test('the lesson-facing vocabulary is closed: the new parameter names, the example choice, the bound element and the fixed-point command', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['fixed-point-x0', 'fixed-point-digits', 'sequence-epsilon', 'x0']));
        expect(FUNCTION_CHOICE_NAMES).toContain('fixed-point-example');
        expect(FUNCTION_CHOICE_VALUES['fixed-point-example']).toEqual(['affine', 'cosine', 'reflection']);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('fixed-point-bound');
        expect(adapted().steps.flatMap(step => step.scene!.actions)).toContainEqual(advance);
    });
});

describe('the uniform convergence lesson', () => {
    const uniformLesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'uniform-convergence')!;
    const uStep = (id: string) => uniformLesson.steps.find(step => step.id === id)!;
    const adapted = () => getLessonForDemonstration('uniform-convergence')!;
    const adaptedActions = (id: string) => adapted().steps.find(step => step.id === id)!.scene!.actions;
    const hide = {kind: 'function-visibility', target: 'uniform-supremum', visible: false};
    const show = {kind: 'function-visibility', target: 'uniform-supremum', visible: true};
    const param = (name: string, value: number) => ({kind: 'function-parameter', name, value});
    const ids = ['uniform-scaled-step', 'uniform-whole-interval-step', 'uniform-supremum-one-step', 'uniform-pointwise-step', 'uniform-supremum-step',
        'uniform-shared-n-step', 'uniform-domain-change-step', 'uniform-free-exploration'];
    const predictionSteps = ids.filter(id => id !== 'uniform-shared-n-step');

    test('has the steps in order and is adapted under the guided id', () => {
        expect(uniformLesson.steps.map(step => step.id)).toEqual(ids);
        expect(adapted().id).toBe('uniform-convergence-guided');
        expect(adapted().steps).toHaveLength(8);
        expect(adapted().steps.flatMap(step => step.frames ?? []).some(frame => frame.animation)).toBe(false);
        expect(uniformLesson.steps.reduce((count, step) => count + step.frames.length, 0)).toBe(17);
        expect(getGuidedLesson('uniform-convergence')).toBe(uniformLesson);
        expect(isGuidedLessonAvailable('uniform-convergence')).toBe(true);
    });

    test('states the prerequisites, the domain-change rule, the sources and the handoff', () => {
        const prerequisites = (language: 'sl' | 'en') => uniformLesson.prerequisites.map(item => item[language]).join(' ');
        expect(prerequisites('en')).toMatch(/supremum/);
        expect(prerequisites('sl')).toMatch(/supremuma/);
        expect(uStep('uniform-domain-change-step').explanation.en).toMatch(/new comparison/);
        expect(uStep('uniform-domain-change-step').explanation.sl).toMatch(/nova primerjava/);
        expect(uStep('uniform-domain-change-step').explanation.en).toMatch(/not a continuation/);
        expect(uStep('uniform-supremum-one-step').explanation.en).toMatch(/the jump is not joined/);
        expect(uStep('uniform-free-exploration').explanation.en).toMatch(/explore on your own/);
        expect(uStep('uniform-free-exploration').explanation.sl).toMatch(/raziskuj sam/);
        expect(uniformLesson.sources.some(source => /Globevnik/.test(source.citation) && /Analiza I/.test(source.citation) && /6\.7/.test(source.citation))).toBe(true);
        expect(uniformLesson.unresolvedQuestions.map(item => item.en).join(' ')).toMatch(/not checked in the PDF/);
        const implementation = uniformLesson.sources.find(source => source.citation.startsWith('Bezeg source:'))!;
        expect(implementation.citation).toContain('src/analysis/uniformConvergence.ts');
        expect(implementation.citation).toContain('src/graphs/functions/UniformConvergenceGraph.tsx');
        expect(implementation.implementationCorrespondence).toMatch(/never a maximum over sampled points/);
        expect(implementation.implementationCorrespondence).toMatch(/never clamped/);
    });

    test('asks for a prediction before every reveal, and the scene of a prediction step never shows the supremum', () => {
        for (const id of predictionSteps) {
            expect(uStep(id).observationPrompt.en, id).toMatch(/Predict/);
            expect(uStep(id).observationPrompt.sl, id).toMatch(/Napovej/);
            const actions = adaptedActions(id);
            expect(actions.some(action => action.kind === 'function-visibility' && action.visible), id).toBe(false);
            expect(actions).toContainEqual(hide);
            expect(uStep(id).frames.map(frame => frame.kind), id).toEqual(['explanation', 'observation']);
        }
        for (const id of ['uniform-scaled-step', 'uniform-supremum-step', 'uniform-supremum-one-step', 'uniform-domain-change-step', 'uniform-free-exploration']) {
            expect(uStep(id).observationPrompt.en, id).toMatch(/Show supremum/);
            expect(uStep(id).observationPrompt.sl, id).toMatch(/Pokaži supremum/);
        }
        expect(adaptedActions('uniform-shared-n-step')).toContainEqual(show);
        expect(uStep('uniform-shared-n-step').frames.map(frame => frame.kind)).toEqual(['explanation', 'calculation', 'observation']);
        // the prediction's result is in expectedObservations and recapped in the next step
        expect(uStep('uniform-supremum-step').expectedObservations[0].en).toContain('0.32768');
        expect(uStep('uniform-shared-n-step').explanation.en).toContain('0.32768');
        expect(uStep('uniform-shared-n-step').explanation.en).toContain('N=11');
    });

    test('the scenes encode the independently derived configurations', () => {
        const scene = (id: string) => ({kind: 'prepared-scene', sceneId: id, source: 'demonstration-default'});
        expect(adaptedActions('uniform-scaled-step').slice(1)).toEqual([{kind: 'function-choice', name: 'uniform-example', value: 'scaled'}, param('uniform-n', 4), hide]);
        expect(adaptedActions('uniform-pointwise-step')).toEqual([scene('uniform-pointwise-scene'), param('uniform-n', 2), hide]);
        expect(adaptedActions('uniform-supremum-step')).toEqual([scene('uniform-supremum-scene'), hide]);
        expect(adaptedActions('uniform-shared-n-step').slice(1)).toEqual([param('uniform-n', 11), show]);
        expect(adaptedActions('uniform-whole-interval-step').slice(1)).toEqual([param('uniform-r', 1), param('uniform-x', 0.9), hide]);
        expect(adaptedActions('uniform-supremum-one-step').slice(1)).toEqual([param('uniform-r', 1), param('uniform-x', 0.9), param('uniform-n', 10), hide]);
        expect(adaptedActions('uniform-domain-change-step').slice(1)).toEqual([param('uniform-r', 0.95), param('uniform-n', 44), hide]);
        expect(adaptedActions('uniform-free-exploration').slice(1)).toEqual([{kind: 'function-choice', name: 'uniform-example', value: 'scaled'}, hide]);
    });

    test('the numbers stated in the prose are the ones the mathematics gives (independent arithmetic)', () => {
        const least = (base: number, epsilon: number) => { let n = 1; while (!(base ** n < epsilon)) n++; return n; };
        expect(least(0.5, 0.1)).toBe(4);
        expect(least(0.8, 0.1)).toBe(11);
        expect(least(0.9, 0.1)).toBe(22);
        expect(least(0.99, 0.1)).toBe(230);
        expect(least(0.95, 0.1)).toBe(45);
        expect(0.8 ** 5).toBeCloseTo(0.32768, 12);
        expect(0.8 ** 10).toBeCloseTo(0.1074, 4);
        expect(0.8 ** 11).toBeCloseTo(0.0859, 4);
        expect(0.95 ** 44).toBeCloseTo(0.1047, 4);
        expect(0.95 ** 45).toBeCloseTo(0.0994, 4);
        expect(0.9 ** 5).toBeCloseTo(0.59049, 12);
        expect(0.9 ** 10).toBeCloseTo(0.35, 2);
        // exact fractions of the worked example: (4/5)^10 > 1/10 > (4/5)^11
        expect(4 ** 10).toBe(1048576);
        expect(5 ** 10).toBe(9765625);
        expect(4 ** 11).toBe(4194304);
        expect(5 ** 11).toBe(48828125);
        expect(1048576 * 10).toBeGreaterThan(9765625);
        expect(4194304 * 10).toBeLessThan(48828125);
        const worked = uniformLesson.workedExamples[0];
        expect(worked.calculationLatex).toContain('1048576}{9765625}');
        expect(worked.calculationLatex).toContain('4194304}{48828125}');
        expect(uStep('uniform-whole-interval-step').expectedObservations[1].en).toContain('N(0.99)=230');
        expect(uStep('uniform-domain-change-step').expectedObservations[0].en).toContain('N=45');
        expect(uniformLesson.formulaBlocks.find(block => block.id === 'uniform-scaled-threshold')!.latex).toContain('+1');
    });

    test('begins with x/n on [0,1], then x^n on [0,1], then [0,0.8]; the numbers match the analysis functions', () => {
        const scaled = uniformExample('scaled');
        const power = uniformExample('power');
        const index = (id: string) => uniformLesson.steps.findIndex(step => step.id === id);
        expect(index('uniform-scaled-step')).toBe(0);
        expect(index('uniform-whole-interval-step')).toBeLessThan(index('uniform-pointwise-step'));
        expect(index('uniform-supremum-one-step')).toBeLessThan(index('uniform-pointwise-step'));
        expect(index('uniform-pointwise-step')).toBeLessThan(index('uniform-domain-change-step'));
        // sup over [0,1] of |x/n| is 1/n, attained at x = 1, and no sampled error exceeds it
        for (let n = 1; n <= 50; n++) {
            expect(uniformSupremum(scaled, 1, n)).toEqual({value: 1 / n, attained: true, at: 1});
            for (let x = 0; x <= 100; x++) expect(uniformPointwiseError(scaled, 1, n, x / 100)).toBeLessThanOrEqual(1 / n);
        }
        expect(uniformPointwiseError(scaled, 1, 4, 0.5)).toBe(0.125);
        expect(uniformSupremum(scaled, 1, 4).value).toBe(0.25);
        expect(uniformThreshold(scaled, 1, 0.1)).toEqual({kind: 'threshold', n: 11});
        expect(1 / 11 < 0.1 && 1 / 10 < 0.1).toBe(false);
        expect(uniformPointwiseThreshold(scaled, 1, 0.5, 0.1)).toEqual({kind: 'threshold', n: 6});
        const first = uStep('uniform-scaled-step');
        expect(first.expectedObservations[0].en).toContain('0.25');
        expect(first.expectedObservations[1].en).toContain('N=11');
        expect(first.expectedObservations[1].en).toContain('N(0.5)=6');
        // 0.8^11 < 0.1 < 0.8^10, and the shared N on [0, 0.8]
        expect(0.8 ** 11).toBeLessThan(0.1);
        expect(0.8 ** 10).toBeGreaterThan(0.1);
        expect(uniformThreshold(power, 0.8, 0.1)).toEqual({kind: 'threshold', n: 11});
        // x^n on [0,1]: limit 0 below one, 1 at one, supremum error 1 not attained, the endpoint error is 0 and no witness
        expect(uniformLimit(power, 1, 0.5)).toBe(0);
        expect(uniformLimit(power, 1, 1)).toBe(1);
        for (const n of [1, 10, 50]) {
            expect(uniformSupremum(power, 1, n)).toEqual({value: 1, attained: false, at: 1});
            expect(uniformPointwiseError(power, 1, n, 1)).toBe(0);
            for (let x = 0; x <= 100; x++) expect(uniformPointwiseError(power, 1, n, x / 100)).toBeLessThan(1);
        }
        expect(uniformThreshold(power, 1, 0.1)).toEqual({kind: 'none'});
        expect(uStep('uniform-supremum-one-step').expectedObservations[0].en).toContain('so the endpoint is no witness');
        expect(uStep('uniform-supremum-one-step').expectedObservations[0].sl).toMatch(/krajišče ni priča supremuma/);
        expect(uStep('uniform-pointwise-step').explanation.en).toMatch(/new comparison/);
    });

    test('the lesson-facing vocabulary is closed', () => {
        expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['uniform-r', 'uniform-n', 'uniform-x', 'uniform-epsilon']));
        expect(FUNCTION_CHOICE_NAMES).toContain('uniform-example');
        expect(FUNCTION_CHOICE_VALUES['uniform-example']).toEqual(['power', 'scaled']);
        expect(FUNCTION_VISIBILITY_TARGETS).toContain('uniform-supremum');
    });
});
