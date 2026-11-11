import {JSXGraph} from 'jsxgraph';
import {writeFileSync} from 'node:fs';
import {installBoardShims} from '../graphs/base/realGraphTestHarness';
import {JsxSurfaceView} from '../graphs/patches/surface-view/jsxSurfaceView';
import {orderBackToFront} from '../graphs/patches/surface-view/jsxDepthOrder';
import type {SurfaceScene} from '../graphs/patches/surface-view/surfaceScene';
import {marchingSquares, levelCurve} from './contours';
import {CATALOGUE} from './functions2';

// Measurement behind docs/adr/0053 section 2 (level-sets task 04, scope item 1). Opt-in, so the shared unit suite neither times nor
// writes files: `BEZEG_PERF=1 just unit src/levelsets/contourDrawing.perf` writes the numbers to BEZEG_PERF_OUT.
// Compute-only (marching squares + curve polyline) plus the JSXGraph curve update in a jsdom SVG board, and the N = 40 surface
// mesh build, painter's order and JsxSurfaceView update. JSDOM PLACEHOLDER, not frame times; the browser measurement is owed at F2b.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: 300000});

const OUT = process.env.BEZEG_PERF_OUT ?? '.command-logs/ls04-perf-raw.txt';
const UPDATES = 60;
const CAMERA = {az: -0.9, el: 0.5, distance: 9, projection: 'perspective' as const, target: [0, 0, 0] as [number, number, number]};

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
const cell = (values: number[]): string => `${median(values).toFixed(2)} / ${p95(values).toFixed(2)}`;

const polyline = (levels: readonly number[], f: (x: number, y: number) => number, n: number, window: typeof CATALOGUE.hills.window) => {
    const x: number[] = [];
    const y: number[] = [];
    for (const c of levels) {
        const curve = levelCurve(marchingSquares(f, window, n, c));
        for (let i = 0; i < curve.x.length; i++) { x.push(curve.x[i]); y.push(curve.y[i]); }
        x.push(NaN); y.push(NaN);
    }
    return {x, y};
};

/** Levels around a base level, spaced so that every contour crosses the `hills` window (values in [-1, 1]). */
const levelsOf = (base: number, count: number): number[] => Array.from({length: count}, (_, k) => base + (k - (count - 1) / 2) * (1.6 / Math.max(count, 2)));

type DataCurve = JXG.Curve & {updateDataArray: () => void; dataX: number[]; dataY: number[]};

/** The (N+1)^2 mesh of z = f over the window, two triangles per cell. */
function meshOf(n: number, f: (x: number, y: number) => number, w: typeof CATALOGUE.hills.window) {
    const positions: number[] = [];
    for (let j = 0; j <= n; j++) {
        for (let i = 0; i <= n; i++) {
            const x = w.xMin + ((w.xMax - w.xMin) * i) / n;
            const y = w.yMin + ((w.yMax - w.yMin) * j) / n;
            positions.push(x, y, f(x, y));
        }
    }
    const faces: number[] = [];
    for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
            const v = j * (n + 1) + i;
            faces.push(v, v + 1, v + n + 2, v, v + n + 2, v + n + 1);
        }
    }
    return {positions, faces};
}

function depths(positions: ArrayLike<number>, faces: number[]): Float64Array {
    const dir = [Math.cos(CAMERA.el) * Math.cos(CAMERA.az), Math.cos(CAMERA.el) * Math.sin(CAMERA.az), Math.sin(CAMERA.el)];
    const out = new Float64Array(faces.length / 3);
    for (let t = 0; t < out.length; t++) {
        let s = 0;
        for (let k = 0; k < 3; k++) {
            const v = faces[3 * t + k];
            s += positions[3 * v] * dir[0] + positions[3 * v + 1] * dir[1] + positions[3 * v + 2] * dir[2];
        }
        out[t] = -s / 3;
    }
    return out;
}

function sceneOf(revision: number, positions: number[], faces: number[]): SurfaceScene {
    return {
        revision, points: [], polylines: [],
        mesh: {positions, faces, visible: true},
        meshOwners: [{id: 'f', kind: 'function', faceStart: 0, faceCount: faces.length / 3}],
        planes: [], markers: [], labels: [], camera: CAMERA, interaction: {zMode: false, editable: false},
    };
}

