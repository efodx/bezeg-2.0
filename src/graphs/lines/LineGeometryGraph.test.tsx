import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {GraphPalette} from '../styles/GraphPalette';
import {GRID_LIMIT} from './lineGeometryModel';
import {expectHandleHitZones} from '../base/handleHitZoneBehaviour';
import {ARC_RADIUS, HANDLE_TOUCH_RADIUS, HIT_SLACK, LineGeometryGraph, NORMAL_ARROW_LENGTH, POINT_BIG_STEP, POINT_STEP, VIEW_HALF} from './LineGeometryGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the board and the protected disposal the scene replacement calls. */
class ObservedLineGeometryGraph extends LineGeometryGraph {
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    /** The board object count just before the graph first built its scene (axes and the like). */
    preMountCount = -1;
    override initialize(): void { this.preMountCount = countObjects(this.board); super.initialize(); }
    rebuildNow() { super.initialize(); }
}

function mountGraph(strict = false) {
    const graph = new ObservedLineGeometryGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type Observed = ObservedLineGeometryGraph;
type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
type Shown = {elType: string; evalVisProp(name: string): unknown; visProp: Record<string, unknown>; name?: string};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = () => document.querySelector('[data-line-status]')!.textContent;
/** The typed coordinate of a point row: its field is named "<point>, x" or "<point>, y". */
const find = (label: string) => screen.queryByRole('spinbutton', {name: label}) as HTMLInputElement | null;
const field = (label: string) => screen.getByRole('spinbutton', {name: label}) as HTMLInputElement;
/** Board objects without the point and tick labels, which the board creates and drops itself when the view changes. */
const countObjects = (board: JXG.Board) => (board.objectsList as unknown as Shown[]).filter(o => o.elType !== 'label').length;
const dragListeners = (point: JXG.Point) => (point as EventedPoint).eventHandlers.drag?.length ?? 0;
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const visible = (object: Shown) => Boolean(object.evalVisProp('visible'));
const shownLines = (graph: Observed) => objects(graph).filter(o => o.elType === 'line' && visible(o)) as unknown as JXG.Line[];
const shownCircles = (graph: Observed) => objects(graph).filter(o => o.elType === 'circle' && visible(o)) as unknown as JXG.Circle[];
const shownCurves = (graph: Observed) => objects(graph).filter(o => o.elType === 'curve' && visible(o)) as unknown as JXG.Curve[];
const shownSegments = (graph: Observed, color: string) =>
    objects(graph).filter(o => o.elType === 'segment' && visible(o) && o.visProp.strokecolor === color) as unknown as JXG.Line[];
const texts = (graph: Observed) => objects(graph).filter(o => o.elType === 'text' && visible(o)).map(o => (o as unknown as {plaintext: string}).plaintext);
/** The shown points that carry a name (the handles and the marked construction points), by name. */
const namedPoints = (graph: Observed) =>
    (objects(graph).filter(o => o.elType === 'point' && visible(o) && o.name) as unknown as JXG.Point[]).map(p => ({name: p.name, x: p.X(), y: p.Y()}));
const pointNamed = (graph: Observed, name: string) => namedPoints(graph).find(p => p.name === name);

function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}

const set = (graph: Observed, patch: Parameters<Observed['setState']>[0]) => act(() => { graph.setState(patch); });
const pt = (x: number, y: number) => ({x, y});
const NO_NAN = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

// Spec fixtures: first line P(-2,1) Q(4,4) is x - 2y = -4; second line R(3,-2) S(2,0) is 2x + y = 4; they meet at (4/5, 12/5).
const CROSS = {x: 4 / 5, y: 12 / 5};

