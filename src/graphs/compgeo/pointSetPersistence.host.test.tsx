import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {OrientationGraph} from './OrientationGraph';
import {PolygonAreaGraph} from './PolygonAreaGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {Preset} from '../base/presets/Presets';
import type {PointSetModel} from '../../compgeo/pointSetModel';
import {pointSetPersistence, PointSetSceneState} from './pointSetPersistence';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// One set of obligations (P3) for the two rows that need nothing beyond the family declaration. Every expected value below is
// authored by hand, never read back from the projection under test.

class Orientation extends OrientationGraph {
    liveBoard() { return this.board; }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
}

class PolygonArea extends PolygonAreaGraph {
    liveBoard() { return this.board; }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
}

type Rows = Orientation | PolygonArea;
type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number};
const drawnPoints = (graph: Rows) =>
    (graph.liveBoard().objectsList as Shown[]).filter(o => o.elType === 'point' && /^P\d+$/.test(o.name ?? '')).map(p => [p.X!(), p.Y!()]);
const mount = (graph: Rows) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const pts = (mode: 'points' | 'polygon', points: Array<[number, number]>): PointSetModel =>
    ({mode, closed: mode === 'polygon', gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const xy = (model: PointSetModel) => model.points.map(p => [p.x, p.y]);

type Scene = {model: PointSetModel; overlays: Record<string, boolean>};
interface Row {
    name: string;
    create: () => Rows;
    defaultModel: PointSetModel;
    defaultOverlays: Record<string, boolean>;
    /** The scene a file is made from, and two different scenes that precede an import. */
    scene: Scene;
    /** The persisted overlays of `scene` as authored: the defaults, changed by `scene.overlays`. */
    sceneOverlays: Record<string, boolean>;
    preceding: Scene[];
    other: PointSetModel;
    /** An overlay id the graph owns. */
    named: string;
}

const ROWS: Row[] = [
    {
        name: 'orientation', create: () => new Orientation(),
        defaultModel: pts('points', [[0, 0], [4, 0], [3, 2]]),
        defaultOverlays: {turn: true, values: true},
        scene: {model: pts('points', [[1, 1], [5, 1], [2, 6]]), overlays: {turn: false, grid: true}},
        sceneOverlays: {turn: false, values: true, grid: true},
        preceding: [
            {model: pts('points', [[0, 0], [1, 1]]), overlays: {values: false}},
            {model: pts('points', [[-3, 2], [0, -4], [6, 6]]), overlays: {turn: false}},
        ],
        other: pts('points', [[7, 7], [8, 9], [-2, -2]]),
        named: 'values',
    },
    {
        name: 'polygon-area', create: () => new PolygonArea(),
        defaultModel: pts('polygon', [[-1, 3], [0, 0], [4, 0], [5, 3], [2, 5]]),
        defaultOverlays: {fan: true, lattice: true, values: true},
        scene: {model: pts('polygon', [[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]]), overlays: {fan: false, grid: true}},
        sceneOverlays: {fan: false, lattice: true, values: true, grid: true},
        preceding: [
            {model: pts('polygon', [[0, 0], [4, 0], [0, 3]]), overlays: {lattice: false}},
            {model: pts('polygon', [[1, 1], [2, 5], [7, 3]]), overlays: {values: false, fan: false}},
        ],
        other: pts('polygon', [[0, 0], [2, 0], [2, 2], [0, 2]]),
        named: 'lattice',
    },
];

describe.each(ROWS)('$name projection', row => {
    const place = (graph: Rows, s: Scene) => {
        graph.loadModel(s.model);
        for (const [id, shown] of Object.entries(s.overlays)) graph.setOverlay(id as never, shown);
    };
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    const source = (): Rows => { const graph = mounted(); act(() => { place(graph, row.scene); }); return graph; };

    test('a round trip after two distinct preceding scenes keeps the model, the overlays and the drawn points', () => {
        const file = wire(source().exportPreset());
        expect(file.data).toEqual(row.scene.model);
        expect(file.graphState).toEqual({initialized: true, overlays: row.sceneOverlays});
        expect(Object.keys(file).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        expect(file.graphState).not.toHaveProperty('model');
        const collection = row.create().presetCollection();
        expect(collection.check(file.data)).toEqual({data: row.scene.model});
        expect(collection.checkGraphState?.(file.graphState)).toBeUndefined();

        const target = mounted();
        for (const preceding of row.preceding) act(() => { place(target, preceding); });
        act(() => { target.importPreset(file); });
        expect(target.model).toEqual(row.scene.model);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual(row.sceneOverlays);
        // The board observation: the drawn points are the model's points, in order.
        expect(drawnPoints(target)).toEqual(xy(row.scene.model));
        expect(wire(target.exportPreset().data)).toEqual(file.data);
        expect(target.exportPreset().graphState).toEqual(file.graphState);
    });

    test('a partial Preset starts from the defaults, never from the preceding scene', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        act(() => { place(target, row.preceding[1]); });
        // No graphState: the defaults' overlays.
        act(() => { target.importPreset({id: file.id, data: file.data}); });
        expect(target.model).toEqual(row.scene.model);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        expect(target.state.initialized).toBe(true);
        // A partial overlays map replaces the defaults' map; an unnamed id takes the graph's initial value.
        act(() => { place(target, row.preceding[0]); });
        act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({overlays: {[row.named]: false}})}); });
        expect(wire(target.state.overlays)).toEqual({[row.named]: false});
        expect(target.overlayShown(row.named as never)).toBe(false);
        for (const id of Object.keys(row.defaultOverlays)) if (id !== row.named) expect(target.overlayShown(id as never)).toBe(true);
        // Only `initialized`: the defaults' overlays; no data: the fixed default model.
        act(() => { target.importPreset({id: file.id, graphState: {initialized: true}}); });
        expect(target.model).toEqual(row.defaultModel);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
    });

    test('a malformed Preset is refused before the scene, the state or the board change', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        act(() => { place(target, row.preceding[0]); });
        const state = target.state;
        const model = target.model;
        const drawn = drawnPoints(target);
        const refused: Array<Preset> = [
            {...file, data: {...file.data, points: [{x: 0.5, y: 1}]}},
            {...file, graphState: {initialized: true, model: row.other}},
            {...file, graphState: {overlays: {nonexistent: true}}},
            {...file, graphState: {overlays: {[row.named]: 'yes'}}},
            {...file, graphState: {initialized: true, step: 3}},
        ];
        for (const preset of refused) {
            expect(() => target.importPreset(preset)).toThrow();
            expect(target.state).toBe(state);
            expect(target.model).toBe(model);
            expect(drawnPoints(target)).toEqual(drawn);
        }
    });

    test('a model, an unknown overlay or an extra key in the permitted state cannot reach the result', () => {
        const persistence = pointSetPersistence(Object.keys(row.defaultOverlays));
        const defaults: PointSetSceneState = {initialized: false, model: row.other, overlays: row.defaultOverlays};
        const forbidden = {initialized: true, model: row.other, extra: 1, overlays: {[row.named]: false, bogus: true, constructor: true}};
        const rebuilt = persistence.reconstruct(row.scene.model, forbidden, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['initialized', 'model', 'overlays']);
        expect(rebuilt.model).toEqual(row.scene.model);
        expect(rebuilt.initialized).toBe(true);
        expect(rebuilt.overlays).toEqual({[row.named]: false});
        // Non-boolean overlay values and a malformed overlays value are dropped, not coerced.
        expect(persistence.reconstruct(row.scene.model, {overlays: {[row.named]: 1}}, defaults).overlays).toEqual({});
        expect(persistence.reconstruct(row.scene.model, {overlays: [true]}, defaults).overlays).toEqual(row.defaultOverlays);
        expect(persistence.reconstruct(row.scene.model, 'junk', defaults)).toEqual({...defaults, model: row.scene.model});
        // The reconstructed model is a fresh copy, not the caller's object.
        expect(rebuilt.model).not.toBe(row.scene.model);
        // The projection drops an overlay with no value and never writes a model into graphState.
        const projected = persistence.project({initialized: true, model: row.scene.model, overlays: {[row.named]: true, grid: undefined}});
        expect(projected.graphState).toEqual({initialized: true, overlays: {[row.named]: true}});
        expect(projected.data).toEqual(row.scene.model);
    });

    test('the lesson default scene and a lesson fixture start fresh from their own data', () => {
        const target = mounted();
        act(() => { place(target, row.preceding[1]); target.select(0); });
        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(row.defaultModel);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        expect(target.selectedIndex).toBeUndefined();
        expect(drawnPoints(target)).toEqual(xy(row.defaultModel));
        // The fixture state is built from the fixture data, not from whatever model is live.
        expect(target.lessonDefault(row.other)).toEqual({initialized: true, model: row.other, overlays: row.defaultOverlays});
        expect(target.lessonDefault(row.scene.model).model).toEqual(row.scene.model);
        expect(target.model).toEqual(row.defaultModel);
    });

    test('a figure Preset gives a scene state that is a function of its data, and the entry scene returns exactly', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        act(() => { place(target, row.preceding[0]); });
        const entry = wire(target.exportPreset());
        // Computed from the Preset alone: the live scene (a different model) must not leak in, and nothing is imported first.
        const expected = {initialized: true, model: row.scene.model, overlays: row.sceneOverlays};
        expect(wire(target.figureStateOf(file))).toEqual(expected);
        expect(target.model).not.toEqual(row.scene.model);
        act(() => { expect(wire(target.figureScene(file))).toEqual(expected); });
        expect(target.model).toEqual(row.scene.model);
        // Omitted graphState and omitted data.
        expect(wire(target.figureStateOf({id: file.id, data: file.data}))).toEqual({...expected, overlays: row.defaultOverlays});
        expect(wire(target.figureStateOf({id: file.id, graphState: {initialized: true}}))).toEqual({initialized: true, model: row.defaultModel, overlays: row.defaultOverlays});
        // Returning to the entry scene restores the first scene's model and overlays.
        act(() => { expect(wire(target.figureScene(entry))).toEqual({initialized: true, model: entry.data, overlays: entry.graphState.overlays}); });
        expect(target.model).toEqual(row.preceding[0].model);
        expect(drawnPoints(target)).toEqual(xy(row.preceding[0].model));
    });

    test('a checkpoint keeps the trusted scene state; the file holds only the projection', () => {
        const graph = source();
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => { capabilities.apply({kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'}); });
        expect(graph.model).toEqual(row.defaultModel);
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.model).toEqual(row.scene.model);
        expect(wire(graph.state.overlays)).toEqual(row.sceneOverlays);
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/pointSetSelected|displayState|transientState/);
    });
});
