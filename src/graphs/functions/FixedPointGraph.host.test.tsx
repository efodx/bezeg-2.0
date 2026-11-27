import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FixedPointGraph, FIXED_POINT_STEP_INTERVAL_MS} from './FixedPointGraph';
import {GraphHost} from '../base/GraphHost';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {expectUnavailableKeepsFocus} from '../base/unavailableFocusBehaviour';
import {installBoardShims, openTools, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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
        return this.playback.isPlaying;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-fixed-point-status]')].map(element => element.getAttribute('data-fixed-point-status'));
// the axis tick labels follow the fitted view, so they are not counted
const boardObjects = (graph: ObservedFixedPointGraph) => graph.liveBoard().objectsList.filter((object: any) => object.elType !== 'label').length;

test('a real board shows the cobweb: Next step, Play and Pause, Reset, the tolerance and the x0 and error bound pucks work through the real controls', async () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-error-bound');
    await openTools();
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

    // the pucks own the error bound and x0: no second copy in Orodja
    expect(screen.queryByRole('button', {name: /oceno napake/})).toBeNull();
    expect(screen.queryByLabelText('Začetek x₀, vrednost')).toBeNull();

    // the Ocena napake switch puck reveals the bounds
    expect(puckControl('show-error-bound').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-error-bound')); });
    expect(graph.modelNow().boundVisible).toBe(true);
    expect(puckControl('show-error-bound').getAttribute('aria-checked')).toBe('true');
    expect(readout('q')).toBe('0,5');
    expect(readout('a-priori')).toBe('0,125');
    expect(readout('a-posteriori')).toBe('0,125');
    expect(statusIds()).toEqual(['hypotheses', 'bound-a-priori', 'bound-a-posteriori']);

    // x0 is written as the puck writes it, on the 0.01 grid; values outside [0, 2] and off the grid change nothing
    act(() => { graph.parameters!.write('fixed-point-x0', 0.5, 'learner'); });
    expect(graph.modelNow()).toMatchObject({x0: 0.5, step: 0, boundVisible: true});
    expect(readout('step')).toBe('0');
    act(() => { graph.parameters!.write('fixed-point-x0', 2.5, 'learner'); });
    expect(graph.modelNow().x0).toBe(0.5);
    act(() => { graph.parameters!.write('fixed-point-x0', 0.555, 'learner'); });
    expect(graph.modelNow().x0).toBe(0.5);
    act(() => { graph.parameters!.write('fixed-point-x0', 0, 'learner'); });
    expect(graph.modelNow().x0).toBe(0);
    const inputDigits = screen.getByRole('spinbutton', {name: 'Natančnost d (prag 10⁻ᵈ)'}) as HTMLInputElement;
    act(() => { enterNumber(inputDigits, '2.5'); });
    expect(graph.modelNow().digits).toBe(3);
    expect(screen.getByText('Vnesi celo število med 1 in 8.')).toBeInTheDocument();
    act(() => { enterNumber(inputDigits, '2'); });
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
    act(() => { enterNumber(inputDigits, '3'); });
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
    act(() => { fireEvent.click(puckControl('show-error-bound')); });
    expect(statusIds()).toEqual(['cycle', 'no-bound']);
    expect(readout('a-posteriori')).toBe('ni ocene (ni skrčitve)');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);
});

test('a focused control that becomes unavailable keeps keyboard focus (aria-disabled, never disabled) and its click does nothing', async () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-error-bound');
    await openTools();
    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    const resetButton = () => screen.getByRole('button', {name: 'Ponastavi na x₀'}) as HTMLButtonElement;
    expect(resetButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(resetButton()); });
    expect(graph.modelNow().step).toBe(0);

    // Next step reaches the threshold while it has focus
    nextButton().focus();
    for (let guard = 0; guard < 80 && nextButton().getAttribute('aria-disabled') !== 'true'; guard++) act(() => { fireEvent.click(nextButton()); });
    expect(graph.modelNow().step).toBe(10);
    expect(statusIds()).toEqual(['threshold', 'bound-hidden']);
    expectUnavailableKeepsFocus(nextButton, () => graph.modelNow().step);
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
    expectUnavailableKeepsFocus(() => ended, () => [graph.playing(), graph.modelNow().step]);
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().step).toBe(10);
});

test('StrictMode mounts, unmounts and mounts again: playback still works on the remounted board', async () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    await waitForPucks('show-error-bound');
    await openTools();
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { frames.frame(0); frames.frame(FIXED_POINT_STEP_INTERVAL_MS); });
    expect(graph.modelNow().step).toBe(1);
    act(() => { fireEvent.change(screen.getByLabelText('Primer preslikave'), {target: {value: 'cosine'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'cosine', step: 0});
    expect(boardObjects(graph)).toBe(baseline);
});

test('a Play click handled while the graph unmounts leaves no running playback', async () => {
    const frames = manualScheduler();
    const graph = new ObservedFixedPointGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-error-bound');
    await openTools();
    act(() => {
        fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}));
        view.unmount();
    });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
});

test('a live language switch re-evaluates the pucks and the readouts and leaves no caption on the board', async () => {
    const graph = new ObservedFixedPointGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-error-bound');
    await openTools();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Naslednji korak'})); });
    act(() => { fireEvent.click(puckControl('show-error-bound')); });
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text') as any[];
    const boardText = () => texts().map(text => String(text.plaintext)).join('|');
    expect(boardText()).not.toMatch(/korak k|ocena napake|krogec/);
    expect(readout('q')).toBe('0,5');
    expect(document.querySelector('.puck-strip [data-puck-key="show-error-bound"]')?.textContent).toContain('Ocena napake');
    act(() => { setLanguage('en'); });
    expect(boardText()).not.toMatch(/step k|error bound|circle/);
    expect(readout('q')).toBe('0.5');
    expect(document.querySelector('.puck-strip [data-puck-key="show-error-bound"]')?.textContent).toContain('Error bound');
    expect(document.querySelector('.puck-strip [data-puck-key="fixed-point-x0"]')?.textContent).toContain('Start');
    expect(screen.getByRole('button', {name: 'Next step'})).toBeInTheDocument();
    act(() => { setLanguage('sl'); });
    expect(readout('q')).toBe('0,5');
});
