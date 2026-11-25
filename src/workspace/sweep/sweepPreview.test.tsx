// A hover preview during a sweep leaves the graph's preset export as it was (parameter-writes acceptance 3) and the ghost keeps working.
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {PhasePortraitGraph} from '../../graphs/dynamics/PhasePortraitGraph';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {RangeParameter} from '../../graphs/base/declare/graphDeclaration';
import {ParameterPuck} from '../pucks/ParameterPuck';
import {PreviewHost} from '../preview/PreviewHost';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);

let queue: Array<{id: number; callback: FrameRequestCallback}> = [];
let next = 1;
const frame = (time: number) => { const run = queue; queue = []; act(() => { for (const entry of run) entry.callback(time); }); };
beforeEach(() => {
    queue = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = next++; queue.push({id, callback}); return id; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { queue = queue.filter(entry => entry.id !== id); });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test('a ghost preview of the swept puck changes neither the export nor the live value, and the sweep goes on', () => {
    const graph = new PhasePortraitGraph();
    mountGraph(graph);
    const parameter = graph.getDeclaration()!.parameters!.find(candidate => candidate.key === 'phase-a') as RangeParameter;
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<PreviewHost graph={graph} width={600} height={400} frame={0}><ParameterPuck graph={graph} parameter={parameter}/></PreviewHost>, {container: host});
    const arbiter = graph.parameters!;
    fireEvent.click(screen.getByRole('button', {name: /Samodejno premikanje/}));
    frame(0);
    frame(1000);
    const swept = arbiter.read('phase-a');
    expect(swept).not.toBe(parameter.min);
    const exported = JSON.stringify(graph.exportPreset());
    const track = host.querySelector('[data-puck-key="phase-a"] .puck-track')!;
    const move = new MouseEvent('pointermove', {bubbles: true, cancelable: true, clientX: 150});
    Object.defineProperty(move, 'pointerType', {value: 'mouse'});
    act(() => { track.dispatchEvent(move); });
    frame(1000);
    expect(host.querySelector('[data-ghost-overlay]')).not.toBeNull();
    expect(JSON.stringify(graph.exportPreset())).toBe(exported);
    expect(arbiter.read('phase-a')).toBe(swept);
    expect(screen.getByRole('button', {name: /Samodejno premikanje/})).toHaveAttribute('aria-pressed', 'true');
    frame(2000);
    expect(arbiter.read('phase-a')).not.toBe(swept);
});
