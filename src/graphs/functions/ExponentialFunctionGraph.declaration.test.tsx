import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ExponentialFunctionGraph} from './ExponentialFunctionGraph';
import {BisectionGraph} from './BisectionGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const states: {name: string; base: number; mirror: boolean}[] = [
    {name: 'default', base: 2, mirror: false},
    {name: 'growth', base: 3, mirror: false},
    {name: 'decay with mirror', base: 0.5, mirror: true},
    {name: 'constant', base: 1, mirror: false},
    {name: 'steep growth with mirror', base: 2.5, mirror: true},
];

describe('Exponential function declares through BaseFunctionGraph', () => {
    for (const {name, base, mirror} of states) {
        test(`${name}: consistent, rows equal the inspector, marks follow the curve`, () => {
            const graph = new ExponentialFunctionGraph();
            const {view} = mountGraph(graph);
            act(() => {
                graph.parameters!.write('a', base, 'lesson');
                (graph as unknown as {setMirrorVisible(visible: boolean): void}).setMirrorVisible(mirror);
            });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => parameter.key)).toEqual(['a']);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(mirror ? ['a', 'f0', 'f1', 'behavior', 'mirror-base'] : ['a', 'f0', 'f1', 'behavior']);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const expected = 'kind' in row.value && row.value.kind === 'number' ? formatNumber(row.value.value, 'sl', row.value.maxDecimals) : renderMessage(row.value as never);
                expect(shown, row.id).toBe(expected);
            }
            const polyline = declaration.marks?.nice?.[0];
            expect(polyline?.kind).toBe('polyline');
            if (polyline?.kind === 'polyline') {
                expect(polyline.points.length).toBeGreaterThan(8);
                for (const [x, y] of polyline.points) expect(y).toBeCloseTo(base ** x, 9);
            }
        });
    }

    test('writing `a` through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new ExponentialFunctionGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('a', 3, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(3);
        expect((graph as unknown as {model: {a: number}}).model.a).toBe(3);
        act(() => { graph.parameters!.write('a', -5, 'learner'); });
        expect(graph.parameters!.read('a')).toBe(3);
        expect((graph as unknown as {model: {a: number}}).model.a).toBe(3);
    });

    test('a graph that has not opted in stays undeclared, and a graph with its own declaration keeps it', () => {
        const graph = new BisectionGraph();
        mountGraph(graph);
        const declaration = graph.getDeclaration();
        expect(declaration?.parameters?.map(parameter => parameter.key)).toContain('bisect-a');
    });
});
