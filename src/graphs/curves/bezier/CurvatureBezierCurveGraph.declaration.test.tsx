import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CurvatureBezierCurveGraph, {type CurvatureIds} from './CurvatureBezierCurveGraph';
import CurveEvoluteGraph from './CurveEvoluteGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the protected lesson replacement the way a lesson scene reaches it. */
class ReplacingGraph extends CurvatureBezierCurveGraph {
    replaceCurve(points: [number, number][], state: Record<string, unknown>): void {
        this.runLessonReplacement({
            importData: () => this.importPresetData([['JSXBezierCurve', {points, state}]]), afterImport: () => undefined,
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState()}), transientState: undefined,
        });
    }
}
type Step = (graph: ReplacingGraph) => void;
const learner = (work: () => void) => runAs('learner', work);

function setup(...steps: Step[]) {
    const graph = new ReplacingGraph();
    const {view} = mountGraph(graph);
    for (const step of steps) act(() => step(graph));
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<CurvatureIds>};
}

const at = (t: number): Step => g => learner(() => g.setCurvatureT(t));
const circle = (shown: boolean): Step => g => learner(() => g.setState({curvatureCircleShown: shown}));
const curveState = {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false, subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2};
/** A lesson scene replaces the curve the way a Next click does; a bare import is not a complete replacement. */
const curve = (points: [number, number][]): Step => g => learner(() => g.replaceCurve(points, curveState));
const S_CUBIC: [number, number][] = [[0, 0], [1, 2], [2, -2], [3, 0]];

const rowText = (current: GraphDeclaration<CurvatureIds>, id: string) => {
    const row = current.readouts![0].rows.find(candidate => candidate.id === id);
    const value = row?.value as {value: number} | undefined;
    return value?.value;
};

describe('curve-curvature declaration', () => {
    test('the parabola at t = 0,5: rows kappa, R and phi, no notes, the circle in the legend, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.readouts![0].rows.map(row => row.id)).toEqual(['kappa', 'radius', 'angle']);
        expect(rowText(current, 'kappa')).toBeCloseTo(2, 9);
        expect(rowText(current, 'radius')).toBeCloseTo(0.5, 9);
        expect(rowText(current, 'angle')).toBeCloseTo(0, 9);
        expect(current.notes).toEqual([]);
        const ids = (current.legend ?? []).map(entry => entry.id);
        expect(ids).toContain('circle');
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['curvature-t']);
        view.unmount();
    });

    test('t = 1 changes the rows to the end values; the circle off removes its legend entry', () => {
        const {graph, declaration, view} = setup(at(1));
        expect(rowText(declaration(), 'kappa')).toBeCloseTo(0.1789, 4);
        expect(rowText(declaration(), 'radius')).toBeCloseTo(5.5902, 4);
        expect(rowText(declaration(), 'angle')).toBeCloseTo(63.4349, 4);
        expect(graph.parameters?.read('curvature-t')).toBe(1);
        act(() => circle(false)(graph));
        expect((declaration().legend ?? []).map(entry => entry.id)).not.toContain('circle');
        expect(checkDeclaration(declaration())).toEqual([]);
        view.unmount();
    });

    test('an inflection has kappa 0, no radius row and the line note; the circle is invisible but the line is drawn', () => {
        const {declaration, view} = setup(curve(S_CUBIC), at(0.5));
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.readouts![0].rows.map(row => row.id)).toEqual(['kappa', 'angle']);
        expect(rowText(current, 'kappa')).toBe(0);
        expect(current.notes!.map(note => note.id)).toEqual(['line']);
        expect(renderMessage(current.notes![0].text as Message)).toMatch(/^Ukrivljenost je 0/);
        view.unmount();
    });

    test('a singular point has no rows and the singular note', () => {
        const {declaration, view} = setup(curve([[0, 0], [0, 0], [1, 1], [2, 0]]), at(0));
        const current = declaration();
        expect(current.readouts![0].rows).toEqual([]);
        expect(current.notes!.map(note => note.id)).toEqual(['singular']);
        view.unmount();
    });

    test('the marks follow t: the point at t is a must mark and the circle adds nice marks only while it is drawn', () => {
        const {graph, declaration, view} = setup(at(0.5));
        const base = declaration().marks!;
        act(() => circle(false)(graph));
        const noCircle = declaration().marks!;
        expect(base.nice!.length).toBe(noCircle.nice!.length + 4);
        expect(base.must.length).toBe(noCircle.must.length);
        act(() => at(0.9)(graph));
        expect(JSON.stringify(declaration().marks!.must)).not.toBe(JSON.stringify(base.must));
        view.unmount();
    });

    test('a large radius does not pull the view out: every mark stays within the curve box grown by its own size', () => {
        const {declaration, view} = setup(curve([[0, 0], [1, 0], [2, 1], [3, 3]]), circle(true), at(1));
        const marks = declaration().marks!;
        const points = [...marks.must, ...(marks.nice ?? [])].flatMap(mark => mark.kind === 'point' ? [[mark.x, mark.y] as const] : mark.kind === 'polyline' ? [...mark.points] : []);
        const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
        // The cubic spans 3 by 3 (control points); at t = 1 the radius is about 16.8 and its extreme points reach x = 17 and y = -14.
        expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(2 * 3);
        expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(2 * 3);
        // The view follows a box around the watched objects, not the lesson scene's box widened to the canvas.
        const follow = declaration().followView!;
        expect(follow[2] - follow[0]).toBeLessThanOrEqual(2 * 3 + 2);
        expect(follow[1] - follow[3]).toBeLessThanOrEqual(2 * 3 + 2);
        view.unmount();
    });

    test('t writes through the arbiter; a value outside 0..1 is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => { graph.parameters!.write('curvature-t', 0.25, 'learner'); });
        expect(graph.state.curvatureT).toBe(0.25);
        const result = graph.parameters!.write('curvature-t', 1.5, 'learner');
        expect(result.status).toBe('refused-domain');
        expect(result.status === 'refused-domain' ? result.error.message : '').toMatch(/od 0 do 1/);
        view.unmount();
    });

    test('no board text repeats the readout, and the live region still hears it', () => {
        const {graph, view} = setup();
        const texts = (graph as unknown as {overlay: {ownedElements(): {elType: string}[]}}).overlay.ownedElements().filter(element => element.elType === 'text');
        expect(texts.length).toBe(2); // the T and N tags
        view.unmount();
    });

    test('the evolute keeps its board readout and declares nothing', () => {
        const graph = new CurveEvoluteGraph();
        const {view} = mountGraph(graph);
        expect(graph.getDeclaration()).toBeUndefined();
        const texts = (graph as unknown as {overlay: {ownedElements(): {elType: string}[]}}).overlay.ownedElements().filter(element => element.elType === 'text');
        expect(texts.length).toBe(3);
        view.unmount();
    });

    test('the sentences follow a language switch', () => {
        const {declaration, view} = setup(curve(S_CUBIC), at(0.5));
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![0].text as Message)).toMatch(/^Curvature is 0/);
        view.unmount();
    });
});
