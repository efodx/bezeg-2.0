import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {boards} from 'jsxgraph';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {createGraph, installBoardShims, mountGraph, surfaceViewOf} from '../base/realGraphTestHarness';
import TensorPatchGraph from './TensorPatchGraph';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import {LifecycleProbe, type ProbeCounts} from './surface-view/jsxLifecycleProbe.test-helper';
import type {SurfaceScene} from './surface-view/surfaceScene';

// Lifecycle of the JSXGraph surface view (task 06 of docs/specs/jsxgraph-surface-view.md, criterion 6): after dispose
// nothing of the view is left behind. The numbers come from counting spies on the browser APIs (listeners per target,
// ResizeObserver, matchMedia, timers, animation frames) and from JSXGraph's own board registry.

const boardCount = (): number => Object.keys(boards as object).length;
let probe: LifecycleProbe;
let scene: SurfaceScene;

beforeAll(() => {
    installBoardShims();
    // A real patch scene, taken from the graph that feeds the view.
    const graph = createGraph('patch-tensor');
    const mounted = mountGraph(graph);
    scene = surfaceViewOf(graph)!.last;
    mounted.view.unmount();
});
beforeEach(() => { probe = new LifecycleProbe(); probe.install(); });
afterEach(() => { probe.uninstall(); document.body.innerHTML = ''; });

const dispatchPointer = (target: Element, type: string, x: number, y: number): void => {
    const event = new MouseEvent(type, {clientX: x, clientY: y, bubbles: true, cancelable: true});
    Object.defineProperty(event, 'pointerId', {value: 1});
    act(() => { target.dispatchEvent(event); });
};
/** Checked right after dispose: no wait, so a frame the view left pending shows (it would only be harmless once it fires). */
const expectBaseline = (what: string, baseline: ProbeCounts, host?: Element | null, ignore?: Element): void => {
    expect(probe.count(host, ignore), `${what}: ${probe.outstanding().join(' || ')}`).toEqual(baseline);
};

describe('JsxSurfaceView lifecycle', () => {
    it('leaves no board, listener, observer, timer or frame behind over three mounts of the patch route', async () => {
        const baselineBoards = boardCount();
        const baseline = probe.count();
        for (let cycle = 0; cycle < 3; cycle++) {
            const view = new JsxSurfaceView();
            const graph = new TensorPatchGraph({viewFactory: () => view, typeset: async () => undefined});
            const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
            const container = await waitFor(() => {
                const el = rendered.container.querySelector<HTMLElement>('[data-jsx-surface-view]');
                if (!el) throw new Error('the JSX view is not attached yet');
                return el;
            });
            const host = container.parentElement!;
            await waitFor(() => expect(host.querySelectorAll('[data-label-id]').length).toBeGreaterThan(0));
            expect(boardCount(), 'the view board and the parameter inset are alive while mounted').toBe(baselineBoards + 2);
            const mounted = probe.count(host, rendered.container);
            expect(mounted.observers, 'the view observes its host').toBeGreaterThan(0);
            expect(mounted.host, 'the view listens on its host').toBeGreaterThan(0);
            // Some interaction: an orbit drag, a wheel zoom and an arrow key (the camera edit starts the settle timer).
            dispatchPointer(container, 'pointerdown', 10, 10);
            dispatchPointer(container, 'pointermove', 40, 25);
            dispatchPointer(container, 'pointerup', 40, 25);
            act(() => { fireEvent.wheel(container, {deltaY: 100}); });
            act(() => { fireEvent.keyDown(host, {key: 'ArrowLeft'}); });
            act(() => view.flush());
            rendered.unmount();
            rendered.container.remove();
            expect(boardCount(), `board count after unmount ${cycle}`).toBe(baselineBoards);
            expectBaseline(`after unmount ${cycle}`, baseline);
        }
    }, 60_000);

    it('disposes a view that is still waiting for its first frame, and one that never attached', async () => {
        const baselineBoards = boardCount();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const baseline = probe.count(host);

        const pending = new JsxSurfaceView();
        pending.reconcile(scene);
        const attaching = pending.attach(host);
        pending.dispose();
        pending.dispose();
        expect(boardCount()).toBe(baselineBoards);
        expect(host.childElementCount).toBe(0);
        expect(host.getAttribute('role')).toBeNull();
        expectBaseline('dispose before the first frame', baseline, host);

        const fresh = new JsxSurfaceView();
        fresh.dispose();
        fresh.dispose();
        expect(boardCount()).toBe(baselineBoards);
        await attaching;
    });

    it('stays empty when attach or reconcile is called after dispose', async () => {
        const baselineBoards = boardCount();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const baseline = probe.count(host);
        const view = new JsxSurfaceView();
        view.dispose();
        view.reconcile(scene);
        await view.attach(host);
        view.flush();
        expect(boardCount()).toBe(baselineBoards);
        expect(host.childElementCount).toBe(0);
        expectBaseline('attach after dispose', baseline, host);
    });

    it('frees the board, observer, listeners and settle timer of a drawn view in the middle of an orbit', async () => {
        const baselineBoards = boardCount();
        const host = document.createElement('div');
        document.body.appendChild(host);
        const baseline = probe.count(host);
        const view = new JsxSurfaceView();
        const big = scene.mesh ? {...scene, mesh: gridMesh(30), meshOwners: undefined} : scene;
        view.reconcile(big);
        await view.attach(host);
        view.flush();
        expect(boardCount()).toBe(baselineBoards + 1);
        // A camera change of a mesh this large is an orbit frame: reduced detail, and a settle timer that restores it.
        view.reconcile({...big, camera: {...big.camera, az: big.camera.az + 0.5}});
        expect(probe.count(host).timers, 'the orbit started the settle timer').toBe(baseline.timers + 1);
        view.reconcile({...big, revision: big.revision + 1});
        expect(probe.count(host).frames, 'a rebuild queued a frame').toBe(baseline.frames + 1);
        view.dispose();
        expect(boardCount()).toBe(baselineBoards);
        expect(host.childElementCount).toBe(0);
        expectBaseline('dispose of a drawn view', baseline, host);
    });
});

/** A flat `n`x`n`-cell mesh: past the size where the view draws orbit frames in reduced detail. */
function gridMesh(n: number): NonNullable<SurfaceScene['mesh']> {
    const positions: number[] = [];
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) positions.push(i / n, j / n, Math.sin(i / 5) * Math.cos(j / 5) * 0.1);
    const faces: number[] = [];
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
            faces.push(a, b, d, a, d, c);
        }
    }
    return {positions, faces, visible: true};
}
