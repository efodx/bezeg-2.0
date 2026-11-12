import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {VoronoiGraph} from './VoronoiGraph';
import {DegenerateSitesGraph} from './DegenerateSitesGraph';
import {PointInPolygonGraph} from './PointInPolygonGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {Preset} from '../base/presets/Presets';
import type {PointSetGraphState} from './PointSetGraph';
import type {PointSetModel} from '../../compgeo/pointSetModel';
import {PointSetExtension, pointSetPersistence, PointSetSceneState} from './pointSetPersistence';
import {VORONOI_OVERLAY_IDS, VORONOI_PRESET_KEY} from './voronoiPresetCollection';
import {DEGENERATE_PRESET_KEY} from './degenerateSitesPresets';
import {POINT_IN_POLYGON_OVERLAY_IDS, POINT_IN_POLYGON_PRESET_KEY} from './pointInPolygonPresetCollection';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// Voronoi, degenerate sites and point in polygon (task 08 batch 5) declare their persisted scene through
// `pointSetPersistence(ids, extension)`: `data` is the point set, `graphState` is `initialized`, the overlays and the named
// fields (Voronoi: cellSite, construction, query, mode; point in polygon: query). Every expected value is authored by hand.

type Point = [number, number];
const model = (list: Point[], mode: 'points' | 'polygon' = 'points'): PointSetModel =>
    ({mode, closed: mode === 'polygon', gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));

const SEVEN = model([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);
const FIVE = model([[0, 0], [6, 0], [7, 5], [3, 7], [-2, 4]]);
const SQUARE = model([[0, 0], [1, 0], [1, 1], [0, 1]]);
const TRAPEZOID = model([[0, 0], [8, 0], [9, 5], [-1, 5]]);
const DEFAULT_QUERY = {x: '4', y: '2'};

class Vor extends VoronoiGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension { return this.persistenceExtension(); }
}
class Deg extends DegenerateSitesGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension { return this.persistenceExtension(); }
}
type Rows = Vor | Deg;

const mount = (graph: object) => render(<MemoryRouter><GraphHost create={() => graph as never}/></MemoryRouter>);
/** A stored `graphState` literal; typed as the declared scene fields it carries beyond `BaseGraphState`. */
const gs = (value: object): Preset['graphState'] => value;
const patch = (value: object): Partial<PointSetGraphState> => value;
const field = (graph: {state: object}, name: string): unknown => Reflect.get(graph.state, name);

interface Row {
    name: string;
    key: string;
    create: () => Rows;
    defaultModel: PointSetModel;
    defaultMode: 'sites' | 'four-point';
}
const ROWS: Row[] = [
    {name: 'voronoi', key: VORONOI_PRESET_KEY, create: () => new Vor(), defaultModel: SEVEN, defaultMode: 'sites'},
    {name: 'voronoi-degenerate', key: DEGENERATE_PRESET_KEY, create: () => new Deg(), defaultModel: SQUARE, defaultMode: 'four-point'},
];

