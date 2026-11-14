import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, settle} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {deriveCobweb} from '../../recursion/recursionModel';
import {cobwebPath, mapSamples, VIEW_BOXES} from './cobwebScene';
import {RecursionCobwebGraph, SPEED_DEFAULT} from './RecursionCobwebGraph';

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

/** Exposes the board, a fake clock, a switchable reduced-motion setting and the disposal and rebuild the scene replacement calls. */
class ObservedGraph extends RecursionCobwebGraph {
    clock = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return this.reduced; }
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    rebuildNow() { this.syncReplacedScene(); }
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

type Probe = {id: string; elType: string; dataX?: number[]; dataY?: number[]; plaintext?: string; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const curves = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve');
const texts = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'text' && o.plaintext !== '0,0');
const shown = (graph: ObservedGraph) => texts(graph).filter(o => o.evalVisProp('visible')).map(o => o.plaintext ?? '');
/** What the scene owns: the three curves, six captions, and three points (fixed point, iterate, start handle). */
const SCENE_OBJECTS = 3 + 6 + 3;

/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = () => document.querySelector('[data-recursion-status]')!.textContent!;
const button = (label: string) => screen.getByRole('button', {name: label});
const press = (label: string) => act(() => { fireEvent.click(button(label)); });
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const chooseMap = (map: string) => act(() => { fireEvent.change(field(t('recursion_graph_map_label')), {target: {value: map}}); });
const slider = () => screen.getByRole('slider', {name: t('recursion_graph_speed_label')}) as HTMLInputElement;
/** The range input of a slider named `label`. */
const rangeOf = (label: string) => screen.getByRole('slider', {name: label}) as HTMLInputElement;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
/** The text a field is described by (its help), found through aria-describedby. */
const described = (input: HTMLElement) => (input.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
/** `ticks` + 1 frames on the fake clock, one interval apart; the first frame only starts the clock. */
const run = (graph: ObservedGraph, ticks: number, from = 0) => { for (let i = 0; i <= ticks; i++) graph.clock.tick(from + i * SPEED_DEFAULT); };

describe('mount and the drawing', () => {
    test('the default is the example of the spec: m = 0,5, c = 1, x0 = 0, no step drawn, fixed point 2', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({map: 'affine', M: 10, C: 10, X: 0, step: 0});
        expect(readout('fixed')).toBe('2');
        expect(readout('slope')).toBe('0,5');
        expect(readout('intercept')).toBe('1');
        expect(readout('start')).toBe('0');
        expect(readout('steps')).toBe(t('recursion_graph_r_steps_value', {value0: 0, value1: 60}));
        expect(document.querySelector(`[aria-label="${t('recursion_graph_board_label')}"]`)).not.toBeNull();
        expect(document.querySelector('[data-step-counter]')!.textContent).toBe(t('step_counter', {value0: 0, value1: 60}));
        expect(graph.ownedObjectCount()).toBe(SCENE_OBJECTS);
        noBadText();
    });

    test('three curves (map, diagonal, steps) hold the scene data; the captions name every element a readout names', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({step: 3}); });
        const [map, diagonal, steps] = curves(graph);
        const derived = deriveCobweb(graph.state);
        const samples = mapSamples(derived.map, -10, 10);
        expect([map.dataX, map.dataY]).toEqual([samples.x, samples.y]);
        expect([diagonal.dataX, diagonal.dataY]).toEqual([[-10, 10], [-10, 10]]);
        const path = cobwebPath(0, derived.iteration.steps);
        expect([steps.dataX, steps.dataY]).toEqual([path.x, path.y]);
        expect(path.x).toEqual([0, 0, 1, 1, 1.5, 1.5, 1.75]);
        expect(shown(graph)).toEqual([
            t('recursion_graph_cap_map_affine', {value0: 'y = 0,5·x + 1'}), t('recursion_graph_cap_diagonal'), t('fixed_point_legend_cobweb'),
            t('recursion_graph_cap_start', {value0: '0'}), t('recursion_graph_cap_fixed', {value0: '2'}),
            t('recursion_graph_cap_iterate', {value0: '₃', value1: '1,75'}),
        ]);
        expect(readout('iterate')).toBe('1,75');
        noBadText();
    });

    test('the iterate has no caption at step 0; its readout row names the step in its label', () => {
        const {graph} = mountGraph();
        expect(shown(graph)).toHaveLength(5);
        expect(document.querySelector('[data-readout="iterate"] dt')!.textContent).toBe(t('recursion_graph_r_iterate', {value0: '₀'}));
        act(() => { graph.setState({step: 12}); });
        expect(document.querySelector('[data-readout="iterate"] dt')!.textContent).toBe(t('recursion_graph_r_iterate', {value0: '₁₂'}));
    });

    test('every readout row has a label; the exact-label note is shown for the line and the logistic map, not for the cosine', () => {
        mountGraph();
        const rows = [...document.querySelectorAll('[data-readout]')].filter(row => row.tagName !== 'P' && row.querySelector('dt'));
        expect(rows.length).toBeGreaterThanOrEqual(7);
        for (const row of rows) expect(row.querySelector('dt')!.textContent!.trim().length, row.getAttribute('data-readout')!).toBeGreaterThan(0);
        expect(document.querySelector('[data-recursion-note]')!.textContent).toBe(t('recursion_graph_note_exact'));
        chooseMap('cosine');
        expect(document.querySelector('[data-recursion-note]')).toBeNull();
    });

    test('a fixed point that is a fraction shows the fraction with its decimal value; m = 0 says the first step lands on it', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({M: 6, C: 10}); }); // x -> 0,3x + 1: x* = 10/7
        expect(readout('fixed')).toBe(t('recursion_graph_r_fixed_fraction', {value0: '10/7', value1: '1,428571'}));
        act(() => { graph.setState({M: 0}); });
        expect(readout('shape')).toBe(t('recursion_graph_shape_degenerate'));
    });

    test('decimal comma in Slovenian, decimal point in English', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({X: 50}); });
        expect(readout('start')).toBe('0,5');
        act(() => { setLanguage('en'); });
        expect(readout('start')).toBe('0.5');
        expect(readout('slope')).toBe('0.5');
    });
});

