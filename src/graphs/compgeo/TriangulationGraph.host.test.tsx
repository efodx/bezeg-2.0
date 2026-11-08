import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_T0, TriangulationGraph, TriangulationGraphState} from './TriangulationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {angleVector} from '../../compgeo/delaunay';
import {createTriangulation, edges, flip} from '../../compgeo/triangulation';
import {renderMessage, setLanguage} from '../../localization';
import {
    TRIANGULATION_DELAUNAY, TRIANGULATION_EXAMPLES, TRIANGULATION_NINE_POINTS, TRIANGULATION_NINE_POINTS_TRIANGLES,
    TRIANGULATION_PRESET_KEY, triangulationCollection,
} from './triangulationPresetCollection';
import {incrementalTriangulation} from '../../compgeo/delaunay';
import {HULL_TRACE_SAMPLE_1} from './HullTraceGraph';

// Counts the live subscriptions of the language listener, so unmount can be checked to release it.
const languageListeners = vi.hoisted(() => ({live: 0}));
vi.mock('../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            languageListeners.live++;
            const off = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) languageListeners.live--; released = true; off(); };
        },
    };
});

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    languageListeners.live = 0;
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends TriangulationGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; triggerEventHandlers(names: string[], args: unknown[]): void; visProp?: Record<string, unknown>};
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const edgeCurves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve' && /^triangulation-(hull-)?edge$/.test(o.name ?? ''));
const hullCurves = (graph: Observed) => edgeCurves(graph).filter(o => o.name === 'triangulation-hull-edge');
const quads = (graph: Observed) => objects(graph).filter(o => o.elType === 'polygon' && o.name === 'triangulation-quadrilateral');

const mount = (graph: Observed) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const readout = (name: string) => document.querySelector(`[data-readout="${name}"]`)?.textContent;
// The refusal is the shared refusal region's text: absent (undefined) while it is empty.
const part = (name: string) => name === 'refusal'
    ? document.querySelector('[data-triangulation="refusal-slot"]')?.textContent || undefined
    : document.querySelector(`[data-triangulation="${name}"]`)?.textContent;
