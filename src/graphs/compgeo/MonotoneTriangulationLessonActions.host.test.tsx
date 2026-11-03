import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MONOTONE_PARTITION_STEP_INTERVAL_MS} from './MonotonePartitionGraph';
import {MonotoneTriangulationGraph} from './MonotoneTriangulationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand} from '../../learning/model';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {compgeoGuidedLessons, MONOTONE_EXAMPLE_1, MONOTONE_TRIANGULATION_TRACE_STEPS} from '../../learning/content/compgeoGuidedLessons';
import {partitionAndTriangulate} from '../../compgeo/sweep/monotoneTriangulation';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, callbacks, frame};
}

class Observed extends MonotoneTriangulationGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const setPolygon = (points: readonly (readonly [number, number])[]): PointSetAction => ({kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-monotone-triangulation="${name}"]`)?.textContent ?? undefined;
const READOUTS = ['step', 'piece', 'vertex', 'test', 'diagonals', 'triangles', 'comparison-monotone', 'comparison-ear'] as const;
const readouts = () => READOUTS.map(part);
const listed = (list: 'queue' | 'status', attribute: string) =>
    [...document.querySelectorAll(`[data-monotone-triangulation-list="${list}"] [${attribute}]`)] as HTMLElement[];
const stackIds = () => listed('status', 'data-status-entry').map(entry => entry.getAttribute('data-status-entry') ?? '');
const chainList = () => listed('queue', 'data-queue-entry').map(entry => entry.title || entry.textContent);

/** A mounted graph on a manual scheduler; the previous one is unmounted first (one board per document). */
function setup() {
    cleanup();
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, frames};
}
const playOneTick = (graph: Observed, frames: ReturnType<typeof manualScheduler>) => {
    apply(graph, trace('play'));
    act(() => { frames.frame(0); });
    act(() => { frames.frame(MONOTONE_PARTITION_STEP_INTERVAL_MS); });
};
const asPoints = (list: readonly (readonly [number, number])[]) => list.map(([x, y]) => ({x, y}));
const PIECE_1 = [[0, 0], [4, 3], [8, 5], [4, 8]] as const;
const countsOf = (list: readonly (readonly [number, number])[]) => {
    const outcome = partitionAndTriangulate(asPoints(list));
    if (!('counts' in outcome)) throw new Error('the kernel refused the polygon');
    return outcome.counts;
};
const number = (text: string | undefined) => Number(text?.match(/\d+/)?.[0]);

test('the default scene is the first example at step 0, stopped with nothing scheduled, and the trace actions are supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 44]);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
});

test('set-trace-step clamps a number like a stored Preset step, and end is the last step', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(21), stepAfter(999), stepAfter(-3), stepAfter(2.9), stepAfter(Number.MAX_SAFE_INTEGER)]).toEqual([21, last, 0, 2, last]);
    expect(last).toBe(MONOTONE_TRIANGULATION_TRACE_STEPS.done);
    expect(graph.state).toMatchObject({step: last});
    expect(stepAfter('end')).toBe(43);
    expect(() => graph.run1(traceStep(Number.NaN))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep('last' as 'end'))).toThrow('set-trace-step');
    expect(graph.step).toBe(43);
});

test('set-trace-step and an edit pause a running playback and leave no scheduler callback', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, traceStep(19));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([19, false, 0]);
    apply(graph, trace('next-step'));
    expect(graph.step).toBe(20);
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, setPolygon(PIECE_1));
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 23]);
});

test('Back (stopping the lesson animations), a state restore and unmount pause playback and leave no scheduler callback', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const stoppedAt = graph.step;
    act(() => { capabilities.stopAnimations?.(); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, stoppedAt]);

    apply(graph, traceStep(21));
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { capabilities.restoreState(checkpoint); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { graph.unmount(); });
    expect(frames.callbacks.size).toBe(0);
});

const lesson = () => compgeoGuidedLessons.find(entry => entry.demonstrationId === 'monotone-triangulation')!;

test('a scene change after a running playback pauses it and leaves no pending callback', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const scene = lesson().steps[2].scene!;
    act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(scene)) capabilities.apply(action);
    });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([21, false, 0]);
});

// ---- The lesson scenes ----------------------------------------------------------------------------------------------

const STEPS = ['montri-piece', 'montri-predict', 'montri-test', 'montri-diagonal', 'montri-count', 'montri-compare', 'montri-explore'];
const DIAGONALS_1 = 'Diagonale doslej (1): v2–v5';
const DIAGONALS_2 = 'Diagonale doslej (2): v2–v5, v2–v6';
const PIECE_LINE = 'Kos 1 ima 4 oglišč in dobi 2 trikotnikov.';
/** Readouts per scene: step, piece, vertex, test, diagonals, triangles, the two comparison counts; then the stack and the chain list. */
const CHAINS_1 = ['v6 — zgornje oglišče', 'v5 — desna veriga', 'v2 — desna veriga', 'v1 — spodnje oglišče'];
const EXPECTED: Record<string, {readonly shown: readonly (string | undefined)[]; readonly stack: readonly string[]; readonly chains: readonly (string | null)[]}> = {
    'montri-piece': {shown: ['Korak 15 od 43', PIECE_LINE, 'v6 — zgornje oglišče', undefined, DIAGONALS_1, 'Trikotnikov doslej: 0.', undefined, undefined], stack: [], chains: CHAINS_1},
    'montri-predict': {shown: ['Korak 19 od 43', PIECE_LINE, 'v2 — desna veriga', undefined, DIAGONALS_1, 'Trikotnikov doslej: 0.', undefined, undefined], stack: ['v6', 'v5'], chains: CHAINS_1},
    'montri-test': {
        shown: ['Korak 21 od 43', PIECE_LINE, 'v2 — desna veriga', 'Trenutni preizkus: oglišči v2 in v6, diagonala je znotraj.', DIAGONALS_1, 'Trikotnikov doslej: 0.', undefined, undefined],
        stack: ['v6'], chains: CHAINS_1,
    },
    'montri-diagonal': {shown: ['Korak 23 od 43', PIECE_LINE, 'v2 — desna veriga', undefined, DIAGONALS_2, 'Trikotnikov doslej: 1.', undefined, undefined], stack: [], chains: CHAINS_1},
    'montri-count': {shown: ['Korak 28 od 43', PIECE_LINE, 'v1 — spodnje oglišče', undefined, DIAGONALS_2, 'Trikotnikov doslej: 2.', undefined, undefined], stack: [], chains: CHAINS_1},
    'montri-compare': {
        shown: ['Korak 43 od 43', 'Kos 2 ima 4 oglišč in dobi 2 trikotnikov.', 'v3 — spodnje oglišče', undefined, 'Diagonale doslej (3): v2–v5, v2–v6, v3–v5', 'Trikotnikov: 4 = n − 2 pri n = 6.',
            'Monotona metoda (razdelitev in triangulacija): 11 izračunov predikatov.', 'Rezanje ušes na istem večkotniku: 21 izračunov predikatov.'],
        stack: [], chains: ['v4 — zgornje oglišče', 'v5 — leva veriga', 'v2 — leva veriga', 'v3 — spodnje oglišče'],
    },
    'montri-explore': {shown: ['Korak 0 od 43', undefined, undefined, undefined, 'Diagonal doslej še ni.', undefined, undefined, undefined], stack: [], chains: []},
};

test('the seven scenes run in one synchronous sequence, show the readouts the text quotes, frame their polygon and never play', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    expect(lesson().steps.map(step => step.id)).toEqual(STEPS);
    for (const stepId of STEPS) {
        const scene = lesson().steps.find(step => step.id === stepId)!.scene!;
        act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(scene)) capabilities.apply(action);
        });
        expect(readouts(), stepId).toEqual(EXPECTED[stepId].shown);
        expect(stackIds(), stepId).toEqual(EXPECTED[stepId].stack);
        expect(chainList(), stepId).toEqual(EXPECTED[stepId].chains);
        expect([graph.isPlaying, frames.callbacks.size], stepId).toEqual([false, 0]);
        // Every polygon vertex of the scene lies inside the lesson view [left, top, right, bottom].
        if (scene.basedOn !== 'demonstration-default' || !scene.view) throw new Error('every scene frames its polygon');
        const view = scene.view;
        expect(graph.model.points.length, stepId).toBe(6);
        for (const p of graph.model.points) {
            expect(p.x, stepId).toBeGreaterThanOrEqual(view[0]);
            expect(p.x, stepId).toBeLessThanOrEqual(view[2]);
            expect(p.y, stepId).toBeLessThanOrEqual(view[1]);
            expect(p.y, stepId).toBeGreaterThanOrEqual(view[3]);
        }
    }
});

test('the quoted trace positions are the partition boundary and the readouts the text names, and the view frames the polygon with a margin of 1', () => {
    const {graph} = setup();
    const run = graph.run();
    expect(run.boundary).toBe(MONOTONE_TRIANGULATION_TRACE_STEPS.partitionDone);
    expect(run.pieceCount).toBe(2);
    expect([run.pieceSize(0), run.pieceSize(1)]).toEqual([4, 4]);
    const scene = lesson().steps[0].scene!;
    expect(scene.basedOn === 'demonstration-default' ? scene.view : undefined).toEqual([-1, 9, 13, -1]);
    // The text says piece 2 also gets two triangles once Next step has started it, and that the first triangulation step is the pop of v6.
    apply(graph, traceStep(29));
    expect(part('piece')).toBe('Kos 2 ima 4 oglišč in dobi 2 trikotnikov.');
    apply(graph, traceStep(MONOTONE_TRIANGULATION_TRACE_STEPS.partitionDone));
    expect(part('phase')).toBe('Faza: razdelitev');
    apply(graph, trace('next-step'));
    expect(part('phase')).toBe('Faza: triangulacija kosa 1 od 2');
    expect(part('step')).toBe(`Korak ${MONOTONE_TRIANGULATION_TRACE_STEPS.topVertex} od 43`);
});

test('the comparison counts quoted in the lesson equal the counts of the monotone triangulation kernel for the same polygon', () => {
    const {graph} = setup();
    apply(graph, traceStep('end'));
    const kernel = countsOf(MONOTONE_EXAMPLE_1);
    expect(kernel).toEqual({monotone: 11, earClipping: 21});
    expect(graph.run().counts).toEqual(kernel);
    expect([number(part('comparison-monotone')), number(part('comparison-ear'))]).toEqual([kernel.monotone, kernel.earClipping]);
    // The quadrilateral of piece 1 on its own, quoted in step 6: the order of the two counts is reversed.
    apply(graph, setPolygon(PIECE_1));
    apply(graph, traceStep('end'));
    const piece = countsOf(PIECE_1);
    expect(piece).toEqual({monotone: 7, earClipping: 3});
    expect([number(part('comparison-monotone')), number(part('comparison-ear'))]).toEqual([piece.monotone, piece.earClipping]);
    // The growth statement and the caveat are on the panel.
    expect(part('comparison-growth')).toContain('O(n²)');
    expect(part('comparison-note')).toBe('Majhna števila to ponazarjajo, ne dokazujejo.');
});

test('the finished triangulation has n - 2 triangles and n - 3 diagonals, and every piece n - 2 triangles', () => {
    const {graph} = setup();
    const run = graph.run();
    expect(run.triangles.length).toBe(6 - 2);
    expect(run.allDiagonals.length).toBe(6 - 3);
    expect([0, 1].map(k => run.pieceSize(k) - 2)).toEqual([2, 2]);
});
