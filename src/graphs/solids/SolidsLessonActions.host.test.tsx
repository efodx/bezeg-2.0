import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import type {LessonAction} from '../../learning/model';
import {setLanguage, t} from '../../localization';
import {GraphHost} from '../base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {FakeSurfaceView} from '../patches/FakeSurfaceView';
import SolidsGraph from './SolidsGraph';

beforeAll(installBoardShims);
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

const mount = (): SolidsGraph => {
    const graph = new SolidsGraph({viewFactory: () => new FakeSurfaceView(), typeset: async () => undefined});
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const apply = (graph: SolidsGraph, action: LessonAction) => act(() => { graph.getLessonCapabilities().apply(action); });
const setSolid = (solid: string): LessonAction => ({kind: 'solids', operation: 'set-solid', solid});
const setMode = (mode: string): LessonAction => ({kind: 'solids', operation: 'set-mode', mode});
const setPlane = (normal: readonly [number, number, number], offset?: number): LessonAction =>
    offset === undefined ? {kind: 'solids', operation: 'set-plane', normal} : {kind: 'solids', operation: 'set-plane', normal, offset};
const setOffset = (offset: number): LessonAction => ({kind: 'solids', operation: 'set-offset', offset});
const setCamera = (view: 'front' | 'top' | 'side' | 'isometric'): LessonAction => ({kind: 'solids', operation: 'set-camera', view});
const stateOf = (graph: SolidsGraph) => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);

/** The state and the readouts after running `edit` on a fresh graph and then unmounting it. */
function after(edit: (graph: SolidsGraph) => void) {
    const graph = mount();
    edit(graph);
    const result = {state: stateOf(graph), readouts: readouts()};
    cleanup();
    return result;
}

test('set-solid equals choosing the solid in the chooser (the camera is reframed too)', () => {
    const viaAction = after(graph => apply(graph, setSolid('square-pyramid')));
    expect(viaAction).toEqual(after(() => {
        fireEvent.change(screen.getByLabelText(t('solids_graph_solid')), {target: {value: 'square-pyramid'}});
    }));
    expect(viaAction.state).toEqual(expect.objectContaining({solid: 'square-pyramid', mode: 'section'}));
    expect(viaAction).toEqual(after(graph => act(() => graph.setSolid('square-pyramid'))));
});

test('set-mode equals the mode chooser; the solid and axis fall back as the chooser does', () => {
    const viaAction = after(graph => {
        apply(graph, setSolid('square-pyramid'));
        apply(graph, setMode('revolve'));
    });
    expect(viaAction).toEqual(after(graph => {
        act(() => graph.setSolid('square-pyramid'));
        fireEvent.change(screen.getByLabelText(t('solids_graph_mode')), {target: {value: 'revolve'}});
    }));
    expect(viaAction.state).toEqual(expect.objectContaining({mode: 'revolve', solid: 'cone'}));
    const back = after(graph => {
        apply(graph, setMode('volume'));
        apply(graph, setSolid('sphere'));
        apply(graph, setMode('section'));
    });
    expect(back.state).toEqual(expect.objectContaining({mode: 'section', solid: 'cube'}));
});

test('set-plane and set-offset equal the normal and offset controls', () => {
    const viaAction = after(graph => {
        apply(graph, setPlane([1, 1, 1], 6));
        apply(graph, setOffset(5));
    });
    expect(viaAction).toEqual(after(graph => {
        act(() => { graph.setNormal(0, 1); graph.setNormal(1, 1); graph.setNormal(2, 1); graph.setOffset(5); });
    }));
    expect(viaAction.state).toEqual(expect.objectContaining({normal: [1, 1, 1], offset: 5}));
    expect(viaAction.readouts).toContain('sides=6');
    expect(after(graph => apply(graph, setPlane([0, 0, -2]))).state).toEqual(expect.objectContaining({normal: [0, 0, -2], offset: 2}));
});

test('set-camera equals the camera preset buttons', () => {
    const viaAction = after(graph => apply(graph, setCamera('top')));
    expect(viaAction).toEqual(after(graph => act(() => graph.applyCameraPreset('top'))));
    expect(viaAction.state).not.toEqual(after(() => undefined).state);
});