const button = () => document.querySelector('button[data-action="flip-edge"]') as HTMLButtonElement;
const list = () => document.querySelector('[data-triangulation="edge-flip"] select') as HTMLSelectElement;
const choose = (a: number, b: number) => act(() => { fireEvent.change(list(), {target: {value: `${a}-${b}`}}); });
const flipIt = () => act(() => { fireEvent.click(button()); });
const pts = (points: Array<[number, number]>): PointSetModel => ({mode: 'points', closed: false, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const t0 = () => {
    const made = createTriangulation(TRIANGULATION_EXAMPLE_POINTS.points, TRIANGULATION_T0);
    if (!made.ok) throw new Error('T0 invalid');
    return made.value;
};
const minOf = (triangles: readonly (readonly number[])[]) => {
    const made = createTriangulation(TRIANGULATION_EXAMPLE_POINTS.points, triangles);
    if (!made.ok) throw new Error('invalid triangulation');
    return angleVector(made.value)[0].toFixed(2).replace('.', ',');
};
/** The first interior edge of T0 whose flip is allowed and whose result has a different smallest angle. */
function legalEdge() {
    const start = t0();
    const found = edges(start).filter(e => e.interior).find(e => {
        const r = flip(start, [e.a, e.b]);
        return r.ok && minOf(r.value.triangles) !== minOf(start.triangles);
    });
    if (!found) throw new Error('no legal edge');
    return found;
}
function refusedEdge(kind: 'not-convex' | 'hull-edge') {
    const start = t0();
    const found = edges(start).find(e => {
        const r = flip(start, [e.a, e.b]);
        return !r.ok && r.refusal.kind === kind;
    });
    if (!found) throw new Error(`no ${kind} edge`);
    return found;
}

test('the default scene is the B2 example in T0: 7 triangles, 13 edges, 8 interior, 5 on the hull', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(TRIANGULATION_EXAMPLE_POINTS.points);
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(readout('n')).toBe('Točk: n = 7');
    expect(readout('k')).toBe('Točk na robu ovojnice: k = 5');
    expect(readout('collinear')).toBeUndefined();
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
    expect(readout('edges')).toBe('Robov: 13 = 3n − 3 − k = 3 · 7 − 3 − 5; notranjih 8, na ovojnici 5');
    expect(readout('angle')).toBe(`Najmanjši kot zdaj: ${minOf(TRIANGULATION_T0)}°`);
    expect(readout('angle-before')).toContain('zamenjave še ni bilo');
});

test('the board draws 13 edge curves, 5 of them heavier hull edges, and shades a quadrilateral only for a selected interior edge', () => {
    const graph = new Observed();
    mount(graph);
    expect(edgeCurves(graph)).toHaveLength(13);
    expect(hullCurves(graph)).toHaveLength(5);
    expect(quads(graph)).toHaveLength(0);
    const weight = (o: Shown | undefined) => Number(o?.visProp?.strokewidth);
    const interior = edgeCurves(graph).find(o => o.name === 'triangulation-edge');
    expect(weight(hullCurves(graph)[0])).toBeGreaterThan(weight(interior));
    const e = legalEdge();
    choose(e.a, e.b);
    expect(quads(graph)).toHaveLength(1);
    expect(edgeCurves(graph)).toHaveLength(13);
    const selectedWeights = edgeCurves(graph).map(weight);
    expect(Math.max(...selectedWeights)).toBe(8);
    const hull = refusedEdge('hull-edge');
    choose(hull.a, hull.b);
    expect(quads(graph)).toHaveLength(0);
    expect(edgeCurves(graph)).toHaveLength(13);
});

test('clicking an edge on the board selects it, after the pointer dispatch, and shades its quadrilateral', async () => {
    const graph = new Observed();
    mount(graph);
    const curves = edgeCurves(graph).filter(o => o.name === 'triangulation-edge');
    expect(curves).toHaveLength(8);
    curves[0].triggerEventHandlers(['down'], []);
    // Still drawn: the board may still be hit-testing these curves (the overlay redraw would remove them).
    expect(graph.selectedEdge()).toBeUndefined();
    await act(async () => {});
    expect(graph.selectedEdge()?.interior).toBe(true);
    expect(quads(graph)).toHaveLength(1);
    expect(list().value).toMatch(/^\d+-\d+$/);
});

test('a legal flip keeps both counts, changes the smallest angle and shows both minima', () => {
    const graph = new Observed();
    mount(graph);
    const e = legalEdge();
    const before = readout('angle');
    choose(e.a, e.b);
    flipIt();
    expect(graph.triangles).not.toEqual(TRIANGULATION_T0);
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
    expect(readout('edges')).toBe('Robov: 13 = 3n − 3 − k = 3 · 7 − 3 − 5; notranjih 8, na ovojnici 5');
    expect(readout('angle')).not.toBe(before);
    expect(readout('angle-before')).toBe(`Najmanjši kot pred zadnjo zamenjavo: ${minOf(TRIANGULATION_T0)}°`);
    expect(part('event')).toContain('je zamenjan z robom');
    expect(part('live')).toContain('je zamenjan z robom');
    expect(edgeCurves(graph)).toHaveLength(13);
    // The new diagonal is selected, so flipping again goes back.
    flipIt();
    expect(readout('angle')).toBe(before);
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
});

test('a legal flip changes the whole sorted angle vector, not only its minimum, and keeps the angle sum', () => {
    const graph = new Observed();
    mount(graph);
    const e = legalEdge();
    const vector = (triangles: readonly (readonly number[])[]) => {
        const made = createTriangulation(TRIANGULATION_EXAMPLE_POINTS.points, triangles);
        if (!made.ok) throw new Error('invalid triangulation');
        return angleVector(made.value);
    };
    const before = vector(graph.triangles);
    choose(e.a, e.b);
    flipIt();
    const after = vector(graph.triangles);
    expect(before).toHaveLength(21);
    expect(after).toHaveLength(21);
    // Both triangles at the edge are replaced, so angles beyond the smallest change as well.
    expect(after.slice(1).some((angle, i) => Math.abs(angle - before[i + 1]) > 1e-9)).toBe(true);
    expect(after.reduce((a, b) => a + b, 0)).toBeCloseTo(before.reduce((a, b) => a + b, 0), 9);
    for (let i = 1; i < after.length; i++) expect(after[i]).toBeGreaterThanOrEqual(after[i - 1]);
});

test('a flip of a non-convex quadrilateral and of a hull edge each show their reason and change nothing', () => {
    const graph = new Observed();
    mount(graph);
    const concave = refusedEdge('not-convex');
    choose(concave.a, concave.b);
    flipIt();
    expect(part('refusal')).toContain('ne tvorita izbočenega štirikotnika');
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    const hull = refusedEdge('hull-edge');
    choose(hull.a, hull.b);
    flipIt();
    expect(part('refusal')).toContain('leži na ovojnici');
    expect(part('live')).not.toContain('leži na ovojnici');
    expect(part('live')).toBe('');
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(readout('angle-before')).toContain('zamenjave še ni bilo');
});

test('a flip with no edge selected says so and changes nothing', () => {
    const graph = new Observed();
    mount(graph);
    flipIt();
    expect(part('refusal')).toContain('Najprej izberite rob');
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
});

test('an added point inside a triangle gives +2 triangles and names the case', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.addPointAt({x: 6, y: 2}); });
    expect(graph.triangles).toHaveLength(9);
    expect(part('event')).toContain('znotraj trikotnika');
    expect(readout('triangles')).toBe('Trikotnikov: 9 = 2n − 2 − k = 2 · 8 − 2 − 5');
    expect(readout('edges')).toBe('Robov: 16 = 3n − 3 − k = 3 · 8 − 3 − 5; notranjih 11, na ovojnici 5');
});

