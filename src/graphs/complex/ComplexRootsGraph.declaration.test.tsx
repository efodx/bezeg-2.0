import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ComplexRootsGraph, type ComplexRootsIds} from './ComplexRootsGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Roots = {setExample(id: string): void; setW(re: number, im: number): void; setTest(re: number, im: number): void; setDegree(n: number): void;
    setRootsVisible(v: boolean): void; setPolygonVisible(v: boolean): void; setTestVisible(v: boolean): void};

function setup(example: string, change: (graph: Roots) => void = () => undefined) {
    const graph = new ComplexRootsGraph();
    const {view} = mountGraph(graph);
    act(() => runAs('learner', () => { const g = graph as unknown as Roots; g.setExample(example); change(g); }));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<ComplexRootsIds>};
}

/** The text of one readout row of the inspector (label then value), which the declared rows must equal. */
const rowText = (container: HTMLElement, id: string) => container.querySelector(`[data-readout="${id}"]`)?.textContent ?? 'missing';

const states: {name: string; example: string; change?: (g: Roots) => void; legend: string[]; status: string[]; row: string; value: string}[] = [
    {name: 'default, roots hidden', example: 'two-i', legend: ['w'], status: ['predict'], row: 'roots', value: 'Koreni enačbe z^n = wskrito'},
    {name: 'roots shown', example: 'two-i', change: g => g.setRootsVisible(true), legend: ['w', 'roots'], status: [], row: 'root-1', value: 'Koren z₁−1,0911 + 0,63i; |z| = 1,2599, arg z = 5π/6 ≈ 2,618'},
    {name: 'polygon shown', example: 'two-i', change: g => { g.setRootsVisible(true); g.setPolygonVisible(true); }, legend: ['w', 'roots', 'polygon'], status: [],
        row: 'radius', value: 'Polmer n-kotnika |w|^(1/n)1,2599'},
    {name: 'test point on a root', example: 'two-i', change: g => { g.setRootsVisible(true); g.setTestVisible(true); g.setTest(1.1, 0.65); }, legend: ['w', 'roots', 'test'],
        status: ['test-fails'], row: 'test-gap', value: 'Razdalja |z^n − w|0,1059'},
    {name: 'test point shown, hidden roots', example: 'one-plus-i', change: g => { g.setTestVisible(true); g.setTest(1, 0.5); }, legend: ['w', 'test'],
        status: ['predict', 'test-fails'], row: 'test-power', value: 'Potenca z^n0,25 + 1,375i'},
    {name: 'w on the negative axis', example: 'negative-real', change: g => { g.setDegree(3); g.setRootsVisible(true); g.setPolygonVisible(true); }, legend: ['w', 'roots', 'polygon'],
        status: ['on-cut'], row: 'w-argument', value: 'Argument arg wπ ≈ 3,142'},
    {name: 'roots of unity, n 6', example: 'unity', change: g => { g.setDegree(6); g.setRootsVisible(true); g.setPolygonVisible(true); }, legend: ['w', 'roots', 'polygon'],
        status: [], row: 'root-5', value: 'Koren z₅0,5 − 0,866i; |z| = 1, arg z = −π/3 ≈ −1,047'},
    {name: 'w at the origin, everything shown', example: 'zero', change: g => { g.setRootsVisible(true); g.setPolygonVisible(true); g.setTestVisible(true); }, legend: ['roots', 'test'],
        status: ['zero', 'test-fails'], row: 'root-0', value: 'Koren z₀0, večkratnost 3'},
];

describe('Roots declaration', () => {
    for (const {name, example, change, legend, status, row, value} of states) {
        test(`${name}: consistent, the degree puck, the legend, the status and a row`, () => {
            const {graph, declaration, view} = setup(example, change);
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect((current.parameters ?? []).map(entry => entry.key)).toEqual(['n']);
            for (const entry of current.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect((current.actions ?? []).map(action => action.id)).toEqual(['roots', 'polygon', 'test']);
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
        const {graph, declaration, view} = setup('two-i');
        const pressed = (id: string) => declaration().actions!.find(action => action.id === id)!.pressed;
        expect([pressed('roots'), pressed('polygon'), pressed('test')]).toEqual([false, false, false]);
        act(() => graph.performAction('roots'));
        act(() => graph.performAction('polygon'));
        act(() => graph.performAction('test'));
        expect([pressed('roots'), pressed('polygon'), pressed('test')]).toEqual([true, true, true]);
        act(() => graph.performAction('roots'));
        expect(pressed('roots')).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test('the degree is bound, written through the typed setter and refused outside 2 to 8', () => {
        const {graph, view} = setup('two-i');
        expect([...graph.parameters!.keys()].filter(key => key !== 'view')).toEqual(['n']);
        act(() => { graph.parameters!.write('n', 5, 'learner'); });
        expect(graph.parameters!.read('n')).toBe(5);
        const kept = graph.state;
        expect(graph.parameters!.write('n', 9, 'learner').status).not.toBe('applied');
        expect(graph.parameters!.write('n', 2.5, 'learner').status).not.toBe('applied');
        expect(graph.state).toBe(kept);
        view.unmount();
    });
});
