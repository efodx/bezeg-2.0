import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BEZIER_HULLS_STEP_INTERVAL_MS, BezierHullsGraph} from './BezierHullsGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {curvePairRun, curvePairStateAt} from '../../compgeo/curvePairSubdivision';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';
import {writeFileSync} from 'node:fs';

// Measurement behind docs/reviews/convexity-hulls/26-measure.md (convexity task 26, the family template of the feature streams):
// the cubic pair at its worst case, where every one of the 16 pieces of each curve is in a kept pair at depth 4 (32 piece hulls
// and 32 piece control polygons on the board). Opt-in, so the shared unit suite neither times nor writes files:
// `BEZEG_PERF=1 just unit src/graphs/compgeo/BezierHullsGraph.perf` writes the numbers to the path in BEZEG_PERF_OUT
// (default 26-perf-raw.txt in the review folder) and fails only on a gross regression. Timings include the jsdom board shim.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT * 4});

class Observed extends BezierHullsGraph {
    liveBoard() { return this.board; }
}

/** Curve B is curve A itself: neighbouring pieces overlap at every depth, so all 16 pieces of each curve stay in a kept pair. */
const A = [[0, 0], [1, 6], [5, 6], [6, 0]];
const WORST: PointSetModel = {
    mode: 'points', closed: false, gridStepExponent: 0,
    points: [...A, ...A].map(([x, y]) => ({x, y})),
};
const PERF_OUT = process.env.BEZEG_PERF_OUT ?? 'docs/reviews/convexity-hulls/26-perf-raw.txt';

const median = (values: number[]) => [...values].sort((a, b) => a - b)[values.length >> 1];
const max = (values: number[]) => Math.max(...values);
const fixed = (value: number) => value.toFixed(2);

function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, frame};
}

