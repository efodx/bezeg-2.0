import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {beforeAll, describe, expect, test} from 'vitest';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {LinearMapGraph} from './LinearMapGraph';
import {linearMapPresetCollection} from './linearMapPresetCollection';
import {t} from '../../localization';
import type {LinearMapState} from '../../linear/linearMapModel';

beforeAll(installBoardShims);

class ViewedLinearMap extends LinearMapGraph {
    liveBoard() { return this.board; }
    act(action: object) { this.applyLinearMapAction(action as never); }
}
const mountGraph = () => {
    const graph = new ViewedLinearMap();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const json = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const boxOf = (graph: ViewedLinearMap) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));
const toMode = (graph: ViewedLinearMap, mode: 'iterate' | 'tracedet') => act(() => {
    graph.act({kind: 'linear-map', operation: 'set-matrix', matrix: [[4, 1], [2, 3]]});
    graph.act({kind: 'linear-map', operation: 'set-mode', mode});
    if (mode === 'iterate') {
        graph.act({kind: 'linear-map', operation: 'set-start', start: [1.25, -2]});
        graph.act({kind: 'linear-map', operation: 'step', step: 3});
    }
});

// F2b: the iterate and tracedet modes are modes of the existing linear-map route, so their Presets travel through the same collection.
describe.each(['iterate', 'tracedet'] as const)('the %s mode in a Preset', mode => {
    test('the exported Preset passes its collection and a fresh graph imports it to the same data', () => {
        const source = mountGraph();
        toMode(source, mode);
        const preset = json(source.exportPreset());
        const checked = linearMapPresetCollection.check(json(preset.data));
        expect('data' in checked).toBe(true);
        const data = source.exportPresetData() as LinearMapState;
        expect(data.mode).toBe(mode);
        const fresh = mountGraph();
        act(() => { fresh.importPreset(preset); });
        expect(json(fresh.exportPresetData())).toEqual(json(data));
    });
    test('a Preset file with a stored boardState keeps that view', () => {
        const view: [number, number, number, number] = [-3, 4, 9, -4]; // 3:2 like the 600 x 400 board
        const source = mountGraph();
        toMode(source, mode);
        const preset = {...json(source.exportPreset()), boardState: {boundingBox: view}};
        const fresh = mountGraph();
        fresh.importPreset(preset); // not wrapped in act: the sync that reads keepImportedView must run inside importPreset itself
        expect((fresh.exportPresetData() as LinearMapState).mode).toBe(mode);
        expect(boxOf(fresh)).toEqual(view);
    });
    test('a Preset file without a stored view shows the mode\'s own view', () => {
        const source = mountGraph();
        toMode(source, mode);
        const modeView = boxOf(source);
        const preset = json(source.exportPreset());
        const fresh = mountGraph();
        act(() => { fresh.importPreset(preset); });
        expect(boxOf(fresh)).toEqual(modeView);
    });
});

test('the stable-flow label of the trace-determinant plane stays inside a board narrower than its quadrant', () => {
    const graph = mountGraph();
    toMode(graph, 'tracedet');
    const board = graph.liveBoard();
    act(() => { board.setBoundingBox([-6, 11, 12, -4], false); });
    const label = (board.objectsList as unknown as Array<{elType: string; plaintext?: string; X(): number}>)
        .find(o => o.elType === 'text' && o.plaintext === t('linear_map_area_flow'));
    expect(label).toBeDefined();
    expect(label!.X()).toBeGreaterThanOrEqual(board.getBoundingBox()[0]);
});
