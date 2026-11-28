import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import type TensorSubdivisionGraph from './TensorSubdivisionGraph';
import {SPLIT_VALUE_KEY, type SubdivisionIds} from './TensorSubdivisionGraph';
import {PATCH_PARAMETER_KEYS} from './TensorPatchGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage, type Message} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const STATES: readonly {name: string; apply(graph: TensorSubdivisionGraph): void}[] = [
    {name: 'default (dome split in u at 0,4)', apply: () => {}},
    {name: 'first piece, split in v', apply: graph => { graph.setParameters(0.2, 0.7); graph.setSubdivisionDirection('v'); graph.setSubdivisionValue(0.8); }},
    {name: 'pieces hidden', apply: graph => graph.setShowPieces(false)},
    {name: 'elevated in u, pieces hidden (ghost drawn)', apply: graph => { graph.setShowPieces(false); graph.elevate('u'); }},
    {name: 'elevated in u, pieces shown', apply: graph => graph.elevate('u')},
    {name: 'net off, pieces shown', apply: graph => graph.setVisibility('showControlNet', false)},
];

function mount() {
    const graph = createGraph('patch-subdivision') as unknown as TensorSubdivisionGraph;
    mountGraph(graph as never);
    return {graph, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: TensorSubdivisionGraph) => graph.getDeclaration() as GraphDeclaration<SubdivisionIds>;
const LEGEND = ['surface', 'net', 'points', 'iso', 'boundary', 'point', 'piece-left', 'piece-right', 'split', 'ghost'];
/** The scene polyline id prefix each subdivision legend entry stands for. */
const LINES = {'net': 'net-row-', 'piece-left': 'piece-l-row-', 'piece-right': 'piece-r-row-', 'split': 'split-curve', 'ghost': 'ghost-row-'} as const;

describe('Tensor subdivision declaration', () => {
    test.each(STATES)('$name: consistent, bound and drawn', ({apply}) => {
        const {graph, fake} = mount();
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declared(graph);
        const s = graph.state;

        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.parameters!.map(parameter => [parameter.key, parameter.placement, parameter.symbol])).toEqual([
            ['patch-u', 'board', undefined], ['patch-v', 'board', undefined], [SPLIT_VALUE_KEY, 'board', s.subdivisionDirection === 'v' ? 'v_0' : 'u_0']]);
        expect(graph.parameters!.read(PATCH_PARAMETER_KEYS.u)).toBe(s.u);
        expect(graph.parameters!.read(SPLIT_VALUE_KEY)).toBe(s.subdivisionValue);

        // The rows are the correspondence the old panel showed: the piece, its local parameters, its point and S(u, v).
        const rows = declaration.readouts!.flatMap(group => group.rows);
        expect(rows.map(row => row.id)).toEqual(['piece', 'local', 'piece-point', 'point']);
        const {location} = graph.correspondence();
        expect(renderMessage(rows[0].value as Message)).toBe(location.piece === 'left' ? 'prvi del S_L' : 'drugi del S_R');
        expect(rows[2].value).toEqual(rows[3].value);
        expect(declaration.notes!.map(note => note.id)).toEqual(['correspondence']);

        const ids = fake.last.polylines.map(line => line.id);
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(LEGEND);
        for (const [id, prefix] of Object.entries(LINES)) expect(visible(id), id).toBe(ids.some(line => line.startsWith(prefix)));
        expect(visible('points')).toBe(fake.last.points.length > 0);

        const action = (id: string) => declaration.actions!.find(candidate => candidate.id === id)!;
        expect(action('show-pieces').pressed).toBe(s.showPieces !== false);
        expect(action('elevate-u').enabled).toBe(graph.canElevateIn('u'));
    });

    test('the split position is written through the arbiter; a value outside its range is refused', () => {
        const {graph} = mount();
        const local = () => JSON.stringify(declared(graph).readouts![0].rows[1].value);
        const before = local();
        act(() => { graph.parameters!.write(SPLIT_VALUE_KEY, 0.7, 'learner'); });
        expect(graph.state.subdivisionValue).toBe(0.7);
        expect(local()).not.toBe(before);
        expect(graph.parameters!.write(SPLIT_VALUE_KEY, 0.99, 'learner')).toMatchObject({status: 'refused-domain'});
        expect(graph.state.subdivisionValue).toBe(0.7);
    });

    test('elevation and the pieces switch are Orodja actions that run as the learner', () => {
        const {graph} = mount();
        const action = (id: string) => declared(graph).actions!.find(candidate => candidate.id === id)!;
        expect(action('elevate-v')).toMatchObject({placement: 'tools', enabled: true});
        act(() => graph.performAction('elevate-v'));
        expect(graph.state.n).toBe(4);
        expect(action('elevate-v').enabled).toBe(false);
        act(() => graph.performAction('show-pieces'));
        expect(graph.state.showPieces).toBe(false);
        expect(graph.drawnObject('ghost')!.visible).toBe(true);
        expect(graph.drawnObject('split')!.visible).toBe(false);
        act(() => graph.performAction('control-net'));
        expect(graph.drawnObject('ghost')!.visible).toBe(false);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });
});
