import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BENTLEY_OTTMANN_STEP_INTERVAL_MS, BentleyOttmannGraph} from './BentleyOttmannGraph';
import {
    BENTLEY_OTTMANN_EXAMPLE_1, BENTLEY_OTTMANN_EXAMPLE_2, BENTLEY_OTTMANN_PRESET_KEY, bentleyOttmannCollection,
} from './bentleyOttmannPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {PointSetModel} from '../../compgeo/pointSetModel';
import type {Segment} from '../../compgeo/sweep/segments';
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

class Observed extends BentleyOttmannGraph {
    liveBoard() { return this.board; }
}

/** Reaches refusals the segments mode prevents (a non-integer endpoint): the trace input is replaced. */
class Forced extends Observed {
    forced: Segment[] = [];
    protected override segmentsForTrace() { return this.forced; }
}

type Shown = {elType: string; name?: string; dataX?: number[]; dataY?: number[]; coords?: {usrCoords: number[]}; rendNode?: SVGElement};
const objectsNamed = (graph: Observed, ...names: string[]) =>
    (graph.liveBoard().objectsList as Shown[]).filter(o => names.includes(o.name ?? ''));
const TRACE_NAMES = ['sweep-line', 'sweep-event', 'sweep-hover', 'sweep-open', 'sweep-current', 'sweep-current-idle', 'sweep-test-link', 'sweep-test-mark', 'sweep-crossing'];
const sweepObjects = (graph: Observed) => objectsNamed(graph, ...TRACE_NAMES);
const drawn = (graph: Observed) => sweepObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY, o.coords?.usrCoords]);

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const part = (name: string) => document.querySelector(`[data-bentley-ottmann="${name}"]`)?.textContent;
const status = () => ['step', 'note', 'position', 'status-count', 'tests', 'summary', 'crossings'].map(part);
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const segs = (...s: number[][]): PointSetModel => ({
    mode: 'segments', closed: false, gridStepExponent: 0,
    points: s.flatMap(([ax, ay, bx, by]) => [{x: ax, y: ay}, {x: bx, y: by}]),
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
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(BENTLEY_OTTMANN_STEP_INTERVAL_MS); });
}
const saveState = (fields: object) => ({initialized: true, ...fields});
const atEnd = (graph: Observed) => { stepWhile(() => graph.step < graph.run().length - 1, () => click('next-step')); };
const pos = (graph: Observed, step: number) => {
    const p = graph.run().view(step).position;
    return p ? `${p.x.format()},${p.y.format()}` : '';
};

test('the default scene is example 1 at step 0 with no sweep line yet and no mode choice', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(BENTLEY_OTTMANN_EXAMPLE_1);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(part('note')).toContain('Vrsta dogodkov vsebuje vsa krajišča');
    expect(sweepObjects(graph)).toHaveLength(0);
    expect(part('order-rule')).toContain('od zgoraj navzdol');
    expect(document.body.textContent).not.toContain('Poligon');
});

test('example 1 stepped through: the 13 events in order, the status after each, and the line, event point and highlighted segments on the board', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    expect(run.eventCount).toBe(13);
    // The status is read from the run view (the trace via sweepStateAt) at the last step of each event; the side-list slice adds the DOM reading.
    const seen: Array<[string, number[]]> = [];
    for (let step = 0; step < run.length; step++) {
        if (step > 0) click('next-step');
        const next = step + 1 < run.length ? run.event(step + 1)?.note : 'pop';
        const view = run.view(step);
        if (view.position && (next === 'pop' || next === 'done')) {
            seen.push([pos(graph, step), [...view.status]]);
            expect(objectsNamed(graph, 'sweep-open', 'sweep-current')).toHaveLength(view.status.length);
            expect(objectsNamed(graph, 'sweep-line')[0].dataY).toEqual([view.position.y.toNumber(), view.position.y.toNumber()]);
            expect(objectsNamed(graph, 'sweep-event')).toHaveLength(1);
            expect(part('status-count')).toBe(`Daljic v stanju: ${view.status.length}`);
        }
    }
    expect(seen.slice(0, 13)).toEqual([
        ['2,5', [2]], ['4,5', [2, 3]], ['0,4', [1, 2, 3]], ['6,4', [1, 2, 3, 0]],
        ['33/20,29/10', [2, 1, 3, 0]], ['87/20,29/10', [2, 1, 0, 3]], ['3,2', [2, 0, 1, 3]], ['21/16,7/8', [0, 2, 1, 3]],
        ['75/16,7/8', [0, 2, 3, 1]], ['0,0', [2, 3, 1]], ['6,0', [2, 3]], ['1,-1', [3]], ['5,-1', []],
    ]);
});

