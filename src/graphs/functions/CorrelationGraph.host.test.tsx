import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CorrelationGraph} from './CorrelationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {
    CORRELATION_EXAMPLES, CORRELATION_POINTS_MAX, DEFAULT_CORRELATION_MODEL, fitCorrelationView,
} from '../../analysis/correlationModel';
import {functionPresetCollections} from './functionPresetCollections';
import {DomainError} from './BaseFunctionGraph';
import {GraphPalette} from '../styles/GraphPalette';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

type BoardObject = {
    elType?: string; dataX?: number[]; dataY?: number[]; visPropCalc?: { visible?: boolean };
    visProp?: { strokecolor?: string; dash?: number }; X(): number; Y(): number; moveTo(to: number[]): void;
    triggerEventHandlers(names: string[], args: unknown[]): void;
};

class ObservedCorrelationGraph extends CorrelationGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    objects() { return this.board.objectsList as unknown as BoardObject[]; }
    handles() { return this.pointObjects as unknown as BoardObject[]; }
    visibleHandles() { return this.handles().filter(point => point.visPropCalc?.visible === true); }
    private curves(color: string) {
        return this.objects().filter(o => o.elType === 'curve' && o.visProp?.strokecolor?.toLowerCase() === color.toLowerCase());
    }
    private shown(color: string, dash: number | undefined) {
        return this.curves(color).filter(o => o.visPropCalc?.visible === true && (dash === undefined || Number(o.visProp?.dash) === dash));
    }
    /** The dashed residual curve when it exists and is shown. */
    residualCurves() { return this.shown(GraphPalette.warningText, 2); }
    /** The solid y-on-x line (two data points). */
    yOnXCurves() { return this.shown(GraphPalette.primaryCurve, 0); }
    /** The dashed x-on-y line in the comparison colour. */
    xOnYCurves() { return this.shown(GraphPalette.comparisonCurve, 3); }
    addRaw() { this.addPoint(); }
    drag(index: number, x: number, y: number) {
        const handle = this.handles()[index];
        act(() => { handle.moveTo([x, y]); handle.triggerEventHandlers(['drag'], []); });
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const status = (id: string) => document.querySelector(`[data-prob-correlation-status="${id}"]`)?.textContent;
const field = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const typeIn = (label: RegExp, value: number) => act(() => {
    fireEvent.change(field(label), {target: {value: String(value)}});
    fireEvent.keyDown(field(label), {key: 'Enter'});
});
const select = (label: RegExp, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label) as HTMLSelectElement, {target: {value}}); });
const residualSwitch = () => screen.getByLabelText(/^Pokaži ostanke/) as HTMLInputElement;
const xOnYSwitch = () => screen.getByLabelText(/^Pokaži še premico za x/) as HTMLInputElement;
const plusButton = () => act(() => { fireEvent.click(screen.getByRole('button', {name: /^Povečaj število$|^Increase/})); });
const minusButton = () => act(() => { fireEvent.click(screen.getByRole('button', {name: /^Zmanjšaj število$|^Decrease/})); });
const mount = () => {
    const graph = new ObservedCorrelationGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, ...view};
};
const handlePoints = (graph: ObservedCorrelationGraph) => graph.visibleHandles().map(h => [h.X(), h.Y()]);
const box = (graph: ObservedCorrelationGraph) => graph.liveBoard().getBoundingBox();
/** Types every coordinate of point `i` (1-based), x then y. */
const typePoint = (i: number, x: number, y: number) => {
    typeIn(new RegExp(`^Točka ${i}, x$`), x);
    typeIn(new RegExp(`^Točka ${i}, y$`), y);
};