test('mounts the forms mode: every form of x - 2y = -4, the status, the line through P and Q and the labelled handles', () => {
    const {graph} = mountGraph();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjectCount()).toBeGreaterThan(20);
    expect(readout('two-point')).toBe('y − 1 = 3/6 · (x + 2)');
    expect(readout('implicit-raw')).toBe('3x − 6y = −12');
    expect(readout('implicit')).toBe('x − 2y = −4');
    expect(readout('explicit')).toBe('y = (1/2)x + 2');
    expect(readout('intercept')).toBe('x/(−4) + y/2 = 1');
    expect(readout('vertical')).toBe('ne');
    expect(status()).toBe('Premica x − 2y = −4 ima implicitno, eksplicitno in odsekovno obliko.');
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('implicitno, eksplicitno in odsekovno obliko');
    // one line, drawn through the grid points P(-2,1) and Q(4,4); the second line is not drawn in this mode
    const [line] = shownLines(graph);
    expect(shownLines(graph)).toHaveLength(1);
    expect([line.point1.X(), line.point1.Y(), line.point2.X(), line.point2.Y()]).toEqual([-2, 1, 4, 4]);
    expect(line.visProp.strokecolor).toBe(GraphPalette.primaryCurve);
    // the handles carry their names on the board, not only a colour
    expect(namedPoints(graph).map(p => p.name).sort()).toEqual(['P', 'Q']);
    expect(pointNamed(graph, 'P')).toEqual({name: 'P', x: -2, y: 1});
    expect(texts(graph)).toContain('$$\\ell$$');
    // a handle's drawn label is its name typeset; the element keeps the plain name
    const handleP = (objects(graph) as unknown as JXG.Point[]).find(o => o.elType === 'point' && o.name === 'P');
    expect((handleP?.label as unknown as {plaintext?: string} | undefined)?.plaintext).toBe('$$P$$');
    expect(shownCircles(graph)).toHaveLength(0);
    NO_NAN();
});

test('forms: vertical, origin and axis-parallel lines state which form does not exist', () => {
    const {graph} = mountGraph();
    set(graph, {P: pt(3, -2), Q: pt(3, 5)});
    expect(status()).toBe('Navpična premica x = 3: eksplicitne oblike ni, ker smerni koeficient ni določen.');
    expect(readout('explicit')).toBe('ni določena (navpična premica)');
    expect(readout('vertical')).toBe('da, x = 3');
    set(graph, {P: pt(0, 0), Q: pt(2, 1)});
    expect(status()).toBe('Premica x − 2y = 0 gre skozi izhodišče, zato odsekovne oblike ni.');
    expect(readout('intercept')).toBe('je ni (premica gre skozi izhodišče)');
    set(graph, {P: pt(-3, 2), Q: pt(5, 2)});
    expect(status()).toBe('Premica y = 2 je vzporedna z osjo, zato odsekovne oblike ni.');
    expect(readout('intercept')).toBe('je ni (premica je vzporedna z osjo)');
    NO_NAN();
});

