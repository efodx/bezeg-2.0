import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FunctionTransformationGraph} from './FunctionTransformationGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction} from '../../learning/model';
import {DEFAULT_FUNCTION_TRANSFORMATION_MODEL} from '../../analysis/functionTransformationModel';
import {transformRuleText} from './functionTransformationMessages';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

/** The JSXGraph methods the bundled typings omit. */
interface JsxPoint {
    evalVisProp(name: string): unknown;
    triggerEventHandlers(events: string[], args: unknown[]): void;
}

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedTransformationGraph extends FunctionTransformationGraph {
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

    /** The two markers' current coordinates, or undefined when a marker is hidden. */
    markers() {
        const dot = (point?: JXG.Point) => point && (point as unknown as JsxPoint).evalVisProp('visible') !== false ? [point.X(), point.Y()] : undefined;
        return {base: dot(this['baseDot']), image: dot(this['imageDot'])};
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const steps = () => [...document.querySelectorAll('[data-step]')].map(element => element.getAttribute('data-step'));
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const near = (actual: number[] | undefined, expected: number[]) => {
    expect(actual).toBeDefined();
    expected.forEach((value, index) => expect(actual![index]).toBeCloseTo(value, 9));
};
const boardObjects = (graph: ObservedTransformationGraph) => graph.liveBoard().objectsList.length;

const mount = () => {
    const graph = new ObservedTransformationGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return graph;
};

test('a real board shows the default transformation: the rule, the tracked point and its image', () => {
    const graph = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_FUNCTION_TRANSFORMATION_MODEL);
    expect(readout('rule')).toBe('y = −2 f(0,5(x − 3)) + 1');
    expect(readout('base-point')).toBe('(2; 4)');
    expect(readout('image-point')).toBe('(7; −7)');
    expect(steps()).toEqual(['shift-inside', 'scale-inside', 'apply-base', 'scale-outside', 'shift-outside']);
    near(graph.markers().base, [2, 4]);
    near(graph.markers().image, [7, -7]);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('fields move the image, a base change keeps the parameters, b = 0 is refused with an actionable message and b < 0 mirrors', () => {
    const graph = mount();
    const baseline = boardObjects(graph);

    act(() => { fireEvent.change(field('Vodoravni premik c'), {target: {value: '1,5'}}); });
    expect(graph.modelNow()).toMatchObject({c: 1.5});
    expect(readout('image-point')).toBe('(5,5; −7)');
    near(graph.markers().image, [5.5, -7]);

    act(() => { fireEvent.change(screen.getByLabelText('Osnovna funkcija f'), {target: {value: 'cube'}}); });
    expect(graph.modelNow()).toEqual({...DEFAULT_FUNCTION_TRANSFORMATION_MODEL, c: 1.5, base: 'cube'});
    expect(readout('base-point')).toBe('(2; 8)');
    expect(readout('image-point')).toBe('(5,5; −15)');
    near(graph.markers().base, [2, 8]);

    // b = 0 is refused: the model and the board stay, the field explains the rule
    act(() => { fireEvent.change(field('Vodoravna raztegnitev b'), {target: {value: '0'}}); });
    expect(graph.modelNow()).toMatchObject({b: 0.5});
    expect(screen.getByText('Vrednost b ne sme biti 0 in mora biti med −10 in 10.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/must not be 0/);

    // a negative b mirrors about x = c: the image abscissa is c - |u/b|
    act(() => { fireEvent.change(field('Vodoravna raztegnitev b'), {target: {value: '-0,5'}}); });
    expect(graph.modelNow()).toMatchObject({b: -0.5});
    expect(readout('image-point')).toBe('(−2,5; −15)');
    expect(steps()).toContain('scale-inside');
    expect(document.querySelector('[data-step="scale-inside"]')?.textContent).toMatch(/zrcali čez premico x = c/);

    // a point outside the base domain withdraws the markers instead of showing NaN
    act(() => { fireEvent.change(screen.getByLabelText('Osnovna funkcija f'), {target: {value: 'sqrt'}}); });
    act(() => { fireEvent.change(field('Označena točka u'), {target: {value: '-1'}}); });
    expect(graph.modelNow()).toMatchObject({base: 'sqrt', u: -1});
    expect(readout('image-point')).toMatch(/ni definirana/);
    expect(graph.markers()).toEqual({base: undefined, image: undefined});
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
    expect(boardObjects(graph)).toBe(baseline);
});

test('dragging the image marker sets u on the grid and the base marker follows', () => {
    const graph = mount();
    const image = graph['imageDot']!;
    act(() => {
        image.moveTo([9.03, 0]);
        (image as unknown as JsxPoint).triggerEventHandlers(['drag'], []);
    });
    // u = b (x - c) = 0.5 * 6.03 = 3.015 -> 3.0 on the 0.1 grid
    expect(graph.modelNow().u).toBeCloseTo(3, 9);
    near(graph.markers().base, [3, 9]);
    near(graph.markers().image, [9, -2 * 9 + 1]);
    expect(readout('base-point')).toBe('(3; 9)');
});

test('Reset, a restored Preset and the ghost toggle restore every field, the controls and the board objects', () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    const stored = {base: 'abs', a: 1.5, b: -2, c: -3, d: 4, ghostVisible: false, u: 1.2};

    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-8, 8, 12, -10]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect((screen.getByLabelText('Osnovna funkcija f') as HTMLSelectElement).value).toBe('abs');
    expect(field('Navpična raztegnitev a').value).toBe('1,5');
    expect(field('Vodoravna raztegnitev b').value).toBe('−2');
    expect(field('Vodoravni premik c').value).toBe('−3');
    expect(field('Navpični premik d').value).toBe('4');
    expect(field('Označena točka u').value).toBe('1,2');
    expect(screen.getByRole('button', {name: 'Pokaži osnovni graf'})).toBeInTheDocument();
    expect(readout('rule')).toBe('y = 1,5 f(−2(x + 3)) + 4');
    expect(graph.markers().base).toBeUndefined(); // the ghost is hidden, so is its marker
    near(graph.markers().image, [1.2 / -2 - 3, 1.5 * 1.2 + 4]);
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Pokaži osnovni graf'})); });
    expect(graph.modelNow().ghostVisible).toBe(true);
    near(graph.markers().base, [1.2, 1.2]);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Ponastavi vrednosti'})); });
    expect(graph.modelNow()).toEqual(DEFAULT_FUNCTION_TRANSFORMATION_MODEL);
    expect((screen.getByLabelText('Osnovna funkcija f') as HTMLSelectElement).value).toBe('square');
    expect(field('Navpična raztegnitev a').value).toBe('−2');
    expect(field('Vodoravna raztegnitev b').value).toBe('0,5');
    expect(field('Vodoravni premik c').value).toBe('3');
    expect(field('Navpični premik d').value).toBe('1');
    expect(field('Označena točka u').value).toBe('2');
    expect(screen.getByRole('button', {name: 'Skrij osnovni graf'})).toBeInTheDocument();
    near(graph.markers().base, [2, 4]);
    near(graph.markers().image, [7, -7]);
    expect(boardObjects(graph)).toBe(baseline);
});

test('both languages: labels, steps and number format follow a live language switch', () => {
    const graph = mount();
    act(() => { fireEvent.change(field('Vodoravna raztegnitev b'), {target: {value: '-0,5'}}); });
    expect(graph.modelNow().b).toBe(-0.5);
    expect(readout('rule')).toBe('y = −2 f(−0,5(x − 3)) + 1');
    act(() => { setLanguage('en'); });
    expect(screen.getByLabelText('Horizontal shift c')).toBeInTheDocument();
    expect(screen.getByLabelText('Base function f')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Hide base graph'})).toBeInTheDocument();
    expect(readout('rule')).toBe('y = −2 f(−0.5(x − 3)) + 1');
    expect(readout('image-point')).toBe('(−1, −7)');
    expect(document.querySelector('[data-step="scale-inside"]')?.textContent)
        .toBe('stretch inside: multiply by b = −0.5; because b is negative, the graph is mirrored about the line x = c');
    expect(transformRuleText({a: 1, b: 1, c: 0, d: 0}, 'en')).toBe('y = f(x)');
    expect(transformRuleText({a: -1, b: -1, c: -2, d: -0.5}, 'sl')).toBe('y = −f(−(x + 2)) − 0,5');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedTransformationGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.change(screen.getByLabelText('Osnovna funkcija f'), {target: {value: 'ln'}}); });
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});

test('a multi-action lesson scene runs in one synchronous sequence; a rejected value is refused, not clamped', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'transform-base', value: 'cube'},
        {kind: 'function-parameter', name: 'transform-a', value: 3},
        {kind: 'function-parameter', name: 'transform-b', value: -1},
        {kind: 'function-parameter', name: 'transform-c', value: -2},
        {kind: 'function-parameter', name: 'transform-d', value: 0.5},
        {kind: 'function-parameter', name: 'transform-u', value: 1},
        {kind: 'function-visibility', target: 'reference', visible: false},
    ] as LessonAction[]) act(() => graph.lesson(action));
    expect(graph.modelNow()).toEqual({base: 'cube', a: 3, b: -1, c: -2, d: 0.5, ghostVisible: false, u: 1});
    expect(graph.modelNow().ghostVisible).toBe(false);
    const before = graph.modelNow();
    expect(() => graph.lesson({kind: 'function-parameter', name: 'transform-b', value: 0})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'transform-a', value: 11})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-choice', name: 'transform-base', value: 'tan'})).toThrow(DomainError);
    expect(graph.modelNow()).toBe(before);
});
