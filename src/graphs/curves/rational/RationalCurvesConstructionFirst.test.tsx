/**
 * Rational family, first use (graph-control first use, wave 3 batch 1). The circle leads with its number of arcs; the rational curve
 * and the Farin route keep their order (the weight editor is a selected-curve control and the Farin switch is a Display switch).
 * The plan's Acceptance line of each route is checked on the real graph.
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
interface Slider extends Pt {setValue(v: number): void}
interface Rational {
    getCurve(): {getPoints(): Pt[]; eval(u: number): Pt; getEffectiveWeights(): number[]};
    getJxgPoints(): Pt[];
    sliders: Slider[];
    isShowingFarinPoints(): boolean;
}
type Run = BaseGraph<BaseGraphState> & {editing: {select(curve: unknown): void}; jxgCurves: Rational[]};

const mount = (key: 'rational' | 'farin' | 'circle') => mountGraph(graphFactories[key]()).graph as Run;
const inEdit = (text: string) => screen.queryAllByText(text).filter(element => element.closest('#inspector-edit'));
const select = (graph: Run, index = 0) => act(() => graph.editing.select(graph.jxgCurves[index]));
const xy = (p: Pt) => [p.X(), p.Y()];
const follows = (a: Element, b: Element) => expect(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
const typeInto = (field: HTMLElement, value: string) => act(() => { fireEvent.change(field, {target: {value}}); fireEvent.blur(field); });

describe('circle: the number of arcs leads', () => {
    const firstCard = () => screen.getAllByText(t('construction')).find(element => element.closest('.tools'))!.closest('.tools') as HTMLElement;
    const countField = () => within(firstCard()).getByRole('spinbutton', {name: t('number_of_curves')});

    test('the count is in the first Edit group, before the arc selection, the typed fields and the weights, before and after selecting', () => {
        const graph = mount('circle');
        const check = () => {
            const card = firstCard();
            expect(document.getElementById('inspector-edit')!.querySelector('.tools, .inspector-group')).toBe(card);
            expect(card.contains(countField())).toBe(true);
            for (const heading of inEdit(t('curve_selection'))) follows(card, heading);
            for (const weight of screen.queryAllByRole('spinbutton', {name: t('weight_value')})) follows(card, weight);
            for (const typed of screen.queryAllByRole('spinbutton')) if (!card.contains(typed)) follows(card, typed);
            expect(inEdit(t('graph_commands'))).toEqual([]);
        };
        check();
        select(graph);
        check();
        expect(screen.getAllByRole('spinbutton', {name: t('weight_value')}).length).toBe(1);
    });

    test('acceptance: changing the arc count keeps every arc point on the same circle', () => {
        const graph = mount('circle');
        const radius = 3;
        const onCircle = () => {
            for (const arc of graph.jxgCurves) {
                for (let i = 0; i <= 8; i++) {
                    const [x, y] = xy(arc.getCurve().eval(i / 8));
                    expect(Math.hypot(x, y)).toBeCloseTo(radius, 8);
                }
            }
        };
        expect(graph.jxgCurves.length).toBe(3);
        onCircle();
        act(() => { fireEvent.click(within(firstCard()).getByRole('button', {name: t('increase_count')})); });
        expect(graph.jxgCurves.length).toBe(4);
        onCircle();
        typeInto(countField(), '9');
        expect(graph.jxgCurves.length).toBe(9);
        onCircle();
    });
});

describe('rational: selection first, then the weight', () => {
    test('the weight editor comes after the curve selection and the typed point fields (it is a selected-curve control)', () => {
        const graph = mount('rational');
        expect(screen.queryByRole('spinbutton', {name: t('weight_value')})).toBeNull();
        select(graph);
        const weight = screen.getByRole('spinbutton', {name: t('weight_value')});
        follows(inEdit(t('curve_selection'))[0], weight);
        follows(inEdit(t('selected_curve_25'))[0], weight);
        for (const typed of screen.queryAllByRole('spinbutton')) if (typed !== weight) follows(typed, weight);
    });

    test('acceptance: raising one positive weight pulls the curve toward its point and leaves the control points', () => {
        const graph = mount('rational');
        select(graph);
        const curve = graph.jxgCurves[0];
        const points = () => curve.getCurve().getPoints().map(xy);
        const before = points();
        const index = 1;
        const w0 = curve.getCurve().getEffectiveWeights().slice();
        const gap = () => Math.min(...Array.from({length: 201}, (_, i) => {
            const p = xy(curve.getCurve().eval(i / 200));
            return Math.hypot(p[0] - before[index][0], p[1] - before[index][1]);
        }));
        const d0 = gap();
        const field = () => screen.getByRole('spinbutton', {name: t('weight_value')});
        typeInto(field(), '4');
        const w1 = curve.getCurve().getEffectiveWeights();
        expect(w1[index]).toBeCloseTo(4, 8);
        expect(w1[index]).toBeGreaterThan(w0[index]);
        w1.forEach((w, i) => { if (i !== index) expect(w).toBeCloseTo(w0[i], 8); });
        expect(gap()).toBeLessThan(d0 - 0.2);
        points().forEach((p, i) => { expect(p[0]).toBeCloseTo(before[i][0], 10); expect(p[1]).toBeCloseTo(before[i][1], 10); });
    });
});

describe('farin: the switch stays in Display', () => {
    test('acceptance: changing the ratio of adjacent weights moves the Farin point on their edge and the curve', () => {
        const graph = mount('farin');
        const curve = graph.jxgCurves[0];
        act(() => { fireEvent.click(screen.getByRole('button', {name: t('display')})); });
        act(() => { fireEvent.click(screen.getByRole('checkbox', {name: t('farin_points')})); });
        expect(curve.isShowingFarinPoints()).toBe(true);
        const points = curve.getJxgPoints().map(xy);
        expect(curve.sliders.length).toBe(3);
        const edge = 1;
        const slider = curve.sliders[edge];
        // The Farin point of an edge splits it as w[e] : w[e+1]; its place along the edge is w[e+1] / (w[e] + w[e+1]).
        const fraction = (w: number[]) => w[edge + 1] / (w[edge] + w[edge + 1]);
        const [a, b] = [points[edge], points[edge + 1]];
        const along = (p: number[]) => ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
        const w0 = curve.getCurve().getEffectiveWeights().slice();
        const mid0 = xy(curve.getCurve().eval(0.5));
        const at0 = along(xy(slider));
        expect(at0).toBeCloseTo(fraction(w0), 6);
        act(() => { slider.setValue(0.8); graph.boardUpdate(); });
        const w1 = curve.getCurve().getEffectiveWeights();
        const at1 = along(xy(slider));
        expect(at1).toBeCloseTo(0.8, 6);
        expect(at1).toBeCloseTo(fraction(w1), 6);
        expect(w1[edge + 1] / w1[edge]).toBeCloseTo(4, 6);
        expect(Math.abs(at1 - at0)).toBeGreaterThan(0.05);
        const mid1 = xy(curve.getCurve().eval(0.5));
        expect(Math.hypot(mid1[0] - mid0[0], mid1[1] - mid0[1])).toBeGreaterThan(0.01);
    });
});
