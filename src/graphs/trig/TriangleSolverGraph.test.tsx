import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expectHandleHitZones} from '../base/handleHitZoneBehaviour';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {appStorage} from '../../storage/appStorage';
import {GraphPalette} from '../styles/GraphPalette';
import {
    BAR_ROW_AB, BAR_ROW_C, BAR_X, HANDLE_TOUCH_RADIUS, HIT_SLACK, measureDrawn, RAY_OVERSHOOT, TriangleSolverGraph, VERTEX_BIG_STEP, VERTEX_STEP,
    VERTEX_X_MAX, VERTEX_X_MIN, VERTEX_Y_MAX, VERTEX_Y_MIN,
} from './TriangleSolverGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedTriangleSolverGraph extends TriangleSolverGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    /** The board object count just before the graph first built its scene (axes and the like). */
    preMountCount = -1;
    override initialize(): void { this.preMountCount = countObjects(this.board); super.initialize(); }
    rebuildNow() { super.initialize(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedTriangleSolverGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type Observed = ObservedTriangleSolverGraph;
type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
type Shown = {elType: string; evalVisProp(name: string): unknown; visProp: Record<string, unknown>};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = () => document.querySelector('[data-triangle-status]')!.textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
/** Board objects without the point and tick labels, which the board creates and drops itself when the view changes. */
const countObjects = (board: JXG.Board) => (board.objectsList as unknown as Shown[]).filter(o => o.elType !== 'label').length;
const dragListeners = (point: JXG.Point) => (point as EventedPoint).eventHandlers.drag?.length ?? 0;
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const visible = (object: Shown) => Boolean(object.evalVisProp('visible'));
const shownCircles = (graph: Observed) => objects(graph).filter(o => o.elType === 'circle' && visible(o)) as unknown as JXG.Circle[];
const shownSegments = (graph: Observed, color: string) =>
    objects(graph).filter(o => o.elType === 'segment' && visible(o) && o.visProp.strokecolor === color) as unknown as JXG.Line[];
const texts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text' && visible(o)).map(o => (o as unknown as {plaintext: string}).plaintext);

/** The vertices of one drawn solver triangle, read back from the board segments of its colour (A-B, B-C, C-A). */
function boardTriangle(graph: Observed, color: string) {
    const [ab, bc, ca] = shownSegments(graph, color);
    const at = (p: JXG.Point) => ({x: p.X(), y: p.Y()});
    return {A: at(ab.point1 as unknown as JXG.Point), B: at(bc.point1 as unknown as JXG.Point), C: at(ca.point1 as unknown as JXG.Point)};
}

function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

const solve = (graph: Observed, patch: Parameters<Observed['setState']>[0]) => act(() => { graph.setState(patch); });

test('mounts the sides mode: the exact cosine-rule numbers, the correction term, a text status and the length bars', () => {
    const {graph} = mountGraph();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjectCount()).toBeGreaterThan(20);
    // A(0,0), B(7,0), C(2,4): a^2 = 41, b^2 = 20, c^2 = 49, CA.CB = 6
    expect(readout('side-a')).toMatch(/^√41 ≈ 6,40312$/);
    expect(readout('side-c')).toBe('7');
    expect(readout('dot')).toBe('6');
    expect(readout('correction')).toBe('12');
    expect(readout('identity')).toBe('49 = 41 + 20 − (12)');
    expect(status()).toBe('Trikotnik je ostrokoten, kot pri C je oster: c² = 49, a² + b² = 61, popravek 2·CA·CB = 12.');
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('Trikotnik je ostrokoten');
    expect(shownCircles(graph)).toHaveLength(0);
    // the correction 2·CA·CB is on the graph beside the bars, which stay in their rows
    expect(texts(graph)).toContain('popravek 2·CA·CB = 12');
    expect(texts(graph)).toEqual(expect.arrayContaining(['c²', 'a²', 'b²']));
    // the bars sit right of the triangle, c² on its row and a², b² on the row below it, read back from the board
    const barY = (color: string) => shownSegments(graph, color).filter(s => s.point1.X() >= BAR_X).map(s => [s.point1.Y(), s.point2.Y()]);
    expect(barY(GraphPalette.referenceCurve)).toEqual([[BAR_ROW_C, BAR_ROW_C]]);
    expect(barY(GraphPalette.primaryCurve)).toEqual([[BAR_ROW_AB, BAR_ROW_AB]]);
    expect(barY(GraphPalette.comparisonCurve)).toEqual([[BAR_ROW_AB, BAR_ROW_AB]]);
    expect(BAR_ROW_C).toBeGreaterThan(BAR_ROW_AB);
});

test('the three modes show their own objects: bars, circumcircle with the diameter, and the solved triangles', () => {
    const {graph} = mountGraph();
    const segments = (color: string) => shownSegments(graph, color).length;
    // sides: triangle sides (3) and the three bar segments of the primary / comparison colours
    expect(segments(GraphPalette.referenceCurve)).toBe(1);
    expect(shownCircles(graph)).toHaveLength(0);

    solve(graph, {mode: 'circle'});
    expect(shownCircles(graph)).toHaveLength(1);
    expect(segments(GraphPalette.referenceCurve)).toBe(0);
    expect(segments(GraphPalette.constructionAccent)).toBe(1);
    expect(texts(graph).some(text => text.startsWith('popravek'))).toBe(false);
    expect(readout('two-r')).toMatch(/^≈ 7,\d+$/);
    expect(readout('antipode')).toMatch(/^\(/);
    expect(status()).toMatch(/^Trikotnik je ostrokoten: premer očrtane krožnice 2R ≈ 7,\d+, R² = /);

    solve(graph, {mode: 'solve'});
    expect(shownCircles(graph)).toHaveLength(0);
    expect(shownSegments(graph, GraphPalette.primaryCurve)).toHaveLength(3);
    expect(readout('solved-sides-1')).toBe('a = 5; b = 6; c = 7');
    expect(status()).toBe('Ena rešitev.');
    expect(visible(objects(graph).filter(o => Object.is(o, graph.handles().A))[0])).toBe(false);
});

test('the circumcircle passes through the three vertices and its exact radius feeds the readout (circle mode)', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'circle', A: {x: 0, y: 0}, B: {x: 6, y: 0}, C: {x: 0, y: 8}});
    const [circle] = shownCircles(graph);
    const centre = circle.center as unknown as JXG.Point;
    expect([centre.X(), centre.Y(), circle.Radius()]).toEqual([3, 4, 5]);
    // right angle at A: BC is the diameter, so there is no auxiliary triangle
    expect(status()).toBe('Pri A je pravi kot, zato je BC premer očrtane krožnice (2R = 10) in pomožnega trikotnika ni.');
    expect(readout('apex-angle')).toBe('ni (A′ = C)');
    expect(readout('thales')).toBe('0');
    expect(shownSegments(graph, GraphPalette.comparisonCurve)).toHaveLength(0);
});

