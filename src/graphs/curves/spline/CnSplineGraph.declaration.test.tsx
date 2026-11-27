import {act, within} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import CnSplineGraph from './CnSplineGraph';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage, t} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import type {BezierSpline} from '../../../bezeg/impl/curve/bezier-spline';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

/** Exposes the protected lesson replacement the way a lesson scene reaches it. */
class ReplacingGraph extends CnSplineGraph {
    replaceCurve(points: [number, number][], degree: number, continuity: number): void {
        this.runLessonReplacement({
            importData: () => this.importPresetData([['JSXGenericSplineCurve', {points, degree, continuity, state: {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false}}]]),
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

const small: [number, number][] = [[-4, 1], [-2, -2], [0, -3], [4, 0]];
const amplified: [number, number][] = [[-3, 2], [-4, 0.5], [-3.5, -1], [-1.5, -2], [0.5, 0], [2.5, 1.5], [4, -2]];

const joinsOf = (graph: CnSplineGraph) => (graph.getFirstCurve() as BezierSpline).getNonFreePoints().map(point => ({kind: 'point', x: point.X(), y: point.Y()}));

describe('spline-cn declares through BaseSplineCurveGraph', () => {
    for (const [name, points, degree, continuity] of [['two pieces (n=2, r=1)', small, 2, 1], ['amplified (n=3, r=2): derived points far away', amplified, 3, 2]] as const) {
        test(`${name}: consistent, the legend resolves, marks hold the free points and every derived point`, () => {
            const {graph, declaration, view} = setup();
            act(() => runAs('lesson', () => graph.replaceCurve([...points], degree, continuity)));
            const current = declaration();
            expect(checkDeclaration(current)).toEqual([]);
            expect(current.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0']);
            for (const entry of current.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toBeDefined();

            const must = current.marks!.must;
            for (const [x, y] of points) expect(must, `free point ${x},${y}`).toContainEqual({kind: 'point', x, y});
            const derived = joinsOf(graph);
            expect(derived.length).toBeGreaterThan(0);
            for (const point of derived) expect(must, 'derived point').toContainEqual(point);
            view.unmount();
        });
    }

    test('followView is a box around the free points and the derived points that fly far away', () => {
        const {graph, declaration, view} = setup();
        act(() => runAs('lesson', () => graph.replaceCurve([...amplified], 3, 2)));
        const [left, top, right, bottom] = declaration().followView!;
        for (const point of [...amplified, ...joinsOf(graph).map(p => [p.x, p.y] as [number, number])]) {
            expect(point[0]).toBeGreaterThan(left);
            expect(point[0]).toBeLessThan(right);
            expect(point[1]).toBeGreaterThan(bottom);
            expect(point[1]).toBeLessThan(top);
        }
        expect(right).toBeGreaterThan(50);
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

    test('the pucks replace the Orodja copies; the continuity and degree counters stay in the construction card', async () => {
        const {view} = setup();
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="control-polygon-0"]') !== null);
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['control-polygon-0', 'convex-hull-0']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('control_polygon')}`))).toEqual([]);
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('convex_hull')}`))).toEqual([]);
        expect(within(root).getAllByLabelText(new RegExp(`^${t('hide_fixed_points')}`)).length).toBeGreaterThan(0);
        expect(within(root).getByRole('group', {name: t('continuity_order')})).toBeDefined();
        expect(within(root).getByRole('group', {name: t('spline_degree')})).toBeDefined();
        view.unmount();
    });
});
