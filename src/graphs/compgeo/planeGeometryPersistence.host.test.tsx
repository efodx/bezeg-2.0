import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {NotablePointsGraph} from './NotablePointsGraph';
import {EulerLineGraph} from './EulerLineGraph';
import {InscribedAngleGraph} from './InscribedAngleGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {Preset} from '../base/presets/Presets';
import type {PointSetGraphState} from './PointSetGraph';
import type {PointSetModel} from '../../compgeo/pointSetModel';
import {PointSetExtension, pointSetPersistence, PointSetSceneState} from './pointSetPersistence';
import {NOTABLE_POINTS_OVERLAY_IDS, NOTABLE_POINTS_PRESET_KEY} from './notablePointsPresetCollection';
import {EULER_LINE_OVERLAY_IDS, EULER_LINE_PRESET_KEY} from './eulerLinePresetCollection';
import {INSCRIBED_ANGLE_OVERLAY_IDS, INSCRIBED_ANGLE_PRESET_KEY} from './inscribedAnglePresetCollection';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// Triangle centres, Euler line and inscribed angle (task 08 batch 6a) declare their persisted scene through
// `pointSetPersistence(ids, extension)`: `data` is the three vertices, `graphState` is `initialized`, the overlays, the example
// id and (inscribed angle) the glider parameter `t` in degrees. Every expected value is authored by hand.

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

