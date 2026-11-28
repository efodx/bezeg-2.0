import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import type TensorPatchGraph from './TensorPatchGraph';
import {PATCH_PARAMETER_KEYS, type TensorPatchIds} from './TensorPatchGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const STATES: readonly {name: string; apply(graph: TensorPatchGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'u and v moved', apply: graph => { graph.setParameter('u', 0.2); graph.setParameter('v', 0.9); }},
    {name: 'net off', apply: graph => graph.setVisibility('showControlNet', false)},
    {name: 'iso curves and boundary off', apply: graph => { graph.setVisibility('showIsoCurves', false); graph.setVisibility('showBoundaryCurves', false); }},
    {name: 'shading off, degree (2, 1)', apply: graph => { graph.setVisibility('showShading', false); graph.setDegree('u', 2); graph.setDegree('v', 1); }},
    {name: 'bilinear saddle', apply: graph => graph.useStartingPatch(0)},
];

function mount() {
    const graph = createGraph('patch-tensor') as unknown as TensorPatchGraph;
    const {view} = mountGraph(graph as never);
    return {graph, view, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: TensorPatchGraph) => graph.getDeclaration() as GraphDeclaration<TensorPatchIds>;
const LEGEND = ['surface', 'net', 'points', 'iso', 'boundary', 'point'];

describe('Tensor patch declaration', () => {
    test.each(STATES)('$name: consistent, bound and drawn', ({apply}) => {
        const {graph, fake} = mount();
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declared(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters!.map(parameter => [parameter.key, parameter.placement])).toEqual([['patch-u', 'board'], ['patch-v', 'board']]);
        expect(graph.parameters!.keys()).toEqual(['patch-u', 'patch-v']);
        expect(graph.parameters!.read('patch-u')).toBe(graph.state.u);
        expect(graph.parameters!.read('patch-v')).toBe(graph.state.v);
        // the panel shows no readout, so none is declared
        expect(declaration.readouts).toBeUndefined();
        expect(declaration.marks).toBeUndefined();

        // the legend resolves to what the view was given
        const scene = fake.last;
        const roles = new Set(scene.polylines.map(line => line.role));
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(LEGEND);
        expect(visible('surface')).toBe(scene.mesh !== undefined);
        expect(visible('net')).toBe(roles.has('net'));
        expect(visible('points')).toBe(scene.points.length > 0);
        expect(visible('iso')).toBe(roles.has('iso'));
        expect(visible('boundary')).toBe(roles.has('boundary'));
        expect(visible('point')).toBe(scene.markers.some(marker => marker.role === 'evaluated'));
        expect(new Set(declaration.legend!.map(entry => graph.drawnObject(entry.object)!.color)).size).toBe(LEGEND.length);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('u and v are written through the arbiter, clamped to the parameter square', () => {
        const {graph} = mount();
        act(() => { graph.parameters!.write(PATCH_PARAMETER_KEYS.u, 0.3, 'learner'); });
        expect(graph.state.u).toBe(0.3);
        act(() => { graph.parameters!.write(PATCH_PARAMETER_KEYS.v, 1.4, 'learner'); });
        expect(graph.state.v).toBe(1);
        expect(graph.parameters!.read(PATCH_PARAMETER_KEYS.v)).toBe(1);
    });

    test('the display switches are Orodja actions that run as the learner and follow the state', () => {
        const {graph} = mount();
        const action = (id: string) => declared(graph).actions!.find(candidate => candidate.id === id)!;
        expect(declared(graph).actions!.map(candidate => candidate.id)).toEqual(['control-net', 'iso-curves', 'boundary-curves', 'shading', 'height-mode']);
        expect(action('control-net')).toMatchObject({placement: 'tools', tab: 'display', pressed: true});
        expect(action('height-mode')).toMatchObject({placement: 'tools', pressed: false});
        act(() => graph.performAction('control-net'));
        expect(graph.state.showControlNet).toBe(false);
        expect(action('control-net').pressed).toBe(false);
        expect(graph.drawnObject('net')!.visible).toBe(false);
        act(() => graph.performAction('iso-curves'));
        expect(graph.drawnObject('iso')!.visible).toBe(false);
        act(() => graph.performAction('shading'));
        expect(graph.drawnObject('surface')!.visible).toBe(false);
        act(() => graph.performAction('height-mode'));
        expect(graph.state.zMode).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('an unavailable view draws nothing, whatever the switches say', () => {
        const {graph} = mount();
        act(() => (graph as unknown as {setSurfaceState(patch: {surfaceUnavailable: boolean}): void}).setSurfaceState({surfaceUnavailable: true}));
        for (const id of LEGEND) expect(graph.drawnObject(id)!.visible, id).toBe(false);
    });

    test.each(['patch-subdivision', 'patch-joins'] as const)('%s, a subclass converted in its own lane, stays undeclared', id => {
        const graph = createGraph(id) as unknown as TensorPatchGraph;
        mountGraph(graph as never);
        expect(graph.getDeclaration()).toBeUndefined();
        expect(graph.parameters).toBeUndefined();
        expect(graph.drawnObject('net')).toBeUndefined();
    });
});
