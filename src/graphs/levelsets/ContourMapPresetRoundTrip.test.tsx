import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {CATALOGUE_IDS} from '../../levelsets/functions2';
import ContourMapGraph from './ContourMapGraph';
import {CONTOUR_PRESET_KEY} from './contourPresetCollection';

beforeAll(installBoardShims);
afterEach(() => localStorage.clear());

const KEY = `bezeg-2.0:preset-${CONTOUR_PRESET_KEY}`;
const mount = () => {
    const graph = new ContourMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
/** Starts the operation inside `act` so the host commits its renders, then waits for it outside. */
const settle = async (start: () => Promise<void>) => {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
};
const refusal = (graph: ContourMapGraph) => graph['presetNoticeValue'];
const functionReadout = () => document.querySelector('[data-readout="function"] dd')?.textContent;
/** Changes the function and the level count away from the default. */
const reshape = (graph: ContourMapGraph) => {
    const fn = CATALOGUE_IDS.find(id => id !== graph.state.fn)!;
    act(() => { graph.setFunction(fn); graph.setLevelCount(graph.state.levelCount === 3 ? 5 : 3); });
};

describe('Contour Preset round trip', () => {
    test('a saved Preset of another function is accepted, equals the saved data and draws it', async () => {
        const graph = mount();
        const initial = graph.state;
        reshape(graph);
        const saved = graph.exportPresetData();
        const name = functionReadout();
        act(() => { graph.saveCurrentPreset('mine'); });
        expect(refusal(graph)).toBeUndefined();
        await settle(() => graph.selectPreset(''));
        await settle(() => graph.reset());
        expect(graph.state.fn).toBe(initial.fn);
        expect(graph.state.levelCount).toBe(initial.levelCount);

        await settle(() => graph.selectPreset('mine'));
        expect(refusal(graph)).toBeUndefined();
        expect(graph.selectedPresetId).toBe('mine');
        expect(graph.exportPresetData()).toEqual(saved);
        await settle(() => graph.reset());
        expect(refusal(graph)).toBeUndefined();
        expect(graph.exportPresetData()).toEqual(saved);
        expect(functionReadout()).toBe(name);
    });

    test('an entry without graphState selects and Resets to its data', async () => {
        const probe = mount();
        reshape(probe);
        const data = probe.exportPresetData();
        localStorage.setItem(KEY, JSON.stringify({data: [{id: 'bare', data}]}));
        const graph = mount();
        await settle(() => graph.selectPreset('bare'));
        expect(refusal(graph)).toBeUndefined();
        expect(graph.exportPresetData()).toEqual(data);
        await settle(() => graph.reset());
        expect(graph.exportPresetData()).toEqual(data);
    });
});
