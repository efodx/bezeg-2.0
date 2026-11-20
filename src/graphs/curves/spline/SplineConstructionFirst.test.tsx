/**
 * Construction first on the spline routes (graph-control first use, wave 3): each route's first task leads the Edit
 * panel and stays there while the curve is selected; the plan's Acceptance line is checked on the real graph.
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

interface Pt {X(): number; Y(): number; setCoordinates(x: number, y: number): void}
interface Spline {
    getPoints(): Pt[];
    getNonFreePoints(): Pt[];
    getUnderlyingCurves(): Array<{getPoints(): Pt[]}>;
    getBs(): number[];
}
type Run = BaseGraph<BaseGraphState> & {
    editing: {select(curve: unknown): void};
    jxgCurves: Array<{getCurve(): Spline}>;
};
type Key = 'spline-cn' | 'spline-g1' | 'spline-g1-symmetric';

const mount = (key: Key) => mountGraph(graphFactories[key]()).graph as Run;
const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
const firstCard = () => (screen.getAllByText(t('construction')).find(element => element.closest('.tools')))!.closest('.tools') as HTMLElement;
const select = (graph: Run) => act(() => graph.editing.select(graph.jxgCurves[0]));
const spline = (graph: Run) => graph.jxgCurves[0].getCurve();
const xy = (p: Pt): [number, number] => [p.X(), p.Y()];
const sub = (a: [number, number], b: [number, number]): [number, number] => [a[0] - b[0], a[1] - b[1]];
const cross = (a: [number, number], b: [number, number]) => a[0] * b[1] - a[1] * b[0];
const dot = (a: [number, number], b: [number, number]) => a[0] * b[0] + a[1] * b[1];
const setSlider = (name: string, value: string) => act(() => { fireEvent.change(screen.getByRole('slider', {name}), {target: {value}}); });
const bName = (i: number) => `${t('spline_parameter_b')} ${i}`;

const firstTask: Record<Key, (root: HTMLElement) => HTMLElement[]> = {
    'spline-cn': r => [within(r).getByRole('group', {name: t('continuity_order')}), within(r).getByRole('group', {name: t('spline_degree')})],
    'spline-g1': r => [within(r).getByRole('slider', {name: bName(1)}), within(r).getByRole('slider', {name: bName(2)})],
    'spline-g1-symmetric': r => [within(r).getByRole('slider', {name: bName(1)}), within(r).getByRole('slider', {name: bName(3)})],
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
            const [lead, next] = firstTask[key](card);
            expect(card.contains(lead)).toBe(true);
            expect(card.contains(next)).toBe(true);
            expect(lead.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            for (const text of later) for (const heading of inEdit(text)) if (!card.contains(heading)) follows(card, heading);
            const typed = screen.queryAllByRole('spinbutton').filter(field => !card.contains(field));
            expect(typed.length).toBeGreaterThan(0);
            for (const field of typed) follows(card, field);
            expect(inEdit(t('graph_commands'))).toEqual([]);
        };
        check();
        select(graph);
        check();
    });
});

describe('route acceptance', () => {
    test('cn: a free-point edit updates the construction across a join, and a valid order change stays available', () => {
        const graph = mount('spline-cn');
        const curve = spline(graph);
        const derivedBefore = curve.getNonFreePoints().map(xy);
        const freePoints = curve.getPoints().filter(point => !curve.getNonFreePoints().includes(point));
        const free = freePoints[Math.floor(freePoints.length / 2)];
        act(() => { free.setCoordinates(free.X() + 0.5, free.Y() - 0.5); });
        const derivedAfter = curve.getNonFreePoints().map(xy);
        expect(derivedAfter.some((p, i) => Math.hypot(p[0] - derivedBefore[i][0], p[1] - derivedBefore[i][1]) > 1e-6)).toBe(true);
        const group = () => screen.getByRole('group', {name: t('continuity_order')});
        const order = () => Number((within(group()).getByRole('spinbutton') as HTMLInputElement).value);
        const before = order();
        act(() => { fireEvent.click(within(group()).getByRole('button', {name: t('decrease_count')})); });
        expect(order()).toBe(before - 1);
    });

    test('g1: tangent directions agree at each join and a change to b alters the handle spacing', () => {
        const graph = mount('spline-g1');
        const handleRatios = () => {
            const pieces = spline(graph).getUnderlyingCurves();
            return pieces.slice(1).map((piece, j) => Math.hypot(...sub(xy(piece.getPoints()[1]), xy(piece.getPoints()[0])))
                / Math.hypot(...sub(xy(pieces[j].getPoints()[2]), xy(pieces[j].getPoints()[1]))));
        };
        const regular = () => {
            const pieces = spline(graph).getUnderlyingCurves();
            for (let j = 1; j < pieces.length; j++) {
                const a = pieces[j - 1].getPoints(), b = pieces[j].getPoints();
                const incoming = sub(xy(a[2]), xy(a[1])), outgoing = sub(xy(b[1]), xy(b[0]));
                expect(cross(incoming, outgoing)).toBeCloseTo(0, 9);
                expect(dot(incoming, outgoing)).toBeGreaterThan(0);
            }
        };
        regular();
        const before = handleRatios();
        setSlider(bName(1), '2');
        regular();
        const after = handleRatios();
        expect(after[0]).not.toBeCloseTo(before[0], 3);
        expect(after[1]).toBeCloseTo(before[1], 9);
    });

    test('symmetric: changing one join parameter changes only that join, and the tangent line is preserved', () => {
        const graph = mount('spline-g1-symmetric');
        const junctions = () => spline(graph).getUnderlyingCurves().slice(0, -1).map(piece => { const pts = piece.getPoints(); return xy(pts[pts.length - 1]); });
        const tangentOk = () => {
            const pieces = spline(graph).getUnderlyingCurves();
            for (let j = 1; j < pieces.length; j++) {
                const a = pieces[j - 1].getPoints(), b = pieces[j].getPoints();
                const incoming = sub(xy(a[a.length - 1]), xy(a[a.length - 2])), outgoing = sub(xy(b[1]), xy(b[0]));
                expect(cross(incoming, outgoing)).toBeCloseTo(0, 9);
                expect(dot(incoming, outgoing)).toBeGreaterThan(0);
            }
        };
        tangentOk();
        const before = junctions();
        setSlider(bName(2), '0.8');
        const after = junctions();
        expect(Math.hypot(after[1][0] - before[1][0], after[1][1] - before[1][1])).toBeGreaterThan(1e-3);
        expect(after[0]).toEqual(before[0]);
        expect(after[2]).toEqual(before[2]);
        tangentOk();
    });
});
