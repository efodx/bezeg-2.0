import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FourierCoefficientsGraph} from './FourierCoefficientsGraph';
import {GraphHost} from '../base/GraphHost';
import {DomainError} from './BaseFunctionGraph';
import {fourierSupError} from '../../analysis/fourierDecay';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {renderMessage, setLanguage} from '../../localization';
import {LessonAction} from '../../learning/model';
import {
    DEFAULT_FOURIER_COEFFICIENTS_MODEL,
    FourierCoefficientsModel,
    fourierPartialSumSamples,
    fourierProjection,
} from '../../analysis/fourierCoefficientsModel';
import {barRect} from './FourierSpectrumBars';
import {fourierCoefficientsFileMessage} from './fourierCoefficientsMessages';

// jsdom has no canvas, no matchMedia and no layout: the shared harness gives the board a size.
beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});

beforeEach(() => setLanguage('sl'));

type Curve = { elType?: string; dataX?: number[]; dataY?: number[]; visPropCalc?: { visible?: boolean } };

/** A real graph through the real host and a real JSXGraph board (jsdom). */
class ObservedFourierCoefficientsGraph extends FourierCoefficientsGraph {
    lesson(action: LessonAction) {
        this.applyLessonAction(action);
    }

    modelNow() {
        return this.model;
    }

    ownedObjects() {
        return this.generatedObjectCount;
    }

    /** The y positions of the first handles. */
    handleHeights(count: number): number[] {
        const handles = (this as unknown as { handles: JXG.Point[] }).handles;
        return handles.slice(0, count).map(point => point.Y());
    }