test('an added point outside the hull matches 2n - 2 - k, and a collinear boundary point is counted with its note', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.addPointAt({x: 10, y: 0}); });
    expect(part('event')).toContain('zunaj ovojnice');
    expect(readout('k')).toBe('Točk na robu ovojnice: k = 6');
    expect(readout('collinear')).toContain('Točke na stranicah ovojnice, ki niso oglišča: 1;');
    expect(readout('triangles')).toBe('Trikotnikov: 8 = 2n − 2 − k = 2 · 8 − 2 − 6');
    expect(graph.triangles).toHaveLength(8);
});

test('the nine points of the hull lesson give k = 6 with one collinear point and 10 triangles', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(pts([[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]])); });
    expect(readout('n')).toBe('Točk: n = 9');
    expect(readout('k')).toBe('Točk na robu ovojnice: k = 6');
    expect(readout('collinear')).toContain('Točke na stranicah ovojnice, ki niso oglišča: 1;');
    expect(readout('triangles')).toBe('Trikotnikov: 10 = 2n − 2 − k = 2 · 9 − 2 − 6');
    expect(graph.triangles).toHaveLength(10);
});

test('a move that keeps the triangulation valid keeps the triangle list; one that breaks it rebuilds and says so', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.movePointTo(5, {x: 4, y: 3}); });
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(part('event')).toBeUndefined();
    act(() => { graph.movePointTo(0, {x: 20, y: 20}); });
    expect(graph.triangles).not.toEqual(TRIANGULATION_T0);
    expect(graph.triangulation()).toBeDefined();
    expect(part('event')).toContain('ponovno zgrajena po začetnem pravilu');
    expect(part('live')).toContain('ponovno zgrajena');
});

test('removing a point rebuilds the triangulation', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.select(5); graph.removeSelected(); });
    expect(graph.model.points).toHaveLength(6);
    expect(graph.triangulation()).toBeDefined();
    expect(part('event')).toContain('ponovno zgrajena po začetnem pravilu');
    expect(readout('n')).toBe('Točk: n = 6');
});

