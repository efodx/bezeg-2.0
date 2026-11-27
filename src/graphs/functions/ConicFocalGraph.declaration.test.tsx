import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {ConicFocalGraph} from './ConicFocalGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import {runAs} from '../base/writes/writeSource';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Setters = {setExample(value: string): void; setEpsilon(value: number): void; setEll(value: number): void; setPhi(value: number): void; setWeight(value: number | null): void; setBridge(value: boolean): void};
const LEGEND = ['conic', 'directrix', 'pf', 'pd', 'bridge', 'focus'];
const states: {name: string; edit: (g: Setters) => void; rows: string[]; params: string[]; visible: Record<string, boolean>}[] = [
    {name: 'default ellipse', edit: () => undefined, rows: ['kind', 'pf', 'pd', 'ratio', 'pf2', 'sum'], params: ['conic-epsilon'],
        visible: {conic: true, directrix: true, pf: true, pd: true, bridge: false, focus: true}},
    {name: 'parabola', edit: g => g.setExample('parabola'), rows: ['kind', 'pf', 'pd', 'ratio'], params: ['conic-epsilon'],
        visible: {conic: true, directrix: true, pf: true, pd: true, bridge: false, focus: true}},
    {name: 'hyperbola', edit: g => g.setExample('hyperbola'), rows: ['kind', 'pf', 'pd', 'ratio', 'pf2', 'difference'], params: ['conic-epsilon'],
        visible: {conic: true, directrix: true, pf: true, pd: true, bridge: false, focus: true}},
    {name: 'circle (no directrix)', edit: g => g.setExample('circle'), rows: ['kind', 'pf', 'pd', 'ratio'], params: ['conic-epsilon'],
        visible: {conic: true, directrix: false, pf: true, pd: false, bridge: false, focus: true}},
    {name: 'ellipse with the arc, matched weight', edit: g => g.setExample('bridge'),
        rows: ['kind', 'pf', 'pd', 'ratio', 'pf2', 'sum', 'weight', 'matched-weight', 'weight-kind', 'deviation'], params: ['conic-epsilon', 'conic-weight'],
        visible: {conic: true, directrix: true, pf: true, pd: true, bridge: true, focus: true}},
    {name: 'arc with weight 1', edit: g => { g.setBridge(true); g.setWeight(1); },
        rows: ['kind', 'pf', 'pd', 'ratio', 'pf2', 'sum', 'weight', 'matched-weight', 'weight-kind', 'deviation'], params: ['conic-epsilon', 'conic-weight'],
        visible: {conic: true, directrix: true, pf: true, pd: true, bridge: true, focus: true}},
    {name: 'custom epsilon 0.5, l 2, phi 1', edit: g => { g.setEpsilon(0.5); g.setEll(2); g.setPhi(1); }, rows: ['kind', 'pf', 'pd', 'ratio', 'pf2', 'sum'], params: ['conic-epsilon'],
        visible: {conic: true, directrix: true, pf: true, pd: true, bridge: false, focus: true}},
];

describe('Conic focal declares through BaseFunctionGraph', () => {
    for (const {name, edit, rows: expectedRows, params, visible} of states) {
        test(`${name}: consistent, rows equal the inspector, legend and pucks follow the scene`, () => {
            const graph = new ConicFocalGraph();
            const {view} = mountGraph(graph);
            act(() => { runAs('learner', () => edit(graph as unknown as Setters)); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const parameter of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(parameter.key);
            expect(declaration.parameters?.map(parameter => [parameter.key, parameter.kind, parameter.placement])).toEqual(params.map(key => [key, 'range', 'board']));
            expect(declaration.actions?.map(action => [action.id, action.placement])).toEqual([['matched-weight', 'tools']]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(LEGEND);
            for (const entry of declaration.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(visible[entry.id]);
            }
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(expectedRows);
            for (const row of rows) {
                const text = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(text, row.id).toBe(expected);
            }
            expect(declaration.notes?.map(note => note.id)).toEqual(['definition']);
            expect(declaration.status?.length).toBe(model(graph).bridge ? 2 : 1);
            expect(declaration.marks?.must.length).toBeGreaterThanOrEqual(1);
            expect(graph.getDeclaration()?.marks).toBe(declaration.marks);
        });
    }

    const model = (graph: ConicFocalGraph) => (graph as unknown as {model: {bridge: boolean}}).model;

    test('the marks keep the focus and the conic in sight and do not move with P', () => {
        const graph = new ConicFocalGraph();
        mountGraph(graph);
        const marks = graph.getDeclaration()!.marks!;
        expect(marks.must).toContainEqual({kind: 'point', x: 4, y: 0});
        const second = marks.must[1];
        expect(second.kind === 'point' && Math.abs(second.x + 4) < 1e-9 && Math.abs(second.y) < 1e-9).toBe(true);
        expect(marks.nice?.some(mark => mark.kind === 'polyline' && mark.points.length > 10)).toBe(true);
        act(() => { runAs('learner', () => (graph as unknown as Setters).setPhi(1)); });
        expect(graph.getDeclaration()!.marks).toBe(marks);
        act(() => { runAs('learner', () => (graph as unknown as Setters).setEpsilon(0.5)); });
        expect(graph.getDeclaration()!.marks).not.toBe(marks);
    });

    test('a write through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new ConicFocalGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('conic-epsilon', 1, 'learner'); });
        expect(graph.parameters!.read('conic-epsilon')).toBe(1);
        act(() => { graph.parameters!.write('conic-epsilon', 3, 'learner'); });
        expect(graph.parameters!.read('conic-epsilon')).toBe(1);
        act(() => { (graph as unknown as Setters).setBridge(true); });
        act(() => { graph.parameters!.write('conic-weight', 2, 'learner'); });
        expect(graph.parameters!.read('conic-weight')).toBe(2);
        act(() => { graph.parameters!.write('conic-weight', 9, 'learner'); });
        expect(graph.parameters!.read('conic-weight')).toBe(2);
    });

    test('the matched-weight action returns the arc to the conic and is enabled only with a moved weight', () => {
        const graph = new ConicFocalGraph();
        mountGraph(graph);
        const enabled = () => graph.getDeclaration()!.actions![0].enabled;
        expect(enabled()).toBe(false);
        act(() => { runAs('learner', () => { (graph as unknown as Setters).setBridge(true); (graph as unknown as Setters).setWeight(1); }); });
        expect(enabled()).toBe(true);
        act(() => { graph.performAction('matched-weight'); });
        expect(enabled()).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow();
    });

    test('the legend names, the pucks and the readout rows follow the language', () => {
        const graph = new ConicFocalGraph();
        mountGraph(graph);
        expect(renderMessage(graph.getDeclaration()!.parameters![0].label)).toBe('Ekscentričnost');
        act(() => { setLanguage('en'); });
        expect(renderMessage(graph.getDeclaration()!.parameters![0].label)).toBe('Eccentricity');
        expect(renderMessage(graph.getDeclaration()!.readouts![0].rows[0].name!)).toBe('Conic');
    });
});
