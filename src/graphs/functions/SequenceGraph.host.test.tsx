import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SequenceGraph, SEQUENCE_STEP_INTERVAL_MS} from './SequenceGraph';
import {GraphHost} from '../base/GraphHost';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {setLanguage} from '../../localization';
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
class ObservedSequenceGraph extends SequenceGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-sequence-status]')].map(element => element.getAttribute('data-sequence-status'));
// the axis tick labels follow the fitted view, so they are not counted
const boardObjects = (graph: ObservedSequenceGraph) => graph.liveBoard().objectsList.filter((object: any) => object.elType !== 'label').length;

test('a real board shows the terms: Next step, Play and Pause, Reset and the example work through the real controls, the band, limit, threshold and certificate through their pucks', async () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-certificate');
    await openTools();
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

    // the pucks own the three numbers and the certificate: no second copy in Orodja
    expect(screen.queryByRole('button', {name: /certifikat/})).toBeNull();
    expect(screen.queryByLabelText('Prag N, vrednost')).toBeNull();
    expect(screen.queryByLabelText('Širina pasu ε, vrednost')).toBeNull();

    // the Certifikat switch puck reveals the verdict; with N = 5 it says N does not work
    expect(puckControl('show-certificate').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-certificate')); });
    expect(graph.modelNow().certificateVisible).toBe(true);
    expect(puckControl('show-certificate').getAttribute('aria-checked')).toBe('true');
    expect(readout('certificate')).toBe('N ne deluje');
    expect(readout('n-min')).toBe('11');
    expect(statusIds()).toEqual(['threshold-fails']);

    // N is written as its puck writes it; an out-of-range or non-integer value changes nothing
    act(() => { graph.parameters!.write('sequence-threshold', 11, 'learner'); });
    expect(graph.modelNow()).toMatchObject({threshold: 11, terms: 12, certificateVisible: true});
    expect(readout('certificate')).toBe('N deluje');
    expect(readout('bound')).toBe('1/11 = 0,0909');
    act(() => { graph.parameters!.write('sequence-threshold', 1001, 'learner'); });
    expect(graph.modelNow().threshold).toBe(11);
    act(() => { graph.parameters!.write('sequence-threshold', 2.5, 'learner'); });
    expect(graph.modelNow().threshold).toBe(11);

    // epsilon takes grid values only
    act(() => { graph.parameters!.write('sequence-epsilon', 0.05, 'learner'); });
    expect(graph.modelNow()).toMatchObject({epsilon: 0.05, threshold: 11});
    expect(readout('certificate')).toBe('N ne deluje');
    expect(readout('n-min')).toBe('21');
    act(() => { graph.parameters!.write('sequence-epsilon', 0.055, 'learner'); });
    expect(graph.modelNow().epsilon).toBe(0.05);
    act(() => { graph.parameters!.write('sequence-epsilon', 0.1, 'learner'); });

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

    // an edit through a puck pauses playback
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { graph.parameters!.write('sequence-epsilon', 0.2, 'learner'); });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
    expect(readout('terms')).toBe('13');

    // Reset returns to one term, the example select loads another example's model
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi'})); });
    expect(readout('terms')).toBe('1');
    const select = screen.getByLabelText('Primer zaporedja') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'alternating-sign'}}); });
    expect(graph.modelNow()).toEqual({example: 'alternating-sign', epsilon: 0.5, limit: 0, threshold: 5, terms: 1, certificateVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    act(() => { graph.parameters!.write('sequence-epsilon', 1.5, 'learner'); });
    act(() => { fireEvent.click(puckControl('show-certificate')); });
    expect(statusIds()).toEqual(['epsilon-satisfied']);
    act(() => { graph.parameters!.write('sequence-epsilon', 0.5, 'learner'); });
    expect(statusIds()).toEqual(['oscillating']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);
});