test('normal mode: the arrow of fixed length 3 along the exact normal (1, -2), the second line and the perpendicular status', () => {
    const {graph} = mountGraph();
    set(graph, {mode: 'normal'});
    expect(shownLines(graph)).toHaveLength(2);
    expect(shownLines(graph).map(l => l.visProp.strokecolor)).toEqual([GraphPalette.primaryCurve, GraphPalette.comparisonCurve]);
    // arrow from the middle of PQ = (1, 2.5) along (1, -2)/sqrt(5), length 3
    const [arrow, arrow2] = shownSegments(graph, GraphPalette.constructionAccent);
    expect(shownSegments(graph, GraphPalette.constructionAccent)).toHaveLength(2);
    // n2 = (2, 1) from the middle of RS = (2.5, -1)
    expect(arrow2.point1.X()).toBeCloseTo(2.5, 12);
    expect(arrow2.point1.Y()).toBeCloseTo(-1, 12);
    expect(arrow2.point2.X()).toBeCloseTo(2.5 + 6 / Math.sqrt(5), 12);
    expect(arrow2.point2.Y()).toBeCloseTo(-1 + 3 / Math.sqrt(5), 12);
    expect(NORMAL_ARROW_LENGTH).toBe(3);
    expect(arrow.point1.X()).toBeCloseTo(1, 12);
    expect(arrow.point1.Y()).toBeCloseTo(2.5, 12);
    expect(arrow.point2.X()).toBeCloseTo(1 + 3 / Math.sqrt(5), 12);
    expect(arrow.point2.Y()).toBeCloseTo(2.5 - 6 / Math.sqrt(5), 12);
    expect(arrow.visProp.lastarrow).toBeTruthy();
    // exact numbers in the readouts: n1 = (1, -2), n2 = (2, 1), a1b2 - a2b1 = 5, a1a2 + b1b2 = 0
    expect(readout('normal-1')).toBe('(1; −2)');
    expect(readout('normal-2')).toBe('(2; 1)');
    expect(readout('cross')).toBe('5');
    expect(readout('dot')).toBe('0');
    expect(readout('slopes')).toBe('−1');
    expect(readout('relation')).toBe('pravokotni');
    expect(status()).toBe('Skalarni produkt normalnih vektorjev je 0, zato sta premici pravokotni.');
    expect(texts(graph)).toEqual(expect.arrayContaining(['$$\\ell$$', '$$m$$', '$$n_{1}$$', '$$n_{2}$$']));
    // the readout rows name what the board captions
    expect(document.querySelector('[data-readout="normal-1"] dt')?.textContent).toBe('Normalni vektor n₁, prva premica (ℓ)');
    expect(document.querySelector('[data-readout="normal-2"] dt')?.textContent).toBe('Normalni vektor n₂, druga premica (m)');
    expect(document.querySelector('[data-readout="implicit-1"] dt')?.textContent).toBe('Implicitna oblika, prva premica (ℓ)');
    expect(document.querySelector('[data-readout="implicit-2"] dt')?.textContent).toBe('Implicitna oblika, druga premica (m)');
    expect(namedPoints(graph).map(p => p.name).sort()).toEqual(['P', 'Q', 'R', 'S']);
    // R(0,0) S(2,1): parallel to PQ
    set(graph, {R: pt(0, 0), S: pt(2, 1)});
    expect(readout('relation')).toBe('vzporedni');
    expect(status()).toBe('Normalna vektorja sta vzporedna, zato sta premici vzporedni.');
    // R(0,0) S(1,3): neither
    set(graph, {R: pt(0, 0), S: pt(1, 3)});
    // n1 = (1, -2), n2 = (3, -1): a1b2 - a2b1 = -1 + 6 = 5, a1a2 + b1b2 = 3 + 2 = 5
    expect(readout('cross')).toBe('5');
    expect(readout('dot')).toBe('5');
    expect(status()).toBe('Izraz a₁b₂ − a₂b₁ je 5, skalarni produkt pa 5: premici nista ne vzporedni ne pravokotni.');
    NO_NAN();
});

test('angle mode: 45 degrees between x - 2y = -4 and y = 3x, the arc of radius 3 about (4/5, 12/5) and the labelled crossing', () => {
    const {graph} = mountGraph();
    set(graph, {mode: 'angle', R: pt(0, 0), S: pt(1, 3)});
    expect(readout('angle')).toBe('45°');
    expect(readout('direction-u')).toBe('(6; 3)');
    expect(readout('direction-v')).toBe('(1; 3)');
    expect(status()).toBe('Kot med premicama je 45°.');
    const [arc] = shownCurves(graph);
    expect(shownCurves(graph)).toHaveLength(1);
    expect(ARC_RADIUS).toBe(3);
    const at = (s: number) => ({x: arc.X(s, true), y: arc.Y(s, true)});
    for (const s of [0, 0.5, 1]) expect(Math.hypot(at(s).x - CROSS.x, at(s).y - CROSS.y)).toBeCloseTo(3, 9);
    // the arc spans the 45 degrees between the two directions
    const a0 = Math.atan2(at(0).y - CROSS.y, at(0).x - CROSS.x);
    const a1 = Math.atan2(at(1).y - CROSS.y, at(1).x - CROSS.x);
    expect(Math.abs(a1 - a0) * 180 / Math.PI).toBeCloseTo(45, 9);
    expect(texts(graph)).toEqual(expect.arrayContaining(['α = 45°', '$$u$$', '$$v$$']));
    expect(pointNamed(graph, 'X')!.x).toBeCloseTo(CROSS.x, 12);
    expect(pointNamed(graph, 'X')!.y).toBeCloseTo(CROSS.y, 12);
    // the direction vectors are drawn as arrows P to Q and R to S
    expect(shownSegments(graph, GraphPalette.primaryCurve)).toHaveLength(1);
    expect(shownSegments(graph, GraphPalette.comparisonCurve)).toHaveLength(1);
    // parallel lines: no crossing, no arc
    set(graph, {R: pt(0, 0), S: pt(2, 1)});
    expect(status()).toBe('Premici sta vzporedni, kot med njima je 0°.');
    expect(shownCurves(graph)).toHaveLength(0);
    expect(pointNamed(graph, 'X')).toBeUndefined();
    NO_NAN();
});

