import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PascalGraph} from './PascalGraph';
import {PASCAL_CONIC_IDS, PASCAL_DEFAULT_INDICES, PASCAL_EXAMPLE_IDS, PASCAL_ORDER_IDS, PASCAL_ORDERS, PascalModel, reachableIndices} from './pascalModel';
import {CrossRatioGraph} from './CrossRatioGraph';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import type {LessonAction} from '../../learning/model';
import {setLanguage} from '../../localization';
import {chooseOption} from './controlsTest';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): PascalGraph => {
    const graph = new PascalGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: PascalGraph | CrossRatioGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const shown = () => [...document.querySelectorAll('[data-projective-line]')].map(node => `${node.getAttribute('data-projective-line')}=${node.textContent}`);

/** The model and the text after running `edit` on a fresh graph, with the graph unmounted again. */
function after(edit: (graph: PascalGraph) => void): {model: PascalModel; text: string[]} {
    const graph = mount();
    edit(graph);
    const result = {model: graph.model, text: shown()};
    cleanup();
    return result;
}

const EXAMPLE_BUTTON: Record<typeof PASCAL_EXAMPLE_IDS[number], string> = {
    default: 'Elipsa', pappus: 'Pappusov izrek (par premic)', infinity: 'Vzporedni stranici', custom: 'Lastna postavitev',
};
const CONIC_BUTTON: Record<typeof PASCAL_CONIC_IDS[number], string> = {
    ellipse: 'Elipsa', parabola: 'Parabola', hyperbola: 'Hiperbola', linePair: 'Par premic',
};

test.each(PASCAL_EXAMPLE_IDS.filter(id => id !== 'custom'))('pascal-load-example %s reaches the state of the example button', example => {
    // Start from a moved scene so that the example really replaces it.
    const prepare = () => chooseOption('Stožnica', 'Hiperbola');
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pascal-load-example', exampleId: example}); });
    const viaControl = after(() => { prepare(); chooseOption('Primer', EXAMPLE_BUTTON[example]); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
});

test.each(PASCAL_CONIC_IDS)('pascal-set-conic %s reaches the state of the conic button', conic => {
    // Start from another conic so that the action really changes the model (the ellipse is the default).
    const prepare = () => chooseOption('Stožnica', CONIC_BUTTON[conic === 'hyperbola' ? 'parabola' : 'hyperbola']);
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pascal-set-conic', conic}); });
    const viaControl = after(() => { prepare(); chooseOption('Stožnica', CONIC_BUTTON[conic]); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    if (conic !== 'ellipse') expect(viaAction.model.indices).toEqual(PASCAL_DEFAULT_INDICES[conic]);
});

test.each(PASCAL_ORDER_IDS)('pascal-set-order %s reaches the state of the order button', order => {
    const orderText = {natural: 'Običajni (1 2 3 4 5 6)', pappus: 'Prekrižan (1 5 3 4 2 6)', star: 'Zvezda (1 3 5 2 4 6)'} as const;
    // Start from another order so that the action really changes the model (the natural order is the default).
    const prepare = () => chooseOption('Vrstni red oglišč', orderText[order === 'star' ? 'pappus' : 'star']);
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pascal-set-order', order}); });
    const viaControl = after(() => { prepare(); chooseOption('Vrstni red oglišč', orderText[order]); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.order).toEqual(PASCAL_ORDERS[order]);
});

test.each([[0, 'A'], [3, 'D'], [5, 'F']] as const)('pascal-set-index on handle %s reaches the state of the next slider position', (handle, name) => {
    const next = (() => {
        const list = reachableIndices('ellipse', handle);
        return list[(list.indexOf(PASCAL_DEFAULT_INDICES.ellipse[handle]) + 1) % list.length];
    })();
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'pascal-set-index', handle, index: next}));
    const viaControl = after(() => act(() => { fireEvent.keyDown(screen.getByRole('slider', {name: `Točka ${name}`}), {key: 'ArrowRight'}); }));
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.indices[handle]).toBe(next);
    expect(viaAction.model.example).toBe('custom');
});

test('pascal-set-index refuses an unreachable or non-integer index and a wrong handle, and changes nothing', () => {
    const graph = mount();
    const before = graph.model;
    const reachable = new Set(reachableIndices('ellipse', 3));
    const unreachable = [...Array(256).keys()].find(index => !reachable.has(index));
    const bad: LessonAction[] = [
        {kind: 'projective', operation: 'pascal-set-index', handle: 3, index: -1},
        {kind: 'projective', operation: 'pascal-set-index', handle: 3, index: 256},
        {kind: 'projective', operation: 'pascal-set-index', handle: 3, index: 1.5},
        {kind: 'projective', operation: 'pascal-set-index', handle: 6, index: PASCAL_DEFAULT_INDICES.ellipse[0]},
        {kind: 'projective', operation: 'pascal-set-index', handle: 0.5, index: PASCAL_DEFAULT_INDICES.ellipse[0]},
        {kind: 'projective', operation: 'pascal-load-example', exampleId: JSON.parse('"nope"')},
        {kind: 'projective', operation: 'pascal-set-conic', conic: JSON.parse('"circle"')},
        {kind: 'projective', operation: 'pascal-set-order', order: JSON.parse('"zigzag"')},
    ];
    if (unreachable !== undefined) bad.push({kind: 'projective', operation: 'pascal-set-index', handle: 3, index: unreachable});
    for (const action of bad) expect(() => apply(graph, action), JSON.stringify(action)).toThrow();
    expect(graph.model).toBe(before);
});

test('each projective graph rejects the other graph\'s operations', () => {
    const pascal = mount();
    for (const action of [
        {kind: 'projective', operation: 'load-example', exampleId: 'default'},
        {kind: 'projective', operation: 'move-handle', handle: 0, x: 1},
    ] as const) expect(() => apply(pascal, action)).toThrow();
    cleanup();
    const crossRatio = new CrossRatioGraph();
    render(<MemoryRouter><GraphHost create={() => crossRatio}/></MemoryRouter>);
    for (const action of [
        {kind: 'projective', operation: 'pascal-load-example', exampleId: 'default'},
        {kind: 'projective', operation: 'pascal-set-conic', conic: 'linePair'},
        {kind: 'projective', operation: 'pascal-set-order', order: 'star'},
        {kind: 'projective', operation: 'pascal-set-index', handle: 0, index: 0},
    ] as const) expect(() => apply(crossRatio, action)).toThrow();
});
