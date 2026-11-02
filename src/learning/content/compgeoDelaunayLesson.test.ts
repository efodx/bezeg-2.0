import {act} from '@testing-library/react';
import {
    compgeoGuidedLessons, DELAUNAY_ILLEGAL_EDGES, DELAUNAY_ILLEGAL_STEPS, DELAUNAY_QUAD, DELAUNAY_QUAD_START, DELAUNAY_SQUARE, DELAUNAY_TRACE_STEPS, TRI_EXAMPLE_POINTS, TRI_T0,
} from './compgeoGuidedLessons';
import {getLessonForDemonstration} from '../runtime/lessonCatalog';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {DelaunayGraph} from '../../graphs/compgeo/DelaunayGraph';
import {circumcircle, quadValue, edgeQuad, runDelaunay} from '../../graphs/compgeo/delaunayRun';
import {incircleValue} from '../../compgeo/predicates';
import {angleVector} from '../../compgeo/delaunay';
import {createTriangulation, type Triangulation} from '../../compgeo/triangulation';
import {setLanguage} from '../../localization';
import type {AnimationScheduler} from '../runtime/animation';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = () => getLessonForDemonstration('delaunay')!;
const guided = () => compgeoGuidedLessons.find(l => l.demonstrationId === 'delaunay')!;
const guidedStep = (stepId: string) => guided().steps.find(step => step.id === stepId)!;
const stepOf = (stepId: string) => lesson().steps.find(step => step.id === stepId)!;
const sceneOf = (stepId: string): LessonAction[] => stepOf(stepId).scene!.actions as LessonAction[];
const STEPS = ['del-quad', 'del-predict', 'del-circle', 'del-flip', 'del-seven', 'del-flips', 'del-square'];
const grid = (list: readonly (readonly number[])[]) => list.map(([x, y]) => ({x, y}));
const dom = (name: string) => document.querySelector(`[data-delaunay="readout"] [data-readout="${name}"]`)?.textContent;
const panel = (name: string) => document.querySelector(`[data-delaunay="${name}"]`)?.textContent;
const trace = (command: 'next-step' | 'play' | 'pause' | 'reset'): LessonAction => ({kind: 'animation', animationId: 'algorithm-trace', command});

function tri(points: readonly (readonly number[])[], triangles: readonly (readonly [number, number, number])[]): Triangulation {
    const made = createTriangulation(grid(points), triangles.map(t => [...t]));
    if (!made.ok) throw new Error('triangulation');
    return made.value;
}
const quadStart = () => tri(DELAUNAY_QUAD, DELAUNAY_QUAD_START);

function manualScheduler() {
    let next = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    const scheduler: AnimationScheduler = {
        request: callback => { const handle = next++; callbacks.set(handle, callback); return handle; },
        cancel: handle => { callbacks.delete(handle); },
    };
    return {scheduler, callbacks};
}

