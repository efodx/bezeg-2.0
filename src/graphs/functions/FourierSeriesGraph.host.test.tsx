import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FourierSeriesGraph} from './FourierSeriesGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction} from '../../learning/model';
import {DEFAULT_FOURIER_SERIES_MODEL, fourierGibbsPeak, fourierSampleSpacing, fourierZoomWindow} from '../../analysis/fourierSeriesModel';
import {enterNumber} from '../../inputs/testEntry';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

beforeEach(() => setLanguage('sl'));

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedFourierGraph extends FourierSeriesGraph {
    lesson(action: LessonAction) {
        this.applyLessonAction(action);
    }

    fit() {
        this.fitToVisiblePoints();
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

    /** The data of the drawn curve S_N: the only board curve with more than a handful of points. */
    drawnCurve(): { x: number[]; y: number[] } {
        const objects = this.board.objectsList as unknown as { elType?: string; dataX?: number[]; dataY?: number[] }[];
        const curves = objects.filter(object => object.elType === 'curve');
        const sums = curves.filter(curve => (curve.dataX?.length ?? 0) > 10);
        expect(sums).toHaveLength(1);
        return {x: sums[0].dataX!, y: sums[0].dataY!};
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-fourier-status]')].map(element => element.getAttribute('data-fourier-status'));
const field = (name: RegExp | string) => screen.getByRole('spinbutton', {name}) as HTMLInputElement;
const select = () => screen.getByLabelText(/^Primer vala$|^Wave$/) as HTMLSelectElement;
/** The scene's own objects; the board's tick labels come and go with the view and are not counted. */
const boardObjects = (graph: ObservedFourierGraph) => graph.ownedObjects();
const box = (graph: ObservedFourierGraph) => graph.liveBoard().getBoundingBox();
const nearBox = (actual: number[], expected: number[]) => expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 6));
const nInput = () => field(/^Število harmonikov N$/);

const mount = () => {
    const graph = new ObservedFourierGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return graph;
};

const DEFAULT_SQUARE_VIEW = [-7.2, 3.6, 7.2, -2];
const DEFAULT_SAWTOOTH_VIEW = [-7.2, 7.4, 7.2, -4.4];

test('a real board shows the default square wave: the fields, the readouts and a curve whose maximum is the Gibbs peak', () => {
    const graph = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_FOURIER_SERIES_MODEL);
    expect(nInput().value).toBe('11');
    expect(readout('n')).toBe('11');
    expect(readout('peak-value')).toBe('1,1813');
    expect(readout('terms')).toBe('Sₙ(x) = 4/π · (sin x + sin 3x/3 + sin 5x/5 + sin 7x/7 + sin 9x/9 + sin 11x/11)');
    expect(statusIds()).toContain('gibbs');
    nearBox(box(graph), DEFAULT_SQUARE_VIEW);

    const curve = graph.drawnCurve();
    expect(curve.y.length).toBeGreaterThan(100);
    expect(Math.max(...curve.y)).toBeCloseTo(fourierGibbsPeak('square', 11).value, 12);
    let widest = 0;
    for (let i = 1; i < curve.x.length; i++) widest = Math.max(widest, curve.x[i] - curve.x[i - 1]);
    expect(widest).toBeLessThanOrEqual(fourierSampleSpacing('square', 11) + 1e-12);
});

test('N: the buttons and the field change the model, a non-integer is refused, and the drawn maximum follows the closed-form peak', () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    act(() => { enterNumber(nInput(), '101'); });
    expect(graph.modelNow().n).toBe(101);
    expect(Math.max(...graph.drawnCurve().y)).toBeCloseTo(fourierGibbsPeak('square', 101).value, 12);
    expect(Math.max(...graph.drawnCurve().y)).toBeCloseTo(1.17901, 5);
    act(() => { enterNumber(nInput(), '2.5'); });
    expect(graph.modelNow().n).toBe(101);
    act(() => { enterNumber(nInput(), '1002'); });
    expect(graph.modelNow().n).toBe(101);
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Zmanjšaj število'})); });
    expect(graph.modelNow().n).toBe(100);
    expect(statusIds()).toContain('even-square');
    expect(readout('order')).toBe('99');
    expect(readout('terms')).toBe('Sₙ(x) = 4/π · (sin x + sin 3x/3 + sin 5x/5 + sin 7x/7 + sin 9x/9 + sin 11x/11 + … + sin 99x/99)');
    act(() => { enterNumber(nInput(), '1001'); });
    expect(Math.max(...graph.drawnCurve().y)).toBeCloseTo(fourierGibbsPeak('square', 1001).value, 12);
    act(() => { enterNumber(nInput(), '1'); });
    expect(boardObjects(graph)).toBe(baseline);
});

test('the zoom window follows the peak when N changes, and only while the view is the window', () => {
    const graph = mount();
    act(() => { fireEvent.click(screen.getByRole('button', {name: "Približaj na vrh"})); });
    nearBox(box(graph), fourierZoomWindow('square', 11));
    act(() => { enterNumber(nInput(), '51'); });
    nearBox(box(graph), fourierZoomWindow('square', 51));
    expect(fourierZoomWindow('square', 51)[2]).toBeLessThan(fourierZoomWindow('square', 11)[2]);
    // a view the learner moved away from the window is left alone
    graph.liveBoard().setBoundingBox([-3, 2, 3, -1], false);
    act(() => { enterNumber(nInput(), '21'); });
    nearBox(box(graph), [-3, 2, 3, -1]);
    // the host Fit frames the example's whole view (it replaced the "whole view" button), for both examples
    act(() => { graph.fit(); });
    nearBox(box(graph), DEFAULT_SQUARE_VIEW);
    act(() => { fireEvent.change(select(), {target: {value: 'sawtooth'}}); });
    graph.liveBoard().setBoundingBox([-3, 2, 3, -1], false);
    act(() => { graph.fit(); });
    nearBox(box(graph), DEFAULT_SAWTOOTH_VIEW);
});

