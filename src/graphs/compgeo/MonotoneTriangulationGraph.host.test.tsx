import {stepWhile} from './boundedSteps.testing';
import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MONOTONE_PARTITION_STEP_INTERVAL_MS} from './MonotonePartitionGraph';
import {MonotoneTriangulationGraph} from './MonotoneTriangulationGraph';
import {
    MONOTONE_TRIANGULATION_EXAMPLE_1, MONOTONE_TRIANGULATION_EXAMPLE_2, MONOTONE_TRIANGULATION_EXAMPLE_3, MONOTONE_TRIANGULATION_PRESET_KEY,
} from './monotoneTriangulationPresetCollection';
import {MONOTONE_PARTITION_PRESET_KEY} from './monotonePartitionPresetCollection';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {AnimationScheduler} from '../../learning/runtime/animation';
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

class Observed extends MonotoneTriangulationGraph {
    liveBoard() { return this.board; }
}

type Shown = {elType: string; name?: string; plaintext?: string; dataX?: number[]; dataY?: number[]; coords?: {usrCoords: number[]}};
const objectsNamed = (graph: Observed, ...names: string[]) =>
    (graph.liveBoard().objectsList as Shown[]).filter(o => names.includes(o.name ?? ''));
const TRACE_NAMES = [
    'monotone-sweep-line', 'monotone-status', 'monotone-status-current', 'monotone-diagonal', 'monotone-type-marker', 'monotone-type-label',
    'monotone-current', 'monotone-piece', 'monotone-piece-number',
    'monotonetri-triangle', 'monotonetri-piece', 'monotonetri-diagonal', 'monotonetri-sweep-line', 'monotonetri-test', 'monotonetri-test-label',
    'monotonetri-stack', 'monotonetri-chain-marker', 'monotonetri-chain-label', 'monotonetri-current',
];
const traceObjects = (graph: Observed) => objectsNamed(graph, ...TRACE_NAMES);
const drawn = (graph: Observed) => traceObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY, o.coords?.usrCoords, o.plaintext]);
const chainLabels = (graph: Observed) => objectsNamed(graph, 'monotonetri-chain-label').map(o => o.plaintext);

const mount = (graph: Observed, strict = false) => {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
};
const part = (name: string) => document.querySelector(`[data-monotone-triangulation="${name}"]`)?.textContent;
const panel = () => ['step', 'phase', 'note', 'vertex', 'reason', 'piece', 'test', 'diagonals', 'triangles', 'already-monotone',
    'comparison-monotone', 'comparison-ear'].map(part);
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
const goTo = (graph: Observed, step: number) => { stepWhile(() => graph.step < step, () => click('next-step')); };
const entries = (list: 'queue' | 'status', attribute: string) =>
    [...document.querySelectorAll(`[data-monotone-triangulation-list="${list}"] [${attribute}]`)] as HTMLElement[];
const vertexList = () => entries('queue', 'data-queue-entry').map(e => e.getAttribute('data-queue-entry'));
const stackIds = () => entries('status', 'data-status-entry').map(e => e.getAttribute('data-status-entry') ?? '');
const names = (stack: number[]) => stack.map(v => `v${v + 1}`);
/** The stack after each triangulation step of C3 example 1 (steps 15 to 43): the kernel stacks recorded in task 15. */
const EXAMPLE_1_STACKS: number[][] = [
    [], [5], [5], [5, 4], [5, 4], [5], [5], [], [], [5], [5, 1], [5, 1], [5], [],
    [], [3], [3], [3, 4], [3, 4], [3], [3], [3, 4], [3, 4, 1], [3, 4, 1], [3, 4], [3], [3], [], [],
];

test('the default scene is example 1 at step 0: the partition phase, no triangulation objects, three examples', () => {
    const graph = new Observed();
    mount(graph);
    expect(graph.model).toEqual(MONOTONE_TRIANGULATION_EXAMPLE_1);
    expect([graph.step, graph.isPlaying, graph.run().length]).toEqual([0, false, 44]);
    expect(part('step')).toBe('Korak 0 od 43');
    expect(part('phase')).toBe('Faza: razdelitev');
    expect(objectsNamed(graph, 'monotone-sweep-line')).toHaveLength(1);
    expect(objectsNamed(graph, 'monotonetri-chain-label')).toHaveLength(0);
    expect(part('comparison-monotone')).toBeUndefined();
    expect(['example-1', 'example-2', 'example-3'].map(a => button(a)?.textContent)).toEqual(['Primer 1: razcepno oglišče', 'Primer 2: zlivni oglišči', 'Primer 3: že monoton']);
    expect(document.querySelector('[data-monotone-triangulation-lists] [data-monotone-triangulation-list="queue"]')).toBeNull();
    expect(document.querySelector('[data-monotone-partition-list="queue"]')).not.toBeNull();
});

