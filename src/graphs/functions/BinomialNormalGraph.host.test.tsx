import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {BinomialNormalGraph} from './BinomialNormalGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {BINOMIAL_NORMAL_N_MAX, checkBinomialNormalModel, DEFAULT_BINOMIAL_NORMAL_MODEL, fitBinomialNormalView} from '../../analysis/binomialNormalModel';
import {DomainError} from './BaseFunctionGraph';
import {LessonAction} from '../../learning/model';
import {functionPresetCollections} from './functionPresetCollections';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

type BoardObject = {
    elType?: string; dataX?: number[]; dataY?: number[]; X(): number; Y(): number; moveTo(to: number[]): void;
    triggerEventHandlers(names: string[], args: unknown[]): void;
};

class ObservedBinomialNormalGraph extends BinomialNormalGraph {
    modelNow() { return this.model; }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    objects() { return this.board.objectsList as unknown as BoardObject[]; }
    handleK() { return this.pointK as unknown as BoardObject; }
    /** The curves in creation order: shaded bars, normal area, bar outline, normal density, Poisson bars. */
    curves() { return this.objects().filter(object => object.elType === 'curve'); }
    normalArea() { return this.curves()[1]; }
    poissonCurve() { return this.curves()[4]; }
    dragK(x: number) {
        const handle = this.handleK();
        act(() => { handle.moveTo([x, 0]); handle.triggerEventHandlers(['drag'], []); });
    }
    callSetP(value: unknown) { this.setP(value); }
    lesson(action: LessonAction) { act(() => { this.applyLessonAction(action); }); }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const field = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const typeIn = (label: RegExp, value: number) => act(() => {
    fireEvent.change(field(label), {target: {value: String(value)}});
    fireEvent.keyDown(field(label), {key: 'Enter'});
});
const N_FIELD = /^Število poskusov n, vrednost$/;
const typeN = (value: number) => typeIn(N_FIELD, value);
const typeP = (value: number) => typeIn(/^Natančna vrednost p$/, value);
const K_FIELD = /^Meja k \(P\(X ≤ k\)\)$/;
const typeK = (value: number) => typeIn(K_FIELD, value);
const kField = () => field(K_FIELD);
const exampleSelect = () => screen.getByLabelText(/^Primer$/) as HTMLSelectElement;
const choose = (id: string) => act(() => { fireEvent.change(exampleSelect(), {target: {value: id}}); });
const toggle = (label: RegExp) => act(() => { fireEvent.click(screen.getByLabelText(label)); });
const correctionSwitch = /^Popravek za zveznost/;
const poissonSwitch = /^Poissonovi stolpci$/;
const READOUTS = ['exact', 'corrected', 'uncorrected', 'poisson', 'error-corrected', 'error-uncorrected', 'error-poisson'];
const readouts = () => READOUTS.map(id => readout(id));
const mount = () => {
    const graph = new ObservedBinomialNormalGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return {graph, ...view};
};

/** Oracles from integer binomial sums, never from the model under test. */
const binomialCdf = (n: number, p: number, k: number) => {
    let sum = 0;
    for (let j = 0; j <= k; j++) {
        let coefficient = 1;
        for (let i = 1; i <= j; i++) coefficient = coefficient * (n - j + i) / i;
        sum += coefficient * p ** j * (1 - p) ** (n - j);
    }
    return sum;
};
const poissonCdf = (lambda: number, k: number) => {
    let term = Math.exp(-lambda);
    let sum = term;
    for (let j = 1; j <= k; j++) { term *= lambda / j; sum += term; }
    return sum;
};
const comma = (value: number) => value.toFixed(5).replace('.', ',');

test('defaults: B(20; 1/2), k = 8 reads 0,25172 / 0,25117 / 0,18555 in Slovenian and with points in English', () => {
    const {graph} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_BINOMIAL_NORMAL_MODEL);
    expect(readout('exact')).toBe('0,25172');
    expect(readout('corrected')).toBe('0,25117');
    expect(readout('uncorrected')).toBe('0,18555');
    expect(readout('poisson')).toBe(comma(poissonCdf(10, 8)));
    expect(readout('error-corrected')).toBe('0,00055');
    expect(readout('error-uncorrected')).toBe('0,06618');
    expect(graph.captionPlainLines().join('\n')).toMatch(/B\(20; 0,5\)/);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    act(() => { setLanguage('en'); });
    expect(readout('exact')).toBe('0.25172');
    expect(readout('corrected')).toBe('0.25117');
    expect(readout('uncorrected')).toBe('0.18555');
    expect(readout('error-uncorrected')).toBe('0.06618');
    expect(graph.captionPlainLines().join('\n')).toMatch(/B\(20, 0\.5\)/);
});

