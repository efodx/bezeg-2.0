/**
 * Piece counts of the JSXGraph surface view follow segment length: a control-net edge lengthened by a point edit is
 * re-split (and stays in painter's order), but never while a point is being dragged.
 */
import {afterAll, beforeAll, afterEach, describe, expect, it, vi} from 'vitest';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {DESKTOP} from './jsxFraming.test-helper';
import {checkDepthOrder} from './jsxDepthCheck.test-helper';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import type {SurfaceScene, Xyz} from './surface-view/surfaceScene';

const N = 12;

/** A rolling (N+1)^2 height field over [0,6]^2; mean edge about 0.5. */
function mesh(): {positions: number[]; faces: number[]; visible: true} {
    const positions: number[] = [], faces: number[] = [];
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) positions.push(i / N * 6, j / N * 6, 0.9 * Math.sin(i * 0.9) * Math.cos(j * 0.7));
    for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
            const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1;
            faces.push(a, b, d, a, d, c);
        }
    }
    return {positions, faces, visible: true};
}

/** One net edge from (0.5,3,1.6) to `end`, hovering above the surface; the second point is draggable. */
function sceneWithEdge(end: Xyz, revision: number): SurfaceScene {
    return {
        revision,
        points: [{id: 'a', xyz: [0.5, 3, 1.6]}, {id: 'b', xyz: end}],
        polylines: [{id: 'net', role: 'net', points: [[0.5, 3, 1.6], end]}],
        mesh: mesh(), markers: [], labels: [],
        camera: {az: 0.9, el: 0.45, distance: 16, projection: 'perspective', target: [3, 3, 0]},
        interaction: {zMode: false, editable: true},
    };
}

const SHORT: Xyz = [0.8, 3, 1.6];
const LONG: Xyz = [5.5, 3.2, 1.2];

interface Internals {pool: {pieces: number[]; segs: Uint32Array}; interaction: object}
const internals = (view: JsxSurfaceView): Internals => view as unknown as Internals;

async function mount(scene: SurfaceScene): Promise<JsxSurfaceView> {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: DESKTOP.width});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: DESKTOP.height});
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(scene);
    await view.attach(host);
    view.flush();
    return view;
}

describe('JSXGraph surface view re-splits segments whose length changed', () => {
    beforeAll(() => installBoardShims(), REAL_GRAPH_TEST_TIMEOUT);
    afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });
    afterAll(() => undefined);

    it('gives a lengthened net edge more pieces, in the right painter order', async () => {
        const view = await mount(sceneWithEdge(SHORT, 1));
        expect(internals(view).pool.pieces).toEqual([1]);
        view.reconcile(sceneWithEdge(LONG, 2));
        view.flush();
        const pieces = internals(view).pool.pieces[0];
        expect(pieces).toBeGreaterThan(4);
        expect(internals(view).pool.segs.length / 2).toBe(pieces);
        view.dispose();
        const report = await checkDepthOrder(sceneWithEdge(LONG, 2), DESKTOP, 1.25, undefined, sceneWithEdge(SHORT, 1));
        expect(report.pieces).toBe(pieces);
        expect(report.decisive).toBeGreaterThan(0);
        expect(report.violations).toEqual([]);
    }, 60_000);

    it('keeps the split while a point is dragged and re-splits once the drag is over', async () => {
        const view = await mount(sceneWithEdge(SHORT, 1));
        const interaction = internals(view).interaction as {draggedPointId: string | null};
        const spy = vi.spyOn(interaction, 'draggedPointId', 'get').mockReturnValue('b');
        view.reconcile(sceneWithEdge(LONG, 2));
        view.flush();
        expect(internals(view).pool.pieces).toEqual([1]);
        spy.mockReturnValue(null);
        view.reconcile(sceneWithEdge(LONG, 2));
        view.flush();
        expect(internals(view).pool.pieces[0]).toBeGreaterThan(4);
        view.dispose();
    }, 60_000);

    it('does not re-split for a small length change (hysteresis)', async () => {
        const view = await mount(sceneWithEdge(LONG, 1));
        const before = internals(view).pool.pieces.slice();
        const nudged: Xyz = [LONG[0] - 0.1, LONG[1], LONG[2]];
        const created = (view as unknown as {stats: {drawableRebuilds: number}}).stats.drawableRebuilds;
        view.reconcile(sceneWithEdge(nudged, 2));
        view.flush();
        expect(internals(view).pool.pieces).toEqual(before);
        expect((view as unknown as {stats: {drawableRebuilds: number}}).stats.drawableRebuilds).toBe(created);
        view.dispose();
    }, 60_000);
});
