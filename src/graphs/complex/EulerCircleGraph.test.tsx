import React from 'react';
import {readFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {expSeriesPartial} from '../../analysis/eulerCircle';
import {formatComplex} from '../../analysis/complexFormat';
import {DEFAULT_EULER_CIRCLE_STATE, EulerCircleAction} from '../../complex/eulerCircleModel';
import {
    ACCELERATION_DASH, EulerCircleGraph, PROJECTION_DASH, RADIUS_DASH, RADIUS_WIDTH, ROW_PX, STEP_INTERVAL_MS, UNIT_CIRCLE_DASH,
} from './EulerCircleGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; return ++this.handle; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

/** Exposes the board and the disposal the scene replacement calls, with a fake clock and a switchable reduced-motion setting. */
class ObservedGraph extends EulerCircleGraph {
    clock = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return this.reduced; }
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    rebuildNow() { this.syncReplacedScene(); }
}

function mountGraph(strict = false, reduced = false) {
    const graph = new ObservedGraph();
    graph.reduced = reduced;
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

type EventedPoint = JXG.Point & {eventHandlers: Record<string, unknown[]>; triggerEventHandlers(names: string[], args: unknown[]): void};
const handlerCounts = (point: JXG.Point) => (['drag', 'over', 'out'] as const).map(name => (point as EventedPoint).eventHandlers[name]?.length ?? 0);
function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}
const onCircle = (degrees: number, radius = 1): [number, number] => [radius * Math.cos(degrees * Math.PI / 180), radius * Math.sin(degrees * Math.PI / 180)];

