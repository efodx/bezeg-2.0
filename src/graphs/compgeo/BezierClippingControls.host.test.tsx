import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BezierClippingGraph, BEZIER_CLIPPING_STEP_INTERVAL_MS} from './BezierClippingGraph';
import {CURVE_PAIR_CROSSING} from './CurvePairGraph';
import {BEZIER_CLIPPING_PRESET_KEY} from './bezierClippingPresetCollection';
import {clipDistancePaths} from './ClipDistancePlot';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {LessonAction} from '../../learning/model';
import {PointSetModel} from '../../compgeo/pointSetModel';
import {setLanguage} from '../../localization';

const insetRenders = vi.hoisted(() => ({count: 0}));
vi.mock('./ClipDistancePlot', async importOriginal => {
    const original = await importOriginal<typeof import('./ClipDistancePlot')>();
    const Counted = (props: Parameters<typeof original.ClipDistancePlot>[0]) => {
        insetRenders.count += 1;
        return original.ClipDistancePlot(props);
    };
    return {...original, ClipDistancePlot: Counted};
});

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, callbacks, frame};
}

class Observed extends BezierClippingGraph {
    liveBoard() { return this.board; }
    run1(action: LessonAction) { this.applyLessonAction(action); }
}

interface Shown {name?: string; moveTo?(to: number[], t: number): void; triggerEventHandlers?(names: string[], args: unknown[]): void}
const drag = (graph: Observed, name: string, to: [number, number]) => {
    const point = (graph.liveBoard().objectsList as unknown as Shown[]).find(o => o.name === name)!;
    act(() => { point.moveTo!(to, 0); point.triggerEventHandlers!(['drag'], []); });
};
const model = (points: Array<[number, number]>, gridStepExponent = 0): PointSetModel =>
    ({mode: 'points', closed: false, gridStepExponent, points: points.map(([x, y]) => ({x, y}))});
const OFFSET = model([[0, 0], [4, 8], [8, 0], [0, 9], [4, 1], [8, 9]], -1);
const FAR = model([[0, 0], [2, 4], [4, 0], [0, 10], [2, 14], [4, 10]]);
const TANGENT = model([[0, 0], [2, 4], [4, 0], [0, 4], [2, 0], [4, 4]]);
const presetState = (fields: object) => ({initialized: true, overlays: {control: true, hull: true, fatLine: true, kept: true, discarded: true}, ...fields});
const crossing = () => ({id: BEZIER_CLIPPING_PRESET_KEY, data: CURVE_PAIR_CROSSING});