test('a focused control that becomes unavailable keeps keyboard focus (aria-disabled, never disabled) and its click does nothing', async () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-certificate');
    await openTools();
    const nextButton = () => screen.getByRole('button', {name: 'Naslednji korak'}) as HTMLButtonElement;
    const resetButton = () => screen.getByRole('button', {name: 'Ponastavi'}) as HTMLButtonElement;
    expect(resetButton().getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(resetButton()); });
    expect(graph.modelNow().terms).toBe(1);

    // Next step reaches the last term while it has focus
    nextButton().focus();
    for (let guard = 0; guard < 80 && nextButton().getAttribute('aria-disabled') !== 'true'; guard++) act(() => { fireEvent.click(nextButton()); });
    expect(graph.modelNow().terms).toBe(40);
    expect(statusIds()).toEqual(['hidden', 'complete']);
    expectUnavailableKeepsFocus(nextButton, () => graph.modelNow().terms);
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
    expectUnavailableKeepsFocus(() => ended, () => [graph.playing(), graph.modelNow().terms]);
    expect(graph.playing()).toBe(false);
    expect(graph.modelNow().terms).toBe(40);
});

test('StrictMode mounts, unmounts and mounts again: playback still works on the remounted board', async () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    await waitForPucks('show-certificate');
    await openTools();
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(graph.playing()).toBe(true);
    act(() => { frames.frame(0); frames.frame(SEQUENCE_STEP_INTERVAL_MS); });
    expect(graph.modelNow().terms).toBe(2);
    act(() => { fireEvent.change(screen.getByLabelText('Primer zaporedja'), {target: {value: 'natural'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'natural', terms: 1});
    expect(boardObjects(graph)).toBe(baseline);
});

test('a Play click handled while the graph unmounts leaves no running playback', async () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-certificate');
    await openTools();
    act(() => {
        fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'}));
        view.unmount();
    });
    expect(graph.playing()).toBe(false);
    expect(frames.callbacks.size).toBe(0);
});

test('the announcement is silent while Play runs and carries the status lines after Pause; the visible lines are not a live region', async () => {
    const frames = manualScheduler();
    const graph = new ObservedSequenceGraph(frames.scheduler);
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-certificate');
    await openTools();
    const live = () => document.querySelector('[data-readout-live]')!.textContent;
    const visible = () => [...document.querySelectorAll('[data-sequence-status]')].map(element => element.textContent!.trim());
    expect(document.querySelector('.demo-status')!.hasAttribute('role')).toBe(false);
    expect(document.querySelectorAll('[data-readout-live]')).toHaveLength(1);
    // The other status regions are notices: empty until something is refused.
    for (const notice of document.querySelectorAll('[role="status"]:not([data-readout-live])')) expect(notice.textContent).toBe('');
    expect(live()).not.toBe('');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Predvajaj'})); });
    expect(live()).toBe('');
    act(() => { frames.frame(0); frames.frame(SEQUENCE_STEP_INTERVAL_MS); });
    expect(live()).toBe('');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Premor'})); });
    expect(visible().length).toBeGreaterThan(0);
    for (const line of visible()) expect(live()).toContain(line.replace(/[.!?]$/, ''));
});

test('a live language switch re-evaluates the pucks and the readouts and leaves no caption on the board', async () => {
    const graph = new ObservedSequenceGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-certificate');
    await openTools();
    act(() => { fireEvent.click(puckControl('show-certificate')); });
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text') as any[];
    const boardText = () => texts().map(text => String(text.plaintext)).join('|');
    // the board keeps only the label of the threshold marker: the numbers, the verdict and the key are in the cards
    expect(boardText()).toContain('N = 5');
    expect(boardText()).not.toMatch(/certifikat|krogec|prikazani/);
    expect(readout('certificate')).toBe('N ne deluje');
    expect(document.querySelector('.puck-strip [data-puck-key="show-certificate"]')?.textContent).toContain('Certifikat');
    act(() => { setLanguage('en'); });
    expect(boardText()).not.toMatch(/certificate|circle|shown terms/);
    expect(readout('certificate')).toBe('N does not work');
    expect(document.querySelector('.puck-strip [data-puck-key="show-certificate"]')?.textContent).toContain('Certificate');
    expect(document.querySelector('.puck-strip [data-puck-key="sequence-epsilon"]')?.textContent).toContain('Band width');
    expect(screen.getByRole('button', {name: 'Next step'})).toBeInTheDocument();
    act(() => { setLanguage('sl'); });
    expect(readout('certificate')).toBe('N ne deluje');
});
