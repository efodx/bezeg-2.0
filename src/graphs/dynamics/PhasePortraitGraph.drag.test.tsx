import {act, fireEvent, screen} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {installBoardShims, mountGraph, puckControl, REAL_GRAPH_TEST_TIMEOUT, typePuck, waitForPucks, waitUntil} from '../base/realGraphTestHarness';
import {t} from '../../localization';
import {PhasePortraitGraph} from './PhasePortraitGraph';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

/** The board layout may fold Orodja at load (it keeps a budget of open cards): open it as a learner would, with its fold button. */
async function openTools() {
    await waitUntil(() => document.querySelector('#board-card-tools .board-card-fold') !== null);
    const fold = document.querySelector<HTMLElement>('#board-card-tools .board-card-fold')!;
    if (fold.getAttribute('aria-expanded') === 'false') act(() => { fold.click(); });
    await waitUntil(() => screen.queryByRole('button', {name: t('play')}) !== null);
}

async function mountRun() {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(new PhasePortraitGraph()).graph as PhasePortraitGraph;
    const frames = (count: number) => {
        for (let i = 0; i < count; i++) {
            const due = pending;
            pending = [];
            time += 100;
            act(() => due.forEach(callback => callback(time)));
        }
    };
    await waitForPucks('phase-time');
    await openTools();
    return {graph, frames};
}

test('a learner drag of the time slider while playing pauses playback and the time stays where the drag left it', async () => {
    const {graph, frames} = await mountRun();
    act(() => { screen.getByRole('button', {name: t('play')}).click(); });
    frames(3);
    const slider = puckControl('phase-time');
    fireEvent.pointerDown(slider);
    typePuck('phase-time', '5');
    frames(1);
    fireEvent.pointerUp(slider);
    frames(3);
    expect(graph.playing).toBe(false);
    expect(graph.time).toBeCloseTo(5);
});
