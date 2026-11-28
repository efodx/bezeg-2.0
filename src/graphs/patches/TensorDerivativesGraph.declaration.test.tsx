import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import type TensorDerivativesGraph from './TensorDerivativesGraph';
import type {DerivativesIds} from './TensorDerivativesGraph';
import {PATCH_PARAMETER_KEYS} from './TensorPatchGraph';
import {patchFromNet} from './patchSceneBuilder';
import {tensorDifferentials} from './tensorDerivatives';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage, type Message} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const STATES: readonly {name: string; apply(graph: TensorDerivativesGraph): void}[] = [
    {name: 'default (dome, all on)', apply: () => {}},
    {name: 'dome at a corner', apply: graph => graph.setParameters(1, 1)},
    {name: 'collapsed edge, normal undefined', apply: graph => graph.useStartingPatch(2)},
    {name: 'parallel corner, normal undefined', apply: graph => graph.useStartingPatch(3)},
    {name: 'plane, normal and twist off', apply: graph => { graph.setDerivativesSwitch('showTangentPlane', false); graph.setDerivativesSwitch('showNormal', false); graph.setDerivativesSwitch('showTwist', false); }},
    {name: 'bilinear saddle, net off', apply: graph => { graph.useStartingPatch(0); graph.setVisibility('showControlNet', false); }},
];

function mount() {
    const graph = createGraph('patch-derivatives') as unknown as TensorDerivativesGraph;
    mountGraph(graph as never);
    return {graph, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: TensorDerivativesGraph) => graph.getDeclaration() as GraphDeclaration<DerivativesIds>;
const LEGEND = ['surface', 'net', 'points', 'iso', 'boundary', 'point', 'su', 'sv', 'twist', 'normal', 'plane'];
const ROLES = {su: 'vector-u', sv: 'vector-v', twist: 'twist', normal: 'normal'} as const;

describe('Tensor derivatives declaration', () => {
    test.each(STATES)('$name: consistent, bound and drawn', ({apply}) => {
        const {graph, fake} = mount();
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declared(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters!.map(parameter => [parameter.key, parameter.placement])).toEqual([['patch-u', 'board'], ['patch-v', 'board']]);
        expect(graph.parameters!.read(PATCH_PARAMETER_KEYS.u)).toBe(graph.state.u);
        expect(graph.parameters!.read(PATCH_PARAMETER_KEYS.v)).toBe(graph.state.v);

        // The rows are the differentials at (u, v); the normal row says when the normal is undefined, and a status line says why.
        const rows = declaration.readouts!.flatMap(group => group.rows);
        expect(rows.map(row => [row.id, row.legend])).toEqual([['Su', 'su'], ['Sv', 'sv'], ['Suv', 'twist'], ['normal', 'normal']]);
        const {normal} = tensorDifferentials(patchFromNet(graph.state.net), graph.state.u, graph.state.v);
        const normalValue = rows[3].value;
        if (normal.kind === 'defined') {
            expect(normalValue).toMatchObject({kind: 'formatted'});
            expect(declaration.status).toBeUndefined();
        } else {
            expect(renderMessage(normalValue as Message)).toBe('ni določena');
            expect(declaration.status!.map(line => line.id)).toEqual(['normal']);
        }
        expect(declaration.notes!.map(note => note.id)).toEqual(['legend']);

        const scene = fake.last;
        const roles = new Set(scene.polylines.map(line => line.role));
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(LEGEND);
        for (const [id, role] of Object.entries(ROLES)) expect(visible(id), id).toBe(roles.has(role));
        expect(visible('plane')).toBe((scene.planes ?? []).length > 0);
        expect(visible('net')).toBe(roles.has('net'));
        for (const [id, key] of [['show-tangent-plane', 'showTangentPlane'], ['show-normal', 'showNormal'], ['show-twist', 'showTwist']] as const) {
            expect(declaration.actions!.find(action => action.id === id)!.pressed, id).toBe(graph.state[key] !== false);
        }
    });

    test('u and v are written through the arbiter and move the rows', () => {
        const {graph} = mount();
        const su = () => JSON.stringify(declared(graph).readouts![0].rows[0].value);
        const before = su();
        act(() => { graph.parameters!.write(PATCH_PARAMETER_KEYS.v, 0.1, 'learner'); });
        expect(graph.state.v).toBe(0.1);
        expect(su()).not.toBe(before);
    });

    test('the switches are Orodja actions that run as the learner; the tensor switches still work', () => {
        const {graph} = mount();
        const action = (id: string) => declared(graph).actions!.find(candidate => candidate.id === id)!;
        expect(action('show-normal')).toMatchObject({placement: 'tools', pressed: true});
        act(() => graph.performAction('show-normal'));
        expect(graph.state.showNormal).toBe(false);
        expect(action('show-normal').pressed).toBe(false);
        expect(graph.drawnObject('normal')!.visible).toBe(false);
        act(() => graph.performAction('show-tangent-plane'));
        expect(graph.drawnObject('plane')!.visible).toBe(false);
        act(() => graph.performAction('control-net'));
        expect(graph.state.showControlNet).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });
});
