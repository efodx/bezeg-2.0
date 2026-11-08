/** The curve workspace's shared point decisions on real graphs: typed add and edit, the view (decision 6), the minimum (C2) and the PH hodograph list. */
import {act, fireEvent, screen} from '@testing-library/react';
import {t} from '../../localization';
import {appStorage} from '../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, settle, waitUntil} from './realGraphTestHarness';
import type {DemonstrationId} from '../../demonstrations';
import {enterNumber} from '../../inputs/testEntry';
import {SelectedCurveOption} from './CurveEditingFeature';
import {curveAccess} from './curveGraphTestAccess';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const WIDE: [number, number, number, number] = [-50, 50, 50, -50];

async function mountSelected(id: DemonstrationId, firstField = 'p₀, x') {
    const graph = createGraph(id);
    const mounted = mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    const access = curveAccess(graph);
    act(() => { access.select(); });
    await waitUntil(() => screen.queryByRole('spinbutton', {name: firstField}) !== null);
    return {graph, mounted, access, curve: access.first, points: access.points};
}

const field = (name: string) => screen.getByRole('spinbutton', {name});
type Graph = ReturnType<typeof createGraph>;
const box = (graph: Graph) => curveAccess(graph).board().getBoundingBox();
const setBox = (graph: Graph, view: [number, number, number, number]) => act(() => { curveAccess(graph).board().setBoundingBox(view, false); });
const entry = (axis: 'x' | 'y') => screen.getByRole('spinbutton', {name: t('point_controls_new_axis', {value0: axis})});
const addAt = (x: string, y: string) => {
    enterNumber(entry('x'), x); enterNumber(entry('y'), y);
    act(() => { fireEvent.click(screen.getByRole('button', {name: t('point_controls_add_at')})); });
};