describe('the kind of the fixed point is said in words', () => {
    test.each([
        ['attracting', {M: 10, C: 10}, () => t('recursion_graph_status_attracting', {value0: '2'})],
        ['repelling', {M: 30, C: 10}, () => t('recursion_graph_status_repelling', {value0: '−2'})],
        ['2-cycle', {M: -20, C: 10}, () => t('recursion_graph_status_two_cycle', {value0: '0,5'})],
        ['every point fixed', {M: 20, C: 0}, () => t('recursion_graph_status_all_fixed')],
        ['no fixed point', {M: 20, C: 10}, () => t('recursion_graph_status_none', {value0: '1'})],
    ] as const)('line, %s', (_name, patch, expected) => {
        const {graph} = mountGraph();
        act(() => { graph.setState({...patch}); });
        expect(status()).toContain(expected());
        noBadText();
    });

    test('2-cycle: the shape is a closed square and the iterates alternate; all fixed: no movement; no fixed point: the row says none', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({M: -20, C: 0, X: 100, step: 4}); });
        expect(readout('shape')).toBe(t('recursion_graph_shape_square'));
        expect(readout('iterate')).toBe('1');
        act(() => { graph.setState({step: 3}); });
        expect(readout('iterate')).toBe('−1');
        act(() => { graph.setState({M: 20, C: 0}); });
        expect(readout('shape')).toBe(t('recursion_graph_shape_still'));
        expect(readout('fixed')).toBe(t('recursion_graph_r_fixed_all'));
        expect(graph.state.step).toBe(3);
        act(() => { graph.setState({C: 10}); });
        expect(readout('fixed')).toBe(t('recursion_graph_r_fixed_none'));
        expect(shown(graph).some(text => text.includes('x* ='))).toBe(false);
    });

    test('logistic: extinction below r = 1, the slope-one case at r = 1, an attracting point from 1,1 to 2,9; the rate row replaces slope and intercept', () => {
        const {graph} = mountGraph();
        chooseMap('logistic');
        expect(readout('slope')).toBeUndefined();
        expect(readout('rate')).toBe('1,5');
        expect(graph.state.X).toBe(10);
        act(() => { graph.setState({R: 5}); });
        expect(status()).toContain(t('recursion_graph_status_extinction'));
        act(() => { graph.setState({R: 10}); });
        expect(status()).toContain(t('recursion_graph_status_extinction_one'));
        act(() => { graph.setState({R: 25}); });
        expect(status()).toContain(t('recursion_graph_status_logistic_attracting', {value0: '0,6', value1: '−0,5'}));
        expect(readout('fixed')).toBe(t('recursion_graph_r_fixed_fraction', {value0: '3/5', value1: '0,6'}));
        expect(readout('decisive')).toBe('−0,5');
        expect(readout('shape')).toBe(t('recursion_graph_shape_spiral'));
        expect(shown(graph)).toContain(t('recursion_graph_cap_map_logistic', {value0: '2,5'}));
    });

    test('cosine: the fixed point and the slope are computed numbers and the readout says so', () => {
        const {graph} = mountGraph();
        chooseMap('cosine');
        expect(readout('fixed')).toBe('0,739085');
        expect(readout('decisive')).toBe(t('recursion_graph_r_decisive_computed', {value0: '−0,673612'}));
        expect(status()).toContain(t('recursion_graph_status_cosine', {value0: '0,739085', value1: '−0,673612'}));
        act(() => { graph.setState({step: 8}); });
        expect(readout('iterate')).toBe('0,722102');
    });

    test('a fixed point outside the window is captioned as outside, its marker hidden, and the number is still read', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({M: 19, C: 100}); }); // m = 0,95, c = 10: x* = 200
        expect(readout('fixed')).toBe('200');
        expect(shown(graph)).toContain(t('recursion_graph_cap_fixed_off', {value0: '200'}));
        expect(shown(graph).some(text => text === t('recursion_graph_cap_fixed', {value0: '200'}))).toBe(false);
        expect(probes(graph).filter(o => o.elType === 'point' && o.evalVisProp('visible') === false).length).toBeGreaterThanOrEqual(1);
    });

    test('the iterate caption says the iterate is outside the view when its marker is off view, and is the plain caption in view', () => {
        const tail = (key: 'recursion_graph_cap_iterate' | 'recursion_graph_cap_iterate_off') => {
            const text = t(key, {value0: '#', value1: '#'});
            return text.slice(text.lastIndexOf('#') + 1);
        };
        const {graph} = mountGraph();
        act(() => { graph.setState({step: 3}); });
        expect(shown(graph).some(text => text.startsWith('x') && text.endsWith(tail('recursion_graph_cap_iterate')))).toBe(true);
        expect(shown(graph).some(text => text.endsWith(tail('recursion_graph_cap_iterate_off')))).toBe(false);
        act(() => { graph.setState({M: -60, C: 0, X: 1000, step: 60}); });
        expect(shown(graph).some(text => text.endsWith(tail('recursion_graph_cap_iterate_off')))).toBe(true);
        expect(shown(graph).some(text => text.endsWith(tail('recursion_graph_cap_iterate')))).toBe(false);
    });

    test('a huge iterate is read in scientific form, drawn only up to 10^6, and never NaN or Infinity', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({M: -60, C: 0, X: 1000, step: 60}); }); // x -> -3x from 10
        expect(readout('iterate')).toMatch(/e|E|×|·/);
        const steps = curves(graph)[2];
        expect(Math.max(...steps.dataX!.map(Math.abs), ...steps.dataY!.map(Math.abs))).toBeLessThanOrEqual(1e6);
        expect(steps.dataX!.length).toBeGreaterThan(1);
        noBadText();
    });
});

