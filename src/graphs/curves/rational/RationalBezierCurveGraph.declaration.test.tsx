import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import RationalBezierCurveGraph from './RationalBezierCurveGraph';
import RationalElevationGraph from './RationalElevationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {runAs} from '../../base/writes/writeSource';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {performAction(id: string): void; drawnObject(id: string): {color: string; visible: boolean} | undefined};
type Rational = {getFirstJxgCurve(): {getCurve(): {setWeights(weights: number[]): void}; addPoint(x: number, y: number): void}; boardUpdate(): void};

const POINTS = [[-4, -3], [-3, 3], [3, 3], [4, -3]];
const states: {name: string; edit: (graph: Rational) => void; points: number[][]}[] = [
    {name: 'default', edit: () => undefined, points: POINTS},
    {name: 'weights 1, 4, 1, 1', edit: g => g.getFirstJxgCurve().getCurve().setWeights([1, 4, 1, 1]), points: POINTS},
    {name: 'weights 2, 0.5, 3, 1.25', edit: g => g.getFirstJxgCurve().getCurve().setWeights([2, 0.5, 3, 1.25]), points: POINTS},
    {name: 'five points', edit: g => g.getFirstJxgCurve().addPoint(4, 1), points: [...POINTS, [4, 1]]},
    {name: 'six points', edit: g => { g.getFirstJxgCurve().addPoint(4, 1); g.getFirstJxgCurve().addPoint(5, -1); }, points: [...POINTS, [4, 1], [5, -1]]},
];

const sample = (declaration: GraphDeclaration) => {
    const polyline = declaration.marks?.nice?.[0];
    return polyline?.kind === 'polyline' ? polyline.points : [];
};

describe('rational Bezier curve declares through BaseRationalCurveGraph', () => {
    for (const {name, edit, points} of states) {
        test(`${name}: consistent, legend resolves to drawn objects, marks follow the control points`, () => {
            const graph = new RationalBezierCurveGraph();
            mountGraph(graph);
            act(() => runAs('learner', () => { edit(graph as unknown as Rational); (graph as unknown as Rational).boardUpdate(); }));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toBeDefined();
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0']);
            expect(declaration.marks?.must).toEqual(points.map(([x, y]) => ({kind: 'point', x, y})));
            expect(sample(declaration).length).toBeGreaterThan(1);
        });
    }

    test('the marked samples depend on the weights, not only on the points', () => {
        const graph = new RationalBezierCurveGraph();
        mountGraph(graph);
        const before = JSON.stringify(sample(graph.getDeclaration() as GraphDeclaration));
        act(() => runAs('learner', () => { (graph as unknown as Rational).getFirstJxgCurve().getCurve().setWeights([1, 4, 1, 1]); (graph as unknown as Rational).boardUpdate(); }));
        expect(JSON.stringify(sample(graph.getDeclaration() as GraphDeclaration))).not.toBe(before);
    });

    test('the weights switch flips `pressed` as a display action in Orodja; polygon and hull are board pucks', () => {
        const graph = new RationalBezierCurveGraph();
        mountGraph(graph);
        const probe = graph as unknown as Probe;
        const actions = () => new Map((graph.getDeclaration()?.actions ?? []).map(action => [action.id as string, action]));
        expect([...actions().keys()]).toEqual(['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0', 'weights-0']);
        expect(actions().get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions().get('weights-0')).toMatchObject({placement: 'tools', section: 'display', pressed: true});
        for (const id of ['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0', 'weights-0']) {
            const before = actions().get(id)!.pressed;
            act(() => probe.performAction(id));
            expect(actions().get(id)!.pressed, id).toBe(!before);
            act(() => probe.performAction(id));
            expect(actions().get(id)!.pressed, id).toBe(before);
        }
    });

    test('a rational subclass that has not opted in stays undeclared', () => {
        const graph = new RationalElevationGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()).toBeUndefined();
    });
});
