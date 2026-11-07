/**
 * Characterization of the live function model authority, through what survives a change of representation: public graph
 * methods (`exportPresetData`, `importPreset`, lesson capabilities, `reset`, `selectPreset`), rendered controls, actual
 * board objects and exported data. Nothing here reads the flat scene state or the graph's model field.
 *
 * Two real graphs through the real host: the linear function (simple: two points, no caches) and the binomial-normal graph
 * (cache heavy: four `modelCache` entries and a `memoView`). The binomial model functions are wrapped to count calls, which
 * is how model identity is observed from outside: a `modelCache` recomputes exactly when it is handed a different model object.
 */
import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT, settle} from '../base/realGraphTestHarness';
import {internals} from '../base/realGraphScenes';
import {capturePNGBlob} from '../base/export/FigureCapture';
import {commitPresetImport, preflightPresetImport} from '../base/presets/PresetImport';
import {appStorage} from '../../storage/appStorage';
import {setLanguage} from '../../localization';
import {DomainError} from './BaseFunctionGraph';
import {LinearFunctionGraph} from './LinearFunctionGraph';
import {BinomialNormalGraph} from './BinomialNormalGraph';
import type {LessonAction} from '../../learning/model';
import type {Preset} from '../base/presets/Presets';
import type {Mock} from 'vitest';

const calls = vi.hoisted(() => ({bars: 0, shaded: 0, poisson: 0, view: 0}));

vi.mock('../base/export/FigureCapture', async () => ({
    ...await vi.importActual<typeof import('../base/export/FigureCapture')>('../base/export/FigureCapture'),
    capturePNGBlob: vi.fn(async () => new Blob(['png'])),
    waitForFigureCaptureReady: vi.fn(async () => undefined),
    downloadBlob: vi.fn(),
}));

vi.mock('../../analysis/binomialNormalModel', async () => {
    const actual = await vi.importActual<typeof import('../../analysis/binomialNormalModel')>('../../analysis/binomialNormalModel');
    return {
        ...actual,
        binomialBars: (...args: Parameters<typeof actual.binomialBars>) => { calls.bars++; return actual.binomialBars(...args); },
        binomialShadedBars: (...args: Parameters<typeof actual.binomialShadedBars>) => { calls.shaded++; return actual.binomialShadedBars(...args); },
        poissonBars: (...args: Parameters<typeof actual.poissonBars>) => { calls.poisson++; return actual.poissonBars(...args); },
        binomialNormalView: (...args: Parameters<typeof actual.binomialNormalView>) => { calls.view++; return actual.binomialNormalView(...args); },
    };
});

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { setLanguage('sl'); appStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

// ---- Shared helpers -----------------------------------------------------------------------------------------------

interface BoardObject {
    elType: string;
    name?: string;
    plaintext?: string;
    dataX?: number[];
    dataY?: number[];
    X(): number;
    Y(): number;
    evalVisProp(name: string): unknown;
    moveTo(to: number[]): void;
    setPositionDirectly(method: number, coordinates: number[]): unknown;
    triggerEventHandlers(names: string[], args: unknown[]): void;
}

const COORDS_BY_USER = 1;

class ObservedLinearGraph extends LinearFunctionGraph {
    liveBoard() { return this.board; }
    commit(model: ReturnType<LinearFunctionGraph['exportPresetData']>) { this.commitModel(model); }
    currentModel() { return this.model; }
    draggable() {
        const points = objectsOf(this).filter(object => object.elType === 'point');
        return ['$$P_1$$', '$$P_2$$'].map(name => points.find(point => point.name === name)!);
    }
}

class ObservedBinomialGraph extends BinomialNormalGraph {
    liveBoard() { return this.board; }
    draggable() { return [this.pointK] as unknown as BoardObject[]; }
}

type Observed = ObservedLinearGraph | ObservedBinomialGraph;

const objectsOf = (graph: Observed) => graph.liveBoard().objectsList as unknown as BoardObject[];
/** The draggable points in creation order. */
const freePoints = (graph: Observed) => graph.draggable();
const handles = (graph: Observed) => freePoints(graph).map(point => [point.X(), point.Y()]);
const texts = (graph: Observed) => objectsOf(graph).filter(object => object.elType === 'text').map(object => object.plaintext ?? '');
const curves = (graph: Observed) => objectsOf(graph).filter(object => object.elType === 'curve');
const box = (graph: Observed) => [...graph.liveBoard().getBoundingBox()];

const lessonParameter = (name: string, value: unknown) => ({kind: 'function-parameter', name, value}) as LessonAction;
const lessonChoice = (name: string, value: unknown) => ({kind: 'function-choice', name, value}) as LessonAction;
const apply = (graph: Observed, ...actions: LessonAction[]) => act(() => { for (const action of actions) graph.getLessonCapabilities().apply(action); });

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const enter = (input: HTMLInputElement, value: number) => act(() => {
    fireEvent.change(input, {target: {value: String(value)}});
    fireEvent.keyDown(input, {key: 'Enter'});
});

function mount<G extends Observed>(graph: G) {
    const tree = <MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>;
    const view = render(tree);
    return {graph, view, tree};
}

const near = (actual: number[], expected: number[]) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((value, index) => expect(actual[index]).toBeCloseTo(value, 9));
};

