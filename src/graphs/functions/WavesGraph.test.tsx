import {mkdirSync, writeFileSync} from 'node:fs';
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {TransientState} from '../base/BaseGraph';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {POINTS_PER_SECOND, WAVES_FIELD_RANGES, WAVES_MODES, type WavesMode, type WavesState} from '../../waves/wavesModel';
import {MAX_FRAME_MS, TIME_STEP, WavesGraph} from './WavesGraph';

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

class ObservedGraph extends WavesGraph {
    frames = new FakeClock();
    reduced = false;
    protected override animationScheduler() { return this.frames; }
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
const slider = () => screen.getByRole('slider') as HTMLInputElement;
const status = () => document.querySelector('[data-waves-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const MINUS = '−';

type Probe = {id: string; elType: string; plaintext?: string; dataX?: number[]; dataY?: number[]; X(): number; Y(): number; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const ofType = (graph: ObservedGraph, type: string) => probes(graph).filter(o => o.elType === type);
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
const curves = (graph: ObservedGraph) => ofType(graph, 'curve').filter(o => (o.dataX?.length ?? 0) > 2);
const captionTexts = (graph: ObservedGraph) => ofType(graph, 'text').filter(visible).map(o => o.plaintext ?? '');
const near = (a: number | undefined, b: number, digits = 9) => a !== undefined && Math.abs(a - b) < 10 ** -digits;
/** Curves of a given length whose value at the index is the given one. */
const withValue = (graph: ObservedGraph, length: number, index: number, value: number) =>
    curves(graph).filter(o => o.dataY?.length === length && near(o.dataY[index], value));
const set = (graph: ObservedGraph, patch: Partial<WavesState>) => act(() => { graph.setState(patch); });
const choose = (mode: WavesMode) => act(() => { fireEvent.change(field(t('waves_graph_mode_label')), {target: {value: mode}}); });
function go(graph: ObservedGraph, time: number): boolean {
    let accepted = false;
    act(() => { accepted = graph.setTime(time); });
    return accepted;
}
const describedText = (element: HTMLElement) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
    .map(id => document.getElementById(id)?.textContent ?? '').join(' ');

/** Runs frames of the given duration until the clock has nothing pending (at most `limit`). */
function run(graph: ObservedGraph, step = MAX_FRAME_MS, limit = 400) {
    let time = 0;
    graph.frames.tick(time);
    for (let i = 0; i < limit && graph.frames.pending(); i++) { time += step; graph.frames.tick(time); }
}

describe('the sum of two waves', () => {
    test('the default scene draws the two waves and their sum on 2048 points per second, with hand values at t = 0,25 s', () => {
        const {graph} = mountGraph();
        expect(graph.state).toMatchObject({mode: 'sum', a1: 1, p1: 0, a2: 1, p2: 120, f1: 3});
        expect(document.querySelector(`[aria-label="${t('waves_graph_board_label')}"]`)).not.toBeNull();
        const length = POINTS_PER_SECOND + 1;
        // cos(2 pi 3 0,25) = cos(270 deg) = 0 and cos(270 + 120 deg) = cos 30 deg = 0,8660254: wave 1, wave 2 and the sum.
        expect(withValue(graph, length, 512, 0)).toHaveLength(1);
        expect(withValue(graph, length, 512, Math.sqrt(3) / 2)).toHaveLength(2);
        expect(curves(graph).filter(o => o.dataY?.length === length && o.dataX?.[1] === 1 / POINTS_PER_SECOND).length).toBeGreaterThanOrEqual(3);
        noBadText();
    });

    test('the readout rows are labelled and hold the hand values: 120 degrees apart give amplitude 2 cos 60 deg = 1, phase 60 deg, range 0 to 2', () => {
        const {graph} = mountGraph();
        expect(labelOf('sum-amplitude')).toBe(t('waves_graph_r_sum_amplitude'));
        expect(readout('sum-amplitude')).toBe('1');
        expect(readout('frequency')).toBe('3 Hz');
        expect(readout('phase-difference')).toBe('120°');
        expect(readout('sum-phase')).toBe('60°');
        expect(readout('amplitude-range')).toBe(t('waves_graph_range_value', {value0: '0', value1: '2'}));
        expect(readout('wave1')).toBe('1');
        expect(readout('wave2')).toBe(`${MINUS}0,5`);
        expect(readout('sum')).toBe('0,5');
        go(graph, 0.25);
        expect(readout('time')).toBe('0,25 s');
        expect(readout('wave1')).toBe('0');
        expect(readout('wave2')).toBe('0,866');
        for (const row of Array.from(document.querySelectorAll('[data-readout]'))) {
            expect(row.querySelector('dt')?.textContent?.length, row.getAttribute('data-readout') ?? '').toBeGreaterThan(0);
            expect(row.querySelector('dd')?.textContent?.length, row.getAttribute('data-readout') ?? '').toBeGreaterThan(0);
        }
        noBadText();
    });

    test('the sum phase is the phase of the sum, p1 plus the relative phase: 40 and 160 degrees with equal amplitudes give 100 degrees', () => {
        const {graph} = mountGraph();
        set(graph, {a1: 1, a2: 1, p1: 40, p2: 160});
        expect(readout('sum-phase')).toBe('100°');
        // 170 and -150 degrees: the relative phase is 20 degrees, 170 + 20 = 190 is shown as -170 on the stated range.
        set(graph, {p1: 170, p2: -150});
        expect(readout('sum-phase')).toBe(`${MINUS}170°`);
        set(graph, {p1: -180, p2: -180});
        expect(readout('sum-phase')).toBe('180°');
    });

    test('opposite waves cancel and say so; the phase of nothing is not defined', () => {
        const {graph} = mountGraph();
        set(graph, {p2: 180});
        expect(readout('sum-amplitude')).toBe(t('waves_graph_cancel'));
        expect(readout('sum-phase')).toBe(t('waves_graph_not_defined'));
        expect(status()).toContain(t('waves_graph_status_sum_cancel'));
        noBadText();
    });

    test('every element a readout names has a caption; the phasor caption follows its switch', () => {
        const {graph} = mountGraph();
        const texts = captionTexts(graph);
        for (const key of ['waves_graph_cap_axes_time', 'waves_graph_cap_wave1', 'waves_graph_cap_wave2', 'waves_graph_cap_sum', 'waves_graph_cap_phasors'] as const) {
            expect(texts, key).toContain(t(key));
        }
        expect(texts).toContain(t('waves_graph_cap_resolution', {value0: POINTS_PER_SECOND}));
        expect(texts).toEqual(expect.arrayContaining([t('waves_graph_tip_1'), t('waves_graph_tip_2'), t('waves_graph_tip_sum')]));
        act(() => { fireEvent.click(field(t('waves_graph_show_phasors'))); });
        expect(graph.state.showPhasors).toBe(false);
        expect(captionTexts(graph)).not.toContain(t('waves_graph_cap_phasors'));
        expect(captionTexts(graph)).not.toContain(t('waves_graph_tip_sum'));
    });

    test('three phasor arrows are drawn; the sum arrow ends where the second one does, and its tip is the sum of the waves', () => {
        const {graph} = mountGraph();
        const arrows = ofType(graph, 'arrow');
        expect(arrows).toHaveLength(3);
        expect(arrows.every(visible)).toBe(true);
        act(() => { fireEvent.click(field(t('waves_graph_show_phasors'))); });
        expect(ofType(graph, 'arrow').some(visible)).toBe(false);
    });
});

describe('beats', () => {
    test('beats of 10 and 12 Hz: the sum and the envelope 2 |cos(pi 2 t)| are drawn on 4097 points over 2 s, hand values at t = 0,125 s', () => {
        const {graph} = mountGraph();
        choose('beats');
        set(graph, {f1: 10, f2: 12});
        const length = 2 * POINTS_PER_SECOND + 1;
        // t = 0,125 s: cos(2,5 pi) = 0, cos(3 pi) = -1, so the sum is -1; the envelope is 2 cos(pi / 4).
        expect(withValue(graph, length, 256, 0)).toHaveLength(1);
        expect(withValue(graph, length, 256, -1)).toHaveLength(2);
        expect(withValue(graph, length, 256, Math.SQRT2)).toHaveLength(1);
        expect(withValue(graph, length, 256, -Math.SQRT2)).toHaveLength(1);
        expect(readout('beat-frequency')).toBe('2 Hz');
        expect(readout('mean-frequency')).toBe('11 Hz');
        expect(readout('beat-period')).toBe('0,5 s');
        expect(status()).toContain(t('waves_graph_status_beats', {value0: '10', value1: '12', value2: '2', value3: '0,5'}));
        go(graph, 0.125);
        expect(readout('envelope')).toBe('1,414');
        expect(readout('sum')).toBe(`${MINUS}1`);
    });

    test('equal frequencies give no beats, said in words and in the period row', () => {
        const {graph} = mountGraph();
        choose('beats');
        set(graph, {f1: 7, f2: 7});
        expect(readout('beat-period')).toBe(t('waves_graph_no_beats'));
        expect(status()).toContain(t('waves_graph_status_no_beats', {value0: '2'}));
    });

    test('the envelope curves and caption follow their switch; the window and the slider are 2 s', () => {
        const {graph} = mountGraph();
        choose('beats');
        expect(captionTexts(graph)).toContain(t('waves_graph_cap_envelope'));
        act(() => { fireEvent.click(field(t('waves_graph_show_envelope'))); });
        expect(captionTexts(graph)).not.toContain(t('waves_graph_cap_envelope'));
        expect(Number(slider().max)).toBe(2);
        expect(go(graph, 2)).toBe(true);
        expect(go(graph, 2.1)).toBe(false);
    });
});

describe('the standing wave', () => {
    test('two half waves on length 2: nodes at 0, 1, 2 and antinodes at 0,5 and 1,5 with the heights of 2 a sin(k x) at t = 0', () => {
        const {graph} = mountGraph();
        choose('standing');
        const marks = ofType(graph, 'point').filter(o => visible(o) && o.evalVisProp('size') === 5);
        expect(marks.map(o => o.X()).sort((a, b) => a - b).map(x => Math.round(x * 1000) / 1000)).toEqual([0, 0.5, 1, 1.5, 2]);
        const antinodes = marks.filter(o => Math.abs(o.Y()) > 1);
        expect(antinodes.map(o => [Math.round(o.X() * 10) / 10, Math.round(o.Y() * 1000) / 1000]).sort()).toEqual([[0.5, 2], [1.5, -2]]);
        expect(readout('half-waves')).toBe('2');
        expect(readout('wavelength')).toBe('2');
        expect(readout('period')).toBe('1 s');
        expect(readout('nodes')).toBe('0; 1; 2');
        expect(readout('antinodes')).toBe(`0,5; 1,5`);
        expect(readout('antinode-amplitude')).toBe('2');
        // x = 0,5 is index 512 of 2048: the sum is 2 sin(pi / 2) = 2 at t = 0, and the two travelling waves are 1 each.
        expect(withValue(graph, POINTS_PER_SECOND + 1, 512, 2)).toHaveLength(1);
        expect(withValue(graph, POINTS_PER_SECOND + 1, 512, 1)).toHaveLength(2);
        expect(captionTexts(graph)).toEqual(expect.arrayContaining([
            t('waves_graph_cap_axes_space'), t('waves_graph_cap_right'), t('waves_graph_cap_left'), t('waves_graph_cap_standing'),
            t('waves_graph_cap_nodes'), t('waves_graph_cap_antinodes'), t('waves_graph_cap_resolution_space', {value0: POINTS_PER_SECOND}),
        ]));
    });

    test('the waves move with the time: a quarter period later the standing sum is 0 everywhere and the travelling waves are shifted', () => {
        const {graph} = mountGraph();
        choose('standing');
        go(graph, 0.25);
        expect(withValue(graph, POINTS_PER_SECOND + 1, 512, 0).length).toBeGreaterThanOrEqual(1);
        // right: sin(pi x - 2 pi t) at x = 0,5, t = 0,25 is sin(0) = 0; left: sin(pi x + 2 pi t) = sin(pi) = 0; so all three are 0.
        expect(withValue(graph, POINTS_PER_SECOND + 1, 512, 0)).toHaveLength(3);
    });

    test('the antinode marks ride the standing sum: with amplitude 1,5 at t = 0,125 s they are at +/- 2 a cos(pi / 4)', () => {
        const {graph} = mountGraph();
        choose('standing');
        set(graph, {a1: 1.5});
        go(graph, 0.125);
        const marks = ofType(graph, 'point').filter(o => visible(o) && o.evalVisProp('size') === 5 && Math.abs(o.Y()) > 0.5);
        expect(marks.map(o => Math.round(o.Y() * 1000) / 1000).sort((a, b) => a - b)).toEqual([-2.121, 2.121]);
    });
});

describe('sampling', () => {
    const wheel = (graph: ObservedGraph) => ofType(graph, 'point').filter(o => visible(o) && o.evalVisProp('size') === 6);

    test('the samples at the instants n / 12 of a 3 Hz tone are cos(n pi / 2); the wheel and the strip are captioned', () => {
        const {graph} = mountGraph();
        choose('sampling');
        const join = curves(graph).filter(o => o.dataX?.length === 13 && o.dataY?.length === 13);
        expect(join).toHaveLength(1);
        expect(join[0].dataX!.every((x, n) => near(x, n / 12))).toBe(true);
        expect([0, 1, 2, 3, 4].map(n => Math.round(join[0].dataY![n] * 1e9) / 1e9 + 0)).toEqual([1, 0, -1, 0, 1]);
        expect(captionTexts(graph)).toEqual(expect.arrayContaining([
            t('waves_graph_cap_axes_time'), t('waves_graph_cap_wave'), t('waves_graph_cap_dots'), t('waves_graph_cap_strip'), t('waves_graph_cap_wheel'),
            t('waves_graph_tip_true'), t('waves_graph_tip_film'),
        ]));
        expect(readout('rate')).toBe('12 Hz');
        expect(readout('samples-per-period')).toBe('4');
        expect(readout('nyquist')).toBe('2f = 6 Hz; fs = 12 Hz je nad njo');
        expect(readout('alias')).toBe(t('waves_graph_alias_forward', {value0: '3'}));
    });

    test('23 Hz sampled at 24 Hz looks like a wheel turning backwards at 1 Hz; the alias tone has the same samples', () => {
        const {graph} = mountGraph();
        choose('sampling');
        set(graph, {f1: 23, fs: 24});
        expect(readout('alias')).toBe(t('waves_graph_alias_backward', {value0: '1'}));
        expect(readout('alias-frequency')).toBe(`${MINUS}1 ${t('waves_graph_unit_rev')}`);
        expect(readout('nyquist')).toBe('2f = 46 Hz; fs = 24 Hz je pod njo (pojav lažne frekvence)');
        expect(status()).toContain(t('waves_graph_alias_backward', {value0: '1'}));
        expect(captionTexts(graph)).toContain(t('waves_graph_cap_alias', {value0: `${MINUS}1`}));
        const length = POINTS_PER_SECOND + 1;
        // The alias is cos(2 pi (-1) t); at index 150 (t = 150 / 2048) the true 23 Hz tone is a different number.
        const alias = Math.cos((2 * Math.PI * 150) / POINTS_PER_SECOND);
        const tone = Math.cos((2 * Math.PI * 23 * 150) / POINTS_PER_SECOND);
        expect(Math.abs(alias - tone)).toBeGreaterThan(0.5);
        expect(withValue(graph, length, 150, alias)).toHaveLength(1);
        expect(withValue(graph, length, 150, tone)).toHaveLength(1);
    });

    test('6 Hz sampled at 12 Hz is ambiguous (no alias tone drawn), 12 Hz at 12 Hz stands still, 5 Hz at 12 Hz turns forwards', () => {
        const {graph} = mountGraph();
        choose('sampling');
        set(graph, {f1: 6, fs: 12});
        expect(readout('alias')).toBe(t('waves_graph_alias_ambiguous'));
        expect(readout('alias-frequency')).toBe(t('waves_graph_not_defined'));
        expect(readout('nyquist')).toBe('2f = 12 Hz; fs = 12 Hz je enaka njej');
        expect(captionTexts(graph).some(text => text.startsWith('Črtkano: ton z navidezno'))).toBe(false);
        set(graph, {f1: 12, fs: 12});
        expect(readout('alias')).toBe(t('waves_graph_alias_rest'));
        set(graph, {f1: 5, fs: 12});
        expect(readout('alias')).toBe(t('waves_graph_alias_forward', {value0: '5'}));
        noBadText();
    });

    test('the sampler instants are n / fs whatever the frame durations: the sampled mark sits on a multiple of 1 / 12 at every frame', () => {
        for (const step of [7, 16, 33, 100, 1000]) {
            const {graph, view} = mountGraph();
            choose('sampling');
            const before = graph.derived().facts;
            press(t('play'));
            let clockTime = 0;
            graph.frames.tick(clockTime);
            let frames = 0;
            while (graph.frames.pending() && frames < 40) {
                clockTime += step;
                graph.frames.tick(clockTime);
                frames++;
                const mark = wheel(graph)[0];
                expect(mark, `step ${step}`).toBeDefined();
                const n = mark.X() * 12;
                expect(Math.abs(n - Math.round(n)), `step ${step} frame ${frames}`).toBeLessThan(1e-9);
                expect(Math.round(n), `step ${step}`).toBe(Math.floor(graph.time * 12 + 1e-9));
            }
            expect(graph.derived().facts).toBe(before);
            view.unmount();
        }
    });

    test('the frame row names the sample n and the instant n / fs with four decimals', () => {
        const {graph} = mountGraph();
        choose('sampling');
        go(graph, 0.2);
        expect(readout('frame')).toBe(t('waves_graph_frame_value', {value0: '2', value1: '12', value2: '0,1667'}));
        go(graph, 0.25);
        expect(readout('frame')).toBe(t('waves_graph_frame_value', {value0: '3', value1: '12', value2: '0,25'}));
    });

    test('the join and sinc rows and curves follow their switches; the sinc curve is the derived one', () => {
        const {graph} = mountGraph();
        choose('sampling');
        expect(readout('join-error')).toBeUndefined();
        expect(readout('sinc-error')).toBeUndefined();
        act(() => { fireEvent.click(field(t('waves_graph_show_join'))); });
        expect(Number(readout('join-error')?.replace(',', '.'))).toBeGreaterThan(0);
        expect(captionTexts(graph)).toContain(t('waves_graph_cap_join'));
        act(() => { fireEvent.click(field(t('waves_graph_show_sinc'))); });
        expect(readout('sinc-error')).toMatch(/ \(na 0,4 do 0,6 s\)$/);
        expect(readout('sinc-error')).toMatch(/^[0-9],[0-9]{4} /);
        expect(captionTexts(graph)).toContain('Črtkano: rekonstrukcija s funkcijo sinc (okrnjena, približna)');
        expect(t('waves_graph_show_sinc_help')).toContain('na 0,4 do 0,6 s');
        const sinc = graph.derived().facts.kind === 'sampling' ? graph.derived().facts : undefined;
        const values = sinc && sinc.kind === 'sampling' ? sinc.sinc!.values : [];
        expect(values).toHaveLength(POINTS_PER_SECOND + 1);
        expect(curves(graph).some(o => o.dataY?.length === values.length && o.dataY.every((y, i) => y === values[i]))).toBe(true);
        expect(field(t('waves_graph_extra_label'))).toBeTruthy();
    });
});

describe('controls', () => {
    test('every numeric field, switch, the mode choice and the slider is described by help that states its range', () => {
        const {graph} = mountGraph();
        const ranges = WAVES_FIELD_RANGES;
        const rangeText = (name: keyof typeof ranges, _decimals: number) => {
            const r = ranges[name];
            const dec = (v: number) => String(v).replace('.', ',').replace('-', MINUS);
            return `od ${dec(r.min)} do ${dec(r.max)}`;
        };
        expect(describedText(field(t('waves_graph_a1_sum_label')))).toContain(rangeText('a1', 2));
        expect(describedText(field(t('waves_graph_p1_label')))).toContain(rangeText('p1', 0));
        expect(describedText(field(t('waves_graph_a2_label')))).toContain(rangeText('a2', 2));
        expect(describedText(field(t('waves_graph_p2_label')))).toContain(rangeText('p2', 0));
        expect(describedText(field(t('waves_graph_f_both_label')))).toContain(rangeText('f1', 0));
        expect(describedText(field(t('waves_graph_show_phasors'))).length).toBeGreaterThan(10);
        expect(describedText(field(t('waves_graph_mode_label'))).length).toBeGreaterThan(10);
        expect(describedText(slider())).toContain('Čas od 0 do 1 s');
        choose('beats');
        expect(describedText(field(t('waves_graph_a1_each_label')))).toContain(rangeText('a1', 2));
        expect(describedText(field(t('waves_graph_f1_beats_label')))).toContain(rangeText('f1', 0));
        expect(describedText(field(t('waves_graph_f2_beats_label')))).toContain(rangeText('f2', 0));
        expect(describedText(field(t('waves_graph_show_envelope'))).length).toBeGreaterThan(10);
        expect(describedText(slider())).toContain('Čas od 0 do 2 s');
        choose('standing');
        expect(describedText(field(t('waves_graph_half_waves_label')))).toContain(rangeText('halfWaves', 0));
        choose('sampling');
        expect(describedText(field(t('waves_graph_a1_tone_label')))).toContain(rangeText('a1', 2));
        expect(describedText(field(t('waves_graph_p1_tone_label')))).toContain(rangeText('p1', 0));
        expect(describedText(field(t('waves_graph_f_tone_label')))).toContain(rangeText('f1', 0));
        expect(describedText(field(t('waves_graph_fs_label')))).toContain(rangeText('fs', 0));
        for (const key of ['waves_graph_show_alias', 'waves_graph_show_join', 'waves_graph_show_sinc'] as const) {
            expect(describedText(field(t(key))).length, key).toBeGreaterThan(10);
        }
        act(() => { fireEvent.click(field(t('waves_graph_show_sinc'))); });
        expect(graph.state.showSinc).toBe(true);
        expect(describedText(field(t('waves_graph_extra_label')))).toContain(rangeText('extra', 0));
    });

    test('a typed number outside the range is refused (never clamped) with the range stated; an off-grid one is rounded and announced', () => {
        const {graph} = mountGraph();
        enter(t('waves_graph_a1_sum_label'), '5');
        expect(graph.state.a1).toBe(1);
        expect(field(t('waves_graph_a1_sum_label')).getAttribute('aria-invalid')).toBe('true');
        expect(describedText(field(t('waves_graph_a1_sum_label')))).toContain(t('number_range_hint', {value0: '0', value1: '4'}));
        enter(t('waves_graph_a1_sum_label'), '1,3');
        expect(graph.state.a1).toBe(1.25);
        expect(describedText(field(t('waves_graph_a1_sum_label')))).toContain(t('number_snapped_hint', {value0: '1,25'}));
        // The field already rounds what is typed; a value handed to the graph directly (a lesson action) is rounded and announced in the status text.
        act(() => { expect(graph.editNumber('a2', 1.3)).toBe(true); });
        expect(graph.state.a2).toBe(1.25);
        expect(status()).toContain(t('waves_graph_notice_rounded', {value0: '1,25'}));
        enter(t('waves_graph_p1_label'), '47');
        expect(graph.state.p1).toBe(45);
        expect(graph.editNumber('p1', 200)).toBe(false);
        expect(graph.editNumber('f1', 0)).toBe(false);
        expect(graph.state.p1).toBe(45);
        expect(graph.state.f1).toBe(3);
    });

    test('the time slider reaches the end of the window, refuses beyond it, has a grid and a spoken value with its unit', () => {
        const {graph} = mountGraph();
        expect(slider().min).toBe('0');
        expect(Number(slider().max)).toBe(1);
        expect(slider().step).toBe(String(TIME_STEP));
        expect(go(graph, 1)).toBe(true);
        expect(go(graph, 1.1)).toBe(false);
        expect(go(graph, -0.01)).toBe(false);
        expect(go(graph, Number.NaN)).toBe(false);
        expect(graph.time).toBe(1);
        expect(slider().getAttribute('aria-valuetext')).toContain(' s');
    });

    test('changing the mode resets the time and says so; the next edit drops the notice', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        choose('beats');
        expect(graph.time).toBe(0);
        expect(status()).toContain(t('waves_graph_notice_reset'));
        set(graph, {f1: 4});
        expect(status()).not.toContain(t('waves_graph_notice_reset'));
    });
});

describe('playback', () => {
    test('play advances the time by the frame delta (at most 100 ms), pause stops it, no frame is pending after', () => {
        const {graph} = mountGraph();
        press(t('play'));
        expect(graph.playing).toBe(true);
        graph.frames.tick(0);
        graph.frames.tick(50);
        expect(graph.time).toBeCloseTo(0.05, 9);
        graph.frames.tick(5050);
        expect(graph.time).toBeCloseTo(0.05 + MAX_FRAME_MS / 1000, 9);
        press(t('pause'));
        expect(graph.playing).toBe(false);
        expect(graph.frames.pending()).toBe(false);
        const stopped = graph.time;
        graph.frames.tick(9999);
        expect(graph.time).toBe(stopped);
    });

    test('the run ends at the end of the window with a status, stops its frame loop, and Play at the end starts again from 0', () => {
        const {graph} = mountGraph();
        press(t('play'));
        run(graph);
        expect(graph.time).toBe(1);
        expect(graph.playing).toBe(false);
        expect(graph.frames.pending()).toBe(false);
        expect(status()).toContain(t('waves_graph_status_ended', {value0: '1'}));
        press(t('play'));
        expect(graph.playing).toBe(true);
        expect(graph.time).toBe(0);
        press(t('pause'));
    });

    test('Reset returns to t = 0 and stops; it is unavailable with a reason at t = 0', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
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
        expect(graph.frames.requests).toBe(0);
        act(() => graph.play()); // a lesson action or any caller other than the button
        expect(graph.playing).toBe(false);
        expect(graph.frames.requests).toBe(0);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion'));
        act(() => { fireEvent.change(slider(), {target: {value: '0.5'}}); });
        expect(graph.time).toBe(0.5);
    });

    test('while it plays the live region is silent and the visible readout moves; on pause the live region says the state once', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        press(t('play'));
        graph.frames.tick(0);
        graph.frames.tick(100);
        expect(live()).toBe('');
        expect(readout('time')).toBe('0,6 s');
        press(t('pause'));
        expect(live()).toContain(t('waves_graph_status_time', {value0: '0,6'}));
    });

    test('every edit pauses the playback first, including a direct setState of a stored field (a lesson action or a restore)', () => {
        const {graph} = mountGraph();
        press(t('play'));
        act(() => { fireEvent.click(field(t('waves_graph_show_phasors'))); });
        expect(graph.playing).toBe(false);
        expect(graph.frames.pending()).toBe(false);
        press(t('play'));
        set(graph, {a2: 2});
        expect(graph.playing).toBe(false);
        expect(graph.frames.pending()).toBe(false);
        press(t('play'));
        choose('beats');
        expect(graph.playing).toBe(false);
        press(t('play'));
        set(graph, {mode: 'standing'});
        expect(graph.playing).toBe(false);
        expect(graph.time).toBe(0);
        press(t('play'));
        set(graph, {});
        expect(graph.playing).toBe(true);
        press(t('pause'));
    });

    test('a lesson checkpoint keeps the time and lands stopped; a saved time outside the window is refused (time 0, said in the status)', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        const saved = graph.capture();
        expect(saved.wavesTime).toBe(0.5);
        go(graph, 0.9);
        press(t('play'));
        act(() => graph.restore(saved));
        expect(graph.time).toBe(0.5);
        expect(graph.playing).toBe(false);
        expect(graph.frames.pending()).toBe(false);
        for (const bad of [99, -1, Number.NaN, '2']) {
            go(graph, 0.5);
            act(() => graph.restore({wavesTime: bad} as unknown as TransientState));
            expect(graph.time, String(bad)).toBe(0);
            expect(graph.statusText(), String(bad)).toContain(t('waves_graph_notice_time_refused'));
        }
        act(() => graph.restore(undefined));
        expect(graph.time).toBe(0);
        expect(graph.statusText()).not.toContain(t('waves_graph_notice_time_refused'));
    });

