import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TriangulationGraph} from './TriangulationGraph';
import {DelaunayGraph} from './DelaunayGraph';
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

// The triangulation and Delaunay graphs (task 08 batch 4) declare their persisted scene through
// `pointSetPersistence(ids, extension)`: `data` is the points plus the triangle list, `graphState` is `initialized`, the overlays
// and (Delaunay) the step. Every expected value is authored by hand; the starting-rule list of the nine points is the literal of
// the hull lesson, and the flipped lists are compared as sets of sorted triples.

type Lists = number[][];
type Point = [number, number];

const model = (list: Point[]): PointSetModel => ({mode: 'points', closed: false, gridStepExponent: 0, points: list.map(([x, y]) => ({x, y}))});
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));
const sorted = (lists: readonly (readonly number[])[]) => lists.map(list => [...list].sort((a, b) => a - b)).sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);

/** The B2 example: seven points, and its starting triangulation T0 (not Delaunay: the Lawson trace of it is long). */
const SEVEN = model([[0, 0], [8, 0], [9, 6], [4, 8], [-1, 5], [3, 3], [6, 3]]);
const T0: Lists = [[1, 2, 6], [1, 5, 4], [1, 6, 5], [2, 3, 4], [4, 0, 1], [4, 5, 6], [6, 2, 4]];
/** The nine hull-lesson points and their triangulation by the starting rule. */
const NINE = model([[2, 2], [4, 0], [0, 0], [5, 3], [2, 5], [-1, 3], [3, 1], [2, 0], [1, 1]]);
const NINE_RULE: Lists = [[5, 2, 8], [2, 7, 8], [7, 0, 8], [8, 0, 5], [0, 4, 5], [7, 6, 0], [0, 6, 4], [7, 1, 6], [6, 1, 4], [1, 3, 4]];
/** A convex quadrilateral with the diagonal 0-2 (illegal: the incircle determinant is +64). */
const QUAD = model([[0, 0], [4, 0], [5, 3], [0, 2]]);
const QUAD_LIST: Lists = [[0, 1, 2], [0, 2, 3]];
const TRIANGLE = model([[0, 0], [2, 0], [1, 2]]);
const COLLINEAR = model([[0, 0], [1, 1], [2, 2]]);

const OVERLAY_IDS = ['grid', 'triangulation', 'edges', 'angles'];

class Tri extends TriangulationGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
class Del extends DelaunayGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PointSetModel) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
    extension(): PointSetExtension | undefined { return this.persistenceExtension(); }
}
type Rows = Tri | Del;

const mount = (graph: Rows) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const previousOf = (graph: Rows): unknown => Reflect.get(graph.state, 'previous');
const stepOf = (graph: Rows): unknown => Reflect.get(graph.state, 'step');
const runLength = (graph: Rows): number => graph instanceof Del ? graph.run().length : 0;

/** Replaces the triangle list by the lesson action of the panel (checked, `previous` cleared). */
const setList = (graph: Rows, triangles: Lists) => graph.applyPointSetAction({kind: 'point-set', operation: 'set-triangulation', triangles: triangles.map(([a, b, c]) => [a, b, c] as const)});

/** Flips the first flippable edge by the board's own path; the list before it is the scene's `previous`. */
const flipSome = (graph: Rows, count: number) => {
    for (let a = 0; a < count; a++) {
        for (let b = a + 1; b < count; b++) {
            graph.selectEdge(a, b);
            if (graph.selectedEdge() && graph.flipSelected()) return;
        }
    }
    throw new Error('no flippable edge');
};

interface Row {
    name: string;
    create: () => Rows;
    delaunay: boolean;
    defaultModel: PointSetModel;
    defaultTriangles: Lists;
}

const ROWS: Row[] = [
    {name: 'point-set-triangulation', create: () => new Tri(), delaunay: false, defaultModel: SEVEN, defaultTriangles: T0},
    {name: 'delaunay', create: () => new Del(), delaunay: true, defaultModel: QUAD, defaultTriangles: QUAD_LIST},
];

