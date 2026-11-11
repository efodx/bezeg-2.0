/**
 * Every graph that overrides pausePlayback also stops its playback in beforeFigureCapture(), the hook BaseGraph calls
 * before a single-figure export and a figure batch, so the capture shows one settled scene.
 */
import {act} from '@testing-library/react';
import BaseGraph, {BaseGraphState} from './base/BaseGraph';
import {installBoardShims, mountGraph} from './base/realGraphTestHarness';
import {allGraphFactories} from './allGraphFactories';
import {ParametricCurveGraph} from './curves/parametric/ParametricCurveGraph';
import {RecursionCobwebGraph} from './recursion/RecursionCobwebGraph';
import {SimulationGraph} from './random/SimulationGraph';
import TensorPatchGraph from './patches/TensorPatchGraph';
import TriangularPatchGraph from './patches/TriangularPatchGraph';
import DecasteljauGraph2 from './curves/bezier/DecasteljauGraph2';
import {LogisticMapGraph} from './dynamics/LogisticMapGraph';
import {LinearMapGraph} from './linear/LinearMapGraph';
import {ComplexPowerGraph} from './complex/ComplexPowerGraph';
import {EulerCircleGraph} from './complex/EulerCircleGraph';

beforeAll(installBoardShims);

function manualFrames() {
    let time = 0;
    let pending: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { pending.push(callback); return pending.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { pending = []; });
    return {
        advance(ms: number) {
            const due = pending;
            pending = [];
            time += ms;
            act(() => due.forEach(callback => callback(time)));
        },
    };
}
afterEach(() => vi.restoreAllMocks());

type Case = {
    name: string;
    create: () => BaseGraph<BaseGraphState>;
    play: (graph: any) => void;
    running: (graph: any) => boolean;
    value: (graph: any) => unknown;
};
const cases: Case[] = [
    {name: 'DecasteljauGraph2', create: () => new DecasteljauGraph2() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.playAnimation(), running: g => g.animation.isRunning(), value: g => g.state.t},
    {name: 'ParametricCurveGraph', create: () => new ParametricCurveGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.playRoll(), running: g => g.rolling, value: g => g.state.parameter},
    {name: 'RecursionCobwebGraph', create: () => new RecursionCobwebGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.play(), running: g => g.isPlaying(), value: g => g.state.step},
    {name: 'SimulationGraph', create: () => new SimulationGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.play(), running: g => g.isPlaying(), value: g => g.state.shown},
    {name: 'TensorPatchGraph (sweeps)', create: () => new TensorPatchGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.sweeps.apply('v', 'play'), running: g => g.sweeps.isRunning('v'), value: g => g.state.v},
    {name: 'TriangularPatchGraph (sweeps)', create: () => new TriangularPatchGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.sweeps.apply('u', 'play'), running: g => g.sweeps.isRunning('u'), value: g => g.state.u},
    {name: 'ComplexPowerGraph', create: () => new ComplexPowerGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.play(), running: g => g.isPlaying(), value: g => g.state.n},
    {name: 'EulerCircleGraph', create: () => new EulerCircleGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.play(), running: g => g.isPlaying(), value: g => g.state.degrees},
    {name: 'DecasteljauGraph', create: allGraphFactories.decasteljau,
        play: g => g.playAnimation(), running: g => g.lessonAnimation.isRunning(), value: g => g.state.t},
    {name: 'LogisticMapGraph', create: () => new LogisticMapGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.play(), running: g => g.isPlaying(), value: g => g.state.step},
    {name: 'LinearMapGraph', create: () => new LinearMapGraph() as unknown as BaseGraph<BaseGraphState>,
        play: g => g.play(), running: g => g.isPlaying(), value: g => g.model},
];

describe.each(cases)('$name', ({create, play, running, value}) => {
    test('beforeFigureCapture stops the playback and the drawn value stays put', () => {
        const frames = manualFrames();
        const {graph, view} = mountGraph(create());
        act(() => play(graph));
        for (let i = 0; i < 3; i++) frames.advance(100);
        expect(running(graph)).toBe(true);
        const before = value(graph);
        (graph as unknown as {beforeFigureCapture(): void}).beforeFigureCapture();
        expect(running(graph)).toBe(false);
        frames.advance(500);
        frames.advance(500);
        expect(value(graph)).toBe(before);
        view.unmount();
    });
});
