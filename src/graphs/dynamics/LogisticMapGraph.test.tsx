import React from 'react';
import {readFileSync} from 'node:fs';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, settle} from '../base/realGraphTestHarness';
import {en} from '../../localization/en';
import {sl} from '../../localization/sl';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {BIFURCATION_R_MAX, BIFURCATION_R_MIN, columnR} from '../../dynamics/bifurcation';
import {DEFAULT_LOGISTIC_STATE, STEP_RANGE} from '../../dynamics/phaseModel';
import {
    CHAOS_ONSET, DIAGRAM_COLUMNS, diagramPolyline, diagramX, LogisticMapGraph, SECOND_SPLIT, STEP_INTERVAL_MS, VIEW_BOX,
} from './LogisticMapGraph';

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
class ObservedGraph extends LogisticMapGraph {
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
    id: string; elType: string; plaintext?: string; dataX?: number[]; dataY?: number[]; evalVisProp(name: string): unknown; updateDataArray(): void;
};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const ofType = (graph: ObservedGraph, type: string) => probes(graph).filter(o => o.elType === type);
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
const captionTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(visible).map(o => o.plaintext ?? '');
/** The curves in creation order. */
const [FRAME, DIAGRAM, MARKS, CURSOR, MAP, DIAGONAL, COBWEB] = [0, 1, 2, 3, 4, 5, 6];
const curves = (graph: ObservedGraph) => ofType(graph, 'curve');
/** Counts the calls of a curve's updateDataArray from now on. */
function countUpdates(curve: Probe): {count: () => number} {
    let calls = 0;
    const original = curve.updateDataArray;
    curve.updateDataArray = function (this: Probe) { calls++; return original.call(this); };
    return {count: () => calls};
}

/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const labelOf = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const hasRow = (id: string) => document.querySelector(`[data-readout="${id}"]`) !== null;
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
/** The range input of a slider named `label`. */
const rangeOf = (label: string) => screen.getByRole('slider', {name: label}) as HTMLInputElement;
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const status = () => document.querySelector('[data-logistic-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const set = (graph: ObservedGraph, patch: Partial<typeof DEFAULT_LOGISTIC_STATE>) => act(() => { graph.setState(patch); });
const setR = (graph: ObservedGraph, R: number) => set(graph, {R});
const rField = () => t('number_field_label', {value0: t('phase_graph_logistic_r_label')});
const xField = () => t('phase_graph_logistic_x_label');
const dec = (value: number, digits: number) => value.toFixed(digits).replace('.', ',').replace('-', '−');
function stepsPlayed(graph: ObservedGraph, ticks: number) {
    graph.clock.tick(0);
    for (let i = 1; i <= ticks; i++) graph.clock.tick(i * STEP_INTERVAL_MS);
}

describe('mount and the numbers', () => {
    test('a new board opens on the exact window, not widened to the board aspect (the diagram and the cobweb use different units)', () => {
        const {graph} = mountGraph();
        const box = graph.liveBoard().getBoundingBox().map(value => Number(value.toFixed(6)));
        // The right edge is the window's; the left edge is widened where the board is narrow so that the y axis numbers have room.
        expect(box[2]).toEqual(VIEW_BOX[2]);
        expect(box[0]).toBeLessThanOrEqual(VIEW_BOX[0]);
        // The top and the bottom are the window's, extended only as far as the captions need on this (small) board.
        expect(box[1]).toBeGreaterThanOrEqual(VIEW_BOX[1]);
        expect(box[3]).toBeLessThanOrEqual(VIEW_BOX[3]);
    });

    test('the default r = 2,9, x0 = 0,2 shows the exact fixed point and a computed period 1, with the board labelled', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject(DEFAULT_LOGISTIC_STATE);
        expect(document.querySelector(`[aria-label="${t('phase_graph_logistic_board_label')}"]`)).not.toBeNull();
        expect(readout('r')).toBe('2,9');
        expect(readout('x0')).toBe('0,2');
        expect(readout('fixed')).toBe('0,655172');
        expect(readout('fixed-multiplier')).toBe('−0,9');
        expect(readout('kind')).toBe(t('phase_graph_logistic_row_kind_fixed'));
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: '1'}));
        expect(readout('cycle')).toBe(t('phase_graph_logistic_cycle_none'));
        expect(hasRow('cycle-multiplier')).toBe(false);
        expect(hasRow('note')).toBe(false);
        expect(status()).toContain(t('phase_graph_logistic_kind_fixed', {value0: '0,655172', value1: '−0,9'}));
        noBadText();
    });

    test('every readout row is labelled, also those that appear only for some r', () => {
        const {graph} = mountGraph();
        const check = () => {
            const rows = Array.from(document.querySelectorAll('[data-readout]'));
            expect(rows.length).toBeGreaterThanOrEqual(10);
            for (const row of rows) {
                expect(row.querySelector('dt')?.textContent?.trim().length, row.getAttribute('data-readout') ?? '').toBeGreaterThan(0);
                expect(row.querySelector('dd')?.textContent?.trim().length, row.getAttribute('data-readout') ?? '').toBeGreaterThan(0);
            }
        };
        check();
        setR(graph, 310);
        check();
        setR(graph, 380);
        check();
        expect(labelOf('cycle-multiplier')).toBe(t('phase_graph_logistic_r_cycle_mult'));
        expect(labelOf('note')).toBe(t('phase_graph_logistic_r_note'));
    });
});

