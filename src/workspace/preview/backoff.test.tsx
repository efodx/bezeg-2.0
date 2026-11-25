// Task 06 slice 4: a graph whose capture is over budget captures after a pointer rest, in idle time, latest value wins.
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from '../../graphs/dynamics/PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {sampledRange} from '../../graphs/base/preview/previewGeometry';
import {ParameterPuck} from '../pucks/ParameterPuck';
import {pathData} from './GhostOverlay';
import {PreviewHost} from './PreviewHost';
import {BACKOFF_REST_MS, PREVIEW_BUDGET_MS} from './previewController';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
let idle: Array<{id: number; callback: () => void}> = [];
let nextId = 1;
let clock = 0;
const frame = () => { const run = queue; queue = []; act(() => { for (const entry of run) entry.callback(0); }); };
const runIdle = () => { const run = idle; idle = []; act(() => { for (const entry of run) entry.callback(); }); };
const wait = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

beforeEach(() => {
    queue = []; idle = []; clock = 0;
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextId++; queue.push({id, callback}); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queue = queue.filter(entry => entry.id !== id); });
    Object.assign(globalThis, {
        requestIdleCallback: (callback: () => void) => { const id = nextId++; idle.push({id, callback}); return id; },
        cancelIdleCallback: (id: number) => { idle = idle.filter(entry => entry.id !== id); },
    });
});
afterEach(() => {
    cleanup(); vi.useRealTimers(); vi.restoreAllMocks();
    delete (globalThis as {requestIdleCallback?: unknown}).requestIdleCallback;
    delete (globalThis as {cancelIdleCallback?: unknown}).cancelIdleCallback;
});

function pointer(target: Element, type: string, init: MouseEventInit = {}) {
    const event = new MouseEvent(type, {bubbles: true, cancelable: true, ...init});
    Object.defineProperty(event, 'pointerType', {value: 'mouse'});
    act(() => { target.dispatchEvent(event); });
}

/** The phase portrait with a geometry function that "costs" `cost.ms` on the fake clock. */
function setup(cost: {ms: number}) {
    const graph = new PhasePortraitGraph();
    mountGraph(graph);
    const real = graph.getPreviewGeometry()!;
    const calls: number[] = [];
    vi.spyOn(graph, 'getPreviewGeometry').mockReturnValue((scene, key, value, range) => { calls.push(value); clock += cost.ms; return real(scene, key, value, range); });
    const parameter = graph.getDeclaration()!.parameters!.find(candidate => candidate.key === 'phase-a') as RangeParameter;
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<PreviewHost graph={graph} width={600} height={400}><ParameterPuck graph={graph} parameter={parameter}/></PreviewHost>, {container: host});
    const track = () => host.querySelector('[data-puck-key="phase-a"] .puck-track')!;
    const ghost = () => host.querySelector('[data-ghost-overlay]');
    const tip = () => host.querySelector('.puck-tip')?.textContent;
    const drawn = () => Array.from(ghost()!.querySelectorAll('path')).map(path => path.getAttribute('d'));
    const expected = (value: number) => {
        const box = graph.mainViewAdapter!.intent().box;
        const curves = real({state: graph.state, preset: graph.exportPreset()}, 'phase-a', value, sampledRange(box));
        return Object.values(curves).flat().map(path => pathData(path, box, 600, 400));
    };
    /** One hover that measures the cost, then leaves: the next hovers know the graph. */
    const prime = () => { pointer(track(), 'pointermove', {clientX: 50}); frame(); pointer(track(), 'pointerout'); calls.length = 0; };
    return {graph, host, track, ghost, tip, drawn, expected, calls, prime};
}

