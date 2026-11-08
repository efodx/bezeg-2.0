import React from 'react';
import {act, cleanup, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MONOTONE_PARTITION_STEP_INTERVAL_MS, MonotonePartitionGraph} from './MonotonePartitionGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction, LessonAnimationCommand} from '../../learning/model';
import {sceneActions} from '../../learning/runtime/lessonCatalog';
import {compgeoGuidedLessons, MONOTONE_EXAMPLE_1, MONOTONE_EXAMPLE_2, MONOTONE_TRACE_STEPS} from '../../learning/content/compgeoGuidedLessons';
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

class Observed extends MonotonePartitionGraph {
    /** The lesson runtime's entry point, exposed for synchronous action sequences. */
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

type PointSetAction = Extract<LessonAction, {kind: 'point-set'}>;
const trace = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});
const traceStep = (step: number | 'end'): PointSetAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const setPolygon = (points: readonly (readonly [number, number])[]): PointSetAction => ({kind: 'point-set', operation: 'set-points', mode: 'polygon', closed: true, points});
const apply = (graph: Observed, action: LessonAction) => act(() => { graph.run1(action); });
const part = (name: string) => document.querySelector(`[data-monotone-partition="${name}"]`)?.textContent ?? undefined;
const READOUTS = ['step', 'vertex', 'diagonals', 'summary', 'type-counts', 'balance'] as const;
const readouts = () => READOUTS.map(part);
const statusTexts = () => [...document.querySelectorAll('[data-monotone-partition-list="status"] [data-status-entry]')].map(entry => (entry as HTMLElement).title);

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
/** Doubled shoelace sum halved: the area of a piece given as vertex indices into the input. */
const area = (points: readonly {x: number; y: number}[], piece: readonly number[]) =>
    Math.abs(piece.reduce((sum, k, i) => {
        const a = points[k];
        const b = points[piece[(i + 1) % piece.length]];
        return sum + a.x * b.y - b.x * a.y;
    }, 0)) / 2;
const asPoints = (list: readonly (readonly [number, number])[]) => list.map(([x, y]) => ({x, y}));

test('the default scene is the first example at step 0, stopped with nothing scheduled, and the trace actions are supported', () => {
    const {graph, frames} = setup();
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.run().length]).toEqual([0, false, 0, 15]);
    for (const command of ['next-step', 'reset', 'play', 'pause', 'replay'] as const) expect(graph.supportsLessonAction(trace(command))).toBe(true);
    expect(graph.supportsLessonAction(traceStep('end'))).toBe(true);
});

test('set-trace-step clamps a number like a stored Preset step, and end is the last step', () => {
    const {graph} = setup();
    const last = graph.run().length - 1;
    const stepAfter = (step: number | 'end') => { apply(graph, traceStep(step)); return graph.step; };
    expect([stepAfter(5), stepAfter(999), stepAfter(-3), stepAfter(2.9), stepAfter(Number.MAX_SAFE_INTEGER)]).toEqual([5, last, 0, 2, last]);
    expect(graph.state).toMatchObject({step: last});
    apply(graph, traceStep(-3));
    expect(graph.state).toMatchObject({step: 0});
    expect(stepAfter('end')).toBe(14);
    expect(() => graph.run1(traceStep(Number.NaN))).toThrow('set-trace-step');
    expect(() => graph.run1(traceStep('last' as 'end'))).toThrow('set-trace-step');
    expect(graph.step).toBe(14);
});

test('set-trace-step pauses a running playback, leaves no scheduler callback and keeps later Next steps working', () => {
    const {graph, frames} = setup();
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, traceStep(4));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([4, false, 0]);
    apply(graph, trace('next-step'));
    expect(graph.step).toBe(5);
    apply(graph, traceStep('end'));
    apply(graph, trace('play'));
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([14, false, 0]);
});

