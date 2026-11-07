import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PolynomialZerosGraph} from './PolynomialZerosGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction} from '../../learning/model';
import {DEFAULT_POLYNOMIAL_ZEROS_MODEL, polynomialExampleModel} from '../../analysis/polynomialZerosModel';
import {enterNumber} from '../../inputs/testEntry';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

interface JsxPoint {
    triggerEventHandlers(events: string[], args: unknown[]): void;
}

class ObservedPolynomialGraph extends PolynomialZerosGraph {
    lesson(action: LessonAction) {
        this.applyLessonAction(action);
    }

    modelNow() {
        return this.model;
    }

    liveBoard() {
        return this.board;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    glidersNow() {
        return this['gliders'];
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const notice = () => document.querySelector('[data-zero-list-notice]')?.textContent ?? '';
const boardObjects = (graph: ObservedPolynomialGraph) => graph.liveBoard().objectsList.length;
const drag = (graph: ObservedPolynomialGraph, index: number, x: number) => {
    const glider = graph.glidersNow()[index];
    act(() => {
        glider.moveTo([x, 0]);
        (glider as unknown as JsxPoint).triggerEventHandlers(['drag'], []);
    });
};

const mount = () => {
    const graph = new ObservedPolynomialGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return graph;
};

test('a real board shows the default polynomial: degree, y-intercept, zero facts', () => {
    const graph = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_POLYNOMIAL_ZEROS_MODEL);
    expect(readout('degree')).toMatch(/^3 /);
    expect(readout('y-intercept')).toBe('p(0) = 2');
    expect(readout('zero-0')).toMatch(/večkratnost 1: graf seka os x/);
    expect(readout('zero-1')).toMatch(/večkratnost 2: graf se dotika osi x/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('a typed zero moves, a typed zero onto another merges and says so, the cap and multiplicity are explained', () => {
    const graph = mount();
    act(() => { enterNumber(field('Ničla 1: položaj x'), '-3,5'); });
    expect(graph.modelNow().zeros).toEqual([{z: -3.5, m: 1}, {z: 1, m: 2}]);
    expect(graph.glidersNow()[0].X()).toBeCloseTo(-3.5, 9);

    act(() => { enterNumber(field('Ničla 1: položaj x'), '1'); });
    expect(graph.modelNow().zeros).toEqual([{z: 1, m: 3}]);
    expect(notice()).toMatch(/trojno ničlo pri x = 1/);
    expect(readout('degree')).toMatch(/^3 /);
    expect(graph.glidersNow()[0].X()).toBeCloseTo(1, 9);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj ničlo'})); });
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj ničlo'})); });
    expect(graph.modelNow().zeros.reduce((s, e) => s + e.m, 0)).toBe(5);
    expect(screen.getByRole('button', {name: 'Dodaj ničlo'})).toBeDisabled();
    expect(document.querySelector('[data-zero-list-cap]')?.textContent).toMatch(/Največja stopnja je 5/);

    act(() => { enterNumber(screen.getByLabelText('Ničla 2: večkratnost'), '2'); });
    expect(graph.modelNow().zeros[1].m).toBe(1);
    act(() => { enterNumber(screen.getByLabelText('Ničla 1: večkratnost'), '2'); });
    expect(graph.modelNow().zeros[0].m).toBe(2);
    expect(graph.modelNow().zeros[1].m).toBe(1);
});

test('dragging a glider snaps to the grid, merging announces and the rest of the drag is ignored', () => {
    const graph = mount();
    drag(graph, 0, -1.93);
    expect(graph.modelNow().zeros[0].z).toBe(-1.9);
    drag(graph, 0, 1.02);
    expect(graph.modelNow().zeros).toEqual([{z: 1, m: 3}]);
    expect(notice()).toMatch(/trojno ničlo/);
    drag(graph, 0, 4);
    expect(graph.modelNow().zeros).toEqual([{z: 1, m: 3}]);
    expect(graph.glidersNow()[0].X()).toBeCloseTo(1, 9);
});

test('example switch, derivative toggle and the arrow key step in the zero field', () => {
    const graph = mount();
    act(() => { fireEvent.change(screen.getByLabelText('Primer'), {target: {value: 'degree-five'}}); });
    expect(graph.modelNow()).toEqual(polynomialExampleModel('degree-five'));
    expect(readout('degree')).toMatch(/^5 /);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži odvod p′'})); });
    expect(graph.modelNow().derivativeVisible).toBe(true);
    expect(screen.getByRole('button', {name: 'Skrij odvod p′'})).toBeInTheDocument();
    act(() => { fireEvent.keyDown(field('Ničla 1: položaj x'), {key: 'ArrowUp'}); });
    expect(graph.modelNow().zeros[0].z).toBeCloseTo(-2.9, 9);
});

test('both languages: labels and readouts follow a live language switch', () => {
    mount();
    act(() => { setLanguage('en'); });
    expect(screen.getByLabelText('Zero 1: position x')).toBeInTheDocument();
    expect(readout('y-intercept')).toBe('p(0) = 2');
    expect(readout('zero-1')).toMatch(/multiplicity 2/);
    expect(document.body.textContent).not.toMatch(/Ničla|večkratnost/);
});

test('Reset and an imported Preset restore controls and board objects', () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    const stored = {k: 0.2, zeros: [{z: -3, m: 1}, {z: -1, m: 2}, {z: 2, m: 2}], derivativeVisible: true};
    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-6, 8, 6, -8]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(field('Ničla 3: položaj x').value).toBe('2');
    expect(field('Koeficient k').value).toBe('0,2');
    expect(graph.glidersNow()[2].X()).toBeCloseTo(2, 9);
    expect(screen.getByRole('button', {name: 'Skrij odvod p′'})).toBeInTheDocument();
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi vrednosti'})); });
    expect(graph.modelNow()).toEqual(DEFAULT_POLYNOMIAL_ZEROS_MODEL);
    expect(screen.queryByLabelText('Ničla 3: položaj x')).toBeNull();
    expect(boardObjects(graph)).toBe(baseline);
});

test('StrictMode mounts twice without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedPolynomialGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Dodaj ničlo'})); });
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('a multi-action lesson scene runs in one synchronous sequence; a rejected value is refused, not clamped', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'polynomial-example', value: 'degree-five'},
        {kind: 'function-parameter', name: 'k', value: -0.5},
        {kind: 'function-parameter', name: 'poly-zero-1', value: -4},
        {kind: 'function-parameter', name: 'poly-zero-3', value: 3},
        {kind: 'function-visibility', target: 'polynomial-derivative', visible: true},
    ] as LessonAction[]) act(() => graph.lesson(action));
    expect(graph.modelNow()).toEqual({k: -0.5, zeros: [{z: -4, m: 1}, {z: -1, m: 2}, {z: 3, m: 2}], derivativeVisible: true});
    expect(graph.state.derivativeVisible).toBe(true);
    expect(graph.state.zeros).toEqual(graph.modelNow().zeros);
    act(() => graph.lesson({kind: 'function-parameter', name: 'poly-zero-1', value: -1} as LessonAction));
    expect(graph.modelNow().zeros).toEqual([{z: -1, m: 3}, {z: 3, m: 2}]);

    const before = graph.modelNow();
    expect(() => graph.lesson({kind: 'function-parameter', name: 'k', value: 0} as LessonAction)).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'poly-zero-2', value: 99} as LessonAction)).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'poly-zero-1', value: 3} as LessonAction)).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-choice', name: 'polynomial-example', value: 'quartic'} as LessonAction)).toThrow(DomainError);
    expect(graph.modelNow()).toBe(before);
});
