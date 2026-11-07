import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {RationalFunctionGraph} from './RationalFunctionGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction} from '../../learning/model';
import {DEFAULT_RATIONAL_FUNCTION_MODEL, rationalExampleModel} from '../../analysis/rationalFunctionModel';
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

class ObservedRationalGraph extends RationalFunctionGraph {
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
const boardObjects = (graph: ObservedRationalGraph) => graph.liveBoard().objectsList.length;
const drag = (graph: ObservedRationalGraph, part: 'numerator' | 'denominator', index: number, x: number) => {
    const glider = graph.glidersNow()[part][index];
    act(() => {
        glider.moveTo([x, 0]);
        (glider as unknown as JsxPoint).triggerEventHandlers(['drag'], []);
    });
};

const mount = () => {
    const graph = new ObservedRationalGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return graph;
};

test('a real board shows the default fraction: pole, oblique asymptote and the remainder term', () => {
    const graph = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_RATIONAL_FUNCTION_MODEL);
    expect(readout('pole-0')).toMatch(/x = 2/);
    expect(readout('holes')).toMatch(/ni lukenj/);
    expect(readout('asymptote')).toMatch(/poševna asimptota/);
    expect(readout('remainder')).toMatch(/0,375/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('a numerator zero dragged onto a denominator zero makes a hole and says so; dragging away makes the pole again', () => {
    const graph = mount();
    drag(graph, 'numerator', 1, 2);
    expect(graph.modelNow().numerator).toEqual([{z: -1, m: 1}, {z: 2, m: 1}]);
    expect(readout('holes')).toMatch(/luknja/);
    expect(readout('pole-0')).toBeUndefined();
    expect(notice()).toMatch(/luknja/);
    expect(document.querySelector('[data-zero-list-notice]')?.getAttribute('data-zero-list-notice')).toBe('hole');
    drag(graph, 'numerator', 1, 1);
    expect(readout('pole-0')).toMatch(/x = 2/);
    expect(document.querySelector('[data-zero-list-notice]')?.getAttribute('data-zero-list-notice')).toBe('pole');
    expect(notice()).toMatch(/spet pol/);
});

test('typed values make a hole through the fields, an example switch and the probe slider follow', () => {
    const graph = mount();
    act(() => { enterNumber(field('Števec: Ničla 2: položaj x'), '2'); });
    expect(graph.modelNow().numerator[1].z).toBe(2);
    expect(readout('holes')).toMatch(/luknja/);
    expect(graph.glidersNow().numerator[1].X()).toBeCloseTo(2, 9);

    act(() => { fireEvent.change(screen.getByLabelText('Primer'), {target: {value: 'double-pole'}}); });
    expect(graph.modelNow()).toEqual(rationalExampleModel('double-pole'));
    expect(readout('pole-1')).toMatch(/večkratnost 2/);

    act(() => { fireEvent.change(screen.getByLabelText('Primer'), {target: {value: 'horizontal'}}); });
    expect(readout('asymptote')).toMatch(/vodoravna asimptota/);
    const probe = document.querySelector('input[type="range"]') as HTMLInputElement;
    act(() => { enterNumber(probe, '5'); });
    expect(graph.modelNow().probe).toBe(5);
});

test('both languages: labels and readouts follow a live language switch', () => {
    mount();
    expect(readout('holes')).toBe('ni lukenj');
    act(() => { setLanguage('en'); });
    expect(screen.getByLabelText('Numerator: Zero 1: position x')).toBeInTheDocument();
    expect(readout('holes')).not.toMatch(/ni lukenj/);
    expect(document.body.textContent).not.toMatch(/Števec|luknj|večkratnost|asimptota/);
});

test('Reset and an imported Preset restore controls and board objects', () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    const stored = rationalExampleModel('double-pole', 4);
    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-6, 8, 6, -8]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(field('Imenovalec: Ničla 2: položaj x').value).toBe('1');
    expect(graph.glidersNow().denominator[1].X()).toBeCloseTo(1, 9);
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi vrednosti'})); });
    expect(graph.modelNow()).toEqual(DEFAULT_RATIONAL_FUNCTION_MODEL);
    expect(screen.queryByLabelText('Imenovalec: Ničla 2: položaj x')).toBeNull();
    expect(boardObjects(graph)).toBe(baseline);
});

test('StrictMode mounts twice without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedRationalGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Števec: Dodaj ničlo'})); });
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('a multi-action lesson scene runs in one synchronous sequence; a rejected value is refused, not clamped', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'rational-example', value: 'hole'},
        {kind: 'function-parameter', name: 'k', value: -2},
        {kind: 'function-parameter', name: 'rational-denominator-1', value: 3},
        {kind: 'function-parameter', name: 'rational-numerator-2', value: 3},
        {kind: 'function-parameter', name: 'rational-probe', value: 5},
    ] as LessonAction[]) act(() => graph.lesson(action));
    expect(graph.modelNow()).toEqual({k: -2, numerator: [{z: -1, m: 1}, {z: 3, m: 1}], denominator: [{z: 3, m: 1}], probe: 5});
    expect(graph.modelNow().k).toBe(-2);
    expect(readout('holes')).toMatch(/luknja/);

    const before = graph.modelNow();
    expect(() => graph.lesson({kind: 'function-parameter', name: 'k', value: 0} as LessonAction)).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'rational-probe', value: 99} as LessonAction)).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'rational-numerator-1', value: 99} as LessonAction)).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-choice', name: 'rational-example', value: 'quartic'} as LessonAction)).toThrow(DomainError);
    expect(graph.modelNow()).toBe(before);
});

