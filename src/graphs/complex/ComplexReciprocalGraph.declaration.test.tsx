import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ComplexReciprocalGraph, type ComplexReciprocalIds} from './ComplexReciprocalGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Recip = {setExample(id: string): void; setOperand(which: 'z' | 'w', re: number, im: number): void; setCentre(re: number, im: number): void;
    setRadius(value: number): void; setReciprocalVisible(v: boolean): void; setQuotientVisible(v: boolean): void; setCircleVisible(v: boolean): void};

function setup(example: string, change: (graph: Recip) => void = () => undefined) {
    const graph = new ComplexReciprocalGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => { const g = graph as unknown as Recip; g.setExample(example); change(g); }));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<ComplexReciprocalIds>};
}

/** The text of one readout row of the inspector (label then value), which the declared rows must equal. */
const rowText = (container: HTMLElement, id: string) => container.querySelector(`[data-readout="${id}"]`)?.textContent ?? 'missing';

const states: {name: string; example: string; change?: (g: Recip) => void; params: string[]; legend: string[]; status: string[]; row: string; value: string}[] = [
    {name: 'default, reciprocal hidden', example: 'outside', params: [], legend: ['z', 'w', 'unit-circle', 'conjugate'], status: ['predict'],
        row: 'reciprocal', value: 'Obratna vrednost 1/zskrito'},
    {name: 'reciprocal shown, outside', example: 'outside', change: g => g.setReciprocalVisible(true), params: [], legend: ['z', 'w', 'unit-circle', 'conjugate', 'reciprocal'],
        status: ['outside'], row: 'reciprocal', value: 'Obratna vrednost 1/z0,5 − 0,5i'},
    {name: 'inside the circle', example: 'inside', change: g => g.setReciprocalVisible(true), params: [], legend: ['z', 'w', 'unit-circle', 'conjugate', 'reciprocal'],
        status: ['inside'], row: 'position', value: 'Lega točke z glede na enotsko krožnicoznotraj (|z| < 1)'},
    {name: 'on the circle', example: 'unit-circle', change: g => g.setReciprocalVisible(true), params: [], legend: ['z', 'w', 'unit-circle', 'conjugate', 'reciprocal'],
        status: ['on-circle'], row: 'reciprocal-modulus', value: 'Modul |1/z|1'},
    {name: 'division', example: 'division', change: g => { g.setReciprocalVisible(true); g.setQuotientVisible(true); },
        params: [], legend: ['z', 'w', 'unit-circle', 'conjugate', 'reciprocal', 'quotient'], status: ['outside'], row: 'quotient', value: 'Količnik w/z0,5 + 1,5i'},
    {name: 'inversion circle, moved', example: 'outside', change: g => { g.setCircleVisible(true); g.setCentre(0.5, 0); g.setRadius(1); g.setOperand('z', 1.5, 1); },
        params: ['complex-radius'], legend: ['z', 'w', 'unit-circle', 'conjugate', 'inversion'], status: ['predict'], row: 'inversion', value: 'Inverzija z\' točke z v krožnici1 + 0,5i'},
    {name: 'z at the origin, everything shown', example: 'zero', change: g => { g.setReciprocalVisible(true); g.setQuotientVisible(true); g.setCircleVisible(true); },
        params: ['complex-radius'], legend: ['w', 'unit-circle', 'conjugate', 'inversion'], status: ['z-zero'], row: 'reciprocal', value: 'Obratna vrednost 1/zni definiran'},
    {name: 'z at the centre of the circle', example: 'outside', change: g => { g.setCircleVisible(true); g.setCentre(1, 1); g.setRadius(0.5); },
        params: ['complex-radius'], legend: ['z', 'w', 'unit-circle', 'conjugate', 'inversion'], status: ['predict', 'centre-pole'], row: 'inversion', value: 'Inverzija z\' točke z v krožnicini definiran'},
];

describe('Reciprocal declaration', () => {
    for (const {name, example, change, params, legend, status, row, value} of states) {
        test(`${name}: consistent, the radius puck, the legend, the status and a row`, () => {
            const {graph, declaration, view} = setup(example, change);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(params);
            for (const entry of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect((current.actions ?? []).map(action => action.id)).toEqual(['reciprocal', 'quotient', 'circle']);
            for (const action of current.actions ?? []) expect(renderMessage(action.label).length).toBeLessThanOrEqual(16);
            const visible = (current.legend ?? []).filter(entry => graph.drawnObject(entry.id)?.visible).map(entry => entry.id);
            expect(visible.sort()).toEqual([...legend].sort());
            expect((current.legend ?? []).map(entry => entry.id).sort()).toEqual([...legend].sort());
            expect((current.status ?? []).map(line => line.id)).toEqual(status);
            expect(rowText(view.container, row)).toBe(value);
            expect(current.marks!.must!.length).toBeGreaterThan(0);
            view.unmount();
        });
    }

    test('the switch pucks report the state and flip it as the learner', () => {
        const {graph, declaration, view} = setup('outside');
        const pressed = (id: string) => declaration().actions!.find(action => action.id === id)!.pressed;
        expect([pressed('reciprocal'), pressed('quotient'), pressed('circle')]).toEqual([false, false, false]);
        act(() => graph.performAction('reciprocal'));
        act(() => graph.performAction('quotient'));
        act(() => graph.performAction('circle'));
        expect([pressed('reciprocal'), pressed('quotient'), pressed('circle')]).toEqual([true, true, true]);
        act(() => graph.performAction('reciprocal'));
        expect(pressed('reciprocal')).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test('the radius is bound, written through the typed setter and refused when off the grid', () => {
        const {graph, view} = setup('outside', g => g.setCircleVisible(true));
        expect([...graph.parameters!.keys()].filter(key => key !== 'view')).toEqual(['complex-radius']);
        act(() => { graph.parameters!.write('complex-radius', 1.5, 'learner'); });
        expect(graph.parameters!.read('complex-radius')).toBe(1.5);
        const kept = graph.state;
        expect(graph.parameters!.write('complex-radius', 3, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('complex-radius', 1.234, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        view.unmount();
    });
});