test('duplicates, collinear and too few points are refused with a message and no triangulation', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(pts([[0, 0], [1, 1], [0, 0]])); });
    expect(part('refusal')).toContain('Dve točki sta enaki');
    expect(graph.triangles).toEqual([]);
    expect(edgeCurves(graph)).toHaveLength(0);
    expect(readout('n')).toBeUndefined();
    act(() => { graph.loadModel(pts([[0, 0], [1, 1], [2, 2]])); });
    expect(part('refusal')).toContain('vsaj tri točke');
    act(() => { graph.loadModel(pts([[0, 0], [1, 1]])); });
    expect(part('refusal')).toContain('vsaj tri točke');
    // No edges: the list offers only "none" and says why; Flip stays reachable.
    expect(list().options).toHaveLength(1);
    expect(document.querySelector('[data-triangulation="edge-flip"]')!.textContent).toContain('Ni robov za izbiro');
    act(() => { graph.loadModel(pts([[0, 0], [1, 1], [2, 0]])); });
    expect(part('refusal')).toBeUndefined();
    expect(graph.triangles).toHaveLength(1);
});

test('edge selection and flip work with the native list and button alone', () => {
    const graph = new Observed();
    mount(graph);
    expect(list().tabIndex).toBeGreaterThanOrEqual(0);
    expect(button().tagName).toBe('BUTTON');
    expect(button().tabIndex).toBeGreaterThanOrEqual(0);
    expect(list().options).toHaveLength(14);
    const e = legalEdge();
    act(() => { list().focus(); });
    choose(e.a, e.b);
    expect(document.activeElement).toBe(list());
    act(() => { button().focus(); fireEvent.click(button()); });
    expect(part('event')).toContain('je zamenjan z robom');
});

test('the panel text follows a live language switch', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { setLanguage('en'); });
    expect(readout('triangles')).toBe('Triangles: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
    act(() => { setLanguage('sl'); });
    expect(readout('triangles')).toContain('Trikotnikov: 7');
});

// ---- Overlays, Presets, Reset, disposal, performance (task 12b) ---------------------------------------------------------

const labelsOf = (graph: Observed, name: string) => objects(graph).filter(o => o.name === name);
const settle = async (start: () => Promise<void>) => {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
};
const checked = (data: unknown) => triangulationCollection.check(data);
const refusalKey = (data: unknown) => {
    const result = checked(data);
    return 'rejection' in result ? result.rejection.key : undefined;
};
const example = (id: string) => {
    const found = TRIANGULATION_EXAMPLES.find(e => e.id === id);
    if (!found) throw new Error(id);
    return found.data;
};
const copy = (data: unknown): Record<string, unknown> => JSON.parse(JSON.stringify(data));
const scene = (graph: Observed) => JSON.stringify([graph.model.points, graph.triangles]);

test('the edges overlay labels every edge with its two point numbers; the angles overlay marks the smallest angle; both toggle off', () => {
    const graph = new Observed();
    mount(graph);
    expect(labelsOf(graph, 'triangulation-edge-label')).toHaveLength(0);
    expect(labelsOf(graph, 'triangulation-min-angle')).toHaveLength(0);
    act(() => { graph.setOverlay('edges', true); });
    expect(labelsOf(graph, 'triangulation-edge-label')).toHaveLength(13);
    expect(labelsOf(graph, 'triangulation-min-angle')).toHaveLength(0);
    act(() => { graph.setOverlay('angles', true); });
    expect(labelsOf(graph, 'triangulation-min-angle')).toHaveLength(1);
    expect(labelsOf(graph, 'triangulation-min-angle-label')).toHaveLength(1);
    expect(edgeCurves(graph)).toHaveLength(13);
    act(() => { graph.setOverlay('edges', false); graph.setOverlay('angles', false); });
    expect(labelsOf(graph, 'triangulation-edge-label')).toHaveLength(0);
    expect(labelsOf(graph, 'triangulation-min-angle')).toHaveLength(0);
    expect(labelsOf(graph, 'triangulation-min-angle-label')).toHaveLength(0);
    expect(edgeCurves(graph)).toHaveLength(13);
});

