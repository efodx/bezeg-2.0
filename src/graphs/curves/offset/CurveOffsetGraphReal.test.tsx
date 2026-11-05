import React from 'react';
import {act, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {GeometryElement} from 'jsxgraph';
import CurveOffsetGraph, {OFFSET_DISTANCE_DEFAULT, OFFSET_PARABOLA_POINTS} from './CurveOffsetGraph';
import {OFFSET_CUSP_MARKERS} from './OffsetOverlay';
import {OFFSET_SAMPLES_DEFAULT, offsetTrace} from './curveOffset';
import {setLanguage, t} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => localStorage.clear());
afterEach(() => setLanguage('sl'));

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

type BoardObject = GeometryElement & {
    plaintext?: string; dataX?: number[]; dataY?: number[]; visPropCalc: { visible: boolean }; X?: () => number; Y?: () => number;
};

class OffsetGraphProbe extends ObservedOffsetGraph {
    owned() { return this.offset()!.ownedElements() as unknown as BoardObject[]; }
    trace() { return this.owned().find(element => element.elType === 'curve')!; }
    markers() { return this.owned().filter(element => element.elType === 'point'); }
    captions() { return this.owned().filter(element => element.elType === 'text').map(element => element.plaintext ?? '').filter(Boolean); }
    setBoardWidth(width: number) {
        const board = this.liveBoard();
        (board as unknown as { canvasWidth: number }).canvasWidth = width;
        board.update();
    }
    movePoint(index: number, to: number[]) {
        const point = this.getFirstJxgCurve().getJxgPoints()[index];
        point.moveTo(to, 0);
        (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
        this.liveBoard().update();
    }
}

function mount() {
    const graph = new OffsetGraphProbe();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

/** The data of the trace must be the kernel's, sample for sample (NaN pairs included). */
function expectTraceIsKernel(graph: OffsetGraphProbe, d: number, samples: number) {
    const expected = offsetTrace(graph.controlRows()!, d, samples);
    expect(expected.x.length).toBeGreaterThan(0);
    expect(graph.trace().dataX).toEqual(expected.x);
    expect(graph.trace().dataY).toEqual(expected.y);
}

describe('the sampled trace on the board', () => {
    test('equals the kernel trace after a change of d, of the sample count, and after moving a control point', () => {
        const {graph, view} = mount();
        try {
            expectTraceIsKernel(graph, OFFSET_DISTANCE_DEFAULT, OFFSET_SAMPLES_DEFAULT);
            act(() => graph.setOffsetDistance(0.7));
            expectTraceIsKernel(graph, 0.7, OFFSET_SAMPLES_DEFAULT);
            act(() => graph.setOffsetSamples(64));
            expectTraceIsKernel(graph, 0.7, 64);
            expect(graph.trace().dataX!.length).toBe(64);
            act(() => graph.setOffsetSamples(300));
            expect(graph.trace().dataX!.length).toBe(300);
            const before = graph.trace().dataX!.slice();
            graph.movePoint(1, [0.5, -2]);
            expect(graph.controlRows()![1]).toEqual([0.5, -2]);
            expectTraceIsKernel(graph, 0.7, 300);
            expect(graph.trace().dataX).not.toEqual(before);
        } finally { view.unmount(); }
    });

    test('is empty and hidden while the offset is switched off, and back when switched on', () => {
        const {graph, view} = mount();
        try {
            expect(graph.trace().visPropCalc.visible).toBe(true);
            act(() => graph.setOffsetShown(false));
            expect(graph.trace().dataX).toEqual([]);
            expect(graph.trace().visPropCalc.visible).toBe(false);
            act(() => graph.setOffsetShown(true));
            expect(graph.trace().visPropCalc.visible).toBe(true);
            expectTraceIsKernel(graph, OFFSET_DISTANCE_DEFAULT, OFFSET_SAMPLES_DEFAULT);
        } finally { view.unmount(); }
    });
});

describe('the cusps of the default parabola (spec L5 numbers)', () => {
    const visibleMarkers = (graph: OffsetGraphProbe) => graph.markers().filter(marker => marker.visPropCalc.visible);

    test('d = -0.5 has one cusp at (0, 0.5); d = -1 has two at (+-0.2251, 0.9406)', () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setOffsetCuspsShown(true); graph.setOffsetDistance(-0.5); });
            expect(graph.offset()!.cuspCount()).toBe(1);
            let shown = visibleMarkers(graph);
            expect(shown).toHaveLength(1);
            expect(Math.abs(shown[0].X!())).toBeLessThan(1e-4);
            expect(Math.abs(shown[0].Y!() - 0.5)).toBeLessThan(1e-4);
            expect(graph.captions()).toContain(t('offset_readout_cusps', {value0: '1'}));

            act(() => graph.setOffsetDistance(-1));
            expect(graph.offset()!.cuspCount()).toBe(2);
            shown = visibleMarkers(graph);
            expect(shown).toHaveLength(2);
            const points = shown.map(marker => [marker.X!(), marker.Y!()]).sort((a, b) => a[0] - b[0]);
            expect(Math.abs(points[0][0] + 0.2251)).toBeLessThan(1e-4);
            expect(Math.abs(points[1][0] - 0.2251)).toBeLessThan(1e-4);
            expect(Math.abs(points[0][1] - 0.9406)).toBeLessThan(1e-4);
            expect(Math.abs(points[1][1] - 0.9406)).toBeLessThan(1e-4);
            expect(graph.captions()).toContain(t('offset_readout_cusps', {value0: '2'}));
            expect(graph.offset()!.readoutText()).toContain(t('offset_readout_cusps', {value0: '2'}));
            // The unused pool slots stay invisible.
            expect(graph.markers()).toHaveLength(OFFSET_CUSP_MARKERS);
            expect(graph.markers().filter(marker => !marker.visPropCalc.visible)).toHaveLength(OFFSET_CUSP_MARKERS - 2);
        } finally { view.unmount(); }
    });

    test('the markers show only while the cusps switch is on, and no cusp reads as none', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setOffsetDistance(-1));
            expect(visibleMarkers(graph)).toHaveLength(0);
            expect(graph.captions()).toContain(t('offset_readout_cusps', {value0: '2'}));
            act(() => graph.setOffsetCuspsShown(true));
            expect(visibleMarkers(graph)).toHaveLength(2);
            act(() => graph.setOffsetCuspsShown(false));
            expect(visibleMarkers(graph)).toHaveLength(0);
            act(() => graph.setOffsetDistance(0.5));
            expect(graph.offset()!.cuspCount()).toBe(0);
            expect(graph.captions()).toContain(t('offset_readout_cusps_none'));
        } finally { view.unmount(); }
    });
});