// ---- Linear function ------------------------------------------------------------------------------------------------

/** Y = kx + n through the points; the model is (x1, y1, x2, y2), default (0, 1), (2, 5): k = 2, n = 1. */
const linearField = (label: 'x₁' | 'y₁' | 'x₂' | 'y₂') => screen.getByLabelText(label) as HTMLInputElement;
const linearFields = () => (['x₁', 'y₁', 'x₂', 'y₂'] as const).map(label => linearField(label).value);
const typeLinear = (label: 'x₁' | 'y₁' | 'x₂' | 'y₂', value: number) => enter(linearField(label), value);
const mountLinear = () => mount(new ObservedLinearGraph());

/** Everything the three observers (domain, controls, board) show for the linear graph. */
function linearShown(graph: ObservedLinearGraph) {
    return {model: graph.exportPresetData(), fields: linearFields(), points: handles(graph), k: readout('k'), n: readout('n')};
}

const DEFAULT_LINEAR = {x1: 0, y1: 1, x2: 2, y2: 5};
const LINEAR_DEFAULT_SHOWN = {model: DEFAULT_LINEAR, fields: ['0', '1', '2', '5'], points: [[0, 1], [2, 5]], k: '2', n: '1'};

describe('linear function: accepted edits', () => {
    test('typing y1 changes the model, the field, the point and the readouts; a later command reads the edited model', () => {
        const {graph} = mountLinear();
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
        typeLinear('y₁', 3);
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 3, x2: 2, y2: 5});
        expect(linearFields()).toEqual(['0', '3', '2', '5']);
        near(handles(graph)[0], [0, 3]);
        expect([readout('k'), readout('n')]).toEqual(['1', '3']);
        // The command keeps the intercept n of the line it finds: a command reading the old model (y1 = 1) would keep n = 1.
        apply(graph, lessonParameter('k', 2));
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 3, x2: 2, y2: 7});
        expect(linearFields()).toEqual(['0', '3', '2', '7']);
        near(handles(graph)[1], [2, 7]);
        expect([readout('k'), readout('n')]).toEqual(['2', '3']);
    });

    test('a refused value (outside the domain) throws from a command, changes nothing and leaves the control alone', () => {
        const {graph} = mountLinear();
        expect(() => act(() => { graph.getLessonCapabilities().apply(lessonParameter('x1', 99999)); })).toThrow(DomainError);
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
        // Observed difference: the control keeps the refused text as its draft; model, board and readouts stay on the old value.
        typeLinear('x₁', 99999);
        expect(linearShown(graph)).toEqual({...LINEAR_DEFAULT_SHOWN, fields: ['99999', '1', '2', '5']});
    });

    test('an accepted value equal to the current one leaves every observer unchanged (a valid no-op)', () => {
        const {graph} = mountLinear();
        const board = box(graph);
        apply(graph, lessonParameter('x1', 0));
        typeLinear('y₂', 5);
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
        expect(box(graph)).toEqual(board);
    });
});

