import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import CurveOffsetGraph, {OFFSET_DISTANCE_DEFAULT, OFFSET_PARABOLA_POINTS} from './CurveOffsetGraph';
import {OFFSET_SAMPLES_DEFAULT} from './curveOffset';
import {GraphHost} from '../../base/GraphHost';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => localStorage.clear());

class ObservedOffsetGraph extends CurveOffsetGraph {
    liveBoard() { return this.board; }
}

describe('CurveOffsetGraph smoke', () => {
    test('mounts the parabola with the default offset state and disposes its overlay', () => {
        const graph = new ObservedOffsetGraph();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        const board = graph.liveBoard();
        try {
            expect(graph.curveKind()).toBe('bezier');
            expect(graph.controlRows()).toEqual(OFFSET_PARABOLA_POINTS);
            expect(graph.state.offsetD).toBe(OFFSET_DISTANCE_DEFAULT);
            expect(graph.state.offsetSamples).toBe(OFFSET_SAMPLES_DEFAULT);
            expect(graph.state.offsetShown).toBe(true);
            expect(graph.state.offsetCuspsShown).toBe(false);
            expect(graph.state.offsetSpeedPlotShown).toBe(false);
            const owned = graph.offset()!.ownedElements();
            expect(owned.length).toBeGreaterThan(0);
            expect(owned.every(element => board.objectsList.includes(element))).toBe(true);
            expect(graph.offset()!.cuspCount()).toBe(0);
            act(() => graph.setOffsetDistance(-1));
            expect(graph.offset()!.cuspCount()).toBe(2);
            expect(graph.speedPlot().lastData()!.cusps).toHaveLength(2);
            graph.offset()!.dispose();
            expect(owned.some(element => board.objectsList.includes(element))).toBe(false);
            graph.offset()!.dispose();
        } finally { view.unmount(); }
    });

    test('switches to the PH curve with exactly one exact offset at the state distance', () => {
        const graph = new ObservedOffsetGraph();
        const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        try {
            act(() => graph.setCurveKind('ph'));
            expect(graph.curveKind()).toBe('ph');
            const ph = graph.getFirstCurve() as unknown as {getOffsetCurves(): unknown[]; getOffsetCurveDistance(): number};
            expect(ph.getOffsetCurves()).toHaveLength(1);
            expect(ph.getOffsetCurveDistance()).toBe(OFFSET_DISTANCE_DEFAULT);
            act(() => graph.setOffsetDistance(0.5));
            expect(ph.getOffsetCurveDistance()).toBe(0.5);
        } finally { view.unmount(); }
    });
});
