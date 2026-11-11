import {act, render, waitFor} from '@testing-library/react';
import {boards} from 'jsxgraph';
import {createPortal} from 'react-dom';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {JsxSurfaceView} from '../patches/surface-view/jsxSurfaceView';
import {LifecycleProbe} from '../patches/surface-view/jsxLifecycleProbe.test-helper';
import type {SurfaceScene} from '../patches/surface-view/surfaceScene';
import SolidsGraph from './SolidsGraph';

// Ownership and disposal of the solids graph with the real JSXGraph view, as CoonsPatchLifecycle.test.tsx checks it for the
// Coons patch: after unmount no board, listener, observer, timer or frame is left, in every mode, after edits and a Preset import.
// The probe does not count the zero-delay text-size timers JSXGraph leaves (SHORT_TIMER_MS), the baseline of the cobweb test.

const boardCount = (): number => Object.keys(boards as object).length;
let probe: LifecycleProbe;

beforeAll(() => {
    installBoardShims();
    // React DOM registers its listeners once per container (see CoonsPatchLifecycle.test.tsx): do it before the baseline.
    render(createPortal(<div/>, document.body)).unmount();
});
beforeEach(() => { probe = new LifecycleProbe(); probe.install(); });
afterEach(() => { probe.uninstall(); document.body.innerHTML = ''; });

const attached = (rendered: ReturnType<typeof render>) => waitFor(() => {
    if (!rendered.container.querySelector('[data-jsx-surface-view]')) throw new Error('the JSX view is not attached yet');
});

describe('solids graph lifecycle', () => {
    it('leaves no board, listener, observer, timer or frame behind over three mounts, every mode and a Preset import included', async () => {
        const baselineBoards = boardCount();
        const baseline = probe.count();
        for (let cycle = 0; cycle < 3; cycle++) {
            const view = new JsxSurfaceView();
            const scenes: SurfaceScene[] = [];
            const reconcile = view.reconcile.bind(view);
            vi.spyOn(view, 'reconcile').mockImplementation(scene => { scenes.push(scene); reconcile(scene); });
            const graph = new SolidsGraph({viewFactory: () => view, typeset: async () => undefined});
            const rendered = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
            await attached(rendered);
            const host = rendered.container.querySelector<HTMLElement>('[data-jsx-surface-view]')!.parentElement!;
            await waitFor(() => expect(boardCount(), 'one board while mounted: the surface view').toBe(baselineBoards + 1));
            expect(probe.count(host, rendered.container).observers, 'the view observes its host').toBeGreaterThan(0);
            for (const mode of ['stack', 'volume', 'revolve', 'section'] as const) {
                act(() => graph.setMode(mode));
                act(() => view.flush());
            }
            act(() => { graph.setOffset(3); graph.setNormal(0, 1); graph.setDiscs(12); });
            act(() => view.flush());
            act(() => graph.importPresetData([['Solids', {...graph.exportPresetData()[0][1], mode: 'volume', solid: 'sphere'}]]));
            act(() => view.flush());
            expect(graph.state).toMatchObject({mode: 'volume', solid: 'sphere'});
            expect(scenes[scenes.length - 1].mesh!.faces.length, 'the import drew a mesh').toBeGreaterThan(0);
            rendered.unmount();
            rendered.container.remove();
            expect(boardCount(), `board count after unmount ${cycle}`).toBe(baselineBoards);
            expect(probe.count(), `after unmount ${cycle}: ${probe.outstanding().join(' || ')}`).toEqual(baseline);
        }
    }, 60_000);
});
