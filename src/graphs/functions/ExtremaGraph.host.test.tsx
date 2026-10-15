import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ExtremaGraph} from './ExtremaGraph';
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
class ObservedExtremaGraph extends ExtremaGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-extrema-status]')].map(element => element.getAttribute('data-extrema-status'));
const boardObjects = (graph: ObservedExtremaGraph) => graph.liveBoard().objectsList.length;

test('a real board shows the candidates: the fields, the example and the Show classification button change the model and the readout', () => {
    const graph = new ObservedExtremaGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('candidate-0')).toBe("f = 1, f′ = −2");
    expect(readout('global-minimum')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // Show classification is a native button whose label names its state; it reveals the labels and the global values
    const toggle = () => screen.getByRole('button', {name: /klasifikacijo/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži klasifikacijo');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow()).toMatchObject({revealed: true});
    expect(toggle().textContent).toBe('Skrij klasifikacijo');
    expect(readout('candidate-0')).toBe("f = 1, f′ = −2; lokalni maksimum");
    expect(readout('global-minimum')).toBe('0 pri x = 0');
    expect(readout('global-maximum')).toBe('4 pri x = 2');
    expect(statusIds()).toEqual(['revealed']);
    expect(boardObjects(graph)).toBe(baseline);

    // an endpoint through the labelled field keeps the classification; an order violation is refused with the rule and leaves the model alone
    const inputB = screen.getByLabelText('Desno krajišče b') as HTMLInputElement;
    act(() => { fireEvent.change(inputB, {target: {value: '1'}}); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1, revealed: true});
    expect(readout('global-maximum')).toBe('1 pri x = −1; 1');
    act(() => { fireEvent.change(inputB, {target: {value: '-2'}}); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1});
    expect(screen.getByText('Krajišče b mora ostati desno od a (a < b). Najprej premakni a.')).toBeInTheDocument();
    const inputA = screen.getByLabelText('Levo krajišče a') as HTMLInputElement;
    act(() => { fireEvent.change(inputA, {target: {value: '9'}}); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1});

    // choosing an example loads its model, hides the classification and the corner appears in words
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'abs'}}); });
    expect(graph.modelNow()).toEqual({example: 'abs', a: -1, b: 1, revealed: false});
    expect(readout('candidate-1')).toBe("f = 0, f′ = ne obstaja");
    expect(statusIds()).toEqual(['hidden', 'corner']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Show classification'})).toBeInTheDocument();
    expect(screen.getByLabelText('Left endpoint a')).toBeInTheDocument();
    expect(readout('candidate-1')).toBe("f = 0, f′ = does not exist");
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedExtremaGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži klasifikacijo'})); });
    act(() => { fireEvent.change(screen.getByLabelText('Primer funkcije'), {target: {value: 'sine'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'sine', revealed: false});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