test('an edit action pauses playback and returns to step 0', () => {
    const {graph, frames} = setup();
    apply(graph, traceStep(7));
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    apply(graph, setPolygon(MONOTONE_EXAMPLE_2));
    expect([graph.step, graph.isPlaying, frames.callbacks.size, graph.model.points.length, graph.run().length]).toEqual([0, false, 0, 9, 21]);
    expect(part('step')).toBe('Korak 1 od 21');
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

    apply(graph, traceStep(8));
    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { capabilities.restoreState(checkpoint); });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    apply(graph, trace('play'));
    expect(frames.callbacks.size).toBe(1);
    act(() => { graph.unmount(); });
    expect(frames.callbacks.size).toBe(0);
});

test('a scene change after a running playback pauses it and leaves no pending callback', () => {
    const {graph, frames} = setup();
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const lesson = compgeoGuidedLessons.find(entry => entry.demonstrationId === 'monotone-partition')!;
    playOneTick(graph, frames);
    expect(graph.isPlaying).toBe(true);
    const scene = lesson.steps[2].scene!;
    act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(scene)) capabilities.apply(action);
    });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([5, false, 0]);
});

// ---- The lesson scenes ----------------------------------------------------------------------------------------------

const lesson = () => compgeoGuidedLessons.find(entry => entry.demonstrationId === 'monotone-partition')!;
const STEPS = ['monpart-polygon', 'monpart-predict', 'monpart-classify', 'monpart-helper', 'monpart-diagonal', 'monpart-pieces', 'monpart-merge-only', 'monpart-explore'];
const NONE = 'Diagonal doslej še ni.';
const COUNTS_1 = 'Oglišča po vrstah: začetnih 2, končnih 2, razcepnih 1, zlivnih 1, navadnih 0.';
const BALANCE_1 = 'Začetna + razcepna = 2 + 1 = 3; končna + zlivna = 2 + 1 = 3.';
/** The readouts each scene must show (step, vertex, diagonals, summary, type counts, balance) and the status list (edge with helper). */
const EXPECTED: Record<string, {readonly shown: readonly (string | undefined)[]; readonly status: readonly string[]}> = {
    'monpart-polygon': {shown: ['Korak 1 od 15', undefined, NONE, undefined, undefined, undefined], status: []},
    'monpart-predict': {shown: ['Korak 1 od 15', undefined, NONE, undefined, undefined, undefined], status: []},
    'monpart-classify': {shown: ['Korak 6 od 15', 'Oglišče v5 je zlivno.', NONE, undefined, undefined, undefined], status: ['e6 — pomočnik v6', 'e4 — pomočnik v4']},
    'monpart-helper': {shown: ['Korak 7 od 15', 'Oglišče v5 je zlivno.', NONE, undefined, undefined, undefined], status: ['e6 — pomočnik v5']},
    'monpart-diagonal': {shown: ['Korak 9 od 15', 'Oglišče v2 je razcepno.', 'Diagonale doslej (1): v2–v5', undefined, undefined, undefined], status: ['e6 — pomočnik v2']},
    'monpart-pieces': {shown: ['Korak 15 od 15', 'Oglišče v3 je končno.', 'Diagonale doslej (1): v2–v5', 'Kosov je 2 = število diagonal (1) + 1.', COUNTS_1, BALANCE_1], status: []},
    'monpart-merge-only': {
        shown: ['Korak 21 od 21', 'Oglišče v1 je končno.', 'Diagonale doslej (2): v5–v7, v3–v5', 'Kosov je 3 = število diagonal (2) + 1.',
            'Oglišča po vrstah: začetnih 3, končnih 1, razcepnih 0, zlivnih 2, navadnih 3.', 'Začetna + razcepna = 3 + 0 = 3; končna + zlivna = 1 + 2 = 3.'],
        status: [],
    },
    'monpart-explore': {shown: ['Korak 1 od 15', undefined, NONE, undefined, undefined, undefined], status: []},
};