describe.each(ROWS)('$name scene persistence', row => {
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    /** Replaces the sites in `sites` mode (a four-point scene keeps exactly four) and names the site, count, query and mode. */
    const place = (graph: Rows, sites: PointSetModel, site: number | null, count: number, query: {x: string; y: string}, mode: 'sites' | 'four-point') => {
        graph.setMode('sites');
        graph.loadModel(sites);
        graph.setState(patch({cellSite: site, construction: count, query, mode}));
    };
    const placeSource = (graph: Rows) => {
        place(graph, SEVEN, 2, 3, {x: '1/2', y: '7'}, 'sites');
        graph.setOverlay('diagram', false);
        graph.setOverlay('grid', true);
    };
    const placeFive = (graph: Rows) => { place(graph, FIVE, 4, 2, {x: '-3', y: '5'}, 'sites'); graph.setOverlay('delaunay', true); };
    const placeTrapezoid = (graph: Rows) => { place(graph, TRAPEZOID, 1, 1, {x: '9/2', y: '1'}, 'four-point'); graph.setOverlay('grid', true); };
    const file = () => { const graph = mounted(); act(() => { placeSource(graph); }); return wire(graph.exportPreset()); };
    const expectedGraphState = {
        initialized: true, overlays: {diagram: false, grid: true}, cellSite: 2, construction: 3, query: {x: '1/2', y: '7'}, mode: 'sites',
    };
    const scene = (graph: Rows) => [field(graph, 'cellSite'), field(graph, 'construction'), field(graph, 'query'), field(graph, 'mode')];

    test('a round trip after two distinct preceding scenes keeps site, count, query and mode', () => {
        const stored = file();
        expect(stored.id).toBe(row.key);
        expect(stored.data).toEqual(SEVEN);
        expect(stored.graphState).toEqual(expectedGraphState);
        expect(Object.keys(stored).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        const collection = row.create().presetCollection();
        expect(collection.check(stored.data)).toEqual({data: SEVEN});
        expect(collection.checkGraphState?.(stored.graphState)).toBeUndefined();

        const target = mounted();
        act(() => { placeFive(target); });
        act(() => { placeTrapezoid(target); });
        expect(scene(target)).toEqual([1, 1, {x: '9/2', y: '1'}, 'four-point']);
        act(() => { target.importPreset(stored); });
        expect(target.model).toEqual(SEVEN);
        expect(scene(target)).toEqual([2, 3, {x: '1/2', y: '7'}, 'sites']);
        expect(wire(target.state.overlays)).toEqual({diagram: false, grid: true});
        expect(target.state.initialized).toBe(true);
        expect(wire(target.exportPreset().data)).toEqual(stored.data);
        expect(target.exportPreset().graphState).toEqual(stored.graphState);
    });

    test('a partial or absent graphState starts from the declared fallbacks, never from the preceding scene', () => {
        const stored = file();
        const target = mounted();
        const preceding = () => act(() => { placeFive(target); });
        preceding();
        act(() => { target.importPreset({id: row.key, data: stored.data}); });
        expect(target.model).toEqual(SEVEN);
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);
        expect(wire(target.state.overlays)).toEqual({diagram: true});

        preceding();
        act(() => { target.importPreset({id: row.key, data: stored.data, graphState: gs({initialized: true, construction: 2})}); });
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']); // a count without a site is 0

        preceding();
        act(() => { target.importPreset({id: row.key, data: stored.data, graphState: gs({initialized: true, cellSite: 5})}); });
        expect(scene(target)).toEqual([5, 0, DEFAULT_QUERY, 'sites']);

        preceding();
        act(() => { target.importPreset({id: row.key, data: wire(SQUARE), graphState: gs({initialized: true, cellSite: 3, query: {x: '2', y: '-1'}})}); });
        expect(scene(target)).toEqual([3, 0, {x: '2', y: '-1'}, 'sites']); // a graphState without a mode: the fallback `sites`, even for degenerate sites

        preceding();
        act(() => { target.importPreset({id: row.key, graphState: {initialized: true}}); });
        expect(target.model).toEqual(row.defaultModel);
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);

        // No graphState at all: the graph's fresh initial state (degenerate sites start in four-point mode).
        preceding();
        act(() => { target.importPreset({id: row.key, data: wire(SQUARE)}); });
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, row.defaultMode]);
    });

    test('a stale site or count is clamped to the sites, not rejected', () => {
        const target = mounted();
        const load = (graphState: object, data: PointSetModel = SEVEN) => act(() => {
            placeFive(target);
            target.importPreset({id: row.key, data: wire(data), graphState: {initialized: true, ...graphState}});
        });
        load({cellSite: 99, construction: 4});
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);
        load({cellSite: 7, construction: 4});
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);
        load({cellSite: 6, construction: 99});
        expect(scene(target)).toEqual([6, 6, DEFAULT_QUERY, 'sites']);
        load({cellSite: 0, construction: 0});
        expect(scene(target)).toEqual([0, 0, DEFAULT_QUERY, 'sites']);
        load({cellSite: 3, construction: 7}, FIVE);
        expect(scene(target)).toEqual([3, 4, DEFAULT_QUERY, 'sites']);
        expect(target.cellSite).toBe(3);
        expect(target.construction).toBe(4);
    });

    test('four-point mode needs exactly four sites; otherwise the sites stay and the mode is sites', () => {
        const target = mounted();
        const load = (mode: string, data: PointSetModel) => act(() => {
            placeFive(target);
            target.importPreset({id: row.key, data: wire(data), graphState: gs({initialized: true, mode})});
        });
        load('four-point', SEVEN);
        expect([target.model.points.length, field(target, 'mode')]).toEqual([7, 'sites']);
        load('four-point', FIVE);
        expect([target.model.points.length, field(target, 'mode')]).toEqual([5, 'sites']);
        load('four-point', SQUARE);
        expect([target.model.points.length, field(target, 'mode')]).toEqual([4, 'four-point']);
        load('sites', SQUARE);
        expect([target.model.points.length, field(target, 'mode')]).toEqual([4, 'sites']);
    });

    test('a model, an unknown key or a bad value in graphState cannot reach the scene', () => {
        const stored = file();
        const collection = row.create().presetCollection();
        const target = mounted();
        act(() => { placeFive(target); });
        const state = target.state;
        const forbidden: object[] = [
            {initialized: true, model: SEVEN},
            {extra: 1},
            {mode: 'quad'},
            {cellSite: 1.5},
            {construction: -1},
            {query: {x: '1', y: 'a'}},
            {query: {x: '1', y: '2', z: '3'}},
            {overlays: {nonexistent: true}},
        ];
        for (const graphState of forbidden) {
            expect(collection.checkGraphState?.(graphState)).not.toBeUndefined();
            expect(() => target.importPreset({...stored, graphState})).toThrow();
            expect(target.state).toBe(state);
        }
        const persistence = pointSetPersistence(VORONOI_OVERLAY_IDS, target.extension());
        const defaults: PointSetSceneState = {initialized: false, model: FIVE, overlays: {}};
        const hostile = {initialized: true, model: FIVE, extra: 1, cellSite: '2', construction: 2.5, query: {x: '1'}, mode: 'quad', overlays: {grid: true, bogus: true}};
        const rebuilt = persistence.reconstruct(SEVEN, hostile, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['cellSite', 'construction', 'initialized', 'mode', 'model', 'overlays', 'query']);
        expect(rebuilt.model).toEqual(SEVEN);
        expect(rebuilt.overlays).toEqual({grid: true});
        expect(wire([Reflect.get(rebuilt, 'cellSite'), Reflect.get(rebuilt, 'construction'), Reflect.get(rebuilt, 'query'), Reflect.get(rebuilt, 'mode')]))
            .toEqual([null, 0, DEFAULT_QUERY, 'sites']);
        const projected = persistence.project(Object.assign({initialized: true, model: SEVEN, overlays: {diagram: true, bogus: undefined}}, {cellSite: 99, construction: 99, query: {x: '5', y: '6'}, mode: 'four-point', extra: 1}));
        expect(Object.keys(projected.graphState).sort()).toEqual(['cellSite', 'construction', 'initialized', 'mode', 'overlays', 'query']);
        expect(wire(projected.graphState)).toEqual({initialized: true, overlays: {diagram: true}, cellSite: null, construction: 0, query: {x: '5', y: '6'}, mode: 'sites'});
        expect(projected.data).toEqual(SEVEN);
    });

    test('a figure Preset and the lesson default agree with import, and the entry scene returns exactly', () => {
        const stored = file();
        const target = mounted();
        act(() => { placeTrapezoid(target); });
        const entry = wire(target.exportPreset());
        expect(entry.graphState).toEqual({initialized: true, overlays: {diagram: true, grid: true}, cellSite: 1, construction: 1, query: {x: '9/2', y: '1'}, mode: 'four-point'});
        const expected = {initialized: true, model: SEVEN, overlays: {diagram: false, grid: true}, cellSite: 2, construction: 3, query: {x: '1/2', y: '7'}, mode: 'sites'};
        expect(wire(target.figureStateOf(stored))).toEqual(expected);
        expect(target.model).toEqual(TRAPEZOID);
        act(() => { expect(wire(target.figureScene(stored))).toEqual(expected); });
        expect(target.model).toEqual(SEVEN);
        // An omitted graphState or data: the fallbacks, whatever the live scene was.
        const fresh = {initialized: true, overlays: {diagram: true}, cellSite: null, construction: 0, query: DEFAULT_QUERY};
        expect(wire(target.figureStateOf({id: row.key, data: wire(SEVEN), graphState: {initialized: true}}))).toEqual({...fresh, model: SEVEN, mode: 'sites'});
        expect(wire(target.figureStateOf({id: row.key, graphState: gs({initialized: true, cellSite: 40, mode: 'four-point'})}))).toEqual({...fresh, model: row.defaultModel, mode: row.defaultMode});
        expect(wire(target.figureStateOf({id: row.key, graphState: gs({initialized: true, cellSite: 1, construction: 9, mode: 'four-point'})}))).toEqual(
            row.defaultMode === 'four-point'
                ? {...fresh, model: SQUARE, cellSite: 1, construction: 3, mode: 'four-point'}
                : {...fresh, model: SEVEN, cellSite: 1, construction: 6, mode: 'sites'});
        // Returning to the entry scene gives back its site, count, query, mode and overlays, whatever the live scene is.
        act(() => { placeSource(target); });
        expect(wire(target.figureStateOf(entry))).toEqual({...entry.graphState, model: TRAPEZOID});
        act(() => { target.figureScene(entry); });
        expect(target.model).toEqual(TRAPEZOID);

        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(row.defaultModel);
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, row.defaultMode]);
        expect(wire(target.lessonDefault(wire(SQUARE)))).toEqual({...fresh, model: SQUARE, mode: row.defaultMode});
        expect(wire(target.lessonDefault(wire(SEVEN)))).toEqual({...fresh, model: SEVEN, mode: 'sites'});
        expect(wire(target.lessonDefault(wire(SEVEN)))).toEqual(wire(target.figureStateOf({id: row.key, data: wire(SEVEN), graphState: {initialized: true}})));
        // No graphState at all: the fresh scene, whose mode is the graph's own (degenerate sites start in four-point mode).
        expect(wire(target.figureStateOf({id: row.key, data: wire(SQUARE)}))).toEqual({...fresh, model: SQUARE, mode: row.defaultMode});
    });

    test('a bare data import resets site, count and query and keeps the mode, bounded by the sites', () => {
        const target = mounted();
        act(() => { placeTrapezoid(target); target.setOverlay('delaunay', true); });
        act(() => { target.importPresetData(wire(SQUARE)); });
        expect(target.model).toEqual(SQUARE);
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'four-point']);
        expect(wire(target.state.overlays)).toEqual({diagram: true, grid: true, delaunay: true});
        act(() => { placeTrapezoid(target); });
        act(() => { target.importPresetData(wire(SEVEN)); });
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);
        // The mode `sites` is kept too, and is never promoted.
        act(() => { placeSource(target); });
        act(() => { target.importPresetData(wire(SQUARE)); });
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);
        // A Preset's values survive its own import, but not the next bare one.
        act(() => { target.importPreset({id: row.key, data: wire(SEVEN), graphState: gs({initialized: true, cellSite: 3, construction: 2, query: {x: '1', y: '1'}})}); });
        expect(scene(target)).toEqual([3, 2, {x: '1', y: '1'}, 'sites']);
        act(() => { target.importPresetData(wire(SEVEN)); });
        expect(scene(target)).toEqual([null, 0, DEFAULT_QUERY, 'sites']);
    });
});

