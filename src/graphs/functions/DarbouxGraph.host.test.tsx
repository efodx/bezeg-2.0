import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DarbouxGraph} from './DarbouxGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

/** A real graph through the real host and a real JSXGraph board (jsdom), so the host's mount, remount and unmount ordering is exercised. */
class ObservedDarbouxGraph extends DarbouxGraph {
    liveBoard() {
        return this.board;
    }

    modelNow() {
        return this.model;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-darboux-status]')].map(element => element.getAttribute('data-darboux-status'));
const boardObjects = (graph: ObservedDarbouxGraph) => graph.liveBoard().objectsList.length;

test('a real board shows the sums: the fields, Refine and the toggles change the model, and Refine is disabled with a reason at the limit', () => {
    const graph = new ObservedDarbouxGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('lower')).toBe('1,75');
    expect(readout('upper')).toBe('3,75');
    expect(readout('integral')).toBe('2,6667');
    expect(readout('gap')).toBe('2');
    expect(statusIds()).toEqual(['trapped']);
    const baseline = boardObjects(graph);

    const refine = () => screen.getByRole('button', {name: /Zgosti razdelitev/}) as HTMLButtonElement;
    act(() => { fireEvent.click(refine()); });
    expect(graph.modelNow()).toMatchObject({n: 8});
    expect(readout('n')).toBe('8');
    expect(readout('lower')).toBe('2,1875');
    expect(readout('upper')).toBe('3,1875');
    expect(boardObjects(graph)).toBe(baseline);

    // a hidden sum is hidden from the board texts and the readouts alike, and shown again by its button
    const hideUpper = () => screen.getByRole('button', {name: /zgornjo vsoto/});
    expect(hideUpper().textContent).toBe('Skrij zgornjo vsoto');
    act(() => { fireEvent.click(hideUpper()); });
    expect(readout('upper')).toBe('skrito');
    expect(readout('gap')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    expect(hideUpper().textContent).toBe('Pokaži zgornjo vsoto');
    act(() => { fireEvent.click(hideUpper()); });
    expect(readout('upper')).toBe('3,1875');

    // n through the labelled field: an integer in range is applied, a fraction is refused with a hint and leaves the model alone
    const inputN = screen.getByLabelText('Število delov n') as HTMLInputElement;
    act(() => { fireEvent.change(inputN, {target: {value: '64'}}); });
    expect(graph.modelNow()).toMatchObject({n: 64});
    act(() => { fireEvent.change(inputN, {target: {value: '2.5'}}); });
    expect(graph.modelNow()).toMatchObject({n: 64});
    expect(screen.getByText('Število delov n mora biti celo število od 1 do 128.')).toBeInTheDocument();

    // at the limit Refine is a disabled native button that points at its explanation
    act(() => { fireEvent.click(refine()); });
    expect(graph.modelNow()).toMatchObject({n: 128});
    expect(refine().disabled).toBe(true);
    expect(refine().getAttribute('aria-describedby')).toBe('darboux-refine-help');
    expect(document.getElementById('darboux-refine-help')?.textContent).toMatch(/mejo 128/);
    expect(statusIds()).toEqual(['trapped', 'limit']);

    // an endpoint that would reach the other one is refused with the rule; a valid one is applied
    const inputA = screen.getByLabelText('Levo krajišče a') as HTMLInputElement;
    act(() => { fireEvent.change(inputA, {target: {value: '2'}}); });
    expect(graph.modelNow()).toMatchObject({a: 0, b: 2});
    expect(screen.getByText('Krajišče a mora ostati levo od b (a < b). Najprej premakni b.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputA, {target: {value: '1'}}); });
    expect(graph.modelNow()).toMatchObject({a: 1, b: 2});

    // choosing sin x loads its model; the English labels follow a live language switch
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'sine'}}); });
    expect(graph.modelNow()).toEqual({example: 'sine', a: 0, b: 2 * Math.PI, n: 4, lowerVisible: true, upperVisible: true});
    expect(readout('lower')).toBe('−3,1416');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Refine the partition (n → 2n)'})).toBeInTheDocument();
    expect(screen.getByLabelText('Number of parts n')).toBeInTheDocument();
    expect(readout('lower')).toBe('−3.1416');
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedDarbouxGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: /Zgosti razdelitev/})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Skrij spodnjo vsoto'})); });
    expect(graph.modelNow()).toMatchObject({n: 8, lowerVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