    test('a continuous wave is drawn at real speed: the frame duration is the only thing the time follows', () => {
        const {graph} = mountGraph();
        choose('sampling');
        set(graph, {f1: 23, fs: 24});
        press(t('play'));
        graph.frames.tick(0);
        graph.frames.tick(16);
        graph.frames.tick(32);
        expect(graph.time).toBeCloseTo(0.032, 9);
        press(t('pause'));
    });
});

describe('ownership and disposal', () => {
    test('unmount while playing cancels the frame loop and every timer, removes the board label and the language listener', () => {
        vi.useFakeTimers();
        // JSXGraph leaves a timer of its own for every redrawn step; measured with one state change from outside. The played run must leave the same.
        const before = vi.getTimerCount();
        const reference = mountGraph();
        set(reference.graph, {showPhasors: false});
        reference.view.unmount();
        const plainDelta = vi.getTimerCount() - before;
        const afterPlain = vi.getTimerCount();
        const {graph, view} = mountGraph();
        press(t('play'));
        graph.frames.tick(0);
        graph.frames.tick(16);
        expect(graph.frames.pending()).toBe(true);
        view.unmount();
        expect(graph.frames.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        expect(vi.getTimerCount() - afterPlain).toBe(plainDelta);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('waves_graph_board_label')}"]`)).toBeNull();
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
        expect(strict.graph.frames.pending()).toBe(false);
        expect(strict.graph.ownedObjectCount()).toBe(0);
    });

    test('disposal removes every owned object back to the pre-scene count, and the next state change rebuilds the same scene', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        const total = graph.liveBoard().objectsList.length;
        expect(owned).toBeGreaterThan(15);
        press(t('play'));
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.liveBoard().objectsList.length).toBe(total - owned);
        expect(graph.frames.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        act(() => { fireEvent.click(field(t('waves_graph_show_phasors'))); });
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.liveBoard().objectsList.length).toBe(total);
    });

    test('disposal of every mode returns to the pre-scene count, and switching modes in a loop leaks no object', () => {
        const {graph} = mountGraph();
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const pre = count() - graph.ownedObjectCount();
        const owned: Record<string, number> = {};
        for (let round = 0; round < 2; round++) {
            for (const mode of WAVES_MODES) {
                choose(mode);
                expect(count() - graph.ownedObjectCount(), `${mode} round ${round}`).toBe(pre);
                if (round === 0) owned[mode] = graph.ownedObjectCount(); else expect(graph.ownedObjectCount(), mode).toBe(owned[mode]);
                graph.disposeNow();
                expect(graph.ownedObjectCount()).toBe(0);
                expect(count(), mode).toBe(pre);
                act(() => { graph.setState({}); });
                act(() => { fireEvent.change(field(t('waves_graph_mode_label')), {target: {value: mode}}); });
            }
        }
    });
});

