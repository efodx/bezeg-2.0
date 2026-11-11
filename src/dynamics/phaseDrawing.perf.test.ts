import {JSXGraph} from 'jsxgraph';
import {writeFileSync} from 'node:fs';
import {installBoardShims} from '../graphs/base/realGraphTestHarness';
import type {Mat2, Vec2} from '../linear/matrix2';
import {integrate, type View} from './rk4';
import {systemField} from './systems2';

// Measurement behind docs/adr/0054 section 2 (phase-portraits task 03, step 1). Opt-in, so the shared unit suite neither
// times nor writes files: `BEZEG_PERF=1 just unit src/dynamics/phaseDrawing.perf` writes the numbers to BEZEG_PERF_OUT.
// Compute-only: RK4 cost of the trajectories, and the JSXGraph curve update in a jsdom SVG board (no paint, no browser).
// JSDOM PLACEHOLDER, not frame times; the browser measurement is owed at F2b.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: 120000});

const OUT = process.env.BEZEG_PERF_OUT ?? '.command-logs/ph03a-perf-raw.txt';
const STEPS = 500;
const DURATION = STEPS * 0.02;
const VIEW: View = {xMin: -4, xMax: 4, yMin: -4, yMax: 4};
const UPDATES = 60;

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
const fmt = (label: string, values: number[]): string =>
    `${label}: median ${median(values).toFixed(3)} ms, p95 ${p95(values).toFixed(3)} ms, max ${Math.max(...values).toFixed(3)} ms (n=${values.length})`;

/** Seeds on a ring of radius 1,5 (so the 500-step orbits mostly stay in the view and run all steps for a spiral/centre). */
const seeds = (count: number): Vec2[] =>
    Array.from({length: count}, (_, i) => [1.5 * Math.cos((2 * Math.PI * i) / count), 1.5 * Math.sin((2 * Math.PI * i) / count)] as const);

const polyline = (orbits: readonly (readonly Vec2[])[]) => {
    const x: number[] = [];
    const y: number[] = [];
    for (const orbit of orbits) {
        for (const p of orbit) { x.push(p[0]); y.push(p[1]); }
        x.push(NaN); y.push(NaN);
    }
    return {x, y};
};

const run = (matrix: Mat2, seed: Vec2) => integrate(systemField('linear', matrix), seed, DURATION, {view: VIEW}).points;

function newBoard() {
    const container = document.createElement('div');
    container.id = `phase-perf-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const board = JSXGraph.initBoard(container.id, {boundingbox: [-4, 4, 4, -4], axis: false, showCopyright: false, showNavigation: false, renderer: 'svg'});
    return {board, remove: () => { JSXGraph.freeBoard(board); container.remove(); }};
}

type DataCurve = JXG.Curve & {updateDataArray: () => void; dataX: number[]; dataY: number[]};

test.skipIf(!process.env.BEZEG_PERF)('trajectory compute and curve update at 12, 24, 48 trajectories of 500 RK4 steps', () => {
    const lines = [`phase portrait perf, ${new Date().toISOString()}, JSDOM PLACEHOLDER / compute-only, node ${process.version}, ${STEPS} steps h=0.02, ${UPDATES} updates`];
    for (const count of [12, 24, 48]) {
        const ring = seeds(count);
        const matrixDrag: number[] = [];
        const seedDrag: number[] = [];
        const oneCurve: number[] = [];
        const manyCurves: number[] = [];
        const {board, remove} = newBoard();
        const store = {x: [] as number[], y: [] as number[]};
        const single = board.create('curve', [[], []], {strokeWidth: 1, highlight: false}) as DataCurve;
        single.updateDataArray = function () { this.dataX = store.x; this.dataY = store.y; };
        const stores = ring.map(() => ({x: [] as number[], y: [] as number[]}));
        const many = ring.map((_, i) => {
            const c = board.create('curve', [[], []], {strokeWidth: 1, highlight: false}) as DataCurve;
            c.updateDataArray = function () { this.dataX = stores[i].x; this.dataY = stores[i].y; };
            return c;
        });
        for (let k = 0; k < 5; k++) { for (const p of ring) run([[-0.25, -1], [1, -0.25]], p); }
        for (let step = 0; step < UPDATES; step++) {
            // A matrix handle moves: a spiral whose damping changes by 1/4 steps, all trajectories recomputed.
            const matrix: Mat2 = [[-0.25 * (1 + (step % 4)), -1], [1, -0.25]];
            let t0 = performance.now();
            const orbits = ring.map(p => run(matrix, p));
            const line = polyline(orbits);
            matrixDrag.push(performance.now() - t0);
            // A seed moves: one trajectory recomputed, the polyline rebuilt from cached orbits.
            const moved: Vec2 = [1 + 0.02 * step, 0.5];
            t0 = performance.now();
            const next = orbits.slice();
            next[0] = run(matrix, moved);
            polyline(next);
            seedDrag.push(performance.now() - t0);
            // Curve update cost for the full set of trajectories: one NaN-separated curve against one curve per trajectory.
            store.x = line.x; store.y = line.y;
            t0 = performance.now();
            single.updateDataArray(); board.update();
            oneCurve.push(performance.now() - t0);
            orbits.forEach((orbit, i) => { stores[i].x = orbit.map(p => p[0]); stores[i].y = orbit.map(p => p[1]); });
            t0 = performance.now();
            many.forEach(c => c.updateDataArray());
            board.update();
            manyCurves.push(performance.now() - t0);
        }
        remove();
        lines.push(`${count} trajectories:`);
        lines.push('  ' + fmt('matrix-handle drag, integrate all + build polyline', matrixDrag));
        lines.push('  ' + fmt('seed drag, integrate one + rebuild polyline', seedDrag));
        lines.push('  ' + fmt('JSXGraph update, one NaN-separated curve', oneCurve));
        lines.push('  ' + fmt(`JSXGraph update, ${count} curves`, manyCurves));
    }
    writeFileSync(OUT, lines.join('\n') + '\n');
    expect(lines.length).toBeGreaterThan(1);
});
