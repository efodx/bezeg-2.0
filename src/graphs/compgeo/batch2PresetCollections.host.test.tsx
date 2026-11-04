import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {NOTCHED_MODEL, NOTCHED_QUERY, PENTAGRAM_MODEL, PointInPolygonGraph} from './PointInPolygonGraph';
import {HullRobustnessGraph} from './HullRobustnessGraph';
import {HullTraceGraph} from './HullTraceGraph';
import {hullTraceCollection} from './compgeoPresetCollections';
import {POINT_IN_POLYGON_PRESET_KEY} from './pointInPolygonPresetCollection';
import {HULL_ROBUSTNESS_PRESET_KEY} from './hullRobustnessPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {presetCollections} from '../base/presets/PresetImport';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {GRID_COORD_LIMIT} from '../../compgeo/grid';
import {DEFAULT_POINT_LIMIT, PointSetModel} from '../../compgeo/pointSetModel';
import {Message, renderMessage, setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

/** The collections as the file importer sees them, not the modules' own exports. */
const registered = (key: string) => {
    const found = presetCollections.filter(collection => collection.key === key);
    expect(found).toHaveLength(1);
    return found[0];
};
const pip = registered(POINT_IN_POLYGON_PRESET_KEY);
const robust = registered(HULL_ROBUSTNESS_PRESET_KEY);

const mount = (graph: PointInPolygonGraph | HullRobustnessGraph) =>
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);

/** A rejection names its message key and reads the same, with no leftover placeholder, in both languages. */
const rejected = (message: Message | undefined, key: string, mention: string) => {
    expect(message?.key).toBe(key);
    if (!message) return;
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        expect(renderMessage(message)).toContain(mention);
        expect(renderMessage(message)).not.toMatch(/\{value\d\}/);
    }
};

const tooMany = (base: PointSetModel): PointSetModel =>
    ({...base, points: Array.from({length: DEFAULT_POINT_LIMIT + 1}, (_, i) => ({x: i, y: (i * 7) % 11}))});

describe('point-in-polygon Preset', () => {
    test('the graph owns the registered collection and a saved Preset round-trips polygon and query', () => {
        const graph = new PointInPolygonGraph();
        mount(graph);
        expect(graph.presetCollection()).toBe(pip);
        act(() => { graph.loadModel(PENTAGRAM_MODEL); });
        act(() => { expect(graph.setQuery({x: 2, y: 2})).toBe(true); });
        const saved = JSON.parse(JSON.stringify(graph.exportPreset()));
        expect(saved.id).toBe(POINT_IN_POLYGON_PRESET_KEY);
        expect(pip.checkGraphState?.(saved.graphState)).toBeUndefined();
        expect('data' in pip.check(saved.data)).toBe(true);
        const other = new PointInPolygonGraph();
        mount(other);
        act(() => { other.importPreset(saved); });
        expect(other.model.points).toEqual(PENTAGRAM_MODEL.points);
        expect(other.query).toEqual({x: 2, y: 2});
        expect(JSON.parse(JSON.stringify(other.exportPreset())).graphState).toEqual(saved.graphState);
    });

    test('rejects a fractional, out-of-range or malformed q, an unknown overlay, too many vertices and a fractional vertex', () => {
        rejected(pip.checkGraphState?.({query: {x: 0.5, y: 0}}), 'invalid_value', 'query');
        rejected(pip.checkGraphState?.({query: {x: GRID_COORD_LIMIT + 1, y: 0}}), 'invalid_value', 'query');
        rejected(pip.checkGraphState?.({query: 'q'}), 'invalid_value', 'query');
        expect(pip.checkGraphState?.({overlays: {fan: true}})?.key).toBe('pointset_invalid_overlays');
        const many = pip.check(tooMany(NOTCHED_MODEL));
        expect('rejection' in many && many.rejection.key).toBe('pointset_invalid_too_many_points');
        const fractional = pip.check({...NOTCHED_MODEL, points: [{x: 0.5, y: 0}, ...NOTCHED_MODEL.points.slice(1)]});
        expect('rejection' in fractional && fractional.rejection.key).toBe('pointset_invalid_non_integer_coordinate');
        expect(NOTCHED_QUERY).toEqual({x: 3, y: 1});
    });
});