describe('linear function: board synchronization timing', () => {
    test('a drag does not move the dragged objects back (syncScene: false); an edit through a control does (full sync)', () => {
        const {graph} = mountLinear();
        const [p1, p2] = freePoints(graph);
        const moved = [vi.spyOn(p1, 'moveTo'), vi.spyOn(p2, 'moveTo')];
        act(() => { p1.setPositionDirectly(COORDS_BY_USER, [1, 2]); p1.triggerEventHandlers(['drag'], []); });
        expect(graph.exportPresetData()).toEqual({x1: 1, y1: 2, x2: 2, y2: 5});
        expect(linearFields()).toEqual(['1', '2', '2', '5']);
        near(handles(graph)[0], [1, 2]);
        expect(moved.map(spy => spy.mock.calls.length)).toEqual([0, 0]);
        typeLinear('x₂', 4);
        expect(moved.map(spy => spy.mock.calls.length)).toEqual([1, 1]);
        near(handles(graph)[0], [1, 2]);
        near(handles(graph)[1], [4, 5]);
        expect(linearFields()).toEqual(['1', '2', '4', '5']);
    });
});

describe('linear function: same-tick lesson actions', () => {
    test('one synchronous sequence: a later action reads what an earlier one wrote, before the host commits', () => {
        const {graph} = mountLinear();
        // x2 = 4 first; then k = 2 keeps x1 = 0 and x2 = 4 and the intercept n = 1; then n = 3 shifts both points up by 2.
        apply(graph, lessonParameter('x2', 4), lessonParameter('k', 2), lessonParameter('n', 3));
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 3, x2: 4, y2: 11});
        expect(linearFields()).toEqual(['0', '3', '4', '11']);
        near(handles(graph)[0], [0, 3]);
        near(handles(graph)[1], [4, 11]);
        expect([readout('k'), readout('n')]).toEqual(['2', '3']);
    });
});

describe('linear function: Preset import with a model in both graphState and data', () => {
    const DATA = {x1: 1, y1: 2, x2: 3, y2: 4};
    const FLAT = {initialized: true, x1: -3, y1: -2, x2: 6, y2: 7};
    const shownData = {model: DATA, fields: ['1', '2', '3', '4'], points: [[1, 2], [3, 4]], k: '1', n: '1'};

    test('the model in data wins over the flat model fields of graphState', () => {
        const {graph} = mountLinear();
        act(() => { graph.importPreset({id: 'conflict', graphState: FLAT, data: DATA} as unknown as Preset); });
        expect(linearShown(graph)).toEqual(shownData);
    });

    test('a Preset without data shows the default model, not the model fields of its graphState', () => {
        const {graph} = mountLinear();
        typeLinear('y₁', 3);
        act(() => { graph.importPreset({id: 'no-data', graphState: FLAT} as unknown as Preset); });
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
        typeLinear('y₁', 3);
        act(() => { graph.importPreset({id: 'null-data', graphState: FLAT, data: null} as unknown as Preset); });
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
    });

    test('data the collection rejects falls back to the default model and not to the flat fields', () => {
        const {graph} = mountLinear();
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        act(() => { graph.importPreset({id: 'bad', graphState: FLAT, data: {...DATA, x1: 99999}} as unknown as Preset); });
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
    });

    test('a Preset whose graphState has no model fields shows its data', () => {
        const {graph} = mountLinear();
        act(() => { graph.importPreset({id: 'plain', graphState: {initialized: true}, data: DATA} as unknown as Preset); });
        expect(linearShown(graph)).toEqual(shownData);
    });

    test('a stored file with both parts (the shape written today) loads through the importer and selection: data wins', async () => {
        const file = JSON.stringify({'preset-linear-function': {data: [{id: 'Stara', graphState: FLAT, data: DATA}]}});
        commitPresetImport(preflightPresetImport(file, appStorage), appStorage);
        const {graph} = mountLinear();
        await settle(() => graph.reloadAfterImport());
        await settle(() => graph.selectPreset('Stara'));
        expect(linearShown(graph)).toEqual(shownData);
        // Reset reloads the selected Preset.
        typeLinear('y₁', 3);
        await settle(() => graph.reset());
        expect(linearShown(graph)).toEqual(shownData);
    });

    test('the Preset the graph exports reads back as the same scene', () => {
        const {graph} = mountLinear();
        typeLinear('y₁', 3);
        const exported = graph.exportPreset();
        expect(exported.data).toEqual({x1: 0, y1: 3, x2: 2, y2: 5});
        typeLinear('x₂', 6);
        act(() => { graph.importPreset({...exported, id: 'stored'}); });
        expect(linearShown(graph)).toEqual({model: {x1: 0, y1: 3, x2: 2, y2: 5}, fields: ['0', '3', '2', '5'], points: [[0, 3], [2, 5]], k: '1', n: '3'});
    });
});

