import React from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {LeastSquaresGraph} from './LeastSquaresGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {GraphPalette} from '../styles/GraphPalette';
import {DEFAULT_LEAST_SQUARES_MODEL} from '../../analysis/leastSquaresModel';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

type BoardObject = {
    elType?: string; dataX?: number[]; dataY?: number[]; visPropCalc?: { visible?: boolean };
    visProp?: { strokecolor?: string }; X(): number; Y(x?: number): number; moveTo(to: number[]): void; triggerEventHandlers(names: string[], args: unknown[]): void;
};

class ObservedLeastSquaresGraph extends LeastSquaresGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    objects() { return this.board.objectsList as unknown as BoardObject[]; }
    handles() { return this.pointObjects as unknown as BoardObject[]; }
    visibleHandles() { return this.handles().filter(point => point.visPropCalc?.visible === true); }
    /** The drawn curves y = p(x) that are visible. */
    visibleFunctionGraphs() {
        return this.objects().filter(object => object.elType === 'curve' && object.visPropCalc?.visible === true
            && ([GraphPalette.primaryCurve, GraphPalette.comparisonCurve] as string[]).includes(object.visProp?.strokecolor ?? ''));
    }
    /** The closed 5-point outlines of the residual squares, as drawn at the last update. */
    squares() { return this.objects().filter(object => object.elType === 'curve' && object.dataX?.length === 5); }
    drag(index: number, x: number, y: number) {
        const handle = this.handles()[index];
        act(() => { handle.moveTo([x, y]); handle.triggerEventHandlers(['drag'], []); });
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const list = (index: number, axis: 'x' | 'y') => screen.getByLabelText(new RegExp(`^(Točka|Point) ${index}, ${axis}$`)) as HTMLInputElement;
const squaresSwitch = () => screen.getByLabelText(/^Pokaži kvadrate ostankov$|^Show the squares of the residuals$/) as HTMLInputElement;
const manualSwitch = () => screen.getByLabelText(/^Ročna premica$|^Manual line$/) as HTMLInputElement;
const normalSwitch = () => screen.getByLabelText(/^Pokaži normalni sistem$|^Show the normal equations$/) as HTMLInputElement;
const degreeGroup = () => screen.getByRole('group', {name: /^Stopnja polinoma$|^Polynomial degree$/});
const countGroup = () => screen.getByRole('group', {name: /^Število podatkovnih točk$|^Number of data points$/});
const degreeField = () => within(degreeGroup()).getByRole('spinbutton') as HTMLInputElement;
const mount = () => {
    const graph = new ObservedLeastSquaresGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, ...view};
};
const setDegree = (value: number) => act(() => {
    fireEvent.change(degreeField(), {target: {value: String(value)}});
    fireEvent.keyDown(degreeField(), {key: 'Enter'});
});
const typeCoordinate = (index: number, axis: 'x' | 'y', value: number) => act(() => {
    fireEvent.change(list(index, axis), {target: {value: String(value)}});
    fireEvent.keyDown(list(index, axis), {key: 'Enter'});
});
const setLine = (label: RegExp, value: number) => act(() => { fireEvent.change(screen.getByLabelText(label, {selector: 'input[type="range"]'}), {target: {value: String(value)}}); });

test('defaults: four points, degree 1, fit mode; the readouts give the line y = 0,9x + 0,9, the residuals and the sum 0,7', () => {
    const {graph} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_LEAST_SQUARES_MODEL);
    expect(graph.visibleHandles()).toHaveLength(4);
    expect(graph.visibleFunctionGraphs()).toHaveLength(1);
    expect(readout('equation')).toBe('y = 0,9x + 0,9');
    expect(readout('residuals')).toBe('0,1; 0,2; −0,7; 0,4');
    expect(readout('sum')).toBe('0,7');
    expect(readout('points')).toBe('4');
    expect(list(4, 'y').value).toBe('4');
    // the drawn curve is the fitted line
    const curve = graph.visibleFunctionGraphs()[0];
    expect(curve.Y(2)).toBeCloseTo(2.7, 12);
    expect(graph.captionPlainLines().join('\n')).toMatch(/Vsota kvadratov ostankov: 0,7/);
});

