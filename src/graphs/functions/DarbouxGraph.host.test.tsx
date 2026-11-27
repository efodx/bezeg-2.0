import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DarbouxGraph} from './DarbouxGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {installBoardShims, openTools, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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

test('a real board shows the sums: a, b, n and the two sum switches are pucks, Refine stays in Orodja and is disabled with a reason at the limit', async () => {
    const graph = new ObservedDarbouxGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-upper-sum');
    await openTools();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('lower')).toBe('1,75');
    expect(readout('upper')).toBe('3,75');
    expect(readout('integral')).toBe('2,6667');
    expect(readout('gap')).toBe('2');
    expect(statusIds()).toEqual(['trapped']);
    const baseline = boardObjects(graph);

    // the pucks own the count, the endpoints and the sum switches: no second copy in Orodja
    expect(screen.queryByLabelText('Število delov n', {selector: 'input'})).toBeNull();
    expect(screen.queryByLabelText('Levo krajišče a, vrednost')).toBeNull();
    expect(screen.queryByRole('button', {name: /zgornjo vsoto/})).toBeNull();

    const refine = () => screen.getByRole('button', {name: /Zgosti razdelitev/}) as HTMLButtonElement;
    act(() => { fireEvent.click(refine()); });
    expect(graph.modelNow()).toMatchObject({n: 8});
    expect(readout('n')).toBe('8');
    expect(readout('lower')).toBe('2,1875');
    expect(readout('upper')).toBe('3,1875');
    expect(boardObjects(graph)).toBe(baseline);

    // a hidden sum is hidden from the board texts and the readouts alike, and shown again by its switch puck
    expect(puckControl('show-upper-sum').getAttribute('aria-checked')).toBe('true');
    act(() => { fireEvent.click(puckControl('show-upper-sum')); });
    expect(graph.modelNow()).toMatchObject({upperVisible: false});
    expect(puckControl('show-upper-sum').getAttribute('aria-checked')).toBe('false');
    expect(readout('upper')).toBe('skrito');
    expect(readout('gap')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    act(() => { fireEvent.click(puckControl('show-upper-sum')); });
    expect(readout('upper')).toBe('3,1875');

    // n as the puck writes it: an integer in range is applied, a fraction is refused and leaves the model alone
    act(() => { graph.parameters!.write('darboux-n', 64, 'learner'); });
    expect(graph.modelNow()).toMatchObject({n: 64});
    act(() => { graph.parameters!.write('darboux-n', 2.5, 'learner'); });
    expect(graph.modelNow()).toMatchObject({n: 64});

    // at the limit Refine is an aria-disabled button that points at its explanation
    act(() => { fireEvent.click(refine()); });
    expect(graph.modelNow()).toMatchObject({n: 128});
    expect(refine()).toHaveAttribute('aria-disabled', 'true');
    expect(refine().getAttribute('aria-describedby')).toContain('darboux-refine-help');
    // the limit is stated visibly once (the status line); the help paragraph does not repeat it
    expect(document.getElementById('darboux-refine-help')?.textContent).not.toMatch(/128/);
    expect(statusIds()).toEqual(['trapped', 'limit']);

    // an endpoint that would reach the other one is refused; a valid one is applied
    act(() => { graph.parameters!.write('darboux-a', 2, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: 0, b: 2});
    act(() => { graph.parameters!.write('darboux-a', 1, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: 1, b: 2});

    // choosing sin x loads its model; the English labels follow a live language switch
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'sine'}}); });
    expect(graph.modelNow()).toEqual({example: 'sine', a: 0, b: 2 * Math.PI, n: 4, lowerVisible: true, upperVisible: true});
    expect(readout('lower')).toBe('−3,1416');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Refine the partition (n → 2n)'})).toBeInTheDocument();
    expect(document.querySelector('.puck-strip [data-puck-key="darboux-n"]')?.textContent).toContain('Number of parts');
    expect(readout('lower')).toBe('−3.1416');
});


test('a live language switch re-evaluates the numbers the readout shows; the board keeps only the formula', () => {
    const graph = new ObservedDarbouxGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text').map((text: any) => String(text.plaintext)).join('|');
    expect(texts()).not.toMatch(/integral|poln/);
    expect(readout('integral')).toBe('2,6667');
    act(() => { setLanguage('en'); });
    expect(readout('integral')).toBe('2.6667');
    act(() => { setLanguage('sl'); });
    expect(readout('integral')).toBe('2,6667');
});
