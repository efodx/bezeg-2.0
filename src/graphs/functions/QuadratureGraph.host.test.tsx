import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {QuadratureGraph} from './QuadratureGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {chooseOnPuck, installBoardShims, puckControl, typePuck, waitForPucks} from '../base/realGraphTestHarness';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));

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
// The rule and n are pucks on the board (task 08); the host tests write through the arbiter as a learner, and the last test goes through the pucks.
const setN = (graph: ObservedQuadratureGraph, n: number) => act(() => { graph.parameters!.write('quadrature-n', n, 'learner'); });
const setRule = (graph: ObservedQuadratureGraph, rule: string) => act(() => { graph.parameters!.write('quadrature-rule', rule, 'learner'); });

test('the default scene shows the lesson example and the readouts follow n by keyboard-equivalent slider input and by the number field', () => {
    const {graph} = mount();
    expect(graph.state.initialized).toBe(true);
    expect(graph.modelNow()).toMatchObject({rule: 'trapezoid', fn: 'sin', n: 2});
    expect(readout('approximation')).toBe('1,5708');
    expect(readout('exact')).toBe('2');
    expect(readout('error')).toBe('0,4292');
    expect(readout('ratio')).toBe('4,66');
    const baseline = boardObjects(graph);

    setN(graph, 4);
    expect(graph.modelNow().n).toBe(4);
    expect(readout('error')).toBe('0,1039');
    expect(readout('half-error')).toBe('0,4292');
    expect(readout('ratio')).toBe('4,13');

    setN(graph, 8);
    expect(graph.modelNow().n).toBe(8);
    expect(readout('error')).toBe('0,02577');
    expect(readout('ratio')).toBe('4,03');
    expect(readout('half-error')).toBe('0,1039');
    expect(boardObjects(graph)).toBe(baseline);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('Simpson: odd n is refused, a switch from odd n is adjusted with a stated message, and the steps are even', () => {
    const {graph} = mount();
    setN(graph, 5);
    expect(graph.modelNow().n).toBe(5);
    expect(readout('ratio')).toBe('ni');
    expect(statusIds()).toEqual(['trapezoid', 'no-half']);

    setRule(graph, 'simpson');
    expect(graph.modelNow()).toMatchObject({rule: 'simpson', n: 6});
    expect(document.querySelector('[data-quadrature-status="adjusted"]')?.textContent).toMatch(/n = 5 povečan na n = 6/);
    // The adjustment is one more line of the status group, not a live region of its own.
    expect(document.querySelector('.quadrature-status [data-quadrature-status="adjusted"]')).not.toBeNull();
    expect(document.querySelector('[role="status"] [data-quadrature-status]')).toBeNull();
    expect(document.querySelector('[role="status"][data-refusal-notice]')).not.toBeNull();
    const declaredN = graph.getDeclaration()!.parameters!.find(entry => entry.key === 'quadrature-n') as {min: number; max: number; step: number};
    expect(declaredN).toMatchObject({min: 2, max: 150, step: 2});

    // an odd n written for Simpson is rejected and the model stays
    let refused: ReturnType<NonNullable<typeof graph.parameters>['write']> | undefined;
    act(() => { refused = graph.parameters!.write('quadrature-n', 7, 'learner'); });
    expect(refused).toMatchObject({status: 'refused-domain'});
    expect((refused as {error: Error}).error.message).toBe('Pri Simpsonovem pravilu mora biti n sodo število od 2 do 150.');
    expect(graph.modelNow().n).toBe(6);
    expect(graph.parameters!.read('quadrature-n')).toBe(6);
    // the next edit clears the adjustment note; an even n is applied
    setN(graph, 8);
    expect(graph.modelNow().n).toBe(8);
    expect(document.querySelector('[data-quadrature-status="adjusted"]')).toBeNull();
    expect(readout('error')).toBe('0,0002692');
    expect(readout('ratio')).toBe('16,9');

    // an even n keeps n without a message
    setRule(graph, 'trapezoid');
    setRule(graph, 'simpson');
    expect(graph.modelNow().n).toBe(8);
    expect(document.querySelector('[data-quadrature-status="adjusted"]')).toBeNull();
});

test('the function switch keeps the rule and n, and a live language switch updates labels and readouts', () => {
    const {graph} = mount();
    setRule(graph, 'simpson');
    act(() => { fireEvent.change(screen.getByLabelText('Funkcija'), {target: {value: 'square'}}); });
    expect(graph.modelNow()).toMatchObject({rule: 'simpson', fn: 'square', n: 2});
    expect(readout('exact')).toBe('10,3354');
    const texts = () => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text').map((text: any) => String(text.plaintext)).join('|');
    const readoutName = () => document.querySelector('[data-readout="approximation"] dt')?.textContent;
    expect(texts()).not.toContain('približek'); // the board keeps no caption: n, the approximation and the error are readout rows
    expect(readout('n')).toBe('2');
    expect(readoutName()).toBe('Približek');
    act(() => { setLanguage('en'); });
    expect(readoutName()).toBe('Approximation');
    expect(screen.getByLabelText('Function')).toBeInTheDocument();
    expect(readout('approximation')).toMatch(/\./);
    expect(statusIds()).toEqual(['simpson', 'no-half']);
    act(() => { setLanguage('sl'); });
    expect(readoutName()).toBe('Približek');
});

test('Preset import and Reset restore the controls and the board objects; unmount releases everything', () => {
    const {graph, view} = mount();
    const baseline = boardObjects(graph);
    const stored = {rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 12};
    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-3, 8.5, 9, -1]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(graph.parameters!.read('quadrature-rule')).toBe('simpson');
    expect((screen.getByLabelText('Funkcija') as HTMLSelectElement).value).toBe('exp');
    expect((screen.getByLabelText('Spodnja meja a, vrednost') as HTMLInputElement).value).toBe('−1');
    expect(graph.parameters!.read('quadrature-n')).toBe(12);
    expect(readout('half-error')).not.toBe('ni');
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Shrani'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi prednastavitev'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Uredi'})); });
    expect(graph.modelNow()).toEqual({rule: 'trapezoid', fn: 'sin', a: 0, b: Math.PI, n: 2});
    expect(graph.parameters!.read('quadrature-rule')).toBe('trapezoid');
    expect(graph.parameters!.read('quadrature-n')).toBe(2);
    expect(readout('error')).toBe('0,4292');
    expect(boardObjects(graph)).toBe(baseline);

    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('StrictMode does not duplicate board objects', () => {
    const graph = new ObservedQuadratureGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    const baseline = boardObjects(graph);
    setRule(graph, 'simpson');
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('Reset and Preset import clear the odd-to-even adjustment line', () => {
    const {graph} = mount();
    const adjusted = () => document.querySelector('[data-quadrature-status="adjusted"]');
    const makeAdjustment = () => {
        setRule(graph, 'trapezoid');
        setN(graph, 5);
        setRule(graph, 'simpson');
        expect(adjusted()).not.toBeNull();
    };
    makeAdjustment();
    act(() => { graph.importPreset({id: 'stored', data: {rule: 'simpson', fn: 'exp', a: -1, b: 2, n: 12}, boardState: {boundingBox: [-3, 8.5, 9, -1]}}); });
    expect(adjusted()).toBeNull();
    setRule(graph, 'trapezoid');
    makeAdjustment();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Shrani'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi prednastavitev'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Uredi'})); });
    expect(adjusted()).toBeNull();
});

test('the rule and n are pucks: the learner switches and types in them, and Orodja holds no control for them', async () => {
    installBoardShims(); // the puck strip needs a laid-out board; last test of the file, so the shims touch no other test
    const {graph} = mount();
    await waitForPucks('quadrature-n');
    expect(document.querySelector('#board-card-tools [data-puck-key="quadrature-n"]')).toBeNull();
    expect(screen.queryByRole('slider', {name: 'Število podintervalov n'})).toBeNull();
    expect(screen.queryByLabelText('Pravilo', {selector: 'select'})).toBeNull();
    expect(puckControl('quadrature-n')).not.toBeNull();
    typePuck('quadrature-n', '8');
    expect(graph.modelNow().n).toBe(8);
    expect(readout('error')).toBe('0,02577');
    await chooseOnPuck('quadrature-rule', 'simpson');
    expect(graph.modelNow().rule).toBe('simpson');
    expect(readout('error')).toBe('0,0002692');
    // Simpson needs an even n: an odd value typed in the puck is snapped to the even step, never applied as typed.
    typePuck('quadrature-n', '7');
    expect(graph.modelNow().n % 2).toBe(0);
});
