import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FunctionInverseGraph} from './FunctionInverseGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {DEFAULT_FUNCTION_INVERSE_MODEL} from '../../analysis/functionInverseModel';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));

/** The JSXGraph methods the bundled typings omit. */
interface JsxObject {
    evalVisProp(name: string): unknown;
    triggerEventHandlers(events: string[], args: unknown[]): void;
    elType?: string;
    dataX?: number[];
    dataY?: number[];
}

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedInverseGraph extends FunctionInverseGraph {
    modelNow() {
        return this.model;
    }

    liveBoard() {
        return this.board;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    /** The two markers' coordinates. */
    markers() {
        const p = this['dotP']!;
        const m = this['dotMirror']!;
        return {p: [p.X(), p.Y()], mirror: [m.X(), m.Y()]};
    }

    /** The two-point segments in creation order: the tangent at P, the tangent at P', the connector; undefined when hidden. */
    segments() {
        const curves = (this.liveBoard().objectsList as unknown as JsxObject[]).filter(o => o.elType === 'curve' && o.dataX?.length === 2);
        return curves.map(c => (c as unknown as JsxObject).evalVisProp('visible') === false ? undefined : {x: c.dataX!, y: c.dataY!});
    }

    /** Whether the inverse curve is drawn. */
    inverseCurveVisible() {
        return (this['inverseCurve'] as unknown as JsxObject).evalVisProp('visible') !== false;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const near = (actual: number[] | undefined, expected: number[]) => {
    expect(actual).toBeDefined();
    expected.forEach((value, index) => expect(actual![index]).toBeCloseTo(value, 9));
};
const boardObjects = (graph: ObservedInverseGraph) => graph.liveBoard().objectsList.length;

const mount = () => {
    const graph = new ObservedInverseGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return graph;
};

const VERTICAL_SL = 'tangenta je navpična, naklon ni definiran';

test('a real board shows the default: x^2 on x >= 0, P = (2, 4), P\' = (4, 2), slopes 4 and 1/4, product 1', () => {
    const graph = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_FUNCTION_INVERSE_MODEL);
    expect(readout('hypothesis')).toMatch(/^x ≥ 0/);
    expect(readout('point')).toBe('(2; 4)');
    expect(readout('mirror')).toBe('(4; 2)');
    expect(readout('forward-slope')).toBe('4');
    expect(readout('inverse-slope')).toBe('0,25');
    expect(readout('product')).toBe('1');
    expect(readout('domain')).toBe('x ≥ 0');
    expect(readout('asymptote')).toBeUndefined();
    near(graph.markers().p, [2, 4]);
    near(graph.markers().mirror, [4, 2]);
    expect(graph.inverseCurveVisible()).toBe(true);
    const [tangentP, tangentMirror] = graph.segments();
    // the tangents pass through P and P' with slopes 4 and 1/4
    expect((tangentP!.y[1] - tangentP!.y[0]) / (tangentP!.x[1] - tangentP!.x[0])).toBeCloseTo(4, 9);
    expect((tangentMirror!.y[1] - tangentMirror!.y[0]) / (tangentMirror!.x[1] - tangentMirror!.x[0])).toBeCloseTo(0.25, 9);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('restrictions: 2^x, e^x and the base a = 1 refusal with an actionable message', () => {
    const graph = mount();
    const baseline = boardObjects(graph);

    act(() => { fireEvent.change(screen.getByLabelText('Zožitev z inverzno funkcijo'), {target: {value: 'exp'}}); });
    act(() => { fireEvent.change(field('Točka P: abscisa x₀'), {target: {value: '3'}}); });
    expect(graph.modelNow()).toMatchObject({restriction: 'exp', base: 2, x0: 3});
    expect(readout('point')).toBe('(3; 8)');
    expect(readout('mirror')).toBe('(8; 3)');
    expect(readout('forward-slope')).toBe('5,5452');
    expect(readout('inverse-slope')).toBe('0,1803');
    expect(readout('domain')).toBe('x > 0');
    expect(readout('asymptote')).toMatch(/x = 0.*y = 0/);
    near(graph.markers().mirror, [8, 3]);

    // a = 1 is refused, not clamped: the model, the field and the board stay, and the field explains the rule
    act(() => { fireEvent.change(field('Osnova a'), {target: {value: '1'}}); });
    expect(graph.modelNow().base).toBe(2);
    expect(screen.getByText('Osnova a mora biti med 0,2 in 5 in ne sme biti 1.')).toBeInTheDocument();
    near(graph.markers().p, [3, 8]);
    act(() => { fireEvent.change(field('Osnova a'), {target: {value: '3'}}); });
    expect(graph.modelNow().base).toBe(3);
    expect(readout('point')).toBe('(3; 27)');

    act(() => { fireEvent.change(screen.getByLabelText('Zožitev z inverzno funkcijo'), {target: {value: 'natural'}}); });
    act(() => { fireEvent.change(field('Točka P: abscisa x₀'), {target: {value: '1'}}); });
    expect(screen.queryByLabelText('Osnova a')).toBeNull();
    expect(readout('point')).toBe('(1; 2,7183)');
    expect(readout('forward-slope')).toBe('2,7183');
    expect(readout('inverse-slope')).toBe('0,3679');
    expect(boardObjects(graph)).toBe(baseline);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('at x0 = 0 on x^2 the inverse tangent is vertical: drawn vertical, no slope number, no product', () => {
    const graph = mount();
    act(() => { fireEvent.change(field('Točka P: abscisa x₀'), {target: {value: '0'}}); });
    expect(readout('forward-slope')).toBe('0');
    expect(readout('inverse-slope')).toBe(VERTICAL_SL);
    expect(readout('inverse-slope')).not.toMatch(/\d/);
    expect(readout('product')).toMatch(/^ni definiran/);
    const [tangentP, tangentMirror] = graph.segments();
    expect(tangentP!.y[0]).toBe(tangentP!.y[1]); // the forward tangent is horizontal
    expect(tangentMirror!.x[0]).toBe(tangentMirror!.x[1]); // the mirrored tangent is vertical
    expect(tangentMirror!.y[0]).not.toBe(tangentMirror!.y[1]);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('an x0 outside the restriction is refused (x < 0 on x^2), and dragging P moves it along f on the grid', () => {
    const graph = mount();
    act(() => { fireEvent.change(field('Točka P: abscisa x₀'), {target: {value: '-1'}}); });
    expect(graph.modelNow().x0).toBe(2);
    expect(screen.getByText('Vnesi vrednost med 0 in 4.')).toBeInTheDocument();

    const p = graph['dotP']!;
    act(() => {
        p.moveTo([3.04, 0]);
        (p as unknown as JsxObject).triggerEventHandlers(['drag'], []);
    });
    expect(graph.modelNow().x0).toBeCloseTo(3, 9);
    near(graph.markers().p, [3, 9]);
    near(graph.markers().mirror, [9, 3]);
    expect(readout('mirror')).toBe('(9; 3)');
});

test('the inverse can be hidden (predict, then reveal) and so can the tangents', () => {
    const graph = mount();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Skrij inverzno funkcijo'})); });
    expect(graph.modelNow().inverseVisible).toBe(false);
    expect(graph.inverseCurveVisible()).toBe(false);
    expect(screen.getByRole('button', {name: 'Pokaži inverzno funkcijo'})).toBeInTheDocument();
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Skrij tangenti'})); });
    expect(graph.segments()[0]).toBeUndefined();
    expect(graph.segments()[1]).toBeUndefined();
});

test('Reset, a restored Preset and the language switch restore every field, the controls and the board objects', () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    const stored = {restriction: 'exp', base: 3.5, x0: -1.5, inverseVisible: false, tangentVisible: true};

    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-3, 9, 11, -3]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect((screen.getByLabelText('Zožitev z inverzno funkcijo') as HTMLSelectElement).value).toBe('exp');
    expect(field('Osnova a').value).toBe('3,5');
    expect(field('Točka P: abscisa x₀').value).toBe('−1,5');
    expect(screen.getByRole('button', {name: 'Pokaži inverzno funkcijo'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Skrij tangenti'})).toBeInTheDocument();
    near(graph.markers().p, [-1.5, 3.5 ** -1.5]);
    near(graph.markers().mirror, [3.5 ** -1.5, -1.5]);
    expect(graph.inverseCurveVisible()).toBe(false);
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { setLanguage('en'); });
    expect(screen.getByLabelText('Restriction with its inverse')).toBeInTheDocument();
    expect(field('Base a').value).toBe('3.5');
    expect(field('Point P: abscissa x₀').value).toBe('−1.5');
    expect(screen.getByRole('button', {name: 'Show inverse function'})).toBeInTheDocument();
    expect(readout('point')).toMatch(/^\(−1\.5, 0\.1/);
    expect(readout('hypothesis')).toBe('a > 0 and a ≠ 1');
    expect(readout('asymptote')).toMatch(/vertical asymptote/);

    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Reset values'})); });
    expect(graph.modelNow()).toEqual(DEFAULT_FUNCTION_INVERSE_MODEL);
    expect((screen.getByLabelText('Restriction with its inverse') as HTMLSelectElement).value).toBe('square');
    expect(field('Point P: abscissa x₀').value).toBe('2');
    expect(screen.queryByLabelText('Base a')).toBeNull();
    expect(screen.getByRole('button', {name: 'Hide inverse function'})).toBeInTheDocument();
    expect(readout('point')).toBe('(2, 4)');
    expect(readout('inverse-slope')).toBe('0.25');
    near(graph.markers().p, [2, 4]);
    near(graph.markers().mirror, [4, 2]);
    expect(graph.inverseCurveVisible()).toBe(true);
    expect(boardObjects(graph)).toBe(baseline);

    act(() => { fireEvent.change(field('Point P: abscissa x₀'), {target: {value: '0'}}); });
    expect(readout('inverse-slope')).toBe('the tangent is vertical, the slope is undefined');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('StrictMode mounts, unmounts and mounts again without duplicating board objects, and unmount releases everything', () => {
    const graph = new ObservedInverseGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    const baseline = boardObjects(graph);
    act(() => { fireEvent.change(screen.getByLabelText('Zožitev z inverzno funkcijo'), {target: {value: 'natural'}}); });
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