/** A mounted Delaunay graph; `scene` applies a step the way a lesson session does, in one synchronous act. */
function mountDel() {
    const frames = manualScheduler();
    const graph = new DelaunayGraph({}, frames.scheduler);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, checkpoint, frames,
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneOf(stepId)) capabilities.apply(action);
        }),
        sceneOnly: (stepId: string) => act(() => { for (const action of sceneOf(stepId)) capabilities.apply(action); }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type Mounted = ReturnType<typeof mountDel>;
const withMounted = (body: (h: Mounted) => void) => { const h = mountDel(); try { body(h); } finally { h.mounted.view.unmount(); } };

test('the lesson data equals the kernel: the quad, the square, the seven points and the trace steps', () => {
    expect(compgeoGuidedLessons.map(l => l.demonstrationId)).toContain('delaunay');
    expect(lesson().steps.map(step => step.id)).toEqual(STEPS);
    const run = runDelaunay(quadStart());
    // Events of the quad: phase, test ac (illegal), flip, test bd (legal), done.
    expect(run.length).toBe(5);
    expect([run.event(DELAUNAY_TRACE_STEPS.testAc)?.note, run.event(DELAUNAY_TRACE_STEPS.testBd)?.note]).toEqual(['test-illegal', 'test-legal']);
    expect(run.event(2)?.note).toBe('flip-edge');
    const seven = runDelaunay(tri(TRI_EXAMPLE_POINTS, TRI_T0));
    expect(seven.event(DELAUNAY_TRACE_STEPS.sevenFirstTest)?.kind).toBe('test');
});

test('step 1 to 3: the quad, a b c d are P1 to P4, the test of ac reads +64 and 1 illegal edge; the circle is (2, 7/3) with r^2 = 85/9', () => {
    withMounted(h => {
        h.scene('del-quad');
        expect([h.graph.model.points.map(p => [p.x, p.y])]).toEqual([DELAUNAY_QUAD.map(p => [...p])]);
        expect(h.graph.step).toBe(0);
        expect(h.graph.isPlaying).toBe(false);
        h.scene('del-predict');
        expect(h.graph.step).toBe(0);
        expect(h.graph.overlayShown('triangulation')).toBe(true);
        h.scene('del-circle');
        expect(h.graph.step).toBe(1);
        expect(panel('incircle')).toContain('+64');
        expect(dom('illegal')).toBe('Neustreznih robov: 1');
        // The kernel: D = +64 for a=P1, b=P2, c=P3, d=P4; the worked example quotes its expansion.
        const q = quadStart();
        const a = q.points[0], b = q.points[1], c = q.points[2], d = q.points[3];
        expect(incircleValue(a, b, c, d)).toBe(64n);
        expect(guidedStep('del-circle').workedExampleId).toBe('del-circle-example');
        const example = guided().workedExamples!.find(e => e.id === 'del-circle-example')!;
        expect([example.calculationLatex, example.resultLatex]).toEqual(['D=0\\cdot(-72)+2\\cdot4+4\\cdot14', 'D=64']);
        // The circle through a, b, c: centre (2, 7/3), r^2 = 85/9, and |d - S|^2 = 37/9.
        const circle = circumcircle(a, b, c)!;
        expect(circle.x).toBeCloseTo(2, 12);
        expect(circle.y).toBeCloseTo(7 / 3, 12);
        expect(circle.r * circle.r).toBeCloseTo(85 / 9, 12);
        expect((d.x - 2) ** 2 + (d.y - 7 / 3) ** 2).toBeCloseTo(37 / 9, 12);
        expect(37 / 9).toBeLessThan(85 / 9);
        // The graph's own quad for the tested edge agrees.
        const quad = edgeQuad(q, 0, 2)!;
        expect(quadValue(q, quad)).toBe(64n);
    });
});

test('step 4: after the flip the value is -64 from both sides, the minimum grew 19,65 to 26,57 and the angle vector increased lexicographically', () => {
    withMounted(h => {
        h.scene('del-flip');
        expect(h.graph.step).toBe(3);
        expect(panel('incircle')).toContain('-64');
        expect(dom('min-now')).toContain('26,57');
        expect(dom('min-start')).toContain('19,65');
        expect(dom('illegal')).toBe('Neustreznih robov: 0');
        expect(h.graph.selectedTriangle()).toBe(0);
        expect(panel('selected-triangle')).toBeTruthy();
        expect(panel('neighbours')).toContain('-64');
        // The other triangle shows the same value from the other side.
        const second = document.querySelector<HTMLButtonElement>('button[data-triangle="1"]')!;
        act(() => { second.click(); });
        expect(h.graph.selectedTriangle()).toBe(1);
        expect(panel('neighbours')).toContain('-64');
        // Kernel: the flipped diagonal bd = P2P4 tests -64 across and the vector rises.
        const after = h.graph.triangulation()!;
        const quad = edgeQuad(after, 1, 3)!;
        expect(quadValue(after, quad)).toBe(-64n);
        const before = angleVector(quadStart());
        const now = angleVector(after);
        expect(now.length).toBe(before.length);
        const first = now.findIndex((value, i) => value !== before[i]);
        expect(first).toBeGreaterThanOrEqual(0);
        expect(now[first]).toBeGreaterThan(before[first]);
        expect(now[0].toFixed(2)).toBe('26.57');
        expect(before[0].toFixed(2)).toBe('19.65');
    });
});

test('step 5: T0 has 3 illegal edges P2P5, P3P5, P5P7 (the trace tests them at 1, 6, 14) and smallest angle 1,91; no other interior edge is illegal', () => {
    withMounted(h => {
        h.scene('del-seven');
        expect(h.graph.step).toBe(0);
        expect(dom('illegal')).toBe('Neustreznih robov: 3');
        expect(dom('min-now')).toContain('1,91');
        const run = runDelaunay(tri(TRI_EXAMPLE_POINTS, TRI_T0));
        expect(run.illegal(0)).toEqual(DELAUNAY_ILLEGAL_EDGES);
        expect(DELAUNAY_ILLEGAL_STEPS.map(step => run.event(step)?.note)).toEqual(['test-illegal', 'test-illegal', 'test-illegal']);
        // The tested edge at each of those steps is the illegal one, in lexicographic order.
        const tested = DELAUNAY_ILLEGAL_STEPS.map(step => {
            const info = run.event(step)!.event;
            const edge = (info.payload as {edge?: readonly [number, number]}).edge;
            return edge ? [...edge].sort((x, y) => x - y) : undefined;
        });
        expect(tested).toEqual(DELAUNAY_ILLEGAL_EDGES.map(e => [...e]));
        // One-based names in the text: P2P5, P3P5, P5P7.
        for (const language of ['sl', 'en'] as const) for (const name of ['P_2P_5', 'P_3P_5', 'P_5P_7']) expect(stepOf('del-seven').body[language]).toContain(name);
        expect(DELAUNAY_ILLEGAL_EDGES.map(([x, y]) => `P_${x + 1}P_${y + 1}`)).toEqual(['P_2P_5', 'P_3P_5', 'P_5P_7']);
    });
});

test('step 6: Next step three flips ends with 0 illegal edges and smallest angle 25,35; no four of the seven points are cocircular', () => {
    withMounted(h => {
        h.scene('del-flips');
        expect(h.graph.step).toBe(1);
        const last = h.graph.run().length - 1;
        h.apply({kind: 'point-set', operation: 'set-trace-step', step: 'end'});
        expect(h.graph.step).toBe(last);
        expect(dom('flips')).toBe('Zamenjav doslej: 3');
        expect(dom('illegal')).toBe('Neustreznih robov: 0');
        expect(dom('min-now')).toContain('25,35');
        expect(dom('min-start')).toContain('1,91');
        expect(panel('cocircular')).toBeUndefined();
        const run = h.graph.run();
        expect(run.cocircular).toBe(false);
        // Directly: no quadruple of the seven points has incircle determinant 0.
        const points = grid(TRI_EXAMPLE_POINTS);
        for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) for (let k = j + 1; k < 7; k++) for (let m = k + 1; m < 7; m++) {
            const four = [points[i], points[j], points[k], points[m]];
            // incircleValue assumes a counter-clockwise a, b, c: either orientation is non-zero when the points are not cocircular.
            expect(incircleValue(four[0], four[1], four[2], four[3]), `${i}${j}${k}${m}`).not.toBe(0n);
        }
    });
});