test('collinear vertices give a flat-triangle status and no circle, bars or NaN', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'circle', A: {x: 0, y: 0}, B: {x: 4, y: 0}, C: {x: 2, y: 0}});
    expect(shownCircles(graph)).toHaveLength(0);
    expect(status()).toBe('Točke A, B in C ležijo na premici (sploščen trikotnik), zato očrtane krožnice ni.');
    expect(readout('side-a')).toBeUndefined();
    solve(graph, {mode: 'sides'});
    expect(texts(graph).some(text => text.startsWith('popravek'))).toBe(false);
    expect(shownSegments(graph, GraphPalette.referenceCurve)).toHaveLength(0);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('SSA a = 5, b = 8, A = 30 degrees draws two triangles in two colours, measured on the drawn vertices', () => {
    const {graph} = mountGraph();
    act(() => { fireEvent.change(screen.getByLabelText('Način'), {target: {value: 'solve'}}); });
    act(() => { fireEvent.change(screen.getByLabelText('Podani podatki'), {target: {value: 'ssa'}}); });
    expect(graph.state.data).toEqual({type: 'ssa', a: 5, b: 8, angleA: 30});
    expect(shownSegments(graph, GraphPalette.primaryCurve)).toHaveLength(3);
    expect(shownSegments(graph, GraphPalette.comparisonCurve)).toHaveLength(3);
    const first = boardTriangle(graph, GraphPalette.primaryCurve);
    const second = boardTriangle(graph, GraphPalette.comparisonCurve);
    const m1 = measureDrawn(first);
    const m2 = measureDrawn(second);
    // the two triangles share a, b and the angle at A and differ in c = 8 cos 30 +- 3
    expect([m1.a, m1.b, m2.a, m2.b].map(v => Math.round(v * 1e6) / 1e6)).toEqual([5, 8, 5, 8]);
    expect(m1.angleA * 180 / Math.PI).toBeCloseTo(30, 9);
    expect(m2.angleA * 180 / Math.PI).toBeCloseTo(30, 9);
    expect(m1.c).toBeCloseTo(8 * Math.cos(Math.PI / 6) + 3, 9);
    expect(m2.c).toBeCloseTo(8 * Math.cos(Math.PI / 6) - 3, 9);
    expect(m1.angleB + m2.angleB).toBeCloseTo(Math.PI, 9);
    // the readout rows come from the same drawn vertices
    // the irrational side is rounded, so it is introduced by the approximation sign; the whole sides keep the equals sign
    expect(readout('solved-sides-1')).toBe(`a = 5; b = 8; c ≈ ${m1.c.toFixed(5).replace('.', ',').replace(/0+$/, '')}`);
    expect(readout('solved-sides-2')).toBe(`a = 5; b = 8; c ≈ ${m2.c.toFixed(5).replace('.', ',').replace(/0+$/, '')}`);
    expect(readout('solved-angles-1')).toMatch(/^A = 30°; B ≈ \d+,\d+°; C ≈ \d+,\d+°$/);
    expect(readout('solved-angles-2')).toMatch(/^A = 30°; B ≈ \d+,\d+°; C ≈ \d+,\d+°$/);
    expect(readout('solved-area-1')).toMatch(/^1\d,\d+$/);
    expect(readout('height')).toBe('≈ 4');
    expect(status()).toBe('Dve rešitvi (dvoumni primer): dva trikotnika, B₁ (polna črta) s c ≈ 9,9282 in B₂ (črtkana) s c ≈ 3,9282.');
    // construction: height, ray and the circle of radius a around C
    expect(shownCircles(graph)).toHaveLength(1);
    expect(shownCircles(graph)[0].Radius()).toBe(5);
    expect(texts(graph)).toEqual(expect.arrayContaining(['h', 'B₁', 'B₂']));
});

