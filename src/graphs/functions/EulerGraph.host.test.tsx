import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {EulerGraph} from './EulerGraph';
import {GraphHost} from '../base/GraphHost';
import {setLanguage} from '../../localization';
import {GraphPalette} from '../styles/GraphPalette';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => setLanguage('sl'));
afterEach(() => vi.restoreAllMocks());

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedEulerGraph extends EulerGraph {
    liveBoard() {
        return this.board;
    }

    modelNow() {
        return this.model;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    /** Sets the end x through the lesson action, the same path a guided scene takes. */
    lessonEnd(value: number) {
        this.applyLessonAction({kind: 'function-parameter', name: 'euler-end', value});
    }

    builds() {
        return this.fieldBuilds;
    }

    curves() {
        return this.board.objectsList.filter((object: any) => object.elType === 'curve') as any[];
    }

    fieldCurves() {
        return this.curves().filter(curve => curve.visProp.strokecolor === GraphPalette.referenceCurve);
    }

    /** The Euler polyline: the primary-colour curve without NaN separators (the node crosses have them). */
    polyline() {
        return this.curves().find(curve => curve.visProp.strokecolor === GraphPalette.primaryCurve && !curve.dataX.some(Number.isNaN))!;
    }

    initialPoint() {
        return this.board.objectsList.find((object: any) => object.elType === 'point' && object.name === '$$P_0$$') as any;
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const statusIds = () => [...document.querySelectorAll('[data-euler-status]')].map(element => element.getAttribute('data-euler-status'));
const boardObjects = (graph: ObservedEulerGraph) => graph.liveBoard().objectsList.length;
/** jsdom gives the board no width, so its view is stubbed to the example's view and the board is redrawn. */
const giveView = (graph: ObservedEulerGraph, box: [number, number, number, number] = [-2, 5, 3.5, -1.5]) => {
    const stub = vi.spyOn(graph.liveBoard(), 'getBoundingBox').mockReturnValue([...box]);
    act(() => { graph.liveBoard().update(); });
    return stub;
};
const mount = () => {
    const graph = new ObservedEulerGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    giveView(graph);
    return {graph, view};
};
const slider = () => screen.getByRole('slider') as HTMLInputElement;
const type = (label: string, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value}}); });
const click = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const texts = (graph: ObservedEulerGraph) => graph.liveBoard().objectsList.filter((object: any) => object.elType === 'text').map((text: any) => String(text.plaintext)).join('|');
const dragTo = (graph: ObservedEulerGraph, x: number, y: number) => {
    const point = graph.initialPoint();
    point.moveTo([x, y]);
    act(() => { point.triggerEventHandlers(['drag'], []); });
};

