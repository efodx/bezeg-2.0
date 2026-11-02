import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {RungeInterpolationGraph} from './RungeInterpolationGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {DEFAULT_RUNGE_MODEL} from '../../analysis/rungeInterpolationModel';
import {RUNGE_TABLE} from '../../analysis/interpolation';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

class ObservedRungeGraph extends RungeInterpolationGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    runs() { return this.sampleRuns; }
    /** The three long curves in creation order: f, the error, p. */
    longCurves(): { x: number[]; y: number[] }[] {
        const objects = this.board.objectsList as unknown as { elType?: string; dataX?: number[]; dataY?: number[] }[];
        const curves = objects.filter(object => object.elType === 'curve' && (object.dataX?.length ?? 0) > 500);
        expect(curves).toHaveLength(3);
        return curves.map(curve => ({x: curve.dataX!, y: curve.dataY!}));
    }
    visibleNodeCount() {
        return (this.board.objectsList as unknown as { elType?: string; visPropCalc?: { visible?: boolean } }[])
            .filter(object => object.elType === 'point' && object.visPropCalc?.visible === true).length;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const degreeInput = () => screen.getByLabelText(/^Stopnja n$|^Degree n$/) as HTMLInputElement;
const functionSelect = () => screen.getByLabelText(/^Funkcija f$|^Function f$/) as HTMLSelectElement;
const ruleSelect = () => screen.getByLabelText(/^Razporeditev interpolacijskih točk$|^Placement of the interpolation nodes$/) as HTMLSelectElement;
const errorSwitch = () => screen.getByLabelText(/^Pokaži krivuljo napake|^Show the error curve/) as HTMLInputElement;
const semicircleSwitch = () => screen.getByLabelText(/^Pokaži polkrog$|^Show the semicircle$/) as HTMLInputElement;
const box = (graph: ObservedRungeGraph) => graph.liveBoard().getBoundingBox();

const mount = () => {
    const graph = new ObservedRungeGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, ...view};
};
const setDegree = (value: number) => act(() => { fireEvent.change(degreeInput(), {target: {value: String(value)}}); });
const setRule = (value: string) => act(() => { fireEvent.change(ruleSelect(), {target: {value}}); });
const numeric = (text: string | null | undefined) => Number(String(text).replace(',', '.').replace('−', '-'));

test('defaults: Runge function, degree 10, equispaced, error shown, semicircle off; the view shows the overshoot near x = -0.94', () => {
    const {graph} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_RUNGE_MODEL);
    expect(DEFAULT_RUNGE_MODEL).toEqual({functionId: 'runge', degree: 10, nodeRule: 'equispaced', showError: true, showSemicircle: false});
    expect(degreeInput().value).toBe('10');
    expect(functionSelect().value).toBe('runge');
    expect(ruleSelect().value).toBe('equispaced');
    expect(errorSwitch().checked).toBe(true);
    expect(semicircleSwitch().checked).toBe(false);
    expect(semicircleSwitch().disabled).toBe(true);
    const [left, top, right, bottom] = box(graph);
    const [, , p] = graph.longCurves();
    const overshoot = Math.max(...p.y);
    expect(overshoot).toBeGreaterThan(1.9);
    expect(overshoot).toBeLessThan(top);
    expect(bottom).toBeLessThan(0);
    expect(left).toBeLessThan(-0.94);
    expect(right).toBeGreaterThan(0.94);
    expect(Math.abs(p.x[p.y.indexOf(overshoot)])).toBeGreaterThan(0.9);
    expect(graph.visibleNodeCount()).toBeGreaterThanOrEqual(11);
    expect(readout('nodes')).toBe('11');
});

test('the spec table is reproduced through the readout to four significant figures, degrees 10 and 20, both rules', () => {
    const {graph} = mount();
    const strings: Record<string, string> = {'10-equispaced': '1,916', '10-chebyshev': '0,1092', '20-equispaced': '59,82', '20-chebyshev': '0,01533'};
    for (const row of RUNGE_TABLE.filter(entry => entry.degree !== 15)) {
        setDegree(row.degree);
        for (const rule of ['equispaced', 'chebyshev'] as const) {
            setRule(rule);
            expect(graph.modelNow()).toMatchObject({degree: row.degree, nodeRule: rule});
            expect(readout('grid-max'), `${row.degree} ${rule}`).toBe(strings[`${row.degree}-${rule}`]);
            expect(Math.abs(numeric(readout('grid-max')) - row[rule]) / row[rule]).toBeLessThan(1e-3);
        }
    }
    setDegree(10);
    setRule('equispaced');
    expect(readout('grid-max-at')).toMatch(/0,940/);
    expect(readout('grid')).toBe('20001');
    // "grid maximum", never "supremum" as the claimed value
    expect(document.querySelector('[data-readout="grid-max"] dt')?.textContent).toBe('Največja napaka na mreži');
    act(() => { setLanguage('en'); });
    expect(document.querySelector('[data-readout="grid-max"] dt')?.textContent).toBe('Grid maximum of the error');
});

