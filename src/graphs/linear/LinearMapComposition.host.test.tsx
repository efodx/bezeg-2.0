import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {LinearMapGraph} from './LinearMapGraph';
import {linearMapPresetCollection} from './linearMapPresetCollection';
import {enterNumber} from '../../inputs/testEntry';
import {DEFAULT_LINEAR_MAP_STATE, type LinearMapState} from '../../linear/linearMapModel';
import {LINEAR_MAP_EXAMPLES, type Mat2} from '../../linear/matrix2';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

class ObservedGraph extends LinearMapGraph {
    liveBoard() { return this.board; }
    modelNow() { return this.model; }
    ownedObjects() { return this.generatedObjectCount; }
}

function mountGraph() {
    const graph = new ObservedGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent;
const selectMode = (mode: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_mode_label')), {target: {value: mode}}); });
const pickSource = (name: 'A' | 'B', value: string) =>
    act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_comp_source_label', {value0: name})), {target: {value}}); });
const angleSlider = (name: 'A' | 'B') => screen.getByRole('slider', {name: new RegExp(t('linear_map_comp_angle_rotation', {value0: name}))});
const reset = () => act(() => { fireEvent.click(document.querySelector('[data-action="linear-map-reset-composition"]')!); });
const entry = (name: string, row: number, column: number) =>
    screen.getByLabelText(t('linear_map_comp_entry_label', {value0: name, value1: String(row), value2: String(column)})) as HTMLInputElement;

const R = {kind: 'rotation', k: 6} as const;
const F = {kind: 'reflection', k: 0} as const;
const E: Mat2 = [[2, 1], [0, 1]];

describe('the composition mode on the real graph', () => {
    test('entering the mode installs the lesson example R then F and reads the product out', () => {
        const {graph} = mountGraph();
        selectMode('composition');
        expect(graph.modelNow()).toMatchObject({mode: 'composition', element: R, secondElement: F});
        expect(readout('product-det')).toMatch(/1$/);
        expect(readout('product-det')).toMatch(/^[−-]/);
        expect(readout('product-element')).toBeDefined();
        expect(readout('t')).toBeUndefined();
    });

    test('switching modes both ways keeps the stored composition, and a stored composition is not replaced on re-entry', () => {
        const {graph} = mountGraph();
        act(() => { graph.importPresetData({...DEFAULT_LINEAR_MAP_STATE, matrix: E, exampleId: 'custom', mode: 'basis'}); });
        selectMode('composition');
        pickSource('B', 'rotation');
        act(() => { fireEvent.keyDown(angleSlider('B'), {key: 'ArrowRight', shiftKey: true}); });
        const inComposition = graph.modelNow();
        expect(inComposition.secondElement).toEqual({kind: 'rotation', k: 6});
        selectMode('basis');
        expect(graph.modelNow()).toMatchObject({mode: 'basis', matrix: inComposition.matrix, secondElement: inComposition.secondElement});
        selectMode('eigen');
        selectMode('composition');
        expect(graph.modelNow()).toMatchObject({mode: 'composition', matrix: inComposition.matrix, element: inComposition.element, secondElement: inComposition.secondElement});
        // The older modes keep their own state: the basis matrix is untouched by anything done in the composition mode.
        expect(graph.modelNow().matrix).toEqual(inComposition.matrix);
    });

    test('choosing the sources and elements through the controls updates the readout', () => {
        const {graph} = mountGraph();
        selectMode('composition');
        pickSource('A', 'free');
        expect(graph.modelNow().element).toBeUndefined();
        expect(readout('a-source')).toBe(t('linear_map_comp_value_free'));
        act(() => { enterNumber(entry('A', 1, 1), '2'); });
        expect(graph.modelNow().matrix[0][0]).toBe(2);
        pickSource('B', 'free');
        act(() => { enterNumber(entry('B', 2, 2), '0,5'); });
        expect(graph.modelNow().secondMatrix).toEqual([[1, 0], [0, 0.5]]);
        expect(readout('product-det')).toBe('1');
        pickSource('A', 'reflection');
        expect(graph.modelNow().element).toEqual({kind: 'reflection', k: 0});
        expect(readout('a-source')).toBe(t('linear_map_comp_value_reflection', {value0: '0', value1: '0'}));
        expect(readout('product-element')).toBeUndefined();
    });

    test('the keyboard moves the angle control by one step, a big step with Shift, and stops at the ends', () => {
        const {graph} = mountGraph();
        selectMode('composition');
        const slider = angleSlider('A');
        act(() => { fireEvent.keyDown(slider, {key: 'ArrowRight', shiftKey: true}); });
        expect(graph.modelNow().element).toEqual({kind: 'rotation', k: 12});
        act(() => { fireEvent.keyDown(slider, {key: 'PageDown'}); });
        expect(graph.modelNow().element).toEqual({kind: 'rotation', k: 6});
        act(() => { fireEvent.keyDown(angleSlider('A'), {key: 'ArrowUp', shiftKey: true}); });
        act(() => { fireEvent.keyDown(angleSlider('A'), {key: 'PageUp'}); });
        act(() => { fireEvent.keyDown(angleSlider('A'), {key: 'PageUp'}); });
        act(() => { fireEvent.keyDown(angleSlider('A'), {key: 'PageUp'}); });
        expect(graph.modelNow().element).toEqual({kind: 'rotation', k: 23});
        expect(readout('product-element')).toBeDefined();
    });

    test('the pivot switch stores a pivot and shows t; the translation fields store grid values', () => {
        const {graph} = mountGraph();
        selectMode('composition');
        act(() => { fireEvent.click(screen.getByLabelText(t('linear_map_comp_pivot_toggle'))); });
        expect(graph.modelNow().pivot).toEqual([0, 0]);
        act(() => { enterNumber(screen.getByLabelText(t('linear_map_comp_pivot_x')), '3'); });
        act(() => { enterNumber(screen.getByLabelText(t('linear_map_comp_pivot_y')), '1'); });
        expect(graph.modelNow().pivot).toEqual([3, 1]);
        expect(readout('t')).toBeDefined();
        act(() => { enterNumber(screen.getByLabelText(t('linear_map_comp_translation_x')), '1,3'); });
        expect(graph.modelNow().translation?.[0]).toBe(1.25);
        act(() => { fireEvent.click(screen.getByLabelText(t('linear_map_comp_pivot_toggle'))); });
        expect(graph.modelNow()).not.toHaveProperty('pivot');
        expect(readout('t')).toBeUndefined();
    });

    test('Reset gives the defaults and is unavailable while they already hold', () => {
        const {graph} = mountGraph();
        selectMode('composition');
        const button = () => document.querySelector('[data-action="linear-map-reset-composition"]') as HTMLElement;
        expect(button().getAttribute('aria-disabled')).toBe('true');
        pickSource('A', 'free');
        act(() => { fireEvent.click(screen.getByLabelText(t('linear_map_comp_pivot_toggle'))); });
        expect(button().getAttribute('aria-disabled')).not.toBe('true');
        reset();
        expect(graph.modelNow()).toMatchObject({mode: 'composition', element: R, secondElement: F});
        expect(graph.modelNow()).not.toHaveProperty('pivot');
        expect(graph.modelNow()).not.toHaveProperty('translation');
        expect(button().getAttribute('aria-disabled')).toBe('true');
    });
});

describe('Presets', () => {
    const composed: LinearMapState = {
        ...DEFAULT_LINEAR_MAP_STATE, mode: 'composition', exampleId: 'identity', element: R, secondElement: {kind: 'reflection', k: 5},
        translation: [1.25, -2], pivot: [3, 1],
    };

    test('a composition exports, passes the collection check, and imports into a fresh graph with the same readout', () => {
        const {graph} = mountGraph();
        act(() => { graph.importPresetData(composed); });
        const exported = JSON.parse(JSON.stringify(graph.exportPresetData()));
        expect(exported).toMatchObject({element: R, secondElement: {kind: 'reflection', k: 5}, translation: [1.25, -2], pivot: [3, 1]});
        const checked = linearMapPresetCollection.check(exported);
        expect('data' in checked).toBe(true);
        const before = readout('t');
        const fresh = mountGraph();
        act(() => { fresh.graph.importPresetData((checked as {data: LinearMapState}).data); });
        expect(JSON.parse(JSON.stringify(fresh.graph.exportPresetData()))).toEqual(exported);
        expect(readout('t')).toBe(before);
        expect('rejection' in linearMapPresetCollection.check({...exported, element: {kind: 'rotation', k: 24}})).toBe(true);
        expect('rejection' in linearMapPresetCollection.check({...exported, pivot: [0.3, 0]})).toBe(true);
        expect(linearMapPresetCollection.checkGraphState!({matrix: [[1, 0], [0, 1]], element: R, secondElement: F, translation: [0, 0], pivot: [1, 1]})).toBeUndefined();
    });

    test('older Presets load unchanged and export without composition fields', () => {
        const {graph} = mountGraph();
        for (const [exampleId, matrix] of Object.entries(LINEAR_MAP_EXAMPLES) as [string, Mat2][]) {
            const old = {matrix, mode: 'determinant', testAngle: 30, exampleId, probeVisible: false, curveVisible: true, squareVisible: true};
            const checked = linearMapPresetCollection.check(JSON.parse(JSON.stringify(old)));
            expect('data' in checked).toBe(true);
            act(() => { graph.importPresetData((checked as {data: LinearMapState}).data); });
            const exported = JSON.parse(JSON.stringify(graph.exportPresetData()));
            expect(exported).toEqual(old);
            for (const key of ['element', 'secondElement', 'secondMatrix', 'translation', 'pivot']) expect(exported).not.toHaveProperty(key);
        }
    });
});

describe('ownership', () => {
    function netListeners(run: () => void): number {
        const spies = [window, document].map(target => [vi.spyOn(target, 'addEventListener'), vi.spyOn(target, 'removeEventListener')] as const);
        try {
            run();
            return spies.reduce((sum, [add, remove]) => sum + add.mock.calls.length - remove.mock.calls.length, 0);
        } finally {
            spies.flat().forEach(spy => spy.mockRestore());
        }
    }

    test('composition use and unmount leave no listener and no owned object behind, and mode switches add no objects', () => {
        mountGraph().view.unmount(); // warm-up
        /** Net listeners of a session; the plain mount and unmount is the reference, so the use of the composition mode must add nothing. */
        const session = (useComposition: boolean) => {
            let mounted!: ReturnType<typeof mountGraph>;
            const net = netListeners(() => {
                mounted = mountGraph();
                if (useComposition) {
                    for (const mode of ['composition', 'basis', 'composition']) selectMode(mode);
                    const objects = mounted.graph.liveBoard().objectsList.length;
                    act(() => { fireEvent.click(screen.getByLabelText(t('linear_map_comp_pivot_toggle'))); });
                    act(() => { fireEvent.click(screen.getByLabelText(t('linear_map_comp_pivot_toggle'))); });
                    pickSource('A', 'free');
                    pickSource('A', 'rotation');
                    expect(mounted.graph.liveBoard().objectsList.length).toBe(objects);
                }
                mounted.view.unmount();
            });
            expect(mounted.graph.ownedObjects()).toBe(0);
            return net;
        };
        const reference = session(false);
        expect(session(true)).toBe(reference);
    });
});
