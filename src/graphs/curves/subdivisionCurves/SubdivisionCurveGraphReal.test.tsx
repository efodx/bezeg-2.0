import React from 'react';
import {act, render} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import SubdivisionCurveGraph from './SubdivisionCurveGraph';
import {GraphHost} from '../../base/GraphHost';
import {
    chaikinLimitPolyline, DEFAULT_SUBDIVISION_PRESET, MAX_SUBDIVISION_ROUNDS, SUBDIVISION_ANIMATION_ID, SubdivisionPresetData,
    subdivisionRejection,
} from './subdivisionModel';
import {subdivisionPresetCollection} from './subdivisionPresetCollection';
import {subdivisionRounds} from '../../../analysis/subdivision';
import {uniformQuadraticSegment} from '../../../bezeg/impl/curve/bspline';
import {LocalizedError, setLanguage} from '../../../localization';
import type {AnimationScheduler} from '../../../learning/runtime/animation';
import type {Preset} from '../../base/presets/Presets';

// jsdom has no canvas and no matchMedia; JSXGraph touches both while creating a board.
beforeAll(() => {
    const context = new Proxy({}, {get: (_target, name) => name === 'measureText' ? () => ({width: 0}) : () => undefined});
    HTMLCanvasElement.prototype.getContext = (() => context) as unknown as HTMLCanvasElement['getContext'];
    window.matchMedia = (() => ({matches: false, addEventListener: () => undefined, removeEventListener: () => undefined,
        addListener: () => undefined, removeListener: () => undefined})) as unknown as typeof window.matchMedia;
});

class ManualScheduler implements AnimationScheduler {
    private next = 1;
    private time = 0;
    readonly pending = new Map<number, FrameRequestCallback>();
    request(callback: FrameRequestCallback) { const h = this.next++; this.pending.set(h, callback); return h; }
    cancel(handle: number) { this.pending.delete(handle); }
    /** Runs the one pending frame `dt` ms later; returns whether a frame was pending. */
    tick(dt: number): boolean {
        const [handle, callback] = [...this.pending][0] ?? [];
        if (handle === undefined || !callback) return false;
        this.pending.delete(handle);
        this.time += dt;
        act(() => callback(this.time));
        return true;
    }
}

class ObservedGraph extends SubdivisionCurveGraph {
    liveBoard() { return this.board; }

    sceneOf() { return this['scene']!; }

    lessonDefault() { this.prepareLessonDefaultScene(); }

    lessonFixture(data: SubdivisionPresetData) { this['prepareLessonFixtureScene'](data, undefined); }

    captureStop() { this.pausePlayback(); }

    sceneReplaced() { this.stopLessonAnimations(); }

    figure(preset: Preset) { this.disposeFigureScene(); this.importFigurePresetData(preset); this.initialize(); }

    ownedOnBoard() { return [...(this['scene']?.ownedElements() ?? [])].filter(element => this.board.objectsList.includes(element)).length; }
}

const mount = () => {
    const scheduler = new ManualScheduler();
    const graph = new ObservedGraph(scheduler);
    const view = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
    return {graph, view, scheduler, board: graph.liveBoard()};
};

type Curve = {dataX: number[]; dataY: number[]; updateDataArray: () => void};
const PERIOD = 800;

/** The scene creates, in order: limit overlay, original polygon, stage polyline, vertex pool, draggable points, status text. */
const curves = (graph: ObservedGraph) => {
    const owned = graph.sceneOf().ownedElements() as any[];
    return {limit: owned[0] as Curve, original: owned[1] as Curve, stage: owned[2] as Curve, text: owned[owned.length - 1] as any};
};
const rows = (curve: Curve): number[][] => {
    curve.updateDataArray();
    return curve.dataX.map((x, i) => [x, curve.dataY[i]]);
};

/** The shown vertex points after a board update (their coordinates are recomputed from the stage on update). */
const vertices = (graph: ObservedGraph) => {
    act(() => graph.flushStateChanges());
    graph.liveBoard().update();
    return graph.sceneOf().vertexElements().map(v => [v.X(), v.Y()]);
};

