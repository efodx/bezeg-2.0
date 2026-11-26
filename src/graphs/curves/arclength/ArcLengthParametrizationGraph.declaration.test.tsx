import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import ArcLengthParametrizationGraph, {type ArcLengthIds} from './ArcLengthParametrizationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import type {CurveCollectionPresetData} from '../curvePresetCollections';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class Probe extends ArcLengthParametrizationGraph {
    /** Replaces the scene the way a lesson or a Preset does (import, then the graph's own sync). */
    replace(data: CurveCollectionPresetData) {
        this.runLessonReplacement({importData: () => this.importPresetData(data), afterImport: () => undefined,
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState()}), transientState: undefined});
    }
}

type Step = (graph: Probe) => void;
const learner = (work: () => void) => runAs('learner', work);
const cuspScene: CurveCollectionPresetData = [['JSXBezierCurve', {points: [[0, 0], [1, 2], [0, 1], [1, 1]], state: {showingJxgPoints: true,
    showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false, subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2}}]];

function setup(...steps: Step[]) {
    const graph = new Probe();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<ArcLengthIds>};
}

const states: {name: string; steps: Step[]; equalT: boolean; equalArc: boolean; ph?: boolean}[] = [
    {name: 'default Q', steps: [], equalT: true, equalArc: true},
    {name: 'position 0,5', steps: [g => learner(() => g.setArcMoverPosition(0.5))], equalT: true, equalArc: true},
    {name: 'N = 16', steps: [g => learner(() => g.setArcPieces(16))], equalT: true, equalArc: true},
    {name: 'constant arc speed', steps: [g => learner(() => { g.setArcMoverMode('arc'); g.setArcMoverPosition(0.25); })], equalT: true, equalArc: true},
    {name: 'equal-t marks off', steps: [g => learner(() => g.setArcEqualTShown(false))], equalT: false, equalArc: true},
    {name: 'equal-arc marks off', steps: [g => learner(() => g.setArcEqualArcShown(false))], equalT: true, equalArc: false},
    {name: 'the PH curve', steps: [g => learner(() => g.setCurveKind('ph'))], equalT: true, equalArc: true, ph: true},
];

describe('arc-length parametrization declaration', () => {
    for (const {name, steps, equalT, equalArc, ph} of states) {
        test(`${name}: consistent, drawn and the sentences of the old details`, () => {
            const {graph, declaration, view} = setup(...steps);
            const current = declaration();

            expect(checkDeclaration(current)).toEqual([]);

            // the notes are the sentences of the old panel (the mover line, then the details list, line for line)
            const lines = graph.arcOverlay()!.readoutLines();
            expect((current.notes ?? []).map(note => renderMessage(note.text))).toEqual(lines);
            expect((current.notes ?? []).some(note => note.id === 'exact')).toBe(Boolean(ph));
            expect([...document.querySelectorAll('[data-testid="arc-details"] li')].map(li => li.textContent)).toEqual(lines.slice(1));

            // three board pucks, each bound and following the state
            const parameters = current.parameters ?? [];
            expect(parameters.map(parameter => parameter.key)).toEqual(['arc-pieces', 'arc-mover-mode', 'arc-mover-position']);
            expect(parameters.every(parameter => parameter.placement === 'board')).toBe(true);
            for (const parameter of parameters) expect(graph.parameters?.read(parameter.key), parameter.key).toBeDefined();
            expect(graph.parameters?.read('arc-pieces')).toBe(graph.state.arcPieces);
            expect(graph.parameters?.read('arc-mover-mode')).toBe(graph.state.arcMoverMode);
            expect(graph.parameters?.read('arc-mover-position')).toBe(graph.state.arcMoverPosition);

            // the legend resolves to drawn, visible objects; each mark kind is listed only while shown
            const ids = (current.legend ?? []).map(entry => entry.id);
            expect(ids).toEqual(['curve-0', 'control-points-0', 'mover', ...(equalT ? ['equal-t'] : []), ...(equalArc ? ['equal-arc'] : [])]);
            for (const entry of current.legend ?? []) {
                const drawn = graph.drawnObject(entry.object);
                expect(drawn, entry.id).toBeDefined();
                expect(drawn!.visible, entry.id).toBe(true);
            }
            // the marks hold the control points and the moving point
            expect(current.marks?.must?.length).toBe((graph.controlRows()?.length ?? 0) + 1);
            view.unmount();
        });
    }

    test('a switched-off mark kind is a hidden drawn object', () => {
        const {graph, view} = setup(g => learner(() => g.setArcEqualTShown(false)));
        expect(graph.drawnObject('equal-t')!.visible).toBe(false);
        expect(graph.drawnObject('equal-arc')!.visible).toBe(true);
        view.unmount();
    });

    test('the pucks write through the arbiter and a bad value is a catalog refusal', () => {
        const {graph, declaration, view} = setup();
        act(() => { graph.parameters!.write('arc-pieces', 12, 'learner'); graph.parameters!.write('arc-mover-mode', 'arc', 'learner'); graph.parameters!.write('arc-mover-position', 0.4, 'learner'); });
        expect(graph.state).toMatchObject({arcPieces: 12, arcMoverMode: 'arc', arcMoverPosition: 0.4});
        const reason = (key: 'arc-pieces' | 'arc-mover-position', value: number) => {
            const result = graph.parameters!.write(key, value, 'learner');
            expect(result.status).toBe('refused-domain');
            return result.status === 'refused-domain' ? result.error.message : '';
        };
        expect(reason('arc-pieces', 1.5)).toMatch(/celo število od 2 do 64/);
        expect(reason('arc-mover-position', 2)).toMatch(/od 0 do 1/);
        expect(declaration().parameters!.find(p => p.key === 'arc-mover-mode')).toMatchObject({kind: 'choice', puck: true});
        view.unmount();
    });

    test('the sentences follow a language switch and a cusp and a zero-length curve keep a consistent declaration', () => {
        const {graph, declaration, view} = setup();
        expect(renderMessage(declaration().notes![0].text)).toBe('t = 0, s(t) = 0.');
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![1].text)).toMatch(/^Arc length L = 6\.390976/);
        act(() => { setLanguage('sl'); graph.replace(cuspScene); });
        expect(checkDeclaration(declaration())).toEqual([]);
        expect(renderMessage(declaration().notes!.at(-1)!.text)).toMatch(/^Osti \(hitrost 0\) pri t = /);
        view.unmount();
    });
});
