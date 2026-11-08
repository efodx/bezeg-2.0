import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {enterNumber} from '../../inputs/testEntry';
import {MemoryRouter} from 'react-router-dom';
import {VoronoiGraph} from './VoronoiGraph';
import {VORONOI_DEFAULT_QUERY, VORONOI_EXAMPLE, VORONOI_PRESET_KEY, voronoiCollection} from './voronoiPresetCollection';
import {sameCyclicPolygon} from './voronoiConstruction';
import {GraphHost} from '../base/GraphHost';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {gridToBoard, serializePointSetModel} from '../../compgeo/pointSetModel';
import {Rational, RationalPoint} from '../../compgeo/rational';
import {edges as triangulationEdges} from '../../compgeo/triangulation';
import {clipCell, nearestSites, voronoiFromDelaunay} from '../../compgeo/voronoi';
import {setLanguage, t} from '../../localization';

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

class Observed extends VoronoiGraph {
    liveBoard() { return this.board; }
    box() { return this['drawBox'](); }
    queryTextOf() { return this['queryText']; }
}

type Shown = {elType: string; center?: {X(): number; Y(): number}; Radius?(): number; name?: string; plaintext?: string; X?: () => number; Y?: () => number; dataX?: number[]; dataY?: number[]; visProp?: Record<string, unknown>};
const objects = (graph: Observed) => graph.liveBoard().objectsList as unknown as Shown[];
const named = (graph: Observed, name: string) => objects(graph).filter(o => o.name === name);
const mount = (graph: Observed) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const readout = (name: string) => document.querySelector(`[data-readout="${name}"]`)?.textContent;
const part = (name: string) => document.querySelector(`[data-voronoi="${name}"]`)?.textContent;
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const siteButton = (site: number) => document.querySelector(`button[data-site="${site}"]`) as HTMLButtonElement;
const triangleButton = (index: number) => document.querySelector(`button[data-triangle="${index}"]`) as HTMLButtonElement;
const overlaySwitch = () => document.getElementById([...document.querySelectorAll<HTMLLabelElement>('label.bool-field-label')].find(l => /Dualnost|Duality/.test(l.textContent ?? ''))!.htmlFor) as HTMLInputElement;
const live = () => document.querySelector('[data-voronoi-live]')?.textContent ?? '';
const queryField = (axis: 'x' | 'y') => screen.getByRole('spinbutton', {name: `q, ${axis}`});
const sitePoints = (graph: Observed) => objects(graph).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? ''));
const trigger = (target: object, name: string) => (target as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers([name], []);
const dragSite = (graph: Observed, index: number, x: number, y: number) => {
    const point = sitePoints(graph)[index] as unknown as JXG.Point;
    act(() => { point.moveTo([x, y], 0); trigger(point, 'drag'); });
};
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
const sorted = (corners: readonly number[]) => [...corners].sort((a, b) => a - b);
const numberOf = (text: string) => { const [n, d] = text.split('/').map(Number); return n / (d ?? 1); };

/** The seven Voronoi vertices of the B4 example, as the spec lists them (exact text). */
const SPEC_VERTICES: readonly (readonly [string, string])[] = [
    ['4', '-1'], ['1/3', '8/3'], ['91/10', '29/10'], ['9/2', '-1/6'], ['85/14', '83/14'], ['21/11', '64/11'], ['9/2', '53/10'],
];
const pointText = (x: string, y: string) => `(${x}, ${y})`;

test('the B4 example shows the 7 spec vertices as exact text, 8 finite edges, 5 rays, 5 unbounded and 2 bounded cells', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model.points).toEqual(VORONOI_EXAMPLE.points);
    expect(readout('sites')).toBe('Mest: 7');
    expect(readout('vertices')).toBe('Voronojevih oglišč: 7');
    expect(readout('edges')).toBe('Končnih robov: 8');
    expect(readout('rays')).toBe('Poltrakov: 5');
    expect(readout('unbounded')).toBe('Neomejenih celic: 5');
    expect(readout('bounded')).toBe('Omejenih celic: 2');
    const listed = [...document.querySelectorAll('[data-vertex]')].map(v => v.textContent ?? '');
    expect(listed).toHaveLength(7);
    for (const [x, y] of SPEC_VERTICES) expect(listed.some(text => text.includes(`= ${pointText(x, y)};`))).toBe(true);
    expect(graph.drawingStats()).toMatchObject({segments: 8, rays: 5, vertexMarkers: 7, openCells: 5, closedCells: 2});
    expect(named(graph, 'voronoi-vertex')).toHaveLength(7);
    expect(named(graph, 'voronoi-cell')).toHaveLength(7);
    // the bounded cells are those of p5 and p6 (spec p5, p6: indices 5 and 6, labels P6, P7)
    expect(graph.diagram()!.cells.filter(cell => cell.bounded).map(cell => cell.site)).toEqual([5, 6]);
});

