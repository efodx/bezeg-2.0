/** Wave 2 slice K3: the interpolation family and the alpha parametrisations on the shared controls (refusal channel, one live region, typed points). */
import {act, screen} from '@testing-library/react';
import {appStorage} from '../../../storage/appStorage';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitUntil} from '../../base/realGraphTestHarness';
import type {DemonstrationId} from '../../../demonstrations';
import {enterNumber} from '../../../inputs/testEntry';
import {curveAccess} from '../../base/curveGraphTestAccess';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const notice = () => document.querySelector('[data-refusal-notice] p');
const liveRegions = () => document.querySelectorAll('[data-readout-live]').length;

async function mount(id: DemonstrationId) {
    const graph = createGraph(id) as any;
    mountGraph(graph);
    await waitUntil(() => graph.state.initialized === true);
    return graph;
}

test('Lagrange interpolation: a refused move shows its reason alone in the refusal channel, the next accepted edit clears it; one live region', async () => {
    const graph = await mount('interp-lagrange');
    act(() => graph.setParameterRule('chord'));
    act(() => { graph.movePoint(1, graph.state.points[0][0], graph.state.points[0][1]); });
    expect(notice()).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => graph.setPosition(0.4));
    expect(notice()).toBeNull();
    expect(liveRegions()).toBe(1);
});

test('Hermite: a refused move goes to the refusal channel and the next accepted edit clears it', async () => {
    const graph = await mount('interp-hermite');
    act(() => graph.setParameterRule('chord'));
    act(() => { graph.movePoint(1, graph.state.points[0][0], graph.state.points[0][1]); });
    expect(notice()).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => graph.setShowBezier(!graph.state.showBezier));
    expect(notice()).toBeNull();
});

test('Subdivision curves: closing refusal goes to the refusal channel; the status lines carry no live role and the graph has one live region', async () => {
    const graph = await mount('interp-subdivision');
    act(() => graph.importPresetData({...graph.exportPresetData(), points: [[0, 0], [4, 0]], closed: false, round: 0}));
    act(() => graph.setClosed(true));
    expect(notice()).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    const lines = document.querySelectorAll('p[data-subdivision-status]');
    expect(lines.length).toBeGreaterThan(0);
    expect(document.querySelector('[data-subdivision-status]')!.closest('[role="status"], [aria-live]')).toBeNull();
    expect(liveRegions()).toBe(1);
    act(() => graph.addPoint());
    expect(notice()).toBeNull();
});

test.each<DemonstrationId>(['weighted-parameterization', 'spline-parameterization'])('%s: a typed coordinate moves the first point of the curve', async id => {
    const graph = await mount(id);
    await waitUntil(() => screen.queryByRole('spinbutton', {name: 'p₀, x'}) !== null);
    const first = () => curveAccess(graph).first().getJxgPoints()[0];
    const before = first().Y();
    enterNumber(screen.getByRole('spinbutton', {name: 'p₀, x'}), '2.25');
    expect(first().X()).toBe(2.25);
    expect(first().Y()).toBe(before);
});
