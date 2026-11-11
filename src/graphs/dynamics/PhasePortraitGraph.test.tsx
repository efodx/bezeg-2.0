import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {expectHandleHitZones} from '../base/handleHitZoneBehaviour';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {TransientState} from '../base/BaseGraph';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {classifyPlane} from '../../dynamics/classify2';
import {DEFAULT_PHASE_STATE, entryOf, ORBIT_DURATION, type PhaseState} from '../../dynamics/phaseModel';
import {RK4_STEP} from '../../dynamics/rk4';
import {formatNumber} from '../../analysis/format';
import {
    HANDLE_TOUCH_RADIUS, HIT_SLACK, INSET_DELTA_MAX, INSET_TAU_MAX, legendLines, MAX_FRAME_MS, PhasePortraitGraph, STORED_FIELDS, TIME_STEP, typeLabel,
} from './PhasePortraitGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    requests = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; this.requests++; return ++this.handle; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

/** Exposes the board and the disposal the scene replacement calls, with a fake clock and a switchable reduced-motion setting. */
class ObservedGraph extends PhasePortraitGraph {
    clock = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return this.reduced; }
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    rebuildNow() { this.syncReplacedScene(); }
    capture(): TransientState { return this.captureTransientState(); }
    restore(saved: TransientState | undefined) { this.restoreTransientState(saved); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
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

type Probe = {id: string; elType: string; plaintext?: string; dataX?: number[]; dataY?: number[]; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const ofType = (graph: ObservedGraph, type: string) => probes(graph).filter(o => o.elType === type);
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
const captionTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(visible).map(o => o.plaintext ?? '');
/** The curves in creation order: frame, wraps, separatrix, ringLinear, ring, seedBackward, seedForward. */
const [FRAME, WRAPS, SEPARATRIX, RING_LINEAR, RING, SEED_BACK, SEED_FORWARD] = [0, 1, 2, 3, 4, 5, 6];
const curves = (graph: ObservedGraph) => ofType(graph, 'curve');
const polylines = (o: Probe) => ((o.dataX ?? []).length === 0 ? 0 : (o.dataX ?? []).filter(Number.isNaN).length + 1);

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const labelOf = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const status = () => document.querySelector('[data-phase-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const set = (graph: ObservedGraph, patch: Partial<PhaseState>) => act(() => { graph.setState(patch); });
const matrix = (graph: ObservedGraph, A: number, B: number, C: number, D: number) => set(graph, {A: A * 4, B: B * 4, C: C * 4, D: D * 4});
function go(graph: ObservedGraph, time: number): boolean {
    let accepted = false;
    act(() => { accepted = graph.setTime(time); });
    return accepted;
}
function run(graph: ObservedGraph, limit = 400) {
    let time = 0;
    graph.clock.tick(time);
    for (let i = 0; i < limit && graph.clock.pending(); i++) { time += MAX_FRAME_MS; graph.clock.tick(time); }
}
const labels = {
    a: () => t('phase_graph_matrix_a_label'), b: () => t('phase_graph_matrix_b_label'), c: () => t('phase_graph_matrix_c_label'), d: () => t('phase_graph_matrix_d_label'),
    seedX: (n: number) => t('phase_graph_seed_x_label', {value0: String(n)}), seedY: (n: number) => t('phase_graph_seed_y_label', {value0: String(n)}),
    seedTheta: (n: number) => t('phase_graph_seed_theta_label', {value0: String(n)}), seedOmega: (n: number) => t('phase_graph_seed_omega_label', {value0: String(n)}),
    system: () => t('phase_graph_system_label'),
};
const chooseSystem = (system: string) => act(() => { fireEvent.change(field(labels.system()), {target: {value: system}}); });
const timeSlider = () => field(t('phase_graph_time_label'));

describe('mount and the type label', () => {
    test('the default is a stable node of the matrix [[-4, -1], [-2, -3]], named exactly, with the board labelled', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject(DEFAULT_PHASE_STATE);
        expect(document.querySelector(`[aria-label="${t('phase_graph_board_label')}"]`)).not.toBeNull();
        expect(readout('type')).toBe(t('phase_graph_type_node_stable'));
        expect(labelOf('type')).toBe(t('phase_graph_r_type_linear'));
        expect(readout('tau')).toBe('−7');
        expect(readout('delta')).toBe('10');
        expect(readout('discriminant')).toBe('9');
        expect(readout('hyperbolic')).toBe(t('phase_graph_yes'));
        expect(document.querySelector('[data-readout="decision"]')).toBeNull();
        expect(curves(graph)).toHaveLength(7);
        noBadText();
    });

    // [A, B, C, D] as written, then the type that hand calculation gives: tau, delta and tau^2 - 4 delta in the comment.
    test.each([
        ['saddle', [1, 0, 0, -1], 'phase_graph_type_saddle'],                              // delta = -1 < 0
        ['stable node', [-1, 0, 0, -2], 'phase_graph_type_node_stable'],                   // tau -3, delta 2, disc 1
        ['unstable node', [2, 0, 0, 1], 'phase_graph_type_node_unstable'],                 // tau 3, delta 2, disc 1
        ['stable spiral', [-1, -2, 2, -1], 'phase_graph_type_spiral_stable'],              // tau -2, delta 5, disc -16
        ['unstable spiral', [1, -2, 2, 1], 'phase_graph_type_spiral_unstable'],            // tau 2, delta 5, disc -16
        ['centre', [0, -1, 1, 0], 'phase_graph_type_centre'],                              // tau 0, delta 1
        ['unstable star node', [1, 0, 0, 1], 'phase_graph_type_star_unstable'],            // disc 0, A = lambda I
        ['stable star node', [-2, 0, 0, -2], 'phase_graph_type_star_stable'],
        ['unstable degenerate node', [1, 1, 0, 1], 'phase_graph_type_degenerate_unstable'], // disc 0, not scalar
        ['stable degenerate node', [-1, 1, 0, -1], 'phase_graph_type_degenerate_stable'],
        ['line of equilibria', [1, 0, 0, 0], 'phase_graph_type_line_of_equilibria'],       // delta 0, tau 1
        ['shear flow', [0, 1, 0, 0], 'phase_graph_type_shear_flow'],                       // delta 0, tau 0, A != 0
        ['everything fixed', [0, 0, 0, 0], 'phase_graph_type_all_fixed'],
    ] as const)('%s: the label is the exact classification of the matrix', (_name, entries, key) => {
        const {graph} = mountGraph();
        matrix(graph, entries[0], entries[1], entries[2], entries[3]);
        expect(readout('type')).toBe(t(key));
        expect(typeLabel(graph.derived().plane.type)).toBe(t(key));
        expect(status()).toContain(t(key));
        expect(captionTexts(graph)).toContain(t('phase_graph_cap_equilibrium', {value0: t(key)}));
        noBadText();
    });

    test('the thirteen labels are distinct in both languages', () => {
        const keys = Object.keys(sl).filter(key => /^phase_graph_type_/.test(key));
        expect(keys).toHaveLength(13);
        for (const language of [sl, en]) expect(new Set(keys.map(key => language[key as keyof typeof sl])).size).toBe(13);
    });

    test('a quarter-grid matrix is classified without a tolerance: tau^2 = 4 delta is a node with one eigenvalue, one step off is a spiral or a node', () => {
        const {graph} = mountGraph();
        matrix(graph, 1.25, 0, 0, 1.25);
        expect(graph.derived().plane.type.kind).toBe('star-node');
        matrix(graph, 1.25, 0.25, 0, 1.25);
        expect(graph.derived().plane.type.kind).toBe('degenerate-node');
        matrix(graph, 1.25, 0.25, -0.25, 1.25);
        expect(graph.derived().plane.type.kind).toBe('spiral');
        expect(graph.derived().plane).toEqual(classifyPlane(graph.derived().jacobian));
    });

    test('the eigenvalues and the trajectories are labelled as computed and the type as exact', () => {
        mountGraph();
        expect(labelOf('eigen')).toBe(t('phase_graph_r_eigen'));
        expect(t('phase_graph_r_eigen')).toMatch(/izračun|computed/i);
        expect(readout('eigen')).toContain('−2');
        expect(readout('eigen')).toContain('−5');
        expect(t('phase_graph_cap_trajectories')).toMatch(/izračun|computed/i);
        expect(en['phase_graph_cap_trajectories']).toMatch(/computed/i);
        expect(sl['phase_graph_cap_trajectories']).toMatch(/izračun/i);
        expect(en['phase_graph_r_eigen']).toMatch(/computed/i);
    });
});

describe('stops are shown, never clipped silently', () => {
    test('the default seed leaves the region backward: the seed row, the legend row and the stop count say so, and the half is drawn up to the stop', () => {
        const {graph} = mountGraph();
        const orbit = graph.derived().orbits[0];
        expect(orbit.forwardStop).toBe('complete');
        expect(orbit.backwardStop).toBe('left-view');
        const seconds = formatNumber((orbit.backward.length - 1) * RK4_STEP, 'sl', 2);
        expect(readout('seed-1')).toContain(t('phase_graph_stop_left_view', {value0: seconds}));
        expect(readout('seed-1')).toContain(t('phase_graph_stop_complete', {value0: '10'}));
        expect(captionTexts(graph)).toContain(t('phase_graph_cap_stops', {value0: '1', value1: '2'}));
        const back = curves(graph)[SEED_BACK];
        const last = back.dataX!.length - 1;
        expect(Number.isFinite(back.dataX![last])).toBe(true);
        expect(Math.hypot(back.dataX![last], back.dataY![last])).toBeGreaterThan(3);
        noBadText();
    });

    test('a trajectory that stays inside shows no stop row; a stop reason is named for every kind', () => {
        const {graph} = mountGraph();
        matrix(graph, 0, -1, 1, 0);
        expect(graph.derived().orbits[0].forwardStop).toBe('complete');
        expect(graph.derived().orbits[0].backwardStop).toBe('complete');
        expect(captionTexts(graph).some(text => text.includes(t('phase_graph_cap_stops', {value0: '0', value1: '2'})))).toBe(false);
        expect(readout('seed-1')).toContain(t('phase_graph_stop_complete', {value0: '10'}));
    });

    test('the legend names every drawn element and each caption row is a board text', () => {
        const {graph} = mountGraph();
        const texts = captionTexts(graph);
        for (const key of ['phase_graph_cap_trajectories', 'phase_graph_cap_moving', 'phase_graph_cap_eigen', 'phase_graph_cap_frame'] as const) {
            expect(texts, key).toContain(t(key));
        }
        expect(texts).not.toContain(t('phase_graph_cap_ring'));
        expect(texts).not.toContain(t('phase_graph_cap_separatrix'));
        chooseSystem('pendulum');
        const pendulum = captionTexts(graph);
        for (const key of ['phase_graph_cap_ring', 'phase_graph_cap_ring_linear', 'phase_graph_cap_separatrix', 'phase_graph_cap_wrap'] as const) {
            expect(pendulum, key).toContain(t(key));
        }
    });

    test('a seed caption stays clear of its own trajectory (default seeds, and a dragged seed)', () => {
        const {graph} = mountGraph();
        act(() => { graph.setSeedCount(3); });
        const board = graph.liveBoard();
        const clearance = () => {
            const result: number[] = [];
            for (let i = 0; i < 3; i++) {
                const text = (ofType(graph, 'text') as unknown as Array<Probe & {X(): number; Y(): number}>)
                    .find(o => o.plaintext === t('phase_graph_cap_seed', {value0: String(i + 1)}))!;
                const x0 = text.X() * board.unitX;
                const y0 = text.Y() * board.unitY;
                const width = 7.5 * String(text.plaintext).length;
                const orbit = graph.derived().orbits[i];
                let best = Infinity;
                for (const [px, py] of [...orbit.forward, ...orbit.backward]) {
                    const gapX = Math.max(x0 - px * board.unitX, 0, px * board.unitX - (x0 + width));
                    const gapY = Math.max(y0 - 9 - py * board.unitY, 0, py * board.unitY - (y0 + 9));
                    best = Math.min(best, Math.hypot(gapX, gapY));
                }
                result.push(best);
            }
            return result;
        };
        for (const gap of clearance()) expect(gap).toBeGreaterThanOrEqual(7.5);
        act(() => { graph.setState({seeds: [{X: 2, Y: 1}, {X: -3, Y: 2}, {X: 1, Y: -3}]}); });
        for (const gap of clearance()) expect(gap).toBeGreaterThanOrEqual(7.5);
    });

    test('a seed handle and a caption "seed n" exist for each seed and the seed row names the same number', () => {
        const {graph} = mountGraph();
        act(() => { graph.setSeedCount(3); });
        expect(graph.state.seeds).toHaveLength(3);
        const texts = captionTexts(graph);
        for (const n of [1, 2, 3]) {
            expect(texts).toContain(t('phase_graph_cap_seed', {value0: String(n)}));
            expect(labelOf(`seed-${n}`)).toBe(t('phase_graph_r_seed', {value0: String(n)}));
        }
        expect(texts).not.toContain(t('phase_graph_cap_seed', {value0: '4'}));
    });
});

describe('the linear handles and numeric input', () => {
    test('each of the four entries and each seed coordinate has a field; a typed value on the grid is stored, an off-grid or out-of-range one is refused and kept', () => {
        const {graph} = mountGraph();
        enter(labels.a(), '1,25');
        expect(graph.state.A).toBe(5);
        enter(labels.a(), '1,3');
        expect(graph.state.A).toBe(5);
        enter(labels.a(), '5');
        expect(graph.state.A).toBe(5);
        enter(labels.d(), 'abc');
        expect(graph.state.D).toBe(-12);
        enter(labels.b(), '-4');
        expect(graph.state.B).toBe(-16);
        enter(labels.c(), '0,5');
        expect(graph.state.C).toBe(2);
        enter(labels.seedX(1), '2,5');
        expect(graph.state.seeds[0]).toEqual({X: 50, Y: 0});
        enter(labels.seedY(1), '4,01');
        expect(graph.state.seeds[0].Y).toBe(0);
        enter(labels.seedY(1), '4,05');
        expect(graph.state.seeds[0].Y).toBe(0);
        enter(labels.seedY(1), '-4');
        expect(graph.state.seeds[0].Y).toBe(-80);
        enter(labels.seedX(1), '-4,05');
        expect(graph.state.seeds[0].X).toBe(50);
        expect(graph.editEntry('A', 4.1)).toBe(false);
        expect(graph.editEntry('A', Number.NaN)).toBe(false);
        expect(graph.editSeed(0, 'X', 4.0001)).toBe(false);
        expect(graph.editSeed(3, 'X', 1)).toBe(false);
        noBadText();
    });

    test('a refused entry keeps the state (the same object), marks the field invalid and states the range in the hint', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        enter(labels.a(), '9');
        expect(graph.state).toBe(before);
        const input = field(labels.a());
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const hint = (input.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        expect(hint).toContain(t('number_range_hint', {value0: '−4', value1: '4'}));
    });

    test('dragging a column handle snaps to the quarter grid and clamps to [-4, 4]; a non-finite drag changes nothing', () => {
        const {graph} = mountGraph();
        const handle = graph.columnHandle(0)!;
        expect([handle.X(), handle.Y()]).toEqual([entryOf(-16), entryOf(-8)]);
        dragHandleTo(handle, 1.3, -0.9);
        expect([graph.state.A, graph.state.C]).toEqual([5, -4]);
        expect([handle.X(), handle.Y()]).toEqual([1.25, -1]);
        dragHandleTo(handle, 9, -9);
        expect([graph.state.A, graph.state.C]).toEqual([16, -16]);
        const second = graph.columnHandle(1)!;
        dragHandleTo(second, 0.37, 2.2);
        expect([graph.state.B, graph.state.D]).toEqual([1, 9]);
        const before = graph.state;
        vi.spyOn(handle, 'X').mockReturnValue(NaN);
        act(() => { (handle as EventedPoint).triggerEventHandlers(['drag'], []); });
        expect(graph.state).toBe(before);
        noBadText();
    });

    test('dragging a seed snaps to the 1/20 grid inside [-4, 4] and moves the readout and the trajectory', () => {
        const {graph} = mountGraph();
        const handle = graph.seedHandle(0)!;
        dragHandleTo(handle, 0.52, -0.48);
        expect(graph.state.seeds[0]).toEqual({X: 10, Y: -10});
        expect([handle.X(), handle.Y()]).toEqual([0.5, -0.5]);
        expect(readout('seed-1')).toContain('0,5');
        dragHandleTo(handle, 12, -12);
        expect(graph.state.seeds[0]).toEqual({X: 80, Y: -80});
        expect(graph.derived().orbits[0].start).toEqual([4, -4]);
    });

    test('dragging neither rebuilds the scene nor changes the number of objects; the column handles are shown only for the linear system', () => {
        const {graph} = mountGraph();
        expectHandleHitZones(graph.liveBoard(), [graph.seedHandle(0)!, graph.columnHandle(0)!, graph.columnHandle(1)!], HANDLE_TOUCH_RADIUS + HIT_SLACK);
        const owned = graph.ownedObjectCount();
        const handle = graph.seedHandle(0)!;
        dragHandleTo(handle, 1, 1);
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.seedHandle(0)).toBe(handle);
        const column = graph.columnHandle(0)! as unknown as Probe;
        expect(visible(column)).toBe(true);
        chooseSystem('pendulum');
        expect(visible(column)).toBe(false);
        expect(document.querySelector(`input[aria-label="${labels.a()}"]`)).toBeNull();
    });

    test('every numeric field and the zoom slider is described by the help that states the ranges', () => {
        mountGraph();
        const described = (label: string) => expect(field(label).getAttribute('aria-describedby') ?? '').toContain('phase-portrait-input-help');
        for (const label of [labels.a(), labels.b(), labels.c(), labels.d(), labels.seedX(1), labels.seedY(1)]) described(label);
        const help = document.querySelector('p.form-text[id^="phase-portrait-input-help"]')!.textContent!;
        expect(help).toContain('−4');
        expect(help).toContain('0,25');
        expect(help).toContain('0,05');
    });

    test('the seed count stays 1 to 6; adding takes new grid points that are not yet seeds', () => {
        const {graph} = mountGraph();
        expect(graph.setSeedCount(0)).toBe(false);
        expect(graph.setSeedCount(7)).toBe(false);
        expect(graph.setSeedCount(1.5)).toBe(false);
        act(() => { graph.setSeedCount(6); });
        const keys = graph.state.seeds.map(seed => `${seed.X},${seed.Y}`);
        expect(keys).toHaveLength(6);
        expect(new Set(keys).size).toBe(6);
        act(() => { graph.setSeedCount(2); });
        expect(graph.state.seeds).toHaveLength(2);
        expect(visible(graph.seedHandle(2)! as unknown as Probe)).toBe(false);
    });

    test('program-changed values are announced: the status names the new type at once and the live region says it once the change settles', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        act(() => { vi.advanceTimersByTime(1000); });
        act(() => { graph.setState({A: 0, B: -4, C: 4, D: 0}); });
        expect(status()).toContain(t('phase_graph_type_centre'));
        act(() => { vi.advanceTimersByTime(1000); });
        expect(live()).toContain(t('phase_graph_type_centre'));
    });
});