test('the overlay is off after load, toggles on and off, and hull and interior edges differ without colour', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.overlayShown('delaunay')).toBe(false);
    expect(overlaySwitch().checked).toBe(false);
    expect(named(graph, 'voronoi-delaunay-hull')).toHaveLength(0);
    expect(document.querySelector('[data-voronoi="triangles"]')).toBeNull();
    act(() => { fireEvent.click(overlaySwitch()); });
    expect(graph.overlayShown('delaunay')).toBe(true);
    const all = triangulationEdges(graph.delaunay()!);
    const hull = named(graph, 'voronoi-delaunay-hull');
    const interior = named(graph, 'voronoi-delaunay-interior');
    expect(hull).toHaveLength(all.filter(e => !e.interior).length);
    expect(interior).toHaveLength(all.filter(e => e.interior).length);
    expect(hull.length).toBeGreaterThanOrEqual(3);
    expect(interior.length).toBeGreaterThan(0);
    expect(hull[0].visProp?.strokewidth).not.toBe(interior[0].visProp?.strokewidth);
    expect(hull[0].visProp?.dash).not.toBe(interior[0].visProp?.dash);
    expect(live()).toContain('Dualnost je vklopljena');
    act(() => { fireEvent.click(overlaySwitch()); });
    expect(graph.overlayShown('delaunay')).toBe(false);
    expect(named(graph, 'voronoi-delaunay-hull')).toHaveLength(0);
    expect(named(graph, 'voronoi-delaunay-interior')).toHaveLength(0);
    expect(live()).toContain('Dualnost je izklopljena');
});

test('triangle (0,1,5) shows the vertex (4,-1); every triangle shows its own vertex from the spec list', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(overlaySwitch()); });
    const tri = graph.delaunay()!;
    expect(tri.triangles).toHaveLength(7);
    const seen = new Set<string>();
    let sawFirst = false;
    tri.triangles.forEach((corners, index) => {
        act(() => { fireEvent.click(triangleButton(index)); });
        expect(graph.selectedTriangle()).toBe(index);
        expect(named(graph, 'voronoi-selected-circle')).toHaveLength(1);
        const text = part('selected-vertex') ?? '';
        const found = SPEC_VERTICES.filter(([x, y]) => text.includes(`središče očrtane krožnice ${pointText(x, y)} `));
        expect(found).toHaveLength(1);
        seen.add(found[0].join(','));
        // the circumcentre is marked where the vertex is
        const mark = named(graph, 'voronoi-selected-vertex')[0];
        expect(mark.X!()).toBeCloseTo(numberOf(found[0][0]), 9);
        expect(mark.Y!()).toBeCloseTo(numberOf(found[0][1]), 9);
        // the drawn circumcircle is centred on the vertex and passes through the three corners
        const circle = named(graph, 'voronoi-selected-circle')[0];
        expect(circle.center!.X()).toBeCloseTo(numberOf(found[0][0]), 9);
        expect(circle.center!.Y()).toBeCloseTo(numberOf(found[0][1]), 9);
        for (const corner of corners) {
            const site = graph.model.points[corner];
            expect(Math.hypot(site.x - circle.center!.X(), site.y - circle.center!.Y())).toBeCloseTo(circle.Radius!(), 9);
        }
        expect(named(graph, 'voronoi-selected-triangle')).toHaveLength(1);
        const [a, b, c] = sorted(corners);
        expect(text).toContain(`Trikotnik P${a + 1}, P${b + 1}, P${c + 1}`);
        expect(text).toContain(`enako oddaljeno od mest P${a + 1}, P${b + 1}, P${c + 1}`);
        if (sorted(corners).join() === '0,1,5') {
            sawFirst = true;
            expect(found[0]).toEqual(['4', '-1']);
        }
    });
    expect(sawFirst).toBe(true);
    expect(seen.size).toBe(7);
    expect(graph.diagram()!.vertices.some(v => v.point.x.format() === '4' && v.point.y.format() === '-1' && v.sites.join() === '0,1,5')).toBe(true);
});

/** Squared distances in quarter units: exact integers. */
function bruteNearest(points: readonly {x: number; y: number}[], qx4: number, qy4: number): number[] {
    const d = points.map(p => (4 * p.x - qx4) ** 2 + (4 * p.y - qy4) ** 2);
    const least = Math.min(...d);
    return d.flatMap((v, i) => (v === least ? [i] : []));
}
function insideOrOn(xs: number[], ys: number[], px: number, py: number): boolean {
    // convex polygon, counter-clockwise (the last vertex repeats the first)
    for (let k = 0; k < xs.length - 1; k++) {
        const cross = (xs[k + 1] - xs[k]) * (py - ys[k]) - (ys[k + 1] - ys[k]) * (px - xs[k]);
        if (cross < -1e-9) return false;
    }
    return true;
}

