/**
 * Graph control first use, batch 4: on the Bezier curve route the typed point fields are reachable with no curve selected
 * (opt-in `workspacePointEntryWithoutSelection`, a closed disclosure first in Edit); selecting the curve keeps one editor.
 * The spline routes list their free points without a selection already (`workspaceTypedPoints`); they are checked here too.
 */
import {act, screen} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../base/realGraphTestHarness';
import {createGraph} from '../base/createTestGraph';
import type {DemonstrationId} from '../../demonstrations';
import {enterNumber} from '../../inputs/testEntry';
import {curveAccess} from '../base/curveGraphTestAccess';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

async function mountReady(id: DemonstrationId) {
    const graph = createGraph(id);
    mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    return graph;
}

const editor = () => document.querySelector('#inspector-edit')!;
const xFields = () => [...editor().querySelectorAll('input')].filter(input => /^p[₀-₉]+, x$/.test(document.querySelector(`label[for="${input.id}"]`)?.textContent ?? ''));
const pointsOf = (graph: Awaited<ReturnType<typeof mountReady>>) =>
    (curveAccess(graph).first().getCurve().getPoints() as {X(): number; Y(): number}[]).map(point => [point.X(), point.Y()]);

describe('bezier: point entry without a selection', () => {
    test('a closed named disclosure is the first Edit group and holds the typed fields', async () => {
        await mountReady('bezier');
        const first = editor().firstElementChild as HTMLElement;
        expect(first.tagName).toBe('DETAILS');
        expect(first.hasAttribute('open')).toBe(false);
        expect(first.querySelector('summary')!.textContent).toBe(t('point_coordinates_keyboard_editing'));
        expect(xFields()).toHaveLength(4);
    });

    test('typing a coordinate moves the board point and gives the same curve as dragging to it', async () => {
        const graph = await mountReady('bezier');
        const jxgPoint = () => curveAccess(graph).first().getJxgPoints()[1];
        const moveTo = (to: number[]) => { const jxg = jxgPoint(); jxg.moveTo(to); (jxg as unknown as {triggerEventHandlers(n: string[], a: unknown[]): void}).triggerEventHandlers(['drag'], []); };
        const [x0, y0] = [jxgPoint().X(), jxgPoint().Y()];
        act(() => { moveTo([-1.5, 4.5]); });
        const dragged = pointsOf(graph);
        expect(dragged[1]).toEqual([-1.5, 4.5]);
        act(() => { moveTo([x0, y0]); });
        expect(pointsOf(graph)[1]).toEqual([x0, y0]);
        enterNumber(screen.getByRole('spinbutton', {name: 'p₁, x'}), '-1.5');
        enterNumber(screen.getByRole('spinbutton', {name: 'p₁, y'}), '4.5');
        expect(jxgPoint().X()).toBe(-1.5);
        expect(jxgPoint().Y()).toBe(4.5);
        expect(pointsOf(graph)).toEqual(dragged);
    });

    test('selecting the curve leaves exactly one editor', async () => {
        const graph = await mountReady('bezier');
        expect(xFields()).toHaveLength(4);
        act(() => { (graph as unknown as {editing: {select(curve: unknown): void}}).editing.select((graph as unknown as {jxgCurves: unknown[]}).jxgCurves[0]); });
        expect(xFields()).toHaveLength(4);
        expect(editor().textContent).toContain(t('selected_curve', {value0: 1}));
        expect(editor().firstElementChild!.querySelector('input[role="spinbutton"]')).toBeNull();
    });

    test('a graph that has not opted in is unchanged: no typed fields before a selection', async () => {
        await mountReady('curve-curvature');
        expect(xFields()).toHaveLength(0);
    });
});

describe.each<DemonstrationId>(['spline-c1', 'spline-c2'])('%s: point entry without a selection', id => {
    test('the free points are typed without a selection, the computed ones are not rows', async () => {
        const graph = await mountReady(id);
        const typed = (graph as unknown as {typedPointsOf(curve: unknown): unknown[]})['typedPointsOf'](curveAccess(graph).first());
        const spline = curveAccess(graph).first().getCurve() as unknown as {getNonFreePoints(): unknown[]};
        expect(typed.length).toBeGreaterThan(0);
        expect(typed.some(point => spline.getNonFreePoints().includes(point))).toBe(false);
        expect(xFields()).toHaveLength(typed.length);
    });
});