test('step 7: the unit square has D = 0, both diagonals are legal and the end says the triangulation is not unique', () => {
    withMounted(h => {
        h.scene('del-square');
        expect(h.graph.step).toBe(1);
        expect(panel('incircle')).toContain('= 0');
        const square = tri(DELAUNAY_SQUARE, DELAUNAY_QUAD_START);
        const [a, b, c, d] = square.points;
        expect(incircleValue(a, b, c, d)).toBe(0n);
        expect(incircleValue(b, c, d, a)).toBe(0n);
        const example = guided().workedExamples!.find(e => e.id === 'del-square-example')!;
        expect([example.calculationLatex, example.resultLatex]).toEqual(['D=0\\cdot(-1)+1\\cdot(-1)+1\\cdot1', 'D=0']);
        // The other diagonal is legal as well: flipping to P2P4 and testing gives 0 too, and the run has no flips.
        const run = runDelaunay(square);
        expect(run.cocircular).toBe(true);
        expect(run.illegal(0)).toEqual([]);
        const flipped = tri(DELAUNAY_SQUARE, [[0, 1, 3], [1, 2, 3]]);
        expect(runDelaunay(flipped).illegal(0)).toEqual([]);
        h.apply({kind: 'point-set', operation: 'set-trace-step', step: 'end'});
        expect(dom('flips')).toBe('Zamenjav doslej: 0');
        expect(panel('cocircular')).toBeTruthy();
    });
});