test('degree 2 and 3 reproduce the spec equations and sums; English uses the decimal point', () => {
    const {graph} = mount();
    setDegree(2);
    expect(readout('equation')).toBe('y = 1,15 + 0,15x + 0,25x²');
    expect(readout('sum')).toBe('0,45');
    expect(graph.visibleFunctionGraphs()[0].Y(2)).toBeCloseTo(1.15 + 0.3 + 1, 12);
    setDegree(3);
    expect(readout('equation')).toBe('y = 1 + 2,5x − 2x² + 0,5x³');
    expect(readout('sum')).toBe('≈ 0');
    expect(readout('residuals')).toBe('≈ 0; ≈ 0; ≈ 0; ≈ 0');
    act(() => { setLanguage('en'); });
    expect(readout('equation')).toBe('y = 1 + 2.5x − 2x² + 0.5x³');
    setDegree(1);
    expect(readout('equation')).toBe('y = 0.9x + 0.9');
    expect(readout('sum')).toBe('0.7');
});

test('dragging (3,4) to (3,8) updates the model, the typed list, the curve and the sum: y = 2,1x + 0,1, 8,7', () => {
    const {graph} = mount();
    graph.drag(3, 3, 8);
    expect(graph.modelNow().points[3]).toEqual([3, 8]);
    expect(list(4, 'y').value).toBe('8');
    expect(readout('equation')).toBe('y = 2,1x + 0,1');
    expect(readout('sum')).toBe('8,7');
    expect(graph.visibleFunctionGraphs()[0].Y(1)).toBeCloseTo(2.2, 12);
    // a drag snaps to the 0.1 grid and is limited to the coordinate range
    graph.drag(0, 0.04, 99);
    expect(graph.modelNow().points[0]).toEqual([0, 20]);
    expect(graph.handles()[0].Y()).toBe(20);
});

test('the typed list moves the board point; an out-of-range coordinate is refused and nothing changes', () => {
    const {graph} = mount();
    typeCoordinate(2, 'y', 3);
    expect(graph.modelNow().points[1]).toEqual([1, 3]);
    expect(graph.handles()[1].Y()).toBe(3);
    const before = graph.modelNow();
    typeCoordinate(2, 'y', 25);
    expect(graph.modelNow()).toBe(before);
    expect(graph.handles()[1].Y()).toBe(3);
});

test('the degree is limited to min(points - 1, 5) and removing points clamps it', () => {
    const {graph} = mount();
    const plus = () => within(countGroup()).getByRole('button', {name: 'Povečaj število'});
    const minus = () => within(countGroup()).getByRole('button', {name: 'Zmanjšaj število'});
    setDegree(3);
    setDegree(4);
    expect(graph.modelNow().degree).toBe(3);
    expect(within(degreeGroup()).getByRole('button', {name: 'Povečaj število'})).toBeDisabled();
    act(() => { fireEvent.click(minus()); });
    expect(graph.modelNow()).toMatchObject({degree: 2});
    expect(graph.modelNow().points).toHaveLength(3);
    expect(graph.visibleHandles()).toHaveLength(3);
    expect(readout('degree')).toBe('2');
    act(() => { fireEvent.click(minus()); });
    expect(graph.modelNow()).toMatchObject({degree: 1});
    expect(minus()).toBeDisabled();
    expect(graph.modelNow().points).toHaveLength(2);
    expect(readout('sum')).toBe('0');
    for (let i = 0; i < 10; i++) act(() => { fireEvent.click(plus()); });
    expect(graph.modelNow().points).toHaveLength(12);
    expect(plus()).toBeDisabled();
    expect(graph.visibleHandles()).toHaveLength(12);
    setDegree(5);
    expect(graph.modelNow().degree).toBe(5);
    setDegree(6);
    expect(graph.modelNow().degree).toBe(5);
    expect(() => (graph as unknown as { setDegree(v: unknown): void }).setDegree(6)).toThrow(DomainError);
});

