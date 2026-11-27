import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CurveOffsetGraph, {type OffsetIds} from './CurveOffsetGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: CurveOffsetGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new CurveOffsetGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<OffsetIds>};
}

const at = (d: number): Step => g => learner(() => g.setOffsetDistance(d));
const cusps = (shown: boolean): Step => g => learner(() => g.setOffsetCuspsShown(shown));
const traceShown = (shown: boolean): Step => g => learner(() => g.setOffsetShown(shown));
const ph: Step = g => learner(() => g.setCurveKind('ph'));

const rowValue = (current: GraphDeclaration<OffsetIds>, id: string) => (current.readouts![0].rows.find(row => row.id === id)?.value as {value: number} | undefined)?.value;
const legendIds = (current: GraphDeclaration<OffsetIds>) => (current.legend ?? []).map(entry => entry.id as string);
const noteIds = (current: GraphDeclaration<OffsetIds>) => (current.notes ?? []).map(note => note.id as string);

describe('curve-offset declaration', () => {
    test('the default: rows distance and cusps, the approximation note, the dashed offset in the legend, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.readouts![0].rows.map(row => row.id)).toEqual(['distance', 'cusps']);
        expect(rowValue(current, 'distance')).toBeCloseTo(-0.25, 9);
        expect(rowValue(current, 'cusps')).toBe(0);
        expect(noteIds(current)).toEqual(['approx']);
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['offset-d']);
        expect(legendIds(current)).toContain('offset');
        expect(legendIds(current)).not.toContain('cusps');
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        view.unmount();
    });

    test('the rows follow d and the cusps count', () => {
        const {declaration, graph, view} = setup(at(-1));
        expect(rowValue(declaration(), 'distance')).toBeCloseTo(-1, 9);
        expect(rowValue(declaration(), 'cusps')).toBe(2);
        expect(graph.parameters?.read('offset-d')).toBeCloseTo(-1, 9);
        view.unmount();
    });

    test('the cusp entry is in the legend only while the markers are switched on and there are cusps', () => {
        const {declaration, graph, view} = setup(at(-1));
        expect(legendIds(declaration())).not.toContain('cusps');
        act(() => cusps(true)(graph));
        expect(legendIds(declaration())).toContain('cusps');
        expect(graph.drawnObject('cusps')!.visible).toBe(true);
        expect(checkDeclaration(declaration())).toEqual([]);
        act(() => at(0.5)(graph));
        expect(legendIds(declaration())).not.toContain('cusps');
        view.unmount();
    });

    test('the offset switch puck is pressed while the offset is drawn; hiding it removes its legend entry and the notes', () => {
        const {graph, declaration, view} = setup();
        const pressed = () => declaration().actions!.find(action => action.id === 'offset-shown')!.pressed;
        expect(pressed()).toBe(true);
        act(() => graph.performAction('offset-shown'));
        expect(graph.state.offsetShown).toBe(false);
        expect(pressed()).toBe(false);
        expect(legendIds(declaration())).not.toContain('offset');
        expect(noteIds(declaration())).toEqual([]);
        expect(checkDeclaration(declaration())).toEqual([]);
        act(() => traceShown(true)(graph));
        expect(pressed()).toBe(true);
        expect(noteIds(declaration())).toEqual(['approx']);
        view.unmount();
    });

    test('the PH curve adds the exactness note', () => {
        const {declaration, view} = setup(ph);
        expect(noteIds(declaration())).toEqual(['approx', 'exact']);
        expect(renderMessage(declaration().notes![1].text as Message)).toBe('Polna črta je točna racionalna vzporednica.');
        view.unmount();
    });

    test('the marks hold the control points, the dashed offset and, while switched on, its cusps', () => {
        const {declaration, view, graph} = setup(at(-1));
        const points = () => declaration().marks!.must.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : []);
        const polylines = () => declaration().marks!.must.filter(mark => mark.kind === 'polyline');
        expect(points()).toEqual(expect.arrayContaining([[-1, 1], [0, -1], [1, 1]]));
        expect(polylines().length).toBeGreaterThan(0);
        expect(points()).toHaveLength(3);
        act(() => cusps(true)(graph));
        expect(points()).toHaveLength(5);
        expect(points().some(point => Math.abs(point[0] - 0.2251) < 1e-3 && Math.abs(point[1] - 0.9406) < 1e-3)).toBe(true);
        view.unmount();
    });

    test('the view follows a box around the curve and its offset, not the lesson scene box widened to the canvas', () => {
        const {declaration, view, graph} = setup();
        const follow = declaration().followView!;
        expect(follow).toBeDefined();
        // The parabola's points span 2 by 2 and the dashed offset at d = -1/4 lies inside them: the box stays within a few units.
        expect(follow[0]).toBeLessThanOrEqual(-1);
        expect(follow[2]).toBeGreaterThanOrEqual(1);
        expect(follow[2] - follow[0]).toBeLessThanOrEqual(4);
        expect(follow[1] - follow[3]).toBeLessThanOrEqual(5);
        act(() => at(-1)(graph));
        // At d = -1 the offset reaches above the control points' top (y = 1): the box grows with it.
        expect(declaration().followView![1]).toBeGreaterThan(follow[1] - 1e-9);
        view.unmount();
    });

    test('d writes through the arbiter; an invalid value is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => { graph.parameters!.write('offset-d', 0.5, 'learner'); });
        expect(graph.state.offsetD).toBe(0.5);
        const bad = graph.parameters!.write('offset-d', 4, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(bad.status === 'refused-domain' ? bad.error.message : '').toMatch(/od -3 do 3/);
        view.unmount();
    });

    test('no board text repeats the readout', () => {
        const {graph, view} = setup();
        const overlay = graph.offset()!;
        expect(overlay.ownedElements().filter(element => element.elType === 'text')).toEqual([]);
        expect(overlay.readoutText()).toMatch(/^Razdalja d = [-−]0,25./);
        view.unmount();
    });

    test('the sentence follows a language switch', () => {
        const {declaration, view} = setup();
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![0].text as Message)).toBe('The dashed offset is sampled, so it is approximate.');
        view.unmount();
    });
});
