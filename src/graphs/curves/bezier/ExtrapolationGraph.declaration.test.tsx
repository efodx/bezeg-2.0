import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import ExtrapolationGraph from './ExtrapolationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {runAs} from '../../base/writes/writeSource';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {
    drawnObject(id: string): {color: string; visible: boolean} | undefined;
    parameterBindings(): Record<string, {read(): number; apply(value: unknown): void}>;
    extrapolate(): void;
};

const mount = () => {
    const graph = new ExtrapolationGraph();
    mountGraph(graph);
    return {graph, probe: graph as unknown as Probe};
};
const declared = (graph: ExtrapolationGraph) => graph.getDeclaration() as GraphDeclaration;
const actions = (graph: ExtrapolationGraph) => new Map((declared(graph).actions ?? []).map(action => [action.id as string, action]));
const setT = (probe: Probe, value: number) => act(() => runAs('learner', () => probe.parameterBindings()['extrapolation-t'].apply(value)));
const lastPolylinePoint = (graph: ExtrapolationGraph) => {
    const lines = (declared(graph).marks?.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : []);
    return lines[lines.length - 1].at(-1)!;
};

describe('Extrapolation declares through the curve workspace', () => {
    test('the declaration is consistent and every legend entry resolves to a drawn object', () => {
        const {graph, probe} = mount();
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'extension', 'extrapolation-point']);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
        expect(probe.drawnObject('extension')).toMatchObject({visible: true});
        expect(probe.drawnObject('extrapolation-point')).toMatchObject({visible: true});
    });

    test('the extension entry is not drawn at t = 1', () => {
        const {probe} = mount();
        setT(probe, 1);
        expect(probe.drawnObject('extension')).toMatchObject({visible: false});
    });

    test('the extrapolation parameter is a board puck; the Extrapolate control and the switches stay in Orodja', () => {
        const {graph} = mount();
        expect(declared(graph).parameters).toEqual([expect.objectContaining({key: 'extrapolation-t', kind: 'range', placement: 'board', symbol: 't', min: 1, max: 1.5})]);
        expect(actions(graph).get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions(graph).get('point-labels')).toMatchObject({placement: 'tools'});
    });

    test('the puck writes the parameter, refuses values outside 1..1.5 and the arc follows', () => {
        const {graph, probe} = mount();
        const binding = probe.parameterBindings()['extrapolation-t'];
        expect(binding.read()).toBe(1.2);
        setT(probe, 1.4);
        expect(graph.getFirstJxgCurve().getExtrapolationT()).toBe(1.4);
        expect(binding.read()).toBe(1.4);
        expect(() => binding.apply(1.6)).toThrow('Parameter ekstrapolacije mora biti');
        expect(() => binding.apply(0.9)).toThrow();
        expect(graph.getFirstJxgCurve().getExtrapolationT()).toBe(1.4);
    });

    test('the marks follow the control points, the point beyond the curve and the end of the extended arc', () => {
        const {graph, probe} = mount();
        // B(6/5) of the default curve is about (3.06, -3.87) (lesson worked example).
        expect(declared(graph).marks?.must).toHaveLength(5);
        expect(lastPolylinePoint(graph)[0]).toBeCloseTo(3.06, 2);
        expect(lastPolylinePoint(graph)[1]).toBeCloseTo(-3.87, 2);
        setT(probe, 1.5);
        expect(lastPolylinePoint(graph)[1]).toBeCloseTo(-9.875, 3);
    });

    test('the view follows a box that reaches the largest extension and does not move with the puck', () => {
        const {graph, probe} = mount();
        const box = declared(graph).followView!;
        // The arc at t = 3/2 ends at y = -9.88; the box has room below it.
        expect(box[3]).toBeLessThan(-9.88);
        setT(probe, 1.5);
        expect(declared(graph).followView).toEqual(box);
    });
});
