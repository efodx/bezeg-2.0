import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import ParametricCurveGraph from './ParametricCurveGraph';
import {GraphHost} from '../../base/GraphHost';
import {installBoardShims} from '../../base/realGraphTestHarness';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    installBoardShims();
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

class ObservedParametricGraph extends ParametricCurveGraph {
    liveBoard() { return this.board; }

    apply(visible: boolean) { this.applyLessonAction({kind: 'curve-visibility', target: 'parametric-trace-full', visible}); }

    traceCurve() { return this['scene']!.ownedElements()[0] as unknown as {points: {usrCoords: number[]}[]; visProp: {visible: boolean | (() => boolean)}; evalVisProp: (name: string) => unknown}; }

    ownedElements() { return [...(this['scene']?.ownedElements() ?? [])]; }

    ownedOnBoard(board = this.board) {
        return this.ownedElements().filter(element => board.objectsList.includes(element)).length;
    }
}

test('on a real board the scene exists after initialize, is recreated once by an import of another curve, and is gone after unmount', () => {
    const graph = new ObservedParametricGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const board = graph.liveBoard();
    const created = graph.ownedElements().length;
    expect(created).toBeGreaterThan(5);
    expect(graph.ownedOnBoard()).toBe(created);
    const first = graph.ownedElements();
    const total = board.objectsList.length;

    graph.importPresetData({curve: 'cardioid', radius: 1, parameter: 1});
    act(() => graph.flushStateChanges());
    expect(first.some(element => board.objectsList.includes(element))).toBe(false);
    const second = graph.ownedElements();
    expect(graph.ownedOnBoard()).toBe(second.length);
    // The cardioid scene has no rolling circle but a radius ray; no duplicates of the old scene remain.
    expect(board.objectsList.length).toBe(total - created + second.length);

    view.unmount();
    expect(second.some(element => board.objectsList.includes(element))).toBe(false);
});

test('on a real board the partial trace ends at the marked point while rolling and the whole arch returns with the flag', () => {
    const graph = new ObservedParametricGraph();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    const board = graph.liveBoard();
    graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 0});
    act(() => graph.flushStateChanges());
    board.update();
    graph.apply(false);
    board.update();
    expect(graph.traceCurve().evalVisProp('visible')).toBe(false);
    for (const t of [1.3, 4]) {
        graph.setParameter(t);
        board.update();
        const trace = graph.traceCurve();
        expect(trace.evalVisProp('visible')).toBe(true);
        const last = trace.points[trace.points.length - 1].usrCoords;
        expect(last[1]).toBeCloseTo(t - Math.sin(t), 6);
        expect(last[2]).toBeCloseTo(1 - Math.cos(t), 6);
    }
    graph.apply(true);
    board.update();
    const whole = graph.traceCurve().points;
    expect(whole[whole.length - 1].usrCoords[1]).toBeCloseTo(2 * Math.PI, 6);
    expect(whole[whole.length - 1].usrCoords[2]).toBeCloseTo(0, 6);

    board.update();
    graph.apply(false);
    graph.importPresetData({curve: 'cycloid', radius: 1, parameter: 1});
    act(() => graph.flushStateChanges());
    board.update();
    const again = graph.traceCurve().points;
    expect(again[again.length - 1].usrCoords[1]).toBeCloseTo(2 * Math.PI, 6);
    view.unmount();
});