describe('the kind by R and the computed period', () => {
    test.each([
        [290, 'phase_graph_logistic_row_kind_fixed'],
        [299, 'phase_graph_logistic_row_kind_fixed'],
        [300, 'phase_graph_logistic_row_kind_neutral'],
        [310, 'phase_graph_logistic_row_kind_two'],
        [344, 'phase_graph_logistic_row_kind_two'],
        [345, 'phase_graph_logistic_row_kind_beyond'],
    ] as const)('R = %i has the kind row %s', (R, key) => {
        const {graph} = mountGraph();
        setR(graph, R);
        expect(readout('kind')).toBe(t(key));
    });

    test('the 2-cycle at r = 3,1 is 0,558014 and 0,764567 with multiplier 0,59; the neutral r = 3 has no 2-cycle row value', () => {
        const {graph} = mountGraph();
        setR(graph, 310);
        expect(readout('cycle')).toBe(t('phase_graph_logistic_cycle_value', {value0: '0,558014', value1: '0,764567'}));
        expect(readout('cycle-multiplier')).toBe('0,59');
        expect(readout('fixed-multiplier')).toBe('−1,1');
        expect(status()).toContain(t('phase_graph_logistic_kind_two', {value0: '0,677419', value1: '−1,1', value2: '0,558014', value3: '0,764567', value4: '0,59'}));
        setR(graph, 300);
        expect(readout('fixed-multiplier')).toBe('−1');
        expect(readout('cycle')).toBe(t('phase_graph_logistic_cycle_none'));
        expect(status()).toContain(t('phase_graph_logistic_kind_neutral', {value0: '0,666667'}));
    });

    test.each([
        [290, '1'], [310, '2'], [344, '2'], [346, '4'], [354, '4'], [355, '8'],
    ])('R = %i has a computed period %s', (R, period) => {
        const {graph} = mountGraph();
        setR(graph, R);
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: period}));
        expect(hasRow('note')).toBe(false);
    });

    test.each([357, 360, 380, 400])('R = %i is past the onset: no period claim, no period digit, and the precision note', R => {
        const {graph} = mountGraph();
        setR(graph, R);
        const claimless = t('phase_graph_logistic_period_claimless_value', {value0: dec(CHAOS_ONSET, 5)});
        expect(readout('period')).toBe(claimless);
        expect(readout('period')).not.toMatch(/\d\s*\(/);
        expect(readout('note')).toBe(t('phase_graph_logistic_note_precision', {value0: dec(CHAOS_ONSET, 5)}));
        expect(status()).toContain(t('phase_graph_logistic_period_sentence', {value0: claimless}));
        expect(status()).toContain(readout('note')!);
        noBadText();
    });
});