type Probe = {id: string; elType: string; plaintext?: string; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const ofType = (graph: ObservedGraph, type: string) => probes(graph).filter(o => o.elType === type);
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
const captionTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(visible).map(o => o.plaintext ?? '');
/** The curves in creation order: the unit circle, the two projections, the velocity and acceleration arrows, the three radii. */
const [RING, PROJ_X, PROJ_Y, VELOCITY, ACCELERATION, RADIUS_A, RADIUS_B, RADIUS_P] = [0, 1, 2, 3, 4, 5, 6, 7];
const curves = (graph: ObservedGraph) => ofType(graph, 'curve');
/** The owned points by their face: the board holds points of its own, so the creation order is not used. */
const [PRODUCT, SUM, FIRST, SECOND] = ['triangleup', 'diamond', 'circle', 'square'] as const;
const FACES: Record<string, string> = {triangleup: '^', diamond: '<>', circle: 'o', square: '[]'};
const faceOf = (o: Probe) => String(o.evalVisProp('face')).toLowerCase();
const points = (graph: ObservedGraph): Record<string, Probe> => Object.fromEntries([PRODUCT, SUM, FIRST, SECOND].map(name => {
    const found = ofType(graph, 'point').filter(o => [name, FACES[name]].includes(faceOf(o)) && o.evalVisProp('size') !== undefined);
    return [name, found[found.length - 1]];
}));

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const labelOf = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const hasRow = (id: string) => document.querySelector(`[data-readout="${id}"]`) !== null;
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const status = () => document.querySelector('[data-euler-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const set = (graph: ObservedGraph, patch: Partial<typeof DEFAULT_EULER_CIRCLE_STATE>) => act(() => { graph.setState(patch); });
const help = (input: HTMLElement) => (input.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ');
const toggle = (label: string) => act(() => { fireEvent.click(screen.getByLabelText(label)); });
const productOn = (graph: ObservedGraph) => set(graph, {mode: 'product'});
const angleLabel = () => t('euler_circle_graph_angle_label');
const omegaLabel = () => t('euler_circle_graph_omega_label');
const degreeLabel = () => t('euler_circle_graph_degree_label');
const secondLabel = () => t('euler_circle_graph_b_label');
const act1 = (graph: ObservedGraph, action: Omit<EulerCircleAction, 'kind'>) => graph.act({kind: 'euler-circle', ...action});
function stepsPlayed(graph: ObservedGraph, ticks: number) {
    graph.clock.tick(0);
    for (let i = 1; i <= ticks; i++) graph.clock.tick(i * STEP_INTERVAL_MS);
}

describe('mount and the numbers', () => {
    test('theta = 30 degrees, omega = 2: exact (sqrt3/2; 1/2), velocity (-1; 1,7320508), speed 2, perpendicular, period pi', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject(DEFAULT_EULER_CIRCLE_STATE);
        expect(document.querySelector(`[aria-label="${t('euler_circle_graph_board_label')}"]`)).not.toBeNull();
        expect(readout('angle')).toContain('30°');
        expect(readout('omega')).toBe('2');
        expect(readout('cos')).toBe('√3/2 ≈ 0,8660254');
        expect(readout('sin')).toBe('1/2');
        expect(labelOf('cos')).toBe(t('euler_circle_graph_r_cos', {value0: t('euler_circle_graph_word_exact')}));
        expect(readout('point')).toBe('(√3/2; 1/2)');
        expect(readout('velocity')).toBe('−1 + 1,7320508i');
        expect(readout('speed')).toBe('2');
        expect(readout('between')).toBe('90°');
        expect(readout('period')).toContain('π');
        expect(labelOf('period')).toBe(t('euler_circle_graph_r_period'));
        expect(labelOf('period')).toContain('Obhodni čas');
        expect(hasRow('acceleration')).toBe(false);
        expect(status()).toContain(t('euler_circle_graph_status_exact', {value0: '30', value1: '(√3/2; 1/2)'}));
        noBadText();
    });

    test('60 degrees is (1/2; sqrt3/2) in the point row and the status; 10 degrees is computed; the axes are exact integers', () => {
        const {graph} = mountGraph();
        set(graph, {degrees: 60});
        expect(readout('point')).toBe('(1/2; √3/2)');
        expect(status()).toContain('(1/2; √3/2)');
        set(graph, {degrees: 10});
        expect(labelOf('cos')).toBe(t('euler_circle_graph_r_cos', {value0: t('euler_circle_graph_word_computed')}));
        expect(readout('cos')).toBe('0,9848078');
        expect(readout('sin')).toBe('0,1736482');
        expect(status()).toContain(t('euler_circle_graph_status_computed', {value0: '10', value1: formatComplex(graph.derived().position, 'sl')}));
        for (const [degrees, cos, sin] of [[0, '1', '0'], [90, '0', '1'], [180, '−1', '0'], [270, '0', '−1'], [360, '1', '0']] as const) {
            set(graph, {degrees});
            expect([readout('cos'), readout('sin')], String(degrees)).toEqual([cos, sin]);
            expect(labelOf('cos')).toBe(t('euler_circle_graph_r_cos', {value0: t('euler_circle_graph_word_exact')}));
        }
    });

    test('the acceleration row and the velocity rows follow their switches; every row is labelled', () => {
        const {graph} = mountGraph();
        toggle(t('euler_circle_graph_acceleration_label'));
        expect(graph.state.acceleration).toBe(true);
        expect(readout('acceleration')).toBe('−3,4641016 − 2i');
        toggle(t('euler_circle_graph_velocity_label'));
        expect(graph.state.velocity).toBe(false);
        for (const id of ['velocity', 'speed', 'between']) expect(hasRow(id), id).toBe(false);
        for (const row of Array.from(document.querySelectorAll('[data-readout]'))) {
            expect(row.querySelector('dt')?.textContent?.trim().length, row.getAttribute('data-readout') ?? '').toBeGreaterThan(0);
            expect(row.querySelector('dd')?.textContent?.trim().length, row.getAttribute('data-readout') ?? '').toBeGreaterThan(0);
        }
    });

    test('the arrows are drawn only while their switch is on', () => {
        const {graph} = mountGraph();
        expect(visible(curves(graph)[VELOCITY])).toBe(true);
        expect(visible(curves(graph)[ACCELERATION])).toBe(false);
        set(graph, {velocity: false, acceleration: true});
        expect(visible(curves(graph)[VELOCITY])).toBe(false);
        expect(visible(curves(graph)[ACCELERATION])).toBe(true);
    });
});

describe('the series at theta = 180 degrees', () => {
    test.each([1, 3, 5, 9, 13, 21, 30])('the partial sum of degree %i is the kernel recurrence, drawn only inside the view', degree => {
        const {graph} = mountGraph();
        set(graph, {degrees: 180, degree});
        const sum = expSeriesPartial(Math.PI, degree);
        expect(readout('sum')).toBe(formatComplex(sum, 'sl'));
        expect(labelOf('sum')).toBe(t('euler_circle_graph_r_sum', {value0: String(degree)}));
        const inside = Math.abs(sum.re) <= 2.4 && Math.abs(sum.im) <= 2.4;
        expect(hasRow('out')).toBe(!inside);
        expect(visible(points(graph)[SUM])).toBe(inside);
        expect(captionTexts(graph).includes(t('euler_circle_graph_cap_sum_out', {value0: String(degree)}))).toBe(!inside);
        expect(status().includes(t('euler_circle_graph_status_out'))).toBe(!inside);
    });

    test('the spec digits: degree 1 is 1 + 3,1416 i (beyond the view), 5 is 0,1239 + 0,524 i, 21 is -1 within 1e-10', () => {
        const {graph} = mountGraph();
        set(graph, {degrees: 180, degree: 1});
        expect(readout('sum')).toContain('3,1416');
        expect(readout('out')).toBe(t('euler_circle_graph_value_out'));
        set(graph, {degree: 5});
        expect(readout('sum')).toContain('0,1239');
        expect(readout('sum')).toContain('0,524');
        expect(hasRow('out')).toBe(false);
        set(graph, {degree: 21});
        expect(readout('sum')).toContain('−1');
        expect(graph.derived().error).toBeLessThan(1e-10);
        expect(labelOf('error')).toContain('10⁻¹²');
        expect(readout('error')).toMatch(/^\d(,\d+)?·10⁻[¹⁰²³⁴⁵⁶⁷⁸⁹]+$/);
        expect(readout('point')).toBe('(−1; 0)');
    });

    test('degree 1 has the diamond hidden, the out row and caption; degree 21 shows the diamond', () => {
        const {graph} = mountGraph();
        set(graph, {degrees: 180, degree: 1});
        expect(visible(points(graph)[SUM])).toBe(false);
        expect(captionTexts(graph)).toContain(t('euler_circle_graph_cap_sum_out', {value0: '1'}));
        set(graph, {degree: 21});
        expect(visible(points(graph)[SUM])).toBe(true);
        expect(captionTexts(graph)).not.toContain(t('euler_circle_graph_cap_sum_out', {value0: '21'}));
    });
});

describe('typed values and the drag', () => {
    test('a typed angle off the grid, below or above the range is refused: the state is the same object and the field states the range', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        for (const bad of ['361', '30,5', '-1', 'abc']) {
            enter(angleLabel(), bad);
            expect(graph.state, bad).toBe(before);
        }
        expect(graph.editAngle(361)).toBe(false);
        expect(graph.editAngle(30.5)).toBe(false);
        expect(graph.editAngle(Number.NaN)).toBe(false);
        enter(angleLabel(), '361');
        const input = field(angleLabel());
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(help(input)).toContain(t('number_range_hint', {value0: '0', value1: '360'}));
        expect(help(input)).toContain(t('euler_circle_graph_angle_help', {value0: '0', value1: '360'}));
        enter(angleLabel(), '30,5');
        expect(field(angleLabel()).getAttribute('aria-invalid')).toBe('true');
        expect(help(field(angleLabel()))).toContain(t('number_range_hint', {value0: '0', value1: '360'}));
        enter(angleLabel(), '45');
        expect(graph.state.degrees).toBe(45);
        expect(graph.editAngle(360)).toBe(true);
        expect(graph.state.degrees).toBe(360);
        expect(graph.editAngle(0)).toBe(true);
        expect(graph.state.degrees).toBe(0);
    });

    test('omega and the series degree are whole numbers in their ranges, with the range in their help', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        for (const bad of ['0', '5', '1,5']) { enter(omegaLabel(), bad); expect(graph.state, bad).toBe(before); }
        for (const bad of ['0', '31', '2,5']) { enter(degreeLabel(), bad); expect(graph.state, bad).toBe(before); }
        expect(help(field(omegaLabel()))).toContain(t('euler_circle_graph_omega_help', {value0: '1', value1: '4'}));
        expect(help(field(degreeLabel()))).toContain(t('euler_circle_graph_degree_help', {value0: '1', value1: '30'}));
        enter(omegaLabel(), '4');
        enter(degreeLabel(), '30');
        expect(graph.state).toMatchObject({omega: 4, degree: 30});
    });

    test('the angle help says degrees', () => {
        mountGraph();
        expect(angleLabel()).toContain('stopinje');
        expect(help(field(angleLabel()))).toContain('stopinj');
    });

    test('dragging the point snaps to the nearest whole degree whatever its distance; non-finite and the centre change nothing', () => {
        const {graph} = mountGraph();
        const handle = graph.dragHandle()!;
        expect([handle.X(), handle.Y()]).toEqual([graph.derived().position.re, graph.derived().position.im]);
        dragHandleTo(handle, ...onCircle(47.4, 3));
        expect(graph.state.degrees).toBe(47);
        expect(handle.X()).toBeCloseTo(Math.cos(47 * Math.PI / 180), 12);
        dragHandleTo(handle, ...onCircle(-30, 0.4));
        expect(graph.state.degrees).toBe(330);
        dragHandleTo(handle, 1, -0.001);
        expect(graph.state.degrees).toBe(0);
        const before = graph.state;
        dragHandleTo(handle, Number.NaN, 0.5);
        expect(graph.state).toBe(before);
        dragHandleTo(handle, 0, 0);
        expect(graph.state).toBe(before);
        expect(handle.X()).toBeCloseTo(1, 12);
    });

    test('a program-changed angle is announced once in the live status', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        set(graph, {degrees: 60});
        act(() => { vi.advanceTimersByTime(600); });
        expect(live()).toContain(t('euler_circle_graph_status_exact', {value0: '60', value1: '(1/2; √3/2)'}));
        set(graph, {degrees: 10});
        act(() => { vi.advanceTimersByTime(600); });
        expect(live()).toContain('θ = 10°');
    });
});