test('the eight scenes run in one synchronous sequence, show the readouts the text quotes, frame their polygon and never play', () => {
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
        expect(statusTexts(), stepId).toEqual(EXPECTED[stepId].status);
        expect([graph.isPlaying, frames.callbacks.size], stepId).toEqual([false, 0]);
        // Every polygon vertex of the scene lies inside the lesson view [left, top, right, bottom].
        if (scene.basedOn !== 'demonstration-default' || !scene.view) throw new Error('every scene frames its polygon');
        const view = scene.view;
        expect(graph.model.points.length, stepId).toBeGreaterThanOrEqual(6);
        for (const p of graph.model.points) {
            expect(p.x, stepId).toBeGreaterThanOrEqual(view[0]);
            expect(p.x, stepId).toBeLessThanOrEqual(view[2]);
            expect(p.y, stepId).toBeLessThanOrEqual(view[1]);
            expect(p.y, stepId).toBeGreaterThanOrEqual(view[3]);
        }
    }
});

test('the views frame the two polygons with a margin of 1', () => {
    const viewOf = (id: string) => { const scene = lesson().steps.find(step => step.id === id)!.scene!; return scene.basedOn === 'demonstration-default' ? scene.view : undefined; };
    expect(viewOf('monpart-polygon')).toEqual([-1, 9, 13, -1]);
    expect(viewOf('monpart-merge-only')).toEqual([-1, 13, 13, -1]);
});

test('the first example has the stated types, helper, diagonal (4,3)(8,5) and two pieces of area 20', () => {
    const {graph} = setup();
    const run = graph.run();
    const points = asPoints(MONOTONE_EXAMPLE_1);
    expect(run.types).toEqual(['end', 'split', 'end', 'start', 'merge', 'start']);
    // The processing order: (4,8), (12,8), (8,5), (4,3), (0,0), (8,0).
    expect(run.view(run.length - 1).processed.map(k => [points[k].x, points[k].y])).toEqual([[4, 8], [12, 8], [8, 5], [4, 3], [0, 0], [8, 0]]);
    expect(run.length).toBe(MONOTONE_TRACE_STEPS.done + 1);
    // Step 6: the merge vertex v5 = (8,5) is the helper of the left edge e6.
    const helper = run.view(MONOTONE_TRACE_STEPS.helper);
    expect([...helper.helpers]).toEqual([[5, 4]]);
    expect(helper.status).toEqual([5]);
    // The diagonal joins the split vertex (4,3) to the merge vertex (8,5).
    expect(run.diagonals.map(([a, b]) => [points[a], points[b]])).toEqual([[{x: 4, y: 3}, {x: 8, y: 5}]]);
    expect(run.view(MONOTONE_TRACE_STEPS.diagonal).diagonals).toEqual([[1, 4]]);
    expect(run.view(MONOTONE_TRACE_STEPS.diagonal - 1).diagonals).toEqual([]);
    expect(run.pieces.map(piece => area(points, piece))).toEqual([20, 20]);
    expect(area(points, [0, 1, 2, 3, 4, 5])).toBe(40);
    expect(run.pieces.length).toBe(run.diagonals.length + 1);
});

test('the second example needs diagonals although it has two merge vertices and no split', () => {
    const {graph} = setup();
    apply(graph, setPolygon(MONOTONE_EXAMPLE_2));
    const run = graph.run();
    const points = asPoints(MONOTONE_EXAMPLE_2);
    expect(run.types).toEqual(['end', 'regular', 'regular', 'start', 'merge', 'start', 'merge', 'start', 'regular']);
    expect(run.typeCounts).toEqual({start: 3, end: 1, split: 0, merge: 2, regular: 3});
    expect(run.length).toBe(MONOTONE_TRACE_STEPS.secondDone + 1);
    // The tie rule: (3,7) is handled before (7,7).
    const order = run.view(run.length - 1).processed.map(k => [points[k].x, points[k].y]);
    expect(order.findIndex(p => p[0] === 3 && p[1] === 7)).toBeLessThan(order.findIndex(p => p[0] === 7 && p[1] === 7));
    expect(run.diagonals.map(([a, b]) => [[points[a].x, points[a].y], [points[b].x, points[b].y]])).toEqual([[[7, 7], [3, 7]], [[8, 5], [7, 7]]]);
    expect(run.pieces.map(piece => area(points, piece))).toEqual([10, 42, 6]);
    expect(area(points, points.map((_, k) => k))).toBe(58);
});

