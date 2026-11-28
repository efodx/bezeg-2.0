import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {message, renderMessage, setLanguage} from '../../localization';
import type {SolidsState} from '../../solids/solidsModel';
import {createGraph} from '../base/createTestGraph';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {normalise, renderDeclaration} from '../base/declare/parity';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, surfaceViewOf} from '../base/realGraphTestHarness';
import {runAs} from '../base/writes/writeSource';
import SolidsGraph from './SolidsGraph';
import {
    SOLIDS_AXIS_KEY, SOLIDS_CURSOR_KEY, SOLIDS_DISCS_KEY, SOLIDS_NORMAL_KEYS, SOLIDS_OFFSET_KEY, SOLIDS_PYRAMIDS_ACTION, SOLIDS_SHEAR_KEY,
    solidsDrawnObject, type SolidsIds,
} from './solidsDeclaration';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

const SECTION = [SOLIDS_OFFSET_KEY, ...SOLIDS_NORMAL_KEYS];
/** One or more states per mode, with the pucks and the switch each should declare (the lesson steps that ask for them: solidsDeclaration). */
const STATES: readonly {name: string; state: Partial<SolidsState>; pucks: readonly string[]; pyramids: boolean}[] = [
    {name: 'section, default cube', state: {}, pucks: SECTION, pyramids: false},
    {name: 'section, hexagon', state: {normal: [1, 1, 1], offset: 6}, pucks: SECTION, pyramids: false},
    {name: 'section, the plane misses', state: {normal: [0, 0, 1], offset: 40}, pucks: SECTION, pyramids: false},
    {name: 'section, the pyramid and its axial triangle', state: {solid: 'square-pyramid'}, pucks: SECTION, pyramids: false},
    {name: 'stack, sheared prism', state: {mode: 'stack', solid: 'square-prism', shear: 6, cursor: 30, discs: 12}, pucks: [SOLIDS_SHEAR_KEY, SOLIDS_CURSOR_KEY, SOLIDS_DISCS_KEY], pyramids: false},
    {name: 'stack, cone and cylinder (no shear)', state: {mode: 'stack', solid: 'cone'}, pucks: [SOLIDS_CURSOR_KEY, SOLIDS_DISCS_KEY], pyramids: false},
    {name: 'volume, cube', state: {mode: 'volume', solid: 'cube'}, pucks: [], pyramids: true},
    {name: 'volume, cube in three pyramids', state: {mode: 'volume', solid: 'cube', pyramids: true}, pucks: [], pyramids: true},
    {name: 'volume, sphere', state: {mode: 'volume', solid: 'sphere'}, pucks: [], pyramids: false},
    {name: 'revolve, cone about x', state: {mode: 'revolve', solid: 'cone'}, pucks: [SOLIDS_AXIS_KEY, SOLIDS_DISCS_KEY], pyramids: false},
    {name: 'revolve, parabola about y', state: {mode: 'revolve', solid: 'parabola', axis: 'y', discs: 7}, pucks: [SOLIDS_AXIS_KEY, SOLIDS_DISCS_KEY], pyramids: false},
    {name: 'revolve, sphere (x only)', state: {mode: 'revolve', solid: 'sphere'}, pucks: [SOLIDS_DISCS_KEY], pyramids: false},
];

function mount() {
    const graph = createGraph('solids') as unknown as SolidsGraph;
    const {view} = mountGraph(graph as never);
    return {graph, view, fake: surfaceViewOf(graph as never)!};
}
const declared = (graph: SolidsGraph) => graph.getDeclaration() as GraphDeclaration<SolidsIds>;
const learn = (work: () => void) => act(() => runAs('learner', work));

