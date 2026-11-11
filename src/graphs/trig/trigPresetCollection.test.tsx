import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {
    DEFAULT_TRIANGLE_STATE, DEFAULT_UNIT_CIRCLE_STATE, serializeTriangleState, serializeUnitCircleState, TriangleState, UnitCircleState,
} from '../../trig/trigModel';
import {TriangleSolverGraph} from './TriangleSolverGraph';
import {triangleSolverPresetCollection, unitCirclePresetCollection} from './trigPresetCollection';
import {UnitCircleGraph} from './UnitCircleGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends UnitCircleGraph | TriangleSolverGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const SSA_STATE: TriangleState = {...DEFAULT_TRIANGLE_STATE, mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}};
const CIRCLE_STATE: UnitCircleState = {angle: 301, secondAngle: 45, showSymmetries: true, showCosine: true};

const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

describe('unit-circle Preset collection', () => {
    test.each([['the default', DEFAULT_UNIT_CIRCLE_STATE], ['a non-default state', CIRCLE_STATE]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new UnitCircleGraph());
        act(() => { source.setState({...state, showAddition: true}); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('unit-circle');
        expect(preset.data).toEqual(serializeUnitCircleState(state));
        expect(preset.graphState).toEqual({initialized: true, showAddition: true});
        const checked = unitCirclePresetCollection().check(preset.data);
        expect(checked).toEqual({data: serializeUnitCircleState(state)});

        const fresh = mountGraph(new UnitCircleGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeUnitCircleState(fresh.state)).toEqual(serializeUnitCircleState(state));
        expect(fresh.state.showAddition).toBe(true);
    });
    test('rejects an off-grid angle, a wrong type and a foreign display field with an actionable message', () => {
        const collection = unitCirclePresetCollection();
        expect(rejectionOf(collection.check({...CIRCLE_STATE, angle: 120.25}))).toContain('angle');
        expect(rejectionOf(collection.check({...CIRCLE_STATE, showCosine: 'yes'}))).toContain('showCosine');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, angle: 3})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true, showAddition: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true, showAddition: false})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the state model ignores unknown properties)', () => {
        expect(unitCirclePresetCollection().check({...CIRCLE_STATE, cosValue: 0.5})).toEqual({data: CIRCLE_STATE});
    });
});

describe('triangle-solver Preset collection', () => {
    test.each([['the default', DEFAULT_TRIANGLE_STATE], ['an SSA solve state', SSA_STATE]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new TriangleSolverGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('triangle-solver');
        expect(preset.data).toEqual(serializeTriangleState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(triangleSolverPresetCollection().check(preset.data)).toEqual({data: serializeTriangleState(state)});

        const fresh = mountGraph(new TriangleSolverGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeTriangleState(fresh.state)).toEqual(serializeTriangleState(state));
    });
    test('rejects an off-grid vertex, a wrong type and a foreign graph state field with an actionable message', () => {
        const collection = triangleSolverPresetCollection();
        expect(rejectionOf(collection.check({...SSA_STATE, A: {x: 0.5, y: 0}}))).toContain('A');
        expect(rejectionOf(collection.check({...SSA_STATE, mode: 7}))).toContain('mode');
        expect(rejectionOf(collection.check({...SSA_STATE, data: {type: 'ssa', a: 'x', b: 8, angleA: 30}}))).toContain('a');
        expect(collection.checkGraphState!({initialized: true, mode: 'solve'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
});