describe('product mode', () => {
    test('the switch shows the second angle field, the rows and the drawn parts; the motion mode hides them with the switch as the reason', () => {
        const {graph} = mountGraph();
        expect(screen.queryByLabelText(secondLabel())).toBeNull();
        for (const id of ['b', 'sum-angle', 'second', 'product']) expect(hasRow(id), id).toBe(false);
        for (const index of [RADIUS_A, RADIUS_B, RADIUS_P]) expect(visible(curves(graph)[index])).toBe(false);
        expect(visible(points(graph)[SECOND])).toBe(false);
        expect(visible(points(graph)[PRODUCT])).toBe(false);
        expect(help(screen.getByLabelText(t('euler_circle_graph_mode_label')))).toContain(t('euler_circle_graph_mode_help'));
        toggle(t('euler_circle_graph_mode_label'));
        expect(graph.state.mode).toBe('product');
        expect(screen.getByLabelText(secondLabel())).not.toBeNull();
        for (const id of ['b', 'sum-angle', 'second', 'product']) expect(hasRow(id), id).toBe(true);
        for (const index of [RADIUS_A, RADIUS_B, RADIUS_P]) expect(visible(curves(graph)[index])).toBe(true);
        expect(visible(points(graph)[SECOND])).toBe(true);
        expect(visible(points(graph)[PRODUCT])).toBe(true);
        toggle(t('euler_circle_graph_mode_label'));
        expect(graph.state.mode).toBe('motion');
        expect(hasRow('product')).toBe(false);
    });

    test('30 degrees times 45 degrees: the angles add to 75 degrees and the product is computed (0,258819; 0,9659258)', () => {
        const {graph} = mountGraph();
        productOn(graph);
        expect(graph.state.b).toBe(45);
        expect(readout('b')).toBe('45°');
        expect(readout('sum-angle')).toBe('30° + 45° = 75°');
        expect(readout('product')).toBe('(0,258819; 0,9659258)');
        expect(labelOf('product')).toBe(t('euler_circle_graph_r_product', {value0: t('euler_circle_graph_word_computed')}));
        expect(labelOf('second')).toBe(t('euler_circle_graph_r_second', {value0: t('euler_circle_graph_word_exact')}));
        expect(readout('second')).toBe('(√2/2; √2/2)');
        expect(status()).toContain(t('euler_circle_graph_status_product_computed', {value0: '75', value1: '(0,258819; 0,9659258)'}));
        const product = graph.derived().product;
        expect(product.point.re).toBeCloseTo(Math.cos(75 * Math.PI / 180), 15);
        expect(Math.hypot(product.point.re - product.byMultiplication.re, product.point.im - product.byMultiplication.im)).toBeLessThan(4e-15);
        const drawn = points(graph)[PRODUCT] as unknown as JXG.Point;
        expect(drawn.X()).toBeCloseTo(product.point.re, 12);
        expect(drawn.Y()).toBeCloseTo(product.point.im, 12);
    });

    test('e^(i pi) = -1 exactly at 180 degrees; 300 + 90 reduces to 30 degrees with exact radicals', () => {
        const {graph} = mountGraph();
        productOn(graph);
        set(graph, {degrees: 180, b: 0});
        expect(readout('product')).toBe('(−1; 0)');
        expect(labelOf('product')).toBe(t('euler_circle_graph_r_product', {value0: t('euler_circle_graph_word_exact')}));
        expect(readout('sum-angle')).toBe('180° + 0° = 180°');
        set(graph, {degrees: 300, b: 90});
        expect(readout('sum-angle')).toBe(t('euler_circle_graph_value_sum_angle_reduced', {value0: '300', value1: '90', value2: '390', value3: '30'}));
        expect(readout('product')).toBe('(√3/2; 1/2)');
        expect(status()).toContain(t('euler_circle_graph_status_product_exact', {value0: '30', value1: '(√3/2; 1/2)'}));
    });

    test('a typed second angle off the 5 degree grid or the range is refused; the field states the step and the range', () => {
        const {graph} = mountGraph();
        productOn(graph);
        const before = graph.state;
        for (const bad of ['47', '365', '-5', '2,5', 'abc']) {
            enter(secondLabel(), bad);
            expect(graph.state, bad).toBe(before);
        }
        expect(graph.editSecondAngle(47)).toBe(false);
        expect(graph.editSecondAngle(Number.NaN)).toBe(false);
        expect(graph.editSecondAngle(365)).toBe(false);
        enter(secondLabel(), '47');
        const input = field(secondLabel());
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(help(input)).toContain(t('euler_circle_graph_b_rejected', {value0: '0', value1: '360', value2: '5'}));
        enter(secondLabel(), '365');
        expect(help(field(secondLabel()))).toContain(t('number_range_hint', {value0: '0', value1: '360'}));
        expect(help(input)).toContain(t('euler_circle_graph_b_help', {value0: '0', value1: '360', value2: '5'}));
        expect(secondLabel()).toContain('stopinje');
        enter(secondLabel(), '50');
        expect(graph.state.b).toBe(50);
        expect(graph.editSecondAngle(360)).toBe(true);
        expect(graph.state.b).toBe(360);
    });

    test('dragging the second point snaps to the nearest multiple of 5 degrees; the first point still snaps to a whole degree', () => {
        const {graph} = mountGraph();
        productOn(graph);
        const second = graph.dragSecondHandle()!;
        expect(second).toBe(points(graph)[SECOND]);
        dragHandleTo(second, ...onCircle(47.4, 2));
        expect(graph.state.b).toBe(45);
        dragHandleTo(second, ...onCircle(48, 0.5));
        expect(graph.state.b).toBe(50);
        dragHandleTo(second, ...onCircle(359, 1));
        expect(graph.state.b).toBe(0);
        const before = graph.state;
        dragHandleTo(second, Number.NaN, 1);
        dragHandleTo(second, 0, 0);
        expect(graph.state).toBe(before);
        dragHandleTo(graph.dragHandle()!, ...onCircle(47.4));
        expect(graph.state.degrees).toBe(47);
    });

    test('the mode and the second angle round trip through the Preset data', () => {
        const {graph} = mountGraph();
        set(graph, {mode: 'product', b: 355, degrees: 123});
        const data = graph.exportPresetData();
        expect(data[0][1]).toMatchObject({mode: 'product', b: 355, degrees: 123});
        set(graph, {mode: 'motion', b: 0, degrees: 0});
        act(() => { graph.importPresetData(data); });
        expect(graph.state).toMatchObject({mode: 'product', b: 355, degrees: 123});
    });
});

