import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import type {GeometryElement} from 'jsxgraph';
import ArcLengthParametrizationGraph, {ARC_Q_POINTS, ARC_TRAVERSAL_MS} from './ArcLengthParametrizationGraph';
import {ARC_PIECES_DEFAULT} from './arcLengthModel';
import {arcLengthTableOfBezier, equalArcParameters, parameterAtArcLength} from '../../../bezeg/impl/kernels/arc-length';
import {setLanguage} from '../../../localization';
import {GraphHost} from '../../base/GraphHost';
import {LessonAction} from '../../../learning/model';
import type {CurveCollectionPresetData} from '../curvePresetCollections';
import type {AnimationScheduler} from '../../../learning/runtime/animation';

const REDUCED = '(prefers-reduced-motion: reduce)';
let reducedMotion = false;

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = ((query: string) => ({matches: reducedMotion && query === REDUCED, addEventListener: () => undefined,
        removeEventListener: () => undefined, addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

beforeEach(() => { localStorage.clear(); reducedMotion = false; });
afterEach(() => setLanguage('sl'));

/** A manual frame clock: `tick(ms)` runs the one pending frame at time `ms`. */
class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    requests = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; this.requests++; return ++this.handle; }
    cancel() { this.callback = undefined; }
    pending() { return this.callback !== undefined; }
    tick(time: number) { const run = this.callback; this.callback = undefined; if (run) act(() => run(time)); }
}

type BoardObject = GeometryElement & { X?: () => number; Y?: () => number; visPropCalc: { visible: boolean }; plaintext?: string };

class Probe extends ArcLengthParametrizationGraph {
    clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
    liveBoard() { return this.board; }
    /** Replaces the scene the way a lesson or a Preset does (import, then the graph's own sync). */
    replace(data: CurveCollectionPresetData) {
        this.runLessonReplacement({importData: () => this.importPresetData(data), afterImport: () => undefined,
            state: () => ({...this.getInitialState(), ...this.lessonDefaultState()}), transientState: undefined});
    }
    act(action: LessonAction) { this.applyLessonAction(action); }
    owned() { return this.arcOverlay()!.ownedElements() as unknown as BoardObject[]; }
    /** The pools of the overlay in creation order: equal-t marks, equal-arc marks, the mover. */
    equalT() { return this.owned().filter(e => e.elType === 'point').slice(0, 65); }
    equalArc() { return this.owned().filter(e => e.elType === 'point').slice(65, 130); }
    moverPoint() { return this.owned().filter(e => e.elType === 'point')[130]; }
    visible(points: BoardObject[]) { return points.filter(p => p.visPropCalc.visible); }
    captions() { return this.owned().filter(e => e.elType === 'text').map(e => e.plaintext ?? '').filter(Boolean); }
    published(): string { return this['liveReadout'].getSnapshot(); }
    movePoint(index: number, to: number[]) {
        const point = this.getFirstJxgCurve().getJxgPoints()[index];
        point.moveTo(to, 0);
        (point as unknown as { triggerEventHandlers(names: string[], args: unknown[]): void }).triggerEventHandlers(['drag'], []);
        this.liveBoard().update();
    }
}

function mount() {
    const graph = new Probe();
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view};
}

async function settle(start: () => Promise<void>): Promise<void> {
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = start(); });
    await act(async () => { await pending; });
}

/** Independent de Casteljau evaluation, so the marks are checked against something other than the kernel's own source. */
function bezierPoint(rows: number[][], t: number): number[] {
    let level = rows.map(row => [...row]);
    while (level.length > 1) level = level.slice(1).map((row, i) => [(1 - t) * level[i][0] + t * row[0], (1 - t) * level[i][1] + t * row[1]]);
    return level[0];
}

const marksAt = (marks: BoardObject[], rows: number[][], parameters: number[]) => {
    expect(marks).toHaveLength(parameters.length);
    marks.forEach((mark, i) => {
        const [x, y] = bezierPoint(rows, parameters[i]);
        expect(mark.X!()).toBeCloseTo(x, 9);
        expect(mark.Y!()).toBeCloseTo(y, 9);
    });
};