describe('defaults and examples', () => {
    test('defaults: r 0,92338, r² 0,852632, line y = 0,9x + 0,9, SSres 0,7, slope identity 0,9, no x-on-y row', () => {
        const {graph} = mount();
        expect(graph.modelNow()).toEqual(DEFAULT_CORRELATION_MODEL);
        expect(readout('n')).toBe('4');
        expect(readout('r')).toBe('0,92338');
        expect(readout('r2')).toBe('0,852632');
        expect(readout('slope')).toBe('0,9');
        expect(readout('intercept')).toBe('0,9');
        expect(readout('equation')).toBe('y = 0,9x + 0,9');
        expect(readout('ssres')).toBe('0,7');
        expect(readout('identity')).toBe('0,9');
        expect(readoutLabel('identity')).toMatch(/r · s_y \/ s_x/);
        expect(readout('xony')).toBeUndefined();
        expect(status('too-few')).toBeUndefined();
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    test('board: four points, residual segments, the y-on-x line across the view, no x-on-y line, the caption names r', () => {
        const {graph} = mount();
        expect(handlePoints(graph)).toEqual([[0, 1], [1, 2], [2, 2], [3, 4]]);
        expect(graph.residualCurves()).toHaveLength(1);
        expect(graph.residualCurves()[0].dataX!.filter(x => !Number.isNaN(x))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
        // residuals of y = 0,9x + 0,9: 0,1; 0,2; -0,7... the segment ends lie on the line
        const ends = graph.residualCurves()[0].dataY!.filter(y => !Number.isNaN(y));
        [0.9, 1.8, 2.7, 3.6].forEach((line, i) => expect(ends[2 * i + 1]).toBeCloseTo(line, 9));
        expect(graph.yOnXCurves()).toHaveLength(1);
        const [left, , right] = box(graph);
        const l = graph.yOnXCurves()[0];
        expect(l.dataX).toEqual([left, right]);
        expect(l.dataY![0]).toBeCloseTo(0.9 * left + 0.9, 9);
        expect(l.dataY![1]).toBeCloseTo(0.9 * right + 0.9, 9);
        expect(graph.xOnYCurves()).toHaveLength(0);
        expect(graph.captionPlainLines().join('\n')).toMatch(/Razsevni diagram, točk: 4/);
        expect(graph.captionPlainLines().join('\n')).toMatch(/Korelacijski koeficient r = 0,92338/);
    });

    test('the outlier example: r 0,8468, line y = 2,1x + 0,1, SSres 8,7, the view refitted', () => {
        const {graph} = mount();
        select(/^Primer$/, 'outlier');
        expect(graph.modelNow().points).toEqual(CORRELATION_EXAMPLES['outlier']);
        expect(readout('r')).toBe('0,8468');
        expect(readout('equation')).toBe('y = 2,1x + 0,1');
        expect(readout('ssres')).toBe('8,7');
        expect(box(graph)[1]).toBeCloseTo(fitCorrelationView(CORRELATION_EXAMPLES['outlier'])[1], 6);
    });

    test('the parabola shows r exactly 0 with a horizontal line y = 4; the right half has r 0,95831; the ring has r exactly 0', () => {
        const {graph} = mount();
        select(/^Primer$/, 'parabola');
        expect(readout('r')).toBe('0');
        expect(readout('r2')).toBe('0');
        expect(readout('slope')).toBe('0');
        expect(readout('equation')).toBe('y = 4');
        expect(readout('identity')).toBe('0');
        expect(status('too-few')).toBeUndefined();
        graph.yOnXCurves()[0].dataY!.forEach(y => expect(y).toBeCloseTo(4, 9));
        select(/^Primer$/, 'parabola-right');
        expect(readout('r')).toBe('0,95831');
        select(/^Primer$/, 'ring');
        expect(graph.visibleHandles()).toHaveLength(8);
        expect(readout('r')).toBe('0');
        expect(readout('equation')).toBe('y = 0');
        expect(graph.captionPlainLines().join('\n')).toMatch(/r = 0$/m);
    });
});

describe('statuses', () => {
    test('two points: r is disabled with the too-few message, the line stays', () => {
        const {graph} = mount();
        minusButton();
        expect(graph.visibleHandles()).toHaveLength(3);
        expect(readout('r')).toBe('0,86603');
        minusButton();
        expect(graph.visibleHandles()).toHaveLength(2);
        expect(readout('r')).toBe('—');
        expect(readout('r2')).toBe('—');
        expect(readout('identity')).toBe('—');
        expect(status('too-few')).toMatch(/vsaj 3 točke/);
        expect(graph.captionPlainLines().join('\n')).toMatch(/r ni določen/);
        expect(readout('slope')).not.toBe('—');
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    test('equal x: r undefined, no y-on-x line; equal y: r undefined, a horizontal line and no x-on-y line; both: no lines', () => {
        const {graph} = mount();
        act(() => { fireEvent.click(xOnYSwitch()); });
        typePoint(1, 2, 1); typePoint(2, 2, 2); typePoint(3, 2, 2);
        typePoint(4, 2, 4);
        expect(graph.modelNow().points.every(p => p[0] === 2)).toBe(true);
        expect(readout('r')).toBe('—');
        expect(readout('equation')).toBe('—');
        expect(readout('slope')).toBe('—');
        expect(status('zero-variance-x')).toMatch(/isti x/);
        expect(graph.yOnXCurves()).toHaveLength(0);
        expect(graph.residualCurves()).toHaveLength(0);
        expect(readout('xony')).toBe('x = 2');
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

        typePoint(1, 0, 3); typePoint(2, 1, 3); typePoint(3, 2, 3); typePoint(4, 3, 3);
        expect(readout('r')).toBe('—');
        expect(status('zero-variance-y')).toMatch(/isti y/);
        expect(status('zero-variance-x')).toBeUndefined();
        expect(readout('equation')).toBe('y = 3');
        expect(readout('xony')).toBe('—');
        expect(graph.yOnXCurves()).toHaveLength(1);
        expect(graph.xOnYCurves()).toHaveLength(0);

        typePoint(1, 1, 3); typePoint(2, 1, 3); typePoint(3, 1, 3); typePoint(4, 1, 3);
        expect(status('zero-variance-both')).toBeDefined();
        expect(readout('equation')).toBe('—');
        expect(graph.yOnXCurves()).toHaveLength(0);
        expect(graph.xOnYCurves()).toHaveLength(0);
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });
});

describe('toggles', () => {
    test('the residual switch hides and shows the segments', () => {
        const {graph} = mount();
        expect(residualSwitch().checked).toBe(true);
        act(() => { fireEvent.click(residualSwitch()); });
        expect(graph.modelNow().residuals).toBe(false);
        expect(graph.residualCurves()).toHaveLength(0);
        act(() => { fireEvent.click(residualSwitch()); });
        expect(graph.residualCurves()).toHaveLength(1);
    });

    test('the x-on-y switch adds a dashed line x = 0,94737y − 0,63158 across the view and a readout; the product of the slopes is r²', () => {
        const {graph} = mount();
        expect(xOnYSwitch().checked).toBe(false);
        act(() => { fireEvent.click(xOnYSwitch()); });
        expect(graph.modelNow().xOnY).toBe(true);
        expect(readout('xony')).toBe('x = 0,94737y − 0,63158');
        expect(graph.xOnYCurves()).toHaveLength(1);
        const [, top, , bottom] = box(graph);
        const l = graph.xOnYCurves()[0];
        expect(l.dataY![0]).toBeCloseTo(bottom, 9);
        expect(l.dataY![1]).toBeCloseTo(top, 9);
        expect(l.dataX![0]).toBeCloseTo(18 / 19 * bottom - 12 / 19, 9);
        expect(l.dataX![1]).toBeCloseTo(18 / 19 * top - 12 / 19, 9);
        // the two lines are distinct objects in distinct styles
        expect(graph.yOnXCurves()).toHaveLength(1);
        expect(graph.yOnXCurves()[0]).not.toBe(l);
        act(() => { fireEvent.click(xOnYSwitch()); });
        expect(graph.xOnYCurves()).toHaveLength(0);
        expect(readout('xony')).toBeUndefined();
    });
});

describe('editing', () => {
    test('a drag snaps to tenths, updates r and the line, and does not refit the view', () => {
        const {graph} = mount();
        const before = box(graph);
        graph.drag(3, 3.04, 7.96);
        expect(graph.modelNow().points[3]).toEqual([3, 8]);
        expect(readout('r')).toBe('0,8468');
        expect(graph.visibleHandles()[3].Y()).toBe(8);
        graph.drag(3, 10.04, 3.26);
        expect(graph.modelNow().points[3]).toEqual([10, 3.3]);
        expect(graph.visibleHandles()[3].X()).toBe(10);
        // x = 10 lies outside the view [-1,5 .. 4,5], and a drag never refits
        expect(box(graph)).toEqual(before);
        expect(status('refused')).toBeUndefined();
    });

    test('a refused drag (beyond +-20) returns the point and shows a notice, cleared by the next accepted edit', () => {
        const {graph} = mount();
        const model = graph.modelNow();
        graph.drag(1, 99, 2);
        expect(graph.modelNow()).toBe(model);
        expect(graph.visibleHandles()[1].X()).toBe(1);
        expect(status('refused')).toMatch(/od −20 do 20/);
        expect(readout('r')).toBe('0,92338');
        graph.drag(1, 1.5, 2);
        expect(status('refused')).toBeUndefined();
        expect(graph.modelNow().points[1]).toEqual([1.5, 2]);
    });

    test('typed edits and Add refit the view only when a point leaves it', () => {
        const {graph} = mount();
        const before = box(graph);
        typeIn(/^Točka 4, y$/, 4.5);
        expect(box(graph)).toEqual(before);
        expect(readout('n')).toBe('4');
        typeIn(/^Točka 4, y$/, 15);
        expect(box(graph)[1]).toBeCloseTo(fitCorrelationView(graph.modelNow().points)[1], 6);
        expect(box(graph)[1]).toBeGreaterThan(before[1]);
        // Add: the new point (4, y) is inside the view, then (5, y) is not
        select(/^Primer$/, 'default');
        const view = box(graph);
        plusButton();
        expect(graph.modelNow().points[4]).toEqual([4, 4]);
        expect(box(graph)).toEqual(view);
        plusButton();
        expect(graph.modelNow().points[5]).toEqual([5, 4]);
        expect(box(graph)[2]).toBeCloseTo(fitCorrelationView(graph.modelNow().points)[2], 6);
        expect(box(graph)[2]).toBeGreaterThan(view[2]);
    });

    test('the point list is limited to 2..20 points: the button is disabled at 20, a direct Add is refused, a typed value beyond the limit is refused', () => {
        const {graph} = mount();
        for (let i = 0; i < CORRELATION_POINTS_MAX - 4; i++) plusButton();
        expect(graph.modelNow().points).toHaveLength(CORRELATION_POINTS_MAX);
        expect(screen.getByRole('button', {name: 'Povečaj število'})).toBeDisabled();
        expect(() => graph.addRaw()).toThrow(DomainError);
        expect(graph.modelNow().points).toHaveLength(CORRELATION_POINTS_MAX);
        expect(graph.visibleHandles()).toHaveLength(CORRELATION_POINTS_MAX);
        const before = graph.modelNow();
        typeIn(/^Točka 1, x$/, 21);
        expect(graph.modelNow()).toBe(before);
    });
});

describe('Reset and Presets', () => {
    test('Reset restores the points, the switches, the fields, the view and the board objects', async () => {
        const {graph} = mount();
        const baseline = graph.ownedObjects();
        select(/^Primer$/, 'ring');
        act(() => { fireEvent.click(residualSwitch()); });
        act(() => { fireEvent.click(xOnYSwitch()); });
        graph.drag(0, 99, 0);
        await settle(() => graph.reset());
        expect(graph.modelNow()).toEqual(DEFAULT_CORRELATION_MODEL);
        expect(handlePoints(graph)).toEqual([[0, 1], [1, 2], [2, 2], [3, 4]]);
        expect(readout('r')).toBe('0,92338');
        expect(field(/^Točka 1, x$/).value).toBe('0');
        expect(residualSwitch().checked).toBe(true);
        expect(xOnYSwitch().checked).toBe(false);
        expect(status('refused')).toBeUndefined();
        expect(graph.residualCurves()).toHaveLength(1);
        expect(graph.xOnYCurves()).toHaveLength(0);
        expect(box(graph)[0]).toBeCloseTo(fitCorrelationView(DEFAULT_CORRELATION_MODEL.points)[0], 6);
        expect(box(graph)[2]).toBeCloseTo(fitCorrelationView(DEFAULT_CORRELATION_MODEL.points)[2], 6);
        expect(graph.ownedObjects()).toBe(baseline);
    });

    const fileWith = (data: object) => JSON.stringify({'preset-prob-correlation': {data: [{id: 'Primer', data}]}});

    test('round trip: save, change, restore gives back points, flags, readouts, board and view; the file form is imported', () => {
        const {graph} = mount();
        select(/^Primer$/, 'outlier');
        act(() => { fireEvent.click(residualSwitch()); });
        act(() => { fireEvent.click(xOnYSwitch()); });
        const saved = graph.modelNow();
        expect(saved).toEqual({points: CORRELATION_EXAMPLES['outlier'], residuals: false, xOnY: true});
        const exported = graph.exportPreset();
        const checkGraphState = functionPresetCollections['prob-correlation'].checkGraphState!;
        expect(checkGraphState(exported.graphState)).toBeUndefined();
        expect(checkGraphState({...exported.graphState, points: [[0, 0]]})).toBeDefined();
        const ids = ['n', 'r', 'r2', 'slope', 'intercept', 'equation', 'ssres', 'identity', 'xony'];
        const shown = ids.map(readout);
        select(/^Primer$/, 'ring');
        act(() => { fireEvent.click(residualSwitch()); });
        act(() => { fireEvent.click(xOnYSwitch()); });
        graph.liveBoard().setBoundingBox([-1, 4, 5, -2], false);
        expect(graph.modelNow()).not.toEqual(saved);
        act(() => { graph.importPreset({...exported, id: 'stored'}); });
        expect(graph.modelNow()).toEqual(saved);
        expect(ids.map(readout)).toEqual(shown);
        expect(handlePoints(graph)).toEqual([[0, 1], [1, 2], [2, 2], [3, 8]]);
        expect(graph.residualCurves()).toHaveLength(0);
        expect(graph.xOnYCurves()).toHaveLength(1);
        expect(residualSwitch().checked).toBe(false);
        expect(xOnYSwitch().checked).toBe(true);
        expect(box(graph)[1]).toBeCloseTo(fitCorrelationView(CORRELATION_EXAMPLES['outlier'])[1], 6);
        commitPresetImport(preflightPresetImport(fileWith(exported.data as object)));
        expect(JSON.parse(localStorage.getItem('preset-prob-correlation')!).data[0].data).toEqual(saved);
    });

    const ok = {points: [[0, 0], [1, 1], [2, 1]], residuals: true, xOnY: false};
    test.each([
        ['one point', {...ok, points: [[0, 0]]}, /od 2 do 20 točk/],
        ['21 points', {...ok, points: Array.from({length: 21}, (_, i) => [i, i])}, /od 2 do 20 točk/],
        ['a coordinate above 20', {...ok, points: [[0, 0], [21, 1]]}, /točka 2 mora biti par števil od −20 do 20/],
        ['a coordinate off the tenth grid', {...ok, points: [[0, 0], [1.55, 1]]}, /točke 2 morajo biti na desetinko natančne/],
        ['a missing flag', {points: ok.points, xOnY: false}, /residuals.*true ali false/],
    ])('an out-of-domain file (%s) is rejected with an actionable message and nothing is written', (_name, data, expected) => {
        expect(() => preflightPresetImport(fileWith(data))).toThrow(LocalizedError);
        expect(() => preflightPresetImport(fileWith(data))).toThrow(expected);
        expect(() => preflightPresetImport(fileWith(data))).not.toThrow(/neveljavni podatki funkcije|invalid function data/);
        expect(localStorage.length).toBe(0);
    });
});

test('switching the language keeps the model and re-renders labels, numbers with points, the status and the board', () => {
    const {graph} = mount();
    select(/^Primer$/, 'outlier');
    act(() => { fireEvent.click(xOnYSwitch()); });
    const model = graph.modelNow();
    act(() => { setLanguage('en'); });
    expect(graph.modelNow()).toEqual(model);
    expect(readout('r')).toBe('0.8468');
    expect(readout('equation')).toBe('y = 2.1x + 0.1');
    expect(readoutLabel('r')).toBe('Correlation coefficient r');
    expect(screen.getByLabelText(/^Also show the line of x on y/)).toBeChecked();
    expect(graph.captionPlainLines().join('\n')).toMatch(/Scatter plot, points: 4/);
    expect(graph.xOnYCurves()).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    minusButton();
    minusButton();
    expect(status('too-few')).toMatch(/needs at least 3 points/);
    graph.drag(0, 99, 0);
    expect(status('refused')).toMatch(/from −20 to 20/);
});
