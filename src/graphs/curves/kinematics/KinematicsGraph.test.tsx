import {mkdirSync, writeFileSync} from 'node:fs';
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../base/GraphHost';
import {installBoardShims} from '../../base/realGraphTestHarness';
import {renderMessage, setLanguage, t, type Message} from '../../../localization';
import {runAs} from '../../base/writes/writeSource';
import type {TransientState} from '../../base/BaseGraph';
import type {AnimationScheduler} from '../../../learning/runtime/animation';
import {DEFAULT_KINEMATICS_STATE, FIELD_RANGES, MOTION_IDS, parseKinematicsState, serializeKinematicsState, withMotion, type MotionChoice, type NumericField, type ToggleField} from '../../../kinematics/kinematicsModel';
import type {GraphDeclaration} from '../../base/declare/graphDeclaration';
import {KinematicsGraph, type KinematicsIds, MAX_FRAME_MS, tagSize, TIME_STEP} from './KinematicsGraph';

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
    current = graph;
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const labelOf = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const learner = <T,>(work: () => T): T => { let result!: T; act(() => { result = runAs('learner', work); }); return result; };
/** The graph mounted last: the motion list, the switches in Orodja and the typed fields are driven as the learner's edits of it. */
let current!: ObservedGraph;
const choose = (motion: MotionChoice) => learner(() => current.editMotion(motion));
const flip = (field: ToggleField) => learner(() => current.editToggle(field, !current.state[field]));
const FIELD_LABELS: Record<NumericField, 'kinematics_graph_v0_label' | 'kinematics_graph_alpha_label' | 'kinematics_graph_radius_label' | 'kinematics_graph_omega_label' | 'kinematics_graph_b_label'> = {
    v0: 'kinematics_graph_v0_label', alpha: 'kinematics_graph_alpha_label', radius: 'kinematics_graph_radius_label', omega: 'kinematics_graph_omega_label', b: 'kinematics_graph_b_label'};
/** A typed entry (comma or point) of the numeric field of the label, as the arbiter gets it; false when refused. */
const enter = (label: string, value: string): boolean => {
    const name = (Object.keys(FIELD_LABELS) as NumericField[]).find(candidate => t(FIELD_LABELS[candidate]) === label)!;
    return learner(() => current.editNumber(name, Number(value.replace(',', '.'))));
};
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
    learner(() => { accepted = graph.setTime(time); });
    return accepted;
}
/** The texts that stay on the board: the arrow tags. What the captions said is in the declared rows, notes and legend. */
const boardTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(o => o.plaintext !== '0,0' && visible(o)).map(o => o.plaintext ?? '');
const declared = (graph: ObservedGraph) => graph.getDeclaration() as GraphDeclaration<KinematicsIds>;
const legendTexts = (graph: ObservedGraph) => (declared(graph).legend ?? []).map(entry => renderMessage(entry.label));
const noteTexts = (graph: ObservedGraph) => (declared(graph).notes ?? []).map(note => renderMessage(note.text));
/** A row as the panel words it: a message as it renders, a number with its unit (decimal comma in Slovenian). */
const rowTexts = (graph: ObservedGraph) => Object.fromEntries(declared(graph).readouts![0].rows.map(row => {
    const value = row.value as {key?: string; value?: number};
    const text = value.key !== undefined ? renderMessage(row.value as Message) : `${String(value.value).replace('.', ',')}${row.unit ? ` ${renderMessage(row.unit)}` : ''}`;
    return [row.id as string, text];
}));

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
        expect(noteTexts(graph)).toContain(t('kinematics_graph_status_cusp'));
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_velocity'));
        expect(readout('a-t')).toBe(t('kinematics_graph_not_defined'));
        expect(labelOf('a-t')).toBe(t('kinematics_graph_r_at'));
        noBadText();
    });

    test('away from the cusp the velocity arrow is drawn, the status names the speed change and nothing is "not defined"', () => {
        const {graph} = mountGraph();
        expect(go(graph, 1)).toBe(true);
        expect(visible(arrows(graph)[V])).toBe(true);
        expect(status()).not.toContain(t('kinematics_graph_status_cusp'));
        expect(noteTexts(graph)).not.toContain(t('kinematics_graph_status_cusp'));
        expect(legendTexts(graph)).toContain(t('kinematics_legend_velocity'));
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
        expect(rowTexts(graph).gravity).toBe('9,81 m/s²');
    });

    test('the circular motion with a varying speed draws the reference point and names it; at b = 0 it does not', () => {
        const {graph} = mountGraph();
        choose('circular');
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_reference'));
        enter(t('kinematics_graph_b_label'), '0,5');
        expect(graph.state.b).toBe(0.5);
        expect(legendTexts(graph)).toContain(t('kinematics_legend_reference'));
        expect(readout('period')).toBeDefined();
    });

    test('split adds the a_T and a_N arrows (dotted and dashed) and their caption', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        expect(visible(arrows(graph)[AT])).toBe(false);
        flip('split');
        expect(graph.state.split).toBe(true);
        expect(visible(arrows(graph)[AT])).toBe(true);
        expect(visible(arrows(graph)[AN])).toBe(true);
        expect(legendTexts(graph)).toEqual(expect.arrayContaining([t('kinematics_legend_tangential'), t('kinematics_legend_normal')]));
    });

    test('the arrow names are typeset as math at the compact named-label size, in both languages', () => {
        for (const language of ['sl', 'en'] as const) {
            setLanguage(language);
            const {graph, view} = mountGraph();
            go(graph, 1);
            flip('split');
            expect(boardTexts(graph)).toEqual(expect.arrayContaining(['$$v$$', '$$a$$', '$$a_{t}$$', '$$a_{n}$$']));
            const names = ofType(graph, 'text').filter(o => (o.plaintext ?? '').startsWith('$$'));
            expect(names).toHaveLength(4);
            for (const name of names) expect(name.evalVisProp('fontsize')).toBeCloseTo(0.75 * graph.displaySettings.fontSize, 5);
            view.unmount();
        }
    });
});

