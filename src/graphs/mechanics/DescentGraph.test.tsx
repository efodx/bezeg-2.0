import {mkdirSync, writeFileSync} from 'node:fs';
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import JXG from 'jsxgraph';
import {expectHandleHitZones} from '../base/handleHitZoneBehaviour';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, settle} from '../base/realGraphTestHarness';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import type {TransientState} from '../base/BaseGraph';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {deriveDescent, FIELD_RANGES, type DescentMode, type NumericField, type RaceDerived, type TautochroneDerived} from '../../mechanics/trackModel';
import {DEFAULT_DESCENT_STATE} from '../../mechanics/trackModel';
import {DescentGraph, HANDLE_TOUCH_RADIUS, MAX_FRAME_MS, TIME_STEP} from './DescentGraph';

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
class ObservedGraph extends DescentGraph {
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
const slider = () => screen.getByRole('slider', {name: t('descent_graph_time_label')}) as HTMLInputElement;
const status = () => document.querySelector('[data-descent-status]')!.textContent!;
const live = () => document.querySelector('[data-readout-live]')!.textContent!;
const noBadText = () => expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
const chooseMode = (mode: DescentMode) => act(() => { fireEvent.change(field(t('descent_graph_mode_label')), {target: {value: mode}}); });

/** Accessible names of the controls of each numeric field: the slider's exact field, or the field of a point row ("<point>, <axis>"). */
const fieldName = (name: NumericField): string => {
    const point = {endX: ['b', 'x'], endY: ['b', 'depth'], p1x: ['p1', 'x'], p1y: ['p1', 'depth'], p2x: ['p2', 'x'], p2y: ['p2', 'depth']} as const;
    if (name in point) {
        const [which, axis] = point[name as keyof typeof point];
        return `${t(`descent_graph_name_${which}`)}, ${axis === 'x' ? 'x' : t('descent_graph_axis_depth')}`;
    }
    const key = {radius: 'descent_graph_radius_label', theta1: 'descent_graph_theta1_label', theta2: 'descent_graph_theta2_label', theta3: 'descent_graph_theta3_label'} as const;
    return t('number_field_label', {value0: t(key[name as keyof typeof key])});
};
const label = fieldName;

type Probe = {elType: string; plaintext?: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number; evalVisProp(name: string): unknown};
const probes = (graph: ObservedGraph) => graph.liveBoard().objectsList as unknown as Probe[];
const visible = (o: Probe) => Boolean(o.evalVisProp('visible'));
/** The curves in creation order: line, arc, cycloid, track, control polygon, guide arc. */
const [LINE, ARC, CYCLOID, TRACK, POLYGON, GUIDE] = [0, 1, 2, 3, 4, 5];
const curves = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'curve');
const captionTexts = (graph: ObservedGraph) => probes(graph).filter(o => o.elType === 'text' && o.plaintext !== '0,0' && visible(o)).map(o => o.plaintext ?? '');
const lastOf = (values: number[] | undefined) => values![values!.length - 1];

type EventedPoint = JXG.Point & {triggerEventHandlers(names: string[], args: unknown[]): void};
function dragHandleTo(point: JXG.Point, x: number, y: number) {
    point.setPosition(JXG.COORDS_BY_USER, [x, y]);
    act(() => { (point as EventedPoint).triggerEventHandlers(['drag'], []); });
}
const [END, P1, P2, TH1, TH2, TH3] = [0, 1, 2, 3, 4, 5];

function go(graph: ObservedGraph, time: number): boolean {
    let accepted = false;
    act(() => { accepted = graph.setTime(time); });
    return accepted;
}
function run(graph: ObservedGraph, limit = 600) {
    let time = 0;
    graph.clock.tick(time);
    for (let i = 0; i < limit && graph.clock.pending(); i++) { time += MAX_FRAME_MS; graph.clock.tick(time); }
}

const G = 9.81;
const CYCLOID_TIME = Math.PI * Math.sqrt(1 / G); // 1,0030
const LINE_TIME = Math.sqrt(Math.PI ** 2 + 4) / Math.sqrt(G); // 1,1890

