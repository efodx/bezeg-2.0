import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {enterNumber} from '../../inputs/testEntry';
import {CircleConstructionGraph} from './CircleConstructionGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): CircleConstructionGraph => {
    const graph = new CircleConstructionGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: CircleConstructionGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
type Mode = Extract<LessonAction, {kind: 'circle'; operation: 'set-mode'}>['mode'];
type CircleName = Extract<LessonAction, {kind: 'circle'; operation: 'set-circle'}>['circle'];
const setMode = (mode: Mode): LessonAction => ({kind: 'circle', operation: 'set-mode', mode});
const setCircle = (circle: CircleName, x: number, y: number, r: number): LessonAction => ({kind: 'circle', operation: 'set-circle', circle, x, y, r});
const setPoint = (x: number, y: number): LessonAction => ({kind: 'circle', operation: 'set-point', x, y});
const type = (label: string, value: string) => act(() => { enterNumber(screen.getByLabelText(label) as HTMLInputElement, value); });
const choose = (mode: Mode) => act(() => { fireEvent.change(screen.getByLabelText(t('circle_construction_mode_label')), {target: {value: mode}}); });
const centreX = (n: number) => t('circle_construction_centre_x', {value0: String(n)});
const centreY = (n: number) => t('circle_construction_centre_y', {value0: String(n)});
const radius = (n: number) => t('circle_construction_radius', {value0: String(n)});
const pointX = t('circle_construction_point_x', {value0: 'P'});
const pointY = t('circle_construction_point_y', {value0: 'P'});
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const stateOf = (graph: CircleConstructionGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;

/** The state and the readouts after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: CircleConstructionGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts()};
    cleanup();
    return result;
}

test('set-point and set-circle reach the state and readouts of typing into the fields', () => {
    const viaAction = after(graph => { apply(graph, setCircle('c1', 1, 2, 3.5)); apply(graph, setPoint(-6, 4)); });
    const viaControl = after(() => {
        type(centreX(1), '1'); type(centreY(1), '2'); type(radius(1), '3.5');
        type(pointX, '-6'); type(pointY, '4');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.c1).toEqual({x: 1, y: 2, r: 3.5});
    expect(viaAction.state.p).toEqual({x: -6, y: 4});
});

test('set-mode reaches the state and readouts of the Konstrukcija select, and set-circle on c2 matches its fields', () => {
    const viaAction = after(graph => { apply(graph, setMode('radical')); apply(graph, setCircle('c2', 8, 0, 3)); });
    const viaControl = after(() => {
        choose('radical');
        type(centreX(2), '8'); type(centreY(2), '0'); type(radius(2), '3');
    });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.mode).toBe('radical');
    expect(viaAction.state.c2).toEqual(expect.objectContaining({x: 8, y: 0, r: 3}));
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setMode('radical'));
        capabilities.apply(setCircle('c1', 0, 0, 5));
        capabilities.apply(setCircle('c2', 8, 0, 3));
        capabilities.apply(setCircle('c2', 10, 0, 2));
        capabilities.apply(setPoint(5, 0));
    });
    expect(graph.state.mode).toBe('radical');
    expect(graph.state.c1).toEqual(expect.objectContaining({x: 0, y: 0, r: 5}));
    expect(graph.state.c2).toEqual(expect.objectContaining({x: 10, y: 0, r: 2}));
    expect(graph.state.p).toEqual({x: 5, y: 0});
    expect(stateOf(graph)).not.toEqual(free);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setMode('radical'));
    apply(graph, setCircle('c2', 8, 0, 3));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports the circle actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setMode('common'))).toBe(true);
    expect(graph.supportsLessonAction(setCircle('c1', 0, 0, 5))).toBe(true);
    expect(graph.supportsLessonAction(setPoint(1, 1))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setMode(JSON.parse('"spin"')), setMode(JSON.parse('7')),
        setCircle(JSON.parse('"c4"'), 0, 0, 5),
        setCircle('c1', 0.5, 0, 5), setCircle('c1', 0, 1.5, 5), setCircle('c1', 17, 0, 5), setCircle('c1', 0, -17, 5), setCircle('c1', Number.NaN, 0, 5),
        setCircle('c1', 0, 0, 0.3), setCircle('c1', 0, 0, 0), setCircle('c1', 0, 0, 9), setCircle('c1', 0, 0, -1), setCircle('c1', 0, 0, Number.NaN),
        setPoint(0.5, 0), setPoint(0, 17), setPoint(Number.NaN, 0), setPoint(0, Number.POSITIVE_INFINITY),
        {kind: 'circle', operation: JSON.parse('"spin"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
});
