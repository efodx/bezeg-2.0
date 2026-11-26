import React from 'react';
import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, puckControl, REAL_GRAPH_TEST_TIMEOUT, typePuck, waitForPucks} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
import {UnitCircleGraph} from './UnitCircleGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = async (): Promise<UnitCircleGraph> => {
    const graph = new UnitCircleGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    await waitForPucks('unit-angle');
    return graph;
};
const apply = (graph: UnitCircleGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setAngle = (which: 'first' | 'second', degrees: number): LessonAction => ({kind: 'trig', operation: 'set-angle', which, degrees});
const setOverlay = (overlay: 'cosine' | 'symmetries' | 'addition', on: boolean): LessonAction => ({kind: 'trig', operation: 'set-overlay', overlay, on});
const toggle = (id: string) => act(() => { fireEvent.click(puckControl(id)); });
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
const stateOf = (graph: UnitCircleGraph) => ({angle: graph.state.angle, secondAngle: graph.state.secondAngle, cosine: graph.state.showCosine, symmetries: graph.state.showSymmetries, addition: graph.state.showAddition});

/** The state and the readouts after running `edit` on a fresh graph and then unmounting it. */
async function after(edit: (graph: UnitCircleGraph) => void | Promise<void>) {
    const graph = await mount();
    await edit(graph);
    const result = {state: stateOf(graph), readouts: readouts()};
    cleanup();
    return result;
}

test.each([30, 114.5, 200, 359.5, 0])('set-angle first %s reaches the state of the angle puck', async degrees => {
    const viaAction = await after(graph => apply(graph, setAngle('first', degrees)));
    const viaControl = await after(() => typePuck('unit-angle', String(degrees).replace('.', ',')));
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.angle).toBe(degrees * 2);
});

test('set-angle second reaches the state of the second angle puck, which exists with the addition overlay', async () => {
    const viaAction = await after(graph => { apply(graph, setOverlay('addition', true)); apply(graph, setAngle('second', 45)); });
    const viaControl = await after(async () => { toggle('addition'); await waitForPucks('unit-second-angle'); typePuck('unit-second-angle', '45'); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state.secondAngle).toBe(90);
});

test.each([
    ['cosine', 'cosine'],
    ['symmetries', 'symmetries'],
    ['addition', 'addition'],
] as const)('set-overlay %s reaches the state of its switch puck, on and off', async (overlay, key) => {
    const viaAction = await after(graph => apply(graph, setOverlay(overlay, true)));
    const viaControl = await after(() => toggle(overlay));
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.state[key]).toBe(true);
    const graph = await mount();
    apply(graph, setOverlay(overlay, true));
    apply(graph, setOverlay(overlay, false));
    expect(stateOf(graph)[key]).toBe(false);
});

test('a scene runs its actions in one synchronous sequence: each action reads the state the earlier one wrote', async () => {
    const graph = await mount();
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setOverlay('addition', true));
        capabilities.apply(setAngle('first', 60));
        capabilities.apply(setAngle('second', 45));
        capabilities.apply(setOverlay('symmetries', true));
    });
    expect(stateOf(graph)).toEqual({angle: 120, secondAngle: 90, cosine: false, symmetries: true, addition: true});
    expect(readouts()).toContain('sum-angle=105°');
});

test('the graph supports both operations; invalid scene data is a lesson-content error and changes nothing', async () => {
    const graph = await mount();
    expect(graph.supportsLessonAction(setAngle('first', 30))).toBe(true);
    expect(graph.supportsLessonAction(setOverlay('cosine', true))).toBe(true);
    const before = stateOf(graph);
    const bad: LessonAction[] = [
        setAngle('first', Number.NaN), setAngle('first', 0.3), setAngle('first', -1), setAngle('first', 360), setAngle('second', 400),
        setAngle(JSON.parse('"third"'), 30), {kind: 'trig', operation: 'set-angle', which: 'first', degrees: JSON.parse('"30"')},
        {kind: 'trig', operation: 'set-overlay', overlay: JSON.parse('"nope"'), on: true},
        {kind: 'trig', operation: 'set-overlay', overlay: 'cosine', on: JSON.parse('1')},
        {kind: 'trig', operation: JSON.parse('"spin"')} as unknown as LessonAction,
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(stateOf(graph)).toEqual(before);
});
