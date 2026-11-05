import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BezierHullsGraph, BEZIER_HULLS_STEP_INTERVAL_MS} from './BezierHullsGraph';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {curvePairRun, curvePairStateAt, curvePieces, pieceHull} from '../../compgeo/curvePairSubdivision';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

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
    return {scheduler, callbacks, frame};
}

class Observed extends BezierHullsGraph {
    liveBoard() { return this.board; }
    disposeScene() { this.disposeFigureScene(); }
}

interface Shown {
    elType: string; name?: string; dataX?: number[]; dataY?: number[]; visProp: Record<string, unknown>;
    vertices?: Array<{X(): number; Y(): number}>; borders?: Array<{visProp: Record<string, unknown>}>;
    X?(): number; Y?(): number; moveTo?(to: number[], t: number): void; triggerEventHandlers?(names: string[], args: unknown[]): void;
}
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
/** Everything the graph draws: its points, curves and polygons (borders and polygon vertices are other element types). */
const owned = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve' || o.elType === 'polygon' || (o.elType === 'point' && /^[AB]_\d$/.test(o.name ?? '')));
const ofKind = (graph: Observed, pattern: RegExp) => objects(graph).filter(o => pattern.test(o.name ?? ''));
const hulls = (graph: Observed) => ofKind(graph, /^piece[AB]\d+$/);
const parents = (graph: Observed) => ofKind(graph, /^parent[AB]\d+$/);
const controls = (graph: Observed) => ofKind(graph, /^pieceControl[AB]\d+$/);
const counts = (graph: Observed) => [hulls(graph).length, parents(graph).length, controls(graph).length];
const corners = (o: Shown) => o.elType === 'polygon' ? o.vertices!.slice(0, -1).map(v => [v.X(), v.Y()]) : o.dataX!.map((x, i) => [x, o.dataY![i]]);
/** The look of a drawn hull: the fill, and the dash, opacity and width of its outline (the first border of a polygon). */
const look = (o: Shown) => {
    const edge = o.borders?.[0] ?? o;
    return {fill: o.visProp.fillopacity as number, dash: edge.visProp.dash as number, stroke: edge.visProp.strokeopacity as number, width: edge.visProp.strokewidth as number};
};

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const model = (points: Array<[number, number]>, gridStepExponent = 0): PointSetModel =>
    ({mode: 'points', closed: false, gridStepExponent, points: points.map(([x, y]) => ({x, y}))});
/** The offset pair of task 24 (half a grid unit per integer): the nets never come close, so the run ends after depth 1. */
const OFFSET = [[0, 0], [4, 8], [8, 0], [0, 9], [4, 1], [8, 9]] as Array<[number, number]>;
const CUBIC = [[0, 0], [1, 6], [5, 6], [6, 0], [0, 4], [2, -2], [4, 9], [6, 4]] as Array<[number, number]>;
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const stepTo = (graph: Observed, target: number) => act(() => { while (graph.step < target) graph.nextStep(); });
const drag = (graph: Observed, name: string, to: [number, number]) => {
    const point = ofKind(graph, new RegExp(`^${name}$`))[0];
    act(() => { point.moveTo!(to, 0); point.triggerEventHandlers!(['drag'], []); });
};
function tick(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(BEZIER_HULLS_STEP_INTERVAL_MS); });
}
const unique = (indices: number[]) => [...new Set(indices)];
/** The state of the shown step and the distinct pieces (per curve) its candidates name. */
const candidatePieces = (graph: Observed) => {
    const state = curvePairStateAt(graph.run(), graph.step);
    return {state, a: unique(state.candidates.map(c => c[0])), b: unique(state.candidates.map(c => c[1]))};
};