describe('solids declaration', () => {
    test.each(STATES)('$name: consistent, drawn and equal to the panel', ({state, pucks, pyramids}) => {
        const {graph, view, fake} = mount();
        learn(() => graph.setState(state));
        const declaration = declared(graph);
        expect(checkDeclaration(declaration)).toEqual([]);
        expect(declaration.marks).toBeUndefined();
        expect(declaration.followView).toBeUndefined();

        // the pucks of the mode, all on the board, each bound in the arbiter
        expect((declaration.parameters ?? []).map(parameter => parameter.key)).toEqual(pucks);
        expect((declaration.parameters ?? []).every(parameter => parameter.placement === 'board')).toBe(true);
        for (const key of pucks) expect(graph.parameters!.keys()).toContain(key);
        expect((declaration.actions ?? []).map(action => action.id)).toEqual(pyramids ? [SOLIDS_PYRAMIDS_ACTION] : []);

        // rows and notes: the panel's, in its order
        const panel = [...view.container.querySelectorAll('[data-declared-panel] [data-readout]')].map(element => [normalise(element.querySelector('dt')?.textContent ?? ''), normalise(element.querySelector('dd')?.textContent ?? '')]);
        expect(panel.length).toBeGreaterThan(0);
        expect(renderDeclaration(declaration).rows.map(row => [row.name, row.value])).toEqual(panel);
        expect(renderDeclaration(declaration).notes).toEqual([...view.container.querySelectorAll('[data-declared-panel] [data-readout-note]')].map(element => normalise(element.textContent ?? '')));

        // the legend: the "Kaj vidiš" captions in their words, each drawn in the scene the view was given, in the view's colour
        const captions = [...view.container.querySelectorAll('[data-solids-captions] li')].map(element => normalise(element.textContent ?? ''));
        expect(declaration.legend!.map(entry => normalise(renderMessage(entry.label)))).toEqual(captions);
        for (const entry of declaration.legend!) {
            expect(graph.drawnObject(entry.object), entry.id).toEqual(solidsDrawnObject(entry.object, fake.last));
            expect(graph.drawnObject(entry.object)!.visible, entry.id).toBe(true);
        }
        expect(graph.drawnObject('nothing')).toBeUndefined();
    });

    test('a drawn object the scene does not hold is not visible', () => {
        const {graph, fake} = mount();
        for (const id of ['cursor', 'slabs', 'discs', 'profile', 'pyramids', 'solid-1']) {
            expect(graph.drawnObject(id)!.visible, id).toBe(false);
            expect(solidsDrawnObject(id, fake.last)!.visible, id).toBe(false);
        }
        learn(() => graph.setState({mode: 'stack', solid: 'square-prism'}));
        expect(graph.drawnObject('cursor')!.visible).toBe(true);
        expect(graph.drawnObject('plane')!.visible).toBe(false);
    });

    test('the pucks write in the slider units and snap to the stored grid', () => {
        const {graph} = mount();
        const arbiter = graph.parameters!;
        expect(arbiter.read(SOLIDS_OFFSET_KEY)).toBe(0.5);
        act(() => { expect(arbiter.write(SOLIDS_OFFSET_KEY, 0.3, 'learner').status).toBe('applied'); });
        expect(arbiter.read(SOLIDS_OFFSET_KEY)).toBe(0.25);
        expect(graph.state.offset).toBe(1);
        act(() => { arbiter.write(SOLIDS_NORMAL_KEYS[0], 2, 'learner'); });
        expect(graph.state.normal).toEqual([2, 0, 1]);
        learn(() => graph.setMode('stack'));
        act(() => { arbiter.write(SOLIDS_SHEAR_KEY, 1.5, 'learner'); arbiter.write(SOLIDS_CURSOR_KEY, 75, 'learner'); arbiter.write(SOLIDS_DISCS_KEY, 12, 'learner'); });
        expect(graph.state).toEqual(expect.objectContaining({shear: 6, cursor: 30, discs: 12}));
        expect([arbiter.read(SOLIDS_SHEAR_KEY), arbiter.read(SOLIDS_CURSOR_KEY), arbiter.read(SOLIDS_DISCS_KEY)]).toEqual([1.5, 75, 12]);
    });

    test('the zero normal, the shear of the cone and the y-axis of the sphere are refused with the panel reason; nothing changes', () => {
        const {graph} = mount();
        const arbiter = graph.parameters!;
        const refused = (key: string, value: unknown) => {
            const before = JSON.stringify(graph.state);
            const results: ReturnType<typeof arbiter.write>[] = [];
            act(() => { results.push(arbiter.write(key, value, 'learner')); });
            const result = results[0];
            expect(result.status, key).toBe('refused-domain');
            expect(JSON.stringify(graph.state), key).toBe(before);
            return result.status === 'refused-domain' ? result.error.message : '';
        };
        expect(refused(SOLIDS_NORMAL_KEYS[2], 0)).toBe(renderMessage(message('solids_graph_normal_zero')));
        learn(() => graph.setState({mode: 'stack', solid: 'cone'}));
        expect(refused(SOLIDS_SHEAR_KEY, 1)).toBe(renderMessage(message('solids_graph_shear_unavailable')));
        learn(() => graph.setState({mode: 'revolve', solid: 'sphere'}));
        expect(refused(SOLIDS_AXIS_KEY, 'y')).toBe(renderMessage(message('solids_graph_axis_sphere_only_x')));
    });

    test('the switch of the pyramids runs as the learner and follows the state', () => {
        const {graph} = mount();
        learn(() => graph.setMode('volume'));
        const action = () => declared(graph).actions!.find(candidate => candidate.id === SOLIDS_PYRAMIDS_ACTION)!;
        expect(action()).toMatchObject({placement: 'board', pressed: false, puck: true});
        act(() => graph.performAction(SOLIDS_PYRAMIDS_ACTION));
        expect(graph.state.pyramids).toBe(true);
        expect(action().pressed).toBe(true);
        expect(graph.drawnObject('pyramids')!.visible).toBe(true);
        expect(() => graph.performAction('nothing')).toThrow('Unknown action');
    });
});
