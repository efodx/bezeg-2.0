import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {MeanValueGraph} from './MeanValueGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {installBoardShims, openTools, puckControl, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

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

test('a real board shows the secant, the tangent and the slopes: a, b and c and the matching points are pucks, the example select stays in Orodja', async () => {
    const graph = new ObservedMeanValueGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('show-matches');
    await openTools();
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('secant-slope')).toBe('2');
    expect(readout('tangent-slope')).toBe('1');
    expect(readout('difference')).toBe('−1');
    expect(readout('matches')).toBe('skrite');

    // the pucks own the three points and the reveal: no second copy in Orodja
    for (const label of ['Točka dotika c, vrednost', 'Levo krajišče a, vrednost', 'Desno krajišče b, vrednost']) expect(screen.queryByLabelText(label)).toBeNull();
    expect(screen.queryByRole('button', {name: /ujemajočo točko/})).toBeNull();

    expect(puckControl('show-matches').getAttribute('aria-checked')).toBe('false');
    act(() => { fireEvent.click(puckControl('show-matches')); });
    expect(puckControl('show-matches').getAttribute('aria-checked')).toBe('true');
    expect(readout('matches')).toBe('1');
    expect(statusIds()).toEqual(['differ', 'matches']);

    // c as the puck writes it: the endpoints and the secant do not change
    act(() => { graph.parameters!.write('mvt-c', 1, 'learner'); });
    expect(graph.modelNow()).toEqual({example: 'square', a: 0, b: 2, c: 1, revealed: true});
    expect(readout('tangent-slope')).toBe('2');
    expect(readout('difference')).toBe('0');
    expect(readout('secant-slope')).toBe('2');
    expect(statusIds()).toEqual(['agree', 'matches']);

    // an endpoint that would pass c is refused and leaves the model alone
    act(() => { graph.parameters!.write('mvt-a', 1, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: 0, b: 2, c: 1});
    act(() => { graph.parameters!.write('mvt-a', 0.5, 'learner'); });
    expect(graph.modelNow()).toMatchObject({a: 0.5, b: 2, c: 1});
    expect(readout('secant-slope')).toBe('2,5');

    // choosing an example loads its defaults and hides the reveal; the corner then shows no tangent and no number
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'abs'}}); });
    expect(graph.modelNow()).toEqual({example: 'abs', a: -1, b: 1, c: 0.5, revealed: false});
    expect(puckControl('show-matches').getAttribute('aria-checked')).toBe('false');
    act(() => { graph.parameters!.write('mvt-c', 0, 'learner'); });
    expect(readout('tangent-slope')).toBe('ne obstaja');
    expect(readout('difference')).toBe('ne obstaja');
    expect(statusIds()).toEqual(['hypothesis', 'corner']);
    act(() => { fireEvent.click(puckControl('show-matches')); });
    expect(readout('matches')).toBe('ni');
    expect(statusIds()).toEqual(['hypothesis', 'corner', 'matches-none']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(puckControl('show-matches').getAttribute('aria-checked')).toBe('true');
    expect(readout('tangent-slope')).toBe('does not exist');
});