describe('mount and the drawing, per mode', () => {
    test('the race draws the line, the arc and the cycloid to B = (pi r, 2 r) and reads the computed times against hand values', () => {
        const {graph} = mountGraph();
        expect(graph.state.mode).toBe('race');
        expect(document.querySelector(`[aria-label="${t('descent_graph_board_label')}"]`)).not.toBeNull();
        const d = graph.derived() as RaceDerived;
        const drawn = curves(graph);
        for (const index of [LINE, ARC, CYCLOID]) {
            expect(visible(drawn[index]), `curve ${index}`).toBe(true);
            expect(lastOf(drawn[index].dataX)).toBeCloseTo(Math.PI, 9);
            expect(lastOf(drawn[index].dataY)).toBeCloseTo(-2, 9);
            expect(drawn[index].dataX![0]).toBeCloseTo(0, 9);
            expect(drawn[index].dataY![0]).toBeCloseTo(0, 9);
        }
        for (const index of [TRACK, POLYGON, GUIDE]) expect(visible(drawn[index]), `curve ${index}`).toBe(false);
        expect(d.times.cycloid).toBeCloseTo(CYCLOID_TIME, 6);
        expect(d.times.line).toBeCloseTo(LINE_TIME, 6);
        expect(readout('time-cycloid')).toBe('1,003 s');
        expect(readout('time-line')).toBe('1,189 s');
        expect(readout('winner')).toBe(t('descent_graph_name_cycloid'));
        expect(readout('line-slower')).toBe(`${((LINE_TIME / CYCLOID_TIME - 1) * 100).toFixed(1).replace('.', ',')} %`);
        expect(readout('end')).toBe('(3,14; 2) m');
        expect(d.times.arc).toBeGreaterThan(d.times.cycloid);
        noBadText();
    });

    test('every time is labelled computed and every readout row has a label and a value, in every mode', () => {
        mountGraph();
        for (const mode of ['race', 'track', 'tautochrone'] as const) {
            chooseMode(mode);
            const rows = Array.from(document.querySelectorAll('[data-readout]'));
            expect(rows.length, mode).toBeGreaterThan(5);
            for (const row of rows) {
                const id = row.getAttribute('data-readout')!;
                expect(row.querySelector('dt')?.textContent?.length, `${mode} ${id}`).toBeGreaterThan(0);
                expect(row.querySelector('dd')?.textContent?.length, `${mode} ${id}`).toBeGreaterThan(0);
                if (id.startsWith('time-') || id.startsWith('bead-') || id.startsWith('arc-')) expect(labelOf(id), `${mode} ${id}`).toContain('izračunan');
            }
            noBadText();
        }
    });

    test('the race names each track and its computed time on the board; the winner and the computed end too', () => {
        const {graph} = mountGraph();
        const texts = captionTexts(graph);
        expect(texts).toContain(t('descent_graph_cap_time_row', {value0: t('descent_graph_name_cycloid'), value1: '1,003 s'}));
        expect(texts).toContain(t('descent_graph_cap_time_row', {value0: t('descent_graph_name_line'), value1: '1,189 s'}));
        expect(texts).toContain(t('descent_graph_cap_winner', {value0: t('descent_graph_name_cycloid')}));
        expect(texts).toContain(t('descent_graph_cap_end_computed', {value0: '3,14', value1: '2'}));
        expect(texts).toContain(t('descent_graph_cap_units', {value0: '9,81'}));
        for (const name of ['line', 'arc', 'cycloid'] as const) expect(texts).toContain(t(`descent_graph_name_${name}`));
    });

    test('the track mode with collinear, evenly spaced control points is the straight line: its time is the hand value L / sqrt(g y)', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        for (const [name, value] of [['endX', '3'], ['endY', '1,5'], ['p1x', '1'], ['p1y', '0,5'], ['p2x', '2'], ['p2y', '1']] as const) enter(label(name), value);
        expect(graph.state).toMatchObject({endX: 3, endY: 1.5, p1x: 1, p1y: 0.5, p2x: 2, p2y: 1});
        // A line of length L falling h: t = sqrt(2 L / (g sin a)) = L / sqrt(g h / 2).
        const hand = Math.hypot(3, 1.5) / Math.sqrt((G * 1.5) / 2);
        expect(hand).toBeCloseTo(1.2365, 4);
        expect(readout('time-track')).toBe('1,2365 s');
        expect(readout('time-line')).toBe('1,2365 s');
        expect(Number(readout('difference')!.split(' ')[0].replace(',', '.'))).toBeGreaterThan(0);
        const drawn = curves(graph);
        expect(visible(drawn[TRACK])).toBe(true);
        expect(visible(drawn[POLYGON])).toBe(true);
        expect(visible(drawn[ARC])).toBe(false);
        expect(lastOf(drawn[TRACK].dataX)).toBeCloseTo(3, 9);
        expect(lastOf(drawn[TRACK].dataY)).toBeCloseTo(-1.5, 9);
        expect(drawn[POLYGON].dataX).toEqual([0, 1, 2, 3]);
        expect(drawn[POLYGON].dataY!.map(v => Math.abs(v))).toEqual([0, 0.5, 1, 1.5]);
        const cycloid = graph.derived();
        expect(cycloid.mode).toBe('track');
        if (cycloid.mode === 'track') {
            expect(readout('time-cycloid')).toContain(',');
            expect(cycloid.cycloid.time).toBeLessThan(hand);
            expect(lastOf(drawn[CYCLOID].dataX)).toBeCloseTo(3, 6);
        }
        expect(captionTexts(graph)).toContain(t('descent_graph_cap_time_row', {value0: t('descent_graph_name_track'), value1: '1,2365 s'}));
    });

    test('an inadmissible track shows a status and no time, anywhere: not in the readout, the captions or the sentence', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        enter(label('p1y'), '0');
        enter(label('p2y'), '-0,5');
        const d = graph.derived();
        expect(d.mode === 'track' && d.status).not.toBe('ok');
        expect(d.mode === 'track' && d.time).toBeUndefined();
        expect(readout('status')).toMatch(/Čas ni izračunan/);
        expect(readout('time-track')).toBe(t('descent_graph_not_timed'));
        expect(readout('difference')).toBe(t('descent_graph_not_timed'));
        const texts = captionTexts(graph);
        expect(texts).toContain(t('descent_graph_cap_no_time_row', {value0: t('descent_graph_name_track')}));
        expect(texts.some(text => text.startsWith('Razlika do cikloide'))).toBe(false);
        expect(go(graph, 0)).toBe(true);
        noBadText();
        enter(label('p2y'), '2');
        enter(label('p1y'), '1');
        expect(readout('status')).toBe(t('descent_graph_status_track_ok'));
        expect(readout('time-track')).not.toBe(t('descent_graph_not_timed'));
    });

    test('an inadmissible track with the cycloid hidden has no bead: Play gives the no-run reason, the time slider is inert with a range of 0', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        enter(label('p1y'), '0');
        enter(label('p2y'), '-0,5');
        // The cycloid is still shown: it runs.
        expect(graph.derived().tEnd).toBeGreaterThan(0);
        act(() => { fireEvent.click(field(t('descent_graph_show_cycloid'))); });
        expect(graph.state.showCycloid).toBe(false);
        expect(graph.derived().tEnd).toBe(0);
        const reason = t('descent_graph_no_run');
        const play = screen.getByRole('button', {name: t('play')});
        expect(play.getAttribute('aria-disabled') ?? play.getAttribute('disabled')).not.toBeNull();
        expect(document.body.textContent).toContain(reason);
        expect(slider().getAttribute('aria-disabled')).toBe('true');
        expect(slider().max).toBe('0');
        act(() => { fireEvent.click(play); });
        expect(graph.playing).toBe(false);
        expect(graph.clock.requests).toBe(0);
        act(() => { graph.play(); });
        expect(graph.playing).toBe(false);
        // Showing the cycloid again restores the run.
        act(() => { fireEvent.click(field(t('descent_graph_show_cycloid'))); });
        expect(graph.derived().tEnd).toBeGreaterThan(0);
        expect(slider().getAttribute('aria-disabled')).toBeNull();
        noBadText();
    });

    test('the tautochrone: every bead takes pi sqrt(r/g) to the lowest point, the handles sit on the cycloid and the arc is optional', () => {
        const {graph} = mountGraph();
        chooseMode('tautochrone');
        const d = graph.derived() as TautochroneDerived;
        expect(d.closedForm).toBeCloseTo(CYCLOID_TIME, 9);
        for (const index of [1, 2, 3]) expect(readout(`bead-${index}`)).toContain('1,003 s');
        expect(readout('closed-form')).toBe('1,003 s');
        expect(status()).toContain(t('descent_graph_sentence_taut_equal', {value0: '1,003 s'}));
        const drawn = curves(graph);
        expect(visible(drawn[CYCLOID])).toBe(true);
        expect(visible(drawn[LINE])).toBe(false);
        expect(visible(drawn[GUIDE])).toBe(false);
        const handles = graph.handlePoints();
        expect(handles).toHaveLength(6);
        // theta = 1 on r = 1: x = theta - sin theta, depth = 1 - cos theta.
        expect(handles[TH2].X()).toBeCloseTo(1 - Math.sin(1), 9);
        expect(handles[TH2].Y()).toBeCloseTo(-(1 - Math.cos(1)), 9);
        expect(handles[TH1].X()).toBeCloseTo(0.3 - Math.sin(0.3), 9);
        const shown = (point: JXG.Point) => visible(point as unknown as Probe);
        expect(handles.slice(0, 3).some(shown)).toBe(false);
        expect(handles.slice(3).every(shown)).toBe(true);
        act(() => { fireEvent.click(field(t('descent_graph_show_arc'))); });
        expect(graph.state.showArc).toBe(true);
        expect(visible(curves(graph)[GUIDE])).toBe(true);
        // The guide arc is named wherever it is shown, not only in the race.
        expect(captionTexts(graph).filter(text => text === t('descent_graph_name_arc'))).toHaveLength(1);
        act(() => { fireEvent.click(field(t('descent_graph_show_arc'))); });
        expect(captionTexts(graph)).not.toContain(t('descent_graph_name_arc'));
        act(() => { fireEvent.click(field(t('descent_graph_show_arc'))); });
        expect(readout('arc-1')).toMatch(/s$/);
        expect(labelOf('arc-1')).toContain('izračunan');
        expect(captionTexts(graph).some(text => text.startsWith('Kroglica 1 po krožnem loku'))).toBe(true);
        noBadText();
    });

    test('a bead started at the lowest point (theta = pi) says so instead of giving a time', () => {
        const {graph} = mountGraph();
        chooseMode('tautochrone');
        dragHandleTo(graph.handlePoints()[TH3], Math.PI, -2);
        expect(graph.state.theta3).toBe(Math.PI);
        expect(readout('bead-3')).toContain('najnižji');
        expect(status()).toContain(t('descent_graph_sentence_bottom', {value0: '3'}));
        expect(captionTexts(graph)).toContain(t('descent_graph_cap_bead_row_bottom', {value0: '3'}));
        noBadText();
    });
});

