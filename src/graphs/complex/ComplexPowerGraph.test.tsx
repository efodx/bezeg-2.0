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
import {DEFAULT_COMPLEX_POWER_STATE} from '../../complex/complexPowerModel';
import {ComplexPowerGraph, ROW_PX, STEP_INTERVAL_MS} from './ComplexPowerGraph';

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

class ObservedGraph extends ComplexPowerGraph {
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

type Probe = {
    id: string; elType: string; plaintext?: string; evalVisProp(name: string): unknown; updateDataArray(): void;
};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const ofType = (graph: ObservedGraph, type: string) => probes(graph).filter(o => o.elType === type);
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
const captionTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(visible).map(o => o.plaintext ?? '');
/** The curves in creation order: the unit circle, then the path. */
const [UNIT_CIRCLE, PATH] = [0, 1];
const curves = (graph: ObservedGraph) => ofType(graph, 'curve');
const arrows = (graph: ObservedGraph) => ofType(graph, 'arrow');
const diamonds = (graph: ObservedGraph) => ofType(graph, 'point').filter(p => String(p.evalVisProp('face')) === 'diamond');

const field = (name: string) => screen.getByRole('spinbutton', {name}) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const labelOf = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const press = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const enter = (name: string, value: string) => act(() => { enterNumber(field(name), value); });
const status = () => document.querySelector('[data-complex-power-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const set = (graph: ObservedGraph, patch: Partial<typeof DEFAULT_COMPLEX_POWER_STATE>) => act(() => { graph.setState(patch); });
const reLabel = () => 'z, Re';
const imLabel = () => 'z, Im';
const nLabel = () => t('complex_power_graph_n_label');
const zAct = (re: number, im: number) => ({kind: 'complex-power', operation: 'set-z', re, im}) as const;
const nAct = (n: number) => ({kind: 'complex-power', operation: 'set-n', n}) as const;
const stepAct = (count?: number) => ({kind: 'complex-power', operation: 'step', ...(count === undefined ? {} : {count})}) as const;
function stepsPlayed(graph: ObservedGraph, ticks: number) {
    graph.clock.tick(0);
    for (let i = 1; i <= ticks; i++) graph.clock.tick(i * STEP_INTERVAL_MS);
}

describe('mount and the numbers', () => {
    test('the dashed unit circle holds its data on the first mount, as after a rebuild', () => {
        const {graph} = mountGraph();
        const drawn = () => (ofType(graph, 'curve') as unknown as {points: unknown[]; visPropCalc: {visible: boolean}}[]).map(c => c.visPropCalc.visible ? c.points.length : 0);
        const first = drawn();
        expect(first[0]).toBeGreaterThan(100);
        act(() => { graph.rebuildNow(); });
        expect(drawn()).toEqual(first);
    });
    test('the default z = 1 + i, n = 5 shows the exact power -4 - 4i, modulus 4 root 2 and every row labelled', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({A: 20, B: 20, n: 5});
        expect(readout('z')).toBe('1 + i');
        expect(readout('n')).toBe('5');
        expect(readout('re')).toBe('−4');
        expect(readout('im')).toBe('−4');
        expect(readout('modulus')).toContain('4√2');
        expect(readout('modulus')).toContain('≈ 5,656854');
        expect(readout('angle')).toBe('225°');
        expect(readout('principal')).toBe('−135°');
        expect(readout('real')).toBe('ne');
        expect(readout('unit')).toBe('ne');
        expect(readout('one')).toBe('ne');
        for (const id of ['z', 'n', 're', 'im', 'modulus', 'angle', 'principal', 'real', 'unit', 'one']) expect(labelOf(id), id).toBeTruthy();
        expect(labelOf('re')).toBe('Re z⁵, natančno');
        expect(labelOf('angle')).toBe('5·arg z, izračunano, ni zvedeno na glavno vrednost');
        expect(status()).toContain('z = 1 + i, n = 5: z⁵ = −4 − 4i.');
        expect(document.querySelector(`[aria-label="${t('complex_power_graph_board_label')}"]`)).not.toBeNull();
        noBadText();
    });

    test('a tiny power is never rounded to a bare 0: the status says ≈ with significant digits and the readouts keep their digits', () => {
        const {graph} = mountGraph();
        set(graph, {A: 1, B: 1, n: 8}); // z = 0,05 + 0,05i, z⁸ = 6,25·10⁻¹⁰
        expect(status()).toContain('z = 0,05 + 0,05i, n = 8: z⁸ ≈ 6,25·10⁻¹⁰.');
        expect(status()).not.toContain('z⁸ = 0');
        expect(readout('re')).toContain('≈ 6,25·10⁻¹⁰');
        expect(readout('modulus')).not.toMatch(/≈ 0$/);
        set(graph, {A: 1, B: 0, n: 2}); // z = 0,05, z² = 0,0025
        expect(status()).toContain('z² ≈ 0,0025.');
        set(graph, {A: 20, B: 20, n: 5}); // whole numbers stay exact
        expect(status()).toContain('z⁵ = −4 − 4i.');
        noBadText();
    });

    test('exact fractions and radicals are shown exactly and the unit circle is decided exactly', () => {
        const {graph} = mountGraph();
        set(graph, {A: 10, B: 0, n: 3});
        expect(readout('re')).toBe('1/8 ≈ 0,125');
        expect(readout('im')).toBe('0');
        expect(readout('modulus')).toBe('1/8 ≈ 0,125');
        set(graph, {A: 12, B: 16, n: 8});
        expect(readout('unit')).toBe('da');
        expect(readout('modulus')).toBe('1');
        set(graph, {A: 20, B: 20, n: 8});
        expect(readout('real')).toBe('da');
        expect(readout('re')).toBe('16');
        expect(readout('modulus')).toBe('16');
        set(graph, {A: 0, B: 20, n: 4});
        expect(readout('one')).toBe('da');
        set(graph, {A: 0, B: 0, n: 2});
        expect(readout('principal')).toBe(t('complex_power_graph_value_none'));
        expect(readout('angle')).toBe(t('complex_power_graph_value_none'));
        expect(status()).toContain(t('complex_power_graph_status_zero'));
        expect(captionTexts(graph)).toContain(t('complex_power_graph_cap_zero'));
        noBadText();
    });

    test('de Moivre: the nth power has modulus r^n and argument n phi', () => {
        const {graph} = mountGraph();
        for (const [A, B, n] of [[20, 20, 7], [10, 15, 6], [-16, 12, 8], [30, -10, 2]] as const) {
            set(graph, {A, B, n});
            const r = Math.hypot(A, B) / 20;
            const last = graph.derived().powers[n - 1];
            expect(Math.hypot(last.re, last.im) / r ** n).toBeCloseTo(1, 9);
            const delta = Math.atan2(last.im, last.re) - n * Math.atan2(B, A);
            expect(Math.atan2(Math.sin(delta), Math.cos(delta))).toBeCloseTo(0, 9);
        }
    });
});

describe('typed values, scene actions and the drag', () => {
    test('a typed coordinate or exponent that is off the grid or out of range is refused with the range in its help', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        for (const bad of ['0,33', '2,05', 'abc']) {
            enter(reLabel(), bad);
            expect(graph.state, bad).toBe(before);
        }
        for (const bad of ['0', '9', '2,5']) {
            enter(nLabel(), bad);
            expect(graph.state, bad).toBe(before);
        }
        expect(graph.editPoint(0.33, 0)).toBe(false);
        expect(graph.editPoint(0, Number.NaN)).toBe(false);
        expect(graph.editExponent(9)).toBe(false);
        enter(reLabel(), '2,05');
        const input = field(reLabel());
        expect(input.getAttribute('aria-invalid')).toBe('true');
        enter(reLabel(), '0,33');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const offGridHint = (input.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        expect(offGridHint).toContain(t('complex_power_graph_z_rejected', {value0: '−2', value1: '2', value2: '0,05'}));
        enter(reLabel(), '0,35');
        expect(graph.state.A).toBe(7);
        enter(imLabel(), '−1,25');
        expect(graph.state.B).toBe(-25);
        enter(nLabel(), '8');
        expect(graph.state.n).toBe(8);
        expect(graph.editPoint(-2, -1.25)).toBe(true);
        expect(graph.state.A).toBe(-40);
    });

    test('set-z, set-n and step in one synchronous tick each read the state the previous one wrote', () => {
        const {graph} = mountGraph();
        act(() => {
            graph.act(zAct(0.5, 0.5));
            graph.act(nAct(2));
            graph.act(stepAct());
            expect(graph.state).toMatchObject({A: 10, B: 10, n: 3});
            graph.act(stepAct(3));
        });
        expect(graph.state).toMatchObject({A: 10, B: 10, n: 6});
        expect(readout('n')).toBe('6');
        act(() => { graph.act(stepAct(2)); });
        expect(graph.state.n).toBe(8);
        expect(() => graph.act(zAct(0.51, 0))).toThrow(/re: off-grid/);
        expect(() => graph.act(nAct(9))).toThrow(/n: out-of-range/);
        expect(graph.state.n).toBe(8);
    });

    test('dragging z snaps to the grid, clamps inside [-2, 2] and ignores a non-finite position', () => {
        const {graph} = mountGraph();
        const handle = graph.dragHandle()!;
        dragHandleTo(handle, 0.372, -0.618);
        expect(graph.state).toMatchObject({A: 7, B: -12});
        expect(handle.X()).toBeCloseTo(0.35, 12);
        dragHandleTo(handle, 7, -9);
        expect(graph.state).toMatchObject({A: 40, B: -40});
        const before = graph.state;
        dragHandleTo(handle, Number.NaN, 1);
        expect(graph.state).toBe(before);
        expect(Number.isFinite(handle.X())).toBe(true);
    });

    test('a program-changed z is announced in the live status', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        act(() => { graph.act(zAct(0.5, 0)); });
        act(() => { vi.advanceTimersByTime(600); });
        expect(live()).toContain('z = 0,5');
    });
});

