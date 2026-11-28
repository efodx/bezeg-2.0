import {act} from '@testing-library/react';
import {beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import BezierCurveGraph from './BezierCurveGraph';
import RationalElevationGraph from '../rational/RationalElevationGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {checkDeclaration, type GraphDeclaration} from '../../base/declare/graphDeclaration';
import {setLanguage} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

type Probe = {performAction(id: string): void; drawnObject(id: string): {color: string; visible: boolean} | undefined};

type Editable = {getFirstJxgCurve(): {addPoint(x: number, y: number): void; removePoint(i: number): void}};

/** The default curve edited as a student edits it: points added at the end or removed by index. */
const states: {name: string; edit: (curve: ReturnType<Editable['getFirstJxgCurve']>) => void; points: number[][]}[] = [
    {name: 'default', edit: () => undefined, points: [[-4, -3], [-3, 2], [2, 2], [3, -2]]},
    {name: 'five points', edit: curve => curve.addPoint(4, 1), points: [[-4, -3], [-3, 2], [2, 2], [3, -2], [4, 1]]},
    {name: 'six points', edit: curve => { curve.addPoint(4, 1); curve.addPoint(5, -1); }, points: [[-4, -3], [-3, 2], [2, 2], [3, -2], [4, 1], [5, -1]]},
    {name: 'three points', edit: curve => curve.removePoint(1), points: [[-4, -3], [2, 2], [3, -2]]},
    {name: 'two points', edit: curve => { curve.removePoint(0); curve.removePoint(0); }, points: [[2, 2], [3, -2]]},
];

describe('Bezier curve declares through BaseCurveGraph', () => {
    for (const {name, edit, points} of states) {
        test(`${name}: consistent, legend resolves to drawn objects, marks follow the control points`, () => {
            const graph = new BezierCurveGraph();
            mountGraph(graph);
            act(() => edit((graph as unknown as Editable).getFirstJxgCurve()));
            const declaration = graph.getDeclaration() as GraphDeclaration;
            expect(checkDeclaration(declaration)).toEqual([]);
            for (const entry of declaration.legend ?? []) expect((graph as unknown as Probe).drawnObject(entry.object), entry.id).toBeDefined();
            expect(declaration.legend?.map(entry => entry.id)).toEqual(['curve-0', 'control-points-0']);
            expect(declaration.marks?.must).toEqual(points.map(([x, y]) => ({kind: 'point', x, y})));
            const polyline = declaration.marks?.nice?.[0];
            expect(polyline?.kind).toBe('polyline');
            if (polyline?.kind === 'polyline') {
                expect(polyline.points[0]).toEqual(points[0]);
                expect(polyline.points[polyline.points.length - 1]).toEqual(points[points.length - 1]);
            }
        });
    }

    test('the display switches are actions that flip `pressed`; control polygon and hull are board pucks, the rest stays in Orodja', () => {
        const graph = new BezierCurveGraph();
        mountGraph(graph);
        const probe = graph as unknown as Probe;
        const actions = () => new Map((graph.getDeclaration()?.actions ?? []).map(action => [action.id as string, action]));
        expect([...actions().keys()]).toEqual(['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0']);
        expect(actions().get('control-polygon-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions().get('convex-hull-0')).toMatchObject({placement: 'board', puck: true});
        expect(actions().get('control-points-0')).toMatchObject({placement: 'tools', section: 'display'});
        expect(actions().get('point-labels')).toMatchObject({placement: 'tools', section: 'display'});
        for (const id of ['point-labels', 'control-polygon-0', 'convex-hull-0', 'control-points-0']) {
            const before = actions().get(id)!.pressed;
            act(() => probe.performAction(id));
            expect(actions().get(id)!.pressed, id).toBe(!before);
            act(() => probe.performAction(id));
            expect(actions().get(id)!.pressed, id).toBe(before);
        }
        expect(() => probe.performAction('nope')).toThrow('Unknown action');
    });

    test('a curve graph that has not opted in stays undeclared', () => {
        const graph = new RationalElevationGraph();
        mountGraph(graph);
        expect(graph.getDeclaration()).toBeUndefined();
    });
});
