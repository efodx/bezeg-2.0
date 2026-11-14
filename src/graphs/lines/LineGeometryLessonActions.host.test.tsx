import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {LineGeometryGraph} from './LineGeometryGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): LineGeometryGraph => {
    const graph = new LineGeometryGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: LineGeometryGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
type Points = Extract<LessonAction, {kind: 'lines'; operation: 'set-points'}>['points'];
const setPoints = (points: Points): LessonAction => ({kind: 'lines', operation: 'set-points', points});
const setMode = (mode: string): LessonAction => ({kind: 'lines', operation: 'set-mode', mode: mode as 'forms'});
const type = (label: string, value: string) => act(() => { enterNumber(screen.getByRole('spinbutton', {name: label}) as HTMLInputElement, value); });
const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByRole('combobox', {name: label}), {target: {value}}); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const stateOf = (graph: LineGeometryGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state and the readouts after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: LineGeometryGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts()};
    cleanup();
    return result;
}

test('set-points reaches the state and readouts of typing into the coordinate fields', () => {
    const viaAction = after(graph => apply(graph, setPoints({P: {x: -4, y: 0}, Q: {x: 4, y: -1}})));
    const viaControl = after(() => {
        type('P, x', '-4'); type('P, y', '0');
        type('Q, x', '4'); type('Q, y', '-1');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.P).toEqual({x: -4, y: 0});
    expect(viaAction.state.Q).toEqual({x: 4, y: -1});
});

test('set-mode reaches the state and readouts of the Prikaz select, and set-points on R and S matches their fields', () => {
    const viaAction = after(graph => { apply(graph, setMode('normal')); apply(graph, setPoints({R: {x: 3, y: -2}, S: {x: 5, y: -2}})); });
    const viaControl = after(() => {
        choose('Prikaz', 'normal');
        type('R, x', '3'); type('R, y', '-2');
        type('S, x', '5'); type('S, y', '-2');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.mode).toBe('normal');
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('normal'));
        capabilities.apply(setPoints({P: {x: 0, y: 0}, Q: {x: 2, y: 4}}));
        capabilities.apply(setPoints({Q: {x: 3, y: 3}}));
        capabilities.apply(setPoints({R: {x: 1, y: 0}, S: {x: 1, y: 5}}));
    });
    expect(graph.state.mode).toBe('normal');
    expect(graph.state.P).toEqual({x: 0, y: 0});
    expect(graph.state.Q).toEqual({x: 3, y: 3});
    expect(graph.state.R).toEqual({x: 1, y: 0});
    expect(graph.state.S).toEqual({x: 1, y: 5});
    expect(stateOf(graph)).not.toEqual(free);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('normal'));
    apply(graph, setPoints({P: {x: -4, y: 0}, Q: {x: 4, y: -1}}));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports the lines actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('forms'))).toBe(true);
    expect(graph.supportsLessonAction(setPoints({P: {x: 1, y: 1}}))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setMode('circle'), setMode(JSON.parse('7')),
        setPoints({}), setPoints(JSON.parse('{"Z":{"x":1,"y":1}}')),
        setPoints({P: {x: 9, y: 0}}), setPoints({P: {x: 0, y: -9}}), setPoints({P: {x: 1.5, y: 0}}), setPoints({P: {x: Number.NaN, y: 0}}),
        // A valid handle before an invalid one must not be written.
        setPoints(JSON.parse('{"P":{"x":2,"y":2},"Q":{"x":"3","y":0}}')),
        setPoints(JSON.parse('{"P":{"x":2,"y":2},"Z":{"x":0,"y":0}}')),
        {kind: 'lines', operation: JSON.parse('"spin"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
});