describe('scene actions', () => {
    test('several actions in one synchronous tick each read the state the previous one wrote', () => {
        const {graph} = mountGraph();
        act(() => {
            act1(graph, {operation: 'set-mode', mode: 'product'});
            expect(graph.state.mode).toBe('product');
            act1(graph, {operation: 'set-b', b: 60});
            act1(graph, {operation: 'set-angle', degrees: 300});
            act1(graph, {operation: 'step', count: 2});
            expect(graph.state).toMatchObject({degrees: 310, b: 60, mode: 'product'});
            act1(graph, {operation: 'set-omega', omega: 3});
            act1(graph, {operation: 'set-degree', degree: 9});
            act1(graph, {operation: 'set-vectors', acceleration: true, velocity: false});
        });
        expect(graph.state).toMatchObject({degrees: 310, omega: 3, degree: 9, b: 60, mode: 'product', velocity: false, acceleration: true});
        expect(readout('sum-angle')).toBe(t('euler_circle_graph_value_sum_angle_reduced', {value0: '310', value1: '60', value2: '370', value3: '10'}));
        expect(readout('omega')).toBe('3');
    });

    test('an invalid payload is a content error naming the field and leaves the state alone', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        expect(() => act1(graph, {operation: 'set-angle', degrees: 361})).toThrow(/degrees/);
        expect(() => act1(graph, {operation: 'set-b', b: 47})).toThrow(/b: off-grid/);
        expect(() => act1(graph, {operation: 'set-mode', mode: 'both' as 'product'})).toThrow(/mode/);
        expect(() => act1(graph, {operation: 'set-vectors'})).toThrow();
        expect(graph.state).toBe(before);
    });
});

