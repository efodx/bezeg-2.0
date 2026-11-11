import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FivePointGraph} from './FivePointGraph';
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
const mount = (graph: FivePoint | ThreeViews) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
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
