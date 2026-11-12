import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {EarClippingGraph} from './EarClippingGraph';
import {IntervalSweepGraph} from './IntervalSweepGraph';
import {BentleyOttmannGraph} from './BentleyOttmannGraph';
import {MonotonePartitionGraph} from './MonotonePartitionGraph';
import {MonotoneTriangulationGraph} from './MonotoneTriangulationGraph';
import {FortuneGraph} from './FortuneGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {Preset} from '../base/presets/Presets';
import type {PointSetModel} from '../../compgeo/pointSetModel';
import {pointSetPersistence, PointSetSceneState, PointSetStepDeclaration} from './pointSetPersistence';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// The step graphs of task 08 batch 3a declare their persisted scene through `pointSetPersistence(ids, step)`. Every expected
// value below is authored by hand (models, steps, overlays), never read back from the projection under test; a trace length is
// read from the graph's own run, which the persistence does not produce.

// One test subclass per graph with the same protected readers, so that the suite is one `describe.each`.
class Ear extends EarClippingGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    declaration(): PointSetStepDeclaration | undefined { return this.persistenceStep(); }
}
class Interval extends IntervalSweepGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    declaration(): PointSetStepDeclaration | undefined { return this.persistenceStep(); }
}
class Bentley extends BentleyOttmannGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    declaration(): PointSetStepDeclaration | undefined { return this.persistenceStep(); }
}
class Partition extends MonotonePartitionGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    declaration(): PointSetStepDeclaration | undefined { return this.persistenceStep(); }
}
class Triangulation extends MonotoneTriangulationGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    declaration(): PointSetStepDeclaration | undefined { return this.persistenceStep(); }
}
class Fortune extends FortuneGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    declaration(): PointSetStepDeclaration | undefined { return this.persistenceStep(); }
}

type Rows = Ear | Interval | Bentley | Partition | Triangulation | Fortune;
const mount = (graph: Rows) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const model = (mode: PointSetModel['mode'], points: Array<[number, number]>): PointSetModel =>
    ({mode, closed: mode === 'polygon', gridStepExponent: 0, points: points.map(([x, y]) => ({x, y}))});
const polygon = (points: Array<[number, number]>) => model('polygon', points);
const sites = (points: Array<[number, number]>) => model('points', points);
const intervals = (pairs: Array<[number, number]>) => model('intervals', pairs.flatMap(([a, b], k) => [[a, k + 1], [b, k + 1]] as Array<[number, number]>));
const segments = (rows: Array<[number, number, number, number]>) => model('segments', rows.flatMap(([a, b, c, d]) => [[a, b], [c, d]] as Array<[number, number]>));

type Scene = {model: PointSetModel; overlays: Record<string, boolean>; step: number};
interface Row {
    name: string;
    create: () => Rows;
    defaultModel: PointSetModel;
    defaultOverlays: Record<string, boolean>;
    scene: Scene;
    /** The persisted overlays of `scene`: the defaults, changed by `scene.overlays`. */
    sceneOverlays: Record<string, boolean>;
    preceding: Scene[];
    other: PointSetModel;
    /** An overlay id the graph owns. */
    named: string;
    /** A polygon graph: an open polygon in the file becomes the closed one. */
    closes?: boolean;
}

const MONO_2 = polygon([[4, 0], [10, 2], [8, 5], [12, 9], [7, 7], [5, 12], [3, 7], [0, 9], [2, 4]]);
const MONO_1 = polygon([[0, 0], [4, 3], [8, 0], [12, 8], [8, 5], [4, 8]]);
const COMB = polygon([[0, 0], [18, 0], [16, 2], [15, 6], [14, 2], [10, 2], [9, 6], [8, 2], [4, 2], [3, 6], [2, 2]]);

