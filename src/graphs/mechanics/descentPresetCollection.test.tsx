import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_DESCENT_STATE, serializeDescentState, type DescentState} from '../../mechanics/trackModel';
import {DescentGraph} from './DescentGraph';
import {descentPresetCollection} from './descentPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends DescentGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const tautochrone: DescentState = {...DEFAULT_DESCENT_STATE, mode: 'tautochrone', radius: 2, theta1: 0.5, showArc: true};
const track: DescentState = {...DEFAULT_DESCENT_STATE, mode: 'track', endX: 4.5, p1y: 1.25, showCycloid: false};

describe('mechanics-descent Preset collection', () => {
    test.each([['the default', DEFAULT_DESCENT_STATE], ['a tautochrone with the arc', tautochrone], ['a track without the cycloid', track]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new DescentGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('mechanics-descent');
        expect(preset.data).toEqual(serializeDescentState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(descentPresetCollection().check(preset.data)).toEqual({data: serializeDescentState(state)});

        const fresh = mountGraph(new DescentGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeDescentState(fresh.state)).toEqual(serializeDescentState(state));
        expect(fresh.playing).toBe(false);
        expect(fresh.time).toBe(0);
    });
    test('rejects another mode, an off-grid or out-of-range field, a non-boolean switch and a foreign graph state field', () => {
        const collection = descentPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_DESCENT_STATE, mode: 'slide'}))).toContain('mode');
        expect(rejectionOf(collection.check({...DEFAULT_DESCENT_STATE, radius: 1.1}))).toContain('radius');
        expect(rejectionOf(collection.check({...DEFAULT_DESCENT_STATE, endX: 7}))).toContain('endX');
        expect(rejectionOf(collection.check({...DEFAULT_DESCENT_STATE, showArc: 'yes'}))).toContain('showArc');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, mode: 'track'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (time, playing and derived times do not enter a Preset)', () => {
        expect(descentPresetCollection().check({...DEFAULT_DESCENT_STATE, time: 1.5, playing: true, total: 2})).toEqual({data: DEFAULT_DESCENT_STATE});
    });
});

describe('a Preset file with a stored view keeps that view', () => {
    const view: [number, number, number, number] = [-3, 4, 6, -2]; // 3:2 like the 600 x 400 board: this graph keeps equal axis units
    class ViewedGraph extends DescentGraph { liveBoard() { return this.board; } }

    test('the stored boardState is kept with data that frames another view', () => {
        const source = mountGraph(new ViewedGraph());
        act(() => { source.setState(tautochrone); });
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph(new ViewedGraph());
        act(() => { fresh.importPreset(preset); });
        expect(fresh.state.mode).toBe('tautochrone');
        expect(fresh.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)))).toEqual(view);
    });
});