describe('the cursor and the diagram', () => {
    test('the still curves (frames, diagram, marks) are visible and hold their points on the first mount and after a rebuild', () => {
        const {graph} = mountGraph();
        const expectStillDrawn = () => {
            const still = (graph.liveBoard().objectsList as unknown as Array<{elType: string; visProp: {needsregularupdate: boolean}; visPropCalc: {visible: boolean}; points: unknown[]}>)
                .filter(object => object.elType === 'curve' && !object.visProp.needsregularupdate);
            expect(still.length).toBe(3);
            for (const curve of still) {
                expect(curve.visPropCalc.visible).toBe(true);
                expect(curve.points.length).toBeGreaterThan(1);
            }
        };
        expectStillDrawn();
        graph.disposeNow();
        act(() => { graph.rebuildNow(); });
        expectStillDrawn();
    });

    test('the cursor snaps to the nearest column and reports that column\'s r, not R/100', () => {
        const {graph} = mountGraph();
        expect(graph.cursor()).toEqual({column: 106, r: columnR(DIAGRAM_COLUMNS, 106)});
        expect(readout('column')).toBe(t('phase_graph_logistic_column_value', {value0: '2,8985', value1: '107', value2: '400'}));
        expect(curves(graph)[CURSOR].dataX).toEqual([diagramX(columnR(DIAGRAM_COLUMNS, 106)), diagramX(columnR(DIAGRAM_COLUMNS, 106))]);
        setR(graph, 300);
        expect(graph.cursor().column).toBe(133);
        expect(curves(graph)[CURSOR].dataX![0]).toBeCloseTo(1.8, 10);
        setR(graph, 250);
        expect(graph.cursor()).toEqual({column: 0, r: 2.5});
        expect(curves(graph)[CURSOR].dataX![0]).toBe(diagramX(2.5));
        setR(graph, 400);
        expect(graph.cursor()).toEqual({column: 399, r: 4});
        expect(curves(graph)[CURSOR].dataX![0]).toBe(diagramX(4));
        expect(curves(graph)[CURSOR].dataY).toEqual([0, 1]);
    });

    test('the diagram is deterministic and built once; its column of r = 2,9 is one run at the fixed point and r = 4 spans the interval', () => {
        const first = diagramPolyline();
        expect(diagramPolyline()).toBe(first);
        const {graph} = mountGraph();
        expect(curves(graph)[DIAGRAM].dataX).toBe(first.x);
        const runs = (r: number) => {
            const at = diagramX(r);
            const found: [number, number][] = [];
            for (let i = 0; i + 1 < first.x.length; i++) if (first.x[i] === at && first.x[i + 1] === at) found.push([first.y[i], first.y[i + 1]]);
            return found;
        };
        const column = runs(columnR(DIAGRAM_COLUMNS, 106));
        expect(column).toHaveLength(1);
        const fixed = 1 - 1 / columnR(DIAGRAM_COLUMNS, 106);
        expect(column[0][0]).toBeLessThanOrEqual(fixed);
        expect(column[0][1]).toBeGreaterThanOrEqual(fixed);
        expect(column[0][1] - column[0][0]).toBeLessThanOrEqual(0.0051);
        const last = runs(4);
        expect(last.length).toBeGreaterThanOrEqual(1);
        expect(Math.min(...last.map(run => run[0]))).toBeLessThan(0.05);
        expect(Math.max(...last.map(run => run[1]))).toBeGreaterThan(0.95);
        expect(first.x.every(x => Number.isNaN(x) || (x >= diagramX(BIFURCATION_R_MIN) && x <= diagramX(BIFURCATION_R_MAX)))).toBe(true);
        expect(first.y.every(y => Number.isNaN(y) || (y >= 0 && y <= 1))).toBe(true);
    });

    test('an r change redraws the cursor, the map and the marker but never the diagram or the marks', () => {
        const {graph} = mountGraph();
        const diagram = countUpdates(curves(graph)[DIAGRAM]);
        const marks = countUpdates(curves(graph)[MARKS]);
        const frame = countUpdates(curves(graph)[FRAME]);
        const cursor = countUpdates(curves(graph)[CURSOR]);
        const map = countUpdates(curves(graph)[MAP]);
        setR(graph, 330);
        setR(graph, 345);
        expect(cursor.count()).toBeGreaterThan(0);
        expect(map.count()).toBeGreaterThan(0);
        expect(diagram.count()).toBe(0);
        expect(marks.count()).toBe(0);
        expect(frame.count()).toBe(0);
    });

    test('the view box holds both panels and the caption rows', () => {
        mountGraph();
        expect(VIEW_BOX[0]).toBeLessThan(0);
        expect(VIEW_BOX[2]).toBeGreaterThan(diagramX(BIFURCATION_R_MAX));
        expect(VIEW_BOX[3]).toBeLessThan(0);
        expect(VIEW_BOX[1]).toBeGreaterThan(1);
    });

    test('the y axis writes no number below 0, where the caption rows are', () => {
        const {graph} = mountGraph();
        const ticks = (graph.liveBoard() as unknown as {defaultAxes: {y: {defaultTicks: {generateLabelText(tick: unknown, zero: unknown, value: number): string}}}}).defaultAxes.y.defaultTicks;
        const label = (value: number) => ticks.generateLabelText({usrCoords: [1, 0, value]}, undefined, value);
        expect(label(-0.2)).toBe('');
        expect(label(-0.4)).toBe('');
        expect(label(0.5)).not.toBe('');
        expect(label(1)).not.toBe('');
    });

    test('no y tick number reaches into the caption rows: the lowest labelled tick, with its half row, ends clear of the first caption row', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard();
        const ticks = (board as unknown as {defaultAxes: {y: {defaultTicks: {generateLabelText(tick: unknown, zero: unknown, value: number): string}}}}).defaultAxes.y.defaultTicks;
        const [, top, , bottom] = board.getBoundingBox();
        let lowestLabelled = Infinity;
        for (let value = Math.ceil(bottom * 10) / 10; value <= top; value = Math.round((value + 0.1) * 10) / 10) {
            if (ticks.generateLabelText({usrCoords: [1, 0, value]}, undefined, value) !== '') lowestLabelled = Math.min(lowestLabelled, value);
        }
        expect(lowestLabelled).toBeGreaterThanOrEqual(0);
        const firstCaptionTopPx = Math.min(...(probes(graph) as unknown as Array<Probe & {Y(): number}>)
            .filter(o => o.elType === 'text' && o.evalVisProp('anchory') === 'top' && o.Y() < 0).map(o => -o.Y() * board.unitY));
        const labelBottomPx = -lowestLabelled * board.unitY + 9;
        expect(firstCaptionTopPx - labelBottomPx).toBeGreaterThanOrEqual(10);
    });
});