test('example 1 to the end: the stack at each step equals the kernel stacks, 4 triangles, 3 diagonals, the counts panel is task 15\'s', () => {
    const graph = new Observed();
    mount(graph);
    goTo(graph, 14);
    expect(part('phase')).toBe('Faza: razdelitev');
    expect(part('note')).toContain('Končano');
    expect(objectsNamed(graph, 'monotone-piece')).toHaveLength(2);
    click('next-step');
    expect(graph.step).toBe(15);
    expect(part('phase')).toBe('Faza: triangulacija kosa 1 od 2');
    expect(objectsNamed(graph, 'monotone-piece')).toHaveLength(0);
    const seen: string[][] = [];
    for (let step = 15; step <= 43; step++) {
        goTo(graph, step);
        seen.push(stackIds());
    }
    expect(seen).toEqual(EXAMPLE_1_STACKS.map(names));
    expect(graph.step).toBe(43);
    expect(part('phase')).toBe('Faza: triangulacija kosa 2 od 2');
    expect(part('note')).toBe('Končano: večkotnik je razdeljen na trikotnike, njihovo število je 4.');
    expect(part('triangles')).toBe('Trikotnikov: 4 = n − 2 pri n = 6.');
    expect(part('diagonals')).toBe('Diagonale doslej (3): v2–v5, v2–v6, v3–v5');
    expect(objectsNamed(graph, 'monotonetri-triangle')).toHaveLength(4);
    expect(objectsNamed(graph, 'monotonetri-diagonal')).toHaveLength(3);
    expect(part('comparison-monotone')).toBe('Monotona metoda (razdelitev in triangulacija): 11 izračunov predikatov.');
    expect(part('comparison-ear')).toBe('Rezanje ušes na istem večkotniku: 21 izračunov predikatov.');
    expect(part('comparison-growth')).toContain('O(n²)');
    expect(part('comparison-growth')).toContain('O(n log n)');
    expect(part('comparison-note')).toBe('Majhna števila to ponazarjajo, ne dokazujejo.');
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
});

test('the visibility test of the current event is drawn and read out with its outcome; chains are text and marker shape', () => {
    const graph = new Observed();
    mount(graph);
    goTo(graph, 35);
    expect(part('test')).toBe('Trenutni preizkus: oglišči v2 in v4, diagonala je zunaj.');
    expect(part('note')).toContain('Preizkus oglišča v2 proti oglišču v4');
    const line = objectsNamed(graph, 'monotonetri-test');
    expect(line).toHaveLength(1);
    // The pair is v2 = (4,3) and v4 = (12,8).
    expect([line[0].dataX, line[0].dataY]).toEqual([[4, 12], [3, 8]]);
    expect(objectsNamed(graph, 'monotonetri-test-label').map(o => o.plaintext)).toEqual(['zunaj']);
    expect(chainLabels(graph)).toEqual(['v4 zgornje oglišče', 'v5 leva veriga', 'v2 leva veriga', 'v3 spodnje oglišče']);
    expect(objectsNamed(graph, 'monotonetri-chain-marker')).toHaveLength(4);
    expect(objectsNamed(graph, 'monotonetri-stack')).toHaveLength(1);
    expect(objectsNamed(graph, 'monotonetri-current')).toHaveLength(1);
    expect(objectsNamed(graph, 'monotonetri-piece')).toHaveLength(1);
    // The pair disappears with the event.
    click('next-step');
    expect(objectsNamed(graph, 'monotonetri-test')).toHaveLength(0);
    expect(part('test')).toBeUndefined();
    act(() => { setLanguage('en'); });
    expect(chainLabels(graph)).toEqual(['v4 top vertex', 'v5 left chain', 'v2 left chain', 'v3 bottom vertex']);
});

test('the side lists: vertices top to bottom with their chain, the stack bottom to top, current entries carry aria-current', () => {
    const graph = new Observed();
    mount(graph);
    goTo(graph, 35);
    expect(vertexList()).toEqual(['v4', 'v5', 'v2', 'v3']);
    expect(entries('queue', 'data-queue-entry').map(e => e.title)).toEqual(['v4 — zgornje oglišče', 'v5 — leva veriga', 'v2 — leva veriga', 'v3 — spodnje oglišče']);
    const current = entries('queue', 'aria-current');
    expect(current.map(e => [e.getAttribute('data-queue-entry'), e.getAttribute('aria-current')])).toEqual([['v2', 'step']]);
    expect(stackIds()).toEqual(['v4']);
    // The stack vertex under test is the current entry of the stack (v4 is the stack top that v2 is tested against: input index 3).
    expect(entries('status', 'aria-current').map(e => e.getAttribute('data-status-entry'))).toEqual(['v4']);
    goTo(graph, 37);
    expect(stackIds()).toEqual(['v4', 'v5', 'v2']);
    expect(entries('status', 'aria-current').map(e => e.getAttribute('data-status-entry'))).toEqual(['v2']);
});