test('distance mode: the foot (4/5, 12/5), the segment from the foot to T, the right angle and d = 11/sqrt(5)', () => {
    const {graph} = mountGraph();
    set(graph, {mode: 'distance'});
    const foot = pointNamed(graph, 'F')!;
    expect([foot.x, foot.y]).toEqual([expect.closeTo(CROSS.x, 12), expect.closeTo(CROSS.y, 12)]);
    expect(namedPoints(graph).map(p => p.name).sort()).toEqual(['F', 'P', 'Q', 'T']);
    const [drop] = shownSegments(graph, GraphPalette.constructionAccent).filter(s => s.visProp.strokewidth === 4);
    expect([drop.point1.X(), drop.point1.Y(), drop.point2.X(), drop.point2.Y()])
        .toEqual([expect.closeTo(CROSS.x, 12), expect.closeTo(CROSS.y, 12), 3, -2]);
    // the two legs of the right-angle square meet at a right angle
    const [leg1, leg2] = shownSegments(graph, GraphPalette.constructionAccent).filter(s => s.visProp.strokewidth === 2);
    const v1 = [leg1.point2.X() - leg1.point1.X(), leg1.point2.Y() - leg1.point1.Y()];
    const v2 = [leg2.point2.X() - leg2.point1.X(), leg2.point2.Y() - leg2.point1.Y()];
    expect(v1[0] * v2[0] + v1[1] * v2[1]).toBeCloseTo(0, 12);
    expect(shownSegments(graph, GraphPalette.referenceCurve)).toHaveLength(1); // the vector PT
    expect(readout('value')).toBe('11');
    expect(readout('norm')).toBe('5');
    expect(readout('distance-squared')).toBe('121/5');
    expect(readout('distance')).toBe('≈ 4,9193');
    expect(readout('foot')).toBe('(4/5; 12/5)');
    expect(status()).toBe('Razdalja točke T od premice: d² = 121/5, d ≈ 4,9193.');
    expect(texts(graph)).toEqual(expect.arrayContaining(['d ≈ 4,9193', '$$PT$$', '$$PT_{n}$$']));
    // the projection segment F to T is captioned PTₙ and the readout row names the same caption
    expect(document.querySelector('[data-readout="projection"] dt')?.textContent).toBe('Pravokotna projekcija PT na normalo (PTₙ)');
    // T on the line: distance 0, no drop segment, no right angle
    set(graph, {T: pt(4, 4)});
    expect(status()).toBe('Točka T leži na premici, razdalja je 0.');
    expect(shownSegments(graph, GraphPalette.constructionAccent)).toHaveLength(0);
    NO_NAN();
});

