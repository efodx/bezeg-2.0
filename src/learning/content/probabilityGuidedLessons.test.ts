import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {probabilityGuidedLessons} from './probabilityGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {densityAreaView} from '../../analysis/densityAreaModel';
import type {DensityAreaModel} from '../../analysis/densityAreaModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = probabilityGuidedLessons.find(entry => entry.demonstrationId === 'prob-density')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])].join(' ');
const proseHas = (stepId: string, quoted: string, language: 'sl' | 'en') =>
    prose(stepOf(stepId), language).includes(language === 'sl' ? quoted.replace(',', '{,}') : quoted.replace(',', '.'));
const STEP_IDS = ['density-total', 'density-bounds', 'density-one-sigma', 'density-shape', 'density-iq', 'density-explore'];

function mount() {
    const graph = createGraph('prob-density');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type Harness = ReturnType<typeof mount>;

const readout = (id: string) => (document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '').replace(/−/g, '-');
const model = (h: Harness) => h.graph.state as unknown as DensityAreaModel;
const param = (name: 'density-mu' | 'density-sigma' | 'density-a' | 'density-b', value: number): LessonAction => ({kind: 'function-parameter', name, value});

test('the lesson has six steps with two frames each, math-delimited prose in both languages and only density actions', () => {
    expect(lesson.steps.map(step => step.id)).toEqual(STEP_IDS);
    for (const step of lesson.steps) {
        expect(step.frames).toHaveLength(2);
        expect(prose(step, 'sl').length).toBeGreaterThan(0);
        expect(prose(step, 'en').length).toBeGreaterThan(0);
        for (const action of actionsOf(step)) {
            expect(['prepared-scene', 'function-parameter', 'function-choice']).toContain(action.kind);
            if (action.kind === 'function-parameter') expect(['density-mu', 'density-sigma', 'density-a', 'density-b']).toContain(action.name);
            if (action.kind === 'function-choice') expect(action.name).toBe('density-example');
        }
    }
});

test('each density scene sets the example, mu, sigma and the bounds its text describes and shows the quoted readout, in one synchronous sequence', () => {
    const h = mount();
    try {
        // Step 1: the wide interval, the total area.
        h.scene(stepOf('density-total'));
        expect(model(h)).toMatchObject({mu: 0, sigma: 1, a: -4, b: 4});
        expect(readout('area-percent')).toBe('99,99');
        expect(densityAreaView(model(h)).probability).toBeCloseTo(0.99994, 5);

        // Step 2: a = -1,5 and b = 0,5.
        h.scene(stepOf('density-bounds'));
        expect(model(h)).toMatchObject({mu: 0, sigma: 1, a: -1.5, b: 0.5});
        expect(readout('area-percent')).toBe('62,47');
        expect(readout('area')).toBe('0,62466');
        expect(densityAreaView(model(h)).probability).toBeCloseTo(0.62466, 5);
        // The text's one-half check (a = -6, b = 0) and the equal bounds (area 0).
        h.apply(param('density-a', -6), param('density-b', 0));
        expect(readout('area-percent')).toBe('50');
        h.apply(param('density-a', 0));
        expect(readout('area-percent')).toBe('0');

        // Step 3: mu +- sigma reveals 68,27 % and the 2 sigma and 3 sigma shares and the outside share.
        h.scene(stepOf('density-one-sigma'));
        expect(model(h)).toMatchObject({a: -1, b: 1});
        expect(readout('area-percent')).toBe('68,27');
        expect(readout('area')).toBe('0,68269');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '1']);
        h.apply(param('density-a', -2), param('density-b', 2));
        expect(readout('area-percent')).toBe('95,45');
        h.apply(param('density-a', -3), param('density-b', 3));
        expect(readout('area-percent')).toBe('99,73');
        expect(100 - 68.27).toBeCloseTo(31.73, 10);

        // Step 4: N(1; 1,5^2) with mu -+ sigma, and the second case of the text.
        h.scene(stepOf('density-shape'));
        expect(model(h)).toMatchObject({mu: 1, sigma: 1.5, a: -0.5, b: 2.5});
        expect(readout('area-percent')).toBe('68,27');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '1']);
        h.apply(param('density-mu', -1), param('density-sigma', 0.85), param('density-a', -1.85), param('density-b', -0.15));
        expect(model(h)).toMatchObject({mu: -1, sigma: 0.85, a: -1.85, b: -0.15});
        expect(readout('area-percent')).toBe('68,27');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '1']);

        // Step 5: N(100; 15^2), P(85 <= X <= 130) = Phi(2) - Phi(-1).
        h.scene(stepOf('density-iq'));
        expect(model(h)).toMatchObject({mu: 100, sigma: 15, a: 85, b: 130});
        expect(readout('area-percent')).toBe('81,86');
        expect(readout('area')).toBe('0,81859');
        expect([readout('za'), readout('zb')]).toEqual(['-1', '2']);
        h.apply(param('density-a', 70));
        expect(readout('area-percent')).toBe('95,45');

        // Step 6: back at the default, and the tails the text mentions.
        h.scene(stepOf('density-explore'));
        expect(model(h)).toMatchObject({mu: 0, sigma: 1, a: -1, b: 1});
        expect(readout('area-percent')).toBe('68,27');
        h.apply(param('density-a', -6), param('density-b', 0));
        expect(readout('area-percent')).toBe('50');
        h.apply(param('density-a', 2), param('density-b', 6));
        expect(densityAreaView(model(h)).probability * 100).toBeCloseTo(2.275, 2);
    } finally {
        h.mounted.view.unmount();
    }
});

test('every number the prose quotes appears in both languages, with the decimal comma only in Slovenian', () => {
    const quoted: ReadonlyArray<readonly [string, readonly string[]]> = [
        ['density-total', ['99,99']],
        ['density-bounds', ['62,47', '0,62466', '-1,5', '0,5']],
        ['density-one-sigma', ['68,27', '0,68269', '95,45', '99,73', '31,73']],
        ['density-shape', ['68,27', '1,5', '-0,5', '2,5', '0,85', '-1,85', '-0,15']],
        ['density-iq', ['81,86', '0,81859', '95,45']],
        ['density-explore', ['2,3']],
    ];
    for (const [stepId, numbers] of quoted) {
        for (const value of numbers) {
            expect(proseHas(stepId, value, 'sl'), `${stepId} sl ${value}`).toBe(true);
            expect(proseHas(stepId, value, 'en'), `${stepId} en ${value}`).toBe(true);
        }
    }
});

test('the prose says area under the density, labels 68-95-99,7 as a normal-law property and never calls a point a probability', () => {
    const all = (language: 'sl' | 'en') => lesson.steps.map(step => prose(step, language)).join(' ') + lesson.formulaBlocks.map(block => block.explanation[language]).join(' ');
    expect(all('sl')).toMatch(/ploščin/);
    expect(all('en')).toMatch(/area under the density/);
    expect(lesson.formulaBlocks[0].explanation.en).toMatch(/property of the normal distribution/);
    expect(lesson.formulaBlocks[0].explanation.sl).toMatch(/lastnost normalne porazdelitve/);
    expect(lesson.formulaBlocks[0].explanation.en).toMatch(/single value has probability/);
    expect(all('en')).not.toMatch(/probability of the point/i);
    expect(all('sl')).not.toMatch(/verjetnost točke/i);
});