test('the query point inside the p6 cell names P6 and highlights it; on seeded random positions the brute-force nearest equals the highlighted cell', () => {
    const graph = new Observed();
    mount(graph);
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual([VORONOI_DEFAULT_QUERY.x, VORONOI_DEFAULT_QUERY.y]);
    expect(graph.queryNearest()).toEqual([5]);
    expect(part('query-nearest')).toBe('Najbližje mesto: P6; njegova celica je poudarjena.');
    let seed = 12345;
    const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const points = graph.model.points;
    const highlightedSites = () => {
        const cells = named(graph, 'voronoi-cell').filter(o => (o.visProp?.fillopacity as number) > 0.9);
        expect(cells).toHaveLength(1);
        return points.map((p, i) => ({p, i})).filter(({p}) => insideOrOn(cells[0].dataX!, cells[0].dataY!, p.x, p.y)).map(({i}) => i);
    };
    for (let k = 0; k < 40; k++) {
        const qx4 = Math.round(next() * 56 - 16);
        const qy4 = Math.round(next() * 56 - 8);
        const point = new RationalPoint(Rational.of(qx4, 4), Rational.of(qy4, 4));
        act(() => { expect(graph.setQueryPoint(point)).toBe(true); });
        const brute = bruteNearest(points, qx4, qy4);
        expect(graph.queryNearest()).toEqual(brute);
        expect(highlightedSites()).toContain(brute[0]);
        if (brute.length === 1) expect(highlightedSites()).toEqual([brute[0]]);
        expect(part('query-nearest')).toContain(brute.length === 1 ? `P${brute[0] + 1}` : 'Točka leži na simetrali');
    }
    // a point exactly inside the p6 cell at a rational position
    act(() => { graph.setQueryText('7/2', '5/2'); });
    expect(graph.queryNearest()).toEqual([5]);
});

test('a query point on a bisector lists every tied site; invalid and out-of-range text is refused', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(serializePointSetModel({...VORONOI_EXAMPLE, points: [{x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 4}, {x: 4, y: 4}]})); });
    act(() => { graph.setQueryText('2', '2'); });
    expect(graph.queryNearest()).toEqual([0, 1, 2, 3]);
    expect(part('query-nearest')).toBe('Točka leži na simetrali: enako blizu so mesta P1, P2, P3, P4.');
    expect(graph.setQueryText('1000000000', '0')).toBe(false);
    expect(graph.setQueryText('abc', '0')).toBe(false);
    expect(graph.query.x.format()).toBe('2');
    expect(graph.setQueryText('1,5', '3/2')).toBe(true);
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['3/2', '3/2']);
});

test('a site drag changes diagram and overlay together in one write; an edit clears selection and construction', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(overlaySwitch()); });
    act(() => { fireEvent.click(siteButton(2)); });
    click('next-step');
    click('next-step');
    act(() => { fireEvent.click(triangleButton(0)); });
    expect([graph.cellSite, graph.construction, graph.selectedTriangle()]).toEqual([2, 2, 0]);
    const before = graph.diagram()!.vertices.map(v => `${v.point.x.format()},${v.point.y.format()}`);
    const writes = vi.spyOn(graph, 'setState');
    dragSite(graph, 3, 5, 9);
    expect(writes).toHaveBeenCalledTimes(1);
    writes.mockRestore();
    expect(graph.model.points[3]).toEqual({x: 5, y: 9});
    const after = graph.diagram()!.vertices.map(v => `${v.point.x.format()},${v.point.y.format()}`);
    expect(after).not.toEqual(before);
    // diagram and overlay both come from the new points
    expect(graph.delaunay()!.points).toEqual(graph.model.points);
    const fresh = voronoiFromDelaunay(graph.model.points);
    expect(fresh.ok && fresh.value.vertices.map(v => v.sites.join())).toEqual(graph.diagram()!.vertices.map(v => v.sites.join()));
    expect(graph.drawingStats()).toMatchObject({vertexMarkers: graph.diagram()!.vertices.length});
    expect(named(graph, 'voronoi-delaunay-hull').length + named(graph, 'voronoi-delaunay-interior').length).toBe(triangulationEdges(graph.delaunay()!).length);
    expect([graph.cellSite, graph.construction, graph.selectedTriangle()]).toEqual([null, 0, undefined]);
    expect(named(graph, 'voronoi-selected-circle')).toHaveLength(0);
    expect(named(graph, 'voronoi-bisector')).toHaveLength(0);
    expect(named(graph, 'voronoi-bisector-latest')).toHaveLength(0);
    // add and remove edit too
    act(() => { fireEvent.click(siteButton(1)); });
    click('next-step');
    act(() => { graph.addPointAt({x: 9, y: -3}); });
    expect([graph.cellSite, graph.construction, graph.model.points.length]).toEqual([null, 0, 8]);
    act(() => { fireEvent.click(siteButton(1)); });
    click('next-step');
    act(() => { graph.select(7); graph.removeSelected(); });
    expect([graph.cellSite, graph.construction, graph.model.points.length]).toEqual([null, 0, 7]);
});

test('Play builds the chosen cell one bisector per tick and stops at the last; Back and an edit stop it; nothing stays scheduled', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    act(() => { fireEvent.click(siteButton(0)); });
    click('play-pause');
    expect(graph.isPlaying).toBe(true);
    act(() => { frames.frame(0); });
    for (let k = 1; k <= 3; k++) { act(() => { frames.frame(800); }); expect(graph.construction).toBe(k); }
    const text = live();
    expect(text).toBe('');
    click('construct-back');
    expect([graph.construction, graph.isPlaying]).toEqual([2, false]);
    click('play-pause');
    act(() => { frames.frame(0); });
    for (let ran = true, i = 0; ran && i < 12; i++) act(() => { ran = frames.frame(800); });
    expect([graph.construction, graph.isPlaying, frames.callbacks.size]).toEqual([6, false, 0]);
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    click('reset');
    expect(graph.construction).toBe(0);
});