test('with the triangulation overlay hidden the panel shows only n and k: no counts, angles or edge list give the triangulation away', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setOverlay('triangulation', false); });
    expect(readout('n')).toContain('7');
    expect(readout('k')).toContain('5');
    for (const name of ['triangles', 'edges', 'angle', 'angle-before']) expect(readout(name)).toBeUndefined();
    expect(list()).toBeNull();
    expect(button()).toBeNull();
    act(() => { graph.setOverlay('triangulation', true); });
    expect(readout('triangles')).toContain('7');
    expect(list().options).toHaveLength(14);
    expect(button()).not.toBeNull();
});

test('the board text is language-neutral, the overlay switches are labelled in both languages, and the marker survives a flip', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setOverlay('edges', true); graph.setOverlay('angles', true); });
    const texts = () => objects(graph).filter(o => o.elType === 'text').map(o => String((o as unknown as {plaintext?: string}).plaintext ?? ''));
    const before = texts();
    expect(before).toContain('α');
    expect(before).toContain('1–2');
    act(() => { setLanguage('en'); });
    expect(texts()).toEqual(before);
    const labels = () => Array.from(document.querySelectorAll('label')).map(l => (l.textContent ?? '').trim());
    expect(labels()).toEqual(expect.arrayContaining(['Edge numbers', 'Smallest angle']));
    act(() => { setLanguage('sl'); });
    expect(labels()).toEqual(expect.arrayContaining(['Številke robov', 'Najmanjši kot']));
    const e = legalEdge();
    choose(e.a, e.b);
    flipIt();
    expect(labelsOf(graph, 'triangulation-edge-label')).toHaveLength(13);
    expect(labelsOf(graph, 'triangulation-min-angle')).toHaveLength(1);
});

test('the Preset examples are T0, the Delaunay triangulation and the nine hull-lesson points, all valid', () => {
    expect(TRIANGULATION_EXAMPLES.map(e => e.id)).toEqual(['t0', 'delaunay', 'nine-points']);
    expect(TRIANGULATION_NINE_POINTS.points).toEqual(HULL_TRACE_SAMPLE_1.points);
    const built = incrementalTriangulation(TRIANGULATION_NINE_POINTS.points);
    expect(built.ok && built.value.triangles).toEqual(TRIANGULATION_NINE_POINTS_TRIANGLES);
    expect(example('t0').triangles).toEqual(TRIANGULATION_T0);
    expect(example('delaunay').triangles).toEqual(TRIANGULATION_DELAUNAY);
    for (const {data} of TRIANGULATION_EXAMPLES) expect('data' in checked(data)).toBe(true);
});

test('every collection Preset loads and shows its counts', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.presetCollection().key).toBe(TRIANGULATION_PRESET_KEY);
    act(() => { graph.importPreset({id: TRIANGULATION_PRESET_KEY, graphState: {initialized: true}, data: example('delaunay')}); });
    expect(graph.triangles).toEqual(TRIANGULATION_DELAUNAY);
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
    expect(readout('edges')).toBe('Robov: 13 = 3n − 3 − k = 3 · 7 − 3 − 5; notranjih 8, na ovojnici 5');
    expect(readout('angle')).toBe(`Najmanjši kot zdaj: ${minOf(TRIANGULATION_DELAUNAY)}°`);
    expect(part('event')).toBeUndefined();
    act(() => { graph.importPreset({id: TRIANGULATION_PRESET_KEY, graphState: {initialized: true}, data: example('nine-points')}); });
    expect(graph.triangles).toEqual(TRIANGULATION_NINE_POINTS_TRIANGLES);
    expect(readout('k')).toBe('Točk na robu ovojnice: k = 6');
    expect(readout('triangles')).toBe('Trikotnikov: 10 = 2n − 2 − k = 2 · 9 − 2 − 6');
    expect(edgeCurves(graph)).toHaveLength(3 * 9 - 3 - 6);
    act(() => { graph.importPreset({id: TRIANGULATION_PRESET_KEY, graphState: {initialized: true}, data: example('t0')}); });
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
    expect(readout('edges')).toBe('Robov: 13 = 3n − 3 − k = 3 · 7 − 3 − 5; notranjih 8, na ovojnici 5');
});

