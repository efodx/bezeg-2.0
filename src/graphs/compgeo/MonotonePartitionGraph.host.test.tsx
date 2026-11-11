import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MONOTONE_PARTITION_STEP_INTERVAL_MS, MonotonePartitionGraph} from './MonotonePartitionGraph';
import {
    MONOTONE_PARTITION_EXAMPLE_1, MONOTONE_PARTITION_EXAMPLE_2, MONOTONE_PARTITION_PRESET_KEY, monotonePartitionCollection,
} from './monotonePartitionPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
import type {GridPoint} from '../../compgeo/grid';
import {PointSetModel} from '../../compgeo/pointSetModel';
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

class Observed extends MonotonePartitionGraph {
    liveBoard() { return this.board; }
}

/** Reaches refusals the polygon mode prevents (a non-integer vertex): the trace input is replaced. */
class Forced extends Observed {
    forced: GridPoint[] = [];
    protected override verticesForTrace() { return this.forced; }
}

type Shown = {elType: string; name?: string; plaintext?: string; dataX?: number[]; dataY?: number[]; coords?: {usrCoords: number[]}; vertices?: Array<{X(): number; Y(): number}>};
const objectsNamed = (graph: Observed, ...names: string[]) =>
    (graph.liveBoard().objectsList as Shown[]).filter(o => names.includes(o.name ?? ''));
const TRACE_NAMES = [
    'monotone-sweep-line', 'monotone-status', 'monotone-status-current', 'monotone-diagonal', 'monotone-type-marker', 'monotone-type-label',
    'monotone-current', 'monotone-piece', 'monotone-piece-number',
];
const traceObjects = (graph: Observed) => objectsNamed(graph, ...TRACE_NAMES);
const drawn = (graph: Observed) => traceObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY, o.coords?.usrCoords, o.plaintext]);
const labels = (graph: Observed) => objectsNamed(graph, 'monotone-type-label').map(o => o.plaintext);

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const part = (name: string) => document.querySelector(`[data-monotone-partition="${name}"]`)?.textContent;
const panel = () => ['step', 'note', 'vertex', 'reason', 'diagonals', 'summary', 'type-counts', 'balance'].map(part);
const button = (action: string) => document.querySelector(`button[data-action="${action}"]`) as HTMLButtonElement;
const click = (action: string) => act(() => { fireEvent.click(button(action)); });
const polygon = (...points: Array<[number, number]>): PointSetModel => ({
    mode: 'polygon', closed: true, gridStepExponent: 0, points: points.map(([x, y]) => ({x, y})),
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
    for (let i = 0; i < ticks; i++) act(() => { frames.frame(MONOTONE_PARTITION_STEP_INTERVAL_MS); });
}
const saveState = (fields: object) => ({initialized: true, ...fields});
const atEnd = (graph: Observed) => { stepWhile(() => graph.step < graph.run().length - 1, () => click('next-step')); };
const entries = (list: 'queue' | 'status', attribute: string) =>
    [...document.querySelectorAll(`[data-monotone-partition-list="${list}"] [${attribute}]`)] as HTMLElement[];
const queueNames = () => entries('queue', 'data-queue-entry').map(e => e.getAttribute('data-queue-entry'));
const statusTexts = () => entries('status', 'data-status-entry').map(e => e.title);
const currentStatus = () => entries('status', 'data-current').map(e => e.getAttribute('data-status-entry'));
/** The pop steps of the run, in order. */
const popSteps = (graph: Observed) => [...Array(graph.run().length).keys()].filter(i => graph.run().event(i)?.note === 'pop');

test('the default scene is example 1 at step 0: the sweep line above the polygon, no vertex marked, no mode choice', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(MONOTONE_PARTITION_EXAMPLE_1);
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(part('note')).toContain('pometalna premica nad njim');
    const line = objectsNamed(graph, 'monotone-sweep-line');
    expect(line).toHaveLength(1);
    expect(line[0].dataY?.[0]).toBeGreaterThan(8);
    expect(traceObjects(graph)).toHaveLength(1);
    expect(queueNames()).toEqual(['v6', 'v4', 'v5', 'v2', 'v1', 'v3']);
    expect(entries('status', 'data-status-entry')).toHaveLength(0);
    expect(document.body.textContent).not.toContain('Poligon');
});