test('the construction ends at the polygon clipCell returns (exact) for every site, in the decided order', () => {
    const graph = new Observed();
    mount(graph);
    const points = graph.model.points;
    for (let site = 0; site < points.length; site++) {
        act(() => { fireEvent.click(siteButton(site)); });
        expect(graph.construction).toBe(0);
        expect(part('construction')).toBe(`Celica mesta P${site + 1}: začetek, še brez simetral (0 od 6).`);
        for (let k = 0; k < 6; k++) click('next-step');
        expect(graph.construction).toBe(6);
        expect(part('construction')).toContain(`presek polravnin je celica mesta P${site + 1}`);
        const expected = clipCell(graph.diagram()!, points, site, graph.box()!).polygon;
        expect(sameCyclicPolygon(graph.constructionPolygon(), expected)).toBe(true);
        expect(named(graph, 'voronoi-construction-region')[0].dataX).toHaveLength(expected.length + 1);
        expect(named(graph, 'voronoi-bisector').length + named(graph, 'voronoi-bisector-latest').length).toBeGreaterThan(0);
    }
    // Back, Reset and a further Next are deterministic
    click('construct-back');
    expect(graph.construction).toBe(5);
    click('next-step');
    expect(graph.construction).toBe(6);
    click('next-step');
    expect(graph.construction).toBe(6);
    click('reset');
    expect(graph.construction).toBe(0);
    expect(named(graph, 'voronoi-construction-region')).toHaveLength(1);
    expect(named(graph, 'voronoi-bisector-latest')).toHaveLength(0);
});

test('keyboard only: select a site, select a triangle, move the query point, toggle the overlay', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(overlaySwitch()); });
    act(() => { fireEvent.click(siteButton(5)); });
    expect(graph.cellSite).toBe(5);
    expect(siteButton(5).getAttribute('aria-pressed')).toBe('true');
    act(() => { fireEvent.click(triangleButton(1)); });
    expect(graph.selectedTriangle()).toBe(1);
    expect(triangleButton(1).getAttribute('aria-pressed')).toBe('true');
    click('query-right');
    click('query-right');
    click('query-up');
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['5', '5/2']);
    expect(part('query-at')).toBe('Točka poizvedbe: (5, 5/2).');
    click('query-left');
    click('query-down');
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['9/2', '2']);
    // the numeric alternative: the shared single-point list (wiring only; its mechanics are tested once in the shared controls)
    act(() => { enterNumber(queryField('x'), '1.5'); });
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['3/2', '2']);
    act(() => { enterNumber(queryField('y'), '0.3'); });
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['3/2', '1/4']);
    const queryList = screen.getByRole('group', {name: t('vor_query_group')});
    expect(queryList.querySelectorAll('.point-list-row')).toHaveLength(1);
    expect(queryList.querySelector('.point-list-remove')).toBeNull();
    act(() => { fireEvent.click(overlaySwitch()); });
    expect(graph.overlayShown('delaunay')).toBe(false);
    expect(graph.selectedTriangle()).toBeUndefined();
});

test('a query point dragged on the board snaps to quarters and stays exact', () => {
    const graph = new Observed();
    mount(graph);
    const query = named(graph, 'voronoi-query')[0] as unknown as JXG.Point;
    act(() => { query.moveTo([6.1, 1.9], 0); trigger(query, 'drag'); });
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['6', '2']);
    expect([query.X(), query.Y()]).toEqual([6, 2]);
    expect(graph.queryNearest()).toEqual(nearestSites(graph.model.points, graph.query));
    expect(graph.model.points).toEqual(VORONOI_EXAMPLE.points);
});

test('the capture-only fine grid scales the query point with the sites, so it stays put on the board', () => {
    const graph = new Observed();
    mount(graph);
    const site = sitePoints(graph)[0] as unknown as JXG.Point;
    (window as {__bezegClipGridStepExponent?: unknown}).__bezegClipGridStepExponent = -2;
    try {
        act(() => { site.moveTo([site.X() + 0.25, site.Y()], 0); trigger(site, 'drag'); });
        expect(graph.model.gridStepExponent).toBe(-2);
        expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['16', '8']);
        const query = named(graph, 'voronoi-query')[0] as unknown as JXG.Point;
        expect([query.X(), query.Y()]).toEqual([4, 2]);
        expect(graph.queryNearest()).toEqual(nearestSites(graph.model.points, graph.query));
    } finally { delete (window as {__bezegClipGridStepExponent?: unknown}).__bezegClipGridStepExponent; }
});