test('the five crossings appear with their exact fractions next to the decimals in the panel and as points on the board', () => {
    const graph = new Observed();
    mount(graph);
    atEnd(graph);
    const items = [...document.querySelectorAll('[data-bentley-ottmann="crossing"]')].map(li => li.textContent);
    expect(items).toEqual([
        's2, s3 v točki (33/20 = 1,65; 29/10 = 2,9)',
        's1, s4 v točki (87/20 = 4,35; 29/10 = 2,9)',
        's1, s2 v točki (3; 2)',
        's1, s3 v točki (21/16 = 1,3125; 7/8 = 0,875)',
        's2, s4 v točki (75/16 = 4,6875; 7/8 = 0,875)',
    ]);
    expect(part('crossings')).toBe('Presečišča doslej (5)');
    expect(objectsNamed(graph, 'sweep-crossing')).toHaveLength(5);
    expect(part('summary')).toBe('Obdelanih dogodkov: 13; presečišč: 5; preizkusov sosednjih daljic: 9; vseh parov: 6.');
});

test('the degenerate example reports one point with all four segments and reverses the block in one step', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, BENTLEY_OTTMANN_EXAMPLE_2);
    expect(graph.step).toBe(0);
    const run = graph.run();
    const swaps = [...Array(run.length).keys()].filter(i => run.event(i)?.note === 'swap');
    expect(swaps).toHaveLength(1);
    stepWhile(() => graph.step < swaps[0], () => click('next-step'));
    expect(part('note')).toMatch(/^Daljice s\d(, s\d){3} se v stanju obrnejo/);
    expect(run.view(swaps[0] - 1).status).toHaveLength(4);
    expect([...run.view(swaps[0]).status]).toEqual([...run.view(swaps[0] - 1).status].reverse());
    atEnd(graph);
    const items = [...document.querySelectorAll('[data-bentley-ottmann="crossing"]')].map(li => li.textContent);
    expect(items).toEqual(['s1, s2, s3, s4 v točki (2; 2)']);
});

test('the neighbour test of the current step is shown as a link and two marks, and the counter equals the tests of the trace', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    let tests = 0;
    for (let step = 0; step < run.length; step++) {
        if (step > 0) click('next-step');
        if (run.event(step)?.note === 'test') {
            tests++;
            expect(objectsNamed(graph, 'sweep-test-link')).toHaveLength(1);
            expect(objectsNamed(graph, 'sweep-test-mark')).toHaveLength(2);
            expect(part('note')).toContain('Preizkus sosednjih daljic');
        } else {
            expect(objectsNamed(graph, 'sweep-test-link')).toHaveLength(0);
        }
        expect(part('tests')).toBe(`Preizkusov sosednjih daljic doslej: ${tests}; preizkus vseh parov bi jih imel 6.`);
    }
    expect(tests).toBe(run.view(run.length - 1).neighbourTests);
    expect(tests).toBeGreaterThan(0);
});

test('Next step repeated k times and Play advanced k ticks give the same drawn state and status; Play stops at done', () => {
    const k = 17;
    const first = new Observed();
    const firstView = mount(first);
    for (let i = 0; i < k; i++) click('next-step');
    const expectedDrawn = drawn(first);
    const expectedStatus = status();
    expect(first.step).toBe(k);
    expect(expectedDrawn.length).toBeGreaterThan(0);
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
    tick(frames, 1000);
    expect([second.step, second.isPlaying, frames.callbacks.size]).toEqual([second.run().length - 1, false, 0]);
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
});