test('crossing pair: the board holds the nets, the overlays and the pieces of the step (steps 0, 1, 2 and the last)', () => {
    const graph = new Observed();
    mount(graph);
    // 6 points, 2 curves, 2 control polygons and 2 hulls
    const base = 12;
    expect(graph.run()).toHaveLength(9);
    expect(owned(graph)).toHaveLength(base + 4);
    expect(counts(graph)).toEqual([2, 0, 2]);
    stepTo(graph, 1);
    // a split: 4 candidate pieces, 2 parent outlines, 4 control polygons
    expect(owned(graph)).toHaveLength(base + 10);
    expect(counts(graph)).toEqual([4, 2, 4]);
    stepTo(graph, 2);
    expect(owned(graph)).toHaveLength(base + 8);
    expect(counts(graph)).toEqual([4, 0, 4]);
    stepTo(graph, 8);
    const {state, a, b} = candidatePieces(graph);
    expect(state.phase).toBe('discard');
    expect(state.depth).toBe(4);
    expect(counts(graph)).toEqual([a.length + b.length, 0, a.length + b.length]);
    expect(owned(graph)).toHaveLength(base + 2 * (a.length + b.length));
    expect(a.length + b.length).toBeGreaterThan(4);
});

test('offset pair in half grid steps: the run ends after depth 1 and every piece is faded', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, model(OFFSET, -1));
    const run = graph.run();
    expect(run).toHaveLength(3);
    expect(owned(graph)).toHaveLength(12 + 4);
    stepTo(graph, 1);
    expect(owned(graph)).toHaveLength(12 + 10);
    stepTo(graph, 2);
    expect(owned(graph)).toHaveLength(12 + 8);
    expect(curvePairStateAt(run, 2).kept).toEqual([]);
    for (const h of hulls(graph)) expect(look(h).dash).not.toBe(0);
    // the end is the end: another Next step changes nothing
    act(() => { graph.nextStep(); });
    expect([graph.step, owned(graph).length, graph.isPlaying]).toEqual([2, 12 + 8, false]);
});

test.each([
    [0, CURVE_PAIR_CROSSING],
    [-1, model(OFFSET, -1)],
    [0, model(CUBIC, 0)],
    [-1, model(CUBIC, -1)],
])('drawn piece hulls are pieceHull in board units, read from the board (grid step exponent %i)', (exponent, start) => {
    const graph = new Observed();
    mount(graph);
    load(graph, start);
    const scale = 2 ** exponent;
    const degree = start.points.length / 2 - 1;
    const nets = [start.points.slice(0, degree + 1), start.points.slice(degree + 1)];
    for (let step = 0; step < graph.run().length; step++) {
        stepTo(graph, step);
        const {state, a, b} = candidatePieces(graph);
        const expected = (kind: 'piece' | 'parent', curve: 0 | 1, index: number) => {
            const depth = kind === 'piece' ? state.depth : state.depth - 1;
            const piece = curvePieces(nets[curve], depth)[index];
            return pieceHull(piece, depth, degree).map(i => [piece[i].x * scale, piece[i].y * scale]);
        };
        const drawn = (kind: 'piece' | 'parent', curve: 0 | 1, index: number) => {
            const found = ofKind(graph, new RegExp(`^${kind}${'AB'[curve]}${index}$`));
            expect(found).toHaveLength(1);
            return corners(found[0]);
        };
        expect(hulls(graph).map(h => h.name).sort()).toEqual([...a.map(i => `pieceA${i}`), ...b.map(i => `pieceB${i}`)].sort());
        for (const i of a) expect(drawn('piece', 0, i)).toEqual(expected('piece', 0, i));
        for (const j of b) expect(drawn('piece', 1, j)).toEqual(expected('piece', 1, j));
        if (state.phase === 'split') {
            const parentsA = unique(a.map(i => i >> 1));
            const parentsB = unique(b.map(j => j >> 1));
            expect(parents(graph).map(h => h.name).sort()).toEqual([...parentsA.map(i => `parentA${i}`), ...parentsB.map(j => `parentB${j}`)].sort());
            for (const i of parentsA) expect(drawn('parent', 0, i)).toEqual(expected('parent', 0, i));
            for (const j of parentsB) expect(drawn('parent', 1, j)).toEqual(expected('parent', 1, j));
        } else {
            expect(parents(graph)).toHaveLength(0);
        }
        // each piece's control polygon is the dyadic piece itself in board units
        const polygon = controls(graph).find(c => c.name === `pieceControlA${a[0]}`)!;
        expect(corners(polygon)).toEqual(curvePieces(nets[0], state.depth)[a[0]].map(p => [p.x * scale, p.y * scale]));
    }
});

