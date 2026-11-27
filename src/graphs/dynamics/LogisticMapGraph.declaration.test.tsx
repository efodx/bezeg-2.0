import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {LogisticMapGraph, type LogisticMapIds} from './LogisticMapGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends LogisticMapGraph {
    rows() { return this.readoutRows(); }
    boardTexts() { return (this.board.objectsList as unknown as {elType: string; plaintext?: string; evalVisProp(name: string): unknown}[]).filter(o => o.elType === 'text' && o.evalVisProp('visible')).map(o => o.plaintext ?? ''); }
    statusLine() { return document.querySelector('[data-logistic-status]')?.textContent ?? ''; }
}

const FRESH = {R: 290, X: 20, step: 0};
const valueText = (value: unknown): string => String(value);

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<LogisticMapIds>};
}

const ALWAYS = ['map', 'diagonal', 'cobweb', 'fixed', 'diagram', 'second', 'onset'];
const states: {name: string; state: Record<string, unknown>; legend: string[]; rows: number; row: string; value: string}[] = [
    {name: 'default', state: {}, legend: ALWAYS, rows: 10, row: 'r', value: '2,9'},
    {name: 'ten steps', state: {R: 250, step: 10}, legend: [...ALWAYS, 'iterate'].sort(), rows: 10, row: 'steps', value: '10 od 60'},
    {name: 'neutral', state: {R: 300, X: 50, step: 5}, legend: [...ALWAYS, 'iterate'].sort(), rows: 10, row: 'r', value: '3'},
    {name: '2-cycle', state: {R: 320, X: 33, step: 30}, legend: [...ALWAYS, 'cycle', 'iterate'].sort(), rows: 11, row: 'r', value: '3,2'},
    {name: 'beyond', state: {R: 350, X: 75, step: 60}, legend: [...ALWAYS, 'cycle', 'iterate'].sort(), rows: 11, row: 'x0', value: '0,75'},
    {name: 'chaos, claimless', state: {R: 380, X: 10, step: 25}, legend: [...ALWAYS, 'cycle', 'iterate'].sort(), rows: 12, row: 'note', value: ''},
    {name: 'last step', state: {R: 400, X: 99, step: 60}, legend: [...ALWAYS, 'cycle', 'iterate'].sort(), rows: 12, row: 'steps', value: '60 od 60'},
];

describe('Logistic map declaration', () => {
    for (const {name, state, legend, rows, row, value} of states) {
        test(`${name}: consistent, the pucks, the legend, the rows and the notes`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(['logistic-r', 'logistic-x0']);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
            }
            for (const action of current.actions ?? []) expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);
            expect((current.actions ?? []).map(action => action.id)).toEqual(['next-step', 'play-pause', 'reset-run']);
            expect((current.legend ?? []).map(entry => entry.id).sort()).toEqual([...legend].sort());
            for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.id)?.visible).toBe(true);

            expect(current.readouts![0].rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            expect(graph.rows().length).toBe(rows);
            if (value) expect(valueText(graph.rows().find(entry => entry.id === row)?.value)).toBe(value);
            else expect(graph.rows().some(entry => entry.id === row)).toBe(true);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(graph.statusLine());
            expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the legend entries that are off are absent from the declaration, not drawn visible', () => {
        const {graph, declaration, view} = setup({});
        expect(declaration().legend!.map(entry => entry.id)).not.toContain('cycle');
        expect(declaration().legend!.map(entry => entry.id)).not.toContain('iterate');
        expect(graph.drawnObject('no-such-entry')).toBeUndefined();
        view.unmount();
    });

    test('the legend names the rules and the marks of r, and no caption column is drawn on the board (the Legenda card carries them)', () => {
        const {graph, declaration, view} = setup({R: 310, step: 2});
        const labels = Object.fromEntries((declaration().legend ?? []).map(entry => [entry.id, renderMessage(entry.label)]));
        expect(labels.map).toBe('Preslikava y = 3,1·x·(1 − x)');
        expect(labels.diagonal).toBe('Diagonala y = x');
        expect(labels.cobweb).toContain('koraki x₀, x₁');
        expect(labels.diagram).toContain('od 2,5 do 4');
        expect(labels.second).toBe('r = 1 + √6 ≈ 3,44949');
        expect(labels.onset).toBe('r ≈ 3,56995: začetek kaosa (navedeno, ni izračunano)');
        for (const id of ['second', 'onset']) expect(graph.drawnObject(id)?.visible).toBe(true);
        expect(graph.boardTexts().filter(text => /^(preslikava|diagonala|pajkova|bifurkacijski|r ≈|r = 1)/.test(text))).toEqual([]);
        view.unmount();
    });

    test('the bindings write r and x0 on the hundredth grid, read back and refuse the rest', () => {
        const {graph, view} = setup({});
        expect([...graph.parameters!.keys()].filter(key => key !== 'view').sort()).toEqual(['logistic-r', 'logistic-x0']);
        act(() => { graph.parameters!.write('logistic-r', 3.2, 'learner'); });
        expect(graph.state.R).toBe(320);
        expect(graph.parameters!.read('logistic-r')).toBe(3.2);
        act(() => { graph.parameters!.write('logistic-x0', 0.75, 'learner'); });
        expect(graph.state.X).toBe(75);
        expect(graph.parameters!.read('logistic-x0')).toBe(0.75);
        const kept = graph.state;
        for (const bad of [3.256, Number.NaN, '3', 9]) {
            expect(graph.parameters!.write('logistic-r', bad as never, 'learner').status).not.toBe('applied');
        }
        expect(graph.parameters!.write('logistic-x0', 5 as never, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        view.unmount();
    });

    test('the playback actions step, play and reset as the learner and an unknown id is refused', () => {
        const {graph, view} = setup({});
        act(() => graph.performAction('next-step'));
        expect(graph.state.step).toBe(1);
        act(() => graph.performAction('reset-run'));
        expect(graph.state.step).toBe(0);
        act(() => graph.performAction('play-pause'));
        expect(graph.isPlaying()).toBe(true);
        act(() => graph.performAction('play-pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });
});
