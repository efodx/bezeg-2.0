import {act, screen} from '@testing-library/react';
import {appStorage} from '../../storage/appStorage';
import {enterNumber} from '../../inputs/testEntry';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {UntaggedWriteError} from '../base/writes/parameterArbiter';
import {runAs} from '../base/writes/writeSource';
import {t} from '../../localization';
import {PhasePortraitGraph} from './PhasePortraitGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());
afterEach(() => vi.restoreAllMocks());

const KEYS = ['phase-system', 'phase-equilibrium', 'phase-seed-count', 'phase-zoom', 'phase-time', 'phase-a', 'phase-b', 'phase-c', 'phase-d',
    'phase-seed-1', 'phase-seed-2', 'phase-seed-3', 'phase-seed-4', 'phase-seed-5', 'phase-seed-6'];

class WritesGraph extends PhasePortraitGraph {
    /** A setter call with no write source: what a writer that forgot to say who it is would do. */
    setTimeDirectly(value: number) {
        this.setTime(value);
    }
}

function mountRun() {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    const graph = mountGraph(new WritesGraph()).graph as WritesGraph;
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
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

test('phase portrait parameters are source-tagged: a seeded untagged write throws, tools controls and lesson writes apply, a held key refuses the lesson', () => {
    const {graph} = mountRun();
    const parameters = graph.parameters!;
    expect([...parameters.keys()].sort()).toEqual([...KEYS, 'view'].sort());

    expect(() => act(() => graph.setTimeDirectly(1))).toThrow(UntaggedWriteError);
    act(() => runAs('learner', () => graph.setTimeDirectly(1)));
    expect(parameters.read('phase-time')).toBe(1);

    act(() => { enterNumber(field(t('phase_graph_matrix_a_label')), '-1'); });
    expect(graph.state.A).toBe(-4);
    expect(parameters.read('phase-a')).toBe(-1);

    act(() => { expect(parameters.write('phase-zoom', 2, 'lesson')).toEqual({status: 'applied'}); });
    expect(graph.state.zoom).toBe(2);
    act(() => { expect(parameters.write('phase-seed-count', 3, 'lesson')).toEqual({status: 'applied'}); });
    expect(graph.state.seeds).toHaveLength(3);
    act(() => { expect(parameters.write('phase-seed-1', {X: 0.5, Y: -1}, 'lesson')).toEqual({status: 'applied'}); });
    expect(graph.state.seeds[0]).toMatchObject({X: 10, Y: -20});
    act(() => { expect(parameters.write('phase-system', 'pendulum', 'lesson')).toEqual({status: 'applied'}); });
    expect(graph.state.system).toBe('pendulum');
    expect(parameters.write('phase-zoom', 99, 'lesson').status).toBe('refused-domain');
    expect(graph.state.zoom).toBe(2);

    const release = parameters.hold('phase-zoom');
    expect(parameters.write('phase-zoom', 3, 'lesson')).toEqual({status: 'refused-arbiter', reason: 'held'});
    release();
});

test('playback runs under a lease on the time: a learner write of it stops it with the control paused, a lesson frame change ends it', () => {
    const {graph, frames} = mountRun();
    const parameters = graph.parameters!;
    act(() => { play().click(); });
    expect(graph.playing).toBe(true);
    expect(parameters.activeLeases()).toHaveLength(1);
    frames(3);
    expect(graph.time).toBeGreaterThan(0);

    act(() => { parameters.write('phase-time', 0.1, 'learner'); });
    expect(parameters.activeLeases()).toHaveLength(0);
    expect(graph.playing).toBe(false);
    expect(screen.getByRole('button', {name: t('play')})).toBeTruthy();
    frames(2);
    expect(graph.time).toBeCloseTo(0.1);

    act(() => { play().click(); });
    expect(graph.playing).toBe(true);
    expect(parameters.activeLeases()).toHaveLength(1);
    act(() => graph.getLessonCapabilities().stopAnimations?.());
    expect(parameters.activeLeases()).toHaveLength(0);
    expect(graph.playing).toBe(false);
});
