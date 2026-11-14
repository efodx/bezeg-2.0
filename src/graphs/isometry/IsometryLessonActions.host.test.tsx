import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {IsometryGraph} from './IsometryGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): IsometryGraph => {
    const graph = new IsometryGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: IsometryGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
type Mirrors = Extract<LessonAction, {kind: 'isometry'; operation: 'set-mirrors'}>['mirrors'];
const setMirrors = (mirrors: Mirrors): LessonAction => ({kind: 'isometry', operation: 'set-mirrors', mirrors});
const setMode = (mode: string): LessonAction => ({kind: 'isometry', operation: 'set-mode', mode: mode as 'mirrors'});
const setCount = (count: number): LessonAction => ({kind: 'isometry', operation: 'set-mirror-count', count: count as 1});
const mirror = (px: number, py: number, qx: number, qy: number) => ({p: {x: px, y: py}, q: {x: qx, y: qy}});
/** A control by name: a slider's exact field is "<label>, vrednost", a point row's field "<point>, <axis>". */
const type = (label: string, value: string) => act(() => { enterNumber(screen.getByRole('spinbutton', {name: name => name.replace(/, vrednost$/, '') === label}) as HTMLInputElement, value); });
const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByRole('combobox', {name: label}), {target: {value}}); });
const typeMirror = (n: number, [px, py, qx, qy]: [number, number, number, number]) => {
    type(`P${n}, x`, String(px)); type(`P${n}, y`, String(py));
    type(`Q${n}, x`, String(qx)); type(`Q${n}, y`, String(qy));
};
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const stateOf = (graph: IsometryGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state and the readouts after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: IsometryGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts()};
    cleanup();
    return result;
}

