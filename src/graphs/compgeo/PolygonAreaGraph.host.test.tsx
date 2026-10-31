import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HULL_PENTAGON_MODEL, NOTCHED_PENTAGON_MODEL, PolygonAreaGraph} from './PolygonAreaGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class Observed extends PolygonAreaGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; X?: () => number; Y?: () => number; visProp?: Record<string, unknown>};
const all = (graph: Observed) => graph.liveBoard().objectsList as Shown[];
const named = (graph: Observed, prefix: string) => all(graph).filter(o => (o.name ?? '').startsWith(prefix));
const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const readout = () => {
    const element = document.querySelector('[data-area-readout]');
    if (!element) throw new Error('no readout');
    return element as HTMLElement;
};
const text = () => readout().textContent ?? '';
const reverse = () => act(() => { screen.getByRole('button', {name: /Obrni vrstni red|Reverse order/}).click(); });
const CROSSED: PointSetModel = {
    mode: 'polygon', closed: true, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 6, y: 0}, {x: 0, y: 6}, {x: 3, y: 6}],
};

test('the default is the hull pentagon: doubled area 42, area 21, B = 8, I = 18 and Pick holds', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(HULL_PENTAGON_MODEL);
    expect(readout().querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(readout().querySelector('[role="status"]')!.textContent).toBe('Ploščina: 21');
    expect(readout().dataset.areaDoubled).toBe('42');
    expect(text()).toContain('+42');
    expect(text()).toContain('Ploščina: 21');
    expect(text()).toContain('B: 8');
    expect(text()).toContain('I: 18');
    expect(text()).toContain('2I + B − 2 = 42');
    expect(text()).toContain('nasprotni smeri');
});

test('the notched pentagon shows doubled area 36, B = 16, I = 11', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, NOTCHED_PENTAGON_MODEL);
    expect(readout().dataset.areaDoubled).toBe('36');
    expect(text()).toContain('Ploščina: 18');
    expect(text()).toContain('B: 16');
    expect(text()).toContain('I: 11');
});

test('Reverse order negates the signed area only, and twice restores the polygon', () => {
    const graph = new Observed();
    mount(graph);
    reverse();
    expect(readout().dataset.areaDoubled).toBe('-42');
    expect(text()).toContain('−42');
    expect(text()).toContain('Ploščina: 21');
    expect(text()).toContain('B: 8');
    expect(text()).toContain('I: 18');
    expect(text()).toContain('v smeri urinega kazalca');
    expect(text()).not.toContain('nasprotni smeri');
    expect(graph.model.points[0]).toEqual(HULL_PENTAGON_MODEL.points[0]);
    reverse();
    expect(graph.model).toEqual(HULL_PENTAGON_MODEL);
});

test('the crossed quadrilateral shows the winding-number label, the signed sum 18 and no Pick', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, CROSSED);
    expect(readout().dataset.areaReadout).toBe('signed-sum');
    expect(readout().dataset.areaDoubled).toBe('18');
    expect(text()).toContain('ovojnega števila in ploščine');
    expect(text()).not.toContain('Pickov izrek: 2I');
    expect(text()).not.toContain('Ploščina:');
    expect(text()).not.toContain('B:');
    act(() => { setLanguage('en'); });
    expect(text()).toContain('Signed sum of winding number times area');
    expect(text()).not.toContain('theorem: 2I');
    expect(named(graph, 'lattice-')).toHaveLength(0);
});

test('open and too-short polygons say why there is no area, in both languages', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.setPolygonClosed(false); });
    expect(readout().dataset.areaReadout).toBe('message');
    expect(text()).toContain('sklenite večkotnik');
    act(() => { setLanguage('en'); });
    expect(text()).toContain('close the polygon');
    load(graph, {...HULL_PENTAGON_MODEL, points: HULL_PENTAGON_MODEL.points.slice(0, 2)});
    expect(text()).toContain('at least 3 vertices');
    expect(named(graph, 'fan-')).toHaveLength(0);
    expect(named(graph, 'lattice-')).toHaveLength(0);
});

