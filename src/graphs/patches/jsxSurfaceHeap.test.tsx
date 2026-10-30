import {runInNewContext} from 'node:vm';
import {setFlagsFromString} from 'node:v8';
import {beforeAll, describe, expect, it} from 'vitest';
import {createGraph, installBoardShims, mountGraph, surfaceViewOf} from '../base/realGraphTestHarness';
import {JsxSurfaceView} from './surface-view/jsxSurfaceView';
import {letBoardTimersFire} from './surface-view/jsxLifecycleProbe.test-helper';
import type {SurfaceScene} from './surface-view/surfaceScene';

// Memory over repeated mounts of the JSXGraph surface view (task 06 of docs/specs/jsxgraph-surface-view.md). A disposed
// board of a patch is some 30 MB of SVG DOM; this checks that it is collectable once JSXGraph's own zero-delay timers
// (which `freeBoard` cannot cancel) have fired, so a long session of route changes does not accumulate boards.

/** Growth, over the cycles after the first, that still counts as steady: a retained board costs about 30 MB per cycle. */
const STEADY_GROWTH_MB = 12;
const CYCLES = 5;

setFlagsFromString('--expose-gc');
const gc = runInNewContext('gc') as () => void;
const heapMb = (): number => { gc(); gc(); return process.memoryUsage().heapUsed / 1048576; };

let scene: SurfaceScene;
beforeAll(() => {
    installBoardShims();
    const graph = createGraph('patch-tensor');
    const mounted = mountGraph(graph);
    scene = surfaceViewOf(graph)!.last;
    mounted.view.unmount();
});

async function mountAndDispose(yieldToTimers: boolean): Promise<void> {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(scene);
    await view.attach(host);
    view.flush();
    view.reconcile({...scene, camera: {...scene.camera, az: scene.camera.az + 0.4}});
    view.dispose();
    host.remove();
    if (yieldToTimers) await letBoardTimersFire();
}

describe('JsxSurfaceView memory', () => {
    it(`keeps the heap steady over ${CYCLES} mounts once JSXGraph's timers have fired`, async () => {
        await mountAndDispose(true);
        const settled = heapMb();
        for (let i = 0; i < CYCLES; i++) await mountAndDispose(true);
        const growth = heapMb() - settled;
        expect(growth, `heap grew by ${growth.toFixed(1)} MB`).toBeLessThan(STEADY_GROWTH_MB);
    }, 120_000);
});