describe('fields: ranges, help, refusal, the program-changed start', () => {
    test('m, c, r and the start are sliders whose range and step are theirs; only help that explains stays; the start range follows the map', () => {
        mountGraph();
        const shape = (label: string) => { const input = rangeOf(label); return [input.min, input.max, input.step]; };
        expect(shape(t('recursion_graph_m_label'))).toEqual(['-3', '3', '0.05']);
        expect(shape(t('recursion_graph_c_label'))).toEqual(['-10', '10', '0.1']);
        expect(shape(t('recursion_graph_x_label'))).toEqual(['-10', '10', '0.01']);
        expect(described(rangeOf(t('recursion_graph_m_label')))).not.toContain('večkratnik');
        expect(described(rangeOf(t('recursion_graph_c_label')))).not.toContain('večkratnik');
        expect(described(rangeOf(t('recursion_graph_x_label')))).toContain(t('recursion_graph_x_help'));
        expect(described(field(t('recursion_graph_map_label')))).toBe(t('recursion_graph_map_help'));
        chooseMap('logistic');
        expect(shape(t('recursion_graph_r_label'))).toEqual(['0.5', '2.9', '0.1']);
        expect(described(rangeOf(t('recursion_graph_r_label')))).toContain(t('recursion_graph_r_help'));
        expect(shape(t('recursion_graph_x_label'))).toEqual(['0.01', '0.99', '0.01']);
        expect(described(rangeOf(t('recursion_graph_x_label')))).toContain(t('recursion_graph_x_help_logistic'));
        chooseMap('cosine');
        expect(shape(t('recursion_graph_x_label'))).toEqual(['-2', '2', '0.01']);
        expect(described(rangeOf(t('recursion_graph_x_label')))).toContain(t('recursion_graph_x_help'));
        expect(screen.queryByRole('slider', {name: t('recursion_graph_m_label')})).toBeNull();
    });

    test('the speed slider shows its range in its help', () => {
        mountGraph();
        expect(slider().min).toBe('200');
        expect(slider().max).toBe('2000');
        expect(slider().value).toBe(String(SPEED_DEFAULT));
        expect(described(slider())).toContain(t('recursion_graph_speed_help', {value0: '200', value1: '2000', value2: '100'}));
    });

    test('typed values on the grid are taken, values outside the range are refused with the message and never clamped', () => {
        const {graph} = mountGraph();
        enter(t('recursion_graph_m_label'), '-1,5');
        enter(t('recursion_graph_c_label'), '2,5');
        enter(t('recursion_graph_x_label'), '3,25');
        expect(graph.state).toMatchObject({M: -30, C: 25, X: 325});
        for (const label of ['recursion_graph_m_label', 'recursion_graph_c_label', 'recursion_graph_x_label'] as const) {
            enter(t(label), label === 'recursion_graph_m_label' ? '3,05' : label === 'recursion_graph_c_label' ? '11' : '10,5');
            expect(field(t(label)).getAttribute('aria-invalid'), label).toBe('true');
        }
        expect(graph.state).toMatchObject({M: -30, C: 25, X: 325});
        expect(graph.editSlope(3.5)).toBe(false);
        expect(graph.editIntercept(-10.1)).toBe(false);
        expect(graph.editStart(NaN)).toBe(false);
        expect(graph.editStart(10.01)).toBe(false);
        expect(graph.state).toMatchObject({M: -30, C: 25, X: 325});
        expect(graph.editSlope(3)).toBe(true);
        expect(graph.state.M).toBe(60);
    });

    test('logistic: the start must be strictly between 0 and 1, the parameter from 0,5 to 2,9', () => {
        const {graph} = mountGraph();
        chooseMap('logistic');
        expect(graph.editStart(0)).toBe(false);
        expect(graph.editStart(1)).toBe(false);
        expect(graph.editStart(0.01)).toBe(true);
        expect(graph.editStart(0.99)).toBe(true);
        expect(graph.editRate(3)).toBe(false);
        expect(graph.editRate(0.4)).toBe(false);
        expect(graph.editRate(2.9)).toBe(true);
        expect(graph.state).toMatchObject({R: 29, X: 99});
    });

    test('choosing a map whose range does not hold the start moves the start and says so on screen and in the live status, and only then', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({X: 500}); });
        chooseMap('cosine');
        expect(graph.state).toMatchObject({map: 'cosine', X: 0});
        expect(status()).toContain(t('recursion_graph_notice_start', {value0: '0', value1: '−2', value2: '2'}));
        chooseMap('logistic');
        expect(graph.state.X).toBe(10);
        const moved = t('recursion_graph_notice_start', {value0: '0,1', value1: '0,01', value2: '0,99'});
        expect(status()).toContain(moved);
        act(() => { graph.setState({step: 1}); });
        expect(status()).not.toContain(moved);
        chooseMap('cosine'); // 0,1 lies in [-2, 2]: nothing is moved
        expect(graph.state.X).toBe(10);
        expect(status()).not.toContain(t('recursion_graph_notice_start', {value0: '0,1', value1: '−2', value2: '2'}));
    });

    test('an edit keeps the step count (the picture follows the parameter) and a map change moves the board window', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({step: 12}); });
        enter(t('recursion_graph_m_label'), '0,25');
        expect(graph.state.step).toBe(12);
        chooseMap('logistic');
        expect(graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)))).toEqual([...VIEW_BOXES.logistic]);
    });
});