describe('the pendulum and the rings', () => {
    test('the pendulum names H of every seed: swing, rotation, exactly on the separatrix, with six digits', () => {
        const {graph} = mountGraph();
        chooseSystem('pendulum');
        expect(graph.state.system).toBe('pendulum');
        expect(document.querySelector('[data-readout="energy-1"]')).not.toBeNull();
        expect(readout('energy-1')).toContain(t('phase_graph_energy_swing', {value0: '−0,459698'}).split('=')[0]);
        expect(readout('energy-1')).toContain('<');
        act(() => { graph.setSeedCount(3); });
        enter(labels.seedTheta(1), '0');
        enter(labels.seedOmega(1), '2');
        expect(graph.derived().energies[0].kind).toBe('separatrix-exact');
        expect(readout('energy-1')).toContain(t('phase_graph_energy_separatrix_exact', {value0: '1'}));
        enter(labels.seedOmega(1), '3');
        expect(graph.derived().energies[0].kind).toBe('rotation');
        expect(readout('energy-1')).toContain('H = 3,5');
        expect(labelOf('energy-1')).toBe(t('phase_graph_r_energy', {value0: '1'}));
        noBadText();
    });

    test('H is written with six digits, so a swing near the separatrix does not read "1 < 1"', () => {
        const {graph} = mountGraph();
        chooseSystem('pendulum');
        enter(labels.seedTheta(1), '0');
        enter(labels.seedOmega(1), '1,95');
        expect(graph.derived().energies[0]).toMatchObject({kind: 'swing'});
        expect(readout('energy-1')).toContain('0,90125');
    });

    test('the pendulum draws the separatrix, the wrap lines and the ring pair; the pendulum seed fields are named theta and omega', () => {
        const {graph} = mountGraph();
        chooseSystem('pendulum');
        const drawn = curves(graph);
        expect(polylines(drawn[SEPARATRIX])).toBe(2);
        expect(polylines(drawn[WRAPS])).toBeGreaterThan(0);
        expect(polylines(drawn[RING])).toBe(12);
        expect(polylines(drawn[RING_LINEAR])).toBe(12);
        expect(visible(drawn[SEPARATRIX])).toBe(true);
        expect(field(labels.seedTheta(1))).toBeTruthy();
        expect(field(labels.seedOmega(1))).toBeTruthy();
    });

    test('the linear system draws no ring, separatrix or wraps and the ring curves are hidden and empty', () => {
        const {graph} = mountGraph();
        const drawn = curves(graph);
        for (const index of [WRAPS, SEPARATRIX, RING, RING_LINEAR]) {
            expect(visible(drawn[index]), String(index)).toBe(false);
            expect(polylines(drawn[index]), String(index)).toBe(0);
        }
        expect(document.querySelector('[data-readout="ring"]')).toBeNull();
    });

    test('the second pendulum equilibrium is a saddle; the choice appears only for the pendulum', () => {
        const {graph} = mountGraph();
        expect(document.querySelector(`select[aria-label="${t('phase_graph_equilibrium_label')}"]`)).toBeNull();
        chooseSystem('pendulum');
        expect(readout('type')).toBe(t('phase_graph_type_centre'));
        expect(readout('decision')).toBe(t('phase_graph_decision_no'));
        act(() => { fireEvent.change(field(t('phase_graph_equilibrium_label')), {target: {value: '1'}}); });
        expect(graph.state.equilibrium).toBe(1);
        expect(readout('type')).toBe(t('phase_graph_type_saddle'));
        expect(readout('decision')).toBe(t('phase_graph_decision_yes'));
        expect(labelOf('type')).toBe(t('phase_graph_r_type_linearization'));
        expect(graph.editEquilibrium(2)).toBe(false);
        expect(graph.editEquilibrium(-1)).toBe(false);
    });

    test('the weakly spiralling system: the linearization is a centre and says it does not decide; the ring pair is drawn', () => {
        const {graph} = mountGraph();
        chooseSystem('weak-spiral');
        expect(readout('type')).toBe(t('phase_graph_type_centre'));
        expect(readout('hyperbolic')).toBe(t('phase_graph_no'));
        expect(readout('decision')).toBe(t('phase_graph_decision_no'));
        expect(status()).toContain(t('phase_graph_decision_no'));
        expect(readout('ring')).toBeDefined();
        expect(readout('ring-linear')).toBeDefined();
        expect(polylines(curves(graph)[RING])).toBe(12);
        expect(labelOf('ring')).toBe(t('phase_graph_r_ring'));
        expect(labelOf('ring-linear')).toBe(t('phase_graph_r_ring_linear'));
        expect(en['phase_graph_decision_no']).toMatch(/not|does/i);
        noBadText();
    });

    test('stops of the ring are counted in its readout row and in the legend', () => {
        const {graph} = mountGraph();
        chooseSystem('weak-spiral');
        const d = graph.derived();
        const halves = d.ring.reduce((sum, o) => sum + Number(o.forwardStop !== 'complete') + Number(o.backwardStop !== 'complete'), 0);
        expect(readout('ring')).toBe(t('phase_graph_ring_value', {value0: '12', value1: String(halves), value2: '24'}));
    });

    test('one NaN-separated curve per style: the seeds are one curve each however many seeds there are', () => {
        const {graph} = mountGraph();
        act(() => { graph.setSeedCount(5); });
        const before = curves(graph).length;
        expect(before).toBe(7);
        expect(polylines(curves(graph)[SEED_FORWARD])).toBe(5);
        act(() => { graph.setSeedCount(2); });
        expect(polylines(curves(graph)[SEED_FORWARD])).toBe(2);
        expect(curves(graph)).toHaveLength(7);
        expect(polylines(curves(graph)[FRAME])).toBe(1);
    });

    test('zoom shrinks the computed region, the frame and the view row; the ring follows the region', () => {
        const {graph} = mountGraph();
        const box0 = graph.derived().view;
        expect(box0.xMax - box0.xMin).toBe(8);
        act(() => { fireEvent.change(field(t('phase_graph_zoom_label')), {target: {value: '2'}}); });
        expect(graph.state.zoom).toBe(2);
        expect(graph.derived().view.xMax - graph.derived().view.xMin).toBe(2);
        expect(Math.max(...(curves(graph)[FRAME].dataX ?? []))).toBeCloseTo(1, 12);
        expect(graph.editZoom(7)).toBe(false);
        expect(graph.editZoom(1.5)).toBe(false);
        expect(graph.state.zoom).toBe(2);
        noBadText();
    });
});

