/**
 * Construction first on the parametrization routes (graph-control first use, wave 3): each route's first task leads the
 * Edit panel and stays there while the curve is selected; the plan's Acceptance line is checked on the real graph.
 */
import {act, fireEvent, screen, within} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {t} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

interface Pt {X(): number; Y(): number}
type Run = BaseGraph<BaseGraphState> & {
    editing: {select(curve: unknown): void};
    jxgCurves: Array<{getCurve(): {getPoints(): Pt[]}}>;
    sampleMarkers?: Pt[];
    sampleJxgPoints?: Pt[];
};
type Key = 'spline-parameterization' | 'weighted-parameterization' | 'uniform-parameterization';

const mount = (key: Key) => mountGraph(graphFactories[key]()).graph as Run;
const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
const firstCard = () => (screen.getAllByText(t('construction')).find(element => element.closest('.tools')))!.closest('.tools') as HTMLElement;
const select = (graph: Run) => act(() => graph.editing.select(graph.jxgCurves[0]));
const slider = (name: string) => screen.getByRole('slider', {name});
const setSlider = (name: string, value: string) => act(() => { fireEvent.change(slider(name), {target: {value}}); });
const markers = (graph: Run) => (graph.sampleMarkers ?? graph.sampleJxgPoints ?? []).map(p => [p.X(), p.Y()]);
const gaps = (points: number[][]) => points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));

const firstTask: Record<Key, (root: HTMLElement) => HTMLElement[]> = {
    'spline-parameterization': r => [within(r).getByRole('slider', {name: t('parameter_alpha')}), within(r).getByRole('slider', {name: t('number_of_points')})],
    'weighted-parameterization': r => [within(r).getByRole('slider', {name: t('parameter_alpha')}), within(r).getByRole('slider', {name: t('number_of_points')})],
    'uniform-parameterization': r => [within(r).getByRole('combobox', {name: t('choose_parametrization')}), within(r).getByRole('slider', {name: t('number_of_points')})],
};
const later = [t('curve_selection'), t('hodograph'), t('curve_offsets')];

describe.each(Object.keys(firstTask) as Key[])('%s construction first', key => {
    test('the first task is the first Edit group, before the later controls, and stays while the curve is selected', () => {
        const graph = mount(key);
        const follows = (card: HTMLElement, element: Element) =>
            expect(card.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const check = () => {
            const card = firstCard();
            expect(card.parentElement!.querySelector('.tools')).toBe(card);
            const [lead, count] = firstTask[key](card);
            expect(card.contains(lead)).toBe(true);
            expect(card.contains(count)).toBe(true);
            // The leading control comes before the sample count.
            expect(lead.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            for (const text of later) for (const heading of inEdit(text)) if (!card.contains(heading)) follows(card, heading);
            for (const typed of screen.queryAllByRole('spinbutton')) if (!card.contains(typed)) follows(card, typed);
            expect(inEdit(t('graph_commands'))).toEqual([]);
        };
        check();
        select(graph);
        check();
    });
});

describe('route acceptance', () => {
    test.each(['spline-parameterization', 'weighted-parameterization'] as const)('%s: two alpha values change the marker spacing, not the marker count', key => {
        const graph = mount(key);
        setSlider(t('parameter_alpha'), '0.3');
        const low = markers(graph);
        setSlider(t('parameter_alpha'), '0.7');
        const high = markers(graph);
        expect(low.length).toBeGreaterThan(0);
        expect(high.length).toBe(low.length);
        const a = gaps(low), b = gaps(high);
        expect(a.some((g, i) => Math.abs(g - b[i]) > 0.05)).toBe(true);
    });

    test('uniform: switching methods keeps the curve and marker count while the spacing follows the method', () => {
        const graph = mount('uniform-parameterization');
        const curve = () => graph.jxgCurves[0].getCurve().getPoints().map(p => [p.X(), p.Y()]);
        const method = () => screen.getByRole('combobox', {name: t('choose_parametrization')});
        const alpha = () => screen.queryByRole('slider', {name: t('parameter_alpha')});
        expect(alpha()).not.toBeNull();
        setSlider(t('parameter_alpha'), '0.2');
        const weightedCurve = curve(), weighted = markers(graph);
        act(() => { fireEvent.change(method(), {target: {value: 'uniform'}}); });
        expect(alpha()).toBeNull();
        const uniform = markers(graph);
        expect(curve()).toEqual(weightedCurve);
        expect(uniform.length).toBe(weighted.length);
        expect(gaps(weighted).some((g, i) => Math.abs(g - gaps(uniform)[i]) > 0.05)).toBe(true);
        // Uniform arc-length spacing: the gaps between neighbouring markers are nearly equal.
        const ug = gaps(uniform);
        expect(Math.max(...ug) / Math.min(...ug)).toBeLessThan(1.25);
        act(() => { fireEvent.change(method(), {target: {value: 'alpha'}}); });
        expect(alpha()).not.toBeNull();
        expect(markers(graph).length).toBe(weighted.length);
    });
});