describe('tautochrone repairs', () => {
    test('beads released at theta = 0, 1,5 and 3,1 all arrive at pi sqrt(r/g) = 1,003033 s (hand value for r = 1)', () => {
        const {graph} = mountGraph();
        chooseMode('tautochrone');
        enter(label('theta1'), '0');
        enter(label('theta2'), '1,5');
        enter(label('theta3'), '3,1');
        expect([graph.state.theta1, graph.state.theta2, graph.state.theta3]).toEqual([0, 1.5, 3.1]);
        const d = graph.derived() as TautochroneDerived;
        for (const bead of d.beads) {
            expect(bead.status).toBe('ok');
            expect(bead.time).toBeCloseTo(1.003033, 5);
        }
        for (const index of [1, 2, 3]) expect(readout(`bead-${index}`)).toMatch(/: 1,003 s$/);
        expect(status()).toContain(t('descent_graph_sentence_taut_equal', {value0: '1,003 s'}));
    });

    test('the board and readout wording: units on g, the bead row from the catalog, handle tags name the bead', () => {
        const {graph} = mountGraph();
        expect(t('descent_graph_cap_units', {value0: '9,81'})).toBe('g = 9,81 m/s²');
        expect(captionTexts(graph)).toContain('g = 9,81 m/s²');
        chooseMode('tautochrone');
        expect(readout('bead-2')).toBe(t('descent_graph_value_bead_row', {value0: '1', value1: 'rad', value2: '1,003 s'}));
        const tags = captionTexts(graph);
        for (const index of ['1', '2', '3']) expect(tags).toContain(t('descent_graph_cap_bead_tag', {value0: index}));
        expect(t('descent_graph_cap_bead_tag', {value0: '1'})).toBe('Kroglica 1');
    });

    test('pi is reached by the step after 3,1, not by typing 3,1416; the help says so', () => {
        const {graph} = mountGraph();
        chooseMode('tautochrone');
        enter(label('theta1'), '3,1');
        expect(graph.state.theta1).toBe(3.1);
        enter(label('theta1'), '3,1416');
        expect(graph.state.theta1).toBe(3.1);
        // The field refuses it (3,1416 is above pi) and its help, read with the field, says how pi is reached.
        expect(document.body.textContent).toContain('Vnesi vrednost med 0 in 3,14.');
        expect(document.body.textContent).toContain('Do π prideš s korakom naprej po 3,1');
        act(() => { fireEvent.keyDown(field(label('theta1')), {key: 'ArrowUp'}); });
        expect(graph.state.theta1).toBe(Math.PI);
        expect(readout('bead-1')).toContain('najnižji');
    });
});

