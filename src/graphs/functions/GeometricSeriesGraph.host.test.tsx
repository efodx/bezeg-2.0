import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GeometricSeriesGraph, SERIES_STEP_INTERVAL_MS} from './GeometricSeriesGraph';
import {GraphHost} from '../base/GraphHost';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {renderMessage, setLanguage} from '../../localization';
import {functionPresetCollections} from './functionPresetCollections';
import {GraphPalette} from '../styles/GraphPalette';
import {SERIES_TERMS_MAX, seriesView} from '../../analysis/geometricSeriesModel';
import {enterNumber} from '../../inputs/testEntry';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

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

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedSeriesGraph extends GeometricSeriesGraph {
    liveBoard() { return this.board; }
    modelNow() { return this.model; }
    playing() { return this['controller'].isPlaying(); }
    ownedObjects() { return this.generatedObjectCount; }
    objects(): BoardObject[] { return this.board.objectsList as BoardObject[]; }
    editQ(value: number) { this.setQ(value); }
    editA(value: number) { this.setA(value); }
    editTolerance(value: number) { this.setTolerance(value); }
}

/** The few JSXGraph object fields the tests read. */
interface BoardObject {
    elType: string;
    plaintext?: string;
    visProp: { strokecolor?: string; visible?: () => boolean };
    point2?: { Y(): number };
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-series-status]')].map(element => element.getAttribute('data-series-status'));
const boardObjects = (graph: ObservedSeriesGraph) => graph.liveBoard().objectsList.length;
const play = () => act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;

/** The visible board segments in the limit marker colour (the marker is the only one). */
const visibleLimitLines = (graph: ObservedSeriesGraph) => graph.objects().filter(object =>
    object.elType === 'segment' && object.visProp.strokecolor === GraphPalette.comparisonCurve && object.visProp.visible?.()).length;

function mountGraph(scheduler?: AnimationScheduler, strict = false) {
    const graph = new ObservedSeriesGraph(scheduler);
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
    return {graph, view};
}

test('starts stopped on the default example; Next step reveals S_1..S_5 = 1, 1.5, 1.75, 1.875, 1.9375 with limit 2', () => {
    const frames = manualScheduler();
    const {graph} = mountGraph(frames.scheduler);
    expect(graph.state.initialized).toBe(true);
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('terms')).toBe('1');
    expect(readout('limit')).toBe('2');
    const sums: (string | null | undefined)[] = [readout('sum')];
    for (let i = 0; i < 4; i++) {
        act(() => { fireEvent.click(nextButton()); });
        sums.push(readout('sum'));
    }
    expect(sums).toEqual(['1', '1,5', '1,75', '1,875', '1,9375']);
    expect(readout('error')).toBe('0,0625');
    expect(statusIds()).toEqual(['convergent']);
});

test('playback runs at the step interval, stops at the term cap with the cap text, and never starts by itself', () => {
    const frames = manualScheduler();
    const {graph} = mountGraph(frames.scheduler);
    play();
    expect(graph.playing()).toBe(true);
    act(() => { frames.frame(0); frames.frame(SERIES_STEP_INTERVAL_MS); });
    expect(readout('terms')).toBe('2');
    for (let guard = 0; guard < 200 && graph.playing(); guard++) act(() => { frames.frame(SERIES_STEP_INTERVAL_MS); });
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().terms).toBe(SERIES_TERMS_MAX);
    expect(statusIds()).toEqual(['convergent', 'complete']);
    expect(document.body.textContent).toContain('Prikazanih je vseh 50 členov');
    expect(frames.callbacks.size).toBe(0);
    expect((screen.getByRole('button', {name: 'Predvajaj'}) as HTMLButtonElement).getAttribute('aria-disabled')).toBe('true');
});