test('SSA with a = 3,5 has no triangle and a = 4 is the tangent case with one right triangle', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}});
    act(() => { enterNumber(field('Stranica a'), '3,5'); });
    expect(graph.state.data).toEqual({type: 'ssa', a: 3.5, b: 8, angleA: 30});
    expect(status()).toBe('Takega trikotnika ni: stranica a je krajša od višine h ≈ 4.');
    expect(shownSegments(graph, GraphPalette.primaryCurve)).toHaveLength(1); // only the ray's chord from A to C remains
    expect(shownSegments(graph, GraphPalette.comparisonCurve)).toHaveLength(0);
    expect(readout('solved-sides-1')).toBeUndefined();

    act(() => { enterNumber(field('Stranica a'), '4'); });
    expect(status()).toBe('Ena rešitev: stranica a je enaka višini h ≈ 4, zato je trikotnik pravokoten (pravi kot pri B).');
    expect(shownSegments(graph, GraphPalette.primaryCurve)).toHaveLength(3);
    expect(shownSegments(graph, GraphPalette.comparisonCurve)).toHaveLength(0);
    const m = measureDrawn(boardTriangle(graph, GraphPalette.primaryCurve));
    expect(m.angleB * 180 / Math.PI).toBeCloseTo(90, 9);
    expect(readout('solved-angles-1')).toBe('A = 30°; B = 90°; C = 60°');
});

test('the other data types solve and draw: SSS, SAS and ASA', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve', data: {type: 'sas', b: 5, c: 7, angleA: 60}});
    expect(readout('solved-sides-1')).toMatch(/^a ≈ 6,245; b = 5; c = 7$/);
    solve(graph, {data: {type: 'asa', angleA: 40, angleB: 60, c: 8}});
    expect(readout('solved-angles-1')).toBe('A = 40°; B = 60°; C = 80°');
    solve(graph, {data: {type: 'sss', a: 1, b: 1, c: 5}});
    expect(status()).toBe('Takega trikotnika ni: vsota dveh stranic mora biti večja od tretje.');
    expect(shownSegments(graph, GraphPalette.primaryCurve)).toHaveLength(0);
});