const ROWS: Row[] = [
    {
        name: 'ear-clipping', create: () => new Ear(),
        defaultModel: polygon([[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]]), defaultOverlays: {trace: true, reflex: true},
        scene: {model: COMB, overlays: {trace: false, grid: true}, step: 3}, sceneOverlays: {trace: false, reflex: true, grid: true},
        preceding: [
            {model: polygon([[0, 0], [6, 0], [6, 4], [3, 2], [0, 4]]), overlays: {reflex: false}, step: 1},
            {model: polygon([[0, 0], [8, 0], [8, 5], [4, 3], [0, 5], [-2, 2]]), overlays: {trace: false}, step: 2},
        ],
        other: polygon([[0, 0], [2, 0], [2, 2], [0, 2]]), named: 'reflex', closes: true,
    },
    {
        name: 'interval-sweep', create: () => new Interval(),
        defaultModel: intervals([[0, 4], [2, 7], [3, 5], [6, 9], [8, 10]]), defaultOverlays: {sweep: true},
        scene: {model: intervals([[0, 3], [3, 6], [3, 3], [5, 8]]), overlays: {sweep: false, grid: true}, step: 3}, sceneOverlays: {sweep: false, grid: true},
        preceding: [
            {model: intervals([[0, 4], [2, 7], [3, 5], [6, 9], [8, 10]]), overlays: {grid: true}, step: 1},
            {model: intervals([[1, 2], [3, 4], [5, 9]]), overlays: {sweep: false}, step: 2},
        ],
        other: intervals([[7, 8], [1, 9]]), named: 'sweep',
    },
    {
        name: 'segment-intersections', create: () => new Bentley(),
        defaultModel: segments([[0, 0, 6, 4], [0, 4, 6, 0], [1, -1, 2, 5], [4, 5, 5, -1]]), defaultOverlays: {sweep: true},
        scene: {model: segments([[0, 0, 4, 4], [0, 4, 4, 0], [0, 2, 4, 2], [2, 0, 2, 4]]), overlays: {sweep: false, grid: true}, step: 3},
        sceneOverlays: {sweep: false, grid: true},
        preceding: [
            {model: segments([[0, 0, 6, 4], [0, 4, 6, 0], [1, -1, 2, 5], [4, 5, 5, -1]]), overlays: {grid: true}, step: 1},
            {model: segments([[0, 0, 5, 5], [0, 5, 5, 0], [1, 3, 4, 3]]), overlays: {sweep: false}, step: 2},
        ],
        other: segments([[0, 0, 1, 1], [0, 1, 1, 0]]), named: 'sweep',
    },
    {
        name: 'monotone-partition', create: () => new Partition(),
        defaultModel: MONO_1, defaultOverlays: {sweep: true},
        scene: {model: MONO_2, overlays: {sweep: false, grid: true}, step: 3}, sceneOverlays: {sweep: false, grid: true},
        preceding: [
            {model: MONO_1, overlays: {grid: true}, step: 1},
            {model: polygon([[0, 0], [6, 1], [8, 6], [4, 3], [1, 7]]), overlays: {sweep: false}, step: 2},
        ],
        other: polygon([[0, 0], [2, 0], [2, 2], [0, 2]]), named: 'sweep', closes: true,
    },
    {
        name: 'monotone-triangulation', create: () => new Triangulation(),
        defaultModel: MONO_1, defaultOverlays: {sweep: true},
        scene: {model: MONO_2, overlays: {sweep: false, grid: true}, step: 3}, sceneOverlays: {sweep: false, grid: true},
        preceding: [
            {model: MONO_1, overlays: {grid: true}, step: 1},
            {model: polygon([[0, 0], [6, 1], [8, 6], [4, 3], [1, 7]]), overlays: {sweep: false}, step: 2},
        ],
        other: polygon([[0, 0], [2, 0], [2, 2], [0, 2]]), named: 'sweep', closes: true,
    },
    {
        name: 'fortune', create: () => new Fortune(),
        defaultModel: sites([[0, 5], [-4, 3], [4, 3], [0, -3]]), defaultOverlays: {},
        scene: {model: sites([[0, 5], [5, 0], [0, -5], [-5, 0]]), overlays: {grid: true}, step: 3}, sceneOverlays: {grid: true},
        preceding: [
            {model: sites([[0, 5], [-4, 3], [4, 3]]), overlays: {grid: true}, step: 1},
            {model: sites([[-6, -3], [-2, -1], [2, 1], [6, 3]]), overlays: {grid: false}, step: 2},
        ],
        other: sites([[1, 1], [2, 5], [6, 2]]), named: 'grid',
    },
];

