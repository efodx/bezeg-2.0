import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BezierHullsGraph, BEZIER_HULLS_STEP_INTERVAL_MS} from './BezierHullsGraph';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {BEZIER_HULLS_PRESET_KEY} from './bezierHullsPresetCollection';
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
/** The grouped piece curves on the board: `Hull` rings and `Control` polylines, per curve and look. */
const pieceCurves = (graph: Observed, kind: 'Hull' | 'Control') => ofKind(graph, new RegExp(`^piece${kind}[AB]-(candidate|parent|kept|faded)$`));
const groupCurve = (graph: Observed, kind: 'Hull' | 'Control', curve: 'A' | 'B', group: string) => ofKind(graph, new RegExp(`^piece${kind}${curve}-${group}$`));
const counts = (graph: Observed) => [pieceCurves(graph, 'Hull').length, pieceCurves(graph, 'Control').length];
/** The polylines of a curve, split on its NaN breaks; a curve without data, or with an empty piece, fails. */
const rings = (o: Shown): number[][][] => {
    const xs = o.dataX;
    const ys = o.dataY;
    if (!xs || !ys || xs.length === 0 || xs.length !== ys.length) throw new Error(`curve ${o.name} has no data`);
    const out: number[][][] = [[]];
    xs.forEach((x, i) => {
        if (Number.isNaN(x) !== Number.isNaN(ys[i])) throw new Error(`curve ${o.name} breaks in one coordinate only`);
        if (Number.isNaN(x)) out.push([]); else out[out.length - 1].push([x, ys[i]]);
    });
    if (out.some(ring => ring.length === 0)) throw new Error(`curve ${o.name} has an empty ring`);
    return out;
};
/** The look of a drawn curve: fill, stroke opacity, width and dash. */
const look = (o: Shown) => ({fill: o.visProp.fillopacity as number, stroke: o.visProp.strokeopacity as number, width: o.visProp.strokewidth as number, dash: o.visProp.dash as number});

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

/** The groups a step is expected to draw, per curve: the pieces (indices) of each look, derived from the run, not from the graph. */
function expectedGroups(graph: Observed) {
    const state = curvePairStateAt(graph.run(), graph.step);
    const split = state.phase === 'split';
    return [0, 1].map(curve => {
        const candidates = unique(state.candidates.map(c => c[curve]));
        const kept = new Set(state.kept.map(c => c[curve]));
        return {
            candidate: split ? candidates : [],
            parent: split ? unique(candidates.map(i => i >> 1)) : [],
            kept: split ? [] : candidates.filter(i => kept.has(i)),
            faded: split ? [] : candidates.filter(i => !kept.has(i)),
        };
    });
}
const GROUPS = ['candidate', 'parent', 'kept', 'faded'] as const;
/** How many (curve, look) groups the step draws. */
const groupsDrawn = (graph: Observed) => expectedGroups(graph).reduce((n, g) => n + GROUPS.filter(k => g[k].length > 0).length, 0);

