import {runAs} from '../base/writes/writeSource';
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {LinearMapGraph} from './LinearMapGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import type {Mat2} from '../../linear/matrix2';
import {installBoardShims, puckControl, typePuck, waitForPucks, waitUntil} from '../base/realGraphTestHarness';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

beforeAll(installBoardShims);

beforeEach(() => setLanguage('sl'));

/** A real graph through the real host and a real JSXGraph board (jsdom), so the host's mount, remount and unmount ordering is exercised. */
class ObservedLinearMapGraph extends LinearMapGraph {
    liveBoard() {
        return this.board;
    }

    modelNow() {
        return this.model;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    handles() {
        return [this.handle1, this.handle2];
    }

    setMatrixDirectly(matrix: Mat2) {
        this.commitModel({...this.model, matrix, exampleId: 'custom'});
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-linear-map-status]')].map(element => element.getAttribute('data-linear-map-status'));
/** The matrix entries are pucks on the board once it has laid out (a1: x, a1: y, a2: x, a2: y are the keys a11, a21, a12, a22); the layout may fold Orodja at load, so open it with its fold button. */
const PUCK_OF = {'a₁: x': 'linear-map-a11', 'a₁: y': 'linear-map-a21', 'a₂: x': 'linear-map-a12', 'a₂: y': 'linear-map-a22'} as const;
const puckShows = (name: keyof typeof PUCK_OF) => puckControl(PUCK_OF[name]).getAttribute('aria-valuenow');
/** A refused entry stays open with its notice; Escape closes it, as a learner would, and the slider shows the stored value again. */
const cancelEntry = (key: string) => act(() => { fireEvent.keyDown(document.querySelector(`.puck-strip [data-puck-key="${key}"] input`)!, {key: 'Escape'}); });
const puckNotice = (name: keyof typeof PUCK_OF) => document.querySelector(`.puck-strip [data-puck-key="${PUCK_OF[name]}"] .puck-notice`)?.textContent ?? '';
async function ready() {
    await waitForPucks('linear-map-a11');
    await waitUntil(() => document.querySelector('#board-card-tools .board-card-fold') !== null);
    const fold = document.querySelector<HTMLElement>('#board-card-tools .board-card-fold')!;
    if (fold.getAttribute('aria-expanded') === 'false') act(() => { fold.click(); });
    await waitUntil(() => document.querySelector('#board-card-tools [data-card-body]')?.hasAttribute('hidden') === false);
}
const svgText = () => [...document.querySelectorAll('svg path')].map(node => node.getAttribute('d') ?? '').join(' ');

test('a real board: handles, fields, Reset, example and mode keep the model, readouts and board objects consistent', async () => {
    const graph = new ObservedLinearMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await ready();
    expect(graph.state.initialized).toBe(true);
    const baseline = graph.liveBoard().objectsList.length;
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('a1')).toBe('(1, 0)');

    // The entries are pucks. A numeric entry above 4 is refused (the old Orodja field clamped it with a message): the model stays and the puck says the range.
    typePuck('linear-map-a11', '9');
    expect(graph.modelNow().matrix).toEqual([[1, 0], [0, 1]]);
    expect(puckNotice('a₁: x')).toContain('4');
    cancelEntry('linear-map-a11');
    expect(puckShows('a₁: x')).toBe('1');
    typePuck('linear-map-a11', '4');
    expect(graph.modelNow().matrix).toEqual([[4, 0], [0, 1]]);
    expect(puckShows('a₁: x')).toBe('4');
    // A value between grid points snaps to the quarter grid and the puck says so.
    typePuck('linear-map-a22', '0.3');
    expect(graph.modelNow().matrix).toEqual([[4, 0], [0, 0.25]]);
    expect(puckNotice('a₂: y')).toBe('Zaokroženo na 0,25.');

    // A handle drag on the real board snaps and moves the handle back to the stored value.
    const [h1] = graph.handles();
    act(() => {
        h1!.setPosition(1, [2.13, 0.9]);
        runAs('learner', () => (h1 as unknown as {triggerEventHandlers: (names: string[], args: unknown[]) => void}).triggerEventHandlers(["drag"], []));
    });
    expect(graph.modelNow().matrix).toEqual([[2.25, 0], [1, 0.25]]);
    expect([h1!.X(), h1!.Y()]).toEqual([2.25, 1]);
    expect(puckShows('a₁: y')).toBe('1');
    expect(puckShows('a₁: x')).toBe('2.25');

    // Reset: identity in the model, the fields, the handles and the readouts; the message is gone.
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi na identiteto'})); });
    expect(graph.modelNow().matrix).toEqual([[1, 0], [0, 1]]);
    expect([puckShows('a₁: x'), puckShows('a₁: y'), puckShows('a₂: x'), puckShows('a₂: y')]).toEqual(['1', '0', '0', '1']);
    const [r1, r2] = graph.handles();
    expect([[r1!.X(), r1!.Y()], [r2!.X(), r2!.Y()]]).toEqual([[1, 0], [0, 1]]);
    expect(readout('a1')).toBe('(1, 0)');
    expect(document.querySelector('[data-linear-map-notice]')).toBeNull();

    // Example and mode: the mode keeps the matrix; determinant mode adds the formula and status.
    act(() => { fireEvent.change(screen.getByLabelText('Primer matrike'), {target: {value: 'basis-default'}}); });
    expect(graph.modelNow().matrix).toEqual([[2, -1], [1, 1]]);
    expect(readout('probe')).toBe('(1, 2)');
    act(() => { fireEvent.change(screen.getByLabelText('Način prikaza'), {target: {value: 'determinant'}}); });
    expect(graph.modelNow()).toMatchObject({mode: 'determinant', matrix: [[2, -1], [1, 1]]});
    expect(readout('det-formula')).toBe('a·d − b·c = 2·1 − (−1)·1 = 3');
    expect(statusIds()).toEqual(['positive']);

    // Singular and +-1/16: collapsed or thin drawings never reach the SVG with non-finite coordinates.
    act(() => { fireEvent.change(screen.getByLabelText('Primer matrike'), {target: {value: 'singular'}}); });
    expect(statusIds()).toEqual(['zero', 'collapse-line']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(svgText()).not.toMatch(/NaN|Infinity|undefined/);
    act(() => { runAs('learner', () => graph.setMatrixDirectly([[0, 0], [0, 0]])); });
    expect(statusIds()).toEqual(['zero', 'collapse-point']);
    expect(svgText()).not.toMatch(/NaN|Infinity|undefined/);
    act(() => { runAs('learner', () => graph.setMatrixDirectly([[0.25, 0], [0, -0.25]])); });
    expect(readout('det')).toBe('−0,0625');
    expect(statusIds()).toEqual(['negative']);
    expect(svgText()).not.toMatch(/NaN|Infinity|undefined/);
    expect(graph.liveBoard().objectsList.length).toBe(baseline);
});

test('the visible statuses are plain text; the graph announces them through its one settled live region (decision 63)', () => {
    const graph = new ObservedLinearMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { runAs('learner', () => graph.setMatrixDirectly([[0, 0], [0, 0]])); });
    const first = document.querySelector('[data-linear-map-status]')!;
    expect(first.closest('[role="status"], [aria-live]')).toBeNull();
    const live = document.querySelectorAll('[data-readout-live]');
    expect(live).toHaveLength(1);
    expect(live[0].textContent).toContain(first.textContent);
});

test('a live language switch updates labels, readouts and statuses and asks the board to redraw', async () => {
    const graph = new ObservedLinearMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await ready();
    act(() => { fireEvent.change(screen.getByLabelText('Način prikaza'), {target: {value: 'determinant'}}); });
    act(() => { fireEvent.change(screen.getByLabelText('Primer matrike'), {target: {value: 'orientation-reversing'}}); });
    expect(readout('orientation')).toBe('obrnjena');
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(readout('orientation')).toBe('reversed');
    expect(screen.getByLabelText('Example matrix')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Reset to the identity'})).toBeInTheDocument();
    expect(statusIds()).toEqual(['negative']);
    expect(document.querySelector('[data-linear-map-status="negative"]')?.textContent).toMatch(/reversed/);
    // The values the language switch must not change.
    expect(graph.modelNow().matrix).toEqual([[1, 2], [2, 1]]);
    expect(puckShows('a₁: y')).toBe('2');
    act(() => { setLanguage('sl'); });
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedLinearMapGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = graph.liveBoard().objectsList.length;
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.change(screen.getByLabelText('Primer matrike'), {target: {value: 'basis-default'}}); });
    act(() => { fireEvent.click(screen.getByRole('checkbox', {name: 'Bézierjeva krivulja'})); });
    expect(graph.modelNow()).toMatchObject({curveVisible: false});
    expect(graph.liveBoard().objectsList.length).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
    expect(graph.handles()).toEqual([undefined, undefined]);
});

test('the probe toggle is a switch that reaches the model', () => {
    const graph = new ObservedLinearMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const probe = screen.getByRole('checkbox', {name: 'Točka p'}) as HTMLInputElement;
    expect(probe.type).toBe('checkbox');
    const before = graph.modelNow().probeVisible;
    act(() => { fireEvent.click(probe); });
    expect(graph.modelNow().probeVisible).toBe(!before);
    expect(probe.checked).toBe(!before);
});
