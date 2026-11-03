import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {bsplineExtractionGuidedLessons, EXTRACTION_MOVED_INDEX, EXTRACTION_MOVED_TO} from './bsplineExtractionGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {BSplineExtractionState} from '../../graphs/curves/bspline/BSplineExtractionGraph';
import {casteljau, distinctInteriorKnots, expectedPieceCount, pieceParameter} from '../../graphs/curves/bspline/bsplineExtractionModel';
import type {BezierPiece} from '../../bezeg/impl/curve/bspline';
import {evaluate} from '../../bezeg/impl/curve/bspline';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

const lesson = bsplineExtractionGuidedLessons.find(entry => entry.demonstrationId === 'bspline-extraction')!;
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
const move = (index: number, to: readonly [number, number]): LessonAction => ({kind: 'bezier-extraction', operation: 'move-point', index, to});

type ExtractionGraph = {state: BSplineExtractionState; pieces(): BezierPiece[]; affected(): number[]; hostBridge: {openAsBezier?: (points: ReadonlyArray<readonly [number, number]>) => void}};

const QUADRATIC_KNOTS = [0, 0, 0, 1, 2, 2, 2];
const QUADRATIC_POINTS = [[0, 0], [1, 2], [3, 2], [4, 0]];
const CUBIC_KNOTS = [0, 0, 0, 0, 1, 2, 2, 3, 3, 3, 3];
const CUBIC_POINTS = [[0, 0], [1, 2], [2, 3], [3, 1], [4, 1], [5, 3], [6, 0]];
/** The spec's pieces (L3 Defaults for the cubic, L4 Defaults for the quadratic). */
const QUADRATIC_PIECES = [[[0, 0], [1, 2], [2, 2]], [[2, 2], [3, 2], [4, 0]]];
const CUBIC_PIECES = [
    [[0, 0], [1, 2], [1.5, 2.5], [2, 2.25]],
    [[2, 2.25], [2.5, 2], [3, 1], [3.5, 1]],
    [[3.5, 1], [4, 1], [5, 3], [6, 0]],
];

