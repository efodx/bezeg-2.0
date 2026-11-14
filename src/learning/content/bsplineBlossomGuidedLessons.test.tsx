import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {
    BLOSSOM_DIAGONAL_ARGS, BLOSSOM_FIXTURE, BLOSSOM_PAIR_ARGS, BLOSSOM_PREDICT_ARGS, BLOSSOM_SWAPPED_ARGS, bsplineBlossomGuidedLessons,
} from './bsplineBlossomGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import type {BSplineBlossomState} from '../../graphs/curves/bspline/BSplineBlossomGraph';
import type {BlossomSnapshot, CurveCheck} from '../../graphs/curves/bspline/bsplineBlossomModel';
import {blossomSnapshot} from '../../graphs/curves/bspline/bsplineBlossomModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = bsplineBlossomGuidedLessons.find(entry => entry.demonstrationId === 'bspline-blossom')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const num = (value: number | string, language: 'sl' | 'en') => (language === 'sl' ? String(value).replace('.', '{,}') : String(value));
const near = (a: readonly number[], b: readonly number[], tolerance = 1e-12) => {
    expect(a).toHaveLength(b.length);
    a.forEach((x, k) => expect(Math.abs(x - b[k]), `${a} vs ${b}`).toBeLessThan(tolerance));
};

type BlossomGraph = {state: BSplineBlossomState; snapshot(): BlossomSnapshot | undefined; curveCheck(): CurveCheck | undefined};

function mount() {
    const graph = createGraph('bspline-blossom');
    const blossom = graph as unknown as BlossomGraph;
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        mounted, capabilities,
        state: () => blossom.state,
        snap: () => blossom.snapshot()!,
        check: () => blossom.curveCheck(),
        apply: (action: LessonAction) => act(() => capabilities.apply(action)),
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        readout: (name: string) => mounted.view.container.querySelector(`[data-blossom-readout="${name}"]`),
    };
}

const setArgs = (args: readonly number[]): LessonAction => ({kind: 'blossom', operation: 'set-args', args});
const setBezier = (visible: boolean): LessonAction => ({kind: 'blossom', operation: 'set-bezier', visible});
const setSegment = (segment: number): LessonAction => ({kind: 'blossom', operation: 'set-segment', segment});
const setDegree = (degree: number): LessonAction => ({kind: 'blossom', operation: 'set-degree', degree});
const reset: LessonAction = {kind: 'blossom', operation: 'reset'};

