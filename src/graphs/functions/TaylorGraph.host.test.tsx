import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {TaylorGraph} from './TaylorGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {UntaggedWriteError} from '../base/writes/parameterArbiter';
import {runAs} from '../base/writes/writeSource';
import {installBoardShims, puckControl, typePuck, waitForPucks} from '../base/realGraphTestHarness';

// The degree, the centre and x are pucks on the board (task 05): the strip appears once the board has laid out.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    installBoardShims();
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

    /** A setter call with no write source: what a writer that forgot to say who it is would do. */
    setCenterDirectly(value: number) {
        this.setCenter(value);
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-taylor-status]')].map(element => element.getAttribute('data-taylor-status'));
// JSXGraph creates and drops axis tick labels as the view changes; they are not the graph's objects.
const boardObjects = (graph: ObservedTaylorGraph) => graph.liveBoard().objectsList.filter(object => !String((object as {id?: string}).id).includes('_ticks_')).length;

test('a real board shows f and T_n: the fields, the degree buttons, the example and the Show error bound button change the model and the readout', async () => {
    const graph = new ObservedTaylorGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('taylor-degree');
    await waitFor(() => expect(document.querySelector('#board-card-tools [data-card-body]')).not.toBeNull());
    // the jsdom board has no room for the Orodja card, so it starts folded: open it
    const fold = document.querySelector<HTMLButtonElement>('#board-card-tools .board-card-fold')!;
    if (fold.getAttribute('aria-expanded') === 'false') act(() => { fireEvent.click(fold); });
    await waitFor(() => expect(document.querySelector('#board-card-tools [data-card-body]')).toBeVisible());
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('polynomial')).toBe('2');
    expect(readout('function')).toBe('2,7183');
    expect(readout('absolute-error')).toBe('0,7183');
    expect(readout('bound')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // the degree through the puck's stepper buttons and through its typed entry
    const increase = () => screen.getByRole('button', {name: 'Povečaj: Stopnja n'}) as HTMLButtonElement;
    const decrease = () => screen.getByRole('button', {name: 'Zmanjšaj: Stopnja n'}) as HTMLButtonElement;
    act(() => { fireEvent.click(increase()); });
    act(() => { fireEvent.click(increase()); });
    expect(graph.modelNow()).toMatchObject({degree: 3});
    expect(readout('polynomial')).toBe('2,6667');
    typePuck('taylor-degree', '6');
    expect(graph.modelNow()).toMatchObject({degree: 6});
    expect(readout('polynomial')).toBe('2,7181');
    typePuck('taylor-degree', '2.5');
    expect(graph.modelNow()).toMatchObject({degree: 6});
    expect(document.querySelector('.puck-strip [data-puck-key="taylor-degree"] .puck-notice')?.textContent).toMatch(/celo število/);
    typePuck('taylor-degree', '0');
    expect(graph.modelNow()).toMatchObject({degree: 0});
    expect(decrease().getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(decrease()); });
    expect(graph.modelNow()).toMatchObject({degree: 0});
    typePuck('taylor-degree', '-1');
    expect(graph.modelNow()).toMatchObject({degree: 0});
    expect(document.querySelector('.puck-strip [data-puck-key="taylor-degree"] .puck-notice')?.textContent).toMatch(/med 0 in/);
    typePuck('taylor-degree', '10');
    expect(increase().getAttribute('aria-disabled')).toBe('true');
    typePuck('taylor-degree', '6');

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
    typePuck('taylor-x', '2');
    expect(graph.modelNow()).toMatchObject({x: 2, boundVisible: true});
    typePuck('taylor-x', '9');
    expect(graph.modelNow()).toMatchObject({x: 2});
    expect(document.querySelector('.puck-strip [data-puck-key="taylor-x"] .puck-notice')?.textContent).toMatch(/−3 in 3/);

    // choosing the flat example loads its model, hides the bound and locks the center with an explanation:
    // a fixed centre has no puck (the strip omits it), so the Orodja control stays and carries the reason
    const select = screen.getByLabelText('Primer funkcije') as HTMLSelectElement;
    act(() => { fireEvent.change(select, {target: {value: 'flat'}}); });
    expect(graph.modelNow()).toEqual({example: 'flat', center: 0, degree: 3, x: 1, boundVisible: false});
    expect(document.querySelector('[data-puck-key="taylor-center"]')).toBeNull();
    const center = screen.getByRole('spinbutton', {name: 'Središče c, vrednost'}) as HTMLInputElement;
    expect(center.readOnly).toBe(true);
    expect(center.getAttribute('aria-disabled')).toBe('true');
    const reasonId = (center.getAttribute('aria-describedby') ?? '').split(' ').find(id => id.endsWith('-reason'));
    expect(reasonId).toBeTruthy();
    expect(document.getElementById(reasonId as string)?.textContent).toMatch(/stalno c = 0/);
    expect(readout('polynomial')).toBe('0');
    expect(readout('function')).toBe('0,3679');
    expect(statusIds()).toEqual(['hidden', 'flat']);
    act(() => { fireEvent.click(toggle()); });
    expect(readout('bound')).toBe('ni prikazana (glej opombo)');
    expect(statusIds()).toEqual(['revealed', 'no-bound', 'flat']);

    // 1/(1 - x) shows whether x is inside the convergence interval, in words
    act(() => { fireEvent.change(select, {target: {value: 'geometric'}}); });
    expect(statusIds()).toEqual(['hidden', 'inside-convergence']);
    typePuck('taylor-x', '-1.5');
    expect(statusIds()).toEqual(['hidden', 'outside-convergence']);
    expect(readout('convergence')).toMatch(/zunaj/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch
    act(() => { setLanguage('en'); });
    expect(screen.getByRole('button', {name: 'Show error bound'})).toBeInTheDocument();
    expect(puckControl('taylor-degree').getAttribute('aria-label')).toBe('Degree n');
    expect(readout('convergence')).toMatch(/x is outside/);
});

test('parameter writes are source-tagged: a seeded untagged write throws, a tagged one applies, and the arbiter decides between sources', async () => {
    const graph = new ObservedTaylorGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('taylor-center');
    const parameters = graph.parameters!;
    expect(parameters.keys()).toEqual(['taylor-center', 'taylor-degree', 'taylor-x', 'taylor-example', 'view']);

    // seeded untagged write (ADR 0064): a setter called outside any write source fails the development check
    expect(() => act(() => graph.setCenterDirectly(0.5))).toThrow(UntaggedWriteError);
    act(() => runAs('learner', () => graph.setCenterDirectly(0.25)));
    expect(graph.modelNow().center).toBe(0.25);

    // the puck is a learner writer through its typed entry
    typePuck('taylor-center', '0.5');
    expect(graph.modelNow().center).toBe(0.5);

    // lesson writes go through the same setters; a domain refusal is reported, not applied
    act(() => { expect(parameters.write('taylor-degree', 3, 'lesson')).toEqual({status: 'applied'}); });
    expect(parameters.read('taylor-degree')).toBe(3);
    const refused = parameters.write('taylor-degree', -1, 'lesson');
    expect(refused.status).toBe('refused-domain');
    expect(graph.modelNow().degree).toBe(3);

    // a learner hold keeps a lesson write off the key until release
    const release = parameters.hold('taylor-x');
    expect(parameters.write('taylor-x', 0.5, 'lesson')).toEqual({status: 'refused-arbiter', reason: 'held'});
    release();
    act(() => { expect(parameters.write('taylor-x', 0.5, 'lesson').status).toBe('applied'); });
});