describe('edits through the inspector', () => {
    test('the fair100 example reads 0,1841 / 0,18406 / 0,15866 and moves the view', () => {
        const {graph} = mount();
        const before = [...graph.liveBoard().getBoundingBox()];
        choose('fair100');
        expect(graph.modelNow()).toEqual({n: 100, p: 0.5, k: 45, correction: true, poisson: false});
        expect([readout('exact'), readout('corrected'), readout('uncorrected')]).toEqual(['0,1841', '0,18406', '0,15866']);
        expect(graph.liveBoard().getBoundingBox()).not.toEqual(before);
        expect(graph.handleK().X()).toBe(45);
    });

    test('the fit-view button refits the view after the user changed it', () => {
        const {graph} = mount();
        const fitted = [...graph.liveBoard().getBoundingBox()];
        act(() => { graph.liveBoard().setBoundingBox([-50, 5, 50, -5], false); });
        expect(graph.liveBoard().getBoundingBox()).not.toEqual(fitted);
        act(() => { fireEvent.click(document.querySelector('[data-action="fit-view"]')!); });
        expect(graph.liveBoard().getBoundingBox()).toEqual(fitted);
    });

    test('the rare example turns the Poisson overlay on: the Poisson curve has data with it on and none with it off', () => {
        const {graph} = mount();
        expect(graph.poissonCurve().dataX).toHaveLength(0);
        choose('rare');
        expect(graph.modelNow().poisson).toBe(true);
        expect(graph.poissonCurve().dataX!.length).toBeGreaterThan(0);
        expect(graph.poissonCurve().dataY!.length).toBeGreaterThan(0);
        toggle(poissonSwitch);
        expect(graph.modelNow().poisson).toBe(false);
        expect(graph.poissonCurve().dataX).toHaveLength(0);
    });

    test('the correction switch moves the end of the normal area from k + 1/2 to k and leaves the exact readout alone', () => {
        const {graph} = mount();
        const end = () => { const x = graph.normalArea().dataX!; return x[x.length - 1]; };
        expect(end()).toBeCloseTo(8.5, 10);
        const exact = readout('exact');
        toggle(correctionSwitch);
        expect(graph.modelNow().correction).toBe(false);
        expect(end()).toBeCloseTo(8, 10);
        expect(readout('exact')).toBe(exact);
        toggle(correctionSwitch);
        expect(end()).toBeCloseTo(8.5, 10);
    });

    test.each([0, 1])('typing p = %d is refused: model and readouts stay and the hint names the zero variance', value => {
        const {graph} = mount();
        const model = graph.modelNow();
        const shown = readouts();
        typeP(value);
        expect(graph.modelNow()).toBe(model);
        expect(readouts()).toEqual(shown);
        expect(document.querySelector('.number-input-hint')?.textContent).toMatch(/varianca nič/);
        expect(() => graph.callSetP(value)).toThrow(/varianca nič/);
    });

    test('lowering n below k moves k to n in the model, the k field and the point', () => {
        const {graph} = mount();
        typeN(5);
        expect(graph.modelNow()).toMatchObject({n: 5, k: 5});
        expect(kField().value).toBe('5');
        expect(graph.handleK().X()).toBe(5);
        expect(readout('exact')).toBe('1');
    });

    test('typing k updates the point and the readout', () => {
        const {graph} = mount();
        typeK(11);
        expect(graph.modelNow().k).toBe(11);
        expect(graph.handleK().X()).toBe(11);
        expect(readout('exact')).toBe(comma(binomialCdf(20, 0.5, 11)));
    });
});