describe('the real board on the cubic Q', () => {
    test('equal-arc and equal-t marks sit at the kernel parameters, in two shapes, and the readouts match the spec', () => {
        const {graph, view} = mount();
        try {
            expect(graph.curveKind()).toBe('bezier');
            expect(graph.controlRows()).toEqual(ARC_Q_POINTS);
            expect(graph.state).toMatchObject({arcPieces: ARC_PIECES_DEFAULT, arcEqualTShown: true, arcEqualArcShown: true,
                arcSpeedPlotShown: true, arcMoverMode: 'parameter', arcMoverPosition: 0});
            const model = graph.arcOverlay()!.model()!;
            expect(model.equalArc.parameters.map(p => Math.round(p * 1e4) / 1e4)).toEqual([0, 0.0906, 0.1983, 0.3324, 0.5, 0.6676, 0.8017, 0.9094, 1]);
            marksAt(graph.visible(graph.equalArc()), ARC_Q_POINTS, model.equalArc.parameters);
            marksAt(graph.visible(graph.equalT()), ARC_Q_POINTS, [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => i / 8));
            // Two shapes, not one shape in two colours.
            expect(graph.equalT()[0].visProp.face).toBe('o');
            expect(graph.equalArc()[0].visProp.face).toBe('[]');
            const text = graph.arcOverlay()!.readoutText();
            expect(text).toContain('6,390976');
            expect(text).toContain('Gauss-Legendre z 24 točkami, 32 delov');
            expect(text).toContain('Tetiva 4 ≤ L ≤ kontrolni poligon 8,324555');
            expect(text).toContain('(N = 8): 1,857');
            expect(text).not.toContain('Točna dolžina');
            expect(model.length).toBeCloseTo(6.390976, 6);
            expect(model.equalT.ratio!).toBeCloseTo(1.857, 3);
            expect(model.status.kind).toBe('regular');
        } finally { view.unmount(); }
    });

    test('N, a drag, and the switches update the marks; the table is built once per change', () => {
        const {graph, view} = mount();
        try {
            const overlay = graph.arcOverlay()!;
            const before = overlay.modelBuilds();
            act(() => graph.setArcPieces(4));
            expect(overlay.modelBuilds()).toBe(before + 1);
            expect(graph.visible(graph.equalArc())).toHaveLength(5);
            expect(graph.visible(graph.equalT())).toHaveLength(5);
            marksAt(graph.visible(graph.equalArc()), ARC_Q_POINTS, equalArcParameters(arcLengthTableOfBezier(ARC_Q_POINTS), 4).parameters);
            act(() => { graph.setArcEqualTShown(false); });
            expect(graph.visible(graph.equalT())).toHaveLength(0);
            expect(graph.visible(graph.equalArc())).toHaveLength(5);

            const moved = ARC_Q_POINTS.map(row => [...row]);
            moved[1] = [0.5, 4];
            act(() => graph.movePoint(1, moved[1]));
            expect(graph.controlRows()).toEqual(moved);
            marksAt(graph.visible(graph.equalArc()), moved, equalArcParameters(arcLengthTableOfBezier(moved), 4).parameters);
            expect(overlay.model()!.length).toBeCloseTo(arcLengthTableOfBezier(moved).length, 12);
        } finally { view.unmount(); }
    });

    test('Reset and a restored Preset recompute the marks, and the multi-action scene reads each action', async () => {
        const {graph, view} = mount();
        try {
            act(() => { graph.setArcPieces(16); graph.setArcMoverMode('arc'); graph.setArcMoverPosition(0.4); });
            act(() => graph.saveCurrentPreset('mine'));
            act(() => { graph.setArcPieces(3); graph.setArcMoverMode('parameter'); graph.setArcMoverPosition(0.9); graph.movePoint(2, [3, 1]); });
            await settle(() => graph.selectPreset('mine'));
            expect(graph.state).toMatchObject({arcPieces: 16, arcMoverMode: 'arc', arcMoverPosition: 0.4});
            expect(graph.controlRows()).toEqual(ARC_Q_POINTS);
            expect(graph.visible(graph.equalArc())).toHaveLength(17);
            act(() => { graph.setArcPieces(5); graph.movePoint(1, [2, 0]); });
            await settle(() => graph.reset());
            expect(graph.controlRows()).toEqual(ARC_Q_POINTS);
            marksAt(graph.visible(graph.equalArc()), ARC_Q_POINTS,
                equalArcParameters(arcLengthTableOfBezier(ARC_Q_POINTS), graph.state.arcPieces).parameters);
        } finally { view.unmount(); }
    });

    test('a lesson scene of several actions in one synchronous sequence reads the state each wrote', () => {
        const {graph, view} = mount();
        try {
            const seen: unknown[] = [];
            act(() => {
                graph.act({kind: 'arc-curve', curve: 'ph'});
                seen.push(graph.curveKind());
                graph.act({kind: 'arc-pieces', value: 16});
                seen.push(graph.state.arcPieces);
                graph.act({kind: 'arc-mover-mode', mode: 'arc'});
                graph.act({kind: 'arc-mover-position', value: 0.5});
                seen.push(graph.state.arcMoverMode, graph.state.arcMoverPosition);
                graph.act({kind: 'curve-visibility', target: 'arc-equal-t', visible: false});
                graph.act({kind: 'curve-visibility', target: 'arc-speed-plot', visible: false});
            });
            expect(seen).toEqual(['ph', 16, 'arc', 0.5]);
            expect(graph.state).toMatchObject({arcEqualTShown: false, arcSpeedPlotShown: false, arcEqualArcShown: true});
            expect(graph.visible(graph.equalT())).toHaveLength(0);
            expect(graph.visible(graph.equalArc())).toHaveLength(17);
            const model = graph.arcOverlay()!.model()!;
            expect(graph.arcOverlay()!.mover()!.t).toBeCloseTo(parameterAtArcLength(model.table, model.length / 2), 12);
        } finally { view.unmount(); }
    });
});