describe('stored fields', () => {
    test('STORED_FIELDS equals the keys of PhaseState, so no field can miss the pause rule', () => {
        const keys: Record<keyof PhaseState, true> = {system: true, A: true, B: true, C: true, D: true, seeds: true, equilibrium: true, zoom: true};
        expect([...STORED_FIELDS].sort()).toEqual(Object.keys(keys).sort());
    });
});

describe('control texts and ids', () => {
    test('the time help names the Reset scope; the Reset label is the shared one', () => {
        mountGraph();
        expect(t('phase_graph_time_help', {value0: '10', value1: '0,05'})).toContain('t = 0');
        expect(screen.getByRole('button', {name: t('reset')})).toBeTruthy();
    });

    test('two mounted graphs describe their inputs by different ids', () => {
        mountGraph();
        mountGraph();
        const ids = [...document.querySelectorAll('p.form-text[id^="phase-portrait-input-help"]')].map(el => el.id);
        expect(ids.length).toBe(2);
        expect(new Set(ids).size).toBe(2);
    });
});

describe('the (tau, delta) inset', () => {
    test('it shows its scale as visible tick labels at the ends of both axes', () => {
        mountGraph();
        const ticks = [...document.querySelectorAll('[data-phase-inset] [data-inset-tick]')].map(el => el.textContent);
        expect(ticks).toEqual(['−8', '8', '32', '−32']);
    });

    test('it states the point in its label and holds every matrix of the grid inside its range', () => {
        mountGraph();
        const svg = document.querySelector('[data-phase-inset]')!;
        expect(svg.getAttribute('aria-label')).toBe(t('phase_graph_inset_label', {value0: '−7', value1: '10', value2: '8', value3: '32'}));
        // tau and delta extremes of the grid: entries in [-4, 4]
        expect(INSET_TAU_MAX).toBeGreaterThanOrEqual(8);
        expect(INSET_DELTA_MAX).toBeGreaterThanOrEqual(32);
    });

    test('the label follows the matrix and the language', () => {
        const {graph} = mountGraph();
        matrix(graph, 1, 0, 0, -1);
        expect(document.querySelector('[data-phase-inset]')!.getAttribute('aria-label')).toContain('−1');
        act(() => setLanguage('en'));
        expect(document.querySelector('[data-phase-inset]')!.getAttribute('aria-label')).toBe(t('phase_graph_inset_label', {value0: '0', value1: '−1', value2: '8', value3: '32'}));
    });
});

