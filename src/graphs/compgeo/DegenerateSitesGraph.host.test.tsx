import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {READOUT_SETTLE_MS} from '../base/controls/LiveReadout';
import {MemoryRouter} from 'react-router-dom';
import {DegenerateSitesGraph} from './DegenerateSitesGraph';
import {VoronoiGraph} from './VoronoiGraph';
import {DEGENERATE_EXAMPLES, DEGENERATE_PRESET_KEY, degenerateCollection, degenerateExampleModel} from './degenerateSitesPresets';
import {VORONOI_EXAMPLE, VORONOI_PRESET_KEY, voronoiCollection} from './voronoiPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {serializePointSetModel} from '../../compgeo/pointSetModel';
import {enterNumber} from '../../inputs/testEntry';
import {incircleValue} from '../../compgeo/predicates';
import {setLanguage, t} from '../../localization';
/** The readouts of a point-set trace graph publish after a quiet period; wait it out. */
const settled = () => act(async () => { await new Promise(resolve => setTimeout(resolve, READOUT_SETTLE_MS + 100)); });

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

class Observed extends DegenerateSitesGraph {
    liveBoard() { return this.board; }
}
class ObservedVoronoi extends VoronoiGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string};
const objects = (graph: {liveBoard(): JXG.Board}) => graph.liveBoard().objectsList as unknown as Shown[];
const named = (graph: {liveBoard(): JXG.Board}, name: string) => objects(graph).filter(o => o.name === name);
const mount = (graph: Observed | ObservedVoronoi) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const four = (name: string) => document.querySelector(`[data-fourpoint="${name}"]`)?.textContent ?? '';
const part = (name: string) => document.querySelector(`[data-voronoi="${name}"]`)?.textContent;
const boardContainer = () => document.querySelector(`[aria-label="${t('pointset_board_label')}"]`) as HTMLElement;
const live = () => document.querySelector('[data-voronoi-live]')?.textContent ?? '';
const exampleSelect = () => screen.getByLabelText(t('deg_example_group')) as HTMLSelectElement;
const modeSelect = () => screen.getByLabelText(t('deg_mode_group')) as HTMLSelectElement;
const optionText = (select: HTMLSelectElement, value: string) => [...select.options].find(o => o.value === value)?.textContent;
const chooseExample = (id: string) => act(() => { fireEvent.change(exampleSelect(), {target: {value: id}}); });
const chooseMode = (mode: 'sites' | 'four-point') => act(() => { fireEvent.change(modeSelect(), {target: {value: mode}}); });
const clickButton = (button: HTMLButtonElement) => act(() => { fireEvent.click(button); });
const sitePoints = (graph: Observed) => objects(graph).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? ''));
const trigger = (target: object, name: string) => (target as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers([name], []);
const dragSite = (graph: Observed, index: number, x: number, y: number) => {
    const point = sitePoints(graph)[index] as unknown as JXG.Point;
    act(() => { point.moveTo([x, y], 0); trigger(point, 'drag'); });
};
const move = (graph: Observed, index: number, x: number, y: number) => act(() => { expect(graph.movePointTo(index, {x, y})).toBe(true); });
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
const legalDiagonals = () => [...document.querySelectorAll('[data-fourpoint="diagonals"] li')].map(li => li.textContent ?? '').filter(text => /je dovoljena\./.test(text));

test('the graph starts in four-point mode on the unit square: D = 0, one degree-4 vertex, both diagonals legal, the not-unique note', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.mode).toBe('four-point');
    expect(graph.model.points).toEqual(DEGENERATE_EXAMPLES.square.points);
    expect(graph.presets()).toBe(DEGENERATE_PRESET_KEY);
    expect(four('incircle')).toContain('D = 0');
    expect(four('incircle')).toContain('na krožnici');
    expect(four('incircle')).toContain('P1, P2, P3');
    expect(four('vertices')).toBe('Voronojeva oglišča: 1; stopnje: 4.');
    expect(document.querySelectorAll('[data-fourpoint="diagonals"] li')).toHaveLength(2);
    expect(legalDiagonals()).toEqual(['Diagonala P1–P3 je dovoljena.', 'Diagonala P2–P4 je dovoljena.']);
    expect(four('verdict')).toContain('ni enolična');
    expect(graph.diagram()!.vertices).toHaveLength(1);
    expect(graph.diagram()!.vertices[0].sites).toHaveLength(4);
    expect(graph.drawingStats()).toMatchObject({vertexMarkers: 1});
    expect(part('four-fixed')).toContain('natanko štiri');
});

