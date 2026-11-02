import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TRIANGULATION_EXAMPLE_POINTS, TRIANGULATION_T0, TriangulationGraph} from './TriangulationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {angleVector} from '../../compgeo/delaunay';
import {createTriangulation, edges, flip} from '../../compgeo/triangulation';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
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
const part = (name: string) => document.querySelector(`[data-triangulation="${name}"]`)?.textContent;
const button = () => document.querySelector('button[data-action="flip-edge"]') as HTMLButtonElement;
const list = () => document.querySelector('select[data-triangulation="edge-list"]') as HTMLSelectElement;
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
    expect(Math.max(...selectedWeights)).toBe(5);
    const hull = refusedEdge('hull-edge');
    choose(hull.a, hull.b);
    expect(quads(graph)).toHaveLength(0);
    expect(edgeCurves(graph)).toHaveLength(13);
});

test('clicking an edge on the board selects it and shades its quadrilateral', () => {
    const graph = new Observed();
    mount(graph);
    const curves = edgeCurves(graph).filter(o => o.name === 'triangulation-edge');
    expect(curves).toHaveLength(8);
    act(() => { curves[0].triggerEventHandlers(['down'], []); });
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

test('a flip of a non-convex quadrilateral and of a hull edge each show their reason and change nothing', () => {
    const graph = new Observed();
    mount(graph);
    const concave = refusedEdge('not-convex');
    choose(concave.a, concave.b);
    flipIt();
    expect(part('event')).toContain('ne tvorita izbočenega štirikotnika');
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    const hull = refusedEdge('hull-edge');
    choose(hull.a, hull.b);
    flipIt();
    expect(part('event')).toContain('leži na ovojnici');
    expect(part('live')).toContain('leži na ovojnici');
    expect(graph.triangles).toEqual(TRIANGULATION_T0);
    expect(readout('angle-before')).toContain('zamenjave še ni bilo');
});

test('a flip with no edge selected says so and changes nothing', () => {
    const graph = new Observed();
    mount(graph);
    flipIt();
    expect(part('event')).toContain('Najprej izberite rob');
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
    expect(readout('collinear')).toContain('Med njimi 1');
    expect(readout('triangles')).toBe('Trikotnikov: 8 = 2n − 2 − k = 2 · 8 − 2 − 6');
    expect(graph.triangles).toHaveLength(8);
});

test('the nine points of the hull lesson give k = 6 with one collinear point and 10 triangles', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(pts([[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]])); });
    expect(readout('n')).toBe('Točk: n = 9');
    expect(readout('k')).toBe('Točk na robu ovojnice: k = 6');
    expect(readout('collinear')).toContain('Med njimi 1');
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
    expect(list().disabled).toBe(true);
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
