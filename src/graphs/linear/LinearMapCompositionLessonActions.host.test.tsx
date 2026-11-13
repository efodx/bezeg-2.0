import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims} from '../base/realGraphTestHarness';
import {LinearMapGraph} from './LinearMapGraph';
import {enterNumber} from '../../inputs/testEntry';
import {DEFAULT_LINEAR_MAP_STATE} from '../../linear/linearMapModel';
import {setLanguage, t} from '../../localization';

beforeAll(installBoardShims);
beforeEach(() => setLanguage('sl'));

class ObservedGraph extends LinearMapGraph {
    modelNow() { return this.model; }
    act(action: object) { this.applyLinearMapAction(action as never); }
}

function mountGraph() {
    const graph = new ObservedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
}

const apply = (graph: ObservedGraph, ...actions: object[]) => act(() => { for (const action of actions) graph.act(action); });
const readouts = () => Object.fromEntries([...document.querySelectorAll('[data-readout]')]
    .map(row => [row.getAttribute('data-readout'), row.querySelector('dd')?.textContent]));
const snapshot = (graph: ObservedGraph) => ({model: graph.modelNow(), readouts: readouts()});

const selectMode = (mode: string) => act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_mode_label')), {target: {value: mode}}); });
const pickSource = (name: 'A' | 'B', value: string) =>
    act(() => { fireEvent.change(screen.getByLabelText(t('linear_map_comp_source_label', {value0: name})), {target: {value}}); });
const slider = (name: 'A' | 'B', kind: 'rotation' | 'reflection') =>
    screen.getByRole('slider', {name: new RegExp(t(`linear_map_comp_angle_${kind}`, {value0: name}))});
const setAngle = (name: 'A' | 'B', kind: 'rotation' | 'reflection', k: number) =>
    act(() => { fireEvent.change(slider(name, kind), {target: {value: String(k)}}); });
const entry = (name: string, row: number, column: number) =>
    screen.getByLabelText(t('linear_map_comp_entry_label', {value0: name, value1: String(row), value2: String(column)})) as HTMLInputElement;
const field = (key: 'translation_x' | 'translation_y' | 'pivot_x' | 'pivot_y', value: string) =>
    act(() => { enterNumber(screen.getByLabelText(t(`linear_map_comp_${key}`)), value); });

const composition = {kind: 'linear-map', operation: 'set-mode', mode: 'composition'};
const choose = (slot: string, element?: object | null) => ({kind: 'linear-map', operation: 'choose-element', slot, element});

