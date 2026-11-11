import {mkdirSync, writeFileSync} from 'node:fs';
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import {installBoardShims} from '../../base/realGraphTestHarness';
import {setLanguage, t} from '../../../localization';
import {enterNumber} from '../../../inputs/testEntry';
import type {TransientState} from '../../base/BaseGraph';
import type {AnimationScheduler} from '../../../learning/runtime/animation';
import {DEFAULT_KINEMATICS_STATE, deriveKinematics, FIELD_RANGES, MOTION_IDS, parseKinematicsState, serializeKinematicsState, withMotion, type MotionChoice} from '../../../kinematics/kinematicsModel';
import {frameFor, KinematicsGraph, MAX_FRAME_MS, TIME_STEP} from './KinematicsGraph';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

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
class ObservedGraph extends KinematicsGraph {
    clock = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return this.reduced; }
    liveBoard() { return this.board; }
    disposeNow() { this.disposeFigureScene(); }
    capture(): TransientState { return this.captureTransientState(); }
    restore(saved: TransientState | undefined) { this.restoreTransientState(saved); }
}

function mountGraph(strict = false) {
    const graph = new ObservedGraph();
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const labelOf = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const enter = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
const choose = (motion: MotionChoice) => act(() => { fireEvent.change(field(t('kinematics_graph_motion_label')), {target: {value: motion}}); });
const slider = () => screen.getByRole('slider') as HTMLInputElement;
const status = () => document.querySelector('[data-kinematics-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

type Probe = {id: string; elType: string; plaintext?: string; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const ofType = (graph: ObservedGraph, type: string) => probes(graph).filter(o => o.elType === type);
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
const arrows = (graph: ObservedGraph) => ofType(graph, 'arrow');
/** The velocity, acceleration, a_T and a_N arrows are created in this order. */
const [V, A, AT, AN] = [0, 1, 2, 3];
/** Sets the time as the slider does, inside the act that lets React show it. */
function go(graph: ObservedGraph, time: number): boolean {
    let accepted = false;
    act(() => { accepted = graph.setTime(time); });
    return accepted;
}
const captionTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(o => o.plaintext !== '0,0' && visible(o)).map(o => o.plaintext ?? '');

/** Runs frames of 100 ms until the clock has nothing pending (at most `limit`). */
function run(graph: ObservedGraph, limit = 400) {
    let time = 0;
    graph.clock.tick(time);
    for (let i = 0; i < limit && graph.clock.pending(); i++) { time += MAX_FRAME_MS; graph.clock.tick(time); }
}

describe('mount and the drawing', () => {
    test('the default is the cycloid with both arrows, at t = 0, which is a cusp: no velocity arrow, a status, the acceleration kept', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({motion: 'cycloid', showVelocity: true, showAcceleration: true, split: false, trace: true});
        expect(graph.time).toBe(0);
        expect(document.querySelector(`[aria-label="${t('kinematics_graph_board_label')}"]`)).not.toBeNull();
        expect(arrows(graph)).toHaveLength(4);
        expect(visible(arrows(graph)[V])).toBe(false);
        expect(visible(arrows(graph)[A])).toBe(true);
        expect(status()).toContain(t('kinematics_graph_status_cusp'));
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_cusp'));
        expect(readout('a-t')).toBe(t('kinematics_graph_not_defined'));
        expect(labelOf('a-t')).toBe(t('kinematics_graph_r_at'));
        noBadText();
    });

    test('away from the cusp the velocity arrow is drawn, the status names the speed change and nothing is "not defined"', () => {
        const {graph} = mountGraph();
        expect(go(graph, 1)).toBe(true);
        expect(visible(arrows(graph)[V])).toBe(true);
        expect(status()).not.toContain(t('kinematics_graph_status_cusp'));
        expect(captionTexts(graph)).not.toContain(t('kinematics_graph_cap_cusp'));
        expect(readout('a-t')).not.toBe(t('kinematics_graph_not_defined'));
        noBadText();
    });

    test('every readout row of every motion has a label and a value', () => {
        const {graph} = mountGraph();
        for (const motion of MOTION_IDS) {
            choose(motion);
            go(graph, graph.derived().tEnd / 3);
            const rows = Array.from(document.querySelectorAll('[data-readout]'));
            expect(rows.length, motion).toBeGreaterThan(8);
            for (const row of rows) {
                expect(row.querySelector('dt')?.textContent?.length, `${motion} ${row.getAttribute('data-readout')}`).toBeGreaterThan(0);
                expect(row.querySelector('dd')?.textContent?.length, `${motion} ${row.getAttribute('data-readout')}`).toBeGreaterThan(0);
            }
            noBadText();
        }
    });

    test('the projectile reads flight time, range, greatest height and g = 9,81 m/s², and names g on the board', () => {
        const {graph} = mountGraph();
        choose('projectile');
        expect(readout('gravity')).toBe('9,81 m/s²');
        expect(readout('flight')).toContain('s');
        expect(readout('range')).toContain('m');
        expect(readout('height')).toContain('m');
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_gravity', {value0: '9,81'}));
    });

    test('the circular motion with a varying speed draws the reference point and names it; at b = 0 it does not', () => {
        const {graph} = mountGraph();
        choose('circular');
        expect(captionTexts(graph)).not.toContain(t('kinematics_graph_cap_reference'));
        enter(t('kinematics_graph_b_label'), '0,5');
        expect(graph.state.b).toBe(0.5);
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_reference'));
        expect(readout('period')).toBeDefined();
    });

    test('split adds the a_T and a_N arrows (dotted and dashed) and their caption', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        expect(visible(arrows(graph)[AT])).toBe(false);
        act(() => { fireEvent.click(field(t('kinematics_graph_split'))); });
        expect(graph.state.split).toBe(true);
        expect(visible(arrows(graph)[AT])).toBe(true);
        expect(visible(arrows(graph)[AN])).toBe(true);
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_components'));
    });
});

describe('the arrow scales are stated on the board and in the readout', () => {
    test('both scale captions say how long an arrow is and what it stands for, with the decimal comma in Slovenian and a point in English', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        const texts = captionTexts(graph);
        const velocity = texts.find(text => text.startsWith('v (polna'))!;
        const acceleration = texts.find(text => text.startsWith('a (črtkano'))!;
        expect(velocity).toMatch(/m na grafu pomeni .* m\/s$/);
        expect(acceleration).toMatch(/m na grafu pomeni .* m\/s²$/);
        const scales = graph.derived().scales;
        expect(velocity).toContain(String(scales.velocity.step).replace('.', ','));
        expect(readout('scale-velocity')).toContain(String(scales.velocity.step).replace('.', ','));
        expect(labelOf('scale-acceleration')).toBe(t('kinematics_graph_r_scale_acceleration'));
        act(() => setLanguage('en'));
        const english = captionTexts(graph);
        expect(english.find(text => text.startsWith('v (solid'))).toMatch(/an arrow of [\d.]+ m on the board stands for [\d.]+ m\/s$/);
        expect(english.join(' ')).not.toMatch(/\d,\d/);
    });

    test('a scale step with a decimal is written with a comma in Slovenian (board caption and readout) and a point in English', () => {
        const {graph} = mountGraph();
        const decimals: string[] = [];
        choose('circular');
        enter(t('kinematics_graph_radius_label'), String(FIELD_RANGES.radius.min));
        enter(t('kinematics_graph_omega_label'), String(FIELD_RANGES.omega.min));
        for (const motion of ['circular'] as const) {
            go(graph, 1);
            const scales = graph.derived().scales;
            for (const [kind, prefix] of [['velocity', 'v (polna'], ['acceleration', 'a (črtkano']] as const) {
                const step = scales[kind].step;
                if (Number.isInteger(step)) continue;
                decimals.push(`${motion}:${kind}:${step}`);
                const comma = String(step).replace('.', ',');
                const caption = captionTexts(graph).find(text => text.startsWith(prefix))!;
                expect(caption).toContain(` ${comma} `);
                expect(caption).not.toContain(` ${step} `);
                expect(readout(`scale-${kind}`)).toContain(comma);
                act(() => setLanguage('en'));
                expect(captionTexts(graph).find(text => text.startsWith(prefix === 'v (polna' ? 'v (solid' : 'a (dashed'))).toContain(` ${step} `);
                act(() => setLanguage('sl'));
            }
        }
        expect(decimals.length).toBeGreaterThan(0);
    });

    test('the longest arrow of each kind fits its stated scale over the whole motion', () => {
        const {graph} = mountGraph();
        const d = graph.derived();
        expect(d.maxSpeed / d.scales.velocity.step).toBeLessThanOrEqual(1 + 1e-4);
        expect(d.maxAcceleration / d.scales.acceleration.step).toBeLessThanOrEqual(1 + 1e-4);
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

    test('the run ends at the end of the motion with a status, stops its frame loop, and Play at the end starts again from 0', () => {
        const {graph} = mountGraph();
        press(t('play'));
        run(graph);
        const end = graph.derived().tEnd;
        expect(graph.time).toBe(end);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(status()).toContain(t('kinematics_graph_status_ended', {value0: '6,28'}));
        press(t('play'));
        expect(graph.playing).toBe(true);
        expect(graph.time).toBe(0);
        press(t('pause'));
    });

    test('Reset returns to t = 0 and stops; it is unavailable with a reason at t = 0', () => {
        const {graph} = mountGraph();
        go(graph, 2);
        press(t('kinematics_graph_reset_label'));
        expect(graph.time).toBe(0);
        expect(screen.getByRole('button', {name: t('kinematics_graph_reset_label')}).getAttribute('aria-disabled')).toBe('true');
    });

    test('reduced motion: Play starts no frame loop and says why; the slider still sets the time', () => {
        const {graph} = mountGraph();
        graph.reduced = true;
        go(graph, 0);
        const play = screen.getByRole('button', {name: t('play')});
        expect(play.getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.playing).toBe(false);
        expect(graph.clock.requests).toBe(0);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion_time'));
        act(() => { fireEvent.change(slider(), {target: {value: '1.5'}}); });
        expect(graph.time).toBe(1.5);
    });

    test('while it plays the live region is silent and the visible readout moves; on pause the live region says the state once', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        press(t('play'));
        graph.clock.tick(0);
        graph.clock.tick(100);
        expect(live()).toBe('');
        expect(readout('time')).toBe('1,1 s');
        press(t('pause'));
        expect(live()).toContain(t('kinematics_graph_status_time', {value0: '1,1'}));
    });

    test('every edit pauses the playback first', () => {
        const {graph} = mountGraph();
        press(t('play'));
        act(() => { fireEvent.click(field(t('kinematics_graph_trace'))); });
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        choose('rose');
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('unmount while playing cancels the frame loop and leaves no timer or listener', () => {
        const {graph, view} = mountGraph();
        press(t('play'));
        expect(graph.clock.pending()).toBe(true);
        view.unmount();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('kinematics_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('StrictMode mounts, unmounts and mounts again with the same objects as a plain mount, and no frame stays pending', () => {
        const plain = mountGraph();
        const expected = {owned: plain.graph.ownedObjectCount(), board: plain.graph.liveBoard().objectsList.length};
        plain.view.unmount();
        const strict = mountGraph(true);
        expect(strict.graph.ownedObjectCount()).toBe(expected.owned);
        expect(strict.graph.liveBoard().objectsList.length).toBe(expected.board);
        press(t('play'));
        strict.view.unmount();
        expect(strict.graph.clock.pending()).toBe(false);
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });
});

describe('rebuild and disposal', () => {
    test('disposal removes every owned object back to the pre-scene count, and the next state change rebuilds the same scene', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        const total = graph.liveBoard().objectsList.length;
        expect(owned).toBeGreaterThan(20);
        press(t('play'));
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.liveBoard().objectsList.length).toBe(total - owned);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        act(() => { fireEvent.click(field(t('kinematics_graph_trace'))); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.liveBoard().objectsList.length).toBe(total);
    });

    test('switching motions keeps the object count and does not leak objects', () => {
        const {graph} = mountGraph();
        // The axis ticks add and drop their own labels with the zoom; the graph's objects and every other kind stay.
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const total = count();
        for (const motion of MOTION_IDS) { choose(motion); expect(count(), motion).toBe(total); expect(graph.ownedObjectCount(), motion).toBe(26); }
    });

    test('the path is resampled for another motion only; switches and the time reuse the derived data', () => {
        const {graph} = mountGraph();
        const before = graph.derived();
        const count = graph.derivationCount();
        act(() => { fireEvent.click(field(t('kinematics_graph_split'))); });
        go(graph, 1);
        go(graph, 2);
        expect(graph.derived()).toBe(before);
        expect(graph.derivationCount()).toBe(count);
        choose('rose');
        expect(graph.derivationCount()).toBe(count + 1);
    });
});

describe('typed input and the time', () => {
    test('a typed number outside the range is refused (never clamped) with the range stated; an off-grid one is rounded to the grid', () => {
        const {graph} = mountGraph();
        choose('projectile');
        enter(t('kinematics_graph_v0_label'), '40');
        expect(graph.state.v0).toBe(20);
        expect(document.body.textContent).toContain('od 5 do 30');
        enter(t('kinematics_graph_v0_label'), '12,4');
        expect(graph.state.v0).toBe(12);
        enter(t('kinematics_graph_alpha_label'), '50');
        expect(graph.state.alpha).toBe(50);
        enter(t('kinematics_graph_alpha_label'), '90');
        expect(graph.state.alpha).toBe(50);
        expect(graph.editNumber('v0', 4)).toBe(false);
        expect(graph.state.v0).toBe(12);
    });

    test('every numeric field and switch is described by help that states its range, and the slider by its range', () => {
        mountGraph();
        const describedText = (element: HTMLElement) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
            .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        choose('projectile');
        const ranges = FIELD_RANGES;
        expect(describedText(field(t('kinematics_graph_v0_label')))).toContain(`${ranges.v0.min} do ${ranges.v0.max}`);
        expect(describedText(field(t('kinematics_graph_alpha_label')))).toContain(`${ranges.alpha.min}° do ${ranges.alpha.max}°`);
        choose('circular');
        expect(describedText(field(t('kinematics_graph_radius_label')))).toContain('od 0,5 do 4');
        expect(describedText(field(t('kinematics_graph_omega_label')))).toContain('od 0,5 do 4');
        expect(describedText(field(t('kinematics_graph_b_label')))).toContain('Od 0 do 0,9');
        for (const key of ['kinematics_graph_show_velocity', 'kinematics_graph_show_acceleration', 'kinematics_graph_split', 'kinematics_graph_trace'] as const) {
            expect(describedText(field(t(key))).length, key).toBeGreaterThan(10);
        }
        expect(describedText(field(t('kinematics_graph_motion_label'))).length).toBeGreaterThan(10);
        expect(describedText(slider())).toContain('Čas od 0 do 6,28 s');
    });

    test('the time slider reaches the end, refuses beyond it, has a grid, and gives a spoken value with its unit', () => {
        const {graph} = mountGraph();
        const end = graph.derived().tEnd;
        expect(slider().min).toBe('0');
        expect(Number(slider().max)).toBeCloseTo(end, 6);
        expect(slider().step).toBe(String(TIME_STEP));
        expect(go(graph, end)).toBe(true);
        expect(go(graph, end + 0.1)).toBe(false);
        expect(go(graph, -0.01)).toBe(false);
        expect(go(graph, Number.NaN)).toBe(false);
        expect(graph.time).toBe(end);
        expect(slider().getAttribute('aria-valuetext')).toContain(' s');
    });

    test('changing the motion resets the time and says so; a parameter that shortens the motion shortens the time and says so', () => {
        const {graph} = mountGraph();
        go(graph, 3);
        choose('projectile');
        expect(graph.time).toBe(0);
        expect(status()).toContain(t('kinematics_graph_notice_reset'));
        enter(t('kinematics_graph_alpha_label'), '85');
        go(graph, graph.derived().tEnd);
        enter(t('kinematics_graph_alpha_label'), '5');
        expect(graph.state.alpha).toBe(5);
        expect(graph.time).toBe(graph.derived().tEnd);
        expect(status()).toContain(t('kinematics_graph_notice_clamped', {value0: String(graph.derived().tEnd.toFixed(2)).replace('.', ',')}));
        expect(graph.playing).toBe(false);
    });

    test('the status wording follows the projectile: slowing on the way up, speeding up on the way down, never "constant"', () => {
        const {graph} = mountGraph();
        choose('projectile');
        go(graph, 0.1);
        expect(status()).toContain(t('kinematics_graph_status_slowing'));
        go(graph, graph.derived().tEnd - 0.1);
        expect(status()).toContain(t('kinematics_graph_status_speeding'));
        expect(status()).not.toContain(t('kinematics_graph_status_constant'));
    });

    test('uniform circular motion says the speed is constant; with a varying speed it does not', () => {
        const {graph} = mountGraph();
        choose('circular');
        go(graph, 1);
        expect(status()).toContain(t('kinematics_graph_status_constant'));
        expect(visible(arrows(graph)[AT])).toBe(false);
        enter(t('kinematics_graph_b_label'), '0,5');
        go(graph, 0.5);
        expect(status()).not.toContain(t('kinematics_graph_status_constant'));
    });
});

describe('language', () => {
    test('switching the language renames the board, the labels, the captions and the status', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${t('kinematics_graph_board_label')}"]`)).not.toBeNull();
        expect(screen.getByLabelText(t('kinematics_graph_motion_label'))).toBeTruthy();
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_point'));
        expect(status()).toMatch(/^Time 1 s\./);
        expect(readout('time')).toBe('1 s');
        noBadText();
    });
});

describe('redraw timing (JSDOM PLACEHOLDER, not a browser measurement)', () => {
    test('a playback frame redraws the board in a bounded time; the median and the 95th percentile are logged', () => {
        const {graph} = mountGraph();
        press(t('play'));
        const times: number[] = [];
        let time = 0;
        graph.clock.tick(time);
        for (let i = 0; i < 60 && graph.clock.pending(); i++) {
            time += 16;
            const start = performance.now();
            graph.clock.tick(time);
            times.push(performance.now() - start);
        }
        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        mkdirSync('.command-logs', {recursive: true});
        writeFileSync('.command-logs/kin02b-redraw.log', `JSDOM PLACEHOLDER kinematics playback frame: n=${times.length} median=${median.toFixed(2)} ms p95=${p95.toFixed(2)} ms (browser measurement owed at F2b)
`);
        expect(times.length).toBeGreaterThan(30);
        expect(Number.isFinite(median) && Number.isFinite(p95)).toBe(true);
        press(t('pause'));
    });
});

describe('review repairs', () => {
    test('every edit of the scene pauses a run, including a direct setState that keeps the motion (a lesson action or a restore)', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.playing).toBe(true);
        act(() => { graph.setState({trace: false}); });
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        act(() => { graph.setState({showAcceleration: false}); });
        expect(graph.playing).toBe(false);
        press(t('play'));
        act(() => { graph.setState({trace: false}); });
        expect(graph.playing).toBe(true);
    });

    test('a lesson checkpoint keeps the time and lands stopped, also after the motion was changed in between', () => {
        const {graph} = mountGraph();
        go(graph, 2);
        const saved = graph.capture();
        expect(saved.kinematicsTime).toBe(2);
        choose('projectile');
        expect(graph.time).toBe(0);
        press(t('play'));
        expect(graph.playing).toBe(true);
        act(() => graph.restore(saved));
        expect(graph.time).toBe(2);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test.each([['beyond the motion', 99], ['negative', -1], ['not finite', Number.NaN], ['not a number', '2']])(
        'a saved time that is %s is refused: the time is 0 and the status says so',
        (_name, bad) => {
            const {graph} = mountGraph();
            go(graph, 1);
            act(() => graph.restore({kinematicsTime: bad} as unknown as TransientState));
            expect(graph.time).toBe(0);
            expect(graph.playing).toBe(false);
            expect(graph.statusText()).toContain(t('kinematics_graph_notice_time_refused'));
        });

    test('a checkpoint without a time lands at 0 without a notice', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        act(() => graph.restore(undefined));
        expect(graph.time).toBe(0);
        expect(graph.statusText()).not.toContain(t('kinematics_graph_notice_time_refused'));
    });

    test('the Preset round trip: serialize, parse, set gives the same stored state; malformed data is refused with an actionable message', () => {
        const {graph} = mountGraph();
        choose('circular');
        enter(t('kinematics_graph_b_label'), '0,5');
        const parsed = parseKinematicsState(JSON.parse(JSON.stringify(serializeKinematicsState(graph.state))));
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        const stored = parsed.value;
        choose('rose');
        act(() => { graph.setState(stored); });
        expect(graph.state).toMatchObject(stored);
        const bad = parseKinematicsState({...stored, radius: 99});
        expect(bad.ok).toBe(false);
        if (!bad.ok) expect(bad.error.message).toMatch(/radius.*outside/);
    });

    test('near the cusp the velocity arrow is hidden as too short and the cusp caption and status appear with it', () => {
        const {graph} = mountGraph();
        go(graph, 0.001);
        expect(graph.evaluation().kind).toBe('regular');
        expect(visible(arrows(graph)[V])).toBe(false);
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_cusp'));
        expect(status()).toContain(t('kinematics_graph_status_cusp'));
        go(graph, 1);
        expect(captionTexts(graph)).not.toContain(t('kinematics_graph_cap_cusp'));
        act(() => { graph.setState({showVelocity: false}); });
        go(graph, 0.001);
        expect(captionTexts(graph)).not.toContain(t('kinematics_graph_cap_cusp'));
    });

    test('the acceleration scale is on the board whenever an acceleration arrow shows (a, aT or aN)', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        const scale = () => captionTexts(graph).some(text => text.startsWith('a (črtkano'));
        expect(scale()).toBe(true);
        act(() => { graph.setState({showAcceleration: false, split: true}); });
        expect(scale()).toBe(true);
        act(() => { graph.setState({showAcceleration: false, split: false}); });
        expect(scale()).toBe(false);
    });

    test('the dash styles have distinct words, and the sign of aN and kappa is stated on the board and beside the readout', () => {
        const {graph} = mountGraph();
        for (const language of ['sl', 'en'] as const) {
            act(() => setLanguage(language));
            const accelerationWord = t('kinematics_graph_cap_scale_acceleration', {value0: '1', value1: '1', value2: 'u'}).split(':')[0];
            const long = language === 'sl' ? 'dolge črtice' : 'long dashes';
            expect(t('kinematics_graph_cap_components')).toContain(long);
            expect(t('kinematics_graph_split_help')).toContain(long);
            expect(accelerationWord).not.toContain(language === 'sl' ? 'dolge' : 'long');
        }
        act(() => setLanguage('sl'));
        go(graph, 1);
        expect(captionTexts(graph)).not.toContain(t('kinematics_graph_cap_sign'));
        act(() => { fireEvent.click(field(t('kinematics_graph_split'))); });
        expect(captionTexts(graph)).toContain(t('kinematics_graph_cap_sign'));
        expect(t('kinematics_graph_sign_hint')).toContain('negativno: tir zavija desno');
        expect(document.querySelector('[data-kinematics-sign]')?.textContent).toBe(t('kinematics_graph_sign_hint'));
        act(() => setLanguage('en'));
        expect(document.querySelector('[data-kinematics-sign]')?.textContent).toContain('negative: the path turns right');
    });

    test('leaving the circular motion with b above 0 names the b reset in the notice; with b at 0 it does not', () => {
        const {graph} = mountGraph();
        choose('circular');
        enter(t('kinematics_graph_b_label'), '0,5');
        choose('cardioid');
        expect(graph.state.b).toBe(0);
        expect(status()).toContain(t('kinematics_graph_notice_reset_b'));
        choose('circular');
        choose('rose');
        expect(status()).toContain(t('kinematics_graph_notice_reset'));
        expect(status()).not.toContain(t('kinematics_graph_notice_reset_b'));
    });

    test('the derived data holds no language: a language change reuses it and the units are the SI strings', () => {
        const {graph} = mountGraph();
        const before = graph.derived();
        const count = graph.derivationCount();
        act(() => setLanguage('en'));
        expect(graph.derived()).toBe(before);
        expect(graph.derivationCount()).toBe(count);
        expect(before.scales.velocity.unit).toBe('m/s');
        expect(before.scales.acceleration.unit).toBe('m/s²');
    });

    test.each(['cardioid', 'rose', 'spiral', 'circular', 'circular with b'])(
        'the 720-sample maximum of %s stays within 1e-4 of the scale against a 20 000-point sampling',
        name => {
            const {graph} = mountGraph();
            choose((name === 'circular with b' ? 'circular' : name) as MotionChoice);
            if (name === 'circular with b') {
                enter(t('kinematics_graph_radius_label'), '3,5');
                enter(t('kinematics_graph_omega_label'), '1,5');
                enter(t('kinematics_graph_b_label'), '0,9');
            }
            const d = graph.derived();
            let speed = 0, acceleration = 0;
            const n = 20000;
            for (let i = 0; i <= n; i++) {
                const s = d.source.at(d.tEnd * i / n);
                speed = Math.max(speed, Math.hypot(...s.d1));
                acceleration = Math.max(acceleration, Math.hypot(...s.d2));
            }
            // The sampled maximum is the maximum the scale is built from: it may undershoot the dense one by 1e-4 at most.
            expect(speed).toBeLessThanOrEqual(d.maxSpeed * (1 + 1e-4));
            expect(acceleration).toBeLessThanOrEqual(d.maxAcceleration * (1 + 1e-4));
            expect(speed / d.scales.velocity.step).toBeLessThanOrEqual(1 + 1e-4);
            expect(acceleration / d.scales.acceleration.step).toBeLessThanOrEqual(1 + 1e-4);
        });
});