test('example 1 stepped through: queue order, the type at each vertex, the helper at the split vertex, the single diagonal, two pieces', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    const pops = popSteps(graph);
    expect(pops).toHaveLength(6);
    const seen: Array<[string[], string | undefined, string[], string[]]> = [];
    let diagonalSteps = 0;
    for (let step = 1; step < run.length; step++) {
        click('next-step');
        if (run.event(step)?.note === 'diagonal') diagonalSteps++;
        if (pops.includes(step)) {
            seen.push([queueNames() as string[], part('vertex'), statusTexts(), labels(graph) as string[]]);
        }
    }
    expect(diagonalSteps).toBe(1);
    // After each pop: the vertices still queued, the vertex line (name and type), the status with helpers, and the board labels so far.
    expect(seen.map(([queue, vertex]) => [queue.join(','), vertex])).toEqual([
        ['v4,v5,v2,v1,v3', 'Oglišče v6 je začetno.'],
        ['v5,v2,v1,v3', 'Oglišče v4 je začetno.'],
        ['v2,v1,v3', 'Oglišče v5 je zlivno.'],
        ['v1,v3', 'Oglišče v2 je razcepno.'],
        ['v3', 'Oglišče v1 je končno.'],
        ['', 'Oglišče v3 je končno.'],
    ]);
    // The split vertex v2 (4,3): the left edge e6 (v6 to v1) has the merge vertex v5 (8,5) as its helper.
    expect(seen[3][2]).toContain('e6 — pomočnik v5');
    expect(seen[3][3]).toEqual(['v6 začetno', 'v4 začetno', 'v5 zlivno', 'v2 razcepno']);
    expect(part('reason')).toBe('Obe sosednji oglišči sta nad njim in notranji kot je manjši od π.');
    // Done: one diagonal v2-v5, two pieces, the counts.
    expect(part('diagonals')).toBe('Diagonale doslej (1): v2–v5');
    expect(part('summary')).toBe('Kosov je 2 = število diagonal (1) + 1.');
    expect(part('type-counts')).toBe('Oglišča po vrstah: začetnih 2, končnih 2, razcepnih 1, zlivnih 1, navadnih 0.');
    expect(part('balance')).toBe('Začetna + razcepna = 2 + 1 = 3; končna + zlivna = 2 + 1 = 3.');
    expect(objectsNamed(graph, 'monotone-diagonal')).toHaveLength(1);
    expect(objectsNamed(graph, 'monotone-piece')).toHaveLength(2);
    expect(objectsNamed(graph, 'monotone-piece').map(o => (o.vertices ?? []).slice(0, -1).map(v => [v.X(), v.Y()]))).toEqual([
        [[4, 8], [0, 0], [4, 3], [8, 5]], [[12, 8], [8, 5], [4, 3], [8, 0]],
    ].map(piece => expect.arrayContaining(piece)));
    expect(objectsNamed(graph, 'monotone-piece-number').map(o => o.plaintext)).toEqual(['1', '2']);
    expect(labels(graph)).toHaveLength(6);
});

test('each processed vertex has a text label and a marker shape per type, not colour alone; the current vertex is ringed', () => {
    const graph = new Observed();
    mount(graph);
    const faces: Record<string, string> = {};
    for (let i = 0; i < 4; i++) click('next-step');
    stepWhile(() => objectsNamed(graph, 'monotone-type-label').length < 4, () => click('next-step'));
    expect(labels(graph)).toEqual(['v6 začetno', 'v4 začetno', 'v5 zlivno', 'v2 razcepno']);
    expect(objectsNamed(graph, 'monotone-current')).toHaveLength(1);
    for (const marker of objectsNamed(graph, 'monotone-type-marker') as Array<Shown & {visProp?: {face?: string}}>) {
        faces[String(marker.coords?.usrCoords.slice(1))] = String(marker.visProp?.face);
    }
    const shapes = Object.values(faces);
    expect(new Set(shapes).size).toBe(3);
});

