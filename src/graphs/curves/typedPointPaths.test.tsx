/** Wave 2 slice K4: the curve boards without the structured list get the shared edit-only typed point list; one typed coordinate reaches the model and the drawn point. */
import {act, screen} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../base/realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {enterNumber} from '../../inputs/testEntry';
import {curveAccess} from '../base/curveGraphTestAccess';
import BaseCurveGraph from '../base/BaseCurveGraph';
import {curvePointName} from '../base/CurvePointControls';

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

async function mountReady(id: DemonstrationId) {
    const graph = createGraph(id);
    mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    await waitUntil(() => screen.queryByRole('spinbutton', {name: 'p₀, x'}) !== null);
    return graph;
}

test('spline-g1: a typed free point recomputes the junction, in the model and in the drawn junction point', async () => {
    const graph = await mountReady('spline-g1');
    const curve = curveAccess(graph).first() as unknown as {getCurve(): unknown; getAllNonFreeJxgPoints(): {X(): number; Y(): number}[]};
    const model = curve.getCurve() as unknown as {getNonFreePoints(): {X(): number; Y(): number}[]};
    const junctions = () => model.getNonFreePoints().map(point => [point.X(), point.Y()]);
    const drawn = () => curve.getAllNonFreeJxgPoints().map(point => [point.X(), point.Y()]);
    expect(drawn()).toEqual(junctions());
    const before = junctions();
    // Every free coordinate moves: whichever free points a junction sits between, it must follow.
    const count = screen.getAllByRole('spinbutton', {name: /^p[₀-₉]+, x$/}).length;
    for (const name of Array.from({length: count}, (_, index) => [`${curvePointName(undefined, index)}, x`, `${curvePointName(undefined, index)}, y`]).flat()) {
        const field = screen.getByRole('spinbutton', {name}) as HTMLInputElement;
        enterNumber(field, String(Number(field.value.replace(',', '.')) + 1.5));
    }
    expect(junctions()).not.toEqual(before);
    expect(drawn()).toEqual(junctions());
});

test('rational: a typed point keeps every weight', async () => {
    const graph = await mountReady('rational');
    const curve = curveAccess(graph).first().getCurve() as unknown as {getWeights(): number[]; setWeights(weights: number[]): void};
    const weights = curve.getWeights().map((_, index) => 1 + index / 4);
    curve.setWeights(weights);
    enterNumber(screen.getByRole('spinbutton', {name: 'p₀, x'}), '2.75');
    expect(curve.getWeights()).toEqual(weights);
});

describe('a typed point refits the view only when it lies outside it (decision 6)', () => {
    test.each(['decasteljau', 'spline-c1'] as DemonstrationId[])('%s', async id => {
        const graph = await mountReady(id);
        const board = curveAccess(graph).board();
        const view = () => board.getBoundingBox().join(',');
        const field = screen.getByRole('spinbutton', {name: 'p₀, y'}) as HTMLInputElement;
        const [left, top, right, bottom] = board.getBoundingBox();
        const inside = ((top + bottom) / 2 + (top - bottom) / 4).toFixed(3);
        const viewBefore = view();
        enterNumber(field, inside);
        expect(view()).toBe(viewBefore);
        enterNumber(field, String(Math.round(top + 10 * (top - bottom))));
        const [, newTop, , newBottom] = board.getBoundingBox();
        expect(newTop).toBeGreaterThan(top + 5 * (top - bottom));
        expect(Math.min(left, right)).toBeLessThanOrEqual(Math.max(left, right));
        expect(newBottom).toBeLessThan(newTop);
    });
});

test('subdivision: the typed list is named by its curve once the board has several curves (nothing selected lists curve 1)', async () => {
    const graph = await mountReady('subdivision');
    expect(screen.getByText('Koordinate točk')).toBeTruthy();
    act(() => { (curveAccess(graph).first() as unknown as {subdivide(t: number): unknown}).subdivide(0.5); });
    expect((graph as unknown as {jxgCurves: unknown[]}).jxgCurves.length).toBeGreaterThan(1);
    expect(screen.getByText('Krivulja 1: točke')).toBeTruthy();
    expect(screen.queryByText('Koordinate točk')).toBeNull();
});

test('decasteljau: a single-curve board keeps the plain list title', async () => {
    await mountReady('decasteljau');
    expect(screen.getByText('Koordinate točk')).toBeTruthy();
});