describe('curve workspace point decisions on Bezier', () => {
    test('decision 1: Add puts the point one unit right of the last; typed coordinates win exactly', async () => {
        const {points} = await mountSelected('bezier');
        const last = [points().at(-1)!.X(), points().at(-1)!.Y()];
        act(() => { fireEvent.click(document.querySelector<HTMLElement>('.point-collection button[aria-label="' + t('increase_count') + '"]')!); });
        expect([points().at(-1)!.X(), points().at(-1)!.Y()]).toEqual([last[0] + 1, last[1]]);
        addAt('6.25', '-1.125');
        expect([points().at(-1)!.X(), points().at(-1)!.Y()]).toEqual([6.25, -1.125]);
    });

    test('decision 6: a typed add or edit outside the view refits it, inside it never moves it; a drag never does', async () => {
        const {graph, points, curve} = await mountSelected('bezier');
        setBox(graph, WIDE);
        addAt('3', '3');
        expect(box(graph)).toEqual(WIDE);
        enterNumber(field('p₀, x'), '4');
        expect(box(graph)).toEqual(WIDE);
        const drag = (point: unknown) => (point as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
        act(() => { const jxg = curve().getJxgPoints()[1]; jxg.moveTo([900, 900]); drag(jxg); });
        expect(box(graph)).toEqual(WIDE);
        addAt('900', '900');
        expect(box(graph)).not.toEqual(WIDE);
        setBox(graph, WIDE);
        enterNumber(field('p₀, y'), '800');
        expect(box(graph)).not.toEqual(WIDE);
        expect(points()[0].Y()).toBe(800);
    });

    test('a typed coordinate gives the same point as a drag to it', async () => {
        const {points, curve} = await mountSelected('bezier');
        enterNumber(field('p₀, x'), '2.5');
        enterNumber(field('p₀, y'), '-1.25');
        const jxg = curve().getJxgPoints()[1];
        act(() => { jxg.moveTo([2.5, -1.25]); (jxg as unknown as {triggerEventHandlers(n: string[], a: unknown[]): void}).triggerEventHandlers(['drag'], []); });
        expect([points()[0].X(), points()[0].Y()]).toEqual([points()[1].X(), points()[1].Y()]);
        expect([points()[0].X(), points()[0].Y()]).toEqual([2.5, -1.25]);
    });

    test('a board drag shows in the list', async () => {
        const {curve} = await mountSelected('bezier');
        const jxg = curve().getJxgPoints()[2];
        act(() => { jxg.moveTo([3.5, 1.5]); (jxg as unknown as {triggerEventHandlers(n: string[], a: unknown[]): void}).triggerEventHandlers(['drag'], []); (curve().board as unknown as {triggerEventHandlers(n: string[], a: unknown[]): void}).triggerEventHandlers(['up'], []); });
        expect(field('p₂, x')).toHaveAttribute('aria-valuenow', '3.5');
    });

    test('C2: the last point stays, with its reason, from the list and from a board Delete click', async () => {
        const {access, points, curve} = await mountSelected('bezier');
        const removeButtons = () => [...document.querySelectorAll<HTMLElement>('.point-list-remove')];
        while (points().length > 1) act(() => { fireEvent.click(removeButtons()[0]); });
        const reason = t('count_at_minimum', {value0: '1'});
        act(() => { fireEvent.click(removeButtons()[0]); });
        expect(points()).toHaveLength(1);
        expect(document.querySelector('[data-point-reason]')?.textContent).toBe(reason);
        // The board: Delete mode, a click on the remaining point.
        act(() => { access.deleteMode(SelectedCurveOption.DELETE_POINTS); });
        const jxg = curve().getJxgPoints()[0];
        const editing = access.editing();
        vi.spyOn(editing, 'getMouseCoords').mockReturnValue(new JXG.Coords(JXG.COORDS_BY_USER, [jxg.X(), jxg.Y()], access.board()));
        act(() => editing.handleDown({} as PointerEvent));
        expect(points()).toHaveLength(1);
        expect(document.querySelector('[data-refusal-notice]')?.textContent).toBe(reason);
        // The next accepted edit clears it.
        act(() => { fireEvent.click(document.querySelector<HTMLElement>('.point-collection button[aria-label="' + t('increase_count') + '"]')!); });
        expect(document.querySelector('[data-refusal-notice]')?.textContent).toBe('');
    });
    const refuseLastDeletion = async () => {
        const mounted = await mountSelected('bezier');
        const {access, points, curve} = mounted;
        const removeButtons = () => [...document.querySelectorAll<HTMLElement>('.point-list-remove')];
        while (points().length > 1) act(() => { fireEvent.click(removeButtons()[0]); });
        act(() => { access.deleteMode(SelectedCurveOption.DELETE_POINTS); });
        const jxg = curve().getJxgPoints()[0];
        const editing = access.editing();
        vi.spyOn(editing, 'getMouseCoords').mockReturnValue(new JXG.Coords(JXG.COORDS_BY_USER, [jxg.X(), jxg.Y()], access.board()));
        act(() => editing.handleDown({} as PointerEvent));
        expect(access.refusal()).toBeDefined();
        return mounted;
    };
    test('the shown refusal is cleared by Reset', async () => {
        const {graph, access} = await refuseLastDeletion();
        await settle(() => graph.reset());
        expect(access.refusal()).toBeUndefined();
    });
    test('the shown refusal is cleared by selecting a preset', async () => {
        const {graph, access} = await refuseLastDeletion();
        await settle(() => graph.selectPreset(''));
        expect(access.refusal()).toBeUndefined();
    });
    test('the shown refusal is cleared by a lesson scene restore', async () => {
        const {access} = await refuseLastDeletion();
        await settle(async () => access.restoreLessonScene());
        expect(access.refusal()).toBeUndefined();
    });
});

describe('curve workspace point removal', () => {
    test('a per-row remove keeps focus on the remove button at that index, else the previous, else the collection', async () => {
        await mountSelected('bezier');
        const remove = (n: number) => screen.getByRole('button', {name: t('point_controls_remove_named', {value0: 'p' + '₀₁₂₃₄₅'[n]})});
        const press = (n: number) => act(() => { const b = remove(n); b.focus(); fireEvent.click(b); });
        const count = () => document.querySelectorAll('.point-list-remove').length;
        const before = count();
        press(1);
        expect(count()).toBe(before - 1);
        expect(document.activeElement).toBe(remove(1));
        press(count() - 1);
        expect(document.activeElement).toBe(remove(count() - 1));
        while (count() > 2) press(count() - 1);
        press(0);
        expect(count()).toBe(1);
        expect(document.activeElement).toBe(remove(0));
    });
});

describe('curve workspace on the PH hodograph', () => {
    test('a typed w keeps its value in the list field', async () => {
        const {access} = await mountSelected('ph-cubic', 'w₀, x');
        enterNumber(field('w₀, x'), '-3');
        expect(field('w₀, x')).toHaveAttribute('aria-valuenow', '-3');
        expect(access.phPoints()![0].X()).toBe(-3);
    });
    test('the hodograph list edits the w points', async () => {
        const {access} = await mountSelected('ph-cubic', 'w₀, x');
        const w = () => access.phPoints()!;
        enterNumber(field('w₁, y'), '2.5');
        expect(w()[1].Y()).toBe(2.5);
        expect(document.querySelector('.point-collection')).toBeNull();
    });
    test('decision 6: a typed w outside the hodograph view refits that board; inside it never moves it', async () => {
        const {access} = await mountSelected('ph-cubic', 'w₀, x');
        const hodograph = access.hodographBoard()!;
        const view: [number, number, number, number] = [-50, 50, 50, -50];
        act(() => { hodograph.setBoundingBox(view, false); });
        enterNumber(field('w₁, y'), '2.5');
        expect(hodograph.getBoundingBox()).toEqual(view);
        enterNumber(field('w₁, y'), '800');
        expect(hodograph.getBoundingBox()).not.toEqual(view);
    });
});

describe('curve point controls dispose their board listeners', () => {
    // The listeners the controls add to "up" (the deleted PointCoordinateEditor's disposal test, carried over): every `on` is matched by an `off`.
    const watchUp = (board: JXG.Board) => {
        const live = new Set<unknown>();
        const on = board.on.bind(board);
        const off = board.off.bind(board);
        board.on = ((event: string, handler: unknown, context?: unknown) => { if (event === 'up') live.add(handler); return on(event, handler as never, context as never); }) as typeof board.on;
        board.off = ((event?: string, handler?: unknown) => { if (event === 'up') live.delete(handler); return off(event as never, handler as never); }) as typeof board.off;
        return live;
    };
    const mountWatched = async (id: DemonstrationId, firstField: string) => {
        const graph = createGraph(id);
        const mounted = mountGraph(graph);
        await waitUntil(() => graph.state.initialized === true);
        const access = curveAccess(graph);
        const live = watchUp(access.board());
        act(() => { access.select(); });
        await waitUntil(() => screen.queryByRole('spinbutton', {name: firstField}) !== null);
        return {graph, mounted, live};
    };
    test.each([['bezier', 'p₀, x'], ['ph-cubic', 'w₀, x']] as const)('%s: unmounting leaves no listener behind', async (id, firstField) => {
        const {mounted, live} = await mountWatched(id, firstField);
        expect(live.size).toBeGreaterThan(0);
        mounted.view.unmount();
        expect(live.size).toBe(0);
    });
    test.each([['bezier', 'p₀, x'], ['ph-cubic', 'w₀, x']] as const)('%s: a replaced scene does not accumulate listeners', async (id, firstField) => {
        const {graph, live} = await mountWatched(id, firstField);
        const before = live.size;
        await settle(() => graph.reset());
        await waitUntil(() => screen.queryByRole('spinbutton', {name: firstField}) !== null || live.size <= before);
        expect(live.size).toBeLessThanOrEqual(before);
    });
});
