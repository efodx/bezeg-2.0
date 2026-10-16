import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SequenceGraph, SEQUENCE_STEP_INTERVAL_MS} from './SequenceGraph';
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
class ObservedSequenceGraph extends SequenceGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-sequence-status]')].map(element => element.getAttribute('data-sequence-status'));
const boardObjects = (graph: ObservedSequenceGraph) => graph.liveBoard().objectsList.length;

test('a real board shows the terms: Next step, Play and Pause, Reset, the fields and Show certificate work through the real controls', () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    const baseline = boardObjects(graph);
    expect(readout('terms')).toBe('1');
    expect(readout('certificate')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);

    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    for (let i = 0; i < 11; i++) act(() => { fireEvent.click(nextButton()); });
    expect(readout('terms')).toBe('12');
    expect(readout('last-term')).toBe('0,0833');
    expect(readout('in-band-count')).toBe('2 od 12');

    // Show certificate is a native button whose label names its state; with N = 5 it says N does not work
    const toggle = () => screen.getByRole('button', {name: /certifikat/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži certifikat');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow().certificateVisible).toBe(true);
    expect(toggle().textContent).toBe('Skrij certifikat');
    expect(readout('certificate')).toBe('N ne deluje');
    expect(readout('n-min')).toBe('11');
    expect(statusIds()).toEqual(['threshold-fails']);

    // the labelled field takes N; an out-of-range or non-integer value is refused with a hint
    const inputN = screen.getByLabelText('Prag N') as HTMLInputElement;
    act(() => { fireEvent.change(inputN, {target: {value: '11'}}); });
    expect(graph.modelNow()).toMatchObject({threshold: 11, terms: 12, certificateVisible: true});
    expect(readout('certificate')).toBe('N deluje');
    expect(readout('bound')).toBe('1/11 = 0,0909');
    act(() => { fireEvent.change(inputN, {target: {value: '1001'}}); });
    expect(graph.modelNow().threshold).toBe(11);
    expect(screen.getByText('Vnesi vrednost med 1 in 1000.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputN, {target: {value: '2.5'}}); });
    expect(graph.modelNow().threshold).toBe(11);
    expect(screen.getByText('Prag N mora biti celo število med 1 in 1000.')).toBeInTheDocument();

    // epsilon takes grid values only
    const inputEpsilon = screen.getByLabelText('Širina pasu ε') as HTMLInputElement;
    act(() => { fireEvent.change(inputEpsilon, {target: {value: '0.05'}}); });
    expect(graph.modelNow()).toMatchObject({epsilon: 0.05, threshold: 11});
    expect(readout('certificate')).toBe('N ne deluje');
    expect(readout('n-min')).toBe('21');
    act(() => { fireEvent.change(inputEpsilon, {target: {value: '0.055'}}); });
    expect(graph.modelNow().epsilon).toBe(0.05);
    expect(screen.getByText('Širina pasu ε mora biti večkratnik števila 0,01 med 0,01 in 2.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputEpsilon, {target: {value: '0.1'}}); });

    // Play shows Pause, runs the shared transition at the frame interval and stops when paused
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    expect(screen.getByRole('button', {name: 'Premor'})).toBeInTheDocument();
    expect(nextButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { frames.frame(0); frames.frame(SEQUENCE_STEP_INTERVAL_MS); });
    expect(readout('terms')).toBe('13');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Premor'})); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);

    // an edit through the real input pauses playback
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { fireEvent.change(inputEpsilon, {target: {value: '0.2'}}); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(readout('terms')).toBe('13');

    // Reset returns to one term, the example select loads another example's model
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi na en člen'})); });
    expect(readout('terms')).toBe('1');
    const select = screen.getByLabelText('Primer zaporedja') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'alternating-sign'}}); });
    expect(graph.modelNow()).toEqual({example: 'alternating-sign', epsilon: 0.5, limit: 0, threshold: 5, terms: 1, certificateVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    act(() => { fireEvent.change(screen.getByLabelText('Širina pasu ε'), {target: {value: '1.5'}}); });
    act(() => { fireEvent.click(toggle()); });
    expect(statusIds()).toEqual(['epsilon-satisfied']);
    act(() => { fireEvent.change(screen.getByLabelText('Širina pasu ε'), {target: {value: '0.5'}}); });
    expect(statusIds()).toEqual(['oscillating']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);
});

test('a focused control that becomes unavailable keeps keyboard focus (aria-disabled, never disabled) and its click does nothing', () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    const resetButton = () => screen.getByRole('button', {name: 'Ponastavi na en člen'}) as HTMLButtonElement;
    expect(resetButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(resetButton()); });
    expect(graph.modelNow().terms).toBe(1);

    // Next step reaches the last term while it has focus
    nextButton().focus();
    for (let guard = 0; guard < 80 && nextButton().getAttribute('aria-disabled') !== 'true'; guard++) act(() => { fireEvent.click(nextButton()); });
    expect(nextButton().getAttribute('aria-disabled')).toBe('true');
    expect(nextButton().hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(nextButton());
    expect(graph.modelNow().terms).toBe(40);
    expect(statusIds()).toEqual(['hidden', 'complete']);
    act(() => { fireEvent.click(nextButton()); });
    expect(graph.modelNow().terms).toBe(40);

    // Reset returns to one term; Play then runs to the end while the Play button has focus, and keeps it
    act(() => { fireEvent.click(resetButton()); });
    expect(graph.modelNow().terms).toBe(1);
    const play = screen.getByRole('button', {name: 'Predvajaj'}) as HTMLButtonElement;
    play.focus();
    act(() => { fireEvent.click(play); });
    expect(graph.playing()).toBe(true);
    expect(play.hasAttribute('aria-pressed')).toBe(false);
    expect(document.activeElement).toBe(play);
    for (let guard = 0; guard < 200 && graph.playing(); guard++) act(() => { frames.frame(SEQUENCE_STEP_INTERVAL_MS); });
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().terms).toBe(40);
    const ended = screen.getByRole('button', {name: 'Predvajaj'}) as HTMLButtonElement;
    expect(ended.getAttribute('aria-disabled')).toBe('true');
    expect(ended.hasAttribute('disabled')).toBe(false);
    expect(document.activeElement).toBe(ended);
    act(() => { fireEvent.click(ended); });
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().terms).toBe(40);
});

