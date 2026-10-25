import React, {StrictMode} from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {JSXGraph} from 'jsxgraph';
import BaseGraph, {BaseGraphState} from './BaseGraph';
import {GraphHost} from './GraphHost';
import {LessonAction} from '../../learning/model';
import type {Mock} from 'vitest';

// A fake board keeps the suite independent of JSXGraph's DOM requirements; the session and host are real.
vi.mock('jsxgraph', () => ({
    JSXGraph: {initBoard: vi.fn(() => ({})), freeBoard: vi.fn()},
}));

interface TestState extends BaseGraphState {
    count: number;
}

class TestGraph extends BaseGraph<TestState> {
    readonly log: string[] = [];
    mounts = 0;
    unmounts = 0;
    containers: HTMLElement[] = [];
    figureCapturePauses = 0;

    override getInitialState(): TestState {
        return {initialized: false, count: 0};
    }

    override mount(container: HTMLElement) {
        this.mounts++;
        this.containers.push(container);
        super.mount(container);
    }

    override unmount() {
        this.unmounts++;
        super.unmount();
    }

    protected override onStateChange(previousState: Readonly<TestState>) {
        this.log.push(`change ${previousState.count}->${this.state.count}`);
    }

    protected override workspaceEdit() {
        return <output data-testid="count">{this.state.count}</output>;
    }

    protected override beforeFigureCapture() {
        this.figureCapturePauses++;
    }

    protected override applyLessonAction(action: LessonAction) {
        if (action.kind === 'bernstein-degree') {
            // Two actions of one lesson scene run in one tick; the second reads what the first wrote.
            this.setState({count: this.state.count + action.degree});
            return;
        }
        super.applyLessonAction(action);
    }

    override presets(): string | undefined { return undefined; }
    defaultPreset() { return ''; }
    initialize() {}

    shownCount() { return screen.getByTestId('count').textContent; }
}

const renderHost = (graph: TestGraph, strict = false) => {
    const host = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    return render(strict ? <StrictMode>{host}</StrictMode> : host);
};

beforeEach(() => {
    // CRA resets mock implementations before every test.
    (JSXGraph.initBoard as Mock).mockImplementation(() => ({containerObj: document.createElement('div')}));
    (JSXGraph.freeBoard as Mock).mockImplementation(() => undefined);
});

test('the host mounts the controller on the container it renders and shows the initialized panels', () => {
    const graph = new TestGraph();
    renderHost(graph);
    expect(graph.mounts).toBe(1);
    expect(graph.containers[0]).toBeInstanceOf(HTMLDivElement);
    expect(graph.containers[0].isConnected).toBe(true);
    expect(JSXGraph.initBoard).toHaveBeenCalledWith(graph.containers[0], expect.anything());
    expect(graph.state.initialized).toBe(true);
    expect(screen.getByTestId('count')).toHaveTextContent('0');
});

test('state changes apply synchronously, then onStateChange runs once per commit with the state before the first update', () => {
    const graph = new TestGraph();
    renderHost(graph);
    graph.log.length = 0;
    const order: string[] = [];
    act(() => {
        graph.setState({count: 1}, () => order.push(`callback-1 ${graph.state.count}`));
        expect(graph.state.count).toBe(1);
        graph.setState({count: 2}, () => order.push(`callback-2 ${graph.state.count}`));
        graph.setState(state => ({count: state.count + 1}));
        expect(graph.state.count).toBe(3);
        // Nothing deferred has run yet, exactly like a batched React update.
        expect(graph.log).toEqual([]);
        expect(order).toEqual([]);
    });
    expect(graph.log).toEqual(['change 0->3']);
    expect(order).toEqual(['callback-1 3', 'callback-2 3']);
    expect(graph.shownCount()).toBe('3');
});

test('onStateChange runs before the queued callbacks of the same batch', () => {
    const graph = new TestGraph();
    renderHost(graph);
    graph.log.length = 0;
    act(() => {
        graph.setState({count: 4}, () => graph.log.push('callback'));
    });
    expect(graph.log).toEqual(['change 0->4', 'callback']);
});

test('a callback runs after the host committed the render, even when the update changed nothing', () => {
    const graph = new TestGraph();
    renderHost(graph);
    const shown: Array<string | null> = [];
    act(() => {
        graph.setState({count: 7}, () => shown.push(graph.shownCount()));
        graph.setState(() => null, () => shown.push(`unchanged ${graph.shownCount()}`));
    });
    expect(shown).toEqual(['7', 'unchanged 7']);
});

test('requestRender re-renders the panels and calls back after the commit', () => {
    const graph = new TestGraph();
    renderHost(graph);
    const shown: Array<string | null> = [];
    const renders = vi.spyOn(graph, 'getWorkspacePanels');
    act(() => {
        graph.requestRender(() => shown.push(graph.shownCount()));
        expect(shown).toEqual([]);
    });
    expect(renders).toHaveBeenCalled();
    expect(shown).toEqual(['0']);
});

