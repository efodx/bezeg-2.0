import React, {Profiler} from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CurveOffsetGraph from './CurveOffsetGraph';
import {SPEED_PLOT_Y_MAX, SPEED_PLOT_Y_MIN, SpeedFactorPlot, SpeedFactorPlotController, cuspTickPathData, speedFactorPathData} from './SpeedFactorPlot';
import {speedFactorSamples} from './curveOffset';
import {setLanguage, t} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';

beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

/** Number of "M" (pen-up) commands: one per drawn run. */
const runs = (path: string) => (path.match(/M/g) ?? []).length;
const segments = (path: string) => (path.match(/L/g) ?? []).length;

describe('speedFactorPathData', () => {
    test('is empty without samples and draws one run of n-1 segments for n regular samples', () => {
        expect(speedFactorPathData({t: [], factor: [], cusps: []})).toBe('');
        const path = speedFactorPathData({t: [0, 0.25, 0.5, 0.75, 1], factor: [1, 1.1, 1.2, 1.1, 1], cusps: []});
        expect(runs(path)).toBe(1);
        expect(segments(path)).toBe(4);
        expect(path.startsWith('M')).toBe(true);
    });

    test('breaks at NaN and out-of-range samples: no segment crosses them', () => {
        const base = {t: [0, 0.2, 0.4, 0.6, 0.8, 1], cusps: []};
        const nan = speedFactorPathData({...base, factor: [1, 1, NaN, 1, 1, 1]});
        expect(runs(nan)).toBe(2);
        expect(segments(nan)).toBe(1 + 2);
        const high = speedFactorPathData({...base, factor: [1, 1, SPEED_PLOT_Y_MAX + 0.01, 1, 1, 1]});
        const low = speedFactorPathData({...base, factor: [1, 1, SPEED_PLOT_Y_MIN - 0.01, 1, 1, 1]});
        expect(runs(high)).toBe(2);
        expect(runs(low)).toBe(2);
        // The range limits themselves are drawn.
        expect(runs(speedFactorPathData({...base, factor: [SPEED_PLOT_Y_MIN, 1, SPEED_PLOT_Y_MAX, 1, 1, 1]}))).toBe(1);
        // An isolated bad sample at the very ends, or everything bad, leaves no stray command.
        expect(speedFactorPathData({...base, factor: [NaN, NaN, NaN, NaN, NaN, NaN]})).toBe('');
        expect(speedFactorPathData({...base, factor: [NaN, 1, 1, 1, 1, Infinity]})).toMatch(/^M[^M]*$/);
        expect(segments(speedFactorPathData({...base, factor: [NaN, 1, 1, 1, 1, Infinity]}))).toBe(3);
        // A run of one sample is a lone M without a segment: nothing joins it to its neighbours.
        expect(speedFactorPathData({...base, factor: [1, NaN, 1, NaN, 1, NaN]}).split(' ').filter(part => part.startsWith('L'))).toEqual([]);
    });
});

describe('cuspTickPathData', () => {
    test('draws one tick per in-range cusp and skips the others', () => {
        expect(cuspTickPathData([])).toBe('');
        const ticks = cuspTickPathData([0.25, 0.75]);
        expect(runs(ticks)).toBe(2);
        expect(segments(ticks)).toBe(2);
        expect(runs(cuspTickPathData([-0.1, 0, 0.5, 1, 1.1, NaN, Infinity]))).toBe(3);
    });
});

