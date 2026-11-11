import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {INTERVAL_SWEEP_STEP_INTERVAL_MS, IntervalSweepGraph} from './IntervalSweepGraph';
import {
    INTERVAL_SWEEP_EXAMPLE_1, INTERVAL_SWEEP_EXAMPLE_2, INTERVAL_SWEEP_PRESET_KEY, intervalSweepCollection,
} from './intervalSweepPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {intervalLetter, PointSetModel} from '../../compgeo/pointSetModel';
import {compareIntervalEvents, type Interval, intervalSweepTrace} from '../../compgeo/sweep/intervalSweep';
import {sweepStateAt} from '../../compgeo/sweep/sweepTrace';
import {setLanguage} from '../../localization';

// Counts the live subscriptions of the language listener, so unmount can be checked to release it.
const languageListeners = vi.hoisted(() => ({live: 0}));
vi.mock('../../localization', async importOriginal => {
    const original = await importOriginal<typeof import('../../localization')>();
    return {
        ...original,
        onLanguageChange: (listener: () => void) => {
            languageListeners.live++;
            const off = original.onLanguageChange(listener);
            let released = false;
            return () => { if (!released) languageListeners.live--; released = true; off(); };
        },
    };
});

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    languageListeners.live = 0;
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

class Observed extends IntervalSweepGraph {
    liveBoard() { return this.board; }
}

/** Reaches refusals the intervals mode prevents (an inverted or non-integer interval): the trace input is replaced. */
class Forced extends Observed {
    forced: Interval[] = [];
    protected override intervalsForTrace() { return this.forced; }
}

type Shown = {elType: string; name?: string; dataX?: number[]; dataY?: number[]; rendNode?: SVGElement};
const objectsNamed = (graph: Observed, ...names: string[]) =>
    (graph.liveBoard().objectsList as Shown[]).filter(o => names.includes(o.name ?? ''));
const renderedStrokeWidth = (object: Shown | undefined) => {
    expect(object?.rendNode).toBeTruthy();
    const width = object?.rendNode?.getAttribute('stroke-width');
    expect(width).not.toBeNull();
    return Number.parseFloat(width ?? '');
};
const sweepObjects = (graph: Observed) => objectsNamed(graph, 'sweep-line', 'sweep-open', 'sweep-current', 'sweep-current-idle', 'sweep-pair-link', 'sweep-pair-mark');
/** The open intervals the board shows highlighted: the plain and the emphasised (still open) ones. */
const boardOpen = (graph: Observed) => objectsNamed(graph, 'sweep-open', 'sweep-current').length;
/** The pair drawn by the dashed link, as letters (its two rows are the intervals' rows). */
const boardPair = (graph: Observed) => objectsNamed(graph, 'sweep-pair-link').map(o => (o.dataY ?? []).map(y => intervalLetter(y - 1)).join(''));
const drawn = (graph: Observed) => sweepObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY]);

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const part = (name: string) => document.querySelector(`[data-interval-sweep="${name}"]`)?.textContent;
const status = () => ['step', 'note', 'open', 'counts', 'max', 'pairs', 'comparison'].map(part);
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const ivs = (...ab: number[][]): PointSetModel => ({
    mode: 'intervals', closed: false, gridStepExponent: 0,
    points: ab.flatMap(([a, b], k) => [{x: a, y: k + 1}, {x: b, y: k + 1}]),
});
const load = (graph: Observed, next: PointSetModel) => act(() => { graph.loadModel(next); });
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}
/** Plays `ticks` playback steps: the first frame starts the clock, each later one is a full interval. */
function tick(frames: ReturnType<typeof manualScheduler>, ticks: number) {
    act(() => { frames.frame(0); });
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(INTERVAL_SWEEP_STEP_INTERVAL_MS); });
}
const saveState = (fields: object) => ({initialized: true, ...fields});
const atEnd = (graph: Observed) => { stepWhile(() => graph.step < graph.run().length - 1, () => click('next-step')); };

test('the default scene is example 1 at step 0 with the sweep line drawn at the first event and no mode choice', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(INTERVAL_SWEEP_EXAMPLE_1);
    expect([graph.step, graph.isPlaying, graph.run().length]).toEqual([0, false, 26]);
    expect(part('step')).toBe('Korak 1 od 26');
    expect(objectsNamed(graph, 'sweep-line')).toHaveLength(1);
    expect(objectsNamed(graph, 'sweep-line')[0].dataX).toEqual([0, 0]);
    expect(document.querySelector('[data-interval-sweep="tie-rule"]')?.textContent).toContain('pred dogodkom izstopa');
    expect(document.body.textContent).not.toContain('Poligon');
});

