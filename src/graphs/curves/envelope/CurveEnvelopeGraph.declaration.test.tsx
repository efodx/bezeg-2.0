import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CurveEnvelopeGraph, {type EnvelopeIds} from './CurveEnvelopeGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the protected lesson replacement the way a lesson scene reaches it. */
class ReplacingGraph extends CurveEnvelopeGraph {
    replaceCurve(points: [number, number][]): void {
        this.runLessonReplacement({
            importData: () => this.importPresetData([['JSXBezierCurve', {points, state: {showingJxgPoints: true, showingControlPolygon: true, showingConvexHull: false, showingDecasteljauScheme: false, subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2}}]]),
            afterImport: () => undefined, state: () => ({...this.getInitialState(), ...this.lessonDefaultState()}), transientState: undefined,
        });
    }
}
type Step = (graph: ReplacingGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new ReplacingGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<EnvelopeIds>};
}

const at = (t: number): Step => g => learner(() => g.setEnvelopeT(t));
const lines = (count: number): Step => g => learner(() => g.setEnvelopeLineCount(count));
const curveShown = (shown: boolean): Step => g => learner(() => g.setEnvelopeCurveShown(shown));
const touchShown = (shown: boolean): Step => g => learner(() => g.setEnvelopeTouchShown(shown));
const linesShown = (shown: boolean): Step => g => learner(() => g.setEnvelopeLinesShown(shown));
const replace = (points: [number, number][]): Step => g => learner(() => g.replaceCurve(points));

const rowValue = (current: GraphDeclaration<EnvelopeIds>, id: string) => (current.readouts![0].rows.find(row => row.id === id)?.value as {value: number} | undefined)?.value;

describe('curve-envelope declaration', () => {
    test('the default: rows lines and t, no note, the family and the touching line in the legend, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.readouts![0].rows.map(row => row.id)).toEqual(['lines', 't']);
        expect(rowValue(current, 'lines')).toBe(16);
        expect(rowValue(current, 't')).toBeCloseTo(0.5, 9);
        expect(current.notes).toEqual([]);
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['envelope-t', 'envelope-lines']);
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        expect((current.legend ?? []).map(entry => entry.id)).toEqual(expect.arrayContaining(['family', 'touch']));
        view.unmount();
    });

    test('the rows follow t and the count', () => {
        const {declaration, graph, view} = setup(at(0.8), lines(64));
        expect(rowValue(declaration(), 't')).toBeCloseTo(0.8, 9);
        expect(rowValue(declaration(), 'lines')).toBe(64);
        expect(graph.parameters?.read('envelope-t')).toBeCloseTo(0.8, 9);
        expect(graph.parameters?.read('envelope-lines')).toBe(64);
        view.unmount();
    });

    test('the curve switch puck is pressed while the curve is drawn and its action flips it', () => {
        const {graph, declaration, view} = setup();
        const pressed = () => declaration().actions!.find(action => action.id === 'envelope-curve')!.pressed;
        expect(pressed()).toBe(true);
        act(() => graph.performAction('envelope-curve'));
        expect(graph.state.envelopeCurveShown).toBe(false);
        expect(pressed()).toBe(false);
        act(() => curveShown(true)(graph));
        expect(pressed()).toBe(true);
        view.unmount();
    });

    test('the legend lists the family and the touching line only while they are switched on', () => {
        const {declaration, view, graph} = setup(linesShown(false));
        expect((declaration().legend ?? []).map(entry => entry.id)).not.toContain('family');
        expect((declaration().legend ?? []).map(entry => entry.id)).toContain('touch');
        act(() => { linesShown(true)(graph); touchShown(false)(graph); });
        expect((declaration().legend ?? []).map(entry => entry.id)).not.toContain('touch');
        expect(checkDeclaration(declaration())).toEqual([]);
        view.unmount();
    });

    test('collinear control points add the note, and only then', () => {
        const {declaration, view, graph} = setup(replace([[1, 0], [0.5, 0.5], [0, 1]]));
        expect(declaration().notes!.map(note => note.id)).toEqual(['collinear']);
        expect(renderMessage(declaration().notes![0].text as Message)).toMatch(/^Kontrolne točke ležijo na isti premici/);
        act(() => replace([[1, 0], [0, 0], [0, 1]])(graph));
        expect(declaration().notes).toEqual([]);
        view.unmount();
    });

    test('the marks hold every control point of the curve', () => {
        const {declaration, view} = setup();
        const points = declaration().marks!.must.flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y]] : []);
        expect(points).toEqual(expect.arrayContaining([[1, 0], [0, 0], [0, 1]]));
        view.unmount();
    });

    test('the view follows a box around the control points, not the lesson scene box widened to the canvas', () => {
        const {declaration, view, graph} = setup();
        const follow = declaration().followView!;
        expect(follow).toBeDefined();
        // The default controls span 1 by 1: the box holds them with room for the labels and stays within a few units.
        expect(follow[0]).toBeLessThanOrEqual(0);
        expect(follow[2]).toBeGreaterThanOrEqual(1);
        expect(follow[3]).toBeLessThanOrEqual(0);
        expect(follow[1]).toBeGreaterThanOrEqual(1);
        expect(follow[2] - follow[0]).toBeLessThanOrEqual(3);
        expect(follow[1] - follow[3]).toBeLessThanOrEqual(3);
        act(() => replace([[3, 0], [0, 0], [0, 3]])(graph));
        expect(declaration().followView![2]).toBeGreaterThanOrEqual(3);
        view.unmount();
    });

    test('t and the line count write through the arbiter; an invalid value is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => { graph.parameters!.write('envelope-t', 0.25, 'learner'); graph.parameters!.write('envelope-lines', 40, 'learner'); });
        expect(graph.state.envelopeT).toBe(0.25);
        expect(graph.state.envelopeLineCount).toBe(40);
        const badT = graph.parameters!.write('envelope-t', 1.5, 'learner');
        expect(badT.status).toBe('refused-domain');
        expect(badT.status === 'refused-domain' ? badT.error.message : '').toMatch(/od 0 do 1/);
        const badCount = graph.parameters!.write('envelope-lines', 201, 'learner');
        expect(badCount.status).toBe('refused-domain');
        expect(badCount.status === 'refused-domain' ? badCount.error.message : '').toMatch(/od 1 do 200/);
        view.unmount();
    });

    test('no board text repeats the readout', () => {
        const {graph, view} = setup();
        const overlay = (graph as unknown as {overlay: {ownedElements(): {elType: string}[]}}).overlay;
        expect(overlay.ownedElements().filter(element => element.elType === 'text')).toEqual([]);
        view.unmount();
    });

    test('the sentence follows a language switch', () => {
        const {declaration, view} = setup(replace([[1, 0], [0.5, 0.5], [0, 1]]));
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![0].text as Message)).toMatch(/^The control points lie on one line/);
        view.unmount();
    });
});