test('intersect mode with a second line: the crossing point is marked and read exactly, parallel and equal lines say so', () => {
    const {graph} = mountGraph();
    set(graph, {mode: 'intersect'});
    expect(readout('point')).toBe('(4/5; 12/5)');
    expect(readout('point-approx')).toBe('(0,8; 2,4)');
    expect(status()).toBe('Presečišče premic je (4/5; 12/5).');
    const x = pointNamed(graph, 'X')!;
    expect([x.x, x.y]).toEqual([expect.closeTo(CROSS.x, 12), expect.closeTo(CROSS.y, 12)]);
    expect(shownLines(graph)).toHaveLength(2);
    expect(namedPoints(graph).map(p => p.name).sort()).toEqual(['P', 'Q', 'R', 'S', 'X']);
    set(graph, {R: pt(0, 0), S: pt(2, 1)});
    expect(status()).toBe('Premici sta vzporedni in se ne sekata.');
    expect(readout('point')).toBe('ni');
    expect(pointNamed(graph, 'X')).toBeUndefined();
    set(graph, {R: pt(-2, 1), S: pt(4, 4)});
    expect(status()).toBe('Premici sovpadata, skupnih točk je neskončno mnogo.');
    expect(readout('point')).toBe('neskončno mnogo');
    NO_NAN();
});

test('the crossing marker is stroked in its colour (a cross has no fill, so a white outline would hide it)', () => {
    const {graph} = mountGraph();
    set(graph, {mode: 'intersect'});
    const crosses = objects(graph).filter(o => o.elType === 'point' && visible(o) && String(o.evalVisProp('face')) === 'x');
    expect(crosses).toHaveLength(1);
    expect(String(crosses[0].evalVisProp('strokecolor'))).toBe(GraphPalette.constructionAccent);
});

