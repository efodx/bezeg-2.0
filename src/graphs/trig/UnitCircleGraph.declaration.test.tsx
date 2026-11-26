import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {UnitCircleGraph, type UnitCircleIds} from './UnitCircleGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends UnitCircleGraph {
    rows() { return this.readoutRows(); }
    statusLine() { return document.querySelector('[data-unit-circle-status]')?.textContent ?? ''; }
}

const FRESH = {angle: 120, secondAngle: 0, showSymmetries: false, showCosine: false, showAddition: false};
const valueText = (value: unknown): string => (value as {kind?: string}).kind === 'formatted' ? (value as {text: string}).text : renderMessage(value as never);

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<UnitCircleIds>};
}

const states: {name: string; state: Record<string, unknown>; params: string[]; legend: string[]; row: string; value: string; pressed: string[]}[] = [
    {name: 'default', state: {}, params: ['unit-angle'], legend: [], row: 'cos', value: '1/2 ≈ 0,5', pressed: []},
    {name: 'axis', state: {angle: 0}, params: ['unit-angle'], legend: [], row: 'position', value: 'na osi', pressed: []},
    {name: 'cosine', state: {angle: 180, showCosine: true}, params: ['unit-angle'], legend: [], row: 'signs', value: 'cos θ = 0, sin θ > 0', pressed: ['cosine']},
    {name: 'not special', state: {angle: 75}, params: ['unit-angle'], legend: [], row: 'sin', value: '≈ 0,6087614', pressed: []},
    {name: 'symmetries', state: {angle: 600, showSymmetries: true}, params: ['unit-angle'], legend: ['symmetry-x', 'symmetry-y', 'symmetry-origin'], row: 'symmetry-origin', value: '(−0,5; 0,8660254)', pressed: ['symmetries']},
    {name: 'addition', state: {angle: 120, secondAngle: 90, showAddition: true}, params: ['unit-angle', 'unit-second-angle'], legend: ['second-radius'], row: 'sum-angle', value: '105°', pressed: ['addition']},
    {name: 'everything', state: {angle: 210, secondAngle: 330, showAddition: true, showSymmetries: true, showCosine: true}, params: ['unit-angle', 'unit-second-angle'], legend: ['symmetry-x', 'symmetry-y', 'symmetry-origin', 'second-radius'], row: 'sum-angle', value: '270°', pressed: ['addition', 'cosine', 'symmetries']},
];

describe('Unit circle declaration', () => {
    for (const {name, state, params, legend, row, value, pressed} of states) {
        test(`${name}: consistent, the pucks, the legend, the rows and the notes`, () => {
            const {graph, declaration, view} = setup(state);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(params);
            for (const entry of current.parameters ?? []) {
                expect(graph.parameters!.keys()).toContain(entry.key);
                expect(renderMessage(entry.label).length).toBeLessThanOrEqual(16);
            }
            for (const action of current.actions ?? []) expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);
            expect((current.actions ?? []).filter(action => action.pressed).map(action => action.id).sort()).toEqual(pressed);
            expect((current.legend ?? []).map(entry => entry.id)).toEqual(legend);
            for (const entry of current.legend ?? []) expect(graph.drawnObject(entry.id)?.visible).toBe(true);

            expect(current.readouts![0].rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            if (name === 'everything') expect(graph.rows().length).toBe(10);
            expect(valueText(graph.rows().find(entry => entry.id === row)?.value)).toBe(value);
            expect(renderMessage(current.notes!.find(note => note.id === 'status')!.text)).toBe(graph.statusLine());
            expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the legend entries that are off are hidden, not absent from the board', () => {
        const {graph, view} = setup({});
        for (const id of ['symmetry-x', 'symmetry-y', 'symmetry-origin', 'second-radius']) expect(graph.drawnObject(id)?.visible).toBe(false);
        expect(graph.drawnObject('no-such-entry')).toBeUndefined();
        view.unmount();
    });

    test('the bindings write degrees on the half-degree grid, read back and refuse the rest', () => {
        const {graph, view} = setup({});
        expect([...graph.parameters!.keys()].filter(key => key !== 'view').sort()).toEqual(['unit-angle', 'unit-second-angle']);
        act(() => { graph.parameters!.write('unit-angle', 37.5, 'learner'); });
        expect(graph.state.angle).toBe(75);
        expect(graph.parameters!.read('unit-angle')).toBe(37.5);
        act(() => { graph.parameters!.write('unit-second-angle', 359.5, 'learner'); });
        expect(graph.state.secondAngle).toBe(719);
        const kept = graph.state;
        for (const bad of [Number.NaN, '30']) {
            expect(graph.parameters!.write('unit-angle', bad as never, 'learner').status).not.toBe('applied');
        }
        expect(graph.state).toBe(kept);
        // like the old exact field: wrapped modulo 360 degrees, then snapped to the half-degree grid
        for (const [typed, halves] of [[400, 80], [360, 0], [-30, 660], [10.3, 21]] as const) {
            act(() => { graph.parameters!.write('unit-angle', typed, 'learner'); });
            expect(graph.state.angle).toBe(halves);
        }
        view.unmount();
    });

    test('a board action flips its switch as the learner and an unknown id is refused', () => {
        const {graph, view} = setup({});
        act(() => graph.performAction('cosine'));
        expect(graph.state.showCosine).toBe(true);
        act(() => graph.performAction('addition'));
        expect(graph.state.showAddition).toBe(true);
        act(() => graph.performAction('symmetries'));
        act(() => graph.performAction('symmetries'));
        expect(graph.state.showSymmetries).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });
});