test('crossing pair: the board holds the nets, the overlays and the grouped piece curves of the step (steps 0, 1, 2 and the last)', () => {
    const graph = new Observed();
    mount(graph);
    // 6 points, 2 curves, 2 control polygons and 2 hulls (the whole-curve overlays)
    const base = 12;
    expect(graph.run()).toHaveLength(9);
    // step 0: the pieces overlay draws nothing, the hull and control overlays already show the two hulls and polygons
    expect(owned(graph)).toHaveLength(base);
    expect(counts(graph)).toEqual([0, 0]);
    expect(owned(graph).filter(o => o.elType === 'polygon')).toHaveLength(2);
    stepTo(graph, 1);
    // a split: per curve one candidate curve, one parent curve and one candidate control curve
    expect(groupsDrawn(graph)).toBe(4);
    expect(owned(graph)).toHaveLength(base + 6);
    expect(counts(graph)).toEqual([4, 2]);
    stepTo(graph, 2);
    // a discard: per curve one hull curve and one control curve for each look present (kept or faded)
    expect(curvePairStateAt(graph.run(), 2).phase).toBe('discard');
    expect(owned(graph)).toHaveLength(base + 2 * groupsDrawn(graph));
    expect(counts(graph)).toEqual([groupsDrawn(graph), groupsDrawn(graph)]);
    expect(groupsDrawn(graph)).toBeGreaterThan(0);
    stepTo(graph, 8);
    expect(curvePairStateAt(graph.run(), 8)).toMatchObject({phase: 'discard', depth: 4});
    // never more than 2 curves x (kept, faded) = 4 hull curves and 4 control curves, holding many rings
    expect(groupsDrawn(graph)).toBeLessThanOrEqual(4);
    expect(owned(graph)).toHaveLength(base + 2 * groupsDrawn(graph));
    expect(counts(graph)).toEqual([groupsDrawn(graph), groupsDrawn(graph)]);
    expect(pieceCurves(graph, 'Hull').reduce((n, c) => n + rings(c).length, 0)).toBeGreaterThan(4);
});

test('offset pair in half grid steps: the run ends after depth 1 and every piece is faded', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, model(OFFSET, -1));
    const run = graph.run();
    expect(run).toHaveLength(3);
    expect(owned(graph)).toHaveLength(12);
    stepTo(graph, 1);
    expect(owned(graph)).toHaveLength(12 + 6);
    stepTo(graph, 2);
    // every piece is faded: per curve one hull curve and one control curve
    expect(owned(graph)).toHaveLength(12 + 4);
    expect(curvePairStateAt(run, 2).kept).toEqual([]);
    expect(pieceCurves(graph, 'Hull').map(c => c.name).sort()).toEqual(['pieceHullA-faded', 'pieceHullB-faded']);
    // the end is the end: another Next step changes nothing
    act(() => { graph.nextStep(); });
    expect([graph.step, owned(graph).length, graph.isPlaying]).toEqual([2, 12 + 4, false]);
});

test.each([
    [0, CURVE_PAIR_CROSSING],
    [-1, model(OFFSET, -1)],
    [0, model(CUBIC, 0)],
    [-1, model(CUBIC, -1)],
])('drawn piece rings are pieceHull in board units and closed by their first vertex, read from the board (grid step exponent %i)', (exponent, start) => {
    const graph = new Observed();
    mount(graph);
    load(graph, start);
    const scale = 2 ** exponent;
    const degree = start.points.length / 2 - 1;
    const nets = [start.points.slice(0, degree + 1), start.points.slice(degree + 1)];
    expect(counts(graph)).toEqual([0, 0]);
    for (let step = 1; step < graph.run().length; step++) {
        stepTo(graph, step);
        const {state} = candidatePieces(graph);
        const expected = expectedGroups(graph);
        const drawnNames: string[] = [];
        [0, 1].forEach(curve => {
            const name = 'AB'[curve] as 'A' | 'B';
            for (const group of GROUPS) {
                const indices = expected[curve][group];
                const hull = groupCurve(graph, 'Hull', name, group);
                const control = groupCurve(graph, 'Control', name, group);
                if (indices.length === 0) {
                    expect(hull).toHaveLength(0);
                    expect(control).toHaveLength(0);
                    continue;
                }
                const depth = group === 'parent' ? state.depth - 1 : state.depth;
                const pieces = curvePieces(nets[curve], depth);
                expect(hull).toHaveLength(1);
                drawnNames.push(hull[0].name!);
                expect(rings(hull[0])).toEqual(indices.map(i => {
                    const corners = pieceHull(pieces[i], depth, degree).map(v => [pieces[i][v].x * scale, pieces[i][v].y * scale]);
                    return corners.length === 1 ? [corners[0], corners[0]] : [...corners, corners[0]];
                }));
                // every ring ends where it began
                for (const ring of rings(hull[0])) expect(ring[ring.length - 1]).toEqual(ring[0]);
                // the control polygons of the pieces are the dyadic pieces themselves in board units (the parents have none)
                if (group === 'parent') expect(control).toHaveLength(0);
                else {
                    expect(control).toHaveLength(1);
                    expect(rings(control[0])).toEqual(indices.map(i => pieces[i].map(p => [p.x * scale, p.y * scale])));
                }
            }
        });
        expect(pieceCurves(graph, 'Hull').map(c => c.name).sort()).toEqual(drawnNames.sort());
    }
});

