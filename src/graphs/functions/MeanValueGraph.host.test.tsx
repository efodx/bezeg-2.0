import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MeanValueGraph} from './MeanValueGraph';
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
class ObservedMeanValueGraph extends MeanValueGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-mean-value-status]')].map(element => element.getAttribute('data-mean-value-status'));
const boardObjects = (graph: ObservedMeanValueGraph) => graph.liveBoard().objectsList.length;

test('a real board shows the secant, the tangent and the slopes: the inputs move c without moving a or b, and the reveal button shows the match', () => {
    const graph = new ObservedMeanValueGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('secant-slope')).toBe('2');
    expect(readout('tangent-slope')).toBe('1');
    expect(readout('difference')).toBe('−1');
    expect(readout('matches')).toBe('skrite');

    const showButton = () => screen.getByRole('button', {name: /ujemajočo točko/});
    expect(showButton().textContent).toBe('Pokaži ujemajočo točko');
    act(() => { fireEvent.click(showButton()); });
    expect(readout('matches')).toBe('1');
    expect(showButton().textContent).toBe('Skrij ujemajočo točko');
    expect(statusIds()).toEqual(['differ', 'matches']);

    // c through the real labelled field: the endpoints and the secant do not change
    const inputC = screen.getByLabelText('Točka dotika c') as HTMLInputElement;
    act(() => { fireEvent.change(inputC, {target: {value: '1'}}); });
    expect(graph.modelNow()).toEqual({example: 'square', a: 0, b: 2, c: 1, revealed: true});
    expect(readout('tangent-slope')).toBe('2');
    expect(readout('difference')).toBe('0');
    expect(readout('secant-slope')).toBe('2');
    expect(statusIds()).toEqual(['agree', 'matches']);

    // an endpoint that would pass c is refused with a hint and leaves the model alone
    const inputA = screen.getByLabelText('Levo krajišče a') as HTMLInputElement;
    act(() => { fireEvent.change(inputA, {target: {value: '1'}}); });
    expect(graph.modelNow()).toMatchObject({a: 0, b: 2, c: 1});
    expect(screen.getByText('Krajišče a mora ostati levo od c (a < c). Najprej premakni c.')).toBeInTheDocument();
    act(() => { fireEvent.change(inputA, {target: {value: '0.5'}}); });
    expect(graph.modelNow()).toMatchObject({a: 0.5, b: 2, c: 1});
    expect(readout('secant-slope')).toBe('2,5');

    // choosing an example loads its defaults and hides the reveal; the corner then shows no tangent and no number
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'abs'}}); });
    expect(graph.modelNow()).toEqual({example: 'abs', a: -1, b: 1, c: 0.5, revealed: false});
    expect(showButton().textContent).toBe('Pokaži ujemajočo točko');
    act(() => { fireEvent.change(screen.getByLabelText('Točka dotika c'), {target: {value: '0'}}); });
    expect(readout('tangent-slope')).toBe('ne obstaja');
    expect(readout('difference')).toBe('ne obstaja');
    expect(statusIds()).toEqual(['hypothesis', 'corner']);
    act(() => { fireEvent.click(showButton()); });
    expect(readout('matches')).toBe('ni');
    expect(statusIds()).toEqual(['hypothesis', 'corner', 'matches-none']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Hide matching point'})).toBeInTheDocument();
    expect(screen.getByLabelText('Point of tangency c')).toBeInTheDocument();
    expect(readout('tangent-slope')).toBe('does not exist');
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedMeanValueGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži ujemajočo točko'})); });
    act(() => { fireEvent.change(screen.getByLabelText('Točka dotika c'), {target: {value: '1.5'}}); });
    expect(graph.modelNow()).toMatchObject({c: 1.5, revealed: true});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
