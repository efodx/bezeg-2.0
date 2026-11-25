import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from '../../graphs/dynamics/PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {CountParameter, RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {sampledRange} from '../../graphs/base/preview/previewGeometry';
import {message} from '../../localization';
import {CountPuck} from '../pucks/CountPuck';
import {RangePuck} from '../pucks/RangePuck';
import {snapValue} from '../pucks/pucksModel';
import {planRangeSweep} from '../sweep/sweepModel';
import {pathData} from './GhostOverlay';
import {FAN_REST_MS, fanValues} from './fan';
import {PreviewHost} from './PreviewHost';
import {ParameterPuck} from '../pucks/ParameterPuck';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
let nextId = 1;
const frame = () => { const run = queue; queue = []; act(() => { for (const entry of run) entry.callback(0); }); };
beforeEach(() => {
    queue = [];
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout']});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextId++; queue.push({id, callback}); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queue = queue.filter(entry => entry.id !== id); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

function pointer(target: Element, type: string, init: MouseEventInit = {}, pointerType = 'mouse') {
    const event = new MouseEvent(type, {bubbles: true, cancelable: true, ...init});
    Object.defineProperty(event, 'pointerType', {value: pointerType});
    act(() => { target.dispatchEvent(event); });
}
const rest = () => act(() => { vi.advanceTimersByTime(FAN_REST_MS + 20); });

function setup(frameKey: unknown = 0) {
    const graph = new PhasePortraitGraph();
    mountGraph(graph);
    // `phase-a` declares no help yet, so the test gives it one.
    const parameter = {...(graph.getDeclaration()!.parameters!.find(candidate => candidate.key === 'phase-a') as RangeParameter), help: message('workspace_notes_less')};
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = render(<PreviewHost graph={graph} width={600} height={400} frame={frameKey}><ParameterPuck graph={graph} parameter={parameter}/></PreviewHost>, {container: host});
    const body = () => host.querySelector(`[data-puck-key="phase-a"] .puck-body`)!;
    const paths = () => Array.from(host.querySelectorAll('[data-ghost-overlay] path'));
    const geometry = (value: number) => {
        const adapter = graph.mainViewAdapter!;
        const box = adapter.fitted() ?? adapter.intent().box;
        const curves = graph.getPreviewGeometry()!({state: graph.state, preset: graph.exportPreset()}, 'phase-a', value, sampledRange(box));
        return Object.values(curves).flat().map(path => pathData(path, box, 600, 400));
    };
    return {graph, parameter, host, view, body, paths, geometry};
}

describe('the overview fan on a range puck body', () => {
    test('fan values: five on the step grid across the sweep window, the current one left out', () => {
        const {graph, parameter} = setup();
        const current = Number(graph.parameters!.read('phase-a'));
        const values = fanValues(parameter, current);
        const plan = planRangeSweep(parameter, current);
        expect(values.length).toBeGreaterThanOrEqual(4);
        expect(values.length).toBeLessThanOrEqual(5);
        expect(values).not.toContain(current);
        for (const v of values) {
            expect(v).toBe(snapValue(v, parameter));
            expect(v).toBeGreaterThanOrEqual(plan.centre - plan.halfWidth - 1e-9);
            expect(v).toBeLessThanOrEqual(plan.centre + plan.halfWidth + 1e-9);
        }
    });

    test('a rest on the body draws one ghost set per fan value, with the help card, and writes nothing', () => {
        const {graph, parameter, host, body, paths, geometry} = setup();
        const exported = JSON.stringify(graph.exportPreset());
        const arbiter = graph.parameters!;
        const leases = arbiter.activeLeases().length;
        pointer(body(), 'pointerover');
        act(() => { vi.advanceTimersByTime(FAN_REST_MS - 50); });
        frame();
        expect(paths().length).toBe(0);
        rest();
        frame();
        const expected = fanValues(parameter, Number(arbiter.read('phase-a'))).flatMap(geometry);
        expect(expected.length).toBeGreaterThan(0);
        expect(paths().map(path => path.getAttribute('d'))).toEqual(expected);
        expect(paths().some(path => path.classList.contains('is-near'))).toBe(true);
        expect(paths().some(path => !path.classList.contains('is-near'))).toBe(true);
        expect(host.querySelector('.puck-tip')?.textContent).not.toMatch(/Klik/);
        expect(host.querySelector('.puck-tip')?.textContent).toBeTruthy();
        expect(JSON.stringify(graph.exportPreset())).toBe(exported);
        expect(arbiter.activeLeases().length).toBe(leases);
    });

    test('at most one geometry call per fan value', () => {
        const {graph, parameter, body} = setup();
        const real = graph.getPreviewGeometry()!;
        const calls = vi.fn(real);
        vi.spyOn(graph, 'getPreviewGeometry').mockReturnValue(calls);
        pointer(body(), 'pointerover');
        rest();
        frame();
        expect(calls.mock.calls.length).toBe(fanValues(parameter, Number(graph.parameters!.read('phase-a'))).length);
        expect(calls.mock.calls.length).toBeLessThanOrEqual(5);
    });

    test('leaving, pressing and a frame change clear the fan', () => {
        const {graph, parameter, host, body, paths, view} = setup('one');
        pointer(body(), 'pointerover');
        rest(); frame();
        expect(paths().length).toBeGreaterThan(0);
        pointer(body(), 'pointerout');
        expect(paths().length).toBe(0);
        expect(queue.length).toBe(0);
        pointer(body(), 'pointerover');
        rest(); frame();
        expect(paths().length).toBeGreaterThan(0);
        pointer(body(), 'pointerdown', {clientX: 5, clientY: 5});
        expect(paths().length).toBe(0);
        pointer(body(), 'pointerup', {clientX: 5, clientY: 5});
        pointer(body(), 'pointerout');
        pointer(body(), 'pointerover');
        rest(); frame();
        expect(paths().length).toBeGreaterThan(0);
        render(<PreviewHost graph={graph} width={600} height={400} frame="two"><ParameterPuck graph={graph} parameter={parameter}/></PreviewHost>, {container: host});
        expect(paths().length).toBe(0);
        view.unmount();
        expect(queue.length).toBe(0);
    });

    test('a pointer that leaves before the rest never shows the fan', () => {
        const {body, paths} = setup();
        pointer(body(), 'pointerover');
        pointer(body(), 'pointerout');
        rest(); frame();
        expect(paths().length).toBe(0);
    });

    test('touch shows no fan', () => {
        const {body, paths} = setup();
        pointer(body(), 'pointerover', {}, 'touch');
        rest(); frame();
        expect(paths().length).toBe(0);
    });

    test('a sweep starting on the key clears the fan', () => {
        const graph = new PhasePortraitGraph();
        mountGraph(graph);
        const parameter = graph.getDeclaration()!.parameters!.find(candidate => candidate.key === 'phase-a') as RangeParameter;
        const host = document.createElement('div');
        document.body.appendChild(host);
        const ui = (running: boolean) => <PreviewHost graph={graph} width={600} height={400}>
            <RangePuck parameter={parameter} value={parameter.min + (parameter.max - parameter.min) / 2} onWrite={vi.fn()} sweep={{running, toggle: vi.fn()}}/>
        </PreviewHost>;
        const view = render(ui(false), {container: host});
        pointer(host.querySelector('.puck-body')!, 'pointerover');
        rest(); frame();
        expect(host.querySelectorAll('[data-ghost-overlay] path').length).toBeGreaterThan(0);
        view.rerender(ui(true));
        expect(host.querySelectorAll('[data-ghost-overlay] path').length).toBe(0);
        expect(queue.length).toBe(0);
    });
});

describe('the count puck help points to the previews', () => {
    const count = {kind: 'count', key: 'phase-a', label: message('workspace_notes_less'), help: message('workspace_notes_less'), min: 0, max: 5, previewable: true} as unknown as CountParameter;
    test('a previewable count shows the line in its help card, and its body shows no ghost', () => {
        const graph = new PhasePortraitGraph();
        mountGraph(graph);
        const host = document.createElement('div');
        document.body.appendChild(host);
        render(<PreviewHost graph={graph} width={600} height={400}><CountPuck parameter={count} value={2} onWrite={vi.fn()}/></PreviewHost>, {container: host});
        const body = host.querySelector('.puck-body')!;
        pointer(body, 'pointerover');
        rest(); frame();
        expect(host.querySelector('.puck-tip')?.textContent).toMatch(/−|\+/);
        expect(host.querySelectorAll('[data-ghost-overlay] path').length).toBe(0);
    });
    test('a count that is not previewable has no such line', () => {
        const graph = new PhasePortraitGraph();
        mountGraph(graph);
        const host = document.createElement('div');
        document.body.appendChild(host);
        render(<PreviewHost graph={graph} width={600} height={400}><CountPuck parameter={{...count, previewable: undefined} as unknown as CountParameter} value={2} onWrite={vi.fn()}/></PreviewHost>, {container: host});
        pointer(host.querySelector('.puck-body')!, 'pointerover');
        expect(host.querySelector('.puck-tip')?.textContent ?? '').not.toMatch(/−|\+/);
    });
});