describe('the cobweb', () => {
    test('the map is r x (1 - x) and the cobweb path alternates map and diagonal from (x0, x0)', () => {
        const {graph} = mountGraph();
        const map = curves(graph)[MAP];
        expect(map.dataX![0]).toBe(0);
        expect(map.dataX![map.dataX!.length - 1]).toBe(1);
        map.dataX!.forEach((x, i) => expect(map.dataY![i]).toBeCloseTo(2.9 * x * (1 - x), 12));
        expect(curves(graph)[DIAGONAL].dataX).toEqual([0, 1]);
        expect(curves(graph)[DIAGONAL].dataY).toEqual([0, 1]);
        // Step 0: a zero-length segment at the start, so the curve evaluates to finite points but draws nothing.
        expect(curves(graph)[COBWEB].dataX).toEqual([0.2, 0.2]);
        expect(curves(graph)[COBWEB].dataY).toEqual([0.2, 0.2]);
        set(graph, {step: 2});
        const x1 = 2.9 * 0.2 * 0.8;
        const x2 = 2.9 * x1 * (1 - x1);
        const cobweb = curves(graph)[COBWEB];
        expect(cobweb.dataX!.slice(0, 3)).toEqual([0.2, 0.2, x1]);
        expect(cobweb.dataY!.slice(0, 3)).toEqual([0.2, x1, x1]);
        expect(cobweb.dataX).toHaveLength(5);
        expect(cobweb.dataX![3]).toBeCloseTo(x1, 12);
        expect(cobweb.dataY![3]).toBeCloseTo(x2, 12);
        expect(cobweb.dataX![4]).toBeCloseTo(x2, 12);
        expect(cobweb.dataY![4]).toBeCloseTo(x2, 12);
        expect(x1).toBeCloseTo(0.464, 12);
        expect(readout('iterate')).toBe(dec(x2, 6));
        expect(labelOf('iterate')).toBe(t('phase_graph_logistic_r_iterate', {value0: '₂'}));
    });

    test('the map follows r and the markers: fixed point always, the 2-cycle only above r = 3, the iterate only after a step', () => {
        const {graph} = mountGraph();
        // The four markers are created just before the draggable start handle, which is the last point.
        const points = () => ofType(graph, 'point').slice(-5, -1);
        const shown = () => points().map(visible);
        expect(shown()).toEqual([true, false, false, false]);
        setR(graph, 310);
        expect(shown()).toEqual([true, true, true, false]);
        set(graph, {step: 3});
        expect(shown()).toEqual([true, true, true, true]);
        setR(graph, 300);
        expect(shown()).toEqual([true, false, false, true]);
        const map = curves(graph)[MAP];
        expect(map.dataY![60]).toBeCloseTo(3 * 0.5 * 0.5, 12);
    });
});

