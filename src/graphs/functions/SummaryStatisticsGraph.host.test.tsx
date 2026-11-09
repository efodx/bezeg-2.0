import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SummaryStatisticsGraph} from './SummaryStatisticsGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {DEFAULT_SUMMARY_MODEL, fitSummaryView, SUMMARY_VALUES_MAX} from '../../analysis/summaryStatisticsModel';
import {LessonAction} from '../../learning/model';
import {DomainError} from './BaseFunctionGraph';
import {functionPresetCollections} from './functionPresetCollections';
import {GraphPalette} from '../styles/GraphPalette';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

type BoardObject = {
    elType?: string; dataX?: number[]; dataY?: number[]; visPropCalc?: { visible?: boolean };
    visProp?: { strokecolor?: string; face?: string }; X(): number; Y(): number; moveTo(to: number[]): void;
    triggerEventHandlers(names: string[], args: unknown[]): void;
};

class ObservedSummaryGraph extends SummaryStatisticsGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    objects() { return this.board.objectsList as unknown as BoardObject[]; }
    handles() { return this.pointObjects as unknown as BoardObject[]; }
    visibleHandles() { return this.handles().filter(point => point.visPropCalc?.visible === true); }
    /** The visible points of one face: 'diamond' outlier markers, 'triangleup' mean marker, 'square' median marker. */
    faces(face: string) {
        return this.objects().filter(o => o.elType === 'point' && o.visProp?.face === face && o.visPropCalc?.visible === true);
    }
    private curve(color: string, length: number) {
        return this.objects().filter(o => o.elType === 'curve' && o.visProp?.strokecolor?.toLowerCase() === color.toLowerCase() && o.dataX?.length === length);
    }
    /** The box-plot curve (20 data points) when it exists and is shown. */
    box() { return this.curve(GraphPalette.primaryCurve, 20).filter(o => o.visPropCalc?.visible === true); }
    fences() { return this.curve(GraphPalette.referenceCurve, 5).filter(o => o.visPropCalc?.visible === true); }
    band() { return this.curve(GraphPalette.additionalCurves[0], 5).filter(o => o.visPropCalc?.visible === true); }
    drag(index: number, x: number) {
        const handle = this.handles()[index];
        act(() => { handle.moveTo([x, handle.Y()]); handle.triggerEventHandlers(['drag'], []); });
    }
    callMove(index: unknown, value: unknown) { this.moveValue(index, value); }
    callAdd() { this.addValue(); }
    lesson(action: LessonAction) { act(() => { this.applyLessonAction(action); }); }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const status = (id: string) => id === 'refused'
    ? document.querySelector('[data-refusal-notice]')?.textContent || undefined
    : document.querySelector(`[data-prob-summary-status="${id}"]`)?.textContent;
const field = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const typeIn = (label: RegExp, value: number) => act(() => {
    fireEvent.change(field(label), {target: {value: String(value)}});
    fireEvent.keyDown(field(label), {key: 'Enter'});
});
const click = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const select = (label: RegExp, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label) as HTMLSelectElement, {target: {value}}); });
const boxSwitch = () => screen.getByLabelText(/^Škatla z brki$/) as HTMLInputElement;
const bandSwitch = () => screen.getByLabelText(/^Pas okoli sredine/) as HTMLInputElement;
const mount = () => {
    const graph = new ObservedSummaryGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, ...view};
};
const xs = (graph: ObservedSummaryGraph) => graph.visibleHandles().map(h => h.X());

