import {act, fireEvent, screen} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../../allGraphFactories';
import {appStorage} from '../../../storage/appStorage';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../base/realGraphTestHarness';
import {UntaggedWriteError} from '../../base/writes/parameterArbiter';
import {runAs} from '../../base/writes/writeSource';
import {t} from '../../../localization';
import DecasteljauGraph from './DecasteljauGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

const KEY = 'decasteljau-t';

function mountRun() {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(graphFactories.decasteljau()).graph as DecasteljauGraph & {
        state: {t: number; animationStatus: string}
    };
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

const play = () => screen.getByRole('button', {name: t('play')});
const slider = () => screen.getByRole('slider', {name: t('animation_parameter')}) as HTMLInputElement;

test('De Casteljau t is source-tagged: a seeded untagged write throws, the slider and a lesson write apply, a held key refuses the lesson', () => {
    const {graph} = mountRun();
    const parameters = graph.parameters!;
    expect(parameters.keys()).toEqual([KEY, 'view']);

    expect(() => act(() => graph['setParameter'](0.3, 'ready'))).toThrow(UntaggedWriteError);
    act(() => runAs('learner', () => graph['setParameter'](0.3, 'ready')));
    expect(parameters.read(KEY)).toBe(0.3);

    act(() => { fireEvent.change(slider(), {target: {value: '0.6'}}); });
    expect(parameters.read(KEY)).toBeCloseTo(0.6);

    act(() => { expect(parameters.write(KEY, 0.2, 'lesson')).toEqual({status: 'applied'}); });
    expect(graph.state.t).toBe(0.2);

    const release = parameters.hold(KEY);
    expect(parameters.write(KEY, 0.9, 'lesson')).toEqual({status: 'refused-arbiter', reason: 'held'});
    release();
});

test('playback runs under a lease: a learner write of t stops it with the control paused, a lesson frame change ends it', () => {
    const {graph, frames} = mountRun();
    const parameters = graph.parameters!;
    act(() => { fireEvent.click(play()); });
    expect(graph.state.animationStatus).toBe('playing');
    expect(parameters.activeLeases()).toHaveLength(1);
    frames(3);
    expect(parameters.read(KEY) as number).toBeGreaterThan(0.5);

    act(() => { parameters.write(KEY, 0.1, 'learner'); });
    expect(parameters.activeLeases()).toHaveLength(0);
    expect(graph.state.animationStatus).toBe('paused');
    expect(graph.state.t).toBeCloseTo(0.1);
    frames(2);
    expect(graph.state.t).toBeCloseTo(0.1);

    act(() => { fireEvent.click(play()); });
    expect(graph.state.animationStatus).toBe('playing');
    expect(parameters.activeLeases()).toHaveLength(1);
    act(() => graph.getLessonCapabilities().stopAnimations?.());
    expect(parameters.activeLeases()).toHaveLength(0);
});

test('a learner write that lands before a pending play start commits wins: playback never starts', () => {
    const {graph, frames} = mountRun();
    const parameters = graph.parameters!;
    act(() => {
        fireEvent.click(play());
        parameters.write(KEY, 0.2, 'learner');
    });
    expect(graph.state.animationStatus).not.toBe('playing');
    expect(parameters.activeLeases()).toHaveLength(0);
    frames(3);
    expect(graph.state.t).toBeCloseTo(0.2);
    expect(graph.state.animationStatus).not.toBe('playing');
});