test('under the capture-only fine grid the dragged query marker stays under the pointer and keeps its look on press', () => {
    const graph = new Observed();
    mount(graph);
    const query = named(graph, 'voronoi-query')[0] as unknown as JXG.Point;
    expect(query.visProp.highlightfillcolor).not.toBe(query.visProp.fillcolor);
    (window as {__bezegClipGridStepExponent?: unknown}).__bezegClipGridStepExponent = -8;
    try {
        act(() => { query.moveTo([4.0123, 2], 0); trigger(query, 'drag'); });
        expect(graph.model.gridStepExponent).toBe(-8);
        expect(query.X()).toBe(4.0123);
    } finally { delete (window as {__bezegClipGridStepExponent?: unknown}).__bezegClipGridStepExponent; }
});

test('a rescale to the fine grid keeps the followed drawing box while the view stays', () => {
    const graph = new Observed();
    mount(graph);
    const site = sitePoints(graph)[0] as unknown as JXG.Point;
    const box = () => (graph as unknown as {followBox?: {minX: Rational}}).followBox?.minX;
    act(() => { graph.liveBoard().setBoundingBox([-5.3, 12.3, 13.3, -3.3], false); });
    const before = box();
    expect(before).toBeDefined();
    (window as {__bezegClipGridStepExponent?: unknown}).__bezegClipGridStepExponent = -2;
    try {
        act(() => { site.moveTo([site.X() + 0.25, site.Y()], 0); trigger(site, 'drag'); });
        act(() => { graph.liveBoard().setBoundingBox([-5.3, 12.3, 13.3, -3.3], false); });
        expect(box()?.format()).toBe(before!.mul(Rational.fromInt(4)).format());
    } finally { delete (window as {__bezegClipGridStepExponent?: unknown}).__bezegClipGridStepExponent; }
});

test('Reset restores the example, switches the overlay off and clears selection, construction and the query point', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(overlaySwitch()); });
    act(() => { fireEvent.click(triangleButton(2)); });
    act(() => { fireEvent.click(siteButton(1)); });
    click('next-step');
    click('query-up');
    act(() => { graph.addPointAt({x: 9, y: -3}); });
    click('reset-example');
    expect(graph.model.points).toEqual(VORONOI_EXAMPLE.points);
    expect(graph.overlayShown('delaunay')).toBe(false);
    expect([graph.cellSite, graph.construction, graph.selectedTriangle()]).toEqual([null, 0, undefined]);
    expect([graph.query.x.format(), graph.query.y.format()]).toEqual(['4', '2']);
    expect(named(graph, 'voronoi-delaunay-hull')).toHaveLength(0);
    expect(named(graph, 'voronoi-selected-circle')).toHaveLength(0);
    expect(named(graph, 'voronoi-bisector-latest')).toHaveLength(0);
    expect(overlaySwitch().checked).toBe(false);
});

test('duplicates and fewer than two sites refuse with a message and draw nothing; collinear sets are noted', () => {
    const graph = new Observed();
    mount(graph);
    const load = (points: {x: number; y: number}[]) => act(() => { graph.loadModel(serializePointSetModel({...VORONOI_EXAMPLE, points})); });
    load([{x: 1, y: 1}]);
    expect(part('refusal')).toBe('Za Voronojev diagram sta potrebni vsaj dve mesti.');
    expect(named(graph, 'voronoi-cell')).toHaveLength(0);
    expect(graph.drawingStats()).toBeUndefined();
    load([{x: 1, y: 1}, {x: 3, y: 3}, {x: 5, y: 5}]);
    expect(part('collinear')).toContain('na isti premici');
    expect(readout('sites')).toBe('Mest: 3');
    load([{x: 1, y: 1}, {x: 3, y: 3}, {x: 1, y: 1}]);
    expect(part('refusal')).toBe('Mesti P1 in P3 sta enaki; premakni eno od njiju.');
    // the point limit is the point-set graph's refusal
    load(Array.from({length: 40}, (_, i) => ({x: i - 20, y: (i * 7) % 11})));
    expect(graph.model.points).toHaveLength(40);
    act(() => { expect(graph.addPointAt({x: 30, y: 30})).toBe(false); });
    expect(graph.model.points).toHaveLength(40);
});