test('a Preset round trip keeps the points and the triangle list, a flipped one included, and stores the list once', async () => {
    const graph = new Observed();
    mount(graph);
    const e = legalEdge();
    choose(e.a, e.b);
    flipIt();
    const flipped = graph.triangles;
    expect(flipped).not.toEqual(TRIANGULATION_T0);
    const exported = graph.exportPreset();
    expect(exported.id).toBe(TRIANGULATION_PRESET_KEY);
    expect(exported.graphState).not.toHaveProperty('triangles');
    expect(exported.graphState).not.toHaveProperty('previous');
    expect(exported.graphState).not.toHaveProperty('model');
    expect(triangulationCollection.checkGraphState?.(exported.graphState)).toBeUndefined();
    expect('data' in checked(exported.data)).toBe(true);
    const points = graph.model.points;
    act(() => { graph.saveCurrentPreset('mine'); });
    act(() => { graph.importPreset({id: TRIANGULATION_PRESET_KEY, graphState: {initialized: true}, data: example('nine-points')}); });
    expect(graph.model.points).toHaveLength(9);
    await settle(() => graph.selectPreset('mine'));
    expect(graph.model.points).toEqual(points);
    expect(graph.triangles).toEqual(flipped);
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
    expect(graph.selectedEdge()).toBeUndefined();
});

test('graphState with an unknown overlay or a stray field is refused; the known overlay ids are accepted', () => {
    const state = (graphState: unknown) => triangulationCollection.checkGraphState?.(graphState)?.key;
    expect(state({initialized: true, overlays: {triangulation: true, edges: false, angles: true, grid: true}})).toBeUndefined();
    expect(state({initialized: true, overlays: {nope: true}})).toBe('pointset_invalid_overlays');
    expect(state({initialized: true, triangles: []})).toBe('invalid_value');
});

describe('import refusals', () => {
    const t0 = () => copy(example('t0'));
    const rest = (): number[][] => (t0().triangles as number[][]).slice(1);
    const tail = (): unknown[] => (t0().points as unknown[]).slice(1);
    const cases: Array<[string, () => unknown, string]> = [
        ['41 points', () => ({...t0(), points: Array.from({length: 41}, (_, i) => ({x: i, y: i * i % 7})), triangles: []}), 'pointset_invalid_too_many_points'],
        ['a non-integer coordinate', () => ({...t0(), points: [{x: 0.5, y: 0}, ...tail()]}), 'pointset_invalid_non_integer_coordinate'],
        ['a coordinate out of range', () => ({...t0(), points: [{x: 1e9, y: 0}, ...tail()]}), 'pointset_invalid_coordinate_out_of_range'],
        ['polygon mode', () => ({...t0(), mode: 'polygon', closed: true}), 'tri_invalid_mode'],
        ['segments mode', () => ({...t0(), mode: 'segments'}), 'tri_invalid_mode'],
        ['no triangle list', () => { const d = t0(); delete d.triangles; return d; }, 'tri_invalid_triangles'],
        ['a triangle that is not a triple', () => ({...t0(), triangles: [[1, 2]]}), 'tri_invalid_triangles'],
        ['a non-integer index', () => ({...t0(), triangles: [[1, 2, 6.5]]}), 'tri_invalid_triangles'],
        ['a wrong point index', () => ({...t0(), triangles: [...rest(), [6, 2, 99]]}), 'tri_invalid_index'],
        ['a clockwise triangle', () => ({...t0(), triangles: [[1, 6, 2], ...rest()]}), 'tri_invalid_clockwise'],
        ['overlapping triangles', () => ({...t0(), triangles: [...rest(), [1, 2, 6], [1, 2, 6]]}), 'tri_invalid_triangulation'],
        ['a missing triangle', () => ({...t0(), triangles: rest()}), 'tri_invalid_triangulation'],
        ['an empty list for valid points', () => ({...t0(), triangles: []}), 'tri_invalid_triangulation'],
        ['the nine-point list on the seven points', () => ({...t0(), triangles: TRIANGULATION_NINE_POINTS_TRIANGLES}), 'tri_invalid_index'],
    ];
    test.each(cases)('%s is refused with its localized message', (_name, make, key) => {
        expect(refusalKey(make())).toBe(key);
        const result = checked(make());
        if (!('rejection' in result)) throw new Error('not refused');
        setLanguage('sl');
        const sl = renderMessage(result.rejection);
        setLanguage('en');
        const en = renderMessage(result.rejection);
        expect(sl).not.toBe(en);
        expect(sl).not.toMatch(/\{value\d\}/);
        expect(en).not.toMatch(/\{value\d\}/);
    });

    test('importPresetData refuses a bad stored list by throwing and leaves the scene unchanged', () => {
        const graph = new Observed();
        mount(graph);
        const e = legalEdge();
        choose(e.a, e.b);
        flipIt();
        const before = scene(graph);
        const selected = graph.selectedEdge();
        const clockwise = {...t0(), triangles: [[1, 6, 2], ...rest()]} as unknown as PointSetModel;
        expect(() => graph.importPresetData(clockwise)).toThrow(/not a valid triangulation/);
        expect(scene(graph)).toBe(before);
        expect(graph.selectedEdge()).toEqual(selected);
        expect(part('event')).toContain('je zamenjan z robom');
        const wrongList = {...t0(), triangles: [[0, 1, 2]]} as unknown as PointSetModel;
        expect(() => graph.importPresetData(wrongList)).toThrow();
        expect(scene(graph)).toBe(before);
    });
});

