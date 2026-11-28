import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import RationalSubdivisionGraph2 from './RationalSubdivisionGraph2';
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

/** Task 08 lane L41: the rational route shares `SubdivisionGraph1` and declares the same workspace (`SubdivisionGraph1.declaration.test.tsx` holds the details). */
describe('Rational subdivision declares through the subdivision workspace', () => {
    const mount = () => {
        const graph = new RationalSubdivisionGraph2();
        mountGraph(graph);
        return {graph, probe: graph as unknown as Probe, declaration: graph.getDeclaration() as GraphDeclaration};
    };

    test('the declaration is consistent and every legend entry resolves to a drawn object', () => {
        const {probe, declaration} = mount();
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'rest', 'scheme']);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
    });

    test('the cut parameter is a board puck bound to t; the scheme switch stays in Orodja', () => {
        const {graph, probe, declaration} = mount();
        expect(declaration.parameters).toEqual([expect.objectContaining({key: 'subdivision-t', kind: 'range', placement: 'board', symbol: 't', min: 0.01, max: 0.99})]);
        expect(new Map((declaration.actions ?? []).map(action => [action.id as string, action])).get('decasteljau-scheme')).toMatchObject({placement: 'tools', pressed: true});
        act(() => runAs('learner', () => probe.parameterBindings()['subdivision-t'].apply(0.3)));
        expect(graph.state.t).toBe(0.3);
        expect(() => probe.parameterBindings()['subdivision-t'].apply(1)).toThrow();
    });

    test('the weights (1,2,1,1) do not move the control points, so the follow box is the one of the ordinary curve', () => {
        expect(mount().declaration.followView).toEqual([-5.6, 6.2, 5.6, -4.6]);
    });
});