describe.each(ROWS)('$name step persistence', row => {
    const place = (graph: Rows, s: Scene) => {
        graph.loadModel(s.model);
        for (const [id, shown] of Object.entries(s.overlays)) graph.setOverlay(id as never, shown);
        graph.setState({step: s.step});
        // The step must be inside the trace, or the scene would not show what the test says it shows.
        expect(graph.run().length).toBeGreaterThan(s.step + 1);
    };
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    const source = (): Rows => { const graph = mounted(); act(() => { place(graph, row.scene); }); return graph; };
    const last = (graph: Rows) => graph.run().length - 1;

    test('a round trip after two distinct preceding scenes keeps the model, the overlays and the step', () => {
        const file = wire(source().exportPreset());
        expect(file.data).toEqual(row.scene.model);
        expect(file.graphState).toEqual({initialized: true, overlays: row.sceneOverlays, step: 3});
        expect(Object.keys(file).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        const collection = row.create().presetCollection();
        expect(collection.check(file.data)).toEqual({data: row.scene.model});
        expect(collection.checkGraphState?.(file.graphState)).toBeUndefined();

        const target = mounted();
        for (const preceding of row.preceding) act(() => { place(target, preceding); });
        act(() => { target.importPreset(file); });
        expect(target.model).toEqual(row.scene.model);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual(row.sceneOverlays);
        expect(target.state.step).toBe(3);
        expect(target.step).toBe(3);
        expect(target.isPlaying).toBe(false);
        expect(wire(target.exportPreset().data)).toEqual(file.data);
        expect(target.exportPreset().graphState).toEqual(file.graphState);
    });

    test('a partial Preset starts from the defaults, never from the preceding scene; an omitted step is 0', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        act(() => { place(target, row.preceding[1]); });
        expect(target.step).toBe(2);
        act(() => { target.importPreset({id: file.id, data: file.data}); });
        expect(target.model).toEqual(row.scene.model);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        expect(target.state.step).toBe(0);
        expect(target.step).toBe(0);
        // A step alone, and overlays alone (the step is then the default 0, not the preceding scene's).
        act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({step: 2})}); });
        expect(target.step).toBe(2);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        act(() => { place(target, row.preceding[0]); });
        act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({overlays: {[row.named]: false}})}); });
        expect(wire(target.state.overlays)).toEqual({[row.named]: false});
        expect(target.step).toBe(0);
        // Only `initialized`: the fixed default model and the first step.
        act(() => { place(target, row.preceding[1]); });
        act(() => { target.importPreset({id: file.id, graphState: {initialized: true}}); });
        expect(target.model).toEqual(row.defaultModel);
        expect(target.step).toBe(0);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
    });

    test('a step outside the trace is clamped to it; a fractional one is truncated', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        const expectStep = (step: number, expected: number | 'last') => {
            act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({step})}); });
            const want = expected === 'last' ? last(target) : expected;
            expect(target.state.step).toBe(want);
            expect(target.step).toBe(want);
            expect(target.exportPreset().graphState).toMatchObject({step: want});
        };
        expect(last(source())).toBeGreaterThan(3);
        expectStep(9999, 'last');
        expectStep(-7, 0);
        expectStep(2.7, 2);
        expectStep(0, 0);
        // The figure scene state agrees with the import.
        expect(target.figureStateOf({id: file.id, data: file.data, graphState: wire({step: 9999})}).step).toBe(last(target));
        expect(target.figureStateOf({id: file.id, data: file.data, graphState: wire({step: -1})}).step).toBe(0);
    });

    test('a malformed Preset is refused before the scene, the state or the board change', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        act(() => { place(target, row.preceding[0]); });
        const state = target.state;
        const data = target.model;
        const refused: Array<Preset> = [
            {...file, data: {...file.data, points: [{x: 0.5, y: 1}]}},
            {...file, graphState: {initialized: true, model: row.other}},
            {...file, graphState: {overlays: {nonexistent: true}}},
            {...file, graphState: {overlays: {[row.named]: 'yes'}}},
            {...file, graphState: {step: '3'}},
            {...file, graphState: {step: null}},
            {...file, graphState: {step: Number.NaN}},
            {...file, graphState: {step: 1, extra: 1}},
        ];
        for (const preset of refused) {
            expect(() => target.importPreset(preset)).toThrow();
            expect(target.state).toBe(state);
            expect(target.model).toBe(data);
            expect(target.step).toBe(1);
        }
    });

    test('a model, an unknown overlay or an extra key in the permitted state cannot reach the result', () => {
        const declaration = row.create().declaration();
        expect(declaration).toBeDefined();
        const persistence = pointSetPersistence(['grid', ...Object.keys(row.defaultOverlays)], declaration);
        const defaults: PointSetSceneState = {initialized: false, model: row.other, overlays: row.defaultOverlays, step: 2};
        const forbidden = {initialized: true, model: row.other, extra: 1, step: 3, overlays: {[row.named]: false, bogus: true, constructor: true}};
        const rebuilt = persistence.reconstruct(row.scene.model, forbidden, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['initialized', 'model', 'overlays', 'step']);
        expect(rebuilt.model).toEqual(row.scene.model);
        expect(rebuilt.initialized).toBe(true);
        expect(rebuilt.overlays).toEqual({[row.named]: false});
        expect(rebuilt.step).toBe(3);
        // A step that is not a finite number is dropped, and the defaults' step never stands in for an omitted one.
        for (const junk of ['3', null, Number.NaN, Number.POSITIVE_INFINITY, [1], {valueOf: () => 3}, undefined]) {
            expect(persistence.reconstruct(row.scene.model, {step: junk}, defaults).step).toBe(0);
        }
        expect(persistence.reconstruct(row.scene.model, undefined, defaults).step).toBe(0);
        expect(persistence.reconstruct(row.scene.model, 'junk', defaults)).toEqual({...defaults, model: row.scene.model, step: 0});
        expect(persistence.reconstruct(row.scene.model, {step: 2.9}, defaults).step).toBe(2);
        expect(persistence.reconstruct(row.scene.model, {step: -4}, defaults).step).toBe(0);
        // The reconstructed model is a fresh copy.
        expect(rebuilt.model).not.toBe(row.scene.model);
        // The projection names the step, clamped to the data, and never writes a model into graphState.
        const projected = persistence.project({initialized: true, model: row.scene.model, overlays: {[row.named]: true, bogus: undefined}, step: 3});
        expect(projected.graphState).toEqual({initialized: true, overlays: {[row.named]: true}, step: 3});
        expect(projected.data).toEqual(row.scene.model);
        expect(persistence.project({initialized: true, model: row.scene.model, overlays: {}, step: 9999}).graphState.step).toBe(last(source()));
        expect(persistence.project({initialized: true, model: row.scene.model, overlays: {}}).graphState.step).toBe(0);
    });

    if (row.closes) {
        test('an open polygon in a file becomes the closed polygon the graph works on', () => {
            const target = mounted();
            const id = target.presets()!;
            const open = {...row.scene.model, closed: false};
            act(() => { target.importPreset({id, data: wire(open), graphState: wire({step: 1})}); });
            expect(target.model).toEqual(row.scene.model);
            expect(target.step).toBe(1);
            expect(target.figureStateOf({id, data: wire(open)}).model).toEqual(row.scene.model);
        });
    }

    test('the lesson default scene and a lesson fixture start fresh from their own data, at step 0', () => {
        const target = mounted();
        act(() => { place(target, row.preceding[1]); });
        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(row.defaultModel);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        expect(target.state.step).toBe(0);
        expect(target.step).toBe(0);
        expect(wire(target.lessonDefault(row.other))).toEqual({initialized: true, model: row.other, overlays: row.defaultOverlays, step: 0});
        expect(target.lessonDefault(row.scene.model).model).toEqual(row.scene.model);
        expect(target.model).toEqual(row.defaultModel);
    });

    test('a figure Preset gives a scene state that is a function of its data, and the entry scene returns exactly', () => {
        const file = wire(source().exportPreset());
        const target = mounted();
        act(() => { place(target, row.preceding[0]); });
        const entry = wire(target.exportPreset());
        expect(entry.graphState.step).toBe(1);
        const expected = {initialized: true, model: row.scene.model, overlays: row.sceneOverlays, step: 3};
        // Computed from the Preset alone: the live scene (another model, step 1) must not leak in.
        expect(wire(target.figureStateOf(file))).toEqual(expected);
        expect(target.model).not.toEqual(row.scene.model);
        act(() => { expect(wire(target.figureScene(file))).toEqual(expected); });
        expect(target.model).toEqual(row.scene.model);
        // Omitted graphState and omitted data: the defaults, and step 0 whatever the live step was.
        expect(wire(target.figureStateOf({id: file.id, data: file.data}))).toEqual({...expected, overlays: row.defaultOverlays, step: 0});
        expect(wire(target.figureStateOf({id: file.id, graphState: {initialized: true}}))).toEqual({initialized: true, model: row.defaultModel, overlays: row.defaultOverlays, step: 0});
        // Returning to the entry scene restores the first scene's model, overlays and step.
        act(() => { expect(wire(target.figureScene(entry))).toEqual({initialized: true, model: entry.data, overlays: entry.graphState.overlays, step: 1}); });
        expect(target.model).toEqual(row.preceding[0].model);
    });

    test('a checkpoint keeps the trusted scene state, step included; the file holds only the projection', () => {
        const graph = source();
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => { capabilities.apply({kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'}); });
        expect(graph.model).toEqual(row.defaultModel);
        expect(graph.step).toBe(0);
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.model).toEqual(row.scene.model);
        expect(wire(graph.state.overlays)).toEqual(row.sceneOverlays);
        expect(graph.state.step).toBe(3);
        expect(graph.step).toBe(3);
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/pointSetSelected|displayState|transientState/);
    });
});
