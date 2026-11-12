import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {HullTraceGraph, HULL_TRACE_SAMPLE_1} from './HullTraceGraph';
import {HullRobustnessGraph} from './HullRobustnessGraph';
import {BezierHullsGraph} from './BezierHullsGraph';
import {BezierClippingGraph} from './BezierClippingGraph';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {clipBezierPair} from '../../bezeg/impl/kernels/bezier-clipping';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import type {Preset} from '../base/presets/Presets';
import type {PointSetModel} from '../../compgeo/pointSetModel';
import {PointSetExtension, pointSetPersistence, PointSetSceneState} from './pointSetPersistence';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// The extension graphs of task 08 batch 3b (convex-hull, hull-robustness, bezier-hulls, bezier-clipping) declare their persisted
// scene through `pointSetPersistence(ids, extension)`. Every expected value below is authored by hand (models, fields,
// overlays), never read back from the projection under test; a trace length is read from the graph's own run, which the
// persistence does not produce (the clipping lengths also from the kernel).

type Fields = Record<string, number | string>;
type Scene = {model: PointSetModel; overlays: Record<string, boolean>; fields: Fields};

class Hull extends HullTraceGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
    put(s: Scene) {
        this.loadModel(s.model);
        for (const [id, shown] of Object.entries(s.overlays)) this.setOverlay(id as never, shown);
        this.setAlgorithm(s.fields.algorithm as never);
        this.setState({step: Number(s.fields.step)});
    }
}
class Robust extends HullRobustnessGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
    put(s: Scene) {
        this.setRobustnessMode('chain');
        this.loadModel(s.model);
        for (const [id, shown] of Object.entries(s.overlays)) this.setOverlay(id as never, shown);
        this.setPopRule(s.fields.pop as never);
        this.setDuplicateRule(s.fields.duplicates as never);
        this.setKettnerPanel(s.fields.panel as never);
        this.selectKettnerCell(Number(s.fields.cellI), Number(s.fields.cellJ));
        this.setState({step: Number(s.fields.step)});
        this.setRobustnessMode(s.fields.mode as never);
    }
}
class BHulls extends BezierHullsGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
    put(s: Scene) {
        this.loadModel(s.model);
        for (const [id, shown] of Object.entries(s.overlays)) this.setOverlay(id as never, shown);
        this.setState({step: Number(s.fields.step)});
    }
}
class BClip extends BezierClippingGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
    put(s: Scene) {
        this.loadModel(s.model);
        for (const [id, shown] of Object.entries(s.overlays)) this.setOverlay(id as never, shown);
        this.setClipTolerance(Number(s.fields.clipToleranceExponent));
        this.setState({step: Number(s.fields.step)});
    }
}

type Rows = Hull | Robust | BHulls | BClip;
const mount = (graph: Rows) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const points = (list: Array<[number, number]>): PointSetModel => ({mode: 'points', closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});
const pick = (state: object, names: string[]) => Object.fromEntries(names.map(name => [name, Reflect.get(state, name)]));

interface Row {
    name: string;
    create: () => Rows;
    defaultModel: PointSetModel;
    defaultOverlays: Record<string, boolean>;
    /** The scene a file carries, every field named, and the overlays it persists (the defaults changed by `scene.overlays`). */
    scene: Scene;
    sceneOverlays: Record<string, boolean>;
    /** Two scenes with other values in every field, placed first so that nothing of them may survive an import. */
    preceding: [Scene, Scene];
    other: PointSetModel;
    named: string;
    /** The value of each field when the Preset names none. */
    defaultFields: Fields;
    /** The values a field may not take from a file or a state, by field. */
    junk: Record<string, unknown[]>;
    /** A hull is shown on points. */
    showsPoints?: boolean;
    /** Step: any finite number (truncated), as in the hull collections; otherwise a nonnegative whole number. */
    finiteStep?: boolean;
    /** The two Bezier graphs: an unnamed step (and tolerance) in a Preset resets to the default. */
    contextual?: boolean;
}

const HULL_A = points([[1, 1], [7, 0], [5, 6], [2, 5], [4, 3], [6, 2], [3, 0], [0, 3]]);
const HULL_B = points([[0, 0], [6, 0], [3, 5], [3, 2], [1, 1], [5, 1], [3, 1], [2, 4]]);
const HULL_C = points([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2], [1, 3], [3, 1], [2, 0]]);
const PAIR_A = points([[0, 0], [3, 5], [6, 0], [0, 4], [3, -2], [6, 4]]);
const PAIR_B = points([[0, 0], [1, 3], [4, 0], [0, 2], [2, 5], [4, 2]]);
const PAIR_C = points([[0, 1], [2, 4], [5, 1], [0, 3], [3, -1], [5, 3]]);
const NOT_A_NUMBER = ['3', null, Number.NaN, Number.POSITIVE_INFINITY, [1], undefined];
const STEP_JUNK = [...NOT_A_NUMBER, -1, 1.5];