type ExactOffsets = { getOffsetCurves(): { eval(t: number): { X(): number; Y(): number } }[]; getOffsetCurveDistance(): number };

describe('the PH curve kind', () => {
    const exactOffsetAt = (graph: OffsetGraphProbe, s: number): [number, number] => {
        const ph = graph.getFirstCurve() as unknown as ExactOffsets;
        expect(ph.getOffsetCurves()).toHaveLength(1);
        const point = ph.getOffsetCurves()[0].eval(s);
        return [point.X(), point.Y()];
    };

    /**
     * The sampled trace is the exact offset at evenly spaced t, so at the sample parameters the exact point equals the trace
     * vertex (1e-6, rounding only). Between samples the polyline chord deviates from the curve by about h^2*|c''|/8; for the
     * default PH curve (length about 10, h about 0.1) that is well under 5e-3, which bounds the distance to the polyline.
     */
    function expectExactOnSampled(graph: OffsetGraphProbe) {
        const {dataX, dataY} = graph.trace();
        const n = dataX!.length;
        expect(n).toBe(OFFSET_SAMPLES_DEFAULT);
        for (const k of [0, 17, 64, 100, n - 1]) {
            const [x, y] = exactOffsetAt(graph, k / (n - 1));
            expect(Math.abs(x - dataX![k])).toBeLessThan(1e-6);
            expect(Math.abs(y - dataY![k])).toBeLessThan(1e-6);
        }
        for (const s of [0.1, 0.33, 0.5, 0.77, 0.95]) {
            const [x, y] = exactOffsetAt(graph, s);
            let best = Infinity;
            for (let i = 0; i + 1 < n; i++) {
                const [ax, ay, ex, ey] = [dataX![i], dataY![i], dataX![i + 1] - dataX![i], dataY![i + 1] - dataY![i]];
                const u = Math.min(1, Math.max(0, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
                best = Math.min(best, Math.hypot(x - ax - u * ex, y - ay - u * ey));
            }
            expect(best).toBeLessThan(5e-3);
        }
    }

    test('has exactly one exact offset lying on the sampled one, for negative and positive d and after a change of d', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setCurveKind('ph'));
            const ph = graph.getFirstCurve() as unknown as ExactOffsets;
            expect(ph.getOffsetCurves()).toHaveLength(1);
            expect(ph.getOffsetCurveDistance()).toBe(OFFSET_DISTANCE_DEFAULT);
            expectExactOnSampled(graph);
            for (const d of [-1.5, 1.5, 0.4]) {
                act(() => graph.setOffsetDistance(d));
                expect(ph.getOffsetCurveDistance()).toBe(d);
                expect(ph.getOffsetCurves()).toHaveLength(1);
                expectExactOnSampled(graph);
            }
        } finally { view.unmount(); }
    });

    test('a PH Preset stored with 3 offsets and d = 1.2 imports to one curve at the distance of the graph state', async () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setCurveKind('ph'); graph.setOffsetDistance(-0.75); });
            act(() => graph.saveCurrentPreset('ph3'));
            const key = Object.keys(localStorage).find(name => name.includes('preset-curve-offset'))!;
            const stored = JSON.parse(localStorage.getItem(key)!);
            const dto = stored.data[0].data[0][1];
            dto.state.offsetCurveNumber = 3;
            dto.state.d = 1.2;
            localStorage.setItem(key, JSON.stringify(stored));
            act(() => graph.setCurveKind('bezier'));
            await settle(() => graph.selectPreset('ph3'));
            expect(graph.curveKind()).toBe('ph');
            const ph = graph.getFirstCurve() as unknown as ExactOffsets;
            expect(ph.getOffsetCurves()).toHaveLength(1);
            expect(graph.state.offsetD).toBe(-0.75);
            expect(ph.getOffsetCurveDistance()).toBe(-0.75);
            expectExactOnSampled(graph);
        } finally { view.unmount(); }
    });

    test('going back to the Bezier curve keeps d, the sample count and the switches', () => {
        const {graph, view} = mount();
        try {
            act(() => {
                graph.setOffsetDistance(-0.9); graph.setOffsetSamples(200); graph.setOffsetCuspsShown(true);
                graph.setOffsetSpeedPlotShown(true); graph.setOffsetShown(false);
            });
            act(() => graph.setCurveKind('ph'));
            act(() => graph.setCurveKind('bezier'));
            expect(graph.curveKind()).toBe('bezier');
            expect(graph.controlRows()).toEqual(OFFSET_PARABOLA_POINTS);
            expect(graph.state).toMatchObject({offsetD: -0.9, offsetSamples: 200, offsetCuspsShown: true, offsetSpeedPlotShown: true, offsetShown: false});
        } finally { view.unmount(); }
    });
});

