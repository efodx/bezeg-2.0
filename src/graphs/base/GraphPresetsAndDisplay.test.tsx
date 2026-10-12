import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import BezierCurveGraph from '../curves/bezier/BezierCurveGraph';
import {GraphHost} from './GraphHost';
import {AxisSelect} from './DisplaySettings';
import {graphSessionForBoard} from './GraphSession';
import {settingsForBoard, stylesFor, stylesForBoard} from '../styles/GraphStyles';
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

class TestBezierGraph extends BezierCurveGraph {
    /** Test access to the protected board. */
    liveBoard() {
        return this.board;
    }

    pointCount() {
        return this.getFirstCurve().getPoints().length;
    }

    addPoint() {
        this.getFirstJxgCurve().addPoint(1.5, 1.5);
    }
}

/**
 * Starts an asynchronous controller operation inside `act` so that the host commits its renders, then waits for it
 * outside `act` (awaiting inside would block the very render the operation waits for).
 */
async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

const renderGraph = (graph: TestBezierGraph) => render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);

test('two graphs have independent display settings, also on their boards', () => {
    const first = new TestBezierGraph();
    const second = new TestBezierGraph();
    const firstView = renderGraph(first);
    const secondView = renderGraph(second);

    expect(first.displaySettings).not.toBe(second.displaySettings);
    first.setElementSize(10);
    first.setAxisSelect(AxisSelect.NONE);
    first.setPointLabelsVisible(false);

    expect(first.displaySettings.getSize()).toBe(10);
    expect(first.displaySettings.pointSize).toBe(14);
    expect(first.displaySettings.axisVisible()).toBe(false);
    expect(first.displaySettings.pointLabelsVisible).toBe(false);
    expect(second.displaySettings.getSize()).toBe(0);
    expect(second.displaySettings.pointSize).toBe(4);
    expect(second.displaySettings.axisVisible()).toBe(true);
    expect(second.displaySettings.pointLabelsVisible).toBe(true);

    // Style callbacks reached through each board's session read that graph's settings.
    expect(graphSessionForBoard(first.liveBoard())?.displaySettings).toBe(first.displaySettings);
    expect(settingsForBoard(second.liveBoard())).toBe(second.displaySettings);
    const pointSize = (board: ReturnType<TestBezierGraph['liveBoard']>) => (stylesForBoard(board).point.default.size as unknown as () => number)();
    expect(pointSize(first.liveBoard())).toBe(14);
    expect(pointSize(second.liveBoard())).toBe(4);
    firstView.unmount();
    secondView.unmount();
});

test('style presets follow the settings they were created for', () => {
    const first = new TestBezierGraph();
    const second = new TestBezierGraph();
    first.displaySettings.setSize(5);
    expect(stylesFor(first.displaySettings)).toBe(stylesFor(first.displaySettings));
    expect((stylesFor(first.displaySettings).curve.default.strokeWidth as unknown as () => number)()).toBe(4.5);
    expect((stylesFor(second.displaySettings).curve.default.strokeWidth as () => number)()).toBe(2);
});

test('reset keeps the controller and the board and restores the default scene', async () => {
    const graph = new TestBezierGraph();
    const view = renderGraph(graph);
    const board = graph.liveBoard();
    const defaultCount = graph.pointCount();

    act(() => graph.addPoint());
    expect(graph.pointCount()).toBe(defaultCount + 1);

    await settle(() => graph.reset());

    expect(graph.liveBoard()).toBe(board);
    expect(graphSessionForBoard(board)?.isAlive).toBe(true);
    expect(graph.pointCount()).toBe(defaultCount);
    expect(graph.state.initialized).toBe(true);
    view.unmount();
});

test('select, save, delete and import presets work without unmounting the graph', async () => {
    const graph = new TestBezierGraph();
    const mount = jest.spyOn(graph, 'mount');
    const unmount = jest.spyOn(graph, 'unmount');
    const view = renderGraph(graph);
    const board = graph.liveBoard();
    const defaultCount = graph.pointCount();
    mount.mockClear();

    // Save a scene with an extra point as "mine"; it becomes the selection.
    act(() => graph.addPoint());
    act(() => graph.saveCurrentPreset('mine'));
    expect(graph.selectedPresetId).toBe('mine');
    expect(graph.presetService?.getPreset('mine')).toBeDefined();
    expect(screen.getByRole('combobox', {name: /Prednastavitve|Presets/, hidden: true})).toHaveValue('mine');

    // Selecting the default scene replaces the scene in place.
    await settle(() => graph.selectPreset(''));
    expect(graph.selectedPresetId).toBe('');
    expect(graph.pointCount()).toBe(defaultCount);

    // Selecting the saved preset restores its scene.
    await settle(() => graph.selectPreset('mine'));
    expect(graph.selectedPresetId).toBe('mine');
    expect(graph.pointCount()).toBe(defaultCount + 1);

    // Reset reloads the selected preset, not the default.
    act(() => graph.addPoint());
    await settle(() => graph.reset());
    expect(graph.pointCount()).toBe(defaultCount + 1);

    // An empty name takes the first unused name.
    act(() => graph.saveCurrentPreset(''));
    expect(graph.selectedPresetId).toBe('preset-1');

    // Deleting loads the first remaining preset.
    await settle(() => graph.deleteSelectedPreset());
    expect(graph.presetService?.getPreset('preset-1')).toBeUndefined();
    expect(graph.selectedPresetId).toBe('mine');

    // A selection that an import removed falls back to the default scene.
    const version = graph.presetListVersion;
    graph.presetService?.removePreset('mine');
    await settle(() => graph.reloadAfterImport());
    expect(graph.presetListVersion).toBe(version + 1);
    expect(graph.selectedPresetId).toBe('');
    expect(graph.pointCount()).toBe(defaultCount);

    expect(graph.liveBoard()).toBe(board);
    expect(mount).not.toHaveBeenCalled();
    expect(unmount).not.toHaveBeenCalled();
    view.unmount();
});

test('a selection made before mounting is loaded by the mount', () => {
    const graph = new TestBezierGraph();
    const reference = new TestBezierGraph();
    const referenceView = renderGraph(reference);
    const defaultCount = reference.pointCount();
    act(() => reference.addPoint());
    act(() => reference.saveCurrentPreset('stored'));
    referenceView.unmount();

    void graph.selectPreset('stored');
    const view = renderGraph(graph);
    expect(graph.selectedPresetId).toBe('stored');
    expect(graph.pointCount()).toBe(defaultCount + 1);
    view.unmount();
});
