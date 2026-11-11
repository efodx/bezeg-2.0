import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {CLASSIFY_EXAMPLES, DEFAULT_ISOMETRY_STATE, IsometryState, serializeIsometryState} from '../../isometry/isometryModel';
import {IsometryGraph} from './IsometryGraph';
import {isometryPresetCollection} from './isometryPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = (graph: IsometryGraph): IsometryGraph => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ROTATION_STATE: IsometryState = {...DEFAULT_ISOMETRY_STATE, mode: 'classify', ...CLASSIFY_EXAMPLES.rotation};

const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

describe('isometries Preset collection', () => {
    test.each([['the default', DEFAULT_ISOMETRY_STATE], ['a classify rotation', ROTATION_STATE]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new IsometryGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('isometries');
        expect(preset.data).toEqual(serializeIsometryState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(isometryPresetCollection().check(preset.data)).toEqual({data: serializeIsometryState(state)});

        const fresh = mountGraph(new IsometryGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeIsometryState(fresh.state)).toEqual(serializeIsometryState(state));
    });
    test('rejects an off-grid point, a wrong mode and a foreign graph state field with an actionable message', () => {
        const collection = isometryPresetCollection();
        expect(rejectionOf(collection.check({...ROTATION_STATE, dilationCentre: {x: 0.5, y: 0}}))).toContain('dilationCentre');
        expect(rejectionOf(collection.check({...ROTATION_STATE, mode: 'shear'}))).toContain('mode');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, mode: 'classify'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the state model ignores unknown properties)', () => {
        expect(isometryPresetCollection().check({...ROTATION_STATE, shear: 3})).toEqual({data: ROTATION_STATE});
    });
});