test('intersect mode with a circle: tangent at (0, 2), two points (2, 2) and (-1, -1), and none', () => {
    const {graph} = mountGraph();
    set(graph, {mode: 'intersect', target: 'circle'});
    // O(1,0), B(3,1): r^2 = 5; the line x - 2y = -4 is at distance sqrt(5) from O
    const [circle] = shownCircles(graph);
    expect(shownCircles(graph)).toHaveLength(1);
    const centre = circle.center as unknown as JXG.Point;
    expect([centre.X(), centre.Y(), circle.Radius()]).toEqual([1, 0, expect.closeTo(Math.sqrt(5), 12)]);
    expect(namedPoints(graph).map(p => p.name).sort()).toEqual(['B', 'O', 'P', 'Q', 'X']);
    expect([pointNamed(graph, 'X')!.x, pointNamed(graph, 'X')!.y]).toEqual([expect.closeTo(0, 12), expect.closeTo(2, 12)]);
    expect(status()).toBe('Premica je tangenta krožnice v točki (0; 2).');
    expect(readout('discriminant')).toBe('0');
    expect(readout('count')).toBe('1');
    expect(document.querySelector('[data-readout="points"] dt')?.textContent).toBe('Dotikališče');
    expect(document.querySelector('[data-readout="s"] dt')?.textContent).toBe('Vrednost a·x₀ + b·y₀ − c v središču O');
    // y = x meets the circle where (x - 1)^2 + x^2 = 5: x = 2 or x = -1
    set(graph, {P: pt(0, 0), Q: pt(1, 1)});
    const two = ['X₁', 'X₂'].map(name => pointNamed(graph, name)!);
    expect(two.map(p => [Math.round(p.x * 1e9) / 1e9, Math.round(p.y * 1e9) / 1e9]).sort((a, b) => a[0] - b[0])).toEqual([[-1, -1], [2, 2]]);
    expect(readout('count')).toBe('2');
    expect(status()).toMatch(/^Premica seka krožnico v dveh točkah \(diskriminanta \d+\)\.$/);
    expect(readout('points-1')).toMatch(/^≈ \(/);
    expect(document.querySelector('[data-readout="points-1"] dt')?.textContent).toBe('Presečišče 1');
    // x = 5 is at distance 4 from O > sqrt(5)
    set(graph, {P: pt(5, 5), Q: pt(5, 6)});
    expect(readout('count')).toBe('0');
    expect(status()).toMatch(/^Premica ne seka krožnice \(diskriminanta −?\d+\)\.$/);
    expect(namedPoints(graph).map(p => p.name).sort()).toEqual(['B', 'O', 'P', 'Q']);
    NO_NAN();
});

test('an intersection outside the view is not drawn and the status says so', () => {
    const {graph} = mountGraph();
    // PQ has direction (16, 15), RS has direction (16, 16): they meet at (-24, -23)
    set(graph, {mode: 'intersect', P: pt(-8, -8), Q: pt(8, 7), R: pt(-8, -7), S: pt(8, 9)});
    expect(status()).toBe('Presečišče premic je (−24; −23). Presečišče zunaj prikaza ni narisano.');
    expect(pointNamed(graph, 'X')).toBeUndefined();
    set(graph, {mode: 'angle'});
    expect(status()).toMatch(/Presečišče premic je zunaj prikaza, zato kot ni narisan\.$/);
    expect(shownCurves(graph)).toHaveLength(0);
    expect(VIEW_HALF).toBe(10);
    NO_NAN();
});

test('a foot of the perpendicular beyond the view is not drawn and the status says so', () => {
    const {graph} = mountGraph();
    // the line through (-8,-7) and (-7,-8) and T = (-8, 8): the foot is (-15.5, 0.5), outside [-10, 10]^2
    set(graph, {mode: 'distance', P: pt(-8, -7), Q: pt(-7, -8), T: pt(-8, 8)});
    expect(pointNamed(graph, 'F')).toBeUndefined();
    expect(shownSegments(graph, GraphPalette.constructionAccent)).toHaveLength(0);
    expect(status()).toMatch(/Nožišče zunaj prikaza ni narisano\.$/);
    expect(readout('foot')).toBeDefined();
    set(graph, {T: pt(-7, -5)});
    expect(pointNamed(graph, 'F')).toBeDefined();
    NO_NAN();
});

test('coincident points give a status and no line, circle or NaN in every mode', () => {
    const {graph} = mountGraph();
    set(graph, {Q: pt(-2, 1)});
    expect(status()).toBe('Točki P in Q sovpadata, zato ne določata premice.');
    expect(shownLines(graph)).toHaveLength(0);
    expect(readout('implicit')).toBeUndefined();
    NO_NAN();
    set(graph, {mode: 'distance'});
    expect(shownSegments(graph, GraphPalette.constructionAccent)).toHaveLength(0);
    expect(pointNamed(graph, 'F')).toBeUndefined();
    expect(status()).toBe('Točki P in Q sovpadata, zato ne določata premice.');
    NO_NAN();
    set(graph, {mode: 'normal', Q: pt(4, 4), S: pt(3, -2)});
    expect(status()).toBe('Točki R in S sovpadata, zato ne določata druge premice.');
    expect(shownLines(graph)).toHaveLength(1);
    NO_NAN();
    set(graph, {mode: 'angle'});
    expect(shownCurves(graph)).toHaveLength(0);
    NO_NAN();
    set(graph, {mode: 'intersect', S: pt(2, 0), target: 'circle', B: pt(1, 0)});
    expect(status()).toBe('Točki O in B sovpadata, zato je polmer 0 in krožnice ni.');
    expect(shownCircles(graph)).toHaveLength(0);
    NO_NAN();
});

test('the point fields take typed integers: one field per handle, shown only for the modes that use the handle', () => {
    const {graph} = mountGraph();
    const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
    enter('P, x', '-5');
    enter('Q, y', '7');
    expect([graph.state.P, graph.state.Q]).toEqual([{x: -5, y: 1}, {x: 4, y: 7}]);
    expect(graph.handles().P!.X()).toBe(-5);
    expect(find('R, x')).toBeNull();
    set(graph, {mode: 'normal'});
    enter('R, x', '-4');
    enter('S, y', '6');
    expect([graph.state.R, graph.state.S]).toEqual([{x: -4, y: -2}, {x: 2, y: 6}]);
    set(graph, {mode: 'distance'});
    enter('T, x', '-8');
    expect(graph.state.T).toEqual({x: -8, y: -2});
    expect(find('R, x')).toBeNull();
    set(graph, {mode: 'intersect', target: 'circle'});
    enter('O, y', '3');
    enter('B, x', '0');
    expect([graph.state.O, graph.state.B]).toEqual([{x: 1, y: 3}, {x: 0, y: 1}]);
    expect(graph.handles().B!.X()).toBe(0);
    expect(status()).toMatch(/^Premica /);
});

test('the point rows come in groups that belong together: the two points of a line, the circle, the point T', () => {
    const {graph} = mountGraph();
    const names = () => ['P', 'Q', 'R', 'S', 'T', 'O', 'B'].flatMap(point => [`${point}, x`, `${point}, y`]).filter(name => find(name) !== null);
    expect(names()).toEqual(['P, x', 'P, y', 'Q, x', 'Q, y']);
    set(graph, {mode: 'normal'});
    expect(names()).toEqual(['P, x', 'P, y', 'Q, x', 'Q, y', 'R, x', 'R, y', 'S, x', 'S, y']);
    set(graph, {mode: 'distance'});
    expect(names()).toEqual(['P, x', 'P, y', 'Q, x', 'Q, y', 'T, x', 'T, y']);
    set(graph, {mode: 'intersect', target: 'circle'});
    expect(names()).toEqual(['P, x', 'P, y', 'Q, x', 'Q, y', 'O, x', 'O, y', 'B, x', 'B, y']);
    set(graph, {mode: 'forms'});
    const before = graph.state;
    act(() => { enterNumber(field('P, x'), String(GRID_LIMIT + 1)); });
    expect(graph.state).toBe(before); // outside [-8, 8] is refused, not clamped
});

test('keyboard steps move a coordinate by one grid unit, Shift or a Page key by five, within [-8, 8]', () => {
    const {graph} = mountGraph();
    expect([POINT_STEP, POINT_BIG_STEP]).toEqual([1, 5]);
    act(() => { fireEvent.keyDown(field('P, x'), {key: 'ArrowUp'}); });
    expect(graph.state.P).toEqual({x: -1, y: 1});
    act(() => { fireEvent.keyDown(field('P, x'), {key: 'ArrowDown', shiftKey: true}); });
    expect(graph.state.P).toEqual({x: -6, y: 1});
    act(() => { fireEvent.keyDown(field('Q, y'), {key: 'PageUp'}); });
    expect(graph.state.Q).toEqual({x: 4, y: 8}); // 4 + 5 = 9 is clamped to 8
    expect(graph.handles().Q!.Y()).toBe(8);
    // P(-6,1) Q(4,8): direction (10, 7), line 7x - 10y = -52
    expect(readout('implicit')).toBe('7x − 10y = −52');
});

test('dragging a handle snaps it to the grid inside [-8, 8], updates the state and the readout', () => {
    const {graph} = mountGraph();
    const handle = graph.handles().P!;
    dragHandleTo(handle, 3.4, -5.6);
    expect(graph.state.P).toEqual({x: 3, y: -6});
    expect([handle.X(), handle.Y()]).toEqual([3, -6]);
    // P(3,-6) Q(4,4): direction (1, 10), line 10x - y = 36
    expect(readout('implicit')).toBe('10x − y = 36');
    dragHandleTo(graph.handles().Q!, 12, 0.2);
    expect(graph.state.Q).toEqual({x: 8, y: 0});
    expect(graph.handles().Q!.X()).toBe(8);
});

test('mount, state change and unmount: objects and listeners are owned and released, and a rebuild does not duplicate them', () => {
    const {graph, view} = mountGraph();
    expectHandleHitZones(graph.liveBoard(), [graph.handles().P!, graph.handles().Q!], HANDLE_TOUCH_RADIUS + HIT_SLACK);
    const preMount = graph.preMountCount;
    expect(preMount).toBeGreaterThan(0);
    const board = graph.liveBoard();
    const owned = graph.ownedObjectCount();
    const boardCount = countObjects(board);
    expect(graph.ownedListenerCount()).toBe(7); // one remover per handle (it takes off the drag, over and out handlers)
    for (const name of ['P', 'Q', 'R', 'S', 'T', 'O', 'B'] as const) expect(dragListeners(graph.handles()[name]!)).toBe(1);
    set(graph, {mode: 'angle', R: pt(0, 0), S: pt(1, 3)});
    set(graph, {mode: 'intersect', target: 'circle'});
    expect(graph.ownedObjectCount()).toBe(owned);
    expect(countObjects(board)).toBe(boardCount);
    // a real rebuild: `initialize` runs `buildScene`, which first disposes the scene it replaces
    const oldHandles = Object.values(graph.handles()) as JXG.Point[];
    act(() => { graph.rebuildNow(); });
    expect(graph.ownedObjectCount()).toBe(owned);
    expect(graph.ownedListenerCount()).toBe(7);
    expect(countObjects(board)).toBe(boardCount);
    for (const handle of oldHandles) expect(board.objectsList.includes(handle)).toBe(false);
    for (const name of ['P', 'Q', 'R', 'S', 'T', 'O', 'B'] as const) expect(dragListeners(graph.handles()[name]!)).toBe(1);

    const handles = Object.values(graph.handles()) as JXG.Point[];
    const ownedByGraph = new Set(board.objectsList.slice(board.objectsList.length - owned));
    graph.disposeNow();
    expect(graph.ownedObjectCount()).toBe(0);
    expect(graph.ownedListenerCount()).toBe(0);
    for (const handle of handles) expect(dragListeners(handle)).toBe(0);
    expect(board.objectsList.some(object => ownedByGraph.has(object))).toBe(false);
    expect(countObjects(board)).toBe(preMount);
    expect(objects(graph).filter(o => ['segment', 'circle', 'line', 'curve'].includes(o.elType))).toHaveLength(0);

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
    expect(strict.graph.ownedListenerCount()).toBe(7);
    strict.view.unmount();
    expect(strict.graph.ownedObjectCount()).toBe(0);
});

test('the status, labels and readouts follow a language switch (point format, decimal mark)', () => {
    const {graph} = mountGraph();
    act(() => { setLanguage('en'); });
    expect(status()).toBe('The line x − 2y = −4 has an implicit, an explicit and an intercept form.');
    expect(document.querySelector('[data-readout-live]')!.textContent).toContain('implicit, an explicit and an intercept form');
    expect(field('P, x')).toBeInTheDocument();
    set(graph, {mode: 'distance'});
    expect(status()).toBe('Distance of point T from the line: d² = 121/5, d ≈ 4.9193.');
    expect(readout('foot')).toBe('(4/5, 12/5)');
    expect(texts(graph)).toContain('d ≈ 4.9193');
    set(graph, {mode: 'intersect'});
    expect(status()).toBe('The lines meet at (4/5, 12/5).');
    expect(readout('point-approx')).toBe('(0.8, 2.4)');
});

/** The board's bounding box [left, top, right, bottom] and whether a user-space point lies inside it. */
const boxOf = (graph: Observed) => graph.liveBoard().getBoundingBox() as [number, number, number, number];

test('the fixed view holds the whole [-8, 8] grid; the worst-case foot of the perpendicular lies beyond it and is not drawn', () => {
    const {graph} = mountGraph();
    const box = boxOf(graph);
    const inBox = (x: number, y: number) => x >= box[0] && x <= box[2] && y >= box[3] && y <= box[1];
    for (const [x, y] of [[-8, -8], [8, 8], [-8, 8], [8, -8]]) expect(inBox(x, y)).toBe(true);
    // P(-8,-7) Q(-7,-8) is x + y = -15; T(-8,8) is 15 / 2 along the normal from it, so the foot is (-15.5, 0.5)
    set(graph, {mode: 'distance', P: pt(-8, -7), Q: pt(-7, -8), T: pt(-8, 8)});
    expect(pointNamed(graph, 'F')).toBeUndefined(); // (-15.5, 0.5) is beyond the view: not drawn, but exact in the readout
    expect(readout('foot')).toBe('(−31/2; 1/2)');
    expect(status()).toMatch(/^Razdalja točke T od premice: d² = 225\/2, .*Nožišče zunaj prikaza ni narisano\.$/);
    NO_NAN();
});
