import React from 'react';
import {act, cleanup, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {chooseOnPuck, installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {TriangleSolverGraph} from './TriangleSolverGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): TriangleSolverGraph => {
    const graph = new TriangleSolverGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: TriangleSolverGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setMode = (mode: 'sides' | 'circle' | 'solve'): LessonAction => ({kind: 'triangle', operation: 'set-mode', mode});
const setVertex = (vertex: 'A' | 'B' | 'C', x: number, y: number): LessonAction => ({kind: 'triangle', operation: 'set-vertex', vertex, x, y});
const type = (label: string, value: string) => act(() => { enterNumber((screen.queryByRole('spinbutton', {name: `${label}, vrednost`}) ?? screen.getByLabelText(label)) as HTMLInputElement, value); });
const pick = (value: string) => chooseOnPuck('triangle-mode', value);
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const stateOf = (graph: TriangleSolverGraph) => ({mode: graph.state.mode, A: graph.state.A, B: graph.state.B, C: graph.state.C, data: graph.state.data});

/** The state, the status text and the readouts after running `edit` on a fresh graph and then unmounting it. */
async function after(edit: (graph: TriangleSolverGraph) => void | Promise<void>) {
    const graph = mount();
    await edit(graph);
    const result = {state: stateOf(graph), status: document.querySelector('[data-triangle-status]')?.textContent, readouts: readouts()};
    cleanup();
    return result;
}

test.each(['circle', 'sides', 'solve'] as const)('set-mode %s reaches the state of the mode puck', async mode => {
    const viaAction = await after(graph => { apply(graph, setMode(mode === 'sides' ? 'circle' : mode)); apply(graph, setMode(mode)); });
    const viaControl = await after(async () => { await pick(mode === 'sides' ? 'circle' : mode); await pick(mode); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.mode).toBe(mode);
});

test.each([
    ['A', 1, 2],
    ['B', 8, -7],
    ['C', -2, 11],
] as const)('set-vertex %s reaches the state of its two coordinate fields', async (vertex, x, y) => {
    const viaAction = await after(graph => apply(graph, setVertex(vertex, x, y)));
    const viaControl = await after(() => { type(`${vertex}, x`, String(x)); type(`${vertex}, y`, String(y)); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state[vertex]).toEqual({x, y});
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('circle'));
        capabilities.apply(setVertex('C', 0, 3));
        capabilities.apply(setVertex('B', 4, 0));
        capabilities.apply(setVertex('A', 0, 0));
    });
    expect(stateOf(graph)).toMatchObject({mode: 'circle', A: {x: 0, y: 0}, B: {x: 4, y: 0}, C: {x: 0, y: 3}});
    expect(readouts().find(row => row.startsWith('side-a='))).toBe('side-a=5');
});

test('an unchanged value writes nothing and a checkpoint restore returns the free state', () => {
    const graph = mount();
    const free = stateOf(graph);
    const checkpoint = graph.getLessonCapabilities().captureState();
    const write = vi.spyOn(graph, 'setState');
    apply(graph, setMode('sides'));
    apply(graph, setVertex('A', 0, 0));
    expect(write).not.toHaveBeenCalled();
    expect(stateOf(graph)).toEqual(free);
    apply(graph, setMode('circle'));
    apply(graph, setVertex('C', 5, 5));
    expect(write).toHaveBeenCalledTimes(2);
    expect(stateOf(graph)).not.toEqual(free);
    write.mockRestore();
    act(() => { graph.getLessonCapabilities().restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
});

test('the graph supports both operations; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('circle'))).toBe(true);
    expect(graph.supportsLessonAction(setVertex('A', 1, 1))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setMode(JSON.parse('"spin"')), {kind: 'triangle', operation: 'set-mode', mode: 'circle', extra: 1} as unknown as LessonAction,
        setVertex(JSON.parse('"D"'), 1, 1), setVertex('A', Number.NaN, 1), setVertex('A', 1.5, 1), setVertex('A', 9, 1), setVertex('A', -3, 1),
        setVertex('A', 1, 12), setVertex('A', 1, -8), setVertex('A', JSON.parse('"1"'), 1),
        {kind: 'triangle', operation: 'set-vertex', vertex: 'A', x: 1} as unknown as LessonAction,
        {kind: 'triangle', operation: JSON.parse('"spin"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
});

type DataAction = Extract<LessonAction, {operation: 'set-data'}>;
const setData = (type: DataAction['type'], fields: Omit<DataAction, 'kind' | 'operation' | 'type'> = {}): LessonAction => ({kind: 'triangle', operation: 'set-data', type, ...fields});
const chooseData = (value: string) => chooseOnPuck('triangle-data', value);
const FIELD_LABEL = {a: 'Stranica a', b: 'Stranica b', c: 'Stranica c', angleA: 'Kot A (°)', angleB: 'Kot B (°)'} as const;

test.each([
    ['sss', {a: 4, b: 5.25, c: 8}],
    ['sas', {b: 3.5, c: 9, angleA: 120}],
    ['asa', {angleA: 70, angleB: 45, c: 6.75}],
    ['ssa', {a: 3.5, b: 8, angleA: 30}],
] as const)('set-data %s reaches the state of the data-type puck and its typed fields', async (dataType, fields) => {
    const viaAction = await after(graph => { apply(graph, setMode('solve')); apply(graph, setData(dataType, fields)); });
    const viaControl = await after(async () => {
        await pick('solve');
        await chooseData(dataType === 'sss' ? 'ssa' : 'sss');
        await chooseData(dataType);
        for (const [name, value] of Object.entries(fields)) type(FIELD_LABEL[name as keyof typeof FIELD_LABEL], String(value));
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.data).toEqual({type: dataType, ...fields});
});

test('set-data without fields is the chooser alone: the type\'s default inputs, and the mode stays', () => {
    const graph = mount();
    apply(graph, setData('asa'));
    expect(graph.state.data).toEqual({type: 'asa', angleA: 40, angleB: 60, c: 8});
    expect(graph.state.mode).toBe('sides');
});

test('set-data runs in one synchronous sequence with set-mode; a later action reads the earlier one', () => {
    const graph = mount();
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('solve'));
        capabilities.apply(setData('ssa'));
        capabilities.apply(setData('ssa', {a: 4}));
    });
    expect(graph.state.mode).toBe('solve');
    expect(graph.state.data).toEqual({type: 'ssa', a: 4, b: 8, angleA: 30});
});

test('a checkpoint restore returns the free state after set-data', () => {
    const graph = mount();
    const free = stateOf(graph);
    const checkpoint = graph.getLessonCapabilities().captureState();
    apply(graph, setMode('solve'));
    apply(graph, setData('ssa', {a: 3.5}));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { graph.getLessonCapabilities().restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
});

test('set-data with invalid data is a lesson-content error with a "triangle set-data" message and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setData('sss'))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setData('ssa', {a: 0}), setData('ssa', {a: 12.25}), setData('ssa', {a: 5.1}), setData('ssa', {a: 0.1}),
        setData('ssa', {angleA: 0}), setData('ssa', {angleA: 180}), setData('ssa', {angleA: 30.5}), setData('asa', {angleB: 180}),
        setData('ssa', {a: Number.NaN}), setData('ssa', {a: JSON.parse('"5"')}),
        {kind: 'triangle', operation: 'set-data', type: 'ssa', angleB: 40} as unknown as LessonAction,
        {kind: 'triangle', operation: 'set-data', type: 'sss', angleA: 40} as unknown as LessonAction,
        {kind: 'triangle', operation: 'set-data', type: 'ssa', radius: 2} as unknown as LessonAction,
        setData(JSON.parse('"sax"')),
        {kind: 'triangle', operation: 'set-data'} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow(/^triangle set-data: /);
    expect(stateOf(graph)).toEqual(before);
});