describe('playback', () => {
    test('play advances the time by the frame delta (at most 100 ms), pause stops it, no frame is pending after', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.playing).toBe(true);
        graph.clock.tick(0);
        graph.clock.tick(50);
        expect(graph.time).toBeCloseTo(0.05, 9);
        graph.clock.tick(5050);
        expect(graph.time).toBeCloseTo(0.05 + MAX_FRAME_MS / 1000, 9);
        press(t('pause'));
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        const stopped = graph.time;
        graph.clock.tick(9999);
        expect(graph.time).toBe(stopped);
    });

    test('the moving point of each seed follows its orbit at the time', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        const orbit = graph.derived().orbits[0];
        const moving = ofType(graph, 'point').filter(o => (o.evalVisProp('face') as string) === '[]');
        expect(moving).toHaveLength(6);
        const index = Math.round(1 / RK4_STEP);
        const first = moving[0] as unknown as {X(): number; Y(): number};
        expect(first.X()).toBeCloseTo(orbit.forward[index][0], 12);
        expect(first.Y()).toBeCloseTo(orbit.forward[index][1], 12);
        expect(moving.filter(visible)).toHaveLength(1);
    });

    test('the run ends at the horizon with a status, stops its frame loop, and Play at the end starts again from 0', () => {
        const {graph} = mountGraph();
        press(t('play'));
        run(graph);
        expect(graph.time).toBe(ORBIT_DURATION);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(status()).toContain(t('phase_graph_status_ended', {value0: '10'}));
        press(t('play'));
        expect(graph.playing).toBe(true);
        expect(graph.time).toBe(0);
        press(t('pause'));
    });

    test('a point whose forward orbit stopped is parked at its end and the status counts the parked points', () => {
        const {graph} = mountGraph();
        matrix(graph, 1, 0, 0, 1); // everything leaves the region forward
        const orbit = graph.derived().orbits[0];
        expect(orbit.forwardStop).toBe('left-view');
        go(graph, ORBIT_DURATION);
        expect(status()).toContain(t('phase_graph_status_parked', {value0: '1', value1: '1'}));
        const last = orbit.forward[orbit.forward.length - 1];
        const moving = ofType(graph, 'point').filter(o => (o.evalVisProp('face') as string) === '[]')[0] as unknown as {X(): number; Y(): number};
        expect([moving.X(), moving.Y()]).toEqual([last[0], last[1]]);
    });

    test('Reset returns to t = 0 and stops; it is unavailable with a reason at t = 0', () => {
        const {graph} = mountGraph();
        expect(screen.getByRole('button', {name: t('reset')}).getAttribute('aria-disabled')).toBe('true');
        go(graph, 2);
        press(t('reset'));
        expect(graph.time).toBe(0);
        expect(screen.getByRole('button', {name: t('reset')}).getAttribute('aria-disabled')).toBe('true');
    });

    test('reduced motion: Play starts no frame loop and says why; the slider still sets the time', () => {
        const {graph} = mountGraph();
        graph.reduced = true;
        go(graph, 0);
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.playing).toBe(false);
        expect(graph.clock.requests).toBe(0);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion_time'));
        act(() => { fireEvent.change(timeSlider(), {target: {value: '1.5'}}); });
        expect(graph.time).toBe(1.5);
    });

    test('the time slider reaches the horizon, refuses beyond it and has the step of the integration', () => {
        const {graph} = mountGraph();
        expect(TIME_STEP).toBe(RK4_STEP);
        expect(timeSlider().getAttribute('max')).toBe(String(ORBIT_DURATION));
        expect(go(graph, ORBIT_DURATION)).toBe(true);
        expect(go(graph, ORBIT_DURATION + 0.5)).toBe(false);
        expect(go(graph, -0.1)).toBe(false);
        expect(go(graph, Number.NaN)).toBe(false);
        expect(graph.time).toBe(ORBIT_DURATION);
    });

    test('while it plays the live region is silent and the visible readout moves; on pause the live region says the state once', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        press(t('play'));
        graph.clock.tick(0);
        graph.clock.tick(100);
        expect(live()).toBe('');
        expect(readout('time')).toBe(`1,1 ${t('phase_graph_unit_s')}`);
        press(t('pause'));
        expect(live()).toContain(t('phase_graph_status_time', {value0: '1,1'}));
    });

    test('every change of a stored field pauses the playback, from a control, a drag or a direct setState', () => {
        const {graph} = mountGraph();
        const playing = () => { press(t('play')); expect(graph.playing).toBe(true); };
        playing();
        enter(labels.a(), '1');
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        playing();
        dragHandleTo(graph.seedHandle(0)!, 0.5, 0.5);
        expect(graph.playing).toBe(false);
        for (const patch of [{A: 8}, {B: 8}, {C: 4}, {D: 4}, {seeds: [{X: 10, Y: 10}]}, {zoom: 1}, {equilibrium: 0, system: 'pendulum' as const}]) {
            playing();
            act(() => { graph.setState(patch); });
            expect(graph.playing, JSON.stringify(patch)).toBe(false);
            expect(graph.clock.pending()).toBe(false);
        }
        playing();
        act(() => { graph.setState({initialized: true}); });
        expect(graph.playing).toBe(true);
        press(t('pause'));
    });

    test('a lesson checkpoint keeps the time and lands stopped; a bad saved time is refused with a status', () => {
        const {graph} = mountGraph();
        go(graph, 2);
        const saved = graph.capture();
        expect(saved.phaseTime).toBe(2);
        press(t('play'));
        act(() => graph.restore(saved));
        expect(graph.time).toBe(2);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        for (const bad of [99, -1, Number.NaN, '2']) {
            act(() => graph.restore({phaseTime: bad} as unknown as TransientState));
            expect(graph.time).toBe(0);
            expect(graph.statusText()).toContain(t('phase_graph_notice_time_refused'));
        }
        act(() => graph.restore(undefined));
        expect(graph.statusText()).not.toContain(t('phase_graph_notice_time_refused'));
    });

    test('unmount while playing cancels the frame loop and every timer of the graph, removes the board label', () => {
        vi.useFakeTimers();
        // JSXGraph leaves timers of its own for redrawn text; a played run must leave the same number as a plain mount with one edit.
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setState({zoom: 1}); });
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();
        const {graph, view} = mountGraph();
        press(t('play'));
        graph.clock.tick(0);
        graph.clock.tick(100);
        expect(graph.clock.pending()).toBe(true);
        const livingTimers = vi.getTimerCount();
        view.unmount();
        expect(vi.getTimerCount()).toBeLessThan(livingTimers);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        expect(vi.getTimerCount() - afterPlain).toBeLessThanOrEqual(plainDelta + 0);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('phase_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('disposing the scene while playing stops the playback', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.disposeNow();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.playing).toBe(false);
    });
});

