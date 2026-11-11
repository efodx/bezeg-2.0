/**
 * Exports while a De Casteljau run is playing. BaseGraph calls `beforeFigureCapture()` before a single-figure SVG/PNG
 * export and before a figure batch, so the exported scene is one settled scene (controls stream, state.md).
 */
import {act} from '@testing-library/react';
import type {Mock} from 'vitest';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {capturePNGBlob, downloadSVG} from '../../base/export/FigureCapture';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle} from '../../base/realGraphTestHarness';
import {internals} from '../../base/realGraphScenes';

vi.mock('../../base/export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('../../base/export/FigureCapture')>('../../base/export/FigureCapture'),
    downloadSVG: vi.fn(async () => undefined),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

type Run = BaseGraph<BaseGraphState> & {
    state: {t: number; animationStatus: string};
    playAnimation(): void;
    getFirstJxgCurve(): {getDecasteljauT(): number};
    lessonAnimation: {isRunning(): boolean};
};

/** Manual frame source standing in for fake timers: the test decides when pending frames run. */
function manualFrames() {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    return {
        advance(ms: number) {
            const due = pending;
            pending = [];
            time += ms;
            act(() => due.forEach(callback => callback(time)));
        },
        pendingCount: () => pending.length,
    };
}

function startRun() {
    const frames = manualFrames();
    const mounted = mountGraph(graphFactories.decasteljau());
    const graph = mounted.graph as Run;
    act(() => graph.playAnimation());
    for (let i = 0; i < 3; i++) frames.advance(100);
    expect(graph.lessonAnimation.isRunning()).toBe(true);
    return {frames, mounted, graph};
}
const drawn = (graph: Run) => graph.getFirstJxgCurve().getDecasteljauT();

afterEach(() => vi.restoreAllMocks());

describe('exports during a running De Casteljau run', () => {
    test('a single-figure export pauses the run first and the captured scene stays put', async () => {
        const {frames, mounted, graph} = startRun();
        const before = drawn(graph);
        expect(before).toBeGreaterThan(0.5);
        const seen: Array<{drawn: number; running: boolean; status: string; frames: number}> = [];
        (downloadSVG as Mock).mockImplementation(async () => {
            seen.push({drawn: drawn(graph), running: graph.lessonAnimation.isRunning(), status: graph.state.animationStatus, frames: frames.pendingCount()});
            frames.advance(500);
            frames.advance(500);
            seen.push({drawn: drawn(graph), running: graph.lessonAnimation.isRunning(), status: graph.state.animationStatus, frames: frames.pendingCount()});
        });
        await settle(() => graph.saveAsSVG('figure'));
        expect(seen).toEqual([
            {drawn: before, running: false, status: 'paused', frames: 0},
            {drawn: before, running: false, status: 'paused', frames: 0},
        ]);
        expect(graph.state.t).toBe(before);
        mounted.view.unmount();
    });

    test('a figure batch pauses the run; it is left paused at the drawn step, not resumed', async () => {
        const {frames, mounted, graph} = startRun();
        const before = drawn(graph);
        const stored = {...graph.exportPreset(), id: 'batch-entry'};
        const during: Array<{running: boolean; status: string}> = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            during.push({running: graph.lessonAnimation.isRunning(), status: graph.state.animationStatus});
            frames.advance(500);
            return new Blob(['png']);
        });
        await settle(async () => {
            const batch = internals(graph).exportPresetFigures([stored]);
            // the run is paused before the batch's first await, i.e. before any scene replacement could end it
            expect(graph.lessonAnimation.isRunning()).toBe(false);
            expect(graph.state.animationStatus).toBe('paused');
            await batch;
        });
        expect(during).toEqual([{running: false, status: 'paused'}]);
        // After the batch the scene the user had is back, still paused at the step it was paused at.
        expect(graph.lessonAnimation.isRunning()).toBe(false);
        expect(frames.pendingCount()).toBe(0);
        expect(graph.state.animationStatus).toBe('paused');
        expect(graph.state.t).toBe(before);
        expect(drawn(graph)).toBe(before);
        mounted.view.unmount();
    });

    test('exportPreset during a run saves the paused drawn parameter, not a playing status', () => {
        const {mounted, graph} = startRun();
        const before = drawn(graph);
        // the export of a Preset itself does not call the capture hook; the run is paused by the capture path before it
        (graph as unknown as {beforeFigureCapture(): void}).beforeFigureCapture();
        const saved = graph.exportPreset().graphState as unknown as {t: number; animationStatus: string};
        expect(saved.t).toBe(before);
        expect(saved.animationStatus).not.toBe('playing');
        mounted.view.unmount();
    });
});
