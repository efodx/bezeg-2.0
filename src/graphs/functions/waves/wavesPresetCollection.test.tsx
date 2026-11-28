import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import type {PresetDataCheck} from '../../base/presets/PresetCollection';
import {installBoardShims} from '../../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../../localization';
import {DEFAULT_WAVES_STATE, serializeWavesState, type WavesState} from '../../../waves/wavesModel';
import {WavesGraph} from '../WavesGraph';
import {wavesPresetCollection} from './wavesPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends WavesGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const sampling: WavesState = {...DEFAULT_WAVES_STATE, mode: 'sampling', a1: 2.5, p1: -45, f1: 7, fs: 9, extra: 24, showJoin: true, showSinc: true, showAlias: false};

describe('waves Preset collection', () => {
    test.each([['the default', DEFAULT_WAVES_STATE], ['a sampling view with the options switched', sampling]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new WavesGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('waves');
        expect(preset.data).toEqual(serializeWavesState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(wavesPresetCollection().check(preset.data)).toEqual({data: serializeWavesState(state)});

        const fresh = mountGraph(new WavesGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeWavesState(fresh.state)).toEqual(serializeWavesState(state));
        expect(fresh.time).toBe(0);
        expect(fresh.playing).toBe(false);
    });
    test('rejects another mode, an off-grid or out-of-range field, a non-boolean switch and a foreign graph state field', () => {
        const collection = wavesPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_WAVES_STATE, mode: 'chirp'}))).toContain('mode');
        expect(rejectionOf(collection.check({...DEFAULT_WAVES_STATE, a1: 0.3}))).toContain('a1');
        expect(rejectionOf(collection.check({...DEFAULT_WAVES_STATE, f1: 41}))).toContain('f1');
        expect(rejectionOf(collection.check({...DEFAULT_WAVES_STATE, showSinc: 'yes'}))).toContain('showSinc');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, time: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the time and the playing flag do not enter a Preset)', () => {
        expect(wavesPresetCollection().check({...DEFAULT_WAVES_STATE, time: 0.5, playing: true})).toEqual({data: DEFAULT_WAVES_STATE});
    });
});

describe('a Preset file with a stored view keeps that view', () => {
    class ViewedWaves extends WavesGraph { liveBoard() { return this.board; } }
    test('the sampling view is imported with the stored boardState, not refitted to the frame of the mode', () => {
        const view: [number, number, number, number] = [-3.5, 4.25, 6.5, -2.75];
        const source = mountGraph(new ViewedWaves());
        act(() => { source.setState(sampling); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedWaves());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.mode).toBe('sampling');
        expect(fresh.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)))).toEqual(view);
    });
});
