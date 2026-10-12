import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import DecasteljauGraph from '../curves/bezier/DecasteljauGraph';
import SubdivisionGraph, {MAX_SUBDIVISION_STEPS} from '../curves/bezier/SubdivisionGraph';
import ExtrapolationGraph from '../curves/bezier/ExtrapolationGraph';
import G1SplineGraph from '../curves/spline/G1SplineGraph';
import {GraphHost} from './GraphHost';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {appStorage} from '../../storage/appStorage';
import {downloadSVG} from './export/FigureCapture';

jest.mock('./export/FigureCapture', () => ({
    ...jest.requireActual('./export/FigureCapture'),
    downloadSVG: jest.fn(),
}));

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

/** Starts a controller operation inside `act` so the host commits its renders, then waits for it outside. */
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

test('reset drops optional state keys the default scene does not have, and the board follows', async () => {
    class Graph extends DecasteljauGraph {
        hasWholeCurveElement() { return this.getWholeCurveElementForTest() !== undefined; }
        getWholeCurveElementForTest() { return (this as unknown as {wholeCurveElement?: unknown}).wholeCurveElement; }
        liveBoard() { return this.board; }
    }
    const graph = new Graph();
    const view = renderGraph(graph);
    expect(graph.state.wholeCurve).toBeFalsy();

    act(() => graph.setState({wholeCurve: true}));
    expect(graph.state.wholeCurve).toBe(true);
    expect(graph.hasWholeCurveElement()).toBe(true);
    const element = graph.getWholeCurveElementForTest();
    expect(graph.liveBoard().objectsList).toContain(element);

    await settle(() => graph.reset());

    expect(graph.state.wholeCurve).toBeFalsy();
    expect(graph.hasWholeCurveElement()).toBe(false);
    expect(graph.liveBoard().objectsList).not.toContain(element);
    view.unmount();
});

test('subdividing to the cap and resetting makes subdividing work again', async () => {
    class Graph extends SubdivisionGraph {
        curveCount() { return this.jxgCurves.length; }
    }
    const graph = new Graph();
    const view = renderGraph(graph);
    expect(graph.curveCount()).toBe(1);
    act(() => {
        for (let step = 0; step < MAX_SUBDIVISION_STEPS; step++) graph.subdivide();
    });
    const atCap = graph.curveCount();
    expect(atCap).toBe(2 ** MAX_SUBDIVISION_STEPS);
    act(() => graph.subdivide());
    expect(graph.curveCount()).toBe(atCap);

    await settle(() => graph.reset());

    expect(graph.curveCount()).toBe(1);
    act(() => graph.subdivide());
    expect(graph.curveCount()).toBe(2);
    view.unmount();
});

describe('inspector controls show the restored scene after a reset', () => {
    test('the extrapolation slider follows the default value again', async () => {
        const graph = new ExtrapolationGraph();
        const view = renderGraph(graph);
        const slider = () => view.container.querySelector<HTMLInputElement>('.tools input[type="range"]')!;
        const shown = () => slider().closest('form')!.querySelector('output')!.textContent;
        expect(shown()).toBe('1.20');

        fireEvent.change(slider(), {target: {value: '1.4'}});
        expect(shown()).toBe('1.40');

        await settle(() => graph.reset());

        expect(shown()).toBe('1.20');
        expect(slider().value).toBe('1.2');
        view.unmount();
    });

    test('the G1 spline beta sliders and the scene both return to the default betas', async () => {
        class Graph extends G1SplineGraph {
            betas() { return this.getFirstCurve().getBs(); }
        }
        const graph = new Graph();
        const view = renderGraph(graph);
        const defaults = [...graph.betas()];
        const sliders = () => Array.from(view.container.querySelectorAll<HTMLInputElement>('.tools input[type="range"]'));
        expect(sliders().length).toBe(defaults.length);

        fireEvent.change(sliders()[0], {target: {value: '2.5'}});
        expect(graph.betas()[0]).toBe(2.5);

        await settle(() => graph.reset());

        expect(graph.betas()).toEqual(defaults);
        expect(sliders().map(slider => Number(slider.value))).toEqual(defaults);
        view.unmount();
    });
});

describe('selecting a preset while an export is running', () => {
    class Graph extends BezierCurveGraph {
        pointCount() { return this.getFirstCurve().getPoints().length; }
        addPoint() { this.getFirstJxgCurve().addPoint(1.5, 1.5); }
    }

    async function withExportInFlight() {
        const graph = new Graph();
        const view = renderGraph(graph);
        const defaultCount = graph.pointCount();
        act(() => graph.addPoint());
        act(() => graph.saveCurrentPreset('mine'));
        let finishExport!: () => void;
        (downloadSVG as jest.Mock).mockImplementation(() => new Promise<void>(resolve => { finishExport = resolve; }));
        void graph.saveAsSVG('figure');
        return {graph, view, defaultCount, finishExport: () => finishExport()};
    }

    test('is refused, so the selector and the board stay in sync', async () => {
        const {graph, view, defaultCount, finishExport} = await withExportInFlight();
        await settle(() => graph.selectPreset(''));
        expect(graph.selectedPresetId).toBe('mine');
        expect(graph.pointCount()).toBe(defaultCount + 1);

        await settle(() => graph.deleteSelectedPreset());
        expect(graph.presetService?.getPreset('mine')).toBeDefined();

        await act(async () => { finishExport(); });
        await settle(() => graph.selectPreset(''));
        expect(graph.selectedPresetId).toBe('');
        expect(graph.pointCount()).toBe(defaultCount);
        view.unmount();
    });

    test('an import during the export reloads the scene when the export finishes', async () => {
        const {graph, view, defaultCount, finishExport} = await withExportInFlight();
        graph.presetService?.removePreset('mine');
        await settle(() => graph.reloadAfterImport());
        expect(graph.pointCount()).toBe(defaultCount + 1);

        await act(async () => { finishExport(); });
        await waitFor(() => expect(graph.pointCount()).toBe(defaultCount));
        expect(graph.selectedPresetId).toBe('');
        view.unmount();
    });
});

test('a mount with a selection whose preset no longer exists clears the selection', () => {
    const graph = new BezierCurveGraph();
    void graph.selectPreset('gone');
    const view = renderGraph(graph);
    expect(graph.selectedPresetId).toBe('');
    view.unmount();
});
