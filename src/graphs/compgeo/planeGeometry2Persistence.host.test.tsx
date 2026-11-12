import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SimsonLineGraph} from './SimsonLineGraph';
import {InversionGraph} from './InversionGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {Preset} from '../base/presets/Presets';
import type {PointSetGraphState} from './PointSetGraph';
import type {PointSetModel} from '../../compgeo/pointSetModel';
import {PointSetExtension, pointSetPersistence, PointSetSceneState} from './pointSetPersistence';
import {SIMSON_LINE_OVERLAY_IDS, SIMSON_LINE_PRESET_KEY} from './simsonLinePresetCollection';
import {INVERSION_OVERLAY_IDS, INVERSION_PRESET_KEY} from './inversionPresetCollection';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// Simson line and inversion (task 08 batch 6b) declare their persisted scene through `pointSetPersistence(ids, extension)`: `data`
// is the vertices, `graphState` is `initialized`, the overlays, the example id and the graph's own fields. Expected values are
// authored by hand from the collections (`simsonLinePresetCollection.ts`, `inversionPresetCollection.ts`).

type Point = [number, number];
const model = (list: Point[]): PointSetModel => ({mode: 'points', closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const gs = (value: object): Preset['graphState'] => value;
const patch = (value: object): Partial<PointSetGraphState> => value;
const field = (graph: {state: object}, name: string): unknown => Reflect.get(graph.state, name);
const mount = (graph: object) => render(<MemoryRouter><GraphHost create={() => graph as never}/></MemoryRouter>);

const DEFAULT_TRIANGLE = model([[0, 0], [7, 0], [2, 5]]);
const CUSTOM = model([[1, 1], [5, 1], [2, 6]]);
const DEGENERATE = model([[0, 0], [1, 1], [3, 3]]);
const ORIGIN = model([[0, 0]]);

class Simson extends SimsonLineGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
class Inversion extends InversionGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
type Rows = Simson | Inversion;

interface Row {
    name: string;
    key: string;
    create: () => Rows;
    overlayIds: readonly string[];
    initialOverlays: Record<string, boolean>;
    /** The vertices of a graph without a Preset `data` (the defaults). */
    defaultModel: PointSetModel;
    /** A model that no example names, to import over the source scene. */
    otherModel: PointSetModel;
    /** The source scene: its vertices, the stored fields, the overlays it changes and how to load it. */
    source: {model: PointSetModel; fields: Record<string, unknown>; overlays: Record<string, boolean>; load: (graph: Rows) => void};
    preceding: Array<(graph: Rows) => void>;
    /** The fields of the fresh scene (`getInitialState()`), by hand. */
    fresh: Record<string, unknown>;
    /** Stored `graphState`s that the collection refuses. */
    forbidden: object[];
    /** A `graphState` that names every field badly. */
    hostile: Record<string, unknown>;
}

const INVERSION_SOURCE_FIELDS = {
    exampleId: 'orthogonal', focus: 'angle', radius: 5, x: {x: -4, y: 7}, source: {kind: 'line', p: {x: -2, y: 1}, q: {x: 4, y: 3}},
    power: {circle: {centre: {x: 6, y: -2}, radius: 2}, thetaDeg: 123}, angle: {first: {centre: {x: -3, y: 2}, radius: 2}, second: {centre: {x: 1, y: 1}, radius: 3}, which: 0},
};
const UNIT_CIRCLE = {centre: {x: 0, y: 0}, radius: 1};

const ROWS: Row[] = [
    {
        name: 'simson-line', key: SIMSON_LINE_PRESET_KEY, create: () => new Simson(), overlayIds: SIMSON_LINE_OVERLAY_IDS,
        initialOverlays: {triangle: true, sidelines: true, circumcircle: true, perpendiculars: true, simson: true, pedal: true},
        defaultModel: DEFAULT_TRIANGLE, otherModel: DEGENERATE,
        source: {
            model: model([[0, 0], [6, 0], [1, 4]]),
            fields: {exampleId: 'vertex', mode: 'exact', t: 250, epsilon: 0.05, pPrime: {x: -3, y: 5}},
            overlays: {grid: true, pedal: false},
            load: g => {
                const s = g as Simson;
                s.loadModel(model([[0, 0], [6, 0], [1, 4]]));
                s.setState(patch({exampleId: 'vertex', mode: 'exact', t: 250, epsilon: 0.05, pPrime: {x: -3, y: 5}}));
                s.setOverlay('grid', true); s.setOverlay('pedal', false);
            },
        },
        preceding: [
            g => { const s = g as Simson; s.loadExample('grid-off-circle'); s.setT(10); s.setEpsilon(-0.2); s.setOverlay('simson', false); },
            g => { const s = g as Simson; s.loadModel(CUSTOM); s.setState(patch({exampleId: 'default', mode: 'glider', t: 100, epsilon: 0.2, pPrime: {x: 9, y: 9}})); },
        ],
        fresh: {exampleId: 'default', mode: 'glider', t: 60, epsilon: 0, pPrime: {x: 2, y: -2}},
        forbidden: [
            {initialized: true, model: ORIGIN}, {extra: 1}, {exampleId: 'nonexistent'}, {mode: 'orbit'}, {t: 'x'}, {t: Number.NaN}, {t: Infinity},
            {epsilon: 0.3}, {epsilon: '0'}, {pPrime: {x: 1.5, y: 0}}, {pPrime: 'a'}, {overlays: {nonexistent: true}},
        ],
        hostile: {initialized: true, model: CUSTOM, extra: 1, exampleId: 'nonexistent', mode: 'orbit', t: 'x', epsilon: 0.3, pPrime: {x: 1.5, y: 0}},
    },
    {
        name: 'inversion', key: INVERSION_PRESET_KEY, create: () => new Inversion(), overlayIds: INVERSION_OVERLAY_IDS,
        initialOverlays: {'inversion-circle': true, rays: true, image: true, secant: true, tangent: true, 'angle-tangents': true},
        defaultModel: ORIGIN, otherModel: model([[3, 3]]),
        source: {
            model: model([[2, -1]]), fields: INVERSION_SOURCE_FIELDS, overlays: {grid: true, rays: false},
            load: g => {
                const i = g as Inversion;
                i.loadModel(model([[2, -1]]));
                i.setState(patch(wire(INVERSION_SOURCE_FIELDS)));
                i.setOverlay('grid', true); i.setOverlay('rays', false);
            },
        },
        preceding: [
            g => { const i = g as Inversion; i.loadExample('power'); i.setX({x: 1, y: 1}); i.setOverlay('image', false); },
            g => { const i = g as Inversion; i.loadModel(model([[-6, 4]])); i.setState(patch({exampleId: 'point', focus: 'source', radius: 8, x: {x: 9, y: 9}})); },
        ],
        fresh: {
            exampleId: 'point', focus: 'point', radius: 2, x: {x: 3, y: 1}, source: {kind: 'circle', centre: {x: 1, y: 0}, radius: 1},
            power: {circle: {centre: {x: 5, y: 0}, radius: 3}, thetaDeg: 0},
            angle: {first: {centre: {x: 3, y: 0}, radius: 1}, second: {centre: {x: 3, y: 1}, radius: 1}, which: 1},
        },
        forbidden: [
            {initialized: true, model: ORIGIN}, {extra: 1}, {exampleId: 'nonexistent'}, {focus: 'plane'}, {radius: 9}, {radius: 2.5}, {x: {x: 11, y: 0}},
            {x: {x: 1, y: 1, z: 2}}, {source: {kind: 'line', p: {x: 1, y: 1}, q: {x: 1, y: 1}}}, {source: {kind: 'circle', ...UNIT_CIRCLE, extra: 1}},
            {power: {circle: UNIT_CIRCLE, thetaDeg: 360}}, {power: {circle: UNIT_CIRCLE, thetaDeg: 1, extra: 1}},
            {angle: {first: UNIT_CIRCLE, second: UNIT_CIRCLE, which: 2}}, {overlays: {nonexistent: true}},
        ],
        hostile: {
            initialized: true, model: CUSTOM, extra: 1, exampleId: 'nonexistent', focus: 'plane', radius: 9, x: {x: 11, y: 0}, source: {kind: 'line', p: {x: 1, y: 1}, q: {x: 1, y: 1}},
            power: {circle: UNIT_CIRCLE, thetaDeg: 360}, angle: {first: 1, second: 2, which: 2},
        },
    },
];

describe.each(ROWS)('$name scene persistence', row => {
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    const names = Object.keys(row.fresh);
    const expectedOverlays = {...row.initialOverlays, ...row.source.overlays};
    const expectedGraphState = {initialized: true, overlays: expectedOverlays, ...row.source.fields};
    const file = () => { const graph = mounted(); act(() => { row.source.load(graph); }); return wire(graph.exportPreset()); };
    const scene = (graph: Rows) => wire(names.map(name => field(graph, name)));
    const freshScene = names.map(name => row.fresh[name]);
    const freshState = {initialized: true, overlays: row.initialOverlays, ...row.fresh};

    test('a round trip after two distinct preceding scenes keeps vertices, overlays and every field', () => {
        const stored = file();
        expect(stored.id).toBe(row.key);
        expect(stored.data).toEqual(row.source.model);
        expect(stored.graphState).toEqual(expectedGraphState);
        expect(Object.keys(stored).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        const collection = row.create().presetCollection();
        expect(collection.check(stored.data)).toEqual({data: row.source.model});
        expect(collection.checkGraphState?.(stored.graphState)).toBeUndefined();

        const target = mounted();
        act(() => { row.preceding[0](target); });
        act(() => { row.preceding[1](target); });
        expect(target.model).not.toEqual(row.source.model);
        expect(scene(target)).not.toEqual(scene(mounted()));
        act(() => { target.importPreset(stored); });
        expect(target.model).toEqual(row.source.model);
        expect(wire(target.state.overlays)).toEqual(expectedOverlays);
        expect(target.state.initialized).toBe(true);
        expect(scene(target)).toEqual(names.map(name => row.source.fields[name]));
        expect(wire(target.exportPreset().graphState)).toEqual(stored.graphState);
        expect(wire(target.exportPreset().data)).toEqual(stored.data);
    });

    test('a partial or absent graphState starts from the declared fallbacks, never from the preceding scene', () => {
        const stored = file();
        const target = mounted();
        const preceding = () => act(() => { row.preceding[1](target); });
        preceding();
        act(() => { target.importPreset({id: row.key, data: stored.data}); });
        expect(target.model).toEqual(row.source.model);
        expect(scene(target)).toEqual(freshScene);
        expect(wire(target.state.overlays)).toEqual(row.initialOverlays);

        preceding();
        act(() => { target.importPreset({id: row.key, data: stored.data, graphState: gs({initialized: true})}); });
        expect(scene(target)).toEqual(freshScene);

        preceding();
        act(() => { target.importPreset({id: row.key, graphState: {initialized: true}}); });
        expect(target.model).toEqual(row.defaultModel);
        expect(scene(target)).toEqual(freshScene);

        // One named field is read; the others take the fallbacks.
        preceding();
        const first = names[1];
        act(() => { target.importPreset({id: row.key, data: stored.data, graphState: gs({initialized: true, [first]: row.source.fields[first]})}); });
        expect(scene(target)).toEqual(names.map(name => name === first ? row.source.fields[name] : row.fresh[name]));

        // A named example id is kept even when it does not name the vertices (checked at read time).
        preceding();
        act(() => { target.importPreset({id: row.key, data: wire(row.otherModel), graphState: gs({initialized: true, exampleId: row.source.fields.exampleId})}); });
        expect(field(target, 'exampleId')).toBe(row.source.fields.exampleId);
        expect(Reflect.get(target, 'exampleId')).toBeUndefined();
    });

    test('an invalid field is refused as today and cannot reach the scene', () => {
        const stored = file();
        const collection = row.create().presetCollection();
        const target = mounted();
        act(() => { row.preceding[1](target); });
        const state = target.state;
        for (const graphState of row.forbidden) {
            expect(collection.checkGraphState?.(graphState)).not.toBeUndefined();
            expect(() => target.importPreset({...stored, graphState})).toThrow();
            expect(target.state).toBe(state);
        }
        const persistence = pointSetPersistence(row.overlayIds, target.extension());
        const defaults: PointSetSceneState = {initialized: false, model: CUSTOM, overlays: {}};
        const rebuilt = persistence.reconstruct(row.source.model, {...row.hostile, overlays: {grid: true, bogus: true}}, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['initialized', 'model', 'overlays', ...names].sort());
        expect(rebuilt.model).toEqual(row.source.model);
        expect(rebuilt.overlays).toEqual({grid: true});
        expect(wire(names.map(name => Reflect.get(rebuilt, name)))).toEqual(freshScene);
        const live = Object.assign({initialized: true, model: row.source.model, overlays: {grid: true, bogus: undefined}}, row.hostile, {initialized: true, model: row.source.model, overlays: {grid: true, bogus: undefined}});
        const projected = persistence.project(live);
        expect(wire(projected.graphState)).toEqual({initialized: true, overlays: {grid: true}, ...row.fresh});
        expect(projected.data).toEqual(row.source.model);
    });

    test('a figure Preset and the lesson default agree with import, and the entry scene returns exactly', () => {
        const stored = file();
        const target = mounted();
        act(() => { row.preceding[1](target); });
        const entry = wire(target.exportPreset());
        const entryModel = target.model;
        const expected = {...expectedGraphState, model: row.source.model};
        expect(wire(target.figureStateOf(stored))).toEqual(expected);
        expect(target.model).toEqual(entryModel);
        act(() => { expect(wire(target.figureScene(stored))).toEqual(expected); });
        expect(target.model).toEqual(row.source.model);
        expect(wire(target.figureStateOf({id: row.key, data: wire(row.source.model), graphState: {initialized: true}}))).toEqual({...freshState, model: row.source.model});
        expect(wire(target.figureStateOf({id: row.key, data: wire(row.source.model)}))).toEqual({...freshState, model: row.source.model});
        // Returning to the entry scene gives back its fields and overlays, whatever the live scene is.
        act(() => { row.source.load(target); });
        expect(wire(target.figureStateOf(entry))).toEqual({...entry.graphState, model: entryModel});
        act(() => { target.figureScene(entry); });
        expect(target.model).toEqual(entryModel);

        act(() => { target.resetToDefaultScene(); });
        expect(scene(target)).toEqual(freshScene);
        expect(wire(target.lessonDefault(wire(row.source.model)))).toEqual({...freshState, model: row.source.model});
        expect(wire(target.lessonDefault(wire(row.source.model)))).toEqual(wire(target.figureStateOf({id: row.key, data: wire(row.source.model), graphState: {initialized: true}})));
    });

    test('a bare data import keeps every field; the example id names the vertices only while they match', () => {
        const target = mounted();
        act(() => { row.source.load(target); });
        act(() => { target.importPresetData(wire(row.otherModel)); });
        expect(target.model).toEqual(row.otherModel);
        expect(scene(target)).toEqual(names.map(name => row.source.fields[name]));
        expect(wire(target.state.overlays)).toEqual(expectedOverlays);
        expect(Reflect.get(target, 'exampleId')).toBeUndefined();
    });
});

describe('simson-line stored values', () => {
    const make = (): Simson => { const graph = new Simson(); mount(graph); return graph; };
    test('t is stored as given and resolved when read; pPrime and epsilon are not coupled to the vertices', () => {
        const target = make();
        act(() => { target.importPreset({id: SIMSON_LINE_PRESET_KEY, data: wire(DEFAULT_TRIANGLE), graphState: gs({initialized: true, t: 725, mode: 'exact', epsilon: -0.2, pPrime: {x: 10, y: -10}})}); });
        expect(field(target, 't')).toBe(725);
        expect(target.settings.t).toBe(5);
        expect(field(target, 'pPrime')).toEqual({x: 10, y: -10});
        expect(target.settings.epsilon).toBe(-0.2);
        act(() => { target.importPreset({id: SIMSON_LINE_PRESET_KEY, data: wire(DEFAULT_TRIANGLE), graphState: gs({initialized: true})}); });
        expect(field(target, 't')).toBe(60);
        expect(target.exportPreset().graphState).toEqual({
            initialized: true, overlays: {triangle: true, sidelines: true, circumcircle: true, perpendiculars: true, simson: true, pedal: true},
            exampleId: 'default', mode: 'glider', t: 60, epsilon: 0, pPrime: {x: 2, y: -2},
        });
    });
});

describe('inversion stored values', () => {
    const make = (): Inversion => { const graph = new Inversion(); mount(graph); return graph; };
    test('nested fields are copies, the power direction is stored as given and read normalised', () => {
        const target = make();
        const graphState = {initialized: true, power: {circle: {centre: {x: 6, y: -2}, radius: 2}, thetaDeg: 359.5}, x: {x: 4, y: 4}};
        act(() => { target.importPreset({id: INVERSION_PRESET_KEY, data: wire(ORIGIN), graphState: gs(graphState)}); });
        expect(field(target, 'power')).toEqual(graphState.power);
        expect(field(target, 'power')).not.toBe(graphState.power);
        expect(field(target, 'x')).not.toBe(graphState.x);
        expect(target.fields.power.thetaDeg).toBe(359.5);
        expect(target.fields.x).toEqual({x: 4, y: 4});
        expect(target.exportPreset().graphState).toMatchObject({focus: 'point', radius: 2, power: graphState.power, x: {x: 4, y: 4}});
    });
});
