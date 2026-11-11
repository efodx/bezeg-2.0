import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TaylorGraph} from './TaylorGraph';
import {GraphHost} from '../base/GraphHost';
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

/** A real graph through the real host and a real JSXGraph board (jsdom), so the host's mount, remount and unmount ordering is exercised. */
class ObservedTaylorGraph extends TaylorGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-taylor-status]')].map(element => element.getAttribute('data-taylor-status'));
const boardObjects = (graph: ObservedTaylorGraph) => graph.liveBoard().objectsList.length;

test('a real board shows f and T_n: the fields, the degree buttons, the example and the Show error bound button change the model and the readout', () => {
    const graph = new ObservedTaylorGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('polynomial')).toBe('2');
    expect(readout('function')).toBe('2,7183');
    expect(readout('absolute-error')).toBe('0,7183');
    expect(readout('bound')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // the degree through the stepper buttons and through the labelled field
    const increase = () => screen.getByRole('button', {name: 'Povečaj število'}) as HTMLButtonElement;
    const decrease = () => screen.getByRole('button', {name: 'Zmanjšaj število'}) as HTMLButtonElement;
    act(() => { fireEvent.click(increase()); });
    act(() => { fireEvent.click(increase()); });
    expect(graph.modelNow()).toMatchObject({degree: 3});
    expect(readout('polynomial')).toBe('2,6667');
    const inputDegree = screen.getByRole('spinbutton', {name: 'Stopnja n'}) as HTMLInputElement;
    act(() => { enterNumber(inputDegree, '6'); });
    expect(graph.modelNow()).toMatchObject({degree: 6});
    expect(readout('polynomial')).toBe('2,7181');
    act(() => { enterNumber(inputDegree, '2.5'); });
    expect(graph.modelNow()).toMatchObject({degree: 6});
    act(() => { enterNumber(inputDegree, '0'); });
    expect(decrease().getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(decrease()); });
    expect(graph.modelNow()).toMatchObject({degree: 0});
    expect(document.querySelector('[data-count-status]')?.textContent).toMatch(/Najmanj 0/);
    act(() => { enterNumber(inputDegree, '10'); });
    expect(increase().getAttribute('aria-disabled')).toBe('true');
    act(() => { enterNumber(inputDegree, '6'); });

    // Show error bound is a native button whose label names its state; it reveals the bound with its assumption
    const toggle = () => screen.getByRole('button', {name: /oceno napake/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži oceno napake');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow()).toMatchObject({boundVisible: true});
    expect(toggle().textContent).toBe('Skrij oceno napake');
    expect(readout('bound')).toBe('0,0005393');
    expect(readout('bound-hypothesis')).toMatch(/max\(e\^c, e\^x\)/);
    expect(statusIds()).toEqual(['revealed']);
    expect(boardObjects(graph)).toBe(baseline);

    // x through the labelled field keeps the reveal; an out-of-range value is refused with the range
    const inputX = screen.getByLabelText('Točka x') as HTMLInputElement;
    act(() => { enterNumber(inputX, '2'); });
    expect(graph.modelNow()).toMatchObject({x: 2, boundVisible: true});
    act(() => { enterNumber(inputX, '9'); });
    expect(graph.modelNow()).toMatchObject({x: 2});
    expect(screen.getByText('Vnesi vrednost med −3 in 3.')).toBeInTheDocument();

    // choosing the flat example loads its model, hides the bound and locks the center with an explanation
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'flat'}}); });
    expect(graph.modelNow()).toEqual({example: 'flat', center: 0, degree: 3, x: 1, boundVisible: false});
    const center = screen.getByRole('spinbutton', {name: 'Središče c'}) as HTMLInputElement;
    expect(center.readOnly).toBe(true);
    expect(center.getAttribute('aria-disabled')).toBe('true');
    expect(center.getAttribute('aria-describedby')).toContain('taylor-center-help');
    expect(document.getElementById('taylor-center-help')?.textContent).toMatch(/stalno c = 0/);
    expect(readout('polynomial')).toBe('0');
    expect(readout('function')).toBe('0,3679');
    expect(statusIds()).toEqual(['hidden', 'flat']);
    act(() => { fireEvent.click(toggle()); });
    expect(readout('bound')).toBe('ni prikazana (glej opombo)');
    expect(statusIds()).toEqual(['revealed', 'no-bound', 'flat']);

    // 1/(1 - x) shows whether x is inside the convergence interval, in words
    act(() => { fireEvent.change(select, {target: {value: 'geometric'}}); });
    expect(statusIds()).toEqual(['hidden', 'inside-convergence']);
    act(() => { enterNumber(screen.getByLabelText('Točka x'), '-1.5'); });
    expect(statusIds()).toEqual(['hidden', 'outside-convergence']);
    expect(readout('convergence')).toMatch(/zunaj/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Show error bound'})).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', {name: 'Center c'})).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', {name: 'Degree n'})).toBeInTheDocument();
    expect(readout('convergence')).toMatch(/x is outside/);
});
