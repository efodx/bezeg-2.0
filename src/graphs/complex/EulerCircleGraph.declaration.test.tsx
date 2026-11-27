import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {EulerCircleGraph, type EulerCircleIds} from './EulerCircleGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends EulerCircleGraph {
    rows() { return this.readoutRows(); }
    statusLine() { return document.querySelector('[data-euler-status]')?.textContent ?? ''; }
}

const FRESH = {degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45};

function setup(state: Record<string, unknown>) {
    const graph = new ObservedGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => graph.setState({...FRESH, ...state} as never)));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<EulerCircleIds>};
}

const BASE = ['unit', 'projections', 'point'];
const states: {name: string; state: Record<string, unknown>; params: string[]; legend: string[]; row: string; value: string; note: string[]}[] = [
    {name: 'default', state: {}, params: ['euler-angle', 'euler-omega', 'euler-degree'], legend: [...BASE, 'velocity', 'sum'], row: 'omega', value: '2', note: ['status']},
    {name: '45 degrees, velocity off', state: {degrees: 45, omega: 1, velocity: false}, params: ['euler-angle', 'euler-omega', 'euler-degree'], legend: [...BASE, 'sum'],
        row: 'angle', value: '45°, π/4 ≈ 0,785 rad', note: ['status']},
    {name: '100 degrees, computed', state: {degrees: 100, omega: 3, degree: 9}, params: ['euler-angle', 'euler-omega', 'euler-degree'], legend: [...BASE, 'velocity', 'sum'],
        row: 'cos', value: '−0,1736482', note: ['status']},
    {name: 'velocity and acceleration', state: {degrees: 90, acceleration: true}, params: ['euler-angle', 'euler-omega', 'euler-degree'],
        legend: [...BASE, 'velocity', 'acceleration', 'sum'], row: 'acceleration', value: '−4i', note: ['status']},
    {name: 'partial sum out of view', state: {degrees: 180, degree: 1, velocity: false}, params: ['euler-angle', 'euler-omega', 'euler-degree'], legend: [...BASE],
        row: 'out', value: 'ne, zunaj pogleda in ni narisana', note: ['status']},
    {name: 'product', state: {mode: 'product'}, params: ['euler-angle', 'euler-omega', 'euler-degree', 'euler-b'], legend: [...BASE, 'velocity', 'sum', 'second', 'product', 'radii'],
        row: 'sum-angle', value: '30° + 45° = 75°', note: ['status']},
    {name: 'product reduced', state: {mode: 'product', degrees: 250, b: 200, acceleration: true, omega: 4}, params: ['euler-angle', 'euler-omega', 'euler-degree', 'euler-b'],
        legend: [...BASE, 'velocity', 'acceleration', 'second', 'product', 'radii'], row: 'sum-angle', value: '250° + 200° = 450°, brez 360° je 90°', note: ['status']},
    {name: 'full turn', state: {degrees: 360, degree: 30, omega: 1}, params: ['euler-angle', 'euler-omega', 'euler-degree'], legend: [...BASE, 'velocity', 'sum'], row: 'time', value: '2π ≈ 6,283', note: ['status']},
];

describe('Euler circle declaration', () => {
    for (const {name, state, params, legend, row, value, note} of states) {
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
            expect((current.actions ?? []).map(action => action.id)).toEqual(['show-velocity', 'show-acceleration', 'product-mode', 'next-step', 'play-pause', 'reset-run']);
            expect((current.legend ?? []).length).toBe(9);
            const visible = (current.legend ?? []).filter(entry => graph.drawnObject(entry.id)?.visible).map(entry => entry.id);
            expect(visible.sort()).toEqual([...legend].sort());
            expect(current.readouts![0].rows.map(entry => entry.id)).toEqual(graph.rows().map(entry => entry.id));
            const shown = graph.rows().find(entry => entry.id === row);
            expect(shown?.value).toBe(value);
            expect(current.notes!.map(entry => entry.id)).toEqual(note);
            expect(renderMessage(current.notes!.find(entry => entry.id === 'status')!.text)).toBe(graph.statusLine());
            expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the switch pucks report the state and flip it as the learner', () => {
        const {graph, declaration, view} = setup({});
        const pressed = (id: string) => declaration().actions!.find(action => action.id === id)!.pressed;
        expect([pressed('show-velocity'), pressed('show-acceleration'), pressed('product-mode')]).toEqual([true, false, false]);
        act(() => graph.performAction('show-velocity'));
        act(() => graph.performAction('show-acceleration'));
        act(() => graph.performAction('product-mode'));
        expect(graph.state).toMatchObject({velocity: false, acceleration: true, mode: 'product'});
        expect([pressed('show-velocity'), pressed('show-acceleration'), pressed('product-mode')]).toEqual([false, true, true]);
        view.unmount();
    });

    test('the bindings write the four values through the typed setters, read back and refuse the rest', () => {
        const {graph, view} = setup({mode: 'product'});
        expect([...graph.parameters!.keys()].filter(key => key !== 'view').sort()).toEqual(['euler-angle', 'euler-b', 'euler-degree', 'euler-omega']);
        act(() => { graph.parameters!.write('euler-angle', 100, 'learner'); });
        act(() => { graph.parameters!.write('euler-omega', 3, 'learner'); });
        act(() => { graph.parameters!.write('euler-degree', 9, 'learner'); });
        act(() => { graph.parameters!.write('euler-b', 90, 'learner'); });
        expect(graph.state).toMatchObject({degrees: 100, omega: 3, degree: 9, b: 90});
        expect(graph.parameters!.read('euler-angle')).toBe(100);
        const kept = graph.state;
        expect(graph.parameters!.write('euler-angle', 100.5, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('euler-angle', 361, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('euler-omega', 5, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('euler-degree', 0, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('euler-b', 47, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('euler-angle', '3' as never, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        view.unmount();
    });

    test('the playback actions step, play and reset as the learner and an unknown id is refused', () => {
        const {graph, view} = setup({degrees: 0});
        act(() => graph.performAction('next-step'));
        expect(graph.state.degrees).toBe(5);
        act(() => graph.performAction('reset-run'));
        expect(graph.state.degrees).toBe(0);
        act(() => graph.performAction('play-pause'));
        expect(graph.isPlaying()).toBe(true);
        act(() => graph.performAction('play-pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });
});