test('example 1 stepped to the end: open counts 1,2,3,2,1,2,1,2,1,0, maximum 3 on [3, 4] and pairs ab ac bc bd de, on the panel and on the board', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    const boardCounts: number[] = [];
    const panelCounts: string[] = [];
    const boardPairs: string[] = [];
    for (let step = 0; step < run.length; step++) {
        if (step > 0) click('next-step');
        const note = run.event(step)?.note;
        if (note === 'enter' || note === 'leave') {
            boardCounts.push(boardOpen(graph));
            panelCounts.push(part('open') ?? '');
        }
        boardPairs.push(...boardPair(graph));
        expect(objectsNamed(graph, 'sweep-pair-mark')).toHaveLength(run.event(step)?.note === 'report' ? 2 : 0);
    }
    expect(boardCounts).toEqual([1, 2, 3, 2, 1, 2, 1, 2, 1, 0]);
    expect(panelCounts.map(text => Number(text.replace(/\D/g, '')))).toEqual(boardCounts);
    expect(part('counts')).toBe('Odprtih po dogodkih: 1, 2, 3, 2, 1, 2, 1, 2, 1, 0');
    expect(part('max')).toBe('Največ odprtih: 3 na [3, 4]');
    expect(part('pairs')).toBe('Prekrivajoči pari doslej (5): ab, ac, bc, bd, de');
    expect(boardPairs).toEqual(['ab', 'ac', 'bc', 'bd', 'de']);
    expect(part('comparison')).toBe('Najdenih parov: 5; vseh parov bi preizkusili: 10.');
    expect(part('note')).toBe('Vsi dogodki so obdelani.');
    expect(objectsNamed(graph, 'sweep-open', 'sweep-current')).toHaveLength(0);
});

test('while sweeping, the open intervals are highlighted and the current interval is thicker than the other open ones', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    const enterC = [...Array(run.length).keys()].find(i => run.event(i)?.note === 'enter' && run.event(i)?.interval === 2)!;
    for (let i = 0; i < enterC; i++) click('next-step');
    const current = objectsNamed(graph, 'sweep-current');
    const open = objectsNamed(graph, 'sweep-open');
    expect([current.length, open.length]).toEqual([1, 2]);
    expect(current[0].dataY).toEqual([3, 3]);
    expect(open.map(o => o.dataY![0]).sort()).toEqual([1, 2]);
});

test('ties: the entering events of 3 are processed before the leaving ones and the zero-length interval is reported as touching', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, INTERVAL_SWEEP_EXAMPLE_2);
    expect(graph.step).toBe(0);
    const run = graph.run();
    const popsAt3 = [...Array(run.length).keys()].map(i => run.event(i)).filter(e => e?.note === 'pop' && e.x === 3)
        .map(e => `${e?.entering ? '+' : '-'}${intervalLetter(e?.interval ?? 0)}`);
    expect(popsAt3).toEqual(['+b', '+c', '-a', '-c']);
    const notes: Array<string | null | undefined> = [];
    for (let step = 0; step < run.length; step++) {
        if (step > 0) click('next-step');
        if (run.event(step)?.note === 'report') notes.push(`${boardPair(graph)[0]}:${part('note')}`);
    }
    expect(notes).toEqual([
        'ab:Najden par ab: intervala se dotikata v eni točki.',
        'ac:Najden par ac: intervala se dotikata v eni točki.',
        'bc:Najden par bc: intervala se dotikata v eni točki.',
        'bd:Najden par bd: intervala se prekrivata.',
    ]);
    expect(part('pairs')).toBe('Prekrivajoči pari doslej (4): ab, ac, bc, bd');
    expect(part('max')).toBe('Največ odprtih: 3 na [3, 3]');
});

test('Next step repeated k times and Play advanced k ticks give the same drawn state and status; Play stops at done', () => {
    const k = 11;
    const first = new Observed();
    const firstView = mount(first);
    for (let i = 0; i < k; i++) click('next-step');
    const expectedDrawn = drawn(first);
    const expectedStatus = status();
    expect(first.step).toBe(k);
    firstView.unmount();

    const frames = manualScheduler();
    const second = new Observed({}, frames.scheduler);
    mount(second);
    click('play-pause');
    expect(second.isPlaying).toBe(true);
    tick(frames, k);
    expect(second.step).toBe(k);
    expect(drawn(second)).toEqual(expectedDrawn);
    expect(status()).toEqual(expectedStatus);
    tick(frames, 100);
    expect([second.step, second.isPlaying, frames.callbacks.size]).toEqual([25, false, 0]);
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
});