test('the view follows the board: after a zoom out the rays reach the new box edge and every "continues" marker lies on it; Fit restores the frame', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const frameBox = graph.box()!;
    const onBox = (box: NonNullable<ReturnType<Observed['box']>>) => {
        const [minX, maxX, minY, maxY] = [box.minX, box.maxX, box.minY, box.maxY].map(v => v.toNumber());
        const markers = named(graph, 'voronoi-continues');
        expect(markers.length).toBeGreaterThanOrEqual(5);
        for (const m of markers) {
            const mx = m.X!(), my = m.Y!();
            expect(mx >= minX - 1e-9 && mx <= maxX + 1e-9 && my >= minY - 1e-9 && my <= maxY + 1e-9).toBe(true);
            expect(Math.abs(mx - minX) < 1e-9 || Math.abs(mx - maxX) < 1e-9 || Math.abs(my - minY) < 1e-9 || Math.abs(my - maxY) < 1e-9).toBe(true);
        }
        const drawn = named(graph, 'voronoi-edges')[0];
        const touching = drawn.dataX!.map((px, k) => [px, drawn.dataY![k]]).filter(([px, py]) =>
            Number.isFinite(px) && (Math.abs(px - minX) < 1e-9 || Math.abs(px - maxX) < 1e-9 || Math.abs(py - minY) < 1e-9 || Math.abs(py - maxY) < 1e-9));
        expect(touching.length).toBeGreaterThanOrEqual(5);
    };
    onBox(frameBox);
    act(() => { board.setBoundingBox([-40, 50, 60, -50], false); });
    const zoomed = graph.box()!;
    expect(zoomed).not.toBe(frameBox);
    // rounded inward and inset: inside the view, near its edges
    expect(zoomed.minX.toNumber()).toBeGreaterThanOrEqual(-40);
    expect(zoomed.minX.toNumber()).toBeLessThan(-30);
    expect(zoomed.maxX.toNumber()).toBeLessThanOrEqual(60);
    expect(zoomed.maxY.toNumber()).toBeLessThanOrEqual(50);
    expect(zoomed.maxY.toNumber()).toBeGreaterThan(40);
    onBox(zoomed);
    // a construction made now ends at clipCell of the new box
    act(() => { fireEvent.click(siteButton(0)); });
    for (let k = 0; k < 6; k++) click('next-step');
    expect(sameCyclicPolygon(graph.constructionPolygon(), clipCell(graph.diagram()!, graph.model.points, 0, zoomed).polygon)).toBe(true);
    act(() => { graph['fitToVisiblePoints'](); });
    const restored = graph.box()!;
    // Fit shows the frame at the canvas aspect, so the followed box contains the frame and the drawing reaches its edges
    expect(restored.minX.compare(frameBox.minX)).toBeLessThanOrEqual(0);
    expect(restored.maxX.compare(frameBox.maxX)).toBeGreaterThanOrEqual(0);
    expect(restored.minY.compare(frameBox.minY)).toBeLessThanOrEqual(0);
    expect(restored.maxY.compare(frameBox.maxY)).toBeGreaterThanOrEqual(0);
    expect(restored).not.toBe(zoomed);
    onBox(restored);
});

test('the follow box lies inside the view: after a zoom out, a zoom in and a lesson-like tighter view every "continues" marker is at least the pixel inset inside the board, on exact integers', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const insetPx = 16;
    const check = (view: [number, number, number, number]) => {
        act(() => { board.setBoundingBox(view, false); });
        const [left, top, right, bottom] = board.getBoundingBox();
        const box = graph.box()!;
        const [minX, maxX, minY, maxY] = [box.minX, box.maxX, box.minY, box.maxY].map(v => v.toNumber());
        for (const v of [minX, maxX, minY, maxY]) expect(Number.isInteger(v)).toBe(true);
        const insetX = insetPx * (right - left) / board.canvasWidth, insetY = insetPx * (top - bottom) / board.canvasHeight;
        expect(minX).toBeGreaterThanOrEqual(left + insetX - 1e-9);
        expect(maxX).toBeLessThanOrEqual(right - insetX + 1e-9);
        expect(minY).toBeGreaterThanOrEqual(bottom + insetY - 1e-9);
        expect(maxY).toBeLessThanOrEqual(top - insetY + 1e-9);
        const markers = named(graph, 'voronoi-continues');
        expect(markers.length).toBe(graph.drawingStats()!.continuesMarkers);
        expect(markers.length).toBeGreaterThan(0);
        for (const m of markers) {
            const mx = m.X!(), my = m.Y!();
            expect(mx).toBeGreaterThanOrEqual(left + insetX - 1e-9);
            expect(mx).toBeLessThanOrEqual(right - insetX + 1e-9);
            expect(my).toBeGreaterThanOrEqual(bottom + insetY - 1e-9);
            expect(my).toBeLessThanOrEqual(top - insetY + 1e-9);
        }
        const drawn = named(graph, 'voronoi-edges')[0];
        const touching = drawn.dataX!.map((px, i) => [px, drawn.dataY![i]]).filter(([px, py]) =>
            Number.isFinite(px) && (Math.abs(px - minX) < 1e-9 || Math.abs(px - maxX) < 1e-9 || Math.abs(py - minY) < 1e-9 || Math.abs(py - maxY) < 1e-9));
        expect(touching.length).toBeGreaterThan(0);
    };
    expect(board.canvasWidth).toBeGreaterThan(0);
    check([-40, 50, 60, -50]);
    check([-3, 8, 12, -2]);
    check([1.3, 6.2, 9.7, 0.4]);
});

test('a Preset stored before the diagram overlay existed (no diagram key) still imports and shows the diagram; an explicit false hides it and round trips', () => {
    const graph = new Observed();
    mount(graph);
    const data = serializePointSetModel(VORONOI_EXAMPLE);
    const oldGraphState = {initialized: true, cellSite: 2, construction: 1, query: {x: '1', y: '1'}, overlays: {delaunay: true}};
    expect(voronoiCollection.checkGraphState?.(oldGraphState)).toBeUndefined();
    act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: oldGraphState, data}); });
    expect([graph.overlayShown('diagram'), graph.overlayShown('delaunay'), graph.cellSite, graph.construction]).toEqual([true, true, 2, 1]);
    expect(readout('vertices')).toBeDefined();
    act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: {initialized: true}, data}); });
    expect(graph.overlayShown('diagram')).toBe(true);
    act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: {initialized: true, ...{overlays: {diagram: false}}}, data}); });
    expect(graph.overlayShown('diagram')).toBe(false);
    expect(document.querySelector('[data-voronoi="readout"]')).toBeNull();
    expect(graph.exportPreset().graphState).toMatchObject({overlays: {diagram: false}});
});