describe.each(ROWS)('$name scene persistence', row => {
    const mounted = (): Rows => { const graph = row.create(); mount(graph); return graph; };
    /** The scene a file carries: the seven points in T0 (kept as it is), overlays changed, and for Delaunay step 3. */
    const placeSource = (graph: Rows) => {
        graph.loadModel(SEVEN);
        setList(graph, T0);
        graph.setOverlay('triangulation', false);
        graph.setOverlay('grid', true);
        if (row.delaunay) {
            graph.setState({step: 3});
            expect(runLength(graph)).toBeGreaterThan(4);
        }
    };
    /** The nine points after a flip: `previous` set, the list not the starting rule's, overlays and step of its own. */
    const placeNineFlipped = (graph: Rows) => {
        graph.loadModel(NINE);
        expect(graph.triangles).toEqual(NINE_RULE);
        flipSome(graph, 9);
        expect(sorted(graph.triangles)).not.toEqual(sorted(NINE_RULE));
        expect(previousOf(graph)).toEqual(NINE_RULE);
        graph.setOverlay('edges', true);
        if (row.delaunay) graph.setState({step: 4});
    };
    /** The seven points in T0 again, with a flip: another model, another list, `previous` set. */
    const placeSevenFlipped = (graph: Rows) => {
        graph.loadModel(SEVEN);
        setList(graph, T0);
        flipSome(graph, 7);
        graph.setOverlay('angles', true);
        if (row.delaunay) graph.setState({step: 2});
    };
    const source = (): Rows => { const graph = mounted(); act(() => { placeSource(graph); }); return graph; };
    const sceneFile = () => wire(source().exportPreset());
    const expectedGraphState = row.delaunay
        ? {initialized: true, overlays: {triangulation: false, grid: true}, step: 3}
        : {initialized: true, overlays: {triangulation: false, grid: true}};
    const sevenData = {...SEVEN, triangles: T0};

    test('a round trip after two distinct preceding scenes keeps the exact triangle list; previous is absent', () => {
        const file = sceneFile();
        expect(file.data).toEqual(sevenData);
        expect(file.graphState).toEqual(expectedGraphState);
        expect(Object.keys(file).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        const collection = row.create().presetCollection();
        expect(collection.check(file.data)).toEqual({data: sevenData});
        expect(collection.checkGraphState?.(file.graphState)).toBeUndefined();

        const target = mounted();
        act(() => { placeNineFlipped(target); });
        act(() => { placeSevenFlipped(target); });
        expect(previousOf(target)).not.toBeUndefined();
        act(() => { target.importPreset(file); });
        expect(target.model).toEqual(SEVEN);
        expect(target.triangles).toEqual(T0);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual({triangulation: false, grid: true});
        expect(previousOf(target)).toBeUndefined();
        expect(target.readout()?.minAngleBefore).toBeUndefined();
        if (target instanceof Del) {
            expect(target.state.step).toBe(3);
            expect(target.step).toBe(3);
            expect(target.isPlaying).toBe(false);
        } else {
            expect(stepOf(target)).toBeUndefined();
        }
        expect(wire(target.exportPreset().data)).toEqual(file.data);
        expect(target.exportPreset().graphState).toEqual(file.graphState);
        expect(Object.keys(target.exportPreset().graphState ?? {}).sort()).toEqual(Object.keys(expectedGraphState).sort());
    });

    test('data without a triangle list is triangulated by the starting rule, whatever scene preceded', () => {
        const file = sceneFile();
        const target = mounted();
        // The collection requires a list in a file; a lesson fixture and the direct import may name points only.
        const plain = (data: PointSetModel) => target.importPresetData(wire(data));
        expect(file.id).toBe(row.create().presetCollection().key);
        const scenes = [placeNineFlipped, placeSource, placeSevenFlipped];
        for (const place of scenes) {
            act(() => { place(target); });
            act(() => { plain(NINE); });
            expect(target.model).toEqual(NINE);
            expect(target.triangles).toEqual(NINE_RULE);
            expect(previousOf(target)).toBeUndefined();
        }
        // The same points as the preceding scene: the preceding list (T0) is not kept either.
        act(() => { placeSource(target); });
        act(() => { plain(SEVEN); });
        expect(target.triangles).not.toEqual(T0);
        expect(sorted(target.triangles)).toHaveLength(7);
        act(() => { plain(TRIANGLE); });
        expect(sorted(target.triangles)).toEqual([[0, 1, 2]]);
        act(() => { placeNineFlipped(target); });
        act(() => { plain(COLLINEAR); });
        expect(target.triangles).toEqual([]);
        expect(target.readout()).toBeUndefined();
    });

    test('an invalid or non-CCW list is refused by throwing, before the scene, the model or the step change', () => {
        const target = mounted();
        act(() => { placeNineFlipped(target); });
        const state = target.state;
        const before = {model: target.model, triangles: target.triangles, previous: previousOf(target), step: stepOf(target)};
        const refused: unknown[] = [
            [[0, 1, 9]],
            [[0, 2, 1], [0, 2, 3]],
            [[0, 1, 2]],
            [],
            [[0, 1]],
            [[0, 1, 2.5]],
            'triangles',
            [null],
        ];
        for (const triangles of refused) {
            const data = {...wire(QUAD), triangles};
            expect(() => target.importPresetData(data)).toThrow(/stored triangle list/);
            expect(target.state).toBe(state);
            expect(target.model).toBe(before.model);
            expect(target.triangles).toEqual(before.triangles);
            expect(previousOf(target)).toBe(before.previous);
            expect(stepOf(target)).toBe(before.step);
            expect(() => target.importPreset({id: row.create().presetCollection().key, data})).toThrow();
            expect(target.state).toBe(state);
        }
        // An empty list is the right one for points that allow no triangulation.
        act(() => { target.importPresetData({...wire(COLLINEAR), triangles: []}); });
        expect(target.triangles).toEqual([]);
    });

    test('a partial or absent graphState starts from the defaults, never from the preceding scene', () => {
        const file = sceneFile();
        const target = mounted();
        const fresh = () => act(() => { placeNineFlipped(target); });
        fresh();
        act(() => { target.importPreset({id: file.id, data: file.data}); });
        expect(target.triangles).toEqual(T0);
        expect(wire(target.state.overlays)).toEqual({triangulation: true});
        expect(target.state.initialized).toBe(true);
        expect(previousOf(target)).toBeUndefined();
        if (row.delaunay) expect(target.state.step).toBe(0);

        fresh();
        act(() => { target.importPreset({id: file.id, data: file.data, graphState: wire({overlays: {edges: true}})}); });
        expect(wire(target.state.overlays)).toEqual({edges: true});
        expect(target.triangles).toEqual(T0);
        if (row.delaunay) expect(target.state.step).toBe(0);

        fresh();
        act(() => { target.importPreset({id: file.id, graphState: {initialized: true}}); });
        expect(target.model).toEqual(row.defaultModel);
        expect(target.triangles).toEqual(row.defaultTriangles);
        expect(previousOf(target)).toBeUndefined();
        if (row.delaunay) expect(target.state.step).toBe(0);
    });

    test('a model, triangles, previous or an unknown key in graphState cannot reach the scene', () => {
        const file = sceneFile();
        const collection = row.create().presetCollection();
        const bad = (graphState: object): Preset => ({...file, graphState});
        const target = mounted();
        act(() => { placeNineFlipped(target); });
        const state = target.state;
        const forbidden: object[] = [
            {initialized: true, model: NINE},
            {triangles: NINE_RULE},
            {previous: NINE_RULE},
            {overlays: {nonexistent: true}},
            {extra: 1},
        ];
        for (const graphState of forbidden) {
            expect(collection.checkGraphState?.(graphState)).not.toBeUndefined();
            expect(() => target.importPreset(bad(graphState))).toThrow();
            expect(target.state).toBe(state);
        }
        // The projection reads only the declared parts of a permitted state, and a data list only by its name.
        const extension = row.create().extension();
        expect(extension).toBeDefined();
        const persistence = pointSetPersistence(OVERLAY_IDS, extension);
        const stale: Lists = [[0, 1, 2]];
        const defaults: PointSetSceneState = Object.assign({initialized: false, model: QUAD, overlays: {}}, {triangles: stale, previous: stale}, row.delaunay ? {step: 7} : {});
        const hostile = {initialized: true, model: NINE, triangles: stale, previous: stale, extra: 1, overlays: {edges: true, bogus: true}, ...(row.delaunay ? {step: 2} : {})};
        const rebuilt = persistence.reconstruct(sevenData, hostile, defaults);
        expect(Object.keys(rebuilt).sort()).toEqual(['initialized', 'model', 'overlays', 'triangles', ...(row.delaunay ? ['step'] : [])].sort());
        expect(rebuilt.model).toEqual(SEVEN);
        expect(Reflect.get(rebuilt, 'triangles')).toEqual(T0);
        expect('previous' in rebuilt).toBe(false);
        expect(rebuilt.overlays).toEqual({edges: true});
        expect(rebuilt.initialized).toBe(true);
        expect(Reflect.get(rebuilt, 'triangles')).not.toBe(Reflect.get(sevenData, 'triangles'));
        if (row.delaunay) expect(rebuilt.step).toBe(2);
        // Hostile list in the permitted state is not the data's: the data list wins; a file list is never spread in.
        expect(Reflect.get(persistence.reconstruct(sevenData, undefined, defaults), 'triangles')).toEqual(T0);
        expect(Reflect.get(persistence.reconstruct({...SEVEN, mode: 'polygon', closed: true}, undefined, defaults), 'triangles')).toEqual(
            Reflect.get(persistence.reconstruct(SEVEN, undefined, defaults), 'triangles'));
        // The projection writes the triangle list into data only, `previous` nowhere, and no model into graphState.
        const live: PointSetSceneState = {initialized: true, model: SEVEN, overlays: {edges: true, bogus: undefined}, ...(row.delaunay ? {step: 9999} : {})};
        const projected = persistence.project(Object.assign(live, {triangles: T0, previous: stale}));
        expect(projected.data).toEqual(sevenData);
        expect(Object.keys(projected.graphState).sort()).toEqual(['initialized', 'overlays', ...(row.delaunay ? ['step'] : [])].sort());
        expect(projected.graphState.overlays).toEqual({edges: true});
        expect(persistence.project(Object.assign({...live}, {triangles: 'junk'})).data).toEqual({...SEVEN, triangles: []});
    });

    test('a figure Preset gives a scene state that is a function of its data, and the entry scene returns exactly', () => {
        const file = sceneFile();
        const target = mounted();
        act(() => { placeNineFlipped(target); });
        const entry = wire(target.exportPreset());
        const entryTriangles = target.triangles;
        expect(entry.data.triangles).toEqual(entryTriangles);
        expect(entry.graphState.previous).toBeUndefined();
        const expected = {initialized: true, model: SEVEN, overlays: {triangulation: false, grid: true}, triangles: T0, ...(row.delaunay ? {step: 3} : {})};
        // Computed from the Preset alone: the live scene (nine points, a previous list) must not leak in.
        expect(wire(target.figureStateOf(file))).toEqual(expected);
        expect(Object.keys(target.figureStateOf(file))).not.toContain('previous');
        expect(target.model).not.toEqual(SEVEN);
        act(() => { expect(wire(target.figureScene(file))).toEqual(expected); });
        expect(target.model).toEqual(SEVEN);
        expect(target.triangles).toEqual(T0);
        expect(previousOf(target)).toBeUndefined();
        // Omitted data and graphState: the defaults, whatever the live scene was.
        const defaultOverlays = {triangulation: true};
        expect(wire(target.figureStateOf({id: file.id, graphState: {initialized: true}}))).toEqual({
            initialized: true, model: row.defaultModel, overlays: defaultOverlays, triangles: row.defaultTriangles, ...(row.delaunay ? {step: 0} : {}),
        });
        // Data without a list: the starting rule, not the live list.
        expect(wire(target.figureStateOf({id: file.id, data: wire(NINE)})).triangles).toEqual(NINE_RULE);
        // Returning to the entry scene restores its exact list (a flipped one), without its previous list.
        act(() => { expect(wire(target.figureScene(entry)).triangles).toEqual(entryTriangles); });
        expect(target.model).toEqual(NINE);
        expect(target.triangles).toEqual(entryTriangles);
        expect(sorted(target.triangles)).not.toEqual(sorted(NINE_RULE));
        expect(previousOf(target)).toBeUndefined();
        expect(wire(target.state.overlays)).toEqual(entry.graphState.overlays);
    });

    test('the lesson default scene and a lesson fixture start fresh from their own data', () => {
        const target = mounted();
        act(() => { placeNineFlipped(target); });
        act(() => { target.resetToDefaultScene(); });
        expect(target.model).toEqual(row.defaultModel);
        expect(target.triangles).toEqual(row.defaultTriangles);
        expect(target.state.initialized).toBe(true);
        expect(wire(target.state.overlays)).toEqual({triangulation: true});
        expect(previousOf(target)).toBeUndefined();
        if (row.delaunay) expect(target.state.step).toBe(0);
        const fixture = target.lessonDefault(wire(sevenData));
        expect(wire(fixture)).toEqual({initialized: true, model: SEVEN, overlays: {triangulation: true}, triangles: T0, ...(row.delaunay ? {step: 0} : {})});
        expect('previous' in fixture).toBe(false);
        // A fixture without a list: the starting rule; the live scene is not consulted.
        act(() => { placeSource(target); });
        expect(wire(target.lessonDefault(wire(NINE))).triangles).toEqual(NINE_RULE);
        expect(target.model).toEqual(SEVEN);
        expect(target.triangles).toEqual(T0);
    });

    test('a checkpoint keeps the trusted scene state, previous included; the file holds only the projection', () => {
        const graph = mounted();
        act(() => { placeSource(graph); });
        // The flip is of the triangulation shown: the starting one, at step 0 (a later step shows a flipped one).
        if (row.delaunay) act(() => { graph.setState({step: 0}); });
        act(() => { flipSome(graph, 7); });
        if (row.delaunay) act(() => { graph.setState({step: 2}); });
        const flipped = graph.triangles;
        expect(sorted(flipped)).not.toEqual(sorted(T0));
        expect(previousOf(graph)).toEqual(T0);
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => { capabilities.apply({kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'}); });
        expect(graph.model).toEqual(row.defaultModel);
        expect(previousOf(graph)).toBeUndefined();
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.model).toEqual(SEVEN);
        expect(graph.triangles).toEqual(flipped);
        expect(previousOf(graph)).toEqual(T0);
        expect(wire(graph.state.overlays)).toEqual({triangulation: false, grid: true});
        if (row.delaunay) expect(graph.state.step).toBe(2);
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/previous|pointSetSelected|displayState|transientState/);
        expect(graph.exportPreset().data).toEqual({...SEVEN, triangles: flipped});
    });
});

describe('delaunay step is clamped to the run of the reconstructed points and triangles', () => {
    const mounted = () => { const graph = new Del(); mount(graph); return graph; };
    const DELAUNAY_SEVEN: Lists = [[0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 6], [3, 4, 5], [3, 5, 6]];
    const file = (triangles: Lists, graphState: object): Preset => wire({id: 'compgeo-delaunay', data: {...SEVEN, triangles}, graphState});

    test('a stale step is truncated and clamped to the run of the stored list; an absent step is 0', () => {
        const target = mounted();
        // The Delaunay triangulation of the points has no flips: its trace is short; T0 has a long one.
        act(() => { target.importPreset(file(T0, {step: 9999})); });
        const long = target.run().length - 1;
        expect(long).toBeGreaterThan(3);
        expect(target.state.step).toBe(long);
        act(() => { target.importPreset(file(DELAUNAY_SEVEN, {step: 9999})); });
        const short = target.run().length - 1;
        expect(short).toBeLessThan(long);
        expect(target.state.step).toBe(short);
        expect(target.step).toBe(short);
        act(() => { target.importPreset(file(T0, {step: 2.7})); });
        expect(target.state.step).toBe(2);
        act(() => { target.importPreset(file(T0, {step: -7})); });
        expect(target.state.step).toBe(0);
        act(() => { target.importPreset(file(T0, {}) ); });
        expect(target.state.step).toBe(0);
        act(() => { target.importPreset(file(T0, {step: 3})); });
        expect(target.state.step).toBe(3);
        expect(target.isPlaying).toBe(false);
        expect(target.exportPreset().graphState).toMatchObject({step: 3});
        // The figure state reads the same clamp.
        expect(target.figureStateOf(file(DELAUNAY_SEVEN, {step: 9999})).step).toBe(short);
        expect(target.figureStateOf(file(T0, {step: 9999})).step).toBe(long);
        // Not a finite number: refused by the collection; the reconstruct falls back to 0.
        for (const junk of ['3', null, Number.NaN, Number.POSITIVE_INFINITY, [1]]) {
            const preset = file(T0, {step: junk});
            if (target.presetCollection().checkGraphState?.(preset.graphState) !== undefined) expect(() => target.importPreset(preset)).toThrow();
            const withList = {...SEVEN, triangles: T0};
            const persistence = pointSetPersistence(['grid', 'triangulation', 'edges', 'angles'], target.extension());
            const rebuilt = persistence.reconstruct(withList, {step: junk}, {initialized: true, model: QUAD, overlays: {}, step: 5});
            expect(rebuilt.step).toBe(0);
        }
    });

    test('loadExample lands at step 0, paused', () => {
        const target = mounted();
        act(() => { target.importPreset(file(T0, {step: 4})); });
        expect(target.step).toBe(4);
        act(() => { target.loadExample(1); });
        expect(target.state.step).toBe(0);
        expect(target.step).toBe(0);
        expect(target.triangles).toEqual(T0);
        expect(target.isPlaying).toBe(false);
        act(() => { target.setState({step: 3}); });
        act(() => { target.loadExample(0); });
        expect(target.step).toBe(0);
        expect(target.model).toEqual(QUAD);
        expect(target.triangles).toEqual(QUAD_LIST);
    });

    test('an import while the trace plays pauses playback at the stored step', () => {
        const target = mounted();
        act(() => { target.importPreset(file(T0, {step: 0})); });
        act(() => { target.play(); });
        expect(target.isPlaying).toBe(true);
        act(() => { target.importPreset(file(T0, {step: 2})); });
        expect(target.isPlaying).toBe(false);
        expect(target.step).toBe(2);
    });
});