describe('ownership, rebuild and StrictMode', () => {
    test('disposal returns the board and the listeners to their pre-mount count and the rebuild gives the same scene', () => {
        const {graph, view} = mountGraph();
        const board = graph.liveBoard();
        const owned = graph.ownedObjectCount();
        const listeners = graph.ownedListenerCount();
        const base = board.objectsList.length - owned;
        expect(base).toBeGreaterThanOrEqual(0);
        const seed = graph.seedHandle(0)!;
        const column = graph.columnHandle(1)!;
        expect(handlerCounts(seed)).toEqual([1, 1, 1]);
        expect(handlerCounts(column)).toEqual([1, 1, 1]);
        expect(listeners).toBeGreaterThan(0);

        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(board.objectsList.length).toBe(base);
        expect(handlerCounts(seed)).toEqual([0, 0, 0]);
        expect(handlerCounts(column)).toEqual([0, 0, 0]);

        act(() => { graph.rebuildNow(); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.ownedListenerCount()).toBe(listeners);
        expect(board.objectsList.length).toBe(base + owned);
        expect(graph.seedHandle(0)).not.toBe(seed);
        expect(handlerCounts(graph.seedHandle(0)!)).toEqual([1, 1, 1]);
        expect(probes(graph).some(o => o.id === (seed as unknown as Probe).id)).toBe(false);
        expect(curves(graph)[SEED_FORWARD].dataX!.length).toBeGreaterThan(10);

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
    });

    test('a change of system or of the seed count keeps the scene size; no object leaks', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard();
        const total = board.objectsList.length;
        chooseSystem('pendulum');
        expect(board.objectsList.length).toBe(total);
        act(() => { graph.setSeedCount(6); });
        expect(board.objectsList.length).toBe(total);
        chooseSystem('weak-spiral');
        act(() => { graph.setSeedCount(1); });
        chooseSystem('linear');
        expect(board.objectsList.length).toBe(total);
    });

    test('the eigen-direction lines run through owned hidden points: two lines for a node, one for a defective matrix, none for a spiral', () => {
        const {graph} = mountGraph();
        const lines = () => ofType(graph, 'line').filter(visible).length;
        expect(lines()).toBe(2);
        matrix(graph, 1, 1, 0, 1);
        expect(lines()).toBe(1);
        matrix(graph, 1, -2, 2, 1);
        expect(lines()).toBe(0);
        matrix(graph, 0, -1, 1, 0);
        expect(lines()).toBe(0);
        const lineObjects = ofType(graph, 'line');
        expect(lineObjects).toHaveLength(2);
        const points = ofType(graph, 'point').filter(o => !visible(o));
        expect(points.length).toBeGreaterThanOrEqual(4); // the centre, two ends, the origin of the column segments
    });

    test('the derived data is not recomputed for a language change or an initialized-only change, and is for other stored content', () => {
        const {graph} = mountGraph();
        const count = graph.derivationCount();
        act(() => setLanguage('en'));
        act(() => setLanguage('sl'));
        act(() => { graph.setState({initialized: true}); });
        go(graph, 1);
        expect(graph.derivationCount()).toBe(count);
        set(graph, {A: 4});
        expect(graph.derivationCount()).toBe(count + 1);
    });
});