describe('the scenes show the spec numbers on the real graph', () => {
    test('the steps run in one synchronous sequence with the blossom values of the spec', () => {
        const m = mount();
        try {
            // Step 1: f(0,1) is the second control point (1, 2); the Bezier points are hidden.
            m.scene(stepOf('bspline-blossom-predict'));
            expect(m.state().degree).toBe(2);
            expect(m.state().knots).toEqual(BLOSSOM_FIXTURE.knots);
            expect(m.state().segment).toBe(2);
            expect(m.state().args.slice(0, 2)).toEqual(BLOSSOM_PREDICT_ARGS);
            expect(m.state().showBezier).toBe(false);
            near(m.snap().value, [1, 2]);
            near(m.snap().levels[0][1], [1, 2]);

            // Step 2: (1/4, 3/4): two interpolations, (0.25, 0.5) and (1.25, 2), then (1, 1.625).
            m.scene(stepOf('bspline-blossom-pair'));
            expect(m.state().args.slice(0, 2)).toEqual(BLOSSOM_PAIR_ARGS);
            near(m.snap().levels[1][0], [0.25, 0.5]);
            near(m.snap().levels[1][1], [1.25, 2]);
            near(m.snap().value, [1, 1.625]);
            expect(m.check()).toBeUndefined();

            // Step 3: a = b = 1/2 is the de Boor triangle at 0.5 and the curve point; the readout says equal.
            m.scene(stepOf('bspline-blossom-diagonal'));
            expect(m.state().args.slice(0, 2)).toEqual(BLOSSOM_DIAGONAL_ARGS);
            near(m.snap().levels[1][0], [0.5, 1]);
            near(m.snap().levels[1][1], [1.5, 2]);
            near(m.snap().value, [1, 1.5]);
            expect(m.check()?.relation).toBe('equal');
            near(m.check()!.curve, [1, 1.5]);
            expect(m.readout('curve')?.getAttribute('data-blossom-relation')).toBe('equal');

            // Step 4: the swapped pair has other intermediate points and the same value; the symmetry deviation is zero.
            m.scene(stepOf('bspline-blossom-symmetry'));
            expect(m.state().args.slice(0, 2)).toEqual(BLOSSOM_SWAPPED_ARGS);
            near(m.snap().levels[1][0], [0.75, 1.5]);
            near(m.snap().levels[1][1], [1.75, 2]);
            near(m.snap().value, [1, 1.625]);
            near(m.snap().reversed, [1, 1.625]);
            expect(m.snap().deviation).toBeLessThan(1e-12);

            // Step 5: the Bezier points of [0,1] are f(0,0), f(0,1), f(1,1).
            m.scene(stepOf('bspline-blossom-bezier'));
            expect(m.state().showBezier).toBe(true);
            expect(m.snap().bezier).toHaveLength(3);
            near(m.snap().bezier[0], [0, 0]);
            near(m.snap().bezier[1], [1, 2]);
            near(m.snap().bezier[2], [2, 2]);
            expect(m.readout('bezier')?.textContent).toContain('2');

            // Step 6: the default curve with the default arguments (0, 1/2) and the Bezier points shown.
            m.scene(stepOf('bspline-blossom-explore'));
            expect(m.state().args.slice(0, 2)).toEqual([0, 0.5]);
            expect(m.state().showBezier).toBe(true);
            near(m.snap().value, [0.5, 1]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the spec control points are the blossom at the knots, and the diagonal on the segment is the curve', () => {
        const knots = BLOSSOM_FIXTURE.knots!, points = BLOSSOM_FIXTURE.points;
        const f = (a: number, b: number, segment = 2) => blossomSnapshot(knots, 2, points, segment, [a, b])!.value;
        near(f(0, 0), [0, 0]);
        near(f(0, 1), [1, 2]);
        near(f(1, 2, 3), [3, 2]);
        near(f(2, 2, 3), [4, 0]);
        near(f(0, 0.5), [0.5, 1]);
        near(f(0.5, 1), [1.5, 2]);
        near(f(0.5, 0.5), [1, 1.5]);
        // Symmetry to 1e-12 for pseudo-random pairs on both segments.
        let seed = 7;
        const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 40; i++) {
            const a = 2 * random(), b = 2 * random(), segment = i % 2 === 0 ? 2 : 3;
            near(f(a, b, segment), f(b, a, segment));
        }
    });

    test('the quoted numbers appear in the prose of both languages', () => {
        const quoted: Record<string, (number | string)[]> = {
            'bspline-blossom-predict': ['(1,2)'],
            'bspline-blossom-pair': ['0.25', '1.25', '1.625'],
            'bspline-blossom-diagonal': ['0.5', '1.5', '1.5'],
            'bspline-blossom-symmetry': ['0.75', '1.75', '1.625'],
        };
        for (const [id, values] of Object.entries(quoted)) {
            for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${value}`).toContain(num(value, language));
        }
        for (const language of ['sl', 'en'] as const) {
            for (const value of ['(0,0)', '(1,2)', '(2,2)']) expect(prose(stepOf('bspline-blossom-bezier'), language)).toContain(value);
        }
    });

    test('the readouts in the inspector show the value, the reversed order and the Bezier points', () => {
        const m = mount();
        try {
            m.scene(stepOf('bspline-blossom-symmetry'));
            expect(m.readout('value')?.textContent).toContain('1,625');
            expect(m.readout('reversed')?.textContent).toContain('1,625');
            expect(m.readout('symmetry')?.textContent).toContain('0');
            expect(m.readout('bezier')).not.toBeNull();
        } finally {
            m.mounted.view.unmount();
        }
    });
});

describe('the blossom actions', () => {
    test('set-args sets every argument through the control setter and refuses wrong counts and values off the domain', () => {
        const m = mount();
        try {
            m.apply(setArgs([0.25, 1.5]));
            expect(m.state().args.slice(0, 2)).toEqual([0.25, 1.5]);
            const args = m.state().args;
            expect(() => m.capabilities.apply(setArgs([0.5]))).toThrow(/2 arguments/);
            expect(() => m.capabilities.apply(setArgs([0.5, 0.5, 0.5]))).toThrow(/2 arguments/);
            expect(() => m.capabilities.apply(setArgs([0.5, 2.5]))).toThrow(/must lie/);
            expect(() => m.capabilities.apply(setArgs([-0.5, 1]))).toThrow(/must lie/);
            expect(() => m.capabilities.apply(setArgs([Number.NaN, 1]))).toThrow(/must lie/);
            expect(m.state().args).toEqual(args);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-segment chooses the segment and the Bezier points follow it', () => {
        const m = mount();
        try {
            m.apply(setSegment(3));
            expect(m.state().segment).toBe(3);
            near(m.snap().bezier[0], [2, 2]);
            near(m.snap().bezier[1], [3, 2]);
            near(m.snap().bezier[2], [4, 0]);
            m.apply(setArgs([1, 2]));
            near(m.snap().value, [3, 2]);
            for (const bad of [0, 1, 4, 9, 2.5, -1]) expect(() => m.capabilities.apply(setSegment(bad)), String(bad)).toThrow(/no segment/);
            expect(m.state().segment).toBe(3);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-degree switches between 2 and 3 and refuses anything else', () => {
        const m = mount();
        try {
            m.apply(setDegree(3));
            expect(m.state().degree).toBe(3);
            expect(m.state().knots).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
            m.apply(setArgs([0.25, 0.5, 0.75]));
            expect(m.state().args).toEqual([0.25, 0.5, 0.75]);
            expect(m.snap().bezier).toHaveLength(4);
            expect(m.snap().deviation).toBeLessThan(1e-12);
            m.apply(setDegree(2));
            expect(m.state().degree).toBe(2);
            for (const bad of [1, 4, 2.5, Number.NaN]) expect(() => m.capabilities.apply(setDegree(bad)), String(bad)).toThrow(/degree 2 and 3/);
            expect(m.state().degree).toBe(2);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-bezier shows and hides the Bezier points', () => {
        const m = mount();
        try {
            m.apply(setBezier(false));
            expect(m.state().showBezier).toBe(false);
            m.apply(setBezier(true));
            expect(m.state().showBezier).toBe(true);
            expect(() => m.capabilities.apply({kind: 'blossom', operation: 'set-bezier', visible: 'yes' as unknown as boolean})).toThrow(/boolean/);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('reset returns to the default segment, arguments and Bezier points', () => {
        const m = mount();
        try {
            m.apply(setBezier(false));
            m.apply(setSegment(3));
            m.apply(setArgs([1.5, 2]));
            m.apply(reset);
            expect(m.state().segment).toBe(2);
            expect(m.state().args.slice(0, 2)).toEqual([0, 0.5]);
            expect(m.state().showBezier).toBe(true);
            expect(m.state().degree).toBe(2);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('on these defaults f(t,t) equals the curve in the segment and coincides with it outside, as the readout says', () => {
        const m = mount();
        try {
            m.apply(setArgs([0.5, 0.5]));
            expect(m.check()?.relation).toBe('equal');
            m.apply(setArgs([1.5, 1.5]));
            expect(m.check()?.relation).toBe('coincides');
        } finally {
            m.mounted.view.unmount();
        }
    });
});

test('the L6 lesson has six steps with a prediction, a free last step and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('bspline-blossom-explore');
    expect(stepOf('bspline-blossom-predict').explanation.sl).toMatch(/Napovej/);
    expect(stepOf('bspline-blossom-predict').explanation.en).toMatch(/Predict/);
    for (const step of lesson.steps) for (const action of actionsOf(step).slice(1)) expect(action.kind).toBe('blossom');
    const all = JSON.stringify(lesson);
    for (const term of ['Cvetenje', 'polarna oblika', 'B-zlepek']) expect(all, term).toContain(term);
});
