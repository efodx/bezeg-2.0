import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {DEFAULT_LP_STATE, serializeLpState} from '../../optimization/lpModel';
import LinearProgramGraph from './LinearProgramGraph';
import {LP_PRESET_KEY} from './lpPresetCollection';

beforeAll(installBoardShims);
afterEach(() => localStorage.clear());

const KEY = `bezeg-2.0:preset-${LP_PRESET_KEY}`;
const mount = () => {
    const graph = new LinearProgramGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
/** Starts the operation inside `act` so the host commits its renders, then waits for it outside. */
const settle = async (start: () => Promise<void>) => {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
};
const content = (graph: LinearProgramGraph) => {
    const {constraints, objective, sweep} = graph.state;
    return {constraints, objective, sweep};
};
const rowReadouts = () => document.querySelectorAll('[data-readout^="row-"]').length;

describe('LP Preset round trip', () => {
    test('a saved Preset of another shape is accepted, equals the saved data and draws it', async () => {
        const graph = mount();
        const rows = DEFAULT_LP_STATE.constraints.length;
        const other = rows < 5 ? rows + 1 : rows - 1;
        act(() => { graph.setRowCount(other); });
        const saved = content(graph);
        act(() => { graph.saveCurrentPreset('mine'); });
        expect(graph['presetNoticeValue']).toBeUndefined();
        await settle(() => graph.selectPreset(''));
        await settle(() => graph.reset());
        expect(graph.state.constraints.length).toBe(rows);

        await settle(() => graph.selectPreset('mine'));
        expect(graph['presetNoticeValue']).toBeUndefined();
        expect(graph.selectedPresetId).toBe('mine');
        expect(content(graph)).toEqual(saved);
        await settle(() => graph.reset());
        expect(graph['presetNoticeValue']).toBeUndefined();
        expect(content(graph)).toEqual(saved);
        expect(graph.exportPresetData()).toEqual([['LinearProgram', serializeLpState(graph.state)]]);
        expect(rowReadouts()).toBe(other);
    });

    test('an entry without graphState selects and Resets to its data', async () => {
        const rows = DEFAULT_LP_STATE.constraints.length;
        const other = rows < 5 ? rows + 1 : rows - 1;
        const probe = mount();
        act(() => { probe.setRowCount(other); });
        const data = probe.exportPresetData();
        localStorage.setItem(KEY, JSON.stringify({data: [{id: 'bare', data}]}));
        const graph = mount();
        await settle(() => graph.selectPreset('bare'));
        expect(graph['presetNoticeValue']).toBeUndefined();
        expect(graph.state.constraints.length).toBe(other);
        await settle(() => graph.reset());
        expect(graph.state.constraints.length).toBe(other);
    });
});