const ROWS: Row[] = [
    {
        name: 'convex-hull', create: () => new Hull(),
        defaultModel: HULL_TRACE_SAMPLE_1, defaultOverlays: {trace: true, hull: true},
        scene: {model: HULL_A, overlays: {trace: false, grid: true}, fields: {algorithm: 'gift-wrapping', step: 3}},
        sceneOverlays: {trace: false, hull: true, grid: true},
        preceding: [
            {model: HULL_B, overlays: {hull: false}, fields: {algorithm: 'slow-edge-test', step: 1}},
            {model: HULL_C, overlays: {grid: true}, fields: {algorithm: 'monotone-chain', step: 2}},
        ],
        other: points([[0, 0], [2, 0], [1, 2]]), named: 'hull', defaultFields: {algorithm: 'monotone-chain', step: 0},
        junk: {algorithm: [3, null, 'bubble', ['gift-wrapping'], undefined], step: NOT_A_NUMBER},
        showsPoints: true, finiteStep: true,
    },
    {
        name: 'hull-robustness', create: () => new Robust(),
        defaultModel: HULL_TRACE_SAMPLE_1, defaultOverlays: {trace: true, hull: true},
        scene: {model: HULL_A, overlays: {trace: false, grid: true}, fields: {algorithm: 'monotone-chain', step: 3, mode: 'kettner', pop: 'right', duplicates: 'keep', panel: 'exact', cellI: 5, cellJ: 7}},
        sceneOverlays: {trace: false, hull: true, grid: true},
        preceding: [
            {model: HULL_B, overlays: {hull: false}, fields: {algorithm: 'monotone-chain', step: 1, mode: 'chain', pop: 'right', duplicates: 'merge', panel: 'inexact', cellI: 62, cellJ: 0}},
            {model: HULL_C, overlays: {grid: true}, fields: {algorithm: 'monotone-chain', step: 2, mode: 'kettner', pop: 'non-left', duplicates: 'keep', panel: 'exact', cellI: 12, cellJ: 33}},
        ],
        other: points([[0, 0], [2, 0], [1, 2]]), named: 'hull',
        defaultFields: {algorithm: 'monotone-chain', step: 0, mode: 'chain', pop: 'non-left', duplicates: 'merge', panel: 'inexact', cellI: 41, cellJ: 48},
        junk: {
            step: NOT_A_NUMBER, mode: [3, null, 'voronoi', undefined], pop: [3, null, 'left', undefined], duplicates: [3, null, 'drop', undefined],
            panel: [3, null, 'both', undefined], cellI: [64, -1, 1.5, '3', Number.NaN, null], cellJ: [64, -1, 1.5, '3', Number.NaN, null],
        },
        showsPoints: true, finiteStep: true,
    },
    {
        name: 'bezier-hulls', create: () => new BHulls(),
        defaultModel: CURVE_PAIR_CROSSING, defaultOverlays: {control: true, hull: true, pieces: true},
        scene: {model: PAIR_A, overlays: {pieces: false, grid: true}, fields: {step: 3}}, sceneOverlays: {control: true, hull: true, pieces: false, grid: true},
        preceding: [
            {model: PAIR_B, overlays: {hull: false}, fields: {step: 1}},
            {model: PAIR_C, overlays: {grid: true}, fields: {step: 2}},
        ],
        other: points([[0, 0], [1, 2], [2, 0], [0, 1], [1, 3], [2, 1]]), named: 'pieces', defaultFields: {step: 0},
        junk: {step: STEP_JUNK}, contextual: true,
    },
    {
        name: 'bezier-clipping', create: () => new BClip(),
        defaultModel: CURVE_PAIR_CROSSING, defaultOverlays: {control: true, hull: true, fatLine: true, kept: true, discarded: true},
        scene: {model: PAIR_A, overlays: {kept: false, grid: true}, fields: {step: 3, clipToleranceExponent: 8}},
        sceneOverlays: {control: true, hull: true, fatLine: true, kept: false, discarded: true, grid: true},
        preceding: [
            {model: PAIR_B, overlays: {hull: false}, fields: {step: 1, clipToleranceExponent: 4}},
            {model: PAIR_C, overlays: {grid: true}, fields: {step: 2, clipToleranceExponent: 10}},
        ],
        other: points([[0, 0], [1, 2], [2, 0], [0, 1], [1, 3], [2, 1]]), named: 'kept', defaultFields: {step: 0, clipToleranceExponent: 6},
        junk: {step: STEP_JUNK, clipToleranceExponent: [2, 11, 6.5, '8', Number.NaN, null, [8], undefined]}, contextual: true,
    },
];