test('vertical data show a localized reason instead of a curve; the board and the controls recover when a point moves', () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    for (const index of [1, 2, 3, 4]) typeCoordinate(index, 'x', 2);
    expect(graph.visibleFunctionGraphs()).toHaveLength(0);
    expect(readout('equation')).toBe('ni določeno');
    expect(readout('sum')).toBe('ni določeno');
    expect(document.querySelector('[data-lsq="reason"]')?.textContent).toMatch(/Ni krivulje: vse točke imajo isti x/);
    expect(graph.captionPlainLines().join('\n')).toMatch(/Ni krivulje: vse točke imajo isti x/);
    expect(graph.squares().filter(square => square.visPropCalc?.visible)).toHaveLength(0);
    act(() => { setLanguage('en'); });
    expect(document.querySelector('[data-lsq="reason"]')?.textContent).toMatch(/No curve: all points have the same x/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    typeCoordinate(1, 'x', 0);
    expect(graph.visibleFunctionGraphs()).toHaveLength(1);
    expect(document.querySelector('[data-lsq="reason"]')).toBeNull();
    expect(graph.ownedObjects()).toBe(baseline);
});

test('the squares are true squares on screen although the axes have unequal units, and follow a zoom', () => {
    const {graph} = mount();
    expect(squaresSwitch().checked).toBe(true);
    const board = graph.liveBoard();
    expect(Math.abs(board.unitX - board.unitY) / board.unitX).toBeGreaterThan(0.05);
    const residuals = [0.1, 0.2, -0.7, 0.4];
    const check = () => {
        const squares = graph.squares().filter(square => square.visPropCalc?.visible === true);
        expect(squares).toHaveLength(4);
        squares.forEach((square, i) => {
            const xs = square.dataX!;
            const ys = square.dataY!;
            const width = (Math.max(...xs) - Math.min(...xs)) * board.unitX;
            const height = (Math.max(...ys) - Math.min(...ys)) * board.unitY;
            expect(height, `square ${i} height`).toBeCloseTo(Math.abs(residuals[i]) * board.unitY, 6);
            expect(width, `square ${i} width`).toBeCloseTo(height, 6);
        });
    };
    check();
    act(() => { board.setBoundingBox([-0.5, 5, 6, -1], false); board.update(); });
    check();
    act(() => { fireEvent.click(squaresSwitch()); });
    expect(graph.modelNow().showSquares).toBe(false);
    expect(graph.squares().filter(square => square.visPropCalc?.visible === true)).toHaveLength(0);
});

test('manual line mode draws the manual line, shows its sum beside the optimum and enables the sliders', () => {
    const {graph} = mount();
    act(() => { fireEvent.click(manualSwitch()); });
    expect(graph.modelNow().manualLine).toBe(true);
    expect(readout('equation')).toBe('y = x + 1');
    expect(readout('sum')).toBe('1');
    expect(readout('optimal-sum')).toBe('0,7');
    expect(readout('residuals')).toBe('0; 0; −1; 0');
    expect(graph.visibleFunctionGraphs()).toHaveLength(1);
    expect(graph.visibleFunctionGraphs()[0].Y(2)).toBeCloseTo(3, 12);
    setLine(/^Naklon k$/, 0.9);
    setLine(/^Začetna vrednost n$/, 0.9);
    expect(graph.modelNow()).toMatchObject({slope: 0.9, intercept: 0.9});
    expect(readout('sum')).toBe('0,7');
    expect(readout('optimal-sum')).toBe('0,7');
    setLine(/^Naklon k$/, 2);
    expect(readout('sum')).toBe('17,64');
    expect(graph.visibleFunctionGraphs()[0].Y(1)).toBeCloseTo(2.9, 12);
    expect(graph.captionPlainLines().join('\n')).toMatch(/Najmanjša možna vsota \(najboljša premica\): 0,7/);
    act(() => { fireEvent.click(manualSwitch()); });
    expect(readout('equation')).toBe('y = 0,9x + 0,9');
});