test('the drawn p interpolates the nodes and the semicircle appears only for Chebyshev nodes', () => {
    const {graph} = mount();
    setDegree(4);
    const [f, , p] = graph.longCurves();
    // the Runge function samples are exact, and p passes through f at the equispaced nodes x = -1, -1/2, 0, 1/2, 1
    for (const node of [-1, -0.5, 0, 0.5, 1]) {
        const i = f.x.findIndex(x => Math.abs(x - node) < 1e-9);
        expect(i, `node ${node}`).toBeGreaterThanOrEqual(0);
        expect(p.y[i]).toBeCloseTo(f.y[i], 9);
    }
    const before = graph.visibleNodeCount();
    expect(semicircleSwitch().disabled).toBe(true);
    setRule('chebyshev');
    expect(semicircleSwitch().disabled).toBe(false);
    act(() => { fireEvent.click(semicircleSwitch()); });
    expect(graph.modelNow()).toMatchObject({nodeRule: 'chebyshev', showSemicircle: true});
    expect(graph.visibleNodeCount()).toBe(before + 5);
    setRule('equispaced');
    expect(graph.modelNow().showSemicircle).toBe(true);
    expect(graph.visibleNodeCount()).toBe(before);
});

test('the semicircle is a circle on screen although the axes have unequal units, and its points project onto the nodes', () => {
    const {graph} = mount();
    setDegree(4);
    setRule('chebyshev');
    act(() => { fireEvent.click(semicircleSwitch()); });
    const board = graph.liveBoard();
    expect(Math.abs(board.unitX - board.unitY) / board.unitX).toBeGreaterThan(0.05);
    type Marker = { elType?: string; visPropCalc?: { visible?: boolean }; visProp?: { strokecolor?: string }; X(): number; Y(): number };
    const arcPoints = (board.objectsList as unknown as Marker[])
        .filter(object => object.elType === 'point' && object.visPropCalc?.visible === true && object.visProp?.strokecolor === '#4d594f');
    expect(arcPoints).toHaveLength(5);
    for (const [j, point] of arcPoints.entries()) {
        // screen radius = one x unit, the same for every point
        expect(Math.hypot(point.X() * board.unitX, point.Y() * board.unitY)).toBeCloseTo(board.unitX, 6);
        expect(point.X()).toBeCloseTo(Math.cos(((2 * j + 1) * Math.PI) / 10), 12);
    }
});

test('the error curve switch changes the model without sampling again', () => {
    const {graph} = mount();
    const runs = graph.runs();
    act(() => { fireEvent.click(errorSwitch()); });
    expect(graph.modelNow().showError).toBe(false);
    expect(graph.runs()).toBe(runs);
});

test('the error sample is cached on (function, degree, rule) and not recomputed on a view-only change', () => {
    const {graph} = mount();
    const runs = graph.runs();
    expect(runs).toBeGreaterThan(0);
    act(() => { graph.liveBoard().setBoundingBox([-0.5, 2, 0.5, -0.2], false); graph.liveBoard().update(); });
    act(() => { graph.liveBoard().setBoundingBox([-1.3, 3, 1.3, -1], false); graph.liveBoard().update(); });
    expect(graph.runs()).toBe(runs);
    setDegree(11);
    expect(graph.runs()).toBe(runs + 1);
    setDegree(11);
    expect(graph.runs()).toBe(runs + 1);
    setRule('chebyshev');
    expect(graph.runs()).toBe(runs + 2);
    act(() => { fireEvent.change(functionSelect(), {target: {value: 'sine'}}); });
    expect(graph.runs()).toBe(runs + 3);
});

test('degree: the buttons and the field change the model; 0, 41 and non-integers are refused', () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    setDegree(40);
    expect(graph.modelNow().degree).toBe(40);
    expect(screen.getByRole('button', {name: 'Povečaj stopnjo n za 1'}).getAttribute('aria-disabled')).toBe('true');
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Povečaj stopnjo n za 1'})); });
    expect(graph.modelNow().degree).toBe(40);
    for (const bad of ['41', '0', '2.5']) {
        setDegree(Number(bad));
        expect(graph.modelNow().degree).toBe(40);
    }
    act(() => { fireEvent.click(screen.getByRole('button', {name: 'Zmanjšaj stopnjo n za 1'})); });
    expect(graph.modelNow().degree).toBe(39);
    expect(graph.ownedObjects()).toBe(baseline);
    expect(() => (graph as unknown as { setDegree(v: unknown): void }).setDegree(41)).toThrow(DomainError);
    expect(() => (graph as unknown as { setFunction(v: unknown): void }).setFunction('cos')).toThrow(DomainError);
    expect(() => (graph as unknown as { setNodeRule(v: unknown): void }).setNodeRule('random')).toThrow(DomainError);
});

