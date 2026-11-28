import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CubicPhBezierCurveGraph from './CubicPhBezierCurveGraph';
import type {PhIds} from './BasePhBezierCurveGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Step = (graph: CubicPhBezierCurveGraph) => void;

function setup(...steps: Step[]) {
    const graph = new CubicPhBezierCurveGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<PhIds>};
}

const offsets = (d: number): Step => g => runAs('learner', () => {
    g.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(true);
    g.getFirstJxgCurveAsPHCurve().setOffsetCurveDistance(d);
    g.boardUpdate();
});
const raiseW1 = (dy: number): Step => g => runAs('learner', () => {
    const w1 = g.getFirstCurveAsPHBezierCurve().w[1];
    w1.setY(w1.Y() + dy);
    g.boardUpdate();
});

const arcValue = (current: GraphDeclaration<PhIds>) => {
    const text = (current.readouts![0].rows.find(row => row.id === 'arc-length')?.value as {text: string} | undefined)?.text;
    return text === undefined ? undefined : Number(text.replace(',', '.'));
};
const legendIds = (current: GraphDeclaration<PhIds>) => (current.legend ?? []).map(entry => entry.id as string);
const pressed = (current: GraphDeclaration<PhIds>, id: string) => current.actions!.find(action => action.id === id)?.pressed;

describe('ph-cubic declaration', () => {
    test('the default: the arc length row, the curve and control points in the legend, no d puck while the offsets are off', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(arcValue(current)).toBeCloseTo(10.333, 3);
        expect(current.parameters).toEqual([]);
        expect(legendIds(current)).toEqual(['curve-0', 'control-points-0']);
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        expect(pressed(current, 'control-polygon-0')).toBe(false);
        expect(current.actions!.find(action => action.id === 'control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        view.unmount();
    });

    test('the arc length row follows a moved generator across states', () => {
        const {declaration, view, graph} = setup();
        const seen = [arcValue(declaration())];
        for (const dy of [1, 1, 1, 1, 1]) {
            act(() => raiseW1(dy)(graph));
            seen.push(arcValue(declaration()));
            expect(checkDeclaration(declaration())).toEqual([]);
        }
        expect(new Set(seen).size).toBe(seen.length);
        view.unmount();
    });

    test('the offsets add the d puck, the offset legend entry and their samples to the marks; d writes through the arbiter', () => {
        const {graph, declaration, view} = setup();
        const before = declaration().marks!.nice!.length;
        act(() => offsets(1)(graph));
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['ph-offset-d']);
        expect(legendIds(current)).toContain('offset');
        expect(graph.drawnObject('offset')!.visible).toBe(true);
        expect(current.marks!.nice!.length).toBe(before + 1);
        expect(graph.parameters!.read('ph-offset-d')).toBe(1);
        act(() => { graph.parameters!.write('ph-offset-d', -2, 'learner'); });
        expect(graph.getFirstJxgCurveAsPHCurve().getCurve().getOffsetCurveDistance()).toBe(-2);
        expect(graph.parameters!.read('ph-offset-d')).toBe(-2);
        const bad = graph.parameters!.write('ph-offset-d', 4, 'learner');
        expect(bad.status).toBe('refused-domain');
        expect(bad.status === 'refused-domain' ? bad.error.message : '').toMatch(/od -3 do 3/);
        view.unmount();
    });

    test('hiding the offsets removes the d puck and the legend entry', () => {
        const {graph, declaration, view} = setup(offsets(1));
        act(() => graph.getFirstJxgCurveAsPHCurve().setShowOffsetCurve(false));
        expect(declaration().parameters).toEqual([]);
        expect(legendIds(declaration())).not.toContain('offset');
        view.unmount();
    });

    test('the arc length switch is an action that removes the row and the board text stays away', () => {
        const {graph, declaration, view} = setup();
        expect(pressed(declaration(), 'arc-length-shown')).toBe(true);
        act(() => graph.performAction('arc-length-shown'));
        expect(graph.state.showArcLength).toBe(false);
        expect(pressed(declaration(), 'arc-length-shown')).toBe(false);
        expect(declaration().readouts![0].rows).toEqual([]);
        act(() => graph.performAction('arc-length-shown'));
        expect(arcValue(declaration())).toBeCloseTo(10.333, 3);
        const board = (graph as unknown as {board: {objectsList: {elType: string}[]}}).board;
        expect(board.objectsList.filter(object => object.elType === 'text' && String((object as {plaintext?: string}).plaintext ?? '').includes('Dolžina'))).toEqual([]);
        view.unmount();
    });

    test('the control polygon geometry switch is a display action that flips with the graph', () => {
        const {graph, declaration, view} = setup();
        expect(pressed(declaration(), 'ph-geometry')).toBe(false);
        act(() => graph.performAction('ph-geometry'));
        expect(graph.state.showingCurve).toBe(false);
        expect(pressed(declaration(), 'ph-geometry')).toBe(true);
        view.unmount();
    });

    test('the arc length name follows a language switch', () => {
        const {declaration, view} = setup();
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().readouts![0].rows[0].name!)).toBe('Arc length');
        view.unmount();
    });
});