describe('the PH cubic and special curves', () => {
    test('PH: L and the exact s(1) agree, ratios match the spec; Q shows no exact label', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setCurveKind('ph'));
            expect(graph.curveKind()).toBe('ph');
            const model = graph.arcOverlay()!.model()!;
            expect(model.length).toBeCloseTo(31 / 3, 9);
            expect(model.equalT.ratio!).toBeCloseTo(1.62, 2);
            expect(model.equalArc.ratio!).toBeCloseTo(1.004, 3);
            const text = graph.arcOverlay()!.readoutText();
            expect(text).toContain('L = 10,333333');
            expect(text).toContain('Točna dolžina s(1) = 10,333333 (PH krivulja)');
            act(() => graph.setCurveKind('bezier'));
            expect(graph.arcOverlay()!.readoutText()).not.toContain('Točna dolžina');
        } finally { view.unmount(); }
    });

    test('a cusp is reported and nothing is divided by zero; a zero-length curve gets a status and does not throw', () => {
        const {graph, view} = mount();
        try {
            const state = {showingJxgPoints: true, showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false,
                subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2};
            act(() => graph.replace([['JSXBezierCurve', {points: [[0, 0], [1, 2], [0, 1], [1, 1]], state}]]));
            const cusp = graph.arcOverlay()!.model()!;
            expect(cusp.status.kind).toBe('cusp');
            expect(cusp.status.kind === 'cusp' && cusp.status.parameters[0]).toBeCloseTo(0.5, 6);
            expect(graph.arcOverlay()!.readoutText()).toContain('Osti (hitrost 0) pri t = 0,5');
            expect(Number.isFinite(cusp.length)).toBe(true);

            act(() => graph.replace([['JSXBezierCurve', {points: [[1, 1], [1, 1], [1, 1], [1, 1]], state}]]));
            const flat = graph.arcOverlay()!.model()!;
            expect(flat.degenerate).toBe(true);
            expect(flat.equalT.ratio).toBeUndefined();
            expect(flat.equalArc.parameters.every(Number.isFinite)).toBe(true);
            expect(graph.arcOverlay()!.readoutText()).toContain('dolžino 0');
            act(() => { graph.setArcMoverMode('arc'); graph.setArcMoverPosition(0.7); });
            expect(Number.isFinite(graph.arcOverlay()!.mover()!.t)).toBe(true);
        } finally { view.unmount(); }
    });
});

