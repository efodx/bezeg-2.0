import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from './GraphHost';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {GraphSession} from './GraphSession';
import {installBoardShims, settle} from './realGraphTestHarness';

beforeAll(installBoardShims);

interface BoardlessState extends BaseGraphState {
    count: number;
}

/** A graph whose main view is not a JSXGraph board, as a Three surface view will be. */
class BoardlessGraph extends BaseGraph<BoardlessState, {count: number}> {
    readonly disposeMainView = vi.fn();
    imports: number[] = [];
    container?: HTMLElement;

    override getInitialState(): BoardlessState {
        return {initialized: false, count: 0};
    }

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        this.container = container;
        session.adoptMainView(this.disposeMainView);
    }

    get boardPresent(): boolean { return this.hasBoard; }
    override initialize(): void {}
    override defaultPreset() { return {count: 7}; }
    override exportPresetData() { return {count: this.state.count}; }
    override importPresetData(data: {count: number}): void { this.imports.push(data.count); }
}

function mountBoardless() {
    const graph = new BoardlessGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

test('a graph without a board mounts, stays alive and disposes its main view exactly once', () => {
    const {graph, view} = mountBoardless();

    expect(graph.container).toBeDefined();
    expect(graph.boardPresent).toBe(false);
    expect(graph.getLessonCapabilities().isAvailable?.()).toBe(true);
    expect(graph.disposeMainView).not.toHaveBeenCalled();
    expect(graph.imports).toEqual([7]);

    view.unmount();

    expect(graph.disposeMainView).toHaveBeenCalledTimes(1);
    expect(graph.getLessonCapabilities().isAvailable?.()).toBe(false);
});

test('board paths of a graph without a board do nothing instead of throwing', async () => {
    const {graph, view} = mountBoardless();

    await settle(() => graph.reset());
    expect(graph.imports).toEqual([7, 7]);

    expect(() => {
        act(() => graph.setElementSize(2));
        act(() => graph.setAxisSelect('xy' as never));
        act(() => graph.setPointLabelsVisible(false));
        graph.boardUpdate();
        graph.unsuspendBoardUpdate();
    }).not.toThrow();

    const {navigate} = graph.getWorkspacePanels({});
    for (const action of ['fit', 'in', 'out', 'left', 'right', 'up', 'down']) {
        expect(() => navigate(action as never)).not.toThrow();
    }

    expect(graph.boardState()).toBeUndefined();
    const preset = graph.exportPreset();
    expect('boardState' in preset).toBe(false);
    expect(preset.data).toEqual({count: 0});

    const capabilities = graph.getLessonCapabilities();
    capabilities.apply({kind: 'prepared-scene', sceneId: 's', source: 'demonstration-default', view: [-1, 1, 1, -1]});
    const checkpoint = capabilities.captureState();
    expect(JSON.stringify(checkpoint.value)).not.toContain('boardState');
    act(() => graph.setState({count: 5}));
    expect(() => capabilities.restoreState(checkpoint)).not.toThrow();
    expect(graph.state.count).toBe(0);

    await expect(graph.saveAsSVG('figure')).resolves.toBeUndefined();

    view.unmount();
    expect(graph.disposeMainView).toHaveBeenCalledTimes(1);
});