test('an edit while playing recomputes the trace, returns to step 0 and pauses; Reset does the same', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('play-pause');
    tick(frames, 5);
    expect(graph.step).toBe(5);
    const length = graph.run().length;
    act(() => { graph.addSegmentAt({x: 0, y: -3}, {x: 6, y: -3}); });
    expect(graph.step).toBe(0);
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.run().length).not.toBe(length);
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
    load(graph, segs());
    expect(part('empty')).toBe('Ni daljic. Dodaj daljico, da se pometanje začne.');
    expect(sweepObjects(graph)).toHaveLength(0);
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
});

describe('refusals', () => {
    const refusalCase = (graph: Observed) => {
        expect(part('refusal')).toBeTruthy();
        expect(document.querySelector('[data-bentley-ottmann="refusal"]')?.getAttribute('role')).toBe('alert');
        expect(sweepObjects(graph)).toHaveLength(0);
        expect([graph.run().length, graph.step]).toEqual([0, 0]);
        expect(part('step')).toBeUndefined();
        expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
        expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
        click('play-pause');
        click('next-step');
        expect([graph.isPlaying, graph.step]).toEqual([false, 0]);
    };

    test('too many segments, and removing one lifts the refusal', () => {
        const graph = new Observed({segmentLimit: 14});
        mount(graph);
        load(graph, segs(...Array.from({length: 13}, (_, k) => [k, 0, k, 1 + k % 2])));
        expect(graph.model.points).toHaveLength(26);
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: daljic je preveč (največ 12). Odstrani daljico.');
        act(() => { graph.removeSegmentAt(12); });
        expect(part('refusal')).toBeUndefined();
        expect(part('step')).toBeTruthy();
    });

    test('an endpoint outside the range', () => {
        const graph = new Observed({coordinateLimit: 5000});
        mount(graph);
        load(graph, segs([0, 0, 4, 4], [0, 4, 2000, 1]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: krajišče daljice s2 je izven območja (največ 1024 po absolutni vrednosti). Premakni ga bližje izhodišču.');
    });

    test('a non-integer endpoint, in both languages', () => {
        const graph = new Forced();
        mount(graph);
        graph.forced = [{a: {x: 0, y: 0}, b: {x: 1, y: 1}}, {a: {x: 0.5, y: 0}, b: {x: 2, y: 2}}];
        load(graph, segs([0, 0, 1, 1], [1, 0, 2, 2]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: krajišče daljice s2 ni celo število. Postavi ga na mrežno točko.');
        act(() => { setLanguage('en'); });
        expect(part('refusal')).toBe('The sweep is refused: an endpoint of segment s2 is not an integer. Place it on a grid point.');
    });

    test('an overlapping collinear pair names the pair and is not drawn', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, segs([0, 0, 4, 0], [2, 0, 6, 0], [0, 3, 5, 3]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Pometanje je zavrnjeno: daljici s1 in s2 se prekrivata v daljici, ne v točki. Premakni eno od njiju.');
        act(() => { setLanguage('en'); });
        expect(part('refusal')).toBe('The sweep is refused: segments s1 and s2 overlap in a segment, not in a point. Move one of them.');
    });
});

test('the Preset keeps the segments and the step; an out-of-range step is clamped; the degenerate example imports', async () => {
    const graph = new Observed();
    mount(graph);
    for (let i = 0; i < 9; i++) click('next-step');
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(BENTLEY_OTTMANN_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 9});
    expect(saved.graphState).not.toHaveProperty('playing');
    load(graph, segs([0, 0, 1, 1]));
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.step, graph.model]).toEqual([9, BENTLEY_OTTMANN_EXAMPLE_1]);
    expect(graph.isPlaying).toBe(false);
    expect(part('step')).toBe(`Korak 10 od ${graph.run().length}`);

    act(() => { graph.importPreset({id: BENTLEY_OTTMANN_PRESET_KEY, graphState: saveState({step: 999999}), data: BENTLEY_OTTMANN_EXAMPLE_2}); });
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.model).toEqual(BENTLEY_OTTMANN_EXAMPLE_2);
    act(() => { graph.importPreset({id: BENTLEY_OTTMANN_PRESET_KEY, graphState: saveState({step: -4}), data: BENTLEY_OTTMANN_EXAMPLE_1}); });
    expect(graph.step).toBe(0);
});