describe('linear function: replacement paths keep domain, controls and board together', () => {
    const edited = {model: {x1: 0, y1: 3, x2: 2, y2: 5}, fields: ['0', '3', '2', '5'], points: [[0, 3], [2, 5]], k: '1', n: '3'};

    test('checkpoint rollback restores the captured scene after edits, a drag and a command', () => {
        const {graph} = mountLinear();
        typeLinear('y₁', 3);
        const checkpoint = graph.getLessonCapabilities().captureState();
        typeLinear('x₂', 6);
        apply(graph, lessonParameter('k', 4));
        const [p1] = freePoints(graph);
        act(() => { p1.setPositionDirectly(COORDS_BY_USER, [1, 1]); p1.triggerEventHandlers(['drag'], []); });
        expect(graph.exportPresetData()).not.toEqual(edited.model);
        act(() => { graph.getLessonCapabilities().restoreState(checkpoint); });
        expect(linearShown(graph)).toEqual(edited);
        // The restored scene still takes edits.
        typeLinear('y₂', 7);
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 3, x2: 2, y2: 7});
        near(handles(graph)[1], [2, 7]);
    });

    // Checkpoints keep the flat file shape by design (`value.graphState` holds the host fields and the model's fields beside
    // `value.data`, through `savedGraphState`); only `data` is authority.
    test('checkpoint shape: a checkpoint whose scene state disagrees with its data shows the data in domain, controls and board', () => {
        const {graph} = mountLinear();
        typeLinear('y₁', 3);
        const checkpoint = graph.getLessonCapabilities().captureState();
        const value = checkpoint.value as {graphState: Record<string, unknown>; data: Record<string, number>};
        expect(value.data).toEqual({x1: 0, y1: 3, x2: 2, y2: 5});
        value.graphState = {...value.graphState, x1: -4, y1: 9, x2: 8, y2: -7};
        typeLinear('x₂', 6);
        act(() => { graph.getLessonCapabilities().restoreState(checkpoint); });
        expect(linearShown(graph)).toEqual(edited);
        typeLinear('y₂', 7);
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 3, x2: 2, y2: 7});
    });

    // `commitModel` stores the object it is given as the live model; the store holds nothing else of the model.
    test('commitModel makes the given object the live model', () => {
        const {graph} = mountLinear();
        const next = {x1: 1, y1: 2, x2: 3, y2: 4};
        act(() => { graph.commit(next); });
        expect(graph.currentModel()).toBe(next);
        expect(Object.keys(graph.state).sort()).toEqual(['initialized', 'model']);
        expect(linearShown(graph)).toEqual({model: next, fields: ['1', '2', '3', '4'], points: [[1, 2], [3, 4]], k: '1', n: '1'});
    });

    test('restoring a checkpoint captured at the default scene returns to the default model and view', () => {
        const {graph} = mountLinear();
        const checkpoint = graph.getLessonCapabilities().captureState();
        const view = box(graph);
        typeLinear('y₁', 3);
        act(() => { graph.liveBoard().setBoundingBox([-1, 2, 3, -2], false); });
        expect(box(graph)).not.toEqual(view);
        act(() => { graph.getLessonCapabilities().restoreState(checkpoint); });
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
        near(box(graph), view);
    });

    test('a figure batch shows each Preset (data wins over graphState) and returns to the entry scene', async () => {
        const {graph} = mountLinear();
        typeLinear('y₁', 3);
        const seen: Array<ReturnType<typeof linearShown>> = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            // Let the host commit the replaced scene state, so the controls show what a figure of the scene would.
            await act(async () => { await Promise.resolve(); });
            seen.push(linearShown(graph));
            return new Blob(['png']);
        });
        const conflict = {id: 'conflict', graphState: {initialized: true, x1: -3, y1: -2, x2: 6, y2: 7}, data: {x1: 1, y1: 2, x2: 3, y2: 4}} as unknown as Preset;
        await settle(() => internals(graph).exportPresetFigures([conflict]));
        expect(seen).toEqual([{model: {x1: 1, y1: 2, x2: 3, y2: 4}, fields: ['1', '2', '3', '4'], points: [[1, 2], [3, 4]], k: '1', n: '1'}]);
        expect(linearShown(graph)).toEqual(edited);
    });

    test('Reset returns to the default scene; the edited scene does not leak into the controls or the board', async () => {
        const {graph} = mountLinear();
        typeLinear('y₁', 3);
        await settle(() => graph.reset());
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
    });

    test('unmounting notifies no store subscriber: a host must not re-render against a disposed board', () => {
        const {graph, view} = mountLinear();
        typeLinear('y₁', 3);
        const listener = vi.fn();
        const unsubscribe = graph.store.subscribe(listener);
        view.unmount();
        unsubscribe();
        expect(listener).not.toHaveBeenCalled();
    });

    test('a remount of the same instance starts from the default model, like a new instance', () => {
        const {graph, view, tree} = mountLinear();
        typeLinear('y₁', 3);
        view.unmount();
        render(tree);
        expect(linearShown(graph)).toEqual(LINEAR_DEFAULT_SHOWN);
        typeLinear('y₂', 7);
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 1, x2: 2, y2: 7});
    });

    test('a language change keeps model and points, and redraws the board texts and readouts in the new language', () => {
        const {graph} = mountLinear();
        typeLinear('y₂', 4);
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 1, x2: 2, y2: 4});
        expect(readout('k')).toBe('1,5');
        expect(texts(graph).some(text => text.includes('1,5'))).toBe(true);
        act(() => { setLanguage('en'); });
        expect(graph.exportPresetData()).toEqual({x1: 0, y1: 1, x2: 2, y2: 4});
        expect(linearFields()).toEqual(['0', '1', '2', '4']);
        near(handles(graph)[1], [2, 4]);
        expect(readout('k')).toBe('1.5');
        expect(texts(graph).some(text => text.includes('1.5'))).toBe(true);
        expect(texts(graph).some(text => text.includes('1,5'))).toBe(false);
    });
});