test.skipIf(!process.env.BEZEG_PERF)('contour drawing for N 40/80/120 and 1/5/9 levels; the N = 40 surface mesh', async () => {
    const lines = [`contour perf, ${new Date().toISOString()}, JSDOM PLACEHOLDER / compute-only, node ${process.version}, ${UPDATES} updates`];
    const {hills} = CATALOGUE;
    const f = hills.value;
    lines.push('| N | levels | level drag, compute (median / p95 ms) | probe drag, compute (median / p95 ms) | JSXGraph update (median / p95 ms) | segments |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    for (const n of [40, 80, 120]) {
        for (const count of [1, 5, 9]) {
            const container = document.createElement('div');
            container.id = `contour-perf-${n}-${count}`;
            document.body.appendChild(container);
            const board = JSXGraph.initBoard(container.id, {boundingbox: [-4, 4, 4, -4], axis: false, showCopyright: false, showNavigation: false, renderer: 'svg'});
            const store = {x: [] as number[], y: [] as number[]};
            const curve = board.create('curve', [[], []], {strokeWidth: 1, highlight: false}) as DataCurve;
            curve.updateDataArray = function () { this.dataX = store.x; this.dataY = store.y; };
            for (let k = 0; k < 5; k++) polyline(levelsOf(0, count), f, n, hills.window); // warm-up
            const levelDrag: number[] = [];
            const probeDrag: number[] = [];
            const update: number[] = [];
            let segments = 0;
            for (let step = 0; step < UPDATES; step++) {
                // The level handle moves on the 1/8 grid: all `count` contours around it are rebuilt.
                const base = -0.5 + (step % 9) / 8;
                let t0 = performance.now();
                const line = polyline(levelsOf(base, count), f, n, hills.window);
                levelDrag.push(performance.now() - t0);
                // The probe moves: the level c = f(p) follows, so the contour through the probe is rebuilt (the others are cached).
                const px = 0.6 + 0.02 * step;
                t0 = performance.now();
                polyline([f(px, 0.8)], f, n, hills.window);
                probeDrag.push(performance.now() - t0);
                segments = line.x.filter(Number.isNaN).length;
                store.x = line.x; store.y = line.y;
                t0 = performance.now();
                curve.updateDataArray();
                board.update();
                update.push(performance.now() - t0);
            }
            lines.push(`| ${n} | ${count} | ${cell(levelDrag)} | ${cell(probeDrag)} | ${cell(update)} | ${store.x.length} points, ${segments} breaks |`);
            JSXGraph.freeBoard(board);
            container.remove();
        }
    }

    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', {configurable: true, value: 800});
    Object.defineProperty(host, 'clientHeight', {configurable: true, value: 600});
    document.body.appendChild(host);
    const view = new JsxSurfaceView();
    view.reconcile(sceneOf(0, [0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2]));
    await view.attach(host);
    view.flush();
    const build: number[] = [];
    const order: number[] = [];
    const update: number[] = [];
    const total: number[] = [];
    let triangles = 0;
    for (let step = -5; step < UPDATES; step++) {
        const start = performance.now();
        let t0 = performance.now();
        const {positions, faces} = meshOf(40, f, hills.window);
        const scene = sceneOf(step + 6, positions, faces);
        const buildMs = performance.now() - t0;
        triangles = faces.length / 3;
        t0 = performance.now();
        orderBackToFront(depths(positions, faces));
        const orderMs = performance.now() - t0;
        t0 = performance.now();
        view.reconcile(scene);
        view.flush();
        const updateMs = performance.now() - t0;
        if (step >= 0) { build.push(buildMs); order.push(orderMs); update.push(updateMs); total.push(performance.now() - start); }
    }
    view.dispose();
    host.remove();
    lines.push('');
    lines.push(`N = 40 surface mesh (hills): 1681 vertices, ${triangles} triangles`);
    lines.push('| mesh build | painter order | JsxSurfaceView reconcile + flush (jsdom) | sum |');
    lines.push('| --- | --- | --- | --- |');
    lines.push(`| ${cell(build)} | ${cell(order)} | ${cell(update)} | ${cell(total)} |`);
    writeFileSync(OUT, lines.join('\n') + '\n');
    expect(lines.length).toBeGreaterThan(1);
});
