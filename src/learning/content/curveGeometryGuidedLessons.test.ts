import {act} from '@testing-library/react';
import {getLessonForDemonstration, sceneActions} from '../runtime/lessonCatalog';
import {LessonSession} from '../runtime/LessonSession';
import {curveGeometryGuidedLessons} from './curveGeometryGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../../graphs/base/realGraphTestHarness';
import type {ParametricCurveGraph} from '../../graphs/curves/parametric/ParametricCurveGraph';
import type CurvatureBezierCurveGraph from '../../graphs/curves/bezier/CurvatureBezierCurveGraph';
import {CURVATURE_T_DEFAULT} from '../../graphs/curves/bezier/CurvatureBezierCurveGraph';
import {DEFAULT_PARAMETRIC_PRESET} from '../../graphs/curves/parametric/parametricPresetCollection';
import {checkSceneState} from '../../graphs/base/presets/PresetCollection';
import {setLanguage} from '../../localization';
import {fitBoundingBox} from '../../graphs/base/fitBoundingBox';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type LessonId = 'curve-parametric' | 'curve-curvature' | 'curve-comb';
const PI = Math.PI;
const stepOf = (demonstrationId: LessonId, stepId: string): GuidedLessonStep =>
    curveGeometryGuidedLessons.find(lesson => lesson.demonstrationId === demonstrationId)!.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