test('Reset pauses and never starts playback; an edit while playing pauses', () => {
    const frames = manualScheduler();
    const {graph} = mountGraph(frames.scheduler);
    for (let i = 0; i < 5; i++) act(() => { fireEvent.click(nextButton()); });
    play();
    expect(graph.playing()).toBe(true);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi'})); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.modelNow().terms).toBe(1);
    play();
    act(() => { enterNumber(screen.getByLabelText('Pas odstopanja (0 = izklopljen)'), '0.05'); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    play();
    act(() => { graph.editQ(-1); });
    expect(graph.playing()).toBe(false);
    play();
    act(() => { enterNumber(screen.getByLabelText('Prikazani členi n'), '7'); });
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().terms).toBe(7);
});

test('Preset import and a replaced scene pause playback and never start it', () => {
    const frames = manualScheduler();
    const {graph} = mountGraph(frames.scheduler);
    play();
    expect(graph.playing()).toBe(true);
    act(() => { graph.importPresetData({a: 0.3, q: 0.1, terms: 9, tolerance: 0}); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.modelNow()).toEqual({a: 0.3, q: 0.1, terms: 9, tolerance: 0});
    expect(readout('terms')).toBe('9');
    // a Preset opened while playing: paused, at the stored step, not playing afterwards
    play();
    act(() => { graph.importPreset({id: 'p', data: {a: 1, q: 0.5, terms: 3, tolerance: 0}}); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(readout('terms')).toBe('3');
    expect(frames.frame(SERIES_STEP_INTERVAL_MS)).toBe(false);
    expect(graph.modelNow().terms).toBe(3);
});

test('the limit marker is drawn only for |q| < 1; q = -1 oscillates; q = 1 gives S_n = n a', () => {
    const {graph} = mountGraph();
    const limitReadout = (q: number) => { act(() => { graph.editQ(q); }); return readout('limit'); };
    expect(visibleLimitLines(graph)).toBe(1);
    expect(limitReadout(1)).toBe('limite ni');
    expect(visibleLimitLines(graph)).toBe(0);
    expect(statusIds()).toEqual(['constant']);
    act(() => { enterNumber(screen.getByLabelText('Prikazani členi n'), '10'); });
    expect(readout('sum')).toBe('10');
    expect(limitReadout(-1)).toBe('limite ni');
    expect(visibleLimitLines(graph)).toBe(0);
    expect(statusIds()).toEqual(['oscillating']);
    expect(readout('sum')).toBe('0');
    act(() => { enterNumber(screen.getByLabelText('Prikazani členi n'), '9'); });
    expect(readout('sum')).toBe('1');
    expect(limitReadout(1.5)).toBe('limite ni');
    expect(visibleLimitLines(graph)).toBe(0);
    expect(statusIds()).toEqual(['divergent']);
    expect(limitReadout(-2)).toBe('limite ni');
    expect(visibleLimitLines(graph)).toBe(0);
    expect(limitReadout(0.5)).toBe('2');
    expect(visibleLimitLines(graph)).toBe(1);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('the q slider itself: -1 oscillates and 1 is constant, both without a limit marker', () => {
    const {graph} = mountGraph();
    const slider = () => screen.getByLabelText('Količnik q') as HTMLInputElement;
    expect(slider().type).toBe('range');
    act(() => { enterNumber(slider(), '-1'); });
    expect(graph.modelNow().q).toBe(-1);
    expect(statusIds()).toEqual(['oscillating']);
    expect(visibleLimitLines(graph)).toBe(0);
    act(() => { enterNumber(slider(), '1'); });
    expect(graph.modelNow().q).toBe(1);
    expect(statusIds()).toEqual(['constant']);
    expect(visibleLimitLines(graph)).toBe(0);
});

test('an accumulated slider value -0.9999999999999991 is stored as -1: oscillating, no limit', () => {
    const {graph} = mountGraph();
    act(() => { graph.editQ(-0.9999999999999991); });
    expect(graph.modelNow().q).toBe(-1);
    expect(statusIds()).toEqual(['oscillating']);
    expect(readout('limit')).toBe('limite ni');
    expect(visibleLimitLines(graph)).toBe(0);
});

test('the tolerance band names the first n within it; invalid values are refused with a hint and nothing changes', () => {
    const {graph} = mountGraph();
    act(() => { graph.editTolerance(0.01); });
    expect(readout('first-within')).toBe('8');
    expect(statusIds()).toEqual(['convergent', 'tolerance']);
    const q = screen.getByLabelText('Količnik q, vrednost') as HTMLInputElement;
    act(() => { enterNumber(q, '3'); });
    expect(graph.modelNow().q).toBe(0.5);
    expect(() => graph.editQ(3)).toThrow();
    expect(() => graph.editA(Number.NaN)).toThrow();
    expect(() => graph.editTolerance(-1)).toThrow();
    expect(graph.modelNow()).toMatchObject({a: 1, q: 0.5, tolerance: 0.01});
});

test('the example select loads each example and shows the illustration note', () => {
    const {graph} = mountGraph();
    const select = screen.getByLabelText('Primer vrste') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'repeating-nine'}}); });
    expect(graph.modelNow()).toEqual({a: 0.9, q: 0.1, terms: 1, tolerance: 0});
    expect(readout('limit')).toBe('1');
    act(() => { fireEvent.change(select, {target: {value: 'alternating'}}); });
    expect(readout('limit')).toBe('0,6667');
    expect(document.body.textContent).toContain('Končna slika konvergenco le ponazori');
});

test('disposal: unmount clears the owned objects and the timer; StrictMode remount keeps playback working', () => {
    const frames = manualScheduler();
    const {graph, view} = mountGraph(frames.scheduler, true);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    play();
    act(() => { frames.frame(0); frames.frame(SERIES_STEP_INTERVAL_MS); });
    expect(graph.modelNow().terms).toBe(2);
    act(() => { fireEvent.change(screen.getByLabelText('Primer vrste'), {target: {value: 'divergent'}}); });
    expect(boardObjects(graph)).toBe(baseline);
    play();
    expect(graph.playing()).toBe(true);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.playing()).toBe(false);
    expect(frames.frame(SERIES_STEP_INTERVAL_MS)).toBe(false);
});

