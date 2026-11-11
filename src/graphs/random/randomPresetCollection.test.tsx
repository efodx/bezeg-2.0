import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_RANDOM_STATE, serializeRandomState, withMode, type RandomState} from '../../random/randomModel';
import {SimulationGraph} from './SimulationGraph';
import {randomPresetCollection} from './randomPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends SimulationGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const walk: RandomState = {...withMode(DEFAULT_RANDOM_STATE, 'walk'), seed: 7, shown: 300, walkSteps: 40, overlay: 1, seed2: 9, stopMs: 250};

describe('prob-simulation Preset collection', () => {
    test.each([['the default', DEFAULT_RANDOM_STATE], ['a random walk with an overlay', walk]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new SimulationGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('prob-simulation');
        expect(preset.data).toEqual(serializeRandomState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(randomPresetCollection().check(preset.data)).toEqual({data: serializeRandomState(state)});

        const fresh = mountGraph(new SimulationGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeRandomState(fresh.state)).toEqual(serializeRandomState(state));
        expect(fresh.isPlaying()).toBe(false);
    });
    test('rejects another generator, an off-grid field, a shown above n and a foreign graph state field', () => {
        const collection = randomPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_RANDOM_STATE, generator: 'other'}))).toContain('generator');
        expect(rejectionOf(collection.check({...DEFAULT_RANDOM_STATE, pPercent: 52}))).toContain('pPercent');
        expect(rejectionOf(collection.check({...DEFAULT_RANDOM_STATE, shown: DEFAULT_RANDOM_STATE.n + 1}))).toContain('shown');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, mode: 'walk'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (a tally or the playing flag does not enter a Preset)', () => {
        expect(randomPresetCollection().check({...DEFAULT_RANDOM_STATE, playing: true, counts: [1]})).toEqual({data: DEFAULT_RANDOM_STATE});
    });
});

describe('a Preset file with a stored view keeps that view', () => {
    const view: [number, number, number, number] = [-3.5, 4.25, 6.5, -2.75];
    class ViewedGraph extends SimulationGraph { liveBoard() { return this.board; } }

    test('the stored boardState is kept with data that frames another view', () => {
        const source = mountGraph(new ViewedGraph());
        act(() => { source.setState(walk); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedGraph());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)))).toEqual(view);
    });
});
