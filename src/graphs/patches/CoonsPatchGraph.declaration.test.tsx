import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CoonsPatchGraph, {type CoonsIds} from './CoonsPatchGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise, renderDeclaration} from '../base/declare/parity';
import {renderMessage, setLanguage} from '../../localization';
import type {Xyz} from './surface-view/surfaceScene';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Move = [name: 'c0' | 'c1' | 'd0' | 'd1', index: number, xyz: Xyz];
const STATES: readonly {name: string; apply(graph: CoonsPatchGraph): void; mismatch: boolean}[] = [
    {name: 'default', apply: () => {}, mismatch: false},
    {name: 'inner point raised', apply: graph => moves(graph, [['c0', 1, [1, 0, 1.5]]]), mismatch: false},
    {name: 'linked corner moved', apply: graph => moves(graph, [['c0', 0, [0.2, 0.1, 0.3]]]), mismatch: false},
    {name: 'unlinked, corner apart', apply: graph => { graph.setLinkedCorners(false); moves(graph, [['d0', 0, [-0.5, 0.5, 0.9]]]); }, mismatch: true},
    {name: 'two corners apart', apply: graph => { graph.setLinkedCorners(false); moves(graph, [['d0', 0, [-0.5, 0.5, 0.9]], ['d1', 3, [3, 3, 1]]]); }, mismatch: true},
    {name: 'lc shown, net and shading off', apply: graph => { graph.setShown('lc'); graph.setVisibility('showControlNet', false); graph.setVisibility('showShading', false); }, mismatch: false},
];
function moves(graph: CoonsPatchGraph, list: Move[]) {
    for (const [name, index, xyz] of list) {
        graph.selectBoundaryPoint(name, index);
        graph.setSelectedCoordinates(xyz);
    }
}

function mount() {
    const graph = createGraph('patch-coons') as unknown as CoonsPatchGraph;
    const {view} = mountGraph(graph as never);
    return {graph, view, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: CoonsPatchGraph) => graph.getDeclaration() as GraphDeclaration<CoonsIds>;

describe('Coons patch declaration', () => {
    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({apply, mismatch}) => {
        const {graph, view, fake} = mount();
        act(() => apply(graph));
        const declaration = declared(graph);

        expect(checkDeclaration(declaration)).toEqual([]);
        // nothing is bound in the arbiter, so nothing is declared as a parameter
        expect(declaration.parameters).toBeUndefined();
        expect(graph.parameters?.keys() ?? []).toEqual([]);

        // rows: the panel's, in its order, as name and value
        const panel = [...view.container.querySelectorAll('[data-readout]:not([data-readout-live])')].map(element => [normalise(element.querySelector('dt')?.textContent ?? ''), normalise(element.querySelector('dd')?.textContent ?? '')]);
        expect(renderDeclaration(declaration).rows.map(row => [row.name, row.value])).toEqual(panel);
        expect(panel.length).toBe(5);
        expect(renderDeclaration(declaration).notes).toEqual([...view.container.querySelectorAll('[data-readout-note]')].map(element => normalise(element.textContent ?? '')));

        // status: the lines of the corner check
        const lines = [...view.container.querySelectorAll('[data-corner-status] p')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.status!.map(line => normalise(renderMessage(line.text)))).toEqual(lines);
        expect(declaration.status!.every(line => line.tone === (mismatch ? 'warning' : 'success'))).toBe(true);

        // the legend resolves to what the view was given
        const scene = fake.last;
        const roles = new Set(scene.polylines.map(line => line.role));
        const visible = (id: string) => graph.drawnObject(id)!.visible;
        expect(declaration.legend!.map(entry => entry.id)).toEqual(['boundary', 'polygon', 'net', 'surface', 'centre', 'points']);
        for (const entry of declaration.legend!) expect(graph.drawnObject(entry.object), entry.id).toBeDefined();
        expect(visible('boundary')).toBe(roles.has('boundary'));
        expect(visible('polygon')).toBe(roles.has('construction'));
        expect(visible('net')).toBe(roles.has('net'));
        expect(visible('surface')).toBe(scene.mesh !== undefined);
        expect(visible('centre')).toBe(scene.markers.some(marker => marker.role === 'evaluated'));
        expect(visible('points')).toBe(scene.points.length > 0);
        expect(new Set(declaration.legend!.map(entry => graph.drawnObject(entry.object)!.color)).size).toBe(declaration.legend!.length);
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('the row of the centre carries the centre swatch, and the interior note is declared', () => {
        const {graph} = mount();
        const declaration = declared(graph);
        expect(declaration.readouts![0].rows.map(row => [row.id, row.legend])).toEqual([['p-1-1', undefined], ['p-1-2', undefined], ['p-2-1', undefined], ['p-2-2', undefined], ['centre', 'centre']]);
        expect(declaration.notes!.map(note => note.id)).toEqual(['interior']);
        expect(declaration.marks).toBeUndefined();
    });

    test('the switches are actions that run as the learner and follow the state', () => {
        const {graph} = mount();
        const action = (id: string) => declared(graph).actions!.find(candidate => candidate.id === id)!;
        expect(declared(graph).actions!.map(candidate => candidate.id)).toEqual(['shown-lc', 'shown-ld', 'shown-b', 'shown-s', 'linked-corners', 'control-net', 'shading', 'height-mode']);
        expect(action('shown-s')).toMatchObject({placement: 'board', pressed: true});
        expect(action('shown-b')).toMatchObject({placement: 'board', pressed: false});
        expect(action('linked-corners')).toMatchObject({placement: 'board', pressed: true});
        expect(action('control-net')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        expect(action('height-mode')).toMatchObject({placement: 'tools', pressed: false});

        act(() => graph.performAction('shown-b'));
        expect(graph.state.shown).toBe('b');
        expect(action('shown-b').pressed).toBe(true);
        expect(action('shown-s').pressed).toBe(false);
        act(() => graph.performAction('linked-corners'));
        expect(graph.state.linkedCorners).toBe(false);
        act(() => graph.performAction('control-net'));
        expect(graph.state.showControlNet).toBe(false);
        expect(graph.drawnObject('net')!.visible).toBe(false);
        act(() => graph.performAction('shading'));
        expect(graph.drawnObject('surface')!.visible).toBe(false);
        act(() => graph.performAction('height-mode'));
        expect(graph.state.zMode).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });

    test('an unavailable view draws nothing, whatever the switches say', () => {
        const {graph} = mount();
        act(() => (graph as unknown as {setSurfaceState(patch: {surfaceUnavailable: boolean}): void}).setSurfaceState({surfaceUnavailable: true}));
        for (const id of ['boundary', 'polygon', 'net', 'surface', 'centre', 'points']) expect(graph.drawnObject(id)!.visible, id).toBe(false);
    });
});
