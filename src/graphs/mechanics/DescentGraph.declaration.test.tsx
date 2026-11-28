import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {DescentGraph, frameFor, type DescentIds} from './DescentGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../localization';
import {runAs} from '../base/writes/writeSource';
import {deriveDescent, type DescentMode} from '../../mechanics/trackModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: DescentGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new DescentGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<DescentIds>};
}

const mode = (value: DescentMode): Step => g => learner(() => g.editMode(value));
const at = (time: number): Step => g => learner(() => { g.setTime(time); });

const rows = (current: GraphDeclaration<DescentIds>) => current.readouts![0].rows;
const rowIds = (current: GraphDeclaration<DescentIds>) => rows(current).map(row => row.id as string);
const legendIds = (current: GraphDeclaration<DescentIds>) => (current.legend ?? []).map(entry => entry.id as string);
const noteIds = (current: GraphDeclaration<DescentIds>) => (current.notes ?? []).map(note => note.id as string);
const paramKeys = (current: GraphDeclaration<DescentIds>) => (current.parameters ?? []).map(parameter => parameter.key as string);
const puckActions = (current: GraphDeclaration<DescentIds>) => (current.actions ?? []).filter(action => action.puck).map(action => action.id as string);
const actionIds = (current: GraphDeclaration<DescentIds>) => (current.actions ?? []).map(action => action.id as string);

describe('mechanics-descent declaration', () => {
    test('the race: the time and radius pucks, no switch puck, the three times linked to the three drawn tracks, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(paramKeys(current)).toEqual(['descent-time', 'descent-radius']);
        expect(actionIds(current)).toEqual(['play-pause', 'reset-time']);
        expect(rowIds(current)).toEqual(['time', 'end', 'time-line', 'time-arc', 'time-cycloid', 'winner', 'line-slower', 'radius', 'gravity']);
        expect(legendIds(current)).toEqual(['line', 'arc', 'cycloid']);
        expect(noteIds(current)).toEqual(['result', 'hint']);
        const linked = Object.fromEntries(rows(current).filter(row => row.legend).map(row => [row.id, row.legend]));
        expect(linked).toEqual({'time-line': 'line', 'time-arc': 'arc', 'time-cycloid': 'cycloid'});
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        view.unmount();
    });

    test('the time puck ends at the slowest track; the ended note appears at the end of a stopped run', () => {
        const {graph, declaration, view} = setup(at(0.5));
        const time = declaration().parameters![0];
        expect(time).toMatchObject({key: 'descent-time', kind: 'range', min: 0, step: 0.01, symbol: 't'});
        expect((time as {max: number}).max).toBeCloseTo(graph.derived().tEnd, 9);
        expect(noteIds(declaration())).not.toContain('ended');
        act(() => at(graph.derived().tEnd)(graph));
        expect(noteIds(declaration())).toContain('ended');
        view.unmount();
    });

    test('the track mode: no radius puck, the cycloid switch puck, the point rows, the cycloid in the legend only when shown, consistent', () => {
        const {graph, declaration, view} = setup(mode('track'));
        let current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(paramKeys(current)).toEqual(['descent-time']);
        expect(puckActions(current)).toEqual(['show-cycloid']);
        expect(rowIds(current)).toEqual(expect.arrayContaining(['point-b', 'point-p1', 'point-p2', 'status', 'time-track', 'time-line', 'time-cycloid', 'cycloid-theta', 'cycloid-radius', 'difference']));
        expect(legendIds(current)).toEqual(['line', 'track', 'polygon', 'cycloid']);
        act(() => graph.performAction('show-cycloid'));
        current = declaration();
        expect(graph.state.showCycloid).toBe(false);
        expect(legendIds(current)).toEqual(['line', 'track', 'polygon']);
        expect(rows(current).find(row => row.id === 'time-cycloid')!.legend).toBeUndefined();
        act(() => graph.performAction('show-cycloid'));
        current = declaration();
        expect(current.actions!.find(action => action.id === 'show-cycloid')!.pressed).toBe(true);
        expect(rows(current).find(row => row.id === 'time-cycloid')!.legend).toBe('cycloid');
        expect(graph.drawnObject('cycloid')!.visible).toBe(true);
        expect(checkDeclaration(current)).toEqual([]);
        view.unmount();
    });

    test('the tautochrone: the time and radius pucks, the arc switch puck, one row per bead, the equal-time note', () => {
        const {graph, declaration, view} = setup(mode('tautochrone'));
        let current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(paramKeys(current)).toEqual(['descent-time', 'descent-radius']);
        expect(puckActions(current)).toEqual(['show-arc']);
        expect(rowIds(current)).toEqual(expect.arrayContaining(['radius', 'bead-1', 'bead-2', 'bead-3', 'closed-form', 'gravity']));
        expect(legendIds(current)).toEqual(['cycloid']);
        expect(noteIds(current)).toContain('result');
        act(() => graph.performAction('show-arc'));
        current = declaration();
        expect(legendIds(current)).toEqual(['arc', 'cycloid']);
        expect(rowIds(current)).toEqual(expect.arrayContaining(['arc-1', 'arc-2', 'arc-3']));
        expect(graph.drawnObject('guide')!.visible).toBe(true);
        expect(checkDeclaration(current)).toEqual([]);
        view.unmount();
    });

    test('the radius puck writes through the arbiter on its grid; off the grid, off the range or in the track mode it is a catalog refusal and nothing changes', () => {
        const {graph, view} = setup();
        act(() => { graph.parameters!.write('descent-radius', 2, 'learner'); });
        expect(graph.state.radius).toBe(2);
        const bad = graph.parameters!.write('descent-radius', 99, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(graph.state.radius).toBe(2);
        act(() => mode('track')(graph));
        const refused = graph.parameters!.write('descent-radius', 1, 'learner');
        expect(refused.status).toBe('refused-domain');
        expect(graph.state.radius).toBe(2);
        view.unmount();
    });

    test('the time writes through the arbiter and pauses the playback; a time past the end is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => graph.play());
        expect(graph.playing).toBe(true);
        act(() => { graph.parameters!.write('descent-time', 0.5, 'learner'); });
        expect(graph.time).toBe(0.5);
        expect(graph.playing).toBe(false);
        const bad = graph.parameters!.write('descent-time', 99, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(graph.time).toBe(0.5);
        view.unmount();
    });

    test('the playback actions run as the learner; an unknown action throws', () => {
        const {graph, view} = setup();
        act(() => at(0.5)(graph));
        act(() => graph.performAction('reset-time'));
        expect(graph.time).toBe(0);
        expect(() => graph.performAction('nothing')).toThrow();
        view.unmount();
    });

    test.each(['race', 'track', 'tautochrone'] as const)('%s: the frame is the followed view and the one box the marks must keep', name => {
        const {graph, declaration, view} = setup(mode(name));
        const box = frameFor(graph.state, deriveDescent(graph.state));
        expect(declaration().followView).toEqual(box);
        expect(declaration().marks!.must).toEqual([{kind: 'box', left: box[0], top: box[1], right: box[2], bottom: box[3]}]);
        view.unmount();
    });

    test('the sentences follow a language switch', () => {
        const {declaration, view} = setup();
        const sentence = () => renderMessage(declaration().notes![0].text as Message);
        const slovenian = sentence();
        expect(slovenian.length).toBeGreaterThan(0);
        act(() => setLanguage('en'));
        expect(sentence()).not.toBe(slovenian);
        view.unmount();
    });
});