test('the trapezoid behaves the same', () => {
    const graph = new Observed();
    mount(graph);
    chooseExample('trapezoid');
    expect(graph.model.points).toEqual(DEGENERATE_EXAMPLES.trapezoid.points);
    expect(graph.mode).toBe('four-point');
    expect(four('incircle')).toContain('D = 0');
    expect(four('vertices')).toBe('Voronojeva oglišča: 1; stopnje: 4.');
    expect(legalDiagonals()).toHaveLength(2);
    expect(four('verdict')).toContain('ni enolična');
});

test('one corner one grid step off: D = 2, two degree-3 vertices, one named legal diagonal; moved back, degree 4; the graph moves nothing itself', () => {
    const graph = new Observed();
    mount(graph);
    move(graph, 2, 1, 2);
    expect(graph.model.points).toEqual([{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 2}, {x: 0, y: 1}]);
    expect(four('incircle')).toContain('D = 2');
    expect(four('incircle')).toContain('znotraj krožnice');
    expect(four('vertices')).toBe('Voronojeva oglišča: 2; stopnje: 3, 3.');
    expect(graph.diagram()!.vertices.map(v => v.sites.length)).toEqual([3, 3]);
    expect(legalDiagonals()).toEqual(['Diagonala P2–P4 je dovoljena.']);
    expect(four('verdict')).toBe('Dovoljena je samo diagonala P2–P4, zato je Delaunayeva triangulacija enolična.');
    move(graph, 2, 1, 1);
    expect(four('incircle')).toContain('D = 0');
    expect(four('vertices')).toBe('Voronojeva oglišča: 1; stopnje: 4.');
    expect(legalDiagonals()).toHaveLength(2);
});

test('the near-circle example is outside by one step, and moving P4 onto the circle gives a degree-4 vertex', () => {
    const graph = new Observed();
    mount(graph);
    chooseExample('near');
    expect(four('incircle')).toContain('D = -30');
    expect(four('incircle')).toContain('zunaj krožnice');
    expect(four('vertices')).toBe('Voronojeva oglišča: 2; stopnje: 3, 3.');
    move(graph, 3, 0, -5);
    expect(four('incircle')).toContain('D = 0');
    expect(four('vertices')).toBe('Voronojeva oglišča: 1; stopnje: 4.');
});

test('a clockwise first triple is read counter-clockwise', () => {
    const graph = new Observed();
    mount(graph);
    act(() => { graph.loadModel(serializePointSetModel({...VORONOI_EXAMPLE, points: [{x: 0, y: 0}, {x: 0, y: 4}, {x: 4, y: 0}, {x: 1, y: 1}]})); });
    expect(four('incircle')).toContain('P1, P3, P2');
    expect(four('incircle')).toContain(`D = ${incircleValue({x: 0, y: 0}, {x: 4, y: 0}, {x: 0, y: 4}, {x: 1, y: 1})}`);
});

test('five collinear sites: four parallel lines, no vertices, no Delaunay triangles, and a visible, announced explanation in both languages', async () => {
    const graph = new Observed();
    mount(graph);
    chooseExample('collinear');
    expect(graph.mode).toBe('sites');
    expect(graph.model.points).toHaveLength(5);
    const diagram = graph.diagram()!;
    expect(diagram.edges.filter(e => e.kind === 'line')).toHaveLength(4);
    expect(diagram.vertices).toHaveLength(0);
    expect(graph.delaunay()).toBeUndefined();
    expect(document.querySelector('[data-readout="lines"]')?.textContent).toBe('Premic: 4');
    expect(document.querySelector('[data-readout="vertices"]')?.textContent).toBe('Voronojevih oglišč: 0');
    // the board is not empty: the lines are drawn
    expect(named(graph, 'voronoi-edges')).toHaveLength(1);
    expect(graph.drawingStats()).toMatchObject({lines: 4, vertexMarkers: 0});
    expect(part('collinear')).toContain('triangulacije ni');
    await settled();
    expect(live()).toContain('triangulacije ni');
    act(() => { setLanguage('en'); });
    expect(part('collinear')).toContain('there is no triangulation');
    await settled();
    expect(live()).toContain('there is no triangulation');
});

test('duplicates are refused with the message, never moved or merged, including a drag onto an existing site', () => {
    const graph = new Observed();
    mount(graph);
    const before = graph.model.points;
    dragSite(graph, 2, 0, 0);
    expect(graph.model.points).toEqual([{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 0}, {x: 0, y: 1}]);
    expect(part('refusal')).toBe('Mesti P1 in P3 sta enaki; premakni eno od njiju.');
    expect(document.querySelector('[data-fourpoint="incircle"]')).toBeNull();
    expect(graph.drawingStats()).toBeUndefined();
    expect(named(graph, 'voronoi-cell')).toHaveLength(0);
    // the user moves it away; nothing was merged
    dragSite(graph, 2, 1, 1);
    expect(graph.model.points).toEqual(before);
    expect(part('refusal')).toBeUndefined();
    expect(four('incircle')).toContain('D = 0');
});

