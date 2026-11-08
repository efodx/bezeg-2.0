import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {FivePointGraph} from './FivePointGraph';
import {PolePolarGraph} from './PolePolarGraph';
import {PascalGraph} from './PascalGraph';
import {CrossRatioGraph} from './CrossRatioGraph';
import {FIVE_POINT_EXAMPLE_IDS, FIVE_POINT_NUMERATOR_LIMIT, FivePointExampleId, FivePointModel} from './fivePointModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
import {chooseOption, typeNumber} from './controlsTest';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

type AnyProjectiveGraph = FivePointGraph | PolePolarGraph | PascalGraph | CrossRatioGraph;
const mountGraph = <G extends AnyProjectiveGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const mount = (): FivePointGraph => mountGraph(new FivePointGraph());
const apply = (graph: AnyProjectiveGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const click = (button: HTMLElement) => act(() => { button.click(); });
const shown = () => [...document.querySelectorAll('[data-projective-line]')].map(node => `${node.getAttribute('data-projective-line')}=${node.textContent}`);

interface Result {model: FivePointModel; extrapolating: boolean; stale: string | null; text: string[]}
/** The model, the extrapolation flag, the stale flag and the text after running `edit` on a fresh graph, with the graph unmounted again. */
function after(edit: (graph: FivePointGraph) => void): Result {
    const graph = mount();
    edit(graph);
    const result = {
        model: graph.model, extrapolating: graph.extrapolating,
        stale: document.querySelector('[data-projective-status]')?.getAttribute('data-projective-stale') ?? null, text: shown(),
    };
    cleanup();
    return result;
}

const EXAMPLE_BUTTON: Record<Exclude<FivePointExampleId, 'custom'>, string> = {
    ellipse: 'Elipsa', hyperbola: 'Hiperbola', parabola: 'Parabola', 'three-collinear': 'Tri točke na premici', 'four-collinear': 'Štiri točke na premici',
};
const NAMES = ['A', 'B', 'C', 'D', 'E'] as const;
const choose = (label: string, index: number) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value: String(index)}}); });
const typeInto = (label: string, numerator: number) => typeNumber(label, numerator / 15);
const checkbox = () => screen.getByLabelText<HTMLInputElement>('Nadaljuj lok za t zunaj [0, 1]');

test.each(FIVE_POINT_EXAMPLE_IDS.filter((id): id is Exclude<FivePointExampleId, 'custom'> => id !== 'custom'))('five-point-load-example %s reaches the state of the example button', example => {
    // Start from another example with extrapolation on, so that the action really replaces a different scene.
    const prepare = () => { chooseOption('Primer', EXAMPLE_BUTTON[example === 'hyperbola' ? 'parabola' : 'hyperbola']); };
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'five-point-load-example', exampleId: example}); });
    const viaControl = after(() => { prepare(); chooseOption('Primer', EXAMPLE_BUTTON[example]); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.model.example).toBe(example);
});

test.each([['a', 2], ['b', 4], ['a', 1]] as const)('five-point-set-end %s %s reaches the state of the end selector', (which, index) => {
    const label = which === 'a' ? 'Prvo krajišče loka' : 'Drugo krajišče loka';
    const untouched = after(() => undefined);
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'five-point-set-end', which, index}));
    const viaControl = after(() => choose(label, index));
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.model[which]).toBe(index);
    // The default has a = 0, b = 1: the action changed something (index 1 for a swaps the ends).
    expect(viaAction.model).not.toEqual(untouched.model);
});

test('five-point-set-third reaches the state of the third-point selector', () => {
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'five-point-set-third', index: 4}));
    const viaControl = after(() => choose('Tretja točka (določa utež)', 4));
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.model.t).toBe(4);
});

test.each([[2, 30, 45], [4, -45, 75], [3, 32, 7]] as const)('five-point-place point %s at (%s, %s) over 15 reaches the state of the coordinate fields', (index, x, y) => {
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'five-point-place', index, x, y}));
    const viaControl = after(() => { typeInto(`Točka ${NAMES[index]}, x`, x); typeInto(`Točka ${NAMES[index]}, y`, y); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.model.points[index]).toEqual({x, y});
    expect(viaAction.model.example).toBe('custom');
});