    /** The drawn partial sum S_K: the curve whose data are the samples of the model's own partial sum. */
    sumCurve(): Curve {
        const model = this.model;
        const expected = fourierPartialSumSamples(fourierProjection(model).coefficients, model.K);
        const objects = this.board.objectsList as unknown as Curve[];
        const found = objects.filter(object => object.elType === 'curve' && object.dataY?.length === expected.y.length
            && object.dataY.every((y, i) => Math.abs(y - expected.y[i]) < 1e-9));
        expect(found).toHaveLength(1);
        return found[0];
    }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const label = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent;
const tableCell = (k: number, term: 'a' | 'b') => document.querySelector(`[data-testid="fourier-spectrum-table"] tr[data-k="${k}"] td[data-term="${term}"]`)?.textContent;
const handleFields = () => screen.getAllByLabelText(/^(Vrednost f pri x|Leva limita f pri x|Desna limita f pri x) = /) as HTMLInputElement[];
const field = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement;
const overlaySwitch = () => screen.getByLabelText(/^Pokaži delno vsoto S_K$/) as HTMLInputElement;
/** The app's Slovenian number text: decimal comma, minus sign, no trailing zeros. */
const sl = (value: number, decimals: number) => String(Number(value.toFixed(decimals))).replace('.', ',').replace('-', '−');

const mount = () => {
    const graph = new ObservedFourierCoefficientsGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    expect(graph.state.initialized).toBe(true);
    return graph;
};

const withModel = (changes: Partial<FourierCoefficientsModel>): FourierCoefficientsModel => ({...DEFAULT_FOURIER_COEFFICIENTS_MODEL, ...changes});

test('the default model mounts without console errors: handles, readouts and a partial sum that is S_K of the model', () => {
    const errors = vi.spyOn(console, 'error');
    // The testing library's own act deprecation notice is not the app's.
    const graph = mount();
    expect(graph.ownedObjects()).toBeGreaterThan(0);
    expect(graph.modelNow()).toEqual(DEFAULT_FOURIER_COEFFICIENTS_MODEL);
    expect(handleFields()).toHaveLength(2);
    expect(readout('order')).toBe('16');
    expect(readout('selected')).toBe(sl(fourierProjection(graph.modelNow()).coefficients.a[1], 5));
    expect(graph.sumCurve().visPropCalc?.visible).not.toBe(false);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    expect(errors.mock.calls.filter(call => !String(call[0]).includes('ReactDOMTestUtils.act'))).toEqual([]);
    errors.mockRestore();
});

test('the spectrum plots the constant term a0/2 for k = 0: the table, the bar and the readout of the selected a0', () => {
    const graph = mount();
    const {coefficients} = fourierProjection(graph.modelNow());
    const constant = coefficients.a[0] / 2;
    expect(constant).toBeCloseTo(Math.PI / 2, 12);
    expect(tableCell(0, 'a')).toBe(sl(constant, 4));
    expect(document.querySelector('[data-testid="fourier-spectrum-table"] tr[data-k="0"] th')?.textContent).toBe('0 (a₀/2)');
    const range = Math.max(...[constant, ...coefficients.a.slice(1), ...coefficients.b.slice(1)].map(Math.abs));
    for (const [k, term, value] of [[0, 'a', constant], [1, 'a', coefficients.a[1]], [1, 'b', coefficients.b[1]]] as const) {
        const bar = document.querySelector(`rect[data-term="${term}"][data-k="${k}"]`)!;
        const expected = barRect(value, range);
        expect(Number(bar.getAttribute('height'))).toBeCloseTo(expected.height, 9);
        expect(Number(bar.getAttribute('y'))).toBeCloseTo(expected.y, 9);
    }
    act(() => graph.lesson({kind: 'function-parameter', name: 'fourier-harmonic', value: 0}));
    expect(label('selected')).toBe('Konstantni člen a₀/2');
    expect(readout('selected')).toBe(sl(constant, 4));
    act(() => { setLanguage('en'); });
    expect(label('selected')).toBe('Constant term a₀/2');
    expect(document.querySelector('[data-testid="fourier-spectrum-table"] tr[data-k="0"] th')?.textContent).toBe('0 (a₀/2)');
});

test('a keyboard step on a handle (0.05, Shift 0.5) changes the model, the table of the bars and the readouts', () => {
    const graph = mount();
    const beforeConstant = tableCell(0, 'a');
    const beforeMeanSquare = readout('square-integral');
    expect(handleFields()[1].value).toBe('0');
    act(() => { fireEvent.keyDown(handleFields()[1], {key: 'ArrowUp'}); });
    expect(graph.modelNow().values[1]).toBeCloseTo(0.05, 12);
    expect(graph.handleHeights(2)[1]).toBeCloseTo(0.05, 12);
    expect(handleFields()[1].value).toBe('0,05');
    act(() => { fireEvent.keyDown(handleFields()[1], {key: 'ArrowUp', shiftKey: true}); });
    expect(graph.modelNow().values[1]).toBeCloseTo(0.55, 12);
    act(() => { fireEvent.keyDown(handleFields()[1], {key: 'ArrowDown', shiftKey: true}); });
    act(() => { fireEvent.keyDown(handleFields()[1], {key: 'ArrowDown', shiftKey: true}); });
    expect(graph.modelNow().values[1]).toBeCloseTo(-0.45, 12);
    const {coefficients, squareIntegral} = fourierProjection(graph.modelNow());
    expect(tableCell(0, 'a')).not.toBe(beforeConstant);
    expect(tableCell(0, 'a')).toBe(sl(coefficients.a[0] / 2, 4));
    expect(tableCell(1, 'a')).toBe(sl(coefficients.a[1], 4));
    expect(readout('square-integral')).not.toBe(beforeMeanSquare);
    expect(readout('square-integral')).toBe(sl(squareIntegral, 5));
});

test('the overlay switch shows and hides the partial sum on the board and in the model', () => {
    const graph = mount();
    expect(overlaySwitch().checked).toBe(true);
    act(() => { fireEvent.click(overlaySwitch()); });
    expect(graph.modelNow().overlay).toBe(false);
    expect(overlaySwitch().checked).toBe(false);
    expect(graph.sumCurve().visPropCalc?.visible).toBe(false);
    act(() => { fireEvent.click(overlaySwitch()); });
    expect(graph.modelNow().overlay).toBe(true);
    expect(graph.sumCurve().visPropCalc?.visible).toBe(true);
});

test('a Preset keeps the handles, the layout and K through export and import, and leaves the board objects as they were', () => {
    const graph = mount();
    const baseline = graph.ownedObjects();
    for (const action of [
        {kind: 'function-choice', name: 'fourier-layout', value: 'free'},
        {kind: 'function-parameter', name: 'fourier-handle-1', value: 1.25},
        {kind: 'function-parameter', name: 'fourier-handle-3', value: -2},
        {kind: 'function-parameter', name: 'fourier-order', value: 7},
    ] as LessonAction[]) act(() => graph.lesson(action));
    const stored = graph.exportPresetData();
    expect(stored.layout).toBe('free');
    expect(stored.values).toEqual([0, 1.25, 0, -2, 0]);
    expect(stored.K).toBe(7);
    act(() => { graph.importPreset({id: 'default', data: DEFAULT_FOURIER_COEFFICIENTS_MODEL}); });
    expect(graph.modelNow()).toEqual(DEFAULT_FOURIER_COEFFICIENTS_MODEL);
    expect(handleFields()).toHaveLength(2);
    act(() => { graph.importPreset({id: 'stored', data: JSON.parse(JSON.stringify(stored))}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(handleFields().map(input => input.value)).toEqual(['0', '1,25', '0', '−2', '0']);
    expect(graph.handleHeights(5)).toEqual([0, 1.25, 0, -2, 0]);
    expect(field(/^Največji harmonik K$/).value).toBe('7');
    expect(graph.sumCurve().dataY).toBeDefined();
    act(() => { graph.importPreset({id: 'default-again', data: DEFAULT_FOURIER_COEFFICIENTS_MODEL}); });
    expect(graph.ownedObjects()).toBe(baseline);
});

test('a malformed Preset is rejected with a message that names the rule and says what to correct', () => {
    const graph = mount();
    const collection = graph.presetCollection();
    const text = (data: unknown) => {
        const checked = collection.check(data);
        expect('rejection' in checked).toBe(true);
        return 'rejection' in checked ? renderMessage(checked.rejection) : '';
    };
    expect(collection.check(DEFAULT_FOURIER_COEFFICIENTS_MODEL)).toEqual({data: DEFAULT_FOURIER_COEFFICIENTS_MODEL});
    expect(text(withModel({K: 99}))).toMatch(/Največji harmonik K mora biti celo število med 1 in 32.*popravi vrednost v datoteki$/);
    expect(text(withModel({values: [1, 2, 3]}))).toMatch(/natanko 2 vrednosti.*popravi vrednost v datoteki$/);
    expect(text(withModel({layout: 'sawtooth' as never}))).toContain('popravi vrednost v datoteki');
    expect(text(withModel({selected: {term: 'b', k: 0}}))).toContain('b₀');
    expect(renderMessage(fourierCoefficientsFileMessage({kind: 'overlay'}))).toContain('popravi vrednost v datoteki');
    expect(graph.modelNow()).toEqual(DEFAULT_FOURIER_COEFFICIENTS_MODEL);
});

test('both languages: a live language switch keeps the scene, the model and the handles', () => {
    const graph = mount();
    act(() => graph.lesson({kind: 'function-parameter', name: 'fourier-handle-1', value: 0.5}));
    const model = graph.modelNow();
    const objects = graph.ownedObjects();
    act(() => { setLanguage('en'); });
    expect(graph.modelNow()).toBe(model);
    expect(graph.ownedObjects()).toBe(objects);
    expect(screen.getByLabelText(/^Highest harmonic K$/)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Value of f at x = /)).toHaveLength(2);
    expect(graph.handleHeights(2)[1]).toBeCloseTo(0.5, 12);
    expect(readout('square-integral')).toMatch(/^\d+\.\d{1,5}$/);
    act(() => { setLanguage('sl'); });
    expect(readout('square-integral')).toMatch(/^\d+,\d{1,5}$/);
    expect(handleFields()).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
});

test('a multi-action lesson scene (layout, a handle, K, harmonic, term, overlay) runs in one synchronous tick and reads back from the state', () => {
    const graph = mount();
    act(() => {
        for (const action of [
            {kind: 'function-choice', name: 'fourier-layout', value: 'free'},
            {kind: 'function-parameter', name: 'fourier-handle-2', value: 1.5},
            {kind: 'function-parameter', name: 'fourier-order', value: 9},
            {kind: 'function-parameter', name: 'fourier-harmonic', value: 3},
            {kind: 'function-choice', name: 'fourier-term', value: 'b'},
            {kind: 'function-visibility', target: 'fourier-partial-sum', visible: false},
        ] as LessonAction[]) graph.lesson(action);
    });
    expect(graph.state).toMatchObject({layout: 'free', K: 9, selected: {term: 'b', k: 3}, overlay: false});
    expect(graph.state.values).toEqual([0, 0, 1.5, 0, 0]);
    expect(graph.modelNow()).toMatchObject({layout: 'free', K: 9, selected: {term: 'b', k: 3}, overlay: false, values: [0, 0, 1.5, 0, 0]});
    expect(handleFields()).toHaveLength(5);
    expect(graph.sumCurve().visPropCalc?.visible).toBe(false);
    expect(readout('order')).toBe('9');
    expect(label('selected')).toBe('Koeficient b₃');
});

// ---- The decay view (lesson F4) ------------------------------------------------------------------------------------

const viewSelect = () => screen.getByLabelText(/^Pogled$/) as HTMLSelectElement;
const choose = (select: HTMLSelectElement, value: string) => act(() => { fireEvent.change(select, {target: {value}}); });
const panels = () => Array.from(document.querySelectorAll('[data-testid="fourier-decay-panel"]'));
const panelExamples = () => panels().map(panel => panel.getAttribute('data-example'));
const decayCell = (example: string, k: number) => document.querySelector(`[data-testid="fourier-decay-table"][data-example="${example}"] tr[data-k="${k}"] td`)?.textContent;
const decayRows = (example: string) => document.querySelectorAll(`[data-testid="fourier-decay-table"][data-example="${example}"] tbody tr`).length;
const bars = (example: string) => document.querySelectorAll(`[data-testid="fourier-decay-panel"][data-example="${example}"] rect[data-k]`);
const zeroMarkers = (example: string) => document.querySelectorAll(`[data-testid="fourier-decay-panel"][data-example="${example}"] circle[data-zero]`);
const zeroNote = () => document.querySelector('[data-testid="fourier-decay-zero-note"]');
const nField = () => screen.getByLabelText(/^Število členov N$/) as HTMLInputElement;
const scaleSelect = () => screen.getByLabelText(/^Merilo navpične osi$/) as HTMLSelectElement;
const selectionSelect = (slot: number) => screen.getByLabelText(new RegExp(`^Funkcija ${slot}$`)) as HTMLSelectElement;

test('the decay view shows three spectra with tables from the kernel, hides the projection controls and keeps the console clean', () => {
    const errors = vi.spyOn(console, 'error');
    const graph = mount();
    choose(viewSelect(), 'decay');
    expect(graph.modelNow().view).toBe('decay');
    expect(panelExamples()).toEqual(['square', 'abs', 'smooth']);
    expect(screen.queryByLabelText(/^Največji harmonik K$/)).toBeNull();
    expect(screen.queryByTestId('fourier-spectrum')).toBeNull();
    expect(screen.queryAllByLabelText(/^Vrednost f pri x = /)).toHaveLength(0);
    expect(decayRows('square')).toBe(11);
    expect(decayCell('square', 1)).toBe(sl(4 / Math.PI, 5));
    expect(decayCell('square', 2)).toBe('0');
    expect(decayCell('abs', 3)).toBe(sl(4 / (Math.PI * 9), 5));
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    // the board: f and S_N of the three examples are drawn, the projection's S_K is hidden
    expect(graph.sumCurve().visPropCalc?.visible).toBe(false);
    expect(graph.captionPlainLines().join(' ')).toContain('N = 11');
    expect(errors.mock.calls.filter(call => !String(call[0]).includes('ReactDOMTestUtils.act'))).toEqual([]);
    errors.mockRestore();
});

test('switching to the decay view and back keeps the fields of both views', () => {
    const graph = mount();
    act(() => {
        graph.lesson({kind: 'function-parameter', name: 'fourier-order', value: 7});
        graph.lesson({kind: 'function-parameter', name: 'fourier-n', value: 21});
        graph.lesson({kind: 'function-choice', name: 'fourier-scale', value: 'log'});
    });
    const before = graph.modelNow();
    choose(viewSelect(), 'decay');
    expect(nField().value).toBe('21');
    expect(scaleSelect().value).toBe('log');
    choose(viewSelect(), 'projection');
    expect(graph.modelNow()).toEqual({...before, view: 'projection'});
    expect(field(/^Največji harmonik K$/).value).toBe('7');
    expect(graph.sumCurve().visPropCalc?.visible).not.toBe(false);
    choose(viewSelect(), 'decay');
    expect(graph.modelNow()).toEqual({...before, view: 'decay'});
});

test('a change of N updates the tables, the bars and the sup error readouts', () => {
    const graph = mount();
    choose(viewSelect(), 'decay');
    expect(readout('sup-2')).toBe(sl(fourierSupError('abs', 11), 5));
    expect(readout('sup-2')).toBe('0,05293');
    act(() => graph.lesson({kind: 'function-parameter', name: 'fourier-n', value: 5}));
    expect(decayRows('abs')).toBe(5);
    // k = 1, 3, 5 are bars; k = 2, 4 are exact zeros, drawn as markers
    expect(bars('abs')).toHaveLength(3);
    expect(zeroMarkers('abs')).toHaveLength(2);
    expect(readout('n')).toBe('5');
    expect(readout('sup-2')).toBe(sl(fourierSupError('abs', 5), 5));
    expect(readout('sup-2')).not.toBe('0,05293');
    act(() => { fireEvent.keyDown(nField(), {key: 'ArrowUp'}); });
    expect(graph.modelNow().n).toBe(6);
    expect(decayRows('smooth')).toBe(6);
    expect(label('sup-1')).toBe('sup |f − Sₙ|, Kvadratni val sgn(x)');
    expect(() => graph.lesson({kind: 'function-parameter', name: 'fourier-n', value: 102})).toThrow(DomainError);
    expect(() => graph.lesson({kind: 'function-parameter', name: 'fourier-n', value: 2.5})).toThrow(DomainError);
    expect(graph.modelNow().n).toBe(6);
});

test('the log scale does not draw log 0 and says so, the linear scale draws a zero marker', () => {
    const graph = mount();
    choose(viewSelect(), 'decay');
    // linear: the square wave has 5 exact zeros among k = 1..11 (even k), each a marker on the baseline, and no bar
    expect(zeroMarkers('square')).toHaveLength(5);
    expect(bars('square')).toHaveLength(6);
    expect(zeroNote()).toBeNull();
    choose(scaleSelect(), 'log');
    expect(graph.modelNow().scale).toBe('log');
    expect(zeroMarkers('square')).toHaveLength(0);
    expect(bars('square')).toHaveLength(6);
    expect(Array.from(bars('square')).map(bar => bar.getAttribute('data-k'))).toEqual(['1', '3', '5', '7', '9', '11']);
    expect(zeroNote()?.textContent).toBe('log 0 ni narisan: ničelne amplitude niso na logaritemski osi.');
    expect(document.querySelectorAll('[data-testid="fourier-decay-zero-note"]')).toHaveLength(2);
    // the table still lists the zeros, as zeros
    expect(decayCell('square', 2)).toBe('0');
    act(() => { setLanguage('en'); });
    expect(zeroNote()?.textContent).toBe('log 0 is not drawn: zero amplitudes are not on the logarithmic axis.');
});

test('the drawn bar heights follow the table amplitudes: proportional on the linear scale, to log10 above 10^-8 on the log scale', () => {
    const graph = mount();
    choose(viewSelect(), 'decay');
    const amplitude = (k: number) => Number(document.querySelector(`[data-testid="fourier-decay-panel"][data-example="abs"] rect[data-k="${k}"]`)?.getAttribute('data-amplitude'));
    const height = (k: number) => Number(document.querySelector(`[data-testid="fourier-decay-panel"][data-example="abs"] rect[data-k="${k}"]`)?.getAttribute('height'));
    expect(amplitude(1)).toBeCloseTo(4 / Math.PI, 9);
    expect(height(3) / height(1)).toBeCloseTo(1 / 9, 6);
    choose(scaleSelect(), 'log');
    expect(graph.modelNow().scale).toBe('log');
    // plot height 118 over the nine decades 10^-8 .. 10^1 of this panel
    for (const k of [1, 3, 11]) expect(height(k)).toBeCloseTo(((Math.log10(amplitude(k)) + 8) / 9) * 118, 6);
});

test('choosing a function that another slot already shows is rejected with the reason, and the model keeps its selections', () => {
    const graph = mount();
    choose(viewSelect(), 'decay');
    expect(selectionSelect(1).value).toBe('square');
    choose(selectionSelect(1), 'abs');
    expect(graph.modelNow().selections).toEqual(['square', 'abs', 'smooth']);
    expect(selectionSelect(1).value).toBe('square');
    expect(screen.getByTestId('fourier-decay-rejection').textContent).toBe('Izbrane funkcije morajo biti med seboj različne.');
    expect(panelExamples()).toEqual(['square', 'abs', 'smooth']);
    // a free example is accepted and the message goes away
    choose(selectionSelect(1), 'sawtooth');
    expect(graph.modelNow().selections).toEqual(['sawtooth', 'abs', 'smooth']);
    expect(screen.queryByTestId('fourier-decay-rejection')).toBeNull();
    expect(panelExamples()).toEqual(['sawtooth', 'abs', 'smooth']);
    expect(() => graph.lesson({kind: 'function-choice', name: 'fourier-selection-2', value: 'smooth'})).toThrow(DomainError);
});

test('the smooth example at N = 30 shows no zero key, note or table zero, in linear and in log scale', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'fourier-view', value: 'decay'},
        {kind: 'function-parameter', name: 'fourier-n', value: 30},
    ] as LessonAction[]) act(() => graph.lesson(action));
    expect(panelExamples()).toEqual(['square', 'abs', 'smooth']);
    for (const scale of ['linear', 'log']) {
        act(() => graph.lesson({kind: 'function-choice', name: 'fourier-scale', value: scale} as LessonAction));
        const smooth = document.querySelector('[data-testid="fourier-decay-panel"][data-example="smooth"]') as HTMLElement;
        expect(smooth.querySelector('[data-testid="fourier-decay-zero-key"]')).toBeNull();
        expect(smooth.querySelector('[data-testid="fourier-decay-zero-note"]')).toBeNull();
        expect(smooth.querySelectorAll('circle[data-zero]')).toHaveLength(0);
        for (let k = 1; k <= 30; k++) expect(decayCell('smooth', k)).not.toBe('0');
    }
    expect(decayCell('smooth', 10)).toMatch(/^2,203e−6$/);
});

