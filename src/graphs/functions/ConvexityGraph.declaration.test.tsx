import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ConvexityGraph} from './ConvexityGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Writes = Record<string, number>;
const states: {name: string; writes: Writes; shown: boolean; status: string; example?: string; ring: boolean}[] = [
    {name: "default (f'' hidden)", writes: {}, shown: false, status: 'hidden', ring: false},
    {name: "f'' shown", writes: {}, shown: true, status: 'revealed', ring: false},
    {name: 'cube hidden', writes: {}, example: 'cube', shown: false, status: 'hidden', ring: false},
    {name: 'cube shown (sign changes)', writes: {}, example: 'cube', shown: true, status: 'no-claim', ring: true},
    {name: 'cube on [0, 2]', writes: {'convexity-a': 0, 'convexity-b': 2}, example: 'cube', shown: true, status: 'revealed', ring: true},
    {name: 't outside [a, b]', writes: {'convexity-t': -1.8}, shown: true, status: 'tangent-outside', ring: false},
    {name: 'quartic (flat zero)', writes: {}, example: 'quartic', shown: true, status: 'zero-without-change', ring: false},
];

describe('Convexity declares through BaseFunctionGraph', () => {
    for (const {name, writes, shown, example, status, ring} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new ConvexityGraph();
            const {view} = mountGraph(graph);
            act(() => {
                if (example) runAs('learner', () => (graph as unknown as {setExample(value: string): void}).setExample(example));
                for (const [key, value] of Object.entries(writes)) graph.parameters!.write(key, value, 'lesson');
                if (shown) graph.performAction('show-second-derivative');
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.placement])).toEqual([['convexity-a', 'board'], ['convexity-b', 'board'], ['convexity-t', 'board']]);
            expect(declaration.actions?.map(action => [action.id, action.pressed, action.puck])).toEqual([['show-second-derivative', shown, true]]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(ring ? ['function', 'chord', 'tangent', 'inflection'] : ['function', 'chord', 'tangent']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toMatchObject({visible: true});
            expect(graph.drawnObject('inflection')?.visible).toBe(ring);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(['a', 'b', 't', 'chord', 'tangent', 'second-derivative-sign', 'verdict', 'tangent-verdict', 'inflection']);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.status?.map(line => line.id)).toContain(status);
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(6);
            expect(declaration.marks?.nice?.length).toBe(3);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    test('the readout says hidden before the reveal and gives the verdict and the sign after it', () => {
        const graph = new ConvexityGraph();
        mountGraph(graph);
        const rowText = (id: string) => {
            const value = Object.fromEntries((graph.getDeclaration()!.readouts ?? []).flatMap(group => [...group.rows]).map(row => [row.id, row.value]))[id];
            return 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
        };
        expect(rowText('verdict')).toBe('skrito');
        expect(rowText('chord')).toBe('y = 0,5x + 1,5');
        act(() => { graph.performAction('show-second-derivative'); });
        expect(rowText('verdict')).toBe('konveksna na [a, b]: graf leži na tetivi ali pod njo');
        expect(rowText('second-derivative-sign')).toBe('f″ ≥ 0 na [a, b]');
    });

    test('the sign marks are declared as view marks (top row of the example view) only once f\'\' is shown, so the director keeps them clear of the cards', () => {
        const graph = new ConvexityGraph();
        mountGraph(graph);
        const signRow = () => {
            const [, top, , bottom] = (graph as unknown as {defaultBoundingBox(): number[]}).defaultBoundingBox();
            const y = top - 0.07 * (top - bottom);
            return graph.getDeclaration()!.marks!.must.filter(mark => mark.kind === 'point' && Math.abs(mark.y - y) < 1e-9);
        };
        act(() => { runAs('learner', () => (graph as unknown as {setExample(value: string): void}).setExample('cube')); });
        expect(signRow()).toHaveLength(0);
        act(() => { graph.performAction('show-second-derivative'); });
        // cube: f'' = 6x changes sign at 0: "−" on the left, "+" on the right, "0" at the zero; the pieces across the axis name both places
        const xs = signRow().map(mark => (mark as {x: number}).x);
        expect(xs.length).toBeGreaterThanOrEqual(3);
        expect(xs.some(x => x < 0)).toBe(true);
        expect(xs.some(x => x > 0)).toBe(true);
        expect(xs).toContain(0);
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new ConvexityGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('convexity-t', 1.25, 'learner'); });
        expect(graph.parameters!.read('convexity-t')).toBe(1.25);
        act(() => { graph.parameters!.write('convexity-b', -2, 'learner'); }); // would break a < b
        expect(graph.parameters!.read('convexity-b')).toBe(1.5);
        act(() => { graph.parameters!.write('convexity-a', 1.9, 'learner'); }); // a would pass b
        expect(graph.parameters!.read('convexity-a')).toBe(-1);
    });
});
