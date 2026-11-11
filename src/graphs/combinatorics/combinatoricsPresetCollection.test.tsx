import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import type {PresetDataCheck} from '../base/presets/PresetCollection';
import {installBoardShims} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {
    CountingState, DEFAULT_COUNTING_STATE, DEFAULT_LATTICE_STATE, LatticeState, serializeCountingState, serializeLatticeState,
} from '../../combinatorics/combinatoricsModel';
import {CountingTreeGraph} from './CountingTreeGraph';
import {LatticePathGraph} from './LatticePathGraph';
import {countingTreePresetCollection, latticePathsPresetCollection} from './combinatoricsPresetCollection';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const mountGraph = <G extends LatticePathGraph | CountingTreeGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const rejectionOf = (result: PresetDataCheck<unknown>): string =>
    'rejection' in result ? renderMessage(result.rejection) : '';

const TRIANGLE_STATE: LatticeState = {...DEFAULT_LATTICE_STATE, view: 'triangle', a: 4, b: 2, route: 3, showCounts: true, split: true};
const MULTISET_STATE: CountingState = {...DEFAULT_COUNTING_STATE, view: 'multiset', counts: [2, 3, 1, 4]};
const UNORDERED_STATE: CountingState = {...DEFAULT_COUNTING_STATE, n: 7, k: 2, ordered: false, repetition: true};

describe('lattice-paths Preset collection', () => {
    test.each([['the default', DEFAULT_LATTICE_STATE], ['the triangle view', TRIANGLE_STATE]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new LatticePathGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('lattice-paths');
        expect(preset.data).toEqual(serializeLatticeState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(latticePathsPresetCollection().check(preset.data)).toEqual({data: serializeLatticeState(state)});

        const fresh = mountGraph(new LatticePathGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeLatticeState(fresh.state)).toEqual(serializeLatticeState(state));
    });
    test('rejects an out-of-range target, a wrong view, a non-boolean switch and a foreign graph state field', () => {
        const collection = latticePathsPresetCollection();
        expect(rejectionOf(collection.check({...TRIANGLE_STATE, a: 99}))).toContain('a');
        expect(rejectionOf(collection.check({...TRIANGLE_STATE, view: 'grid'}))).toContain('view');
        expect(rejectionOf(collection.check({...TRIANGLE_STATE, split: 'yes'}))).toContain('split');
        expect(rejectionOf(collection.check('nope'))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, view: 'paths'})).toBeDefined();
        expect(collection.checkGraphState!({initialized: 1})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the state model ignores unknown properties)', () => {
        expect(latticePathsPresetCollection().check({...TRIANGLE_STATE, total: 15})).toEqual({data: TRIANGLE_STATE});
    });
});

describe('counting-tree Preset collection', () => {
    test.each([['the default', DEFAULT_COUNTING_STATE], ['the repeated-letters view', MULTISET_STATE], ['unordered with repetition', UNORDERED_STATE]])('%s round-trips through the file check and a fresh graph', (_name, state) => {
        const source = mountGraph(new CountingTreeGraph());
        act(() => { source.setState(state); });
        const preset = json(source.exportPreset());
        expect(preset.id).toBe('counting-tree');
        expect(preset.data).toEqual(serializeCountingState(state));
        expect(preset.graphState).toEqual({initialized: true});
        expect(countingTreePresetCollection().check(preset.data)).toEqual({data: serializeCountingState(state)});

        const fresh = mountGraph(new CountingTreeGraph());
        act(() => { fresh.importPreset(preset); });
        expect(serializeCountingState(fresh.state)).toEqual(serializeCountingState(state));
    });
    test('rejects k above n without repetition, a short counts list, a non-boolean switch and a foreign graph state field', () => {
        const collection = countingTreePresetCollection();
        expect(rejectionOf(collection.check({...DEFAULT_COUNTING_STATE, n: 3, k: 5}))).toContain('k');
        expect(rejectionOf(collection.check({...DEFAULT_COUNTING_STATE, counts: [1, 2]}))).toContain('counts');
        expect(rejectionOf(collection.check({...DEFAULT_COUNTING_STATE, ordered: 1}))).toContain('ordered');
        expect(rejectionOf(collection.check(null))).not.toBe('');
        expect(collection.checkGraphState!({initialized: true, n: 3})).toBeDefined();
        expect(collection.checkGraphState!({initialized: true})).toBeUndefined();
    });
    test('an unknown data field is dropped, never trusted (the state model ignores unknown properties)', () => {
        expect(countingTreePresetCollection().check({...UNORDERED_STATE, count: 28})).toEqual({data: UNORDERED_STATE});
    });
});
