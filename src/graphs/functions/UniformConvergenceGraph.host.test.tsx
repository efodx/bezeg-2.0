import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {UniformConvergenceGraph} from './UniformConvergenceGraph';
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
class ObservedUniformGraph extends UniformConvergenceGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-uniform-status]')].map(element => element.getAttribute('data-uniform-status'));
const boardObjects = (graph: ObservedUniformGraph) => graph.liveBoard().objectsList.length;
const field = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement;

test('a real board shows f_n and its limit: the fields, the n buttons, the example and the Show supremum button change the model and the readout', () => {
    const graph = new ObservedUniformGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('term')).toBe('0,03125');
    expect(readout('pointwise-n')).toBe('4');
    expect(readout('supremum')).toBe('skrito');
    expect(readout('shared-n')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // n through the buttons and through the labelled field
    const increase = () => screen.getByRole('button', {name: 'Povečaj indeks n za 1'}) as HTMLButtonElement;
    const decrease = () => screen.getByRole('button', {name: 'Zmanjšaj indeks n za 1'}) as HTMLButtonElement;
    act(() => { fireEvent.click(increase()); });
    expect(graph.modelNow()).toMatchObject({n: 6});
    const inputN = field(/^Indeks n$/);
    act(() => { fireEvent.change(inputN, {target: {value: '11'}}); });
    expect(graph.modelNow()).toMatchObject({n: 11});
    act(() => { fireEvent.change(inputN, {target: {value: '2.5'}}); });
    expect(graph.modelNow()).toMatchObject({n: 11});
    act(() => { fireEvent.change(inputN, {target: {value: '1'}}); });
    expect(decrease().disabled).toBe(true);
    expect(document.getElementById('uniform-n-help')?.textContent).toMatch(/najmanjši/);
    act(() => { fireEvent.change(inputN, {target: {value: '50'}}); });
    expect(increase().disabled).toBe(true);
    act(() => { fireEvent.change(inputN, {target: {value: '11'}}); });

    // Show supremum names its state and reveals the supremum, whether it is attained and the shared N
    const toggle = () => screen.getByRole('button', {name: /supremum/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži supremum');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow()).toMatchObject({supremumVisible: true});
    expect(toggle().textContent).toBe('Skrij supremum');
    expect(readout('supremum')).toBe('0,085899');
    expect(readout('supremum-attained')).toBe('da, pri x = 0,8');
    expect(readout('shared-n')).toBe('11');
    expect(statusIds()).toEqual(['attained', 'shared-n', 'covered']);
    expect(boardObjects(graph)).toBe(baseline);

    // r below the chosen point is refused, with the reason in the hint; moving x first then allows it
    const inputR = field(/^Konec območja r/);
    act(() => { fireEvent.change(inputR, {target: {value: '0.4'}}); });
    expect(graph.modelNow()).toMatchObject({r: 0.8, x: 0.5});
    expect(screen.getByText(/Najprej premakni točko x/)).toBeInTheDocument();
    act(() => { fireEvent.change(field(/^Točka x$/), {target: {value: '0.3'}}); });
    act(() => { fireEvent.change(inputR, {target: {value: '0.45'}}); });
    expect(graph.modelNow()).toMatchObject({r: 0.45, x: 0.3, supremumVisible: true});
    // a real off-grid value is refused, a grid value accepted; the board does not gain objects
    act(() => { fireEvent.change(field(/^Točka x$/), {target: {value: '0.305'}}); });
    expect(graph.modelNow()).toMatchObject({x: 0.3});
    act(() => { fireEvent.change(field(/^Toleranca ε$/), {target: {value: '0.05'}}); });
    expect(graph.modelNow()).toMatchObject({epsilon: 0.05});

    // choosing the other example loads its model and hides the supremum
    const select = screen.getByLabelText('Primer zaporedja funkcij') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'scaled'}}); });
    expect(graph.modelNow()).toEqual({example: 'scaled', r: 1, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false});
    act(() => { fireEvent.click(toggle()); });
    expect(readout('supremum')).toBe('0,2');
    expect(readout('shared-n')).toBe('11');
    act(() => { fireEvent.change(select, {target: {value: 'power'}}); });
    act(() => { fireEvent.change(inputR, {target: {value: '1'}}); });
    act(() => { fireEvent.click(toggle()); });
    expect(readout('supremum-attained')).toMatch(/^ne;/);
    expect(readout('shared-n')).toBe('ne obstaja');
    expect(statusIds()).toEqual(['not-attained', 'no-shared-n', 'not-covered', 'jump']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch, and the board is asked to redraw its texts
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'Hide supremum'})).toBeInTheDocument();
    expect(screen.getByLabelText('Index n')).toBeInTheDocument();
    expect(readout('shared-n')).toBe('does not exist');
    expect(graph.captionPlainLines()[3]).toBe('sup |fₙ − f| = 1, not attained');
    act(() => { setLanguage('sl'); });
    expect(graph.captionPlainLines()[3]).toBe('sup |fₙ − f| = 1, ni dosežen');
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedUniformGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži supremum'})); });
    act(() => { fireEvent.change(screen.getByLabelText('Primer zaporedja funkcij'), {target: {value: 'scaled'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'scaled', supremumVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
