import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ContourMapGraph, type ContourMapIds} from './ContourMapGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const fresh = {mode: 'level-sets', fn: 'bowl', level: 8, levelCount: 1, probe: [12, 16], numeric: false, start: [8, 4], step: 3, constraint: 'line', lineParam: 4, circleParam: 6};

function setup(state: Record<string, unknown>, stepIndex?: number) {
    const graph = new ContourMapGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...fresh, ...state} as never)));
    if (stepIndex !== undefined) act(() => runAs('learner', () => { graph.setStepIndex(stepIndex); }));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<ContourMapIds>};
}

type Case = {name: string; state: Record<string, unknown>; stepIndex?: number; pucks: string[]; actions: string[]; legend: string[]; row: string; value: string; status: string};
const states: Case[] = [
    {name: 'default', state: {}, pucks: ['contour-level', 'contour-count', 'contour-mode'], actions: [], legend: ['levels', 'probe', 'through'],
        row: 'probe', value: '(0,6; 0,8)', status: 'Skleda: x² + y²: nivojnica pri c = 1; število nivojnic: 1.'},
    {name: 'saddle, three levels', state: {fn: 'saddle', level: 0, levelCount: 3, probe: [20, 10]}, pucks: ['contour-level', 'contour-count', 'contour-mode'], actions: [],
        legend: ['levels', 'levels-more', 'probe', 'through'], row: 'level', value: 'od 0 do 2 v korakih po 1', status: 'Sedlo: x² − y²: nivojnica pri c = 0; število nivojnic: 3.'},
    {name: 'gradient with the estimate', state: {fn: 'hills', level: 5, probe: [20, 20], mode: 'gradient', numeric: true}, pucks: ['contour-level', 'contour-count', 'contour-mode'],
        actions: ['numeric'], legend: ['levels', 'probe', 'through', 'gradient', 'tangent'], row: 'gradient', value: '(0,4546487; 0,4546487)',
        status: 'V točki (1; 1) je gradient (0,4546; 0,4546), dolžina 0,643; pravokoten je na nivojnico. Ocena s centralno razliko se od točnega gradienta razlikuje za 0,0000076.'},
    {name: 'descent on the valley, step 3', state: {fn: 'valley', mode: 'descent', step: 11}, stepIndex: 3, pucks: ['contour-level', 'contour-count', 'contour-mode', 'contour-step'],
        actions: ['next-step', 'play-pause', 'reset-run'], legend: ['levels', 'start', 'path', 'current', 'cut'], row: 'steps', value: '3 od 75',
        status: 'Korak: 3 od 75. Dolina: x² + 10y²: začetek (2; 1), korak h = 0,11. Dolina: pri H > 10 pot divergira.'},
    {name: 'lagrange on the line', state: {mode: 'lagrange', levelCount: 3, lineParam: 4}, pucks: ['contour-level', 'contour-count', 'contour-mode', 'contour-line-x'],
        actions: [], legend: ['levels', 'levels-more', 'through', 'constraint', 'point', 'grad-f', 'grad-g', 'tangency', 'scale'], row: 'point', value: '(1; 2)',
        status: 'Vezni pogoj: Premica x + 2y = 5. Točka (1; 2), f = 5. Gradienta sta vzporedna, λ = 2 (točno).'},
    {name: 'lagrange on the circle', state: {mode: 'lagrange', fn: 'product', level: 0, constraint: 'circle', circleParam: 18},
        pucks: ['contour-level', 'contour-count', 'contour-mode', 'contour-circle'], actions: [], legend: ['levels', 'through', 'constraint', 'point', 'grad-f', 'grad-g', 'tangency', 'scale'],
        row: 'point', value: '(−1; 1)', status: 'Vezni pogoj: Krožnica x² + y² = 2. Točka (−1; 1), f = −1. Gradienta sta približno vzporedna: |sin kota| = 0 (izračunano).'},
];

describe('Contour map declaration', () => {
    for (const {name, state, stepIndex, pucks, actions, legend, row, value, status} of states) {
        test(`${name}: consistent, the pucks the lessons ask for, the rows of the panel, the status as a note`, () => {
            const {graph, declaration, view} = setup(state, stepIndex);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);

            const board = (current.parameters ?? []).filter(entry => entry.placement === 'board');
            expect(board.map(entry => entry.key)).toEqual(pucks);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
            }
            // the function and the constraint are setup: Orodja
            expect((current.parameters ?? []).filter(entry => entry.placement === 'tools').map(entry => entry.key))
                .toEqual(state.mode === 'lagrange' ? ['contour-fn', 'contour-constraint'] : ['contour-fn']);
            expect((current.actions ?? []).map(entry => entry.id)).toEqual(actions);
            for (const entry of current.actions ?? []) expect(entry.placement).toBe(entry.id === 'numeric' ? 'board' : 'tools');
            const numeric = (current.actions ?? []).find(entry => entry.id === 'numeric');
            if (numeric) expect(numeric.pressed).toBe(state.numeric === true);

            // the legend card names what is drawn now
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);
            for (const entry of current.legend ?? []) {
                expect(graph.drawnObject(entry.object)).toMatchObject({visible: true});
                expect(renderMessage(entry.label)).toBe(graph.legend().find(candidate => candidate.id === entry.id)!.text);
            }
            expect(graph.drawnObject('nothing')).toBeUndefined();

            // the declared rows are the panel's rows, with the values of the model
            const rows = current.readouts![0].rows;
            expect(rows.map(entry => entry.id)).toEqual(graph.readoutRows().map(entry => entry.id));
            expect(graph.readoutRows().find(entry => entry.id === row)?.value).toBe(value);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(status);
            expect(graph.statusText()).toBe(status);
            view.unmount();
        });
    }

    test('the level puck writes, reads back and refuses a value off the grid', () => {
        const {graph, view} = setup({});
        act(() => { graph.parameters!.write('contour-level', 2, 'learner'); });
        expect(graph.parameters!.read('contour-level')).toBe(2);
        expect(graph.parameters!.write('contour-level', 1000, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.read('contour-level')).toBe(2);
        act(() => { graph.parameters!.write('contour-mode', 'gradient', 'learner'); });
        expect(graph.state.mode).toBe('gradient');
        expect(graph.parameters!.write('contour-mode', 'nothing', 'learner').status).not.toBe('applied');
        act(() => graph.performAction('numeric'));
        expect(graph.state.numeric).toBe(true);
        view.unmount();
    });
});