describe('playback', () => {
    test('Play advances by elapsed time without writing state per frame; Pause commits and stops', () => {
        const {graph, view} = mount();
        try {
            const stateBefore = graph.state;
            act(() => graph.play());
            expect(graph.isPlaying()).toBe(true);
            graph.clock.tick(1000);
            graph.clock.tick(1000 + ARC_TRAVERSAL_MS / 4);
            expect(graph.arcOverlay()!.mover()!.t).toBeCloseTo(0.25, 9);
            expect(graph.state).toBe(stateBefore);
            graph.clock.tick(1000 + ARC_TRAVERSAL_MS / 2);
            expect(graph.arcOverlay()!.mover()!.t).toBeCloseTo(0.5, 9);
            expect(graph.moverPoint().X!()).toBeCloseTo(bezierPoint(ARC_Q_POINTS, 0.5)[0], 9);
            act(() => graph.pause());
            expect(graph.isPlaying()).toBe(false);
            expect(graph.state.arcMoverPosition).toBeCloseTo(0.5, 9);
            expect(graph.clock.pending()).toBe(false);
        } finally { view.unmount(); }
    });

    test('in arc mode the playing point sits at parameterAtArcLength(position * L) and the loop wraps at 1', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.setArcMoverMode('arc'));
            act(() => graph.play());
            graph.clock.tick(0);
            graph.clock.tick(ARC_TRAVERSAL_MS * 0.3);
            const table = graph.arcOverlay()!.model()!.table;
            expect(graph.arcOverlay()!.mover()!.t).toBeCloseTo(parameterAtArcLength(table, 0.3 * table.length), 9);
            graph.clock.tick(ARC_TRAVERSAL_MS * 1.1);
            expect(graph.isPlaying()).toBe(true);
            expect(graph.arcOverlay()!.mover()!.t).toBeCloseTo(parameterAtArcLength(table, 0.1 * table.length), 6);
            act(() => graph.pause());
        } finally { view.unmount(); }
    });

    test('a press on the board, Reset, a slider move and unmount each stop the loop', async () => {
        const {graph, view} = mount();
        act(() => graph.play());
        graph.clock.tick(0);
        graph.clock.tick(600);
        act(() => { (graph.liveBoard() as unknown as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['down'], [{}]); });
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
        expect(graph.state.arcMoverPosition).toBeCloseTo(0.1, 9);

        act(() => graph.play());
        await settle(() => graph.reset());
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);

        act(() => graph.play());
        expect(graph.isPlaying()).toBe(true);
        act(() => graph.setArcMoverPosition(0.8));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);

        act(() => graph.play());
        expect(graph.clock.pending()).toBe(true);
        view.unmount();
        expect(graph.isPlaying()).toBe(false);
        expect(graph.clock.pending()).toBe(false);
    });

    test('a scene import (curve kind) stops the loop', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.play());
            act(() => graph.setCurveKind('ph'));
            expect(graph.isPlaying()).toBe(false);
            expect(graph.clock.pending()).toBe(false);
        } finally { view.unmount(); }
    });

    test('under reduced motion Play does not animate, and the position can still be set', () => {
        reducedMotion = true;
        const {graph, view} = mount();
        try {
            act(() => graph.play());
            expect(graph.isPlaying()).toBe(false);
            expect(graph.clock.requests).toBe(0);
            expect(document.querySelector('.arc-playback [data-action="play-pause"]')).toHaveAccessibleDescription(/predvajanje ni na voljo/);
            act(() => graph.setArcMoverPosition(0.3));
            expect(graph.arcOverlay()!.mover()!.t).toBeCloseTo(0.3, 12);
        } finally { view.unmount(); }
    });
});

describe('ownership', () => {
    test('dispose removes every owned object, once or twice', () => {
        const {graph, view} = mount();
        const board = graph.liveBoard();
        try {
            const owned = graph.arcOverlay()!.ownedElements();
            expect(owned.length).toBeGreaterThan(130);
            expect(owned.every(element => board.objectsList.includes(element))).toBe(true);
            graph.arcOverlay()!.dispose();
            expect(owned.some(element => board.objectsList.includes(element))).toBe(false);
            graph.arcOverlay()!.dispose();
        } finally { view.unmount(); }
    });
});