test('the Preset round trip keeps points, overlay, site, count and query; stale values are clamped; the collection validates', async () => {
    const graph = new Observed();
    mount(graph);
    act(() => { fireEvent.click(overlaySwitch()); });
    act(() => { fireEvent.click(siteButton(3)); });
    click('next-step');
    click('next-step');
    act(() => { expect(graph.setQueryText('5/2', '1')).toBe(true); });
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(VORONOI_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({cellSite: 3, construction: 2, query: {x: '5/2', y: '1'}, overlays: {delaunay: true}});
    expect(saved.graphState).not.toHaveProperty('model');
    click('reset-example');
    expect([graph.cellSite, graph.construction, graph.overlayShown('delaunay')]).toEqual([null, 0, false]);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.cellSite, graph.construction, graph.overlayShown('delaunay'), graph.query.x.format(), graph.query.y.format()]).toEqual([3, 2, true, '5/2', '1']);
    expect(graph.model.points).toEqual(VORONOI_EXAMPLE.points);

    const data = serializePointSetModel(VORONOI_EXAMPLE);
    const stored = (fields: object) => ({initialized: true, ...fields});
    act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: stored({cellSite: 99, construction: 5}), data}); });
    expect([graph.cellSite, graph.construction]).toEqual([null, 0]);
    act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: stored({cellSite: 2, construction: 99}), data}); });
    expect([graph.cellSite, graph.construction]).toEqual([2, 6]);
    // a Preset without the extra fields leaves no stale site, count or query
    act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: {initialized: true}, data}); });
    expect([graph.cellSite, graph.construction, graph.query.x.format()]).toEqual([null, 0, '4']);
});