test('split steps outline the candidates unfilled and keep the parent as a thin outline; discard steps fill kept and fade the rest', () => {
    const graph = new Observed();
    mount(graph);
    let sawKept = false;
    let sawFaded = false;
    for (let step = 0; step < graph.run().length; step++) {
        stepTo(graph, step);
        const {state} = candidatePieces(graph);
        if (state.phase === 'split') {
            for (const h of hulls(graph)) expect(look(h)).toMatchObject({fill: 0, stroke: 1});
            const thin = look(hulls(graph)[0]).width;
            expect(parents(graph).length).toBeGreaterThan(0);
            for (const p of parents(graph)) expect(look(p)).toMatchObject({fill: 0, width: expect.any(Number)});
            for (const p of parents(graph)) expect(look(p).width).toBeLessThan(thin);
            continue;
        }
        const keptA = new Set(state.kept.map(k => k[0]));
        const keptB = new Set(state.kept.map(k => k[1]));
        for (const h of hulls(graph)) {
            const index = Number(h.name!.slice(6));
            const kept = (h.name![5] === 'A' ? keptA : keptB).has(index);
            if (kept) {
                sawKept = true;
                expect(look(h)).toMatchObject({dash: 0, stroke: 1});
                expect(look(h).fill).toBeGreaterThan(0);
            } else {
                sawFaded = true;
                expect(look(h).dash).not.toBe(0);
                expect(look(h).stroke).toBeLessThan(0.5);
                expect(look(h).fill).toBe(0);
            }
        }
    }
    expect(sawKept && sawFaded).toBe(true);
});

test('piece control polygons are drawn only while the control overlay is on; hiding pieces removes every piece object', () => {
    const graph = new Observed();
    mount(graph);
    stepTo(graph, 1);
    act(() => { graph.setOverlay('control', false); });
    expect(counts(graph)).toEqual([4, 2, 0]);
    // 6 points, 2 curves, 2 hulls and 6 piece outlines (the whole-curve control polygons are off too)
    expect(owned(graph)).toHaveLength(6 + 2 + 2 + 6);
    act(() => { graph.setOverlay('control', true); });
    expect(controls(graph)).toHaveLength(4);
    act(() => { graph.setOverlay('pieces', false); });
    expect(counts(graph)).toEqual([0, 0, 0]);
    expect(owned(graph)).toHaveLength(12);
    act(() => { graph.setOverlay('hull', false); graph.setOverlay('control', false); });
    expect(owned(graph)).toHaveLength(8);
    act(() => { graph.setOverlay('pieces', true); });
    expect(owned(graph)).toHaveLength(8 + 6);
    // the step is a display input: it redraws the pieces without touching the other objects
    stepTo(graph, 2);
    expect(owned(graph)).toHaveLength(8 + 4);
    act(() => { graph.disposeScene(); });
    expect(owned(graph)).toHaveLength(0);
    expect(hulls(graph)).toHaveLength(0);
});