describe('dragging the start', () => {
    test('the handle sits on the diagonal at the start; a drag snaps to 1/100 and clamps to the range of the map', () => {
        const {graph} = mountGraph();
        const handle = graph.dragHandle()!;
        expect([handle.X(), handle.Y()]).toEqual([0, 0]);
        dragHandleTo(handle, 3.456, -7);
        expect(graph.state.X).toBe(346);
        expect([handle.X(), handle.Y()]).toEqual([3.46, 3.46]);
        dragHandleTo(handle, 50, 0);
        expect(graph.state.X).toBe(1000);
        chooseMap('logistic');
        dragHandleTo(graph.dragHandle()!, -4, 0);
        expect(graph.state.X).toBe(1);
        dragHandleTo(graph.dragHandle()!, 7, 0);
        expect(graph.state.X).toBe(99);
    });

    test('the handle follows a typed start; a non-finite position changes nothing; a drag does not rebuild or add listeners', () => {
        const {graph} = mountGraph();
        const handle = graph.dragHandle()!;
        const owned = graph.ownedObjectCount();
        const listeners = graph.ownedListenerCount();
        enter(t('recursion_graph_x_label'), '-2,5');
        expect([handle.X(), handle.Y()]).toEqual([-2.5, -2.5]);
        dragHandleTo(handle, 1, 1);
        expect(graph.dragHandle()).toBe(handle);
        expect([graph.ownedObjectCount(), graph.ownedListenerCount()]).toEqual([owned, listeners]);
        const before = graph.state;
        vi.spyOn(handle, 'X').mockReturnValue(NaN);
        act(() => { (handle as EventedPoint).triggerEventHandlers(['drag'], []); });
        expect(graph.state).toBe(before);
    });

    test('a drag pauses a playing iteration', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        dragHandleTo(graph.dragHandle()!, 2, 2);
        expect(graph.isPlaying()).toBe(false);
    });
});

