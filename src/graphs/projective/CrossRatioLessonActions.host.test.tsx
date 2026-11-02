import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {CrossRatioGraph} from './CrossRatioGraph';
import {CROSS_RATIO_EXAMPLE_IDS, CROSS_RATIO_EXAMPLES, CrossRatioModel} from './crossRatioModel';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): CrossRatioGraph => {
    const graph = new CrossRatioGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: CrossRatioGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const moveHandle = (handle: number, x: number, y?: number): LessonAction => ({kind: 'projective', operation: 'move-handle', handle, x, y});
const loadExample = (exampleId: typeof CROSS_RATIO_EXAMPLE_IDS[number]): LessonAction => ({kind: 'projective', operation: 'load-example', exampleId});
const field = (label: string, value: number) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value: String(value)}}); });
const shown = () => [...document.querySelectorAll('[data-projective-line]')].map(node => `${node.getAttribute('data-projective-line')}=${node.textContent}`);

/** The model and the text after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: CrossRatioGraph) => void): {model: CrossRatioModel; text: string[]} {
    const graph = mount();
    edit(graph);
    const result = {model: graph.model, text: shown()};
    cleanup();
    return result;
}

test.each([
    ['A', 0, -2, undefined, 'Točka A: x'],
    ['D', 3, 6, undefined, 'Točka D: x'],
    ['centre x', 4, 3, 5, 'Točka O: x'],
    ['M', 5, 1, 2, 'Točka M: x'],
])('move-handle %s reaches the state of the numeric field', (_name, handle, x, y, label) => {
    const viaAction = after(graph => apply(graph, moveHandle(handle, x, y)));
    const viaControl = after(() => {
        field(label, x);
        if (y !== undefined) field(label.replace(': x', ': y'), y);
    });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.example).toBe('custom');
});

test('move-handle goes through the drag path: model and the handle on the board agree, and a repeat changes nothing', () => {
    const graph = mount();
    apply(graph, moveHandle(4, -3, 7));
    expect(graph.model.centre).toEqual({x: -3, y: 7});
    const model = graph.model;
    apply(graph, moveHandle(4, -3, 7));
    expect(graph.model).toBe(model);
});

test.each(['default', 'harmonic', 'infinity'] as const)('load-example %s reaches the state of the example button', example => {
    const label = {default: 'Dvorazmerje 9/8', harmonic: 'Harmonična četverka', infinity: 'Slika v neskončnosti'}[example];
    const viaAction = after(graph => { apply(graph, moveHandle(0, 7)); apply(graph, loadExample(example)); });
    const viaControl = after(() => {
        field('Točka A: x', 7);
        act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
    });
    expect(viaAction.model).toEqual(CROSS_RATIO_EXAMPLES[example]);
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
});

test('load-example clears the selection like the button', () => {
    const graph = mount();
    act(() => { graph.select(2); });
    apply(graph, loadExample('harmonic'));
    expect(graph.selectedHandle).toBeUndefined();
});

test('the graph supports both operations; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(loadExample('default'))).toBe(true);
    expect(graph.supportsLessonAction(moveHandle(0, 1))).toBe(true);
    const model = graph.model;
    const bad: LessonAction[] = [
        moveHandle(7, 0, 0), moveHandle(-1, 0), moveHandle(1.5, 0), moveHandle(0, 0.5), moveHandle(0, 31), moveHandle(0, Number.NaN),
        moveHandle(1, 2, 3), moveHandle(4, 1), moveHandle(4, 1, 0.5), moveHandle(4, 99, 0),
        {kind: 'projective', operation: 'load-example', exampleId: JSON.parse('"nope"')},
    ];
    for (const action of bad) expect(() => apply(graph, action)).toThrow();
    expect(graph.model).toBe(model);
});
