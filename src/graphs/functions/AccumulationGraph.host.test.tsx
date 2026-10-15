import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AccumulationGraph} from './AccumulationGraph';
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
class ObservedAccumulationGraph extends AccumulationGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-accumulation-status]')].map(element => element.getAttribute('data-accumulation-status'));
const boardObjects = (graph: ObservedAccumulationGraph) => graph.liveBoard().objectsList.length;

test('a real board hides A until the reveal button is pressed; the inputs move a and x, including x left of a, and the labels follow the language', () => {
    const graph = new ObservedAccumulationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('f-x')).toBe('0,9093');
    expect(readout('signed-integral')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);

    const showButton = () => screen.getByRole('button', {name: /akumulacijo A/});
    expect(showButton().textContent).toBe('Pokaži akumulacijo A');
    act(() => { fireEvent.click(showButton()); });
    expect(readout('signed-integral')).toBe('1,4161');
    expect(readout('slope')).toBe('0,9093');
    expect(showButton().textContent).toBe('Skrij akumulacijo A');
    expect(statusIds()).toEqual(['rising']);

    // x through the real labelled field, then x left of a
    const inputX = screen.getByLabelText('Točka x') as HTMLInputElement;
    act(() => { fireEvent.change(inputX, {target: {value: '3.5'}}); });
    expect(graph.modelNow()).toEqual({fn: 'sin', a: 0, x: 3.5, accumulationVisible: true});
    expect(readout('signed-integral')).toBe('1,9365'); // 1 - cos 3.5
    expect(statusIds()).toEqual(['falling']);
    const inputA = screen.getByLabelText('Spodnja meja a') as HTMLInputElement;
    act(() => { fireEvent.change(inputA, {target: {value: '5'}}); });
    expect(graph.modelNow()).toMatchObject({a: 5, x: 3.5});
    expect(statusIds()).toEqual(['reversed', 'falling']);
    // a value outside the domain is refused with a hint naming the range and leaves the model alone
    act(() => { fireEvent.change(inputX, {target: {value: '9'}}); });
    expect(graph.modelNow()).toMatchObject({a: 5, x: 3.5});
    expect(screen.getByText('Vnesi vrednost med −7 in 7.')).toBeInTheDocument();

    // choosing a function keeps a, x and the reveal
    act(() => { fireEvent.change(screen.getByLabelText('Funkcija f'), {target: {value: 'square'}}); });
    expect(graph.modelNow()).toEqual({fn: 'square', a: 5, x: 3.5, accumulationVisible: true});
    expect(readout('signed-integral')).toBe('−27,375'); // (3.5^3 - 5^3) / 3 = (42.875 - 125) / 3
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Hide accumulation A'})).toBeInTheDocument();
    expect(screen.getByLabelText('Lower bound a')).toBeInTheDocument();
    expect(document.querySelector('[data-legend="accumulation"]')?.textContent).toBe('Accumulation A (dashed line)');
});

test('the label of A(x) follows the point: hidden before the reveal, shown after it and hidden again when A is hidden', () => {
    const graph = new ObservedAccumulationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    // jsdom gives the label no screen position, so JSXGraph's computed state is unreliable there; compare what the label asks for (its visible attribute).
    type Shown = { elType: string; name: string; visPropCalc: { visible: unknown }; label?: { visProp: { visible: unknown } } };
    const asked = (value: unknown) => typeof value === 'function' ? (value as () => unknown)() : value;
    const accumulationPoint = () => (graph.liveBoard().objectsList as unknown as Shown[])
        .filter(object => object.elType === 'point' && object.name.includes('A(x)'))
        .map(object => ({point: object.visPropCalc.visible, label: asked(object.label?.visProp.visible)}));
    expect(accumulationPoint()).toEqual([{point: false, label: false}]);
    act(() => { fireEvent.click(screen.getByRole('button', {name: /akumulacijo A/})); });
    expect(accumulationPoint()).toEqual([{point: true, label: true}]);
    act(() => { fireEvent.click(screen.getByRole('button', {name: /akumulacijo A/})); });
    expect(accumulationPoint()).toEqual([{point: false, label: false}]);
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedAccumulationGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži akumulacijo A'})); });
    act(() => { fireEvent.change(screen.getByLabelText('Točka x'), {target: {value: '4.5'}}); });
    act(() => { fireEvent.change(screen.getByLabelText('Funkcija f'), {target: {value: 'exp'}}); });
    expect(graph.modelNow()).toMatchObject({fn: 'exp', x: 4.5, accumulationVisible: true});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