test('the Preset collection checks the step, the mode, the limits and the overlay ids with actionable messages', () => {
    const collection = bentleyOttmannCollection;
    const checkState = (graphState: unknown) => collection.checkGraphState?.(graphState);
    expect(collection.key).toBe('compgeo-bentley-ottmann');
    expect(checkState({initialized: true, overlays: {sweep: true, grid: false}, step: 7})).toBeUndefined();
    expect(checkState({initialized: true, step: 'first'})?.key).toBe('bentleyottmann_invalid_step');
    expect(checkState({initialized: true, speed: 2})?.key).toBe('invalid_value');
    expect(checkState({initialized: true, overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect('data' in collection.check(BENTLEY_OTTMANN_EXAMPLE_1)).toBe(true);
    expect('data' in collection.check(BENTLEY_OTTMANN_EXAMPLE_2)).toBe(true);
    const mode = collection.check({mode: 'points', points: [{x: 0, y: 0}]});
    expect('rejection' in mode && mode.rejection.key).toBe('bentleyottmann_invalid_mode');
    const many = collection.check(segs(...Array.from({length: 13}, (_, k) => [k, 0, k, 1])));
    expect('rejection' in many && many.rejection.key).toBe('pointset_invalid_too_many_points');
    const far = collection.check(segs([0, 0, 2000, 1]));
    expect('rejection' in far && far.rejection.key).toBe('pointset_invalid_coordinate_out_of_range');
    const odd = collection.check({mode: 'segments', closed: false, gridStepExponent: 0, points: [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}]});
    expect('rejection' in odd && odd.rejection.key).toBe('pointset_invalid_odd_segment_endpoints');
    const intervals = collection.check({mode: 'intervals', closed: false, gridStepExponent: 0, points: [{x: 0, y: 1}, {x: 1, y: 1}]});
    expect('rejection' in intervals).toBe(true);
});

test('a language switch re-renders the panel text, the fractions and the overlay switch and keeps the step and the board', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    const report = [...Array(run.length).keys()].find(i => run.event(i)?.note === 'report' && run.event(i)?.through?.length === 2)!;
    stepWhile(() => graph.step < report, () => click('next-step'));
    const before = drawn(graph);
    expect(part('note')).toContain('Presečišče (33/20 = 1,65; 29/10 = 2,9): skozi točko gredo daljice s2, s3.');
    act(() => { setLanguage('en'); });
    expect(part('note')).toContain('Intersection (33/20 = 1.65; 29/10 = 2.9): the segments s2, s3 pass through the point.');
    expect(part('step')).toBe(`Step ${report + 1} of ${run.length}`);
    expect(part('order-rule')).toContain('Events follow from top to bottom');
    expect(button('next-step').textContent).toBe('Next step');
    expect(document.body.textContent).toContain('Sweep line');
    expect(drawn(graph)).toEqual(before);
    expect(graph.step).toBe(report);
});

test('a StrictMode remount gets a working controller', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph, true);
    click('play-pause');
    tick(frames, 2);
    expect(graph.step).toBe(2);
});

test('a scene change and unmount pause playback and leave no board objects, listeners or timers', async () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    const view = mount(graph);
    const board = graph.liveBoard();
    const box = board.containerObj as HTMLElement;
    const remove = vi.spyOn(box, 'removeEventListener');
    act(() => { graph.saveCurrentPreset('mine'); });
    click('play-pause');
    tick(frames, 4);
    expect(graph.isPlaying).toBe(true);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.isPlaying, frames.callbacks.size, graph.step]).toEqual([false, 0, 0]);

    click('play-pause');
    tick(frames, 6);
    expect(frames.callbacks.size).toBe(1);
    expect(languageListeners.live).toBeGreaterThan(0);
    expect(sweepObjects(graph).length).toBeGreaterThan(0);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(BENTLEY_OTTMANN_STEP_INTERVAL_MS)).toBe(false);
    expect(languageListeners.live).toBe(0);
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});

test('the panel offers no points/polygon/intervals choice and renders the side lists in their container', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.body.textContent).not.toContain('Poligon');
    expect(document.body.textContent).not.toContain('Intervali');
    expect(document.querySelector('[data-bentley-ottmann-lists] [data-bentley-ottmann-list="queue"]')).not.toBeNull();
    expect(document.querySelector('[data-bentley-ottmann-lists] [data-bentley-ottmann-list="status"]')).not.toBeNull();
});

