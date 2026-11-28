import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CltGraph, CLT_STEP_INTERVAL_MS} from './CltGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {LocalizedError, setLanguage} from '../../localization';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {AnimationScheduler} from '../../learning/runtime/animation';
import {CLT_EXAMPLES, CLT_N_MAX, CltModel, cltView, DEFAULT_CLT_MODEL, fitCltView} from '../../analysis/cltModel';
import {formatNumber} from '../../analysis/format';
import {LessonAction, LessonAnimationCommand} from '../../learning/model';
import {DomainError} from './BaseFunctionGraph';
import {runAs} from '../base/writes/writeSource';
import {functionPresetCollections} from './functionPresetCollections';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size, so its view can be read.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => { setLanguage('sl'); localStorage.clear(); });

function manualScheduler() {
    let nextHandle = 0;
    let time = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => { const handle = nextHandle++; callbacks.set(handle, callback); return handle; },
        cancel: handle => { callbacks.delete(handle); },
    };
    const frame = (elapsed: number) => {
        const entry = callbacks.entries().next().value as [number, FrameRequestCallback] | undefined;
        if (!entry) return false;
        callbacks.delete(entry[0]);
        time += elapsed;
        entry[1](time);
        return true;
    };
    return {scheduler, callbacks, frame};
}

type BoardObject = { elType?: string; dataX?: number[]; dataY?: number[] };