test('the whole-curve hull of step 0 is drawn by the pieces overlay only when the hull overlay is off', () => {
    const graph = new Observed();
    mount(graph);
    // defaults: hull and control overlays on, so step 0 shows the two hulls and the two control polygons from them
    expect(graph.overlayShown('hull')).toBe(true);
    expect(graph.overlayShown('control')).toBe(true);
    expect(counts(graph)).toEqual([0, 0]);
    expect(owned(graph).filter(o => o.elType === 'polygon')).toHaveLength(2);
    act(() => { graph.setOverlay('hull', false); });
    expect(graph.step).toBe(0);
    const state = curvePairStateAt(graph.run(), 0);
    expect(state.depth).toBe(0);
    // the pieces overlay now draws the one piece per curve: the net's hull (the control polygons stay the overlay's)
    expect(counts(graph)).toEqual([2, 0]);
    const nets = [CURVE_PAIR_CROSSING.points.slice(0, 3), CURVE_PAIR_CROSSING.points.slice(3)];
    (['A', 'B'] as const).forEach((curve, k) => {
        const hull = groupCurve(graph, 'Hull', curve, state.kept.length > 0 ? 'kept' : 'faded');
        expect(hull).toHaveLength(1);
        const corners = pieceHull(nets[k], 0, 2).map(v => [nets[k][v].x, nets[k][v].y]);
        expect(rings(hull[0])).toEqual([[...corners, corners[0]]]);
    });
});

test('a hull that is a segment or a point stays visible as a ring of two or three vertices', () => {
    const graph = new Observed();
    mount(graph);
    // B is a straight line (collinear net), A degenerates to one point
    load(graph, model([[1, 1], [1, 1], [1, 1], [0, 0], [2, 2], [4, 4]]));
    expect(graph.run().length).toBeGreaterThan(1);
    stepTo(graph, 1);
    const [a] = groupCurve(graph, 'Hull', 'A', 'parent');
    const [b] = groupCurve(graph, 'Hull', 'B', 'parent');
    expect(rings(a)).toEqual([[[1, 1], [1, 1]]]);
    expect(rings(b)).toEqual([[[0, 0], [4, 4], [0, 0]]]);
    expect(a.visProp.linecap).toBe('round');
});

test('discard steps: kept pieces are filled and thick, faded ones thin, unfilled and still visible; each curve keeps its own dash', () => {
    const graph = new Observed();
    mount(graph);
    const dashes = {A: 0, B: 2};
    let sawKept = false;
    let sawFaded = false;
    let sawKeptB = false;
    for (let step = 1; step < graph.run().length; step++) {
        stepTo(graph, step);
        const {state} = candidatePieces(graph);
        for (const curve of ['A', 'B'] as const) {
            const dash = dashes[curve];
            if (state.phase === 'split') {
                const [candidate] = groupCurve(graph, 'Hull', curve, 'candidate');
                const [parent] = groupCurve(graph, 'Hull', curve, 'parent');
                expect(look(candidate)).toMatchObject({fill: 0, stroke: 1, dash});
                expect(look(parent)).toMatchObject({fill: 0, dash});
                expect(look(parent).width).toBeLessThan(look(candidate).width);
                continue;
            }
            for (const c of groupCurve(graph, 'Hull', curve, 'kept')) {
                sawKept = true;
                if (curve === 'B') sawKeptB = true;
                // kept pieces of B stay dashed, so A and B differ by more than colour on discard steps
                expect(look(c)).toMatchObject({stroke: 1, dash});
                expect(look(c).fill).toBeGreaterThan(0);
            }
            for (const c of groupCurve(graph, 'Hull', curve, 'faded')) {
                sawFaded = true;
                // differs from the kept look by more than colour: no fill and a thinner stroke, still legible when projected
                expect(look(c).dash).toBe(dash);
                expect(look(c).fill).toBe(0);
                expect(look(c).stroke).toBeGreaterThanOrEqual(0.5);
                expect(look(c).stroke).toBeLessThan(1);
                expect(look(c).width).toBeLessThan(2.5);
            }
        }
    }
    expect(sawKept && sawFaded && sawKeptB).toBe(true);
});

