import {act, fireEvent, screen} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {t} from '../../localization';
import {PhasePortraitGraph} from './PhasePortraitGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

function mountRun() {
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
    return {graph, frames};
}

test('a learner drag of the time slider while playing pauses playback and the time stays where the drag left it', () => {
    const {graph, frames} = mountRun();
    act(() => { screen.getByRole('button', {name: t('play')}).click(); });
    frames(3);
    const slider = screen.getAllByRole('slider').find(el => (el as HTMLInputElement).max !== '' && Number((el as HTMLInputElement).step) < 1) as HTMLInputElement;
    fireEvent.pointerDown(slider);
    act(() => { fireEvent.change(slider, {target: {value: '5'}}); });
    frames(1);
    fireEvent.pointerUp(slider);
    frames(3);
    expect(graph.playing).toBe(false);
    expect(graph.time).toBeCloseTo(5);
});
