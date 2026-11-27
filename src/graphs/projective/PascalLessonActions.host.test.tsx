import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PascalGraph} from './PascalGraph';
import {PASCAL_CONIC_IDS, PASCAL_DEFAULT_INDICES, PASCAL_EXAMPLE_IDS, PASCAL_ORDER_IDS, PASCAL_ORDERS, PascalModel, reachableIndices} from './pascalModel';
import {CrossRatioGraph} from './CrossRatioGraph';
import {GraphHost} from '../base/GraphHost';
import {chooseOnPuck, installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
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
async function after(edit: (graph: PascalGraph) => void | Promise<void>): Promise<{model: PascalModel; text: string[]}> {
    const graph = mount();
    await edit(graph);
    const result = {model: graph.model, text: shown()};
    cleanup();
    return result;
}

const EXAMPLE_BUTTON: Record<typeof PASCAL_EXAMPLE_IDS[number], string> = {
    default: 'Elipsa', pappus: 'Pappusov izrek (par premic)', infinity: 'Vzporedni stranici', custom: 'Lastna postavitev',
};
/** The conic and the hexagon order are choice pucks on the board (the example select stays in Orodja): the puck group and the action ids. */
const conicAction = (conic: typeof PASCAL_CONIC_IDS[number]) => ({ellipse: 'conic-ellipse', parabola: 'conic-parabola', hyperbola: 'conic-hyperbola', linePair: 'conic-line-pair'})[conic];
const chooseConic = (conic: typeof PASCAL_CONIC_IDS[number]) => chooseOnPuck('pascal-conic', conicAction(conic));
const chooseOrder = (order: typeof PASCAL_ORDER_IDS[number]) => chooseOnPuck('pascal-order', `order-${order}`);

test.each(PASCAL_EXAMPLE_IDS.filter(id => id !== 'custom'))('pascal-load-example %s reaches the state of the example button', async example => {
    // Start from a moved scene so that the example really replaces it.
    const prepare = () => chooseConic('hyperbola');
    const viaAction = await after(async graph => { await prepare(); apply(graph, {kind: 'projective', operation: 'pascal-load-example', exampleId: example}); });
    const viaControl = await after(async () => { await prepare(); chooseOption('Primer', EXAMPLE_BUTTON[example]); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
});

test.each(PASCAL_CONIC_IDS)('pascal-set-conic %s reaches the state of the conic puck', async conic => {
    // Start from another conic so that the action really changes the model (the ellipse is the default).
    const prepare = () => chooseConic(conic === 'hyperbola' ? 'parabola' : 'hyperbola');
    const viaAction = await after(async graph => { await prepare(); apply(graph, {kind: 'projective', operation: 'pascal-set-conic', conic}); });
    const viaControl = await after(async () => { await prepare(); await chooseConic(conic); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    if (conic !== 'ellipse') expect(viaAction.model.indices).toEqual(PASCAL_DEFAULT_INDICES[conic]);
});

test.each(PASCAL_ORDER_IDS)('pascal-set-order %s reaches the state of the order puck', async order => {
    // Start from another order so that the action really changes the model (the natural order is the default).
    const prepare = () => chooseOrder(order === 'star' ? 'pappus' : 'star');
    const viaAction = await after(async graph => { await prepare(); apply(graph, {kind: 'projective', operation: 'pascal-set-order', order}); });
    const viaControl = await after(async () => { await prepare(); await chooseOrder(order); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.order).toEqual(PASCAL_ORDERS[order]);
});

test.each([[0, 'A'], [3, 'D'], [5, 'F']] as const)('pascal-set-index on handle %s reaches the state of the next slider position', async (handle, name) => {
    const next = (() => {
        const list = reachableIndices('ellipse', handle);
        return list[(list.indexOf(PASCAL_DEFAULT_INDICES.ellipse[handle]) + 1) % list.length];
    })();
    const viaAction = await after(graph => { apply(graph, {kind: 'projective', operation: 'pascal-set-index', handle, index: next}); });
    const viaControl = await after(() => { act(() => { fireEvent.keyDown(screen.getByRole('slider', {name: `Točka ${name}`}), {key: 'ArrowRight'}); }); });
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