test('keyboard steps move a vertex coordinate by one grid unit, Shift or a Page key by five', () => {
    const {graph} = mountGraph();
    expect([VERTEX_STEP, VERTEX_BIG_STEP]).toEqual([1, 5]);
    act(() => { fireEvent.keyDown(field('Oglišče A, koordinata x'), {key: 'ArrowUp'}); });
    expect(graph.state.A).toEqual({x: 1, y: 0});
    act(() => { fireEvent.keyDown(field('Oglišče A, koordinata x'), {key: 'ArrowDown', shiftKey: true}); });
    expect(graph.state.A).toEqual({x: VERTEX_X_MIN, y: 0}); // 1 - 5 = -4 is clamped
    act(() => { fireEvent.keyDown(field('Oglišče C, koordinata y'), {key: 'PageUp'}); });
    expect(graph.state.C).toEqual({x: 2, y: 9});
    expect(graph.handles().C!.Y()).toBe(9);
    expect(readout('side-b')).toMatch(/^√/);
});

test('dragging a vertex snaps it to the nearest grid point and updates the state, handle and readout', () => {
    const {graph} = mountGraph();
    const handle = graph.handles().C!;
    dragHandleTo(handle, 3.4, 5.6);
    expect(graph.state.C).toEqual({x: 3, y: 6});
    expect([handle.X(), handle.Y()]).toEqual([3, 6]);
    // B(7,0), C(3,6): a^2 = 16 + 36 = 52, b^2 = 45
    expect(readout('identity')).toBe('49 = 52 + 45 − (48)');
    dragHandleTo(graph.handles().A!, -1.6, 0.4);
    expect(graph.state.A).toEqual({x: -2, y: 0});
    expect(graph.ownedObjectCount()).toBeGreaterThan(20);
});

test('mount, state change and unmount: objects and listeners are owned and released, and a rebuild does not duplicate them', () => {
    const {graph, view} = mountGraph();
    expectHandleHitZones(graph.liveBoard(), (['A', 'B', 'C'] as const).map(vertex => graph.handles()[vertex]!), HANDLE_TOUCH_RADIUS + HIT_SLACK);
    const preMount = graph.preMountCount;
    expect(preMount).toBeGreaterThan(0);
    const board = graph.liveBoard();
    const owned = graph.ownedObjectCount();
    const boardCount = countObjects(board);
    expect(graph.ownedListenerCount()).toBe(3);
    for (const vertex of ['A', 'B', 'C'] as const) expect(dragListeners(graph.handles()[vertex]!)).toBe(1);
    act(() => { graph.setState({mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}}); });
    act(() => { graph.setState({mode: 'circle', C: {x: 1, y: 5}}); });
    expect(graph.ownedObjectCount()).toBe(owned);
    expect(countObjects(board)).toBe(boardCount);
    // a real rebuild: `initialize` runs `buildScene`, which first disposes the scene it replaces
    const oldHandles = Object.values(graph.handles()) as JXG.Point[];
    act(() => { graph.rebuildNow(); });
    expect(graph.ownedObjectCount()).toBe(owned);
    expect(graph.ownedListenerCount()).toBe(3);
    expect(countObjects(board)).toBe(boardCount);
    for (const handle of oldHandles) expect(board.objectsList.includes(handle)).toBe(false);
    for (const vertex of ['A', 'B', 'C'] as const) expect(dragListeners(graph.handles()[vertex]!)).toBe(1);

    const handles = Object.values(graph.handles()) as JXG.Point[];
    const ownedByGraph = new Set(board.objectsList.slice(board.objectsList.length - owned));
    graph.disposeNow();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
    for (const handle of handles) expect(dragListeners(handle)).toBe(0);
    expect(board.objectsList.some(object => ownedByGraph.has(object))).toBe(false);
    // the point labels the board created for the handles and A' go with their points
    expect(countObjects(board)).toBe(preMount);
    expect(objects(graph).filter(o => ['segment', 'circle'].includes(o.elType))).toHaveLength(0);

    view.unmount();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
});

