import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {bsplineInsertionGuidedLessons} from './bsplineInsertionGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {BSplineInsertionState} from '../../graphs/curves/bspline/BSplineInsertionGraph';
import {joinReports, multiplicityRows} from '../../graphs/curves/bspline/bsplineInsertionModel';
import {evaluate} from '../../bezeg/impl/curve/bspline';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = bsplineInsertionGuidedLessons.find(entry => entry.demonstrationId === 'bspline-insertion')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const num = (value: number | string, language: 'sl' | 'en') => (language === 'sl' ? String(value).replace('.', '{,}') : String(value));
const near = (a: readonly number[], b: readonly number[], digits = 12) => {
    expect(a).toHaveLength(b.length);
    a.forEach((x, k) => expect(Math.abs(x - b[k]), `${a} vs ${b}`).toBeLessThan(10 ** -digits));
};
const insert = (value: number): LessonAction => ({kind: 'knot-insertion', operation: 'insert', value});

type InsertionGraph = {state: BSplineInsertionState; jumpLines(): string[]};

function mount() {
    const graph = createGraph('bspline-insertion');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const insertion = graph as unknown as InsertionGraph;
    return {
        mounted, capabilities, graph: insertion,
        state: () => insertion.state,
        /** The curve value from the graph's own degree, knots and points. */
        curve: (t: number) => evaluate(insertion.state.knots, insertion.state.degree, insertion.state.points.map(p => [...p]), t),
        domain: (): [number, number] => {
            const {knots, degree} = insertion.state;
            return [knots[degree], knots[knots.length - degree - 1]];
        },
        apply: (action: LessonAction) => act(() => capabilities.apply(action)),
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        reset: () => act(() => capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'})),
    };
}

const QUADRATIC_KNOTS = [0, 0, 0, 1, 2, 2, 2];
const QUADRATIC_POINTS = [[0, 0], [1, 2], [3, 2], [4, 0]];
const CUBIC_KNOTS = [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3];
const CUBIC_POINTS = [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]];