/** The prose of a step that has to quote the values: explanation, scene state and observations. */
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])].join(' ');
/** A number as the Slovenian readout writes it (comma), in the prose of a language (`{,}` in Slovenian math, a point in English). */
const proseForm = (value: string, language: 'sl' | 'en') => (language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.'));

function mount<G>(id: LessonId) {
    const graph = createGraph(id);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as G & typeof graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}

const parametric = () => mount<ParametricCurveGraph>('curve-parametric');
const readoutOf = (graph: ParametricCurveGraph) => (graph as unknown as { scene: { readoutText(): string } }).scene.readoutText();
const curvature = () => mount<CurvatureBezierCurveGraph>('curve-curvature');
type Overlay = { readoutText(): string; frame(): { status: string; kappa?: number; radius?: number; centre?: number[] } | undefined };
const overlayOf = (graph: CurvatureBezierCurveGraph) => (graph as unknown as { overlay: Overlay }).overlay;

/** [step id, lines the Slovenian readout shows, numbers the prose quotes]. */
const PARAMETRIC_CASES: ReadonlyArray<readonly [string, readonly string[], readonly string[]]> = [
    ['parametric-roll', ['Hitrost je 0 (ost)', 'Dolžina loka: 8', 'Ploščina: 9,4248'], []],
    ['parametric-velocity', ['r′ = (1, 1), velikost 1,4142'], ['1,4142']],
    ['parametric-measures', ['Dolžina loka: 8', 'Ploščina: 9,4248'], ['9,4248']],
    ['parametric-polar', ['Polmer ρ = 3,1416'], ['3,1416']],
    ['parametric-cardioid', ['r′ = (−1, −1)', 'Polmer ρ = 1'], []],
    ['parametric-cusp', ['Hitrost je 0 (ost): vektor hitrosti in tangenta nista narisana'], []],
];

test('every parametric scene shows the readout its text quotes', () => {
    const h = parametric();
    try {
        for (const [stepId, shown, numbers] of PARAMETRIC_CASES) {
            const step = stepOf('curve-parametric', stepId);
            h.scene(step);
            const readout = readoutOf(h.graph);
            for (const line of shown) expect(readout, `${stepId}: ${line}`).toContain(line);
            for (const number of numbers) for (const language of ['sl', 'en'] as const) {
                expect(prose(step, language), `${stepId} ${language} quotes ${number}`).toContain(proseForm(number, language));
            }
        }
        // The cusp scene is at the end of the arch: the status line stands in for the velocity vector.
        h.scene(stepOf('curve-parametric', 'parametric-cusp'));
        expect(readoutOf(h.graph)).not.toContain('r′ =');
        expect(h.graph.state.parameter).toBeCloseTo(2 * PI, 12);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the top of the arch, the cardioid cusp and the doubled cycloid radius match the prose', () => {
    const h = parametric();
    try {
        const velocity = stepOf('curve-parametric', 'parametric-velocity');
        h.scene(velocity);
        h.apply({kind: 'parameter', name: 't', value: PI});
        expect(readoutOf(h.graph)).toContain('r′ = (2, 0), velikost 2');
        expect(velocity.expectedObservations[0].sl).toContain('(2,0)');

        h.scene(stepOf('curve-parametric', 'parametric-cardioid'));
        h.apply({kind: 'parameter', name: 't', value: PI});
        expect(readoutOf(h.graph)).toContain('Hitrost je 0 (ost)');

        const measures = stepOf('curve-parametric', 'parametric-measures');
        h.scene(measures);
        h.apply({kind: 'parametric-curve', curve: 'cycloid', radius: 2});
        const readout = readoutOf(h.graph);
        expect(readout).toContain('Dolžina loka: 16');
        expect(readout).toContain('Ploščina: 37,6991');
        expect(measures.expectedObservations[0].sl).toContain('37{,}6991');
        expect(measures.expectedObservations[0].en).toContain('37.6991');
    } finally {
        h.mounted.view.unmount();
    }
});

const CURVATURE_CASES: ReadonlyArray<readonly [string, readonly string[], readonly string[], boolean, boolean]> = [
    ['curvature-predict', ['κ = 0,2357'], ['0,2357', '0,6667', '0,0596'], false, false],
    ['curvature-frame', ['κ = 0,0596', 'φ = 63,43'], ['63,43', '0,0596'], true, false],
    ['curvature-circle', ['κ = 0,6667', 'R = 1,5'], ['1,5', '0,6667'], true, true],
    ['curvature-parabola', ['κ = 2', 'R = 0,5'], ['0,5'], true, true],
    ['curvature-endpoint', ['κ = 0,6667'], ['0,6667'], true, true],
    ['curvature-inflection', ['κ = 0', 'krivinski polmer je neskončen'], [], true, true],
    ['curvature-explore', ['κ = 2', 'R = 0,5'], [], true, true],
];

test('every curvature scene shows the readout and the overlay parts its text quotes', () => {
    const h = curvature();
    try {
        for (const [stepId, shown, numbers, frameShown, circleShown] of CURVATURE_CASES) {
            const step = stepOf('curve-curvature', stepId);
            h.scene(step);
            const readout = overlayOf(h.graph).readoutText();
            for (const line of shown) expect(readout, `${stepId}: ${line}`).toContain(line);
            expect([h.graph.state.curvatureFrameShown, h.graph.state.curvatureCircleShown], stepId).toEqual([frameShown, circleShown]);
            for (const number of numbers) for (const language of ['sl', 'en'] as const) {
                expect(prose(step, language), `${stepId} ${language} quotes ${number}`).toContain(proseForm(number, language));
            }
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the quoted cubic and parabola values come from the kernel frame', () => {
    const h = curvature();
    try {
        const at = (stepId: string, t: number) => {
            h.scene(stepOf('curve-curvature', stepId));
            h.apply({kind: 'parameter', name: 't', value: t});
            return overlayOf(h.graph).frame()!;
        };
        const start = at('curvature-circle', 0);
        expect(start.status).toBe('circle');
        expect(start.kappa).toBeCloseTo(2 / 3, 12);
        expect(start.radius).toBeCloseTo(1.5, 12);
        expect(start.centre![0]).toBeCloseTo(0, 12);
        expect(start.centre![1]).toBeCloseTo(1.5, 12);
        const end = at('curvature-circle', 1);
        expect(end.kappa).toBeCloseTo(0.05963, 5);
        expect(end.radius).toBeCloseTo(16.77, 2);
        expect(overlayOf(h.graph).readoutText()).toContain('φ = 63,43');
        expect(at('curvature-predict', 0).kappa).toBeCloseTo(2 / 3, 12);
        expect(at('curvature-predict', 1).kappa).toBeCloseTo(0.05963, 5);
        expect(overlayOf(h.graph).readoutText()).toContain('κ = 0,0596');

        const vertex = at('curvature-parabola', 0.5);
        expect(vertex.kappa).toBeCloseTo(2, 12);
        expect(vertex.radius).toBeCloseTo(0.5, 12);
        expect(vertex.centre![0]).toBeCloseTo(0, 12);
        expect(vertex.centre![1]).toBeCloseTo(0.5, 12);
        const one = at('curvature-parabola', 1);
        expect(one.kappa).toBeCloseTo(0.1789, 4);
        expect(one.radius).toBeCloseTo(5.5902, 4);
        expect(one.centre![0]).toBeCloseTo(-4, 9);
        expect(one.centre![1]).toBeCloseTo(3.5, 9);
        expect(overlayOf(h.graph).readoutText()).toContain('κ = 0,1789');
        expect(overlayOf(h.graph).readoutText()).toContain('R = 5,5902');
    } finally {
        h.mounted.view.unmount();
    }
});

test('the inflection scene shows a line and an infinite radius, and a nearby parameter shows a circle', () => {
    const h = curvature();
    try {
        h.scene(stepOf('curve-curvature', 'curvature-inflection'));
        const frame = overlayOf(h.graph).frame()!;
        expect(frame.status).toBe('line');
        expect(frame.radius).toBeUndefined();
        expect(overlayOf(h.graph).readoutText()).toContain('krivinski polmer je neskončen');
        h.apply({kind: 'parameter', name: 't', value: 0.3});
        expect(overlayOf(h.graph).frame()!.status).toBe('circle');
        expect(overlayOf(h.graph).readoutText()).not.toContain('neskončen');
    } finally {
        h.mounted.view.unmount();
    }
});

/** Counts the animation frames requested and not yet cancelled. */
function countFrames() {
    let next = 1;
    const frames = new Map<number, FrameRequestCallback>();
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(next, callback); return next++; });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(handle => { frames.delete(handle); });
    return {pending: () => frames.size, restore: () => { request.mockRestore(); cancel.mockRestore(); }};
}
const roll = (command: 'play' | 'pause' | 'replay' | 'next-step'): LessonAction => ({kind: 'animation', animationId: 'parametric-roll', command});

test('the roll animation returns to t = 0 with no pending frame on a step change and on leaving the lesson', () => {
    const frames = countFrames();
    const h = parametric();
    try {
        h.scene(stepOf('curve-parametric', 'parametric-roll'));
        expect(h.graph.state.parameter).toBe(0);
        h.apply(roll('play'));
        expect(h.graph.rolling).toBe(true);
        expect(frames.pending()).toBe(1);
        // A step change (and leaving the lesson): the session stops the animations.
        act(() => h.capabilities.stopAnimations!());
        expect(h.graph.rolling).toBe(false);
        expect(frames.pending()).toBe(0);
        expect(h.graph.state.parameter).toBe(0);

        // From the middle of a roll the stop returns to the start as well.
        h.scene(stepOf('curve-parametric', 'parametric-velocity'));
        expect(h.graph.state.parameter).toBeCloseTo(PI / 2, 12);
        // Not rolling: stopping keeps the parameter, so a lesson start captures and a close restores the user's t.
        act(() => h.capabilities.stopAnimations!());
        expect(h.graph.state.parameter).toBeCloseTo(PI / 2, 12);
        h.apply(roll('play'));
        expect(frames.pending()).toBe(1);
        act(() => h.capabilities.stopAnimations!());
        expect(frames.pending()).toBe(0);
        expect(h.graph.state.parameter).toBe(0);

        // Replay starts again from 0, and next-step is not a roll command.
        h.apply(roll('play'), roll('pause'));
        expect(frames.pending()).toBe(0);
        h.apply(roll('replay'));
        expect(h.graph.rolling).toBe(true);
        expect(h.graph.state.parameter).toBe(0);
        expect(frames.pending()).toBe(1);
        expect(() => h.apply(roll('next-step'))).toThrow();
    } finally {
        h.mounted.view.unmount();
        frames.restore();
    }
});

test('a real lesson session stops a roll started away from t = 0 on a step change and on closing the lesson', () => {
    const frames = countFrames();
    const h = parametric();
    try {
        const lesson = getLessonForDemonstration('curve-parametric')!;
        const second = lesson.steps[1];
        const authored = second.scene!.actions.find(action => action.kind === 'parameter');
        // The step after the roll sets its own parameter (pi/2), so the step change is told apart from a stop by the roll flag and the frame.
        expect(authored).toMatchObject({value: PI / 2});

        const session = new LessonSession(lesson, h.capabilities);
        h.apply({kind: 'parameter', name: 't', value: 1});
        act(() => session.start());
        expect(h.graph.state.parameter).toBe(0);
        // Start the roll away from 0: a stop that did not reset would leave this value.
        h.apply({kind: 'parameter', name: 't', value: 1}, roll('play'));
        expect(h.graph.rolling).toBe(true);
        expect(h.graph.state.parameter).toBe(1);
        expect(frames.pending()).toBe(1);

        // Step 0 may have several frames: each advance stops the roll; the step change is the one that crosses to step 1.
        for (let guard = 0; session.snapshot().stepIndex === 0 && guard < 10; guard++) {
            if (!h.graph.rolling) h.apply({kind: 'parameter', name: 't', value: 1}, roll('play'));
            act(() => session.next());
            expect(h.graph.rolling).toBe(false);
            expect(frames.pending()).toBe(0);
        }
        expect(session.snapshot().stepIndex).toBe(1);
        expect(h.graph.state.parameter).toBeCloseTo(PI / 2, 12);

        // Leaving: roll again from the middle of the domain, then close.
        h.apply(roll('play'));
        expect(h.graph.rolling).toBe(true);
        expect(frames.pending()).toBe(1);
        act(() => session.close());
        expect(h.graph.rolling).toBe(false);
        expect(frames.pending()).toBe(0);
        // Closing restores the checkpoint taken at the start: the user's own t (1), not 0.
        expect(h.graph.state.parameter).toBe(1);
    } finally {
        h.mounted.view.unmount();
        frames.restore();
    }
});

test('Reset restores the parametric curve and parameter, and the curvature parameter, flags and control points', async () => {
    const p = parametric();
    try {
        p.scene(stepOf('curve-parametric', 'parametric-polar'));
        expect(p.graph.state.curve).toBe('spiral');
        await settle(() => p.graph.reset());
        expect(p.graph.state.curve).toBe(DEFAULT_PARAMETRIC_PRESET.curve);
        expect(p.graph.state.parameter).toBeCloseTo(DEFAULT_PARAMETRIC_PRESET.parameter, 12);
    } finally {
        p.mounted.view.unmount();
    }
    const c = curvature();
    try {
        const points = () => (c.graph as unknown as { getFirstCurve(): { getPoints(): Array<{ X(): number; Y(): number }> } })
            .getFirstCurve().getPoints().map(point => [point.X(), point.Y()]);
        const original = points();
        c.scene(stepOf('curve-curvature', 'curvature-inflection'));
        expect(points()).not.toEqual(original);
        c.apply({kind: 'parameter', name: 't', value: 0.9}, {kind: 'curve-visibility', target: 'curvature-circle', visible: false});
        expect(c.graph.state.curvatureT).toBe(0.9);
        await settle(() => c.graph.reset());
        expect(c.graph.state.curvatureT).toBe(CURVATURE_T_DEFAULT);
        expect(c.graph.state.curvatureFrameShown).toBe(true);
        expect(c.graph.state.curvatureCircleShown).toBe(true);
        expect(points()).toEqual(original);
    } finally {
        c.mounted.view.unmount();
    }
});

test('two scenes run in one synchronous sequence leave the second scene on the board', () => {
    const h = curvature();
    try {
        act(() => {
            for (const action of actionsOf(stepOf('curve-curvature', 'curvature-predict'))) h.capabilities.apply(action);
            // The second scene's actions read the state written by the first one, within the same tick.
            for (const action of actionsOf(stepOf('curve-curvature', 'curvature-circle'))) h.capabilities.apply(action);
        });
        expect(h.graph.state.curvatureT).toBe(0);
        expect([h.graph.state.curvatureFrameShown, h.graph.state.curvatureCircleShown]).toEqual([true, true]);
        expect(overlayOf(h.graph).readoutText()).toContain('R = 1,5');
    } finally {
        h.mounted.view.unmount();
    }
});

test('the curvature state flags are accepted by the Preset scene-state check', () => {
    expect(checkSceneState({curvatureT: 0.25, curvatureFrameShown: false, curvatureCircleShown: true})).toBeUndefined();
    const h = curvature();
    try {
        h.apply({kind: 'curve-visibility', target: 'curvature-circle', visible: false});
        expect(checkSceneState(JSON.parse(JSON.stringify(h.graph.state)))).toBeUndefined();
    } finally {
        h.mounted.view.unmount();
    }
});

test('only the first parametric step hides the trace; every other step, a step back and Reset set it whole or hide it again as the step says', () => {
    const h = parametric();
    try {
        const lesson = curveGeometryGuidedLessons.find(l => l.demonstrationId === 'curve-parametric')!;
        const flag = () => h.graph.state.traceFull;
        expect(flag()).toBe(true);
        for (const step of lesson.steps) {
            h.scene(step);
            expect(flag(), step.id).toBe(step.id !== 'parametric-roll');
        }
        h.scene(lesson.steps[0]);
        expect(flag()).toBe(false);
        h.scene(lesson.steps[1]);
        expect(flag()).toBe(true);
        h.scene(lesson.steps[0]);
        act(() => { void h.graph.reset(); });
        expect(flag()).toBe(true);
        h.scene(lesson.steps[0]);
        act(() => { h.graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0}); });
        expect(flag()).toBe(true);
        expect(Object.keys(h.graph.exportPresetData())).not.toContain('traceFull');
    } finally {
        h.mounted.view.unmount();
    }
});

