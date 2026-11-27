import {act, within} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import C2SplineGraph from './C2SplineGraph';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage, t} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import type {BezierSpline} from '../../../bezeg/impl/curve/bezier-spline';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the protected lesson replacement the way a lesson scene reaches it. */
class ReplacingGraph extends C2SplineGraph {
    replaceCurve(points: [number, number][]): void {
        this.runLessonReplacement({
            importData: () => this.importPresetData([['JSXQubicC2SplineCurve', {points, degree: 3, continuity: 3, state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false}}]]),
            afterImport: () => undefined, state: () => ({...this.getInitialState(), ...this.lessonDefaultState()}), transientState: undefined,
        });
    }
}

type Probe = {performAction(id: string): void; drawnObject(id: string): {color: string; visible: boolean} | undefined};

function setup() {
    const graph = new ReplacingGraph();
    const {view} = mountGraph(graph);
    return {graph, view, declaration: () => graph.getDeclaration() as GraphDeclaration};
}

const six: [number, number][] = [[-6, -1], [-5, 3], [-3, -3], [3, 0], [5, 2], [6, -2]];
const seven: [number, number][] = [[-2.7, 1.8], [-4.7, 0.35], [-4.3, -3], [1, -2], [0.2, 1.8], [4, 1], [4.5, -2.3]];
const far: [number, number][] = [[-30, -2], [-20, 20], [-10, -20], [10, 20], [20, 20], [30, -1]];

const joinsOf = (graph: C2SplineGraph) => (graph.getFirstCurve() as BezierSpline).getNonFreePoints().map(point => ({kind: 'point', x: point.X(), y: point.Y()}));

describe('spline-c2 declares through BaseSplineCurveGraph', () => {
    for (const [name, points] of [['six points (the lesson spline)', six], ['seven points (the default)', seven]] as const) {
        test(`${name}: consistent, the legend resolves, marks hold the free points, the derived points and every piece`, () => {
            const {graph, declaration, view} = setup();
            act(() => runAs('lesson', () => graph.replaceCurve([...points])));
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect(current.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0']);
            for (const entry of current.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toBeDefined();

            const must = current.marks!.must;
            for (const [x, y] of points) expect(must, `free point ${x},${y}`).toContainEqual({kind: 'point', x, y});
            const derived = joinsOf(graph);
            expect(derived.length).toBeGreaterThan(0);
            for (const point of derived) expect(must, 'derived point').toContainEqual(point);

            const polyline = current.marks!.nice![0];
            expect(polyline.kind).toBe('polyline');
            if (polyline.kind === 'polyline') {
                expect(polyline.points[0]).toEqual(points[0]);
                expect(polyline.points[polyline.points.length - 1]).toEqual(points[points.length - 1]);
            }
            view.unmount();
        });
    }

    test('followView is a box around the free points and the derived points, so the spline fills the card-free strip', () => {
        const {graph, declaration, view} = setup();
        act(() => runAs('lesson', () => graph.replaceCurve([...six])));
        const [left, top, right, bottom] = declaration().followView!;
        for (const [x, y] of six) {
            expect(x).toBeGreaterThan(left);
            expect(x).toBeLessThan(right);
            expect(y).toBeGreaterThan(bottom);
            expect(y).toBeLessThan(top);
        }
        act(() => runAs('lesson', () => graph.replaceCurve([...far])));
        const moved = declaration().followView!;
        expect(moved[0]).toBeLessThan(-30);
        expect(moved[2]).toBeGreaterThan(30);
        expect(moved[1]).toBeGreaterThan(20);
        view.unmount();
    });

    test('the control polygon and convex hull are board pucks that flip `pressed`; labels and points stay in Orodja', () => {
        const {graph, declaration, view} = setup();
        const probe = graph as unknown as Probe;
        const actions = () => new Map((declaration().actions ?? []).map(action => [action.id as string, action]));
        expect([...actions().keys()]).toEqual(['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0']);
        expect(actions().get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions().get('convex-hull-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions().get('control-points-0')).toMatchObject({placement: 'tools', section: 'display'});
        for (const id of ['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0']) {
            const was = actions().get(id)!.pressed;
            act(() => probe.performAction(id));
            expect(actions().get(id)!.pressed, id).toBe(!was);
            act(() => probe.performAction(id));
            expect(actions().get(id)!.pressed, id).toBe(was);
        }
        view.unmount();
    });

    test('the control polygon and hull are pucks and Orodja holds no second copy of them', async () => {
        const {view} = setup();
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="control-polygon-0"]') !== null);
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['control-polygon-0', 'convex-hull-0']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('control_polygon')}`))).toEqual([]);
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('convex_hull')}`))).toEqual([]);
        expect(within(root).getAllByLabelText(new RegExp(`^${t('hide_fixed_points')}`)).length).toBeGreaterThan(0);
        view.unmount();
    });
});