// ---- Binomial-normal (cache heavy) -----------------------------------------------------------------------------------

const BIN_DEFAULT = {n: 20, p: 0.5, k: 8, correction: true, poisson: false};
const mountBinomial = () => mount(new ObservedBinomialGraph());
const binField = (label: RegExp) => screen.getByLabelText(label, {selector: 'input:not([type="range"])'}) as HTMLInputElement;
const K_FIELD = /^Meja k \(P\(X ≤ k\)\)$/;
const N_FIELD = /^Število poskusov n, vrednost$/;
const P_FIELD = /^Natančna vrednost p$/;
const exampleSelect = () => screen.getByLabelText(/^Primer$/) as HTMLSelectElement;
const poissonSwitch = () => screen.getByLabelText(/^Poissonovi stolpci$/) as HTMLInputElement;
const correctionSwitch = () => screen.getByLabelText(/^Popravek za zveznost/) as HTMLInputElement;
const typeK = (value: number) => enter(binField(K_FIELD), value);
const snapshotCalls = () => ({...calls});

/** Binomial CDF from an integer product, independent of the model code. */
const cdf = (n: number, p: number, k: number) => {
    let sum = 0;
    for (let j = 0; j <= k; j++) {
        let coefficient = 1;
        for (let i = 1; i <= j; i++) coefficient = coefficient * (n - j + i) / i;
        sum += coefficient * p ** j * (1 - p) ** (n - j);
    }
    return sum;
};
const commaFive = (value: number) => value.toFixed(5).replace('.', ',');
const trimmed = (value: number) => commaFive(value).replace(/0+$/, '').replace(/,$/, '');