test('Next step to the end and Play to the end give the same nonempty final drawn state and status', () => {
    const byNext = new Observed();
    const first = mount(byNext);
    atEnd(byNext);
    const expected = {step: byNext.step, status: status(), drawn: drawn(byNext)};
    first.unmount();
    expect(expected.step).toBe(byNext.run().length - 1);
    expect(expected.drawn.length).toBeGreaterThan(0);

    const frames = manualScheduler();
    const byPlay = new Observed({}, frames.scheduler);
    mount(byPlay);
    click('play-pause');
    tick(frames, byPlay.run().length + 5);
    expect({step: byPlay.step, status: status(), drawn: drawn(byPlay)}).toEqual(expected);
    expect(byPlay.isPlaying).toBe(false);
});

test('an edit while playing recomputes the trace, returns to step 0 and pauses; Reset does the same', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('play-pause');
    tick(frames, 5);
    expect(graph.step).toBe(5);
    act(() => { graph.addIntervalAt(1, 2); });
    expect(graph.step).toBe(0);
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.run().length).toBe(4 * 6 + graph.run().view(graph.run().length - 1).pairs.length + 1);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);

    click('next-step');
    click('next-step');
    expect(graph.step).toBe(2);
    click('reset');
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
});

test('an empty scene shows the empty message and an unavailable Play, and no sweep objects', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, ivs());
    expect(part('empty')).toBe('Ni intervalov. Dodaj interval, da se pometanje začne.');
    expect(sweepObjects(graph)).toHaveLength(0);
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
});

describe('refusals', () => {
    const refusalCase = (graph: Observed) => {
        expect(part('refusal')).toBeTruthy();
        expect(document.querySelector('[data-interval-sweep="refusal"]')?.getAttribute('role')).toBe('alert');
        expect(sweepObjects(graph)).toHaveLength(0);
        expect([graph.run().length, graph.step]).toEqual([0, 0]);
        expect(part('step')).toBeUndefined();
        expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
        expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
        click('play-pause');
        click('next-step');
        expect([graph.isPlaying, graph.step]).toEqual([false, 0]);
    };

    test('too many intervals', () => {
        const graph = new Observed({intervalLimit: 12});
        mount(graph);
        load(graph, ivs(...Array.from({length: 11}, (_, k) => [k, k + 1])));
        expect(graph.model.points).toHaveLength(22);
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: intervalov je preveč (največ 10). Odstrani interval.');
        act(() => { graph.removeIntervalAt(10); });
        expect(part('refusal')).toBeUndefined();
        expect(objectsNamed(graph, 'sweep-line')).toHaveLength(1);
    });

    test('an endpoint outside the range', () => {
        const graph = new Observed({coordinateLimit: 5000});
        mount(graph);
        load(graph, ivs([0, 4], [2, 2000]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: krajišče intervala b je izven območja (največ 1024 po absolutni vrednosti). Premakni ga bližje izhodišču.');
    });

    test('an inverted interval and a non-integer endpoint, in both languages', () => {
        const graph = new Forced();
        mount(graph);
        graph.forced = [{lo: 5, hi: 1}];
        load(graph, ivs([0, 4]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: interval a ima levo krajišče desno od desnega. Zamenjaj krajišči.');
        act(() => { setLanguage('en'); });
        expect(part('refusal')).toBe('The sweep is refused: the left endpoint of interval a lies right of its right endpoint. Swap the endpoints.');
        graph.forced = [{lo: 0, hi: 1}, {lo: 0.5, hi: 2}];
        load(graph, ivs([0, 3], [1, 2]));
        refusalCase(graph);
        expect(part('refusal')).toBe('The sweep is refused: an endpoint of interval b is not an integer. Put it on a grid point.');
    });
});

test('the Preset keeps the intervals and the step; an out-of-range step is clamped; a Preset in another mode is refused', async () => {
    const graph = new Observed();
    mount(graph);
    for (let i = 0; i < 7; i++) click('next-step');
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(INTERVAL_SWEEP_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 7});
    expect(saved.graphState).not.toHaveProperty('playing');
    load(graph, ivs([0, 1]));
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.step, graph.model]).toEqual([7, INTERVAL_SWEEP_EXAMPLE_1]);
    expect(graph.isPlaying).toBe(false);
    expect(part('step')).toBe('Korak 8 od 26');

    act(() => { graph.importPreset({id: INTERVAL_SWEEP_PRESET_KEY, graphState: saveState({step: 999999}), data: INTERVAL_SWEEP_EXAMPLE_2}); });
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.model).toEqual(INTERVAL_SWEEP_EXAMPLE_2);
    act(() => { graph.importPreset({id: INTERVAL_SWEEP_PRESET_KEY, graphState: saveState({step: -4}), data: INTERVAL_SWEEP_EXAMPLE_1}); });
    expect(graph.step).toBe(0);
});