class ObservedCltGraph extends CltGraph {
    modelNow() { return this.model; }
    refuseNow(text: string) { this.refusals.refuse(text); }
    liveBoard() { return this.board; }
    ownedObjects() { return this.generatedObjectCount; }
    playing() { return this.playback.isPlaying; }
    /** The curves in creation order: the standard normal curve, then the standardized n-fold curve. */
    curves() { return (this.board.objectsList as unknown as BoardObject[]).filter(object => object.elType === 'curve'); }
    normalCurve() { return this.curves()[0]; }
    sumCurve() { return this.curves()[1]; }
    lesson(action: LessonAction) { act(() => { this.applyLessonAction(action); }); }
    callNext() { runAs('learner', () => this.nextStep()); }
    callSetN(value: unknown) { runAs('learner', () => this.setN(value)); } // n is a bound puck key: a write names its source
    callSetHeight(index: unknown, value: unknown) { this.setHeight(index, value); }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const status = (id: string) => (id === 'refused'
    ? document.querySelector('.number-input-hint')?.textContent || undefined
    : document.querySelector(`[data-prob-clt-status="${id}"]`)?.textContent);
const notice = () => document.querySelector('[data-refusal-notice]')?.textContent || undefined;
const field = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const typeIn = (label: RegExp, value: number) => act(() => {
    fireEvent.change(field(label), {target: {value: String(value)}});
    fireEvent.keyDown(field(label), {key: 'Enter'});
});
const heightField = (index: number) => new RegExp(`^Višina ${index + 1} \\(pri x = [0-9,]+\\), vrednost$`);
const typeHeight = (index: number, value: number) => typeIn(heightField(index), value);
const button = (name: string) => screen.getByRole('button', {name}) as HTMLButtonElement;
const click = (name: string) => act(() => { fireEvent.click(button(name)); });
const exampleSelect = () => screen.getByLabelText(/^Primer$/) as HTMLSelectElement;
const choose = (id: string) => act(() => { fireEvent.change(exampleSelect(), {target: {value: id}}); });
// n is a board count puck and the distribution function a switch puck (task 08 lane L47): the tests write n through the arbiter and flip the switch with `performAction`.
let current: ObservedCltGraph;
const flipCdf = () => act(() => { current.performAction('cdf'); });
const cdfPressed = () => current.getDeclaration()!.actions!.find(action => action.id === 'cdf')!.pressed;
const writeN = (value: number, source: 'learner' | 'lesson' = 'learner') => { let result: unknown; act(() => { result = current.parameters!.write('clt-n', value, source); }); return result as {status: string; error?: Error}; };
const mount = () => {
    const frames = manualScheduler();
    const graph = new ObservedCltGraph(frames.scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    current = graph;
    return {graph, frames, ...view};
};

/** What the readouts must show for a model, computed from the model module and formatted here (not by the graph). */
const shownFor = (model: CltModel, language: 'sl' | 'en' = 'sl') => {
    const result = cltView(model);
    if (!result.ok) throw new Error('view failed');
    const f = (value: number, digits: number) => formatNumber(value, language, digits);
    return {
        n: String(model.n), mean: f(result.view.mean, 4), variance: f(result.view.variance, 4), sumMean: f(result.view.sumMean, 4),
        sumVariance: f(result.view.sumVariance, 4), kolmogorov: f(result.view.kolmogorov, 5), raw: result.view,
    };
};
const expectReadouts = (model: CltModel) => {
    const shown = shownFor(model);
    expect(readout('n')).toBe(shown.n);
    expect(readout('mean')).toBe(shown.mean);
    expect(readout('variance')).toBe(shown.variance);
    expect(readout('sum-mean')).toBe(shown.sumMean);
    expect(readout('sum-variance')).toBe(shown.sumVariance);
    expect(readout('kolmogorov')).toBe(shown.kolmogorov);
};

test('defaults: the uniform density at n = 1 reads mean 0,5, variance 1/12 (0,0833) and K_1 as cltView and the spec value 0,05718', () => {
    const {graph} = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_CLT_MODEL);
    expectReadouts(DEFAULT_CLT_MODEL);
    expect(readout('mean')).toBe('0,5');
    expect(Math.abs(shownFor(DEFAULT_CLT_MODEL).raw.variance - 1 / 12)).toBeLessThan(1e-12);
    expect(readout('variance')).toBe('0,0833');
    expect(Math.abs(shownFor(DEFAULT_CLT_MODEL).raw.kolmogorov - 0.05721)).toBeLessThan(1e-4);
    expect(graph.playing()).toBe(false);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(graph.normalCurve().dataX!.length).toBeGreaterThan(100);
    expect(graph.sumCurve().dataX!.length).toBeGreaterThan(100);
});

test('Next adds one copy: n and every readout follow cltView at that n; the board has no caption (n and K_n are rows)', () => {
    const {graph} = mount();
    for (const n of [2, 3, 4]) {
        click('Dodaj še eno kopijo');
        expect(graph.modelNow().n).toBe(n);
        expectReadouts({...DEFAULT_CLT_MODEL, n});
        expect(readout('sum-mean')).toBe(formatNumber(n / 2, 'sl', 4));
    }
    expect(graph.captionPlainLines()).toEqual([]);
    expect(readout('kolmogorov')).toBe(shownFor({...DEFAULT_CLT_MODEL, n: 4}).kolmogorov);
});

test('the board object count does not depend on n or on the CDF view', () => {
    const {graph} = mount();
    const count = graph.ownedObjects();
    for (let i = 0; i < 6; i++) click('Dodaj še eno kopijo');
    expect(graph.ownedObjects()).toBe(count);
    flipCdf();
    expect(graph.ownedObjects()).toBe(count);
});

describe('the largest n', () => {
    test('Next at n = 30 is refused with the maximum message, the button is aria-disabled and the model is unchanged', () => {
        const {graph} = mount();
        act(() => { graph.callSetN(CLT_N_MAX); });
        expect(graph.modelNow().n).toBe(30);
        expect(button('Dodaj še eno kopijo').getAttribute('aria-disabled')).toBe('true');
        expect(status('max-n')).toMatch(/Več kot 30 seštevancev/);
        expect(() => graph.callNext()).toThrow(DomainError);
        click('Dodaj še eno kopijo');
        expect(graph.modelNow().n).toBe(30);
        expect(button('Predvajaj').getAttribute('aria-disabled')).toBe('true');
        expectReadouts({...DEFAULT_CLT_MODEL, n: 30});
    });

    test('n above 30 and a fraction are refused by the edit and leave the model unchanged', () => {
        const {graph} = mount();
        expect(() => graph.callSetN(31)).toThrow(DomainError);
        expect(() => graph.callSetN(2.5)).toThrow(DomainError);
        expect(graph.modelNow()).toEqual(DEFAULT_CLT_MODEL);
    });

    test('playback walks n up one copy per interval and stops by itself at 30', () => {
        const {graph, frames} = mount();
        click('Predvajaj');
        expect(graph.playing()).toBe(true);
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(2);
        act(() => { frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(3);
        for (let i = 0; i < 40 && graph.playing(); i++) act(() => { frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(30);
        expect(graph.playing()).toBe(false);
    });
});

describe('playback leases n (ADR 0064)', () => {
    test('Play leases the puck n, ticks write it as animation, and the lease ends with the playback at 30', () => {
        const {graph, frames} = mount();
        expect(current.parameters!.activeLeases()).toHaveLength(0);
        click('Predvajaj');
        expect(current.parameters!.activeLeases()).toHaveLength(1);
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(2);
        for (let i = 0; i < 40 && graph.playing(); i++) act(() => { frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(30);
        expect(current.parameters!.activeLeases()).toHaveLength(0);
    });

    test.each(['learner', 'lesson'] as const)('a %s write of n ends the playback and its lease at once', source => {
        const {graph, frames} = mount();
        click('Predvajaj');
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.playing()).toBe(true);
        expect(writeN(7, source).status).toBe('applied');
        expect(graph.modelNow().n).toBe(7);
        expect(graph.playing()).toBe(false);
        expect(current.parameters!.activeLeases()).toHaveLength(0);
        act(() => { frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(7);
    });

    test('pausing and Reset release the lease; Next step takes none', () => {
        const {graph, frames} = mount();
        click('Dodaj še eno kopijo');
        expect(current.parameters!.activeLeases()).toHaveLength(0);
        click('Predvajaj');
        act(() => { graph.pausePlayback(); });
        expect(current.parameters!.activeLeases()).toHaveLength(0);
        click('Predvajaj');
        expect(current.parameters!.activeLeases()).toHaveLength(1);
        click('Nazaj na n = 1');
        expect(current.parameters!.activeLeases()).toHaveLength(0);
        expect(frames.callbacks.size).toBe(0);
    });

    test('a learner hold on n refuses the lease, so Play does not start', () => {
        const {graph} = mount();
        const release = current.parameters!.hold('clt-n');
        act(() => { current.performAction('play'); });
        expect(graph.playing()).toBe(false);
        expect(current.parameters!.activeLeases()).toHaveLength(0);
        release();
    });
});

describe('playback and edits', () => {
    test('Play then a height edit pauses at the same n and restarts the history with the new shape', () => {
        const {graph, frames} = mount();
        click('Predvajaj');
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(2);
        expect(graph.playing()).toBe(true);
        typeHeight(1, 3);
        expect(graph.playing()).toBe(false);
        expect(screen.getByRole('button', {name: 'Predvajaj'})).toBeInTheDocument();
        expect(graph.modelNow()).toEqual({heights: [1, 3, 1, 1, 1], n: 2, cdf: false});
        expectReadouts(graph.modelNow());
        act(() => { frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(2);
    });

    test('Reset returns to n = 1 with the same shape, paused', () => {
        const {graph} = mount();
        typeHeight(0, 4);
        click('Dodaj še eno kopijo');
        click('Dodaj še eno kopijo');
        click('Predvajaj');
        expect(graph.playing()).toBe(true);
        click('Nazaj na n = 1');
        expect(graph.modelNow()).toEqual({heights: [4, 1, 1, 1, 1], n: 1, cdf: false});
        expect(graph.playing()).toBe(false);
        expectReadouts(graph.modelNow());
        expect(button('Nazaj na n = 1').getAttribute('aria-disabled')).toBe('true');
    });

    test('an example sets its heights and n = 1 and pauses playback; the custom entry appears after an edit', () => {
        const {graph} = mount();
        for (let i = 0; i < 4; i++) click('Dodaj še eno kopijo');
        click('Predvajaj');
        choose('skewed');
        expect(graph.modelNow()).toEqual(CLT_EXAMPLES.skewed);
        expect(graph.playing()).toBe(false);
        expectReadouts(CLT_EXAMPLES.skewed);
        expect(readout('mean')).toBe('0,3333');
        expect(exampleSelect().value).toBe('skewed');
        typeHeight(4, 0.5);
        expect(exampleSelect().value).toBe('custom');
        choose('uniform');
        expect(graph.modelNow()).toEqual(DEFAULT_CLT_MODEL);
    });
});

describe('the CDF view', () => {
    test('the switch turns both curves into CDFs: monotone, from 0 to 1, with the view changed to the CDF window', () => {
        const {graph} = mount();
        click('Dodaj še eno kopijo');
        const densityPeak = Math.max(...graph.sumCurve().dataY!);
        expect(densityPeak).toBeGreaterThan(0.3);
        flipCdf();
        expect(graph.modelNow().cdf).toBe(true);
        expect(cdfPressed()).toBe(true);
        expect(graph.modelNow().n).toBe(2);
        for (const curve of [graph.sumCurve(), graph.normalCurve()]) {
            const y = curve.dataY!;
            for (let i = 1; i < y.length; i++) expect(y[i]).toBeGreaterThanOrEqual(y[i - 1] - 1e-9);
            expect(y[0]).toBeLessThan(1e-3);
            expect(y[y.length - 1]).toBeGreaterThan(0.999);
            expect(y[y.length - 1]).toBeLessThan(1.001);
        }
        const box = graph.liveBoard().getBoundingBox();
        const expected = fitCltView({...DEFAULT_CLT_MODEL, cdf: true});
        expect(box[1]).toBeCloseTo(expected[1], 6);
        expect(box[3]).toBeCloseTo(expected[3], 6);
        flipCdf();
        expect(cdfPressed()).toBe(false);
        expect(Math.max(...graph.sumCurve().dataY!)).toBeCloseTo(shownFor({...DEFAULT_CLT_MODEL, n: 2}).raw.curve.y.reduce((a, b) => Math.max(a, b), 0), 9);
    });

    test('the CDF switch does not pause playback', () => {
        const {graph} = mount();
        click('Predvajaj');
        flipCdf();
        expect(graph.playing()).toBe(true);
    });
});

describe('refused edits', () => {
    test('an all-zero shape is refused with a visible message and the model is unchanged', () => {
        const {graph} = mount();
        for (const index of [0, 1, 2, 3]) typeHeight(index, 0);
        expect(graph.modelNow().heights).toEqual([0, 0, 0, 0, 1]);
        expect(status('refused')).toBeUndefined();
        typeHeight(4, 0);
        expect(graph.modelNow().heights).toEqual([0, 0, 0, 0, 1]);
        expect(status('refused')).toMatch(/Vsaj ena višina mora ostati večja od 0/);
        expectReadouts(graph.modelNow());
        typeHeight(4, 1);
        expect(status('refused')).toBeUndefined();
    });

    test('wiring: a typed refusal appears once, in the field, not in the shared refusal channel, and the next accepted edit clears it', () => {
        const {graph} = mount();
        for (const index of [0, 1, 2, 3, 4]) typeHeight(index, 0);
        const hints = document.querySelectorAll('.number-input-hint');
        expect(hints).toHaveLength(1);
        expect(hints[0].textContent).toMatch(/Vsaj ena višina mora ostati večja od 0/);
        expect(document.querySelector('[data-refusal-notice]')?.textContent ?? '').toBe('');
        typeHeight(4, 1);
        expect(document.querySelector('.number-input-hint')).toBeNull();
        expect(graph.modelNow().heights[4]).toBe(1);
    });

    test('Reset clears a refusal notice', () => {
        const {graph} = mount();
        click('Dodaj še eno kopijo');
        act(() => { graph.refuseNow('Pregrobo.'); });
        expect(notice()).toBe('Pregrobo.');
        click('Nazaj na n = 1');
        expect(graph.modelNow().n).toBe(1);
        expect(notice()).toBeUndefined();
    });

    test('an import that keeps the same model still clears a refusal notice from the screen', () => {
        const {graph} = mount();
        act(() => { graph.refuseNow('Pregrobo.'); });
        expect(notice()).toBe('Pregrobo.');
        act(() => { graph.importPresetData(graph.modelNow()); });
        expect(notice()).toBeUndefined();
    });

    test('a negative height is clamped to 0 by the model, an oversized one is refused', () => {
        const {graph} = mount();
        act(() => { graph.callSetHeight(0, -3); });
        expect(graph.modelNow().heights[0]).toBe(0);
        expect(() => graph.callSetHeight(1, 11)).toThrow(DomainError);
        expect(() => graph.callSetHeight(5, 1)).toThrow(DomainError);
        expect(graph.modelNow().heights).toEqual([0, 1, 1, 1, 1]);
    });
});

describe('Presets', () => {
    const fileWith = (data: object) => JSON.stringify({'preset-prob-clt': {data: [{id: 'Primer', data}]}});

    test('round trip: save, change, restore gives back heights, n and the flag, paused, with the same readouts', () => {
        const {graph, frames} = mount();
        typeHeight(2, 2.5);
        for (let i = 0; i < 4; i++) click('Dodaj še eno kopijo');
        flipCdf();
        const saved = graph.modelNow();
        expect(saved).toEqual({heights: [1, 1, 2.5, 1, 1], n: 5, cdf: true});
        const exported = graph.exportPreset();
        const checkGraphState = functionPresetCollections['prob-clt'].checkGraphState!;
        expect(checkGraphState(exported.graphState)).toBeUndefined();
        expect(checkGraphState({...exported.graphState, heights: [0, 0, 0, 0, 0]})).toBeDefined();
        const shown = ['n', 'mean', 'variance', 'sum-mean', 'sum-variance', 'kolmogorov', 'mass-residual'].map(readout);
        choose('skewed');
        click('Predvajaj');
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.playing()).toBe(true);
        expect(graph.modelNow()).not.toEqual(saved);
        act(() => { graph.importPreset({...exported, id: 'stored'}); });
        expect(graph.modelNow()).toEqual(saved);
        expect(graph.modelNow().n).toBe(5);
        expect(graph.playing()).toBe(false);
        expect(screen.getByRole('button', {name: 'Predvajaj'})).toBeInTheDocument();
        expect(['n', 'mean', 'variance', 'sum-mean', 'sum-variance', 'kolmogorov', 'mass-residual'].map(readout)).toEqual(shown);
        expect(cdfPressed()).toBe(true);
        act(() => { frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(5);
        commitPresetImport(preflightPresetImport(fileWith(exported.data as object)));
        expect(JSON.parse(localStorage.getItem('preset-prob-clt')!).data[0].data).toEqual(saved);
    });

    const ok = {heights: [1, 1, 1, 1, 1], n: 3, cdf: false};
    test.each([
        ['all-zero shape', {...ok, heights: [0, 0, 0, 0, 0]}, /vsaj ena višina mora biti večja od 0/],
        ['four heights', {...ok, heights: [1, 1, 1, 1]}, /natanko 5 višin/],
        ['a negative height', {...ok, heights: [1, -1, 1, 1, 1]}, /od 0 do 10/],
        ['n = 31', {...ok, n: 31}, /n.*celo število od 1 do 30/],
        ['missing flag', {heights: ok.heights, n: 3}, /cdf.*true ali false/],
    ])('an out-of-domain file (%s) is rejected with an actionable message and nothing is written', (_name, data, expected) => {
        expect(() => preflightPresetImport(fileWith(data))).toThrow(LocalizedError);
        expect(() => preflightPresetImport(fileWith(data))).toThrow(expected);
        expect(() => preflightPresetImport(fileWith(data))).not.toThrow(/neveljavni podatki funkcije|invalid function data/);
        expect(localStorage.length).toBe(0);
    });
});

describe('lifecycle', () => {
    test('StrictMode mounts, unmounts and mounts again: playback works on the remounted board', () => {
        const frames = manualScheduler();
        const graph = new ObservedCltGraph(frames.scheduler);
        render(<React.StrictMode><MemoryRouter><GraphHost create={() => graph}/></MemoryRouter></React.StrictMode>);
        expect(graph.state.initialized).toBe(true);
        const baseline = graph.ownedObjects();
        click('Predvajaj');
        expect(graph.playing()).toBe(true);
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        expect(graph.modelNow().n).toBe(2);
        expect(graph.ownedObjects()).toBe(baseline);
    });

    test('a Play click handled while the graph unmounts leaves no running playback', () => {
        const {graph, frames, unmount} = mount();
        act(() => {
            fireEvent.click(button('Predvajaj'));
            unmount();
        });
        expect(graph.playing()).toBe(false);
        expect(frames.callbacks.size).toBe(0);
    });

    test('the pause a figure export runs first holds the current n, and no frame moves it afterwards', () => {
        const {graph, frames} = mount();
        click('Predvajaj');
        act(() => { frames.frame(0); frames.frame(CLT_STEP_INTERVAL_MS); });
        const shown = graph.modelNow();
        expect(shown.n).toBe(2);
        act(() => { graph.pausePlayback(); });
        expect(graph.playing()).toBe(false);
        expect(frames.callbacks.size).toBe(0);
        expect(frames.frame(CLT_STEP_INTERVAL_MS)).toBe(false);
        expect(graph.modelNow()).toEqual(shown);
        expect(screen.getByRole('button', {name: 'Predvajaj'})).toBeInTheDocument();
    });
});

test('switching the language keeps the model and re-renders labels and numbers with points', () => {
    const {graph} = mount();
    typeHeight(3, 2);
    click('Dodaj še eno kopijo');
    const model = graph.modelNow();
    expect(readout('mean')).toBe(shownFor(model).mean);
    act(() => { setLanguage('en'); });
    expect(graph.modelNow()).toEqual(model);
    expect(readout('mean')).toBe(shownFor(model, 'en').mean);
    expect(readout('mean')).toMatch(/\./);
    expect(readout('kolmogorov')).toBe(shownFor(model, 'en').kolmogorov);
    expect(screen.getByRole('button', {name: 'Add one more copy'})).toBeInTheDocument();
    expect(graph.captionPlainLines()).toEqual([]);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

describe('lesson actions (P3)', () => {
    const param = (name: string, value: unknown) => ({kind: 'function-parameter', name, value}) as LessonAction;
    const choice = (name: string, value: unknown) => ({kind: 'function-choice', name, value}) as LessonAction;
    const cdf = (visible: boolean) => ({kind: 'function-visibility', target: 'clt-cdf', visible}) as LessonAction;
    const animation = (command: LessonAnimationCommand): LessonAction => ({kind: 'animation', animationId: 'clt-sum', command});
    const box = (graph: ObservedCltGraph) => graph.liveBoard().getBoundingBox();

    test('one synchronous sequence follows the planned lesson: n, next-step, example, CDF, reset', () => {
        const {graph} = mount();
        const k = (n: number, digits: string) => {
            expect(graph.modelNow().n).toBe(n);
            expect(readout('n')).toBe(String(n));
            expect(readout('kolmogorov')).toBe(digits);
        };
        k(1, '0,05718');
        graph.lesson(animation('next-step'));
        k(2, '0,01644');
        graph.lesson(param('clt-n', 3)); k(3, '0,00986');
        graph.lesson(param('clt-n', 5)); k(5, '0,00572');
        graph.lesson(param('clt-n', 10)); k(10, '0,00281');
        expect(graph.modelNow().heights).toEqual(CLT_EXAMPLES.uniform.heights);
        graph.lesson(animation('play'));
        expect(graph.playing()).toBe(true);
        graph.lesson(choice('clt-example', 'skewed'));
        expect(graph.playing()).toBe(false);
        expect(graph.modelNow()).toEqual(CLT_EXAMPLES.skewed);
        k(1, '0,07868');
        graph.lesson(param('clt-n', 3)); k(3, '0,02492');
        graph.lesson(cdf(true));
        expect(graph.modelNow().cdf).toBe(true);
        expect(readout('kolmogorov')).toBe('0,02492');
        graph.lesson(cdf(false));
        expect(graph.modelNow().cdf).toBe(false);
        graph.lesson(animation('reset'));
        expect(graph.modelNow()).toEqual({...CLT_EXAMPLES.skewed, n: 1});
        k(1, '0,07868');
        expectReadouts(graph.modelNow());
    });

    test('an example step pauses, restarts the history at n = 1 and shows the new shape fully', () => {
        const {graph} = mount();
        graph.lesson(param('clt-n', 7));
        graph.lesson(animation('play'));
        graph.lesson(choice('clt-example', 'skewed'));
        expect(graph.modelNow().n).toBe(1);
        const view = fitCltView(graph.modelNow());
        box(graph).forEach((value, index) => expect(value).toBeCloseTo(view[index], 9));
    });

    test.each([
        ['n = 0', param('clt-n', 0)],
        ['n = 31', param('clt-n', 31)],
        ['n = 2.5', param('clt-n', 2.5)],
        ['example unknown', choice('clt-example', 'unknown')],
    ])('refuses %s with a DomainError and leaves the model alone', (_name, action) => {
        const {graph} = mount();
        const before = graph.modelNow();
        let error: unknown;
        try { graph.lesson(action); } catch (caught) { error = caught; }
        expect(error).toBeInstanceOf(DomainError);
        expect(graph.modelNow()).toEqual(before);
        expect(readout('kolmogorov')).toBe('0,05718');
    });

    test('the lesson model accepts the new names', async () => {
        const model = await import('../../learning/model');
        expect(model.FUNCTION_PARAMETER_NAMES).toContain('clt-n');
        expect(model.FUNCTION_VISIBILITY_TARGETS).toContain('clt-cdf');
        expect(model.LESSON_ANIMATION_IDS).toContain('clt-sum');
        expect(model.FUNCTION_CHOICE_VALUES['clt-example']).toEqual(['uniform', 'skewed']);
    });
});
