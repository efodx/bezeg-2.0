import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FixedPointGraph, FIXED_POINT_STEP_INTERVAL_MS} from './FixedPointGraph';
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
class ObservedFixedPointGraph extends FixedPointGraph {
    liveBoard() {
        return this.board;
    }

    modelNow() {
        return this.model;
    }

    playing() {
        return this['controller'].isPlaying();
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-fixed-point-status]')].map(element => element.getAttribute('data-fixed-point-status'));
const boardObjects = (graph: ObservedFixedPointGraph) => graph.liveBoard().objectsList.length;

test('a real board shows the cobweb: Next step, Play and Pause, Reset, the fields and Show error bound work through the real controls', () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    const baseline = boardObjects(graph);
    expect(readout('step')).toBe('0');
    expect(readout('a-posteriori')).toBe('skrito');
    expect(statusIds()).toEqual(['bound-hidden']);

    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    for (let i = 0; i < 3; i++) act(() => { fireEvent.click(nextButton()); });
    expect(readout('step')).toBe('3');
    expect(readout('current')).toBe('0,875');
    expect(boardObjects(graph)).toBe(baseline);

    // Show error bound is a native button whose label names its state
    const toggle = () => screen.getByRole('button', {name: /oceno napake/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži oceno napake');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow().boundVisible).toBe(true);
    expect(toggle().textContent).toBe('Skrij oceno napake');
    expect(readout('q')).toBe('0,5');
    expect(readout('a-priori')).toBe('0,125');
    expect(readout('a-posteriori')).toBe('0,125');
    expect(statusIds()).toEqual(['hypotheses', 'bound-a-priori', 'bound-a-posteriori']);

    // the labelled fields take x0 on the 0.01 grid and the tolerance digits; other values are refused with a hint
    const inputX0 = screen.getByLabelText('Začetek x₀') as HTMLInputElement;
    act(() => { fireEvent.change(inputX0, {target: {value: '0.5'}}); });
    expect(graph.modelNow()).toMatchObject({x0: 0.5, step: 0, boundVisible: true});
    expect(readout('step')).toBe('0');
    act(() => { fireEvent.change(inputX0, {target: {value: '2.5'}}); });
    expect(graph.modelNow().x0).toBe(0.5);
    expect(screen.getByText('Vnesi vrednost med 0 in 2.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputX0, {target: {value: '0.555'}}); });
    expect(graph.modelNow().x0).toBe(0.5);
    expect(screen.getByText('Začetek x₀ mora biti večkratnik števila 0,01 med 0 in 2.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputX0, {target: {value: '0'}}); });
    const inputDigits = screen.getByLabelText('Natančnost d (prag 10⁻ᵈ)') as HTMLInputElement;
    act(() => { fireEvent.change(inputDigits, {target: {value: '2.5'}}); });
    expect(graph.modelNow().digits).toBe(3);
    expect(screen.getByText('Število d mora biti celo število med 1 in 8.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputDigits, {target: {value: '2'}}); });
    expect(graph.modelNow().digits).toBe(2);
    expect(readout('tolerance')).toBe('10⁻²');

    // Play shows Pause, runs the shared transition at the frame interval and stops when paused
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    expect(screen.getByRole('button', {name: 'Premor'})).toBeInTheDocument();
    expect(nextButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { frames.frame(0); frames.frame(FIXED_POINT_STEP_INTERVAL_MS); });
    expect(readout('step')).toBe('1');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Premor'})); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);

    // an edit through the real input pauses playback and returns to step 0
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { fireEvent.change(inputDigits, {target: {value: '3'}}); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(readout('step')).toBe('0');

    // Play runs to the threshold and stops by itself with the reason
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    for (let guard = 0; guard < 100 && graph.playing(); guard++) act(() => { frames.frame(guard === 0 ? 0 : FIXED_POINT_STEP_INTERVAL_MS); });
    expect(graph.playing()).toBe(false);
    expect(readout('step')).toBe('10');
    expect(readout('end')).toBe('ocena a posteriori pod pragom');
    expect(statusIds()).toEqual(['threshold', 'hypotheses', 'bound-a-priori', 'bound-a-posteriori']);

    // Reset returns to step 0, the example select loads another example's model
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi na x₀'})); });
    expect(readout('step')).toBe('0');
    const select = screen.getByLabelText('Primer preslikave') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'reflection'}}); });
    expect(graph.modelNow()).toEqual({example: 'reflection', x0: 0.2, step: 0, digits: 3, boundVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    for (let i = 0; i < 3; i++) act(() => { fireEvent.click(nextButton()); });
    act(() => { fireEvent.click(toggle()); });
    expect(statusIds()).toEqual(['cycle', 'no-bound']);
    expect(readout('a-posteriori')).toBe('ni ocene (ni skrčitve)');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);
});

test('a focused control that becomes unavailable keeps keyboard focus (aria-disabled, never disabled) and its click does nothing', () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    const resetButton = () => screen.getByRole('button', {name: 'Ponastavi na x₀'}) as HTMLButtonElement;
    expect(resetButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(resetButton()); });
    expect(graph.modelNow().step).toBe(0);

    // Next step reaches the threshold while it has focus
    nextButton().focus();
    for (let guard = 0; guard < 80 && nextButton().getAttribute('aria-disabled') !== 'true'; guard++) act(() => { fireEvent.click(nextButton()); });
    expect(nextButton().getAttribute('aria-disabled')).toBe('true');
    expect(nextButton().hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(nextButton());
    expect(graph.modelNow().step).toBe(10);
    expect(statusIds()).toEqual(['threshold', 'bound-hidden']);
    act(() => { fireEvent.click(nextButton()); });
    expect(graph.modelNow().step).toBe(10);

    // Reset returns to step 0; Play then runs to the end while the Play button has focus, and keeps it
    act(() => { fireEvent.click(resetButton()); });
    expect(graph.modelNow().step).toBe(0);
    const play = screen.getByRole('button', {name: 'Predvajaj'}) as HTMLButtonElement;
    play.focus();
    act(() => { fireEvent.click(play); });
    expect(graph.playing()).toBe(true);
    expect(play.hasAttribute('aria-pressed')).toBe(false);
    expect(document.activeElement).toBe(play);
    for (let guard = 0; guard < 200 && graph.playing(); guard++) act(() => { frames.frame(FIXED_POINT_STEP_INTERVAL_MS); });
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().step).toBe(10);
    const ended = screen.getByRole('button', {name: 'Predvajaj'}) as HTMLButtonElement;
    expect(ended.getAttribute('aria-disabled')).toBe('true');
    expect(ended.hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(ended);
    act(() => { fireEvent.click(ended); });
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().step).toBe(10);
});

test('StrictMode mounts, unmounts and mounts again: playback still works on the remounted board and nothing runs after the final unmount', () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { frames.frame(0); frames.frame(FIXED_POINT_STEP_INTERVAL_MS); });
    expect(graph.modelNow().step).toBe(1);
    act(() => { fireEvent.change(screen.getByLabelText('Primer preslikave'), {target: {value: 'cosine'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'cosine', step: 0});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.playing()).toBe(false);
    expect(frames.frame(FIXED_POINT_STEP_INTERVAL_MS)).toBe(false);
});

test('a Play click handled while the graph unmounts leaves no running playback', () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}));
        view.unmount();
    });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
});

test('a live language switch re-evaluates the board texts and the readouts', () => {
    const graph = new ObservedFixedPointGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Naslednji korak'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži oceno napake'})); });
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text') as any[];
    const boardText = () => texts().map(text => String(text.plaintext)).join('|');
    expect(boardText()).toContain('korak k = 1, xₖ = 0,5');
    expect(boardText()).toContain('|xₖ − x*| ≤ 0,5');
    expect(boardText()).toContain('krogec: približek; križec: fiksna točka');
    expect(readout('q')).toBe('0,5');
    act(() => { setLanguage('en'); });
    expect(boardText()).toContain('step k = 1, xₖ = 0.5');
    expect(boardText()).toContain('|xₖ − x*| ≤ 0.5');
    expect(boardText()).toContain('circle: iterate; cross: fixed point');
    expect(boardText()).not.toContain('krogec');
    expect(readout('q')).toBe('0.5');
    expect(screen.getByRole('button', {name: 'Hide error bound'})).toBeInTheDocument();
    expect(screen.getByLabelText('Start x₀')).toBeInTheDocument();
    act(() => { setLanguage('sl'); });
    expect(boardText()).toContain('korak k = 1, xₖ = 0,5');
});
