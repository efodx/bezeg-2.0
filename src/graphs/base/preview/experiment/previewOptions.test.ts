import {afterEach, beforeAll, describe, expect, test, vi} from 'vitest';
import {installBoardShims} from '../../realGraphTestHarness';
import type {Preset} from '../../presets/Presets';
import {closeShadow, liveBoardCount, loadSnapshot, openShadow, shadowView, captureShadow} from './shadowBoard';
import {previewSubjects, type PreviewPaths, type PreviewSubject} from './subjects';
import {runAs} from '../../writes/writeSource';
import {pathDeviation} from './paths';
import {curveAccess} from '../../curveGraphTestAccess';
import {bezierPoint} from '../../../curves/bezier/affineTrack';

beforeAll(installBoardShims);

const subject = (id: PreviewSubject['id']): PreviewSubject => previewSubjects.find(candidate => candidate.id === id)!;

/** Option A and option B for one value, drawn over the same x range (the shadow board's). */
function bothOptions(of: PreviewSubject, snapshot: Preset, value: number): {a: PreviewPaths; b: PreviewPaths} {
    const shadow = openShadow(of);
    try {
        loadSnapshot(shadow, of.withValue(snapshot, value));
        return {a: of.geometry(snapshot, value, shadowView(shadow)), b: of.readPaths(shadow.graph)};
    } finally {
        closeShadow(shadow);
    }
}

const deviation = (a: PreviewPaths, b: PreviewPaths): Record<string, number> =>
    Object.fromEntries(Object.keys(b).map(name => [name, pathDeviation(a[name], b[name])]));

/** Live graphs of the running test, closed after it even when it failed, so one failure does not fail every later test. */
const open = new Set<() => void>();

/** A live graph in a scene that is not the default one, and the snapshot a preview would start from. */
function liveSnapshot(of: PreviewSubject, edit?: (snapshot: Preset) => Preset): {snapshot: Preset; close: () => void; graph: ReturnType<PreviewSubject['create']>} {
    const live = openShadow(of);
    const snapshot = live.graph.exportPreset();
    if (edit) { runAs('learner', () => live.graph.importPreset(edit(snapshot))); live.graph.flushStateChanges(); }
    const close = () => { if (open.delete(close)) closeShadow(live); };
    open.add(close);
    return {snapshot: live.graph.exportPreset(), close, graph: live.graph};
}

afterEach(() => {
    [...open].forEach(close => close());
    expect(liveBoardCount()).toBe(0);
});

/** Distance between the two drawings. Option B is JSXGraph's adaptive polyline (chords of a steep curve are off by up to ~0.02), option A is dense. */
const TOLERANCE = 0.05;

describe('preview option A (geometry from the snapshot) equals option B (shadow board)', () => {
    test('Taylor: f and T_n for exp and sine, several degrees', () => {
        const of = subject('taylor');
        for (const model of [{example: 'exp', center: 0, degree: 1, x: 1, boundVisible: false}, {example: 'sine', center: 1.5, degree: 1, x: 2, boundVisible: false}]) {
            const live = liveSnapshot(of, snapshot => ({...snapshot, data: model}));
            for (const degree of [0, 3, 7, 10]) {
                const {a, b} = bothOptions(of, live.snapshot, degree);
                expect(b.function[0].length).toBeGreaterThan(20);
                expect(Math.max(...Object.values(deviation(a, b)))).toBeLessThan(TOLERANCE);
            }
            live.close();
        }
    });

    test('De Casteljau: the curve from 0 to t, with control points that only the board holds', () => {
        const of = subject('decasteljau');
        const live = liveSnapshot(of);
        // Move a control point on the board: the scene store does not hold it (see the next test).
        const moved: [number, number] = [-2.5, 4.5];
        const handle = curveAccess(live.graph).first().getJxgPoints()[1];
        handle.moveTo(moved);
        (handle as unknown as {triggerEventHandlers(names: string[], args: unknown[]): void}).triggerEventHandlers(['drag'], []);
        const snapshot = live.graph.exportPreset();
        expect(JSON.stringify(snapshot.data)).toContain(String(moved[0]));
        for (const t of [0.2, 0.5, 1]) {
            const {a, b} = bothOptions(of, snapshot, t);
            expect(b.curve[0].length).toBeGreaterThan(20);
            expect(Math.max(...Object.values(deviation(a, b)))).toBeLessThan(TOLERANCE);
            const end = b.curve[0][b.curve[0].length - 1];
            const expected = bezierPoint((snapshot.data as Array<[string, {points: Array<[number, number]>}]>)[0][1].points, t);
            expect(Math.hypot(end[0] - expected[0], end[1] - expected[1])).toBeLessThan(TOLERANCE);
        }
        live.close();
    });

    test('phase portrait: the forward orbits for several values of A', () => {
        const of = subject('phase-portrait');
        const live = liveSnapshot(of);
        for (const A of [-16, -10, -4, -1]) {
            const {a, b} = bothOptions(of, live.snapshot, A);
            expect(b.forward.length).toBeGreaterThan(0);
            expect(Math.max(...Object.values(deviation(a, b)))).toBeLessThan(TOLERANCE);
        }
        live.close();
    });

    test('a perturbed state is caught: A at another value than B differs', () => {
        for (const [id, value, other] of [['taylor', 3, 4], ['decasteljau', 0.4, 0.6], ['phase-portrait', -16, -4]] as const) {
            const of = subject(id);
            const live = liveSnapshot(of);
            const shadow = openShadow(of);
            loadSnapshot(shadow, of.withValue(live.snapshot, value));
            const b = of.readPaths(shadow.graph);
            const perturbed = of.geometry(live.snapshot, other, shadowView(shadow));
            closeShadow(shadow);
            live.close();
            expect(Math.max(...Object.values(deviation(perturbed, b)))).toBeGreaterThan(2 * TOLERANCE);
        }
    });
});

describe('preview option B leaves nothing behind and does not touch the live graph', () => {
    test.each(previewSubjects.map(item => item.id))('%s: no board, listener or object remains, and the live preset is unchanged', id => {
        const of = subject(id);
        const live = liveSnapshot(of);
        const before = JSON.stringify(live.graph.exportPreset());
        const boards = liveBoardCount();
        const added = vi.spyOn(window, 'addEventListener');
        const removed = vi.spyOn(window, 'removeEventListener');
        const docAdded = vi.spyOn(document, 'addEventListener');
        const docRemoved = vi.spyOn(document, 'removeEventListener');
        for (const value of of.values.slice(0, 3)) captureShadow(of, live.snapshot, value);
        expect(liveBoardCount()).toBe(boards);
        // Every listener a shadow added to the window or the document was removed again.
        const net = (add: typeof added, remove: typeof removed) => {
            const key = (call: unknown[]) => `${String(call[0])}:${String(call[1])}`;
            const open = new Map<string, number>();
            for (const call of add.mock.calls) open.set(key(call), (open.get(key(call)) ?? 0) + 1);
            for (const call of remove.mock.calls) open.set(key(call), (open.get(key(call)) ?? 0) - 1);
            return [...open.entries()].filter(([, count]) => count !== 0).map(([name, count]) => `${name}=${count}`);
        };
        expect(net(added, removed)).toEqual([]);
        expect(net(docAdded, docRemoved)).toEqual([]);
        // Only the live graph's own container is left (it was opened with `openShadow` too).
        expect(document.querySelectorAll('[data-preview-shadow]')).toHaveLength(1);
        expect(JSON.stringify(live.graph.exportPreset())).toBe(before);
        vi.restoreAllMocks();
        live.close();
    });
});
