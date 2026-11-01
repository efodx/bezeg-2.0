import {act} from '@testing-library/react';
import {compgeoGuidedLessons, EAR_COMB, EAR_TRACE_STEPS} from './compgeoGuidedLessons';
import {getLessonForDemonstration, sceneActions} from '../runtime/lessonCatalog';
import type {LessonAction} from '../model';
import type {AnimationScheduler} from '../runtime/animation';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {EarClippingGraph} from '../../graphs/compgeo/EarClippingGraph';
import {EAR_CLIPPING_EXAMPLE_1, EAR_CLIPPING_EXAMPLE_2} from '../../graphs/compgeo/earClippingPresetCollection';
import {orientValue} from '../../compgeo/predicates';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('ear-clipping')!;
const stepOf = (stepId: string) => lesson().steps.find(step => step.id === stepId)!;
const sceneOf = (stepId: string): LessonAction[] => stepOf(stepId).scene!.actions as LessonAction[];
const part = (name: string) => document.querySelector(`[data-ear-clipping="${name}"]`)?.textContent;
const result = (name: string) => document.querySelector(`[data-ear-clipping="result"] [data-result="${name}"]`)?.textContent;
const STEPS = ['earclip-polygon', 'earclip-predict', 'earclip-first-ear', 'earclip-triangulation', 'earclip-colouring', 'earclip-guards', 'earclip-comb'];
const NEXT: LessonAction = {kind: 'animation', animationId: 'algorithm-trace', command: 'next-step'};
const PLAY: LessonAction = {kind: 'animation', animationId: 'algorithm-trace', command: 'play'};
const OVERLAYS = ['trace', 'reflex', 'triangulation', 'colouring', 'guards'] as const;