describe('language and the catalog', () => {
    test('switching the language renames the board, the labels, the captions, the type and the status', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${en['phase_graph_board_label']}"]`)).not.toBeNull();
        expect(screen.getByLabelText(en['phase_graph_system_label'])).toBeTruthy();
        expect(captionTexts(graph)).toContain(en['phase_graph_cap_trajectories']);
        expect(readout('type')).toBe(en['phase_graph_type_node_stable']);
        expect(status()).toMatch(/^Time 1 s\./);
        expect(readout('time')).toBe('1 s');
        expect(readout('tau')).toBe('−7');
        noBadText();
    });

    test('numbers use the decimal comma and the true minus in Slovenian', () => {
        const {graph} = mountGraph();
        matrix(graph, -1.25, 0, 0, -0.5);
        expect(readout('jacobian')).toContain('−1,25');
        expect(readout('jacobian')).not.toContain('-');
        expect(graph.derived().plane.type.kind).toBe('node');
    });

    test('every phase_graph key exists in both languages and has the same placeholder names', () => {
        const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), m => m[1]).sort();
        const keys = Object.keys(sl).filter(key => key.startsWith('phase_graph_'));
        expect(keys.length).toBeGreaterThanOrEqual(97);
        for (const key of keys) {
            const slText = sl[key as keyof typeof sl];
            const enText = en[key as keyof typeof sl];
            expect(typeof enText, key).toBe('string');
            expect(enText.length, key).toBeGreaterThan(0);
            expect(names(enText), key).toEqual(names(slText));
        }
        expect(Object.keys(en).filter(key => key.startsWith('phase_graph_')).sort()).toEqual(keys.sort());
    });
});