test('the quoted numbers appear in the step text and the scene description of both languages', () => {
    const quoted: Record<string, readonly string[]> = {
        'del-quad': ['\\(a=P_1=(0,0)\\)', '\\(b=P_2=(4,0)\\)', '\\(c=P_3=(5,3)\\)', '\\(d=P_4=(0,2)\\)'],
        'del-circle': ['\\tfrac{7}{3}', '\\tfrac{85}{9}', '\\tfrac{37}{9}', '\\(D=+64\\)', '\\(+64\\)'],
        'del-flip': ['\\(-64\\)', '\\(19{,}65^\\circ\\)', '\\(26{,}57^\\circ\\)'],
        'del-seven': ['\\(P_2P_5\\)', '\\(P_3P_5\\)', '\\(P_5P_7\\)', '\\(3\\)', '\\(1{,}91^\\circ\\)'],
        'del-flips': ['\\(25{,}35^\\circ\\)', '\\(1{,}91^\\circ\\)', ': 3'],
        'del-square': ['\\(D=0\\)', '\\(P_1P_3\\)', '\\(P_2P_4\\)'],
    };
    for (const [stepId, tokens] of Object.entries(quoted)) {
        const step = stepOf(stepId);
        for (const token of tokens) {
            expect(step.body.sl, `${stepId} sl ${token}`).toContain(token);
            expect(step.body.en, `${stepId} en ${token}`).toContain(token.replace('{,}', '.'));
        }
    }
    const announced: Record<string, readonly string[]> = {
        'del-circle': ['\\(+64\\)'],
        'del-flip': ['\\(-64\\)', '\\(26{,}57^\\circ\\)', '\\(19{,}65^\\circ\\)'],
        'del-seven': ['\\(3\\)', '\\(P_2P_5\\)', '\\(1{,}91^\\circ\\)'],
        'del-flips': ['\\(25{,}35^\\circ\\)'],
        'del-square': ['\\(0\\)'],
    };
    for (const [stepId, tokens] of Object.entries(announced)) {
        const expected = guidedStep(stepId).scene!.expectedState;
        for (const token of tokens) {
            expect(expected.sl, `${stepId} scene sl ${token}`).toContain(token);
            expect(expected.en, `${stepId} scene en ${token}`).toContain(token.replace('{,}', '.'));
        }
    }
    // The cited fact is in both languages and the book is cited.
    expect(stepOf('del-flips').body.sl).toContain('Computational Geometry, 9. poglavje');
    expect(stepOf('del-flips').body.en).toContain('chapter 9');
    expect(guided().sources!.some(source => source.citation.includes('Chapter 9'))).toBe(true);
});

test('next-step x k on the lesson scene equals Next x k, and Back and a scene change pause playback with no scheduler callback', () => {
    for (const k of [1, 2, 3]) {
        const viaAction = mountDel();
        let fromAction: (string | null | undefined)[] = [];
        let step = -1;
        try {
            viaAction.scene('del-seven');
            viaAction.apply(...Array.from({length: k}, () => trace('next-step')));
            step = viaAction.graph.step;
            fromAction = [dom('flips'), dom('illegal'), dom('min-now'), panel('step')];
        } finally {
            viaAction.mounted.view.unmount();
        }
        withMounted(h => {
            h.scene('del-seven');
            for (let i = 0; i < k; i++) act(() => { document.querySelector<HTMLButtonElement>('button[data-action="next-step"]')!.click(); });
            expect(h.graph.step).toBe(step);
            expect([dom('flips'), dom('illegal'), dom('min-now'), panel('step')]).toEqual(fromAction);
        });
    }
    withMounted(h => {
        h.scene('del-seven');
        expect([h.graph.isPlaying, h.frames.callbacks.size]).toEqual([false, 0]);
        h.apply(trace('play'));
        expect([h.graph.isPlaying, h.frames.callbacks.size]).toEqual([true, 1]);
        h.scene('del-flips');
        expect([h.graph.isPlaying, h.frames.callbacks.size]).toEqual([false, 0]);
        h.apply(trace('play'));
        act(() => { h.capabilities.restoreState(h.checkpoint); });
        expect([h.graph.isPlaying, h.frames.callbacks.size, h.graph.step]).toEqual([false, 0, 0]);
        // Every lesson scene is stopped on arrival.
        for (const stepId of STEPS) {
            h.scene(stepId);
            expect([stepId, h.graph.isPlaying, h.frames.callbacks.size]).toEqual([stepId, false, 0]);
        }
    });
});

test('every scene starts in a view that contains all its points', () => {
    for (const stepId of STEPS) {
        const actions = sceneOf(stepId);
        const prepared = actions[0];
        const pointsAction = actions.find(action => action.kind === 'point-set' && action.operation === 'set-points');
        if (prepared.kind !== 'prepared-scene' || !prepared.view || !pointsAction || pointsAction.kind !== 'point-set' || pointsAction.operation !== 'set-points') throw new Error(stepId);
        const [left, top, right, bottom] = prepared.view;
        for (const [x, y] of pointsAction.points) expect(left < x && x < right && bottom < y && y < top, `${stepId} (${x}, ${y})`).toBe(true);
    }
});

test('a scene change brings the readouts back: the second scene does not keep the first scene selection or step', () => {
    withMounted(h => {
        h.scene('del-flip');
        expect(h.graph.selectedTriangle()).toBe(0);
        h.sceneOnly('del-seven');
        expect(h.graph.selectedTriangle()).toBeUndefined();
        expect(h.graph.step).toBe(0);
        expect(dom('min-now')).toContain('1,91');
        h.scene('del-quad');
        expect(dom('illegal')).toBe('Neustreznih robov: 1');
        expect(dom('flips')).toBe('Zamenjav doslej: 0');
    });
});
