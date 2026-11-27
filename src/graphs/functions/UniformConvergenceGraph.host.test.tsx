import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {UniformConvergenceGraph} from './UniformConvergenceGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {installBoardShims, openTools, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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
const field = (name: RegExp) => screen.getByRole('spinbutton', {name}) as HTMLInputElement;

test('a real board shows f_n and its limit: x, epsilon, r and the supremum are pucks, the n buttons and the example stay in Orodja', async () => {
    const graph = new ObservedUniformGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-supremum');
    await openTools();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('term')).toBe('0,03125');
    expect(readout('pointwise-n')).toBe('4');
    expect(readout('supremum')).toBe('skrito');
    expect(readout('shared-n')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // the pucks own x, epsilon, r and the reveal: no second copy in Orodja
    for (const label of ['Točka x, vrednost', 'Toleranca ε, vrednost']) expect(screen.queryByLabelText(label), label).toBeNull();
    expect(screen.queryByRole('spinbutton', {name: /^Konec območja r/})).toBeNull();
    expect(screen.queryByRole('button', {name: /supremum/})).toBeNull();

    // n through the buttons and through the labelled field
    const increase = () => screen.getByRole('button', {name: 'Povečaj število'}) as HTMLButtonElement;
    act(() => { fireEvent.click(increase()); });
    expect(graph.modelNow()).toMatchObject({n: 6});
    const inputN = field(/^Indeks n$/);
    act(() => { enterNumber(inputN, '11'); });
    expect(graph.modelNow()).toMatchObject({n: 11});
    act(() => { enterNumber(inputN, '2.5'); });
    expect(graph.modelNow()).toMatchObject({n: 11});
    act(() => { enterNumber(inputN, '50'); });
    act(() => { enterNumber(inputN, '11'); });

    // the supremum switch puck names its state and reveals the supremum, whether it is attained and the shared N
    expect(puckControl('show-supremum').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-supremum')); });
    expect(graph.modelNow()).toMatchObject({supremumVisible: true});
    expect(puckControl('show-supremum').getAttribute('aria-checked')).toBe('true');
    expect(readout('supremum')).toBe('0,085899');
    expect(readout('supremum-attained')).toBe('da, pri x = 0,8');
    expect(readout('shared-n')).toBe('11');
    expect(statusIds()).toEqual(['attained', 'shared-n', 'covered']);
    expect(boardObjects(graph)).toBe(baseline);

    // r below the chosen point is refused and leaves the model alone; moving x first then allows it
    act(() => { graph.parameters!.write('uniform-r', 0.4, 'learner'); });
    expect(graph.modelNow()).toMatchObject({r: 0.8, x: 0.5});
    act(() => { graph.parameters!.write('uniform-x', 0.3, 'learner'); });
    act(() => { graph.parameters!.write('uniform-r', 0.45, 'learner'); });
    expect(graph.modelNow()).toMatchObject({r: 0.45, x: 0.3, supremumVisible: true});
    // a real off-grid value is refused, a grid value accepted; the board does not gain objects
    act(() => { graph.parameters!.write('uniform-x', 0.305, 'learner'); });
    expect(graph.modelNow()).toMatchObject({x: 0.3});
    act(() => { graph.parameters!.write('uniform-epsilon', 0.05, 'learner'); });
    expect(graph.modelNow()).toMatchObject({epsilon: 0.05});

    // choosing the other example loads its model and hides the supremum
    const select = screen.getByLabelText('Primer zaporedja funkcij') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'scaled'}}); });
    expect(graph.modelNow()).toEqual({example: 'scaled', r: 1, n: 5, x: 0.5, epsilon: 0.1, supremumVisible: false});
    act(() => { fireEvent.click(puckControl('show-supremum')); });
    expect(readout('supremum')).toBe('0,2');
    expect(readout('shared-n')).toBe('11');
    act(() => { fireEvent.change(select, {target: {value: 'power'}}); });
    act(() => { graph.parameters!.write('uniform-r', 1, 'learner'); });
    act(() => { fireEvent.click(puckControl('show-supremum')); });
    expect(readout('supremum-attained')).toMatch(/^ne;/);
    expect(readout('shared-n')).toBe('ne obstaja');
    expect(statusIds()).toEqual(['not-attained', 'no-shared-n', 'not-covered', 'jump']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the board keeps no caption text: the formula, the numbers and the key are cards and readout rows
    expect(graph.captionPlainLines()).toEqual([]);

    // the English labels follow a live language switch, and the board is asked to redraw its texts
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(screen.getByRole('spinbutton', {name: 'Index n'})).toBeInTheDocument();
    expect(readout('shared-n')).toBe('does not exist');
    act(() => { setLanguage('sl'); });
});
