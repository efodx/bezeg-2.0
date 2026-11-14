import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {bsplineBasisGuidedLessons} from './bsplineBasisGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import type {BSplineBasisGraphState} from '../../graphs/curves/bspline/BSplineBasisGraph';
import {allValuesAt} from '../../graphs/curves/bspline/bsplineBasisModel';
import {basisAll} from '../../bezeg/impl/curve/bspline';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = bsplineBasisGuidedLessons.find(entry => entry.demonstrationId === 'bspline-basis')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const num = (value: number | string, language: 'sl' | 'en') => (language === 'sl' ? String(value).replace('.', '{,}') : String(value));
const close = (a: readonly number[], b: readonly number[], digits = 12) => {
    expect(a).toHaveLength(b.length);
    a.forEach((x, k) => expect(Math.abs(x - b[k]), `${a} vs ${b}`).toBeLessThan(10 ** -digits));
};
const bernsteinQuadratic = (t: number) => [(1 - t) ** 2, 2 * t * (1 - t), t * t];

function mount() {
    const graph = createGraph('bspline-basis');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const basis = graph as unknown as {state: BSplineBasisGraphState; scene?: {curveElements(): readonly {dataX: number[]; dataY: number[]; updateDataArray(): void}[]}};
    return {
        mounted, capabilities,
        /** The state after the last action. */
        state: () => basis.state,
        /** The values the kernel gives for the graph's own current degree, knots and t. */
        values: () => allValuesAt(basis.state.knots, basis.state.degree, basis.state.t)!,
        /** The plotted value of function `i` at the sample nearest to the graph's t. */
        plotted: (i: number) => {
            const curve = basis.scene!.curveElements()[i];
            curve.updateDataArray();
            const at = curve.dataX.reduce((best, x, k) => Math.abs(x - basis.state.t) < Math.abs(curve.dataX[best] - basis.state.t) ? k : best, 0);
            expect(Math.abs(curve.dataX[at] - basis.state.t)).toBeLessThan(1e-9);
            return curve.dataY[at];
        },
        /** The actions of a step only, in one synchronous tick, without restoring first. */
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        reset: () => act(() => capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'})),
    };
}

describe('the scenes set the degree, the knots and t and show the kernel values', () => {
    test('the steps run in one synchronous sequence and every quoted value is the kernel value', () => {
        const m = mount();
        try {
            // Step 1: degree 1 hat, peak 1 at t = 1.
            m.run(stepOf('bspline-basis-hat'));
            expect(m.state().degree).toBe(1);
            expect(m.state().knots).toEqual([0, 0, 1, 2, 2]);
            expect(m.state().t).toBe(1);
            close(m.values(), [0, 1, 0]);
            close(m.values(), basisAll([0, 0, 1, 2, 2], 1, 1));

            // Step 2: quadratic default, t = 0.5.
            m.run(stepOf('bspline-basis-slide'));
            expect(m.state().degree).toBe(2);
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
            expect(m.state().t).toBe(0.5);
            close(m.values(), basisAll([0, 0, 0, 1, 2, 2, 2], 2, 0.5));
            close(m.values(), [0.25, 0.625, 0.125, 0]);
            expect(m.values().reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
            m.values().forEach((value, i) => expect(m.plotted(i)).toBeCloseTo(value, 9));

            // t = 1 (the slider moved by the same action the lessons use).
            act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: 1}));
            close(m.values(), [0, 0.5, 0.5, 0]);

            // Step 3: t = 1.5, the mirror of 0.5.
            m.run(stepOf('bspline-basis-mirror'));
            expect(m.state().t).toBe(1.5);
            close(m.values(), basisAll([0, 0, 0, 1, 2, 2, 2], 2, 1.5));
            close(m.values(), [0, 0.125, 0.625, 0.25]);
            expect(m.values().reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);

            // Step 4: one interior knot moved; N_0 and N_1 do not change, the others do and still sum to 1.
            const before = basisAll([0, 0, 0, 1, 2, 3, 4, 4, 4], 2, 2.5);
            m.run(stepOf('bspline-basis-locality'));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 3.5, 4, 4, 4]);
            expect(m.state().t).toBe(2.5);
            const after = m.values();
            close(after, basisAll([0, 0, 0, 1, 2, 3.5, 4, 4, 4], 2, 2.5));
            close(before, [0, 0, 0.125, 0.75, 0.125, 0]);
            close(after, [0, 0, 4 / 15, 0.65, 1 / 12, 0]);
            expect(after.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
            for (const t of [0.3, 1, 1.9, 2.5, 3.2]) {
                const old = basisAll([0, 0, 0, 1, 2, 3, 4, 4, 4], 2, t), moved = basisAll([0, 0, 0, 1, 2, 3.5, 4, 4, 4], 2, t);
                close(moved.slice(0, 2), old.slice(0, 2));
            }

            // Step 5: Bernstein.
            m.run(stepOf('bspline-basis-bernstein'));
            expect(m.state().degree).toBe(2);
            expect(m.state().knots).toEqual([0, 0, 0, 1, 1, 1]);
            expect(m.state().t).toBe(0.5);
            close(m.values(), bernsteinQuadratic(0.5));
            close(m.values(), [0.25, 0.5, 0.25]);
            for (const t of [0.1, 0.5, 0.9]) {
                act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: t}));
                close(m.values(), bernsteinQuadratic(t));
            }

            // Step 6: back to the default scene.
            m.run(stepOf('bspline-basis-explore'));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
            expect(m.state().degree).toBe(2);
            expect(m.state().t).toBe(0.5);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quoted numbers appear in the prose of both languages', () => {
        const quoted: Record<string, number[]> = {
            'bspline-basis-slide': [0.25, 0.625, 0.125],
            'bspline-basis-mirror': [0.125, 0.625, 0.25],
            'bspline-basis-locality': [0.125, 0.75, 0.65],
            'bspline-basis-bernstein': [0.25, 0.5],
        };
        for (const [id, values] of Object.entries(quoted)) {
            for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${value}`).toContain(num(value, language));
        }
    });

    test('a scene restored from a checkpoint after lesson steps gives the lesson default', () => {
        const m = mount();
        try {
            m.scene(stepOf('bspline-basis-locality'));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 3.5, 4, 4, 4]);
            m.scene(stepOf('bspline-basis-slide'));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
            expect(m.state().degree).toBe(2);
            expect(m.state().t).toBe(0.5);
            m.run(stepOf('bspline-basis-bernstein'));
            m.reset();
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
            expect(m.state().degree).toBe(2);
            expect(m.state().t).toBe(0.5);
            // The checkpoint taken at mount restores the same default.
            m.run(stepOf('bspline-basis-hat'));
            act(() => m.capabilities.restoreState(m.capabilities.captureState()));
            expect(m.state().degree).toBe(1);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the parameter action holds t inside the knot domain and refuses a non-finite value', () => {
        const m = mount();
        try {
            act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: 2.1}));
            expect(m.state().t).toBe(2);
            act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: -0.1}));
            expect(m.state().t).toBe(0);
            expect(() => m.capabilities.apply({kind: 'parameter', name: 't', value: Number.NaN})).toThrow();
            expect(m.state().t).toBe(0);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

test('the L1 lesson has six steps with predictions, a free last step and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('bspline-basis-explore');
    for (const step of lesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    const all = JSON.stringify(lesson);
    for (const term of ['B-zlepek', 'vozel', 'bazn', 'pritrjen vozelni vektor']) expect(all, term).toContain(term);
});
