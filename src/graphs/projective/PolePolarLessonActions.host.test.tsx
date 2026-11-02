import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {PolePolarGraph} from './PolePolarGraph';
import {PascalGraph} from './PascalGraph';
import {CrossRatioGraph} from './CrossRatioGraph';
import {POLE_POLAR_CONIC_IDS, POLE_POLAR_DIRECTION_LIMIT, POLE_POLAR_EXAMPLE_IDS, POLE_POLAR_NUMERATOR_LIMIT, PolePolarModel} from './polePolarModel';
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

const mountGraph = <G extends PolePolarGraph | PascalGraph | CrossRatioGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const mount = (): PolePolarGraph => mountGraph(new PolePolarGraph());
const apply = (graph: PolePolarGraph | PascalGraph | CrossRatioGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const click = (button: HTMLElement) => act(() => { button.click(); });
const shown = () => [...document.querySelectorAll('[data-projective-line]')].map(node => `${node.getAttribute('data-projective-line')}=${node.textContent}`);

/** The model and the text after running `edit` on a fresh graph, with the graph unmounted again. */
function after(edit: (graph: PolePolarGraph) => void): {model: PolePolarModel; text: string[]} {
    const graph = mount();
    edit(graph);
    const result = {model: graph.model, text: shown()};
    cleanup();
    return result;
}

const EXAMPLE_BUTTON: Record<typeof POLE_POLAR_EXAMPLE_IDS[number], string> = {
    default: 'Točka zunaj elipse', on: 'Točka na elipsi', inside: 'Točka znotraj elipse', infinity: 'Točka v neskončnosti', custom: 'Lastna postavitev',
};
const CONIC_BUTTON: Record<typeof POLE_POLAR_CONIC_IDS[number], string> = {ellipse: 'Elipsa', circle: 'Krožnica', parabola: 'Parabola', hyperbola: 'Hiperbola'};
const inGroup = (group: string, name: string) => {
    const root = screen.getByRole('group', {name: group});
    const match = [...root.querySelectorAll('button')].find(button => button.textContent === name);
    if (!match) throw new Error(`no button ${name} in ${group}`);
    return match;
};
const typeInto = (label: string, value: number) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value: String(value)}}); });