describe('hull robustness Preset', () => {
    const points: PointSetModel = {mode: 'points', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 2, y: 0}, {x: 4, y: 0}, {x: 2, y: 3}]};
    const fields = {mode: 'kettner', pop: 'right', duplicates: 'keep', panel: 'exact', cellI: 5, cellJ: 63};

    test('the graph owns the registered collection and every robustness field round-trips', () => {
        const graph = new HullRobustnessGraph();
        mount(graph);
        expect(graph.presetCollection()).toBe(robust);
        const graphState = {initialized: true, ...fields, algorithm: 'monotone-chain', step: 3};
        act(() => { graph.importPreset({id: HULL_ROBUSTNESS_PRESET_KEY, data: points, graphState}); });
        const saved = JSON.parse(JSON.stringify(graph.exportPreset()));
        expect(saved.id).toBe(HULL_ROBUSTNESS_PRESET_KEY);
        expect(saved.graphState).toMatchObject(fields);
        expect(robust.checkGraphState?.(saved.graphState)).toBeUndefined();
        expect('data' in robust.check(saved.data)).toBe(true);
        const other = new HullRobustnessGraph();
        mount(other);
        act(() => { other.importPreset(saved); });
        expect(other.model.points).toEqual(points.points);
        expect(other.robustnessMode).toBe('kettner');
        expect(other.popRule).toBe('right');
        expect(other.duplicateRule).toBe('keep');
        expect(other.kettnerPanel).toBe('exact');
        expect(other.kettnerCell).toEqual({i: 5, j: 63});
        expect(JSON.parse(JSON.stringify(other.exportPreset())).graphState).toEqual(saved.graphState);
    });

    test('the hull trace graph keeps its own collection, which still rejects the robustness fields', () => {
        expect(new HullTraceGraph().presetCollection()).toBe(hullTraceCollection);
        expect(hullTraceCollection).not.toBe(robust);
        const traceState = {initialized: true, algorithm: 'monotone-chain', step: 0};
        expect(hullTraceCollection.checkGraphState?.(traceState)).toBeUndefined();
        for (const [field, value] of Object.entries(fields)) {
            expect(hullTraceCollection.checkGraphState?.({...traceState, [field]: value})).toBeDefined();
        }
    });

    test('the default state, the hull trace fields and the extreme cells are accepted', () => {
        expect(robust.checkGraphState?.({})).toBeUndefined();
        expect(robust.checkGraphState?.({...fields, algorithm: 'monotone-chain', step: 2, initialized: true, overlays: {trace: true}})).toBeUndefined();
        expect(robust.checkGraphState?.({cellI: 0, cellJ: 0})).toBeUndefined();
    });

    test.each([
        ['mode', {mode: 'map'}, 'hullrobust_invalid_mode', 'mode'],
        ['pop rule', {pop: 'left'}, 'hullrobust_invalid_pop', 'pop'],
        ['pop rule type', {pop: 1}, 'hullrobust_invalid_pop', 'pop'],
        ['duplicates rule', {duplicates: 'drop'}, 'hullrobust_invalid_duplicates', 'duplicates'],
        ['panel', {panel: 'both'}, 'hullrobust_invalid_panel', 'panel'],
        ['fractional cell', {cellI: 1.5}, 'hullrobust_invalid_cell', 'cellI'],
        ['cell above 63', {cellJ: 64}, 'hullrobust_invalid_cell', 'cellJ'],
        ['negative cell', {cellI: -1}, 'hullrobust_invalid_cell', 'cellI'],
        ['text cell', {cellJ: '5'}, 'hullrobust_invalid_cell', 'cellJ'],
    ])('rejects a bad %s with an actionable message', (_name, state, key, mention) => {
        rejected(robust.checkGraphState?.({...fields, ...state}), key, mention);
    });

    test('rejects an unknown trace algorithm, an unknown field, a non-record state, too many points and a fractional point', () => {
        expect(robust.checkGraphState?.({algorithm: 'quickhull'})?.key).toBe('hulltrace_invalid_algorithm');
        expect(robust.checkGraphState?.({model: points})).toBeDefined();
        expect(robust.checkGraphState?.(null)?.key).toBe('invalid_state');
        const many = robust.check(tooMany(points));
        expect('rejection' in many && many.rejection.key).toBe('pointset_invalid_too_many_points');
        const fractional = robust.check({...points, points: [{x: 1, y: 0.25}]});
        expect('rejection' in fractional && fractional.rejection.key).toBe('pointset_invalid_non_integer_coordinate');
    });
});