describe('a scene replacement (families-prep F2b registration)', () => {
    // The drawn state of every element (visPropCalc is what the renderer shows), read in the same tick as the restore.
    const shownKinds = (graph: ObservedGraph) => ['curve', 'arrow', 'text', 'point', 'segment', 'line'].map(type => probes(graph).filter(o => o.elType === type
        && (o as unknown as {visPropCalc: {visible: boolean}}).visPropCalc.visible === true).length);

    test('a restore shows the switched-off elements again in the same tick, with no later board update', () => {
        const {graph} = mountGraph();
        const capabilities = graph.getLessonCapabilities();
        const checkpoint = capabilities.captureState();
        const shown = shownKinds(graph);
        act(() => { graph.setState({trace: false, showVelocity: false, showAcceleration: false}); });
        expect(shownKinds(graph)).not.toEqual(shown);
        // The test renderer re-evaluates `visible` on update(), JSXGraph's real one does not: the restore must call fullUpdate itself.
        const fullUpdate = vi.spyOn(graph.liveBoard(), 'fullUpdate');
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.state.trace).toBe(true);
        expect(shownKinds(graph)).toEqual(shown);
        expect(fullUpdate).toHaveBeenCalled();
    });

    test('a switch redraws with fullUpdate, a time change that shows the same elements does not', () => {
        const {graph} = mountGraph();
        go(graph, 0.4);
        const fullUpdate = vi.spyOn(graph.liveBoard(), 'fullUpdate');
        go(graph, 0.5);
        go(graph, 0.6);
        expect(fullUpdate).not.toHaveBeenCalled();
        act(() => { graph.setState({trace: false}); });
        expect(fullUpdate).toHaveBeenCalledTimes(1);
    });

    test('restoring a checkpoint keeps the stored view instead of refitting', () => {
        const {graph} = mountGraph();
        const capabilities = graph.getLessonCapabilities();
        act(() => { graph.setState(withMotion(graph.state, 'projectile')); });
        act(() => { graph.liveBoard().setBoundingBox([-9, 40, 90, -20], true); });
        const checkpoint = capabilities.captureState();
        const stored = graph.liveBoard().getBoundingBox();
        act(() => { graph.setState(withMotion(graph.state, 'cardioid')); });
        act(() => { capabilities.restoreState(checkpoint); });
        expect(graph.state.motion).toBe('projectile');
        expect(graph.liveBoard().getBoundingBox()).toEqual(stored);
    });

    test('importing a Preset without a stored view frames the scene of its motion as a switch does', () => {
        const {graph} = mountGraph();
        act(() => { graph.setState(withMotion(graph.state, 'projectile')); });
        const framed = graph.liveBoard().getBoundingBox();
        act(() => { graph.setState(withMotion(graph.state, 'cycloid')); });
        const {boardState: _boardState, ...preset} = graph.exportPreset();
        act(() => { graph.importPreset({...preset, data: serializeKinematicsState(withMotion(graph.state, 'projectile'))}); });
        expect(graph.state.motion).toBe('projectile');
        expect(graph.liveBoard().getBoundingBox()).toEqual(framed);
    });
});