describe('copy', () => {
    test('a narrow board drops the wrapping notes from the caption; the live text and the inspector keep them', () => {
        const {graph, view} = mount();
        const inspectorNotes = () => Array.from(view.container.querySelectorAll('.inspector-help')).map(element => element.textContent);
        const notes = [t('offset_readout_approx'), t('offset_readout_exact_ph')];
        try {
            act(() => graph.setCurveKind('ph'));
            act(() => graph.setBoardWidth(364));
            expect(graph.captions()).toHaveLength(2);
            notes.forEach(note => expect(graph.captions()).not.toContain(note));
            notes.forEach(note => expect(graph.offset()!.readoutText()).toContain(note));
            expect(inspectorNotes()).toEqual(expect.arrayContaining(notes));
            act(() => graph.setBoardWidth(1000));
            expect(graph.captions()).toEqual(expect.arrayContaining(notes));
            act(() => graph.setOffsetShown(false));
            notes.forEach(note => expect(inspectorNotes()).not.toContain(note));
            act(() => { graph.setOffsetShown(true); graph.setCurveKind('bezier'); });
            expect(inspectorNotes()).toContain(notes[0]);
            expect(inspectorNotes()).not.toContain(notes[1]);
        } finally { view.unmount(); }
    });

    test('the Bezier caption says approximate and has no exact line; the PH caption adds it; off shows neither', () => {
        const {graph, view} = mount();
        try {
            expect(graph.captions()).toContain(t('offset_readout_approx'));
            expect(graph.captions()).not.toContain(t('offset_readout_exact_ph'));
            act(() => graph.setCurveKind('ph'));
            expect(graph.captions()).toContain(t('offset_readout_approx'));
            expect(graph.captions()).toContain(t('offset_readout_exact_ph'));
            act(() => graph.setOffsetShown(false));
            expect(graph.captions()).not.toContain(t('offset_readout_approx'));
            expect(graph.captions()).not.toContain(t('offset_readout_exact_ph'));
            expect(graph.captions()).toHaveLength(2);
            act(() => graph.setCurveKind('bezier'));
            expect(graph.captions()).not.toContain(t('offset_readout_approx'));
        } finally { view.unmount(); }
    });

    test('the inspector states that only local cusps are shown', () => {
        const {view} = mount();
        try {
            expect(screen.getByText(t('offset_local_note'))).toBeInTheDocument();
        } finally { view.unmount(); }
    });

    test('a language switch to English changes the board caption', () => {
        const {graph, view} = mount();
        try {
            const slovenian = graph.captions();
            expect(slovenian).toContain(t('offset_readout_approx'));
            act(() => setLanguage('en'));
            expect(graph.captions()).toContain(t('offset_readout_approx'));
            expect(graph.captions()).not.toEqual(slovenian);
            expect(graph.captions().some(line => slovenian.includes(line))).toBe(false);
        } finally { view.unmount(); }
    });
});
