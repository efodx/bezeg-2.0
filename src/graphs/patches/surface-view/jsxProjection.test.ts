import {afterEach, describe, expect, it} from 'vitest';
import {JsxSurfaceView} from './jsxSurfaceView';
import {makeCameraModel, projectToBoard} from './jsxProjection';
import {MAX_DISTANCE, MAX_ELEVATION, MIN_DISTANCE} from './surfaceMath';
import type {ScenePoint, SurfaceCamera, SurfaceScene, Xyz} from './surfaceScene';

interface ProjectingView {
    project3DTo2D: (x: number, y: number, z: number) => number[];
}

const points: ScenePoint[] = [];
for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) points.push({id: `p-${i}-${j}`, xyz: [i * 4 / 3, j * 4 / 3, (i + j) % 2 * 0.5] as Xyz});

function sceneWith(camera: SurfaceCamera): SurfaceScene {
    return {
        revision: 1,
        points,
        polylines: [{id: 'net', role: 'net', points: points.slice(0, 4).map(p => p.xyz)}],
        planes: [],
        markers: [],
        labels: [],
        camera,
        interaction: {zMode: false, editable: true},
    };
}

let seed = 987654321;
const rnd = (lo: number, hi: number): number => lo + ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * (hi - lo);

afterEach(() => {
    document.body.innerHTML = '';
});

describe.each(['view3d', 'board2d'] as const)('jsxProjection vs view3d.project3DTo2D (%s)', strategy => {
    it('agrees over random cameras and aspect ratios', async () => {
        const sizes: Array<[number, number]> = [[800, 600], [1280, 400], [400, 900], [1000, 1000], [640, 360]];
        const probes: Xyz[] = [[0, 0, 0], [4, 0, 0.3], [2, 3, -0.5], [4, 4, 1], [1.3, 2.7, 0.2]];
        let worst = 0, count = 0;
        for (const [w, h] of sizes) {
            const host = document.createElement('div');
            Object.defineProperty(host, 'clientWidth', {configurable: true, value: w});
            Object.defineProperty(host, 'clientHeight', {configurable: true, value: h});
            document.body.appendChild(host);
            const view = new JsxSurfaceView({strategy});
            view.reconcile(sceneWith({az: 0, el: 0.3, distance: 12, projection: 'perspective', target: [2, 2, 0]}));
            await view.attach(host);
            for (let k = 0; k < 10; k++) {
                const camera: SurfaceCamera = {
                    az: rnd(-Math.PI, Math.PI),
                    el: rnd(-MAX_ELEVATION, MAX_ELEVATION),
                    distance: rnd(MIN_DISTANCE + 8, MAX_DISTANCE),
                    projection: 'perspective',
                    target: [rnd(-2, 6), rnd(-2, 6), rnd(-1, 1)],
                };
                view.reconcile(sceneWith(camera));
                view.flush();
                const model = makeCameraModel(camera, {width: w, height: h});
                const jsxView = view.jsxView as ProjectingView;
                for (const p of probes) {
                    const mine = projectToBoard(model, ...p);
                    const jsx = jsxView.project3DTo2D(...p);
                    worst = Math.max(worst, Math.abs(mine[0] - jsx[1]), Math.abs(mine[1] - jsx[2]));
                    count++;
                }
            }
            view.dispose();
        }
        console.log(`MAX_RESIDUAL ${strategy} ${worst} over ${count} projections`);
        expect(worst).toBeLessThan(1e-6);
    });
});