test('an example shown by another slot is a disabled option in the other selects', () => {
    mount();
    choose(viewSelect(), 'decay');
    const disabled = (slot: number) => [...selectionSelect(slot).options].filter(option => option.disabled).map(option => option.value);
    expect(disabled(1)).toEqual(['abs', 'smooth']);
    expect(disabled(2)).toEqual(['square', 'smooth']);
});

test('a Preset keeps the decay fields through export and import', () => {
    const graph = mount();
    for (const action of [
        {kind: 'function-choice', name: 'fourier-view', value: 'decay'},
        {kind: 'function-choice', name: 'fourier-selection-1', value: 'sawtooth'},
        {kind: 'function-choice', name: 'fourier-selection-3', value: 'jump'},
        {kind: 'function-parameter', name: 'fourier-n', value: 31},
        {kind: 'function-choice', name: 'fourier-scale', value: 'log'},
    ] as LessonAction[]) act(() => graph.lesson(action));
    const stored = graph.exportPresetData();
    expect(stored).toMatchObject({view: 'decay', selections: ['sawtooth', 'abs', 'jump'], n: 31, scale: 'log'});
    act(() => { graph.importPreset({id: 'default', data: DEFAULT_FOURIER_COEFFICIENTS_MODEL}); });
    expect(panelExamples()).toEqual([]);
    act(() => { graph.importPreset({id: 'stored', data: JSON.parse(JSON.stringify(stored))}); });
    expect(graph.modelNow()).toEqual(stored);
    expect(panelExamples()).toEqual(['sawtooth', 'abs', 'jump']);
    expect(decayRows('jump')).toBe(31);
    expect(nField().value).toBe('31');
    expect(scaleSelect().value).toBe('log');
});

