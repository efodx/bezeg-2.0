import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ComplexPowerGraph, type ComplexPowerIds} from './ComplexPowerGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends ComplexPowerGraph {
    rows() { return this.readoutRows(); }
    statusLine() { return document.querySelector('[data-complex-power-status]')?.textContent ?? ''; }
}

const FRESH = {A: 20, B: 20, n: 5};

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<ComplexPowerIds>};
}

const states: {name: string; state: Record<string, unknown>; legend: string[]; row: string; value: string; status: string}[] = [
    {name: 'default', state: {}, legend: ['unit', 'path', 'powers', 'z'], row: 'modulus', value: '4√2 ≈ 5,656854', status: 'z = 1 + i, n = 5: z⁵ = −4 − 4i.'},
    {name: 'second power', state: {n: 2}, legend: ['unit', 'path', 'powers', 'z'], row: 'modulus', value: '2', status: 'z = 1 + i, n = 2: z² = 2i.'},
    {name: 'unit circle', state: {A: 16, B: 12, n: 3}, legend: ['unit', 'path', 'powers', 'z'], row: 'unit', value: 'da', status: 'z = 0,8 + 0,6i, n = 3: z³ ≈ −0,352 + 0,936i.'},
    {name: 'inside, n = 1 has no powers drawn', state: {A: 10, B: 10, n: 1}, legend: ['unit', 'path', 'z'], row: 'n', value: '1', status: 'z = 0,5 + 0,5i, n = 1: z¹ ≈ 0,5 + 0,5i.'},
    {name: 'inside, n = 8', state: {A: 10, B: 10, n: 8}, legend: ['unit', 'path', 'powers', 'z'], row: 'modulus', value: '1/16 ≈ 0,0625', status: 'z = 0,5 + 0,5i, n = 8: z⁸ ≈ 0,0625.'},
    {name: 'outside the view', state: {A: 30, B: 10, n: 8}, legend: ['unit', 'path', 'powers', 'z'], row: 'modulus', value: '625/16 ≈ 39,0625', status: 'Zunaj pogleda'},
    {name: 'z = 0', state: {A: 0, B: 0, n: 4}, legend: ['unit', 'path', 'powers', 'z'], row: 'principal', value: 'brez argumenta (z = 0)', status: 'Število z = 0 nima argumenta'},
    {name: 'tiny z, approximate', state: {A: 1, B: 1, n: 8}, legend: ['unit', 'path', 'powers', 'z'], row: 'modulus', value: '1/1600000000 ≈ 6,25·10⁻¹⁰', status: 'z⁸ ≈'},
    {name: 'z = i', state: {A: 0, B: 20, n: 4}, legend: ['unit', 'path', 'powers', 'z'], row: 'real', value: 'da', status: 'z = i, n = 4: z⁴ = 1.'},
];

describe('Complex power declaration', () => {
    for (const {name, state, legend, row, value, status} of states) {
        test(`${name}: consistent, the puck, the legend, the rows and the note`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(['power-n']);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
            }
            expect((current.actions ?? []).map(action => action.id)).toEqual(['next-step', 'play-pause', 'reset-run']);
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(['unit', 'path', 'powers', 'z']);
            const visible = (current.legend ?? []).filter(entry => graph.drawnObject(entry.id)?.visible).map(entry => entry.id);
            expect(visible.sort()).toEqual([...legend].sort());
            expect(current.readouts![0].rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            expect(graph.rows().find(entry => entry.id === row)?.value).toBe(value);
            expect(current.notes!.map(entry => entry.id)).toEqual(['status']);
            const note = renderMessage(current.notes!.find(entry => entry.id === 'status')!.text);
            expect(note).toBe(graph.statusLine());
            expect(note).toContain(status);
            expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the binding writes the exponent through the typed setter, reads it back and refuses the rest', () => {
        const {graph, view} = setup({});
        expect([...graph.parameters!.keys()].filter(key => key !== 'view')).toEqual(['power-n']);
        act(() => { graph.parameters!.write('power-n', 7, 'learner'); });
        expect(graph.state.n).toBe(7);
        expect(graph.parameters!.read('power-n')).toBe(7);
        const kept = graph.state;
        expect(graph.parameters!.write('power-n', 2.5, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('power-n', 9, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('power-n', 0, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('power-n', '3' as never, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        view.unmount();
    });

    test('the playback actions step, play and reset as the learner and an unknown id is refused', () => {
        const {graph, view} = setup({n: 1});
        act(() => graph.performAction('next-step'));
        expect(graph.state.n).toBe(2);
        act(() => graph.performAction('reset-run'));
        expect(graph.state.n).toBe(1);
        act(() => graph.performAction('play-pause'));
        expect(graph.isPlaying()).toBe(true);
        act(() => graph.performAction('play-pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });
});