describe('playback', () => {
    test('Play draws one step per interval (the first frame only starts the clock), Pause keeps the step', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.isPlaying()).toBe(true);
        run(graph, 3);
        expect(graph.state.step).toBe(3);
        expect(document.querySelector('[data-step-counter]')!.textContent).toBe(t('step_counter', {value0: 3, value1: 60}));
        press(t('pause'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        graph.clock.tick(99999);
        expect(graph.state.step).toBe(3);
    });

    test('a frame sooner than the interval changes nothing and a slow frame still gives exactly one step', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.clock.tick(0);
        graph.clock.tick(SPEED_DEFAULT - 1);
        expect(graph.state.step).toBe(0);
        graph.clock.tick(SPEED_DEFAULT + 5);
        expect(graph.state.step).toBe(1);
        graph.clock.tick(SPEED_DEFAULT + 5 + 10 * SPEED_DEFAULT);
        expect(graph.state.step).toBe(2);
    });

    test('60 steps end the playback on their own; Play and Next step then say why they are blocked, Replay starts over', () => {
        const {graph} = mountGraph();
        press(t('play'));
        run(graph, 61);
        expect(graph.state.step).toBe(60);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(button(t('play')).getAttribute('aria-disabled')).toBe('true');
        expect(button(t('next_step')).getAttribute('aria-disabled')).toBe('true');
        graph.stepOnce();
        graph.play();
        expect(graph.state.step).toBe(60);
        press(t('reset'));
        expect(graph.state.step).toBe(0);
        press(t('play'));
        run(graph, 2);
        expect(graph.state.step).toBe(2);
    });

    test('Next step draws one step and pauses; while playing it is blocked; Replay goes to the start and pauses', () => {
        const {graph} = mountGraph();
        press(t('next_step'));
        press(t('next_step'));
        expect(graph.state.step).toBe(2);
        press(t('play'));
        expect(button(t('next_step')).getAttribute('aria-disabled')).toBe('true');
        act(() => { graph.stepOnce(); });
        expect(graph.isPlaying()).toBe(false);
        expect(graph.state.step).toBe(3);
        press(t('play'));
        press(t('reset'));
        expect(graph.state.step).toBe(0);
        expect(graph.isPlaying()).toBe(false);
        expect(button(t('reset')).getAttribute('aria-disabled')).toBe('true');
    });

    test.each([
        ['slope', () => enter(t('recursion_graph_m_label'), '0,25')],
        ['intercept', () => enter(t('recursion_graph_c_label'), '2')],
        ['start', () => enter(t('recursion_graph_x_label'), '1')],
        ['map', () => chooseMap('cosine')],
    ])('an edit of the %s pauses the playback first and keeps the step', (_name, edit) => {
        const {graph} = mountGraph();
        press(t('play'));
        run(graph, 2);
        expect(graph.isPlaying()).toBe(true);
        edit();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.state.step).toBe(2);
    });

    test('a step count written from outside (a lesson, a reopened Preset) pauses a playing iteration; Play continues from it', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({step: 30}); });
        expect(graph.isPlaying()).toBe(false);
        press(t('play'));
        run(graph, 1);
        expect(graph.state.step).toBe(31);
        act(() => { graph.setState({step: 10}); });
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('next_step'));
        expect(graph.state.step).toBe(11);
        act(() => { graph.setState({step: 58}); });
        press(t('play'));
        run(graph, 3);
        expect(graph.state.step).toBe(60);
        expect(graph.isPlaying()).toBe(false);
    });

    test('an outside write of exactly step + 1 while playing pauses it; the playback\'s own tick does not', () => {
        const {graph} = mountGraph();
        press(t('play'));
        run(graph, 2);
        expect(graph.isPlaying()).toBe(true);
        const step = graph.state.step;
        act(() => { graph.setState({step: step + 1}); });
        expect(graph.isPlaying()).toBe(false);
        expect(graph.state.step).toBe(step + 1);
    });

    test('reduced motion: Play shows all 60 steps at once and starts no animation; the speed slider says why it is unavailable', () => {
        const {graph} = mountGraph();
        graph.reduced = true;
        act(() => { graph.setState({step: 5}); }); // renders again under reduced motion
        expect(slider().getAttribute('aria-disabled')).toBe('true');
        expect(document.body.textContent).toContain(t('recursion_graph_speed_reduced', {value0: 60}));
        press(t('play'));
        expect(graph.state.step).toBe(60);
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.requests).toBe(0);
    });

    test('with motion allowed the reduced-motion reason is not shown', () => {
        mountGraph();
        expect(document.body.textContent).not.toContain(t('recursion_graph_speed_reduced', {value0: 60}));
    });

    test('the speed: off-grid and out-of-range times are refused; a playing iteration keeps playing with the new time', () => {
        const {graph} = mountGraph();
        for (const bad of [100, 150, 250, 2100, NaN, 600.5]) expect(graph.editSpeed(bad), String(bad)).toBe(false);
        expect(graph.speed()).toBe(SPEED_DEFAULT);
        press(t('play'));
        run(graph, 1);
        expect(graph.state.step).toBe(1);
        act(() => { fireEvent.change(slider(), {target: {value: '200'}}); });
        expect(graph.speed()).toBe(200);
        expect(graph.isPlaying()).toBe(true);
        expect(graph.clock.pending()).toBe(true);
        graph.clock.tick(10000); // the new clock starts here: the first frame of a new controller only starts the clock
        expect(graph.state.step).toBe(1);
        graph.clock.tick(10200);
        expect(graph.state.step).toBe(2);
        graph.clock.tick(10400); // the new interval of 200 ms applies, not the old 600 ms
        expect(graph.state.step).toBe(3);
        expect(graph.editSpeed(2000)).toBe(true);
        expect(graph.speed()).toBe(2000);
    });

    test('playback is not stored: the speed and the playing flag are not part of the scene state', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.editSpeed(300);
        expect(Object.keys(graph.state).sort()).toEqual(['C', 'M', 'R', 'X', 'initialized', 'map', 'step']);
    });

    test('while playing the live status is empty (no announcement per step); Pause announces the state once', () => {
        vi.useFakeTimers();
        const {graph} = mountGraph();
        press(t('play'));
        run(graph, 2);
        expect(document.querySelector('[data-readout-live]')!.textContent).toBe('');
        press(t('pause'));
        act(() => { vi.advanceTimersByTime(1000); });
        expect(document.querySelector('[data-readout-live]')!.textContent).toContain(t('recursion_graph_status_at_step', {value0: 2, value1: '₂', value2: '1,5'}));
    });
});