test('five-point-place into a degenerate position reaches the status and the stale conic of the coordinate fields', () => {
    // D moved to the origin: A = (5, 0), D, C = (-5, 0) are collinear, so there is a line pair and the last unique conic stays drawn as stale.
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'five-point-place', index: 3, x: 0, y: 0}));
    const viaControl = after(() => { typeInto('Točka D, x', 0); typeInto('Točka D, y', 0); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.stale).toBe('true');
});

test('five-point-set-extrapolation reaches the state of the checkbox, on and back off', () => {
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'five-point-set-extrapolation', on: true}));
    const viaControl = after(() => click(checkbox()));
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.extrapolating).toBe(true);
    const offAction = after(graph => {
        apply(graph, {kind: 'projective', operation: 'five-point-set-extrapolation', on: true});
        apply(graph, {kind: 'projective', operation: 'five-point-set-extrapolation', on: false});
    });
    const offControl = after(() => { click(checkbox()); click(checkbox()); });
    expect(offAction).toEqual(offControl);
    expect(offAction.extrapolating).toBe(false);
});

test('five-point operations refuse out-of-range, non-integer, off-grid and unknown values and change nothing', () => {
    const graph = mount();
    const before = graph.model;
    const bad: Extract<LessonAction, {kind: 'projective'}>[] = [
        {kind: 'projective', operation: 'five-point-load-example', exampleId: JSON.parse('"nope"')},
        {kind: 'projective', operation: 'five-point-set-end', which: JSON.parse('"c"'), index: 2},
        {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 5},
        {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: -1},
        {kind: 'projective', operation: 'five-point-set-end', which: 'b', index: 1.5},
        {kind: 'projective', operation: 'five-point-set-third', index: 5},
        {kind: 'projective', operation: 'five-point-set-third', index: 0},
        {kind: 'projective', operation: 'five-point-set-third', index: Number.NaN},
        {kind: 'projective', operation: 'five-point-place', index: 5, x: 0, y: 0},
        {kind: 'projective', operation: 'five-point-place', index: 2, x: FIVE_POINT_NUMERATOR_LIMIT + 1, y: 0},
        {kind: 'projective', operation: 'five-point-place', index: 2, x: 0, y: -FIVE_POINT_NUMERATOR_LIMIT - 1},
        {kind: 'projective', operation: 'five-point-place', index: 2, x: 1.5, y: 0},
        {kind: 'projective', operation: 'five-point-place', index: 2, x: 0, y: Number.NaN},
        {kind: 'projective', operation: 'five-point-set-extrapolation', on: JSON.parse('1')},
    ];
    for (const action of bad) expect(() => apply(graph, action), JSON.stringify(action)).toThrow(action.operation);
    expect(graph.model).toBe(before);
    expect(graph.extrapolating).toBe(false);
});

test('each projective graph rejects the other graphs operations, naming the operation', () => {
    const fivePoint = mount();
    for (const action of [
        {kind: 'projective', operation: 'load-example', exampleId: 'default'},
        {kind: 'projective', operation: 'move-handle', handle: 0, x: 1},
        {kind: 'projective', operation: 'pascal-set-conic', conic: 'ellipse'},
        {kind: 'projective', operation: 'pole-polar-place', x: 0, y: 0},
    ] as const) expect(() => apply(fivePoint, action)).toThrow(action.operation);
    cleanup();
    const polePolar = mountGraph(new PolePolarGraph());
    expect(() => apply(polePolar, {kind: 'projective', operation: 'five-point-place', index: 0, x: 0, y: 0})).toThrow('five-point-place');
    cleanup();
    const pascal = mountGraph(new PascalGraph());
    expect(() => apply(pascal, {kind: 'projective', operation: 'five-point-set-third', index: 2})).toThrow('five-point-set-third');
    cleanup();
    const crossRatio = mountGraph(new CrossRatioGraph());
    for (const action of [
        {kind: 'projective', operation: 'five-point-load-example', exampleId: 'ellipse'},
        {kind: 'projective', operation: 'five-point-set-end', which: 'a', index: 1},
        {kind: 'projective', operation: 'five-point-set-extrapolation', on: true},
    ] as const) expect(() => apply(crossRatio, action)).toThrow(action.operation);
});