/** Domain, controls and board of the binomial graph. The bar curve is the outline of the pmf: its data depends on n and p. */
function binomialShown(graph: ObservedBinomialGraph) {
    const [kPoint] = freePoints(graph);
    return {
        model: graph.exportPresetData(),
        k: binField(K_FIELD).value, n: binField(N_FIELD).value, p: binField(P_FIELD).value,
        example: exampleSelect().value, poisson: poissonSwitch().checked, correction: correctionSwitch().checked,
        handle: [kPoint.X(), kPoint.Y()],
        exact: readout('exact'),
        curveData: curves(graph).map(curve => [curve.dataX?.length ?? 0, curve.dataY?.length ?? 0]),
        box: box(graph),
    };
}

describe('binomial-normal: accepted edits and caches', () => {
    test('typing k changes the model, the control, the handle and the readout; every model cache recomputes', () => {
        const {graph} = mountBinomial();
        expect(graph.exportPresetData()).toEqual(BIN_DEFAULT);
        const before = snapshotCalls();
        typeK(12);
        expect(graph.exportPresetData()).toEqual({...BIN_DEFAULT, k: 12});
        expect(binField(K_FIELD).value).toBe('12');
        near([freePoints(graph)[0].X()], [12]);
        expect(readout('exact')).toBe(trimmed(cdf(20, 0.5, 12)));
        expect(calls.bars).toBeGreaterThan(before.bars);
        expect(calls.shaded).toBeGreaterThan(before.shaded);
    });

    test('the board and the inspector share one view computation per accepted edit (memoView)', () => {
        const {graph} = mountBinomial();
        const before = calls.view;
        typeK(12);
        expect(graph.exportPresetData().k).toBe(12);
        expect(calls.view - before).toBe(1);
    });

    test('an accepted edit to the current value is a valid no-op: nothing recomputes and the scene is unchanged', () => {
        const {graph} = mountBinomial();
        const shown = binomialShown(graph);
        const before = snapshotCalls();
        apply(graph, lessonParameter('binomial-k', 8));
        expect(snapshotCalls()).toEqual(before);
        expect(binomialShown(graph)).toEqual(shown);
        // A refused edit leaves the scene and the caches alone.
        expect(() => act(() => { graph.getLessonCapabilities().apply(lessonParameter('binomial-k', 99)); })).toThrow(DomainError);
        expect(snapshotCalls()).toEqual(before);
        expect(binomialShown(graph)).toEqual(shown);
    });
});

describe('binomial-normal: host-only updates keep the model identity seen by modelCache consumers', () => {
    test('a scene-state write that carries no model field, a board update and a language change do not recompute any cache', () => {
        const {graph} = mountBinomial();
        const shown = binomialShown(graph);
        const before = snapshotCalls();
        act(() => { graph.setState({initialized: true}); });
        act(() => { graph.liveBoard().fullUpdate(); });
        act(() => { setLanguage('en'); });
        act(() => { setLanguage('sl'); });
        act(() => { graph.liveBoard().fullUpdate(); });
        expect(snapshotCalls()).toEqual(before);
        expect(binomialShown(graph)).toEqual(shown);
    });

    test('a pan of the board is a host-only change too; after a real edit the caches follow the new model only', () => {
        const {graph} = mountBinomial();
        const before = snapshotCalls();
        act(() => { graph.liveBoard().setBoundingBox([-2, 0.5, 30, -0.1], false); });
        expect(snapshotCalls()).toEqual(before);
        typeK(9);
        const afterEdit = snapshotCalls();
        expect(afterEdit.bars).toBeGreaterThan(before.bars);
        act(() => { graph.liveBoard().fullUpdate(); });
        act(() => { setLanguage('en'); });
        expect(snapshotCalls()).toEqual(afterEdit);
    });
});

