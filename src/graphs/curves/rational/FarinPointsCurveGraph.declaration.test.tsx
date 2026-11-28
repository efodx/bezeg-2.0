import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import FarinPointsCurveGraph from './FarinPointsCurveGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {drawnObject(id: string): {color: string; visible: boolean} | undefined; performAction(id: string): void};

const mount = () => {
    const graph = new FarinPointsCurveGraph();
    mountGraph(graph);
    return {graph, probe: graph as unknown as Probe};
};
const declared = (graph: FarinPointsCurveGraph) => graph.getDeclaration() as GraphDeclaration;
const actions = (graph: FarinPointsCurveGraph) => new Map((declared(graph).actions ?? []).map(action => [action.id as string, action]));

describe('Farin points declare through the rational curve workspace', () => {
    test('the declaration is consistent and every legend entry resolves to a drawn object', () => {
        const {graph, probe} = mount();
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0', 'farin-points']);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
        // The default preset shows the Farin points.
        expect(probe.drawnObject('farin-points')).toMatchObject({visible: true});
    });

    test('the Farin points are a switch puck that follows the curve; weights and polygon keep their places', () => {
        const {graph, probe} = mount();
        expect(actions(graph).get('farin-points')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(actions(graph).get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions(graph).get('weights-0')).toMatchObject({placement: 'tools', section: 'display'});
        act(() => probe.performAction('farin-points'));
        expect(graph.getFirstJxgCurve().isShowingFarinPoints()).toBe(false);
        expect(actions(graph).get('farin-points')).toMatchObject({pressed: false});
        expect(probe.drawnObject('farin-points')).toMatchObject({visible: false});
        act(() => probe.performAction('farin-points'));
        expect(graph.getFirstJxgCurve().isShowingFarinPoints()).toBe(true);
    });

    test('the marks cover the control points and the curve; the view follows a box around them', () => {
        const {graph} = mount();
        const declaration = declared(graph);
        expect(declaration.marks?.must).toHaveLength(4);
        const box = declaration.followView!;
        // Control points span [-4, 4] x [-3, 3]; the box has room around them and more above for the weight labels.
        expect(box[0]).toBeLessThan(-4);
        expect(box[2]).toBeGreaterThan(4);
        expect(box[3]).toBeLessThan(-3);
        expect(box[1]).toBeGreaterThan(3 + (3 - box[3]) / 10);
    });
});
