import React, {Profiler} from 'react';
import {act, render, screen} from '@testing-library/react';
import {ArcSpeedPlot, ArcSpeedPlotController, arcCuspTickPathData, arcMarkerGeometry, arcSpeedPathData, arcSpeedYMax} from './ArcSpeedPlot';
import {buildArcLengthModel} from './arcLengthModel';
import {setLanguage, t} from '../../../localization';

afterEach(() => setLanguage('sl'));

const runs = (path: string) => (path.match(/M/g) ?? []).length;
const segments = (path: string) => (path.match(/L/g) ?? []).length;

describe('arcSpeedPathData', () => {
    test('is empty without samples, draws one run of n-1 segments, and breaks at a non-finite sample', () => {
        expect(arcSpeedPathData({t: [], speed: [], cusps: []})).toBe('');
        expect(segments(arcSpeedPathData({t: [0, 0.5, 1], speed: [1, 2, 1], cusps: []}))).toBe(2);
        const broken = arcSpeedPathData({t: [0, 0.25, 0.5, 0.75, 1], speed: [1, 2, NaN, 2, 1], cusps: []});
        expect(runs(broken)).toBe(2);
        expect(segments(broken)).toBe(2);
    });

    test('the vertical range follows the largest speed, and is 1 for a curve that does not move', () => {
        expect(arcSpeedYMax({t: [0, 1], speed: [2, 5], cusps: []})).toBeCloseTo(5.5, 12);
        expect(arcSpeedYMax({t: [0, 1], speed: [0, 0], cusps: []})).toBe(1);
    });

    test('cusp ticks are one vertical line each, and only for parameters in [0, 1]', () => {
        expect(arcCuspTickPathData([])).toBe('');
        expect(runs(arcCuspTickPathData([0.5, 0.8, 1.5, NaN]))).toBe(2);
    });

    test('the marker moves right with t and up with the speed', () => {
        const data = {t: [0, 1], speed: [1, 3], cusps: []};
        const a = arcMarkerGeometry(data, {t: 0.2, speed: 1});
        const b = arcMarkerGeometry(data, {t: 0.8, speed: 3});
        expect(b.cx).toBeGreaterThan(a.cx);
        expect(b.cy).toBeLessThan(a.cy);
    });
});

describe('the speed plot of the cubic Q', () => {
    const model = buildArcLengthModel([[0, 0], [1, 3], [3, 3], [4, 0]], 8);
    const data = {t: model.speed.t, speed: model.speed.speed, cusps: []};

    test('has an accessible name and its curve is written by the controller without a React render', () => {
        const controller = new ArcSpeedPlotController();
        controller.push(data);
        let renders = 0;
        render(<Profiler id="plot" onRender={() => { renders++; }}><ArcSpeedPlot controller={controller}/></Profiler>);
        expect(screen.getByRole('img', {name: t('arcparam_speed_plot_aria')})).toBeInTheDocument();
        expect(screen.getByTestId('arc-speed-plot-curve').getAttribute('d')).toBe(arcSpeedPathData(data));
        const rendered = renders;
        act(() => controller.setMarker(0.4, 3));
        act(() => controller.push({...data, cusps: [0.5]}));
        expect(screen.getByTestId('arc-speed-plot-marker').getAttribute('visibility')).toBe('visible');
        expect(screen.getByTestId('arc-speed-plot-guide').getAttribute('d')).toBe(arcMarkerGeometry(data, {t: 0.4, speed: 3}).guide);
        expect(screen.getByTestId('arc-speed-plot-cusps').getAttribute('d')).toBe(arcCuspTickPathData([0.5]));
        expect(renders).toBe(rendered);
    });

    test('a plot that mounts later replays the last data and marker', () => {
        const controller = new ArcSpeedPlotController();
        controller.push(data);
        controller.setMarker(0.9, 1);
        render(<ArcSpeedPlot controller={controller}/>);
        expect(screen.getByTestId('arc-speed-plot-curve').getAttribute('d')).not.toBe('');
        expect(screen.getByTestId('arc-speed-plot-marker').getAttribute('cx')).toBe(String(arcMarkerGeometry(data, {t: 0.9, speed: 1}).cx));
    });
});