test('StrictMode mounts, unmounts and mounts again: playback still works on the remounted board and nothing runs after the final unmount', () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { frames.frame(0); frames.frame(SEQUENCE_STEP_INTERVAL_MS); });
    expect(graph.modelNow().terms).toBe(2);
    act(() => { fireEvent.change(screen.getByLabelText('Primer zaporedja'), {target: {value: 'natural'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'natural', terms: 1});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
    expect(frames.callbacks.size).toBe(0);
    expect(graph.playing()).toBe(false);
    expect(frames.frame(SEQUENCE_STEP_INTERVAL_MS)).toBe(false);
});

test('a Play click handled while the graph unmounts leaves no running playback', () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => {
        fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}));
        view.unmount();
    });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
});

test('a live language switch re-evaluates the board texts and the readouts', () => {
    const graph = new ObservedSequenceGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži certifikat'})); });
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text') as any[];
    const boardText = () => texts().map(text => String(text.plaintext)).join('|');
    expect(boardText()).toContain('ε = 0,1, L = 0, N = 5');
    expect(boardText()).toContain('certifikat: N ne deluje');
    expect(boardText()).toContain('krogec: člen v pasu; križec: člen izven pasu');
    expect(readout('certificate')).toBe('N ne deluje');
    act(() => { setLanguage('en'); });
    expect(boardText()).toContain('ε = 0.1, L = 0, N = 5');
    expect(boardText()).toContain('certificate: N does not work');
    expect(boardText()).toContain('circle: term inside the band; cross: term outside the band');
    expect(boardText()).not.toContain('krogec');
    expect(readout('certificate')).toBe('N does not work');
    expect(screen.getByRole('button', {name: 'Hide certificate'})).toBeInTheDocument();
    expect(screen.getByLabelText('Band width ε')).toBeInTheDocument();
    act(() => { setLanguage('sl'); });
    expect(boardText()).toContain('ε = 0,1, L = 0, N = 5');
});