function mount(withHost = false) {
    const graph = createGraph('bspline-extraction');
    const opened: Array<ReadonlyArray<readonly [number, number]>> = [];
    const extraction = graph as unknown as ExtractionGraph;
    if (withHost) extraction.hostBridge.openAsBezier = points => { opened.push(points); };
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        mounted, capabilities, graph: extraction, opened,
        state: () => extraction.state,
        pieces: () => extraction.pieces().map(piece => piece.points.map(p => [...p])),
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

describe('the scenes set the curve, extract the pieces and show the spec numbers on the real graph', () => {
    test('the steps run in one synchronous sequence and every quoted piece equals the spec value', () => {
        const m = mount();
        try {
            // Step 1: the L2 example, two pieces.
            m.run(stepOf('bspline-extraction-predict'));
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.pieces()).toHaveLength(2);
            expect(m.state().moved).toEqual([]);

            // Step 2: the pieces and the junction b2 = b0' = 1/2 P1 + 1/2 P2.
            m.run(stepOf('bspline-extraction-pieces'));
            QUADRATIC_PIECES.forEach((piece, i) => near(m.pieces()[i].flat(), piece.flat()));
            const junction = [0, 1].map(d => 0.5 * QUADRATIC_POINTS[1][d] + 0.5 * QUADRATIC_POINTS[2][d]);
            near(junction, [2, 2]);
            near(m.pieces()[0][2], junction);
            near(m.pieces()[1][0], junction);
            const pieces = m.graph.pieces();
            expect([pieces[0].start, pieces[0].end, pieces[1].start, pieces[1].end]).toEqual([0, 1, 1, 2]);

            // Step 3: the same example with the "open as Bezier" buttons (see the test below).
            m.run(stepOf('bspline-extraction-open'));
            expect(m.pieces()).toHaveLength(2);

            // Step 4: the cubic with point 2 moved from (2, 3) to (2, 4): only pieces 1 and 2 (indices 0, 1) change.
            m.run(stepOf('bspline-extraction-count'));
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(m.state().points).toEqual(CUBIC_POINTS);
            CUBIC_PIECES.forEach((piece, i) => near(m.pieces()[i].flat(), piece.flat()));
            const before = m.pieces();
            m.scene(stepOf('bspline-extraction-move'));
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(m.state().points[EXTRACTION_MOVED_INDEX]).toEqual(EXTRACTION_MOVED_TO);
            expect(m.state().points.filter((_, i) => i !== EXTRACTION_MOVED_INDEX)).toEqual(CUBIC_POINTS.filter((_, i) => i !== EXTRACTION_MOVED_INDEX));
            expect(m.state().moved).toEqual([EXTRACTION_MOVED_INDEX]);
            expect(m.graph.affected()).toEqual([0, 1]);
            const after = m.pieces();
            near(after[2].flat(), before[2].flat());
            near(after[2].flat(), CUBIC_PIECES[2].flat());
            for (const i of [0, 1]) expect(Math.max(...after[i].flat().map((x, k) => Math.abs(x - before[i].flat()[k]))), `piece ${i + 1} changed`).toBeGreaterThan(0.1);
            // Each moved piece still equals the B-spline on its interval, evaluated as a Bezier curve.
            const spline = (t: number) => evaluate(m.state().knots, m.state().degree, m.state().points.map(p => [...p]), t);
            m.graph.pieces().forEach(piece => {
                for (let s = 0; s <= 1; s += 0.125) near(casteljau(piece.points, s), spline(pieceParameter(piece, s)));
            });

            // Step 6: back to the default scene.
            m.scene(stepOf('bspline-extraction-explore'));
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.state().moved).toEqual([]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('a cubic lesson fixture keeps the imported curve and its Reset target instead of the default quadratic', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-extraction-count'));
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(m.state().example).toBe('cubic');
            expect(m.state().origin.knots).toEqual(CUBIC_KNOTS);
            m.apply(move(0, [0, 1]));
            m.apply({kind: 'bezier-extraction', operation: 'reset'});
            expect(m.state().points).toEqual(CUBIC_POINTS);
            expect(m.state().moved).toEqual([]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('piece count equals the distinct interior knots plus one: 2 for the quadratic, 3 for the cubic', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-extraction-predict'));
            expect(distinctInteriorKnots(QUADRATIC_KNOTS, 2)).toBe(1);
            expect(expectedPieceCount(QUADRATIC_KNOTS, 2)).toBe(2);
            expect(m.pieces()).toHaveLength(2);
            m.run(stepOf('bspline-extraction-count'));
            expect(distinctInteriorKnots(CUBIC_KNOTS, 3)).toBe(2);
            expect(expectedPieceCount(CUBIC_KNOTS, 3)).toBe(3);
            expect(m.pieces()).toHaveLength(3);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the support of each cubic point: point 2 changes pieces 1 and 2, the quoted piece 3 does not', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-extraction-count'));
            const supports: number[][] = [];
            for (let index = 0; index < CUBIC_POINTS.length; index++) {
                m.apply({kind: 'bezier-extraction', operation: 'reset'});
                const base = m.pieces();
                m.apply(move(index, [CUBIC_POINTS[index][0] + 0.7, CUBIC_POINTS[index][1] - 0.9]));
                const moved = m.pieces();
                const changed = moved.map((piece, i) => piece.flat().some((x, k) => Math.abs(x - base[i].flat()[k]) > 1e-12) ? i : -1).filter(i => i >= 0);
                supports.push(changed);
                expect(m.graph.affected(), `point ${index}`).toEqual(changed);
            }
            expect(supports).toEqual([[0], [0, 1], [0, 1], [0, 1, 2], [1, 2], [2], [2]]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quoted numbers appear in the prose of both languages', () => {
        const quoted: Record<string, (number | string)[]> = {
            'bspline-extraction-pieces': [2, 1],
            'bspline-extraction-move': [3.5, 4, 5, 6],
            'bspline-extraction-count': [3, 2],
        };
        for (const [id, values] of Object.entries(quoted)) {
            for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${value}`).toContain(num(value, language));
        }
    });
});

describe('open as Bezier and the lesson action', () => {
    test('the inspector offers an enabled "open as Bezier" button per piece in the lesson scene, and it hands the piece to the host', () => {
        const m = mount(true);
        try {
            m.run(stepOf('bspline-extraction-open'));
            const buttons = Array.from(m.mounted.view.container.querySelectorAll<HTMLButtonElement>('button[data-action="open-as-bezier"]'));
            expect(buttons).toHaveLength(2);
            buttons.forEach(button => expect(button.disabled).toBe(false));
            act(() => buttons[0].click());
            expect(m.opened).toHaveLength(1);
            near(m.opened[0].flat(), QUADRATIC_PIECES[0].flat());
            act(() => buttons[1].click());
            near(m.opened[1].flat(), QUADRATIC_PIECES[1].flat());
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('move-point behaves like a drag, and invalid input throws without changing anything', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-extraction-predict'));
            m.apply(move(1, [1, 3]));
            expect(m.state().points[1]).toEqual([1, 3]);
            expect(m.state().moved).toEqual([1]);
            expect(m.graph.affected()).toEqual([0, 1]);
            m.apply(move(3, [4, 1]));
            expect(m.state().moved).toEqual([3]);
            const points = m.state().points;
            expect(() => m.capabilities.apply(move(4, [0, 0]))).toThrow(/no control point/);
            expect(() => m.capabilities.apply(move(-1, [0, 0]))).toThrow(/no control point/);
            expect(() => m.capabilities.apply(move(0.5, [0, 0]))).toThrow(/no control point/);
            expect(() => m.capabilities.apply(move(0, [Number.NaN, 0]))).toThrow(/finite/);
            expect(() => m.capabilities.apply(move(0, [0, Infinity]))).toThrow(/finite/);
            expect(m.state().points).toEqual(points);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('reset, set-example and a lesson scene restore the original knots and points', () => {
        const m = mount();
        try {
            m.run(stepOf('bspline-extraction-move'));
            m.apply({kind: 'bezier-extraction', operation: 'reset'});
            expect(m.state().points).toEqual(CUBIC_POINTS);
            expect(m.state().moved).toEqual([]);
            m.apply({kind: 'bezier-extraction', operation: 'set-example', exampleId: 'quadratic'});
            expect(m.state().knots).toEqual(QUADRATIC_KNOTS);
            expect(m.state().example).toBe('quadratic');
            m.apply(move(0, [0, 1]));
            m.apply({kind: 'bezier-extraction', operation: 'reset'});
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            m.apply({kind: 'bezier-extraction', operation: 'set-example', exampleId: 'cubic'});
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(() => m.capabilities.apply({kind: 'bezier-extraction', operation: 'set-example', exampleId: 'quartic' as 'cubic'})).toThrow(/Unknown/);
            m.run(stepOf('bspline-extraction-move'));
            m.scene(stepOf('bspline-extraction-predict'));
            expect(m.state().points).toEqual(QUADRATIC_POINTS);
            expect(m.state().moved).toEqual([]);
            m.run(stepOf('bspline-extraction-move'));
            m.reset();
            // The host Reset returns to the chosen example (the cubic here), with the points restored.
            expect(m.state().knots).toEqual(CUBIC_KNOTS);
            expect(m.state().points).toEqual(CUBIC_POINTS);
            expect(m.state().moved).toEqual([]);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

test('the L4 lesson has six steps with predictions, a free last step and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('bspline-extraction-explore');
    for (const step of lesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    // No scene action navigates: the handoff is router state behind the inspector button (ADR 0038).
    for (const step of lesson.steps) for (const action of actionsOf(step).slice(1)) expect(action.kind).toBe('bezier-extraction');
    expect(actionsOf(stepOf('bspline-extraction-move')).slice(1)).toEqual([move(EXTRACTION_MOVED_INDEX, EXTRACTION_MOVED_TO)]);
    const all = JSON.stringify(lesson);
    for (const term of ['odsek', 'vozel', 'Bézierjev']) expect(all, term).toContain(term);
});