test('a real lesson session hides the trace on step 1 only: forward, back and closing restore the whole trace', () => {
    const h = parametric();
    try {
        const lesson = getLessonForDemonstration('curve-parametric')!;
        const session = new LessonSession(lesson, h.capabilities);
        act(() => session.start());
        expect(h.graph.state.traceFull).toBe(false);
        for (let guard = 0; session.snapshot().stepIndex === 0 && guard < 10; guard++) act(() => session.next());
        expect(session.snapshot().stepIndex).toBe(1);
        expect(h.graph.state.traceFull).toBe(true);
        for (let guard = 0; session.snapshot().stepIndex === 1 && guard < 10; guard++) act(() => session.back());
        expect(session.snapshot().stepIndex).toBe(0);
        expect(h.graph.state.traceFull).toBe(false);
        act(() => session.close());
        expect(h.graph.state.traceFull).toBe(true);
    } finally {
        h.mounted.view.unmount();
    }
});


// ---- L3: curvature comb and spline joins ----------------------------------------------------------------------------------

type CombBoardObject = { elType: string; dataX?: number[]; dataY?: number[]; visProp?: { visible?: boolean } };
type CombOverlayView = {
    readoutText(): string;
    geometry(): { toothCount: number; clippedCount: number; joins: { index: number; point: number[]; kappaLeft?: number; kappaRight?: number; jump?: number }[] };
    ownedElements(): readonly unknown[];
};
type CombGraphView = {
    state: { combShown: boolean; combGain: number; combCount: number };
    curveKind(): string;
    comb(): CombOverlayView | undefined;
    board: { objectsList: unknown[] };
};
const COMB_ID: LessonId = 'curve-comb';
const combMount = () => mount<CombGraphView>(COMB_ID);
const combOf = (graph: CombGraphView) => graph.comb()!;
/** The comb curves actually on the board: teeth, tip line and clipped marks, each as the board holds them. */
const combCurvesOnBoard = (graph: CombGraphView) => (combOf(graph).ownedElements() as CombBoardObject[])
    .filter(element => element.elType === 'curve' && graph.board.objectsList.includes(element));