test('every import refusal is a localized, actionable message', () => {
    const collection = voronoiCollection;
    const state = (fields: object) => collection.checkGraphState?.({initialized: true, ...fields});
    expect(collection.key).toBe('compgeo-voronoi');
    expect(state({cellSite: 2, construction: 3, query: {x: '1/2', y: '-3'}, overlays: {delaunay: true}})).toBeUndefined();
    expect(state({cellSite: null})).toBeUndefined();
    for (const bad of [{cellSite: 'a'}, {cellSite: 1.5}, {construction: -1}, {construction: 'x'}, {query: {x: 'a', y: '1'}}, {query: {x: '1'}}, {query: 4}, {query: {x: '1', y: '1/0'}}]) {
        expect(state(bad)?.key).toBe('vor_invalid_state');
    }
    expect(state({overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    const data = serializePointSetModel(VORONOI_EXAMPLE);
    expect('data' in collection.check(data)).toBe(true);
    const polygon = collection.check({...data, mode: 'polygon'});
    expect('rejection' in polygon && polygon.rejection.key).toBe('vor_invalid_mode');
    expect('rejection' in collection.check({...data, points: Array.from({length: 41}, (_, i) => ({x: i, y: (i * i) % 7}))})).toBe(true);
    expect('rejection' in collection.check({...data, points: [{x: 1e9, y: 0}]})).toBe(true);
    expect('rejection' in collection.check('nonsense')).toBe(true);
    // both messages exist in both languages and tell the student what to do
    setLanguage('sl');
    expect(t('vor_invalid_state')).toContain('popravi');
    expect(t('vor_invalid_mode')).toContain('popravi');
    setLanguage('en');
    expect(t('vor_invalid_state')).toMatch(/fix|correct/i);
    expect(t('vor_invalid_mode')).toMatch(/fix|correct/i);
});

test('a live language switch re-renders the panel and the query text', () => {
    const graph = new Observed();
    mount(graph);
    expect(readout('sites')).toBe('Mest: 7');
    expect(languageListeners.live).toBeGreaterThan(0);
    act(() => { setLanguage('en'); });
    expect(readout('sites')).toBe('Sites: 7');
    expect(part('query-nearest')).toContain('P6');
    expect(part('query-nearest')).not.toContain('Najbližje');
    expect(document.querySelector(`label[for="${overlaySwitch().id}"]`)?.textContent).toContain('Duality');
});

test('unmount and a scene change leave no objects or listeners (the graph schedules no timers)', async () => {
    const graph = new Observed();
    const view = mount(graph);
    const board = graph.liveBoard();
    const box = board.containerObj as HTMLElement;
    const remove = vi.spyOn(box, 'removeEventListener');
    act(() => { fireEvent.click(overlaySwitch()); });
    act(() => { fireEvent.click(triangleButton(0)); });
    act(() => { fireEvent.click(siteButton(0)); });
    click('next-step');
    act(() => { graph.saveCurrentPreset('mine'); });
    const ours = () => (board.objectsList as unknown as Shown[]).filter(o => /^voronoi-/.test(o.name ?? '')).length;
    expect(ours()).toBeGreaterThan(10);
    await settle(() => graph.selectPreset('mine'));
    expect(ours()).toBeGreaterThan(10);
    act(() => { graph.setOverlay('delaunay', false); });
    expect(named(graph, 'voronoi-delaunay-hull')).toHaveLength(0);
    expect(named(graph, 'voronoi-selected-circle')).toHaveLength(0);
    expect(languageListeners.live).toBeGreaterThan(0);
    view.unmount();
    expect(ours()).toBe(0);
    expect(languageListeners.live).toBe(0);
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});

test('the starting view frames the example sites', () => {
    const graph = new Observed();
    mount(graph);
    const [left, top, right, bottom] = graph.liveBoard().getBoundingBox();
    for (const p of VORONOI_EXAMPLE.points) {
        const at = gridToBoard(p, 0);
        expect(at.x >= left && at.x <= right && at.y >= bottom && at.y <= top).toBe(true);
    }
});

describe('review fixes', () => {
    test('a bare importPresetData resets the site, count and query; the Preset route still carries them', () => {
        const graph = new Observed();
        mount(graph);
        act(() => { graph.selectSite(2); });
        click('next-step');
        click('query-right');
        expect([graph.cellSite, graph.construction, graph.query.x.format()]).toEqual([2, 1, '9/2']);
        act(() => { graph.importPresetData(serializePointSetModel(VORONOI_EXAMPLE)); });
        expect(graph.cellSite).toBeNull();
        expect(graph.construction).toBe(0);
        expect(graph.queryTextOf()).toEqual(VORONOI_DEFAULT_QUERY);
        // a second bare import must not reuse an earlier Preset's values either
        act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: {initialized: true, ...{cellSite: 3, construction: 2, query: {x: '1', y: '1'}}}, data: serializePointSetModel(VORONOI_EXAMPLE)}); });
        expect([graph.cellSite, graph.construction, graph.queryTextOf()]).toEqual([3, 2, {x: '1', y: '1'}]);
        act(() => { graph.importPresetData(serializePointSetModel(VORONOI_EXAMPLE)); });
        expect([graph.cellSite, graph.construction, graph.queryTextOf()]).toEqual([null, 0, VORONOI_DEFAULT_QUERY]);
    });

    test('the query answer is announced; a move beyond the coordinate limit is refused without a notice', () => {
        const graph = new Observed();
        mount(graph);
        expect(live()).toContain('Točka poizvedbe: (4, 2).');
        expect(live()).toContain(part('query-nearest')!);
        click('query-right');
        expect(live()).toContain('(9/2, 2)');
        act(() => { graph.setQueryText(String(graph.coordinateLimit), '0'); });
        click('query-right');
        expect(graph.query.x.format()).toBe(String(graph.coordinateLimit));
        expect(document.querySelector('[data-voronoi="query-invalid"]')).toBeNull();
    });

    test('the chosen site carries a ring marker from count 0, removed with the choice', () => {
        const graph = new Observed();
        mount(graph);
        expect(named(graph, 'voronoi-chosen-site')).toHaveLength(0);
        act(() => { graph.selectSite(1); });
        const ring = named(graph, 'voronoi-chosen-site');
        expect(ring).toHaveLength(1);
        expect([ring[0].X!(), ring[0].Y!()]).toEqual([graph.model.points[1].x, graph.model.points[1].y]);
        click('next-step');
        expect(named(graph, 'voronoi-chosen-site')).toHaveLength(1);
        act(() => { graph.selectSite(null); });
        expect(named(graph, 'voronoi-chosen-site')).toHaveLength(0);
    });

    test('the triangle list follows the overlay switch in the DOM; the selected vertex differs from the degree-4 diamond', () => {
        const graph = new Observed();
        mount(graph);
        act(() => { fireEvent.click(overlaySwitch()); });
        const list = document.querySelector('[data-voronoi="triangles"]')!;
        expect(overlaySwitch().compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        act(() => { fireEvent.click(triangleButton(0)); });
        const face = (name: string) => named(graph, name)[0]?.visProp?.face;
        expect(face('voronoi-selected-vertex')).not.toBe('diamond');
    });
});

test('a reset after a grid step change draws the exact frame again, as a newly mounted graph does', () => {
    const graph = new Observed();
    mount(graph);
    const board = graph.liveBoard();
    const start = board.getBoundingBox() as [number, number, number, number];
    const fresh = graph.box()!;
    const frameOf = (box: {minX: Rational; maxX: Rational; minY: Rational; maxY: Rational}) => [box.minX, box.maxX, box.minY, box.maxY].map(v => v.toNumber());
    // The sites move to a coarser grid, and the board is told of a view that is the starting one in board coordinates.
    act(() => { graph.importPresetData({...serializePointSetModel(VORONOI_EXAMPLE), gridStepExponent: 1}); });
    act(() => { board.setBoundingBox([-40, 50, 60, -50], false); });
    act(() => { board.setBoundingBox(start, true); });
    act(() => { graph.importPresetData(serializePointSetModel(VORONOI_EXAMPLE)); });
    expect(frameOf(graph.box()!)).toEqual(frameOf(fresh));
});
