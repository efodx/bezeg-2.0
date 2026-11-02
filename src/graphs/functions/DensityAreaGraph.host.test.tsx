import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {DensityAreaGraph} from './DensityAreaGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {LessonAction, UnsupportedLessonActionError} from '../../learning/model';
import {DomainError} from './BaseFunctionGraph';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {fitDensityView, DEFAULT_DENSITY_AREA_MODEL, DENSITY_EXAMPLES, DENSITY_FILL_STRIPS} from '../../analysis/densityAreaModel';
import {normalPdf} from '../../analysis/distributions';
import {functionPresetCollections} from './functionPresetCollections';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

type BoardObject = {
    elType?: string; dataX?: number[]; dataY?: number[]; X(): number; Y(): number; moveTo(to: number[]): void;
    triggerEventHandlers(names: string[], args: unknown[]): void;
};

class ObservedDensityAreaGraph extends DensityAreaGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    objects() { return this.board.objectsList as unknown as BoardObject[]; }
    handle(which: 'a' | 'b') { return (which === 'a' ? this.pointA : this.pointB) as unknown as BoardObject; }
    /** The filled area: the curve whose point list is the closed polygon of the strips. */
    fills() { return this.objects().filter(object => object.elType === 'curve' && object.dataX?.length === DENSITY_FILL_STRIPS + 4); }
    drag(which: 'a' | 'b', x: number) {
        const handle = this.handle(which);
        act(() => { handle.moveTo([x, 0]); handle.triggerEventHandlers(['drag'], []); });
    }
    set(name: 'mu' | 'sigma', value: unknown) { act(() => { if (name === 'mu') this.setMu(value); else this.setSigma(value); }); }
    lesson(action: LessonAction) { act(() => { this.applyLessonAction(action); }); }
    callSetSigma(value: unknown) { this.setSigma(value); }
    callSetBound(which: 'a' | 'b', value: unknown) { this.setBound(which, value); }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const field = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const typeIn = (label: RegExp, value: number) => act(() => {
    fireEvent.change(field(label), {target: {value: String(value)}});
    fireEvent.keyDown(field(label), {key: 'Enter'});
});
const typeA = (value: number) => typeIn(/^Leva meja a$|^Left end a$/, value);
const typeB = (value: number) => typeIn(/^Desna meja b$|^Right end b$/, value);
const slider = (label: RegExp) => screen.getByLabelText(label, {selector: 'input[type="range"]'}) as HTMLInputElement;
const exampleSelect = () => screen.getByLabelText(/^Primer$|^Example$/) as HTMLSelectElement;
const status = () => document.querySelector('[data-prob-density="status"]')?.textContent;
const mount = () => {
    const graph = new ObservedDensityAreaGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, ...view};
};