test('unmount releases the objects and listeners of a live scene', () => {
    const {graph, view} = mountGraph();
    const handles = Object.values(graph.handles()) as JXG.Point[];
    expect(graph.ownedObjectCount()).toBeGreaterThan(0);
    view.unmount();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
    for (const handle of handles) expect(dragListeners(handle)).toBe(0);
});

test('StrictMode mount registers its listeners once and unmount releases the owned objects', () => {
    const strict = mountGraph(true);
    expect(strict.graph.ownedListenerCount()).toBe(3);
    strict.view.unmount();
    expect(strict.graph.ownedObjectCount()).toBe(0);
});

test('the status, labels and readouts follow a language switch', () => {
    const {graph} = mountGraph();
    act(() => { setLanguage('en'); });
    expect(status()).toBe('The triangle is acute; the angle at C is acute: c² = 49, a² + b² = 61, correction 2·CA·CB = 12.');
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('The triangle is acute');
    expect(screen.getByLabelText('Vertex A, coordinate x')).toBeInTheDocument();
    expect(readout('side-a')).toBe('√41 ≈ 6.40312');
    expect(texts(graph)).toContain('correction 2·CA·CB = 12');
    act(() => { graph.setState({mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}}); });
    expect(status()).toBe('Two solutions (the ambiguous case): two triangles, B₁ (solid) with c ≈ 9.9282 and B₂ (dashed) with c ≈ 3.9282.');
});

/** The board's bounding box [left, top, right, bottom] and whether a user-space point lies inside it. */
const boxOf = (graph: Observed) => graph.liveBoard().getBoundingBox() as [number, number, number, number];
const inBox = (box: [number, number, number, number], x: number, y: number) => x >= box[0] && x <= box[2] && y >= box[3] && y <= box[1];

test('the solve view frames the SSA spec example: both ends of the ray, the vertices and the circle about C stay in view', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve', data: {type: 'ssa', a: 9, b: 8, angleA: 30}});
    const m = measureDrawn(boardTriangle(graph, GraphPalette.primaryCurve));
    expect(m.c).toBeCloseTo(8 * Math.cos(Math.PI / 6) + Math.sqrt(81 - 16), 9); // about 14,99, past the old fixed ray end of 14
    const [ray] = shownSegments(graph, GraphPalette.label);
    expect(ray.point2.X()).toBeGreaterThanOrEqual(m.c + RAY_OVERSHOOT);
    const box = boxOf(graph);
    const t = boardTriangle(graph, GraphPalette.primaryCurve);
    for (const q of [t.A, t.B, t.C, {x: ray.point2.X(), y: 0}]) expect(inBox(box, q.x, q.y)).toBe(true);
    const [circle] = shownCircles(graph);
    const centre = circle.center as unknown as JXG.Point;
    const radius = circle.Radius();
    for (const [x, y] of [[centre.X() - radius, centre.Y()], [centre.X() + radius, centre.Y()], [centre.X(), centre.Y() - radius], [centre.X(), centre.Y() + radius]]) {
        expect(inBox(box, x, y)).toBe(true);
    }
    // the axis scale stays equal
    const [w, h] = [box[2] - box[0], box[1] - box[3]];
    expect(w / h).toBeCloseTo(600 / 400, 6);
});

test('the solve view frames both ambiguous triangles and a very flat ASA triangle', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve', data: {type: 'ssa', a: 11, b: 12, angleA: 30}});
    const first = boardTriangle(graph, GraphPalette.primaryCurve);
    const second = boardTriangle(graph, GraphPalette.comparisonCurve);
    expect(measureDrawn(first).c).toBeGreaterThan(14);
    let box = boxOf(graph);
    for (const q of [first.A, first.B, first.C, second.A, second.B, second.C]) expect(inBox(box, q.x, q.y)).toBe(true);
    solve(graph, {data: {type: 'asa', angleA: 1, angleB: 178, c: 12}});
    const flat = boardTriangle(graph, GraphPalette.primaryCurve);
    expect(measureDrawn(flat).b).toBeGreaterThan(20);
    box = boxOf(graph);
    for (const q of [flat.A, flat.B, flat.C]) expect(inBox(box, q.x, q.y)).toBe(true);
    // leaving the solve mode returns to the fixed view
    solve(graph, {mode: 'sides'});
    const fixed = boxOf(graph);
    expect(inBox(fixed, -3, 12)).toBe(true);
    expect(inBox(fixed, 17, -8)).toBe(true);
});