describe('the legend on a narrow board (390 x 480 px)', () => {
    const sizes = {clientWidth: 390, offsetWidth: 390, clientHeight: 480, offsetHeight: 480} as const;
    const restore = [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const;
    // The shims give every element 600 x 400 px; this board is 390 x 480 px from its creation on.
    beforeEach(() => {
        for (const [name, size] of Object.entries(sizes)) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 390, bottom: 480, width: 390, height: 480, toJSON: () => ({})}) as DOMRect;
    });
    afterEach(() => {
        for (const [name, size] of restore) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
    });

    for (const language of ['sl', 'en'] as const) {
        test(`a legend row that wraps leaves room for its lines, so no row runs into the next (${language})`, () => {
            setLanguage(language);
            const {graph} = mountGraph();
            const board = graph.liveBoard();
            const top = board.getBoundingBox()[1];
            const rows = (ofType(graph, 'text') as unknown as Array<Probe & {X(): number; Y(): number}>)
                .filter(o => visible(o) && o.evalVisProp('anchory') === 'top' && o.evalVisProp('anchorx') === 'left' && o.Y() > top - 200 / board.unitY && o.Y() <= top)
                .sort((a, b) => b.Y() - a.Y());
            expect(rows.length).toBeGreaterThanOrEqual(5);
            expect(rows.some(row => legendLines(String(row.plaintext), 390) > 1)).toBe(true);
            for (let i = 0; i + 1 < rows.length; i++) {
                const gapPx = (rows[i].Y() - rows[i + 1].Y()) * board.unitY;
                expect(gapPx, String(rows[i].plaintext)).toBeGreaterThanOrEqual(legendLines(String(rows[i].plaintext), 390) * 20 - 0.5);
            }
        });
    }
});
