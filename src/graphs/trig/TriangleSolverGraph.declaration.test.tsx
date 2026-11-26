import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {TriangleSolverGraph, type TriangleSolverIds} from './TriangleSolverGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends TriangleSolverGraph {
    rows() { return this.readoutRows(); }
    statusLine() { return document.querySelector('[data-triangle-status]')?.textContent ?? ''; }
}

const FRESH = {mode: 'sides', A: {x: 0, y: 0}, B: {x: 7, y: 0}, C: {x: 2, y: 4}, data: {type: 'sss', a: 5, b: 6, c: 7}};
const valueText = (value: unknown): string => (value as {kind?: string}).kind === 'formatted' ? (value as {text: string}).text : renderMessage(value as never);

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<TriangleSolverIds>};
}

/** Heron for the sides 5, 6, 7: sqrt(9 * 4 * 3 * 2). The law of sines for a = 5, b = 8, A = 30 degrees: sin B = 8 sin 30 / 5. */
const HERON = Math.sqrt(9 * 4 * 3 * 2).toFixed(5).replace('.', ',');
const SSA_B = (Math.asin(8 * Math.sin(Math.PI / 6) / 5) * 180 / Math.PI).toFixed(4).replace('.', ',');

const states: {name: string; state: Record<string, unknown>; pucks: string[]; legend: string[]; row: string; value: string; status: RegExp}[] = [
    {name: 'sides', state: {}, pucks: ['triangle-mode'], legend: [], row: 'side-c', value: '7', status: /^Trikotnik je ostrokoten/},
    {name: 'sides, right angle', state: {B: {x: 3, y: 0}, C: {x: 0, y: 4}}, pucks: ['triangle-mode'], legend: [], row: 'side-a', value: '5', status: /./},
    {name: 'circle', state: {mode: 'circle'}, pucks: ['triangle-mode'], legend: ['circumcircle', 'antipode'], row: 'r-squared', value: '205/16', status: /^Trikotnik je ostrokoten: premer/},
    {name: 'circle, right angle', state: {mode: 'circle', B: {x: 3, y: 0}, C: {x: 0, y: 4}}, pucks: ['triangle-mode'], legend: ['circumcircle', 'antipode'], row: 'two-r', value: '≈ 5', status: /^Pri A je pravi kot/},
    {name: 'solve SSS', state: {mode: 'solve'}, pucks: ['triangle-data', 'triangle-mode'], legend: [], row: 'solved-area-1', value: HERON, status: /^Ena rešitev/},
    {name: 'solve SSA two', state: {mode: 'solve', data: {type: 'ssa', a: 5, b: 8, angleA: 30}}, pucks: ['triangle-data', 'triangle-mode'], legend: ['ssa-arc', 'height'], row: 'solved-angles-1', value: `A = 30°; B ≈ ${SSA_B}°; C ≈ 96,8699°`, status: /^Dve rešitvi/},
    {name: 'solve ASA none', state: {mode: 'solve', data: {type: 'asa', angleA: 40, angleB: 150, c: 8}}, pucks: ['triangle-data', 'triangle-mode'], legend: [], row: '', value: '', status: /^Takega trikotnika ni/},
];

describe('Triangle solver declaration', () => {
    for (const {name, state, pucks, legend, row, value, status} of states) {
        test(`${name}: consistent, the pucks, the legend, the rows from the kernel, the status as a note`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key).sort()).toEqual(pucks);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
                if (entry.kind === 'choice') expect(entry.options.length).toBeLessThanOrEqual(4);
            }
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);
            for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.id)?.visible).toBe(true);

            expect(current.readouts![0].rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            if (row) expect(valueText(graph.rows().find(entry => entry.id === row)?.value)).toBe(value);
            else expect(graph.rows()).toEqual([]);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(graph.statusLine());
            expect(graph.statusLine()).toMatch(status);
            // A state without a triangle draws nothing the view must keep.
            if (row) expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the bindings write, read back and refuse an unknown option', () => {
        const {graph, view} = setup({});
        expect([...graph.parameters!.keys()].filter(key => key !== 'view').sort()).toEqual(['triangle-data', 'triangle-mode']);
        act(() => { graph.parameters!.write('triangle-mode', 'solve', 'learner'); });
        expect(graph.parameters!.read('triangle-mode')).toBe('solve');
        expect(graph.state.mode).toBe('solve');
        act(() => { graph.parameters!.write('triangle-data', 'ssa', 'learner'); });
        expect(graph.parameters!.read('triangle-data')).toBe('ssa');
        expect(graph.state.data.type).toBe('ssa');
        const kept = graph.state;
        for (const [key, bad] of [['triangle-mode', 'cone'], ['triangle-data', 'sss-sss'], ['triangle-data', 3]] as const) {
            expect(graph.parameters!.write(key, bad as never, 'learner').status).not.toBe('applied');
        }
        expect(graph.state).toBe(kept);
        view.unmount();
    });
});