test('a drag at step 8 returns to step 0, pauses, recomputes the run and redraws the pieces of the new nets', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    stepTo(graph, 8);
    const before = graph.run();
    drag(graph, 'A_1', [2, 6]);
    expect(graph.model.points[1]).toEqual({x: 2, y: 6});
    expect(graph.step).toBe(0);
    expect(graph.isPlaying).toBe(false);
    expect(graph.run()).not.toBe(before);
    expect(graph.run()).toEqual(curvePairRun(graph.model.points.slice(0, 3), graph.model.points.slice(3)));
    expect(counts(graph)).toEqual([2, 0, 2]);
    expect(corners(hulls(graph)[0])).toEqual([[0, 0], [4, 0], [2, 6]]);
    expect(owned(graph)).toHaveLength(12 + 4);
    // a drag while playing pauses too and leaves nothing scheduled
    act(() => { graph.play(); });
    tick(frames, 3);
    expect([graph.step, graph.isPlaying]).toEqual([3, true]);
    drag(graph, 'B_1', [2, -2]);
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    // after the pause Play works again
    act(() => { graph.play(); });
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('Next step, Play ticks and Reset share one transition; Play stops at the last step', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    act(() => { graph.play(); });
    tick(frames, 20);
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([8, false, 0]);
    const played = owned(graph).map(o => o.name);
    act(() => { graph.resetTrace(); });
    expect(graph.step).toBe(0);
    stepTo(graph, 8);
    expect(owned(graph).map(o => o.name)).toEqual(played);
    act(() => { graph.play(); });
    expect(frames.callbacks.size).toBe(0);
    act(() => { graph.resetTrace(); graph.nextStep(); });
    expect(graph.step).toBe(1);
    expect(graph.isPlaying).toBe(false);
});

test('a scene change and a figure capture pause playback; unmount disposes the controller and leaves nothing scheduled', async () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.play(); });
    tick(frames, 3);
    expect(graph.isPlaying).toBe(true);
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = graph.selectPreset('mine'); });
    await act(async () => { await pending; });
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    act(() => { graph.play(); });
    tick(frames, 2);
    expect(graph.isPlaying).toBe(true);
    act(() => { graph.disposeScene(); });
    expect([graph.isPlaying, frames.callbacks.size]).toEqual([false, 0]);
    act(() => { graph.resetTrace(); });

    act(() => { graph.play(); });
    tick(frames, 2);
    expect(frames.callbacks.size).toBe(1);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(BEZIER_HULLS_STEP_INTERVAL_MS)).toBe(false);
    // the controller is disposed: a late Play schedules nothing
    graph.play();
    expect(frames.callbacks.size).toBe(0);
});

test('a StrictMode remount gets a working controller and draws the scene once', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph, true);
    expect(owned(graph)).toHaveLength(12 + 4);
    act(() => { graph.play(); });
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('the pieces overlay has its own switch and Preset key; the inspector rows read A_0.. and B_2', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(4);
    const rows = [...document.querySelectorAll('.pointset-row')];
    expect(rows.map(r => r.querySelector('button span[aria-hidden]')?.textContent)).toEqual(['A_0', 'A_1', 'A_2', 'B_0', 'B_1', 'B_2']);
    expect(rows[5].querySelector('button .visually-hidden')?.textContent).toBe(t('pointset_select_point', {value0: 'B_2'}));
    expect(rows[5].querySelector('button .visually-hidden')?.textContent).toBe('Izberi točko B_2');
    expect(rows.map(r => [...r.querySelectorAll('input')].map(i => i.getAttribute('aria-label') ?? document.querySelector(`label[for="${i.id}"]`)?.textContent)).flat()
        .slice(0, 4)).toEqual(['Točka A_0: x', 'Točka A_0: y', 'Točka A_1: x', 'Točka A_1: y']);
    act(() => { graph.select(4); });
    expect(document.querySelector('[data-pointset-selection]')?.textContent).toBe('Izbrana točka: B_1');
    act(() => { setLanguage('en'); });
    expect(document.querySelector('.pointset-row:nth-child(3) button .visually-hidden')?.textContent).toBe('Select point A_2');
    expect(graph.presetCollection().key).toBe('compgeo-curve-pair');
    expect(graph.presetCollection().checkGraphState?.({initialized: true, overlays: {pieces: true}})).toBeUndefined();
});
