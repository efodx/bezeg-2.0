import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import ElevationGraph from './ElevationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {performAction(id: string): void; drawnObject(id: string): {color: string; visible: boolean} | undefined};

const states: {name: string; run: (graph: ElevationGraph, probe: Probe) => void; points: number}[] = [
    {name: 'default', run: () => undefined, points: 4},
    {name: 'elevated once', run: (_, probe) => probe.performAction('elevate'), points: 5},
    {name: 'elevated twice', run: (_, probe) => { probe.performAction('elevate'); probe.performAction('elevate'); }, points: 6},
    {name: 'overlay off', run: (_, probe) => probe.performAction('elevated-points'), points: 4},
    {name: 'polygon hidden', run: (_, probe) => probe.performAction('control-polygon-0'), points: 4},
];

describe('Elevation declares through the curve workspace', () => {
    for (const {name, run, points} of states) {
        test(`${name}: consistent, legend resolves, marks follow the control points`, () => {
            const graph = new ElevationGraph();
            mountGraph(graph);
            act(() => run(graph, graph as unknown as Probe));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toBeDefined();
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0']);
            expect(declaration.marks?.must).toHaveLength(points);
        });
    }

    test('the overlay switch flips `pressed`, elevate is an Orodja button, polygon and hull are board pucks', () => {
        const graph = new ElevationGraph();
        mountGraph(graph);
        const probe = graph as unknown as Probe;
        const actions = () => new Map((graph.getDeclaration()?.actions ?? []).map(action => [action.id as string, action]));
        expect([...actions().keys()]).toEqual(['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0', 'elevated-points', 'elevate']);
        expect(actions().get('elevated-points')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(actions().get('elevate')).toMatchObject({placement: 'tools', section: 'elevation', enabled: true});
        expect(actions().get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        act(() => probe.performAction('elevated-points'));
        expect(actions().get('elevated-points')!.pressed).toBe(false);
        act(() => probe.performAction('elevated-points'));
        expect(actions().get('elevated-points')!.pressed).toBe(true);
        expect(() => probe.performAction('nope')).toThrow('Unknown action');
    });
});
