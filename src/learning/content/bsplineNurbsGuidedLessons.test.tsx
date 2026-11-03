import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {
    bsplineNurbsGuidedLessons, NURBS_CIRCLE_FIXTURE, NURBS_CORNER_INDICES, NURBS_T_EIGHTH, NURBS_T_SIXTEENTH, NURBS_UNIT_FIXTURE,
} from './bsplineNurbsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {BSplineNurbsState} from '../../graphs/curves/bspline/BSplineNurbsGraph';
import {angleDegrees} from '../../graphs/curves/bspline/bsplineNurbsModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = bsplineNurbsGuidedLessons.find(entry => entry.demonstrationId === 'bspline-nurbs')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const num = (value: number | string, language: 'sl' | 'en') => (language === 'sl' ? String(value).replace('.', '{,}') : String(value));
const SQRT_HALF = Math.SQRT1_2;
const near = (a: readonly number[], b: readonly number[], tolerance = 1e-12) => {
    expect(a).toHaveLength(b.length);
    a.forEach((x, k) => expect(Math.abs(x - b[k]), `${a} vs ${b}`).toBeLessThan(tolerance));
};

type NurbsGraph = {state: BSplineNurbsState; radialError(): number; markerPoint(): readonly [number, number] | undefined};

function mount() {
    const graph = createGraph('bspline-nurbs');
    const nurbs = graph as unknown as NurbsGraph;
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        mounted, capabilities, graph: nurbs,
        state: () => nurbs.state,
        error: () => nurbs.radialError(),
        point: () => nurbs.markerPoint()!,
        apply: (action: LessonAction) => act(() => capabilities.apply(action)),
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        readout: (name: string) => m_readout(mounted.view.container, name),
    };
}
const m_readout = (container: HTMLElement, name: string) => container.querySelector(`[data-nurbs-readout="${name}"]`)?.textContent ?? '';

const circleAction = (operation: 'reset'): LessonAction => ({kind: 'nurbs-circle', operation});
const setT = (value: number): LessonAction => ({kind: 'nurbs-circle', operation: 'set-t', value});
const setWeight = (index: number, value: number): LessonAction => ({kind: 'nurbs-circle', operation: 'set-weight', index, value});
/** The angle at t = 1/16 from the first-arc rational formula (Bernstein values 9/16, 6/16, 1/16, weights 1, sqrt2/2, 1), independent of the kernel. */
const EXACT_ANGLE_SIXTEENTH = (() => {
    const b = [9 / 16, 6 / 16, 1 / 16], w = [1, Math.SQRT1_2, 1], px = [1, 1, 0], py = [0, 1, 1];
    const den = b.reduce((sum, bi, i) => sum + bi * w[i], 0);
    return Math.atan2(b.reduce((sum, bi, i) => sum + bi * w[i] * py[i], 0) / den, b.reduce((sum, bi, i) => sum + bi * w[i] * px[i], 0) / den) * 180 / Math.PI;
})();
const polar = (point: readonly [number, number]) => Math.hypot(point[0], point[1]);

