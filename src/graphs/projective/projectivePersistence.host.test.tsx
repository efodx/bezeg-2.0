import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FivePointGraph} from './FivePointGraph';
import {CrossRatioGraph} from './CrossRatioGraph';
import {PascalGraph} from './PascalGraph';
import {PolePolarGraph} from './PolePolarGraph';
import {CROSS_RATIO_EXAMPLES} from './crossRatioModel';
import {PASCAL_DEFAULT_INDICES, PASCAL_EXAMPLES} from './pascalModel';
import type {Preset} from '../base/presets/Presets';
import {ThreeViewsGraph} from './ThreeViewsGraph';
import {evaluateFivePoint, FIVE_POINT_EXAMPLES, FivePointModel} from './fivePointModel';
import {fivePointPersistence, threeViewsPersistence} from './projectivePersistence';
import {fivePointPresetCollection, threeViewsPresetCollection} from './projectivePresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {DEFAULT_THREE_VIEWS_MODEL} from './threeViewsModel';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

class FivePoint extends FivePointGraph {
    liveBoard() { return this.board; }
}

class ThreeViews extends ThreeViewsGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; X?: () => number; Y?: () => number; visPropCalc?: {visible?: boolean}};
const point = (graph: FivePoint | ThreeViews, name: string) => (graph.liveBoard().objectsList as Shown[]).find(o => o.elType === 'point' && o.name === name)!;
const mount = (graph: FivePoint | ThreeViews | PolePolar) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
const wire = (value: unknown) => JSON.parse(JSON.stringify(value));

// Authored by hand, not read back from the projection: the hyperbola example with point C moved to (54, 32) / 15.
const MOVED_HYPERBOLA: FivePointModel = {
    example: 'custom', a: 0, b: 1, t: 2,
    points: [{x: 45, y: 0}, {x: 75, y: 80}, {x: 54, y: 32}, {x: -45, y: 0}, {x: 75, y: -80}],
};

function sceneOfFivePoint(): FivePoint {
    const graph = new FivePoint();
    mount(graph);
    act(() => { graph.loadExample('hyperbola'); graph.placeNumerators(2, 54, 32); graph.select(2); graph.setExtrapolation(true); });
    return graph;
}