test('the normal equations are displayed with the numbers of the fit for degree 1 and 2 and not for degree 3', () => {
    mount();
    expect(document.querySelector('[data-lsq="normal-equations"]')).toBeNull();
    act(() => { fireEvent.click(normalSwitch()); });
    const text = () => document.querySelector('[data-lsq="normal-latex"]')?.textContent ?? '';
    expect(text()).toContain('A^{T}A\\,c=A^{T}y');
    expect(text()).toContain('\\begin{pmatrix}4 & 6 \\\\ 6 & 14\\end{pmatrix}');
    expect(text()).toContain('=\\begin{pmatrix}9 \\\\ 18\\end{pmatrix}');
    expect(text()).toContain('c=\\begin{pmatrix}0{,}9 \\\\ 0{,}9\\end{pmatrix}');
    setDegree(2);
    expect(text()).toContain('\\begin{pmatrix}4 & 6 & 14 \\\\ 6 & 14 & 36 \\\\ 14 & 36 & 98\\end{pmatrix}');
    expect(text()).toContain('c=\\begin{pmatrix}1{,}15 \\\\ 0{,}15 \\\\ 0{,}25\\end{pmatrix}');
    act(() => { setLanguage('en'); });
    expect(text()).toContain('c=\\begin{pmatrix}1.15 \\\\ 0.15 \\\\ 0.25\\end{pmatrix}');
    setDegree(3);
    expect(document.querySelector('[data-lsq="normal-latex"]')).toBeNull();
    expect(document.querySelector('[data-lsq="normal-equations"]')?.textContent).toMatch(/shown for degree 1 and 2/);
});

test('the help text says that squared vertical residuals are a modelling choice, not the geometric distance', () => {
    mount();
    expect(document.body.textContent).toMatch(/modelska izbira, ne geometrijska razdalja/);
    act(() => { setLanguage('en'); });
    expect(document.body.textContent).toMatch(/modelling choice, not the geometric distance/);
});

test('Reset restores the defaults, the fields, the readouts, the view and the board objects', async () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    graph.drag(3, 3, 8);
    setDegree(2);
    act(() => { fireEvent.click(manualSwitch()); });
    act(() => { fireEvent.click(normalSwitch()); });
    act(() => { fireEvent.click(squaresSwitch()); });
    graph.liveBoard().setBoundingBox([-0.5, 5, 6, -1], false);
    await settle(() => graph.reset());
    expect(graph.modelNow()).toEqual(DEFAULT_LEAST_SQUARES_MODEL);
    expect(list(4, 'y').value).toBe('4');
    expect(graph.handles()[3].Y()).toBe(4);
    expect(manualSwitch().checked).toBe(false);
    expect(squaresSwitch().checked).toBe(true);
    expect(normalSwitch().checked).toBe(false);
    expect(degreeField().value).toBe('1');
    expect(readout('equation')).toBe('y = 0,9x + 0,9');
    expect(readout('sum')).toBe('0,7');
    expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(-1.5, 6);
    expect(graph.ownedObjects()).toBe(baseline);
});

test('Preset round trip: the exported model is imported back with the same state and the same board', () => {
    const {graph} = mount();
    graph.drag(3, 3, 8);
    setDegree(2);
    act(() => { fireEvent.click(normalSwitch()); });
    const exported = graph.exportPreset();
    expect(exported.data).toEqual({
        points: [[0, 1], [1, 2], [2, 2], [3, 8]], degree: 2, manualLine: false, slope: 1, intercept: 1, showSquares: true, showNormalEquations: true,
    });
    const equation = readout('equation');
    act(() => { graph.importPreset({id: 'default', data: DEFAULT_LEAST_SQUARES_MODEL}); });
    expect(graph.modelNow()).toEqual(DEFAULT_LEAST_SQUARES_MODEL);
    expect(graph.handles()[3].Y()).toBe(4);
    expect(readout('equation')).toBe('y = 0,9x + 0,9');
    act(() => { graph.importPreset({...exported, id: 'stored'}); });
    expect(graph.modelNow()).toEqual(exported.data);
    expect(list(4, 'y').value).toBe('8');
    expect(graph.handles()[3].Y()).toBe(8);
    expect(degreeField().value).toBe('2');
    expect(normalSwitch().checked).toBe(true);
    expect(readout('equation')).toBe(equation);
    // through the file importer too (stored Preset collection key interp-least-squares)
    const file = JSON.stringify({'preset-interp-least-squares': {data: [{id: 'Ena', data: exported.data}]}});
    commitPresetImport(preflightPresetImport(file));
    expect(JSON.parse(localStorage.getItem('preset-interp-least-squares')!).data[0].data).toEqual(exported.data);
});