describe('modes', () => {
    test('switching keeps the sites and recomputes the readouts; four-point needs exactly four sites', () => {
        const graph = new Observed();
        mount(graph);
        chooseExample('collinear');
        const five = graph.model.points;
        chooseMode('four-point');
        expect(graph.mode).toBe('sites');
        expect(graph.model.points).toBe(five);
        expect(part('mode-refused')).toBe('Za način štirih točk potrebuješ natanko štiri mesta, zdaj jih je 5; dodaj ali odstrani mesta in poskusi znova.');
        expect(modeSelect().value).toBe('sites');
        // an edit retires the refusal
        act(() => { expect(graph.removeSelected()).toBe(false); graph.select(0); expect(graph.removeSelected()).toBe(true); });
        expect(part('mode-refused')).toBeUndefined();
        expect(graph.model.points).toHaveLength(4);
        const four4 = graph.model.points;
        chooseMode('four-point');
        expect(graph.mode).toBe('four-point');
        expect(graph.model.points).toBe(four4);
        // the four remaining sites are still collinear: no circle, no determinant, and the collinear explanation
        expect(four('incircle')).toBe('Prve tri točke ležijo na isti premici, zato skoznje ni krožnice in vrednosti preizkusa ni.');
        expect(four('vertices')).toBe('Voronojevih oglišč ni.');
        expect(four('verdict')).toContain('strogo konveksni');
        expect(part('collinear')).toContain('triangulacije ni');
        chooseMode('sites');
        expect(graph.mode).toBe('sites');
        expect(document.querySelector('[data-fourpoint="incircle"]')).toBeNull();
        expect(graph.model.points).toBe(four4);
        chooseMode('four-point');
        expect(four('vertices')).toBe('Voronojevih oglišč ni.');
    });

    test('four-point mode holds exactly four sites; sites mode takes up to 40', () => {
        const graph = new Observed();
        mount(graph);
        expect(graph.pointLimit).toBe(4);
        act(() => { expect(graph.addPointAt({x: 5, y: 5})).toBe(false); });
        expect(graph.model.points).toHaveLength(4);
        expect(document.querySelector('[data-pointset-notice]')?.textContent).toContain('4');
        graph.select(1);
        act(() => { expect(graph.removeSelected()).toBe(false); expect(graph.clear()).toBe(false); });
        expect(graph.model.points).toHaveLength(4);
        chooseMode('sites');
        expect(graph.pointLimit).toBe(40);
        act(() => { expect(graph.addPointAt({x: 5, y: 5})).toBe(true); });
        expect(graph.model.points).toHaveLength(5);
        // four-point mode with five sites is refused again
        chooseMode('four-point');
        expect(graph.mode).toBe('sites');
    });

    test('an edit resets derived state (C1): the chosen site and construction clear', () => {
        const graph = new Observed();
        mount(graph);
        act(() => { graph.selectSite(1); });
        act(() => { graph.constructNext(); });
        expect([graph.cellSite, graph.construction]).toEqual([1, 1]);
        move(graph, 2, 1, 2);
        expect([graph.cellSite, graph.construction]).toEqual([null, 0]);
    });

    test('the Voronoi graph keeps `sites` as its default, offers no mode switch and refuses four-point with other than four sites', () => {
        const graph = new ObservedVoronoi();
        mount(graph);
        expect(graph.mode).toBe('sites');
        expect(screen.queryByLabelText(t('deg_mode_group'))).toBeNull();
        expect(document.querySelector('[data-voronoi="four-point"]')).toBeNull();
        act(() => { expect(graph.setMode('four-point')).toBe(false); });
        expect(graph.mode).toBe('sites');
        expect(graph.model.points).toEqual(VORONOI_EXAMPLE.points);
    });

    test('four-point mode with other than four sites (a lesson-style load) shows the count message instead of a readout', () => {
        const graph = new Observed();
        mount(graph);
        act(() => { graph.loadModel(serializePointSetModel({...VORONOI_EXAMPLE, points: [{x: 0, y: 0}, {x: 2, y: 0}, {x: 1, y: 3}]})); });
        expect(graph.mode).toBe('four-point');
        expect(part('wrong-count')).toContain('natanko štiri mesta, zdaj jih je 3');
        expect(document.querySelector('[data-fourpoint="incircle"]')).toBeNull();
    });
});

