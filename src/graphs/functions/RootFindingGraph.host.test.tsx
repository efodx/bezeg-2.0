import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {RootFindingGraph, ROOT_FINDING_STEP_INTERVAL_MS} from './RootFindingGraph';
import {GraphHost} from '../base/GraphHost';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';

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

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedRootFindingGraph extends RootFindingGraph {
    modelNow() {
        return this.model;
    }

    playing() {
        return this.playback.isPlaying;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusId = () => document.querySelector('[data-root-finding-status]')?.getAttribute('data-root-finding-status');

test('a real board shows the iteration: Next step, Play and Pause, Reset, the method switch and the readouts work through the real controls', () => {
    const frames = manualScheduler();
    const graph = new ObservedRootFindingGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(readout('step')).toBe('0');
    expect(statusId()).toBe('ready');
    expect(screen.queryByLabelText('Drugi začetni približek x₁')).toBeNull();

    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    act(() => { fireEvent.click(nextButton()); });
    expect(readout('step')).toBe('1');
    expect(readout('iterate')).toBe('1,5'); // the decimal comma of Slovenian
    expect(readout('f-iterate')).toBe('0,25');
    expect(statusId()).toBe('running');
    expect(document.querySelectorAll('[data-iterate-row]').length).toBe(2);

    // Play runs the shared transition at the frame interval and ends at the root
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    expect(nextButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { frames.frame(0); });
    for (let guard = 0; guard < 20 && graph.playing(); guard++) act(() => { frames.frame(ROOT_FINDING_STEP_INTERVAL_MS); });
    expect(graph.playing()).toBe(false);
    expect(statusId()).toBe('root-found');
    expect(readout('iterate')).toBe('1,414213562373');

    // a start edit through the real input restarts the history; Reset keeps the model
    const inputX0 = screen.getByLabelText('Začetni približek x₀') as HTMLInputElement;
    act(() => { enterNumber(inputX0, '0.5'); });
    expect(graph.modelNow()).toEqual({method: 'newton', example: 'square-minus-two', x0: 0.5, x1: 2, step: 0});
    expect(statusId()).toBe('ready');
    act(() => { fireEvent.click(nextButton()); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi iteracijo'})); });
    expect(graph.modelNow().step).toBe(0);

    // the method switch keeps example and start, shows the second start, and restarts
    act(() => { fireEvent.click(nextButton()); });
    act(() => { fireEvent.change(screen.getByLabelText('Metoda'), {target: {value: 'secant'}}); });
    expect(graph.modelNow()).toEqual({method: 'secant', example: 'square-minus-two', x0: 0.5, x1: 2, step: 0});
    expect(screen.getByLabelText('Drugi začetni približek x₁')).toBeInTheDocument();
    expect(statusId()).toBe('ready');
});

test('unmount leaves no timer and Play stops when the preset is replaced', () => {
    const frames = manualScheduler();
    const graph = new ObservedRootFindingGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(frames.callbacks.size).toBe(1);
    view.unmount();
    expect(frames.callbacks.size).toBe(0);
    expect(graph.playing()).toBe(false);
});
