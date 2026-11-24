import {act} from '@testing-library/react';
import {beforeAll, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from './PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {curvePaths, pathDeviation} from '../base/preview/paths';
import {sampledRange, type PreviewCurves} from '../base/preview/previewGeometry';
import {runAs} from '../base/writes/writeSource';
import type {GraphDeclaration} from '../base/declare/graphDeclaration';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

/** Distance between the live board's polyline and the geometry's (the board's is JSXGraph's adaptive one). */
const TOLERANCE = 0.05;

function setup() {
    const graph = new PhasePortraitGraph();
    const {view} = mountGraph(graph);
    const geometry = graph.getPreviewGeometry()!;
    const view$ = () => sampledRange((graph['board'] as unknown as {getBoundingBox(): number[]}).getBoundingBox());
    /** What a preview of `value` shows, from the snapshot read now. */
    const preview = (value: number): PreviewCurves => geometry({state: graph.state, preset: graph.exportPreset()}, 'phase-a', value, view$());
    /** What the live board draws. */
    const drawn = () => curvePaths((graph as unknown as {drawnElements: Map<string, unknown>})['drawnElements'].get('trajectories'));
    return {graph, view, preview, drawn};
}

const deviation = (a: PreviewCurves, drawn: ReturnType<ReturnType<typeof setup>['drawn']>) => pathDeviation(a.forward, drawn);

describe('phase portrait preview equals the live board', () => {
    test('the declaration marks A previewable and the graph has a geometry function', () => {
        const {graph} = setup();
        const parameter = (graph.getDeclaration() as GraphDeclaration).parameters!.find(candidate => candidate.key === 'phase-a')!;
        expect(parameter).toMatchObject({kind: 'range', previewable: true});
        expect(graph.getPreviewGeometry()).toBeDefined();
    });

    test('the forward orbits at several values of a equal what the board draws after a learner write', () => {
        const {graph, preview, drawn} = setup();
        for (const a of [-4, -2.5, -1, 0.5, 2]) {
            const predicted = preview(a);
            act(() => { runAs('learner', () => graph.parameters!.write('phase-a', a, 'learner')); });
            graph.flushStateChanges();
            const live = drawn();
            expect(live.length).toBeGreaterThan(0);
            expect(predicted.forward.length).toBeGreaterThan(0);
            expect(deviation(predicted, live)).toBeLessThan(TOLERANCE);
        }
    });

    test('a perturbed value is caught: the preview of another a differs from the board', () => {
        const {graph, preview, drawn} = setup();
        act(() => { graph.parameters!.write('phase-a', -4, 'learner'); });
        graph.flushStateChanges();
        expect(deviation(preview(-1), drawn())).toBeGreaterThan(2 * TOLERANCE);
    });
});

describe('a preview leaves the scene and the arbiter alone', () => {
    test('during a drag-like lease, a sweep of previews and playback, the export and the arbiter value are unchanged', () => {
        const {graph, preview} = setup();
        const arbiter = graph.parameters!;
        const check = (when: string) => {
            const exported = JSON.stringify(graph.exportPreset());
            const value = arbiter.read('phase-a');
            const leases = arbiter.activeLeases().length;
            for (const a of [-4, -3, -1.75, 0, 1, 2.5, 4]) preview(a);
            expect(JSON.stringify(graph.exportPreset()), when).toBe(exported);
            expect(arbiter.read('phase-a'), when).toBe(value);
            expect(arbiter.activeLeases().length, when).toBe(leases);
        };
        check('at rest');
        // A sweep: an animation lease on the key, with writes through it.
        const lease = arbiter.lease(['phase-a']);
        expect(lease).toBeDefined();
        act(() => { for (const a of [0.5, 1, 1.5]) lease!.write('phase-a', a); });
        graph.flushStateChanges();
        expect(arbiter.read('phase-a')).toBe(1.5);
        check('during the lease');
        act(() => { lease!.release(); });
        // Playback running.
        act(() => { runAs('learner', () => graph.play()); });
        expect(graph.playing).toBe(true);
        check('during playback');
        act(() => { runAs('learner', () => graph.pausePlayback()); });
    });
});