const finiteCount = (values: number[] | undefined) => (values ?? []).filter(Number.isFinite).length;
const toothLengths = (graph: CombGraphView) => {
    const [teeth] = combCurvesOnBoard(graph);
    const lengths: number[] = [];
    for (let k = 0; k + 1 < teeth.dataX!.length; k += 3) lengths.push(Math.hypot(teeth.dataX![k + 1] - teeth.dataX![k], teeth.dataY![k + 1] - teeth.dataY![k]));
    return lengths;
};

/** [step id, curve kind, comb shown, lines the Slovenian readout shows, numbers the prose quotes]. */
const COMB_CASES: ReadonlyArray<readonly [string, string, boolean, readonly string[], readonly string[]]> = [
    ['comb-predict', 'cubic', false, [], ['0,0596', '0,0835', '0,9333']],
    ['comb-gain', 'cubic', true, [], ['1,3333', '0,1193', '11,18']],
    ['comb-c1', 'c1', true, ['Stik 1: ukrivljenost κ levo 1,3333, desno 0,6667, skok −0,6667'], ['1,3333', '0,6667']],
    ['comb-c2', 'c2', true, ['Stik 1: ukrivljenost κ levo 0,598, desno 0,598, skok 0'], ['0,598']],
    ['comb-g1', 'g1', true, ['Stik 2: ukrivljenost κ levo 0,1217, desno −0,5635, skok −0,6852'], ['0,1217', '0,5635', '0,6852', '0,0427']],
    ['comb-explore', 'g1', true, ['Stik 2: ukrivljenost κ levo 0,1217, desno −0,1409, skok −0,2625'], ['0,1217', '0,1409', '0,2625', '0,0427']],
];