describe('stepping and playback', () => {
    test('play makes one 5 degree step per interval from 30 degrees, a long frame still one, and ends at 360 with no frame pending', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(0);
        expect(graph.state.degrees).toBe(30);
        graph.clock.tick(STEP_INTERVAL_MS - 1);
        expect(graph.state.degrees).toBe(30);
        graph.clock.tick(STEP_INTERVAL_MS);
        expect(graph.state.degrees).toBe(35);
        graph.clock.tick(STEP_INTERVAL_MS + 20 * STEP_INTERVAL_MS);
        expect(graph.state.degrees).toBe(40);
        let time = 22 * STEP_INTERVAL_MS;
        for (let i = 0; i < 400 && graph.clock.pending(); i++) { time += STEP_INTERVAL_MS; graph.clock.tick(time); }
        expect(graph.state.degrees).toBe(360);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        expect(readout('point')).toBe('(1; 0)');
        press(t('play'));
        expect(graph.isPlaying()).toBe(false);
        graph.play();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('the interval between two playback steps is 100 ms', () => {
        expect(STEP_INTERVAL_MS).toBe(100);
    });

    test('Next step goes to the next multiple of 5; Reset goes to 0 and keeps omega, the series degree and the arrows', () => {
        const {graph} = mountGraph();
        set(graph, {degrees: 32, omega: 3, degree: 7, acceleration: true});
        press(t('next_step'));
        expect(graph.state.degrees).toBe(35);
        press(t('next_step'));
        expect(graph.state.degrees).toBe(40);
        press(t('reset'));
        expect(graph.state).toMatchObject({degrees: 0, omega: 3, degree: 7, velocity: true, acceleration: true});
        expect(readout('point')).toBe('(1; 0)');
    });

    test('pause stops at the angle; Play resumes from it with no jump', () => {
        const {graph} = mountGraph();
        press(t('play'));
        stepsPlayed(graph, 3);
        expect(graph.state.degrees).toBe(45);
        press(t('pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        graph.clock.tick(100000);
        graph.clock.tick(100000 + STEP_INTERVAL_MS);
        expect(graph.state.degrees).toBe(50);
    });

    test('reduced motion: Play does not move; it says why through the button, starts no frame loop, and Next step still works', () => {
        const {graph} = mountGraph(false, true);
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.state.degrees).toBe(30);
        expect(graph.isPlaying()).toBe(false);
        graph.play();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion'));
        press(t('next_step'));
        expect(graph.state.degrees).toBe(35);
    });

    test('the product mode plays the first angle too', () => {
        const {graph} = mountGraph();
        productOn(graph);
        press(t('play'));
        stepsPlayed(graph, 2);
        expect(graph.state).toMatchObject({degrees: 40, b: 45, mode: 'product'});
        expect(readout('sum-angle')).toBe('40° + 45° = 85°');
    });
});

describe('every stored-field change pauses a playing run', () => {
    const playing = () => {
        const mounted = mountGraph();
        press(t('play'));
        stepsPlayed(mounted.graph, 1);
        expect(mounted.graph.isPlaying()).toBe(true);
        expect(mounted.graph.state.degrees).toBe(35);
        return mounted.graph;
    };

    test('the angle field, the omega field and the drag', () => {
        let graph = playing();
        enter(angleLabel(), '100');
        expect(graph.state.degrees).toBe(100);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        document.body.innerHTML = '';
        graph = playing();
        enter(omegaLabel(), '3');
        expect(graph.isPlaying()).toBe(false);
    });

    test('the drag', () => {
        const graph = playing();
        dragHandleTo(graph.dragHandle()!, ...onCircle(100));
        expect(graph.state.degrees).toBe(100);
        expect(graph.isPlaying()).toBe(false);
    });

    test.each([
        ['the angle', {degrees: 41}], ['the next step', {degrees: 40}], ['the same angle plus the step', {degrees: 35, omega: 3}], ['omega', {omega: 3}],
        ['the series degree', {degree: 7}], ['the velocity switch', {velocity: false}], ['the acceleration switch', {acceleration: true}],
        ['the mode', {mode: 'product'}], ['the second angle', {b: 50}], ['angle 0', {degrees: 0}],
    ] as const)('a direct setState of %s', (_name, patch) => {
        const graph = playing();
        set(graph, patch);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('a write that stores the same content (the angle again, or no content at all) does not pause; an initialized-only write does not pause', () => {
        const graph = playing();
        act(() => { graph.setState({initialized: true}); });
        expect(graph.isPlaying()).toBe(true);
        act(() => { graph.setState({}); });
        expect(graph.isPlaying()).toBe(true);
        set(graph, {degrees: 35});
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(2 * STEP_INTERVAL_MS);
        expect(graph.state.degrees).toBe(40);
    });
});

describe('captions and the legend', () => {
    test('a caption names every element a readout names, with the scales stated', () => {
        const {graph} = mountGraph();
        toggle(t('euler_circle_graph_acceleration_label'));
        productOn(graph);
        const texts = captionTexts(graph);
        const has = (text: string) => expect(texts, text).toContain(text);
        has(t('euler_circle_graph_cap_point', {value0: '(√3/2; 1/2)'}));
        has(t('euler_circle_graph_cap_second', {value0: '(√2/2; √2/2)'}));
        has(t('euler_circle_graph_cap_product', {value0: '(0,258819; 0,9659258)'}));
        has(t('euler_circle_graph_cap_velocity_near'));
        has(t('euler_circle_graph_cap_acceleration_near'));
        has(t('euler_circle_graph_cap_sum_near', {value0: '5'}));
        has(t('euler_circle_graph_cap_velocity', {value0: '0,4', value1: t('euler_circle_graph_style_solid_arrow')}));
        has(t('euler_circle_graph_cap_acceleration', {value0: '0,225', value1: t('euler_circle_graph_style_dashed_arrow')}));
        expect(texts.every(text => !/NaN|undefined/.test(text))).toBe(true);
        expect(texts.every(text => !text.includes('<sup>')), 'e^(...) must not be turned into a superscript').toBe(true);
    });

    test('the captions of parts that are not drawn are hidden', () => {
        const {graph} = mountGraph();
        const texts = captionTexts(graph);
        expect(texts).not.toContain(t('euler_circle_graph_cap_acceleration_near'));
        expect(texts.some(text => text.startsWith('e^(iφ)') || text.startsWith('e^(i(θ+φ))'))).toBe(false);
        expect(texts.some(text => text.includes(t('euler_circle_graph_style_square')))).toBe(false);
    });

    test('each legend entry states a style that the drawing attributes have', () => {
        const {graph} = mountGraph();
        toggle(t('euler_circle_graph_acceleration_label'));
        productOn(graph);
        const texts = captionTexts(graph);
        const legend = (text: string) => expect(texts, text).toContain(text);
        const attr = (probe: Probe, name: string) => probe.evalVisProp(name);
        const arrowed = (probe: Probe) => attr(probe, 'lastArrow');
        // Unit circle: dashed.
        legend(t('euler_circle_graph_cap_unit', {value0: t('euler_circle_graph_style_dashed')}));
        expect(UNIT_CIRCLE_DASH).toBeGreaterThan(0);
        expect(attr(curves(graph)[RING], 'dash')).toBe(UNIT_CIRCLE_DASH);
        // Projections: dotted (the dash pattern 1 of JSXGraph is the dotted one), no arrow.
        legend(t('euler_circle_graph_cap_projections', {value0: t('euler_circle_graph_style_dotted')}));
        for (const index of [PROJ_X, PROJ_Y]) {
            expect(attr(curves(graph)[index], 'dash')).toBe(PROJECTION_DASH);
            expect(arrowed(curves(graph)[index])).toBeFalsy();
        }
        // Velocity: solid arrow. Acceleration: dashed arrow.
        legend(t('euler_circle_graph_cap_velocity', {value0: '0,4', value1: t('euler_circle_graph_style_solid_arrow')}));
        expect(attr(curves(graph)[VELOCITY], 'dash')).toBe(0);
        expect(arrowed(curves(graph)[VELOCITY])).toBeTruthy();
        legend(t('euler_circle_graph_cap_acceleration', {value0: '0,225', value1: t('euler_circle_graph_style_dashed_arrow')}));
        expect(attr(curves(graph)[ACCELERATION], 'dash')).toBe(ACCELERATION_DASH);
        // The four dashed or dotted elements differ in pattern, and the words of their legend rows differ too.
        const patterns = [UNIT_CIRCLE_DASH, PROJECTION_DASH, ACCELERATION_DASH, 0];
        expect(new Set(patterns).size).toBe(4);
        expect(new Set([t('euler_circle_graph_style_dashed'), t('euler_circle_graph_style_dotted'), t('euler_circle_graph_style_dashed_arrow'),
            t('euler_circle_graph_style_solid_arrow')]).size).toBe(4);
        expect(arrowed(curves(graph)[ACCELERATION])).toBeTruthy();
        // The partial sum: diamond. The first handle: filled circle. The second: filled square. The product: triangle.
        legend(t('euler_circle_graph_cap_sum', {value0: '5', value1: t('euler_circle_graph_style_diamond')}));
        expect(String(attr(points(graph)[SUM], 'face')).toLowerCase()).toMatch(/diamond/);
        legend(t('euler_circle_graph_cap_handle', {value0: t('euler_circle_graph_style_circle')}));
        expect(graph.dragHandle()!.visProp.face).toMatch(/circle|o/i);
        legend(t('euler_circle_graph_cap_second_handle', {value0: t('euler_circle_graph_style_square')}));
        expect(String(attr(points(graph)[SECOND], 'face')).toLowerCase()).toMatch(/square|\[\]/);
        legend(t('euler_circle_graph_cap_product_legend', {value0: t('euler_circle_graph_style_triangle')}));
        expect(String(attr(points(graph)[PRODUCT], 'face')).toLowerCase()).toMatch(/triangle|\^/);
        // The radii: thin solid lines.
        legend(t('euler_circle_graph_cap_radii', {value0: t('euler_circle_graph_style_thin_line')}));
        for (const index of [RADIUS_A, RADIUS_B, RADIUS_P]) {
            expect(attr(curves(graph)[index], 'dash')).toBe(RADIUS_DASH);
            expect(attr(curves(graph)[index], 'strokeWidth')).toBe(RADIUS_WIDTH);
            expect(arrowed(curves(graph)[index])).toBeFalsy();
        }
        expect(RADIUS_DASH).toBe(0);
        expect(RADIUS_WIDTH).toBeLessThan(2);
    });

    type Placed = Probe & {X(): number; Y(): number};
    /** The legend rows (the texts at the left edge) that are visible, top to bottom, with the board's pixel scale and bottom edge. */
    const legendRows = (graph: ObservedGraph) => {
        const board = graph.liveBoard();
        const rows = (ofType(graph, 'text') as Placed[]).filter(o => visible(o) && o.X() < -1.9).sort((a, b) => b.Y() - a.Y());
        return {ys: rows.map(o => o.Y()), uy: board.unitY, bottom: board.getBoundingBox()[3]};
    };

    test('the legend stacks only the visible rows: an even pitch with no gap, in every mode, and the last row inside the board', () => {
        const {graph} = mountGraph();
        const modes: Array<[string, Partial<typeof DEFAULT_EULER_CIRCLE_STATE>, number]> = [
            ['default', {}, 5], ['acceleration only', {velocity: false, acceleration: true}, 5], ['nothing optional', {velocity: false}, 4],
            ['everything: product, velocity and acceleration', {mode: 'product', velocity: true, acceleration: true}, 9],
            ['the partial sum out of the view', {mode: 'motion', velocity: false, acceleration: false, degrees: 300, degree: 1}, 4],
        ];
        for (const [name, patch, count] of modes) {
            set(graph, {mode: 'motion', velocity: true, acceleration: false, degrees: 30, degree: 5});
            set(graph, patch);
            const {ys, uy, bottom} = legendRows(graph);
            expect(ys.length, name).toBe(count);
            const pitches = ys.slice(1).map((y, i) => (ys[i] - y) * uy);
            for (const pitch of pitches) {
                expect(pitch, name).toBeGreaterThan(13);
                expect(pitch, name).toBeLessThanOrEqual(ROW_PX + 1e-9);
                expect(pitch, name).toBeCloseTo(pitches[0], 6);
            }
            expect((ys[ys.length - 1] - bottom) * uy, `${name}: the last row's top above the bottom edge by more than one text line`).toBeGreaterThanOrEqual(14);
        }
    });

    test('the acceleration arrow is drawn at the scale of its omega and its tip stays on the point side of the centre', () => {
        const {graph} = mountGraph();
        toggle(t('euler_circle_graph_acceleration_label'));
        const arrow = () => curves(graph)[ACCELERATION] as Probe & {X(s: number): number; Y(s: number): number};
        for (const omega of [1, 2, 3, 4]) {
            for (const degrees of [0, 30, 135, 250]) {
                set(graph, {omega, degrees});
                const p = graph.derived().position;
                const tip = {re: arrow().X(1), im: arrow().Y(1)};
                expect(tip.re * p.re + tip.im * p.im, `omega ${omega}, theta ${degrees}`).toBeGreaterThan(0.05);
                expect(Math.hypot(tip.re - p.re, tip.im - p.im)).toBeCloseTo(0.9, 9); // the drawn length, whatever omega
            }
        }
        set(graph, {omega: 4});
        expect(captionTexts(graph)).toContain(t('euler_circle_graph_cap_acceleration', {value0: '0,05625', value1: t('euler_circle_graph_style_dashed_arrow')}));
    });

    test('the field for φ is hidden outside product mode, and the mode checkbox names it in its help', () => {
        mountGraph();
        expect(screen.queryByLabelText(t('euler_circle_graph_b_label'))).toBeNull();
        expect(help(field(t('euler_circle_graph_mode_label')))).toContain('φ');
    });

    test('no legend row is drawn for a part that is hidden', () => {
        const {graph} = mountGraph();
        const texts = captionTexts(graph);
        expect(texts.some(text => text.includes(t('euler_circle_graph_style_dashed_arrow')))).toBe(false);
        expect(texts.some(text => text.includes(t('euler_circle_graph_style_thin_line')))).toBe(false);
        expect(texts.some(text => text.includes(t('euler_circle_graph_style_solid_arrow')))).toBe(true);
    });
});

describe('ownership, rebuild and StrictMode', () => {
    test('a state change does not rebuild; dispose and rebuild replace every owned object and return to the pre-mount count', () => {
        const {graph, view} = mountGraph();
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const owned = graph.ownedObjectCount();
        expect(owned).toBeGreaterThan(20);
        const base = count() - owned;
        const ids = new Set(probes(graph).map(o => o.id));
        for (const patch of [{degrees: 100}, {omega: 3}, {mode: 'product' as const}, {b: 100}, {degree: 30}, {velocity: false}]) {
            set(graph, patch);
            expect(graph.ownedObjectCount()).toBe(owned);
        }
        expect(new Set(probes(graph).map(o => o.id))).toEqual(ids);
        const listeners = graph.ownedListenerCount();
        const handle = graph.dragHandle()!;
        const second = graph.dragSecondHandle()!;
        expect(handlerCounts(handle)).toEqual([1, 1, 1]);
        expect(handlerCounts(second)).toEqual([1, 1, 1]);

        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(count()).toBe(base);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);
        expect(handlerCounts(second)).toEqual([0, 0, 0]);

        act(() => { graph.rebuildNow(); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.ownedListenerCount()).toBe(listeners);
        expect(count()).toBe(base + owned);
        expect(graph.dragHandle()).not.toBe(handle);
        expect(graph.dragSecondHandle()).not.toBe(second);
        expect(handlerCounts(graph.dragHandle()!)).toEqual([1, 1, 1]);
        expect(handlerCounts(graph.dragSecondHandle()!)).toEqual([1, 1, 1]);
        expect(probes(graph).some(o => o.id === handle.id)).toBe(false);
        expect(graph.dragHandle()!.X()).toBeCloseTo(graph.derived().position.re, 12);

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
    });

    test('StrictMode mounts the scene once: the same count, one set of handlers', () => {
        const plain = mountGraph();
        const owned = plain.graph.ownedObjectCount();
        plain.view.unmount();
        const {graph} = mountGraph(true);
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(handlerCounts(graph.dragHandle()!)).toEqual([1, 1, 1]);
        expect(ofType(graph, 'curve')).toHaveLength(8);
    });

    test('disposing the scene while playing stops the playback', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.disposeNow();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
    });

    test('unmount while playing cancels the frame loop and every timer, removes the board label and the language listener', () => {
        vi.useFakeTimers();
        // JSXGraph leaves a timer of its own for every redrawn text (text.js), measured here with one angle set from outside; the played run must leave the same
        // number: no frame, interval or settle timer of this graph (the status settle is cancelled by the unmount).
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setState({degrees: 35}); });
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();
        const {graph, view} = mountGraph();
        press(t('play'));
        stepsPlayed(graph, 1);
        expect(graph.clock.pending()).toBe(true);
        const liveTimers = vi.getTimerCount();
        view.unmount();
        expect(vi.getTimerCount()).toBeLessThan(liveTimers); // the pending status settle is cancelled
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        expect(vi.getTimerCount() - afterPlain).toBeLessThanOrEqual(plainDelta);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('euler_circle_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('the derived data is keyed on the state: not recomputed for a language change or an initialized-only change, recomputed for other content', () => {
        const {graph} = mountGraph();
        const count = graph.derivationCount();
        act(() => setLanguage('en'));
        act(() => setLanguage('sl'));
        act(() => { graph.setState({initialized: true}); });
        expect(graph.derivationCount()).toBe(count);
        set(graph, {degrees: 100});
        expect(graph.derivationCount()).toBe(count + 1);
        set(graph, {b: 100});
        expect(graph.derivationCount()).toBe(count + 2);
    });
});

describe('language and the catalog', () => {
    test('switching the language renames the board, the labels, the captions and the status; the numbers stay', () => {
        const {graph} = mountGraph();
        set(graph, {degrees: 10});
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${en.euler_circle_graph_board_label}"]`)).not.toBeNull();
        expect(labelOf('period')).toBe(en.euler_circle_graph_r_period);
        expect(readout('cos')).toBe('0.9848078');
        expect(captionTexts(graph)).toContain(t('euler_circle_graph_cap_point', {value0: formatComplex(graph.derived().position, 'en')}));
        expect(status()).toContain('0.98');
        expect(screen.getByLabelText(en.euler_circle_graph_angle_label)).not.toBeNull();
        act(() => setLanguage('sl'));
        expect(document.querySelector(`[aria-label="${sl.euler_circle_graph_board_label}"]`)).not.toBeNull();
        expect(readout('cos')).toBe('0,9848078');
        expect(captionTexts(graph)).toContain(t('euler_circle_graph_cap_point', {value0: formatComplex(graph.derived().position, 'sl')}));
    });

    test('numbers use the decimal comma and the true minus in Slovenian', () => {
        const {graph} = mountGraph();
        productOn(graph);
        toggle(t('euler_circle_graph_acceleration_label'));
        set(graph, {degrees: 210, b: 120});
        expect(readout('cos')).toBe('−√3/2 ≈ −0,8660254');
        expect(readout('sin')).toBe('−1/2');
        expect(readout('velocity')).toContain('−');
        expect(readout('product')).toBe('(√3/2; −1/2)');
        for (const id of ['cos', 'sin', 'velocity', 'acceleration', 'sum', 'product']) {
            expect(readout(id), id).not.toContain('-');
            expect(readout(id), id).not.toMatch(/\d\.\d/);
        }
        expect(document.body.textContent).not.toMatch(/\d\.\d/);
        expect(status()).not.toContain('-');
    });

    const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), m => m[1]).sort();
    const sources = () => ['src/graphs/complex/EulerCircleGraph.tsx', 'src/graphs/complex/eulerCirclePresetCollection.ts'].map(path => readFileSync(path, 'utf8'));

    test('every euler_circle_graph key exists in both languages with the same placeholder names, and the sources use exactly these keys', () => {
        const keys = Object.keys(sl).filter(key => key.startsWith('euler_circle_graph_'));
        expect(keys.length).toBeGreaterThanOrEqual(100);
        for (const key of keys) {
            const slText = sl[key as keyof typeof sl];
            const enText = en[key as keyof typeof sl];
            expect(typeof enText, key).toBe('string');
            expect(enText.length, key).toBeGreaterThan(0);
            expect(names(enText), key).toEqual(names(slText));
        }
        expect(Object.keys(en).filter(key => key.startsWith('euler_circle_graph_')).sort()).toEqual(keys.sort());
        const used = new Set(sources().flatMap(source => Array.from(source.matchAll(/["'](euler_circle_graph_\w+)["']/g), m => m[1])));
        for (const key of used) expect(keys, key).toContain(key);
        for (const key of keys) expect(used.has(key), `unused: ${key}`).toBe(true);
    });

    test('every other catalog key the graph uses exists in both languages', () => {
        const [graphSource] = sources();
        const used = new Set(Array.from(graphSource.matchAll(/\bt\("(\w+)"/g), m => m[1]).filter(key => !key.startsWith('euler_circle_graph_')));
        expect(used.size).toBeGreaterThan(0);
        for (const key of used) {
            expect(typeof sl[key as keyof typeof sl], key).toBe('string');
            expect(typeof en[key as keyof typeof sl], key).toBe('string');
        }
        expect(used).toContain('next_step');
        expect(used).toContain('reset');
    });

    test('no user-visible string is hard-coded in the source: every text goes through t()', () => {
        const [source] = sources();
        expect(source).not.toMatch(/<\w+[^<>{}]*>\s*[A-Za-zČŠŽčšž][^<{]*<\//);
        expect(source).not.toMatch(/label=\s*"[A-Za-z]/);
        expect(source).not.toMatch(/help=\s*"[A-Za-z]/);
    });

    test('the Slovenian term for the period is the one of the kinematics terms', () => {
        expect(sl.euler_circle_graph_r_period).toContain('Obhodni čas');
        expect(sl.euler_circle_graph_r_period).not.toContain('Perioda');
    });
});
