/**
 * Playback draws every frame and the controls follow it, but the intermediate parameter values are not written to the
 * scene store: a playing frame must not re-render the whole workspace (GraphHost). The store `t` is exact wherever
 * playback ends or is steered.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import BaseGraph, {BaseGraphState} from '../../base/BaseGraph';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {t} from '../../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

type Run = BaseGraph<BaseGraphState> & {
    parameter: number;
    state: {t: number; animationStatus: string};
    getGraphCommands(): JSX.Element[];
    setLessonAnimation?(action: 'play' | 'pause' | 'replay' | 'stop'): void;
};

function mountRun(key: 'decasteljau' | 'decasteljau-alternative') {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(graphFactories[key]()).graph as Run;
    // The host asks the graph for its commands on every render, so the calls count host renders.
    const hostRenders = vi.spyOn(graph, 'getGraphCommands');
    const frames = (count: number) => {
        for (let i = 0; i < count; i++) {
            const due = pending;
            pending = [];
            time += 100;
            act(() => due.forEach(callback => callback(time)));
        }
    };
    return {graph, frames, hostRenders};
}

const play = () => screen.getByRole('button', {name: t('play')});
const slider = () => screen.getByRole('slider', {name: t('animation_parameter')}) as HTMLInputElement;
const readoutText = () => document.querySelector('.decasteljau-animation-heading output')!.textContent;

describe.each(['decasteljau', 'decasteljau-alternative'] as const)('%s playback publishing', key => {
    test('playing frames move the slider and readout without re-rendering the host or writing the store', () => {
        const {graph, frames, hostRenders} = mountRun(key);
        act(() => { fireEvent.click(play()); });
        const storeT = graph.state.t;
        const rendersAfterPlay = hostRenders.mock.calls.length;
        const sliderAtStart = Number(slider().value);
        const readoutAtStart = readoutText();
        const seen = new Set<string>();
        for (let i = 0; i < 4; i++) {
            frames(1);
            seen.add(slider().value);
            // The readout and the slider show the same drawn parameter.
            expect(readoutText()).toBe(`t = ${Number(slider().value).toFixed(2).replace('.', ',')}`);
        }
        expect(graph.parameter).toBeGreaterThan(storeT);
        expect(Number(slider().value)).toBeCloseTo(graph.parameter, 6);
        expect(Number(slider().value)).toBeGreaterThan(sliderAtStart);
        expect(readoutText()).not.toBe(readoutAtStart);
        expect(seen.size).toBeGreaterThanOrEqual(3);
        expect(hostRenders.mock.calls.length).toBe(rendersAfterPlay);
        expect(graph.state.t).toBe(storeT);
    });
});

describe('decasteljau steering', () => {
    const key = 'decasteljau';
    test('pause, slider input and stop leave the store t equal to the drawn parameter', () => {
        const {graph, frames} = mountRun(key);
        act(() => { fireEvent.click(play()); });
        frames(4);
        act(() => { fireEvent.click(screen.getByRole('button', {name: t('pause')})); });
        expect(graph.state.animationStatus).toBe('paused');
        expect(graph.state.t).toBe(graph.parameter);
        expect(Number(slider().value)).toBeCloseTo(graph.parameter, 6);
        act(() => { fireEvent.click(play()); });
        frames(2);
        act(() => { fireEvent.change(slider(), {target: {value: '0.4'}}); });
        expect(graph.state.t).toBeCloseTo(0.4, 6);
        expect(graph.state.t).toBe(graph.parameter);
        act(() => { fireEvent.click(play()); });
        frames(2);
        act(() => { graph.setLessonAnimation!('stop'); });
        expect(graph.state.t).toBe(0);
        expect(graph.parameter).toBe(0);
        expect(graph.state.animationStatus).toBe('ready');
    });

    test('lesson pause and replay publish the drawn parameter', () => {
        const {graph, frames} = mountRun(key);
        act(() => { graph.setLessonAnimation?.('replay'); });
        frames(4);
        act(() => { graph.setLessonAnimation?.('pause'); });
        expect(graph.state.t).toBe(graph.parameter);
        expect(graph.state.t).toBeGreaterThan(0);
        expect(graph.state.animationStatus).toBe('paused');
    });
});

test('a playing run that finishes publishes t = 1', () => {
    const {graph, frames} = mountRun('decasteljau');
    act(() => { fireEvent.change(slider(), {target: {value: '0.99'}}); });
    act(() => { fireEvent.click(play()); });
    frames(3);
    expect(graph.state.animationStatus).toBe('finished');
    expect(graph.state.t).toBe(1);
    expect(graph.parameter).toBe(1);
    expect(Number(slider().value)).toBe(1);
});
