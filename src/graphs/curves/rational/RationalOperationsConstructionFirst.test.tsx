/**
 * Construction first on the rational operation routes (graph-control first use, wave 3): each route's first task is the first
 * Edit group and stays there while the curve is selected; the plan's Acceptance line is checked on the real graph.
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
interface Poly {getPoints(): Pt[]; eval(u: number): Pt; getEffectiveWeights?(): number[]}
interface Curve {
    setAttributes(attributes: object): void; getCurve(): Poly; getExtrapolationT(): number; getDecasteljauT(): number;
    getDecasteljauScheme(t: number): Pt[][]; pointControlledCurve: Poly & {setWeights(weights: number[]): void};
}
type Run = BaseGraph<BaseGraphState> & {editing: {select(curve: unknown): void}; jxgCurves: Curve[]};
type Key = 'rational-decasteljau' | 'rational-elevation' | 'rational-extrapolation' | 'rational-subdivision';

const mount = (key: Key) => mountGraph(graphFactories[key]()).graph as Run;
const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
const firstCard = () => (screen.getAllByText(t('construction')).find(element => element.closest('.tools')))!.closest('.tools') as HTMLElement;
const select = (graph: Run) => {
    graph.jxgCurves[0].setAttributes({allowElevation: true});
    act(() => graph.editing.select(graph.jxgCurves[0]));
};
const press = (name: string | RegExp) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const slider = (name: string) => screen.getByRole('slider', {name});
const xy = (p: Pt) => [p.X(), p.Y()];

const inButton = (r: HTMLElement, name: string | RegExp) => within(r).getByRole('button', {name});
const inSlider = (r: HTMLElement, name: string) => within(r).getByRole('slider', {name});
const firstTask: Record<Key, Array<(root: HTMLElement) => HTMLElement>> = {
    'rational-decasteljau': [r => inSlider(r, t('animation_parameter'))],
    'rational-elevation': [r => inButton(r, t('elevate_degree'))],
    'rational-extrapolation': [r => inSlider(r, t('extrapolation_parameter_t')), r => inButton(r, t('extrapolate'))],
    'rational-subdivision': [r => inSlider(r, t('subdivision_parameter_t')), r => inButton(r, t('subdivide'))],
};

describe.each(Object.keys(firstTask) as Key[])('%s construction first', key => {
    test('the first task is the first Edit group, before the later controls, and stays while the curve is selected', () => {
        const graph = mount(key);
        const follows = (card: HTMLElement, element: Element) =>
            expect(card.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        const check = () => {
            const card = firstCard();
            expect(card.parentElement!.querySelector('.tools')).toBe(card);
            for (const control of firstTask[key]) expect(card.contains(control(card))).toBe(true);
            for (const heading of inEdit(t('curve_selection'))) if (!card.contains(heading)) follows(card, heading);
            for (const typed of screen.queryAllByRole('spinbutton')) if (!card.contains(typed)) follows(card, typed);
            expect(inEdit(t('graph_commands'))).toEqual([]);
        };
        check();
        select(graph);
        check();
    });
});

describe('route acceptance', () => {
    test('decasteljau: the parameter moves the constructed point along the curve and a weight edit follows at the same t', () => {
        const graph = mount('rational-decasteljau');
        const curve = graph.jxgCurves[0];
        const final = () => {
            const scheme = curve.getDecasteljauScheme(curve.getDecasteljauT());
            return xy(scheme[scheme.length - 1][0]);
        };
        const onCurve = (u: number) => xy(curve.getCurve().eval(u));
        const placed: number[][] = [];
        for (const value of ['0.25', '0.75']) {
            act(() => { fireEvent.change(slider(t('animation_parameter')), {target: {value}}); });
            expect(curve.getDecasteljauT()).toBeCloseTo(Number(value), 6);
            const p = final();
            expect(p[0]).toBeCloseTo(onCurve(Number(value))[0], 8);
            expect(p[1]).toBeCloseTo(onCurve(Number(value))[1], 8);
            placed.push(p);
        }
        expect(Math.hypot(placed[0][0] - placed[1][0], placed[0][1] - placed[1][1])).toBeGreaterThan(0.1);
        const before = final();
        act(() => curve.pointControlledCurve.setWeights([1, 5, 1, 1]));
        const after = final();
        expect(Math.hypot(after[0] - before[0], after[1] - before[1])).toBeGreaterThan(0.01);
        expect(after[0]).toBeCloseTo(onCurve(0.75)[0], 8);
        expect(after[1]).toBeCloseTo(onCurve(0.75)[1], 8);
    });

    test('elevation: one elevation adds a point and keeps the curve at interior samples', () => {
        const graph = mount('rational-elevation');
        const before = graph.jxgCurves[0].getCurve();
        const us = [0, 0.2, 0.5, 0.8, 1];
        const samples = us.map(u => xy(before.eval(u)));
        const count = before.getPoints().length;
        press(t('elevate_degree'));
        const after = graph.jxgCurves[0].getCurve();
        expect(after.getPoints().length).toBe(count + 1);
        us.forEach((u, i) => {
            expect(after.eval(u).X()).toBeCloseTo(samples[i][0], 6);
            expect(after.eval(u).Y()).toBeCloseTo(samples[i][1], 6);
        });
    });

    test('extrapolation: moving the parameter past 1 changes the represented interval, and Extrapolate keeps it', () => {
        const graph = mount('rational-extrapolation');
        const curve = graph.jxgCurves[0];
        const target = xy(curve.getCurve().eval(1.5));
        act(() => { fireEvent.change(slider(t('extrapolation_parameter_t')), {target: {value: '1.5'}}); });
        expect(curve.getExtrapolationT()).toBeCloseTo(1.5, 6);
        press(t('extrapolate'));
        const end = xy(graph.jxgCurves[0].getCurve().eval(1));
        expect(end[0]).toBeCloseTo(target[0], 6);
        expect(end[1]).toBeCloseTo(target[1], 6);
    });

    test('subdivision: an interior split gives two weighted pieces sharing the split point and reproducing the curve', () => {
        const graph = mount('rational-subdivision');
        // Subdividing rewrites the curve in place, so sample the original before pressing.
        const wanted = new Map<number, number[]>();
        for (const u of [0.3, 0.3 * 0.25, 0.3 * 0.5, 0.3 + 0.7 * 0.25, 0.3 + 0.7 * 0.5]) wanted.set(u, xy(graph.jxgCurves[0].getCurve().eval(u)));
        const at = (u: number) => wanted.get(u)!;
        act(() => { fireEvent.change(slider(t('subdivision_parameter_t')), {target: {value: '0.3'}}); });
        press(t('subdivide'));
        expect(graph.jxgCurves.length).toBe(2);
        const [first, second] = graph.jxgCurves.map(curve => curve.pointControlledCurve);
        for (const piece of [first, second]) expect(piece.getEffectiveWeights!().length).toBe(piece.getPoints().length);
        const meet = at(0.3);
        for (const p of [xy(first.eval(1)), xy(second.eval(0))]) {
            expect(p[0]).toBeCloseTo(meet[0], 6);
            expect(p[1]).toBeCloseTo(meet[1], 6);
        }
        for (const u of [0.25, 0.5]) {
            const a = xy(first.eval(u)), b = xy(second.eval(u));
            const wa = wanted.get(0.3 * u)!, wb = wanted.get(0.3 + 0.7 * u)!;
            expect(a[0]).toBeCloseTo(wa[0], 6); expect(a[1]).toBeCloseTo(wa[1], 6);
            expect(b[0]).toBeCloseTo(wb[0], 6); expect(b[1]).toBeCloseTo(wb[1], 6);
        }
    });
});