describe('language and the derived data', () => {
    test('switching the language renames the board, the labels, the captions and the status', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${t('waves_graph_board_label')}"]`)).not.toBeNull();
        expect(screen.getByLabelText(t('waves_graph_mode_label'))).toBeTruthy();
        expect(captionTexts(graph)).toContain(t('waves_graph_cap_wave1'));
        expect(status()).toMatch(/^Time 0\.5 s\./);
        expect(readout('time')).toBe('0.5 s');
        // t = 0,5 s: wave 1 is cos(3 pi) = -1 and wave 2 is cos(3 pi + 120 deg) = 0,5.
        expect(readout('wave1')).toBe(`${MINUS}1`);
        expect(readout('wave2')).toBe('0.5');
        noBadText();
    });

    test('the derived data holds no language and is reused for the time, the switches and a language change; another frequency derives once', () => {
        const {graph} = mountGraph();
        const before = graph.derived();
        const count = graph.derivationCount();
        go(graph, 0.3);
        act(() => { fireEvent.click(field(t('waves_graph_show_phasors'))); });
        act(() => setLanguage('en'));
        expect(graph.derived()).toBe(before);
        expect(graph.derivationCount()).toBe(count);
        enter(t('waves_graph_f_both_label'), '4');
        expect(graph.derivationCount()).toBe(count + 1);
        expect(JSON.stringify(graph.derived().facts)).not.toMatch(/Hz|waves_graph/);
    });
});

