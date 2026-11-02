import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {ThreeViewsGraph} from './ThreeViewsGraph';
import {FivePointGraph} from './FivePointGraph';
import {PolePolarGraph} from './PolePolarGraph';
import {PascalGraph} from './PascalGraph';
import {CrossRatioGraph} from './CrossRatioGraph';
import {DEFAULT_THREE_VIEWS_MODEL, THREE_VIEWS_ANGLE_STEPS, THREE_VIEWS_LIMIT, ThreeViewsModel} from './threeViewsModel';
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

type AnyProjectiveGraph = ThreeViewsGraph | FivePointGraph | PolePolarGraph | PascalGraph | CrossRatioGraph;
const mountGraph = <G extends AnyProjectiveGraph>(graph: G): G => {
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const mount = (): ThreeViewsGraph => mountGraph(new ThreeViewsGraph());
const apply = (graph: AnyProjectiveGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const shown = () => [...document.querySelectorAll('[data-projective-line]')].map(node => `${node.getAttribute('data-projective-line')}=${node.textContent}`);

interface Result {model: ThreeViewsModel; contact: string | null; type: string | null; text: string[]}
/** The model, the status attributes and the text after running `edit` on a fresh graph, with the graph unmounted again. */
function after(edit: (graph: ThreeViewsGraph) => void): Result {
    const graph = mount();
    edit(graph);
    const status = document.querySelector('[data-projective-status]');
    const result = {
        model: graph.model, contact: status?.getAttribute('data-projective-contact') ?? null, type: status?.getAttribute('data-projective-status') ?? null, text: shown(),
    };
    cleanup();
    return result;
}

const slider = (label: RegExp) => screen.getByLabelText<HTMLInputElement>(label);
const setSlider = (label: RegExp, value: number) => act(() => { fireEvent.change(slider(label), {target: {value: String(value)}}); });
const C_SLIDER = /Višina premice L/;
const ANGLE_SLIDER = /Kot točke P/;
const toggle = () => act(() => { screen.getByLabelText<HTMLInputElement>(/Točka P na krožnici/).click(); });

test.each([[10, 'parabola', 'touches'], [0, 'hyperbola', 'cuts'], [-25, 'ellipse', 'misses'], [-10, 'parabola', 'touches']] as const)(
    'three-views-set-c %s reaches the state of the c slider', (tenths, type, contact) => {
        const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'three-views-set-c', tenths}));
        const viaControl = after(() => setSlider(C_SLIDER, tenths));
        expect(viaAction).toEqual(viaControl);
        expect(viaAction.model.c).toBe(tenths);
        expect(viaAction.model).not.toEqual(DEFAULT_THREE_VIEWS_MODEL);
        expect([viaAction.type, viaAction.contact]).toEqual([type, contact]);
    });

test('three-views-set-point reaches the state of the checkbox, on and back off', () => {
    const viaAction = after(graph => apply(graph, {kind: 'projective', operation: 'three-views-set-point', on: true}));
    const viaControl = after(() => toggle());
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.model.pointOn).toBe(true);
    expect(viaAction.text.some(entry => entry.startsWith('point='))).toBe(true);
    const offAction = after(graph => {
        apply(graph, {kind: 'projective', operation: 'three-views-set-point', on: true});
        apply(graph, {kind: 'projective', operation: 'three-views-set-point', on: false});
    });
    const offControl = after(() => { toggle(); toggle(); });
    expect(offAction).toEqual(offControl);
    expect(offAction.model.pointOn).toBe(false);
});

test.each([0, 8, 23] as const)('three-views-set-angle %s reaches the state of the angle slider', step => {
    // The angle slider is enabled only with the point on; the default step is 3, so these steps change something (0 and 8 and 23 differ from 3).
    const viaAction = after(graph => {
        apply(graph, {kind: 'projective', operation: 'three-views-set-point', on: true});
        apply(graph, {kind: 'projective', operation: 'three-views-set-angle', step});
    });
    const viaControl = after(() => { toggle(); setSlider(ANGLE_SLIDER, step); });
    expect(viaAction).toEqual(viaControl);
    expect(viaAction.model.angle).toBe(step);
    expect(viaAction.model.angle).not.toBe(DEFAULT_THREE_VIEWS_MODEL.angle);
});

test('three-views operations refuse out-of-range, non-integer and mistyped values and change nothing', () => {
    const graph = mount();
    const before = graph.model;
    const bad: Extract<LessonAction, {kind: 'projective'}>[] = [
        {kind: 'projective', operation: 'three-views-set-c', tenths: THREE_VIEWS_LIMIT + 1},
        {kind: 'projective', operation: 'three-views-set-c', tenths: -THREE_VIEWS_LIMIT - 1},
        {kind: 'projective', operation: 'three-views-set-c', tenths: 1.5},
        {kind: 'projective', operation: 'three-views-set-c', tenths: Number.NaN},
        {kind: 'projective', operation: 'three-views-set-c', tenths: Number.POSITIVE_INFINITY},
        {kind: 'projective', operation: 'three-views-set-point', on: JSON.parse('1')},
        {kind: 'projective', operation: 'three-views-set-angle', step: THREE_VIEWS_ANGLE_STEPS},
        {kind: 'projective', operation: 'three-views-set-angle', step: -1},
        {kind: 'projective', operation: 'three-views-set-angle', step: 2.5},
        {kind: 'projective', operation: 'three-views-set-angle', step: Number.NaN},
    ];
    for (const action of bad) expect(() => apply(graph, action), JSON.stringify(action)).toThrow(action.operation);
    expect(graph.model).toBe(before);
});

test('each projective graph rejects the other graphs operations, naming the operation', () => {
    const threeViews = mount();
    for (const action of [
        {kind: 'projective', operation: 'load-example', exampleId: 'default'},
        {kind: 'projective', operation: 'move-handle', handle: 0, x: 1},
        {kind: 'projective', operation: 'pascal-set-conic', conic: 'ellipse'},
        {kind: 'projective', operation: 'pole-polar-place', x: 0, y: 0},
        {kind: 'projective', operation: 'five-point-set-extrapolation', on: true},
    ] as const) expect(() => apply(threeViews, action)).toThrow(action.operation);
    cleanup();
    const operations = [
        {kind: 'projective', operation: 'three-views-set-c', tenths: 0},
        {kind: 'projective', operation: 'three-views-set-point', on: true},
        {kind: 'projective', operation: 'three-views-set-angle', step: 1},
    ] as const;
    for (const graph of [new FivePointGraph(), new PolePolarGraph(), new PascalGraph(), new CrossRatioGraph()]) {
        mountGraph(graph);
        for (const action of operations) expect(() => apply(graph, action), `${graph.constructor.name} ${action.operation}`).toThrow(action.operation);
        cleanup();
    }
});