describe('stepping and playback', () => {
    test('next step and Reset write n; Reset goes back to n = 1 and keeps z', () => {
        const {graph} = mountGraph();
        press(t('next_step'));
        expect(graph.state.n).toBe(6);
        expect(document.querySelector('[data-step-counter]')!.textContent).toBe(t('step_counter', {value0: 6, value1: 8}));
        press(t('reset'));
        expect(graph.state).toMatchObject({A: 20, B: 20, n: 1});
        expect(readout('re')).toBe('1');
    });

    test('play makes one step per interval, a long frame still one, and ends at n = 8 with no frame pending', () => {
        const {graph} = mountGraph();
        press(t('reset'));
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(0);
        expect(graph.state.n).toBe(1);
        graph.clock.tick(STEP_INTERVAL_MS - 1);
        expect(graph.state.n).toBe(1);
        graph.clock.tick(STEP_INTERVAL_MS);
        expect(graph.state.n).toBe(2);
        graph.clock.tick(STEP_INTERVAL_MS + 20 * STEP_INTERVAL_MS);
        expect(graph.state.n).toBe(3);
        let time = 22 * STEP_INTERVAL_MS;
        for (let i = 0; i < 50 && graph.clock.pending(); i++) { time += STEP_INTERVAL_MS; graph.clock.tick(time); }
        expect(graph.state.n).toBe(8);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
    });

    test('pause stops at n; Play resumes from it with no jump', () => {
        const {graph} = mountGraph();
        press(t('reset'));
        press(t('play'));
        stepsPlayed(graph, 2);
        expect(graph.state.n).toBe(3);
        press(t('pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        graph.clock.tick(100000);
        graph.clock.tick(100000 + STEP_INTERVAL_MS);
        expect(graph.state.n).toBe(4);
    });

    test('reduced motion: Play does not move, says why through the rendered button, and Next step still works', () => {
        const {graph} = mountGraph(false, true);
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.state.n).toBe(5);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion_next_step'));
        press(t('next_step'));
        expect(graph.state.n).toBe(6);
    });
});

describe('every stored-field change pauses a playing run', () => {
    const playing = () => {
        const mounted = mountGraph();
        press(t('reset'));
        press(t('play'));
        stepsPlayed(mounted.graph, 1);
        expect(mounted.graph.isPlaying()).toBe(true);
        expect(mounted.graph.state.n).toBe(2);
        return mounted.graph;
    };

    test('a typed Re z', () => {
        const graph = playing();
        enter(reLabel(), '0,5');
        expect(graph.state.A).toBe(10);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('a typed exponent', () => {
        const graph = playing();
        enter(nLabel(), '6');
        expect(graph.state.n).toBe(6);
        expect(graph.isPlaying()).toBe(false);
    });

    test('the drag', () => {
        const graph = playing();
        dragHandleTo(graph.dragHandle()!, 0.7, 0.7);
        expect(graph.state.A).toBe(14);
        expect(graph.isPlaying()).toBe(false);
    });

    test('a scene action', () => {
        const graph = playing();
        act(() => { graph.act(stepAct()); });
        expect(graph.isPlaying()).toBe(false);
    });

    test.each([
        ['A', {A: 21}], ['B', {B: -3}], ['n + 1 written from outside', {n: 3}], ['another n', {n: 7}], ['n = 1', {n: 1}],
    ] as const)('a direct setState of %s', (_name, patch) => {
        const graph = playing();
        set(graph, patch);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('a write that changes no stored field leaves the run alone', () => {
        const graph = playing();
        act(() => { graph.setState({initialized: true}); });
        act(() => { graph.setState({n: 2}); });
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(2 * STEP_INTERVAL_MS);
        expect(graph.state.n).toBe(3);
    });
});

describe('captions and the legend', () => {
    test('a caption names z, every drawn power and the styles the legend states', () => {
        const {graph} = mountGraph();
        const texts = captionTexts(graph);
        expect(texts).toContain('z = 1 + i');
        for (const k of ['²', '³']) expect(texts).toContain(`z${k}`);
        expect(texts).toContain(t('complex_power_graph_cap_unit', {value0: t('complex_power_graph_style_dashed')}));
        expect(texts).toContain(t('complex_power_graph_cap_path', {value0: '⁵', value1: t('complex_power_graph_style_solid')}));
        expect(texts).toContain(t('complex_power_graph_cap_points', {value0: t('complex_power_graph_style_diamonds')}));
        expect(texts).toContain(t('complex_power_graph_cap_handle', {value0: t('complex_power_graph_style_circle')}));
    });

    test('the four legend rows stack at an even pitch and end inside the board', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard();
        type Placed = Probe & {X(): number; Y(): number};
        const rows = (ofType(graph, 'text') as Placed[]).filter(o => visible(o) && o.X() < -2.4).sort((a, b) => b.Y() - a.Y());
        expect(rows).toHaveLength(4);
        const ys = rows.map(o => o.Y());
        const pitches = ys.slice(1).map((y, i) => (ys[i] - y) * board.unitY);
        for (const pitch of pitches) expect(pitch).toBeCloseTo(ROW_PX, 6);
        expect((ys[3] - board.getBoundingBox()[3]) * board.unitY).toBeGreaterThanOrEqual(14);
    });

    test('each legend entry states the style of the element it names', () => {
        const {graph} = mountGraph();
        // dashed unit circle, solid path
        expect(sl.complex_power_graph_style_dashed).toBe('črtkano');
        expect(Number(curves(graph)[UNIT_CIRCLE].evalVisProp('dash'))).toBeGreaterThan(0);
        expect(sl.complex_power_graph_style_solid).toBe('polna črta');
        expect(Number(curves(graph)[PATH].evalVisProp('dash'))).toBe(0);
        // diamonds for the powers, a filled circle for the handle
        expect(sl.complex_power_graph_style_diamonds).toBe('rombi');
        expect(diamonds(graph)).toHaveLength(7);
        expect(sl.complex_power_graph_style_circle).toBe('poln krog');
        const handle = probes(graph).find(o => o.id === graph.dragHandle()!.id)!;
        expect(String(handle.evalVisProp('face'))).toBe('circle');
        expect(Number(handle.evalVisProp('fillopacity'))).toBeGreaterThan(0);
    });

    test('the powers up to n are drawn as diamonds and the rest hidden', () => {
        const {graph} = mountGraph();
        const shown = () => diamonds(graph).filter(visible).length;
        expect(shown()).toBe(2); // z^2 = 2i and z^3 = -2 + 2i; z^4 = -4 and z^5 are beyond the view (arrows)
        set(graph, {A: 10, B: 10, n: 3});
        expect(shown()).toBe(2);
        set(graph, {n: 2});
        expect(shown()).toBe(1);
        set(graph, {n: 1});
        expect(shown()).toBe(0);
    });

    test('a power beyond the view is drawn as an arrow with its modulus as text and listed in the status', () => {
        const {graph} = mountGraph();
        set(graph, {A: 30, B: 30, n: 4});
        const out = arrows(graph).filter(visible);
        expect(out.length).toBeGreaterThanOrEqual(1);
        const modulus = (Math.hypot(1.5, 1.5) ** 4).toFixed(2).replace('.', ',');
        expect(captionTexts(graph)).toContain(t('complex_power_graph_cap_out', {value0: '⁴', value1: modulus}));
        expect(status()).toContain(t('complex_power_graph_out_item', {value0: '⁴', value1: modulus}));
        for (const arrow of out) expect(arrow.evalVisProp('lastarrow')).toBeTruthy();
        set(graph, {A: 10, B: 10, n: 2});
        expect(arrows(graph).filter(visible)).toHaveLength(0);
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
        for (const n of [2, 8, 3]) { set(graph, {n}); expect(graph.ownedObjectCount()).toBe(owned); }
        set(graph, {A: 5, B: -7});
        expect(new Set(probes(graph).map(o => o.id))).toEqual(ids);
        const listeners = graph.ownedListenerCount();
        const handle = graph.dragHandle()!;
        expect(handlerCounts(handle)).toEqual([1, 1, 1]);

        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(count()).toBe(base);
        expect(handlerCounts(handle)).toEqual([0, 0, 0]);

        act(() => { graph.rebuildNow(); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.ownedListenerCount()).toBe(listeners);
        expect(count()).toBe(base + owned);
        expect(graph.dragHandle()).not.toBe(handle);
        expect(handlerCounts(graph.dragHandle()!)).toEqual([1, 1, 1]);
        expect(probes(graph).some(o => o.id === handle.id)).toBe(false);

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
        expect(curves(graph)).toHaveLength(2);
        expect(arrows(graph)).toHaveLength(7);
    });

    test('disposing the scene while playing stops the playback', () => {
        const {graph} = mountGraph();
        press(t('reset'));
        press(t('play'));
        graph.disposeNow();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
    });

    test('unmount while playing cancels the frame loop and every timer, removes the board label and the language listener', () => {
        vi.useFakeTimers();
        // JSXGraph leaves a timer of its own for every redrawn step (text.js), measured here with one step set from outside; the played run must leave the same
        // number: no frame, interval or settle timer of this graph (the status settle is cancelled by the unmount).
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setState({n: 2}); });
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();
        const {graph, view} = mountGraph();
        press(t('play'));
        stepsPlayed(graph, 1);
        expect(graph.clock.pending()).toBe(true);
        const liveTimers = vi.getTimerCount();
        view.unmount();
        expect(vi.getTimerCount()).toBeLessThan(liveTimers);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        expect(vi.getTimerCount() - afterPlain).toBeLessThanOrEqual(plainDelta);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('complex_power_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('the derived data is not recomputed for a language change or an initialized-only change, and is for other stored content', () => {
        const {graph} = mountGraph();
        const count = graph.derivationCount();
        act(() => setLanguage('en'));
        act(() => setLanguage('sl'));
        act(() => { graph.setState({initialized: true}); });
        expect(graph.derivationCount()).toBe(count);
        set(graph, {n: 6});
        expect(graph.derivationCount()).toBe(count + 1);
        set(graph, {A: 19});
        expect(graph.derivationCount()).toBe(count + 2);
    });
});

describe('language and the catalog', () => {
    test('switching the language renames the board, the labels, the captions and the status; the numbers stay', () => {
        const {graph} = mountGraph();
        set(graph, {A: 10, B: 0, n: 3});
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${en.complex_power_graph_board_label}"]`)).not.toBeNull();
        expect(labelOf('re')).toBe('Re z³, exact');
        expect(readout('re')).toBe('1/8 ≈ 0.125');
        expect(captionTexts(graph)).toContain(t('complex_power_graph_cap_path', {value0: '³', value1: en.complex_power_graph_style_solid}));
        expect(status()).toContain('z = 0.5, n = 3');
        act(() => setLanguage('sl'));
        expect(document.querySelector(`[aria-label="${sl.complex_power_graph_board_label}"]`)).not.toBeNull();
        expect(readout('re')).toBe('1/8 ≈ 0,125');
        expect(captionTexts(graph)).toContain(t('complex_power_graph_cap_path', {value0: '³', value1: sl.complex_power_graph_style_solid}));
    });

    test('numbers use the decimal comma and the true minus in Slovenian', () => {
        const {graph} = mountGraph();
        set(graph, {A: -7, B: 33, n: 2});
        expect(readout('z')).toBe('−0,35 + 1,65i');
        expect(readout('re')).not.toContain('-');
        expect(readout('principal')).toMatch(/^−?\d+,\d+°$/);
        expect(document.body.textContent).not.toMatch(/\d\.\d/);
    });

    test('every complex_power_graph key exists in both languages with the same placeholder names, and the sources use exactly these keys', () => {
        const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), m => m[1]).sort();
        const keys = Object.keys(sl).filter(key => key.startsWith('complex_power_graph_'));
        expect(keys.length).toBeGreaterThanOrEqual(56);
        for (const key of keys) {
            const slText = sl[key as keyof typeof sl];
            const enText = en[key as keyof typeof sl];
            expect(typeof enText, key).toBe('string');
            expect(enText.length, key).toBeGreaterThan(0);
            expect(names(enText), key).toEqual(names(slText));
        }
        expect(Object.keys(en).filter(key => key.startsWith('complex_power_graph_')).sort()).toEqual(keys.sort());
        const source = readFileSync('src/graphs/complex/ComplexPowerGraph.tsx', 'utf8') + readFileSync('src/graphs/complex/complexPowerPresetCollection.ts', 'utf8');
        const used = new Set(Array.from(source.matchAll(/(complex_power_graph_\w+)["']/g), m => m[1]));
        for (const key of used) expect(keys, key).toContain(key);
        for (const key of keys) expect(used.has(key), `unused: ${key}`).toBe(true);
    });

    test('no user-visible string is hard-coded in the source: every text goes through t()', () => {
        const source = readFileSync('src/graphs/complex/ComplexPowerGraph.tsx', 'utf8');
        expect(source).not.toMatch(/<\w+[^<>{}]*>\s*[A-Za-zČŠŽčšž][^<{]*<\//);
        expect(source).not.toMatch(/label=\s*"[A-Za-z]/);
    });
});