describe('composition-mode lesson actions on the real graph', () => {
    test('each action equals the matching control', () => {
        const viaActions = mountGraph();
        apply(viaActions,
            composition, choose('first', {kind: 'rotation', k: 2}), choose('second', {kind: 'reflection', k: 3}),
            {kind: 'linear-map', operation: 'set-translation', translation: [2, 1]},
            {kind: 'linear-map', operation: 'set-pivot', pivot: [3, 1]});
        const byAction = snapshot(viaActions);
        cleanup();

        const viaControls = mountGraph();
        selectMode('composition');
        setAngle('A', 'rotation', 2);
        pickSource('B', 'reflection');
        setAngle('B', 'reflection', 3);
        field('translation_x', '2');
        field('translation_y', '1');
        act(() => { fireEvent.click(screen.getByLabelText(t('linear_map_comp_pivot_toggle'))); });
        field('pivot_x', '3');
        field('pivot_y', '1');
        expect(snapshot(viaControls)).toEqual(byAction);
        cleanup();

        // The free entries of slot B (and slot A) through set-matrix with a target, with the source cleared by choose-element.
        const freeActions = mountGraph();
        apply(freeActions, composition, choose('second'), {kind: 'linear-map', operation: 'set-matrix', matrix: [[1, 1], [0, 1]], target: 'secondMatrix'});
        const freeByAction = snapshot(freeActions);
        cleanup();
        const freeControls = mountGraph();
        selectMode('composition');
        pickSource('B', 'free');
        act(() => { enterNumber(entry('B', 1, 2), '1'); });
        expect(snapshot(freeControls)).toEqual(freeByAction);
        expect(freeByAction.model.secondMatrix).toEqual([[1, 1], [0, 1]]);
        expect(freeByAction.model.secondElement).toBeUndefined();
    });

    test('one synchronous sequence is read after its last action', () => {
        const graph = mountGraph();
        apply(graph,
            composition, choose('first', {kind: 'rotation', k: 6}), choose('second', {kind: 'rotation', k: 6}),
            {kind: 'linear-map', operation: 'set-translation', translation: [2, 1]},
            {kind: 'linear-map', operation: 'set-pivot', pivot: [3, 1]});
        expect(graph.modelNow()).toMatchObject({
            mode: 'composition', element: {kind: 'rotation', k: 6}, secondElement: {kind: 'rotation', k: 6}, translation: [2, 1], pivot: [3, 1],
        });
        // Two quarter turns: the product is -I.
        expect(readouts()['product-row1']).toMatch(/−1.*0/);
        expect(readouts()['product-det']).toBe('1');
        expect(readouts()['t']).toBeDefined();
    });

    test('set-mode composition acts as the mode switch: defaults from nothing, a stored composition is kept', () => {
        const graph = mountGraph();
        apply(graph, composition);
        expect(graph.modelNow()).toMatchObject({mode: 'composition', element: {kind: 'rotation', k: 6}, secondElement: {kind: 'reflection', k: 0}});
        const viaAction = snapshot(graph);
        cleanup();
        const viaSwitch = mountGraph();
        selectMode('composition');
        expect(snapshot(viaSwitch)).toEqual(viaAction);
        cleanup();

        const stored = mountGraph();
        apply(stored, {kind: 'linear-map', operation: 'choose-element', slot: 'second', element: {kind: 'rotation', k: 5}}, composition);
        expect(stored.modelNow()).toMatchObject({mode: 'composition', secondElement: {kind: 'rotation', k: 5}});
        expect(stored.modelNow().element).toBeUndefined();
    });

    test('null drops the translation and the pivot', () => {
        const graph = mountGraph();
        apply(graph, composition, {kind: 'linear-map', operation: 'set-translation', translation: [2, 1]}, {kind: 'linear-map', operation: 'set-pivot', pivot: [3, 1]});
        expect(readouts()['t']).toBeDefined();
        apply(graph, {kind: 'linear-map', operation: 'set-translation', translation: null});
        expect(graph.modelNow()).not.toHaveProperty('translation');
        expect(graph.modelNow().pivot).toEqual([3, 1]);
        apply(graph, {kind: 'linear-map', operation: 'set-pivot', pivot: null});
        expect(graph.modelNow()).not.toHaveProperty('pivot');
        expect(readouts()['t']).toBeUndefined();
        apply(graph, choose('first', null));
        expect(graph.modelNow().element).toBeUndefined();
    });

    test('restoring the checkpoint after the actions returns the free state', () => {
        const graph = mountGraph();
        const capabilities = graph.getLessonCapabilities();
        const free = snapshot(graph);
        const checkpoint = capabilities.captureState();
        apply(graph, composition, choose('first', {kind: 'rotation', k: 2}), {kind: 'linear-map', operation: 'set-pivot', pivot: [3, 1]});
        expect(graph.modelNow()).not.toEqual(free.model);
        act(() => { capabilities.restoreState(checkpoint); });
        expect(snapshot(graph)).toEqual(free);
    });

    test('invalid actions change nothing and the message names the field', () => {
        const graph = mountGraph();
        apply(graph, composition);
        const before = snapshot(graph);
        const cases: [object, RegExp][] = [
            [choose('first', {kind: 'rotation', k: 24}), /k/],
            [choose('first', {kind: 'rotation', k: 1.5}), /k/],
            [choose('first', {kind: 'shear', k: 1}), /kind/],
            [choose('third', {kind: 'rotation', k: 1}), /slot/],
            [{kind: 'linear-map', operation: 'set-translation', translation: [4.25, 0]}, /translation/],
            [{kind: 'linear-map', operation: 'set-translation', translation: [0.1, 0]}, /translation/],
            [{kind: 'linear-map', operation: 'set-translation'}, /translation/],
            [{kind: 'linear-map', operation: 'set-pivot', pivot: [0, 5]}, /pivot/],
            [{kind: 'linear-map', operation: 'set-pivot', pivot: [1]}, /pivot/],
        ];
        for (const [action, field] of cases) {
            expect(() => graph.act(action), JSON.stringify(action)).toThrow(field);
            expect(snapshot(graph), JSON.stringify(action)).toEqual(before);
        }
        expect(DEFAULT_LINEAR_MAP_STATE.mode).not.toBe('composition');
    });
});