describe('the view of a replaced scene', () => {
    const view = (graph: ObservedGraph) => graph.liveBoard().getBoundingBox().map(v => Number(v.toFixed(3)));

    test('a rebuild after a disposal keeps the view the board has (a restore brings its own)', () => {
        const {graph} = mountGraph();
        const stored: [number, number, number, number] = [-3, 7, 9, -5];
        act(() => { graph.liveBoard().setBoundingBox(stored, false); });
        graph.disposeNow();
        act(() => { graph.rebuildNow(); });
        expect(view(graph)).toEqual(stored);
    });

    test('a reset shows the exact opening window of the map, not one widened to the canvas', async () => {
        const {graph} = mountGraph();
        chooseMap('logistic');
        act(() => { graph.liveBoard().setBoundingBox([-3, 7, 9, -5], false); });
        await settle(() => graph.reset());
        expect(view(graph)).toEqual([...VIEW_BOXES.affine]);
    });
});

describe('ownership', () => {
    test('a state change does not rebuild; dispose and rebuild replace every owned object and return to the pre-mount count', () => {
        const {graph, view} = mountGraph();
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const owned = graph.ownedObjectCount();
        expect(owned).toBe(SCENE_OBJECTS);
        const base = count() - owned;
        const ids = new Set(probes(graph).map(o => o.id));
        act(() => { graph.setState({step: 20, M: -10}); });
        expect(new Set(probes(graph).map(o => o.id))).toEqual(ids);
        expect(graph.ownedObjectCount()).toBe(owned);
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
        expect(curves(graph)[2].dataX!.length).toBeGreaterThan(1); // the rebuilt steps curve draws the state again

        view.unmount();
        expect(graph.ownedObjectCount()).toBe(0);
    });

    test('unmount while playing cancels the frame loop and every timer, removes the board label and the language listener', () => {
        vi.useFakeTimers();
        // JSXGraph leaves a timer of its own for every redrawn step (text.js), measured here with one step set from outside; the played run must leave the same
        // number: no frame, interval or settle timer of this graph (the 500 ms status settle is cancelled by the unmount).
        const before = vi.getTimerCount();
        const reference = mountGraph();
        act(() => { reference.graph.setState({step: 1}); });
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();
        const {graph, view} = mountGraph();
        press(t('play'));
        run(graph, 1);
        expect(graph.clock.pending()).toBe(true);
        const live = vi.getTimerCount();
        view.unmount();
        expect(vi.getTimerCount()).toBeLessThan(live); // the pending 500 ms status settle is cancelled
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
        expect(vi.getTimerCount() - afterPlain).toBe(plainDelta);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('recursion_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('disposing the scene while playing stops the playback', () => {
        const {graph} = mountGraph();
        press(t('play'));
        graph.disposeNow();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.isPlaying()).toBe(false);
    });

    test('StrictMode: the same number of objects as a plain mount, and no playback or timer left after unmount', () => {
        vi.useFakeTimers();
        // The timers JSXGraph and React leave behind are the baseline; playing adds none (see the unmount test above).
        const strictBefore = vi.getTimerCount();
        mountGraph(true).view.unmount();
        const strictDelta = vi.getTimerCount() - strictBefore;
        const afterStrictPlain = vi.getTimerCount();
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const plainLeak = vi.getTimerCount() - afterStrictPlain;
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        press(t('play'));
        strict.view.unmount();
        expect(strict.graph.ownedObjectCount()).toBe(0);
        expect(strict.graph.clock.pending()).toBe(false);
        expect(strict.graph.isPlaying()).toBe(false);
        expect(vi.getTimerCount() - afterStrictPlain - plainLeak).toBe(strictDelta);
    });

    test('the derived values are computed once per state object, not at every redraw', () => {
        const {graph} = mountGraph();
        const first = graph.derived();
        act(() => { graph.liveBoard().update(); });
        act(() => { graph.liveBoard().update(); });
        expect(graph.derived()).toBe(first);
        act(() => { graph.setState({step: 1}); });
        expect(graph.derived()).not.toBe(first);
    });
});