describe('opening view and caption rows (families-prep F2b fix pass)', () => {
    /** The board of the narrowest and of the widest layout the graph is checked at, in pixels. */
    const DESKTOP = {width: 850, height: 530};
    const CAPTION_ROWS_PX = 10 + 5 * 20; // point, path, trace, v and a: the captions a mount shows

    test.each([...MOTION_IDS])('%s: the figure fills the board on its limiting side, an arrow at its largest stays in view, and the captions have room', motion => {
        const derived = deriveKinematics(withMotion(DEFAULT_KINEMATICS_STATE, motion));
        const [left, top, right, bottom] = frameFor(derived);
        const [minX, maxX, minY, maxY] = derived.box;
        const scale = Math.min(DESKTOP.width / (right - left), DESKTOP.height / (top - bottom));
        // An arrow of the full length `unit` at any point of the path ends inside the frame.
        expect(minX - left).toBeGreaterThanOrEqual(derived.scales.unit);
        expect(right - maxX).toBeGreaterThanOrEqual(derived.scales.unit);
        expect(minY - bottom).toBeGreaterThanOrEqual(derived.scales.unit);
        expect(top - maxY).toBeGreaterThanOrEqual(derived.scales.unit);
        // The captions stand in the top left: the room above the path holds all five rows.
        expect((top - maxY) * scale).toBeGreaterThanOrEqual(CAPTION_ROWS_PX);
        // The figure takes nearly half of the limiting side of the board.
        const fill = Math.max(((maxX - minX) * scale) / DESKTOP.width, ((maxY - minY) * scale) / DESKTOP.height);
        expect(fill, motion).toBeGreaterThanOrEqual(0.45);
    });

    test('a caption wider than the board takes two rows: the row below it starts at least 40 px lower', () => {
        const {graph} = mountGraph();
        const board = graph.liveBoard();
        board.canvasWidth = 340;
        act(() => { board.update(); });
        const texts = ofType(graph, 'text').filter(o => o.plaintext !== '0,0' && visible(o)) as unknown as Array<Probe & {Y(): number}>;
        const scale = board.unitY;
        const at = (prefix: string) => texts.findIndex(o => (o.plaintext ?? '').startsWith(prefix));
        const [point, path, v, a] = [t('kinematics_graph_cap_point'), t('kinematics_graph_cap_path'), 'v (polna', 'a (črtkano'].map(at);
        expect([point, path, v, a].every(i => i > -1)).toBe(true);
        expect((texts[v].Y() - texts[a].Y()) * scale).toBeGreaterThanOrEqual(40);
        // A short caption keeps its single row.
        expect((texts[point].Y() - texts[path].Y()) * scale).toBeCloseTo(20, 5);
    });
});