describe('stepping and playback', () => {
    test('next step and Reset write the step; the counter and the status follow', () => {
        const {graph} = mountGraph();
        press(t('next_step'));
        expect(graph.state.step).toBe(1);
        expect(document.querySelector('[data-step-counter]')!.textContent).toBe(t('step_counter', {value0: 1, value1: 60}));
        expect(readout('steps')).toBe(t('phase_graph_logistic_steps_value', {value0: '1', value1: '60'}));
        press(t('reset'));
        expect(graph.state.step).toBe(0);
        expect(graph.state).toMatchObject({R: 290, X: 20});
        expect(status()).toContain(t('phase_graph_logistic_status', {value0: '2,9', value1: '0,2', value2: '0', value3: '60', value4: '₀', value5: '0,2'}));
    });

    test('play makes one step per interval, a long frame still one, and ends at step 60 with no frame pending', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(0);
        expect(graph.state.step).toBe(0);
        graph.clock.tick(STEP_INTERVAL_MS - 1);
        expect(graph.state.step).toBe(0);
        graph.clock.tick(STEP_INTERVAL_MS);
        expect(graph.state.step).toBe(1);
        graph.clock.tick(STEP_INTERVAL_MS + 20 * STEP_INTERVAL_MS);
        expect(graph.state.step).toBe(2);
        let time = 22 * STEP_INTERVAL_MS;
        for (let i = 0; i < 200 && graph.clock.pending(); i++) { time += STEP_INTERVAL_MS; graph.clock.tick(time); }
        expect(graph.state.step).toBe(STEP_RANGE.max);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        press(t('reset'));
        expect(graph.state.step).toBe(0);
    });

    test('pause stops at the step; Play resumes from it with no jump', () => {
        const {graph} = mountGraph();
        press(t('play'));
        stepsPlayed(graph, 3);
        expect(graph.state.step).toBe(3);
        press(t('pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        graph.clock.tick(100000);
        graph.clock.tick(100000 + STEP_INTERVAL_MS);
        expect(graph.state.step).toBe(4);
    });

    test('reduced motion: Play does not jump; it says why, starts no frame loop, and Next step still works', () => {
        const {graph} = mountGraph(false, true);
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.state.step).toBe(0);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion_next_step'));
        const reason = document.getElementById('logistic-play-reduced-reason')!;
        expect(reason.textContent).toBe(t('playback_block_reduced_motion_next_step'));
        expect(reason.closest('[hidden]')).toBeNull();
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-describedby')?.split(' ')).toContain(reason.id);
        press(t('next_step'));
        expect(graph.state.step).toBe(1);
    });
});

