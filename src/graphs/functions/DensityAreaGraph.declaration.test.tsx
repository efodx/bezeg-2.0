import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DensityAreaGraph} from './DensityAreaGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {formatNumber, formatSignificant} from '../../analysis/format';
import {renderMessage, setLanguage} from '../../localization';
import type {LessonAction} from '../../learning/model';
import {densityAreaView, type DensityAreaModel} from '../../analysis/densityAreaModel';
import {GraphPalette} from '../styles/GraphPalette';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** The lesson runtime's entry point is protected; the test drives it as the runtime does. */
class DrivenDensityAreaGraph extends DensityAreaGraph {
    override applyLessonAction(action: LessonAction) { return super.applyLessonAction(action); }
}

type ParameterName = 'density-mu' | 'density-sigma' | 'density-a' | 'density-b';
const parameter = (name: ParameterName, value: number): LessonAction => ({kind: 'function-parameter', name, value});
const example = (value: string): LessonAction => ({kind: 'function-choice', name: 'density-example', value});

const states: {name: string; actions: LessonAction[]; status?: RegExp}[] = [
    {name: 'default', actions: []},
    {name: 'bounds -1.5 and 0.5', actions: [parameter('density-a', -1.5), parameter('density-b', 0.5)]},
    {name: 'mu 1, sigma 1.5', actions: [parameter('density-mu', 1), parameter('density-sigma', 1.5), parameter('density-a', -0.5), parameter('density-b', 2.5)]},
    {name: 'iq example', actions: [example('iq')]},
    {name: 'far tail', actions: [parameter('density-a', 4.5), parameter('density-b', 7)]},
    {name: 'reversed a > b', actions: [parameter('density-a', 1), parameter('density-b', -1)], status: /Meja a je večja od meje b/},
    {name: 'a = b', actions: [parameter('density-a', 0.5), parameter('density-b', 0.5)], status: /a = b: nad eno samo točko/},
    {name: 'thin interval', actions: [parameter('density-a', 0), parameter('density-b', 0.01)], status: /zelo ozek/},
];

const ROWS = ['mu', 'sigma', 'a', 'b', 'area-percent', 'area', 'za', 'zb'];
const modelOf = (graph: DensityAreaGraph) => (graph as unknown as {model: DensityAreaModel}).model;

describe('Density declares its panel, four pucks and legend', () => {
    for (const {name, actions, status} of states) {
        test(`${name}: consistent, bound, rows equal the kernel, legend resolves, no caption`, () => {
            const graph = new DrivenDensityAreaGraph();
            const {view} = mountGraph(graph);
            act(() => { for (const action of actions) graph.applyLessonAction(action); });
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.parameters ?? []) expect(graph.parameters!.keys()).toContain(entry.key);
            expect(declaration.parameters?.map(entry => entry.key).sort()).toEqual(['density-a', 'density-b', 'density-mu', 'density-sigma']);
            const rows = (declaration.readouts ?? []).flatMap(group => [...group.rows]);
            expect(rows.map(row => row.id)).toEqual(ROWS);
            for (const row of rows) {
                const shown = view.container.querySelector(`[data-readout="${row.id}"] dd`)?.textContent;
                const value = row.value;
                const expected = 'kind' in value && value.kind === 'number' ? formatNumber(value.value, 'sl', value.maxDecimals)
                    : 'kind' in value && value.kind === 'formatted' ? value.text : renderMessage(value as never);
                expect(shown, row.id).toBe(expected);
            }
            // The values come from the kernel, not from the declaration under test.
            const model = modelOf(graph);
            const kernel = densityAreaView(model);
            const text = (id: string) => view.container.querySelector(`[data-readout="${id}"] dd`)?.textContent;
            expect(text('area-percent')).toBe(formatSignificant(kernel.probability * 100, 'sl', 4));
            expect(text('area')).toBe(formatSignificant(kernel.probability, 'sl', 5));
            expect(text('za')).toBe(formatNumber(kernel.za, 'sl', 3));
            expect(text('zb')).toBe(formatNumber(kernel.zb, 'sl', 3));
            expect(text('mu')).toBe(formatNumber(model.mu, 'sl', 2));
            expect(text('b')).toBe(formatNumber(model.b, 'sl', 2));
            // The status is declared and shown once, in the readout panel; nothing is left on the board as a caption.
            const statuses = declaration.status ?? [];
            if (status) expect(renderMessage(statuses[0].text)).toMatch(status);
            else expect(statuses).toEqual([]);
            expect(graph.captionPlainLines()).toEqual([]);
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve', 'area']);
            for (const entry of declaration.legend ?? []) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
            expect(graph.drawnObject('area')).toEqual({color: GraphPalette.comparisonCurve, visible: true});
            expect(graph.drawnObject('curve')).toEqual({color: GraphPalette.primaryCurve, visible: true});
            expect(view.container.querySelector('.function-legend')).toBeNull();
        });
    }

    test('the marks are the density curve over the example view; the ends are not marks, so dragging one far away does not move the view', () => {
        const graph = new DrivenDensityAreaGraph();
        mountGraph(graph);
        const marks = graph.getDeclaration()!.marks!;
        expect(marks.must).toEqual([]);
        expect(marks.nice?.length).toBe(1);
        const curve = marks.nice![0];
        expect(curve.kind).toBe('polyline');
        if (curve.kind !== 'polyline') return;
        // the peak of N(0; 1) is 1/sqrt(2 pi) at x = 0
        const points = curve.points;
        expect(Math.max(...points.map(([, y]) => y))).toBeCloseTo(0.3989, 2);
        act(() => { graph.applyLessonAction(parameter('density-b', 300)); });
        expect(graph.getDeclaration()!.marks).toEqual(marks);
    });

    test('writing through the arbiter changes the model and reads back; a refused value changes nothing', () => {
        const graph = new DrivenDensityAreaGraph();
        mountGraph(graph);
        act(() => { graph.parameters!.write('density-mu', 2.5, 'learner'); });
        expect(graph.parameters!.read('density-mu')).toBe(2.5);
        expect(modelOf(graph).mu).toBe(2.5);
        act(() => { graph.parameters!.write('density-sigma', 3, 'learner'); });
        expect(modelOf(graph).sigma).toBe(3);
        act(() => { graph.parameters!.write('density-b', -4, 'learner'); });
        // a may pass b: an empty interval is a state, not a refusal
        expect(graph.parameters!.read('density-b')).toBe(-4);
        act(() => { graph.parameters!.write('density-a', 2, 'learner'); });
        expect(graph.parameters!.read('density-a')).toBe(2);
        // out of range: refused, the model keeps its value
        act(() => { graph.parameters!.write('density-sigma', 0, 'learner'); });
        expect(graph.parameters!.read('density-sigma')).toBe(3);
        act(() => { graph.parameters!.write('density-a', 401, 'learner'); });
        expect(graph.parameters!.read('density-a')).toBe(2);
    });
});
