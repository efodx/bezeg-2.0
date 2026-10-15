import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BisectionGraph, BISECTION_STEP_INTERVAL_MS} from './BisectionGraph';
import {GraphHost} from '../base/GraphHost';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {setLanguage} from '../../localization';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => {const handle = nextHandle++; callbacks.set(handle, callback); return handle;},
        cancel: handle => {callbacks.delete(handle);},
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, callbacks, frame};
}

/** A real graph through the real host and a real JSXGraph board (jsdom), so the host's mount, remount and unmount ordering is exercised. */
class ObservedBisectionGraph extends BisectionGraph {
    liveBoard() {
        return this.board;
    }

    modelNow() {
        return this.model;
    }

    playing() {
        return this['controller'].isPlaying();
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const mountObjects = (graph: ObservedBisectionGraph) => graph.liveBoard().objectsList.length;

test('a real board shows the iteration: Next step, Play and Pause, Reset and the readouts work through the real controls', () => {
    const frames = manualScheduler();
    const graph = new ObservedBisectionGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(readout('step')).toBe('0');
    expect(readout('mid')).toBe('—');

    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    act(() => { fireEvent.click(nextButton()); });
    expect(readout('step')).toBe('1');
    expect(readout('mid')).toBe('1,5');
    expect(readout('f-mid')).toBe('0,25');
    act(() => { fireEvent.click(nextButton()); });
    act(() => { fireEvent.click(nextButton()); });
    expect(readout('mid')).toBe('1,375');
    expect(readout('f-mid')).toBe('−0,109375');
    expect(readout('width')).toBe('0,125');

    // Play shows Pause, runs the shared transition at the frame interval and stops when paused
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    expect(screen.getByRole('button', {name: 'Premor'})).toBeInTheDocument();
    expect(nextButton().disabled).toBe(true);
    act(() => { frames.frame(0); frames.frame(BISECTION_STEP_INTERVAL_MS); });
    expect(readout('step')).toBe('4');
    expect(readout('mid')).toBe('1,4375');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Premor'})); });
    expect(graph.playing()).toBe(false);
    expect(screen.getByRole('button', {name: 'Predvajaj'})).toBeInTheDocument();
    expect(frames.callbacks.size).toBe(0);

    // an endpoint edit through the real input restarts the history
    const inputA = screen.getByLabelText('Levo krajišče a') as HTMLInputElement;
    act(() => { fireEvent.change(inputA, {target: {value: '0.5'}}); });
    expect(graph.modelNow()).toEqual({example: 'square-minus-two', a: 0.5, b: 2, step: 0});
    expect(readout('step')).toBe('0');
    act(() => { fireEvent.click(nextButton()); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi iteracijo'})); });
    expect(graph.modelNow().step).toBe(0);
});

test('StrictMode mounts, unmounts and mounts again: playback still works on the remounted board and nothing runs after the final unmount', () => {
    const frames = manualScheduler();
    const graph = new ObservedBisectionGraph(frames.scheduler);
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = mountObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { frames.frame(0); frames.frame(BISECTION_STEP_INTERVAL_MS); });
    expect(graph.modelNow().step).toBe(1);
    expect(mountObjects(graph)).toBe(baseline);
    view.unmount();
    expect(frames.callbacks.size).toBe(0);
    expect(graph.playing()).toBe(false);
    expect(frames.frame(BISECTION_STEP_INTERVAL_MS)).toBe(false);
});

test('a Play click handled while the graph unmounts leaves no running playback', () => {
    const frames = manualScheduler();
    const graph = new ObservedBisectionGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}));
        view.unmount();
    });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
});
