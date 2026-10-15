import {analysisGuidedLessons} from './analysisGuidedLessons';
import {SUPPORTED_SCENE_ACTION_NAMES, getGuidedLesson} from './guidedLessons';
import {getLessonForDemonstration, isGuidedLessonAvailable, sceneAction} from '../runtime/lessonCatalog';
import {FUNCTION_CHOICE_NAMES, FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES} from '../model';
import {BISECTION_EXAMPLE_IDS, bisectionHistory} from '../../analysis/bisection';

const lesson = analysisGuidedLessons.find(entry => entry.demonstrationId === 'bisection')!;
const stepById = (id: string) => lesson.steps.find(step => step.id === id)!;

test('the analysis lessons are bounded, localized, source-backed and available', () => {
    expect(analysisGuidedLessons.map(entry => entry.demonstrationId)).toEqual(['bisection']);
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