describe('SpeedFactorPlotController', () => {
    const sample = {t: [0, 0.5, 1], factor: [1, 0.5, 1], cusps: [0.5]};

    function mountPlot(controller: SpeedFactorPlotController, onRender: () => void = () => undefined) {
        return render(<Profiler id="plot" onRender={onRender}><SpeedFactorPlot controller={controller}/></Profiler>);
    }
    const curveOf = () => screen.getByTestId('offset-speed-plot-curve');
    const cuspsOf = () => screen.getByTestId('offset-speed-plot-cusps');

    test('writes the path on push without rendering React again', () => {
        const controller = new SpeedFactorPlotController();
        let commits = 0;
        const view = mountPlot(controller, () => { commits++; });
        try {
            const mounted = commits;
            expect(mounted).toBeGreaterThan(0);
            expect(curveOf().getAttribute('d') ?? '').toBe('');
            controller.push(sample);
            expect(curveOf().getAttribute('d')).toBe(speedFactorPathData(sample));
            expect(cuspsOf().getAttribute('d')).toBe(cuspTickPathData(sample.cusps));
            expect(curveOf().getAttribute('d')).not.toBe('');
            controller.push({t: [0, 1], factor: [1, 1], cusps: []});
            expect(segments(curveOf().getAttribute('d')!)).toBe(1);
            expect(cuspsOf().getAttribute('d')).toBe('');
            expect(commits).toBe(mounted);
        } finally { view.unmount(); }
    });

    test('replays the last data to a plot that mounts late', () => {
        const controller = new SpeedFactorPlotController();
        controller.push(sample);
        expect(controller.lastData()).toBe(sample);
        const view = mountPlot(controller);
        try {
            expect(curveOf().getAttribute('d')).toBe(speedFactorPathData(sample));
            expect(cuspsOf().getAttribute('d')).toBe(cuspTickPathData(sample.cusps));
        } finally { view.unmount(); }
    });

    test('stops writing after unregister, and a stale unregister does not detach a newer plot', () => {
        const controller = new SpeedFactorPlotController();
        const first = {curve: document.createElementNS('http://www.w3.org/2000/svg', 'path'), cusps: document.createElementNS('http://www.w3.org/2000/svg', 'path')};
        const second = {curve: document.createElementNS('http://www.w3.org/2000/svg', 'path'), cusps: document.createElementNS('http://www.w3.org/2000/svg', 'path')};
        const unregisterFirst = controller.register(first);
        controller.push(sample);
        expect(first.curve.getAttribute('d')).toBe(speedFactorPathData(sample));
        const unregisterSecond = controller.register(second);
        unregisterFirst();
        controller.push({t: [0, 1], factor: [1, 1], cusps: []});
        expect(second.curve.getAttribute('d')).toBe(speedFactorPathData({t: [0, 1], factor: [1, 1], cusps: []}));
        expect(first.curve.getAttribute('d')).toBe(speedFactorPathData(sample));
        unregisterSecond();
        controller.push(sample);
        expect(second.curve.getAttribute('d')).not.toBe(speedFactorPathData(sample));
    });

    test('unmounting the component stops writes to its (removed) paths', () => {
        const controller = new SpeedFactorPlotController();
        const view = mountPlot(controller);
        const curve = curveOf();
        view.unmount();
        controller.push(sample);
        expect(curve.getAttribute('d') ?? '').toBe('');
    });

    test('is an image with the localized label and the documented test ids', () => {
        const view = mountPlot(new SpeedFactorPlotController());
        try {
            const svg = screen.getByTestId('offset-speed-plot');
            expect(svg).toHaveAttribute('role', 'img');
            expect(svg.getAttribute('aria-label')).toBe(t('offset_speed_plot_aria'));
            expect(svg.getAttribute('aria-label')!.length).toBeGreaterThan(10);
            expect(screen.getByRole('img', {name: t('offset_speed_plot_aria')})).toBe(svg);
            expect(screen.getByText(t('offset_speed_plot_title'))).toBeInTheDocument();
            expect(curveOf().tagName.toLowerCase()).toBe('path');
            expect(cuspsOf().tagName.toLowerCase()).toBe('path');
        } finally { view.unmount(); }
    });
});

describe('the plot of the offset graph', () => {
    class PlotProbe extends CurveOffsetGraph {
        liveBoard() { return this.board; }
        dropCurves() { this.jxgCurves = []; }
    }
    const curvePath = () => screen.getByTestId('offset-speed-plot-curve').getAttribute('d');
    const cuspPath = () => screen.getByTestId('offset-speed-plot-cusps').getAttribute('d');

    test('follows a control-point move, shows the cusps, and empties when the curve is gone', () => {
        const graph = new PlotProbe();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        try {
            expect(screen.queryByTestId('offset-speed-plot')).toBeNull();
            act(() => { graph.setOffsetSpeedPlotShown(true); graph.setOffsetDistance(-1); });
            const rows = graph.controlRows()!;
            const factor = speedFactorSamples(rows, -1, 128);
            const expected = (cusps: readonly number[]) => ({t: factor.t, factor: factor.factor, cusps});
            const cusps = graph.speedPlot().lastData()!.cusps;
            expect(cusps).toHaveLength(2);
            expect(curvePath()).toBe(speedFactorPathData(expected(cusps)));
            expect(curvePath()).not.toBe('');
            expect(runs(cuspPath()!)).toBe(2);

            const before = curvePath();
            const point = graph.getFirstJxgCurve().getJxgPoints()[1];
            point.moveTo([0.3, -2], 0);
            (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
            graph.liveBoard().update();
            const moved = speedFactorSamples(graph.controlRows()!, -1, 128);
            expect(graph.controlRows()![1]).toEqual([0.3, -2]);
            expect(curvePath()).toBe(speedFactorPathData({t: moved.t, factor: moved.factor, cusps: graph.speedPlot().lastData()!.cusps}));
            expect(curvePath()).not.toBe(before);

            graph.dropCurves();
            graph.liveBoard().update();
            expect(curvePath()).toBe('');
            expect(cuspPath()).toBe('');
            expect(graph.speedPlot().lastData()).toEqual({t: [], factor: [], cusps: []});
        } finally { view.unmount(); }
    });
});