test('wiring: the shared example select shows the current example, a custom polygon, and choosing an example loads it at step 0', () => {
    const graph = new Observed();
    mount(graph);
    const select = () => screen.getByLabelText(/^(Primera|Examples)$/) as HTMLSelectElement;
    expect(select().value).toBe('example-1');
    act(() => { fireEvent.change(select(), {target: {value: 'example-2'}}); });
    expect([graph.model, graph.step]).toEqual([MONOTONE_PARTITION_EXAMPLE_2, 0]);
    click('next-step');
    load(graph, {...MONOTONE_PARTITION_EXAMPLE_2, points: MONOTONE_PARTITION_EXAMPLE_2.points.slice(0, 5)});
    expect(select().value).toBe('custom');
    expect(select().querySelector('option[value="custom"]')!.hasAttribute('disabled')).toBe(true);
});

test('the second example: the diagonals of the kernel appear, no vertex is labelled split', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, MONOTONE_PARTITION_EXAMPLE_2);
    expect(graph.step).toBe(0);
    atEnd(graph);
    expect(graph.run().diagonals).toEqual([[4, 6], [2, 4]]);
    expect(part('diagonals')).toBe('Diagonale doslej (2): v5–v7, v3–v5');
    expect(objectsNamed(graph, 'monotone-diagonal')).toHaveLength(2);
    expect(labels(graph)).toHaveLength(9);
    expect(labels(graph).some(label => label?.includes('razcepno'))).toBe(false);
    expect(labels(graph).filter(label => label?.includes('zlivno'))).toHaveLength(2);
    expect(part('type-counts')).toBe('Oglišča po vrstah: začetnih 3, končnih 1, razcepnih 0, zlivnih 2, navadnih 3.');
    expect(part('summary')).toBe('Kosov je 3 = število diagonal (2) + 1.');
    expect(objectsNamed(graph, 'monotone-piece')).toHaveLength(3);
});

test('example 2: the panel shows the kernel helper of a regular vertex from its pop on, not shifted', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, MONOTONE_PARTITION_EXAMPLE_2);
    stepWhile(() => graph.step < 16, () => click('next-step'));
    expect(statusTexts()).toEqual(['e9 — pomočnik v9']);
    click('next-step');
    expect(part('vertex')).toBe('Oglišče v2 je navadno.');
    expect(statusTexts()).toEqual(['e9 — pomočnik v2']);
    expect(currentStatus()).toEqual(['e9']);
});

test('the status shows every edge with its helper and marks the edges of the current vertex', () => {
    const graph = new Observed();
    mount(graph);
    const run = graph.run();
    expect(currentStatus()).toEqual([]);
    let marked = 0;
    for (let step = 1; step < run.length; step++) {
        click('next-step');
        const view = run.view(step);
        expect(statusTexts()).toEqual(view.status.map(edge => {
            const helper = view.helpers.get(edge);
            return `e${edge + 1} — pomočnik v${(helper ?? 0) + 1}`;
        }));
        expect(entries('status', 'data-current').map(e => e.getAttribute('data-status-entry')))
            .toEqual(view.status.filter(edge => view.current.has(edge)).map(edge => `e${edge + 1}`));
        if (view.current.size > 0) {
            marked++;
            const [first] = entries('status', 'data-current');
            expect(first.getAttribute('aria-current')).toBe('true');
            expect(first.textContent).toContain('▸');
            expect(first.textContent).toContain('rob trenutnega oglišča');
            expect(objectsNamed(graph, 'monotone-status-current')).toHaveLength(view.current.size);
        }
        expect(objectsNamed(graph, 'monotone-status').length + objectsNamed(graph, 'monotone-status-current').length).toBe(view.status.length);
    }
    expect(marked).toBeGreaterThan(0);
    expect(entries('status', 'data-status-entry')).toHaveLength(0);
});

test('the head of the queue is marked as the next event and the queue empties at the end', () => {
    const graph = new Observed();
    mount(graph);
    const marked = entries('queue', 'data-next');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toBe(entries('queue', 'data-queue-entry')[0]);
    expect(marked[0].textContent).toContain('▸');
    expect(marked[0].textContent).toContain('naslednji dogodek');
    atEnd(graph);
    expect(document.querySelector('[data-monotone-partition-list="queue"] [data-monotone-partition-empty]')).not.toBeNull();
});