test('a live language switch re-evaluates the board texts and readouts', () => {
    const {graph} = mountGraph();
    const boardText = () => graph.objects().filter(object => object.elType === 'text').map(text => String(text.plaintext)).join('|');
    expect(boardText()).toContain('limita a/(1 − q) = 2');
    act(() => { setLanguage('en'); });
    expect(boardText()).toContain('limit a/(1 − q) = 2');
    expect(boardText()).not.toContain('limita');
    expect(screen.getByLabelText('Ratio q')).toBeInTheDocument();
    act(() => { setLanguage('sl'); });
});

describe('Preset collection', () => {
    const collection = functionPresetCollections['geometric-series'];
    const reasons = (data: unknown) => {
        const check = collection.check(data);
        return 'rejection' in check ? renderMessage(check.rejection) : 'ok';
    };

    test('accepts valid data including q = -1 and q = 1, rejects out-of-range and non-finite values with an actionable error', () => {
        expect(reasons({a: 1, q: -1, terms: 3, tolerance: 0})).toBe('ok');
        expect(reasons({a: 1, q: 1, terms: 50, tolerance: 1})).toBe('ok');
        expect(reasons({a: 1, q: 2.5, terms: 3, tolerance: 0})).toContain('polje q');
        expect(reasons({a: Number.NaN, q: 0.5, terms: 3, tolerance: 0})).toContain('polje a');
        expect(reasons({a: Infinity, q: 0.5, terms: 3, tolerance: 0})).toContain('popravi vrednost v datoteki');
        expect(reasons({a: 1, q: 0.5, terms: 51, tolerance: 0})).toContain('polje terms');
        expect(reasons({a: 1, q: 0.5, terms: 1.5, tolerance: 0})).toContain('polje terms');
        expect(reasons({a: 1, q: 0.5, terms: 3, tolerance: -0.5})).toContain('polje tolerance');
    });

    test('a non-object, a missing field and a string-typed number name the field or the object to fix', () => {
        const valid = {a: 1, q: 0.5, terms: 3, tolerance: 0};
        expect(reasons('nonsense')).toContain('objekt s polji a, q, terms in tolerance');
        expect(reasons(null)).toContain('objekt s polji');
        expect(reasons({a: 1})).toContain('polje q mora biti število');
        expect(reasons({...valid, a: undefined})).toContain('polje a mora biti število');
        expect(reasons({...valid, q: '0.5'})).toContain('polje q mora biti število');
        expect(reasons({...valid, terms: '3'})).toContain('polje terms mora biti celo število');
        expect(reasons({...valid, tolerance: '0'})).toContain('polje tolerance mora biti število');
        expect(reasons({...valid, tolerance: undefined})).toContain('polje tolerance');
        act(() => { setLanguage('en'); });
        expect(reasons({...valid, q: '0.5'})).toContain('the field q must be a number between');
        expect(reasons([1])).toContain('must be stored as an object with the fields a, q, terms and tolerance');
        act(() => { setLanguage('sl'); });
    });
});