test('a scene runs its actions in one synchronous sequence, each reading what the earlier one wrote', () => {
    const graph = mount();
    const free = stateOf(graph);
    act(() => {
        const capabilities = graph.getLessonCapabilities();
        capabilities.apply(setSolid('square-pyramid'));
        capabilities.apply(setPlane([0, 0, 1], -4));
        capabilities.apply(setMode('volume'));
        capabilities.apply(setMode('section'));
        capabilities.apply(setOffset(0));
        capabilities.apply(setCamera('front'));
    });
    expect(graph.state).toEqual(expect.objectContaining({solid: 'square-pyramid', mode: 'section', normal: [0, 0, 1], offset: 0}));
    expect(readouts()).toContain('sides=4');
    const here = {state: stateOf(graph), readouts: readouts()};
    cleanup();
    const viaControl = after(graph => act(() => {
        graph.setSolid('square-pyramid');
        graph.setNormal(2, 1);
        graph.setOffset(-4);
        graph.setMode('volume');
        graph.setMode('section');
        graph.setOffset(0);
        graph.applyCameraPreset('front');
    }));
    expect(viaControl).toEqual(here);
    expect(here.state).not.toEqual(free);
});

test('restoring the checkpoint after the actions returns the free state', () => {
    const graph = mount();
    const capabilities = graph.getLessonCapabilities();
    const free = stateOf(graph);
    const freeReadouts = readouts();
    const checkpoint = capabilities.captureState();
    apply(graph, setSolid('square-pyramid'));
    apply(graph, setPlane([2, 3, 4], 16));
    apply(graph, setCamera('side'));
    expect(stateOf(graph)).not.toEqual(free);
    act(() => { capabilities.restoreState(checkpoint); });
    expect(stateOf(graph)).toEqual(free);
    expect(readouts()).toEqual(freeReadouts);
});

test('the graph supports its actions; invalid scene data is a lesson-content error and changes nothing', () => {
    const graph = mount();
    expect(graph.supportsLessonAction(setSolid('cube'))).toBe(true);
    expect(graph.supportsLessonAction(setMode('section'))).toBe(true);
    expect(graph.supportsLessonAction(setPlane([1, 0, 0]))).toBe(true);
    expect(graph.supportsLessonAction(setOffset(1))).toBe(true);
    expect(graph.supportsLessonAction(setCamera('top'))).toBe(true);
    expect(graph.supportsLessonAction({kind: 'waves', operation: 'set-time', t: 1})).toBe(false);
    apply(graph, setPlane([2, 3, 4], 16));
    const before = stateOf(graph);
    const beforeReadouts = readouts();
    const unknown = (action: object) => action as unknown as LessonAction;
    const bad: LessonAction[] = [
        setSolid('torus'), setSolid(JSON.parse('null')), setSolid(JSON.parse('3')),
        setMode('slice'), setMode(JSON.parse('null')),
        setPlane([0, 0, 0]), setPlane([5, 0, 1]), setPlane([1.5, 0, 1]), setPlane([1, 0, Number.NaN]), setPlane([1, 0, 1], 1.5), setPlane([1, 0, 1], 9999),
        setPlane(JSON.parse('[1, 2]')), setPlane(JSON.parse('null')),
        setOffset(0.5), setOffset(Number.NaN), setOffset(Number.POSITIVE_INFINITY), setOffset(9999), setOffset(JSON.parse('"3"')), setOffset(JSON.parse('null')),
        setCamera(JSON.parse('"left"')), setCamera(JSON.parse('null')),
        unknown({kind: 'solids', operation: 'set-shear', shear: 1}),
        unknown({kind: 'solids', operation: 'set-solid', solid: 'cube', mode: 'section'}),
        unknown({kind: 'solids', operation: 'set-mode', mode: 'section', offset: 1}),
        unknown({kind: 'solids', operation: 'set-plane', normal: [1, 0, 1], shear: 1}),
        unknown({kind: 'solids', operation: 'set-offset', offset: 1, normal: [1, 0, 1]}),
        unknown({kind: 'solids', operation: 'set-camera', view: 'top', az: 1}),
    ];
    for (const action of bad) {
        const label = JSON.stringify(action);
        expect(() => apply(graph, action), label).toThrow(/^solids[ :]/);
        expect(stateOf(graph), label).toEqual(before);
        expect(readouts(), label).toEqual(beforeReadouts);
    }
    expect(() => apply(graph, setPlane([5, 0, 1]))).toThrow(/solids set-plane: normal\[0\] out-of-range\./);
    expect(() => apply(graph, setPlane([0, 0, 0]))).toThrow(/solids set-plane: normal zero-normal\./);
    expect(() => apply(graph, setOffset(0.5))).toThrow(/solids set-offset: offset off-grid\./);
    expect(() => apply(graph, setSolid('torus'))).toThrow(/solids set-solid: solid unknown-value\./);
    expect(() => apply(graph, unknown({kind: 'solids', operation: 'set-offset', offset: 1, normal: [1, 0, 1]}))).toThrow(/solids set-offset: no such field normal\./);
});
