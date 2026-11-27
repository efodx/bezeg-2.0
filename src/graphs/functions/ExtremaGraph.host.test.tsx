import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ExtremaGraph} from './ExtremaGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {installBoardShims, openTools, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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

test('a real board shows the candidates: a, b and the classification are pucks, the example select in Orodja changes the model and the readout', async () => {
    const graph = new ObservedExtremaGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-classification');
    await openTools();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('candidate-0')).toBe("f = 1, f′ = −2");
    expect(readout('global-minimum')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // the pucks own the endpoints and the classification switch: no second copy in Orodja
    expect(screen.queryByLabelText('Levo krajišče a, vrednost')).toBeNull();
    expect(screen.queryByLabelText('Desno krajišče b, vrednost')).toBeNull();
    expect(screen.queryByRole('button', {name: /klasifikacijo/})).toBeNull();

    // the Klasifikacija switch puck reveals the labels and the global values
    expect(puckControl('show-classification').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-classification')); });
    expect(graph.modelNow()).toMatchObject({revealed: true});
    expect(puckControl('show-classification').getAttribute('aria-checked')).toBe('true');
    expect(readout('candidate-0')).toBe("f = 1, f′ = −2; lokalni maksimum");
    expect(readout('global-minimum')).toBe('0 pri x = 0');
    expect(readout('global-maximum')).toBe('4 pri x = 2');
    expect(statusIds()).toEqual(['revealed']);
    expect(boardObjects(graph)).toBe(baseline);

    // an endpoint written as the puck writes it keeps the classification; an order violation leaves the model alone
    act(() => { graph.parameters!.write('extrema-b', 1, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1, revealed: true});
    expect(readout('global-maximum')).toBe('1 pri x = −1; 1');
    act(() => { graph.parameters!.write('extrema-b', -2, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1});
    act(() => { graph.parameters!.write('extrema-a', 9, 'learner'); });
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
    expect(document.querySelector('.puck-strip [data-puck-key="extrema-a"]')?.textContent).toContain('Left endpoint');
    expect(document.querySelector('.puck-strip [data-puck-key="show-classification"]')?.textContent).toContain('Classification');
    expect(graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text').map((text: any) => String(text.plaintext)).join('|')).not.toMatch(/classification: |square: endpoint/);
    expect(readout('candidate-1')).toBe("f = 0, f′ = does not exist");
});
