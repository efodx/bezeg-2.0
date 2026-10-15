import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ConvexityGraph} from './ConvexityGraph';
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
class ObservedConvexityGraph extends ConvexityGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-convexity-status]')].map(element => element.getAttribute('data-convexity-status'));
const boardObjects = (graph: ObservedConvexityGraph) => graph.liveBoard().objectsList.length;

test('a real board shows chord and tangent: the fields, the example and the Show second derivative button change the model and the readout', () => {
    const graph = new ObservedConvexityGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('chord')).toBe('y = 0,5x + 1,5');
    expect(readout('tangent')).toBe('y = x − 0,25');
    expect(readout('verdict')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // Show second derivative is a native button whose label names its state; it reveals the verdicts
    const toggle = () => screen.getByRole('button', {name: /drugi odvod/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži drugi odvod');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow()).toMatchObject({secondDerivativeVisible: true});
    expect(toggle().textContent).toBe('Skrij drugi odvod');
    expect(readout('verdict')).toBe('konveksna na [a, b]: graf leži na tetivi ali pod njo');
    expect(readout('tangent-verdict')).toBe('graf leži na tangenti ali nad njo');
    expect(statusIds()).toEqual(['revealed']);
    expect(boardObjects(graph)).toBe(baseline);

    // t through the labelled field keeps the reveal; a point outside [a, b] withdraws the tangent claim
    const inputT = screen.getByLabelText('Točka dotika tangente t') as HTMLInputElement;
    act(() => { fireEvent.change(inputT, {target: {value: '1.8'}}); });
    expect(graph.modelNow()).toMatchObject({t: 1.8, secondDerivativeVisible: true});
    expect(readout('tangent-verdict')).toBe('brez trditve: t je zunaj [a, b]');
    expect(statusIds()).toEqual(['revealed', 'tangent-outside']);

    // an order violation is refused with the rule and leaves the model alone
    const inputB = screen.getByLabelText('Desno krajišče b') as HTMLInputElement;
    act(() => { fireEvent.change(inputB, {target: {value: '-2'}}); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1.5});
    expect(screen.getByText('Krajišče b mora ostati desno od a (a < b). Najprej premakni a.')).toBeInTheDocument();
    const inputA = screen.getByLabelText('Levo krajišče a') as HTMLInputElement;
    act(() => { fireEvent.change(inputA, {target: {value: '9'}}); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1.5});

    // choosing an example loads its model and hides the second derivative; x^3 gets no claim once revealed
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'cube'}}); });
    expect(graph.modelNow()).toEqual({example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false});
    expect(readout('inflection')).toBe('skrito');
    act(() => { fireEvent.click(toggle()); });
    expect(readout('verdict')).toBe("brez trditve: f″ spremeni predznak na [a, b]");
    expect(readout('inflection')).toBe('pri x = 0');
    expect(statusIds()).toEqual(['revealed', 'no-claim']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Hide second derivative'})).toBeInTheDocument();
    expect(screen.getByLabelText('Left endpoint a')).toBeInTheDocument();
    expect(readout('verdict')).toBe("no claim: f″ changes sign on [a, b]");
    expect(readout('inflection')).toBe('at x = 0');
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedConvexityGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži drugi odvod'})); });
    act(() => { fireEvent.change(screen.getByLabelText('Primer funkcije'), {target: {value: 'quartic'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'quartic', secondDerivativeVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