describe('keyboard and numeric entry reach the on-circle position (C5)', () => {
    test('arrow keys move the selected site one grid step; the numeric fields set a coordinate', () => {
        const graph = new Observed();
        mount(graph);
        act(() => { graph.select(2); });
        act(() => { fireEvent.keyDown(boardContainer(), {key: 'ArrowUp'}); });
        expect(graph.model.points[2]).toEqual({x: 1, y: 2});
        expect(four('incircle')).toContain('D = 2');
        act(() => { fireEvent.keyDown(boardContainer(), {key: 'ArrowDown'}); });
        expect(four('incircle')).toContain('D = 0');
        const field = screen.getByLabelText('P3, y');
        act(() => { enterNumber(field, '2'); });
        expect(graph.model.points[2]).toEqual({x: 1, y: 2});
        expect(four('incircle')).toContain('D = 2');
        act(() => { enterNumber(field, '1'); });
        expect(four('incircle')).toContain('D = 0');
        expect(graph.model.points).toEqual(DEGENERATE_EXAMPLES.square.points);
    });

    test('the mode switch and the example chooser are the shared selects, showing the mode and the matching example', () => {
        const graph = new Observed();
        mount(graph);
        expect(modeSelect().value).toBe('four-point');
        expect(optionText(modeSelect(), 'four-point')).toBe('Štiri točke');
        expect(exampleSelect().value).toBe('square');
        expect(live()).toContain('na krožnici');
        expect([...exampleSelect().options].map(o => o.value)).toEqual(['square', 'trapezoid', 'near', 'collinear']);
        chooseExample('near');
        expect(exampleSelect().value).toBe('near');
        dragSite(graph, 0, 0, 1);
        expect(exampleSelect().value).toBe('custom');
    });
});