test('Reset, also after choosing the sawtooth, restores every field, the readouts, the view and the board objects', async () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    act(() => { fireEvent.change(select(), {target: {value: 'sawtooth'}}); });
    expect(graph.modelNow().example).toBe('sawtooth');
    nearBox(box(graph), DEFAULT_SAWTOOTH_VIEW);
    act(() => { enterNumber(nInput(), '40'); });
    act(() => { enterNumber(field(/^Točka x, vrednost$/), '-2'); });
    act(() => { enterNumber(field(/^Toleranca ε, vrednost$/), '0,5'); });
    expect(graph.modelNow()).toEqual({example: 'sawtooth', n: 40, x: -2, epsilon: 0.5});
    expect(Math.max(...graph.drawnCurve().y)).toBeCloseTo(fourierGibbsPeak('sawtooth', 40).value, 12);
    expect(readout('terms')).toBe('Sₙ(x) = 2 · (sin x − sin 2x/2 + sin 3x/3 − sin 4x/4 + sin 5x/5 − sin 6x/6 + … − sin 40x/40)');
    expect(boardObjects(graph)).toBe(baseline);

    // the Reset button of the Save tab calls this (the tab is collapsed in jsdom)
    await settle(() => graph.reset());
    expect(graph.modelNow()).toEqual(DEFAULT_FOURIER_SERIES_MODEL);
    expect(select().value).toBe('square');
    expect(nInput().value).toBe('11');
    expect(field(/^Točka x, vrednost$/).value).toBe('0,5');
    expect(field(/^Toleranca ε, vrednost$/).value).toBe('0,1');
    expect(readout('n')).toBe('11');
    expect(readout('peak-value')).toBe('1,1813');
    expect(readout('terms')).toBe('Sₙ(x) = 4/π · (sin x + sin 3x/3 + sin 5x/5 + sin 7x/7 + sin 9x/9 + sin 11x/11)');
    nearBox(box(graph), DEFAULT_SQUARE_VIEW);
    expect(Math.max(...graph.drawnCurve().y)).toBeCloseTo(fourierGibbsPeak('square', 11).value, 12);
    expect(boardObjects(graph)).toBe(baseline);
});

test('a restored Preset shows its model, its view and its drawn curve; a sawtooth Preset without a view shows the sawtooth view', () => {
    const graph = mount();
    const baseline = boardObjects(graph);
    const stored = {example: 'sawtooth', n: 25, x: 3, epsilon: 0.3};
    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-4, 4, 4, -4]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(select().value).toBe('sawtooth');
    expect(nInput().value).toBe('25');
    expect(field(/^Točka x, vrednost$/).value).toBe('3');
    expect(field(/^Toleranca ε, vrednost$/).value).toBe('0,3');
    nearBox(box(graph), [-4, 4, 4, -4]);
    expect(Math.max(...graph.drawnCurve().y)).toBeCloseTo(fourierGibbsPeak('sawtooth', 25).value, 12);
    act(() => { graph.importPreset({id: 'default', data: DEFAULT_FOURIER_SERIES_MODEL}); });
    expect(graph.modelNow()).toEqual(DEFAULT_FOURIER_SERIES_MODEL);
    act(() => { graph.importPreset({id: 'saw', data: stored}); });
    nearBox(box(graph), DEFAULT_SAWTOOTH_VIEW);
    expect(boardObjects(graph)).toBe(baseline);
});

test('both languages: labels, readouts and board texts follow a live language switch', () => {
    const graph = mount();
    act(() => { enterNumber(field(/^Točka x, vrednost$/), '1,5'); });
    expect(readout('x')).toBe('1,5');
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(field(/^Number of harmonics N$/)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Decrease count'})).toBeInTheDocument();
    expect(readout('x')).toBe('1.5');
    expect(readout('peak-value')).toBe('1.1813');
    expect(document.querySelector('[data-readout="terms"] dt')?.textContent).toBe('Terms of the series Sₙ');
    expect(readout('terms')).toContain('4/π');
    expect(select().value).toBe('square');
    expect(screen.getAllByText(/Gibbs/).length).toBeGreaterThan(0);
    act(() => { setLanguage('sl'); });
    expect(readout('x')).toBe('1,5');
    expect(document.querySelector('[data-readout="terms"] dt')?.textContent).toBe('Členi vrste Sₙ');
    expect(screen.getByRole('spinbutton', {name: /^Število harmonikov N$/})).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('a multi-action lesson scene runs in one synchronous sequence; a rejected value is refused, not clamped', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'fourier-example', value: 'sawtooth'},
        {kind: 'function-parameter', name: 'fourier-n', value: 25},
        {kind: 'function-parameter', name: 'fourier-x', value: 1.5},
        {kind: 'function-parameter', name: 'fourier-epsilon', value: 0.25},
    ] as LessonAction[]) act(() => graph.lesson(action));
    expect(graph.modelNow()).toEqual({example: 'sawtooth', n: 25, x: 1.5, epsilon: 0.25});
    const before = graph.modelNow();
    expect(() => graph.lesson({kind: 'function-parameter', name: 'fourier-n', value: 2.5})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'fourier-x', value: 7})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'fourier-epsilon', value: 0.255})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-choice', name: 'fourier-example', value: 'triangle'})).toThrow(DomainError);
    expect(graph.modelNow()).toBe(before);
});
