import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import SubdivisionGraph from './SubdivisionGraph';
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
    subdivide(): void;
    selectCurve(curve: unknown): void;
};

const mount = () => {
    const graph = new SubdivisionGraph();
    mountGraph(graph);
    return {graph, probe: graph as unknown as Probe};
};
const declared = (graph: SubdivisionGraph) => graph.getDeclaration() as GraphDeclaration;
const actions = (graph: SubdivisionGraph) => new Map((declared(graph).actions ?? []).map(action => [action.id as string, action]));
const subdivide = (probe: Probe) => act(() => runAs('learner', () => probe.subdivide()));

describe('Repeated subdivision declares through the curve workspace', () => {
    test('a lone curve has the legend Krivulja and Kontrolne točke, each resolved to a drawn object', () => {
        const {graph, probe} = mount();
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => [entry.id, (entry.label as {key: string}).key])).toEqual([['pieces', 'curve'], ['control-points', 'control_points']]);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
        expect(declaration.parameters ?? []).toEqual([]);
    });

    test('the legend stays at three entries with several pieces, the second in the neighbours\' colour', () => {
        const {graph, probe} = mount();
        for (let step = 0; step < 3; step++) subdivide(probe);
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.legend?.map(entry => entry.id)).toEqual(['pieces', 'pieces-alt', 'control-points']);
        for (const entry of declaration.legend ?? []) expect(probe.drawnObject(entry.object), entry.id).toBeDefined();
        const [first, second] = declaration.legend!.map(entry => probe.drawnObject(entry.object)!.color);
        expect(first).not.toBe(second);
        expect(declaration.marks?.must).toHaveLength(8 * 4);
    });

    test('the polygon and hull of a lone curve are board pucks; once split they are switches in Orodja', () => {
        const {graph, probe} = mount();
        expect(actions(graph).get('control-polygon-0')).toMatchObject({placement: 'board', puck: true, pressed: true});
        expect(actions(graph).get('convex-hull-0')).toMatchObject({placement: 'board', puck: true, pressed: false});
        subdivide(probe);
        expect(actions(graph).get('control-polygon-0')).toMatchObject({placement: 'tools', section: 'display'});
        expect(actions(graph).get('control-polygon-1')).toMatchObject({placement: 'tools', section: 'display'});
    });

    test('the scheme switch needs a selected piece and flips `pressed` with it', () => {
        const {graph, probe} = mount();
        expect(actions(graph).get('decasteljau-scheme')).toMatchObject({placement: 'tools', section: 'display', enabled: false, pressed: false});
        act(() => probe.selectCurve(graph.getFirstJxgCurve()));
        expect(actions(graph).get('decasteljau-scheme')).toMatchObject({enabled: true, pressed: false});
        act(() => probe.performAction('decasteljau-scheme'));
        expect(actions(graph).get('decasteljau-scheme')!.pressed).toBe(true);
        act(() => probe.performAction('decasteljau-scheme'));
        expect(actions(graph).get('decasteljau-scheme')!.pressed).toBe(false);
    });

    test('the view follows a box around the pieces, with room above for the tags', () => {
        const {graph, probe} = mount();
        // Control points span x -4..4 and y -3..3; the padding is a fifth of the larger side (1.6) and double above.
        expect(declared(graph).followView).toEqual([-5.6, 6.2, 5.6, -4.6]);
        subdivide(probe);
        // The first halving's pieces reach up to y 1.5 only, so the box follows them (top 1.5 + 3.2).
        expect(declared(graph).followView!.map(value => Math.round(value * 100) / 100)).toEqual([-5.6, 4.7, 5.6, -4.6]);
    });
});
