import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import SubdivisionGraph1 from './SubdivisionGraph1';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {runAs} from '../../base/writes/writeSource';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {
    performAction(id: string): void;
    drawnObject(id: string): {color: string; visible: boolean} | undefined;
    parameterBindings(): Record<string, {read(): number; apply(value: unknown): void}>;
    subdivide(): void;
};

const mount = () => {
    const graph = new SubdivisionGraph1();
    mountGraph(graph);
    return {graph, probe: graph as unknown as Probe};
};
const declared = (graph: SubdivisionGraph1) => graph.getDeclaration() as GraphDeclaration;
const actions = (graph: SubdivisionGraph1) => new Map((declared(graph).actions ?? []).map(action => [action.id as string, action]));

describe('Subdivision declares through the curve workspace', () => {
    test('the declaration is consistent and every legend entry resolves to a drawn object', () => {
        const {graph, probe} = mount();
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'rest', 'scheme']);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
        expect(probe.drawnObject('rest')).toMatchObject({visible: true});
        expect(probe.drawnObject('scheme')).toMatchObject({visible: true});
    });

    test('the cut parameter is a board puck bound to t; the Subdivide control and the switches stay in Orodja', () => {
        const {graph} = mount();
        expect(declared(graph).parameters).toEqual([expect.objectContaining({key: 'subdivision-t', kind: 'range', placement: 'board', symbol: 't', min: 0.01, max: 0.99})]);
        expect(actions(graph).get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions(graph).get('convex-hull-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions(graph).get('decasteljau-scheme')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
    });

    test('the puck writes t (clamped to the open interval) and the remainder follows', () => {
        const {graph, probe} = mount();
        const binding = probe.parameterBindings()['subdivision-t'];
        expect(binding.read()).toBe(0.5);
        act(() => runAs('learner', () => binding.apply(0.3)));
        expect(graph.state.t).toBe(0.3);
        expect(binding.read()).toBe(0.3);
        expect(() => binding.apply(1)).toThrow('Parameter reza mora biti');
        expect(() => binding.apply(0)).toThrow();
        expect(graph.state.t).toBe(0.3);
    });

    test('the scheme switch flips `pressed`, a cut hides the scheme and the remainder', () => {
        const {graph, probe} = mount();
        act(() => probe.performAction('decasteljau-scheme'));
        expect(actions(graph).get('decasteljau-scheme')!.pressed).toBe(false);
        expect(probe.drawnObject('scheme')).toMatchObject({visible: false});
        act(() => probe.performAction('decasteljau-scheme'));
        expect(actions(graph).get('decasteljau-scheme')!.pressed).toBe(true);
        act(() => runAs('learner', () => probe.subdivide()));
        expect(probe.drawnObject('rest')).toMatchObject({visible: false});
        expect(declared(graph).legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'curve-1', 'control-points-1', 'rest', 'scheme']);
        expect(declared(graph).marks?.must).toHaveLength(8);
    });

    test('the marks follow the control points', () => {
        const {graph} = mount();
        expect(declared(graph).marks?.must).toHaveLength(4);
        expect(declared(graph).marks?.must).toContainEqual({kind: 'point', x: -4, y: -3});
    });

    test('the view follows a box around the control points, with room above for the tags, and follows the pieces after a cut', () => {
        const {graph, probe} = mount();
        // Control points span x -4..4 and y -3..3; the padding is a fifth of the larger side (1.6) and double above.
        expect(declared(graph).followView).toEqual([-5.6, 6.2, 5.6, -4.6]);
        act(() => runAs('learner', () => probe.subdivide()));
        // The two pieces reach up to y 1.5 only, so the box follows them (top 1.5 + 3.2).
        expect(declared(graph).followView!.map(value => Math.round(value * 100) / 100)).toEqual([-5.6, 4.7, 5.6, -4.6]);
    });

});