test('Reset restores the defaults, the fields, the readouts, the view and the board objects', async () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    setDegree(20);
    setRule('chebyshev');
    act(() => { fireEvent.change(functionSelect(), {target: {value: 'abs'}}); });
    act(() => { fireEvent.click(errorSwitch()); });
    expect(graph.modelNow()).toEqual({functionId: 'abs', degree: 20, nodeRule: 'chebyshev', showError: false, showSemicircle: false});
    graph.liveBoard().setBoundingBox([-0.5, 2, 0.5, -0.2], false);
    await settle(() => graph.reset());
    expect(graph.modelNow()).toEqual(DEFAULT_RUNGE_MODEL);
    expect(degreeInput().value).toBe('10');
    expect(functionSelect().value).toBe('runge');
    expect(ruleSelect().value).toBe('equispaced');
    expect(errorSwitch().checked).toBe(true);
    expect(readout('grid-max')).toBe('1,916');
    expect(box(graph)[0]).toBeCloseTo(-1.25, 6);
    expect(box(graph)[1]).toBeCloseTo(2.5, 6);
    expect(graph.ownedObjects()).toBe(baseline);
});

test('Preset round trip: the exported model is imported back with the same state and the same board', () => {
    const {graph} = mount();
    setDegree(15);
    setRule('chebyshev');
    act(() => { fireEvent.click(semicircleSwitch()); });
    const exported = graph.exportPreset();
    const gridMax = readout('grid-max');
    const [, , p] = graph.longCurves();
    const pBefore = [...p.y];
    expect(exported.data).toEqual({functionId: 'runge', degree: 15, nodeRule: 'chebyshev', showError: true, showSemicircle: true});
    act(() => { graph.importPreset({id: 'default', data: DEFAULT_RUNGE_MODEL}); });
    expect(graph.modelNow()).toEqual(DEFAULT_RUNGE_MODEL);
    expect(readout('grid-max')).toBe('1,916');
    act(() => { graph.importPreset({...exported, id: 'stored'}); });
    expect(graph.modelNow()).toEqual(exported.data);
    expect(degreeInput().value).toBe('15');
    expect(ruleSelect().value).toBe('chebyshev');
    expect(semicircleSwitch().checked).toBe(true);
    expect(readout('grid-max')).toBe(gridMax);
    expect(graph.longCurves()[2].y).toEqual(pBefore);
    // through the file importer too (stored Preset collection key interp-runge)
    const file = JSON.stringify({'preset-interp-runge': {data: [{id: 'Ena', data: exported.data}]}});
    commitPresetImport(preflightPresetImport(file));
    expect(JSON.parse(localStorage.getItem('preset-interp-runge')!).data[0].data).toEqual(exported.data);
});

const validData = {functionId: 'runge', degree: 10, nodeRule: 'equispaced', showError: true, showSemicircle: false};
const filePreset = (data: unknown) => JSON.stringify({'preset-interp-runge': {data: [{id: 'Napaka', data}]}});

test.each([
    [{...validData, degree: 41}, /degree.*1.*40/],
    [{...validData, degree: 0}, /degree.*1.*40/],
    [{...validData, degree: 2.5}, /degree.*1.*40/],
    [{...validData, degree: '10'}, /degree.*1.*40/],
    [{...validData, functionId: 'cos'}, /functionId.*runge, abs, sine/],
    [{...validData, nodeRule: 'random'}, /nodeRule.*equispaced, chebyshev/],
    [{...validData, showError: 'yes'}, /showError.*true.*false/],
])('an invalid imported file is rejected with an actionable message and nothing is written: %j', (data, expected) => {
    expect(() => preflightPresetImport(filePreset(data))).toThrow(LocalizedError);
    expect(() => preflightPresetImport(filePreset(data))).toThrow(expected);
    expect(() => preflightPresetImport(filePreset(data))).not.toThrow(/invalid function data|neveljavni podatki funkcije/);
    expect(localStorage.length).toBe(0);
});

test('a live language switch updates the board text and the labels', () => {
    const {graph} = mount();
    expect(graph.captionPlainLines().join('\n')).toMatch(/Največja napaka na mreži: 1,916 pri x = −?0,9402/);
    expect(graph.captionPlainLines().join('\n')).toMatch(/Enakomerno razporejene točke/);
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(graph.captionPlainLines().join('\n')).toMatch(/Grid maximum of the error: 1\.916 at x = −?0\.9402/);
    expect(graph.captionPlainLines().join('\n')).toMatch(/Equispaced nodes/);
    expect(screen.getByLabelText(/^Degree n$/)).toBeInTheDocument();
    expect(readout('grid-max')).toBe('1.916');
    act(() => { setLanguage('sl'); });
    expect(graph.captionPlainLines().join('\n')).toMatch(/Enakomerno razporejene točke/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('dispose removes the owned board objects and the language listener', () => {
    const {graph, unmount} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(40);
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    unmount();
    expect(graph.ownedObjects()).toBe(0);
    update.mockClear();
    act(() => { setLanguage('en'); });
    expect(update).not.toHaveBeenCalled();
});