describe('FivePoint projection', () => {
    test('export, check and reconstruct keep the model, the scene state and the visible points', () => {
        const source = sceneOfFivePoint();
        expect(source.model).toEqual(MOVED_HYPERBOLA);
        const file = wire(source.exportPreset());
        expect(file.data).toEqual(MOVED_HYPERBOLA);
        expect(file.graphState).toEqual({initialized: true});
        expect(Object.keys(file).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        expect(JSON.stringify(file)).not.toMatch(/lastUnique|fivePoint(Selected|Extrapolation)|transientState|displayState/);
        const collection = fivePointPresetCollection();
        expect(collection.check(file.data)).toEqual({data: MOVED_HYPERBOLA});
        expect(collection.checkGraphState?.(file.graphState)).toBeUndefined();

        const target = new FivePoint();
        mount(target);
        act(() => { target.importPreset(file); });
        expect(target.model).toEqual(MOVED_HYPERBOLA);
        expect(target.state.initialized).toBe(true);
        // A unique conic through these points, so the stale-conic memory restarts as exactly these five points.
        expect(target.state.lastUnique).toEqual(MOVED_HYPERBOLA.points);
        expect(target.selectedIndex).toBeUndefined();
        expect(target.extrapolating).toBe(false);
        const c = point(target, 'C');
        expect([c.X!(), c.Y!()]).toEqual([54 / 15, 32 / 15]);
        const e = point(target, 'E');
        expect([e.X!(), e.Y!()]).toEqual([5, -16 / 3]);
        expect(wire(target.exportPreset().data)).toEqual(MOVED_HYPERBOLA);
        expect(target.exportPreset().graphState).toEqual({initialized: true});
    });

    test('a model or lastUnique in the permitted state cannot override the checked data', () => {
        const source = sceneOfFivePoint();
        const file = wire(source.exportPreset());
        const target = new FivePoint();
        mount(target);
        const before = target.model;
        for (const forbidden of [{model: FIVE_POINT_EXAMPLES.ellipse}, {lastUnique: []}, {initialized: true, model: FIVE_POINT_EXAMPLES.ellipse}]) {
            expect(() => target.importPreset({...file, graphState: forbidden})).toThrow();
            expect(target.model).toBe(before);
        }
        const rebuilt = fivePointPersistence.reconstruct(MOVED_HYPERBOLA,{initialized: true, model: FIVE_POINT_EXAMPLES.ellipse, lastUnique: []}, target.getInitialState());
        expect(rebuilt.model).toEqual(MOVED_HYPERBOLA);
        expect(rebuilt.lastUnique).toEqual(MOVED_HYPERBOLA.points);
    });

    test('lastUnique keeps the previous unique conic through a degenerate move and is undefined for a loaded degenerate Preset', () => {
        const graph = new FivePoint();
        mount(graph);
        act(() => { graph.loadExample('parabola'); });
        const parabola = FIVE_POINT_EXAMPLES.parabola.points;
        expect(evaluateFivePoint(graph.model).status).toBe('unique');
        expect(graph.state.lastUnique).toEqual(parabola);
        // (0,0), (60,60)/15 and (30,30)/15 lie on y = x: three collinear points, no unique conic.
        act(() => { graph.placeNumerators(2, 30, 30); });
        expect(evaluateFivePoint(graph.model).status).not.toBe('unique');
        expect(graph.state.lastUnique).toEqual(parabola);
        // A fourth point on y = x (45,45)/15: four collinear points, a whole family of conics.
        act(() => { graph.placeNumerators(3, 45, 45); });
        expect(evaluateFivePoint(graph.model).status).not.toBe('unique');
        expect(graph.state.lastUnique).toEqual(parabola);
        // Loading a model whose five points are themselves degenerate leaves nothing stale to show.
        const fourCollinear = FIVE_POINT_EXAMPLES['four-collinear'];
        expect(evaluateFivePoint(fourCollinear).status).not.toBe('unique');
        act(() => { graph.importPreset({id: 'degenerate', data: wire(fourCollinear)}); });
        expect(graph.model).toEqual(fourCollinear);
        expect(graph.state.lastUnique).toBeUndefined();
        act(() => { graph.loadExample('four-collinear'); });
        expect(graph.state.lastUnique).toBeUndefined();
    });

    test('a lesson checkpoint keeps the full trusted state, transient values and display settings; the default scene starts fresh', () => {
        const graph = sceneOfFivePoint();
        graph.displaySettings.pointLabelsVisible = false;
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const saved = wire(graph.state);
        expect(saved.model).toEqual(MOVED_HYPERBOLA);
        expect(saved.lastUnique).toEqual(MOVED_HYPERBOLA.points);
        act(() => { capabilities.apply({kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'}); });
        // Independently expected default scene: the ellipse example, its five points as the last unique conic, no selection.
        expect(graph.model).toEqual(FIVE_POINT_EXAMPLES.ellipse);
        expect(graph.state.lastUnique).toEqual(FIVE_POINT_EXAMPLES.ellipse.points);
        expect(graph.state.initialized).toBe(true);
        expect(graph.selectedIndex).toBeUndefined();
        expect(graph.extrapolating).toBe(false);
        act(() => { graph.displaySettings.pointLabelsVisible = true; });
        act(() => { capabilities.restoreState(checkpoint); });
        expect(wire(graph.state)).toEqual(saved);
        expect(graph.selectedIndex).toBe(2);
        expect(graph.extrapolating).toBe(true);
        expect(graph.displaySettings.pointLabelsVisible).toBe(false);
        // The file never holds what only the checkpoint holds.
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/lastUnique|fivePointSelected|displayState|pointLabelsVisible/);
    });
});

describe('ThreeViews projection', () => {
    // Authored by hand: c = 1 (a parabola image), the point on the circle at 90 degrees.
    const EXPECTED = {c: 10, pointOn: true, angle: 6};

    function sceneOfThreeViews(): ThreeViews {
        const graph = new ThreeViews();
        mount(graph);
        act(() => { graph.setCTenths(10); graph.togglePoint(true); graph.placePoint(6); });
        return graph;
    }

    test('export, check and reconstruct keep the model, the scene state and the visible points', () => {
        const source = sceneOfThreeViews();
        expect(source.model).toEqual(EXPECTED);
        const file = wire(source.exportPreset());
        expect(file.data).toEqual(EXPECTED);
        expect(file.graphState).toEqual({initialized: true});
        expect(Object.keys(file).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        const collection = threeViewsPresetCollection();
        expect(collection.check(file.data)).toEqual({data: EXPECTED});
        expect(collection.checkGraphState?.(file.graphState)).toBeUndefined();

        const target = new ThreeViews();
        mount(target);
        act(() => { target.importPreset(file); });
        expect(target.model).toEqual(EXPECTED);
        expect(target.state).toEqual({initialized: true, model: EXPECTED});
        const p = point(target, 'P');
        expect(p.visPropCalc?.visible).toBe(true);
        expect([p.X!(), p.Y!()]).toEqual([-6, 2]);
        expect(target.scene().type).toBe('parabola');
        expect(wire(target.exportPreset())).toMatchObject({data: EXPECTED, graphState: {initialized: true}});
    });

    test('a model in the permitted state cannot override the checked data', () => {
        const source = sceneOfThreeViews();
        const file = wire(source.exportPreset());
        const target = new ThreeViews();
        mount(target);
        const before = target.model;
        expect(() => target.importPreset({...file, graphState: {model: DEFAULT_THREE_VIEWS_MODEL}})).toThrow();
        expect(target.model).toBe(before);
        const rebuilt = threeViewsPersistence.reconstruct(EXPECTED, {initialized: true, model: DEFAULT_THREE_VIEWS_MODEL}, target.getInitialState());
        expect(rebuilt).toEqual({initialized: true, model: EXPECTED});
    });

    test('a lesson checkpoint keeps the full trusted state and display settings; the default scene starts fresh', () => {
        const graph = sceneOfThreeViews();
        graph.displaySettings.pointLabelsVisible = false;
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        act(() => { capabilities.apply({kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'}); });
        expect(graph.state).toEqual({initialized: true, model: {c: 20, pointOn: false, angle: 3}});
        act(() => { graph.displaySettings.pointLabelsVisible = true; });
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.state).toEqual({initialized: true, model: EXPECTED});
        expect(graph.displaySettings.pointLabelsVisible).toBe(false);
        expect(JSON.stringify(graph.exportPreset())).not.toMatch(/displayState|pointLabelsVisible/);
    });
});

// ---- CrossRatio, Pascal and PolePolar ----------------------------------------------------------------------------------
// Every expected value below is authored by hand (or is a data constant of the model files), never read from the
// projection under test. The three graphs share one set of obligations (P3), so one table of cases drives them.

class CrossRatio extends CrossRatioGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: CrossRatioGraph['model']) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
}

class Pascal extends PascalGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PascalGraph['model']) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
}

class PolePolar extends PolePolarGraph {
    figureScene(preset: Preset) { this.importFigurePresetData(preset); return this.figurePresetGraphState(preset.graphState, preset.data); }
    figureStateOf(preset: Preset) { return this.figurePresetGraphState(preset.graphState, preset.data); }
    lessonDefault(data: PolePolarGraph['model']) { return this.lessonDefaultState(data); }
    resetToDefaultScene() { this.prepareLessonDefaultScene(); }
}

interface TrioGraph {
    readonly model: unknown;
    readonly state: {initialized: boolean; model: unknown};
    exportPreset(): Preset;
    importPreset(preset: Preset): void;
    figureScene(preset: Preset): {initialized: boolean; model: unknown};
    figureStateOf(preset: Preset): {initialized: boolean; model: unknown};
    resetToDefaultScene(): void;
}

interface TrioCase {
    name: string;
    create: () => TrioGraph;
    /** The hand-authored scene the source graph is brought to, and the (JSON) data it must export. */
    expected: unknown;
    build: (graph: TrioGraph) => void;
    /** Two distinct scenes the target shows before the import. */
    preceding: ReadonlyArray<(graph: TrioGraph) => void>;
    /** Marks a selection on the graph, and reads it back. */
    select: (graph: TrioGraph) => void;
    selection: (graph: TrioGraph) => unknown;
    unselected: unknown;
    /** The lesson default state for given fixture data. */
    lessonDefault: (graph: TrioGraph, data: unknown) => unknown;
    /** The default scene authored by hand, and a second valid model for the lesson-fixture path. */
    defaultModel: unknown;
    other: unknown;
    /** Data the collection must refuse. */
    malformed: readonly unknown[];
}

const asCross = (g: TrioGraph) => g as unknown as CrossRatio;
const asPascal = (g: TrioGraph) => g as unknown as Pascal;
const asPole = (g: TrioGraph) => g as unknown as PolePolar;

const CROSS_EXPECTED = {example: 'custom', params: [-2, 1, 5, 7], centre: {x: 3, y: 6}, line2: [{x: 0, y: 1}, {x: 2, y: 2}]};
const PASCAL_EXPECTED = {example: 'custom', conic: 'ellipse', indices: [...PASCAL_DEFAULT_INDICES.ellipse], order: [0, 2, 4, 1, 3, 5]};
const POLE_EXPECTED = {example: 'custom', conic: 'hyperbola', p: {x: -15, y: 10}, ideal: {dx: 2, dy: 1}};

const TRIO: readonly TrioCase[] = [
    {
        name: 'CrossRatio', create: () => new CrossRatio(), expected: CROSS_EXPECTED,
        build: g => { asCross(g).loadModel(CROSS_EXPECTED as never); asCross(g).select(4); },
        preceding: [g => asCross(g).loadExample('harmonic'), g => asCross(g).loadExample('infinity')],
        select: g => asCross(g).select(2), selection: g => asCross(g).selectedHandle, unselected: undefined,
        lessonDefault: (g, data) => asCross(g).lessonDefault(data as never),
        defaultModel: {example: 'default', params: [0, 1, 3, 4], centre: {x: 0, y: 5}, line2: [{x: 0, y: 1}, {x: 2, y: 2}]},
        other: CROSS_RATIO_EXAMPLES.harmonic,
        malformed: [{...CROSS_EXPECTED, params: [0, 1, 3]}, {...CROSS_EXPECTED, params: [0, 1, 3, 99]}, {...CROSS_EXPECTED, example: 'nope'}],
    },
    {
        name: 'Pascal', create: () => new Pascal(), expected: PASCAL_EXPECTED,
        build: g => { asPascal(g).loadModel(PASCAL_EXPECTED as never); asPascal(g).select(3); },
        preceding: [g => asPascal(g).loadExample('pappus'), g => asPascal(g).loadExample('infinity')],
        select: g => asPascal(g).select(1), selection: g => asPascal(g).selectedHandle, unselected: undefined,
        lessonDefault: (g, data) => asPascal(g).lessonDefault(data as never),
        defaultModel: {example: 'default', conic: 'ellipse', indices: [...PASCAL_DEFAULT_INDICES.ellipse], order: [0, 1, 2, 3, 4, 5]},
        other: PASCAL_EXAMPLES.pappus,
        malformed: [{...PASCAL_EXPECTED, indices: [0, 1]}, {...PASCAL_EXPECTED, conic: 'sphere'}, {...PASCAL_EXPECTED, indices: [1000, 0, 0, 0, 0, 0]}],
    },
    {
        name: 'PolePolar', create: () => new PolePolar(), expected: POLE_EXPECTED,
        build: g => { asPole(g).loadModel(POLE_EXPECTED as never); asPole(g).select(true); },
        preceding: [g => asPole(g).loadExample('inside'), g => asPole(g).loadExample('infinity')],
        select: g => asPole(g).select(true), selection: g => asPole(g).pSelected, unselected: false,
        lessonDefault: (g, data) => asPole(g).lessonDefault(data as never),
        defaultModel: {example: 'default', conic: 'ellipse', p: {x: 5, y: 21}},
        other: {example: 'custom', conic: 'parabola', p: {x: 10, y: -5}},
        malformed: [{...POLE_EXPECTED, p: {x: 51, y: 0}}, {...POLE_EXPECTED, ideal: {dx: 0, dy: 0}}, {...POLE_EXPECTED, conic: 'sphere'}],
    },
];

describe.each(TRIO)('$name projection', (c) => {
    const mountTrio = (): TrioGraph => {
        const graph = c.create();
        mount(graph as never);
        return graph;
    };
    const source = (): TrioGraph => {
        const graph = mountTrio();
        act(() => { c.build(graph); });
        return graph;
    };

    test('export and import round-trip after two distinct preceding scenes, with the stored format unchanged', () => {
        const src = source();
        expect(src.model).toEqual(c.expected);
        const file = wire(src.exportPreset());
        expect(file.data).toEqual(c.expected);
        expect(file.graphState).toEqual({initialized: true});
        expect(Object.keys(file).sort()).toEqual(['boardState', 'data', 'graphState', 'id']);
        expect(JSON.stringify(file)).not.toMatch(/Selected|nudged|transientState|displayState/);
        const target = mountTrio();
        for (const earlier of c.preceding) {
            act(() => { earlier(target); });
            expect(target.model).not.toEqual(c.expected);
        }
        act(() => { c.select(target); });
        act(() => { target.importPreset(file); });
        expect(target.model).toEqual(c.expected);
        expect(target.state).toEqual({initialized: true, model: c.expected});
        expect(c.selection(target)).toBe(c.unselected);
        expect(wire(target.exportPreset())).toMatchObject({data: c.expected, graphState: {initialized: true}});
    });

    test('a partial Preset starts omitted parts from the defaults, never from the preceding scene', () => {
        const src = source();
        const file = wire(src.exportPreset());
        const target = mountTrio();
        act(() => { c.preceding[0](target); c.select(target); });
        act(() => { target.importPreset({id: file.id, data: file.data}); });
        expect(target.state).toEqual({initialized: true, model: c.expected});
        act(() => { c.preceding[1](target); });
        act(() => { target.importPreset({id: file.id, graphState: {initialized: true}}); });
        expect(target.state).toEqual({initialized: true, model: c.defaultModel});
        expect(c.selection(target)).toBe(c.unselected);
    });

    test('a malformed Preset or a forbidden model in the permitted state is refused without mutation', () => {
        const src = source();
        const file = wire(src.exportPreset());
        const target = mountTrio();
        act(() => { c.preceding[0](target); c.select(target); });
        const model = target.model;
        const before = wire(target.state);
        const selection = c.selection(target);
        for (const data of c.malformed) expect(() => target.importPreset({...file, data})).toThrow();
        for (const graphState of [{model: c.other}, {initialized: true, model: c.other}, {initialized: 'yes'}]) {
            expect(() => target.importPreset({...file, graphState})).toThrow();
        }
        expect(target.model).toBe(model);
        expect(wire(target.state)).toEqual(before);
        expect(c.selection(target)).toBe(selection);
    });

    test('a figure Preset gives a scene state that is a function of its data, and the entry scene returns exactly', () => {
        const src = source();
        const file = wire(src.exportPreset());
        const target = mountTrio();
        act(() => { c.preceding[0](target); });
        const entry = wire(target.exportPreset());
        // Computed from the Preset alone: the live scene (a different model) must not leak in, and nothing is imported first.
        expect(target.figureStateOf(file)).toEqual({initialized: true, model: c.expected});
        expect(target.model).not.toEqual(c.expected);
        act(() => { expect(target.figureScene(file)).toEqual({initialized: true, model: c.expected}); });
        expect(target.model).toEqual(c.expected);
        // Figures of a Preset with an omitted graphState and an omitted data.
        expect(target.figureStateOf({id: file.id, data: file.data})).toEqual({initialized: true, model: c.expected});
        expect(target.figureStateOf({id: file.id, graphState: {initialized: true}})).toEqual({initialized: true, model: c.defaultModel});
        // Returning to the entry scene restores the first scene's model.
        act(() => { expect(target.figureScene(entry)).toEqual({initialized: true, model: entry.data}); });
        expect(target.model).toEqual(entry.data);
    });

    test('the lesson default scene and a lesson fixture start fresh from their own data', () => {
        const target = mountTrio();
        act(() => { c.preceding[1](target); c.select(target); });
        act(() => { target.resetToDefaultScene(); });
        expect(target.state).toEqual({initialized: true, model: c.defaultModel});
        expect(c.selection(target)).toBe(c.unselected);
        // The fixture state is built from the fixture data, not from whatever model is live.
        expect(c.lessonDefault(target, c.other)).toEqual({initialized: true, model: c.other});
        expect(c.lessonDefault(target, c.expected)).toEqual({initialized: true, model: c.expected});
    });
});

describe('PolePolar finite and ideal P', () => {
    test('a finite P is stored without an ideal key and replaces a preceding ideal P', () => {
        const graph = new PolePolar();
        mount(graph);
        act(() => { graph.loadModel({example: 'custom', conic: 'circle', p: {x: 0, y: 0}}); });
        const finite = wire(graph.exportPreset());
        expect(finite.data).toEqual({example: 'custom', conic: 'circle', p: {x: 0, y: 0}});
        expect('ideal' in finite.data).toBe(false);
        const target = new PolePolar();
        mount(target);
        act(() => { target.loadExample('infinity'); });
        act(() => { target.importPreset(finite); });
        expect(target.model.ideal).toBeUndefined();
        expect(target.model).toEqual({example: 'custom', conic: 'circle', p: {x: 0, y: 0}});
    });
});
