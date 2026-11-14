import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {bsplineDeBoorGuidedLessons} from './bsplineDeBoorGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import type {DeBoorGraphState} from '../../graphs/curves/bspline/DeBoorGraph';
import type {DeBoorScene} from '../../graphs/curves/bspline/DeBoorScene';
import {basisAll, evaluate} from '../../bezeg/impl/curve/bspline';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = bsplineDeBoorGuidedLessons.find(entry => entry.demonstrationId === 'bspline-deboor')!;
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
const next = {kind: 'animation', animationId: 'deboor', command: 'next-step'} as const;

type Element = {X(): number; Y(): number; evalVisProp(name: string): unknown};

function mount() {
    const graph = createGraph('bspline-deboor');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const deBoor = graph as unknown as {state: DeBoorGraphState; scene?: DeBoorScene; playing: boolean};
    const point = (element: Element): [number, number] => [element.X(), element.Y()];
    return {
        mounted, capabilities, graph: deBoor,
        state: () => deBoor.state,
        /** The point of entry `i` of level `r` as drawn on the board. */
        drawn: (r: number, i: number) => point(deBoor.scene!.levelElements(r)[i] as unknown as Element),
        /** The control points that carry a visible ring on the board (level 0). */
        ringed: () => (deBoor.scene!.ringElements() as unknown as Element[]).filter(ring => ring.evalVisProp('visible')).map(point),
        /** The curve value from the graph's own degree, knots and points. */
        curve: (t: number) => evaluate(deBoor.state.knots, deBoor.state.degree, deBoor.state.points.map(p => [...p]), t),
        /** The basis sum of the same data. */
        basisSum: (t: number) => {
            const {knots, degree, points} = deBoor.state;
            const values = basisAll(knots, degree, t);
            return [0, 1].map(d => values.reduce((sum, value, i) => sum + value * points[i][d], 0));
        },
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        reset: () => act(() => capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'})),
    };
}

describe('the scenes set the curve, t and the revealed levels and show the kernel values', () => {
    test('the steps run in one synchronous sequence and every quoted point is the kernel and basis-sum value', () => {
        const m = mount();
        try {
            // Step 1: t = 0.5, level 0.
            m.run(stepOf('bspline-deboor-predict'));
            expect(m.state().knots).toEqual([0, 0, 0, 1, 2, 2, 2]);
            expect(m.state().points).toEqual([[0, 0], [1, 2], [3, 2], [4, 0]]);
            expect([m.state().t, m.state().level]).toEqual([0.5, 0]);
            // Exactly k+1 = 3 rings, on the board, over P0, P1, P2.
            expect(m.ringed()).toEqual([[0, 0], [1, 2], [3, 2]]);

            // Step 2: t = 1.5 moves the three rings to P1, P2, P3.
            m.run(stepOf('bspline-deboor-slide'));
            expect(m.state().t).toBe(1.5);
            expect(m.ringed()).toEqual([[1, 2], [3, 2], [4, 0]]);
            expect(m.ringed()).toHaveLength(m.state().degree + 1);

            // Step 3: the whole triangle at t = 0.5, revealed by two next-step actions.
            m.run(stepOf('bspline-deboor-triangle'));
            expect([m.state().t, m.state().level]).toEqual([0.5, 2]);
            near(m.drawn(1, 0), [0.5, 1]);
            near(m.drawn(1, 1), [1.5, 2]);
            near(m.drawn(2, 0), [1, 1.5]);
            near(m.drawn(2, 0), m.basisSum(0.5));
            near(m.drawn(2, 0), m.curve(0.5));

            // t = 1.5: second span.
            act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: 1.5}));
            near(m.drawn(1, 0), [2.5, 2]);
            near(m.drawn(1, 1), [3.5, 1]);
            near(m.drawn(2, 0), [3, 1.5]);
            near(m.drawn(2, 0), m.basisSum(1.5));
            // t = 1: the knot.
            act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: 1}));
            near(m.drawn(2, 0), [2, 2]);
            near(m.drawn(2, 0), m.basisSum(1));

            // Step 4: P0 moved to (0, 1), t = 3/2: the point stays (3, 1.5) and P0 carries no ring.
            m.run(stepOf('bspline-deboor-local'));
            expect(m.state().points[0]).toEqual([0, 1]);
            expect(m.state().t).toBe(1.5);
            near(m.drawn(2, 0), [3, 1.5]);
            expect(m.ringed()).toEqual([[1, 2], [3, 2], [4, 0]]);
            act(() => m.capabilities.apply({kind: 'parameter', name: 't', value: 0.5}));
            near(m.drawn(2, 0), [1, 1.75]);

            // Step 5: the knot t = 1.
            m.run(stepOf('bspline-deboor-pieces'));
            expect(m.state().t).toBe(1);
            near(m.drawn(2, 0), [2, 2]);

            // Step 6: back to the default scene.
            m.scene(stepOf('bspline-deboor-explore'));
            expect(m.state().points).toEqual([[0, 0], [1, 2], [3, 2], [4, 0]]);
            expect([m.state().t, m.state().level]).toEqual([0.5, 0]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quoted numbers appear in the prose of both languages', () => {
        const quoted: Record<string, number[]> = {
            'bspline-deboor-slide': [1.5],
            'bspline-deboor-triangle': [0.5, 1.5, 2],
            'bspline-deboor-local': [1.5, 1.75],
            'bspline-deboor-pieces': [2],
        };
        for (const [id, values] of Object.entries(quoted)) {
            for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${value}`).toContain(num(value, language));
        }
    });

    test('moving P0 leaves the curve for t in (1, 2] unchanged and changes it before t = 1', () => {
        const m = mount();
        try {
            m.scene(stepOf('bspline-deboor-explore'));
            const samples = Array.from({length: 41}, (_, i) => i * 0.05);
            const before = samples.map(t => m.curve(t));
            m.scene(stepOf('bspline-deboor-local'));
            expect(m.state().points[0]).toEqual([0, 1]);
            const after = samples.map(t => m.curve(t));
            const right = samples.filter(t => t > 1);
            expect(right.length).toBeGreaterThanOrEqual(20);
            for (const t of right) near(after[samples.indexOf(t)], before[samples.indexOf(t)]);
            // Non-vacuous: some sample with t < 1 moved.
            const moved = samples.filter(t => t < 1).some(t => Math.abs(after[samples.indexOf(t)][1] - before[samples.indexOf(t)][1]) > 1e-3);
            expect(moved).toBe(true);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the curve lies in the convex hull of the active points of every span', () => {
        const m = mount();
        try {
            m.scene(stepOf('bspline-deboor-explore'));
            const {points} = m.state();
            // Span [0,1) uses P0..P2 and span [1,2) uses P1..P3; the three points are not collinear, so the hull is a triangle.
            const spans: [number, number, number][] = [[0, 1, 0], [1, 2, 1]];
            const cross = (o: readonly number[], a: readonly number[], b: readonly number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
            for (const [from, to, first] of spans) {
                const [a, b, c] = [points[first], points[first + 1], points[first + 2]];
                const sign = Math.sign(cross(a, b, c));
                expect(sign).not.toBe(0);
                for (let i = 0; i <= 20; i++) {
                    const t = from + (to - from) * i / 20;
                    if (t >= 2) continue;
                    const p = m.curve(t);
                    for (const [u, v] of [[a, b], [b, c], [c, a]]) expect(sign * cross(u, v, p), `t=${t}`).toBeGreaterThanOrEqual(-1e-12);
                }
            }
        } finally {
            m.mounted.view.unmount();
        }
    });
});

describe('the animation lesson action follows the iterative lifecycle', () => {
    test('next-step reveals the levels to k, reset returns to level 0 and playback is stopped', () => {
        const m = mount();
        try {
            const apply = (command: 'next-step' | 'reset' | 'play' | 'pause') => act(() => m.capabilities.apply({kind: 'animation', animationId: 'deboor', command}));
            expect(m.state().level).toBe(0);
            apply('next-step');
            expect(m.state().level).toBe(1);
            apply('next-step');
            expect(m.state().level).toBe(2);
            apply('next-step');
            expect(m.state().level).toBe(2);
            expect(m.graph.playing).toBe(false);
            apply('reset');
            expect(m.state().level).toBe(0);
            apply('play');
            expect(m.graph.playing).toBe(true);
            apply('pause');
            expect(m.graph.playing).toBe(false);
            apply('play');
            apply('reset');
            expect([m.state().level, m.graph.playing]).toEqual([0, false]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('a lesson scene, Reset and a language switch keep the state consistent', () => {
        const m = mount();
        try {
            m.scene(stepOf('bspline-deboor-triangle'));
            expect(m.state().level).toBe(2);
            m.scene(stepOf('bspline-deboor-slide'));
            expect([m.state().t, m.state().level]).toEqual([1.5, 0]);
            expect(m.graph.playing).toBe(false);
            m.run(stepOf('bspline-deboor-local'));
            m.reset();
            expect(m.state().points).toEqual([[0, 0], [1, 2], [3, 2], [4, 0]]);
            expect([m.state().t, m.state().level]).toEqual([0.5, 0]);
            m.run(stepOf('bspline-deboor-triangle'));
            act(() => setLanguage('en'));
            expect([m.state().t, m.state().level]).toEqual([0.5, 2]);
            near(m.drawn(2, 0), [1, 1.5]);
            expect(m.ringed()).toHaveLength(3);
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

test('the L2 lesson has six steps with predictions, a free last step and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('bspline-deboor-explore');
    for (const step of lesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    expect(actionsOf(stepOf('bspline-deboor-triangle')).filter(action => action.kind === 'animation')).toEqual([next, next]);
    const all = JSON.stringify(lesson);
    for (const term of ['B-zlepka', 'vozel', 'kontrolne točke', 'de Boorov postopek']) expect(all, term).toContain(term);
});