test('the default scene is the lesson example with exactly one field curve, and the readouts follow the step slider', () => {
    const {graph} = mount();
    expect(graph.state.initialized).toBe(true);
    expect(graph.modelNow()).toMatchObject({example: 'exponential', x0: 0, y0: 1, step: 0.5, xEnd: 1});
    expect(graph.fieldCurves()).toHaveLength(1);
    expect(readout('value')).toBe('2,25');
    expect(readout('exact')).toBe('2,7183');
    expect(readout('error')).toBe('0,4683');
    expect(readout('ratio')).toBe('1,53');
    const baseline = boardObjects(graph);

    act(() => { fireEvent.change(slider(), {target: {value: '2'}}); });
    expect(graph.modelNow().step).toBe(0.25);
    expect(readout('value')).toBe('2,4414');
    expect(readout('error')).toBe('0,2769');
    expect(readout('double-error')).toBe('0,4683');
    expect(readout('ratio')).toBe('1,69');
    act(() => { fireEvent.change(slider(), {target: {value: '3'}}); });
    expect(readout('value')).toBe('2,5658');
    expect(readout('ratio')).toBe('1,82');
    expect(boardObjects(graph)).toBe(baseline);
    expect(graph.fieldCurves()).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('the field has finite marks whose slope is F(x, y); the polyline starts at the initial point', () => {
    const {graph} = mount();
    const {dataX, dataY} = graph.fieldCurves()[0];
    let marks = 0;
    for (let i = 0; i + 1 < dataX.length; i++) {
        if ([dataX[i], dataX[i + 1], dataY[i], dataY[i + 1]].some(Number.isNaN)) continue;
        // y' = y: the slope dy/dx of a mark equals y at its centre
        expect((dataY[i + 1] - dataY[i]) / (dataX[i + 1] - dataX[i])).toBeCloseTo((dataY[i] + dataY[i + 1]) / 2, 6);
        marks++;
    }
    expect(marks).toBeGreaterThan(100);
    expect(marks).toBeLessThanOrEqual(40 * 40);
    const polyline = graph.polyline();
    expect([polyline.dataX[0], polyline.dataY[0]]).toEqual([0, 1]);
    expect([polyline.dataX[1], polyline.dataY[1]]).toEqual([0.5, 1.5]);
});

test('x0 and y0 by number field and by dragging move the polyline and the readouts; the drag does not rebuild the field', () => {
    const {graph} = mount();
    type('Začetni y₀', '2');
    expect(graph.modelNow().y0).toBe(2);
    expect(graph.polyline().dataY[1]).toBe(3);
    expect(readout('value')).toBe('4,5');
    type('Začetni x₀', '0,5');
    expect(graph.modelNow().x0).toBe(0.5);
    expect(readout('steps')).toBe('1');

    // a value that would break the model is refused and the model stays
    type('Začetni y₀', '50');
    expect(graph.modelNow().y0).toBe(2);
    type('Začetni x₀', '2');
    expect(graph.modelNow().x0).toBe(0.5);

    type('Začetni x₀', '0');
    const builds = graph.builds();
    dragTo(graph, 0, 1);
    expect(graph.modelNow()).toMatchObject({x0: 0, y0: 1});
    expect(readout('value')).toBe('2,25');
    dragTo(graph, 0.5, 0.52);
    expect(graph.modelNow()).toMatchObject({x0: 0.5, y0: 0.5});
    expect(graph.polyline().dataX[0]).toBe(0.5);
    expect(graph.builds()).toBe(builds);
});

test('a view change regenerates the field, a drag or a step change does not', () => {
    const {graph} = mount();
    const stub = vi.spyOn(graph.liveBoard(), 'getBoundingBox');
    const builds = graph.builds();
    act(() => { fireEvent.change(slider(), {target: {value: '2'}}); });
    dragTo(graph, 0, 0.5);
    expect(graph.builds()).toBe(builds);
    const before = graph.fieldCurves()[0].dataX.slice();
    stub.mockReturnValue([-4, 8, 6, -3]);
    act(() => { graph.liveBoard().update(); });
    expect(graph.builds()).toBe(builds + 1);
    expect(graph.fieldCurves()[0].dataX).not.toEqual(before);
    expect(graph.fieldCurves()).toHaveLength(1);

    // the same view on a resized board is a new key too (the marks keep their size in pixels)
    const board = graph.liveBoard() as any;
    board.canvasWidth = 900;
    board.canvasHeight = 600;
    act(() => { graph.liveBoard().update(); });
    expect(graph.builds()).toBe(builds + 2);
    act(() => { graph.liveBoard().update(); });
    expect(graph.builds()).toBe(builds + 2);
});

test('the example switch keeps the other fields, changes the equation and the numbers, and keeps one field curve', () => {
    const {graph} = mount();
    const baseline = boardObjects(graph);
    act(() => { fireEvent.change(screen.getByLabelText('Enačba'), {target: {value: 'linear-relaxation'}}); });
    expect(graph.modelNow()).toMatchObject({example: 'linear-relaxation', x0: 0, y0: 1, step: 0.5, xEnd: 1});
    expect(readout('value')).toBe('0,5');
    expect(readout('error')).toBe('0,2358');
    act(() => { fireEvent.change(slider(), {target: {value: '2'}}); });
    expect(readout('value')).toBe('0,6328');
    expect(readout('error')).toBe('0,1029');
    act(() => { fireEvent.change(slider(), {target: {value: '3'}}); });
    expect(readout('value')).toBe('0,6872');
    expect(readout('error')).toBe('0,04854');
    expect(graph.fieldCurves()).toHaveLength(1);
    expect(boardObjects(graph)).toBe(baseline);
});

test('the exact curve toggle hides and shows the dashed curve', () => {
    const {graph} = mount();
    const exact = () => graph.curves().find(curve => curve.visProp.strokecolor === GraphPalette.comparisonCurve);
    expect(exact().evalVisProp('visible')).toBe(true);
    act(() => { fireEvent.click(screen.getByLabelText('Natančna rešitev (črtkano)')); });
    expect(graph.modelNow().showExact).toBe(false);
    expect(exact().evalVisProp('visible')).toBe(false);
    act(() => { fireEvent.click(screen.getByLabelText('Natančna rešitev (črtkano)')); });
    expect(graph.modelNow().showExact).toBe(true);
    expect(exact().evalVisProp('visible')).toBe(true);
});

test('with end x = x0 the single-node polyline is hidden and returns with the first step', () => {
    const {graph} = mount();
    expect(graph.polyline().evalVisProp('visible')).toBe(true);
    act(() => { graph.lessonEnd(0); });
    expect(graph.polyline().dataX).toEqual([0]);
    expect(graph.polyline().evalVisProp('visible')).toBe(false);
    act(() => { graph.lessonEnd(1); });
    expect(graph.polyline().evalVisProp('visible')).toBe(true);
});

test('Next step reveals the polyline one step at a time and Show all restores it', () => {
    const {graph} = mount();
    act(() => { fireEvent.change(slider(), {target: {value: '3'}}); });
    expect(graph.polyline().dataX).toHaveLength(9);
    click('Naslednji korak');
    expect(graph.modelNow().revealed).toBe(1);
    expect(graph.polyline().dataX).toHaveLength(2);
    expect(statusIds()).toEqual(['revealed']);
    click('Naslednji korak');
    expect(graph.polyline().dataX).toHaveLength(3);
    expect(document.querySelector('[data-euler-status="revealed"]')?.textContent).toBe('Prikazan je 2. korak od 8.');
    click('Pokaži vse korake');
    expect(graph.modelNow().revealed).toBeNull();
    expect(graph.polyline().dataX).toHaveLength(9);
    expect(statusIds()).toEqual([]);

    // a new example (or step, start or end) draws a new polyline, shown in full
    click('Naslednji korak');
    expect(graph.modelNow().revealed).toBe(1);
    act(() => { fireEvent.change(screen.getByLabelText('Enačba'), {target: {value: 'linear-relaxation'}}); });
    expect(graph.modelNow().revealed).toBeNull();
    expect(graph.polyline().dataX).toHaveLength(9);
    expect(statusIds()).toEqual([]);
});

test('a blow-up run stops the polyline at the last finite point, says so, and hides the exact value', () => {
    const {graph} = mount();
    act(() => { fireEvent.change(screen.getByLabelText('Enačba'), {target: {value: 'blow-up'}}); });
    type('Končni x', '3');
    const ids = statusIds();
    expect(ids).toContain('no-exact');
    expect(ids.some(id => id === 'left-window' || id === 'non-finite')).toBe(true);
    expect(readout('exact')).toBe('ni');
    expect(readout('error')).toBe('ni');
    const polyline = graph.polyline();
    for (let i = 0; i < polyline.dataX.length; i++) {
        expect(Number.isFinite(polyline.dataX[i])).toBe(true);
        expect(Math.abs(polyline.dataY[i])).toBeLessThanOrEqual(1000);
    }
    expect(polyline.dataX[polyline.dataX.length - 1]).toBeLessThan(3);
    // the readout counts the steps taken, not the planned ones
    expect(readout('steps')).toBe(String(polyline.dataX.length - 1));
    expect(texts(graph)).toContain('izračun se ustavi pri x =');
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
});

test('a live language switch updates board text, labels and readouts', () => {
    const {graph} = mount();
    expect(texts(graph)).toContain('napaka 0,4683');
    act(() => { setLanguage('en'); });
    expect(texts(graph)).toContain('error 0.4683');
    expect(texts(graph)).not.toContain('napaka');
    expect(screen.getByLabelText('Equation')).toBeInTheDocument();
    expect(readout('value')).toBe('2.25');
    act(() => { setLanguage('sl'); });
    expect(readout('value')).toBe('2,25');
});

test('Preset import and Reset restore the controls and the board objects; unmount releases everything', () => {
    const {graph, view} = mount();
    const baseline = boardObjects(graph);
    const stored = {example: 'linear-relaxation', x0: -1, y0: 0.5, step: 0.125, xEnd: 2, showExact: false, revealed: 3};
    act(() => { graph.importPreset({id: 'stored', data: stored, boardState: {boundingBox: [-3, 4, 4, -2]}}); });
    expect(graph.modelNow()).toEqual(stored);
    expect((screen.getByLabelText('Enačba') as HTMLSelectElement).value).toBe('linear-relaxation');
    expect((screen.getByLabelText('Začetni x₀') as HTMLInputElement).value).toBe('−1');
    expect(slider().value).toBe('3');
    expect(graph.initialPoint().X()).toBe(-1);
    expect(graph.polyline().dataX).toHaveLength(4);
    expect(boardObjects(graph)).toBe(baseline);
    expect(graph.fieldCurves()).toHaveLength(1);

    click('Shrani');
    click('Ponastavi prednastavitev');
    click('Uredi');
    expect(graph.modelNow()).toEqual({example: 'exponential', x0: 0, y0: 1, step: 0.5, xEnd: 1, showExact: true, revealed: null});
    expect(slider().value).toBe('1');
    expect(readout('value')).toBe('2,25');
    expect(graph.initialPoint().Y()).toBe(1);
    expect(boardObjects(graph)).toBe(baseline);

    const board = graph.liveBoard();
    const curveIds = graph.curves().map(curve => curve.id);
    expect(curveIds).toHaveLength(4);
    const pointAndTextIds = board.objectsList.filter((object: any) => object.elType === 'point' || object.elType === 'text').map((object: any) => object.id);
    expect(pointAndTextIds).toContain(graph.initialPoint().id);
    expect(board.objectsList.some((object: any) => object.elType === 'text')).toBe(true);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
    // every created curve (the field included), the initial point and the captions are gone from the board's registry
    [...curveIds, ...pointAndTextIds].forEach(id => expect(board.objects[id]).toBeUndefined());
});

test('StrictMode does not duplicate board objects or the field curve', () => {
    const graph = new ObservedEulerGraph();
    const view = render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
    giveView(graph);
    const baseline = boardObjects(graph);
    expect(graph.fieldCurves()).toHaveLength(1);
    act(() => { fireEvent.change(slider(), {target: {value: '2'}}); });
    expect(boardObjects(graph)).toBe(baseline);
    view.unmount();
    expect(graph.ownedObjects()).toBe(0);
});
