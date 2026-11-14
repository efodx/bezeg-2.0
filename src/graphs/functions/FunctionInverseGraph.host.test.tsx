import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {settle} from '../base/realGraphTestHarness';
import {FunctionInverseGraph} from './FunctionInverseGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction} from '../../learning/model';
import {DEFAULT_FUNCTION_INVERSE_MODEL} from '../../analysis/functionInverseModel';
import {installBoardShims} from '../base/realGraphTestHarness';
import {enterNumber} from '../../inputs/testEntry';

beforeAll(installBoardShims);

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

    /** The drawn forward and inverse graphs: the board curves with more than a handful of points, in creation order. */
    sampledCurves() {
        const curves = (this.liveBoard().objectsList as unknown as JsxObject[]).filter(o => o.elType === 'curve' && (o.dataX?.length ?? 0) > 10);
        return curves.map(c => ({x: c.dataX!, y: c.dataY!}));
    }

    /** Whether the inverse curve is drawn. */
    inverseCurveVisible() {
        return (this['inverseCurve'] as unknown as JsxObject).evalVisProp('visible') !== false;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const field = (label: string) => screen.getByLabelText((name: string) => [label, label + ', vrednost', label + ', value'].includes(name), {selector: 'input:not([type="range"])'}) as HTMLInputElement;
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
    act(() => { enterNumber(field('Točka P: abscisa x₀'), '3'); });
    expect(graph.modelNow()).toMatchObject({restriction: 'exp', base: 2, x0: 3});
    expect(readout('point')).toBe('(3; 8)');
    expect(readout('mirror')).toBe('(8; 3)');
    expect(readout('forward-slope')).toBe('5,5452');
    expect(readout('inverse-slope')).toBe('0,1803');
    expect(readout('domain')).toBe('x > 0');
    expect(readout('asymptote')).toMatch(/x = 0.*y = 0/);
    near(graph.markers().mirror, [8, 3]);

    // a = 1 is refused, not clamped: the model, the field and the board stay, and the field explains the rule
    act(() => { enterNumber(field('Osnova a'), '1'); });
    expect(graph.modelNow().base).toBe(2);
    expect(screen.getByText('Osnova a mora biti med 0,2 in 5 in ne sme biti 1.')).toBeInTheDocument();
    near(graph.markers().p, [3, 8]);
    // a = 3 would put P at (3, 27), outside the view: x0 moves to the end of the new range, log_3 8 rounded down to 1.8
    act(() => { enterNumber(field('Osnova a'), '3'); });
    expect(graph.modelNow()).toMatchObject({base: 3, x0: 1.8});
    expect(field('Točka P: abscisa x₀').value).toBe('1,8');
    expect(readout('point')).toBe('(1,8; 7,2247)');

    act(() => { fireEvent.change(screen.getByLabelText('Zožitev z inverzno funkcijo'), {target: {value: 'natural'}}); });
    act(() => { enterNumber(field('Točka P: abscisa x₀'), '1'); });
    expect(screen.queryByLabelText('Osnova a')).toBeNull();
    expect(readout('point')).toBe('(1; 2,7183)');
    expect(readout('forward-slope')).toBe('2,7183');
    expect(readout('inverse-slope')).toBe('0,3679');
    expect(boardObjects(graph)).toBe(baseline);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('at x0 = 0 on x^2 the inverse tangent is vertical: drawn vertical, no slope number, no product', () => {
    const graph = mount();
    act(() => { enterNumber(field('Točka P: abscisa x₀'), '0'); });
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
    act(() => { enterNumber(field('Točka P: abscisa x₀'), '-1'); });
    expect(graph.modelNow().x0).toBe(2);
    expect(screen.getByText('Vnesi vrednost med 0 in 2,8.')).toBeInTheDocument();

    const p = graph['dotP']!;
    const drag = (x: number) => act(() => {
        p.moveTo([x, 0]);
        (p as unknown as JsxObject).triggerEventHandlers(['drag'], []);
    });
    drag(2.54);
    expect(graph.modelNow().x0).toBeCloseTo(2.5, 9);
    near(graph.markers().p, [2.5, 6.25]);
    near(graph.markers().mirror, [6.25, 2.5]);
    expect(readout('mirror')).toBe('(6,25; 2,5)');
    // past the end of the range, P stops at x0 = 2.8 (f = 7.84) instead of leaving the view
    drag(3.6);
    expect(graph.modelNow().x0).toBeCloseTo(2.8, 9);
    near(graph.markers().p, [2.8, 7.84]);
});

test('the drawn graphs follow f and its inverse, and P and P\' stay inside the default view at the ends of every range', () => {
    const graph = mount();
    const [left, top, right, bottom] = graph.liveBoard().getBoundingBox();
    // the board keeps the aspect ratio, so it may widen the default box [-4, 9, 11, -4] but never cuts it
    expect(left).toBeLessThanOrEqual(-4);
    expect(right).toBeGreaterThanOrEqual(11);
    expect(top).toBeGreaterThanOrEqual(9 - 1e-9);
    expect(bottom).toBeLessThanOrEqual(-4 + 1e-9);
    const inView = ([x, y]: number[]) => x > left && x < right && y < top && y > bottom;
    const checkCurves = (forward: (x: number) => number, inverse: (x: number) => number) => {
        const curves = graph.sampledCurves();
        expect(curves).toHaveLength(2);
        for (const [curve, f] of [[curves[0], forward], [curves[1], inverse]] as const) {
            const points = curve.x.map((x, i) => [x, curve.y[i]]).filter(([x]) => !Number.isNaN(x));
            expect(points.length).toBeGreaterThan(100);
            for (const [x, y] of points) expect(y).toBeCloseTo(f(x), 9);
        }
        // the inverse is only defined for x >= 0 (sqrt) or x > 0 (log): no sample left of the y axis
        expect(Math.min(...curves[1].x.filter(x => !Number.isNaN(x)))).toBeGreaterThanOrEqual(0);
    };
    checkCurves(x => x * x, Math.sqrt);

    const restriction = (value: string) => act(() => { fireEvent.change(screen.getByLabelText('Zožitev z inverzno funkcijo'), {target: {value}}); });
    const set = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
    const x0Field = 'Točka P: abscisa x₀';
    set(x0Field, '2,8');
    expect(inView(graph.markers().p) && inView(graph.markers().mirror)).toBe(true);

    restriction('exp');
    for (const [base, ends] of [['5', ['-3', '1,2']], ['0,2', ['-1,2', '3']], ['2', ['-3', '3']]] as const) {
        set('Osnova a', base);
        const a = Number(base.replace(',', '.'));
        checkCurves(x => a ** x, x => Math.log(x) / Math.log(a));
        for (const end of ends) {
            set(x0Field, end);
            expect(graph.modelNow().x0).toBe(Number(end.replace(',', '.')));
            expect(inView(graph.markers().p) && inView(graph.markers().mirror)).toBe(true);
        }
    }
    restriction('natural');
    checkCurves(Math.exp, Math.log);
    for (const end of ['-3', '2']) {
        set(x0Field, end);
        expect(graph.modelNow().x0).toBe(Number(end));
        expect(inView(graph.markers().p) && inView(graph.markers().mirror)).toBe(true);
    }
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

test('Reset, a restored Preset and the language switch restore every field, the controls and the board objects', async () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    const stored = {restriction: 'exp', base: 3.5, x0: -1.5, inverseVisible: false, tangentVisible: true};

    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-4, 9, 11, -4]}}); });
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

    await settle(() => graph.reset()); // the host Reset (the local Reset button was removed)
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

    act(() => { enterNumber(field('Point P: abscissa x₀'), '0'); });
    expect(readout('inverse-slope')).toBe('the tangent is vertical, the slope is undefined');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('a multi-action lesson scene runs in one synchronous sequence; x0 range follows the base; a rejected value is refused, not clamped', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'inverse-restriction', value: 'exp'},
        {kind: 'function-parameter', name: 'inverse-base', value: 5},
        {kind: 'function-parameter', name: 'inverse-x0', value: 1},
        {kind: 'function-visibility', target: 'inverse-curve', visible: false},
        {kind: 'function-visibility', target: 'tangent', visible: false},
    ] as LessonAction[]) act(() => graph.lesson(action));
    expect(graph.modelNow()).toEqual({restriction: 'exp', base: 5, x0: 1, inverseVisible: false, tangentVisible: false});
    expect(graph.modelNow().inverseVisible).toBe(false);
    const before = graph.modelNow();
    expect(() => graph.lesson({kind: 'function-parameter', name: 'inverse-base', value: 1})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'inverse-x0', value: 50})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-choice', name: 'inverse-restriction', value: 'sin'})).toThrow(DomainError);
    expect(graph.modelNow()).toBe(before);
});