test('every comb scene shows the readout its text quotes and draws (or hides) the comb on the board', () => {
    const h = combMount();
    try {
        for (const [stepId, kind, shown, lines, numbers] of COMB_CASES) {
            const step = stepOf(COMB_ID, stepId);
            h.scene(step);
            expect(h.graph.curveKind(), stepId).toBe(kind);
            expect([h.graph.state.combShown, h.graph.state.combGain], stepId).toEqual([shown, stepId === 'comb-gain' ? 2 : 1.4]);
            const readout = combOf(h.graph).readoutText();
            if (lines.length === 0) expect(readout, stepId).toBe('');
            for (const line of lines) expect(readout, `${stepId}: ${line}`).toContain(line);
            const curves = combCurvesOnBoard(h.graph);
            expect(curves, stepId).toHaveLength(3);
            if (shown) {
                // Drawn: the teeth and the tip line hold real finite geometry, and none is clipped at the lesson gains.
                expect(finiteCount(curves[0].dataX), `${stepId} teeth`).toBeGreaterThan(0);
                expect(finiteCount(curves[1].dataX), `${stepId} tip line`).toBeGreaterThan(0);
                expect(curves.every(curve => curve.visProp?.visible !== false), stepId).toBe(true);
                expect(combOf(h.graph).geometry().clippedCount, `${stepId} clipped`).toBe(0);
            } else {
                curves.forEach(curve => expect(curve.dataX, stepId).toEqual([]));
            }
            for (const number of numbers) for (const language of ['sl', 'en'] as const) {
                expect(prose(step, language), `${stepId} ${language} quotes ${number}`).toContain(proseForm(number, language));
            }
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the quoted comb values come from the kernel: tooth lengths, join curvatures and the English readout', () => {
    const h = combMount();
    try {
        h.scene(stepOf(COMB_ID, 'comb-predict'));
        h.apply({kind: 'curve-visibility', target: 'curvature-comb', visible: true});
        const lengths = toothLengths(h.graph);
        expect(lengths).toHaveLength(64);
        expect(lengths[0]).toBeCloseTo(1.4 * (2 / 3), 6);
        expect(lengths.at(-1)!).toBeCloseTo(1.4 * 0.05963, 4);
        expect(Math.min(...lengths)).toBe(lengths.at(-1));
        expect(lengths[0]).toBeCloseTo(0.9333, 4);
        expect(lengths.at(-1)!).toBeCloseTo(0.0835, 4);

        h.scene(stepOf(COMB_ID, 'comb-gain'));
        const doubled = toothLengths(h.graph);
        expect(doubled[0]).toBeCloseTo(1.3333, 4);
        expect(doubled.at(-1)!).toBeCloseTo(0.1193, 4);
        expect(doubled[0] / doubled.at(-1)!).toBeCloseTo(11.18, 2);

        h.scene(stepOf(COMB_ID, 'comb-c1'));
        const c1 = combOf(h.graph).geometry().joins;
        expect(c1.map(join => join.jump!)).toEqual([expect.closeTo(-0.6667, 4), expect.closeTo(-0.1944, 4), expect.closeTo(-0.375, 4)]);
        expect([c1[0].kappaLeft, c1[0].kappaRight]).toEqual([expect.closeTo(1.3333, 4), expect.closeTo(0.6667, 4)]);
        setLanguage('en');
        expect(combOf(h.graph).readoutText()).toBe('Join 1: curvature κ left 1.3333, right 0.6667, jump −0.6667');
        setLanguage('sl');

        h.scene(stepOf(COMB_ID, 'comb-c2'));
        for (const join of combOf(h.graph).geometry().joins) expect(Math.abs(join.jump!)).toBeLessThan(1e-12);

        h.scene(stepOf(COMB_ID, 'comb-explore'));
        const g1 = combOf(h.graph).geometry().joins;
        expect(g1.map(join => join.jump!)).toEqual([expect.closeTo(-0.0427, 4), expect.closeTo(-0.2625, 4)]);
        // The G1 step moves b_2 only: Join 1 keeps its jump, and b_2 = 2 gives the values the observation quotes.
        h.scene(stepOf(COMB_ID, 'comb-g1'));
        expect(combOf(h.graph).geometry().joins[0].jump!).toBeCloseTo(-0.0427, 4);
        h.apply({kind: 'spline-beta', index: 1, value: 2});
        expect(combOf(h.graph).readoutText()).toContain('desno −0,0352, skok −0,1569');
    } finally {
        h.mounted.view.unmount();
    }
});

test('every sentence that says C2 implies G2 is labelled for regular curves only, in both languages', () => {
    const lesson = curveGeometryGuidedLessons.find(entry => entry.demonstrationId === 'curve-comb')!;
    for (const [language, label, claim] of [['sl', 'le za regularne krivulje', /iz C2 sledi G2/u], ['en', 'for regular curves only', /C2 implies G2/u]] as const) {
        const body = JSON.stringify(lesson, (_key, value) => (value && typeof value === 'object' && 'sl' in value && 'en' in value ? value[language] : value));
        const claims = body.split(/\.(?=\s|"|$)/u).filter(sentence => claim.test(sentence));
        expect(claims.length, language).toBeGreaterThanOrEqual(3);
        for (const sentence of claims) expect(sentence, language).toContain(label);
    }
});

/** Board objects other than axis tick labels: JSXGraph keeps a pool of tick labels sized by the widest view shown, so they follow the view, not the scene. */
const withoutTickLabels = (graph: {board: {objectsList: readonly unknown[]}}) => {
    const objects = graph.board.objectsList as ReadonlyArray<{elType?: string; labels?: readonly unknown[]}>;
    const labels = new Set(objects.filter(object => object.elType === 'ticks').flatMap(ticks => ticks.labels ?? []));
    return objects.filter(object => !labels.has(object)).length;
};

test('every comb scene keeps its view through the curve replacement and frames all control points', () => {
    const h = combMount();
    try {
        const lesson = curveGeometryGuidedLessons.find(item => item.demonstrationId === 'curve-comb')!;
        expect(lesson.steps.length).toBeGreaterThan(0);
        for (const step of lesson.steps) {
            h.scene(step);
            const box = (h.graph as unknown as {board: {getBoundingBox(): number[]}}).board.getBoundingBox();
            const scene = step.scene!;
            if (!('view' in scene) || !scene.view) throw new Error(`${step.id} has no view`);
            const [left, top, right, bottom] = scene.view;
            // The board applies an authored view through fitBoundingBox (margins, equal units) at the harness's 600 by 400 canvas.
            const expected = fitBoundingBox([[left, top], [right, bottom]], 600, 400)!;
            box.forEach((value, index) => expect(value, `${step.id} box ${index}`).toBeCloseTo(expected[index], 9));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('one synchronous scene that ends on a spline kind keeps the comb switched on, its gain and count', () => {
    const h = combMount();
    try {
        h.apply(
            {kind: 'curve-visibility', target: 'curvature-comb', visible: true}, {kind: 'comb-gain', value: 3}, {kind: 'comb-count', value: 32},
            {kind: 'comb-curve', curve: 'g1'}, {kind: 'spline-beta', index: 1, value: 0.5},
        );
        expect(h.graph.curveKind()).toBe('g1');
        expect(h.graph.state).toMatchObject({combShown: true, combGain: 3, combCount: 32});
        expect(combOf(h.graph).geometry().toothCount).toBe(Math.round(32 / 3) * 3);
        expect(combOf(h.graph).readoutText()).toContain('desno −0,5635, skok −0,6852');
        const curves = combCurvesOnBoard(h.graph);
        expect(curves).toHaveLength(3);
        expect(finiteCount(curves[0].dataX)).toBeGreaterThan(0);
        // A tooth is gain times |kappa|, so halving the kept gain must halve every tooth: this fails if the replacement dropped the gain.
        const atGainThree = toothLengths(h.graph);
        expect(Math.max(...atGainThree)).toBeGreaterThan(0);
        h.apply({kind: 'comb-gain', value: 1.5});
        const atHalfGain = toothLengths(h.graph);
        expect(atHalfGain).toHaveLength(atGainThree.length);
        atGainThree.forEach((length, index) => expect(atHalfGain[index]).toBeCloseTo(length / 2, 9));
    } finally {
        h.mounted.view.unmount();
    }
});

test('cycling all four curve kinds by lesson scenes leaves no comb element of an earlier kind on the board', () => {
    const h = combMount();
    try {
        const order = ['comb-predict', 'comb-c1', 'comb-c2', 'comb-g1'].map(id => stepOf(COMB_ID, id));
        const counts = new Map<string, number>();
        let previous: readonly unknown[] = [];
        for (let round = 0; round < 3; round++) {
            for (const step of order) {
                h.scene(step);
                const owned = combOf(h.graph).ownedElements();
                const length = withoutTickLabels(h.graph);
                if (!counts.has(step.id)) counts.set(step.id, length);
                expect(length, `${step.id} round ${round}`).toBe(counts.get(step.id));
                // Every earlier overlay element is gone; this overlay's elements are all on the board.
                previous.filter(element => !owned.includes(element)).forEach(element => expect(h.graph.board.objectsList.includes(element), step.id).toBe(false));
                owned.forEach(element => expect(h.graph.board.objectsList.includes(element), step.id).toBe(true));
                previous = owned;
            }
        }
        h.scene(order[0]);
        expect(withoutTickLabels(h.graph)).toBe(counts.get('comb-predict'));
    } finally {
        h.mounted.view.unmount();
    }
});