/** The clipping trace length of the crossing pair at a tolerance, from the kernel, for the stored step's clamp. */
const clipLength = (m: PointSetModel, exponent: number) => {
    const pts = m.points.map(p => [p.x, p.y] as const);
    return clipBezierPair(pts.slice(0, 3), pts.slice(3), {tolerance: 10 ** -exponent}).trace.length;
};

describe.each(ROWS)('$name extension persistence', row => {
    const names = Object.keys(row.defaultFields);
    const place = (graph: Rows, s: Scene) => {
        graph.put(s);
        // The step must be inside the trace, or the scene would not show what the test says it shows.
        expect(graph.run().length).toBeGreaterThan(Number(s.fields.step) + 1);
    };
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    const source = (): Rows => { const graph = mounted(); act(() => { place(graph, row.scene); }); return graph; };
    const last = (graph: Rows) => graph.run().length - 1;
    const sceneFile = () => wire(source().exportPreset());

    test('a round trip after two distinct preceding scenes keeps the model, the overlays and every field', () => {
        const file = sceneFile();
        expect(file.data).toEqual(row.scene.model);
        expect(file.graphState).toEqual({initialized: true, overlays: row.sceneOverlays, ...row.scene.fields});
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
        expect(pick(target.state, names)).toEqual(row.scene.fields);
        expect(target.step).toBe(3);
        expect(target.isPlaying).toBe(false);
        expect(wire(target.exportPreset().data)).toEqual(file.data);
        expect(target.exportPreset().graphState).toEqual(file.graphState);
    });

    test('a partial Preset starts from the defaults, never from the preceding scene; each omitted field takes its default', () => {
        const file = sceneFile();
        const target = mounted();
        const fresh = () => act(() => { place(target, row.preceding[1]); });
        for (const name of names) {
            fresh();
            const {[name]: _omitted, ...rest} = row.scene.fields;
            act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({overlays: row.sceneOverlays, ...rest})}); });
            // The named fields are the file's, the omitted one is its own default (and a step is then within the trace).
            expect(pick(target.state, names)).toEqual({...row.scene.fields, [name]: row.defaultFields[name]});
            expect(target.model).toEqual(row.scene.model);
        }
        // No graphState: every field at its default, the overlays the graph's own.
        fresh();
        act(() => { target.importPreset({id: file.id, data: file.data}); });
        expect(target.model).toEqual(row.scene.model);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        expect(pick(target.state, names)).toEqual(row.defaultFields);
        // Overlays alone, and `initialized` alone with no data: the fixed default model.
        fresh();
        act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({overlays: {[row.named]: false}})}); });
        expect(wire(target.state.overlays)).toEqual({[row.named]: false});
        expect(pick(target.state, names)).toEqual(row.defaultFields);
        fresh();
        act(() => { target.importPreset({id: file.id, graphState: {initialized: true}}); });
        expect(target.model).toEqual(row.defaultModel);
        expect(pick(target.state, names)).toEqual(row.defaultFields);
        expect(target.isPlaying).toBe(false);
    });

    test('a step outside the trace is clamped to it', () => {
        const file = sceneFile();
        const target = mounted();
        const expectStep = (step: number, expected: number | 'last') => {
            act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({...row.scene.fields, step})}); });
            const want = expected === 'last' ? last(target) : expected;
            expect(target.state.step).toBe(want);
            expect(target.step).toBe(want);
            expect(target.exportPreset().graphState).toMatchObject({step: want});
        };
        expect(last(source())).toBeGreaterThan(3);
        expectStep(9999, 'last');
        expectStep(0, 0);
        if (row.finiteStep) { expectStep(-7, 0); expectStep(2.7, 2); }
        expect(target.figureStateOf({id: file.id, data: file.data, graphState: wire({...row.scene.fields, step: 9999})}).step).toBe(last(target));
        if (row.finiteStep) expect(target.figureStateOf({id: file.id, data: file.data, graphState: wire({...row.scene.fields, step: -1})}).step).toBe(0);
    });

    test('a malformed Preset is refused before the scene, the state or the board change', () => {
        const file = sceneFile();
        const target = mounted();
        act(() => { place(target, row.preceding[0]); });
        const state = target.state;
        const data = target.model;
        const bad = (graphState: object): Preset => ({...file, graphState});
        const refused: Preset[] = [
            {...file, data: {...file.data, points: [{x: 0.5, y: 1}]}},
            bad({initialized: true, model: row.other}),
            bad({overlays: {nonexistent: true}}),
            bad({overlays: {[row.named]: 'yes'}}),
            bad({step: 1, extra: 1}),
        ];
        const collection = row.create().presetCollection();
        for (const [name, values] of Object.entries(row.junk)) {
            for (const value of values) {
                const preset = bad({[name]: value});
                // The collection decides what a file may carry (a hull step may be any finite number); only a refused one is listed.
                if (collection.checkGraphState?.(preset.graphState) !== undefined) refused.push(preset);
            }
        }
        expect(refused.length).toBeGreaterThan(5 + names.length);
        for (const preset of refused) {
            expect(() => target.importPreset(preset)).toThrow();
            expect(target.state).toBe(state);
            expect(target.model).toBe(data);
            expect(target.step).toBe(1);
        }
    });

    test('a model, an unknown overlay or an extra key in the permitted state cannot reach the result', () => {
        const extension = row.create().extension();
        expect(extension).toBeDefined();
        const persistence = pointSetPersistence(['grid', ...Object.keys(row.defaultOverlays)], extension);
        // Defaults whose every field differs from the fallback: none of them may stand in for an omitted or refused field.
        const leaked = row.preceding[0].fields;
        const defaults: PointSetSceneState = {initialized: false, model: row.other, overlays: row.defaultOverlays, ...leaked};
        const forbidden = {initialized: true, model: row.other, extra: 1, ...row.scene.fields, overlays: {[row.named]: false, bogus: true, constructor: true}};
        const rebuilt = persistence.reconstruct(row.scene.model, forbidden, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['initialized', 'model', 'overlays', ...names].sort());
        expect(rebuilt.model).toEqual(row.scene.model);
        expect(rebuilt.initialized).toBe(true);
        expect(rebuilt.overlays).toEqual({[row.named]: false});
        expect(pick(rebuilt, names)).toEqual(row.scene.fields);
        // A value the field refuses is dropped: the field's own default, never the defaults' value and never another scene's.
        for (const [name, values] of Object.entries(row.junk)) {
            for (const junk of values) {
                const result = persistence.reconstruct(row.scene.model, {...row.scene.fields, [name]: junk}, defaults);
                const accepted = row.finiteStep && name === 'step' && typeof junk === 'number' && Number.isFinite(junk);
                if (!accepted) expect(Reflect.get(result, name)).toEqual(row.defaultFields[name]);
            }
        }
        expect(pick(persistence.reconstruct(row.scene.model, undefined, defaults), names)).toEqual(row.defaultFields);
        expect(persistence.reconstruct(row.scene.model, 'junk', defaults)).toEqual({...defaults, ...row.defaultFields, model: row.scene.model});
        // The reconstructed model is a fresh copy.
        expect(rebuilt.model).not.toBe(row.scene.model);
        // The projection names every field, clamped to the data, and never writes a model into graphState.
        const state: PointSetSceneState = {initialized: true, model: row.scene.model, overlays: {[row.named]: true, bogus: undefined}, ...row.scene.fields};
        const projected = persistence.project(state);
        expect(projected.graphState).toEqual({initialized: true, overlays: {[row.named]: true}, ...row.scene.fields});
        expect(projected.data).toEqual(row.scene.model);
        expect(persistence.project({...state, step: 9999}).graphState.step).toBe(last(source()));
        expect(persistence.project({initialized: true, model: row.scene.model, overlays: {}}).graphState).toEqual({initialized: true, overlays: {}, ...row.defaultFields});
    });

    if (row.showsPoints) {
        test('a polygon in a file is shown as points, in the import and in the figure state', () => {
            const target = mounted();
            const id = target.presets()!;
            const polygon: PointSetModel = {...row.scene.model, mode: 'polygon', closed: true};
            act(() => { target.importPreset({id, data: wire(polygon)}); });
            expect(target.model).toEqual(row.scene.model);
            expect(target.figureStateOf({id, data: wire(polygon)}).model).toEqual(row.scene.model);
        });
    }

    test('the lesson default scene and a lesson fixture start fresh from their own data, every field at its default', () => {
        const target = mounted();
        act(() => { place(target, row.preceding[1]); });
        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(row.defaultModel);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual(row.defaultOverlays);
        expect(pick(target.state, names)).toEqual(row.defaultFields);
        expect(target.step).toBe(0);
        expect(wire(target.lessonDefault(row.other))).toEqual({initialized: true, model: row.other, overlays: row.defaultOverlays, ...row.defaultFields});
        expect(target.lessonDefault(row.scene.model).model).toEqual(row.scene.model);
        expect(target.model).toEqual(row.defaultModel);
    });

    test('a figure Preset gives a scene state that is a function of its data, and the entry scene returns exactly', () => {
        const file = sceneFile();
        const target = mounted();
        act(() => { place(target, row.preceding[0]); });
        const entry = wire(target.exportPreset());
        expect(entry.graphState).toMatchObject(row.preceding[0].fields);
        const expected = {initialized: true, model: row.scene.model, overlays: row.sceneOverlays, ...row.scene.fields};
        // Computed from the Preset alone: the live scene (another model, other fields) must not leak in.
        expect(wire(target.figureStateOf(file))).toEqual(expected);
        expect(target.model).not.toEqual(row.scene.model);
        act(() => { expect(wire(target.figureScene(file))).toEqual(expected); });
        expect(target.model).toEqual(row.scene.model);
        // Omitted graphState and omitted data: the defaults, whatever the live fields were.
        expect(wire(target.figureStateOf({id: file.id, data: file.data}))).toEqual({...expected, overlays: row.defaultOverlays, ...row.defaultFields});
        expect(wire(target.figureStateOf({id: file.id, graphState: {initialized: true}}))).toEqual({initialized: true, model: row.defaultModel, overlays: row.defaultOverlays, ...row.defaultFields});
        // Returning to the entry scene restores the first scene's model, overlays and fields.
        act(() => { expect(wire(target.figureScene(entry))).toEqual({initialized: true, model: entry.data, overlays: entry.graphState.overlays, ...row.preceding[0].fields}); });
        expect(target.model).toEqual(row.preceding[0].model);
    });

    test('a checkpoint keeps the trusted scene state, every field included; the file holds only the projection', () => {
        const graph = source();
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => { capabilities.apply({kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'}); });
        expect(graph.model).toEqual(row.defaultModel);
        expect(graph.step).toBe(0);
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.model).toEqual(row.scene.model);
        expect(wire(graph.state.overlays)).toEqual(row.sceneOverlays);
        expect(pick(graph.state, names)).toEqual(row.scene.fields);
        expect(graph.step).toBe(3);
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/pointSetSelected|displayState|transientState/);
    });

    if (row.contextual) {
        test('a Preset that names no step (or no tolerance) resets it, never keeping the preceding scene value', () => {
            const file = sceneFile();
            const target = mounted();
            for (const fields of [row.scene.fields, row.preceding[0].fields]) {
                act(() => { place(target, {...row.preceding[1], fields}); });
                expect(target.step).toBeGreaterThan(0);
                act(() => { target.importPreset({id: file.id, data: file.data}); });
                expect(pick(target.state, names)).toEqual(row.defaultFields);
                expect(target.step).toBe(0);
                expect(target.isPlaying).toBe(false);
                // One field named, the others omitted: the named one stays, every other resets.
                for (const name of names) {
                    act(() => { place(target, row.preceding[1]); });
                    act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({[name]: row.scene.fields[name]})}); });
                    expect(pick(target.state, names)).toEqual({...row.defaultFields, [name]: row.scene.fields[name]});
                }
            }
        });
    }
});

describe('bezier-clipping step is clamped to the run under the stored tolerance', () => {
    test('a stale step is clamped to the run at the tolerance the Preset names, and at the default without one', () => {
        const graph = new BClip();
        mount(graph);
        const lengths = [3, 10].map(k => clipLength(CURVE_PAIR_CROSSING, k));
        expect(lengths[0]).not.toBe(lengths[1]);
        const state = (graphState: object) => graph.figureStateOf({id: graph.presets()!, data: wire(CURVE_PAIR_CROSSING), graphState: wire(graphState)});
        expect(state({step: 99999, clipToleranceExponent: 3})).toMatchObject({clipToleranceExponent: 3, step: lengths[0] - 1});
        expect(state({step: 99999, clipToleranceExponent: 10})).toMatchObject({clipToleranceExponent: 10, step: lengths[1] - 1});
        expect(state({step: 99999})).toMatchObject({clipToleranceExponent: 6, step: clipLength(CURVE_PAIR_CROSSING, 6) - 1});
        act(() => { graph.importPreset({id: graph.presets()!, data: wire(CURVE_PAIR_CROSSING), graphState: wire({step: 99999, clipToleranceExponent: 3})}); });
        expect(graph.step).toBe(lengths[0] - 1);
    });
});
