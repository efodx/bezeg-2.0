import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import type TensorDeCasteljauGraph from './TensorDeCasteljauGraph';
import {DECASTELJAU_ORDER_KEY, type DeCasteljauIds} from './TensorDeCasteljauGraph';
import {PATCH_PARAMETER_KEYS} from './TensorPatchGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const STATES: readonly {name: string; apply(graph: TensorDeCasteljauGraph): void}[] = [
    {name: 'default (rows)', apply: () => {}},
    {name: 'columns, u and v moved', apply: graph => { graph.setDecasteljauOrder('columns'); graph.setParameter('u', 0.8); graph.setParameter('v', 0.1); }},
    {name: 'bilinear', apply: graph => graph.setDecasteljauOrder('bilinear')},
    {name: 'bilinear on the bilinear saddle', apply: graph => { graph.setDecasteljauOrder('bilinear'); graph.useStartingPatch(0); }},
    {name: 'construction off', apply: graph => graph.setShowDeCasteljau(false)},
    {name: 'net off, degree (2, 1)', apply: graph => { graph.setVisibility('showControlNet', false); graph.setDegree('u', 2); graph.setDegree('v', 1); }},
];

function mount() {
    const graph = createGraph('patch-decasteljau') as unknown as TensorDeCasteljauGraph;
    mountGraph(graph as never);
    return {graph, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: TensorDeCasteljauGraph) => graph.getDeclaration() as GraphDeclaration<DeCasteljauIds>;
const LEGEND = ['surface', 'net', 'points', 'iso', 'boundary', 'point', 'construction', 'construction-2'];

describe('Tensor de Casteljau declaration', () => {
    test.each(STATES)('$name: consistent, bound and drawn', ({apply}) => {
        const {graph, fake} = mount();
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declared(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters!.map(parameter => [parameter.key, parameter.placement])).toEqual([['patch-u', 'board'], ['patch-v', 'board'], [DECASTELJAU_ORDER_KEY, 'board']]);
        expect(graph.parameters!.read(PATCH_PARAMETER_KEYS.u)).toBe(graph.state.u);
        expect(graph.parameters!.read(PATCH_PARAMETER_KEYS.v)).toBe(graph.state.v);
        expect(graph.parameters!.read(DECASTELJAU_ORDER_KEY)).toBe(graph.state.decasteljauOrder);
        expect(declaration.readouts).toBeUndefined();

        const scene = fake.last;
        const roles = new Set(scene.polylines.map(line => line.role));
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(LEGEND);
        expect(visible('net')).toBe(roles.has('net'));
        expect(visible('points')).toBe(scene.points.length > 0);
        expect(visible('construction')).toBe(roles.has('construction'));
        expect(visible('construction-2')).toBe(roles.has('construction-2'));
        expect(declaration.actions!.find(action => action.id === 'construction')!.pressed).toBe(graph.state.showDeCasteljau !== false);
    });

    test('the order is a choice puck of three options, written through the arbiter; a bad order is refused', () => {
        const {graph} = mount();
        const order = declared(graph).parameters!.find(parameter => parameter.key === DECASTELJAU_ORDER_KEY)!;
        expect(order).toMatchObject({kind: 'choice', puck: true});
        expect(order.kind === 'choice' && order.options.map(option => option.value)).toEqual(['rows', 'columns', 'bilinear']);
        act(() => { graph.parameters!.write(DECASTELJAU_ORDER_KEY, 'columns', 'learner'); });
        expect(graph.state.decasteljauOrder).toBe('columns');
        let result: unknown;
        act(() => { result = graph.parameters!.write(DECASTELJAU_ORDER_KEY, 'diagonal', 'learner'); });
        expect(result).toMatchObject({status: 'refused-domain'});
        expect(graph.state.decasteljauOrder).toBe('columns');
    });

    test('the construction switch is an Orodja action that runs as the learner; the tensor switches still work', () => {
        const {graph} = mount();
        const action = (id: string) => declared(graph).actions!.find(candidate => candidate.id === id)!;
        expect(action('construction')).toMatchObject({placement: 'tools', pressed: true});
        act(() => graph.performAction('construction'));
        expect(graph.state.showDeCasteljau).toBe(false);
        expect(action('construction').pressed).toBe(false);
        expect(graph.drawnObject('construction')!.visible).toBe(false);
        act(() => graph.performAction('control-net'));
        expect(graph.state.showControlNet).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });
});