test.each(POLE_POLAR_EXAMPLE_IDS.filter(id => id !== 'custom'))('pole-polar-load-example %s reaches the state of the example button', example => {
    // Start from a moved scene (a hyperbola) so that the action really replaces it.
    const prepare = () => click(inGroup('Stožnica', 'Hiperbola'));
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pole-polar-load-example', exampleId: example}); });
    const viaControl = after(() => { prepare(); click(inGroup('Primer', EXAMPLE_BUTTON[example])); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
});

test.each(POLE_POLAR_CONIC_IDS)('pole-polar-set-conic %s reaches the state of the conic button', conic => {
    // Start from another conic so that the action really changes the model (the ellipse is the default).
    const prepare = () => click(inGroup('Stožnica', CONIC_BUTTON[conic === 'hyperbola' ? 'parabola' : 'hyperbola']));
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pole-polar-set-conic', conic}); });
    const viaControl = after(() => { prepare(); click(inGroup('Stožnica', CONIC_BUTTON[conic])); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.conic).toBe(conic);
});

test.each([[10, 0], [-7, 33], [50, -50]] as const)('pole-polar-place (%s, %s) reaches the state of the coordinate fields', (x, y) => {
    // Start from the inside example so that the action changes the model.
    const prepare = () => click(inGroup('Primer', EXAMPLE_BUTTON.inside));
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pole-polar-place', x, y}); });
    const viaControl = after(() => { prepare(); typeInto('Točka P: x', x / 5); typeInto('Točka P: y', y / 5); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.p).toEqual({x, y});
    expect(viaAction.model.ideal).toBeUndefined();
});

test('pole-polar-set-direction reaches the state of the mode button and the direction fields, and back to the finite P', () => {
    const prepare = () => click(inGroup('Primer', EXAMPLE_BUTTON.inside));
    const viaAction = after(graph => { prepare(); apply(graph, {kind: 'projective', operation: 'pole-polar-set-direction', dx: 2, dy: -3}); });
    const viaControl = after(() => { prepare(); click(inGroup('Vrsta točke P', 'P: v neskončnosti')); typeInto('Smer točke P: dx', 2); typeInto('Smer točke P: dy', -3); });
    expect(viaAction.model).toEqual(viaControl.model);
    expect(viaAction.text).toEqual(viaControl.text);
    expect(viaAction.model.ideal).toEqual({dx: 2, dy: -3});

    // Back to the finite P, starting from the point at infinity.
    const backAction = after(graph => {
        click(inGroup('Primer', EXAMPLE_BUTTON.infinity));
        apply(graph, {kind: 'projective', operation: 'pole-polar-set-direction'});
    });
    const backControl = after(() => { click(inGroup('Primer', EXAMPLE_BUTTON.infinity)); click(inGroup('Vrsta točke P', 'P: končna točka')); });
    expect(backAction.model).toEqual(backControl.model);
    expect(backAction.text).toEqual(backControl.text);
    expect(backAction.model.ideal).toBeUndefined();
});

test('pole-polar operations refuse out-of-range, non-integer and unknown values and change nothing', () => {
    const graph = mount();
    const before = graph.model;
    const bad: LessonAction[] = [
        {kind: 'projective', operation: 'pole-polar-load-example', exampleId: JSON.parse('"nope"')},
        {kind: 'projective', operation: 'pole-polar-set-conic', conic: JSON.parse('"linePair"')},
        {kind: 'projective', operation: 'pole-polar-place', x: POLE_POLAR_NUMERATOR_LIMIT + 1, y: 0},
        {kind: 'projective', operation: 'pole-polar-place', x: 0, y: -POLE_POLAR_NUMERATOR_LIMIT - 1},
        {kind: 'projective', operation: 'pole-polar-place', x: 1.5, y: 0},
        {kind: 'projective', operation: 'pole-polar-place', x: 0, y: Number.NaN},
        {kind: 'projective', operation: 'pole-polar-set-direction', dx: 0, dy: 0},
        {kind: 'projective', operation: 'pole-polar-set-direction', dx: POLE_POLAR_DIRECTION_LIMIT + 1, dy: 1},
        {kind: 'projective', operation: 'pole-polar-set-direction', dx: 1, dy: 0.5},
        {kind: 'projective', operation: 'pole-polar-set-direction', dx: 1},
        {kind: 'projective', operation: 'pole-polar-set-direction', dy: 1},
    ];
    for (const action of bad) expect(() => apply(graph, action), JSON.stringify(action)).toThrow();
    expect(graph.model).toBe(before);
});

test('each projective graph rejects the other graphs\' operations, naming the operation', () => {
    const polePolar = mount();
    for (const action of [
        {kind: 'projective', operation: 'load-example', exampleId: 'default'},
        {kind: 'projective', operation: 'move-handle', handle: 0, x: 1},
        {kind: 'projective', operation: 'pascal-set-conic', conic: 'ellipse'},
    ] as const) expect(() => apply(polePolar, action)).toThrow(action.operation);
    cleanup();
    const pascal = mountGraph(new PascalGraph());
    expect(() => apply(pascal, {kind: 'projective', operation: 'pole-polar-place', x: 0, y: 0})).toThrow('pole-polar-place');
    cleanup();
    const crossRatio = mountGraph(new CrossRatioGraph());
    for (const action of [
        {kind: 'projective', operation: 'pole-polar-load-example', exampleId: 'default'},
        {kind: 'projective', operation: 'pole-polar-set-conic', conic: 'circle'},
        {kind: 'projective', operation: 'pole-polar-place', x: 0, y: 0},
        {kind: 'projective', operation: 'pole-polar-set-direction', dx: 1, dy: 0},
    ] as const) expect(() => apply(crossRatio, action)).toThrow(action.operation);
});
