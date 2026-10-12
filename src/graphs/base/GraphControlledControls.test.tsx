import React from 'react';
import {act, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {t} from '../../localization';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import CubicPhBezierCurveGraph from '../curves/ph/CubicPhBezierCurveGraph';
import {GraphHost} from './GraphHost';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {appStorage} from '../../storage/appStorage';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => {
    appStorage.clear();
});

const renderGraph = (graph: BaseGraph<BaseGraphState>) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);

const polygonSwitch = (view: ReturnType<typeof render>) => view.getByLabelText(t('control_polygon')) as HTMLInputElement;

test('a lesson action that shows the control polygon checks the rendered switch with no other state change', () => {
    const graph = new BezierCurveGraph();
    const view = renderGraph(graph);
    expect(polygonSwitch(view).checked).toBe(false);

    const stateBefore = graph.state;
    act(() => graph.getLessonCapabilities().apply({kind: 'curve-visibility', target: 'control-polygon', visible: true}));

    expect(polygonSwitch(view).checked).toBe(true);
    expect(graph.getFirstJxgCurve().isShowingControlPolygon()).toBe(true);
    // The scene state object was not replaced: only the adapter flag changed and the store was notified.
    expect(graph.state).toBe(stateBefore);

    act(() => graph.getLessonCapabilities().apply({kind: 'curve-visibility', target: 'control-polygon', visible: false}));
    expect(polygonSwitch(view).checked).toBe(false);
    view.unmount();
});

test('toggling the switch changes the adapter and keeps the switch in step', () => {
    const graph = new BezierCurveGraph();
    const view = renderGraph(graph);
    fireEvent.click(polygonSwitch(view));
    expect(graph.getFirstJxgCurve().isShowingControlPolygon()).toBe(true);
    expect(polygonSwitch(view).checked).toBe(true);
    fireEvent.click(polygonSwitch(view));
    expect(graph.getFirstJxgCurve().isShowingControlPolygon()).toBe(false);
    expect(polygonSwitch(view).checked).toBe(false);
    view.unmount();
});

test('the convex hull switch follows a lesson action as well', () => {
    const graph = new BezierCurveGraph();
    const view = renderGraph(graph);
    const hull = () => view.getByLabelText(t('convex_hull')) as HTMLInputElement;
    expect(hull().checked).toBe(false);
    act(() => graph.getLessonCapabilities().apply({kind: 'curve-visibility', target: 'convex-hull', visible: true}));
    expect(hull().checked).toBe(true);
    view.unmount();
});

test('the PH offset switch and slider follow a lesson action', () => {
    const graph = new CubicPhBezierCurveGraph();
    const view = renderGraph(graph);
    const offsets = () => view.getAllByLabelText(t('curve_offsets')).find(element => element instanceof HTMLInputElement) as HTMLInputElement;
    expect(offsets().checked).toBe(false);

    act(() => graph.getLessonCapabilities().apply({kind: 'curve-visibility', target: 'offset-curve', visible: true}));
    expect(offsets().checked).toBe(true);

    act(() => graph.getLessonCapabilities().apply({kind: 'parameter', name: 'offset-distance', value: 1.5}));
    const slider = view.container.querySelector<HTMLInputElement>('input[type="range"][min="-3"]')!;
    expect(Number(slider.value)).toBe(1.5);
    view.unmount();
});
