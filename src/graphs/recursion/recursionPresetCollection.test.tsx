import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {
    DEFAULT_COBWEB_STATE, DEFAULT_GROWTH_STATE, serializeCobwebState, serializeGrowthState, type CobwebState, type GrowthState,
} from '../../recursion/recursionModel';
import {GrowthGraph} from './GrowthGraph';
import {RecursionCobwebGraph} from './RecursionCobwebGraph';
import {growthPresetCollection, recursionCobwebPresetCollection} from './recursionPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends RecursionCobwebGraph | GrowthGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const logistic: CobwebState = {...DEFAULT_COBWEB_STATE, map: 'logistic', R: 28, X: 25, step: 7};
const interest: GrowthState = {...DEFAULT_GROWTH_STATE, panel: 'interest', capital: 2500, rate: 15, years: 12, parts: 4};

describe('recursion-cobweb Preset collection', () => {
    test.each([['the default', DEFAULT_COBWEB_STATE], ['a logistic map after seven steps', logistic]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new RecursionCobwebGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('recursion-cobweb');
        expect(preset.data).toEqual(serializeCobwebState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(recursionCobwebPresetCollection().check(preset.data)).toEqual({data: serializeCobwebState(state)});

        const fresh = mountGraph(new RecursionCobwebGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeCobwebState(fresh.state)).toEqual(serializeCobwebState(state));
        expect(fresh.isPlaying()).toBe(false);
    });
    test('rejects another map, an off-grid or out-of-range field, a start outside the logistic interval and a foreign graph state field', () => {
        const collection = recursionCobwebPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_COBWEB_STATE, map: 'tent'}))).toContain('map');
        expect(rejectionOf(collection.check({...DEFAULT_COBWEB_STATE, M: 10.5}))).toContain('M');
        expect(rejectionOf(collection.check({...DEFAULT_COBWEB_STATE, step: 61}))).toContain('step');
        expect(rejectionOf(collection.check({...DEFAULT_COBWEB_STATE, map: 'logistic', X: 0}))).toContain('X');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, map: 'cosine'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (playback, the speed and derived values do not enter a Preset)', () => {
        expect(recursionCobwebPresetCollection().check({...DEFAULT_COBWEB_STATE, playing: true, speed: 500, fixedPoint: 2})).toEqual({data: DEFAULT_COBWEB_STATE});
    });
});

describe('recursion-growth Preset collection', () => {
    test.each([['the default', DEFAULT_GROWTH_STATE], ['the interest panel', interest]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new GrowthGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('recursion-growth');
        expect(preset.data).toEqual(serializeGrowthState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(growthPresetCollection().check(preset.data)).toEqual({data: serializeGrowthState(state)});

        const fresh = mountGraph(new GrowthGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeGrowthState(fresh.state)).toEqual(serializeGrowthState(state));
    });
    test('rejects another panel, an out-of-range field, a compounding count off the list and a foreign graph state field', () => {
        const collection = growthPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_GROWTH_STATE, panel: 'pie'}))).toContain('panel');
        expect(rejectionOf(collection.check({...DEFAULT_GROWTH_STATE, n: 31}))).toContain('n');
        expect(rejectionOf(collection.check({...DEFAULT_GROWTH_STATE, parts: 3}))).toContain('parts');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, panel: 'log'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (derived terms and sums do not enter a Preset)', () => {
        expect(growthPresetCollection().check({...DEFAULT_GROWTH_STATE, sum: 120, terms: [3]})).toEqual({data: DEFAULT_GROWTH_STATE});
    });
});

describe('a Preset file with a stored view keeps that view', () => {
    const view: [number, number, number, number] = [-3.5, 4.25, 6.5, -2.75];
    const boxOf = (graph: {liveBoard(): JXG.Board}) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));
    class ViewedGrowth extends GrowthGraph { liveBoard() { return this.board; } }
    class ViewedCobweb extends RecursionCobwebGraph { liveBoard() { return this.board; } }

    test('growth: the log panel is imported with the stored boardState, not refitted to the panel window', () => {
        const state: GrowthState = {...DEFAULT_GROWTH_STATE, panel: 'log'};
        const source = mountGraph(new ViewedGrowth());
        act(() => { source.setState(state); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedGrowth());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.panel).toBe('log');
        expect(boxOf(fresh)).toEqual(view);
    });
    test('cobweb: the logistic map is imported with the stored boardState, not the window of the map', () => {
        const source = mountGraph(new ViewedCobweb());
        act(() => { source.setState(logistic); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedCobweb());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.map).toBe('logistic');
        expect(boxOf(fresh)).toEqual(view);
    });
});