test('vertices dragged or typed stay left of the bars and inside the fixed view', () => {
    const {graph} = mountGraph();
    dragHandleTo(graph.handles().C!, 12, 3);
    expect(graph.state.C).toEqual({x: VERTEX_X_MAX, y: 3});
    expect(graph.handles().C!.X()).toBe(VERTEX_X_MAX);
    expect(VERTEX_X_MAX).toBeLessThan(BAR_X);
    // typed values outside the range are refused by the field (with a range hint), so the state keeps its last valid vertex
    solve(graph, {C: {x: 2, y: 4}});
    act(() => { enterNumber(field('Oglišče C, koordinata x'), '12'); });
    expect(graph.state.C.x).toBe(2);
    act(() => { enterNumber(field('Oglišče C, koordinata x'), '-9'); });
    expect(graph.state.C.x).toBe(2);
    act(() => { enterNumber(field('Oglišče C, koordinata x'), '8'); });
    expect(graph.state.C.x).toBe(VERTEX_X_MAX);
    act(() => { fireEvent.keyDown(field('Oglišče C, koordinata x'), {key: 'ArrowUp'}); });
    expect(graph.state.C.x).toBe(VERTEX_X_MAX);
    act(() => { fireEvent.keyDown(field('Oglišče B, koordinata y'), {key: 'PageUp'}); });
    act(() => { fireEvent.keyDown(field('Oglišče B, koordinata y'), {key: 'PageUp'}); });
    act(() => { fireEvent.keyDown(field('Oglišče B, koordinata y'), {key: 'PageUp'}); });
    expect(graph.state.B.y).toBe(VERTEX_Y_MAX);
    dragHandleTo(graph.handles().B!, 3, -30);
    expect(graph.state.B).toEqual({x: 3, y: VERTEX_Y_MIN});
    expect(field('Oglišče C, koordinata x').getAttribute('aria-valuemax')).toBe(`${VERTEX_X_MAX}`);
});

test('every vertex field points to the vertex help and the side fields show their range', () => {
    const {graph} = mountGraph();
    const help = document.querySelector('[id^="triangle-solver-vertex-help"]')!;
    expect(help.textContent).toContain('Puščici gor in dol');
    // the range of both coordinates is stated, from the same constants the fields and the drag clamp use
    expect(VERTEX_X_MIN).toBe(-2);
    expect([VERTEX_X_MAX, VERTEX_Y_MIN, VERTEX_Y_MAX]).toEqual([8, -7, 11]);
    expect(help.textContent).toMatch(/koordinata x od [−-]2 do 8, koordinata y od [−-]7 do 11/);
    for (const vertex of ['A', 'B', 'C']) {
        for (const axis of ['x', 'y']) {
            expect(field(`Oglišče ${vertex}, koordinata ${axis}`).getAttribute('aria-describedby')).toContain(help.id);
        }
    }
    solve(graph, {mode: 'solve'});
    expect(document.body.textContent).toContain('Stranica od 0,25 do 12.');
    act(() => { setLanguage('en'); });
    expect(document.body.textContent).toContain('Side from 0.25 to 12.');
});

test('the tangent status names the right angle at B', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve', data: {type: 'ssa', a: 4, b: 8, angleA: 30}});
    expect(status()).toContain('pravi kot pri B');
    act(() => { setLanguage('en'); });
    expect(status()).toContain('right angle at B');
});

test('two graphs on one page give their vertex help different ids', () => {
    mountGraph();
    mountGraph();
    const ids = Array.from(document.querySelectorAll('[id^="triangle-solver-vertex-help"]')).map(node => node.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const input of screen.getAllByLabelText('Oglišče A, koordinata x')) {
        expect(ids).toContain(input.getAttribute('aria-describedby')!.split(' ').find(id => id.startsWith('triangle-solver-vertex-help')));
    }
});