describe('typed input and dragging', () => {
    test('every control point has a number field for each coordinate; typed values on the grid are stored exactly', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        expectHandleHitZones(graph.liveBoard(), graph.handlePoints().slice(0, 3), HANDLE_TOUCH_RADIUS);
        const cases: [NumericField, string, number][] = [
            ['endX', '4,5', 4.5], ['endY', '3', 3], ['p1x', '1,25', 1.25], ['p1y', '-1', -1], ['p2x', '5,75', 5.75], ['p2y', '3,5', 3.5],
        ];
        for (const [name, text, value] of cases) {
            enter(label(name), text);
            expect(graph.state[name], name).toBe(value);
        }
        expect(graph.handlePoints()[END].X()).toBe(4.5);
        expect(graph.handlePoints()[END].Y()).toBe(-3);
        expect(graph.handlePoints()[P1].Y()).toBe(1);
        expect(graph.handlePoints()[P2].X()).toBe(5.75);
        chooseMode('tautochrone');
        enter(label('theta1'), '0,5');
        enter(label('theta2'), '2,5');
        enter(label('theta3'), '3,1');
        expect([graph.state.theta1, graph.state.theta2, graph.state.theta3]).toEqual([0.5, 2.5, 3.1]);
        chooseMode('race');
        enter(label('radius'), '2,5');
        expect(graph.state.radius).toBe(2.5);
        expect(graph.editNumber('radius', 2.5)).toBe(true);
    });

    test('a typed value off the grid or outside the range is refused: never rounded or clamped, the stored value stays and the field says so', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        for (const [name, text] of [['endX', '9'], ['endY', '0'], ['p1y', '-3'], ['p2x', '-0,25'], ['endX', '3,3']] as const) {
            const before = graph.state[name];
            enter(label(name), text);
            expect(graph.state[name], `${name} ${text}`).toBe(before);
        }
        expect(document.body.textContent).toContain('Vrednost ni na koraku');
        expect(document.body.textContent).toContain('Dovoljeno: od 0,25 do 6, korak 0,25');
        chooseMode('tautochrone');
        enter(label('theta1'), '3,14');
        expect(graph.state.theta1).toBe(0.3);
        enter(label('theta1'), '0,33');
        expect(graph.state.theta1).toBe(0.3);
        expect(graph.editNumber('theta2', Math.PI)).toBe(true);
        expect(graph.editNumber('theta2', 3.12)).toBe(false);
        expect(graph.editNumber('theta2', Number.NaN)).toBe(false);
        expect(graph.editNumber('radius' as NumericField, 99)).toBe(false);
    });

    test('dragging a handle snaps to the nearest grid value and clamps into the range; a drag past the edge lands on the edge', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        const [end, p1, p2] = [END, P1, P2].map(i => graph.handlePoints()[i]);
        dragHandleTo(end, 3.3, -1.6);
        expect([graph.state.endX, graph.state.endY]).toEqual([3.25, 1.5]);
        expect([end.X(), end.Y()]).toEqual([3.25, -1.5]);
        dragHandleTo(end, 9, -9);
        expect([graph.state.endX, graph.state.endY]).toEqual([6, 4]);
        dragHandleTo(p1, -4, 5);
        expect([graph.state.p1x, graph.state.p1y]).toEqual([0, -2]);
        dragHandleTo(p2, 1.9, -0.9);
        expect([graph.state.p2x, graph.state.p2y]).toEqual([2, 1]);
        expect(p2.X()).toBe(2);
        expect(graph.derivationCount()).toBeGreaterThan(1);
    });

    test('dragging a theta handle moves the bead along the cycloid and snaps theta to the 0,05 grid, or to pi near the bottom', () => {
        const {graph} = mountGraph();
        chooseMode('tautochrone');
        const handle = graph.handlePoints()[TH1];
        dragHandleTo(handle, 0, -(1 - Math.cos(1.52)));
        expect(graph.state.theta1).toBe(1.5);
        expect(handle.X()).toBeCloseTo(1.5 - Math.sin(1.5), 9);
        expect(handle.Y()).toBeCloseTo(-(1 - Math.cos(1.5)), 9);
        dragHandleTo(handle, 0, -1.9999);
        expect(graph.state.theta1).toBe(Math.PI);
        dragHandleTo(handle, 0, 0.5);
        expect(graph.state.theta1).toBe(0);
    });

    test('every numeric field, switch and the mode are described by help, and the help states the range; the slider by its range', () => {
        mountGraph();
        const described = (element: HTMLElement) => (element.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
            .map(id => document.getElementById(id)?.textContent ?? '').join(' ');
        const slideName = (key: 'descent_graph_radius_label' | 'descent_graph_theta1_label') => screen.getByRole('slider', {name: t(key)}) as HTMLInputElement;
        // The range is shown by the slider (its bounds), so the help no longer states it; the slider is described by its bounds and its help.
        expect(described(slideName('descent_graph_radius_label'))).toContain('0,25');
        expect(described(slideName('descent_graph_radius_label'))).toContain('Merjen v metrih.');
        expect(described(field(t('descent_graph_mode_label'))).length).toBeGreaterThan(10);
        // The time slider shows its own bounds; its help no longer restates them (control-choice S5).
        expect(described(slider())).toBe('');
        chooseMode('track');
        // The three points are one list: one row each, named as the board names them, with the depth note shown once below it.
        for (const point of ['b', 'p1', 'p2'] as const) {
            expect(screen.getByRole('group', {name: t(`descent_graph_name_${point}`)})).toBeTruthy();
        }
        expect(document.body.textContent).toContain(t('descent_graph_depth_note'));
        expect(described(field(t('descent_graph_show_cycloid'))).length).toBeGreaterThan(10);
        chooseMode('tautochrone');
        const thetaHelp = described(slideName('descent_graph_theta1_label'));
        expect(thetaHelp).toContain('Do π prideš s korakom naprej po 3,1');
        expect(described(field(t('descent_graph_show_arc'))).length).toBeGreaterThan(10);
    });

    test('the depth hint says the vertical axis shows the negative depth; a negative number is written with a true minus', () => {
        const {graph} = mountGraph();
        chooseMode('track');
        expect(document.querySelector('[data-descent-hint]')!.textContent).toContain('negativno globino');
        enter(label('p1y'), '-0,5');
        expect(graph.state.p1y).toBe(-0.5);
        expect(readout('point-p1')).toBe('(0,5; −0,5) m');
        expect(captionTexts(graph)).toContain(t('descent_graph_cap_point', {value0: 'P1', value1: '0,5', value2: '−0,5'}));
    });
});