const validData = {points: [[0, 1], [1, 2], [2, 2], [3, 4]], degree: 1, manualLine: false, slope: 1, intercept: 1, showSquares: true, showNormalEquations: false};
const filePreset = (data: unknown) => JSON.stringify({'preset-interp-least-squares': {data: [{id: 'Napaka', data}]}});

test.each([
    [{...validData, points: [[0, 1]]}, /points.*2.*12/],
    [{...validData, points: [[0, 1], [1, 'a']]}, /točka 2.*points|point 2.*points/],
    [{...validData, points: [[0, 1], [99, 2]]}, /20/],
    [{...validData, degree: 4}, /degree.*1.*3/],
    [{...validData, degree: 0}, /degree.*1.*3/],
    [{...validData, slope: 11}, /slope.*10/],
    [{...validData, intercept: 'x'}, /intercept.*20/],
    [{...validData, manualLine: 'yes'}, /manualLine.*true.*false/],
    [{...validData, showSquares: 1}, /showSquares.*true.*false/],
    [{...validData, showNormalEquations: null}, /showNormalEquations.*true.*false/],
])('an invalid imported file is rejected with a message naming the field and nothing is written: %j', (data, expected) => {
    expect(() => preflightPresetImport(filePreset(data))).toThrow(LocalizedError);
    expect(() => preflightPresetImport(filePreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(filePreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test('the same rejection is worded in English', () => {
    setLanguage('en');
    expect(() => preflightPresetImport(filePreset({...validData, degree: 4}))).toThrow(/degree field must be a whole number between 1 and 3/);
});

test('a live language switch updates the board text, the labels and the readouts and keeps the state', () => {
    const {graph} = mount();
    graph.drag(3, 3, 8);
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(graph.captionPlainLines().join('\n')).toMatch(/Sum of squared residuals: 8\.7/);
    expect(graph.captionPlainLines().join('\n')).toMatch(/y = 2\.1x \+ 0\.1/);
    expect(readout('sum')).toBe('8.7');
    expect(graph.modelNow().points[3]).toEqual([3, 8]);
    expect(list(4, 'y').value).toBe('8');
    act(() => { setLanguage('sl'); });
    expect(graph.captionPlainLines().join('\n')).toMatch(/Vsota kvadratov ostankov: 8,7/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('dispose removes the owned board objects, and a later drag or language change touches no board', () => {
    const {graph, unmount} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(25);
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    unmount();
    expect(graph.ownedObjects()).toBe(0);
    update.mockClear();
    act(() => { setLanguage('en'); });
    expect(update).not.toHaveBeenCalled();
    expect(() => (graph as unknown as { setPoint(i: number, v: unknown): void }).setPoint(0, [0, 3])).not.toThrow();
    expect(update).not.toHaveBeenCalled();
});

test('the cubic fit through four points shows its float-noise sum of squares and residuals with ≈ 0', () => {
    mount();
    setDegree(3);
    expect(readout('sum')).toBe('≈ 0');
    expect(readout('residuals')).toBe('≈ 0; ≈ 0; ≈ 0; ≈ 0');
});

test('in manual mode the normal-equations display says it is the best line\'s system; in fit mode it does not', () => {
    mount();
    act(() => { fireEvent.click(normalSwitch()); });
    const note = () => document.querySelector('[data-lsq="normal-manual-note"]')?.textContent;
    expect(note()).toBeUndefined();
    act(() => { fireEvent.click(manualSwitch()); });
    expect(note()).toBe('Prikazan je normalni sistem najboljše premice, ne ročne premice.');
    act(() => { setLanguage('en'); });
    expect(note()).toBe('This is the normal system of the best line, not of the manual line.');
    act(() => { fireEvent.click(manualSwitch()); });
    expect(note()).toBeUndefined();
});