test('the live region is silent while Play runs and announces the step and phase on pause', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    const live = () => document.querySelector('[data-monotone-triangulation-live]')?.textContent;
    click('play-pause');
    tick(frames, 16);
    expect(graph.step).toBe(16);
    expect(live()).toBe('');
    click('play-pause');
    expect(live()).toContain('Korak 16 od 43');
    expect(live()).toContain('Faza: triangulacija kosa 1 od 2');
});

test('the monotone example shows the partition phase with no diagonal and says it is already monotone, then triangulates', () => {
    const graph = new Observed();
    mount(graph);
    load(graph, MONOTONE_TRIANGULATION_EXAMPLE_3);
    expect(graph.run().alreadyMonotone).toBe(true);
    goTo(graph, 16);
    expect(part('already-monotone')).toBeUndefined();
    goTo(graph, 17);
    expect(part('phase')).toBe('Faza: razdelitev');
    expect(part('diagonals')).toBe('Diagonal doslej še ni.');
    expect(part('already-monotone')).toBe('Večkotnik je že monoton glede na os y: razdelitev ne doda nobene diagonale in ostane en kos.');
    expect(objectsNamed(graph, 'monotone-diagonal')).toHaveLength(0);
    click('next-step');
    expect(part('phase')).toBe('Faza: triangulacija kosa 1 od 1');
    expect(part('already-monotone')).toContain('že monoton');
    expect(part('piece')).toBe('Kos 1 ima 8 oglišč in dobi 6 trikotnikov.');
    goTo(graph, graph.run().length - 1);
    expect(part('triangles')).toBe('Trikotnikov: 6 = n − 2 pri n = 8.');
    expect(objectsNamed(graph, 'monotonetri-triangle')).toHaveLength(6);
    expect(part('comparison-monotone')).toContain('13');
    expect(part('comparison-ear')).toContain('58');
    // A polygon that needed a diagonal does not carry the sentence.
    load(graph, MONOTONE_TRIANGULATION_EXAMPLE_2);
    goTo(graph, 20);
    expect(part('already-monotone')).toBeUndefined();
});

test('Next step repeated k times and Play advanced k ticks give the same state across the phase boundary', () => {
    const k = 20;
    const first = new Observed();
    const firstView = mount(first);
    for (let i = 0; i < k; i++) click('next-step');
    const expectedDrawn = drawn(first);
    const expectedPanel = panel();
    const expectedLists = [vertexList(), stackIds()];
    expect(first.step).toBe(k);
    expect(part('phase')).toBe('Faza: triangulacija kosa 1 od 2');
    expect(expectedDrawn.length).toBeGreaterThan(1);
    firstView.unmount();

    const frames = manualScheduler();
    const second = new Observed({}, frames.scheduler);
    mount(second);
    click('play-pause');
    tick(frames, k);
    expect(second.step).toBe(k);
    expect(drawn(second)).toEqual(expectedDrawn);
    expect(panel()).toEqual(expectedPanel);
    expect([vertexList(), stackIds()]).toEqual(expectedLists);
    tick(frames, 1000);
    expect([second.step, second.isPlaying, frames.callbacks.size]).toEqual([43, false, 0]);
    expect(button('play-pause').getAttribute('aria-disabled')).toBe('true');
});

test('an edit while playing in the triangulation phase returns to step 0 and pauses; Reset does the same', () => {
    const frames = manualScheduler();
    const graph = new Observed({}, frames.scheduler);
    mount(graph);
    click('play-pause');
    tick(frames, 20);
    expect(graph.step).toBe(20);
    act(() => { graph.movePointTo(0, {x: 1, y: -2}); });
    expect([graph.step, graph.isPlaying, frames.callbacks.size]).toEqual([0, false, 0]);
    expect(part('phase')).toBe('Faza: razdelitev');
    expect(objectsNamed(graph, 'monotonetri-chain-label')).toHaveLength(0);
    goTo(graph, 18);
    click('reset');
    expect([graph.step, graph.isPlaying]).toEqual([0, false]);
    expect(part('step')).toBe(`Korak 0 od ${graph.run().length - 1}`);
});

