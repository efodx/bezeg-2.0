import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ConvexityGraph} from './ConvexityGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {installBoardShims, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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

test('a real board shows chord and tangent: a, b and t are pucks, the switch puck and the example select change the model and the readout', async () => {
    const graph = new ObservedConvexityGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-second-derivative');
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('chord')).toBe('y = 0,5x + 1,5');
    expect(readout('tangent')).toBe('y = x − 0,25');
    expect(readout('verdict')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // the pucks own the points and the switch: no second copy in Orodja
    expect(screen.queryByRole('button', {name: /drugi odvod/})).toBeNull();
    expect(screen.queryByLabelText('Točka dotika tangente t, vrednost')).toBeNull();
    expect(puckControl('show-second-derivative').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-second-derivative')); });
    expect(graph.modelNow()).toMatchObject({secondDerivativeVisible: true});
    expect(puckControl('show-second-derivative').getAttribute('aria-checked')).toBe('true');
    expect(readout('verdict')).toBe('konveksna na [a, b]: graf leži na tetivi ali pod njo');
    expect(readout('tangent-verdict')).toBe('graf leži na tangenti ali nad njo');
    expect(statusIds()).toEqual(['revealed']);
    expect(boardObjects(graph)).toBe(baseline);

    // t as the puck writes it keeps the reveal; a point outside [a, b] withdraws the tangent claim
    act(() => { graph.parameters!.write('convexity-t', 1.8, 'learner'); });
    expect(graph.modelNow()).toMatchObject({t: 1.8, secondDerivativeVisible: true});
    expect(readout('tangent-verdict')).toBe('brez trditve: t je zunaj [a, b]');
    expect(statusIds()).toEqual(['revealed', 'tangent-outside']);

    // an order violation is refused and leaves the model alone
    act(() => { graph.parameters!.write('convexity-b', -2, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1.5});
    act(() => { graph.parameters!.write('convexity-a', 1.9, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: -1, b: 1.5});

    // choosing an example loads its model and hides the second derivative; x^3 gets no claim once revealed
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'cube'}}); });
    expect(graph.modelNow()).toEqual({example: 'cube', a: -1, b: 1.5, t: 0.5, secondDerivativeVisible: false});
    expect(readout('inflection')).toBe('skrito');
    act(() => { fireEvent.click(puckControl('show-second-derivative')); });
    expect(readout('verdict')).toBe("brez trditve: f″ spremeni predznak na [a, b]");
    expect(readout('inflection')).toBe('pri x = 0');
    expect(statusIds()).toEqual(['revealed', 'no-claim']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(puckControl('show-second-derivative').getAttribute('aria-checked')).toBe('true');
    expect(document.querySelector('.puck-strip [data-puck-key="convexity-a"]')?.textContent).toContain('Left endpoint');
    expect(readout('verdict')).toBe("no claim: f″ changes sign on [a, b]");
    expect(readout('inflection')).toBe('at x = 0');
});
