import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach, beforeAll, beforeEach, describe, expect, test} from 'vitest';
import BSplineBlossomGraph from './BSplineBlossomGraph';
import {GraphHost} from '../../base/GraphHost';
import {BSplinePresetData} from './bsplinePresetCollection';

beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

const KEY = 'bezeg-2.0:preset-bspline-curve';
const A: BSplinePresetData = {degree: 2, knots: [0, 0, 0, 1, 2, 2, 2], points: [[0, 0], [1, 2], [3, 2], [4, 1]]};
const B: BSplinePresetData = {degree: 3, knots: [0, 0, 0, 0, 1, 1, 1, 1], points: [[0, 0], [1, 2], [3, 2], [4, 0]]};

class ObservedGraph extends BSplineBlossomGraph {
    sceneOf() { return this['scene']!; }
}

beforeEach(() => localStorage.setItem(KEY, JSON.stringify({data: [{id: 'A', data: A}, {id: 'B', data: B}]})));
afterEach(() => localStorage.clear());

const mount = () => {
    const graph = new ObservedGraph();
    render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return graph;
};
const drawn = (element: {X(): number, Y(): number}) => [element.X(), element.Y()];
const visible = (element: unknown) => (element as {evalVisProp(name: string): boolean}).evalVisProp('visible');

/** The blossom is drawn from the live state: a snapshot, a last triangle point on it, a visible label and the readouts. */
const expectBlossomDrawn = (graph: ObservedGraph, data: BSplinePresetData) => {
    expect(graph.state.degree).toBe(data.degree);
    expect(graph.state.knots).toEqual(data.knots);
    const snapshot = graph.snapshot();
    expect(snapshot).toBeDefined();
    const scene = graph.sceneOf();
    const [x, y] = drawn(scene.levelElements(data.degree)[0]);
    expect(x).toBeCloseTo(snapshot!.value[0], 12);
    expect(y).toBeCloseTo(snapshot!.value[1], 12);
    expect(visible(scene.labelElement())).toBe(true);
    expect(document.querySelector('[data-blossom-readout="value"]')).not.toBeNull();
};
/** Starts the operation inside `act` so the host commits its renders, then waits for it outside. */
const settle = async (start: () => Promise<void>) => {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
};

describe('Preset selection and Reset draw the blossom', () => {
    test('selecting a Preset of another degree, reopening the first, and Reset', async () => {
        const graph = mount();
        await settle(() => graph.selectPreset('B'));
        expectBlossomDrawn(graph, B);
        await settle(() => graph.selectPreset('A'));
        expectBlossomDrawn(graph, A);
        await settle(() => graph.selectPreset('B'));
        await settle(() => graph.reset());
        expectBlossomDrawn(graph, B);
    });
});