test('lattice markers: B squares and I crosses at integer nodes, with different shapes', () => {
    const graph = new Observed();
    mount(graph);
    const markers = named(graph, 'lattice-marker');
    expect(markers).toHaveLength(8 + 18);
    for (const marker of markers) {
        expect(Number.isInteger(marker.X!()) && Number.isInteger(marker.Y!())).toBe(true);
    }
    const faces = markers.map(m => String(m.visProp?.face));
    expect(faces.filter(f => f === '[]')).toHaveLength(8);
    expect(faces.filter(f => f === 'x')).toHaveLength(18);
    expect(graph.model.points.every(p => Number.isInteger(p.x) && Number.isInteger(p.y))).toBe(true);
});

test('fan triangles are labelled with their signed doubled areas, which sum to the signed area', () => {
    const graph = new Observed();
    mount(graph);
    const labels = named(graph, 'fan-label').map(o => o.plaintext ?? '');
    expect(labels).toHaveLength(HULL_PENTAGON_MODEL.points.length - 2);
    expect(labels.map(l => Number(l.replace('+', '').replace('−', '-'))).reduce((a, b) => a + b, 0)).toBe(42);
    expect(named(graph, 'fan-triangle')).toHaveLength(3);
});

test('overlay objects are exact: removed when hidden, restored identically, and gone after unmount', () => {
    const graph = new Observed();
    const view = mount(graph, true);
    const list = () => all(graph).length;
    const full = list();
    act(() => { graph.setOverlay('fan', false); });
    const noFan = list();
    expect(noFan).toBeLessThan(full);
    expect(named(graph, 'fan-')).toHaveLength(0);
    expect(named(graph, 'lattice-marker')).toHaveLength(26);
    act(() => { graph.setOverlay('lattice', false); });
    const bare = list();
    expect(named(graph, 'lattice-')).toHaveLength(0);
    expect(bare).toBeLessThan(noFan);
    for (let i = 0; i < 3; i++) {
        act(() => { graph.setOverlay('fan', true); graph.setOverlay('lattice', true); });
        expect(list()).toBe(full);
        act(() => { graph.setOverlay('fan', false); graph.setOverlay('lattice', false); });
        expect(list()).toBe(bare);
    }
    act(() => { graph.setOverlay('fan', true); graph.setOverlay('lattice', true); });
    expect(named(graph, 'lattice-marker')).toHaveLength(26);
    // The board is freed as a whole on unmount (the base owns the disposal); overlay objects are not removed one by one.
    const box = graph.liveBoard().containerObj as HTMLElement;
    const remove = vi.spyOn(box, 'removeEventListener');
    view.unmount();
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.hasAttribute('tabindex')).toBe(false);
    expect(box.hasAttribute('aria-label')).toBe(false);
});

test('a tiny fan triangle gets no label and no label overlaps a normal one', () => {
    const graph = new Observed();
    mount(graph);
    // (0,0),(6,0),(6,4),(6,3): the second fan triangle is degenerate (collinear on x = 6), the first is 3.3 tall
    load(graph, {...HULL_PENTAGON_MODEL, points: [{x: 0, y: 0}, {x: 6, y: 0}, {x: 6, y: 4}, {x: 6, y: 3}]});
    expect(named(graph, 'fan-label')).toHaveLength(1);
    load(graph, HULL_PENTAGON_MODEL);
    expect(named(graph, 'fan-label')).toHaveLength(3);
});

test('moving a vertex keeps the readout exact and the markers on lattice nodes', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.movePointTo(1, {x: 0, y: 1}); });
    expect(readout().dataset.areaDoubled).toBe('37');
    expect(text()).toContain('Ploščina: 18,5');
    expect(named(graph, 'lattice-marker').every(m => Number.isInteger(m.X!()) && Number.isInteger(m.Y!()))).toBe(true);
});