describe('every stored-field change pauses a playing run', () => {
    const playing = () => {
        const mounted = mountGraph();
        press(t('play'));
        stepsPlayed(mounted.graph, 1);
        expect(mounted.graph.isPlaying()).toBe(true);
        expect(mounted.graph.state.step).toBe(1);
        return mounted.graph;
    };

    test('the r control', () => {
        const graph = playing();
        act(() => { fireEvent.change(rangeOf(t('phase_graph_logistic_r_label')), {target: {value: '3.1'}}); });
        expect(graph.state.R).toBe(310);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('the x0 field', () => {
        const graph = playing();
        enter(xField(), '0,5');
        expect(graph.state.X).toBe(50);
        expect(graph.isPlaying()).toBe(false);
    });

    test('the drag', () => {
        const graph = playing();
        dragHandleTo(graph.dragHandle()!, 0.7, 0.7);
        expect(graph.state.X).toBe(70);
        expect(graph.isPlaying()).toBe(false);
    });

    test.each([
        ['R', {R: 301}], ['X', {X: 33}], ['step + 1', {step: 2}], ['another step', {step: 9}], ['step 0', {step: 0}],
    ] as const)('a direct setState of %s', (_name, patch) => {
        const graph = playing();
        set(graph, patch);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('an initialized-only write does not pause', () => {
        const graph = playing();
        act(() => { graph.setState({initialized: true}); });
        expect(graph.isPlaying()).toBe(true);
        graph.clock.tick(2 * STEP_INTERVAL_MS);
        expect(graph.state.step).toBe(2);
    });
});

describe('typed values and the drag', () => {
    test('a typed r off the grid, below or above the range is refused: the state is the same object and the field is invalid with the range in its help', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        for (const bad of ['3,456', '4,5', '2,49', '4,01', 'abc']) {
            enter(rField(), bad);
            expect(graph.state, bad).toBe(before);
        }
        expect(graph.editR(3.456)).toBe(false);
        expect(graph.editR(Number.NaN)).toBe(false);
        expect(graph.editR(4.5)).toBe(false);
        enter(rField(), '3,456');
        const input = field(rField());
        expect(input.getAttribute('aria-invalid')).toBe('true');
        const hint = (input.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        expect(hint).toContain(t('phase_graph_logistic_r_rejected', {value0: '2,5', value1: '4', value2: '0,01'}));
        enter(rField(), '3,46');
        expect(graph.state.R).toBe(346);
        expect(graph.editR(2.5)).toBe(true);
        expect(graph.editR(4)).toBe(true);
        expect(graph.state.R).toBe(400);
    });

    test('a typed x0 of 0 or 1, or off the grid, is refused; 0,01 and 0,99 are accepted', () => {
        const {graph} = mountGraph();
        const before = graph.state;
        for (const bad of ['0', '1', '0,505', '-0,2', '1,5']) {
            enter(xField(), bad);
            expect(graph.state, bad).toBe(before);
        }
        expect(graph.editStart(0)).toBe(false);
        expect(graph.editStart(1)).toBe(false);
        expect(graph.editStart(0.01)).toBe(true);
        expect(graph.state.X).toBe(1);
        expect(graph.editStart(0.99)).toBe(true);
        expect(graph.state.X).toBe(99);
        expect(graph.editStart(0.5)).toBe(true);
        expect(graph.state.X).toBe(50);
    });

    test('both controls state the range in their help (aria-describedby), the slider and the field', () => {
        mountGraph();
        const help = (input: HTMLElement) => (input.getAttribute('aria-describedby') ?? '').split(' ').map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        expect(help(rangeOf(t('phase_graph_logistic_r_label')))).not.toContain('v korakih'); // the track shows the range; no help repeats it
        const range = rangeOf(xField());
        expect([range.min, range.max, range.step]).toEqual(['0.01', '0.99', '0.01']);
        expect(help(range)).toContain(t('phase_graph_logistic_x_help'));
    });

    test('dragging the start handle snaps to the grid on the diagonal; a drag outside clamps inside (0, 1); non-finite changes nothing', () => {
        const {graph} = mountGraph();
        const handle = graph.dragHandle()!;
        expect([handle.X(), handle.Y()]).toEqual([0.2, 0.2]);
        dragHandleTo(handle, 0.374, 0.8);
        expect(graph.state.X).toBe(37);
        expect([handle.X(), handle.Y()]).toEqual([0.37, 0.37]);
        dragHandleTo(handle, 0.3704, 0.9);
        expect(graph.state.X).toBe(37);
        expect([handle.X(), handle.Y()]).toEqual([0.37, 0.37]);
        dragHandleTo(handle, 3, 0.5);
        expect(graph.state.X).toBe(99);
        dragHandleTo(handle, -2, 0.5);
        expect(graph.state.X).toBe(1);
        const before = graph.state;
        dragHandleTo(handle, Number.NaN, 0.5);
        expect(graph.state).toBe(before);
    });

    test('a program-changed r or x0 is announced in the live status', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        setR(graph, 310);
        act(() => { vi.advanceTimersByTime(600); });
        expect(live()).toContain(t('phase_graph_logistic_status', {value0: '3,1', value1: '0,2', value2: '0', value3: '60', value4: '₀', value5: '0,2'}));
        set(graph, {X: 55});
        act(() => { vi.advanceTimersByTime(600); });
        expect(live()).toContain('0,55');
    });
});

describe('captions', () => {
    test('a caption names every element a readout names, the marks and the scales', () => {
        const {graph} = mountGraph();
        set(graph, {step: 2, R: 310});
        const texts = captionTexts(graph);
        const has = (text: string) => expect(texts, text).toContain(text);
        has(t('phase_graph_logistic_cap_map', {value0: '3,1'}));
        has(t('phase_graph_logistic_cap_diagonal'));
        has(t('phase_graph_logistic_cap_cobweb'));
        has(t('phase_graph_logistic_cap_diagram', {value0: '2,5', value1: '4'}));
        has(t('phase_graph_logistic_cap_start', {value0: '0,2'}));
        has(t('phase_graph_logistic_cap_fixed', {value0: '0,677419'}));
        has(t('phase_graph_logistic_cap_cycle', {value0: '0,558014', value1: '0,764567'}));
        has(t('phase_graph_logistic_cap_cursor', {value0: '3,1015', value1: t('phase_graph_logistic_period_value', {value0: '2'})}));
        has(t('phase_graph_logistic_cap_r', {value0: '2,5'}));
        has(t('phase_graph_logistic_cap_r', {value0: '4'}));
        has(t('phase_graph_logistic_cap_r', {value0: '3'}));
        has(t('phase_graph_logistic_cap_mark_second', {value0: '3,44949'}));
        expect(SECOND_SPLIT).toBeCloseTo(3.449490, 6);
        has(t('phase_graph_logistic_cap_onset', {value0: '3,56995'}));
        expect(texts.some(text => text.startsWith('x₂ = '))).toBe(true);
        expect(texts.every(text => !/NaN|undefined/.test(text))).toBe(true);
    });

    test('the captions under the x axis start below its tick numbers and every row stays on the board', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard();
        const below = (probes(graph) as unknown as Array<Probe & {Y(): number}>).filter(o => o.elType === 'text' && o.evalVisProp('anchory') === 'top' && o.Y() < 0);
        expect(below.length).toBeGreaterThanOrEqual(8);
        const boardBottomPx = -board.getBoundingBox()[3] * board.unitY;
        for (const text of below) {
            const topPx = -text.Y() * board.unitY;
            expect(topPx, String(text.plaintext)).toBeGreaterThanOrEqual(22);
            expect(topPx + 18, String(text.plaintext)).toBeLessThanOrEqual(boardBottomPx);
        }
    });

    test('the cycle caption is hidden up to r = 3, the iterate caption at step 0, and the cursor caption makes no claim past the onset', () => {
        const {graph} = mountGraph();
        let texts = captionTexts(graph);
        expect(texts.some(text => text.includes('↔'))).toBe(false);
        expect(texts.some(text => text.startsWith('x₀ = ') || /^x[₀-₉]+ = /.test(text))).toBe(false);
        setR(graph, 380);
        texts = captionTexts(graph);
        expect(texts).toContain(t('phase_graph_logistic_cap_cursor', {value0: '3,8008',
            value1: t('phase_graph_logistic_period_claimless_value', {value0: '3,56995'})}));
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
        for (const R of [310, 380, 400, 250, 290]) {
            setR(graph, R);
            expect(graph.ownedObjectCount()).toBe(owned);
        }
        set(graph, {step: 20, X: 40});
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
        expect(curves(graph)[COBWEB].dataX!.length).toBeGreaterThan(40);
        expect(curves(graph)[DIAGRAM].dataX!.length).toBeGreaterThan(1000);

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
        expect(ofType(graph, 'curve')).toHaveLength(7);
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
        // JSXGraph leaves a timer of its own for every redrawn step (text.js), measured here with one step set from outside; the played run must leave the same
        // number: no frame, interval or settle timer of this graph (the status settle is cancelled by the unmount).
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setState({step: 1}); });
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
        expect(document.querySelector(`[aria-label="${t('phase_graph_logistic_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('the derived data is not recomputed for a language change or an initialized-only change, and is for other stored content', () => {
        const {graph} = mountGraph();
        const count = graph.derivationCount();
        act(() => setLanguage('en'));
        act(() => setLanguage('sl'));
        act(() => { graph.setState({initialized: true}); });
        expect(graph.derivationCount()).toBe(count);
        setR(graph, 310);
        expect(graph.derivationCount()).toBe(count + 1);
        set(graph, {step: 1});
        expect(graph.derivationCount()).toBe(count + 2);
    });
});

describe('language and the catalog', () => {
    test('switching the language renames the board, the labels, the captions and the status; the numbers stay', () => {
        const {graph} = mountGraph();
        setR(graph, 310);
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${en.phase_graph_logistic_board_label}"]`)).not.toBeNull();
        expect(labelOf('period')).toBe(en.phase_graph_logistic_r_period);
        expect(readout('r')).toBe('3.1');
        expect(readout('cycle')).toBe(t('phase_graph_logistic_cycle_value', {value0: '0.558014', value1: '0.764567'}));
        expect(captionTexts(graph)).toContain(t('phase_graph_logistic_cap_map', {value0: '3.1'}));
        expect(status()).toContain('3.1');
        act(() => setLanguage('sl'));
        expect(document.querySelector(`[aria-label="${sl.phase_graph_logistic_board_label}"]`)).not.toBeNull();
        expect(captionTexts(graph)).toContain(t('phase_graph_logistic_cap_map', {value0: '3,1'}));
    });

    test('numbers use the decimal comma and the true minus in Slovenian', () => {
        mountGraph();
        expect(readout('fixed-multiplier')).toBe('−0,9');
        expect(readout('fixed-multiplier')).not.toContain('-');
        expect(readout('fixed')).not.toContain('.');
        expect(document.body.textContent).not.toMatch(/\d\.\d/);
    });

    test('every phase_graph_logistic key exists in both languages with the same placeholder names, and the source uses exactly these keys', () => {
        const names = (text: string) => Array.from(text.matchAll(/\{(\w+)\}/g), m => m[1]).sort();
        const keys = Object.keys(sl).filter(key => key.startsWith('phase_graph_logistic_'));
        expect(keys.length).toBeGreaterThanOrEqual(50);
        for (const key of keys) {
            const slText = sl[key as keyof typeof sl];
            const enText = en[key as keyof typeof sl];
            expect(typeof enText, key).toBe('string');
            expect(enText.length, key).toBeGreaterThan(0);
            expect(names(enText), key).toEqual(names(slText));
        }
        expect(Object.keys(en).filter(key => key.startsWith('phase_graph_logistic_')).sort()).toEqual(keys.sort());
        const source = readFileSync('src/graphs/dynamics/LogisticMapGraph.tsx', 'utf8');
        const used = new Set(Array.from(source.matchAll(/"(phase_graph_logistic_\w+)"/g), m => m[1]));
        for (const key of used) expect(keys, key).toContain(key);
        for (const key of keys) expect(used.has(key), `unused: ${key}`).toBe(true);
    });

    test('no user-visible string is hard-coded in the source: every text goes through t()', () => {
        const source = readFileSync('src/graphs/dynamics/LogisticMapGraph.tsx', 'utf8');
        expect(source).not.toMatch(/<\w+[^<>{}]*>\s*[A-Za-zČŠŽčšž][^<{]*<\//);
        expect(source).not.toMatch(/label=\s*"[A-Za-z]/);
    });
});

describe('the captions on a narrow board (390 x 480 px)', () => {
    const sizes = {clientWidth: 390, offsetWidth: 390, clientHeight: 480, offsetHeight: 480} as const;
    const restore = [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const;
    beforeEach(() => {
        for (const [name, size] of Object.entries(sizes)) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 390, bottom: 480, width: 390, height: 480, toJSON: () => ({})}) as DOMRect;
    });
    afterEach(() => {
        for (const [name, size] of restore) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
        setLanguage('sl');
    });

    for (const language of ['sl', 'en'] as const) {
        test(`the wrapped caption rows do not run into each other or off the board (${language})`, () => {
            setLanguage(language);
            const {graph} = mountGraph();
            const board = graph.liveBoard();
            type Text = Probe & {X(): number; Y(): number};
            const rows = (ofType(graph, 'text') as unknown as Text[])
                .filter(o => visible(o) && o.evalVisProp('anchory') === 'top' && o.evalVisProp('anchorx') === 'left' && o.Y() < 0 && o.X() < 0)
                .sort((a, b) => b.Y() - a.Y());
            expect(rows).toHaveLength(6);
            const lines = (text: Text) => Math.max(1, Math.ceil((String(text.plaintext).length * 7.5) / Math.max(390 - 20, 100)));
            expect(rows.some(row => lines(row) > 1)).toBe(true);
            for (let i = 0; i + 1 < rows.length; i++) {
                const gapPx = (rows[i].Y() - rows[i + 1].Y()) * board.unitY;
                expect(gapPx, String(rows[i].plaintext)).toBeGreaterThanOrEqual(lines(rows[i]) * 18 - 0.5);
            }
            const cursor = (ofType(graph, 'text') as unknown as Text[]).find(o => visible(o) && o.evalVisProp('anchorx') === 'right' && o.Y() > 0.9 && o.Y() < 1.5)!;
            const cursorLines = Math.max(1, Math.ceil((String(cursor.plaintext).length * 7.5) / (390 - 20)));
            expect(cursorLines).toBeGreaterThan(1);
            expect((board.getBoundingBox()[1] - cursor.Y()) * board.unitY).toBeGreaterThanOrEqual(cursorLines * 18 - 0.5);
            const last = rows[rows.length - 1];
            const roomPx = (last.Y() - board.getBoundingBox()[3]) * board.unitY;
            expect(roomPx).toBeGreaterThanOrEqual(lines(last) * 18 - 0.5);
        });
    }
});

describe('the view follows the board size (a board that settles after the first frame)', () => {
    type SizedBoard = {canvasWidth: number; canvasHeight: number; origin: {scrCoords: number[]}; getBoundingBox(): number[];
        resizeContainer(width: number, height: number): void; moveOrigin(x: number, y: number): void; update(): void};
    const callbacks: Array<() => void> = [];
    const setHeight = (height: number) => {
        for (const [name, size] of [['clientWidth', 390], ['offsetWidth', 390], ['clientHeight', height], ['offsetHeight', height]] as const) {
            Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        }
    };
    beforeEach(() => {
        callbacks.length = 0;
        vi.stubGlobal('ResizeObserver', class {
            // the graph's observer takes no entries; JSXGraph's own does, and the test resizes the board itself
            constructor(callback: (entries?: unknown[]) => void) { if (callback.length === 0) callbacks.push(callback); }
            observe() {}
            unobserve() {}
            disconnect() {}
        });
        setHeight(295);
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        for (const [name, size] of [['clientWidth', 600], ['clientHeight', 400], ['offsetWidth', 600], ['offsetHeight', 400]] as const) {
            Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        }
    });

    /** What the layout does after the mount: the container grows, the board follows (as JSXGraph's own handler), the observers fire. */
    const settleTo = (board: SizedBoard, height: number, move?: () => void) => {
        setHeight(height);
        board.resizeContainer(390, height);
        move?.();
        vi.useFakeTimers();
        callbacks.forEach(callback => callback());
        act(() => { vi.advanceTimersByTime(400); });
        vi.useRealTimers();
    };
    const near = (actual: number[], expected: number[]) => {
        expect(actual).toHaveLength(expected.length);
        actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 6));
    };

    test('an unmoved view is framed again for the settled height: the box Reset gives at that height', async () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard() as unknown as SizedBoard;
        expect(board.canvasHeight).toBe(295);
        settleTo(board, 547);
        const settled = [...board.getBoundingBox()];
        await settle(() => graph.reset());
        near(settled, board.getBoundingBox());
    });

    test('a view the user moved is left alone when the board settles', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard() as unknown as SizedBoard;
        let moved: number[] = [];
        settleTo(board, 547, () => {
            board.moveOrigin(board.origin.scrCoords[1] + 40, board.origin.scrCoords[2] + 30);
            board.update();
            moved = [...board.getBoundingBox()];
        });
        near(board.getBoundingBox(), moved);
    });
});