test('the three examples load and refusals are task 16\'s', () => {
    const graph = new Observed();
    mount(graph);
    click('example-3');
    expect(graph.model).toEqual(MONOTONE_TRIANGULATION_EXAMPLE_3);
    click('example-2');
    expect(graph.model).toEqual(MONOTONE_TRIANGULATION_EXAMPLE_2);
    click('example-1');
    expect(graph.model).toEqual(MONOTONE_TRIANGULATION_EXAMPLE_1);
    load(graph, polygon([0, 0], [4, 4], [4, 0], [0, 4]));
    expect(document.querySelector('[data-monotone-triangulation="refusal"]')?.getAttribute('role')).toBe('alert');
    expect(part('refusal')).toBe('Razdelitev je zavrnjena: roba e1 in e3 se sekata ali dotikata. Premakni oglišče, da bo večkotnik enostaven.');
    expect([graph.run().length, graph.step, traceObjects(graph).length]).toEqual([0, 0, 0]);
    expect(button('next-step').getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('[data-monotone-triangulation-lists]')).toBeNull();
    load(graph, polygon([0, 0], [4, 0]));
    expect(part('refusal')).toContain('vsaj tri oglišča');
});

test('the Preset keeps the polygon and the step across the phase boundary under its own key; a stale step is clamped', async () => {
    const graph = new Observed();
    mount(graph);
    goTo(graph, 20);
    act(() => { graph.saveCurrentPreset('mine'); });
    expect(graph.presets()).toBe(MONOTONE_TRIANGULATION_PRESET_KEY);
    expect(MONOTONE_TRIANGULATION_PRESET_KEY).not.toBe(MONOTONE_PARTITION_PRESET_KEY);
    const saved = graph.exportPreset();
    expect(saved.graphState).toMatchObject({step: 20});
    load(graph, polygon([0, 0], [4, 0], [0, 4]));
    expect(graph.step).toBe(0);
    await settle(() => graph.selectPreset('mine'));
    expect([graph.step, graph.model, graph.isPlaying]).toEqual([20, MONOTONE_TRIANGULATION_EXAMPLE_1, false]);
    expect(part('phase')).toBe('Faza: triangulacija kosa 1 od 2');
    expect(chainLabels(graph)).toHaveLength(4);
    act(() => { graph.importPreset({id: MONOTONE_TRIANGULATION_PRESET_KEY, graphState: saveState({step: 999999}), data: MONOTONE_TRIANGULATION_EXAMPLE_3}); });
    expect(graph.step).toBe(57);
    expect(graph.model).toEqual(MONOTONE_TRIANGULATION_EXAMPLE_3);
    act(() => { graph.importPreset({id: MONOTONE_TRIANGULATION_PRESET_KEY, graphState: saveState({step: -4}), data: MONOTONE_TRIANGULATION_EXAMPLE_2}); });
    expect(graph.step).toBe(0);
});

test('a language switch re-renders the panel, the side lists and the board labels in the triangulation phase and keeps the step', () => {
    const graph = new Observed();
    mount(graph);
    goTo(graph, 35);
    const before = traceObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY]);
    act(() => { setLanguage('en'); });
    expect(part('step')).toBe('Step 35 of 43');
    expect(part('phase')).toBe('Phase: triangulation of piece 2 of 2');
    expect(part('test')).toBe('Current test: vertex v2 and vertex v4, the diagonal is outside.');
    expect(part('vertex')).toBe('v2 — left chain');
    expect(button('next-step').textContent).toBe('Next step');
    expect(button('example-3').textContent).toBe('Example 3: already monotone');
    expect(document.querySelector('[data-monotone-triangulation-list="status"] p')?.textContent).toBe('Stack (from bottom to top)');
    expect(entries('queue', 'data-next')[0].title).toBe('v2 — left chain');
    expect(objectsNamed(graph, 'monotonetri-test-label').map(o => o.plaintext)).toEqual(['outside']);
    expect(traceObjects(graph).map(o => [o.name, o.elType, o.dataX, o.dataY])).toEqual(before);
    goTo(graph, 43);
    expect(part('comparison-monotone')).toBe('Monotone method (partition and triangulation): 11 predicate evaluations.');
    expect(part('comparison-note')).toBe('Small counts illustrate this; they do not prove it.');
    expect(part('triangles')).toBe('Triangles: 4 = n − 2 with n = 6.');
    act(() => { setLanguage('sl'); });
    expect(part('comparison-note')).toBe('Majhna števila to ponazarjajo, ne dokazujejo.');
    expect(graph.step).toBe(43);
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
    tick(frames, 20);
    expect(frames.callbacks.size).toBe(1);
    expect(languageListeners.live).toBeGreaterThan(0);
    expect(objectsNamed(graph, 'monotonetri-chain-label').length).toBeGreaterThan(0);
    view.unmount();
    expect(graph.isPlaying).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(frames.frame(MONOTONE_PARTITION_STEP_INTERVAL_MS)).toBe(false);
    expect(languageListeners.live).toBe(0);
    expect(remove.mock.calls.filter(([type, listener]) => type === 'keydown' && listener === graph['onKeyDown'])).toHaveLength(1);
    expect(box.childElementCount).toBe(0);
    expect(() => act(() => { setLanguage('en'); })).not.toThrow();
});
