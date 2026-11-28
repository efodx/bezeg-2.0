import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import type TriangularPatchGraph from './TriangularPatchGraph';
import type {TriangularIds} from './TriangularPatchGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {runAs} from '../base/writes/writeSource';
import {renderMessage, setLanguage, type Message} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const STATES: readonly {name: string; apply(graph: TriangularPatchGraph): void}[] = [
    {name: 'default', apply: () => {}},
    {name: 'P111 selected at (0,2; 0,5)', apply: graph => { graph.setParameters(0.2, 0.5); graph.selectIndex([1, 1, 1]); }},
    {name: 'de Casteljau and the split on', apply: graph => { graph.setVisibility('showDeCasteljau', true); graph.setSubdivisionPreview(true); }},
    {name: 'split on the edge w = 0 (not drawn), boundary off', apply: graph => { graph.setParameters(0.6, 0.4); graph.setSubdivisionPreview(true); graph.setVisibility('showBoundaryCurves', false); }},
    {name: 'comparison on, net and iso off', apply: graph => { graph.setTensorComparison(true); graph.setVisibility('showControlNet', false); graph.setVisibility('showIsoCurves', false); }},
    {name: 'degree 1, de Casteljau on (no levels)', apply: graph => { graph.setDegree(1); graph.setVisibility('showDeCasteljau', true); graph.selectIndex([1, 0, 0]); }},
];

function mount() {
    const graph = createGraph('patch-triangular') as unknown as TriangularPatchGraph;
    mountGraph(graph as never);
    return {graph, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: TriangularPatchGraph) => graph.getDeclaration() as GraphDeclaration<TriangularIds>;
/** The text of a row value: the graph formats both rows itself. */
const text = (value: unknown) => (value as {kind: string; text: string}).kind === 'formatted' ? (value as {text: string}).text : renderMessage(value as Message);
const LEGEND = ['surface', 'net', 'points', 'highlight', 'iso-u', 'iso-v', 'iso-w', 'boundary', 'construction', 'compare', 'point'];
/** The scene polyline id prefix (and role) each line legend entry stands for. */
const LINES = {
    'net': ['net-', 'net'], 'highlight': ['highlight-', 'highlight'], 'iso-u': ['iso-u-', 'iso'], 'iso-v': ['iso-v-', 'iso-v'], 'iso-w': ['iso-w-', 'iso-w'],
    'boundary': ['', 'boundary'], 'construction': ['', 'construction'], 'compare': ['compare-', 'compare'],
} as const;

describe('Triangular patch declaration', () => {
    test.each(STATES)('$name: consistent and drawn', ({apply}) => {
        const {graph, fake} = mount();
        act(() => runAs('learner', () => apply(graph)));
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        // No step asks to set u or v: no parameters, the Uredi sliders stay.
        expect(declaration.parameters ?? []).toEqual([]);

        // The rows are the old panel's readouts: the Bernstein weight of a selected point, then w; each with its help note.
        const rows = declaration.readouts!.flatMap(group => group.rows);
        const selected = graph.getDeclaration()!.readouts!.length === 2;
        expect(rows.map(row => row.id)).toEqual([...(selected ? ['bernstein-weight'] : []), 'w']);
        expect(declaration.notes!.map(note => note.id)).toEqual([...(selected ? ['bernstein'] : []), 'w']);
        expect(text(rows[rows.length - 1].value)).toBe((Math.round(Math.max(0, 1 - graph.state.u - graph.state.v) * 100) / 100).toString().replace('.', ','));

        const scene = fake.last;
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(LEGEND);
        for (const [id, [prefix, role]] of Object.entries(LINES)) {
            expect(visible(id), id).toBe(scene.polylines.some(line => line.role === role && line.id.startsWith(prefix)));
        }
        expect(visible('surface')).toBe(scene.mesh !== undefined);
        expect(visible('points')).toBe(scene.points.length > 0);
        expect(visible('point')).toBe(scene.markers.some(marker => marker.id === 'evaluated'));
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('the Bernstein weight row shows the selected point and its weight as the old panel', () => {
        const {graph} = mount();
        act(() => runAs('learner', () => { graph.setParameters(0.2, 0.5); graph.selectIndex([1, 1, 1]); }));
        const row = declared(graph).readouts![0].rows[0];
        expect(renderMessage(row.name!)).toBe('Utež točke P₁₁₁');
        // 6 u v w = 6 · 0,2 · 0,5 · 0,3.
        expect(text(row.value)).toBe('0,18');
    });

    test('every switch is an Orodja action whose pressed state follows the graph', () => {
        const {graph} = mount();
        const pressed = (id: TriangularIds['action']) => declared(graph).actions!.find(action => action.id === id)!.pressed;
        expect(declared(graph).actions!.every(action => action.placement === 'tools')).toBe(true);
        act(() => graph.performAction('tensor-comparison'));
        expect(pressed('tensor-comparison')).toBe(true);
        expect(graph.drawnObject('compare')!.visible).toBe(true);
        act(() => graph.performAction('subdivision-preview'));
        expect(pressed('subdivision-preview')).toBe(true);
        act(() => graph.performAction('control-net'));
        expect(pressed('control-net')).toBe(false);
        expect(graph.drawnObject('net')!.visible).toBe(false);
        act(() => graph.performAction('shading'));
        expect(graph.drawnObject('surface')!.visible).toBe(false);
        act(() => graph.performAction('height-mode'));
        expect(graph.state.zMode).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('nothing is drawn while the surface view is unavailable', () => {
        const {graph} = mount();
        act(() => (graph as unknown as {setSurfaceState(patch: {surfaceUnavailable: boolean}): void}).setSurfaceState({surfaceUnavailable: true}));
        for (const id of LEGEND) expect(graph.drawnObject(id)!.visible, id).toBe(false);
    });
});
