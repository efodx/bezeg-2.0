import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import type {PresetDataCheck} from '../../base/presets/PresetCollection';
import {installBoardShims} from '../../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../../localization';
import {DEFAULT_CIRCLE_CONSTRUCTION_STATE, exampleState, serializeCircleConstructionState} from '../../../compgeo/circleConstructionModel';
import {CircleConstructionGraph} from '../CircleConstructionGraph';
import {circleConstructionPresetCollection} from './circleConstructionPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = (graph: CircleConstructionGraph): CircleConstructionGraph => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

describe('circle-construction Preset collection', () => {
    test.each([['the default', DEFAULT_CIRCLE_CONSTRUCTION_STATE], ['the Apollonius example', exampleState('apollonius')]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new CircleConstructionGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('circle-construction');
        expect(preset.data).toEqual(serializeCircleConstructionState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(circleConstructionPresetCollection().check(preset.data)).toEqual({data: serializeCircleConstructionState(state)});

        const fresh = mountGraph(new CircleConstructionGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeCircleConstructionState(fresh.state)).toEqual(serializeCircleConstructionState(state));
    });
    test('rejects an off-grid centre, a wrong mode and a foreign graph state field with an actionable message', () => {
        const collection = circleConstructionPresetCollection();
        const state = exampleState('radical');
        expect(rejectionOf(collection.check({...state, c1: {...state.c1, x: 0.5}}))).toContain('c1.x');
        expect(rejectionOf(collection.check({...state, mode: 'inversion'}))).toContain('mode');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, mode: 'radical'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the state model ignores unknown properties)', () => {
        const state = exampleState('common');
        expect(circleConstructionPresetCollection().check({...state, tangents: 3})).toEqual({data: state});
    });
});
