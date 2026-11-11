import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {DEFAULT_LINE_STATE, LineGeometryState, serializeLineGeometryState} from './lineGeometryModel';
import {LineGeometryGraph} from './LineGeometryGraph';
import {lineGeometryPresetCollection} from './linePresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = (graph: LineGeometryGraph): LineGeometryGraph => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const DISTANCE_STATE: LineGeometryState = {...DEFAULT_LINE_STATE, mode: 'distance', T: {x: -3, y: 5}, P: {x: -2, y: 1}};

const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

describe('line-geometry Preset collection', () => {
    test.each([['the default', DEFAULT_LINE_STATE], ['a distance state', DISTANCE_STATE]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new LineGeometryGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('line-geometry');
        expect(preset.data).toEqual(serializeLineGeometryState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(lineGeometryPresetCollection().check(preset.data)).toEqual({data: serializeLineGeometryState(state)});

        const fresh = mountGraph(new LineGeometryGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeLineGeometryState(fresh.state)).toEqual(serializeLineGeometryState(state));
    });
    test('rejects an off-grid point, a wrong mode and a foreign graph state field with an actionable message', () => {
        const collection = lineGeometryPresetCollection();
        expect(rejectionOf(collection.check({...DISTANCE_STATE, P: {x: 0.5, y: 0}}))).toContain('P');
        expect(rejectionOf(collection.check({...DISTANCE_STATE, mode: 'tangent'}))).toContain('mode');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, mode: 'distance'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the state model ignores unknown properties)', () => {
        expect(lineGeometryPresetCollection().check({...DISTANCE_STATE, slope: 3})).toEqual({data: DISTANCE_STATE});
    });
});
