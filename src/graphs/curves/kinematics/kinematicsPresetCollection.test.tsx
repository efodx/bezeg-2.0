import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import type {PresetDataCheck} from '../../base/presets/PresetCollection';
import {installBoardShims} from '../../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../../localization';
import {DEFAULT_KINEMATICS_STATE, serializeKinematicsState, withMotion, type KinematicsState} from '../../../kinematics/kinematicsModel';
import {KinematicsGraph} from './KinematicsGraph';
import {kinematicsPresetCollection} from './kinematicsPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = (graph: KinematicsGraph): KinematicsGraph => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const circular: KinematicsState = {...withMotion(DEFAULT_KINEMATICS_STATE, 'circular'), b: 0.5, split: true, trace: true};

describe('curve-kinematics Preset collection', () => {
    test.each([['the default', DEFAULT_KINEMATICS_STATE], ['a varied circular motion', circular]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new KinematicsGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('curve-kinematics');
        expect(preset.data).toEqual(serializeKinematicsState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(kinematicsPresetCollection().check(preset.data)).toEqual({data: serializeKinematicsState(state)});

        const fresh = mountGraph(new KinematicsGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeKinematicsState(fresh.state)).toEqual(serializeKinematicsState(state));
        expect(fresh.time).toBe(0);
        expect(fresh.playing).toBe(false);
    });
    test('rejects a wrong motion, a speed variation outside circling, a non-boolean switch and a foreign graph state field', () => {
        const collection = kinematicsPresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_KINEMATICS_STATE, motion: 'orbit'}))).toContain('motion');
        expect(rejectionOf(collection.check({...DEFAULT_KINEMATICS_STATE, b: 0.5}))).toContain('b');
        expect(rejectionOf(collection.check({...DEFAULT_KINEMATICS_STATE, trace: 'yes'}))).toContain('trace');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, time: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the time and the playing flag does not enter a Preset)', () => {
        expect(kinematicsPresetCollection().check({...DEFAULT_KINEMATICS_STATE, time: 2, playing: true})).toEqual({data: DEFAULT_KINEMATICS_STATE});
    });
});
