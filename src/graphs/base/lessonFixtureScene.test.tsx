/**
 * Lesson fixture scenes on the real graphs: a `prepared-scene` with `source: 'lesson-fixture'` replaces the default
 * scene's curve inputs synchronously, is checked before anything changes, restores through checkpoints and leaves the
 * free-exploration default intact.
 */
import {act} from '@testing-library/react';
import {graphFactories} from '../graphFactories';
import type {DemonstrationId} from '../../demonstrations';
import type {LessonAction, LessonCurveFixture, LessonViewBox} from '../../learning/model';
import {installBoardShims, MountedGraph, mountGraph, observeScene} from './realGraphTestHarness';

beforeAll(installBoardShims);

const fixture = (curve: LessonCurveFixture, view?: LessonViewBox): LessonAction =>
    ({kind: 'prepared-scene', sceneId: 'fixture', source: 'lesson-fixture', curve, ...(view ? {view} : {})});
const DEFAULT_SCENE: LessonAction = {kind: 'prepared-scene', sceneId: 'default', source: 'demonstration-default'};

function withGraph(id: DemonstrationId, run: (mounted: MountedGraph, apply: (...actions: LessonAction[]) => void) => void) {
    const mounted = mountGraph(graphFactories[id]());
    const capabilities = mounted.graph.getLessonCapabilities();
    try {
        run(mounted, (...actions) => act(() => actions.forEach(action => capabilities.apply(action))));
    } finally {
        mounted.view.unmount();
    }
}

const curveData = (mounted: MountedGraph) => (observeScene(mounted.graph).data as [string, {points: number[][]; weights?: number[]; hodographs?: number[][]; state?: Record<string, unknown>}][]);

test('a Bézier fixture replaces the control points and sets the view; the default scene returns the demonstration default', () => {
    withGraph('bezier', (mounted, apply) => {
        const defaults = curveData(mounted);
        apply(fixture({points: [[-3, -2], [-3, 2], [3, 2], [3, -2]]}, [-5, 4, 5, -4]));
        expect(curveData(mounted)[0][1].points).toEqual([[-3, -2], [-3, 2], [3, 2], [3, -2]]);
        const [left, top, right, bottom] = observeScene(mounted.graph).view as number[];
        // Equal axis units may widen one axis, never cut the requested box.
        expect(left).toBeLessThanOrEqual(-5);
        expect(right).toBeGreaterThanOrEqual(5);
        expect(top).toBeGreaterThanOrEqual(4);
        expect(bottom).toBeLessThanOrEqual(-4);
        apply(DEFAULT_SCENE);
        expect(curveData(mounted)).toEqual(defaults);
    });
});

test('a later action in the same tick reads the fixture scene', () => {
    withGraph('farin', (mounted, apply) => {
        // Three weights match only the fixture's quadratic, not the default cubic.
        apply(fixture({points: [[-3, -2], [0, 3], [3, -2]], weights: [1, 1, 1]}),
            {kind: 'rational-weights', weights: [1, 2, 1]});
        const [, dto] = curveData(mounted)[0];
        expect(dto.points).toHaveLength(3);
        expect(observeScene(mounted.graph).curves).toMatchObject([{effectiveWeights: [1, 2, 1]}]);
    });
});

test('PH fixtures replace the generating point and hodograph', () => {
    withGraph('ph-quintic', (mounted, apply) => {
        apply(fixture({points: [[-2, -1]], hodographs: [[2, 0], [2, 1], [1, 1]]}));
        const [, dto] = curveData(mounted)[0];
        expect(dto.points).toEqual([[-2, -1]]);
        expect(dto.hodographs).toEqual([[2, 0], [2, 1], [1, 1]]);
    });
});

test('G1 fixtures drop the default junction ratios unless given', () => {
    withGraph('spline-g1', (mounted, apply) => {
        apply(fixture({points: [[-3, 0], [-1, 2], [1, -1], [3, 1]]}));
        expect(curveData(mounted)[0][1].points).toHaveLength(4);
        apply(fixture({points: [[-3, 0], [-1, 2], [1, -1], [3, 1]], splineRatios: [2]}));
        expect(curveData(mounted)[0][1].state?.b).toEqual([2]);
    });
});

test.each<[DemonstrationId, LessonCurveFixture, LessonViewBox | undefined]>([
    ['rational', {points: [[0, 0], [1, 1], [2, 0]], weights: [1, 1]}, undefined],
    ['ph-quintic', {points: [[0, 0]], hodographs: [[1, 0], [1, 1]]}, undefined],
    ['spline-g1', {points: [[-3, 0], [-1, 2], [1, -1], [3, 1]], splineRatios: [1, 1]}, undefined],
    ['bezier', {points: [[0, 0], [Number.NaN, 1]]}, undefined],
    ['bezier', {points: [[0, 0], [1, 1]]}, [1, 1, 0, 0]],
])('an invalid %s fixture is rejected without changing the scene', (id, curve, view) => {
    withGraph(id, (mounted, apply) => {
        const before = observeScene(mounted.graph);
        expect(() => apply(fixture(curve, view))).toThrow(/lesson (geometry|view)/);
        expect(observeScene(mounted.graph)).toEqual(before);
    });
});

test('repeated preparation and checkpoint restore keep one curve and its board objects', () => {
    withGraph('bezier', (mounted, apply) => {
        const capabilities = mounted.graph.getLessonCapabilities();
        const quadratic = fixture({points: [[-3, -2], [0, 4], [3, -2]]});
        apply(quadratic);
        const once = observeScene(mounted.graph);
        const checkpoint = capabilities.captureState();
        apply(quadratic, quadratic, fixture({points: [[-4, 0], [-1, 3], [1, -3], [4, 0]]}));
        act(() => capabilities.restoreState(checkpoint));
        expect(observeScene(mounted.graph)).toEqual(once);
        apply(quadratic);
        expect(observeScene(mounted.graph)).toEqual(once);
    });
});

test('a graph without fixture support rejects the action as unsupported', () => {
    withGraph('linear-function', (_mounted, apply) => {
        expect(() => apply(fixture({points: [[0, 0], [1, 1]]}))).toThrow(/does not support lesson action/);
    });
});
