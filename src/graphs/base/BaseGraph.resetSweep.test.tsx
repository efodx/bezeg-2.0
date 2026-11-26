import {act} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../allGraphFactories';
import {appStorage} from '../../storage/appStorage';
import {sweepsFor} from '../../workspace/sweep/sweeps';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from './realGraphTestHarness';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(() => {
    installBoardShims();
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
});
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

test('Reset preset ends a count sweep that sits at the reset value, and the value stays', async () => {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const {graph} = mountGraph(graphFactories.taylor());
    await waitForPucks();
    const parameters = graph.parameters!;
    const sweeps = sweepsFor(parameters);
    const at = parameters.read('taylor-degree');
    expect(sweeps.start({kind: 'count', key: 'taylor-degree', label: {} as never, placement: 'board', min: 0, max: 10})).toBe(true);
    expect(sweeps.isRunning('taylor-degree')).toBe(true);
    await act(async () => { await graph.reset(); });
    expect(sweeps.isRunning('taylor-degree')).toBe(false);
    expect(parameters.activeLeases()).toHaveLength(0);
    for (let i = 0; i < 40; i++) {
        const due = pending;
        pending = [];
        time += 100;
        act(() => due.forEach(callback => callback(time)));
    }
    expect(parameters.read('taylor-degree')).toBe(at);
});