test('points without a triangulation are saved with an empty list and import again', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(pts([[0, 0], [1, 1], [0, 0]])); });
    const exported = graph.exportPreset();
    expect((exported.data as unknown as {triangles: unknown}).triangles).toEqual([]);
    expect('data' in checked(exported.data)).toBe(true);
    act(() => { graph.importPreset({id: TRIANGULATION_PRESET_KEY, graphState: {initialized: true}, data: example('t0')}); });
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    act(() => { graph.importPreset(exported); });
    expect(part('refusal')).toContain('Dve točki sta enaki');
});

test('Reset returns to the default scene and clears the selection and the event', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.addPointAt({x: 6, y: 2}); });
    const e = legalEdge();
    choose(e.a, e.b);
    flipIt();
    act(() => { graph.setOverlay('edges', true); });
    expect(graph.model.points).toHaveLength(8);
    await settle(() => graph.reset());
    expect(graph.model.points).toEqual(TRIANGULATION_EXAMPLE_POINTS.points);
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(graph.selectedEdge()).toBeUndefined();
    expect(graph.event).toBeUndefined();
    expect(part('event')).toBeUndefined();
    expect(list().value).not.toMatch(/^\d+-\d+$/);
    expect(labelsOf(graph, 'triangulation-edge-label')).toHaveLength(0);
    expect(readout('triangles')).toBe('Trikotnikov: 7 = 2n − 2 − k = 2 · 7 − 2 − 5');
});

test('a state write carrying a triangle list (a lesson action or checkpoint) clears the flip event and the selection', () => {
    const graph = new Observed();
    mount(graph);
    const e = legalEdge();
    choose(e.a, e.b);
    flipIt();
    expect(graph.event?.kind).toBe('flipped');
    const write: Partial<TriangulationGraphState> = {triangles: TRIANGULATION_T0.map(tri => [...tri])};
    act(() => { graph.setState(write); });
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(graph.event).toBeUndefined();
    expect(part('event')).toBeUndefined();
    expect(graph.selectedEdge()).toBeUndefined();
});

test('only the user add path reports an insertion: loadModel with a one-point superset shows no event', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.addPointAt({x: 6, y: 2}); });
    expect(graph.event?.kind).toBe('inserted');
    const superset = pts([...graph.model.points.map((p): [number, number] => [p.x, p.y]), [7, 3]]);
    act(() => { graph.loadModel(superset); });
    expect(graph.model.points).toHaveLength(9);
    expect(graph.event).toBeUndefined();
    expect(part('event')).toBeUndefined();
});