describe('binomial-normal: one model object serves the inspector and the board', () => {
    test('after one accepted edit, the inspector render and a board update hit each modelCache once', () => {
        const {graph} = mountBinomial();
        const before = snapshotCalls();
        typeK(12);
        act(() => { graph.liveBoard().fullUpdate(); });
        const after = snapshotCalls();
        expect(after.bars - before.bars).toBe(1);
        expect(after.shaded - before.shaded).toBe(1);
        expect(after.view - before.view).toBe(1);
    });
});

describe('binomial-normal: board synchronization timing', () => {
    test('dragging the k handle commits k with only the handle snap move; typing k moves it (full sync)', () => {
        const {graph} = mountBinomial();
        const [kPoint] = freePoints(graph);
        // As in a real drag: the pointer has already moved the point, so only moveTo calls after the drag event count.
        kPoint.moveTo([11, 0]);
        const moved = vi.spyOn(kPoint, 'moveTo');
        act(() => { kPoint.triggerEventHandlers(['drag'], []); });
        expect(graph.exportPresetData().k).toBe(11);
        expect(binField(K_FIELD).value).toBe('11');
        expect(readout('exact')).toBe(trimmed(cdf(20, 0.5, 11)));
        // Observed: the sliding point snaps itself once during the drag; the commit adds no second sync move (syncScene: false).
        expect(moved).toHaveBeenCalledTimes(1);
        typeK(5);
        expect(moved).toHaveBeenCalledTimes(2);
        near([kPoint.X()], [5]);
        expect(readout('exact')).toBe(trimmed(cdf(20, 0.5, 5)));
    });
});

describe('binomial-normal: same-tick lesson actions', () => {
    test('n = 50, then k = 30 (valid only with the new n), then p = 0.3, in one tick', () => {
        const {graph} = mountBinomial();
        apply(graph, lessonParameter('binomial-n', 50), lessonParameter('binomial-k', 30), lessonParameter('binomial-p', 0.3));
        expect(graph.exportPresetData()).toEqual({n: 50, p: 0.3, k: 30, correction: true, poisson: false});
        expect([binField(N_FIELD).value, binField(K_FIELD).value, binField(P_FIELD).value]).toEqual(['50', '30', '0,3']);
        near([freePoints(graph)[0].X()], [30]);
        expect(readout('exact')).toBe(trimmed(cdf(50, 0.3, 30)));
        const [left, , right] = box(graph);
        expect(left).toBeLessThan(30);
        expect(right).toBeGreaterThan(30);
    });
});

describe('binomial-normal: Preset import with a model in both graphState and data', () => {
    const DATA = {n: 100, p: 0.02, k: 2, correction: false, poisson: true};
    const FLAT = {initialized: true, n: 30, p: 0.4, k: 3, correction: true, poisson: false};

    test('the model in data wins over the flat fields of graphState, in domain, controls and board', () => {
        const {graph} = mountBinomial();
        act(() => { graph.importPreset({id: 'conflict', graphState: FLAT, data: DATA} as unknown as Preset); });
        const shown = binomialShown(graph);
        expect(shown.model).toEqual(DATA);
        expect([shown.n, shown.k, shown.poisson, shown.correction]).toEqual(['100', '2', true, false]);
        expect(shown.handle[0]).toBeCloseTo(2, 9);
        expect(shown.exact).toBe(trimmed(cdf(100, 0.02, 2)));
        expect(curves(graph).some(curve => (curve.dataX?.length ?? 0) > 0)).toBe(true);
    });

    test('a Preset without data shows the default model; with data the controls follow it', () => {
        const {graph} = mountBinomial();
        act(() => { graph.importPreset({id: 'conflict', graphState: FLAT, data: DATA} as unknown as Preset); });
        act(() => { graph.importPreset({id: 'no-data', graphState: FLAT} as unknown as Preset); });
        const shown = binomialShown(graph);
        expect(shown.model).toEqual(BIN_DEFAULT);
        expect([shown.n, shown.k, shown.poisson, shown.correction]).toEqual(['20', '8', false, true]);
        expect(shown.handle[0]).toBeCloseTo(8, 9);
        expect(shown.exact).toBe(trimmed(cdf(20, 0.5, 8)));
    });

    test('a stored file with both parts loads by selection with data winning, and Reset reloads it', async () => {
        const file = JSON.stringify({'preset-prob-binomial-normal': {data: [{id: 'Stara', graphState: FLAT, data: DATA}]}});
        commitPresetImport(preflightPresetImport(file, appStorage), appStorage);
        const {graph} = mountBinomial();
        await settle(() => graph.reloadAfterImport());
        await settle(() => graph.selectPreset('Stara'));
        expect(graph.exportPresetData()).toEqual(DATA);
        expect(binField(K_FIELD).value).toBe('2');
        typeK(1);
        expect(graph.exportPresetData().k).toBe(1);
        await settle(() => graph.reset());
        expect(graph.exportPresetData()).toEqual(DATA);
        expect(binField(K_FIELD).value).toBe('2');
        near([freePoints(graph)[0].X()], [2]);
    });
});