test('Next step repeated k times and Play advanced k ticks give the same drawn state and panel; Play stops at done', () => {
    const k = 10;
    const first = new Observed();
    const firstView = mount(first);
    for (let i = 0; i < k; i++) click('next-step');
    const expectedDrawn = drawn(first);
    const expectedPanel = panel();
    const expectedLists = [queueNames(), statusTexts()];
    expect(first.step).toBe(k);
    expect(expectedDrawn.length).toBeGreaterThan(1);
    firstView.unmount();

    const frames = manualScheduler();
    const second = new Observed({}, frames.scheduler);
    mount(second);
    click('play-pause');
    expect(second.isPlaying).toBe(true);
    tick(frames, k);
    expect(second.step).toBe(k);
    expect(drawn(second)).toEqual(expectedDrawn);
    expect(panel()).toEqual(expectedPanel);
    expect([queueNames(), statusTexts()]).toEqual(expectedLists);
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
    act(() => { graph.movePointTo(0, {x: 1, y: -2}); });
    expect(graph.step).toBe(0);
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.run().length).toBeGreaterThan(0);
    expect(graph.model.points[0]).toEqual({x: 1, y: -2});
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(length).toBeGreaterThan(0);

    click('next-step');
    click('next-step');
    expect(graph.step).toBe(2);
    click('reset');
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 1 od ${graph.run().length}`);
    expect(traceObjects(graph)).toHaveLength(1);
});

describe('refusals', () => {
    const refusalCase = (graph: Observed) => {
        expect(part('refusal')).toBeTruthy();
        expect(document.querySelector('[data-monotone-partition="refusal"]')?.getAttribute('role')).toBe('alert');
        expect(traceObjects(graph)).toHaveLength(0);
        expect([graph.run().length, graph.step]).toEqual([0, 0]);
        expect(part('step')).toBeUndefined();
        expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
        expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
        expect(document.querySelector('[data-monotone-partition-lists]')).toBeNull();
        click('play-pause');
        click('next-step');
        expect([graph.isPlaying, graph.step]).toEqual([false, 0]);
    };

    test('fewer than three vertices', () => {
        const graph = new Observed();
        mount(graph);
        click('next-step');
        load(graph, polygon([0, 0], [4, 0]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Razdelitev je zavrnjena: večkotnik potrebuje vsaj tri oglišča. Dodaj oglišča.');
    });

    test('too many vertices, and removing one lifts the refusal', () => {
        const graph = new Observed({pointLimit: 25});
        mount(graph);
        const many = Array.from({length: 21}, (_, k): [number, number] => [k, k % 2]);
        load(graph, polygon(...many));
        expect(graph.model.points).toHaveLength(21);
        refusalCase(graph);
        expect(part('refusal')).toBe('Razdelitev je zavrnjena: oglišč je preveč (največ 20). Odstrani oglišče.');
        load(graph, MONOTONE_PARTITION_EXAMPLE_1);
        expect(part('refusal')).toBeUndefined();
        expect(part('step')).toBeTruthy();
    });

    test('a vertex outside the range', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, polygon([0, 0], [4000, 0], [0, 8]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Razdelitev je zavrnjena: oglišče v2 je izven območja (največ 1024 po absolutni vrednosti). Premakni ga bližje izhodišču.');
    });

    test('a non-integer vertex, in both languages', () => {
        const graph = new Forced();
        mount(graph);
        graph.forced = [{x: 0, y: 0}, {x: 4, y: 0.5}, {x: 0, y: 8}];
        load(graph, polygon([0, 0], [4, 0], [0, 8]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Razdelitev je zavrnjena: oglišče v2 ni celo število. Postavi ga na mrežno točko.');
        act(() => { setLanguage('en'); });
        expect(part('refusal')).toBe('The partition is refused: vertex v2 is not an integer. Place it on a grid point.');
    });

    test('a polygon that crosses itself names the two edges', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, polygon([0, 0], [4, 4], [4, 0], [0, 4]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Razdelitev je zavrnjena: roba e1 in e3 se sekata ali dotikata. Premakni oglišče, da bo večkotnik enostaven.');
        act(() => { setLanguage('en'); });
        expect(part('refusal')).toBe('The partition is refused: edges e1 and e3 cross or touch. Move a vertex so that the polygon is simple.');
    });

    test('three collinear consecutive vertices name the middle one', () => {
        const graph = new Observed();
        mount(graph);
        load(graph, polygon([0, 0], [2, 0], [4, 0], [4, 4]));
        refusalCase(graph);
        expect(part('refusal')).toBe('Razdelitev je zavrnjena: oglišče v2 leži na premici skozi sosednji oglišči. Premakni ga.');
        act(() => { setLanguage('en'); });
        expect(part('refusal')).toBe('The partition is refused: vertex v2 lies on the line through its two neighbours. Move it.');
    });
});

test('a clockwise polygon is drawn with the same diagonal and its stored order is unchanged', () => {
    const ccw = new Observed();
    const first = mount(ccw);
    atEnd(ccw);
    const diagonalOf = (graph: Observed) => objectsNamed(graph, 'monotone-diagonal').map(o => [o.dataX, o.dataY]);
    const expected = diagonalOf(ccw);
    expect(expected).toHaveLength(1);
    first.unmount();

    const cw = new Observed();
    mount(cw);
    const reversed = polygon(...[...MONOTONE_PARTITION_EXAMPLE_1.points].reverse().map((p): [number, number] => [p.x, p.y]));
    load(cw, reversed);
    expect(cw.run().reversed).toBe(true);
    expect(part('reversed')).toContain('v smeri urnega kazalca');
    atEnd(cw);
    expect(cw.model.points).toEqual(reversed.points);
    const as = (lines: typeof expected) => lines.map(([xs, ys]) => [xs, ys].map(a => [...(a ?? [])].sort((p, q) => p - q)).join('|')).sort();
    expect(as(diagonalOf(cw))).toEqual(as(expected));
    expect(objectsNamed(cw, 'monotone-piece')).toHaveLength(2);
    expect(part('summary')).toBe('Kosov je 2 = število diagonal (1) + 1.');
});

test('the Preset keeps the polygon and the step; an out-of-range step is clamped; a non-polygon mode is coerced; the second example imports', async () => {
    const graph = new Observed();
    mount(graph);
    for (let i = 0; i < 9; i++) click('next-step');
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(MONOTONE_PARTITION_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 9});
    expect(saved.graphState).not.toHaveProperty('playing');
    load(graph, polygon([0, 0], [4, 0], [0, 4]));
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.step, graph.model]).toEqual([9, MONOTONE_PARTITION_EXAMPLE_1]);
    expect(graph.isPlaying).toBe(false);
    expect(part('step')).toBe(`Korak 10 od ${graph.run().length}`);
    expect(labels(graph).length).toBeGreaterThan(0);

    act(() => { graph.importPreset({id: MONOTONE_PARTITION_PRESET_KEY, graphState: saveState({step: 999999}), data: MONOTONE_PARTITION_EXAMPLE_2}); });
    expect(graph.step).toBe(graph.run().length - 1);
    expect(graph.model).toEqual(MONOTONE_PARTITION_EXAMPLE_2);
    act(() => { graph.importPreset({id: MONOTONE_PARTITION_PRESET_KEY, graphState: saveState({step: -4}), data: MONOTONE_PARTITION_EXAMPLE_1}); });
    expect(graph.step).toBe(0);
    act(() => { graph.importPreset({id: MONOTONE_PARTITION_PRESET_KEY, graphState: saveState({}), data: {...MONOTONE_PARTITION_EXAMPLE_1, mode: 'points', closed: false}}); });
    expect([graph.model.mode, graph.model.closed]).toEqual(['polygon', true]);
});

test('the Preset collection checks the step, the limits and the overlay ids with actionable messages', () => {
    const collection = monotonePartitionCollection;
    const checkState = (graphState: unknown) => collection.checkGraphState?.(graphState);
    expect(collection.key).toBe('compgeo-monotone-partition');
    expect(checkState({initialized: true, overlays: {sweep: true, grid: false}, step: 7})).toBeUndefined();
    expect(checkState({initialized: true, step: 'first'})?.key).toBe('monotonepartition_invalid_step');
    expect(checkState({initialized: true, speed: 2})?.key).toBe('invalid_value');
    expect(checkState({initialized: true, overlays: {nope: true}})?.key).toBe('pointset_invalid_overlays');
    expect('data' in collection.check(MONOTONE_PARTITION_EXAMPLE_1)).toBe(true);
    expect('data' in collection.check(MONOTONE_PARTITION_EXAMPLE_2)).toBe(true);
    const twenty = collection.check(polygon(...Array.from({length: 20}, (_, k): [number, number] => [k, k % 2])));
    expect('data' in twenty).toBe(true);
    const many = collection.check(polygon(...Array.from({length: 21}, (_, k): [number, number] => [k, k % 2])));
    expect('rejection' in many && many.rejection.key).toBe('pointset_invalid_too_many_points');
    const far = collection.check(polygon([0, 0], [2000, 1], [0, 5]));
    expect('rejection' in far && far.rejection.key).toBe('pointset_invalid_coordinate_out_of_range');
});

test('a language switch re-renders the panel, the side lists and the board labels and keeps the step and the board', () => {
    const graph = new Observed();
    mount(graph);
    const pops = popSteps(graph);
    stepWhile(() => graph.step < pops[3], () => click('next-step'));
    expect(part('vertex')).toBe('Oglišče v2 je razcepno.');
    expect(labels(graph)).toEqual(['v6 začetno', 'v4 začetno', 'v5 zlivno', 'v2 razcepno']);
    const before = traceObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY]);
    act(() => { setLanguage('en'); });
    expect(part('vertex')).toBe('Vertex v2 is a split vertex.');
    expect(part('reason')).toBe('Both neighbours are below it and the interior angle is greater than π.');
    expect(part('step')).toBe(`Step ${pops[3] + 1} of ${graph.run().length}`);
    expect(part('order-rule')).toContain('Vertices are processed from top to bottom');
    expect(button('next-step').textContent).toBe('Next step');
    expect(document.body.textContent).toContain('Sweep line');
    expect(document.querySelector('[data-monotone-partition-list="queue"] p')?.textContent).toBe('Event queue (vertices still to process)');
    expect(entries('queue', 'data-next')[0].title).toBe('Vertex v1');
    expect(statusTexts()).toContain('e6 — helper v5');
    expect(labels(graph)).toEqual(['v6 start', 'v4 start', 'v5 merge', 'v2 split']);
    expect(traceObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY])).toEqual(before);
    expect(graph.step).toBe(pops[3]);
    act(() => { setLanguage('sl'); });
    expect(labels(graph)).toEqual(['v6 začetno', 'v4 začetno', 'v5 zlivno', 'v2 razcepno']);
});

test('a StrictMode remount gets a working controller', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph, true);
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
    tick(frames, 6);
    expect(frames.callbacks.size).toBe(1);
    expect(traceObjects(graph).length).toBeGreaterThan(1);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(MONOTONE_PARTITION_STEP_INTERVAL_MS)).toBe(false);
});

test('the panel offers no points/polygon/intervals choice and renders the side lists in their container', () => {
    const graph = new Observed();
    mount(graph);
    expect(document.body.textContent).not.toContain('Intervali');
    expect(document.querySelector('[data-monotone-partition-lists] [data-monotone-partition-list="queue"]')).not.toBeNull();
    expect(document.querySelector('[data-monotone-partition-lists] [data-monotone-partition-list="status"]')).not.toBeNull();
});

test('Next step to the end and Play to the end give the same nonempty final drawn state and panel', () => {
    const byNext = new Observed();
    const first = mount(byNext);
    atEnd(byNext);
    const expected = {step: byNext.step, panel: panel(), drawn: drawn(byNext)};
    first.unmount();
    expect(expected.step).toBe(byNext.run().length - 1);
    expect(expected.drawn.length).toBeGreaterThan(0);

    const frames = manualScheduler();
    const byPlay = new Observed({}, frames.scheduler);
    mount(byPlay);
    click('play-pause');
    tick(frames, byPlay.run().length + 5);
    expect({step: byPlay.step, panel: panel(), drawn: drawn(byPlay)}).toEqual(expected);
    expect(byPlay.isPlaying).toBe(false);
});
