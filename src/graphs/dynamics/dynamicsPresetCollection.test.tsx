import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {
    DEFAULT_LOGISTIC_STATE, DEFAULT_PHASE_STATE, serializeLogisticState, serializePhaseState, type LogisticState, type PhaseState,
} from '../../dynamics/phaseModel';
import {LogisticMapGraph} from './LogisticMapGraph';
import {PhasePortraitGraph} from './PhasePortraitGraph';
import {logisticMapPresetCollection, phasePortraitPresetCollection} from './dynamicsPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends PhasePortraitGraph | LogisticMapGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const pendulum: PhaseState = {...DEFAULT_PHASE_STATE, system: 'pendulum', equilibrium: 1, zoom: 2, seeds: [{X: 20, Y: 0}, {X: -40, Y: 20}]};
const chaotic: LogisticState = {R: 380, X: 35, step: 12};

describe('phase-portrait Preset collection', () => {
    test.each([['the default', DEFAULT_PHASE_STATE], ['the pendulum around its second equilibrium with two seeds', pendulum]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new PhasePortraitGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('phase-portrait');
        expect(preset.data).toEqual(serializePhaseState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(phasePortraitPresetCollection().check(preset.data)).toEqual({data: serializePhaseState(state)});

        const fresh = mountGraph(new PhasePortraitGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializePhaseState(fresh.state)).toEqual(serializePhaseState(state));
        expect(fresh.playing).toBe(false);
        expect(fresh.time).toBe(0);
    });
    test('rejects another system, an out-of-range entry, an equilibrium the system lacks, no seeds and a foreign graph state field', () => {
        const collection = phasePortraitPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_PHASE_STATE, system: 'spiral'}))).toContain('system');
        expect(rejectionOf(collection.check({...DEFAULT_PHASE_STATE, A: 999}))).toContain('A');
        expect(rejectionOf(collection.check({...DEFAULT_PHASE_STATE, equilibrium: 1}))).toContain('equilibrium');
        expect(rejectionOf(collection.check({...DEFAULT_PHASE_STATE, seeds: []}))).toContain('seeds');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, system: 'linear'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (time, playing and the classification do not enter a Preset)', () => {
        expect(phasePortraitPresetCollection().check({...DEFAULT_PHASE_STATE, time: 3, playing: true, type: 'saddle'})).toEqual({data: DEFAULT_PHASE_STATE});
    });
});

describe('logistic-map Preset collection', () => {
    test.each([['the default', DEFAULT_LOGISTIC_STATE], ['r = 3,8 after twelve steps', chaotic]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new LogisticMapGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('logistic-map');
        expect(preset.data).toEqual(serializeLogisticState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(logisticMapPresetCollection().check(preset.data)).toEqual({data: serializeLogisticState(state)});

        const fresh = mountGraph(new LogisticMapGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeLogisticState(fresh.state)).toEqual(serializeLogisticState(state));
        expect(fresh.isPlaying()).toBe(false);
    });
    test('rejects an r or a start outside the range, too many steps and a foreign graph state field', () => {
        const collection = logisticMapPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_LOGISTIC_STATE, R: 401}))).toContain('R');
        expect(rejectionOf(collection.check({...DEFAULT_LOGISTIC_STATE, X: 0}))).toContain('X');
        expect(rejectionOf(collection.check({...DEFAULT_LOGISTIC_STATE, step: 61}))).toContain('step');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, R: 300})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (playback and derived periods do not enter a Preset)', () => {
        expect(logisticMapPresetCollection().check({...DEFAULT_LOGISTIC_STATE, playing: true, period: 2})).toEqual({data: DEFAULT_LOGISTIC_STATE});
    });
});

describe('a Preset file with a stored view keeps that view', () => {
    const boxOf = (graph: {liveBoard(): JXG.Board}) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));
    class ViewedPhase extends PhasePortraitGraph { liveBoard() { return this.board; } }
    class ViewedLogistic extends LogisticMapGraph { liveBoard() { return this.board; } }

    test('phase portrait: the pendulum with a zoom is imported with the stored boardState, not the view of the zoom', () => {
        const view: [number, number, number, number] = [-3, 4, 6, -2]; // 3:2 like the 600 x 400 board: this graph keeps equal axis units
        const source = mountGraph(new ViewedPhase());
        act(() => { source.setState(pendulum); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedPhase());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.system).toBe('pendulum');
        expect(boxOf(fresh)).toEqual(view);
    });
    test('logistic map: the stored boardState is kept exactly, not widened to the board aspect', () => {
        const view: [number, number, number, number] = [-0.2, 1.1, 2.5, -0.1];
        const source = mountGraph(new ViewedLogistic());
        act(() => { source.setState(chaotic); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedLogistic());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state).toMatchObject(chaotic);
        expect(boxOf(fresh)).toEqual(view);
    });
});