describe('dragging the point k', () => {
    test('x = 11.4 rounds to k = 11 and the exact readout is P(X <= 11) of B(20; 1/2)', () => {
        const {graph} = mount();
        graph.dragK(11.4);
        expect(graph.modelNow().k).toBe(11);
        expect(comma(binomialCdf(20, 0.5, 11))).toBe('0,74828');
        expect(readout('exact')).toBe('0,74828');
        expect(kField().value).toBe('11');
    });

    test('dragging beyond n clamps to n', () => {
        const {graph} = mount();
        graph.dragK(35);
        expect(graph.modelNow().k).toBe(20);
        expect(graph.handleK().X()).toBe(20);
        expect(readout('exact')).toBe('1');
        graph.dragK(-4);
        expect(graph.modelNow().k).toBe(0);
    });
});

test('the board object count does not depend on n, with the Poisson overlay on or off', () => {
    const {graph} = mount();
    const counts: number[] = [];
    const lists: number[] = [];
    for (const poisson of [false, true]) {
        for (const n of [20, 1000]) {
            if (graph.modelNow().poisson !== poisson) toggle(poissonSwitch);
            typeN(n);
            expect(graph.modelNow()).toMatchObject({n, poisson});
            counts.push(graph.ownedObjects());
            lists.push(graph.objects().length);
        }
    }
    expect(counts).toEqual(Array(4).fill(counts[0]));
    expect(lists).toEqual(Array(4).fill(lists[0]));
});

test('Reset restores the default model, the controls and the readouts', async () => {
    const {graph} = mount();
    const baseline = graph.ownedObjects();
    const shown = readouts();
    choose('rare');
    toggle(correctionSwitch);
    graph.dragK(1);
    await settle(() => graph.reset());
    expect(graph.modelNow()).toEqual(DEFAULT_BINOMIAL_NORMAL_MODEL);
    expect(kField().value).toBe('8');
    expect(exampleSelect().value).toBe('fair20');
    expect((screen.getByLabelText(correctionSwitch) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(poissonSwitch) as HTMLInputElement).checked).toBe(false);
    expect(readouts()).toEqual(shown);
    expect(graph.handleK().X()).toBe(8);
    expect(graph.ownedObjects()).toBe(baseline);
});

describe('Presets', () => {
    const fileWith = (data: object) => JSON.stringify({'preset-prob-binomial-normal': {data: [{id: 'Primer', data}]}});

    test('round trip: save, change, restore gives back n, p, k and the flags; the exported state passes the checks', () => {
        const {graph} = mount();
        choose('rare');
        graph.dragK(4);
        toggle(correctionSwitch);
        const saved = {n: 100, p: 0.02, k: 4, correction: false, poisson: true};
        const exported = graph.exportPreset();
        expect(exported.data).toEqual(saved);
        expect(checkBinomialNormalModel(exported.data).ok).toBe(true);
        expect(functionPresetCollections['prob-binomial-normal'].checkGraphState?.(exported.graphState)).toBeUndefined();
        const shown = readouts();
        choose('fair100');
        toggle(poissonSwitch);
        expect(graph.modelNow()).not.toEqual(saved);
        act(() => { graph.importPreset({...exported, id: 'stored'}); });
        expect(graph.modelNow()).toEqual(saved);
        expect(graph.handleK().X()).toBe(4);
        expect(readouts()).toEqual(shown);
        expect((screen.getByLabelText(correctionSwitch) as HTMLInputElement).checked).toBe(false);
        commitPresetImport(preflightPresetImport(fileWith(exported.data as object)));
        expect(JSON.parse(localStorage.getItem('preset-prob-binomial-normal')!).data[0].data).toEqual(saved);
    });

    const ok = {n: 20, p: 0.5, k: 8, correction: true, poisson: false};
    const withoutFlag = {n: 20, p: 0.5, k: 8, correction: true};
    test.each([
        ['p = 0', {...ok, p: 0}, /p.*0 ali 1/],
        ['p = 1.2', {...ok, p: 1.2}, /p.*med 0 in 1/],
        ['n = 0', {...ok, n: 0}, /n.*celo število od 1/],
        ['k > n', {...ok, k: 21}, /k.*od 0 do n = 20/],
        ['missing flag', withoutFlag, /poisson.*true ali false/],
    ])('an out-of-domain file (%s) is rejected with an actionable message and nothing is written', (_name, data, expected) => {
        expect(() => preflightPresetImport(fileWith(data))).toThrow(LocalizedError);
        expect(() => preflightPresetImport(fileWith(data))).toThrow(expected);
        expect(() => preflightPresetImport(fileWith(data))).not.toThrow(/neveljavni podatki funkcije|invalid function data/);
        expect(localStorage.length).toBe(0);
    });
});