class Notable extends NotablePointsGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
class Euler extends EulerLineGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
class Inscribed extends InscribedAngleGraph {
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
type Rows = Notable | Euler | Inscribed;

interface Row {
    name: string;
    key: string;
    create: () => Rows;
    overlayIds: readonly string[];
    /** The source scene: its vertices, example id, extra stored fields and the overlays it changes from the initial ones. */
    source: {model: PointSetModel; exampleId: string; extras: object; overlays: Record<string, boolean>; load: (graph: Rows) => void};
    /** Two distinct preceding scenes, each loaded over the previous one. */
    preceding: Array<(graph: Rows) => void>;
    initialOverlays: Record<string, boolean>;
    fresh: object;
}
const as = {
    notable: (g: Rows) => g as Notable, euler: (g: Rows) => g as Euler, inscribed: (g: Rows) => g as Inscribed,
};
const ROWS: Row[] = [
    {
        name: 'triangle-centres', key: NOTABLE_POINTS_PRESET_KEY, create: () => new Notable(), overlayIds: NOTABLE_POINTS_OVERLAY_IDS,
        source: {
            model: model([[0, 0], [4, 0], [0, 3]]), exampleId: 'right', extras: {}, overlays: {grid: true, incentre: true},
            load: g => { const n = as.notable(g); n.loadExample('right'); n.setOverlay('grid', true); n.setOverlay('incentre', true); },
        },
        preceding: [
            g => { const n = as.notable(g); n.loadExample('obtuse'); n.setOverlay('triangle', false); },
            g => { const n = as.notable(g); n.loadModel(CUSTOM); n.setState(patch({exampleId: 'degenerate'})); n.setOverlay('orthocentre', true); },
        ],
        initialOverlays: {triangle: true, centroid: true, circumcentre: false, incentre: false, orthocentre: false},
        fresh: {exampleId: 'default'},
    },
    {
        name: 'euler-line', key: EULER_LINE_PRESET_KEY, create: () => new Euler(), overlayIds: EULER_LINE_OVERLAY_IDS,
        source: {
            model: model([[0, 0], [6, 0], [3, 5]]), exampleId: 'isosceles', extras: {}, overlays: {ninepoints: true, line: false},
            load: g => { const e = as.euler(g); e.loadExample('isosceles'); e.setOverlay('ninepoints', true); e.setOverlay('line', false); },
        },
        preceding: [
            g => { const e = as.euler(g); e.loadExample('near-equilateral'); e.setOverlay('circle', false); },
            g => { const e = as.euler(g); e.loadModel(CUSTOM); e.setState(patch({exampleId: 'degenerate'})); e.setOverlay('grid', true); },
        ],
        initialOverlays: {triangle: true, centres: true, line: true, circle: true, ninepoints: false, circumcircle: false},
        fresh: {exampleId: 'default'},
    },
    {
        name: 'inscribed-angle', key: INSCRIBED_ANGLE_PRESET_KEY, create: () => new Inscribed(), overlayIds: INSCRIBED_ANGLE_OVERLAY_IDS,
        source: {
            model: model([[0, 0], [8, 6], [1, 7]]), exampleId: 'thales', extras: {t: 250}, overlays: {radii: true, grid: true},
            load: g => { const i = as.inscribed(g); i.loadExample('thales'); i.setT(250); i.setOverlay('radii', true); i.setOverlay('grid', true); },
        },
        preceding: [
            g => { const i = as.inscribed(g); i.loadExample('default'); i.setT(30); i.setOverlay('angles', false); },
            g => { const i = as.inscribed(g); i.loadModel(CUSTOM); i.setState(patch({exampleId: 'thales', t: 100})); },
        ],
        initialOverlays: {radii: false, angles: true},
        fresh: {exampleId: 'default', t: 90},
    },
];

describe.each(ROWS)('$name scene persistence', row => {
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    const expectedGraphState = {initialized: true, overlays: {...row.initialOverlays, ...row.source.overlays}, exampleId: row.source.exampleId, ...row.source.extras};
    const file = () => { const graph = mounted(); act(() => { row.source.load(graph); }); return wire(graph.exportPreset()); };
    const names = Object.keys(row.fresh);
    const scene = (graph: Rows) => names.map(name => field(graph, name));
    const freshScene = names.map(name => Reflect.get(row.fresh, name));
    const freshState = {initialized: true, overlays: row.initialOverlays, ...row.fresh};

    test('a round trip after two distinct preceding scenes keeps vertices, overlays, example id and parameter', () => {
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
        expect(target.model).toEqual(CUSTOM);
        expect(scene(target)).not.toEqual(scene(mounted()));
        act(() => { target.importPreset(stored); });
        expect(target.model).toEqual(row.source.model);
        expect(wire(target.state.overlays)).toEqual(expectedGraphState.overlays);
        expect(target.state.initialized).toBe(true);
        expect(target.exportPreset().graphState).toEqual(stored.graphState);
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
        expect(target.model).toEqual(DEFAULT_TRIANGLE);
        expect(scene(target)).toEqual(freshScene);

        // A named field is kept even when it does not name the vertices (the example id is checked at read time).
        preceding();
        act(() => { target.importPreset({id: row.key, data: wire(DEGENERATE), graphState: gs({initialized: true, exampleId: row.source.exampleId})}); });
        expect(field(target, 'exampleId')).toBe(row.source.exampleId);
        expect(Reflect.get(target, 'exampleId')).toBeUndefined();
    });

    test('an unknown example id or a bad parameter is refused as today and cannot reach the scene', () => {
        const stored = file();
        const collection = row.create().presetCollection();
        const target = mounted();
        act(() => { row.preceding[1](target); });
        const state = target.state;
        const forbidden: object[] = [
            {initialized: true, model: row.source.model},
            {extra: 1},
            {exampleId: 'nonexistent'},
            {exampleId: 7},
            {overlays: {nonexistent: true}},
            ...(row.name === 'inscribed-angle' ? [{t: 'x'}, {t: Number.NaN}, {t: Infinity}] : []),
        ];
        for (const graphState of forbidden) {
            expect(collection.checkGraphState?.(graphState)).not.toBeUndefined();
            expect(() => target.importPreset({...stored, graphState})).toThrow();
            expect(target.state).toBe(state);
        }
        const persistence = pointSetPersistence(row.overlayIds, target.extension());
        const defaults: PointSetSceneState = {initialized: false, model: CUSTOM, overlays: {}};
        const hostile = {initialized: true, model: CUSTOM, extra: 1, exampleId: 'nonexistent', t: 'x', overlays: {grid: true, bogus: true}};
        const rebuilt = persistence.reconstruct(row.source.model, hostile, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['exampleId', 'initialized', 'model', 'overlays', ...(row.name === 'inscribed-angle' ? ['t'] : [])]);
        expect(rebuilt.model).toEqual(row.source.model);
        expect(rebuilt.overlays).toEqual({grid: true});
        expect(wire(names.map(name => Reflect.get(rebuilt, name)))).toEqual(freshScene);
        const projected = persistence.project(Object.assign({initialized: true, model: row.source.model, overlays: {grid: true, bogus: undefined}}, {exampleId: 'bad', t: Number.NaN, extra: 1}));
        expect(wire(projected.graphState)).toEqual({initialized: true, overlays: {grid: true}, ...row.fresh});
        expect(projected.data).toEqual(row.source.model);
    });

    test('a figure Preset and the lesson default agree with import, and the entry scene returns exactly', () => {
        const stored = file();
        const target = mounted();
        act(() => { row.preceding[1](target); });
        const entry = wire(target.exportPreset());
        const expected = {initialized: true, model: row.source.model, overlays: expectedGraphState.overlays, exampleId: row.source.exampleId, ...row.source.extras};
        expect(wire(target.figureStateOf(stored))).toEqual(expected);
        expect(target.model).toEqual(CUSTOM);
        act(() => { expect(wire(target.figureScene(stored))).toEqual(expected); });
        expect(target.model).toEqual(row.source.model);
        expect(wire(target.figureStateOf({id: row.key, data: wire(row.source.model), graphState: {initialized: true}}))).toEqual({...freshState, model: row.source.model});
        expect(wire(target.figureStateOf({id: row.key, data: wire(row.source.model)}))).toEqual({...freshState, model: row.source.model});
        // Returning to the entry scene gives back its example id, parameter and overlays, whatever the live scene is.
        act(() => { row.source.load(target); });
        expect(wire(target.figureStateOf(entry))).toEqual({...entry.graphState, model: CUSTOM});
        act(() => { target.figureScene(entry); });
        expect(target.model).toEqual(CUSTOM);

        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(DEFAULT_TRIANGLE);
        expect(scene(target)).toEqual(freshScene);
        expect(wire(target.lessonDefault(wire(row.source.model)))).toEqual({...freshState, model: row.source.model});
        expect(wire(target.lessonDefault(wire(row.source.model)))).toEqual(wire(target.figureStateOf({id: row.key, data: wire(row.source.model), graphState: {initialized: true}})));
    });

    test('a bare data import keeps the example id and parameter; the id names the vertices only while they match', () => {
        const target = mounted();
        act(() => { row.source.load(target); });
        act(() => { target.importPresetData(wire(CUSTOM)); });
        expect(target.model).toEqual(CUSTOM);
        expect(field(target, 'exampleId')).toBe(row.source.exampleId);
        expect(Reflect.get(target, 'exampleId')).toBeUndefined();
        if (row.name === 'inscribed-angle') expect(field(target, 't')).toBe(250);
        act(() => { target.importPresetData(wire(row.source.model)); });
        expect(Reflect.get(target, 'exampleId')).toBe(row.source.exampleId);
        expect(wire(target.state.overlays)).toEqual(expectedGraphState.overlays);
    });
});

describe('inscribed-angle parameter', () => {
    const make = (): Inscribed => { const graph = new Inscribed(); mount(graph); return graph; };
    test('any finite t is stored as given and resolved when read; a missing t is 90', () => {
        const target = make();
        act(() => { target.loadExample('thales'); });
        act(() => { target.importPreset({id: INSCRIBED_ANGLE_PRESET_KEY, data: wire(DEFAULT_TRIANGLE), graphState: gs({initialized: true, t: 725})}); });
        expect(field(target, 't')).toBe(725);
        expect(target.t).toBe(5);
        act(() => { target.importPreset({id: INSCRIBED_ANGLE_PRESET_KEY, data: wire(DEFAULT_TRIANGLE), graphState: gs({initialized: true, t: -30})}); });
        expect(field(target, 't')).toBe(-30);
        expect(target.t).toBe(330);
        act(() => { target.importPreset({id: INSCRIBED_ANGLE_PRESET_KEY, data: wire(DEFAULT_TRIANGLE), graphState: gs({initialized: true})}); });
        expect(field(target, 't')).toBe(90);
        expect(target.exportPreset().graphState).toEqual({initialized: true, overlays: {radii: false, angles: true}, exampleId: 'default', t: 90});
    });
});