describe('the scenes set the curve, insert knots and show the spec numbers on the real graph', () => {
    test('the steps run in one synchronous sequence and every quoted point equals the spec value', () => {
        const m = mount();
        try {
            // Step 1: the L2 example, nothing inserted.
            m.run(stepOf('bspline-insertion-predict'));
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.state().ghost).toEqual([]);
            expect(m.state().showComb).toBe(true);
            const samples = Array.from({length: 201}, (_, i) => i * 0.01);
            const original = samples.map(t => m.curve(t));

            // Step 2: insert u = 1: five points, the old polygon is the ghost, the curve is unchanged.
            m.run(stepOf('bspline-insertion-one'));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 1, 2, 2, 2]);
            near(m.state().points.flat(), [0, 0, 1, 2, 2, 2, 3, 2, 4, 0]);
            expect(m.state().ghost).toEqual(QUADRATIC_POINTS);
            samples.forEach((t, i) => near(m.curve(t), original[i]));
            expect(multiplicityRows(m.state().knots, 2)).toEqual([{knot: 1, multiplicity: 2, continuity: 0}]);

            // Step 3: u = 0.5 into the original curve (the fixture restores it first).
            m.run(stepOf('bspline-insertion-half'));
            near(m.state().knots, [0, 0, 0, 0.5, 1, 2, 2, 2]);
            near(m.state().points.flat(), [0, 0, 0.5, 1, 1.5, 2, 3, 2, 4, 0]);
            samples.forEach((t, i) => near(m.curve(t), original[i]));
            // The new points are the de Boor level-1 points at u = 0.5, so the curve point there is (1, 1.5).
            near(m.curve(0.5), [1, 1.5]);

            // Step 4: the cubic, comb hidden.
            m.run(stepOf('bspline-insertion-double'));
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(m.state().points).toEqual(CUBIC_POINTS);
            expect(m.state().example).toBe('cubic');
            expect(m.state().ghost).toEqual([]);
            expect(m.state().showComb).toBe(false);
            expect(multiplicityRows(CUBIC_KNOTS, 3)).toEqual([{knot: 1, multiplicity: 1, continuity: 2}, {knot: 2, multiplicity: 2, continuity: 1}]);

            // Step 5: the comb shows and the jump list reports kappa on both sides.
            m.run(stepOf('bspline-insertion-comb'));
            expect(m.state().showComb).toBe(true);
            expect(m.graph.jumpLines()).toEqual([
                'u = 1: κ −1,4311 → −1,4311, skok 0, tangenta zvezna',
                'u = 2: κ 2,6667 → 5,3333, skok 2,6667, tangenta zvezna',
            ]);
            act(() => setLanguage('en'));
            expect(m.graph.jumpLines()).toEqual([
                'u = 1: κ −1.4311 → −1.4311, jump 0, tangent continuous',
                'u = 2: κ 2.6667 → 5.3333, jump 2.6667, tangent continuous',
            ]);
            act(() => setLanguage('sl'));

            // Step 6: back to the default scene.
            m.scene(stepOf('bspline-insertion-explore'));
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.state().ghost).toEqual([]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quoted numbers appear in the prose of both languages', () => {
        const quoted: Record<string, (number | string)[]> = {
            'bspline-insertion-one': [2],
            'bspline-insertion-half': [0.5, 1.5, 1],
            'bspline-insertion-comb': [1.4311, 2.6667, 5.3333, 1.5],
        };
        for (const [id, values] of Object.entries(quoted)) {
            for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${value}`).toContain(num(value, language));
        }
    });

    test('the cubic has kappa -1.4311 on both sides of u = 1 and 8/3 then 16/3 at u = 2 with an equal tangent (1.5, 0)', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-insertion-comb'));
            const {knots, degree, points} = m.state();
            const [simple, double] = joinReports(knots, degree, points);
            expect([simple.t, double.t]).toEqual([1, 2]);
            expect(simple.kappaLeft).toBeCloseTo(-1.4311, 4);
            near([simple.kappaLeft!], [simple.kappaRight!]);
            near([double.kappaLeft!, double.kappaRight!, double.jump!], [8 / 3, 16 / 3, 8 / 3]);
            expect(double.tangentContinuous).toBe(true);
            expect(simple.tangentContinuous).toBe(true);
            // The one-sided first derivative at u = 2 is (1.5, 0) on both sides (one-sided differences of the kernel).
            const h = 1e-6, at = (t: number) => m.curve(t), c = at(2);
            const left = [0, 1].map(d => (c[d] - at(2 - h)[d]) / h), right = [0, 1].map(d => (at(2 + h)[d] - c[d]) / h);
            near(left, [1.5, 0], 4);
            near(right, [1.5, 0], 4);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('insertion leaves the cubic and every inserted quadratic knot on the same curve', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-insertion-double'));
            const [from, to] = m.domain();
            const samples = Array.from({length: 301}, (_, i) => from + (to - from) * i / 300);
            const before = samples.map(t => m.curve(t));
            m.apply(insert(0.5));
            m.apply(insert(2.5));
            m.apply(insert(1));
            expect(m.state().points).toHaveLength(10);
            samples.forEach((t, i) => near(m.curve(t), before[i]));
        } finally {
            m.mounted.view.unmount();
        }
    });
});

describe('refused insertions, Reset and the other lesson actions', () => {
    test('a value outside the domain, above multiplicity k + 1 or not finite throws and changes nothing', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-insertion-predict'));
            expect(() => m.capabilities.apply(insert(2.5))).toThrow(/refused/);
            expect(m.state().refusal?.reason).toBe('outside_domain');
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(() => m.capabilities.apply(insert(Number.NaN))).toThrow(/finite/);
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            // Multiplicity k + 1 = 3 is reachable, a fourth copy is refused.
            m.apply(insert(1));
            m.apply(insert(1));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 1, 1, 2, 2, 2]);
            const before = m.state().points;
            expect(() => m.capabilities.apply(insert(1))).toThrow(/refused/);
            expect(m.state().refusal?.reason).toBe('multiplicity_too_high');
            expect(m.state().points).toEqual(before);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the reset operation, a lesson scene and Reset restore the original knots and points', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-insertion-half'));
            m.apply(insert(1));
            expect(m.state().points).toHaveLength(6);
            m.apply({kind: 'knot-insertion', operation: 'reset'});
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.state().ghost).toEqual([]);
            m.run(stepOf('bspline-insertion-one'));
            m.scene(stepOf('bspline-insertion-predict'));
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            m.run(stepOf('bspline-insertion-one'));
            m.reset();
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.state().ghost).toEqual([]);
            act(() => setLanguage('en'));
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-example loads the cubic as the Reset target and set-comb toggles the comb', () => {
        const m = mount();
        try {
            m.apply({kind: 'knot-insertion', operation: 'set-example', exampleId: 'cubic'});
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(m.state().example).toBe('cubic');
            m.apply(insert(0.5));
            m.apply({kind: 'knot-insertion', operation: 'reset'});
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            m.apply({kind: 'knot-insertion', operation: 'set-comb', visible: false});
            expect(m.state().showComb).toBe(false);
            m.apply({kind: 'knot-insertion', operation: 'set-comb', visible: true});
            expect(m.state().showComb).toBe(true);
            expect(() => m.capabilities.apply({kind: 'knot-insertion', operation: 'set-example', exampleId: 'quartic' as 'cubic'})).toThrow(/Unknown/);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

test('the L3 lesson has six steps with predictions, a free last step and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('bspline-insertion-explore');
    for (const step of lesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    expect(actionsOf(stepOf('bspline-insertion-one')).filter(action => action.kind === 'knot-insertion' && action.operation === 'insert')).toEqual([insert(1)]);
    const all = JSON.stringify(lesson);
    for (const term of ['vozel', 'večkratnost', 'glavnik ukrivljenosti', 'zveznost']) expect(all, term).toContain(term);
});