test('a callback queued while flushing waits for the next commit', () => {
    const graph = new TestGraph();
    renderHost(graph);
    const events: string[] = [];
    act(() => {
        graph.requestRender(() => {
            events.push('outer');
            graph.setState({count: 9}, () => events.push(`inner ${graph.shownCount()}`));
        });
    });
    expect(events).toEqual(['outer', 'inner 9']);
});

test('under StrictMode the controller is mounted, disposed and mounted again, and ends with one live board', () => {
    const graph = new TestGraph();
    const view = renderHost(graph, true);
    expect(graph.mounts).toBe(2);
    expect(graph.unmounts).toBe(1);
    expect(JSXGraph.initBoard).toHaveBeenCalledTimes(2);
    expect(JSXGraph.freeBoard).toHaveBeenCalledTimes(1);
    expect(graph.state.initialized).toBe(true);
    expect(graph.containers[0]).toBe(graph.containers[1]);
    view.unmount();
    expect(graph.unmounts).toBe(2);
    expect(JSXGraph.freeBoard).toHaveBeenCalledTimes(2);
});

test('mount after unmount on the same instance starts from a fresh scene state', () => {
    const graph = new TestGraph();
    const container = document.createElement('div');
    graph.mount(container);
    graph.setState({count: 5});
    graph.unmount();
    graph.mount(container);
    expect(graph.state.count).toBe(0);
    expect(graph.state.initialized).toBe(true);
    graph.unmount();
    expect(JSXGraph.freeBoard).toHaveBeenCalledTimes(2);
});

test('unmounting disposes the board, drops pending state work and still settles pending callbacks', () => {
    const graph = new TestGraph();
    const view = renderHost(graph);
    graph.log.length = 0;
    const settled = vi.fn();
    // The host has not committed this update yet when it unmounts.
    act(() => {
        graph.setState({count: 3}, settled);
        view.unmount();
    });
    expect(JSXGraph.freeBoard).toHaveBeenCalledTimes(1);
    expect(graph.log).toEqual([]);
    expect(settled).toHaveBeenCalledTimes(1);
    graph.flushStateChanges();
    expect(settled).toHaveBeenCalledTimes(1);
});

test('flushStateChanges runs the pending work immediately for hostless use', () => {
    const graph = new TestGraph();
    graph.setState({count: 2}, () => graph.log.push('callback'));
    graph.setState({count: 3});
    expect(graph.log).toEqual([]);
    graph.flushStateChanges();
    expect(graph.log).toEqual(['change 0->3', 'callback']);
    graph.flushStateChanges();
    expect(graph.log).toEqual(['change 0->3', 'callback']);
});

test('a later lesson action in the same tick reads the state an earlier one wrote', () => {
    const graph = new TestGraph();
    const action = (degree: number): LessonAction => ({kind: 'bernstein-degree', degree});
    const capabilities = graph.getLessonCapabilities();
    capabilities.apply(action(2));
    capabilities.apply(action(3));
    capabilities.apply(action(4));
    expect(graph.state.count).toBe(9);
});

test('the initialized panels are committed synchronously with the initial render, not on a later tick', () => {
    const graph = new TestGraph();
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const environment = globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT?: boolean};
    const previous = environment.IS_REACT_ACT_ENVIRONMENT;
    environment.IS_REACT_ACT_ENVIRONMENT = false;
    try {
        flushSync(() => root.render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>));
        // No act(), no timers: the mount's state change must already be rendered.
        expect(host.querySelector('[data-testid="count"]')).not.toBeNull();
        expect(host.textContent).not.toMatch(/Priprava grafa|Preparing graph/);
        expect(graph.log.length).toBe(1);
    } finally {
        flushSync(() => root.unmount());
        host.remove();
        environment.IS_REACT_ACT_ENVIRONMENT = previous;
    }
});

test('the preset service is created once', () => {
    class PresetGraph extends TestGraph {
        override presets() { return 'test-presets'; }
    }
    const graph = new PresetGraph();
    expect(graph.presetService).toBeDefined();
    expect(graph.presetService).toBe(graph.presetService);
});

test('workspace panels expose graph-owned playback pause and picker availability without changing graphBusy', () => {
    const graph = new TestGraph();
    const panels = graph.getWorkspacePanels({});
    expect(panels.graphBusy).toBe(false);
    expect(panels.pickerUnavailable).toBe(false);

    panels.pausePlayback();
    expect(graph.figureCapturePauses).toBe(1);

    (graph as any).activeSingleFigureExports = 1;
    const exportingPanels = graph.getWorkspacePanels({});
    expect(exportingPanels.pickerUnavailable).toBe(true);
    expect(exportingPanels.graphBusy).toBe(false);
});