test('the Preset collection checks the step, the mode, the limits and the overlay ids with actionable messages', () => {
    const collection = intervalSweepCollection;
    const checkState = (graphState: unknown) => collection.checkGraphState?.(graphState);
    expect(collection.key).toBe('compgeo-interval-sweep');
    expect(checkState({initialized: true, overlays: {sweep: true, grid: false}, step: 7})).toBeUndefined();
    expect(checkState({initialized: true, step: 'first'})?.key).toBe('intervalsweep_invalid_step');
    expect(checkState({initialized: true, speed: 2})?.key).toBe('invalid_value');
    expect(checkState({initialized: true, overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect('data' in collection.check(INTERVAL_SWEEP_EXAMPLE_1)).toBe(true);
    expect('data' in collection.check(INTERVAL_SWEEP_EXAMPLE_2)).toBe(true);
    const mode = collection.check({mode: 'points', points: [{x: 0, y: 0}]});
    expect('rejection' in mode && mode.rejection.key).toBe('intervalsweep_invalid_mode');
    const many = collection.check(ivs(...Array.from({length: 11}, (_, k) => [k, k + 1])));
    expect('rejection' in many && many.rejection.key).toBe('pointset_invalid_too_many_points');
    const far = collection.check(ivs([0, 2000]));
    expect('rejection' in far && far.rejection.key).toBe('pointset_invalid_coordinate_out_of_range');
    const rows = collection.check({mode: 'intervals', closed: false, gridStepExponent: 0, points: [{x: 0, y: 1}, {x: 1, y: 5}]});
    expect('rejection' in rows && rows.rejection.key).toBe('pointset_invalid_interval_rows');
});

test('a language switch re-renders the panel text and the overlay switch and keeps the step and the board', () => {
    const graph = new Observed();
    mount(graph);
    for (let i = 0; i < 4; i++) click('next-step');
    const before = drawn(graph);
    expect(part('note')).toBe('Najden par ab: intervala se prekrivata.');
    act(() => { setLanguage('en'); });
    expect(part('note')).toBe('Pair ab found: the intervals overlap.');
    expect(part('step')).toBe('Step 5 of 26');
    expect(document.querySelector('[data-interval-sweep="tie-rule"]')?.textContent).toContain('entering event is processed before a leaving event');
    expect(button('next-step').textContent).toBe('Next step');
    expect(document.body.textContent).toContain('Sweep line');
    expect(drawn(graph)).toEqual(before);
    expect(graph.step).toBe(4);
});

test('a StrictMode remount gets a working controller and draws the sweep once', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph, true);
    expect(objectsNamed(graph, 'sweep-line')).toHaveLength(1);
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('a scene change and unmount pause playback', async () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
    act(() => { graph.saveCurrentPreset('mine'); });
    click('play-pause');
    tick(frames, 4);
    expect(graph.isPlaying).toBe(true);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    click('play-pause');
    tick(frames, 3);
    expect(frames.callbacks.size).toBe(1);
    expect(sweepObjects(graph).length).toBeGreaterThan(0);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(INTERVAL_SWEEP_STEP_INTERVAL_MS)).toBe(false);
});

test('the panel offers no points/polygon choice and shows the side lists in their container', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.querySelector('[data-interval-sweep-lists] [data-interval-sweep-list]')).not.toBeNull();
    expect(document.querySelector('input[type="radio"]')).toBeNull();
    atEnd(graph);
    expect(graph.step).toBe(25);
});