describe('Presets', () => {
    test('round trip keeps the mode; an example restores; Reset example returns to the square in four-point mode', async () => {
        const graph = new Observed();
        mount(graph);
        chooseExample('collinear');
        act(() => { graph.saveCurrentPreset('mine'); });
        const saved = graph.exportPreset();
        expect(saved.id).toBe(DEGENERATE_PRESET_KEY);
        expect(saved.graphState).toMatchObject({mode: 'sites'});
        clickButton(document.querySelector('button[data-action="reset-example"]') as HTMLButtonElement);
        expect(graph.mode).toBe('four-point');
        expect(graph.model.points).toEqual(DEGENERATE_EXAMPLES.square.points);
        await settle(() => graph.selectPreset('mine'));
        expect(graph.mode).toBe('sites');
        expect(graph.model.points).toEqual(DEGENERATE_EXAMPLES.collinear.points);
        chooseExample('near');
        expect(graph.exportPreset().graphState).toMatchObject({mode: 'four-point'});
    });

    const stored = (fields: object) => ({initialized: true, ...fields});
    test('mode is optional on import and defaults to sites; four-point with other than four sites falls back to sites without moving a site', () => {
        const graph = new Observed();
        mount(graph);
        const data = degenerateExampleModel('square');
        act(() => { graph.importPreset({id: DEGENERATE_PRESET_KEY, graphState: {initialized: true}, data}); });
        expect(graph.mode).toBe('sites');
        act(() => { graph.importPreset({id: DEGENERATE_PRESET_KEY, graphState: stored({mode: 'four-point'}), data}); });
        expect(graph.mode).toBe('four-point');
        const five = degenerateExampleModel('collinear');
        act(() => { graph.importPreset({id: DEGENERATE_PRESET_KEY, graphState: stored({mode: 'four-point'}), data: five}); });
        expect(graph.mode).toBe('sites');
        expect(graph.model.points).toEqual(DEGENERATE_EXAMPLES.collinear.points);
    });

    test('degenerate-sites Presets without a diagram key still import and show the diagram', () => {
        const graph = new Observed();
        mount(graph);
        const data = degenerateExampleModel('square');
        const oldGraphState = {initialized: true, mode: 'four-point', overlays: {delaunay: true}};
        expect(degenerateCollection.checkGraphState?.(oldGraphState)).toBeUndefined();
        act(() => { graph.importPreset({id: DEGENERATE_PRESET_KEY, graphState: oldGraphState, data}); });
        expect([graph.mode, graph.overlayShown('diagram'), graph.overlayShown('delaunay')]).toEqual(['four-point', true, true]);
        expect(graph.exportPreset().id).toBe(DEGENERATE_PRESET_KEY);
    });

    test('Presets saved by the Voronoi graph before modes existed still load', () => {
        const stored = (fields: object) => ({initialized: true, ...fields});
        const graph = new ObservedVoronoi();
        mount(graph);
        const data = serializePointSetModel(VORONOI_EXAMPLE);
        expect(voronoiCollection.checkGraphState?.({initialized: true, cellSite: 2, construction: 1, query: {x: '1', y: '1'}, overlays: {delaunay: true}})).toBeUndefined();
        act(() => { graph.importPreset({id: VORONOI_PRESET_KEY, graphState: stored({cellSite: 2, construction: 1}), data}); });
        expect(graph.mode).toBe('sites');
        expect([graph.cellSite, graph.construction]).toEqual([2, 1]);
        expect(graph.exportPreset().graphState).toMatchObject({mode: 'sites'});
    });

    test('every import refusal is a localized, actionable message, an unknown mode included', () => {
        const state = (fields: object) => degenerateCollection.checkGraphState?.({initialized: true, ...fields});
        expect(degenerateCollection.key).toBe('compgeo-voronoi-degenerate');
        expect(state({mode: 'sites'})).toBeUndefined();
        expect(state({mode: 'four-point', cellSite: 1, construction: 0, query: {x: '1', y: '2'}})).toBeUndefined();
        expect(state({})).toBeUndefined();
        for (const bad of [{mode: 'five-point'}, {mode: 4}, {mode: null}, {mode: ''}]) expect(state(bad)?.key).toBe('deg_invalid_mode');
        expect(state({cellSite: 'a'})?.key).toBe('vor_invalid_state');
        expect(state({overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
        const data = degenerateExampleModel('square');
        expect('data' in degenerateCollection.check(data)).toBe(true);
        const polygon = degenerateCollection.check({...data, mode: 'polygon'});
        expect('rejection' in polygon && polygon.rejection.key).toBe('vor_invalid_mode');
        expect('rejection' in degenerateCollection.check({...data, points: Array.from({length: 41}, (_, i) => ({x: i, y: (i * i) % 7}))})).toBe(true);
        expect('rejection' in degenerateCollection.check('nonsense')).toBe(true);
        setLanguage('sl');
        expect(t('deg_invalid_mode')).toContain('popravi');
        setLanguage('en');
        expect(t('deg_invalid_mode')).toMatch(/fix/i);
    });
});

test('a live language switch re-renders the readout, the mode switch and the examples', async () => {
    const graph = new Observed();
    mount(graph);
    expect(languageListeners.live).toBeGreaterThan(0);
    act(() => { setLanguage('en'); });
    expect(four('incircle')).toBe('Incircle test for P1, P2, P3 (counter-clockwise) and P4: D = 0; point P4 lies on the circle through P1, P2, P3, so the points are cocircular.');
    expect(four('vertices')).toBe('Voronoi vertices: 1; degrees: 4.');
    expect(four('verdict')).toContain('not unique');
    expect(optionText(modeSelect(), 'four-point')).toBe('Four points');
    expect(optionText(exampleSelect(), 'collinear')).toBe('Five collinear points');
    await settled();
    expect(live()).toContain('on the circle');
});

test('unmount leaves no objects or listeners', () => {
    const graph = new Observed();
    const view = mount(graph);
    const board = graph.liveBoard();
    const box = board.containerObj as HTMLElement;
    chooseExample('near');
    const ours = () => (board.objectsList as unknown as Shown[]).filter(o => /^voronoi-/.test(o.name ?? '')).length;
    expect(ours()).toBeGreaterThan(3);
    view.unmount();
    expect(ours()).toBe(0);
    expect(languageListeners.live).toBe(0);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});

describe('four-point readout group and live region', () => {
    test('the readout is a named group', () => {
        mount(new Observed());
        const group = screen.getByRole('group', {name: t('deg_readout_label')});
        expect(group.getAttribute('data-voronoi')).toBe('four-point');
        expect(group.querySelector('[data-fourpoint="incircle"]')).not.toBeNull();
    });

    test('the live text changes when the sign changes, not when only the determinant does', async () => {
        const graph = new Observed();
        mount(graph);
        act(() => { graph.select(2); });
        const onCircle = live();
        expect(onCircle).toContain(t('deg_say_on'));
        expect(onCircle).not.toContain('D = ');
        act(() => { fireEvent.keyDown(boardContainer(), {key: 'ArrowUp'}); });
        await settled();
        const inside = live();
        expect(inside).toContain(t('deg_say_inside'));
        expect(inside).not.toBe(onCircle);
        const full = four('incircle');
        act(() => { fireEvent.keyDown(boardContainer(), {key: 'ArrowUp'}); });
        expect(four('incircle')).not.toBe(full);
        expect(live()).toBe(inside);
    });
});
