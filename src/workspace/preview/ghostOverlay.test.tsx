import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, describe, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from '../../graphs/dynamics/PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import type {CountParameter} from '../../graphs/base/declare/graphDeclaration';
import {CountPuck} from '../pucks/CountPuck';
import {message} from '../../localization';
import {runAs} from '../../graphs/base/writes/writeSource';
import {sampledRange} from '../../graphs/base/preview/previewGeometry';
import {ParameterPuck} from '../pucks/ParameterPuck';
import {pathData} from './GhostOverlay';
import {PreviewHost} from './PreviewHost';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

// One animation frame at a time: the controller's frame loop is flushed by hand.
let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
let nextId = 1;
const frame = () => { const run = queue; queue = []; act(() => { for (const entry of run) entry.callback(0); }); };
beforeEach(() => {
    queue = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = nextId++; queue.push({id, callback}); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queue = queue.filter(entry => entry.id !== id); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function pointer(target: Element, type: string, init: MouseEventInit, pointerType = 'mouse') {
    const event = new MouseEvent(type, {bubbles: true, cancelable: true, ...init});
    Object.defineProperty(event, 'pointerType', {value: pointerType});
    act(() => { target.dispatchEvent(event); });
}

const ghost = (host: Element) => host.querySelector('[data-ghost-overlay]');

function setup(key = 'phase-a', frameKey: unknown = 0) {
    const graph = new PhasePortraitGraph();
    mountGraph(graph);
    const parameter = graph.getDeclaration()!.parameters!.find(candidate => candidate.key === key) as RangeParameter;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = render(<PreviewHost graph={graph} width={600} height={400} frame={frameKey}><ParameterPuck graph={graph} parameter={parameter}/></PreviewHost>, {container: host});
    const track = () => host.querySelector(`[data-puck-key="${key}"] .puck-track`)!;
    const ghost = () => host.querySelector('[data-ghost-overlay]');
    const geometry = (value: number) => {
        const adapter = graph.mainViewAdapter!;
        const box = adapter.fitted() ?? adapter.intent().box;
        const curves = graph.getPreviewGeometry()!({state: graph.state, preset: graph.exportPreset()}, key, value, sampledRange(box));
        return Object.values(curves).flat().map(path => pathData(path, box, 600, 400));
    };
    return {graph, parameter, host, view, track, ghost, geometry};
}

describe('the ghost preview of a hovered range puck', () => {
    test('hovering the a puck track draws the geometry at the hovered value, and leaving clears it', () => {
        const {graph, parameter, track, ghost, geometry} = setup();
        const exported = JSON.stringify(graph.exportPreset());
        const arbiter = graph.parameters!;
        const value = arbiter.read('phase-a');
        const leases = arbiter.activeLeases().length;
        pointer(track(), 'pointermove', {clientX: 150});
        expect(ghost()).toBeNull();
        frame();
        const drawn = Array.from(ghost()!.querySelectorAll('path')).map(path => path.getAttribute('d'));
        // The value under the pointer is the click-jump's: a quarter of the way along the track.
        const target = Math.round((parameter.min + 0.25 * (parameter.max - parameter.min)) / parameter.step) * parameter.step;
        expect(drawn.length).toBeGreaterThan(0);
        expect(drawn).toEqual(geometry(Number(target.toFixed(6))));
        expect(ghost()!.getAttribute('aria-hidden')).toBe('true');
        expect(JSON.stringify(graph.exportPreset())).toBe(exported);
        expect(arbiter.read('phase-a')).toBe(value);
        expect(arbiter.activeLeases().length).toBe(leases);
        pointer(track(), 'pointerout', {});
        expect(ghost()).toBeNull();
        expect(queue.length).toBe(0);
    });

    test('a touch pointer shows no ghost', () => {
        const {track, ghost} = setup();
        pointer(track(), 'pointermove', {clientX: 150}, 'touch');
        frame();
        expect(ghost()).toBeNull();
        expect(queue.length).toBe(0);
    });

    test('a puck that is not previewable shows no ghost', () => {
        const {graph, host, ghost} = setup();
        const other = graph.getDeclaration()!.parameters!.find(candidate => candidate.kind === 'range' && candidate.placement === 'board' && candidate.key !== 'phase-a') as RangeParameter | undefined;
        expect(other?.previewable).toBeUndefined();
        render(<PreviewHost graph={graph} width={600} height={400}><ParameterPuck graph={graph} parameter={other!}/></PreviewHost>, {container: host.appendChild(document.createElement('div'))});
        pointer(host.querySelector(`[data-puck-key="${other!.key}"] .puck-track`)!, 'pointermove', {clientX: 150});
        frame();
        expect(ghost()).toBeNull();
    });

    test('a change of the lesson frame clears the ghost', () => {
        const {graph, parameter, host, track, ghost} = setup('phase-a', 'one');
        pointer(track(), 'pointermove', {clientX: 150});
        frame();
        expect(ghost()).not.toBeNull();
        render(<PreviewHost graph={graph} width={600} height={400} frame="two"><ParameterPuck graph={graph} parameter={parameter}/></PreviewHost>, {container: host});
        expect(ghost()).toBeNull();
    });

    test('unmounting leaves no pending frame', () => {
        const {track, ghost, view} = setup();
        pointer(track(), 'pointermove', {clientX: 150});
        frame();
        expect(ghost()).not.toBeNull();
        expect(queue.length).toBe(1); // the loop looks again next frame while a ghost shows
        view.unmount();
        expect(queue.length).toBe(0);
    });

    test.each([['locked', {locked: true}], ['no longer previewable', {previewable: undefined}]])('a puck that becomes %s while hovered drops the ghost and the hint', (_name, change) => {
        const {graph, parameter, host, track, ghost} = setup();
        pointer(track(), 'pointermove', {clientX: 150});
        frame();
        expect(ghost()).not.toBeNull();
        expect(host.querySelector('.puck-tip')?.textContent).toMatch(/^Klik: /);
        render(<PreviewHost graph={graph} width={600} height={400}><ParameterPuck graph={graph} parameter={{...parameter, ...change} as RangeParameter}/></PreviewHost>, {container: host});
        expect(ghost()).toBeNull();
        expect(host.querySelector('.puck-tip')?.textContent ?? '').not.toMatch(/Klik/);
        expect(queue.length).toBe(0);
    });

    test('the count puck hint reappears after a click while still hovering', () => {
        const graph = new PhasePortraitGraph();
        mountGraph(graph);
        const count = {kind: 'count', key: 'phase-a', label: message('workspace_notes_less'), min: 0, max: 5, previewable: true} as unknown as CountParameter;
        const host = document.createElement('div');
        document.body.appendChild(host);
        const ui = (value: number) => <PreviewHost graph={graph} width={600} height={400}><CountPuck parameter={count} value={value} onWrite={vi.fn()}/></PreviewHost>;
        const view = render(ui(2), {container: host});
        const plus = Array.from(host.querySelectorAll('button')).find(b => /Pove|Increase/i.test(b.getAttribute('aria-label') ?? ''))!;
        pointer(plus, 'pointerover', {});
        expect(host.querySelector('.puck-tip')?.textContent).toBe('Klik: 3');
        act(() => { plus.dispatchEvent(new MouseEvent('click', {bubbles: true})); });
        view.rerender(ui(3));
        expect(host.querySelector('.puck-tip')?.textContent).toBe('Klik: 4');
        frame();
        expect(ghost(host)).not.toBeNull();
    });

    test('the snapshot is refreshed after a store version change', () => {
        const {graph, track} = setup();
        const scenes: Array<unknown> = [];
        const real = graph.getPreviewGeometry()!;
        vi.spyOn(graph, 'getPreviewGeometry').mockReturnValue((scene, key, value, range) => { scenes.push(scene.preset); return real(scene, key, value, range); });
        pointer(track(), 'pointermove', {clientX: 150});
        frame();
        expect(scenes.length).toBe(1);
        act(() => { graph.store.notify(); });
        frame();
        expect(scenes.length).toBe(2);
        expect(scenes[1]).not.toBe(scenes[0]);
    });

    test('a view change redraws the ghost from the new box', () => {
        const {graph, track, ghost} = setup();
        pointer(track(), 'pointermove', {clientX: 150});
        frame();
        const before = ghost()!.querySelector('path')!.getAttribute('d');
        const [l, t, r, b] = graph.mainViewAdapter!.intent().box;
        act(() => { runAs('learner', () => graph.mainViewAdapter!.setIntent([l * 2, t * 2, r * 2, b * 2])); });
        frame();
        expect(ghost()!.querySelector('path')!.getAttribute('d')).not.toBe(before);
    });
});