describe('the scenes show the spec numbers on the real graph', () => {
    test('the steps run in one synchronous sequence with the radial errors, points and angles of the spec', () => {
        const m = mount();
        try {
            // Step 1: unit weights, the error above 1e-2 (about 6.07e-2).
            m.scene(stepOf('bspline-nurbs-predict'));
            expect(m.state().example).toBe('unit');
            expect(m.state().weights).toEqual(NURBS_UNIT_FIXTURE.weights);
            expect(m.error()).toBeGreaterThan(1e-2);
            expect(m.error()).toBeCloseTo(6.07e-2, 4);

            // Step 2: the same unit-weight curve at t = 1/8: (0.75, 0.75), 45 degrees, radius about 1.0607.
            m.scene(stepOf('bspline-nurbs-polynomial'));
            near(m.point(), [0.75, 0.75]);
            expect(polar(m.point())).toBeCloseTo(1.0607, 4);
            expect(Math.abs(angleDegrees(m.point()) - 45)).toBeLessThan(1e-4);
            expect(m.error()).toBeGreaterThan(1e-2);

            // Step 3: four set-weight actions turn the unit curve into the circle: the error drops below 1e-12, t = 1/8 gives (sqrt2/2, sqrt2/2).
            m.scene(stepOf('bspline-nurbs-weights'));
            expect(m.state().weights).toEqual(NURBS_CIRCLE_FIXTURE.weights);
            expect(m.error()).toBeLessThan(1e-12);
            near(m.point(), [SQRT_HALF, SQRT_HALF]);
            expect(Math.abs(angleDegrees(m.point()) - 45)).toBeLessThan(1e-4);

            // Step 4: t = 1/16 is (0.92979, 0.36809) at 21.598 degrees, not 22.5.
            m.scene(stepOf('bspline-nurbs-angle'));
            expect(m.state().example).toBe('circle');
            expect(m.state().t).toBe(NURBS_T_SIXTEENTH);
            near(m.point(), [0.92979, 0.36809], 5e-6);
            // The spec quotes 21.598 rounded to three decimals; the 1e-4 angle tolerance is against the unrounded value 21.59816...
            expect(Math.abs(angleDegrees(m.point()) - EXACT_ANGLE_SIXTEENTH)).toBeLessThan(1e-4);
            expect(Math.abs(angleDegrees(m.point()) - 21.598)).toBeLessThan(5e-4);
            expect(Math.abs(angleDegrees(m.point()) - 22.5)).toBeGreaterThan(0.5);
            expect(m.error()).toBeLessThan(1e-12);

            // Step 5: the circle overlay is on, the knot vector has three double interior knots.
            m.scene(stepOf('bspline-nurbs-compare'));
            expect(m.state().showCircle).toBe(true);
            expect(m.state().knots.filter(u => u === 0.25 || u === 0.5 || u === 0.75)).toHaveLength(6);
            expect(m.error()).toBeLessThan(1e-12);

            // Step 6: back to the default circle.
            m.scene(stepOf('bspline-nurbs-explore'));
            expect(m.state().weights).toEqual(NURBS_CIRCLE_FIXTURE.weights);
            expect(m.error()).toBeLessThan(1e-12);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the exact point at t = 1/16 comes from the first arc with Bernstein values 9/16, 6/16, 1/16', () => {
        const w = SQRT_HALF, s = 0.25;
        const b = [(1 - s) ** 2, 2 * s * (1 - s), s * s];
        const pts = [[1, 0], [1, 1], [0, 1]], ws = [1, w, 1];
        const den = b.reduce((sum, bi, i) => sum + bi * ws[i], 0);
        const x = b.reduce((sum, bi, i) => sum + bi * ws[i] * pts[i][0], 0) / den;
        const y = b.reduce((sum, bi, i) => sum + bi * ws[i] * pts[i][1], 0) / den;
        near([x, y], [0.92979, 0.36809], 5e-6);
        expect(Math.abs(Math.atan2(y, x) * 180 / Math.PI - 21.598)).toBeLessThan(1e-3);
        const m = mount();
        try {
            m.scene(stepOf('bspline-nurbs-angle'));
            near(m.point(), [x, y]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the readouts in the inspector show the error and the point', () => {
        const m = mount();
        try {
            m.scene(stepOf('bspline-nurbs-predict'));
            expect(m.readout('radial-error')).toMatch(/6,07e-2/);
            m.scene(stepOf('bspline-nurbs-angle'));
            expect(m.readout('point')).toContain('21,598');
            expect(m.readout('radial-error')).toMatch(/e-1[67]|^[^:]*: 0$/);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quoted numbers appear in the prose of both languages', () => {
        const quoted: Record<string, (number | string)[]> = {
            'bspline-nurbs-predict': ['6.07'],
            'bspline-nurbs-polynomial': [0.75, '1.0607'],
            'bspline-nurbs-weights': ['0.70711'],
            'bspline-nurbs-angle': ['0.92979', '0.36809', '21.598', '22.5'],
        };
        for (const [id, values] of Object.entries(quoted)) {
            for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${value}`).toContain(num(value, language));
        }
    });
});

describe('the nurbs-circle actions', () => {
    test('set-weight edits one weight through the control setter, scaling all weights leaves the curve unchanged', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-nurbs-angle'));
            const before = m.point();
            m.apply(setWeight(1, 2));
            expect(m.state().weights[1]).toBe(2);
            expect(m.state().weights.filter((_, i) => i !== 1)).toEqual(NURBS_CIRCLE_FIXTURE.weights!.filter((_, i) => i !== 1));
            expect(m.error()).toBeGreaterThan(1e-2);
            expect(Math.abs(m.point()[1] - before[1])).toBeGreaterThan(1e-3);
            m.apply(circleAction('reset'));
            // Scaling every weight by 3 leaves the point (acceptance 4).
            NURBS_CIRCLE_FIXTURE.weights!.forEach((w, i) => m.apply(setWeight(i, 3 * w)));
            near(m.point(), before);
            expect(m.error()).toBeLessThan(1e-12);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-weight refuses a nonpositive or non-finite weight and an index out of range as a content error', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-nurbs-angle'));
            const weights = m.state().weights;
            expect(() => m.capabilities.apply(setWeight(1, 0))).toThrow();
            expect(() => m.capabilities.apply(setWeight(1, -0.5))).toThrow();
            expect(() => m.capabilities.apply(setWeight(1, Number.NaN))).toThrow();
            expect(() => m.capabilities.apply(setWeight(9, 1))).toThrow(/no weight/);
            expect(() => m.capabilities.apply(setWeight(-1, 1))).toThrow(/no weight/);
            expect(() => m.capabilities.apply(setWeight(0.5, 1))).toThrow(/no weight/);
            expect(m.state().weights).toEqual(weights);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-t moves the slider on the domain and a value off the domain throws', () => {
        const m = mount();
        try {
            m.apply(setT(NURBS_T_EIGHTH));
            expect(m.state().t).toBe(NURBS_T_EIGHTH);
            near(m.point(), [SQRT_HALF, SQRT_HALF]);
            m.apply(setT(0));
            near(m.point(), [1, 0]);
            m.apply(setT(1));
            near(m.point(), [1, 0]);
            expect(() => m.capabilities.apply(setT(1.5))).toThrow(/parameter/);
            expect(() => m.capabilities.apply(setT(-0.1))).toThrow(/parameter/);
            expect(() => m.capabilities.apply(setT(Number.NaN))).toThrow(/parameter/);
            expect(m.state().t).toBe(1);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-circle shows and hides the overlay', () => {
        const m = mount();
        try {
            m.apply({kind: 'nurbs-circle', operation: 'set-circle', visible: false});
            expect(m.state().showCircle).toBe(false);
            m.apply({kind: 'nurbs-circle', operation: 'set-circle', visible: true});
            expect(m.state().showCircle).toBe(true);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('set-example loads the circle or the unit-weight example as the Reset target; reset returns to it', () => {
        const m = mount();
        try {
            m.apply({kind: 'nurbs-circle', operation: 'set-example', exampleId: 'unit'});
            expect(m.state().example).toBe('unit');
            expect(m.state().weights).toEqual(NURBS_UNIT_FIXTURE.weights);
            expect(m.error()).toBeGreaterThan(1e-2);
            m.apply(setWeight(1, 2));
            m.apply(circleAction('reset'));
            expect(m.state().weights).toEqual(NURBS_UNIT_FIXTURE.weights);
            m.apply({kind: 'nurbs-circle', operation: 'set-example', exampleId: 'circle'});
            expect(m.state().example).toBe('circle');
            expect(m.error()).toBeLessThan(1e-12);
            expect(() => m.capabilities.apply({kind: 'nurbs-circle', operation: 'set-example', exampleId: 'ellipse' as 'circle'})).toThrow(/Unknown/);
            expect(m.state().example).toBe('circle');
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('a lesson fixture keeps the imported weights and the Reset target instead of the default circle', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-nurbs-predict'));
            expect(m.state().example).toBe('unit');
            expect(m.state().origin.weights).toEqual(NURBS_UNIT_FIXTURE.weights);
            m.apply(setWeight(3, 0.4));
            m.apply(circleAction('reset'));
            expect(m.state().weights).toEqual(NURBS_UNIT_FIXTURE.weights);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

test('the L5 lesson has six steps with predictions, a free last step, the proof wording and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('bspline-nurbs-explore');
    for (const id of ['bspline-nurbs-predict', 'bspline-nurbs-angle']) {
        expect(stepOf(id).explanation.sl, id).toMatch(/[Nn]apovej/);
        expect(stepOf(id).explanation.en, id).toMatch(/[Pp]redict/);
    }
    // No scene action navigates: the comparison with the four-arc circle is text only.
    for (const step of lesson.steps) for (const action of actionsOf(step).slice(1)) expect(action.kind).toBe('nurbs-circle');
    expect(actionsOf(stepOf('bspline-nurbs-weights')).slice(1).flatMap(action => action.kind === 'nurbs-circle' && action.operation === 'set-weight' ? [action.index] : [])).toEqual([...NURBS_CORNER_INDICES]);
    // Acceptance 5: sampling illustrates exactness at the sampled parameters; the proof is the rational identity.
    const compare = stepOf('bspline-nurbs-compare');
    expect(compare.explanation.sl).toMatch(/le v vzorčenih/);
    expect(compare.explanation.sl).toMatch(/dokaz je racionalna identiteta/);
    expect(compare.explanation.sl).toMatch(/Vzorčenje samo ne dokaže/);
    expect(compare.explanation.en).toMatch(/only at the sampled parameters/);
    expect(compare.explanation.en).toMatch(/the proof is the rational identity/);
    expect(compare.explanation.en).toMatch(/Sampling alone does not prove it/);
    const all = JSON.stringify(lesson);
    for (const term of ['B-zlepek', 'vozelni vektor', 'utež', 'NURBS']) expect(all, term).toContain(term);
});