test('three collinear consecutive vertices are refused with a message and no trace', () => {
    const {graph} = setup();
    apply(graph, setPolygon([[0, 0], [2, 0], [4, 0], [4, 4]]));
    expect(graph.run().length).toBe(0);
    expect(document.querySelector('[data-monotone-partition="refusal"]')).not.toBeNull();
});

const QUOTED: Record<string, {readonly step: number; readonly total: number; readonly diagonals?: number; readonly pieces?: number}> = {
    'monpart-polygon': {step: 1, total: 15},
    'monpart-predict': {step: 1, total: 15},
    'monpart-classify': {step: 6, total: 15},
    'monpart-helper': {step: 7, total: 15},
    'monpart-diagonal': {step: 9, total: 15, diagonals: 1},
    'monpart-pieces': {step: 15, total: 15, diagonals: 1, pieces: 2},
    'monpart-merge-only': {step: 21, total: 21, diagonals: 2, pieces: 3},
    'monpart-explore': {step: 1, total: 15},
};

test('the numbers quoted in each step text equal the panel readouts of its scene (sl and en)', () => {
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        const {graph} = setup();
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        for (const step of lesson().steps) {
            const quoted = QUOTED[step.id];
            act(() => {
                capabilities.restoreState(checkpoint);
                for (const action of sceneActions(step.scene!)) capabilities.apply(action);
            });
            const text = [step.explanation[language], ...(step.expectedObservations ?? []).map(o => o[language]), step.scene!.expectedState[language]].join('\n');
            const [shownStep, shownTotal] = (part('step') ?? '').match(/\d+/g)!.map(Number);
            expect([shownStep, shownTotal], `${step.id} ${language} step readout`).toEqual([quoted.step, quoted.total]);
            expect(text, `${step.id} ${language}`).toContain(`\\(${shownStep}\\)`);
            expect(text, `${step.id} ${language}`).toContain(`\\(${shownTotal}\\)`);
            const listed = Number((part('diagonals') ?? '').match(/\((\d+)\)/)?.[1] ?? 0);
            if (quoted.diagonals !== undefined) {
                expect(listed, `${step.id} ${language} diagonals readout`).toBe(quoted.diagonals);
                expect(text, `${step.id} ${language}`).toContain(`\\(${listed}\\)`);
            }
            if (quoted.pieces !== undefined) {
                expect(Number((part('summary') ?? '').match(/\d+/)?.[0]), `${step.id} ${language} pieces readout`).toBe(quoted.pieces);
                expect(text, `${step.id} ${language}`).toContain(`\\(${quoted.pieces}\\)`);
                expect(quoted.pieces, step.id).toBe(listed + 1);
                const counts = (part('type-counts') ?? '').match(/\d+/g)!.map(Number);
                for (const count of counts) expect(text, `${step.id} ${language} type count`).toContain(`\\(${count}\\)`);
                // Only the first example's step states the balance sums.
                const balance = (part('balance') ?? '').match(/\d+/g)!.map(Number);
                expect(balance[0] + balance[1], `${step.id} balance`).toBe(balance[2]);
                if (step.id === 'monpart-pieces') expect(text, `${step.id} ${language}`).toContain(`\\(${balance[0]}+${balance[1]}=${balance[2]}\\)`);
            }
        }
    }
});
