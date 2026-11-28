import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import RationalExtrapolationGraph from './RationalExtrapolationGraph';
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
};

const mount = () => {
    const graph = new RationalExtrapolationGraph();
    mountGraph(graph);
    return {graph, probe: graph as unknown as Probe};
};
const declared = (graph: RationalExtrapolationGraph) => graph.getDeclaration() as GraphDeclaration;
const actions = (graph: RationalExtrapolationGraph) => new Map((declared(graph).actions ?? []).map(action => [action.id as string, action]));
const setT = (probe: Probe, value: number) => act(() => runAs('learner', () => probe.parameterBindings()['extrapolation-t'].apply(value)));
const lastPolylinePoint = (graph: RationalExtrapolationGraph) => {
    const lines = (declared(graph).marks?.nice ?? []).flatMap(mark => mark.kind === 'polyline' ? [mark.points] : []);
    return lines[lines.length - 1].at(-1)!;
};

describe('Rational extrapolation declares through the rational curve workspace', () => {
    test('the declaration is consistent and every legend entry resolves to a drawn object', () => {
        const {graph, probe} = mount();
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'extrapolation-point']);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
        expect(probe.drawnObject('extrapolation-point')).toMatchObject({visible: true});
    });

    test('the extrapolation parameter is a board puck; the Extrapolate control and the switches stay in Orodja', () => {
        const {graph} = mount();
        expect(declared(graph).parameters).toEqual([expect.objectContaining({key: 'extrapolation-t', kind: 'range', placement: 'board', symbol: 't', min: 1, max: 1.5})]);
        expect(actions(graph).get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions(graph).get('weights-0')).toMatchObject({placement: 'tools', section: 'display'});
    });

    test('the puck writes the parameter and refuses values outside 1..1.5', () => {
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
        // Four control points plus B(6/5) (lesson worked example): the rational curve's point, not the polynomial one.
        expect(declared(graph).marks?.must).toHaveLength(5);
        const before = [...lastPolylinePoint(graph)];
        setT(probe, 1.5);
        expect(lastPolylinePoint(graph)).not.toEqual(before);
        const curve = graph.getFirstJxgCurve().getCurve().eval(1.5);
        expect(lastPolylinePoint(graph)[0]).toBeCloseTo(curve.X(), 6);
        expect(lastPolylinePoint(graph)[1]).toBeCloseTo(curve.Y(), 6);
    });

    test('the view follows a box that reaches the largest extension and does not move with the puck', () => {
        const {graph, probe} = mount();
        const box = declared(graph).followView!;
        // B(3/2) = (-1.35, -3) lies inside the control points' box, so the box frames the control points [-4, 4] x [-3, 3] with room around.
        const far = graph.getFirstJxgCurve().getCurve().eval(1.5);
        expect(box[0]).toBeLessThan(Math.min(far.X(), -4));
        expect(box[2]).toBeGreaterThan(Math.max(far.X(), 4));
        expect(box[3]).toBeLessThan(Math.min(far.Y(), -3));
        expect(box[1]).toBeGreaterThan(3);
        setT(probe, 1.5);
        expect(declared(graph).followView).toEqual(box);
    });
});
