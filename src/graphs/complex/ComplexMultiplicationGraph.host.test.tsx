import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ComplexMultiplicationGraph} from './ComplexMultiplicationGraph';
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
class ObservedComplexGraph extends ComplexMultiplicationGraph {
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
const statusIds = () => [...document.querySelectorAll('[data-complex-status]')].map(element => element.getAttribute('data-complex-status'));
const boardObjects = (graph: ObservedComplexGraph) => graph.liveBoard().objectsList.length;
const field = (name: RegExp | string) => screen.getByLabelText(name) as HTMLInputElement;

test('a real board shows z, w and zw: the fields, the polar fields, the example and the Show buttons change the model and the readouts', () => {
    const graph = new ObservedComplexGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(readout('z')).toBe('1 + i');
    expect(readout('w')).toBe('i');
    expect(readout('product')).toBe('skrito');
    expect(statusIds()).toEqual(['hidden']);
    const baseline = boardObjects(graph);

    // Show product reveals (1 + i) i = -1 + i
    const toggle = () => screen.getByRole('button', {name: /zmnožek/}) as HTMLButtonElement;
    expect(toggle().textContent).toBe('Pokaži zmnožek');
    act(() => { fireEvent.click(toggle()); });
    expect(graph.modelNow()).toMatchObject({productVisible: true});
    expect(toggle().textContent).toBe('Skrij zmnožek');
    expect(readout('product')).toBe('−1 + i');
    expect(readout('product-argument')).toBe('3π/4 ≈ 2,356');
    expect(statusIds()).toEqual(['not-reduced']);
    // Show arguments
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži argumente'})); });
    expect(graph.modelNow()).toMatchObject({anglesVisible: true});
    expect(screen.getByRole('button', {name: 'Skrij argumente'})).toBeInTheDocument();

    // Cartesian fields: a grid value is applied, an off-grid value is refused with the reason
    act(() => { fireEvent.change(field('Re w'), {target: {value: '1'}}); });
    expect(graph.modelNow()).toMatchObject({wRe: 1, wIm: 1});
    expect(readout('product')).toBe('2i');
    act(() => { fireEvent.change(field('Im w'), {target: {value: '0.123'}}); });
    expect(graph.modelNow()).toMatchObject({wIm: 1});
    expect(screen.getByText('Vrednost mora biti večkratnik števila 0,05 med −2 in 2.')).toBeInTheDocument();
    act(() => { fireEvent.change(field('Im w'), {target: {value: '2.5'}}); });
    expect(graph.modelNow()).toMatchObject({wIm: 1});
    act(() => { fireEvent.change(field('Im z'), {target: {value: '-1'}}); });
    expect(graph.modelNow()).toMatchObject({zIm: -1});
    // (1 - i)(1 + i) = 2: a real product has no imaginary part
    expect(readout('product')).toBe('2');
    expect(boardObjects(graph)).toBe(baseline);

    // the polar fields apply on Enter (not on every keystroke) and then show the polar form of the snapped w
    act(() => { fireEvent.input(field(/^Modul \|w\|$/), {target: {value: '1.5'}, inputType: 'insertText'}); });
    expect(graph.modelNow()).toMatchObject({wRe: 1, wIm: 1});
    expect(field(/^Modul \|w\|$/).value).toBe('1.5');
    act(() => { fireEvent.keyDown(field(/^Modul \|w\|$/), {key: 'Enter'}); });
    expect(graph.modelNow()).toMatchObject({wRe: 1.05, wIm: 1.05});
    expect(field(/^Modul \|w\|$/).value).toBe('1.4849');
    expect(field(/^Argument arg w \(rad\)$/).value).toBe('0.7854');
    // a rejected polar value explains itself
    act(() => { fireEvent.input(field(/^Modul \|w\|$/), {target: {value: '3'}, inputType: 'insertText'}); });
    act(() => { fireEvent.keyDown(field(/^Modul \|w\|$/), {key: 'Enter'}); });
    expect(graph.modelNow()).toMatchObject({wRe: 1.05, wIm: 1.05});

    // with w = 0 the argument field is disabled and described; its product and argument read "ni definiran"
    act(() => { fireEvent.change(screen.getByLabelText('Primer množenja'), {target: {value: 'zero'}}); });
    expect(graph.modelNow()).toEqual({example: 'zero', zRe: 1, zIm: 1, wRe: 0, wIm: 0, productVisible: false, anglesVisible: false});
    const argumentField = field(/^Argument arg w \(rad\)$/);
    expect(argumentField).toBeDisabled();
    const helpId = argumentField.getAttribute('aria-describedby')!;
    expect(helpId).toContain('complex-w-argument-help');
    expect(document.getElementById('complex-w-argument-help')?.textContent).toMatch(/ni definiran/);
    act(() => { fireEvent.click(toggle()); });
    expect(readout('product')).toBe('0');
    expect(readout('product-argument')).toBe('ni definiran');
    expect(readout('w-argument')).toBe('ni definiran');
    expect(statusIds()).toEqual(['w-zero', 'product-zero']);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);

    // the English labels follow a live language switch, and the board is asked to redraw its texts
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(screen.getByRole('button', {name: 'Hide product'})).toBeInTheDocument();
    expect(screen.getByLabelText('Multiplication example')).toBeInTheDocument();
    expect(readout('product-argument')).toBe('undefined');
    expect(graph.captionPlainLines()).toEqual(['z = 1 + i, w = 0', 'zw = 0', 'circle: z; square: w; diamond: zw']);
    expect(document.getElementById('complex-w-argument-help')?.textContent).toMatch(/undefined/);
    act(() => { setLanguage('sl'); });
    expect(graph.captionPlainLines()).toEqual(['z = 1 + i, w = 0', 'zw = 0', 'krog: z; kvadrat: w; romb: zw']);
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedComplexGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    expect(graph.state.initialized).toBe(true);
    const baseline = boardObjects(graph);
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži zmnožek'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži argumente'})); });
    act(() => { fireEvent.change(screen.getByLabelText('Primer množenja'), {target: {value: 'general'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'general', productVisible: false, anglesVisible: false});
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