describe('the board caption and the details list', () => {
    const cuspScene: CurveCollectionPresetData = [['JSXBezierCurve', {points: [[0, 0], [1, 2], [0, 1], [1, 1]], state: {showingJxgPoints: true,
        showingControlPolygon: false, showingConvexHull: false, showingDecasteljauScheme: false, subdivisionT: 0.5, decasteljauT: 0.5, extrapolationT: 1.2}}]];
    const details = () => Array.from(document.querySelectorAll('[data-testid="arc-details"] li')).map(li => li.textContent ?? '');
    const rangeSlider = () => Array.from(document.querySelectorAll('input[type="range"]')).find(el => (el as HTMLInputElement).max === '1') as HTMLInputElement;

    test('the board shows at most four short lines on Q, PH and a cusp curve, in both languages', () => {
        const {graph, view} = mount();
        try {
            for (const lang of ['sl', 'en'] as const) {
                act(() => setLanguage(lang));
                for (const scene of ['bezier', 'ph', 'cusp']) {
                    if (scene === 'cusp') act(() => graph.replace(cuspScene)); else act(() => graph.setCurveKind(scene as 'bezier' | 'ph'));
                    graph.liveBoard().update();
                    const lines = graph.captions();
                    expect(lines.length).toBeGreaterThanOrEqual(2);
                    expect(lines.length).toBeLessThanOrEqual(4);
                    lines.forEach(line => expect(line.length).toBeLessThan(40));
                    if (scene === 'ph') expect(lines.some(line => line.startsWith('s(1) = 10,333333') || line.startsWith('s(1) = 10.333333'))).toBe(true);
                    if (scene === 'cusp') expect(lines.some(line => /^(Osti|Cusps)/.test(line))).toBe(true);
                    expect(lines.some(line => /cusp|osti/i.test(line))).toBe(scene === 'cusp');
                }
            }
        } finally { view.unmount(); }
    });

    test('the details list holds the long readouts after a drag and after a language change, and the exact length on PH', () => {
        const {graph, view} = mount();
        try {
            expect(details().join(' ')).toContain('6,390976');
            expect(details().join(' ')).toContain('Gauss-Legendre');
            expect(details().join(' ')).not.toContain('Točna dolžina');
            graph.movePoint(1, [1, 4]);
            const dragged = graph.arcOverlay()!.model()!.length;
            expect(dragged).toBeGreaterThan(6.4);
            expect(details().join(' ')).toContain(dragged.toFixed(6).replace('.', ','));
            expect(details().some(line => line.startsWith('t ='))).toBe(false);
            act(() => setLanguage('en'));
            expect(details().join(' ')).toContain('control polygon');
            act(() => setLanguage('sl'));
            act(() => graph.setCurveKind('ph'));
            expect(details().some(line => line.startsWith('Točna dolžina s(1) = 10,333333'))).toBe(true);
        } finally { view.unmount(); }
    });

    test('the slider is unavailable (with its reason) while playing, the Play button turns into Pause, and both reset after Pause', () => {
        const {graph, view} = mount();
        try {
            const button = () => document.querySelector('.arc-playback [data-action="play-pause"]') as HTMLButtonElement;
            expect(rangeSlider().getAttribute('aria-disabled')).toBeNull();
            expect(button().textContent).toBe('Predvajaj');
            expect(button().getAttribute('aria-disabled')).toBe('false');
            act(() => graph.play());
            expect(rangeSlider().getAttribute('aria-disabled')).toBe('true');
            expect(rangeSlider()).toHaveAccessibleDescription(/Točko premika predvajanje/);
            expect(button().textContent).toBe('Premor');
            act(() => graph.pause());
            expect(rangeSlider().getAttribute('aria-disabled')).toBeNull();
            expect(button().textContent).toBe('Predvajaj');
        } finally { view.unmount(); }
    });

    test('the disabled slider follows the moving point at a low rate, not on every frame', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.play());
            graph.clock.tick(0);
            graph.clock.tick(100);
            expect(Number(rangeSlider().value)).toBe(0);
            graph.clock.tick(ARC_TRAVERSAL_MS / 2);
            expect(Number(rangeSlider().value)).toBeCloseTo(0.5, 2);
            act(() => graph.pause());
        } finally { view.unmount(); }
    });

    test('a mode change during playback keeps the live position', () => {
        const {graph, view} = mount();
        try {
            act(() => graph.play());
            graph.clock.tick(0);
            graph.clock.tick(ARC_TRAVERSAL_MS * 0.4);
            act(() => graph.setArcMoverMode('arc'));
            expect(graph.isPlaying()).toBe(false);
            expect(graph.state.arcMoverPosition).toBeCloseTo(0.4, 9);
            expect(graph.state.arcMoverMode).toBe('arc');
        } finally { view.unmount(); }
    });
});
