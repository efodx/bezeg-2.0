import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CurveEvoluteGraph, {type EvoluteIds} from './CurveEvoluteGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {renderMessage, setLanguage, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the protected lesson replacement the way a lesson scene reaches it. */
class ReplacingGraph extends CurveEvoluteGraph {
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
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration<EvoluteIds>};
}

const at = (t: number): Step => g => learner(() => g.setCurvatureT(t));
const trace = (mode: 'hidden' | 'to-parameter' | 'full'): Step => g => learner(() => g.setEvoluteTrace(mode));
const normal = (shown: boolean): Step => g => learner(() => g.setEvoluteNormalShown(shown));
const curveState = {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false, subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2};
const curve = (points: [number, number][]): Step => g => learner(() => g.replaceCurve(points, curveState));
const S_CUBIC: [number, number][] = [[0, 0], [1, 2], [2, -2], [3, 0]];

const rowValue = (current: GraphDeclaration<EvoluteIds>, id: string) => current.readouts![0].rows.find(row => row.id === id)?.value;
const polylines = (current: GraphDeclaration<EvoluteIds>) => current.marks!.must.filter(mark => mark.kind === 'polyline');

describe('curve-evolute declaration', () => {
    test('the parabola at t = 0,75: rows kappa, R, phi and E, no notes, circle, evolute and normal in the legend, consistent', () => {
        const {graph, declaration, view} = setup();
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.readouts![0].rows.map(row => row.id)).toEqual(['kappa', 'radius', 'angle', 'point']);
        const point = rowValue(current, 'point') as Message;
        expect(point.params.value0).toMatchObject({value: expect.closeTo(-0.5, 9)});
        expect(point.params.value1).toMatchObject({value: expect.closeTo(1.25, 9)});
        expect(renderMessage(point)).toBe('(−0,5; 1,25)');
        expect(current.notes).toEqual([]);
        const ids = (current.legend ?? []).map(entry => entry.id);
        expect(ids).toEqual(expect.arrayContaining(['circle', 'evolute', 'normal']));
        for (const entry of current.legend ?? []) {
            const drawn = graph.drawnObject(entry.object);
            expect(drawn, entry.id).toBeDefined();
            expect(drawn!.visible, entry.id).toBe(true);
        }
        expect(current.parameters?.map(parameter => parameter.key)).toEqual(['curvature-t']);
        view.unmount();
    });

    test('the legend lists the evolute and the normal only while they are drawn', () => {
        const {graph, declaration, view} = setup(trace('hidden'), normal(false));
        const ids = () => (declaration().legend ?? []).map(entry => entry.id);
        expect(ids()).not.toContain('evolute');
        expect(ids()).not.toContain('normal');
        act(() => trace('to-parameter')(graph));
        expect(ids()).toContain('evolute');
        act(() => normal(true)(graph));
        expect(ids()).toContain('normal');
        view.unmount();
    });

    test('the cusp at t = 0,5: E = (0; 0,5)', () => {
        const {declaration, view} = setup(at(0.5));
        const point = rowValue(declaration(), 'point') as Message;
        expect(point.params.value0).toMatchObject({value: expect.closeTo(0, 9)});
        expect(point.params.value1).toMatchObject({value: expect.closeTo(0.5, 9)});
        view.unmount();
    });

    test('an inflection has no E row and says there is no point of the evolute', () => {
        const {declaration, view} = setup(curve(S_CUBIC), at(0.5));
        const current = declaration();
        expect(checkDeclaration(current)).toEqual([]);
        expect(current.readouts![0].rows.map(row => row.id)).toEqual(['kappa', 'angle']);
        expect(current.notes!.map(note => note.id)).toEqual(['line', 'noEvolute']);
        expect(renderMessage(current.notes![1].text as Message)).toMatch(/^Točke evolute ni/);
        view.unmount();
    });

    test('a singular point has no rows and both "not defined" notes', () => {
        const {declaration, view} = setup(curve([[0, 0], [0, 0], [1, 1], [2, 0]]), at(0));
        const current = declaration();
        expect(current.readouts![0].rows).toEqual([]);
        expect(current.notes!.map(note => note.id)).toEqual(['singular', 'undefinedEvolute']);
        view.unmount();
    });

    test('t writes through the arbiter; a value outside 0..1 is a catalog refusal', () => {
        const {graph, view} = setup();
        act(() => { graph.parameters!.write('curvature-t', 0.25, 'learner'); });
        expect(graph.state.curvatureT).toBe(0.25);
        const result = graph.parameters!.write('curvature-t', 1.5, 'learner');
        expect(result.status).toBe('refused-domain');
        view.unmount();
    });

    test('no board text repeats the readout: only the tags T, N and E remain, and the live region still hears E', () => {
        const {graph, view} = setup();
        const owned = (name: 'overlay' | 'evolute') => (graph as unknown as Record<string, {ownedElements(): {elType: string}[]}>)[name].ownedElements().filter(element => element.elType === 'text');
        expect(owned('overlay').length).toBe(2); // T and N
        expect(owned('evolute').length).toBe(1); // E
        view.unmount();
    });

    test('the watched box includes the evolute where it stays near the curve, and drops it where it runs off', () => {
        const {graph, declaration, view} = setup();
        const full = declaration();
        expect(polylines(full).length).toBeGreaterThan(0);
        const follow = full.followView!;
        // The parabola's control points span 2 by 2 and its evolute x in [-4, 4], y in [0.5, 3.5]: the box covers the evolute, not the lesson scene's widened box.
        expect(follow[0]).toBeLessThan(-4);
        expect(follow[2]).toBeGreaterThan(4);
        expect(follow[2] - follow[0]).toBeLessThanOrEqual(12);
        act(() => trace('hidden')(graph));
        expect(polylines(declaration())).toEqual([]);
        expect(declaration().followView![2] - declaration().followView![0]).toBeLessThan(follow[2] - follow[0]);
        view.unmount();
    });

    test('the S cubic keeps the view on the curve and its cusps', () => {
        const {declaration, view} = setup(curve(S_CUBIC), at(0.19));
        const follow = declaration().followView!;
        expect(follow[2] - follow[0]).toBeLessThanOrEqual(9);
        expect(follow[1] - follow[3]).toBeLessThanOrEqual(9);
        view.unmount();
    });

    test('the sentences follow a language switch', () => {
        const {declaration, view} = setup(curve(S_CUBIC), at(0.5));
        act(() => setLanguage('en'));
        expect(renderMessage(declaration().notes![1].text as Message)).toMatch(/^No evolute point/);
        view.unmount();
    });
});