test('defaults: school data read 5,857143 / 6 / 1,2454, Q 5 and 6,5, IQR 1,5, fences 2,75 and 8,75, no outliers, the other rule 5; 7; 2', () => {
    const {graph} = mount();
    expect(graph.modelNow()).toEqual(DEFAULT_SUMMARY_MODEL);
    expect(readout('n')).toBe('7');
    expect(readout('mean')).toBe('5,857143');
    expect(readout('median')).toBe('6');
    expect(readout('sigma')).toBe('1,2454');
    expect(readout('q1')).toBe('5');
    expect(readout('q3')).toBe('6,5');
    expect(readout('iqr')).toBe('1,5');
    expect(readout('fences')).toBe('2,75 in 8,75');
    expect(readout('outliers')).toBe('ni');
    expect(readout('convention')).toBe('5; 7; 2');
    // The rule and the kind of sigma are named in the labels.
    expect(readoutLabel('q1')).toMatch(/šolsko pravilo/);
    expect(readoutLabel('sigma')).toMatch(/populacijski σ/);
    expect(readoutLabel('convention')).toMatch(/pravilo brez mediane/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('board: seven dots on the axis (ties stacked), mean triangle, median square, the box and the fences, no outliers and no band', () => {
    const {graph} = mount();
    expect(graph.visibleHandles().map(h => [h.X(), h.Y()])).toEqual([[4, 0], [5, 0], [5, 0.35], [6, 0], [6, 0.35], [7, 0], [8, 0]]);
    expect(graph.faces('triangleup').map(p => p.X())[0]).toBeCloseTo(41 / 7, 9);
    expect(graph.faces('square').map(p => p.X())).toEqual([6]);
    expect(graph.faces('diamond')).toHaveLength(0);
    expect(graph.box()).toHaveLength(1);
    expect(graph.fences()).toHaveLength(1);
    expect(graph.fences()[0].dataX!.filter(x => !Number.isNaN(x))).toEqual([2.75, 2.75, 8.75, 8.75]);
    expect(graph.band()).toHaveLength(0);
    // box: Q1 5 to Q3 6.5, whiskers to 4 and 8
    const boxX = graph.box()[0].dataX!.filter(x => !Number.isNaN(x));
    expect(Math.min(...boxX)).toBe(4);
    expect(Math.max(...boxX)).toBe(8);
    expect(boxX.slice(0, 4)).toEqual([5, 6.5, 6.5, 5]);
    expect(graph.captionPlainLines().join('\n')).toMatch(/Število vrednosti: 7/);
});

test('the outlier example flags 30: a diamond marker in the box row, the value in the list, the view refitted around 30', () => {
    const {graph} = mount();
    select(/^Primer$/, 'outlier');
    expect(graph.modelNow().values).toEqual([4, 5, 5, 6, 6, 7, 30]);
    expect(readout('mean')).toBe('9');
    expect(readout('median')).toBe('6');
    expect(readout('sigma')).toBe('8,6189');
    expect(readout('outliers')).toBe('30');
    expect(graph.faces('diamond').map(p => [p.X(), p.Y()])).toEqual([[30, 1.5]]);
    // whisker stops at the last unflagged value
    expect(Math.max(...graph.box()[0].dataX!.filter(x => !Number.isNaN(x)))).toBe(7);
    const [left, , right] = graph.liveBoard().getBoundingBox();
    expect(left).toBeCloseTo(fitSummaryView([4, 5, 5, 6, 6, 7, 30])[0], 6);
    expect(right).toBeGreaterThanOrEqual(30);
});

describe('dragging', () => {
    test('a drag moves the value (snapped to tenths) horizontally: the mean follows, the median stays, the view stays', () => {
        const {graph} = mount();
        const before = graph.liveBoard().getBoundingBox();
        graph.drag(6, 12.04);
        expect(graph.modelNow().values).toEqual([4, 5, 5, 6, 6, 7, 12]);
        expect(xs(graph)).toEqual([4, 5, 5, 6, 6, 7, 12]);
        expect(readout('median')).toBe('6');
        expect(readout('mean')).toBe('6,428571');
        expect(graph.faces('triangleup')[0].X()).toBeCloseTo(45 / 7, 9);
        expect(graph.liveBoard().getBoundingBox()).toEqual(before);
        expect(status('refused')).toBeUndefined();
    });

    test('a drag onto a tie stacks the dots; leaving the tie unstacks them', () => {
        const {graph} = mount();
        graph.drag(0, 5);
        expect(graph.visibleHandles().map(h => [h.X(), h.Y()]).slice(0, 3)).toEqual([[5, 0], [5, 0.35], [5, 0.7]]);
        graph.drag(0, 4.04);
        expect(graph.visibleHandles()[0].Y()).toBe(0);
        expect(graph.modelNow().values[0]).toBe(4);
    });

    test('a drag outside the range stops at the limit without a message (task 0 decision 3)', () => {
        const {graph} = mount();
        graph.drag(6, 12);
        graph.drag(6, 45);
        expect(graph.modelNow().values[6]).toBe(40);
        expect(graph.handles()[6].X()).toBe(40);
        graph.drag(6, -5);
        expect(graph.modelNow().values[6]).toBe(0);
        expect(status('refused')).toBeUndefined();
    });
});

describe('the typed list', () => {
    test('typing a value edits the model and the dot; a value outside the visible range refits the view', () => {
        const {graph} = mount();
        typeIn(/^Vrednost 7$/, 30);
        expect(graph.modelNow().values[6]).toBe(30);
        expect(graph.handles()[6].X()).toBe(30);
        expect(readout('outliers')).toBe('30');
        expect(graph.liveBoard().getBoundingBox()[2]).toBeGreaterThanOrEqual(30);
    });

    test('an out-of-range typed value is not applied; the model API refuses it with a DomainError and leaves the model alone', () => {
        const {graph} = mount();
        typeIn(/^Vrednost 7$/, 99);
        expect(graph.modelNow().values[6]).toBe(8);
        const model = graph.modelNow();
        expect(() => graph.callMove(0, 99)).toThrow(DomainError);
        expect(() => graph.callMove(9, 1)).toThrow(DomainError);
        expect(graph.modelNow()).toBe(model);
    });

    test('add puts a value at the median; remove deletes that row; the board object count does not depend on n', () => {
        const {graph} = mount();
        const count = graph.ownedObjects();
        click('Dodaj vrednost');
        expect(graph.modelNow().values).toEqual([4, 5, 5, 6, 6, 7, 8, 6]);
        expect(graph.visibleHandles()).toHaveLength(8);
        expect(graph.visibleHandles()[7].Y()).toBe(0.7);
        click('Odstrani vrednost 1');
        expect(graph.modelNow().values).toEqual([5, 5, 6, 6, 7, 8, 6]);
        expect(graph.ownedObjects()).toBe(count);
        expect(graph.visibleHandles()).toHaveLength(7);
    });

    test('adding beyond 15 values is refused with a message', () => {
        const {graph} = mount();
        for (let i = 7; i < SUMMARY_VALUES_MAX; i++) click('Dodaj vrednost');
        expect(graph.modelNow().values).toHaveLength(SUMMARY_VALUES_MAX);
        const model = graph.modelNow();
        click('Dodaj vrednost');
        expect(graph.modelNow()).toBe(model);
        expect(status('refused')).toMatch(/Več kot 15 vrednosti/);
    });

    test('Add value is unavailable at 15 values with the reason as title, and a press shows the reason once in the refusal channel', () => {
        const {graph} = mount();
        const add = () => screen.getByRole('button', {name: 'Dodaj vrednost'});
        expect(add()).toHaveAttribute('aria-disabled', 'false');
        for (let i = 7; i < SUMMARY_VALUES_MAX; i++) click('Dodaj vrednost');
        expect(add()).toHaveAttribute('aria-disabled', 'true');
        expect(add().getAttribute('title')).toMatch(/Več kot 15 vrednosti/);
        click('Dodaj vrednost');
        expect(graph.modelNow().values).toHaveLength(SUMMARY_VALUES_MAX);
        expect(document.querySelectorAll('[data-refusal-notice]')).toHaveLength(1);
        expect(document.querySelector('[data-refusal-notice]')?.closest('[data-prob-summary-status]')).toBeNull();
    });
});

describe('few values', () => {
    test('two values: no box plot, a message on the board and in the panel; one value: sigma 0, sample s a dash; the last value stays', () => {
        const {graph} = mount();
        for (let i = 0; i < 5; i++) click('Odstrani vrednost 1');
        expect(graph.modelNow().values).toEqual([7, 8]);
        expect(graph.box()).toHaveLength(0);
        expect(graph.fences()).toHaveLength(0);
        expect(graph.faces('diamond')).toHaveLength(0);
        expect(status('too-few')).toMatch(/vsaj 3 vrednosti/);
        expect(graph.captionPlainLines().join('\n')).toMatch(/Škatla z brki potrebuje vsaj 3 vrednosti/);
        expect(readout('q1')).toBe('—');
        expect(readout('fences')).toBe('—');
        expect(readout('outliers')).toBe('—');
        expect(readout('mean')).toBe('7,5');
        click('Odstrani vrednost 1');
        expect(graph.modelNow().values).toEqual([8]);
        expect(readout('sigma')).toBe('0');
        select(/^Vrsta standardnega odklona$/, 'sample');
        expect(readout('sigma')).toBe('—');
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
        click('Odstrani vrednost 1');
        expect(graph.modelNow().values).toEqual([8]);
        expect(status('refused')).toMatch(/Ostati mora vsaj 1 vrednost/);
    });

    test('with the box plot off, two values show no too-few message', () => {
        const {graph} = mount();
        act(() => { fireEvent.click(boxSwitch()); });
        for (let i = 0; i < 5; i++) click('Odstrani vrednost 1');
        expect(status('too-few')).toBeUndefined();
        expect(graph.captionPlainLines().join('\n')).not.toMatch(/potrebuje/);
    });
});

test('the quartile rule switch changes Q3 to 7 (Q1 5, IQR 2) and names the other rule', () => {
    mount();
    select(/^Pravilo za kvartile$/, 'exclusive');
    expect(readout('q1')).toBe('5');
    expect(readout('q3')).toBe('7');
    expect(readout('iqr')).toBe('2');
    expect(readout('fences')).toBe('2 in 10');
    expect(readoutLabel('q3')).toMatch(/pravilo brez mediane/);
    expect(readoutLabel('convention')).toMatch(/šolsko pravilo/);
    expect(readout('convention')).toBe('5; 6,5; 1,5');
});

test('the sigma kind switch shows the sample deviation 1,3452 and the band follows it', () => {
    const {graph} = mount();
    act(() => { fireEvent.click(bandSwitch()); });
    const population = graph.band()[0].dataX!.slice();
    select(/^Vrsta standardnega odklona$/, 'sample');
    expect(readout('sigma')).toBe('1,3452');
    expect(readoutLabel('sigma')).toMatch(/vzorčni s/);
    const sample = graph.band()[0].dataX!;
    expect(sample[1] - sample[0]).toBeGreaterThan(population[1] - population[0]);
    expect((sample[1] - sample[0]) / 2).toBeCloseTo(1.3452, 4);
});

test('the box-plot and band switches show and hide the actual board objects', () => {
    const {graph} = mount();
    expect([graph.box().length, graph.fences().length, graph.band().length]).toEqual([1, 1, 0]);
    act(() => { fireEvent.click(boxSwitch()); });
    expect([graph.box().length, graph.fences().length, graph.band().length]).toEqual([0, 0, 0]);
    select(/^Primer$/, 'outlier');
    expect(graph.faces('diamond')).toHaveLength(0);
    act(() => { fireEvent.click(boxSwitch()); });
    expect(graph.box()).toHaveLength(1);
    expect(graph.faces('diamond')).toHaveLength(1);
    act(() => { fireEvent.click(bandSwitch()); });
    expect(graph.band()).toHaveLength(1);
    const band = graph.band()[0];
    expect(Math.min(...band.dataX!)).toBeCloseTo(9 - 8.6189, 3);
    expect(Math.max(...band.dataY!)).toBeLessThan(0);
    act(() => { fireEvent.click(bandSwitch()); });
    expect(graph.band()).toHaveLength(0);
});

test('the band is not drawn for sample s at one value', () => {
    const {graph} = mount();
    act(() => { fireEvent.click(bandSwitch()); });
    select(/^Vrsta standardnega odklona$/, 'sample');
    for (let i = 0; i < 6; i++) click('Odstrani vrednost 1');
    expect(graph.modelNow().values).toHaveLength(1);
    expect(graph.band()).toHaveLength(0);
});

test('Reset restores the defaults, the fields, the readouts, the view and the board objects', async () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    select(/^Primer$/, 'outlier');
    select(/^Pravilo za kvartile$/, 'exclusive');
    select(/^Vrsta standardnega odklona$/, 'sample');
    act(() => { fireEvent.click(bandSwitch()); });
    act(() => { fireEvent.click(boxSwitch()); });
    graph.drag(6, 99);
    await settle(() => graph.reset());
    expect(graph.modelNow()).toEqual(DEFAULT_SUMMARY_MODEL);
    expect(xs(graph)).toEqual([4, 5, 5, 6, 6, 7, 8]);
    expect(readout('mean')).toBe('5,857143');
    expect(readout('q3')).toBe('6,5');
    expect(readout('sigma')).toBe('1,2454');
    expect(boxSwitch().checked).toBe(true);
    expect(bandSwitch().checked).toBe(false);
    expect(status('refused')).toBeUndefined();
    expect(graph.box()).toHaveLength(1);
    expect(graph.band()).toHaveLength(0);
    expect(graph.faces('diamond')).toHaveLength(0);
    expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(fitSummaryView(DEFAULT_SUMMARY_MODEL.values)[0], 6);
    expect(graph.liveBoard().getBoundingBox()[2]).toBeCloseTo(fitSummaryView(DEFAULT_SUMMARY_MODEL.values)[2], 6);
    expect(graph.ownedObjects()).toBe(baseline);
});

describe('Presets', () => {
    const fileWith = (data: object) => JSON.stringify({'preset-prob-summary': {data: [{id: 'Primer', data}]}});

    test('round trip: save, change, restore gives back values, rule, sigma and flags, with the same readouts, board and view', () => {
        const {graph} = mount();
        select(/^Primer$/, 'outlier');
        select(/^Pravilo za kvartile$/, 'exclusive');
        select(/^Vrsta standardnega odklona$/, 'sample');
        act(() => { fireEvent.click(bandSwitch()); });
        const saved = graph.modelNow();
        expect(saved).toEqual({values: [4, 5, 5, 6, 6, 7, 30], rule: 'exclusive', sigma: 'sample', boxPlot: true, sigmaBand: true});
        const exported = graph.exportPreset();
        const checkGraphState = functionPresetCollections['prob-summary'].checkGraphState!;
        expect(checkGraphState(exported.graphState)).toBeUndefined();
        expect(checkGraphState({...exported.graphState, values: []})).toBeDefined();
        const ids = ['n', 'mean', 'median', 'sigma', 'q1', 'q3', 'iqr', 'fences', 'outliers', 'convention'];
        const shown = ids.map(readout);
        select(/^Primer$/, 'even');
        act(() => { fireEvent.click(boxSwitch()); });
        graph.liveBoard().setBoundingBox([-1, 4, 5, -2], false);
        expect(graph.modelNow()).not.toEqual(saved);
        act(() => { graph.importPreset({...exported, id: 'stored'}); });
        expect(graph.modelNow()).toEqual(saved);
        expect(ids.map(readout)).toEqual(shown);
        expect(xs(graph)).toEqual([4, 5, 5, 6, 6, 7, 30]);
        expect(graph.box()).toHaveLength(1);
        expect(graph.band()).toHaveLength(1);
        expect(graph.faces('diamond').map(p => p.X())).toEqual([30]);
        expect(boxSwitch().checked).toBe(true);
        commitPresetImport(preflightPresetImport(fileWith(exported.data as object)));
        expect(JSON.parse(localStorage.getItem('preset-prob-summary')!).data[0].data).toEqual(saved);
    });

    const ok = {values: [4, 5, 6], rule: 'inclusive', sigma: 'population', boxPlot: true, sigmaBand: false};
    test.each([
        ['no values', {...ok, values: []}, /od 1 do 15 vrednosti/],
        ['16 values', {...ok, values: Array.from({length: 16}, (_, i) => i)}, /od 1 do 15 vrednosti/],
        ['a value above 40', {...ok, values: [4, 41]}, /število od 0 do 40/],
        ['a value off the tenth grid', {...ok, values: [4, 5.55]}, /na desetinko natančna/],
        ['an unknown rule', {...ok, rule: 'linear'}, /pravilo za kvartile mora biti eno od: inclusive, exclusive/],
        ['an unknown sigma', {...ok, sigma: 'both'}, /standardnega odklona mora biti ena od: population, sample/],
        ['a missing flag', {values: ok.values, rule: ok.rule, sigma: ok.sigma, sigmaBand: false}, /boxPlot.*true ali false/],
    ])('an out-of-domain file (%s) is rejected with an actionable message and nothing is written', (_name, data, expected) => {
        expect(() => preflightPresetImport(fileWith(data))).toThrow(LocalizedError);
        expect(() => preflightPresetImport(fileWith(data))).toThrow(expected);
        expect(() => preflightPresetImport(fileWith(data))).not.toThrow(/neveljavni podatki funkcije|invalid function data/);
        expect(localStorage.length).toBe(0);
    });
});

test('switching the language keeps the model and re-renders labels, numbers with points and the board caption', () => {
    const {graph} = mount();
    select(/^Primer$/, 'outlier');
    const model = graph.modelNow();
    act(() => { setLanguage('en'); });
    expect(graph.modelNow()).toEqual(model);
    expect(readout('mean')).toBe('9');
    expect(readout('sigma')).toBe('8.6189');
    expect(readout('outliers')).toBe('30');
    expect(readoutLabel('q1')).toMatch(/school rule/);
    expect(screen.getByRole('button', {name: 'Add a value'})).toBeInTheDocument();
    expect(graph.captionPlainLines().join('\n')).toMatch(/Number of values: 7/);
    expect(graph.faces('diamond')).toHaveLength(1);
    expect(graph.box()).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

describe('lesson actions (P4)', () => {
    const choice = (name: string, value: unknown) => ({kind: 'function-choice', name, value}) as LessonAction;
    const show = (target: string, visible: unknown) => ({kind: 'function-visibility', target, visible}) as LessonAction;
    const setValue = (index: unknown, value: unknown) => ({kind: 'summary', operation: 'set-value', index, value}) as LessonAction;
    const addValue = (value?: unknown) => ({kind: 'summary', operation: 'add-value', value}) as LessonAction;
    const removeValue = (index: unknown) => ({kind: 'summary', operation: 'remove-value', index}) as LessonAction;
    const right = (graph: ObservedSummaryGraph) => graph.liveBoard().getBoundingBox()[2];

    test('one synchronous sequence follows the planned lesson: 8 to 30, box and fences, the band, a far dot, the other rule, free edits', () => {
        const {graph} = mount();
        // (1) dots with the mean and median markers
        expect(readout('mean')).toBe('5,857143');
        expect(readout('median')).toBe('6');
        expect(right(graph)).toBeLessThan(30);
        graph.lesson(show('summary-box-plot', false));
        expect(graph.box()).toHaveLength(0);
        // (2) the largest value moves to 30: the mean follows, the median stays; the view refits to show it
        graph.lesson(setValue(6, 30));
        expect(graph.modelNow().values).toEqual([4, 5, 5, 6, 6, 7, 30]);
        expect(readout('mean')).toBe('9');
        expect(readout('median')).toBe('6');
        expect(readout('sigma')).toBe('8,6189');
        expect(right(graph)).toBeGreaterThanOrEqual(30);
        expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(fitSummaryView([4, 5, 5, 6, 6, 7, 30])[0], 6);
        // (3) the box plot and its fences: 30 is flagged
        graph.lesson(show('summary-box-plot', true));
        expect(graph.box()).toHaveLength(1);
        expect(readout('q1')).toBe('5');
        expect(readout('q3')).toBe('6,5');
        expect(readout('fences')).toBe('2,75 in 8,75');
        expect(readout('outliers')).toBe('30');
        expect(graph.faces('diamond').map(p => p.X())).toEqual([30]);
        // (4) the spread: the sigma band, the sample sigma, a dot far from the mean
        graph.lesson(show('summary-sigma-band', true));
        expect(graph.band()).toHaveLength(1);
        graph.lesson(choice('summary-sigma', 'sample'));
        expect(readout('sigma')).toBe('9,3095');
        graph.lesson(choice('summary-sigma', 'population'));
        graph.lesson(addValue(20));
        expect(graph.modelNow().values).toEqual([4, 5, 5, 6, 6, 7, 30, 20]);
        expect(readout('n')).toBe('8');
        expect(readout('mean')).toBe('10,375');
        expect(readout('median')).toBe('6');
        // (5) the convention panel: the school data under both rules
        graph.lesson(choice('summary-example', 'school'));
        expect(graph.modelNow().values).toEqual(DEFAULT_SUMMARY_MODEL.values);
        expect(right(graph)).toBeLessThan(30);
        graph.lesson(choice('summary-rule', 'exclusive'));
        expect(readout('q1')).toBe('5');
        expect(readout('q3')).toBe('7');
        expect(readout('iqr')).toBe('2');
        graph.lesson(choice('summary-rule', 'inclusive'));
        expect(readout('q3')).toBe('6,5');
        // (6) free exploration: add (at the median) and remove dots; the even example
        graph.lesson(addValue());
        expect(graph.modelNow().values).toEqual([4, 5, 5, 6, 6, 7, 8, 6]);
        graph.lesson(removeValue(0));
        expect(graph.modelNow().values).toEqual([5, 5, 6, 6, 7, 8, 6]);
        graph.lesson(choice('summary-example', 'even'));
        expect(readout('median')).toBe('4');
        expect(graph.modelNow().sigmaBand).toBe(true);
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    });

    test('a value inside the view keeps the view', () => {
        const {graph} = mount();
        const before = graph.liveBoard().getBoundingBox();
        graph.lesson(setValue(0, 3));
        expect(graph.liveBoard().getBoundingBox()).toEqual(before);
    });

    test('a value is snapped to tenths like a typed edit', () => {
        const {graph} = mount();
        graph.lesson(setValue(0, 3.04));
        expect(graph.modelNow().values[0]).toBe(3);
    });

    test.each([
        ['a value above 40', setValue(0, 41)],
        ['a negative value', setValue(0, -1)],
        ['a non-number value', setValue(0, 'a')],
        ['index 7 of seven values', setValue(7, 1)],
        ['a fractional index', setValue(1.5, 1)],
        ['an added value above 40', addValue(41)],
        ['removing index 7', removeValue(7)],
        ['an unknown example', choice('summary-example', 'unknown')],
        ['an unknown rule', choice('summary-rule', 'linear')],
        ['an unknown sigma', choice('summary-sigma', 'both')],
        ['a non-boolean box plot', show('summary-box-plot', 'yes')],
    ])('refuses %s with a DomainError and leaves the model alone', (_name, action) => {
        const {graph} = mount();
        const before = graph.modelNow();
        let error: unknown;
        try { graph.lesson(action); } catch (caught) { error = caught; }
        expect(error).toBeInstanceOf(DomainError);
        expect(graph.modelNow()).toEqual(before);
        expect(readout('mean')).toBe('5,857143');
    });

    test('a 16th value and removing the last value are refused', () => {
        const {graph} = mount();
        for (let i = 7; i < SUMMARY_VALUES_MAX; i++) graph.lesson(addValue(1));
        expect(graph.modelNow().values).toHaveLength(SUMMARY_VALUES_MAX);
        expect(() => graph.lesson(addValue(1))).toThrow(DomainError);
        graph.lesson(choice('summary-example', 'even'));
        for (let i = 0; i < 3; i++) graph.lesson(removeValue(0));
        expect(graph.modelNow().values).toEqual([9]);
        expect(readout('sigma')).toBe('0');
        expect(() => graph.lesson(removeValue(0))).toThrow(DomainError);
        expect(graph.modelNow().values).toEqual([9]);
    });

    test('an unknown operation is a plain error, not a refusal', () => {
        const {graph} = mount();
        let error: unknown;
        try { graph.lesson({kind: 'summary', operation: 'sort'} as unknown as LessonAction); } catch (caught) { error = caught; }
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(DomainError);
    });
});