/** The visible partial-sum bars (primary curve colour), in index order; the last one is S_n of the revealed terms. */
const sumBars = (graph: ObservedSeriesGraph) => graph.objects().filter(object =>
    object.elType === 'segment' && object.visProp.strokecolor === GraphPalette.primaryCurve && object.visProp.visible?.());
const readoutNumber = (id: string) => Number(String(readout(id)).replace(/[\s.]/g, '').replace('−', '-').replace(',', '.'));

test('the last plotted partial-sum bar is the reported sum, also where the closed form used to round to 50', () => {
    const {graph} = mountGraph();
    act(() => { graph.importPresetData({a: 1, q: 0.999999999999, terms: 50, tolerance: 0}); });
    const bars = sumBars(graph);
    expect(bars).toHaveLength(50);
    const top = bars[bars.length - 1].point2!.Y();
    expect(top).toBe(seriesView(graph.modelNow()).partialSum);
    expect(top).toBeLessThan(50);
    expect(Math.abs(top - 49.999999998775024)).toBeLessThan(1e-12);
    expect(Math.abs(readoutNumber('sum') - top)).toBeLessThanOrEqual(5e-5);
    expect(readout('sum')).toBe('50');
});

test('the bars and the readout agree for a convergent, an alternating and a divergent series', () => {
    const {graph} = mountGraph();
    for (const [a, q, terms] of [[1, 0.5, 12], [5, -0.9, 30], [0.1, -2, 8], [5, 2, 20], [1, -1, 7]]) {
        act(() => { graph.importPresetData({a, q, terms, tolerance: 0}); });
        const bars = sumBars(graph);
        expect(bars).toHaveLength(terms);
        const top = bars[bars.length - 1].point2!.Y();
        expect(top).toBe(seriesView(graph.modelNow()).partialSum);
        expect(Math.abs(readoutNumber('sum') - top)).toBeLessThanOrEqual(5e-5 * Math.max(1, Math.abs(top)));
    }
});

test('a genuinely accepted tolerance of 1e-18 reports first term 19 and the same tail in the error readout', () => {
    const {graph} = mountGraph();
    act(() => { graph.importPresetData({a: 1, q: 0.1, terms: 1, tolerance: 0}); });
    act(() => { graph.editTolerance(1e-18); });
    expect(graph.modelNow().tolerance).toBe(1e-18);
    expect(statusIds()).toEqual(['convergent', 'tolerance']);
    const text = document.querySelector('[data-series-status="tolerance"]')!.textContent!;
    expect(text).toContain('19');
    expect(text).not.toContain('17');
});