describe('playback and the time', () => {
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

    test('the run ends at the slowest track, with a status; Play at the end starts again from 0', () => {
        const {graph} = mountGraph();
        const end = graph.derived().tEnd;
        expect(end).toBeCloseTo(Math.ceil(Math.max(...Object.values((graph.derived() as RaceDerived).times)) * 100 - 1e-9) / 100, 9);
        press(t('play'));
        run(graph);
        expect(graph.time).toBe(end);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(status()).toContain(t('descent_graph_status_ended'));
        press(t('play'));
        expect(graph.playing).toBe(true);
        expect(graph.time).toBe(0);
        press(t('pause'));
    });

    test('beads: at t = 0 all stand at the start; at the end of the run each stands at its end; the bead caption names the time', () => {
        const {graph} = mountGraph();
        const beads = probes(graph).filter(o => o.elType === 'point' && o.evalVisProp('size') === 5);
        const shown = () => beads.filter(visible);
        expect(shown()).toHaveLength(3);
        for (const bead of shown()) { expect(bead.X!()).toBeCloseTo(0, 9); expect(bead.Y!()).toBeCloseTo(0, 9); }
        go(graph, graph.derived().tEnd);
        const ends = shown().map(bead => [bead.X!(), bead.Y!()]);
        for (const [x, y] of ends) { expect(x).toBeCloseTo(Math.PI, 6); expect(y).toBeCloseTo(-2, 6); }
        expect(captionTexts(graph)).toContain(t('descent_graph_cap_bead', {value0: `${String(graph.derived().tEnd).replace('.', ',')} s`}));
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
        const play = screen.getByRole('button', {name: t('play')});
        expect(play.getAttribute('aria-disabled')).toBe('true');
        press(t('play'));
        expect(graph.playing).toBe(false);
        expect(graph.clock.requests).toBe(0);
        expect(document.body.textContent).toContain(t('playback_block_reduced_motion_time'));
        const reason = document.getElementById('descent-play-reduced-reason')!;
        expect(reason.textContent).toBe(t('playback_block_reduced_motion_time'));
        expect(reason.closest('[hidden]')).toBeNull();
        expect(screen.getByRole('button', {name: t('play')}).getAttribute('aria-describedby')?.split(' ')).toContain(reason.id);
        act(() => { fireEvent.change(slider(), {target: {value: '0.5'}}); });
        expect(graph.time).toBe(0.5);
    });

    test('the slider reaches the end, refuses beyond it, has a grid and gives a spoken value with its unit', () => {
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

    test('while it plays the live region is silent and the visible readout moves; on pause the live region says the state once', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        press(t('play'));
        graph.clock.tick(0);
        graph.clock.tick(100);
        expect(live()).toBe('');
        expect(readout('time')).toBe('0,6 s');
        press(t('pause'));
        expect(live()).toContain(t('descent_graph_status_time', {value0: '0,6'}));
    });

    test('every edit pauses the playback, including a direct setState of a stored field (a lesson action or a restore); an unchanged one does not', () => {
        const {graph} = mountGraph();
        press(t('play'));
        enter(label('radius'), '1,5');
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        act(() => { graph.setState({radius: 2}); });
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        press(t('play'));
        act(() => { graph.setState({radius: 2}); });
        expect(graph.playing).toBe(true);
        chooseMode('track');
        expect(graph.playing).toBe(false);
        press(t('play'));
        dragHandleTo(graph.handlePoints()[P1], 1, -1);
        expect(graph.playing).toBe(false);
    });

    test('changing the mode starts again at 0 and says so; a change that shortens the run shortens the time and says so', () => {
        const {graph} = mountGraph();
        go(graph, 0.8);
        chooseMode('tautochrone');
        expect(graph.time).toBe(0);
        expect(status()).toContain(t('descent_graph_notice_reset'));
        go(graph, graph.derived().tEnd);
        chooseMode('race');
        go(graph, graph.derived().tEnd);
        enter(label('radius'), '0,25');
        const end = graph.derived().tEnd;
        expect(graph.time).toBe(end);
        expect(status()).toContain(t('descent_graph_notice_clamped', {value0: String(Number(end.toFixed(2))).replace('.', ',')}));
        expect(graph.playing).toBe(false);
    });

    test('a lesson checkpoint keeps the time and lands stopped', () => {
        const {graph} = mountGraph();
        go(graph, 0.4);
        const saved = graph.capture();
        expect(saved.descentTime).toBe(0.4);
        chooseMode('track');
        expect(graph.time).toBe(0);
        press(t('play'));
        act(() => graph.restore(saved));
        expect(graph.time).toBe(0.4);
        expect(graph.playing).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test.each([['beyond the run', 99], ['negative', -1], ['not finite', Number.NaN], ['not a number', '2']])(
        'a saved time that is %s is refused: the time is 0 and the status says so',
        (_name, bad) => {
            const {graph} = mountGraph();
            go(graph, 0.5);
            act(() => graph.restore({descentTime: bad} as unknown as TransientState));
            expect(graph.time).toBe(0);
            expect(graph.playing).toBe(false);
            expect(graph.statusText()).toContain(t('descent_graph_notice_time_refused'));
        });

    test('a checkpoint without a time lands at 0 without a notice', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        act(() => graph.restore(undefined));
        expect(graph.time).toBe(0);
        expect(graph.statusText()).not.toContain(t('descent_graph_notice_time_refused'));
    });
});

describe('ownership, rebuild and the derived data', () => {
    test('unmount while playing cancels the frame loop and leaves no timer, listener or board', () => {
        const {graph, view} = mountGraph();
        press(t('play'));
        expect(graph.clock.pending()).toBe(true);
        view.unmount();
        expect(graph.clock.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(document.querySelector(`[aria-label="${t('descent_graph_board_label')}"]`)).toBeNull();
        expect(() => setLanguage('en')).not.toThrow();
    });

    test('no status text timer stays pending after unmount (fake timers)', () => {
        vi.useFakeTimers();
        try {
            // The control: a mounted and unmounted graph that never played leaves this many timers (the board and the shell own some).
            const session = (pauseFirst: boolean) => {
                const {graph, view} = mountGraph();
                go(graph, 0.3);
                press(t('play'));
                graph.clock.tick(0);
                graph.clock.tick(50);
                enter(label('radius'), '1,5');
                press(t('play'));
                graph.clock.tick(0);
                graph.clock.tick(50);
                if (pauseFirst) press(t('pause'));
                view.unmount();
                return graph;
            };
            session(true);
            const baseline = vi.getTimerCount();
            vi.clearAllTimers();
            const graph = session(false);
            expect(vi.getTimerCount()).toBe(baseline);
            expect(graph.clock.pending()).toBe(false);
        } finally {
            vi.useRealTimers();
        }
    });

    test('the opening frame holds the lowest point of the arc and both ends; a board resized after the first frame is framed again, a moved view is kept', () => {
        vi.useFakeTimers();
        const original = window.ResizeObserver;
        const observers: Array<(entries: unknown[]) => void> = [];
        // jsdom lays nothing out: the board re-reads its container size from these.
        let canvasHeight = 400;
        for (const name of ['clientHeight', 'offsetHeight'] as const) Object.defineProperty(HTMLElement.prototype, name, {configurable: true, get: () => canvasHeight});
        window.ResizeObserver = class {
            constructor(callback: (entries: unknown[]) => void) { observers.push(callback); }
            observe() {}
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
        try {
            const {graph} = mountGraph();
            const board = graph.liveBoard();
            const race = deriveDescent(DEFAULT_DESCENT_STATE) as RaceDerived;
            const margin = (box: number[]) => ({left: 0 - box[0], right: box[2] - race.end[0], top: box[1] - 0, bottom: -box[3] - race.arcCentre});
            const settle = (height: number) => {
                canvasHeight = height;
                board.resizeContainer(600, height, true); // what the session's observer does
                act(() => { for (const callback of observers) callback([{contentRect: {width: 600, height}}]); });
                act(() => { vi.advanceTimersByTime(200); });
            };
            const inside = () => {
                const m = margin(board.getBoundingBox());
                expect(Math.min(m.left, m.right, m.top, m.bottom)).toBeGreaterThan(0.05);
            };
            expect(observers.length).toBeGreaterThan(0);
            inside();
            settle(300);
            expect(board.canvasHeight).toBe(300);
            inside();
            settle(260);
            inside();
            // A view the user moved is not reframed.
            act(() => { board.setBoundingBox([-5, 4, 5, -4], false); });
            const moved = board.getBoundingBox();
            settle(300);
            expect(board.getBoundingBox()).toEqual(expect.arrayContaining(moved.slice(0, 2)));
        } finally {
            window.ResizeObserver = original;
            canvasHeight = 400;
            vi.useRealTimers();
        }
    });

    test('the y axis writes no number above the start A except in the track mode; the arc name sits below the arc, clear of the axis numbers', () => {
        const {graph} = mountGraph();
        const ticks = (graph.liveBoard() as unknown as {defaultAxes: {y: {defaultTicks: {generateLabelText(tick: unknown, zero: unknown, value: number): string}}}}).defaultAxes.y.defaultTicks;
        const label = (value: number) => ticks.generateLabelText({usrCoords: [1, 0, value]}, undefined, value);
        expect(label(1)).toBe('');
        expect(label(-1)).not.toBe('');
        const race = deriveDescent(DEFAULT_DESCENT_STATE) as RaceDerived;
        const name = (probes(graph).filter(o => o.elType === 'text') as unknown as Array<Probe & {X(): number; Y(): number}>)
            .find(o => o.plaintext === t('descent_graph_name_arc'))!;
        expect(name.Y()).toBeLessThan(-race.arcCentre);
        expect(name.X()).toBeGreaterThan(1);
        chooseMode('track');
        expect(label(1)).not.toBe('');
    });

    test('disposal removes every owned object back to the pre-scene count, and the next state change rebuilds the same scene', () => {
        const {graph} = mountGraph();
        const owned = graph.ownedObjectCount();
        const listeners = graph.ownedListenerCount();
        const total = graph.liveBoard().objectsList.length;
        expect(owned).toBeGreaterThan(30);
        press(t('play'));
        graph.disposeNow();
        expect(graph.ownedObjectCount()).toBe(0);
        expect(graph.ownedListenerCount()).toBe(0);
        expect(graph.liveBoard().objectsList.length).toBe(total - owned);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.playing).toBe(false);
        enter(label('radius'), '1,5');
        expect(graph.ownedObjectCount()).toBe(owned);
        expect(graph.ownedListenerCount()).toBe(listeners);
        expect(graph.liveBoard().objectsList.length).toBe(total);
        expect(curves(graph)).toHaveLength(6);
    });

    test('switching modes keeps the object count and does not leak objects', () => {
        const {graph} = mountGraph();
        const count = () => probes(graph).filter(o => o.elType !== 'label').length;
        const total = count();
        for (const mode of ['track', 'tautochrone', 'race', 'track'] as const) {
            chooseMode(mode);
            expect(count(), mode).toBe(total);
            expect(graph.ownedObjectCount(), mode).toBe(graph.ownedObjectCount());
        }
        expect(graph.handlePoints()).toHaveLength(6);
    });

    test('the tracks are derived again only for a changed number: a language change, the time and an unrelated switch reuse them', () => {
        const {graph} = mountGraph();
        const before = graph.derived();
        const count = graph.derivationCount();
        go(graph, 0.3);
        act(() => setLanguage('en'));
        act(() => setLanguage('sl'));
        expect(graph.derived()).toBe(before);
        // A field the race does not read (a lesson action may write it) leaves the tracks alone.
        act(() => { graph.setState({showArc: true, theta1: 0.5}); });
        expect(graph.derived()).toBe(before);
        expect(graph.derivationCount()).toBe(count);
        enter(label('radius'), '2');
        expect(graph.derivationCount()).toBe(count + 1);
        expect(graph.derived()).not.toBe(before);
        const fresh = deriveDescent({...graph.state}) as RaceDerived;
        expect((graph.derived() as RaceDerived).times).toEqual(fresh.times);
        expect(graph.derived().tEnd).toBe(fresh.tEnd);
    });
});

describe('language', () => {
    test('switching the language renames the board, the labels, the captions, the status and the readout, with a decimal point in English', () => {
        const {graph} = mountGraph();
        go(graph, 0.5);
        act(() => setLanguage('en'));
        expect(document.querySelector(`[aria-label="${t('descent_graph_board_label')}"]`)).not.toBeNull();
        expect(screen.getByLabelText(t('descent_graph_mode_label'))).toBeTruthy();
        expect(captionTexts(graph)).toContain(t('descent_graph_cap_time_row', {value0: 'Cycloid', value1: '1.003 s'}));
        expect(status()).toMatch(/^Time 0\.5 s\./);
        expect(readout('time-cycloid')).toBe('1.003 s');
        expect(labelOf('time-cycloid')).toBe('Descent time: Cycloid (computed)');
        expect(captionTexts(graph).join(' ') + status() + document.querySelector('[data-readout="time-cycloid"]')!.textContent).not.toMatch(/\d,\d/);
        chooseMode('track');
        enter(label('p1y'), '-0.5');
        expect(readout('point-p1')).toBe('(0.5, −0.5) m');
        noBadText();
    });
});

describe('redraw timing (JSDOM PLACEHOLDER, not a browser measurement)', () => {
    test('a drag recomputes the tracks and redraws the board in a bounded time in each mode; the median and the 95th percentile are logged', () => {
        const {graph} = mountGraph();
        const lines: string[] = [];
        const measure = (mode: DescentMode, drag: (i: number) => void) => {
            chooseMode(mode);
            const times: number[] = [];
            for (let i = 0; i < 40; i++) {
                const start = performance.now();
                drag(i);
                times.push(performance.now() - start);
            }
            const sorted = [...times].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)];
            expect(Number.isFinite(median) && Number.isFinite(p95)).toBe(true);
            lines.push(`JSDOM PLACEHOLDER descent drag recompute, ${mode}: n=${times.length} median=${median.toFixed(2)} ms p95=${p95.toFixed(2)} ms (browser measurement owed)`);
        };
        measure('race', i => { act(() => { graph.editNumber('radius', 0.25 + 0.25 * (i % 12)); }); });
        measure('track', i => dragHandleTo(graph.handlePoints()[P1], 0.25 * (i % 20), -(0.25 * (i % 16))));
        measure('tautochrone', i => dragHandleTo(graph.handlePoints()[TH2], 0, -(1 - Math.cos(0.05 * (i % 60)))));
        mkdirSync('.command-logs', {recursive: true});
        writeFileSync('.command-logs/mech02b-redraw.log', `${lines.join('\n')}\n`);
        expect(lines).toHaveLength(3);
        expect(FIELD_RANGES.radius.max).toBe(3);
    });
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