describe('language', () => {
    test('switching to English renames the board, the labels, the captions and the status', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState({step: 2}); });
        act(() => { setLanguage('en'); });
        expect(document.querySelector(`[aria-label="${t('recursion_graph_board_label')}"]`)).not.toBeNull();
        expect(rangeOf(t('recursion_graph_m_label'))).toBeTruthy();
        expect(shown(graph)).toContain(t('recursion_graph_cap_start', {value0: '0'}));
        expect(shown(graph)).toContain(t('recursion_graph_cap_map_affine', {value0: 'y = 0.5·x + 1'}));
        expect(status()).toContain(t('recursion_graph_status_attracting', {value0: '2'}));
        expect(document.body.textContent).not.toMatch(/recursion_graph_/);
        noBadText();
    });
});

describe('the captions on a narrow board (about 390 px wide)', () => {
    const WIDTH = 390;
    const CHAR = 6.2; // pixels per character of a 14 px caption (measured: the longest caption is 6 px per character)
    const marked = (text: string) => /^(začetek|start) |^x[₀-₉]+ = /.test(text);
    type Box = {text: string; left: number; right: number; bottom: number; top: number};

    /** The shown captions as pixel boxes on a board of WIDTH x 360 px; a caption is anchored at its left end, centred on its height. */
    function boxes(graph: ObservedGraph, map: 'affine' | 'cosine' | 'logistic'): Box[] {
        const board = graph.liveBoard() as unknown as {unitX: number; unitY: number; canvasWidth: number; update(): void};
        const [xmin, ymax, xmax, ymin] = VIEW_BOXES[map];
        board.canvasWidth = WIDTH;
        board.unitX = WIDTH / (xmax - xmin);
        board.unitY = 360 / (ymax - ymin);
        act(() => { board.update(); });
        return probes(graph).filter(o => o.elType === 'text' && o.evalVisProp('visible') && (o.plaintext ?? '').length > 0 && o.plaintext !== '0,0').map(o => {
            const text = o.plaintext ?? '';
            const at = o as unknown as {X(): number; Y(): number};
            const left = (at.X() - xmin) * board.unitX;
            const y = (ymax - at.Y()) * board.unitY;
            return {text, left, right: left + CHAR * text.length, bottom: y + 7, top: y - 7};
        });
    }

    for (const language of ['sl', 'en'] as const) {
        for (const map of ['affine', 'cosine', 'logistic'] as const) {
            test(`no caption overlaps another, leaves the board or crosses the y axis (${map}, ${language})`, () => {
                setLanguage(language);
                const {graph} = mountGraph();
                chooseMap(map);
                press(t('next_step'));
                const all = boxes(graph, map);
                expect(all.length).toBeGreaterThanOrEqual(6);
                for (const box of all) expect(box.right, box.text).toBeLessThanOrEqual(WIDTH);
                for (let i = 0; i < all.length; i++) {
                    for (let j = i + 1; j < all.length; j++) {
                        const a = all[i];
                        const b = all[j];
                        // the start and iterate captions stand beside markers that may lie a few pixels apart; not a caption-band question
                        if (marked(a.text) && marked(b.text)) continue;
                        const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
                        expect(overlap, `${a.text} / ${b.text}`).toBe(false);
                    }
                }
                const [xmin, , xmax] = VIEW_BOXES[map];
                const axis = (0 - xmin) * (WIDTH / (xmax - xmin));
                const mapCaption = all.find(box => box.text.startsWith(language === 'sl' ? 'preslikava' : 'map'))!;
                expect(mapCaption.left < axis && axis < mapCaption.right, mapCaption.text).toBe(false);
            });

            test(`no caption stands over the numbers of the x axis (${map}, ${language})`, () => {
                setLanguage(language);
                const {graph} = mountGraph();
                chooseMap(map);
                press(t('next_step'));
                const all = boxes(graph, map);
                const [, ymax, , ymin] = VIEW_BOXES[map];
                const axisY = ymax * (360 / (ymax - ymin));
                for (const box of all) expect(box.top < axisY + 20 && box.bottom > axisY + 2, box.text).toBe(false);
            });
        }
    }
});
