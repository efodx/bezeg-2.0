import {act, render, waitFor} from '@testing-library/react';
import {boards} from 'jsxgraph';
import {createPortal} from 'react-dom';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import CoonsPatchGraph from './CoonsPatchGraph';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
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
});