test('the decay view in both languages: a live switch keeps the model, and the notes state the forward direction only', () => {
    const graph = mount();
    choose(viewSelect(), 'decay');
    const model = graph.modelNow();
    expect(document.body.textContent).toContain('Obrata ne trdimo');
    act(() => { setLanguage('en'); });
    expect(graph.modelNow()).toBe(model);
    expect(screen.getByLabelText(/^Number of terms N$/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Function 1$/)).toBeInTheDocument();
    expect(document.body.textContent).toContain('The converse is not claimed');
    expect(document.body.textContent).toContain('not a law');
    expect(decayCell('abs', 1)).toBe(String(Number((4 / Math.PI).toFixed(5))));
    expect(document.body.textContent).not.toMatch(/NaN|Infinity|undefined/);
    act(() => { setLanguage('sl'); });
    expect(decayCell('abs', 1)).toBe(sl(4 / Math.PI, 5));
});

test('a lesson scene with the decay actions runs in one synchronous tick and reads back from the state', () => {
    const graph = mount();
    act(() => {
        for (const action of [
            {kind: 'function-choice', name: 'fourier-view', value: 'decay'},
            {kind: 'function-choice', name: 'fourier-selection-1', value: 'sawtooth'},
            {kind: 'function-choice', name: 'fourier-selection-2', value: 'jump'},
            {kind: 'function-choice', name: 'fourier-selection-3', value: 'abs'},
            {kind: 'function-parameter', name: 'fourier-n', value: 40},
            {kind: 'function-choice', name: 'fourier-scale', value: 'log'},
        ] as LessonAction[]) graph.lesson(action);
    });
    expect(graph.state).toMatchObject({view: 'decay', selections: ['sawtooth', 'jump', 'abs'], n: 40, scale: 'log'});
    expect(graph.modelNow()).toMatchObject({view: 'decay', selections: ['sawtooth', 'jump', 'abs'], n: 40, scale: 'log'});
    expect(panelExamples()).toEqual(['sawtooth', 'jump', 'abs']);
    expect(decayRows('jump')).toBe(40);
    expect(readout('n')).toBe('40');
    expect(document.body.textContent).toContain('zgornja ovojnica 4/(πk)');
});