test('piece control polygons are drawn only while the control overlay is on; hiding pieces removes every piece object', () => {
    const graph = new Observed();
    mount(graph);
    stepTo(graph, 1);
    act(() => { graph.setOverlay('control', false); });
    expect(counts(graph)).toEqual([4, 0]);
    // 6 points, 2 curves, 2 hulls and 4 piece curves (candidates and parents; the whole-curve control polygons are off too)
    expect(owned(graph)).toHaveLength(6 + 2 + 2 + 4);
    act(() => { graph.setOverlay('control', true); });
    expect(pieceCurves(graph, 'Control')).toHaveLength(2);
    act(() => { graph.setOverlay('pieces', false); });
    expect(counts(graph)).toEqual([0, 0]);
    expect(owned(graph)).toHaveLength(12);
    act(() => { graph.setOverlay('hull', false); graph.setOverlay('control', false); });
    expect(owned(graph)).toHaveLength(8);
    act(() => { graph.setOverlay('pieces', true); });
    expect(owned(graph)).toHaveLength(8 + 4);
    // the step is a display input: it redraws the pieces without touching the other objects
    stepTo(graph, 2);
    expect(owned(graph)).toHaveLength(8 + counts(graph)[0]);
    act(() => { graph.disposeScene(); });
    expect(owned(graph)).toHaveLength(0);
    expect(counts(graph)).toEqual([0, 0]);
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
    expect(counts(graph)).toEqual([0, 0]);
    expect(owned(graph)).toHaveLength(12);
    // the redrawn pieces are those of the new nets: the parent of step 1 is the hull of the dragged net A
    stepTo(graph, 1);
    expect(rings(groupCurve(graph, 'Hull', 'A', 'parent')[0])).toEqual([[[0, 0], [4, 0], [2, 6], [0, 0]]]);
    act(() => { graph.resetTrace(); });
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
    expect(owned(graph)).toHaveLength(12);
    act(() => { graph.play(); });
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('a Preset without a step resets to step 0; a Preset with a step keeps it, clamped to the run', async () => {
    const graph = new Observed();
    mount(graph);
    stepTo(graph, 5);
    const data = CURVE_PAIR_CROSSING;
    const state = (fields: object) => ({initialized: true, overlays: {control: true, hull: true, pieces: true}, ...fields});
    act(() => { graph.importPreset({id: BEZIER_HULLS_PRESET_KEY, graphState: state({}), data}); });
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    stepTo(graph, 5);
    act(() => { graph.importPreset({id: BEZIER_HULLS_PRESET_KEY, data}); });
    expect(graph.step).toBe(0);
    act(() => { graph.importPreset({id: BEZIER_HULLS_PRESET_KEY, graphState: state({step: 3}), data}); });
    expect(graph.step).toBe(3);
    act(() => { graph.importPreset({id: BEZIER_HULLS_PRESET_KEY, graphState: state({step: 99999}), data}); });
    expect(graph.step).toBe(graph.run().length - 1);
    expect(counts(graph)[0]).toBeGreaterThan(0);
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
    expect(graph.presetCollection().key).toBe('compgeo-bezier-hulls');
    expect(graph.presetCollection().checkGraphState?.({initialized: true, overlays: {pieces: true}})).toBeUndefined();
});