describe('capture back-off for an over-budget preview', () => {
    test('captures only after the rest delay, in idle time; the value text shows at once', () => {
        const cost = {ms: PREVIEW_BUDGET_MS + 10};
        const {track, ghost, tip, drawn, expected, calls, prime} = setup(cost);
        prime();
        pointer(track(), 'pointermove', {clientX: 150});
        expect(tip()).toMatch(/^Klik: /);
        frame();
        wait(BACKOFF_REST_MS - 1);
        expect(calls).toEqual([]);
        expect(ghost()).toBeNull();
        wait(1);
        expect(calls).toEqual([]); // the rest is over, the idle moment has not come
        expect(idle.length).toBe(1);
        runIdle();
        expect(calls.length).toBe(1);
        expect(drawn()).toEqual(expected(calls[0]));
    });

    test('a pointer that moves on before the rest captures nothing, and a newer value replaces a pending one', () => {
        const cost = {ms: PREVIEW_BUDGET_MS + 10};
        const {track, drawn, expected, calls, prime} = setup(cost);
        prime();
        pointer(track(), 'pointermove', {clientX: 100});
        frame();
        wait(BACKOFF_REST_MS - 20);
        pointer(track(), 'pointermove', {clientX: 300});
        frame();
        wait(BACKOFF_REST_MS - 20);
        expect(calls).toEqual([]);
        wait(40);
        runIdle();
        expect(calls.length).toBe(1);
        expect(drawn()).toEqual(expected(calls[0]));
        pointer(track(), 'pointermove', {clientX: 500});
        wait(BACKOFF_REST_MS);
        pointer(track(), 'pointermove', {clientX: 200}); // replaces the value that waited for an idle moment
        wait(BACKOFF_REST_MS);
        runIdle();
        expect(calls.length).toBe(2);
        expect(idle.length).toBe(0);
    });

    test('leaving cancels the wait and the idle callback', () => {
        const cost = {ms: PREVIEW_BUDGET_MS + 10};
        const {track, ghost, calls, prime} = setup(cost);
        prime();
        pointer(track(), 'pointermove', {clientX: 150});
        wait(BACKOFF_REST_MS - 10);
        pointer(track(), 'pointerout');
        wait(1000);
        runIdle();
        expect(calls).toEqual([]);
        pointer(track(), 'pointermove', {clientX: 150});
        wait(BACKOFF_REST_MS);
        expect(idle.length).toBe(1);
        pointer(track(), 'pointerout');
        expect(idle.length).toBe(0);
        runIdle();
        expect(calls).toEqual([]);
        expect(ghost()).toBeNull();
    });

    test('a graph under budget captures in the next frame, with no wait and no idle callback', () => {
        const cost = {ms: PREVIEW_BUDGET_MS - 1};
        const {track, ghost, calls, prime} = setup(cost);
        prime();
        pointer(track(), 'pointermove', {clientX: 150});
        frame();
        expect(calls.length).toBe(1);
        expect(ghost()).not.toBeNull();
        expect(idle.length).toBe(0);
    });

    test('a capture, also during a lesson morph, writes nothing and refits no view', () => {
        const cost = {ms: PREVIEW_BUDGET_MS + 10};
        const {graph, track, ghost, calls, prime} = setup(cost);
        prime();
        const arbiter = graph.parameters!;
        const adapter = graph.mainViewAdapter!;
        const morph = graph['lessonMorph']!;
        act(() => { morph.step(() => { arbiter.write('phase-a', 2, 'lesson'); }); });
        const exported = JSON.stringify(graph.exportPreset());
        const leases = arbiter.activeLeases().length;
        const value = arbiter.read('phase-a');
        const fit = vi.spyOn(adapter, 'setFitted'), intent = vi.spyOn(adapter, 'setIntent');
        pointer(track(), 'pointermove', {clientX: 150});
        wait(BACKOFF_REST_MS);
        runIdle();
        expect(calls.length).toBe(1);
        expect(ghost()).not.toBeNull();
        pointer(track(), 'pointerout');
        expect(JSON.stringify(graph.exportPreset())).toBe(exported);
        expect(arbiter.read('phase-a')).toBe(value);
        expect(arbiter.activeLeases().length).toBe(leases);
        expect(fit).not.toHaveBeenCalled();
        expect(intent).not.toHaveBeenCalled();
    });
});