test('the asymptote labels keep off the curve: y = x + 2 above the line where the curve is below it, x = 2 left of the pole', () => {
    const graph = mount();
    graph.liveBoard().unitX = 40;
    graph.liveBoard().unitY = 40;
    vi.spyOn(graph.liveBoard(), 'getBoundingBox').mockReturnValue([-10, 9, 16, -7]);
    const internals = graph as unknown as {asymptoteLabelSpot(): [number, number] | undefined; poleLabelLeft(a: number): boolean; valueAt(x: number): number};
    const [x, y] = internals.asymptoteLabelSpot()!;
    // f(x) = x + 2 + 3/(x - 2) lies above its asymptote right of the pole and below it left of the pole, so the label moves left of x = 2.
    expect(x).toBeLessThan(2 - 12 / 40);
    expect(internals.valueAt(x)).toBeLessThan(x + 2);
    expect(y).toBeGreaterThan(x + 2);
    // f rises to +infinity right of x = 2 and falls left of it, so the label at the top of the view goes left.
    expect(internals.poleLabelLeft(2)).toBe(true);
});

test('the oblique asymptote label stays inside a wide view, where y = x + 2 leaves through the top and bottom edges', () => {
    const graph = mount();
    graph.liveBoard().unitY = 40; // jsdom has no canvas height; 40 px per unit as on a desktop board
    const spot = () => (graph as unknown as {asymptoteLabelSpot(): [number, number] | undefined}).asymptoteLabelSpot();
    for (const box of [[-16, 9, 16, -9], [-11, 9, 11, -9], [-8, 14, 12, -6]] as const) {
        // jsdom gives the board no width, so the view is stubbed rather than set.
        vi.spyOn(graph.liveBoard(), 'getBoundingBox').mockReturnValue([...box]);
        const at = spot();
        expect(at).toBeDefined();
        const [x, y] = at!;
        const [left, top, right, bottom] = box;
        expect(x).toBeGreaterThan(left);
        expect(x).toBeLessThan(right);
        expect(y).toBeGreaterThan(bottom);
        expect(y).toBeLessThan(top);
        expect(Math.abs(y - (x + 2))).toBeLessThan(0.1 * (top - bottom));
    }
    // A view the line misses has no label.
    vi.spyOn(graph.liveBoard(), 'getBoundingBox').mockReturnValue([20, 9, 30, -9]);
    expect(spot()).toBeUndefined();
});
