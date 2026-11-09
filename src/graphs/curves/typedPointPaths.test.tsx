/** Wave 2 slice K4: the curve boards without the structured list get the shared edit-only typed point list; one typed coordinate reaches the model and the drawn point. */
import {act, screen} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../base/realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {enterNumber} from '../../inputs/testEntry';
import {curveAccess} from '../base/curveGraphTestAccess';
import BaseCurveGraph from '../base/BaseCurveGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const GROUPS: Record<string, DemonstrationId[]> = {
    bezier: ['decasteljau', 'decasteljau-alternative', 'affine', 'subdivision', 'repeated-subdivision', 'extrapolation', 'elevation'],
    reduction: ['reduction'],
    arclength: ['arc-length-param'],
    rational: ['rational', 'rational-decasteljau', 'rational-elevation', 'rational-extrapolation', 'rational-subdivision', 'farin', 'circle'],
    spline: ['spline-cn', 'spline-c1', 'spline-c2', 'spline-g1', 'spline-g1-symmetric'],
};

describe.each(Object.entries(GROUPS))('typed point path: %s boards', (_group, ids) => {
    test.each(ids)('%s: a typed coordinate moves the first free point and its drawn point', async id => {
        const graph = createGraph(id);
        mountGraph(graph);
        await waitUntil(() => graph.state.initialized === true);
        await waitUntil(() => screen.queryByRole('spinbutton', {name: 'p₀, x'}) !== null);
        const access = curveAccess(graph);
        const free = () => (graph as unknown as BaseCurveGraph<never>)['typedPointsOf'](access.first());
        const before = free()[0].Y();
        enterNumber(screen.getByRole('spinbutton', {name: 'p₀, x'}), '2.75');
        expect(free()[0].X()).toBe(2.75);
        expect(free()[0].Y()).toBe(before);
        act(() => undefined);
        expect(access.first().getJxgPoints()[0].X()).toBe(2.75);
    });
});

test.each<[DemonstrationId, boolean]>([['spline-c1', false], ['spline-g1', true]])('%s: the list has the free points only, never a computed junction', async (id, listsComputed) => {
    const graph = createGraph(id);
    mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    await waitUntil(() => screen.queryByRole('spinbutton', {name: 'p₀, x'}) !== null);
    const spline = curveAccess(graph).first().getCurve() as unknown as {getNonFreePoints(): unknown[]; getPoints(): unknown[]};
    const typed = (graph as unknown as BaseCurveGraph<never>)['typedPointsOf'](curveAccess(graph).first());
    expect(typed.some(point => spline.getNonFreePoints().includes(point))).toBe(false);
    expect(typed.length < spline.getPoints().length).toBe(listsComputed);
    expect(screen.getAllByRole('spinbutton', {name: /^p[₀-₉]+, x$/})).toHaveLength(typed.length);
});