function setup() {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, frames, view};
}
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
const click = (action: string) => act(() => { fireEvent.click(document.querySelector(`button[data-action="${action}"]`)!); });
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`)!;
const toEnd = (graph: Observed) => { while (graph.step < graph.run().length - 1) click('next-step'); };
const select = () => document.querySelector<HTMLSelectElement>('select[data-bezier-clipping="tolerance"]')!;
const pick = (value: number) => act(() => { fireEvent.change(select(), {target: {value: String(value)}}); });
const text = (name: string) => document.querySelector(`[data-bezier-clipping="${name}"]`)?.textContent ?? null;
/** The caption span that is not hidden. */
const caption = () => [...document.querySelectorAll('[data-bezier-clipping="inset-caption"] span')].filter(s => !(s as HTMLElement).hidden).map(s => s.textContent);
const live = () => document.querySelector('[data-bezier-clipping-live]')!;
const rows = () => [...document.querySelectorAll('[data-bezier-clipping="row"]')].map(r => r.textContent);
const insetPaths = () => {
    const get = (name: string) => document.querySelector(`[data-bezier-clipping="inset-${name}"]`)!.getAttribute('d');
    return {points: get('points'), hull: get('hull'), band: get('band'), bandEdges: get('band-edges'), zero: get('zero'), clipped: get('clipped'), clippedEnds: get('clipped-ends')};
};
const EMPTY_PATHS = {points: '', hull: '', band: '', bandEdges: '', zero: '', clipped: '', clippedEnds: ''};
/** The path data the graph's current view must have; a missing view is a failure, not an empty match. */
const viewPaths = (graph: Observed) => {
    const view = graph.stepView;
    if (!view) throw new Error('the graph shows no view');
    return clipDistancePaths(view);
};

test('the tolerance select has eight labelled options, a spoken alternative, and changes the graph and returns to step 0', () => {
    const {graph} = setup();
    expect(document.querySelector('label')!.textContent).toContain('Toleranca');
    const options = [...select().options];
    expect(options.map(o => o.value)).toEqual(['3', '4', '5', '6', '7', '8', '9', '10']);
    expect(options.map(o => o.textContent)).toEqual(['10⁻³', '10⁻⁴', '10⁻⁵', '10⁻⁶', '10⁻⁷', '10⁻⁸', '10⁻⁹', '10⁻¹⁰']);
    expect(options[3].getAttribute('aria-label')).toBe('10 na minus 6');
    expect(select().value).toBe('6');
    click('next-step');
    click('next-step');
    click('play-pause');
    expect(graph.isPlaying).toBe(true);
    pick(4);
    expect(graph.clipToleranceExponent).toBe(4);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(select().value).toBe('4');
    expect(text('step')).toBe(`Korak 1 od ${graph.run().length}`);
});

test('the select and the graph agree after Reset, a Preset restore, a lesson action and a language switch', () => {
    const {graph} = setup();
    pick(8);
    click('next-step');
    click('reset');
    expect([select().value, graph.clipToleranceExponent]).toEqual(['8', 8]);
    act(() => { graph.importPreset({...crossing(), graphState: presetState({step: 2, clipToleranceExponent: 5})}); });
    expect([select().value, graph.clipToleranceExponent]).toEqual(['5', 5]);
    act(() => { graph.importPreset(crossing()); });
    expect([select().value, graph.clipToleranceExponent]).toEqual(['6', 6]);
    act(() => { graph.run1({kind: 'point-set', operation: 'set-clip-tolerance', exponent: 9}); });
    expect([select().value, graph.clipToleranceExponent]).toEqual(['9', 9]);
    act(() => { setLanguage('en'); });
    expect(document.querySelector('label')!.textContent).toContain('Tolerance');
    expect(select().value).toBe('9');
    expect(select().options[3].getAttribute('aria-label')).toBe('10 to the minus 6');
    expect(button('next-step').textContent).toBe('Next step');
});

test('the buttons stay focusable and aria-disabled at the ends, and the status region is silent during Play', () => {
    const {graph, frames} = setup();
    expect(button('reset').getAttribute('aria-disabled')).toBe('true');
    expect(button('next-step').getAttribute('aria-disabled')).toBe('false');
    expect(live().textContent).toContain('Korak 1 od');
    act(() => { graph.play(); });
    act(() => { frames.frame(0); });
    act(() => { frames.frame(BEZIER_CLIPPING_STEP_INTERVAL_MS); });
    expect(graph.isPlaying).toBe(true);
    expect(live().getAttribute('role')).toBe('status');
    expect(live().textContent).toBe('');
    act(() => { graph.pause(); });
    expect(live().textContent).toContain(`Korak ${graph.step + 1} od`);
    toEnd(graph);
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
    expect(button('reset').getAttribute('aria-disabled')).toBe('false');
    expect(live().textContent).toContain('Najdeno');
});

test('the status, the clip count and the widest width follow the run, with a decimal comma in Slovenian', () => {
    const {graph} = setup();
    expect(text('status')).toMatch(/^Konveksni ovojnici kontrolnih točk se prekrivata\./);
    expect(text('status')).toContain('potreben pogoj');
    expect(text('status')).not.toMatch(/sekata se|presečišče obstaja/);
    expect(text('clips')).toBe('Število rezov: 0');
    expect(text('widest')).toBe('Najširši živ obseg: 1');
    click('next-step');
    click('next-step');
    click('next-step');
    expect(text('status')).toContain('Rezanje poteka');
    while (text('widest') === 'Najširši živ obseg: 1') click('next-step');
    expect(text('widest')).toMatch(/^Najširši živ obseg: 0,\d+$/);
    toEnd(graph);
    expect(text('status')).toContain('Najdeno');
    expect(text('widest')).toBeNull();
    expect(rows()).toHaveLength(2);
    expect(rows()[0]).toMatch(/^Rezultat0,2\d* – 0,2\d*0,7\d* – 0,7\d*$|^Rezultat0,2\d* – 0,25/);
    act(() => { setLanguage('en'); });
    expect(text('status')).toContain('Found');
    expect(rows()[0]).toMatch(/^Result0\.2/);
    act(() => { setLanguage('sl'); });
    load(graph, OFFSET);
    expect(text('status')).toContain('prekrivata');
    toEnd(graph);
    expect(text('status')).toContain('Prazno');
    expect(rows()).toHaveLength(0);
    load(graph, FAR);
    expect(text('status')).toContain('ločeni');
    expect(text('status')).not.toContain('prekrivata');
});

test('the table never shows more than eight rows plus one "further n" row, along the whole tangent run at 10^-10', () => {
    const {graph} = setup();
    load(graph, TANGENT);
    pick(10);
    const total = () => graph.clipState.results.length + graph.clipState.active.length + graph.clipState.unresolved.length;
    let widest = 0;
    for (let guard = 0; guard < 10000; guard += 1) {
        const shown = rows().length;
        widest = Math.max(widest, total());
        expect(shown).toBeLessThanOrEqual(8);
        const further = text('further');
        expect(further === null ? 0 : Number(/\d+/.exec(further)![0])).toBe(Math.max(0, total() - 8));
        expect(shown + (further === null ? 0 : Number(/\d+/.exec(further)![0]))).toBe(total());
        if (graph.step >= graph.run().length - 1) break;
        click('next-step');
    }
    expect(graph.step).toBe(graph.run().length - 1);
    expect(widest).toBeGreaterThan(8);
});

test('the inset follows a step, a drag and a tolerance change as path data, is empty at the end, and a drag renders no inset React', () => {
    const {graph} = setup();
    expect(insetPaths()).toEqual(viewPaths(graph));
    expect(insetPaths().hull).not.toBe('');
    click('next-step');
    click('next-step');
    click('next-step');
    const atStep3 = insetPaths();
    expect(atStep3).toEqual(viewPaths(graph));
    expect(atStep3.clipped).not.toBe('');
    expect(caption()).toEqual(['Razdalja B do debele premice A']);

    const hull = document.querySelector('[data-bezier-clipping="inset-hull"]');
    const before = insetRenders.count;
    expect(before).toBeGreaterThan(0);
    drag(graph, 'A_1', [2, 6]);
    expect(graph.model.points[1]).toEqual({x: 2, y: 6});
    expect(graph.step).toBe(0);
    expect(insetPaths()).toEqual(viewPaths(graph));
    expect(insetPaths()).not.toEqual(atStep3);
    expect(insetRenders.count).toBe(before);
    click('next-step');
    click('next-step');
    click('next-step');
    expect(insetRenders.count).toBe(before);
    expect(document.querySelector('[data-bezier-clipping="inset-hull"]')).toBe(hull);

    const beforeTolerance = insetPaths();
    pick(4);
    expect(graph.step).toBe(0);
    expect(insetPaths()).toEqual(viewPaths(graph));
    expect(insetPaths()).not.toEqual(beforeTolerance);

    toEnd(graph);
    expect(graph.stepView).toBeNull();
    expect(insetPaths()).toEqual(EMPTY_PATHS);
    expect(caption()).toEqual(['Razdalja do debele premice: ni reza za prikaz']);
    expect(document.querySelector('[data-bezier-clipping="inset-svg"]')).not.toBeNull();
    click('reset');
    expect(insetPaths()).toEqual(viewPaths(graph));
});