describe('redraw timing (JSDOM PLACEHOLDER, not a browser measurement)', () => {
    test('a playback frame redraws the board in a bounded time; the median and the 95th percentile are logged, with the sinc cost', () => {
        const lines: string[] = [];
        const measure = (name: string, prepare: (graph: ObservedGraph) => void) => {
            const {graph, view} = mountGraph();
            prepare(graph);
            press(t('play'));
            const times: number[] = [];
            let time = 0;
            graph.frames.tick(time);
            for (let i = 0; i < 60 && graph.frames.pending(); i++) {
                time += 16;
                const start = performance.now();
                graph.frames.tick(time);
                times.push(performance.now() - start);
            }
            const sorted = [...times].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)];
            lines.push(`${name}: frames=${times.length} median=${median.toFixed(2)} ms p95=${p95.toFixed(2)} ms`);
            expect(times.length).toBeGreaterThan(30);
            expect(Number.isFinite(median) && Number.isFinite(p95)).toBe(true);
            view.unmount();
        };
        const sincStart = performance.now();
        measure('sum', () => undefined);
        measure('standing', () => choose('standing'));
        const {graph, view} = mountGraph();
        choose('sampling');
        const derive = performance.now();
        set(graph, {fs: 64, f1: 40, extra: 192, showSinc: true});
        lines.push(`sampling state change with sinc (fs 64, extra 192, derived and redrawn once): ${(performance.now() - derive).toFixed(1)} ms`);
        view.unmount();
        measure('sampling with sinc (frames only; the sinc curve is derived on the state change)', graph => { choose('sampling'); set(graph, {fs: 64, f1: 40, extra: 192, showSinc: true}); });
        lines.push(`whole test: ${(performance.now() - sincStart).toFixed(0)} ms`);
        mkdirSync('.command-logs', {recursive: true});
        writeFileSync('.command-logs/wav02b-redraw.log', `JSDOM PLACEHOLDER waves playback (browser measurement owed at F2b)\n${lines.join('\n')}\n`);
    });
});