describe('live region', () => {
    const region = () => document.querySelector('[role="status"][aria-live="polite"]');
    const tailNote = () => region()?.querySelector('[data-prob-binomial="poisson-tail"]');

    test('the polite status region exists before any note; B(5; 0.9) with Poisson on adds the tail note inside it, off removes it', () => {
        const {graph} = mount();
        expect(region()).not.toBeNull();
        expect(tailNote()).toBeNull();
        act(() => { graph.importPreset({id: 'x', data: {n: 5, p: 0.9, k: 3, correction: true, poisson: true}}); });
        expect(tailNote()).not.toBeNull();
        expect(tailNote()!.textContent).toMatch(/Poissonova porazdelitev ima nad n še verjetnost/);
        toggle(poissonSwitch);
        expect(tailNote()).toBeNull();
        expect(region()).not.toBeNull();
    });
});

describe('lesson actions (P2)', () => {
    const param = (name: string, value: unknown) => ({kind: 'function-parameter', name, value}) as LessonAction;
    const choice = (name: string, value: unknown) => ({kind: 'function-choice', name, value}) as LessonAction;
    const poissonVisible = (visible: boolean) => ({kind: 'function-visibility', target: 'poisson-bars', visible}) as LessonAction;
    const box = (graph: ObservedBinomialNormalGraph) => [...graph.liveBoard().getBoundingBox()];
    const expectBox = (actual: number[], expected: number[]) => {
        expect(actual).toHaveLength(4);
        expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 6));
    };
    /** Binomial mass from an integer product, independent of the model code. */
    const mass = (n: number, p: number, k: number) => {
        let coefficient = 1;
        for (let i = 1; i <= k; i++) coefficient = coefficient * (n - k + i) / i;
        return coefficient * p ** k * (1 - p) ** (n - k);
    };
    const expectBarsInside = (graph: ObservedBinomialNormalGraph) => {
        const {n, p} = graph.modelNow();
        const mu = n * p, sigma = Math.sqrt(n * p * (1 - p));
        const [left, top, right, bottom] = box(graph);
        for (const x of [Math.round(mu - 4 * sigma), Math.round(mu + 4 * sigma)]) {
            if (x < 0 || x > n) continue;
            expect(x).toBeGreaterThanOrEqual(left); expect(x).toBeLessThanOrEqual(right);
            expect(mass(n, p, x)).toBeLessThanOrEqual(top); expect(mass(n, p, x)).toBeGreaterThanOrEqual(bottom);
        }
    };

    test('one synchronous sequence follows the planned lesson: readouts, correction, n and p refit the view, Poisson bars', async () => {
        const {graph} = mount();
        graph.lesson(choice('binomial-normal-example', 'fair20'));
        graph.lesson(param('binomial-k', 8));
        expect([readout('exact'), readout('corrected')]).toEqual(['0,25172', '0,25117']);
        graph.lesson(choice('binomial-correction', 'off'));
        expect(readout('uncorrected')).toBe('0,18555');
        expect(graph.modelNow().correction).toBe(false);
        graph.lesson(choice('binomial-correction', 'on'));
        expect(graph.modelNow().correction).toBe(true);

        graph.lesson(param('binomial-n', 50));
        expect(graph.modelNow()).toMatchObject({n: 50, p: 0.5, k: 8, correction: true, poisson: false});
        expectBox(box(graph), fitBinomialNormalView(graph.modelNow()));
        expectBarsInside(graph);
        graph.lesson(param('binomial-n', 100));
        expect(graph.modelNow().n).toBe(100);
        expectBox(box(graph), fitBinomialNormalView(graph.modelNow()));
        expectBarsInside(graph);

        graph.lesson(param('binomial-p', 0.02));
        graph.lesson(poissonVisible(true));
        expect(graph.modelNow()).toMatchObject({n: 100, p: 0.02, poisson: true});
        expect(graph.poissonCurve().dataX!.length).toBeGreaterThan(0);
        expect(graph.poissonCurve().dataY!.length).toBeGreaterThan(0);
        expectBox(box(graph), fitBinomialNormalView(graph.modelNow()));
        expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);

        await settle(() => graph.reset());
        expect(graph.modelNow()).toEqual(DEFAULT_BINOMIAL_NORMAL_MODEL);
        expect([readout('exact'), readout('corrected'), readout('uncorrected')]).toEqual(['0,25172', '0,25117', '0,18555']);
        expect(graph.poissonCurve().dataX).toHaveLength(0);
    });

    test('binomial-p alone refits the view to the bars of the new model', () => {
        const {graph} = mount();
        graph.lesson(param('binomial-p', 0.1));
        expect(graph.modelNow().p).toBe(0.1);
        expectBox(box(graph), fitBinomialNormalView(graph.modelNow()));
        expectBarsInside(graph);
    });

    test('B(100; 1/2) with k = 45 reads 0,1841 exact and 0,18406 corrected', () => {
        const {graph} = mount();
        graph.lesson(param('binomial-n', 100));
        graph.lesson(param('binomial-k', 45));
        expect([readout('exact'), readout('corrected')]).toEqual(['0,1841', '0,18406']);
    });

    test('binomial-k and binomial-correction keep a custom view', () => {
        const {graph} = mount();
        act(() => { graph.liveBoard().setBoundingBox([-50, 5, 50, -5], false); });
        const custom = box(graph);
        graph.lesson(param('binomial-k', 12));
        expect(box(graph)).toEqual(custom);
        graph.lesson(choice('binomial-correction', 'off'));
        expect(box(graph)).toEqual(custom);
        expect(graph.modelNow()).toMatchObject({k: 12, correction: false});
    });

    test.each([
        ['n = 0', param('binomial-n', 0)],
        ['n above the maximum', param('binomial-n', BINOMIAL_NORMAL_N_MAX + 1)],
        ['n = 2.5', param('binomial-n', 2.5)],
        ['p = 0', param('binomial-p', 0)],
        ['p = 1', param('binomial-p', 1)],
        ['k above n', param('binomial-k', 21)],
        ['k = -1', param('binomial-k', -1)],
        ['correction maybe', choice('binomial-correction', 'maybe')],
        ['example unknown', choice('binomial-normal-example', 'unknown')],
    ])('refuses %s with a DomainError and leaves the model and the view alone', (_name, action) => {
        const {graph} = mount();
        const before = graph.modelNow();
        const view = box(graph);
        let error: unknown;
        try { graph.lesson(action); } catch (caught) { error = caught; }
        expect(error).toBeInstanceOf(DomainError);
        expect(graph.modelNow()).toEqual(before);
        expect(box(graph)).toEqual(view);
        expect(readout('exact')).toBe('0,25172');
    });

    test('the lesson model accepts the new names', async () => {
        const model = await import('../../learning/model');
        expect(model.FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['binomial-n', 'binomial-p', 'binomial-k']));
        expect(model.FUNCTION_VISIBILITY_TARGETS).toEqual(expect.arrayContaining(['poisson-bars']));
        expect(model.FUNCTION_CHOICE_NAMES).toEqual(expect.arrayContaining(['binomial-normal-example', 'binomial-correction']));
        expect(model.FUNCTION_CHOICE_VALUES['binomial-correction']).toEqual(['on', 'off']);
        expect(model.FUNCTION_CHOICE_VALUES['binomial-normal-example']).toEqual(['fair20', 'fair100', 'rare']);
    });
});
