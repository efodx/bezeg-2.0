import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import DecasteljauGraph from '../curves/bezier/DecasteljauGraph';
import {GraphHost} from './GraphHost';
import {LessonSession} from '../../learning/runtime/LessonSession';
import type {LessonDefinition} from '../../learning/model';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

// A real graph through the real host and a real JSXGraph board (jsdom), so the host's flush ordering is exercised
// with a subclass that really reacts to state changes.
class ObservedDecasteljauGraph extends DecasteljauGraph {
    readonly stateChanges: Array<[number, number]> = [];

    protected override onStateChange(previousState: Readonly<ReturnType<DecasteljauGraph["getInitialState"]>>) {
        this.stateChanges.push([previousState.t, this.state.t]);
        super.onStateChange(previousState);
    }

    /** Test access to the protected board. */
    liveBoard() {
        return this.board;
    }

    drawnParameter() {
        return this.getFirstJxgCurve().getDecasteljauT();
    }
}

test('a state change on a real graph calls onStateChange once per commit and redraws the board', () => {
    const graph = new ObservedDecasteljauGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(screen.queryByText(/Priprava grafa|Preparing graph/)).not.toBeInTheDocument();

    const update = vi.spyOn(graph.liveBoard(), 'update');
    graph.stateChanges.length = 0;
    act(() => {
        graph.setState({t: 0.25});
        graph.setState({t: 0.75});
    });
    expect(graph.stateChanges).toEqual([[0.5, 0.75]]);
    expect(update).toHaveBeenCalled();

    update.mockClear();
    act(() => {
        graph.setState({t: 0.4});
    });
    expect(graph.stateChanges).toEqual([[0.5, 0.75], [0.75, 0.4]]);
    expect(update).toHaveBeenCalled();
});

test('a play callback still queued when the graph unmounts does not restart the animation', () => {
    const graph = new ObservedDecasteljauGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        graph['playAnimation']();
        expect(graph['lessonAnimation'].isRunning()).toBe(false);
    });
    // Played normally once the host has committed.
    expect(graph['lessonAnimation'].isRunning()).toBe(true);
    view.unmount();
    expect(graph['lessonAnimation'].isRunning()).toBe(false);

    const second = new ObservedDecasteljauGraph();
    const secondView = render(<MemoryRouter><GraphHost create={() => second}/></MemoryRouter>);
    act(() => {
        second['playAnimation']();
        secondView.unmount();
    });
    expect(second['lessonAnimation'].isRunning()).toBe(false);
});

test('a later scene failure restores the entry model and real board without writing Presets', () => {
    const graph = new ObservedDecasteljauGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const board = graph.liveBoard();
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const definition: LessonDefinition = {
        id: 'recovery', demonstrationId: 'decasteljau',
        title: {sl: 'Test', en: 'Test'}, summary: {sl: 'Test', en: 'Test'},
        steps: [{id: 'scene', title: {sl: 'Test', en: 'Test'}, body: {sl: 'Test', en: 'Test'},
            scene: {actions: [{kind: 'parameter', name: 't', value: 0.25}]} }],
    };
    const capabilities = graph.getLessonCapabilities();
    const applyAction = capabilities.apply;
    const observedParameters: number[] = [];
    const apply = vi.spyOn(capabilities, 'apply').mockImplementation(action => {
        if (action.kind === 'bernstein-degree') {
            observedParameters.push(graph.state.t, graph.drawnParameter());
        }
        applyAction(action);
    });
    const session = new LessonSession(definition, capabilities);
    act(() => session.start());
    expect(graph.state.t).toBe(0.25);
    expect(graph.drawnParameter()).toBe(0.25);

    const failure = new LessonSession({...definition, steps: [{...definition.steps[0], scene: {actions: [
        {kind: 'parameter', name: 't', value: 0.75},
        {kind: 'bernstein-degree', degree: 3},
    ]}}]}, capabilities);
    graph.stateChanges.length = 0;
    act(() => {
        expect(() => failure.start()).toThrow();
        // Rollback finishes before the host commits the batched writes.
        expect(graph.state.t).toBe(0.25);
    });
    expect(observedParameters).toEqual([0.75, 0.75]);
    expect(apply).toHaveBeenCalledWith({kind: 'parameter', name: 't', value: 0.75});
    expect(graph.liveBoard()).toBe(board);
    expect(graph.drawnParameter()).toBe(0.25);
    expect(board.objectsList.length).toBeGreaterThan(0);
    expect(graph.stateChanges).toEqual([[0.25, 0.25]]);
    expect(storageWrite).not.toHaveBeenCalled();
    act(() => session.close());
    expect(graph.state.t).toBe(0.5);
    expect(graph.drawnParameter()).toBe(0.5);
    const checkpoint = capabilities.captureState();
    view.unmount();
    expect(capabilities.isAvailable?.()).toBe(false);
    const disposedState = graph.state;
    capabilities.restoreState(checkpoint);
    expect(graph.state).toBe(disposedState);
    expect(() => session.close()).not.toThrow();
    storageWrite.mockRestore();
});