describe('side lists', () => {
    const entries = (list: string, attribute: string) =>
        [...document.querySelectorAll(`[data-interval-sweep-list="${list}"] [${attribute}]`)] as HTMLElement[];
    const statusLetters = () => entries('status', 'data-status-entry').map(e => e.dataset.statusEntry);
    const queueTexts = () => entries('queue', 'data-queue-entry').map(e => e.dataset.queueEntry);
    const traceOf = (intervals: readonly Interval[]) => {
        const result = intervalSweepTrace(intervals);
        if (!result.ok) throw new Error('refused');
        return result.trace;
    };
    const queueOf = (intervals: readonly Interval[], step: number) => traceOf(intervals).flatMap((event, index) =>
        event.kind === 'pop' && index > step && 'position' in event.payload
            ? [`${intervalLetter(event.payload.id >> 1)}${(event.payload.id & 1) === 0 ? '+' : '-'}`] : []);
    const statusOf = (intervals: readonly Interval[], step: number) =>
        sweepStateAt(traceOf(intervals), step, compareIntervalEvents).status.map(intervalLetter);
    const exampleIntervals: Interval[] = [[0, 4], [2, 7], [3, 5], [6, 9], [8, 10]].map(([lo, hi]) => ({lo, hi}));

    test('match the sweep state after every step of the default example; the highlighted entry is the current interval', () => {
        const graph = new Observed();
        mount(graph);
        const run = graph.run();
        let sawCurrent = 0;
        for (let step = 0; step < run.length; step++) {
            if (step > 0) click('next-step');
            expect(queueTexts()).toEqual(queueOf(exampleIntervals, step));
            expect(statusLetters()).toEqual(statusOf(exampleIntervals, step));
            const current = entries('status', 'data-current');
            const view = run.view(step);
            const expected = view.current !== undefined && view.open.includes(view.current) ? [intervalLetter(view.current)] : [];
            expect(current.map(e => e.dataset.statusEntry)).toEqual(expected);
            for (const entry of current) {
                expect(entry.getAttribute('aria-current')).toBe('true');
                expect(entry.textContent).toContain('▸');
            }
            sawCurrent += current.length;
            const next = entries('queue', 'data-next');
            expect(next.map(e => e.dataset.queueEntry)).toEqual(queueTexts().slice(0, 1));
            for (const entry of next) {
                expect(entry.getAttribute('aria-current')).toBe('step');
                expect(entry.textContent).toContain('naslednji dogodek');
                expect(entry.textContent).toContain('▸');
            }
        }
        expect(sawCurrent).toBeGreaterThan(0);
        expect(queueTexts()).toEqual([]);
        expect(document.querySelector('[data-interval-sweep-empty="queue"]')).not.toBeNull();
    });

    test('the default example at step 0 lists the nine events after the first pop, in x order, the head marked as next', () => {
        const graph = new Observed();
        mount(graph);
        expect(queueTexts()).toEqual(['b+', 'c+', 'a-', 'c-', 'd+', 'b-', 'e+', 'd-', 'e-']);
        expect(entries('queue', 'data-next').map(e => e.dataset.queueEntry)).toEqual(['b+']);
        click('next-step');
        click('next-step');
        expect(queueTexts()).toEqual(['c+', 'a-', 'c-', 'd+', 'b-', 'e+', 'd-', 'e-']);
        expect(entries('queue', 'data-next').map(e => e.dataset.queueEntry)).toEqual(['c+']);
        expect(entries('queue', 'data-queue-entry').filter(e => e.hasAttribute('aria-current'))).toHaveLength(1);
    });

    test('are labelled, and the status entries are keyboard focusable', () => {
        const graph = new Observed();
        mount(graph);
        for (let i = 0; i < 4; i++) click('next-step');
        const queue = document.querySelector('[data-interval-sweep-list="queue"] ol') as HTMLElement;
        const list = document.querySelector('[data-interval-sweep-list="status"] ul') as HTMLElement;
        expect(document.getElementById(queue.getAttribute('aria-labelledby')!)?.textContent).toBe('Vrsta dogodkov (preostali dogodki)');
        expect(document.getElementById(list.getAttribute('aria-labelledby')!)?.textContent).toBe('Stanje (odprti intervali)');
        for (const entry of entries('status', 'data-status-entry')) {
            expect(entry.tabIndex).toBe(0);
            expect(entry.getAttribute('aria-label')).toContain('Interval ');
        }
        expect(entries('queue', 'data-queue-entry')[0].getAttribute('aria-label')).toMatch(/^(Vstop|Izstop) intervala /);
    });

    test('hovering or focusing a status entry highlights its interval on the board and leaving removes it', () => {
        const graph = new Observed();
        mount(graph);
        for (let i = 0; i < 4; i++) click('next-step');
        const [first, second] = entries('status', 'data-status-entry');
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        act(() => { fireEvent.mouseEnter(second); });
        expect(objectsNamed(graph, 'sweep-hover').map(o => o.dataY)).toEqual([[2, 2]]);
        expect(renderedStrokeWidth(objectsNamed(graph, 'sweep-hover')[0])).toBeGreaterThan(renderedStrokeWidth(
            objectsNamed(graph, 'sweep-open', 'sweep-current').find(o => o.dataY?.[0] === 2),
        ));
        expect(entries('status', 'data-hovered')).toHaveLength(1);
        act(() => { fireEvent.mouseLeave(second); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        act(() => { fireEvent.focus(first); });
        expect(objectsNamed(graph, 'sweep-hover').map(o => o.dataY)).toEqual([[1, 1]]);
        expect(renderedStrokeWidth(objectsNamed(graph, 'sweep-hover')[0])).toBeGreaterThan(renderedStrokeWidth(
            objectsNamed(graph, 'sweep-open', 'sweep-current').find(o => o.dataY?.[0] === 1),
        ));
        act(() => { fireEvent.blur(first); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        expect(entries('status', 'data-hovered')).toHaveLength(0);
    });

    test('status entries show their bounds and carry the same title as the queue entries do', () => {
        const graph = new Observed();
        mount(graph);
        for (let i = 0; i < 4; i++) click('next-step');
        for (const entry of entries('status', 'data-status-entry')) {
            expect(entry.textContent).toMatch(/\[[\d,. -]+, [\d,. -]+\]/);
            expect(entry.getAttribute('aria-label')).toContain(entry.title);
            expect(entry.title).toContain('Interval ');
        }
    });

    describe('a hover goes stale', () => {
        const hoverOpen = (graph: Observed) => {
            for (let i = 0; i < 4; i++) click('next-step');
            const entry = entries('status', 'data-status-entry')[0];
            act(() => { fireEvent.mouseEnter(entry); });
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(1);
        };

        test('when a step passes the exit of the hovered interval', () => {
            const graph = new Observed();
            mount(graph);
            hoverOpen(graph);
            click('next-step');
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
            stepWhile(() => !button('next-step').getAttribute('aria-disabled')?.includes('true'), () => click('next-step'));
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        });

        test('on Reset', () => {
            const graph = new Observed();
            mount(graph);
            hoverOpen(graph);
            click('reset');
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
            expect(entries('status', 'data-hovered')).toHaveLength(0);
        });

        test('on a preset restore', () => {
            const graph = new Observed();
            mount(graph);
            hoverOpen(graph);
            act(() => { graph.importPreset({id: INTERVAL_SWEEP_PRESET_KEY, graphState: saveState({step: 4}), data: INTERVAL_SWEEP_EXAMPLE_2}); });
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
            expect(entries('status', 'data-hovered')).toHaveLength(0);
        });
    });

    test('re-render on a language switch and unmount leaves no hover state or language listeners', () => {
        const graph = new Observed();
        const view = mount(graph);
        for (let i = 0; i < 4; i++) click('next-step');
        const hoveredEntry = entries('status', 'data-status-entry')[0];
        act(() => { fireEvent.focus(hoveredEntry); });
        const haloBefore = objectsNamed(graph, 'sweep-hover').map(o => o.dataY);
        act(() => { setLanguage('en'); });
        expect(objectsNamed(graph, 'sweep-hover').map(o => o.dataY)).toEqual(haloBefore);
        expect(document.querySelector('[data-interval-sweep-list="queue"] p')?.textContent).toBe('Event queue (remaining events)');
        expect(document.querySelector('[data-interval-sweep-list="status"] p')?.textContent).toBe('Status (open intervals)');
        expect(entries('queue', 'data-queue-entry')[0].getAttribute('aria-label')).toMatch(/^(Entering|Leaving) of interval /);
        act(() => { fireEvent.focus(entries('status', 'data-status-entry')[0]); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(1);
        expect(entries('status', 'data-hovered').map(e => e.dataset.statusEntry)).toEqual(['a']);
        view.unmount();
        expect(graph['hovered']).toBeUndefined();
        expect(languageListeners.live).toBe(0);
        expect(document.querySelector('[data-interval-sweep-list]')).toBeNull();
    });
});