test.skipIf(!process.env.BEZEG_PERF)('cubic pair at the worst case: curvePairRun, drawing each step, a Play pass and a drag', () => {
    setLanguage('sl');
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { graph.loadModel(WORST); });
    const run = graph.run();
    const last = curvePairStateAt(run, run.length - 1);
    const piecesDrawn = new Set(last.candidates.map(c => c[0])).size + new Set(last.candidates.map(c => c[1])).size;
    expect(run).toHaveLength(9);
    expect(piecesDrawn).toBe(32);

    const out: string[] = [`worst case: cubic pair, B = A; ${run.length} steps; ${last.candidates.length} candidate pairs at depth 4; ${piecesDrawn} pieces drawn`];
    const objects = () => (graph.liveBoard().objectsList as unknown[]).length;

    // 1. curvePairRun alone, on the nets of the model
    const a = WORST.points.slice(0, 4);
    const b = WORST.points.slice(4);
    const runTimes: number[] = [];
    for (let i = 0; i < 30; i++) {
        const started = performance.now();
        curvePairRun(a, b);
        runTimes.push(performance.now() - started);
    }
    out.push(`curvePairRun median=${fixed(median(runTimes))}ms max=${fixed(max(runTimes))}ms n=${runTimes.length}`);

    // 2. drawing every step (Next step: state write, redraw of the pieces overlay, panel render), 10 rounds
    const perStep: number[][] = run.map(() => []);
    const objectCounts: number[] = [objects()];
    for (let round = 0; round < 10; round++) {
        act(() => { graph.resetTrace(); });
        for (let step = 1; step < run.length; step++) {
            const started = performance.now();
            act(() => { graph.nextStep(); });
            perStep[step].push(performance.now() - started);
            if (round === 0) objectCounts[step] = objects();
        }
    }
    expect(graph.step).toBe(run.length - 1);
    out.push(`board objects at steps 0..${run.length - 1}: ${objectCounts.join(' ')}`);
    for (let step = 1; step < run.length; step++) {
        out.push(`draw step ${step} (${curvePairStateAt(run, step).phase}, depth ${curvePairStateAt(run, step).depth}) median=${fixed(median(perStep[step]))}ms max=${fixed(max(perStep[step]))}ms`);
    }
    out.push(`draw last step (depth 4) median=${fixed(median(perStep[run.length - 1]))}ms max=${fixed(max(perStep[run.length - 1]))}ms`);

    // 3. a Play pass through all steps (the callbacks of the scheduler, no waiting)
    const passes: number[] = [];
    for (let pass = 0; pass < 5; pass++) {
        act(() => { graph.resetTrace(); });
        const started = performance.now();
        act(() => { graph.play(); });
        act(() => { frames.frame(0); });
        for (let i = 0; i < run.length - 1; i++) act(() => { frames.frame(BEZIER_HULLS_STEP_INTERVAL_MS); });
        passes.push(performance.now() - started);
        expect(graph.step).toBe(run.length - 1);
    }
    out.push(`play pass (${run.length - 1} steps) median=${fixed(median(passes))}ms max=${fixed(max(passes))}ms`);

    // 4. a drag move of one control point of A, at step 0 and at the last step (a drag returns to step 0 and recomputes the run)
    const handle = (graph.liveBoard().objectsList as unknown as Array<{elType: string; name?: string; moveTo(to: number[], t: number): void; triggerEventHandlers(names: string[], args: unknown[]): void}>)
        .find(o => o.elType === 'point' && o.name === 'A_1')!;
    const drags: number[] = [];
    for (let i = 0; i < 40; i++) {
        if (i % 4 === 0) act(() => { graph.resetTrace(); while (graph.step < run.length - 1) graph.nextStep(); });
        const started = performance.now();
        act(() => { handle.moveTo([1 + (i % 3), 6 + (i % 2)], 0); handle.triggerEventHandlers(['drag'], []); });
        drags.push(performance.now() - started);
    }
    out.push(`drag move (model edit, curvePairRun, redraw at step 0) median=${fixed(median(drags))}ms max=${fixed(max(drags))}ms n=${drags.length}`);
    // 5. The fallback of the task, measured in isolation on the live board: the 32 piece hulls of the last step as 32 JSXGraph polygons
    // (what the graph draws) against one curve with NaN breaks per curve (16 rings each). Both are created, updated once and removed.
    const board = graph.liveBoard() as unknown as {create(type: string, parents: unknown[], attrs: object): {id: string}; removeObject(o: unknown): void; update(): void; fullUpdate(): void};
    const rings = Array.from({length: 32}, (_, i) => { const x = (i % 16) * 0.4; const y = i < 16 ? 0 : 3; return [[x, y], [x + 0.35, y + 0.05], [x + 0.4, y + 0.3], [x + 0.05, y + 0.25]]; });
    const polygons: number[] = [];
    const curves: number[] = [];
    for (let round = 0; round < 10; round++) {
        let started = performance.now();
        const made = act(() => rings.map(ring => board.create('polygon', ring, {vertices: {visible: false}, highlight: false, fixed: true, layer: 2, fillOpacity: 0.25, borders: {strokeWidth: 2.5, highlight: false, fixed: true}})));
        polygons.push(performance.now() - started);
        void made;
        const polys = (board as unknown as {objectsList: Array<{elType: string; name?: string}>}).objectsList.filter(o => o.elType === 'polygon').slice(-32);
        for (const poly of polys) board.removeObject(poly);
        started = performance.now();
        const made2 = [0, 1].map(half => {
            const xs: number[] = [];
            const ys: number[] = [];
            for (const ring of rings.slice(half * 16, half * 16 + 16)) {
                for (const [x, y] of [...ring, ring[0]]) { xs.push(x); ys.push(y); }
                xs.push(NaN); ys.push(NaN);
            }
            return board.create('curve', [xs, ys], {highlight: false, fixed: true, layer: 2, fillOpacity: 0.25, strokeWidth: 2.5});
        });
        board.update();
        curves.push(performance.now() - started);
        for (const c of made2) board.removeObject(c);
    }
    out.push(`isolated: 32 hull polygons create median=${fixed(median(polygons))}ms; 2 NaN-break curves (32 rings) create+update median=${fixed(median(curves))}ms`);
    writeFileSync(PERF_OUT, out.join('\n') + '\n');
    expect(median(perStep[run.length - 1])).toBeLessThan(1000);
});
