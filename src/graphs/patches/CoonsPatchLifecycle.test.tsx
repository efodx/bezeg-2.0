import {act, render, waitFor} from '@testing-library/react';
import {boards} from 'jsxgraph';
import {createPortal} from 'react-dom';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import CoonsPatchGraph from './CoonsPatchGraph';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import {buildCoonsScene} from './coonsScene';
import type {SurfaceScene} from './surface-view/surfaceScene';
import {LifecycleProbe} from './surface-view/jsxLifecycleProbe.test-helper';

// Ownership and disposal of the Coons patch with the real JSXGraph view, as jsxSurfaceLifecycle.test.tsx checks it for
// the tensor patch: after unmount no board, listener, observer, timer or frame is left, even after edits.

const boardCount = (): number => Object.keys(boards as object).length;
let probe: LifecycleProbe;

beforeAll(() => {
    installBoardShims();
    // React DOM registers its event listeners once per container and never removes them (react-dom 18
    // listenToAllSupportedEvents): `selectionchange` on the document for the first root, and the full set on
    // `document.body` for the first portal into it. Register both before the probe takes its baseline, as the tensor
    // test's warm-up mount does, so the probe counts only what the graph leaves behind.
    render(createPortal(<div/>, document.body)).unmount();
});
beforeEach(() => { probe = new LifecycleProbe(); probe.install(); });
afterEach(() => { probe.uninstall(); document.body.innerHTML = ''; });

describe('Coons patch lifecycle', () => {
    it('leaves no board, listener, observer, timer or frame behind over three mounts, edits included', async () => {
        const baselineBoards = boardCount();
        const baseline = probe.count();
        for (let cycle = 0; cycle < 3; cycle++) {
            const view = new JsxSurfaceView();
            const graph = new CoonsPatchGraph({viewFactory: () => view, typeset: async () => undefined});
            const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
            const container = await waitFor(() => {
                const el = rendered.container.querySelector<HTMLElement>('[data-jsx-surface-view]');
                if (!el) throw new Error('the JSX view is not attached yet');
                return el;
            });
            const host = container.parentElement!;
            await waitFor(() => expect(boardCount(), 'one board while mounted: the surface view').toBe(baselineBoards + 1));
            expect(probe.count(host, rendered.container).observers, 'the view observes its host').toBeGreaterThan(0);
            // Edits rebuild the geometry: a corner move, an unlink, a surface switch and a point selection.
            act(() => { graph.setLinkedCorners(false); graph.setShown('lc'); graph.selectBoundaryPoint('d1', 3); });
            act(() => graph.setSelectedCoordinates([3, 4, 0]));
            act(() => view.flush());
            expect(graph.state.boundaries.d1[3]).toEqual([3, 4, 0]);
            rendered.unmount();
            rendered.container.remove();
            expect(boardCount(), `board count after unmount ${cycle}`).toBe(baselineBoards);
            expect(probe.count(), `after unmount ${cycle}: ${probe.outstanding().join(' || ')}`).toEqual(baseline);
        }
    }, 60_000);

    it('rebuilds the mesh after a view-reported move and a Preset import, then leaves nothing behind', async () => {
        const baselineBoards = boardCount();
        const baseline = probe.count();
        const view = new JsxSurfaceView();
        const scenes: SurfaceScene[] = [];
        const reconcile = view.reconcile.bind(view);
        vi.spyOn(view, 'reconcile').mockImplementation(scene => { scenes.push(scene); reconcile(scene); });
        const graph = new CoonsPatchGraph({viewFactory: () => view, typeset: async () => undefined});
        const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        await waitFor(() => {
            if (!rendered.container.querySelector('[data-jsx-surface-view]')) throw new Error('the JSX view is not attached yet');
        });
        await waitFor(() => expect(boardCount()).toBe(baselineBoards + 1));
        act(() => view.flush());
        // The view reports a drag through its edit channel, the entry the real pointer path uses (applyEdit).
        const reportMove = (view as unknown as {emit(edit: unknown): void}).emit.bind(view);
        act(() => {
            reportMove({kind: 'point', pointId: 'd1-3', xyz: [3, 4, 0], phase: 'start'});
            reportMove({kind: 'point', pointId: 'd1-3', xyz: [3, 4, 0], phase: 'move'});
            reportMove({kind: 'point', pointId: 'd1-3', xyz: [3, 4, 0], phase: 'end'});
        });
        act(() => view.flush());
        expect(graph.state.boundaries.d1[3], 'the view-reported move reached the state').toEqual([3, 4, 0]);
        const moved = scenes[scenes.length - 1].mesh;
        expect(moved, 'a mesh was built for the moved patch').toBeDefined();

        const imported = JSON.parse(JSON.stringify(graph.defaultPreset()));
        // Only a boundary point changes (linked corners stay on, shown stays), so only the geometry says the mesh is stale.
        imported[0][1].d1[1] = [3, 1, 2];
        act(() => graph.importPresetData(imported));
        act(() => view.flush());
        expect(graph.state.boundaries.d1[1], 'the import replaced the boundary').toEqual([3, 1, 2]);
        expect(graph.state.boundaries.d1[3], 'the import undid the move').not.toEqual([3, 4, 0]);
        const rebuilt = scenes[scenes.length - 1].mesh;
        expect(rebuilt, 'the import produced a new mesh').not.toBe(moved);
        expect(Array.from(rebuilt!.positions), 'the new mesh differs from the moved one').not.toEqual(Array.from(moved!.positions));
        expect(Array.from(rebuilt!.positions), 'the mesh is the one the imported state defines')
            .toEqual(Array.from(buildCoonsScene(graph.state, 0).mesh!.positions));
        expect((view as unknown as {appliedScene: SurfaceScene}).appliedScene.mesh, 'the view applied the rebuilt mesh').toBe(rebuilt);

        rendered.unmount();
        rendered.container.remove();
        expect(boardCount()).toBe(baselineBoards);
        expect(probe.count(), probe.outstanding().join(' || ')).toEqual(baseline);
    }, 60_000);
});