/** Starts playback; the driver's first frame only sets the time base. */
const startPlaying = (graph: ObservedGraph, scheduler: ManualScheduler) => {
    act(() => graph.play());
    expect(graph.isPlaying()).toBe(true);
    expect(scheduler.tick(1)).toBe(true);
};

const data = (overrides: Partial<SubdivisionPresetData> = {}): SubdivisionPresetData => ({...DEFAULT_SUBDIVISION_PRESET, ...overrides});
const closedSquare: SubdivisionPresetData = data({points: [[0, 0], [4, 0], [4, 4], [0, 4]], closed: true});

function distanceToPolyline(p: number[], line: number[][]): number {
    let best = Infinity;
    for (let i = 0; i + 1 < line.length; i++) {
        const [ax, ay] = line[i];
        const [bx, by] = line[i + 1];
        const dx = bx - ax, dy = by - ay;
        const length2 = dx * dx + dy * dy;
        const s = length2 === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / length2));
        best = Math.min(best, Math.hypot(p[0] - ax - s * dx, p[1] - ay - s * dy));
    }
    return best;
}

describe('SubdivisionCurveGraph on a real board', () => {

    test('the default scene is the open polygon, Chaikin, round 0, playback stopped; the id and collection are fixed', () => {
        const {graph, view, scheduler} = mount();
        expect(graph.exportPresetData()).toEqual(DEFAULT_SUBDIVISION_PRESET);
        expect(graph.presetCollection()).toBe(subdivisionPresetCollection);
        expect(subdivisionPresetCollection.key).toBe('interp-subdivision');
        expect(SUBDIVISION_ANIMATION_ID).toBe('interp-subdivision-rounds');
        expect(graph.isPlaying()).toBe(false);
        expect(scheduler.pending.size).toBe(0);
        expect(graph.sceneOf().pointElements().map(p => [p.X(), p.Y()])).toEqual([[0, 0], [1, 2], [3, 3], [4, 0]]);
        view.unmount();
    });

    test.each([
        ['chaikin', false, [[0, 0], [1, 2], [3, 3], [4, 0]]],
        ['four-point', false, [[0, 0], [1, 2], [3, 3], [4, 0]]],
        ['chaikin', true, closedSquare.points],
        ['four-point', true, closedSquare.points],
    ] as const)('%s, closed %s: the drawn stage and vertices equal subdivisionRounds at every round, with the exact counts', (rule, closed, points) => {
        const {graph, view} = mount();
        graph.importPresetData(data({points, closed, rule}));
        const n = points.length;
        let expectedCount = n;
        for (let round = 0; round <= MAX_SUBDIVISION_ROUNDS; round++) {
            if (round > 0) {
                expect(graph.nextStep()).toBe(true);
                expectedCount = closed ? 2 * expectedCount : rule === 'chaikin' ? 2 * expectedCount : 2 * expectedCount - 1;
            }
            expect(graph.state.round).toBe(round);
            const expected = subdivisionRounds(points, closed, rule, round)[round];
            expect(expected.length).toBe(expectedCount);
            if (closed) expect(expected.length).toBe(2 ** round * n);
            const {stage} = curves(graph);
            const drawn = rows(stage);
            const outline = closed ? [...expected, expected[0]] : expected;
            expect(drawn).toEqual(outline);
            expect(vertices(graph)).toEqual(expected);
        }
        expect(graph.nextStep()).toBe(false);
        view.unmount();
    });

    test('four-point keeps every old vertex on the stage after every round, open and closed', () => {
        const {graph, view} = mount();
        for (const base of [data({rule: 'four-point'}), data({...closedSquare, rule: 'four-point'})]) {
            graph.importPresetData(base);
            let previous = vertices(graph);
            for (let round = 1; round <= MAX_SUBDIVISION_ROUNDS; round++) {
                graph.nextStep();
                const now = vertices(graph);
                previous.forEach((vertex, i) => expect(now[2 * i]).toEqual(vertex));
                previous = now;
            }
        }
        view.unmount();
    });

    test.each([['open', DEFAULT_SUBDIVISION_PRESET], ['closed', data({points: [[0, 0], [4, 1], [3, 5], [-1, 3], [-2, 1]], closed: true})]] as const)(
        'Chaikin after 6 rounds: every %s stage vertex lies within 0.01 of the limit overlay', (_name, base) => {
            const {graph, view} = mount();
            graph.importPresetData(data({...base, showLimit: true}));
            for (let k = 0; k < MAX_SUBDIVISION_ROUNDS; k++) graph.nextStep();
            const {limit, stage} = curves(graph);
            const overlay = rows(limit);
            expect(overlay.length).toBeGreaterThan(20);
            const vertices = rows(stage);
            expect(vertices.length).toBeGreaterThan(20);
            vertices.forEach(vertex => expect(distanceToPolyline(vertex, overlay)).toBeLessThan(0.01));
            view.unmount();
        });

    test('the limit overlay is empty outside Chaikin or while hidden, and the typed pieces match the kernel', () => {
        const {graph, view} = mount();
        const {limit} = curves(graph);
        expect(rows(limit)).toEqual([]);
        graph.setShowLimit(true);
        expect(rows(limit).length).toBeGreaterThan(0);
        graph.setRule('four-point');
        expect(rows(limit)).toEqual([]);
        expect(graph.state.showLimit).toBe(true);
        // P0 P1 P2 = (0,0),(1,2),(3,3): the quadratic B-spline passes through (1.125, 1.875) at the middle of that segment.
        const line = chaikinLimitPolyline([[0, 0], [1, 2], [3, 3]], false, 2);
        expect(line.map(p => p.map(v => +v.toFixed(6)))).toEqual([[0, 0], [0.5, 1], [0.5, 1], [1.125, 1.875], [2, 2.5], [2, 2.5], [3, 3]]);
        expect(uniformQuadraticSegment([0, 0], [1, 2], [3, 3], 0.5)).toEqual([1.125, 1.875]);
        expect(chaikinLimitPolyline([[0, 0], [2, 2]], false)).toEqual([[0, 0], [2, 2]]);
        expect(chaikinLimitPolyline([[0, 0]], false)).toEqual([]);
        view.unmount();
    });

    test('playback: stopped by default, one round per interval, stops at the cap, then Play does nothing', () => {
        const {graph, view, scheduler} = mount();
        startPlaying(graph, scheduler);
        for (let k = 1; k <= MAX_SUBDIVISION_ROUNDS; k++) {
            expect(scheduler.tick(PERIOD / 2)).toBe(true);
            expect(graph.state.round).toBe(k - 1);
            scheduler.tick(PERIOD / 2);
            expect(graph.state.round).toBe(k);
        }
        expect(graph.state.round).toBe(MAX_SUBDIVISION_ROUNDS);
        expect(graph.isPlaying()).toBe(false);
        expect(scheduler.pending.size).toBe(0);
        act(() => graph.play());
        expect(graph.isPlaying()).toBe(false);
        expect(graph.nextStep()).toBe(false);
        view.unmount();
    });

    const playing = () => {
        const mounted = mount();
        startPlaying(mounted.graph, mounted.scheduler);
        mounted.scheduler.tick(PERIOD);
        expect(mounted.graph.state.round).toBe(1);
        return mounted;
    };

    test.each([
        ['a point drag', (g: ObservedGraph) => g.movePoint(0, 0.5, 0.5)],
        ['a typed point edit', (g: ObservedGraph) => g.editPoint(1, [1, 2.5])],
        ['adding a point', (g: ObservedGraph) => g.addPoint()],
        ['removing a point', (g: ObservedGraph) => g.removePoint()],
        ['the closed toggle', (g: ObservedGraph) => g.setClosed(true)],
        ['a scene replacement (stopLessonAnimations)', (g: ObservedGraph) => g.sceneReplaced()],
        ['a figure capture (pausePlayback)', (g: ObservedGraph) => g.captureStop()],
        ['Pause', (g: ObservedGraph) => g.pause()],
    ])('playback pauses on %s and keeps the round', (_name, action) => {
        const {graph, view, scheduler} = playing();
        act(() => { action(graph); });
        expect(graph.isPlaying()).toBe(false);
        expect(graph.state.round).toBe(1);
        scheduler.tick(PERIOD * 5);
        expect(graph.state.round).toBe(1);
        view.unmount();
    });

    test('a rule switch pauses and returns to round 0', () => {
        const {graph, view, scheduler} = playing();
        act(() => graph.setRule('four-point'));
        expect(graph.isPlaying()).toBe(false);
        expect(graph.state.round).toBe(0);
        scheduler.tick(PERIOD * 5);
        expect(graph.state.round).toBe(0);
        view.unmount();
    });

    test('a Preset import (file, lesson fixture, default scene, figure import) pauses and never starts playback', () => {
        const run = (action: (g: ObservedGraph) => void, round: number) => {
            const {graph, view, scheduler} = playing();
            act(() => action(graph));
            expect(graph.isPlaying()).toBe(false);
            expect(graph.state.round).toBe(round);
            scheduler.tick(PERIOD * 5);
            expect(graph.state.round).toBe(round);
            view.unmount();
        };
        run(g => g.importPresetData(data({round: 3, rule: 'four-point'})), 3);
        run(g => g.lessonFixture(data({round: 2})), 2);
        run(g => g.lessonDefault(), 0);
        run(g => g.figure({data: data({round: 4}), name: 'p'} as unknown as Preset), 4);
    });

    test('a Preset imported at round 6 is complete and cannot play', () => {
        const {graph, view, scheduler} = mount();
        graph.importPresetData(data({round: 6}));
        act(() => graph.play());
        expect(graph.isPlaying()).toBe(false);
        expect(scheduler.pending.size).toBe(0);
        graph.importPresetData(data({round: 5}));
        startPlaying(graph, scheduler);
        scheduler.tick(PERIOD);
        expect(graph.state.round).toBe(6);
        view.unmount();
    });

    test('unmount silences the controller, and a remount on the same instance plays again', () => {
        const {graph, view, scheduler} = playing();
        view.unmount();
        expect(scheduler.pending.size).toBe(0);
        expect(scheduler.tick(PERIOD)).toBe(false);
        act(() => graph.play());
        expect(graph.isPlaying()).toBe(false);
        const view2 = render(<MemoryRouter><GraphHost create={() => graph}/></MemoryRouter>);
        expect(graph.state.round).toBe(0);
        startPlaying(graph, scheduler);
        scheduler.tick(PERIOD);
        expect(graph.state.round).toBe(1);
        view2.unmount();
    });

    test('Reset returns to round 0 and the polygon the scene started with: default, imported Preset and lesson scene', () => {
        const {graph, view} = mount();
        const reset = (start: SubdivisionPresetData) => {
            graph.nextStep();
            graph.movePoint(0, 9, 9);
            graph.addPoint();
            graph.setClosed(true);
            act(() => graph.play());
            act(() => graph.resetRounds());
            expect(graph.isPlaying()).toBe(false);
            expect(graph.state.round).toBe(0);
            expect(graph.state.points).toEqual(start.points);
            expect(graph.state.closed).toBe(start.closed);
            expect(graph.sceneOf().pointElements().map(p => [p.X(), p.Y()])).toEqual(start.points);
            expect(graph.sceneOf().pointCount).toBe(start.points.length);
        };
        reset(DEFAULT_SUBDIVISION_PRESET);
        graph.importPresetData(closedSquare);
        reset(closedSquare);
        const fixture = data({points: [[0, 0], [2, 3], [5, 1]], round: 2});
        graph.lessonFixture(fixture);
        reset(fixture);
        graph.lessonDefault();
        reset(DEFAULT_SUBDIVISION_PRESET);
        view.unmount();
    });

    test('Reset keeps the rule and overlay choice', () => {
        const {graph, view} = mount();
        graph.setRule('four-point');
        graph.setShowLimit(true);
        graph.nextStep();
        act(() => graph.resetRounds());
        expect(graph.state.rule).toBe('four-point');
        expect(graph.state.showLimit).toBe(true);
        view.unmount();
    });

    test('several Next steps and a point edit in one synchronous tick leave a consistent, derived stage', () => {
        const {graph, view} = mount();
        act(() => {
            graph.nextStep();
            graph.nextStep();
            graph.nextStep();
            graph.movePoint(1, 1, 5);
            graph.nextStep();
        });
        expect(graph.state.round).toBe(4);
        expect(graph.isPlaying()).toBe(false);
        const points = graph.state.points;
        expect(points[1]).toEqual([1, 5]);
        const expected = subdivisionRounds(points, false, 'chaikin', 4)[4];
        expect(graph.sceneOf().vertexElements().map(v => [v.X(), v.Y()])).toEqual(expected);
        expect(rows(curves(graph).stage)).toEqual(expected);
        view.unmount();
    });

    test('Next step while playing takes over: it pauses and reveals one round', () => {
        const {graph, view} = playing();
        act(() => { graph.nextStep(); });
        expect(graph.isPlaying()).toBe(false);
        expect(graph.state.round).toBe(2);
        view.unmount();
    });

    test('closing needs 3 points and removal keeps 3 when closed: refused with a notice', () => {
        const {graph, view} = mount();
        graph.importPresetData(data({points: [[0, 0], [3, 3]]}));
        graph.setClosed(true);
        expect(graph.state.closed).toBe(false);
        expect(graph.state.notice).toBe('closed-needs-three');
        graph.addPoint();
        expect(graph.state.notice).toBe('');
        graph.setClosed(true);
        expect(graph.state.closed).toBe(true);
        graph.removePoint();
        expect(graph.state.points.length).toBe(3);
        expect(graph.state.notice).toBe('closed-needs-three');
        graph.setClosed(false);
        graph.removePoint();
        expect(graph.state.points.length).toBe(2);
        for (let i = 0; i < 10; i++) graph.addPoint();
        expect(graph.state.points.length).toBe(8);
        view.unmount();
    });

    test('typed edits outside the range are refused with a message; drags clamp', () => {
        const {graph, view} = mount();
        expect(graph.editPoint(0, [5000, 0])).toEqual(expect.any(String));
        expect(graph.editPoint(0, [NaN, 0])).toEqual(expect.any(String));
        expect(graph.state.points[0]).toEqual([0, 0]);
        expect(graph.editPoint(0, [2, 2])).toBeUndefined();
        expect(graph.movePoint(0, 5000, -5000)).toBe(true);
        expect(graph.state.points[0]).toEqual([1000, -1000]);
        view.unmount();
    });

    test('a drag event on the board point moves the polygon and pauses playback', () => {
        const {graph, view} = playing();
        const point = graph.sceneOf().pointElements()[3] as any;
        act(() => {
            point.moveTo([5, 1]);
            point.triggerEventHandlers(['drag'], []);
        });
        expect(graph.state.points[3]).toEqual([5, 1]);
        expect(graph.isPlaying()).toBe(false);
        view.unmount();
    });

    test('a Preset round trip through the collection restores the same data, and a lesson fixture carries it', () => {
        const {graph, view} = mount();
        const input = data({points: [[0, 0], [2, 3], [5, 1], [6, 4]], closed: true, rule: 'four-point', round: 3, showLimit: true});
        graph.importPresetData(input);
        const exported = graph.exportPresetData();
        expect(exported).toEqual(input);
        const checked = subdivisionPresetCollection.check(JSON.parse(JSON.stringify(exported)));
        expect('data' in checked && checked.data).toEqual(exported);
        graph.importPresetData(DEFAULT_SUBDIVISION_PRESET);
        graph.importPresetData((checked as {data: SubdivisionPresetData}).data);
        expect(graph.exportPresetData()).toEqual(exported);
        graph.importPresetData(DEFAULT_SUBDIVISION_PRESET);
        graph.lessonFixture(input);
        expect(graph.exportPresetData()).toEqual({...input, round: input.round});
        expect(graph.sceneOf().pointCount).toBe(4);
        expect(graph.state.notice).toBe('');
        expect(subdivisionPresetCollection.checkGraphState!({...graph.state})).toBeUndefined();
        view.unmount();
    });

    test.each([
        ['not a record', 'text'],
        ['points not an array', {...DEFAULT_SUBDIVISION_PRESET, points: 'x'}],
        ['one point', {...DEFAULT_SUBDIVISION_PRESET, points: [[0, 0]]}],
        ['nine points', {...DEFAULT_SUBDIVISION_PRESET, points: Array.from({length: 9}, (_, i) => [i, 0])}],
        ['a row of three numbers', {...DEFAULT_SUBDIVISION_PRESET, points: [[0, 0, 1], [1, 1]]}],
        ['a non-finite coordinate', {...DEFAULT_SUBDIVISION_PRESET, points: [[0, 0], [null, 1]]}],
        ['a coordinate beyond the limit', {...DEFAULT_SUBDIVISION_PRESET, points: [[0, 0], [1001, 1]]}],
        ['closed with two points', {...DEFAULT_SUBDIVISION_PRESET, points: [[0, 0], [1, 1]], closed: true}],
        ['closed not a boolean', {...DEFAULT_SUBDIVISION_PRESET, closed: 1}],
        ['an unknown rule', {...DEFAULT_SUBDIVISION_PRESET, rule: 'dyn-levin'}],
        ['round 7', {...DEFAULT_SUBDIVISION_PRESET, round: 7}],
        ['round -1', {...DEFAULT_SUBDIVISION_PRESET, round: -1}],
        ['a fractional round', {...DEFAULT_SUBDIVISION_PRESET, round: 1.5}],
        ['a missing limit flag', {points: DEFAULT_SUBDIVISION_PRESET.points, closed: false, rule: 'chaikin', round: 0}],
    ])('malformed data is rejected with a message and leaves the scene alone: %s', (_name, bad) => {
        const {graph, view} = mount();
        graph.nextStep();
        const before = graph.exportPresetData();
        const checked = subdivisionPresetCollection.check(bad);
        expect('rejection' in checked).toBe(true);
        if (typeof bad === 'object' && bad !== null) {
            expect(() => graph.importPresetData(bad as SubdivisionPresetData)).toThrow(LocalizedError);
            expect(graph.exportPresetData()).toEqual(before);
            expect(subdivisionRejection(bad as SubdivisionPresetData)).toBeDefined();
        }
        view.unmount();
    });

    test('the board text follows a live language switch', () => {
        const {graph, view} = mount();
        const text = curves(graph).text;
        expect(text.plaintext).toBe('Chaikinovo pravilo, korak 0 od 6, 4 oglišč');
        act(() => setLanguage('en'));
        expect(text.plaintext).toBe('Chaikin rule, step 0 of 6, 4 vertices');
        act(() => { graph.setRule('four-point'); graph.nextStep(); });
        expect(text.plaintext).toBe('Four-point rule, step 1 of 6, 7 vertices');
        act(() => setLanguage('sl'));
        expect(text.plaintext).toBe('Štiritočkovno pravilo, korak 1 od 6, 7 oglišč');
        view.unmount();
    });

    test('scene ownership: repeated imports do not stack elements; disposal removes every owned element', () => {
        const {graph, view, board} = mount();
        const owned = () => graph.sceneOf().ownedElements().length;
        for (let i = 0; i < 3; i++) graph.importPresetData(data({round: 6}));
        act(() => graph.flushStateChanges());
        const first = board.objectsList.length;
        graph.importPresetData(data({round: 6}));
        act(() => graph.flushStateChanges());
        expect(board.objectsList.length).toBe(first);
        expect(graph.ownedOnBoard()).toBe(owned());
        graph.figure({data: data({round: 6}), name: 'p'} as unknown as Preset);
        act(() => graph.flushStateChanges());
        expect(board.objectsList.length).toBe(first);
        const ownedCount = owned();
        graph['disposeFigureScene']();
        // Only the axes remain (point labels go with their points).
        expect(board.objectsList.length).toBeLessThan(first - ownedCount + 1);
        expect(board.objectsList.every(element => !(element as any).name?.startsWith('P'))).toBe(true);
        graph.initialize();
        act(() => graph.flushStateChanges());
        expect(board.objectsList.length).toBe(first);
        view.unmount();
    });
});
