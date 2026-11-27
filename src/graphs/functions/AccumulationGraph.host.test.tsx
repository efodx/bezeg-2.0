import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {AccumulationGraph} from './AccumulationGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {installBoardShims, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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
const statusIds = (graph: AccumulationGraph) => (graph.getDeclaration()?.status ?? []).map(line => line.id);

test('a real board hides A until its switch puck is pressed; a and x are board pucks, including x left of a, and the labels follow the language', async () => {
    const graph = new ObservedAccumulationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-accumulation');
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('f-x')).toBe('0,9093');
    expect(readout('signed-integral')).toBe('skrito');
    expect(statusIds(graph)).toEqual(['hidden']);

    // the puck owns the switch and the bounds: no second copy in Orodja
    expect(screen.queryByRole('button', {name: /akumulacijo A/})).toBeNull();
    expect(screen.queryByLabelText('Točka x, vrednost')).toBeNull();
    expect(puckControl('show-accumulation').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-accumulation')); });
    expect(readout('signed-integral')).toBe('1,4161');
    expect(readout('slope')).toBe('0,9093');
    expect(puckControl('show-accumulation').getAttribute('aria-checked')).toBe('true');
    expect(statusIds(graph)).toEqual(['rising']);

    // x through the arbiter as the puck writes it, then x left of a
    act(() => { graph.parameters!.write('accum-x', 3.5, 'learner'); });
    expect(graph.modelNow()).toEqual({fn: 'sin', a: 0, x: 3.5, accumulationVisible: true});
    expect(readout('signed-integral')).toBe('1,9365'); // 1 - cos 3.5
    expect(statusIds(graph)).toEqual(['falling']);
    act(() => { graph.parameters!.write('accum-a', 5, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: 5, x: 3.5});
    expect(statusIds(graph)).toEqual(['reversed', 'falling']);
    // a value outside the domain is refused and leaves the model alone
    act(() => { graph.parameters!.write('accum-x', 9, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: 5, x: 3.5});

    // choosing a function keeps a, x and the reveal
    act(() => { fireEvent.change(screen.getByLabelText('Funkcija f'), {target: {value: 'square'}}); });
    expect(graph.modelNow()).toEqual({fn: 'square', a: 5, x: 3.5, accumulationVisible: true});
    expect(readout('signed-integral')).toBe('−27,375'); // (3.5^3 - 5^3) / 3 = (42.875 - 125) / 3
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(puckControl('show-accumulation').getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('.puck-strip [data-puck-key="accum-a"]')?.textContent).toContain('Lower bound');
});

test('the label of A(x) follows the point: hidden before the reveal, shown after it and hidden again when A is hidden', async () => {
    const graph = new ObservedAccumulationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-accumulation');
    // jsdom gives the label no screen position, so JSXGraph's computed state is unreliable there; compare what the label asks for (its visible attribute).
    type Shown = { elType: string; name: string; visPropCalc: { visible: unknown }; label?: { visProp: { visible: unknown } } };
    const asked = (value: unknown) => typeof value === 'function' ? (value as () => unknown)() : value;
    const accumulationPoint = () => (graph.liveBoard().objectsList as unknown as Shown[])
        .filter(object => object.elType === 'point' && object.name.includes('A(x)'))
        .map(object => ({point: object.visPropCalc.visible, label: asked(object.label?.visProp.visible)}));
    expect(accumulationPoint()).toEqual([{point: false, label: false}]);
    act(() => { fireEvent.click(puckControl('show-accumulation')); });
    expect(accumulationPoint()).toEqual([{point: true, label: true}]);
    act(() => { fireEvent.click(puckControl('show-accumulation')); });
    expect(accumulationPoint()).toEqual([{point: false, label: false}]);
});