test('set-mirrors reaches the state and readouts of typing into the mirror coordinate fields (L1 scene 1)', () => {
    const viaAction = after(graph => {
        apply(graph, setMode('mirrors'));
        apply(graph, setMirrors({'1': mirror(0, 0, 1, 0), '2': mirror(0, 0, 2, 1)}));
    });
    const viaControl = after(() => {
        choose('Način', 'mirrors');
        typeMirror(1, [0, 0, 1, 0]); typeMirror(2, [0, 0, 2, 1]);
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.mirrors).toEqual([mirror(0, 0, 1, 0), mirror(0, 0, 2, 1), expect.anything()]);
    expect(viaAction.readouts.length).toBeGreaterThan(0);
});

test('set-mode and set-mirror-count reach the state and readouts of the Način select and the Število zrcal field (L2 scene 3)', () => {
    const viaAction = after(graph => {
        apply(graph, setMode('classify'));
        apply(graph, setCount(3));
        apply(graph, setMirrors({'1': mirror(0, 0, 1, -1), '2': mirror(1, 1, 2, 0), '3': mirror(0, 0, 1, 1)}));
    });
    const viaControl = after(() => {
        choose('Način', 'classify');
        type('Število zrcal', '3');
        typeMirror(1, [0, 0, 1, -1]); typeMirror(2, [1, 1, 2, 0]); typeMirror(3, [0, 0, 1, 1]);
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.mode).toBe('classify');
    expect(viaAction.state.motionLength).toBe(3);
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('classify'));
        capabilities.apply(setCount(2));
        capabilities.apply(setMirrors({'1': mirror(1, 2, 2, 2)}));
        capabilities.apply(setMirrors({'2': mirror(1, 2, 2, 3)}));
    });
    expect(graph.state.mode).toBe('classify');
    expect(graph.state.motionLength).toBe(2);
    // The second set-mirrors kept the first's mirror 1 (it read the state the first wrote).
    expect(graph.state.mirrors[0]).toEqual(mirror(1, 2, 2, 2));
    expect(graph.state.mirrors[1]).toEqual(mirror(1, 2, 2, 3));
    expect(stateOf(graph)).not.toEqual(free);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('classify'));
    apply(graph, setMirrors({'1': mirror(0, 0, 1, 0)}));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports the isometry actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('mirrors'))).toBe(true);
    expect(graph.supportsLessonAction(setCount(2))).toBe(true);
    expect(graph.supportsLessonAction(setMirrors({'1': mirror(0, 0, 1, 0)}))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setMode('spiral'), setMode(JSON.parse('7')),
        setCount(0), setCount(4), setCount(1.5), setCount(JSON.parse('"2"')),
        setMirrors({}), setMirrors(JSON.parse('{"4":{"p":{"x":0,"y":0},"q":{"x":1,"y":0}}}')),
        setMirrors({'1': mirror(17, 0, 1, 0)}), setMirrors({'1': mirror(0, 0, 1, 0.5)}), setMirrors({'1': mirror(0, 0, Number.NaN, 0)}),
        // Coincident points are not a mirror.
        setMirrors({'1': mirror(2, 2, 2, 2)}),
        // A valid mirror before an invalid one must not be written.
        setMirrors(JSON.parse('{"1":{"p":{"x":1,"y":1},"q":{"x":3,"y":0}},"2":{"p":{"x":"0","y":0},"q":{"x":1,"y":1}}}')),
        setMirrors(JSON.parse('{"1":{"p":{"x":1,"y":1},"q":{"x":3,"y":0}},"9":{"p":{"x":0,"y":0},"q":{"x":1,"y":1}}}')),
        {kind: 'isometry', operation: JSON.parse('"spin"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
});

type Dilation = Extract<LessonAction, {kind: 'isometry'; operation: 'set-dilation'}>;
const setDilation = (fields: Omit<Dilation, 'kind' | 'operation'>): LessonAction => ({kind: 'isometry', operation: 'set-dilation', ...fields});

test('set-dilation reaches the state and readouts of the centre, ratio and turn fields (L3 scenes)', () => {
    const viaAction = after(graph => {
        apply(graph, setMode('similarity'));
        apply(graph, setDilation({centre: {x: 2, y: -1}, k: -0.5, turn: 'pythagorean'}));
    });
    const viaControl = after(() => {
        choose('Način', 'similarity');
        type('C, x', '2'); type('C, y', '-1');
        type('Razmerje k', '-0.5');
        choose('Vrtež okoli središča', 'pythagorean');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.dilationCentre).toEqual({x: 2, y: -1});
    expect(viaAction.state.dilationK).toBe(-0.5);
    expect(viaAction.state.dilationTurn).toBe('pythagorean');
    expect(viaAction.readouts.length).toBeGreaterThan(0);
});

test('set-dilation writes only the fields it names and nothing when the value is unchanged', () => {
    const graph = mount();
    apply(graph, setMode('similarity'));
    const start = graph.state;
    apply(graph, setDilation({k: 1.5, centre: {x: 1, y: 1}, turn: 'r0'}));
    expect(graph.state).toBe(start);
    apply(graph, setDilation({k: 2}));
    expect(graph.state).not.toBe(start);
    expect(graph.state.dilationK).toBe(2);
    expect(graph.state.dilationCentre).toEqual(start.dilationCentre);
    expect(graph.state.dilationTurn).toBe(start.dilationTurn);
    const afterK = graph.state;
    apply(graph, setDilation({k: 2}));
    expect(graph.state).toBe(afterK);
});

test('set-dilation in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('similarity'));
        capabilities.apply(setDilation({centre: {x: 0, y: 0}}));
        capabilities.apply(setDilation({k: -1}));
        capabilities.apply(setDilation({turn: 'r90'}));
    });
    expect(graph.state.mode).toBe('similarity');
    expect(graph.state.dilationCentre).toEqual({x: 0, y: 0});
    expect(graph.state.dilationK).toBe(-1);
    expect(graph.state.dilationTurn).toBe('r90');
});

test('the graph supports set-dilation; invalid data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setDilation({k: 2}))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setDilation({}),
        setDilation({k: 0}), setDilation({k: 0.1}), setDilation({k: 4.25}), setDilation({k: -5}), setDilation({k: 0.3}),
        setDilation({k: Number.NaN}), setDilation({k: JSON.parse('"2"')}),
        setDilation({turn: JSON.parse('"r45"')}), setDilation({turn: JSON.parse('7')}),
        setDilation({centre: {x: 17, y: 0}}), setDilation({centre: {x: 0, y: 0.5}}), setDilation({centre: JSON.parse('{"x":"1","y":1}')}),
        setDilation({centre: JSON.parse('{"x":1}')}),
        // A valid field before an invalid one must not be written.
        setDilation({centre: {x: 3, y: 3}, k: 0}),
        setDilation({centre: {x: 3, y: 3}, k: 2, turn: JSON.parse('"spin"')}),
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
});
