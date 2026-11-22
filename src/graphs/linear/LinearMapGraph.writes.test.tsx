import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {UntaggedWriteError} from '../base/writes/parameterArbiter';
import {runAs} from '../base/writes/writeSource';
import {LinearMapGraph, STEP_INTERVAL_MS} from './LinearMapGraph';
import type {AnimationScheduler} from '../../learning/runtime/animation';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const KEYS = ['linear-map-mode', 'linear-map-example', 'linear-map-test-angle', 'linear-map-start', 'linear-map-step', 'linear-map-translation',
    'linear-map-pivot', 'linear-map-a11', 'linear-map-a12', 'linear-map-a21', 'linear-map-a22', 'linear-map-b11', 'linear-map-b12', 'linear-map-b21',
    'linear-map-b22', 'linear-map-first-source', 'linear-map-first-index', 'linear-map-second-source', 'linear-map-second-index'];

class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; return ++this.handle; }
    cancel() { this.callback = undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

class WritesGraph extends LinearMapGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
    override reducedMotion() { return false; }

    /** A setter call with no write source: what a writer that forgot to say who it is would do. */
    setModeDirectly(mode: string) {
        this.setMode(mode);
    }
}

function mountGraph() {
    const graph = new WritesGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

const lesson = (graph: WritesGraph, key: string, value: unknown) => {
    let result: ReturnType<NonNullable<typeof graph.parameters>['write']> | undefined;
    act(() => { result = graph.parameters!.write(key, value, 'lesson'); });
    return result!;
};

test('linear map parameters are source-tagged: a seeded untagged write throws, the tools control and lesson writes apply, a held key refuses the lesson', () => {
    const graph = mountGraph();
    const parameters = graph.parameters!;
    expect([...parameters.keys()].sort()).toEqual([...KEYS].sort());

    expect(() => act(() => graph.setModeDirectly('iterate'))).toThrow(UntaggedWriteError);
    act(() => runAs('learner', () => graph.setModeDirectly('iterate')));
    expect(parameters.read('linear-map-mode')).toBe('iterate');

    act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_mode_label')), {target: {value: 'eigen'}}); });
    expect(parameters.read('linear-map-mode')).toBe('eigen');

    expect(lesson(graph, 'linear-map-a11', 2)).toEqual({status: 'applied'});
    expect(parameters.read('linear-map-a11')).toBe(2);
    expect(lesson(graph, 'linear-map-test-angle', 30)).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-mode', 'iterate')).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-start', {x: 1, y: 2})).toEqual({status: 'applied'});
    expect(parameters.read('linear-map-start')).toEqual({x: 1, y: 2});
    expect(lesson(graph, 'linear-map-step', 3)).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-mode', 'composition')).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-second-source', 'rotation')).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-second-index', 3)).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-translation', {x: 1, y: 0})).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-pivot', {x: 0.5, y: 0.5})).toEqual({status: 'applied'});
    expect(lesson(graph, 'linear-map-mode', 'nonsense').status).toBe('refused-domain');
    expect(parameters.read('linear-map-mode')).toBe('composition');

    const release = parameters.hold('linear-map-step');
    expect(parameters.write('linear-map-step', 5, 'lesson')).toEqual({status: 'refused-arbiter', reason: 'held'});
    release();
});

test('the iteration runs under a lease on the step: a learner write of it pauses the run, a lesson frame change ends the lease', () => {
    const graph = mountGraph();
    const parameters = graph.parameters!;
    lesson(graph, 'linear-map-mode', 'iterate');
    act(() => { fireEvent.click(screen.getByRole('button', {name: t('play')})); });
    expect(graph.isPlaying()).toBe(true);
    expect(parameters.activeLeases()).toHaveLength(1);
    graph.clock.tick(0);
    graph.clock.tick(STEP_INTERVAL_MS);
    expect(parameters.read('linear-map-step')).toBe(1);

    act(() => { parameters.write('linear-map-step', 7, 'learner'); });
    expect(parameters.activeLeases()).toHaveLength(0);
    expect(graph.isPlaying()).toBe(false);
    expect(screen.getByRole('button', {name: t('play')})).toBeTruthy();
    expect(parameters.read('linear-map-step')).toBe(7);

    act(() => { fireEvent.click(screen.getByRole('button', {name: t('play')})); });
    expect(graph.isPlaying()).toBe(true);
    expect(parameters.activeLeases()).toHaveLength(1);
    act(() => graph.getLessonCapabilities().stopAnimations?.());
    expect(parameters.activeLeases()).toHaveLength(0);
    expect(graph.isPlaying()).toBe(false);
});
