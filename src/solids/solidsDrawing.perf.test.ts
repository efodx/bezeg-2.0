import {writeFileSync} from 'node:fs';
import {JsxSurfaceView} from '../graphs/patches/surface-view/jsxSurfaceView';
import {orderBackToFront} from '../graphs/patches/surface-view/jsxDepthOrder';
import type {SurfaceScene} from '../graphs/patches/surface-view/surfaceScene';
import {revolve} from './revolve';
import {clipSolid} from './section';
import {cube, prism, realCoords, toTriangles, vertexCount, type Solid} from './solid';

// Measurement behind docs/adr/0051 section 1 (solids task 03, scope item 1). Opt-in, so the shared unit suite neither times nor
// writes files: `BEZEG_PERF=1 just unit src/solids/solidsDrawing.perf` writes the numbers to BEZEG_PERF_OUT.
// Compute-only: clip + cap, mesh build, painter's order, and a JsxSurfaceView.reconcile + flush in jsdom (no paint, no browser).
// JSDOM PLACEHOLDER, not frame times; the browser measurement on desktop and phone is owed at F2b.
vi.setConfig({testTimeout: 120000});

const OUT = process.env.BEZEG_PERF_OUT ?? '.command-logs/sol03-perf-raw.txt';
const UPDATES = 60;
const CAMERA = {az: -0.9, el: 0.5, distance: 12, projection: 'perspective' as const, target: [0.5, 0.5, 0.5] as [number, number, number]};

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
const fmt = (label: string, values: number[]): string =>
    `${label}: median ${median(values).toFixed(3)} ms, p95 ${p95(values).toFixed(3)} ms, max ${Math.max(...values).toFixed(3)} ms (n=${values.length})`;

/** Depth of each triangle centroid along the camera direction (what the painter's order sorts). */
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

function sceneOf(revision: number, positions: ArrayLike<number>, faces: number[]): SurfaceScene {
    return {
        revision, points: [], polylines: [],
        mesh: {positions: Array.from(positions), faces, visible: true},
        meshOwners: [{id: 'solid', kind: 'solid', faceStart: 0, faceCount: faces.length / 3}],
        planes: [{id: 'plane', corners: [[-1, -1, 0.5], [2, -1, 0.5], [2, 2, 0.5], [-1, 2, 0.5]]}],
        markers: [], labels: [], camera: CAMERA, interaction: {zMode: false, editable: false},
    };
}

/** 17 disjoint slabs (12 triangles each, 204 in all), each shifted along x by the shear times its height, as one merged mesh. */
function slabStack(shearUnits: number): Solid {
    const slabs = 17;
    const vertices: number[] = [];
    const faces: number[][] = [];
    for (let i = 0; i < slabs; i++) {
        const slab = prism([[-4, -4], [4, -4], [4, 4], [-4, 4]], 0, 1);
        const base = vertices.length / 3;
        const z = i * 0.2;
        for (let v = 0; v < vertexCount(slab); v++) {
            const [x, y, h] = realCoords(slab, v);
            vertices.push(x + (shearUnits / 4) * z, y, h * 0.15 + z);
        }
        for (const f of slab.faces) faces.push(f.map(v => v + base));
    }
    return {vertices: Float64Array.from(vertices), faces};
}

interface Case {
    name: string;
    /** Geometry for update number `step`: the clipped / revolved / sheared mesh. */
    build(step: number): Solid;
}

const cases: Case[] = [
    {
        name: 'cube, plane-offset drag (clip below + cap, plane (1,1,1), d = 1..12 quarter units)',
        build: step => clipSolid(cube(), [1, 1, 1], 1 + (step % 12), 'below'),
    },
    {
        name: '48-segment revolve, one profile radius changes per update',
        build: step => revolve([[0, 0], [0.5, 0.7], [1, 1], [1.5, 1.2 + (step % 4) * 0.1], [2, 1.4], [2.5, 1.6], [3, 1.7], [3.5, 1.9], [4, 2]], 48, 'x'),
    },
    {name: '17-slab stack (204 triangles), shear changes per update', build: step => slabStack(-12 + (step % 25))},
];

test.skipIf(!process.env.BEZEG_PERF)('clip, mesh build, painter order and surface-view update for the three solids cases', async () => {
    const lines = [`solids drawing perf, ${new Date().toISOString()}, JSDOM PLACEHOLDER / compute-only, node ${process.version}, ${UPDATES} updates`];
    for (const c of cases) {
        const host = document.createElement('div');
        Object.defineProperty(host, 'clientWidth', {configurable: true, value: 800});
        Object.defineProperty(host, 'clientHeight', {configurable: true, value: 600});
        document.body.appendChild(host);
        const view = new JsxSurfaceView();
        view.reconcile(sceneOf(0, [0, 0, 0, 1, 0, 0, 0, 1, 0], [0, 1, 2]));
        await view.attach(host);
        view.flush();
        for (let k = 0; k < 5; k++) c.build(k); // warm-up
        const clip: number[] = [];
        const build: number[] = [];
        const order: number[] = [];
        const update: number[] = [];
        const total: number[] = [];
        let triangles = 0;
        for (let step = 0; step < UPDATES; step++) {
            const start = performance.now();
            let t0 = performance.now();
            const solid = c.build(step);
            clip.push(performance.now() - t0);
            t0 = performance.now();
            const {positions, triangles: faces} = toTriangles(solid);
            const scene = sceneOf(step + 1, positions, faces);
            build.push(performance.now() - t0);
            triangles = faces.length / 3;
            t0 = performance.now();
            orderBackToFront(depths(positions, faces));
            order.push(performance.now() - t0);
            t0 = performance.now();
            view.reconcile(scene);
            view.flush();
            update.push(performance.now() - t0);
            total.push(performance.now() - start);
        }
        view.dispose();
        host.remove();
        lines.push(`${c.name}: ${triangles} triangles`);
        lines.push('  ' + fmt('clip / revolve / stack build', clip));
        lines.push('  ' + fmt('mesh build (toTriangles + scene)', build));
        lines.push('  ' + fmt('painter order (depths + orderBackToFront)', order));
        lines.push('  ' + fmt('JsxSurfaceView reconcile + flush (jsdom)', update));
        lines.push('  ' + fmt('sum of the four', total));
    }
    writeFileSync(OUT, lines.join('\n') + '\n');
    expect(lines.length).toBeGreaterThan(1);
});
