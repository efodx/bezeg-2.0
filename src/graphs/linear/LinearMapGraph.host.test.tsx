import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {LinearMapGraph} from './LinearMapGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import type {Mat2} from '../../linear/matrix2';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

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
const field = (name: RegExp | string) => screen.getByLabelText(name) as HTMLInputElement;
const typeAndConfirm = (input: HTMLInputElement, text: string) => {
    act(() => { fireEvent.input(input, {target: {value: text}, inputType: 'insertText'}); });
    act(() => { fireEvent.keyDown(input, {key: 'Enter'}); });
};
const svgText = () => [...document.querySelectorAll('svg path')].map(node => node.getAttribute('d') ?? '').join(' ');

test('a real board: handles, fields, Reset, example and mode keep the model, readouts and board objects consistent', () => {
    const graph = new ObservedLinearMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    const baseline = graph.liveBoard().objectsList.length;
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('a1')).toBe('(1, 0)');

    // A numeric entry above 4 is clamped with a message; the field shows the stored value.
    typeAndConfirm(field('a₁: x'), '9');
    expect(graph.modelNow().matrix).toEqual([[4, 0], [0, 1]]);
    expect(document.querySelector('[data-linear-map-notice="clamped"]')?.textContent).toMatch(/a₁: x.*zunaj območja/);
    expect(field('a₁: x').value).toBe('4');
    // A value between grid points snaps with another message.
    typeAndConfirm(field('a₂: y'), '0.3');
    expect(graph.modelNow().matrix).toEqual([[4, 0], [0, 0.25]]);
    expect(document.querySelector('[data-linear-map-notice="snapped"]')).not.toBeNull();

    // A handle drag on the real board snaps and moves the handle back to the stored value.
    const [h1] = graph.handles();
    act(() => {
        h1!.setPosition(1, [2.13, 0.9]);
        (h1 as unknown as {triggerEventHandlers: (names: string[], args: unknown[]) => void}).triggerEventHandlers(["drag"], []);
    });
    expect(graph.modelNow().matrix).toEqual([[2.25, 0], [1, 0.25]]);
    expect([h1!.X(), h1!.Y()]).toEqual([2.25, 1]);
    expect(field('a₁: y').value).toBe('1');
    expect(field('a₁: x').value).toBe('2,25');

    // Reset: identity in the model, the fields, the handles and the readouts; the message is gone.
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi na identiteto'})); });
    expect(graph.modelNow().matrix).toEqual([[1, 0], [0, 1]]);
    expect([field('a₁: x').value, field('a₁: y').value, field('a₂: x').value, field('a₂: y').value]).toEqual(['1', '0', '0', '1']);
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
    act(() => { graph.setMatrixDirectly([[0, 0], [0, 0]]); });
    expect(statusIds()).toEqual(['zero', 'collapse-point']);
    expect(svgText()).not.toMatch(/NaN|Infinity|undefined/);
    act(() => { graph.setMatrixDirectly([[0.25, 0], [0, -0.25]]); });
    expect(readout('det')).toBe('−0,0625');
    expect(statusIds()).toEqual(['negative']);
    expect(svgText()).not.toMatch(/NaN|Infinity|undefined/);
    expect(graph.liveBoard().objectsList.length).toBe(baseline);
});

test('a live language switch updates the board caption, labels, readouts and statuses and asks the board to redraw', () => {
    const graph = new ObservedLinearMapGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    act(() => { fireEvent.change(screen.getByLabelText('Način prikaza'), {target: {value: 'determinant'}}); });
    act(() => { fireEvent.change(screen.getByLabelText('Primer matrike'), {target: {value: 'orientation-reversing'}}); });
    expect(graph.captionPlainLines().join('|')).toContain('Orientacija: obrnjena');
    expect(readout('orientation')).toBe('obrnjena');
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(graph.captionPlainLines().join('|')).toContain('Orientation: reversed');
    expect(readout('orientation')).toBe('reversed');
    expect(screen.getByLabelText('Example matrix')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Reset to the identity'})).toBeInTheDocument();
    expect(statusIds()).toEqual(['negative']);
    expect(document.querySelector('[data-linear-map-status="negative"]')?.textContent).toMatch(/reversed/);
    // The values the language switch must not change.
    expect(graph.modelNow().matrix).toEqual([[1, 2], [2, 1]]);
    expect(field('a₁: y').value).toBe('2');
    act(() => { setLanguage('sl'); });
    expect(graph.captionPlainLines().join('|')).toContain('Orientacija: obrnjena');
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedLinearMapGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = graph.liveBoard().objectsList.length;
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.change(screen.getByLabelText('Primer matrike'), {target: {value: 'basis-default'}}); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Bézierjeva krivulja'})); });
    expect(graph.modelNow()).toMatchObject({curveVisible: false});
    expect(graph.liveBoard().objectsList.length).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
    expect(graph.handles()).toEqual([undefined, undefined]);
});
