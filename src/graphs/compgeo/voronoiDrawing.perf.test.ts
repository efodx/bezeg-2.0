import {JSXGraph} from 'jsxgraph';
import {appendFileSync, writeFileSync} from 'node:fs';
import {installBoardShims} from '../base/realGraphTestHarness';
import type {GridPoint} from '../../compgeo/grid';
import {clipCell, voronoiFromDelaunay, type VoronoiDiagram} from '../../compgeo/voronoi';
import {createVoronoiDrawing, frame} from './voronoiDrawing';

// Measurement behind docs/reviews/triangulation-voronoi/18-perf.md (task 18, item 6). Opt-in, so the shared unit suite
// neither times nor writes files: `BEZEG_PERF=1 just unit src/graphs/compgeo/voronoiDrawing.perf` writes the numbers to
// BEZEG_PERF_OUT. It times the drawing module in a jsdom SVG board (JSXGraph update and SVG node work, no paint, no
// browser compositing), so the figures compare the two approaches and bound the script cost; they are not frame times.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: 120000});

const OUT = process.env.BEZEG_PERF_OUT ?? 'docs/reviews/triangulation-voronoi/18-perf-raw.txt';

function sites(count: number): GridPoint[] {
    let s = 12345;
    const next = (n: number) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 8) % n; };
    const seen = new Set<string>();
    const result: GridPoint[] = [];
    while (result.length < count) {
        const p = {x: next(60) - 30, y: next(40) - 20};
        if (!seen.has(`${p.x},${p.y}`)) { seen.add(`${p.x},${p.y}`); result.push(p); }
    }
    return result;
}

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const p95 = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length * 0.95)];
const fmt = (label: string, values: number[]): string => `${label}: median ${median(values).toFixed(2)} ms, p95 ${p95(values).toFixed(2)} ms, max ${Math.max(...values).toFixed(2)} ms (n=${values.length})`;

function newBoard(): {board: JXG.Board; remove: () => void} {
    const container = document.createElement('div');
    container.id = `voronoi-perf-${Math.random().toString(36).slice(2)}`;
    document.body.appendChild(container);
    const board = JSXGraph.initBoard(container.id, {
        boundingbox: [-40, 30, 40, -30], axis: false, showCopyright: false, showNavigation: false, renderer: 'svg',
    });
    return {board, remove: () => { JSXGraph.freeBoard(board); container.remove(); }};
}

function build(points: readonly GridPoint[]): VoronoiDiagram {
    const outcome = voronoiFromDelaunay(points);
    if (!outcome.ok) throw new Error(outcome.refusal.kind);
    return outcome.value;
}

test.skipIf(!process.env.BEZEG_PERF)('drag at 40 sites and redraw of 12 sites: per-cell curves against one batched curve', () => {
    writeFileSync(OUT, `voronoiDrawing perf, ${new Date().toISOString()}, jsdom SVG board, node ${process.version}\n`);
    for (const count of [12, 40]) {
        const points = sites(count);
        const {board, remove} = newBoard();
        const drawing = createVoronoiDrawing(board);
        const all = {cells: true, edges: true, vertices: true};
        const kernel: number[] = [];
        const draw: number[] = [];
        const clip: number[] = [];
        const batched: number[] = [];
        // A warm-up so JIT and first-object creation do not dominate.
        let diagram = build(points);
        const fixed = frame(diagram, points);
        for (let k = 0; k < 3; k++) drawing.update(diagram, points, fixed, all);

        // A reusable batched curve that draws every clipped cell in one path (the alternative being measured).
        const store = {x: [] as number[], y: [] as number[]};
        const curve = board.create('curve', [[], []], {fillColor: '#bf8542', fillOpacity: 0.14, strokeWidth: 0, highlight: false}) as JXG.Curve & {updateDataArray: () => void; dataX: number[]; dataY: number[]};
        curve.updateDataArray = function () { this.dataX = store.x; this.dataY = store.y; };

        const moves = 60;
        for (let step = 0; step < moves; step++) {
            // One site slides along a diagonal, like a drag; the others stay.
            const moved = points.map((p, i) => i === 0 ? {x: p.x + (step % 7), y: p.y + (step % 5)} : p);
            if (new Set(moved.map(p => `${p.x},${p.y}`)).size < moved.length) continue;
            let t0 = performance.now();
            diagram = build(moved);
            kernel.push(performance.now() - t0);
            const box = frame(diagram, moved);
            t0 = performance.now();
            drawing.update(diagram, moved, box, all);
            draw.push(performance.now() - t0);

            t0 = performance.now();
            const xs: number[] = [];
            const ys: number[] = [];
            const clipped = diagram.cells.map(cell => clipCell(diagram, moved, cell.site, box));
            clip.push(performance.now() - t0);
            t0 = performance.now();
            for (const {polygon} of clipped) {
                if (polygon.length === 0) continue;
                if (xs.length > 0) { xs.push(NaN); ys.push(NaN); }
                for (const p of [...polygon, polygon[0]]) { xs.push(p.x.toNumber()); ys.push(p.y.toNumber()); }
            }
            store.x = xs;
            store.y = ys;
            curve.needsUpdate = true;
            curve.update();
            curve.updateRenderer();
            board.update();
            batched.push(performance.now() - t0);
        }
        appendFileSync(OUT, `\n== ${count} sites ==\n${fmt('kernel build (voronoiFromDelaunay)', kernel)}\n${fmt('exact clipCell of all cells (inside draw)', clip)}\n`
            + `${fmt('draw: update() with per-cell curves + edges + markers', draw)}\n${fmt('alternative: cells as ONE batched curve (fill only, excludes clip)', batched)}\n`);
        // Redraw of an unchanged final diagram (Fortune redraws on every step).
        if (count === 12) {
            diagram = build(points);
            const redraw: number[] = [];
            for (let k = 0; k < 60; k++) {
                const t0 = performance.now();
                drawing.update(diagram, points, fixed, all);
                redraw.push(performance.now() - t0);
            }
            appendFileSync(OUT, `${fmt('redraw of a final 12-site diagram (same value)', redraw)}\n`);
        }
        drawing.dispose();
        remove();
    }
});

test.skipIf(!process.env.BEZEG_PERF)('where the draw time goes at 40 sites (options in isolation)', () => {
    const points = sites(40);
    const {board, remove} = newBoard();
    const drawing = createVoronoiDrawing(board);
    const diagram = build(points);
    const box = frame(diagram, points);
    const cases: [string, {cells: boolean; edges: boolean; vertices: boolean}][] = [
        ['cells only', {cells: true, edges: false, vertices: false}],
        ['edges only', {cells: false, edges: true, vertices: false}],
        ['vertices only', {cells: false, edges: false, vertices: true}],
        ['all', {cells: true, edges: true, vertices: true}],
    ];
    appendFileSync(OUT, '\n== 40 sites, options in isolation (redraw of the same value) ==\n');
    for (const [label, options] of cases) {
        drawing.update(diagram, points, box, options);
        const times: number[] = [];
        for (let k = 0; k < 20; k++) {
            const t0 = performance.now();
            drawing.update(diagram, points, box, options);
            times.push(performance.now() - t0);
        }
        appendFileSync(OUT, `${fmt(label, times)}\n`);
    }
    drawing.dispose();
    remove();
});