test('a refusal is announced once: by its alert, not by the polite live region', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(pts([[0, 0], [1, 1], [0, 0]])); });
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(document.querySelector('[data-refusal-notice]')!.textContent).toContain('Dve točki sta enaki');
    expect(part('refusal')).toContain('Dve točki sta enaki');
    expect(part('live')).not.toContain('Dve točki sta enaki');
    expect(part('live')).toBe('');
});

test('the Flip button is described by the hint', () => {
    mount(new Observed());
    const hint = document.getElementById('triangulation-flip-hint');
    expect(hint?.textContent).not.toBe('');
    expect(button().getAttribute('aria-describedby')).toContain('triangulation-flip-hint');
});

test('the selected edge is heavier and dashed, apart from colour, and the hull stays heavier than the interior', () => {
    const graph = new Observed();
    mount(graph);
    const e = legalEdge();
    choose(e.a, e.b);
    const width = (o: Shown) => Number(o.visProp?.strokewidth);
    const dashOf = (o: Shown) => Number(o.visProp?.dash);
    const curves = edgeCurves(graph);
    const heaviest = Math.max(...curves.map(width));
    const dashed = curves.filter(o => dashOf(o) > 0);
    expect(dashed).toHaveLength(1);
    expect(width(dashed[0])).toBe(heaviest);
    const plain = curves.filter(o => dashOf(o) === 0);
    expect(Math.min(...hullCurves(graph).map(width))).toBeGreaterThan(Math.max(...plain.filter(o => o.name === 'triangulation-edge').map(width)));
});

test('a live language switch re-renders the panel text, the refusal and the readouts', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(pts([[0, 0], [1, 1], [0, 0]])); });
    expect(part('refusal')).toContain('Dve točki sta enaki');
    act(() => { setLanguage('en'); });
    expect(part('refusal')).toContain('Two points are equal');
    act(() => { graph.loadModel(TRIANGULATION_EXAMPLE_POINTS); });
    expect(readout('edges')).toContain('Edges: 13');
    expect(readout('angle')).toMatch(/^Smallest angle now: \d+\.\d\d°$/);
    act(() => { setLanguage('sl'); });
    expect(readout('angle')).toMatch(/^Najmanjši kot zdaj: \d+,\d\d°$/);
});

test('unmount leaves no board objects, language listeners or key listeners', () => {
    const graph = new Observed();
    const view = mount(graph);
    act(() => { graph.setOverlay('edges', true); graph.setOverlay('angles', true); });
    const board = graph.liveBoard();
    const box = board.containerObj as HTMLElement;
    const remove = vi.spyOn(box, 'removeEventListener');
    expect(languageListeners.live).toBeGreaterThan(0);
    expect((board.objectsList as unknown[]).length).toBeGreaterThan(0);
    const owned = () => (graph['overlayObjects'] as unknown[]).length;
    expect(owned()).toBeGreaterThan(0);
    expect(edgeCurves(graph).length).toBeGreaterThan(0);
    view.unmount();
    expect(owned()).toBe(0);
    expect(languageListeners.live).toBe(0);
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});

// The model-edit path (store write, triangle list kept or rebuilt) at the 40-point limit. The board redraw that follows is
// JSXGraph object creation and is measured in a browser (docs/reviews/triangulation-voronoi/12b-handoff.md has the jsdom numbers).
test('performance: 20 consecutive single-point moves at 40 points stay far below one frame through the model-edit API', () => {
    const graph = new Observed();
    mount(graph);
    const spread = Array.from({length: 40}, (_, i): [number, number] => [(i * 7) % 41 - 20, (i * 13 + 5) % 37 - 18]);
    act(() => { graph.loadModel(pts(spread)); });
    expect(graph.triangulation()).toBeDefined();
    const started = performance.now();
    for (let i = 0; i < 20; i++) graph.movePointTo(20, {x: spread[20][0] + (i % 2 ? 1 : -1) * (1 + i % 3), y: spread[20][1] + (i % 5) - 2});
    const mean = (performance.now() - started) / 20;
    expect(graph.triangulation()).toBeDefined();
    expect(mean, `mean ${mean.toFixed(2)} ms per move`).toBeLessThan(16);
});