/** A mounted ear clipping graph on a manual scheduler; `pending()` counts the scheduler callbacks that would still fire. */
function mountEar() {
    let nextHandle = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => { const handle = nextHandle++; callbacks.set(handle, callback); return handle; },
        cancel: handle => { callbacks.delete(handle); },
    };
    const graph = new EarClippingGraph({}, scheduler);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, pending: () => callbacks.size,
        /** Applies the scene of a step the way a lesson session does: restore the checkpoint, then every action, in one synchronous act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneOf(stepId)) capabilities.apply(action);
        }),
        press: (count = 1) => act(() => { for (let i = 0; i < count; i++) capabilities.apply(NEXT); }),
    };
}
type Mounted = ReturnType<typeof mountEar>;
const coords = (h: Mounted, indices: readonly number[]) => indices.map(i => [h.graph.model.points[i].x, h.graph.model.points[i].y]);
const sorted = (list: readonly (readonly number[])[]) => [...list].map(p => [...p]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const classes = (h: Mounted) => [0, 1, 2].map(colour => sorted(coords(h, h.graph.run().colours.flatMap((c, i) => (c === colour ? [i] : [])))));

test('the seven scenes show the polygon, step, overlays and result the text relies on, and never play', () => {
    const h = mountEar();
    try {
        const seen = STEPS.map(stepId => {
            h.scene(stepId);
            const run = h.graph.run();
            return [h.graph.model.points.length, h.graph.step, run.length, ...OVERLAYS.map(name => h.graph.overlayShown(name)), h.graph.isPlaying, h.pending()] as const;
        });
        expect(seen).toEqual([
            [5, 0, 12, true, true, false, false, false, false, 0],
            [5, 0, 12, false, true, false, false, false, false, 0],
            [5, 3, 12, true, true, false, false, false, false, 0],
            [5, 11, 12, true, true, true, false, false, false, 0],
            [5, 11, 12, true, true, true, true, false, false, 0],
            [5, 11, 12, true, true, true, true, true, false, 0],
            [11, 34, 35, true, true, true, true, true, false, 0],
        ]);
        expect(EAR_TRACE_STEPS).toEqual({firstEarTest: 3, firstEarClipped: 5, notchedEnd: 11});
        expect(EAR_COMB).toEqual(EAR_CLIPPING_EXAMPLE_2.points.map(p => [p.x, p.y]));
        expect(sceneOf('earclip-polygon').find(a => a.kind === 'point-set' && a.operation === 'set-points')).toMatchObject({operation: 'set-points', points: EAR_CLIPPING_EXAMPLE_1.points.map(p => [p.x, p.y])});
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 1: exactly one reflex vertex, (3, 2), and the quoted step counter', () => {
    const h = mountEar();
    try {
        h.scene('earclip-polygon');
        expect(h.graph.run().reflex).toEqual([3]);
        expect(coords(h, h.graph.run().reflex)).toEqual([[3, 2]]);
        expect(part('step')).toBe('Korak 1 od 12');
        expect(part('triangles')).toBe('Odrezani trikotniki doslej: 0');
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 3: the first two tests are blocked by (3, 2), the first ear is (6, 0)(6, 4)(3, 2) at step 4 of 12, and two more presses clip it', () => {
    const h = mountEar();
    try {
        h.scene('earclip-first-ear');
        const run = h.graph.run();
        expect([1, 2].map(i => [run.event(i)?.note, run.event(i)?.rejected])).toEqual([['test-blocked', 3], ['test-blocked', 3]]);
        expect(coords(h, [3])).toEqual([[3, 2]]);
        expect(coords(h, run.event(1)!.points)).toEqual([[0, 4], [0, 0], [6, 0]]);
        expect(coords(h, run.event(2)!.points)).toEqual([[0, 0], [6, 0], [6, 4]]);
        expect(h.graph.step).toBe(3);
        expect(run.event(3)?.note).toBe('test-ear');
        expect(coords(h, run.event(3)!.points)).toEqual([[6, 0], [6, 4], [3, 2]]);
        expect(part('step')).toBe('Korak 4 od 12');
        expect(part('detail')).toBe('Preizkušeno oglišče P3, trikotnik P2 P3 P4');
        expect(part('note')).toBe('Oglišče je izbočeno in v trikotniku ni drugih oglišč: to je uho.');
        expect(part('triangles')).toBe('Odrezani trikotniki doslej: 0');
        h.press(2);
        expect([h.graph.step, part('triangles')]).toEqual([EAR_TRACE_STEPS.firstEarClipped, 'Odrezani trikotniki doslej: 1']);
        expect(run.event(5)?.kind).toBe('output');
        expect(coords(h, run.event(5)!.points)).toEqual([[6, 0], [6, 4], [3, 2]]);
        setLanguage('en');
        h.scene('earclip-first-ear');
        expect(part('step')).toBe('Step 4 of 12');
        expect(part('detail')).toBe('Tested vertex P3, triangle P2 P3 P4');
        expect(part('note')).toBe('The vertex is convex and no other vertex is in the triangle: it is an ear.');
    } finally {
        h.mounted.view.unmount();
    }
});

test('Example 1 clips (6,0)(6,4)(3,2), then (0,0)(6,0)(3,2), and leaves (0,0)(3,2)(0,4)', () => {
    const h = mountEar();
    try {
        h.scene('earclip-triangulation');
        expect(h.graph.run().triangles.map(tri => coords(h, tri))).toEqual([
            [[6, 0], [6, 4], [3, 2]], [[0, 0], [6, 0], [3, 2]], [[0, 0], [3, 2], [0, 4]],
        ]);
    } finally {
        h.mounted.view.unmount();
    }
});

test('steps 4 to 6: 3 triangles, 2 diagonals, classes 2, 1, 2 with the quoted members, and one guard at (3, 2) = floor(5/3)', () => {
    const h = mountEar();
    try {
        h.scene('earclip-triangulation');
        const summary = h.graph.run().summary!;
        expect([summary.triangles, summary.diagonals]).toEqual([3, 2]);
        expect(summary.triangles).toBe(h.graph.model.points.length - 2);
        expect(summary.diagonals).toBe(h.graph.model.points.length - 3);
        expect(result('triangles')).toBe('Trikotnikov: 3 (n − 2, kjer je n = 5 število oglišč)');
        expect(result('diagonals')).toBe('Diagonal: 2 (n − 3)');
        h.scene('earclip-colouring');
        expect(h.graph.run().summary!.classSizes).toEqual([2, 1, 2]);
        expect(result('classes')).toBe('Barvni razredi (A, B, C): 2, 1, 2');
        expect(classes(h)).toEqual([[[0, 0], [6, 4]], [[3, 2]], [[0, 4], [6, 0]]]);
        h.scene('earclip-guards');
        const guarded = h.graph.run().summary!;
        expect(guarded.guardCount).toBe(Math.floor(h.graph.model.points.length / 3));
        expect(guarded.guardCount).toBe(1);
        expect(coords(h, guarded.guardVertices)).toEqual([[3, 2]]);
        expect(result('guards')).toBe('Stražarjev: 1 (⌊n/3⌋); najmanjši barvni razred jih postavi v oglišča P4.');
        // The guard's view is every triangle (a vertex sees every triangle it belongs to).
        expect(h.graph.run().triangles.every(tri => tri.includes(3))).toBe(true);
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 7, the comb: n = 11, 9 triangles, 8 diagonals, classes 4, 4, 3 and three guards = floor(11/3)', () => {
    const h = mountEar();
    try {
        h.scene('earclip-comb');
        const summary = h.graph.run().summary!;
        expect(h.graph.model.points).toHaveLength(11);
        expect([summary.triangles, summary.diagonals, ...summary.classSizes, summary.guardCount]).toEqual([9, 8, 4, 4, 3, 3]);
        expect(summary.guardCount).toBe(Math.floor(11 / 3));
        expect(result('triangles')).toBe('Trikotnikov: 9 (n − 2, kjer je n = 11 število oglišč)');
        expect(result('diagonals')).toBe('Diagonal: 8 (n − 3)');
        expect(result('classes')).toBe('Barvni razredi (A, B, C): 4, 4, 3');
        expect(result('guards')).toContain('Stražarjev: 3');
        setLanguage('en');
        h.scene('earclip-comb');
        expect(result('classes')).toBe('Colour classes (A, B, C): 4, 4, 3');
        expect(result('guards')).toContain('Guards: 3');
    } finally {
        h.mounted.view.unmount();
    }
});

test('the worked examples equal the orientation value and the scene counts', () => {
    const h = mountEar();
    try {
        const p = (x: number, y: number) => ({x, y});
        const example = (id: string) => compgeoGuidedLessons.find(l => l.demonstrationId === 'ear-clipping')!.workedExamples.find(e => e.id === id)!;
        expect(example('ear-first-ear-example').resultLatex).toBe(`D=${orientValue(p(6, 0), p(6, 4), p(3, 2))}`);
        h.scene('earclip-guards');
        const small = h.graph.run().summary!;
        expect(example('ear-count-example').resultLatex).toBe(`T=${small.triangles},\\; d=${small.diagonals},\\; g=${small.guardCount}`);
        h.scene('earclip-comb');
        const comb = h.graph.run().summary!;
        expect(example('ear-comb-example').resultLatex).toBe(`T=${comb.triangles},\\; d=${comb.diagonals},\\; g=${comb.guardCount}`);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the quoted numbers appear in the step text of both languages', () => {
    const quoted: Record<string, readonly string[]> = {
        'earclip-polygon': ['\\(18\\)', '(3,2)'],
        'earclip-first-ear': ['(6,0)', '(6,4)', '(3,2)', '\\(1\\)'],
        'earclip-triangulation': ['\\(n-2=3\\)', '\\(n-3=2\\)'],
        'earclip-colouring': ['\\(2\\)', '\\(1\\)', '(6,4)', '(0,4)'],
        'earclip-guards': ['\\lfloor5/3\\rfloor', '(3,2)'],
        'earclip-comb': ['\\(9\\)', '\\(8\\)', '\\(4\\)', '\\(3\\)', '\\lfloor11/3\\rfloor'],
    };
    for (const [stepId, tokens] of Object.entries(quoted)) {
        const step = stepOf(stepId);
        for (const token of tokens) {
            expect(step.body.sl, `${stepId} sl ${token}`).toContain(token);
            expect(step.body.en, `${stepId} en ${token}`).toContain(token);
        }
    }
    const announced: Record<string, readonly string[]> = {
        'earclip-comb': ['\\(9\\)', '\\(8\\)', '\\(4\\)', '\\(3\\)'],
    };
    for (const [stepId, tokens] of Object.entries(announced)) {
        const authored = compgeoGuidedLessons.find(l => l.demonstrationId === 'ear-clipping')!.steps.find(step => step.id === stepId)!;
        const expected = authored.scene!.expectedState;
        for (const token of tokens) {
            expect(expected.sl, `${stepId} scene sl ${token}`).toContain(token);
            expect(expected.en, `${stepId} scene en ${token}`).toContain(token);
        }
    }
    expect(stepOf('earclip-first-ear').body.sl).toContain('„Korak 4 od 12“');
    expect(stepOf('earclip-first-ear').body.en).toContain('“Step 4 of 12”');
    expect(stepOf('earclip-first-ear').body.sl).toContain('od najnižje številke naprej, v nasprotni smeri urinega kazalca');
    expect(stepOf('earclip-first-ear').body.en).toContain('from the lowest number onwards, counter-clockwise');
});

test('Back and a scene change while playing leave playback paused with no pending scheduler callback', () => {
    const h = mountEar();
    try {
        h.scene('earclip-first-ear');
        act(() => { h.capabilities.apply(PLAY); });
        expect([h.graph.isPlaying, h.pending()]).toEqual([true, 1]);
        act(() => { h.capabilities.stopAnimations?.(); });
        expect([h.graph.isPlaying, h.pending()]).toEqual([false, 0]);
        act(() => { h.capabilities.apply(PLAY); });
        expect(h.pending()).toBe(1);
        h.scene('earclip-comb');
        expect([h.graph.isPlaying, h.pending(), h.graph.step]).toEqual([false, 0, 34]);
        act(() => { h.capabilities.apply(PLAY); });
        expect([h.graph.isPlaying, h.pending()]).toEqual([false, 0]);
        for (const stepId of STEPS) {
            h.scene(stepId);
            expect([h.graph.isPlaying, h.pending()]).toEqual([false, 0]);
        }
        h.scene('earclip-first-ear');
        act(() => { h.capabilities.apply(PLAY); });
        h.scene('earclip-polygon');
        expect([h.graph.step, h.graph.isPlaying, h.pending()]).toEqual([0, false, 0]);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the catalog checks the shape and finiteness of set-trace-step only', () => {
    const scene = (action: LessonAction) => ({id: 's', basedOn: 'demonstration-default', actions: [action], expectedState: {sl: 'a', en: 'b'}}) as const;
    const traceStep = (step: unknown): LessonAction => ({kind: 'point-set', operation: 'set-trace-step', step} as unknown as LessonAction);
    expect(() => sceneActions(scene(traceStep(4)))).not.toThrow();
    expect(() => sceneActions(scene(traceStep('end')))).not.toThrow();
    expect(() => sceneActions(scene(traceStep(10 ** 9)))).not.toThrow();
    expect(() => sceneActions(scene(traceStep(Number.NaN)))).toThrow(/set-trace-step/);
    expect(() => sceneActions(scene(traceStep(Number.POSITIVE_INFINITY)))).toThrow(/set-trace-step/);
    expect(() => sceneActions(scene(traceStep('last')))).toThrow(/set-trace-step/);
    expect(() => sceneActions(scene(traceStep(undefined)))).toThrow(/set-trace-step/);
});

test('every ear clipping scene starts in a view that contains its whole polygon, the comb included', () => {
    for (const stepId of STEPS) {
        const prepared = sceneOf(stepId)[0];
        const polygonAction = sceneOf(stepId).find(action => action.kind === 'point-set' && action.operation === 'set-points');
        expect(prepared.kind === 'prepared-scene' && prepared.view, stepId).toBeTruthy();
        if (prepared.kind !== 'prepared-scene' || !prepared.view || !polygonAction || polygonAction.kind !== 'point-set' || polygonAction.operation !== 'set-points') throw new Error(stepId);
        const [left, top, right, bottom] = prepared.view;
        for (const [x, y] of polygonAction.points) expect(left < x && x < right && bottom < y && y < top, `${stepId} (${x}, ${y})`).toBe(true);
    }
    expect(sceneOf('earclip-comb').some(action => action.kind === 'point-set' && action.operation === 'set-points' && action.points.length === EAR_COMB.length)).toBe(true);
});
