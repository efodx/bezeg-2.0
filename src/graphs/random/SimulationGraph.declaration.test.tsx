import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {SimulationGraph} from './SimulationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';
import {DEFAULT_RANDOM_STATE, N_MAX, withMode, type RandomMode} from '../../random/randomModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Simulation = {setState(state: Record<string, unknown>): void};
const start = (graph: SimulationGraph, mode: RandomMode, state: Record<string, unknown> = {}) => {
    act(() => { runAs('learner', () => (graph as unknown as Simulation).setState({...withMode(DEFAULT_RANDOM_STATE, mode), ...state})); });
};

/** The parameter keys each mode declares, in strip order (the seeds close the strip; the second seed only while the overlay is on). */
const KEYS: Record<RandomMode, string[]> = {
    galton: ['random-n', 'random-rows', 'random-p', 'random-seed'],
    frequency: ['random-n', 'random-seed'],
    area: ['random-n', 'random-shape', 'random-seed'],
    walk: ['random-n', 'random-steps', 'random-seed'],
    markov: ['random-n', 'random-a', 'random-b', 'random-start', 'random-seed'],
    interval: ['random-n', 'random-sample', 'random-seed'],
};
const states: {name: string; mode: RandomMode; state: Record<string, unknown>; keys: string[]}[] = [
    {name: 'galton, default', mode: 'galton', state: {}, keys: KEYS.galton},
    {name: 'galton, second seed', mode: 'galton', state: {overlay: 1, seed2: 43}, keys: [...KEYS.galton, 'random-seed2']},
    {name: 'frequency, 100 tosses', mode: 'frequency', state: {n: 100, shown: 100}, keys: KEYS.frequency},
    {name: 'area, disc', mode: 'area', state: {areaShape: 'disc', n: 100, shown: 100}, keys: KEYS.area},
    {name: 'walk, 99 steps', mode: 'walk', state: {walkSteps: 99}, keys: KEYS.walk},
    {name: 'markov, a = b = 0', mode: 'markov', state: {markovA: 0, markovB: 0}, keys: KEYS.markov},
    {name: 'interval, sample 16', mode: 'interval', state: {sampleSize: 16}, keys: KEYS.interval},
];

describe('prob-simulation declares through BaseGraph', () => {
    for (const {name, mode, state, keys} of states) {
        test(`${name}: consistent, rows equal the panel, pucks follow the mode`, () => {
            const graph = new SimulationGraph();
            const {view} = mountGraph(graph);
            start(graph, mode, state);
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => parameter.key)).toEqual(keys);
            expect(declaration.parameters?.every(parameter => parameter.placement === 'board')).toBe(true);
            expect(declaration.legend ?? []).toEqual([]);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.length).toBeGreaterThan(2);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals) : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.notes?.[0].id).toBe('status');
            const status = view.container.querySelector('[data-random-status]')?.textContent;
            expect(status).toBe(renderMessage(declaration.notes![0].text));
        });
    }

    test('a write through the arbiter changes the model and reads back; a value outside the range is refused and changes nothing', () => {
        const graph = new SimulationGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('random-n', 100, 'learner'); });
        expect(graph.parameters!.read('random-n')).toBe(100);
        act(() => { graph.parameters!.write('random-rows', 7, 'learner'); });
        expect(graph.parameters!.read('random-rows')).toBe(7);
        act(() => { graph.parameters!.write('random-n', N_MAX.galton + 1, 'learner'); });
        expect(graph.parameters!.read('random-n')).toBe(100);
    });

    test('a percent write reads back and a value outside 0 to 100 changes nothing', () => {
        const graph = new SimulationGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('random-p', 30, 'learner'); });
        expect(graph.parameters!.read('random-p')).toBe(30);
        act(() => { graph.parameters!.write('random-p', 101, 'learner'); });
        expect(graph.parameters!.read('random-p')).toBe(30);
    });
});