describe('binomial-normal: replacement paths keep domain, controls and board together', () => {
    const RARE = {n: 100, p: 0.02, k: 2, correction: true, poisson: true};
    const choose = (id: string) => act(() => { fireEvent.change(exampleSelect(), {target: {value: id}}); });

    test('checkpoint rollback restores model, controls, handle and curves; caches serve the restored model', () => {
        const {graph} = mountBinomial();
        choose('rare');
        const shown = binomialShown(graph);
        expect(shown.model).toEqual(RARE);
        const checkpoint = graph.getLessonCapabilities().captureState();
        choose('fair100');
        typeK(60);
        apply(graph, lessonChoice('binomial-correction', 'off'));
        expect(graph.exportPresetData()).not.toEqual(RARE);
        act(() => { graph.getLessonCapabilities().restoreState(checkpoint); });
        expect(binomialShown(graph)).toEqual(shown);
        // An edit after the restore starts from the restored model.
        typeK(3);
        expect(graph.exportPresetData()).toEqual({...RARE, k: 3});
        expect(readout('exact')).toBe(trimmed(cdf(100, 0.02, 3)));
    });

    test('a figure batch shows the Preset (data wins) and returns to the entry scene, caches included', async () => {
        const {graph} = mountBinomial();
        choose('rare');
        typeK(4);
        const entry = binomialShown(graph);
        const seen: Array<ReturnType<typeof binomialShown>> = [];
        (capturePNGBlob as Mock).mockImplementation(async () => {
            seen.push(binomialShown(graph));
            return new Blob(['png']);
        });
        const conflict = {id: 'conflict', graphState: {initialized: true, n: 30, p: 0.4, k: 3, correction: true, poisson: false},
            data: BIN_DEFAULT} as unknown as Preset;
        await settle(() => internals(graph).exportPresetFigures([conflict]));
        expect(seen).toHaveLength(1);
        expect(seen[0].model).toEqual(BIN_DEFAULT);
        expect([seen[0].n, seen[0].k, seen[0].poisson]).toEqual(['20', '8', false]);
        expect(seen[0].exact).toBe(trimmed(cdf(20, 0.5, 8)));
        expect(binomialShown(graph)).toEqual(entry);
    });

    test('Reset, remount and language change keep domain values, controls and board geometry together', async () => {
        const {graph, view, tree} = mountBinomial();
        const initial = binomialShown(graph);
        choose('rare');
        typeK(4);
        await settle(() => graph.reset());
        expect(binomialShown(graph)).toEqual(initial);

        choose('rare');
        const rare = binomialShown(graph);
        act(() => { setLanguage('en'); });
        expect(graph.exportPresetData()).toEqual(RARE);
        expect(binField(/^Threshold k/).value).toBe('2');
        expect(readout('exact')).toBe(trimmed(cdf(100, 0.02, 2)).replace(',', '.'));
        expect(box(graph)).toEqual(rare.box);
        expect(binomialShown2(graph).curveData).toEqual(rare.curveData);
        act(() => { setLanguage('sl'); });

        view.unmount();
        render(tree);
        expect(binomialShown(graph)).toEqual(initial);
    });
});

/** `binomialShown` reads English labels differently; the board curves are language independent. */
const binomialShown2 = (graph: ObservedBinomialGraph) => ({curveData: curves(graph).map(curve => [curve.dataX?.length ?? 0, curve.dataY?.length ?? 0])});