describe('point-in-polygon scene persistence', () => {
    const NOTCHED = model([[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]], 'polygon');
    const TRIANGLE = model([[0, 0], [6, 0], [3, 5]], 'polygon');
    const SQUARE_POLYGON = model([[-2, -2], [2, -2], [2, 2], [-2, 2]], 'polygon');
    const KEY = POINT_IN_POLYGON_PRESET_KEY;
    class Pip extends PointInPolygonGraph {
        figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
        figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
        lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
        resetToDefaultScene() { this.prepareLessonDefaultScene(); }
        extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
    }
    const mounted = (): Pip => { const graph = new Pip(); mount(graph); return graph; };
    const placeSource = (graph: Pip) => {
        graph.loadModel(TRIANGLE);
        graph.setQuery({x: -2, y: 4});
        graph.setOverlay('winding', true);
        graph.setOverlay('values', false);
    };
    const file = () => { const graph = mounted(); act(() => { placeSource(graph); }); return wire(graph.exportPreset()); };
    const expectedGraphState = {initialized: true, overlays: {ray: true, winding: true, values: false}, query: {x: -2, y: 4}};

    test('a round trip after two distinct preceding scenes keeps the query; the file holds the polygon once', () => {
        const stored = file();
        expect(stored.id).toBe(KEY);
        expect(stored.data).toEqual(TRIANGLE);
        expect(stored.graphState).toEqual(expectedGraphState);
        const collection = new Pip().presetCollection();
        expect(collection.check(stored.data)).toEqual({data: TRIANGLE});
        expect(collection.checkGraphState?.(stored.graphState)).toBeUndefined();
        const target = mounted();
        act(() => { target.loadModel(NOTCHED); target.setQuery({x: 3, y: 3}); target.setOverlay('grid', true); });
        act(() => { target.loadModel(SQUARE_POLYGON); target.setQuery({x: 1, y: -1}); target.selectQuery(true); });
        act(() => { target.importPreset(stored); });
        expect(target.model).toEqual(TRIANGLE);
        expect(target.query).toEqual({x: -2, y: 4});
        expect(wire(target.state.overlays)).toEqual({ray: true, winding: true, values: false});
        expect(target.exportPreset().graphState).toEqual(stored.graphState);
        expect(wire(target.exportPreset().data)).toEqual(stored.data);
        expect(Object.keys(target.exportPreset().graphState ?? {}).sort()).toEqual(['initialized', 'overlays', 'query']);
    });

    test('an omitted or refused query is the notched default, never the preceding scene\'s', () => {
        const stored = file();
        const target = mounted();
        const preceding = () => act(() => { target.loadModel(SQUARE_POLYGON); target.setQuery({x: 1, y: -1}); });
        preceding();
        act(() => { target.importPreset({id: KEY, data: stored.data}); });
        expect(target.query).toEqual({x: 3, y: 1});
        expect(wire(target.state.overlays)).toEqual({ray: true, winding: false, values: true});
        preceding();
        act(() => { target.importPreset({id: KEY, data: stored.data, graphState: gs({initialized: true, overlays: {ray: false}})}); });
        expect(target.query).toEqual({x: 3, y: 1});
        expect(wire(target.state.overlays)).toEqual({ray: false});
        preceding();
        act(() => { target.importPreset({id: KEY, graphState: {initialized: true}}); });
        expect(target.model).toEqual(NOTCHED);
        expect(target.query).toEqual({x: 3, y: 1});
        for (const query of [{x: 1.5, y: 0}, {x: 1}, 'q', null, {x: '1', y: '2'}]) {
            expect(target.presetCollection().checkGraphState?.({initialized: true, query})).not.toBeUndefined();
        }
    });

    test('a model, an unknown key or a bad query in graphState cannot reach the scene', () => {
        const stored = file();
        const target = mounted();
        act(() => { target.loadModel(SQUARE_POLYGON); target.setQuery({x: 1, y: -1}); });
        const state = target.state;
        for (const graphState of [{initialized: true, model: TRIANGLE}, {extra: 1}, {query: {x: 1.5, y: 0}}, {overlays: {nonexistent: true}}]) {
            expect(target.presetCollection().checkGraphState?.(graphState)).not.toBeUndefined();
            expect(() => target.importPreset({...stored, graphState})).toThrow();
            expect(target.state).toBe(state);
        }
        const persistence = pointSetPersistence(POINT_IN_POLYGON_OVERLAY_IDS, target.extension());
        const defaults: PointSetSceneState = {initialized: false, model: SQUARE_POLYGON, overlays: {}};
        const rebuilt = persistence.reconstruct(TRIANGLE, {initialized: true, model: NOTCHED, extra: 1, query: {x: 1.5, y: 0}, queryActive: true, overlays: {ray: false, bogus: true}}, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['initialized', 'model', 'overlays', 'query']);
        expect(wire(rebuilt)).toEqual({initialized: true, model: TRIANGLE, overlays: {ray: false}, query: {x: 3, y: 1}});
        const projected = persistence.project(Object.assign({initialized: true, model: TRIANGLE, overlays: {ray: true}}, {query: {x: 7, y: -7}, queryActive: true}));
        expect(wire(projected.graphState)).toEqual({initialized: true, overlays: {ray: true}, query: {x: 7, y: -7}});
    });

    test('a figure Preset and the lesson default agree with import; a bare import keeps the query', () => {
        const stored = file();
        const target = mounted();
        act(() => { target.loadModel(SQUARE_POLYGON); target.setQuery({x: 1, y: -1}); });
        const entry = wire(target.exportPreset());
        const expected = {initialized: true, model: TRIANGLE, overlays: {ray: true, winding: true, values: false}, query: {x: -2, y: 4}};
        expect(wire(target.figureStateOf(stored))).toEqual(expected);
        expect(target.model).toEqual(SQUARE_POLYGON);
        act(() => { expect(wire(target.figureScene(stored))).toEqual(expected); });
        expect(target.model).toEqual(TRIANGLE);
        expect(wire(target.figureStateOf({id: KEY, data: wire(TRIANGLE), graphState: {initialized: true}}))).toEqual(
            {initialized: true, model: TRIANGLE, overlays: {ray: true, winding: false, values: true}, query: {x: 3, y: 1}});
        act(() => { target.figureScene(entry); });
        expect(target.model).toEqual(SQUARE_POLYGON);
        expect(target.query).toEqual({x: 1, y: -1});
        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(NOTCHED);
        expect(target.query).toEqual({x: 3, y: 1});
        expect(wire(target.lessonDefault(wire(TRIANGLE)))).toEqual({initialized: true, model: TRIANGLE, overlays: {ray: true, winding: false, values: true}, query: {x: 3, y: 1}});
        // A bare data import (retained behaviour) keeps the scene's query.
        act(() => { target.setQuery({x: -3, y: 2}); });
        act(() => { target.importPresetData(wire(TRIANGLE)); });
        expect(target.model).toEqual(TRIANGLE);
        expect(target.query).toEqual({x: -3, y: 2});
    });
});