describe('side lists', () => {
    const entries = (list: 'queue' | 'status', attribute: string) =>
        [...document.querySelectorAll(`[data-bentley-ottmann-list="${list}"] [${attribute}]`)] as HTMLElement[];
    const statusNames = () => entries('status', 'data-status-entry').map(e => e.getAttribute('data-status-entry'));
    const currentNames = () => entries('status', 'data-current').map(e => e.getAttribute('data-status-entry'));
    const names = (status: readonly number[]) => status.map(k => `s${k + 1}`);

    test('example 1 stepped through: the 13 events in order and the status after each, read from the side lists', () => {
        const graph = new Observed();
        mount(graph);
        const run = graph.run();
        const heads: string[] = [];
        const statuses: Array<Array<string | null>> = [];
        expect(entries('queue', 'data-queue-entry')).toHaveLength(8);
        for (let step = 0; step < run.length; step++) {
            if (step > 0) click('next-step');
            const next = step + 1 < run.length ? run.event(step + 1)?.note : 'done';
            // Exactly the head of the queue is marked as the next event; its mark is not colour alone.
            const marked = entries('queue', 'data-next');
            expect(marked.length).toBe(run.view(step).queue.length > 0 ? 1 : 0);
            if (marked.length) {
                expect(marked[0]).toBe(entries('queue', 'data-queue-entry')[0]);
                expect(marked[0].getAttribute('aria-current')).toBe('step');
                expect(marked[0].textContent).toContain('▸');
                expect(marked[0].textContent).toContain('naslednji dogodek');
            }
            expect(statusNames()).toEqual(names(run.view(step).status));
            if (next === 'pop') heads.push(marked[0].title);
            if (run.view(step).position && (next === 'pop' || next === 'done')) statuses.push(statusNames());
        }
        expect(heads).toEqual([
            'Zgornje krajišče v točki (2; 5)', 'Zgornje krajišče v točki (4; 5)', 'Zgornje krajišče v točki (0; 4)', 'Zgornje krajišče v točki (6; 4)',
            'Presečišče v točki (33/20 = 1,65; 29/10 = 2,9)', 'Presečišče v točki (87/20 = 4,35; 29/10 = 2,9)', 'Presečišče v točki (3; 2)',
            'Presečišče v točki (21/16 = 1,3125; 7/8 = 0,875)', 'Presečišče v točki (75/16 = 4,6875; 7/8 = 0,875)',
            'Spodnje krajišče v točki (0; 0)', 'Spodnje krajišče v točki (6; 0)', 'Spodnje krajišče v točki (1; −1)', 'Spodnje krajišče v točki (5; −1)',
        ]);
        expect(statuses.slice(0, 13)).toEqual([
            [2], [2, 3], [1, 2, 3], [1, 2, 3, 0], [2, 1, 3, 0], [2, 1, 0, 3], [2, 0, 1, 3], [0, 2, 1, 3], [0, 2, 3, 1], [2, 3, 1], [2, 3], [3], [],
        ].map(names));
        expect(document.querySelector('[data-bentley-ottmann-list="queue"] [data-bentley-ottmann-empty]')).not.toBeNull();
        expect(document.querySelector('[data-bentley-ottmann-list="status"] [data-bentley-ottmann-empty]')).not.toBeNull();
    });

    test('the current event marks its segments, and a crossing marks every segment through the point', () => {
        const graph = new Observed();
        mount(graph);
        const run = graph.run();
        expect(currentNames()).toEqual([]);
        const marks: Record<string, Array<string | null>> = {};
        for (let step = 1; step < run.length; step++) {
            click('next-step');
            if (run.event(step)?.note === 'pop' || run.event(step)?.note === 'enter') marks[pos(graph, step)] = currentNames();
        }
        expect(marks['3,2']).toEqual(['s2', 's1']);
        expect(marks['2,5']).toEqual(['s3']);
        expect(marks['33/20,29/10']).toEqual(['s2', 's3']);
        // The degenerate example marks all four segments through the point.
        load(graph, BENTLEY_OTTMANN_EXAMPLE_2);
        const second = graph.run();
        const popAt = [...Array(second.length).keys()].find(i => second.event(i)?.note === 'pop' && second.view(i).kind === 'crossing') as number;
        stepWhile(() => graph.step < popAt, () => click('next-step'));
        const current = entries('status', 'data-current');
        expect(current.map(e => e.getAttribute('data-status-entry')).sort()).toEqual(['s1', 's2', 's3', 's4']);
        expect(current[0].getAttribute('aria-current')).toBe('true');
        expect(current[0].textContent).toContain('▸');
        expect(current[0].textContent).toContain('daljica trenutnega dogodka');
    });

    const segmentOf = (graph: Observed, entry: HTMLElement) => {
        const k = Number((entry.getAttribute('data-status-entry') as string).slice(1)) - 1;
        const [a, b] = graph.model.points.slice(2 * k, 2 * k + 2);
        return [[a.x, b.x], [a.y, b.y]];
    };

    test('hovering or focusing a status entry highlights its segment on the board and leaving removes it', () => {
        const graph = new Observed();
        mount(graph);
        for (let i = 0; i < 6; i++) click('next-step');
        const [first, second] = entries('status', 'data-status-entry');
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        act(() => { fireEvent.mouseEnter(second); });
        expect(objectsNamed(graph, 'sweep-hover').map(o => [o.dataX, o.dataY])).toEqual([segmentOf(graph, second)]);
        expect(entries('status', 'data-hovered')).toEqual([second]);
        act(() => { fireEvent.mouseLeave(second); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        act(() => { fireEvent.focus(first); });
        expect(objectsNamed(graph, 'sweep-hover').map(o => [o.dataX, o.dataY])).toEqual([segmentOf(graph, first)]);
        act(() => { fireEvent.blur(first); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        expect(entries('status', 'data-hovered')).toHaveLength(0);
    });

    test('hover and focus remain visible over an already active segment', () => {
        const graph = new Observed();
        mount(graph);
        for (let i = 0; i < 24; i++) click('next-step');
        const current = entries('status', 'data-current')[0];
        expect(current).toBeTruthy();
        const strokeWidth = (name: string) => {
            const node = objectsNamed(graph, name)[0]?.rendNode;
            expect(node).toBeTruthy();
            const width = Number.parseFloat(node?.getAttribute('stroke-width') ?? '');
            expect(width).toBeGreaterThan(0);
            return width;
        };
        const activeWidth = strokeWidth('sweep-current');
        act(() => { fireEvent.mouseEnter(current); });
        expect(strokeWidth('sweep-hover')).toBeGreaterThan(activeWidth);
        act(() => { fireEvent.mouseLeave(current); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
        act(() => { fireEvent.focus(current); });
        expect(strokeWidth('sweep-hover')).toBeGreaterThan(activeWidth);
        act(() => { fireEvent.blur(current); });
        expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
    });

    describe('a hover goes stale', () => {
        const hoverOne = (graph: Observed) => {
            for (let i = 0; i < 6; i++) click('next-step');
            act(() => { fireEvent.mouseEnter(entries('status', 'data-status-entry')[0]); });
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(1);
        };

        test('on a step', () => {
            const graph = new Observed();
            mount(graph);
            hoverOne(graph);
            click('next-step');
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
            expect(entries('status', 'data-hovered')).toHaveLength(0);
        });

        test('on Reset', () => {
            const graph = new Observed();
            mount(graph);
            hoverOne(graph);
            click('reset');
            expect(objectsNamed(graph, 'sweep-hover')).toHaveLength(0);
            expect(entries('status', 'data-hovered')).toHaveLength(0);
        });
    });

    test('the lists follow a language switch', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        click('next-step');
        act(() => { setLanguage('en'); });
        expect(document.querySelector('[data-bentley-ottmann-list="queue"] p')?.textContent).toBe('Event queue (remaining events)');
        expect(entries('queue', 'data-next')[0].title).toBe('Upper endpoint at the point (4; 5)');
        expect(entries('status', 'data-status-entry')[0].title).toBe('Segment s3');
    });
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
