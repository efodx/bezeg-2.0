import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import type TensorJoinGraph from './TensorJoinGraph';
import {JOIN_ALPHA_KEY, JOIN_MODE_KEY, type JoinIds} from './TensorJoinGraph';
import {joinReportCase, STATE_KEYS} from './TensorJoinPanels';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage, t, type Message} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const STATES: readonly {name: string; apply(graph: TensorJoinGraph): void}[] = [
    {name: 'default (C1)', apply: () => {}},
    {name: 'G1 with alpha 0,5', apply: graph => { graph.setJoinContinuity('g1'); graph.setJoinAlpha(0.5); }},
    {name: 'C0 kink scene', apply: graph => graph.useJoinScene(2)},
    {name: 'no condition, net off', apply: graph => { graph.setJoinContinuity('none'); graph.setVisibility('showControlNet', false); }},
];

function mount() {
    const graph = createGraph('patch-joins') as unknown as TensorJoinGraph;
    mountGraph(graph as never);
    return {graph, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: TensorJoinGraph) => graph.getDeclaration() as GraphDeclaration<JoinIds>;
const LEGEND = ['surface', 'net', 'net-b', 'points', 'iso', 'boundary', 'seam', 'arrow-a', 'arrow-b', 'point'];
/** The scene polyline id prefix each legend entry stands for. */
const LINES = {'net': 'net-row-', 'net-b': 'b-net-row-', 'seam': 'join-boundary-a', 'arrow-a': 'join-su-a-', 'arrow-b': 'join-su-b-'} as const;

describe('Tensor joins declaration', () => {
    test.each(STATES)('$name: consistent, bound and drawn', ({apply}) => {
        const {graph, fake} = mount();
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declared(graph);
        const g1 = graph.state.joinContinuity === 'g1';

        expect(checkDeclaration(declaration)).toEqual([]);
        // The mode is a four-option choice puck; alpha is a puck only where it applies (G1). u and v stay in Uredi.
        expect(declaration.parameters!.map(parameter => [parameter.key, parameter.placement])).toEqual([
            [JOIN_MODE_KEY, 'board'], ...(g1 ? [[JOIN_ALPHA_KEY, 'board']] : [])]);
        expect(declaration.parameters![0]).toMatchObject({kind: 'choice', puck: true});
        expect(graph.parameters!.read(JOIN_MODE_KEY)).toBe(graph.state.joinContinuity);
        expect(graph.parameters!.read(JOIN_ALPHA_KEY)).toBe(graph.state.joinAlpha);

        // The rows are the join report the old panel showed.
        const rows = declaration.readouts!.flatMap(group => group.rows);
        expect(rows.map(row => row.id)).toEqual(['state', 'position-gap', 'derivative-gap', 'normal-angle', 'alpha-star']);
        const kind = joinReportCase(graph.joinReport());
        expect(renderMessage(rows[0].value as Message)).toBe(t(STATE_KEYS[kind]));
        expect(declaration.notes!.map(note => note.id)).toEqual(['report']);

        const ids = fake.last.polylines.map(line => line.id);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(LEGEND);
        for (const [id, prefix] of Object.entries(LINES)) expect(visible(id), id).toBe(ids.some(line => line.startsWith(prefix)));
    });

    test('the mode and alpha are written through the arbiter; an unknown mode or an alpha outside its range is refused', () => {
        const {graph} = mount();
        act(() => { graph.parameters!.write(JOIN_MODE_KEY, 'g1', 'learner'); });
        expect(graph.state.joinContinuity).toBe('g1');
        act(() => { graph.parameters!.write(JOIN_ALPHA_KEY, 3, 'learner'); });
        expect(graph.state.joinAlpha).toBe(3);
        expect(graph.joinReport().alphaStar).toBeCloseTo(3, 9);
        expect(graph.parameters!.write(JOIN_ALPHA_KEY, 5, 'learner')).toMatchObject({status: 'refused-domain'});
        expect(graph.parameters!.write(JOIN_MODE_KEY, 'c2', 'learner')).toMatchObject({status: 'refused-domain'});
        expect(graph.state.joinAlpha).toBe(3);
        expect(graph.state.joinContinuity).toBe('g1');
    });

    test('the capstone declares no puck or readout, only the teapot legend', () => {
        const {graph} = mount();
        act(() => runAs('learner', () => graph.useJoinScene(3)));
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters ?? []).toEqual([]);
        expect(declaration.readouts ?? []).toEqual([]);
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['surface', 'boundary']);
        expect(graph.drawnObject('boundary')!.visible).toBe(graph.state.showBoundaryCurves);
    });
});