test('defaults: N(0, 1) with a = -1, b = 1 reads 68,27 %, z from -1 to 1, with two gliders on the axis and one filled area', () => {
    const {graph} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_DENSITY_AREA_MODEL);
    expect(readout('area-percent')).toBe('68,27');
    expect(readout('area')).toBe('0,68269');
    expect(readout('za')).toBe('−1');
    expect(readout('zb')).toBe('1');
    expect([graph.handle('a').X(), graph.handle('a').Y(), graph.handle('b').X(), graph.handle('b').Y()]).toEqual([-1, 0, 1, 0]);
    expect(graph.fills()).toHaveLength(1);
    expect(status()).toBeUndefined();
    expect(document.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
    const caption = graph.captionPlainLines().join('\n');
    expect(caption).toMatch(/N\(0; 1²\)/);
    expect(caption).toMatch(/Ploščina pod gostoto med a in b: 68,27 %/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('the spec value for N(100, 15): typing mu, sigma, a and b reads 81,86 % (0,81859), z = -1 and 2; English uses the decimal point', () => {
    const {graph} = mount();
    graph.set('mu', 100);
    graph.set('sigma', 15);
    typeA(85);
    typeB(130);
    expect(graph.modelNow()).toEqual(DENSITY_EXAMPLES.iq);
    expect(readout('area-percent')).toBe('81,86');
    expect(readout('area')).toBe('0,81859');
    expect(readout('za')).toBe('−1');
    expect(readout('zb')).toBe('2');
    expect(graph.handle('b').X()).toBe(130);
    act(() => { setLanguage('en'); });
    expect(readout('area')).toBe('0.81859');
    expect(graph.captionPlainLines().join('\n')).toMatch(/Area under the density between a and b: 81\.86 %/);
});

test('the area within mu +- sigma stays 68,27 % while the sliders change mu and sigma', () => {
    const {graph} = mount();
    for (const [mu, sigma] of [[0, 2.5], [40, 0.7], [-120, 18], [100, 15]]) {
        act(() => { fireEvent.change(slider(/^Povprečje μ$/), {target: {value: String(mu)}}); });
        act(() => { fireEvent.change(slider(/^Standardni odklon σ$/), {target: {value: String(sigma)}}); });
        typeA(mu - sigma);
        typeB(mu + sigma);
        expect(graph.modelNow()).toEqual({mu, sigma, a: mu - sigma, b: mu + sigma});
        expect(readout('area-percent'), `${mu},${sigma}`).toBe('68,27');
        expect(readout('za')).toBe('−1');
        expect(readout('zb')).toBe('1');
    }
});

test('the sliders refuse nothing inside the range and the model refuses sigma <= 0, non-finite and out-of-range values with a message', () => {
    const {graph} = mount();
    const before = graph.modelNow();
    for (const bad of [0, -1, NaN, Infinity, 'x', 0.05, 25]) {
        expect(() => graph.callSetSigma(bad), String(bad)).toThrow(DomainError);
    }
    expect(() => graph.callSetSigma(0)).toThrow(/Standardni odklon σ mora biti število med 0,1 in 20/);
    for (const bad of [NaN, Infinity, 401, -401]) expect(() => graph.callSetBound('a', bad), String(bad)).toThrow(DomainError);
    expect(graph.modelNow()).toBe(before);
    act(() => { setLanguage('en'); });
    expect(() => graph.callSetSigma(-2)).toThrow(/standard deviation σ must be a number between 0\.1 and 20/i);
});

test('dragging an end snaps to 0.01, keeps the glider on the axis and moves the readouts and the fill', () => {
    const {graph} = mount();
    graph.drag('b', 1.2349);
    expect(graph.modelNow().b).toBe(1.23);
    expect(graph.handle('b').X()).toBe(1.23);
    expect(graph.handle('b').Y()).toBe(0);
    expect(readout('area-percent')).toBe('73,2');
    graph.drag('a', -0.5051);
    expect(graph.modelNow().a).toBe(-0.51);
    expect(Math.max(...graph.fills()[0].dataX!)).toBe(1.23);
    expect(Math.min(...graph.fills()[0].dataX!)).toBe(-0.51);
    // the ends are limited to the documented range
    graph.drag('b', 9999);
    expect(graph.modelNow().b).toBe(400);
});

test('a > b: probability 0, a status text, nothing filled and nothing broken', () => {
    const {graph} = mount();
    graph.drag('a', 1.5);
    expect(graph.modelNow()).toMatchObject({a: 1.5, b: 1});
    expect(readout('area-percent')).toBe('0');
    expect(readout('area')).toBe('0');
    expect(status()).toMatch(/Meja a je večja od meje b: interval je prazen/);
    // The live region exists before and after the message, so screen readers announce the change.
    expect(document.querySelector('[role="status"][aria-live="polite"] [data-prob-density="status"]')).not.toBeNull();
    expect(graph.fills()).toHaveLength(0);
    expect(graph.captionPlainLines().join('\n')).toMatch(/interval je prazen/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    graph.drag('a', -1);
    expect(status()).toBeUndefined();
    expect(graph.fills()).toHaveLength(1);
});

test('a = b: probability 0 and the status says a single value has probability 0 for a continuous variable', () => {
    const {graph} = mount();
    typeA(0.5);
    typeB(0.5);
    expect(readout('area-percent')).toBe('0');
    expect(status()).toMatch(/a = b: nad eno samo točko je ploščina pod gostoto 0\. Pri zvezni spremenljivki ima posamezna vrednost verjetnost 0/);
    expect(graph.fills()).toHaveLength(0);
    act(() => { setLanguage('en'); });
    expect(status()).toMatch(/single value has probability 0/);
});

test('a very thin interval gets a note and its tiny area', () => {
    mount();
    typeA(0);
    typeB(0.01);
    expect(status()).toMatch(/zelo ozek \(manj kot 2 % standardnega odklona\)/);
    expect(readout('area-percent')).toBe('0,3989');
});

test('a very wide interval reads 100 %, and the far tail P(Z > 6) is not rounded to 0', () => {
    const {graph} = mount();
    const objects = graph.ownedObjects();
    typeA(-400);
    typeB(400);
    expect(readout('area-percent')).toBe('100');
    expect(readout('area')).toBe('1');
    expect(graph.fills()).toHaveLength(1);
    expect(graph.ownedObjects()).toBe(objects);
    typeA(6);
    expect(readout('area-percent')).toBe('9,866·10⁻⁸');
    expect(readout('area')).toBe('9,8659·10⁻¹⁰');
    expect(readout('za')).toBe('6');
});

test('wording: readouts speak of the area under the density and never of the probability of a point', () => {
    mount();
    expect(document.body.textContent).toMatch(/Ploščina pod gostoto med a in b/);
    expect(document.body.textContent).not.toMatch(/verjetnost točke|verjetnost točke a/i);
    act(() => { setLanguage('en'); });
    expect(document.body.textContent).toMatch(/Area under the density between a and b/);
    expect(document.body.textContent).not.toMatch(/probability of the point/i);
});

test('the examples set mu, sigma, a, b and the view; fit-to-curve rescales the view to the current mu and sigma', () => {
    const {graph} = mount();
    expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(-4, 6);
    act(() => { fireEvent.change(exampleSelect(), {target: {value: 'iq'}}); });
    expect(graph.modelNow()).toEqual(DENSITY_EXAMPLES.iq);
    expect(readout('area')).toBe('0,81859');
    const [left, , right] = graph.liveBoard().getBoundingBox();
    expect([left, right]).toEqual([40, 160]);
    expect(graph.handle('a').X()).toBe(85);
    // a custom curve is not an example; the view stays until fit-to-curve
    graph.set('sigma', 5);
    expect(exampleSelect().value).toBe('custom');
    expect(graph.liveBoard().getBoundingBox()[0]).toBe(40);
    act(() => { fireEvent.click(screen.getByRole('button', {name: /^Prilagodi pogled krivulji$/})); });
    const [fitLeft, top, fitRight] = graph.liveBoard().getBoundingBox();
    expect([fitLeft, fitRight]).toEqual([80, 120]);
    expect(top).toBeGreaterThan(0.0798);
});

test('Reset restores the defaults, the fields, the readouts, the view and the board objects', async () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    act(() => { fireEvent.change(exampleSelect(), {target: {value: 'iq'}}); });
    graph.drag('b', 140);
    await settle(() => graph.reset());
    expect(graph.modelNow()).toEqual(DEFAULT_DENSITY_AREA_MODEL);
    expect(field(/^Leva meja a$/).value).toBe('−1');
    expect(field(/^Desna meja b$/).value).toBe('1');
    expect(readout('area-percent')).toBe('68,27');
    expect(graph.handle('b').X()).toBe(1);
    expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(-4, 6);
    expect(exampleSelect().value).toBe('standard');
    expect(graph.ownedObjects()).toBe(baseline);
});

describe('Presets', () => {
    const fileWith = (preset: object) => JSON.stringify({'preset-prob-density': {data: [{id: 'Primer', ...preset}]}});

    test('round trip: the exported Preset (model, scene state and view) passes the collection contract and imports back to the same state', () => {
        const {graph} = mount();
        act(() => { fireEvent.change(exampleSelect(), {target: {value: 'iq'}}); });
        graph.drag('b', 128.5);
        const exported = graph.exportPreset();
        expect(exported.data).toEqual({mu: 100, sigma: 15, a: 85, b: 128.5});
        // the whole exported Preset, as the file importer sees it: graphState and boardState included
        const collection = functionPresetCollections['prob-density'];
        expect(collection.checkGraphState?.(exported.graphState)).toBeUndefined();
        const percent = readout('area-percent');
        act(() => { graph.importPreset({id: 'default', data: DEFAULT_DENSITY_AREA_MODEL}); });
        expect(graph.modelNow()).toEqual(DEFAULT_DENSITY_AREA_MODEL);
        expect(graph.handle('b').X()).toBe(1);
        act(() => { graph.importPreset({...exported, id: 'stored'}); });
        expect(graph.modelNow()).toEqual(exported.data);
        expect(graph.handle('b').X()).toBe(128.5);
        expect(readout('area-percent')).toBe(percent);
        commitPresetImport(preflightPresetImport(fileWith(exported)));
        expect(JSON.parse(localStorage.getItem('preset-prob-density')!).data[0].data).toEqual(exported.data);
    });

    test('a Preset with data but no view shows the curve fitted: the view follows an imported mu and sigma', () => {
        const {graph} = mount();
        act(() => { graph.importPreset({id: 'iq', data: DENSITY_EXAMPLES.iq}); });
        const [left, , right] = graph.liveBoard().getBoundingBox();
        expect([left, right]).toEqual([40, 160]);
    });

    test.each([
        [{mu: 0, sigma: 0, a: -1, b: 1}, /sigma.*0,1.*20/],
        [{mu: 0, sigma: -3, a: -1, b: 1}, /sigma.*0,1.*20/],
        [{mu: 0, sigma: null, a: -1, b: 1}, /sigma.*0,1.*20/],
        [{mu: 'x', sigma: 1, a: -1, b: 1}, /mu.*200/],
        [{mu: 201, sigma: 1, a: -1, b: 1}, /mu.*200/],
        [{mu: 0, sigma: 1, a: 401, b: 1}, /a.*400/],
        [{mu: 0, sigma: 1, a: -1, b: null}, /b.*400/],
    ])('an invalid imported file is rejected with a message naming the field and nothing is written: %j', (data, expected) => {
        expect(() => preflightPresetImport(fileWith({data}))).toThrow(LocalizedError);
        expect(() => preflightPresetImport(fileWith({data}))).toThrow(expected);
        expect(() => preflightPresetImport(fileWith({data}))).not.toThrow(/neveljavni podatki funkcije|invalid function data/);
        expect(localStorage.length).toBe(0);
    });

    test('a file may hold a > b (an empty interval); it is valid and imports', () => {
        commitPresetImport(preflightPresetImport(fileWith({data: {mu: 0, sigma: 1, a: 2, b: -2}})));
        expect(JSON.parse(localStorage.getItem('preset-prob-density')!).data[0].data).toEqual({mu: 0, sigma: 1, a: 2, b: -2});
    });

    test('the same rejection is worded in English', () => {
        setLanguage('en');
        expect(() => preflightPresetImport(fileWith({data: {mu: 0, sigma: 0, a: -1, b: 1}}))).toThrow(/sigma field must be a number between 0\.1 and 20/);
    });
});

test('a live language switch updates the board text, the labels and the readouts and keeps the state', () => {
    const {graph} = mount();
    graph.drag('b', 2);
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    act(() => { setLanguage('en'); });
    expect(update).toHaveBeenCalled();
    expect(graph.captionPlainLines().join('\n')).toMatch(/X ∼ N\(0, 1²\)/);
    expect(screen.getByLabelText(/^Left end a$/, {selector: 'input:not([type="range"])'})).toBeTruthy();
    expect(graph.modelNow().b).toBe(2);
    act(() => { setLanguage('sl'); });
    expect(graph.captionPlainLines().join('\n')).toMatch(/N\(0; 1²\)/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('dispose removes the owned board objects, and a later drag, edit or language change touches no board', () => {
    const {graph, unmount} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(3);
    const update = vi.spyOn(graph as unknown as { boardUpdate: () => void }, 'boardUpdate');
    unmount();
    expect(graph.ownedObjects()).toBe(0);
    expect(graph.handle('a')).toBeUndefined();
    update.mockClear();
    act(() => { setLanguage('en'); });
    expect(update).not.toHaveBeenCalled();
    expect(() => graph.callSetBound('b', 3)).not.toThrow();
    expect(() => graph.callSetSigma(2)).not.toThrow();
    expect(update).not.toHaveBeenCalled();
});

describe('lesson actions (P1)', () => {
    const param = (name: string, value: unknown) => ({kind: 'function-parameter', name, value}) as LessonAction;
    const example = (value: unknown) => ({kind: 'function-choice', name: 'density-example', value}) as LessonAction;

    test('one synchronous sequence of example, bound and parameter actions moves the model, the readout and the board', async () => {
        const {graph} = mount();
        graph.lesson(example('iq'));
        graph.lesson(param('density-a', 85));
        graph.lesson(param('density-b', 130));
        expect(graph.modelNow()).toEqual({mu: 100, sigma: 15, a: 85, b: 130});
        expect(readout('area-percent')).toBe('81,86');
        expect(readout('area')).toBe('0,81859');
        expect(graph.handle('b').X()).toBe(130);
        expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(40, 6);

        graph.lesson(example('standard'));
        graph.lesson(param('density-a', -1));
        graph.lesson(param('density-b', 1));
        expect(readout('area')).toBe('0,68269');
        expect(graph.liveBoard().getBoundingBox()[0]).toBeCloseTo(-4, 6);

        graph.lesson(param('density-mu', 1));
        graph.lesson(param('density-sigma', 1.5));
        graph.lesson(param('density-a', -0.5));
        graph.lesson(param('density-b', 2.5));
        expect(graph.modelNow()).toEqual({mu: 1, sigma: 1.5, a: -0.5, b: 2.5});
        expect(readout('area')).toBe('0,68269');
        expect(readout('za')).toBe('−1');

        await settle(() => graph.reset());
        expect(graph.modelNow()).toEqual(DEFAULT_DENSITY_AREA_MODEL);
        expect(readout('area-percent')).toBe('68,27');
        expect(graph.handle('a').X()).toBe(-1);
    });

    test('invalid sigma, mu, bounds and example values are refused with a localized DomainError and change nothing', () => {
        const {graph} = mount();
        graph.lesson(example('iq'));
        const before = graph.modelNow();
        const refuse = (action: LessonAction) => {
            let error: unknown;
            try { graph.lesson(action); } catch (caught) { error = caught; }
            expect(error).toBeInstanceOf(DomainError);
            expect((error as DomainError).message).not.toBe('');
        };
        for (const value of [0, -1, 0.05, 21, NaN, Infinity, '2']) refuse(param('density-sigma', value));
        for (const value of [201, -201, NaN]) refuse(param('density-mu', value));
        for (const value of [401, -401, NaN]) { refuse(param('density-a', value)); refuse(param('density-b', value)); }
        for (const value of ['normal', 'custom', 1, undefined]) refuse(example(value));
        expect(graph.modelNow()).toBe(before);
        expect(readout('area')).toBe('0,81859');
        expect(() => graph.lesson(param('root-x0', 1))).toThrow(UnsupportedLessonActionError);
    });

    test('the N(0; 1) example view holds the peak and mu +- sigma of the curves the lesson shows next', () => {
        const [left, top, right, bottom] = fitDensityView(DENSITY_EXAMPLES.standard);
        for (const [mu, sigma] of [[1, 1.5], [-1, 0.85]]) {
            const peak = normalPdf(mu, mu, sigma);
            for (const [x, y] of [[mu, peak], [mu - sigma, 0], [mu + sigma, 0]]) {
                expect(x).toBeGreaterThanOrEqual(left); expect(x).toBeLessThanOrEqual(right);
                expect(y).toBeGreaterThanOrEqual(bottom); expect(y).toBeLessThanOrEqual(top);
            }
        }
    });
});