describe('the arrow scales are stated on the board and in the readout', () => {
    test('both scale rows say how long an arrow is and what it stands for, with the decimal comma in Slovenian and a point in English', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        const velocity = rowTexts(graph)['scale-velocity'];
        const acceleration = rowTexts(graph)['scale-acceleration'];
        expect(velocity).toMatch(/m na grafu pomeni .* m\/s$/);
        expect(acceleration).toMatch(/m na grafu pomeni .* m\/s²$/);
        const scales = graph.derived().scales;
        expect(velocity).toContain(String(scales.velocity.step).replace('.', ','));
        expect(readout('scale-velocity')).toContain(String(scales.velocity.step).replace('.', ','));
        expect(labelOf('scale-acceleration')).toBe(t('kinematics_graph_r_scale_acceleration'));
        act(() => setLanguage('en'));
        expect(rowTexts(graph)['scale-velocity']).toMatch(/an arrow of [\d.]+ m on the board stands for [\d.]+ m\/s$/);
        expect(Object.values(rowTexts(graph)).filter(text => /scale|arrow of/.test(text)).join(' ')).not.toMatch(/\d,\d/);
    });

    test('a scale step with a decimal is written with a comma in Slovenian (declared row and readout) and a point in English', () => {
        const {graph} = mountGraph();
        const decimals: string[] = [];
        choose('circular');
        enter(t('kinematics_graph_radius_label'), String(FIELD_RANGES.radius.min));
        enter(t('kinematics_graph_omega_label'), String(FIELD_RANGES.omega.min));
        for (const motion of ['circular'] as const) {
            go(graph, 1);
            const scales = graph.derived().scales;
            for (const kind of ['velocity', 'acceleration'] as const) {
                const step = scales[kind].step;
                if (Number.isInteger(step)) continue;
                decimals.push(`${motion}:${kind}:${step}`);
                const comma = String(step).replace('.', ',');
                expect(rowTexts(graph)[`scale-${kind}`]).toContain(` ${comma} `);
                expect(rowTexts(graph)[`scale-${kind}`]).not.toContain(` ${step} `);
                expect(readout(`scale-${kind}`)).toContain(comma);
                act(() => setLanguage('en'));
                expect(rowTexts(graph)[`scale-${kind}`]).toContain(` ${step} `);
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
        go(graph, 1.5);
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
        flip('trace');
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
        flip('trace');
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.liveBoard().objectsList.length).toBe(total);
    });

    test('switching motions keeps the object count and does not leak objects', () => {
        const {graph} = mountGraph();
        // The axis ticks add and drop their own labels with the zoom; the graph's objects and every other kind stay.
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const total = count();
        for (const motion of MOTION_IDS) { choose(motion); expect(count(), motion).toBe(total); expect(graph.ownedObjectCount(), motion).toBe(21); }
    });

    test('the path is resampled for another motion only; switches and the time reuse the derived data', () => {
        const {graph} = mountGraph();
        const before = graph.derived();
        const count = graph.derivationCount();
        flip('split');
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
        const write = (key: string, value: number) => { let result!: ReturnType<NonNullable<typeof graph.parameters>['write']>; learner(() => { result = graph.parameters!.write(key, value, 'learner'); }); return result; };
        const refused = write('kinematics-v0', 40);
        expect(refused.status).toBe('refused-domain');
        expect(refused.status === 'refused-domain' && refused.error.message).toBe(t('kinematics_value_refused', {value0: '5', value1: '30'}));
        expect(graph.state.v0).toBe(20);
        enter(t('kinematics_graph_v0_label'), '12,4');
        expect(graph.state.v0).toBe(12);
        enter(t('kinematics_graph_alpha_label'), '50');
        expect(graph.state.alpha).toBe(50);
        expect(write('kinematics-alpha', 90).status).toBe('refused-domain');
        expect(graph.state.alpha).toBe(50);
        expect(graph.editNumber('v0', 4)).toBe(false);
        expect(graph.state.v0).toBe(12);
    });

    test('every numeric puck carries its range, unit and symbol; b carries its meaning as help; the switches and the motion list in Orodja are described', () => {
        const {graph} = mountGraph();
        const describedText = (element: HTMLElement) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
            .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        const parameter = (key: string) => declared(graph).parameters!.find(candidate => candidate.key === key) as {min: number; max: number; step: number; symbol?: string; unit?: Message; help?: Message};
        choose('projectile');
        const ranges = FIELD_RANGES;
        for (const field of ['v0', 'alpha'] as const) {
            expect(parameter(`kinematics-${field}`), field).toMatchObject({min: ranges[field].min, max: ranges[field].max, step: ranges[field].step});
            expect(parameter(`kinematics-${field}`).unit, field).toBeDefined();
        }
        choose('circular');
        for (const field of ['radius', 'omega', 'b'] as const) {
            expect(parameter(`kinematics-${field}`), field).toMatchObject({min: ranges[field].min, max: ranges[field].max, step: ranges[field].step});
        }
        expect(parameter('kinematics-b').min).toBe(0);
        expect(parameter('kinematics-b').max).toBe(0.9);
        expect(renderMessage(parameter('kinematics-b').help!)).toBe(t('kinematics_graph_b_help'));
        for (const key of ['kinematics_graph_show_velocity', 'kinematics_graph_show_acceleration', 'kinematics_graph_split', 'kinematics_graph_trace'] as const) {
            expect(describedText(screen.getByLabelText(t(key)) as HTMLElement).length, key).toBeGreaterThan(10);
        }
        expect(describedText(screen.getByLabelText(t('kinematics_graph_motion_label')) as HTMLElement).length).toBeGreaterThan(10);
        expect(parameter('kinematics-time').help).toBeUndefined(); // the time puck shows its own bounds; no help restates them (S5)
    });

    test('the time puck reaches the end, refuses beyond it, has a grid, and gives its value with the unit s', () => {
        const {graph} = mountGraph();
        const end = graph.derived().tEnd;
        const time = declared(graph).parameters![0] as {key: string; min: number; max: number; step: number; unit: Message};
        expect(time.key).toBe('kinematics-time');
        expect(time.min).toBe(0);
        expect(time.max).toBeCloseTo(end, 6);
        expect(time.step).toBe(TIME_STEP);
        expect(renderMessage(time.unit)).toBe('s');
        expect(go(graph, end)).toBe(true);
        expect(go(graph, end + 0.1)).toBe(false);
        expect(go(graph, -0.01)).toBe(false);
        expect(go(graph, Number.NaN)).toBe(false);
        expect(graph.time).toBe(end);
        expect(readout('time')).toContain(' s');
        let result!: {status: string; error?: {message: string}};
        learner(() => { result = graph.parameters!.write('kinematics-time', end + 0.1, 'learner') as typeof result; });
        expect(result.status).toBe('refused-domain');
        expect(result.error?.message).toBe(t('kinematics_graph_time_rejected', {value0: String(end.toFixed(2)).replace('.', ',')}));
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
        expect(legendTexts(graph)).toContain(t('kinematics_legend_point'));
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
        learner(() => { graph.setState({trace: false}); });
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        learner(() => { graph.setState({showAcceleration: false}); });
        expect(graph.playing).toBe(false);
        press(t('play'));
        learner(() => { graph.setState({trace: false}); });
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
        learner(() => graph.restore(saved));
        expect(graph.time).toBe(2);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test.each([['beyond the motion', 99], ['negative', -1], ['not finite', Number.NaN], ['not a number', '2']])(
        'a saved time that is %s is refused: the time is 0 and the status says so',
        (_name, bad) => {
            const {graph} = mountGraph();
            go(graph, 1);
            learner(() => graph.restore({kinematicsTime: bad} as unknown as TransientState));
            expect(graph.time).toBe(0);
            expect(graph.playing).toBe(false);
            expect(graph.statusText()).toContain(t('kinematics_graph_notice_time_refused'));
        });

    test('a checkpoint without a time lands at 0 without a notice', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        learner(() => graph.restore(undefined));
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
        learner(() => { graph.setState(stored); });
        expect(graph.state).toMatchObject(stored);
        const bad = parseKinematicsState({...stored, radius: 99});
        expect(bad.ok).toBe(false);
        if (!bad.ok) expect(bad.error.message).toMatch(/radius.*outside/);
    });

    test('near the cusp the velocity arrow is hidden as too short and the cusp note, the status and the missing legend entry appear with it', () => {
        const {graph} = mountGraph();
        go(graph, 0.001);
        expect(graph.evaluation().kind).toBe('regular');
        expect(visible(arrows(graph)[V])).toBe(false);
        expect(noteTexts(graph)).toContain(t('kinematics_graph_status_cusp'));
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_velocity'));
        expect(readout('velocity')).toBeDefined();
        expect(status()).toContain(t('kinematics_graph_status_cusp'));
        go(graph, 1);
        expect(noteTexts(graph)).not.toContain(t('kinematics_graph_status_cusp'));
        expect(legendTexts(graph)).toContain(t('kinematics_legend_velocity'));
        learner(() => graph.editToggle('showVelocity', false));
        go(graph, 0.001);
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_velocity'));
    });

    test('the acceleration scale is a declared row whenever an acceleration arrow shows (a, aT or aN)', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        const scale = () => 'scale-acceleration' in rowTexts(graph);
        expect(scale()).toBe(true);
        learner(() => { graph.setState({showAcceleration: false, split: true}); });
        expect(scale()).toBe(true);
        learner(() => { graph.setState({showAcceleration: false, split: false}); });
        expect(scale()).toBe(false);
    });

    test('the dash styles have distinct words and the three acceleration arrows are drawn with distinct dashes; the sign of aN and kappa is a declared note and stated beside the readout', () => {
        const {graph} = mountGraph();
        for (const language of ['sl', 'en'] as const) {
            act(() => setLanguage(language));
            const long = language === 'sl' ? 'dolge črtice' : 'long dashes';
            expect(t('kinematics_graph_split_help')).toContain(long);
            expect(t('kinematics_graph_split_help')).toContain(language === 'sl' ? 'pikčasto' : 'dotted');
        }
        act(() => setLanguage('sl'));
        go(graph, 1);
        flip('split');
        const dashes = [A, AT, AN].map(index => String(arrows(graph)[index].evalVisProp('dash')));
        expect(new Set(dashes).size).toBe(3);
        expect(legendTexts(graph)).toEqual(expect.arrayContaining([t('kinematics_legend_acceleration'), t('kinematics_legend_tangential'), t('kinematics_legend_normal')]));
        expect(noteTexts(graph)).toContain(t('kinematics_graph_sign_hint'));
        expect(t('kinematics_graph_sign_hint')).toContain('negativno: tir zavija desno');
        expect(document.querySelector('[data-kinematics-sign]')?.textContent).toBe(t('kinematics_graph_sign_hint'));
        act(() => setLanguage('en'));
        expect(noteTexts(graph)).toContain(t('kinematics_graph_sign_hint'));
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
        learner(() => { graph.setState({trace: false, showVelocity: false, showAcceleration: false}); });
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
        learner(() => { graph.setState({trace: false}); });
        // The trace caption leaves the stack, so the frame is reset as well: the switch may redraw more than once.
        expect(fullUpdate).toHaveBeenCalled();
    });

    test('restoring a checkpoint keeps the stored view instead of refitting', () => {
        const {graph} = mountGraph();
        const capabilities = graph.getLessonCapabilities();
        learner(() => { graph.setState(withMotion(graph.state, 'projectile')); });
        learner(() => { graph.liveBoard().setBoundingBox([-9, 40, 90, -20], true); });
        const checkpoint = capabilities.captureState();
        const stored = graph.liveBoard().getBoundingBox();
        learner(() => { graph.setState(withMotion(graph.state, 'cardioid')); });
        learner(() => { capabilities.restoreState(checkpoint); });
        expect(graph.state.motion).toBe('projectile');
        expect(graph.liveBoard().getBoundingBox()).toEqual(stored);
    });

    test('importing a Preset without a stored view frames the scene of its motion as a switch does', () => {
        const {graph} = mountGraph();
        learner(() => { graph.setState(withMotion(graph.state, 'projectile')); });
        const framed = graph.liveBoard().getBoundingBox();
        learner(() => { graph.setState(withMotion(graph.state, 'cycloid')); });
        const {boardState: _boardState, ...preset} = graph.exportPreset();
        act(() => { graph.importPreset({...preset, data: serializeKinematicsState(withMotion(graph.state, 'projectile'))}); });
        expect(graph.state.motion).toBe('projectile');
        expect(graph.liveBoard().getBoundingBox()).toEqual(framed);
    });
});
describe('the osculating circle and the tangent and normal axes (KN5)', () => {
    /** The axes are the two dashed curves of width 1 (clipped under the captions, so not infinite lines). */
    const lines = (graph: ObservedGraph) => ofType(graph, 'curve').filter(o => o.evalVisProp('dash') === 3);
    const circleCurve = (graph: ObservedGraph) => ofType(graph, 'curve').find(o => o.evalVisProp('strokecolor') === '#6f9285');

    test('an old Preset without the field reads as off, and the stored field round-trips', () => {
        const {osculating: _omitted, ...old} = serializeKinematicsState(DEFAULT_KINEMATICS_STATE);
        const parsed = parseKinematicsState(old);
        expect(parsed.ok && parsed.value.osculating).toBe(false);
        expect(parseKinematicsState({...old, osculating: 'yes'}).ok).toBe(false);
        expect(parseKinematicsState(serializeKinematicsState({...DEFAULT_KINEMATICS_STATE, osculating: true}))).toMatchObject({ok: true, value: {osculating: true}});
    });

    test('the switch draws the circle of radius 1/|kappa| on the side of the turn, with its legend entry', () => {
        const {graph} = mountGraph();
        go(graph, Math.PI);
        expect(graph.osculatingCircleNow()).toBeUndefined();
        flip('osculating');
        expect(graph.state.osculating).toBe(true);
        const circle = graph.osculatingCircleNow()!;
        expect(circle.radius).toBeCloseTo(4, 6);
        expect(circle.centre[0]).toBeCloseTo(Math.PI, 6);
        expect(circle.centre[1]).toBeCloseTo(-2, 6);
        expect(legendTexts(graph)).toContain(t('kinematics_legend_osculating'));
        expect(circleCurve(graph) && visible(circleCurve(graph)!)).toBe(true);
    });

    test('the centre is a small fixed point and a thin segment of length 1/|kappa| joins it to the moving point; both hide with the circle', () => {
        const {graph} = mountGraph();
        const centre = () => ofType(graph, 'point').find(o => o.evalVisProp('strokecolor') === '#6f9285') as unknown as (Probe & {X(): number; Y(): number}) | undefined;
        const radiusSegment = () => ofType(graph, 'segment')[0] as unknown as (Probe & {L(): number}) | undefined;
        expect(centre() && visible(centre()!)).toBe(false);
        expect(radiusSegment() && visible(radiusSegment()!)).toBe(false);
        go(graph, Math.PI);
        flip('osculating');
        expect(visible(centre()!)).toBe(true);
        expect(centre()!.X()).toBeCloseTo(Math.PI, 9);
        expect(centre()!.Y()).toBeCloseTo(-2, 9);
        expect(centre()!.evalVisProp('fixed')).toBe(true);
        expect(centre()!.evalVisProp('showinfobox')).toBe(false);
        expect(centre()!.evalVisProp('withlabel')).toBe(false);
        expect(visible(radiusSegment()!)).toBe(true);
        expect(radiusSegment()!.L()).toBeCloseTo(4, 9);
        go(graph, 0);
        expect(visible(centre()!)).toBe(false);
        expect(visible(radiusSegment()!)).toBe(false);
    });

    test('the circle is not drawn at the cusp, and the status says what is missing', () => {
        const {graph} = mountGraph();
        flip('osculating');
        go(graph, 0);
        expect(graph.osculatingCircleNow()).toBeUndefined();
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_osculating'));
        expect(noteTexts(graph)).toContain(t('kinematics_graph_status_cusp'));
    });

    test('a nearly straight stretch (a fast flat throw) draws no huge circle, says so, and prints no bad number', () => {
        const {graph} = mountGraph();
        act(() => { graph.getLessonCapabilities().apply({kind: 'kinematics', operation: 'set-motion', motion: 'projectile'}); });
        act(() => { graph.getLessonCapabilities().apply({kind: 'kinematics', operation: 'set-params', v0: 30, alpha: 5, osculating: true}); });
        go(graph, 0.5);
        expect(graph.osculatingCircleNow()).toBeUndefined();
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_osculating'));
        expect(noteTexts(graph)).toContain(t('kinematics_note_osculating_far'));
        noBadText();
    });

    test('the tangent and normal axes are drawn while the acceleration is split, and only at a regular point', () => {
        const {graph} = mountGraph();
        go(graph, 1);
        expect(lines(graph)).toHaveLength(2);
        expect(lines(graph).some(visible)).toBe(false);
        flip('split');
        expect(lines(graph).every(visible)).toBe(true);
        expect(legendTexts(graph)).toContain(t('kinematics_legend_axes'));
        go(graph, 0);
        expect(lines(graph).some(visible)).toBe(false);
        expect(legendTexts(graph)).not.toContain(t('kinematics_legend_axes'));
    });

    test('stepping the time rebuilds nothing: the owned objects and the arrow markers stay the same', () => {
        const {graph} = mountGraph();
        flip('osculating');
        flip('split');
        go(graph, 1);
        const objects = graph.ownedObjectCount();
        const ids = () => probes(graph).filter(o => o.elType !== 'label').map(o => o.id).join(',');
        const markers = () => document.querySelectorAll('#jgbox svg marker').length;
        const before = markers();
        const idsBefore = ids();
        expect(objects).toBeGreaterThan(0);
        expect(before).toBeGreaterThan(0);
        for (const time of [0.5, 2, Math.PI, 5, 6.2]) go(graph, time);
        flip('osculating');
        expect(graph.ownedObjectCount()).toBe(objects);
        // The very same objects (not equal replacements) draw the new time, and the arrow markers are the ones that were there.
        expect(ids()).toBe(idsBefore);
        expect(markers()).toBe(before);
    });
});
describe('the arrow tags keep clear of each other, of the arrowheads and of the point (families-prep kinematics arrow tags)', () => {
    const BOARDS = [{name: 'phone', width: 364, height: 473}, {name: 'desktop', width: 946, height: 507}] as const;
    type Board = {unitX: number; unitY: number; canvasWidth: number; canvasHeight: number; getBoundingBox(): number[]};
    type Shape = Probe & {X(): number; Y(): number; point2?: {X(): number; Y(): number}};
    type Tag = {name: string; x0: number; y0: number; x1: number; y1: number; tip: [number, number]; head: [number, number][]};
    const sizeOf = (width: number, height: number) => ({clientWidth: width, offsetWidth: width, clientHeight: height, offsetHeight: height});
    afterEach(() => {
        for (const [name, size] of Object.entries(sizeOf(600, 400))) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 400, width: 600, height: 400, toJSON: () => ({})}) as DOMRect;
    });

    /** The visible tags as pixel boxes with their tips and the corners of their arrowheads (a triangle 8 px long and 8 px wide), the moving point in px. */
    function tagScene(width: number, height: number, motion: MotionChoice, time: number) {
        for (const [name, size] of Object.entries(sizeOf(width, height))) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => size});
        HTMLElement.prototype.getBoundingClientRect = () => ({x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON: () => ({})}) as DOMRect;
        const {graph} = mountGraph();
        const board = graph.liveBoard() as unknown as Board;
        learner(() => { graph.setState({...withMotion(DEFAULT_KINEMATICS_STATE, motion), split: true, osculating: true, trace: true, showVelocity: true, showAcceleration: true}); });
        go(graph, time);
        const [left, top] = board.getBoundingBox();
        const px = (x: number, y: number): [number, number] => [(x - left) * board.unitX, (top - y) * board.unitY];
        const point = px(...graph.evaluation().point);
        const names = ['v', 'a', 'aₜ', 'aₙ'];
        const shapes = arrows(graph) as unknown as Shape[];
        const texts = (ofType(graph, 'text') as unknown as Shape[]).filter(o => (o.plaintext ?? '').startsWith('$$'));
        expect(texts).toHaveLength(4);
        const found: Tag[] = [];
        shapes.forEach((arrow, index) => {
            if (!visible(arrow)) return;
            const text = texts[index];
            expect(visible(text)).toBe(true);
            const {w, h} = tagSize(names[index], 14);
            const [x, y] = px(text.X(), text.Y());
            const anchor = text.evalVisProp('anchory');
            const top0 = anchor === 'top' ? y : anchor === 'bottom' ? y - h : y - h / 2;
            const tip = px(arrow.point2!.X(), arrow.point2!.Y());
            const length = Math.hypot(tip[0] - point[0], tip[1] - point[1]);
            const [ux, uy] = [(tip[0] - point[0]) / length, (tip[1] - point[1]) / length];
            const base: [number, number] = [tip[0] - 8 * ux, tip[1] - 8 * uy];
            const head: [number, number][] = [tip, [base[0] - 4 * uy, base[1] + 4 * ux], [base[0] + 4 * uy, base[1] - 4 * ux], base];
            found.push({name: names[index], x0: x, y0: top0, x1: x + w, y1: top0 + h, tip, head});
        });
        return {point, tags: found, width, height, graph, board};
    }
    const inBox = (box: Tag, [x, y]: [number, number]) => x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;
    const CASES: readonly [MotionChoice, number][] = [['cycloid', 0.5], ['cycloid', Math.PI / 2], ['cycloid', 3.14], ['projectile', 1.5], ['rose', 1.2]];

    for (const board of BOARDS) {
        for (const [motion, time] of CASES) {
            test(`${board.name} ${board.width} x ${board.height}, ${motion} at t = ${time}: tags are disjoint, clear of arrowheads and the point, each nearest its own tip`, () => {
                const {point, tags} = tagScene(board.width, board.height, motion, time);
                expect(tags.length).toBeGreaterThanOrEqual(3);
                tags.forEach((a, i) => tags.slice(i + 1).forEach(b => {
                    const overlap = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
                    expect(overlap, `${a.name} and ${b.name} overlap`).toBe(false);
                }));
                for (const tag of tags) {
                    // No tag covers any arrowhead (corners, edge midpoints and centre of its triangle) or the moving point (radius 5 px).
                    for (const other of tags) {
                        const [p, q, r] = other.head;
                        const samples: [number, number][] = [...other.head, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2], [(p[0] + q[0] + r[0]) / 3, (p[1] + q[1] + r[1]) / 3]];
                        for (const sample of samples) expect(inBox(tag, sample), `${tag.name} covers the head of ${other.name}`).toBe(false);
                    }
                    const nearX = Math.max(tag.x0, Math.min(point[0], tag.x1)), nearY = Math.max(tag.y0, Math.min(point[1], tag.y1));
                    expect(Math.hypot(nearX - point[0], nearY - point[1]), `${tag.name} covers the point`).toBeGreaterThan(5);
                    // Nearest its own tip: the distance of the box to its tip beats the distance to every other tip.
                    const gap = (t: [number, number]) => Math.hypot(Math.max(tag.x0 - t[0], 0, t[0] - tag.x1), Math.max(tag.y0 - t[1], 0, t[1] - tag.y1));
                    for (const other of tags) if (other !== tag && Math.hypot(other.tip[0] - tag.tip[0], other.tip[1] - tag.tip[1]) > 1) expect(gap(tag.tip), `${tag.name} is nearer ${other.name}'s tip`).toBeLessThan(gap(other.tip));
                    expect(tag.x0).toBeGreaterThanOrEqual(0);
                    expect(tag.x1).toBeLessThanOrEqual(board.width);
                }
            });
        }
    }

    /** The boxes of the axis tick numbers (px from the top left corner, y down), from the tick label elements and their anchors. */
    function tickBoxes(board: Board): {x0: number; y0: number; x1: number; y1: number}[] {
        const [left, top] = board.getBoundingBox();
        type Label = Probe & {plaintext: string; X(): number; Y(): number};
        const axes = (board as unknown as {defaultAxes: Record<'x' | 'y', {defaultTicks?: {labels?: Label[]}}>}).defaultAxes;
        return (['x', 'y'] as const).flatMap(k => (axes[k].defaultTicks?.labels ?? []).filter(l => visible(l)).map(l => {
            const [px, py] = [(l.X() - left) * board.unitX, (top - l.Y()) * board.unitY];
            const w = l.plaintext.length * 7 + 2, h = 14;
            return k === 'x' ? {x0: px - w / 2, y0: py, x1: px + w / 2, y1: py + h} : {x0: px - w, y0: py - h / 2, x1: px, y1: py + h / 2};
        }));
    }
    const TICK_CASES: readonly [MotionChoice, number][] = [['projectile', 1.5], ['projectile', 0.7], ['projectile', 1.0], ['rose', 1.8], ['rose', 2.4], ['rose', 3.0], ['cycloid', 0.5]];
    for (const board of [{width: 390, height: 500}, {width: 600, height: 400}]) {
        for (const [motion, time] of TICK_CASES) {
            test(`${board.width} x ${board.height}, ${motion} at t = ${time}: no tag lies on an axis tick number, and each is 4 px inside the board`, () => {
                const {tags, board: live} = tagScene(board.width, board.height, motion, time);
                const ticks = tickBoxes(live);
                expect(ticks.length).toBeGreaterThan(4);
                for (const tag of tags) {
                    const hit = ticks.find(t => tag.x0 < t.x1 && tag.x1 > t.x0 && tag.y0 < t.y1 && tag.y1 > t.y0);
                    expect(hit, `${tag.name} at ${JSON.stringify([tag.x0, tag.y0, tag.x1, tag.y1])} lies on a tick number ${JSON.stringify(hit)}`).toBeUndefined();
                    expect(tag.y1).toBeLessThanOrEqual(board.height - 4);
                    expect(tag.y0).toBeGreaterThanOrEqual(4);
                }
            });
        }
    }
});
