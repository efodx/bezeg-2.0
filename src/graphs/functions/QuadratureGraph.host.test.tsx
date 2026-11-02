import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QuadratureGraph} from './QuadratureGraph';
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

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedQuadratureGraph extends QuadratureGraph {
    liveBoard() {
        return this.board;
    }

    modelNow() {
        return this.model;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    shapeCurves() {
        return this.board.objectsList.filter((object: any) => object.elType === 'curve') as any[];
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-quadrature-status]')].map(element => element.getAttribute('data-quadrature-status'));
const boardObjects = (graph: ObservedQuadratureGraph) => graph.liveBoard().objectsList.length;
const mount = () => {
    const graph = new ObservedQuadratureGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
};
const range = () => screen.getByRole('slider') as HTMLInputElement;

test('the default scene shows the lesson example and the readouts follow n by keyboard-equivalent slider input and by the number field', () => {
    const {graph} = mount();
    expect(graph.state.initialized).toBe(true);
    expect(graph.modelNow()).toMatchObject({rule: 'trapezoid', fn: 'sin', n: 2});
    expect(readout('approximation')).toBe('1,5708');
    expect(readout('exact')).toBe('2');
    expect(readout('error')).toBe('0,4292');
    expect(readout('ratio')).toBe('4,66');
    const baseline = boardObjects(graph);

    act(() => { fireEvent.change(range(), {target: {value: '4'}}); });
    expect(graph.modelNow().n).toBe(4);
    expect(readout('error')).toBe('0,1039');
    expect(readout('half-error')).toBe('0,4292');
    expect(readout('ratio')).toBe('4,13');

    const field = screen.getByLabelText('Število podintervalov n') as HTMLInputElement;
    act(() => { fireEvent.change(field, {target: {value: '8'}}); });
    expect(graph.modelNow().n).toBe(8);
    expect(readout('error')).toBe('0,02577');
    expect(readout('ratio')).toBe('4,03');
    expect(readout('half-error')).toBe('0,1039');
    expect(boardObjects(graph)).toBe(baseline);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('Simpson: odd n is refused, a switch from odd n is adjusted with a stated message, and the steps are even', () => {
    const {graph} = mount();
    act(() => { fireEvent.change(screen.getByLabelText('Število podintervalov n'), {target: {value: '5'}}); });
    expect(graph.modelNow().n).toBe(5);
    expect(readout('ratio')).toBe('ni');
    expect(statusIds()).toEqual(['trapezoid', 'no-half']);

    act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'simpson'}}); });
    expect(graph.modelNow()).toMatchObject({rule: 'simpson', n: 6});
    expect(document.querySelector('[data-quadrature-status="adjusted"]')?.textContent).toMatch(/n = 5 povečan na n = 6/);
    expect(range().step).toBe('2');
    expect(range().min).toBe('2');

    // an odd n typed for Simpson is rejected and the model stays
    act(() => { fireEvent.change(screen.getByLabelText('Število podintervalov n, vrednost'), {target: {value: '7'}}); });
    expect(graph.modelNow().n).toBe(6);
    expect(screen.getByText('Pri Simpsonovem pravilu mora biti n sodo število od 2 do 150.')).toBeInTheDocument();
    // the next edit clears the adjustment note; an even n is applied
    act(() => { fireEvent.change(screen.getByLabelText('Število podintervalov n'), {target: {value: '8'}}); });
    expect(graph.modelNow().n).toBe(8);
    expect(document.querySelector('[data-quadrature-status="adjusted"]')).toBeNull();
    expect(readout('error')).toBe('0,0002692');
    expect(readout('ratio')).toBe('16,9');

    // an even n keeps n without a message
    act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'trapezoid'}}); });
    act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'simpson'}}); });
    expect(graph.modelNow().n).toBe(8);
    expect(document.querySelector('[data-quadrature-status="adjusted"]')).toBeNull();
});

test('the function switch keeps the rule and n, and a live language switch updates board text, labels and readouts', () => {
    const {graph} = mount();
    act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'simpson'}}); });
    act(() => { fireEvent.change(screen.getByLabelText('Funkcija'), {target: {value: 'square'}}); });
    expect(graph.modelNow()).toMatchObject({rule: 'simpson', fn: 'square', n: 2});
    expect(readout('exact')).toBe('10,3354');
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text').map((text: any) => String(text.plaintext)).join('|');
    expect(texts()).toContain('n = 2, približek');
    act(() => { setLanguage('en'); });
    expect(texts()).toContain('n = 2, approximation');
    expect(texts()).not.toContain('približek');
    expect(screen.getByLabelText('Rule')).toBeInTheDocument();
    expect(readout('approximation')).toMatch(/\./);
    expect(statusIds()).toEqual(['simpson', 'no-half']);
    act(() => { setLanguage('sl'); });
    expect(texts()).toContain('približek');
});

test('Preset import and Reset restore the controls and the board objects; unmount releases everything', () => {
    const {graph, view} = mount();
    const baseline = boardObjects(graph);
    const stored = {rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 12};
    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-3, 8.5, 9, -1]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect((screen.getByLabelText('Pravilo') as HTMLSelectElement).value).toBe('simpson');
    expect((screen.getByLabelText('Funkcija') as HTMLSelectElement).value).toBe('exp');
    expect((screen.getByLabelText('Spodnja meja a') as HTMLInputElement).value).toBe('−1');
    expect(range().value).toBe('12');
    expect(readout('half-error')).not.toBe('ni');
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Shrani'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi prednastavitev'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Uredi'})); });
    expect(graph.modelNow()).toEqual({rule: 'trapezoid', fn: 'sin', a: 0, b: Math.PI, n: 2});
    expect((screen.getByLabelText('Pravilo') as HTMLSelectElement).value).toBe('trapezoid');
    expect(range().value).toBe('2');
    expect(readout('error')).toBe('0,4292');
    expect(boardObjects(graph)).toBe(baseline);

    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('StrictMode does not duplicate board objects', () => {
    const graph = new ObservedQuadratureGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'simpson'}}); });
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('Reset and Preset import clear the odd-to-even adjustment line', () => {
    const {graph} = mount();
    const adjusted = () => document.querySelector('[data-quadrature-status="adjusted"]');
    const makeAdjustment = () => {
        act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'trapezoid'}}); });
        act(() => { fireEvent.change(screen.getByLabelText('Število podintervalov n'), {target: {value: '5'}}); });
        act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'simpson'}}); });
        expect(adjusted()).not.toBeNull();
    };
    makeAdjustment();
    act(() => { graph.importPreset({id: 'stored', data: {rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 12}, boardState: {boundingBox: [-3, 8.5, 9, -1]}}); });
    expect(adjusted()).toBeNull();
    act(() => { fireEvent.change(screen.getByLabelText('Pravilo'), {target: {value: 'trapezoid'}}); });
    makeAdjustment();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Shrani'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi prednastavitev'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Uredi'})); });
    expect(adjusted()).toBeNull();
});