test('the data type select says that changing it replaces the entered values, and it does', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve'});
    const select = screen.getByLabelText('Podani podatki');
    const helpId = select.getAttribute('aria-describedby')!;
    expect(document.getElementById(helpId)!.textContent).toBe('Če spremenite vrsto podatkov, se vnesene vrednosti nadomestijo s primerom za novo vrsto.');
    act(() => { enterNumber(field('Stranica a'), '9'); });
    expect(graph.state.data).toMatchObject({type: 'sss', a: 9});
    act(() => { fireEvent.change(select, {target: {value: 'ssa'}}); });
    expect(graph.state.data).toEqual({type: 'ssa', a: 5, b: 8, angleA: 30});
    act(() => { setLanguage('en'); });
    expect(document.getElementById(screen.getByLabelText('Given data').getAttribute('aria-describedby')!)!.textContent)
        .toBe('Changing the given data type replaces the entered values with the example for the new type.');
});

test('the approximation sign and the list separator come from the catalogue in both languages', () => {
    const {graph} = mountGraph();
    solve(graph, {mode: 'solve'});
    expect(readout('solved-sides-1')).toBe('a = 5; b = 6; c = 7');
    solve(graph, {mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}});
    expect(readout('height')).toBe('≈ 4');
    act(() => { setLanguage('en'); });
    expect(readout('solved-sides-1')).toBe('a = 5, b = 8, c ≈ 9.9282');
    expect(readout('height')).toBe('≈ 4');
    solve(graph, {mode: 'sides'});
    expect(readout('ratio-a')).toMatch(/^≈ /);
    expect(readout('side-a')).toBe('√41 ≈ 6.40312');
});

describe('the legend states the style of the circumcircle, the point A′, the SSA arc and the height', () => {
    const legendOf = (graph: Observed) => graph.legendItems().map(item => [item.id, item.kind, item.label]);
    const circles = (graph: Observed) => shownCircles(graph);
    const points = (graph: Observed) => objects(graph).filter(o => o.elType === 'point' && visible(o)) as unknown as JXG.Point[];

    test('nothing is listed in the sides mode', () => {
        const {graph} = mountGraph();
        expect(legendOf(graph)).toEqual([]);
        expect(document.querySelector('[data-legend]')).toBeNull();
    });

    test('circle mode: a solid circle in the stated colour and a diamond A′', () => {
        const {graph} = mountGraph();
        solve(graph, {mode: 'circle'});
        expect(legendOf(graph)).toEqual([
            ['circumcircle', 'line', 'Polna črta: očrtana krožnica'],
            ['antipode', 'diamond', 'Romb: točka A′ na premeru iz B'],
        ]);
        expect(document.querySelectorAll('[data-legend]')).toHaveLength(2);
        const [circumcircle, antipode] = graph.legendItems();
        const [circle] = circles(graph);
        expect(circles(graph)).toHaveLength(1);
        expect(Number(vp(circle, 'dash'))).toBe(0);
        expect(String(vp(circle, 'strokecolor'))).toBe(circumcircle.color);
        const diamonds = points(graph).filter(p => String(vp(p, 'face')) === antipode.kind);
        expect(diamonds).toHaveLength(1);
        expect(String(vp(diamonds[0], 'fillcolor'))).toBe(antipode.color);
    });

    test('SSA: a solid arc about C in the stated colour and a dashed height', () => {
        const {graph} = mountGraph();
        solve(graph, {mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}});
        expect(legendOf(graph)).toEqual([
            ['ssa-arc', 'line', 'Polna črta: krožnica s središčem C in polmerom a'],
            ['height', 'dashed-line', 'Črtkana črta: višina h'],
        ]);
        const [arc, height] = graph.legendItems();
        const [circle] = circles(graph);
        expect(circles(graph)).toHaveLength(1);
        expect(Number(vp(circle, 'dash'))).toBe(0);
        expect(String(vp(circle, 'strokecolor'))).toBe(arc.color);
        expect(circle.Radius()).toBe(5);
        expect(shownSegments(graph, height.color).some(o => Number(vp(o, 'dash')) > 0)).toBe(true);
        solve(graph, {data: {type: 'sss', a: 5, b: 6, c: 7}});
        expect(legendOf(graph)).toEqual([]);
    });
});

/** Reads a visual attribute of a board element whose JSXGraph type does not declare `evalVisProp`. */
function vp(element: unknown, name: string): unknown {
    return (element as {evalVisProp(attribute: string): unknown}).evalVisProp(name);
}

test('restoring a checkpoint keeps the stored view instead of refitting the solved triangle', () => {
    const {graph} = mountGraph();
    const capabilities = graph.getLessonCapabilities();
    const base = graph.exportPresetData();
    act(() => { graph.importPresetData({...base, mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}}); });
    act(() => { graph.liveBoard().setBoundingBox([-9, 7, 11, -5], true); });
    const checkpoint = capabilities.captureState();
    const stored = graph.liveBoard().getBoundingBox();
    act(() => { graph.importPresetData({...base, mode: 'circle', C: {x: 3, y: 5}}); });
    act(() => { capabilities.restoreState(checkpoint); });
    expect(graph.liveBoard().getBoundingBox()).toEqual(stored);
});

describe('a replaced scene frames the solve data only when it brings no view of its own', () => {
    const SOLVE = {type: 'ssa', a: 5, b: 8, angleA: 30} as const;
    const mountSelected = (id: string) => {
        const graph = new ObservedTriangleSolverGraph();
        void graph.selectPreset(id);
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        return {graph, view};
    };
    beforeEach(() => appStorage.clear());

    test('Reset from a solve view returns to the default sides mode and its fixed view', async () => {
        const {graph} = mountGraph();
        const fixed = boxOf(graph);
        act(() => { graph.importPresetData({...graph.exportPresetData(), mode: 'solve', data: SOLVE}); });
        act(() => { graph.liveBoard().setBoundingBox([-9, 7, 11, -5], true); });
        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = graph.reset(); });
        await act(async () => { await pending; });
        expect(graph.state.mode).toBe('sides');
        expect(boxOf(graph)).toEqual(fixed);
    });

    test('the first mount with a stored solve Preset selected shows the Preset\'s stored view, not a refit', () => {
        const first = mountGraph();
        act(() => { first.graph.importPresetData({...first.graph.exportPresetData(), mode: 'solve', data: SOLVE}); });
        act(() => { first.graph.liveBoard().setBoundingBox([-9, 7, 11, -5], true); });
        const stored = boxOf(first.graph);
        act(() => first.graph.saveCurrentPreset('mine'));
        first.view.unmount();
        const {graph} = mountSelected('mine');
        expect(graph.state.mode).toBe('solve');
        expect(boxOf(graph)).toEqual(stored);
    });

    test('selecting a stored solve Preset on a live graph shows the Preset\'s stored view, not a refit', async () => {
        const {graph} = mountGraph();
        act(() => { graph.importPresetData({...graph.exportPresetData(), mode: 'solve', data: SOLVE}); });
        act(() => { graph.liveBoard().setBoundingBox([-9, 7, 11, -5], true); });
        const stored = boxOf(graph);
        act(() => graph.saveCurrentPreset('mine'));
        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = graph.selectPreset(''); });
        await act(async () => { await pending; });
        expect(graph.state.mode).toBe('sides');
        act(() => { pending = graph.selectPreset('mine'); });
        await act(async () => { await pending; });
        expect(graph.state.mode).toBe('solve');
        expect(boxOf(graph)).toEqual(stored);
    });

    test('a solve Preset without a view is framed to the solve data on selection, not left at the previous view', async () => {
        const reference = mountGraph();
        // a = 9: the far end of the ray lies past the fixed view, so framing differs from the initial view.
        solve(reference.graph, {mode: 'solve', data: {type: 'ssa', a: 9, b: 8, angleA: 30}});
        const framed = boxOf(reference.graph);
        expect(framed).not.toEqual(boxOf(mountGraph().graph));
        const {boardState: _view, ...withoutView} = reference.graph.exportPreset();
        expect(_view).toBeDefined();
        reference.view.unmount();
        const {graph} = mountGraph();
        graph.presetService?.savePreset({...withoutView, id: 'bare'});
        act(() => { graph.liveBoard().setBoundingBox([-9, 7, 11, -5], true); });
        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = graph.selectPreset('bare'); });
        await act(async () => { await pending; });
        expect(graph.selectedPresetId).toBe('bare');
        expect(graph.state.mode).toBe('solve');
        expect(boxOf(graph)).toEqual(framed);
    });
});
