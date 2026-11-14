import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {LessonSession} from '../runtime/LessonSession';
import {
    bezierClippingGuidedLessons, CLIPPING_CROSSING, CLIPPING_LESSON_VIEW, CLIPPING_OFFSET, CLIPPING_SCENES, CLIPPING_TANGENT,
} from './bezierClippingGuidedLessons';
import type {LessonAction, LessonDefinition} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {BEZIER_CLIPPING_STEP_INTERVAL_MS, type BezierClippingGraph} from '../../graphs/compgeo/BezierClippingGraph';
import {bezierClippingReadout, widestAliveWidth} from '../../graphs/compgeo/bezierClippingReadout';
import {setLanguage} from '../../localization';
import {fitBoundingBox} from '../../graphs/base/fitBoundingBox';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(() => setLanguage('sl'));

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
type Pair = ReadonlyArray<readonly [number, number]>;

const lesson = bezierClippingGuidedLessons.find(entry => entry.demonstrationId === 'bezier-clipping')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: Language) =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
const traceStep = (step: number | 'end'): LessonAction => ({kind: 'point-set', operation: 'set-trace-step', step});
const loadModel = (points: Pair, gridStepExponent: number): LessonAction => ({kind: 'point-set', operation: 'load-model', points, gridStepExponent});
const setTolerance = (exponent: number): LessonAction => ({kind: 'point-set', operation: 'set-clip-tolerance', exponent});

// ---- An independent evaluation of the curves (no kernel code) ---------------------------------------------------------------

type Pt = readonly [number, number];
const quadraticAt = (q: readonly Pt[], t: number): Pt =>
    [0, 1].map(k => (1 - t) ** 2 * q[0][k] + 2 * (1 - t) * t * q[1][k] + t * t * q[2][k]) as unknown as Pt;
const A_NET = CLIPPING_CROSSING.slice(0, 3);

/** Per step: the pair, tolerance, trace step, status and clip count the text relies on. `step: null` is the last step of the run. */
const CONTRACT: ReadonlyArray<{
    id: string; pair: Pair; grid: number; k: number; step: number | null; status: string; clips: number; results: number; unresolved: number;
    overlays: readonly [boolean, boolean, boolean, boolean, boolean]; target: 'A' | 'B'; preview: boolean; length?: number;
}> = [
    {id: 'clipping-hulls', pair: CLIPPING_CROSSING, grid: 0, k: 6, step: 0, status: 'overlapping', clips: 0, results: 0, unresolved: 0, overlays: [true, true, false, false, false], target: 'A', preview: true},
    {id: 'clipping-fat-line', pair: CLIPPING_CROSSING, grid: 0, k: 6, step: 0, status: 'overlapping', clips: 0, results: 0, unresolved: 0, overlays: [true, false, true, false, false], target: 'A', preview: true},
    {id: 'clipping-clip-a', pair: CLIPPING_CROSSING, grid: 0, k: 6, step: 4, status: 'running', clips: 3, results: 0, unresolved: 0, overlays: [false, false, true, true, true], target: 'A', preview: false},
    {id: 'clipping-swap', pair: CLIPPING_CROSSING, grid: 0, k: 6, step: 5, status: 'running', clips: 4, results: 0, unresolved: 0, overlays: [false, false, true, true, true], target: 'B', preview: false},
    {id: 'clipping-repeat', pair: CLIPPING_CROSSING, grid: 0, k: 6, step: null, status: 'found', clips: 21, results: 2, unresolved: 0, overlays: [false, false, false, true, true], target: 'A', preview: true, length: 26},
    {id: 'clipping-tangent', pair: CLIPPING_TANGENT, grid: 0, k: 10, step: null, status: 'limit', clips: 200, results: 1, unresolved: 28, overlays: [false, false, false, true, true], target: 'A', preview: true},
    {id: 'clipping-offset', pair: CLIPPING_OFFSET, grid: -1, k: 6, step: null, status: 'empty', clips: 17, results: 0, unresolved: 0, overlays: [true, true, false, true, true], target: 'A', preview: true, length: 22},
    {id: 'clipping-explore', pair: CLIPPING_CROSSING, grid: 0, k: 6, step: 0, status: 'overlapping', clips: 0, results: 0, unresolved: 0, overlays: [true, true, true, true, true], target: 'A', preview: true},
];

function mount() {
    const graph = createGraph('bezier-clipping');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as BezierClippingGraph & {board: {objectsList: Array<{name?: string}>; getBoundingBox(): number[]}}, mounted, capabilities, checkpoint,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type Mounted = ReturnType<typeof mount>;
const boardPoints = (h: Mounted) => h.graph.model.points.map(p => [p.x * 2 ** h.graph.model.gridStepExponent, p.y * 2 ** h.graph.model.gridStepExponent]);
const drawn = (h: Mounted, pattern: RegExp) => h.graph.board.objectsList.filter((o: {name?: string}) => pattern.test(o.name ?? '')).length;
const status = (h: Mounted) => bezierClippingReadout(h.graph.clipState, h.graph.hullsApart).status;
const OVERLAYS = ['control', 'hull', 'fatLine', 'kept', 'discarded'] as const;
const lastStep = (h: Mounted) => h.graph.run().length - 1;
const snapshot = (h: Mounted) => ({
    step: h.graph.step, k: h.graph.clipToleranceExponent, grid: h.graph.model.gridStepExponent, points: boardPoints(h),
    overlays: OVERLAYS.map(name => h.graph.overlayShown(name)), status: status(h), clips: h.graph.clipState.clipCount, playing: h.graph.isPlaying,
});

// ---- Lesson shape ---------------------------------------------------------------------------------------------------------

test('the lesson has eight steps with the contract order, both languages, a calculation frame per worked example and a scene each', () => {
    expect(lesson.steps.map(step => step.id)).toEqual(CONTRACT.map(c => c.id));
    expect(Object.keys(CLIPPING_SCENES)).toEqual(CONTRACT.map(c => c.id));
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const step of lesson.steps) {
        expect(step.scene, step.id).toBeDefined();
        expect(step.frames.length, step.id).toBeGreaterThanOrEqual(2);
        for (const l of LANGUAGES) {
            for (const field of [step.title, step.purpose, step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations]) {
                expect(field[l].trim().length, `${step.id} ${l}`).toBeGreaterThan(10);
            }
        }
        if (step.workedExampleId) {
            expect(lesson.workedExamples.some(e => e.id === step.workedExampleId), step.id).toBe(true);
            expect(step.frames.some(f => f.kind === 'calculation'), `${step.id} calculation frame`).toBe(true);
        }
        for (const id of step.formulaIds) expect(lesson.formulaBlocks.some(f => f.id === id), `${step.id} ${id}`).toBe(true);
    }
    expect(lesson.steps.map(step => step.workedExampleId).filter(Boolean)).toEqual(['clipping-crossing-example', 'clipping-offset-example']);
});

test('the prose says: tolerance is a stopping rule not a proof, overlap is necessary not sufficient, a finite run proves nothing, Bezier clipping and fat line', () => {
    const all = (l: Language) => JSON.stringify(lesson).toLowerCase() && [lesson.summary[l], ...lesson.steps.map(step => step.explanation[l])].join(' ').toLowerCase();
    expect(all('sl')).toContain('pravilo za ustavitev');
    expect(all('sl')).toContain('ne dokaz');
    expect(all('sl')).toContain('potreben, ne zadosten');
    expect(all('sl')).toContain('ničesar ne dokaže');
    expect(all('sl')).toContain('bézierovo rezanje');
    expect(all('sl')).toContain('debela premica');
    expect(all('en')).toContain('bézier clipping');
    expect(all('en')).toContain('stopping rule');
    expect(all('en')).toContain('not a proof');
    expect(all('en')).toContain('necessary, not sufficient');
    expect(all('en')).toContain('proves nothing');
    // The clip limit is expected near a tangency and for coincident segments (acceptance 3).
    const edgeCases = (l: Language) => (lesson.edgeCases ?? []).map(item => item[l]).join(' ');
    expect(edgeCases('sl')).toContain('Pri dotiku in sovpadajočih odsekih rezanje doseže mejo rezov');
    expect(edgeCases('en')).toContain('At a tangency and for coincident segments clipping reaches the clip limit');
    // Degrees above 3 are not offered: said once, in the free exploration step.
    expect(prose(stepOf('clipping-explore'), 'sl')).toContain('Stopnje nad \\(3\\) niso na voljo');
    expect(prose(stepOf('clipping-explore'), 'en')).toContain('Degrees above \\(3\\) are not offered');
});

test('every symbol or number sits in a math delimiter, with {,} for decimal commas, in both languages', () => {
    const strip = (s: string) => s.replace(/\\\([\s\S]*?\\\)/g, '').replace(/\\\[[\s\S]*?\\\]/g, '');
    for (const step of lesson.steps) {
        for (const l of LANGUAGES) {
            const outside = strip(prose(step, l) + ' ' + step.title[l] + ' ' + step.purpose[l] + ' ' + step.observationPrompt[l]);
            expect(outside, `${step.id} ${l}`).not.toMatch(/\d/);
            expect(outside, `${step.id} ${l}`).not.toMatch(/\\/);
            expect(outside, `${step.id} ${l}`).not.toContain('{,}');
            if (l === 'en') expect(prose(step, l), step.id).not.toContain('{,}');
        }
    }
    for (const example of lesson.workedExamples) {
        for (const field of [example.calculationLatex, example.resultLatex]) expect(field).not.toMatch(/\\\(|\\\[/);
    }
    for (const formula of lesson.formulaBlocks) expect(formula.latex).not.toMatch(/\\\(|\\\[/);
});

// ---- Scenes on the real graph ---------------------------------------------------------------------------------------------

test('each scene sets the pair, tolerance, overlays, view and trace step the contract says, in one synchronous sequence', () => {
    const h = mount();
    try {
        for (const c of CONTRACT) {
            h.scene(stepOf(c.id));
            const label = c.id;
            expect(boardPoints(h), `${label} pair`).toEqual(c.pair.map(p => [...p]));
            expect([h.graph.model.gridStepExponent, h.graph.clipToleranceExponent], `${label} grid and tolerance`).toEqual([c.grid, c.k]);
            expect(h.graph.step, `${label} step`).toBe(c.step ?? lastStep(h));
            expect(h.graph.isPlaying, label).toBe(false);
            expect(status(h), `${label} status`).toBe(c.status);
            expect(h.graph.clipState.clipCount, `${label} clips`).toBe(c.clips);
            expect(h.graph.clipState.results, `${label} results`).toHaveLength(c.results);
            expect(h.graph.clipState.unresolved, `${label} unresolved`).toHaveLength(c.unresolved);
            expect(OVERLAYS.map(name => h.graph.overlayShown(name)), `${label} overlays`).toEqual([...c.overlays]);
            // The drawn objects follow the overlay switches.
            expect(drawn(h, /^fatLine/) > 0, `${label} fat line drawn`).toBe(c.overlays[2]);
            expect(drawn(h, /^clipKept-/) > 0, `${label} kept drawn`).toBe(c.overlays[3]);
            expect(drawn(h, /^clipDiscarded-/) > 0, `${label} discarded drawn`).toBe(c.overlays[4]);
            if (c.length) expect(h.graph.run().length, `${label} run length`).toBe(c.length);
            // The step view names the curve clipped and the curve whose fat line clips it.
            // At the end of a run (step null) the trace has no clip to show, so there is no view.
            if (c.step !== null) {
                const view = h.graph.stepView;
                expect(view?.target, `${label} target`).toBe(c.target);
                expect(view?.source, `${label} source`).toBe(c.target === 'A' ? 'B' : 'A');
                expect(view?.preview, `${label} preview`).toBe(c.preview);
            }
            const box = fitBoundingBox([[CLIPPING_LESSON_VIEW[0], CLIPPING_LESSON_VIEW[1]], [CLIPPING_LESSON_VIEW[2], CLIPPING_LESSON_VIEW[3]]], 600, 400)!;
            h.graph.board.getBoundingBox().forEach((edge, index) => expect(edge, `${label} box ${index}`).toBeCloseTo(box[index], 9));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 3 is a clip of A that discards parts after the first clip kept everything and the pair was split; step 4 swaps to a clip of B', () => {
    const h = mount();
    try {
        h.scene(stepOf('clipping-clip-a'));
        const events = h.graph.run();
        expect([events[1].kind, events[1].payload.target, events[1].payload.keep]).toEqual(['clip', 'A', 1]);
        expect(events[2].kind).toBe('split');
        expect(events[4].kind).toBe('clip');
        expect(events[4].payload.keep as number).toBeLessThan(1);
        expect(h.graph.clipState.discarded.length + h.graph.stepView!.clippedLocal![0]).toBeGreaterThan(0);
        expect(h.graph.stepView!.clippedLocal![1] - h.graph.stepView!.clippedLocal![0]).toBeLessThan(1);
        h.scene(stepOf('clipping-swap'));
        expect(events[5].kind).toBe('clip');
        expect(events[5].payload.target).toBe('B');
        expect(events[5].payload.keep as number).toBeLessThan(1);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the crossing, tangent and offset numbers the text quotes are the graph\'s: clips 17 and 21, 53 and 113, ratio 5.4, 200 with 28 unresolved (26 near 0.5, two wide), the result 5e-7 below 0.5, 17 empty', () => {
    const h = mount();
    try {
        const finish = (pair: Pair, grid: number, k: number) => {
            h.apply(loadModel(pair, grid), setTolerance(k), traceStep('end'));
            return {...h.graph.clipState, state: h.graph.clipState, status: status(h), step: h.graph.step, length: h.graph.run().length};
        };
        const c3 = finish(CLIPPING_CROSSING, 0, 3), c6 = finish(CLIPPING_CROSSING, 0, 6);
        const t3 = finish(CLIPPING_TANGENT, 0, 3), t6 = finish(CLIPPING_TANGENT, 0, 6), t10 = finish(CLIPPING_TANGENT, 0, 10);
        const o6 = finish(CLIPPING_OFFSET, -1, 6);
        expect([c3.clipCount, c3.status], 'crossing 1e-3').toEqual([17, 'found']);
        expect([c6.clipCount, c6.status, c6.step + 1, c6.length], 'crossing 1e-6, step 26 of 26').toEqual([21, 'found', 26, 26]);
        expect([t3.clipCount, t3.status, t3.results.length], 'tangent 1e-3').toEqual([53, 'found', 1]);
        expect([t6.clipCount, t6.status, t6.results.length], 'tangent 1e-6').toEqual([113, 'found', 1]);
        // Step 6 asks for a Play to the end of the run, so it names the short tangent run: under half a minute, not the 54 s of 10^-6.
        expect(t3.length * BEZIER_CLIPPING_STEP_INTERVAL_MS, 'tangent 1e-3 playback').toBeLessThan(30_000);
        for (const l of ['sl', 'en'] as const) expect(stepOf('clipping-tangent').observationPrompt[l]).toContain('\\(10^{-3}\\)');
        expect([t10.clipCount, t10.status, t10.results.length, t10.unresolved.length], 'tangent 1e-10').toEqual([200, 'limit', 1, 28]);
        expect([o6.clipCount, o6.status, o6.results.length], 'offset 1e-6').toEqual([17, 'empty', 0]);
        expect((t6.clipCount / c6.clipCount).toFixed(1)).toBe('5.4');
        // The two crossing results and the single tangent range are where the independent mathematics puts them.
        const roots = c6.results.map(r => r.aRange).sort((a, b) => a[0] - b[0]);
        expect(roots).toHaveLength(2);
        [0.25, 0.75].forEach((root, i) => { expect(roots[i][0]).toBeLessThanOrEqual(root + 1e-9); expect(roots[i][1]).toBeGreaterThanOrEqual(root - 1e-9); });
        c6.results.forEach(r => [r.aRange, r.bRange].forEach(range => expect(range[1] - range[0]).toBeLessThan(1e-6)));
        for (const run of [t3, t6]) {
            expect(run.results[0].aRange[0]).toBeLessThanOrEqual(0.5 + 1e-9);
            expect(run.results[0].aRange[1]).toBeGreaterThanOrEqual(0.5 - 1e-9);
        }
        // The 28 unresolved pairs: the first 26 are near 0.5 (the double root); the last two were never processed and are wide.
        const unresolved = t10.unresolved;
        expect(unresolved).toHaveLength(28);
        const near = (range: readonly [number, number]) => range[0] >= 0.45 && range[1] <= 0.55;
        expect(unresolved.filter(pair => near(pair.aRange) && near(pair.bRange))).toHaveLength(26);
        unresolved.slice(0, 26).forEach(pair => { expect(near(pair.aRange)).toBe(true); expect(near(pair.bRange)).toBe(true); });
        const [wideOne, wideTwo] = unresolved.slice(26);
        expect([wideOne.aRange[0], wideOne.aRange[1]]).toEqual([0, 0.5]);
        expect(wideOne.bRange[0]).toBeCloseTo(0.625, 9); // 0.6249999999997643 in floating point
        expect(wideOne.bRange[1]).toBe(1);
        expect([wideTwo.aRange[0], wideTwo.aRange[1]]).toEqual([0.5, 1]);
        expect([wideTwo.bRange[0], wideTwo.bRange[1]]).toEqual([0, 1]);
        expect(widestAliveWidth(t10.state)).toBe(1);
        // The touching point stays among the unresolved pairs: some pair has both ranges containing 0.5.
        expect(unresolved.some(pair => [pair.aRange, pair.bRange].every(range => range[0] <= 0.5 && range[1] >= 0.5))).toBe(true);
        // The one result is about 5e-7 below 0.5 and does not contain it (the table rounds it to 0.5).
        const [result] = t10.results;
        expect(result.aRange[1]).toBeLessThan(0.5);
        expect(result.aRange[0]).toBeGreaterThan(0.499999);
        expect(result.aRange[0]).toBeCloseTo(0.49999950002, 9);
        expect(0.5 - result.aRange[1]).toBeCloseTo(5e-7, 8);
        // The hulls overlap at the start of the offset pair, although it ends empty (press Reset).
        h.apply(traceStep(0));
        expect(status(h)).toBe('overlapping');
    } finally {
        h.mounted.view.unmount();
    }
});

test('the independent mathematics of the quoted points: crossings, touching point and the vertical gap of the offset pair', () => {
    const B_CROSS = CLIPPING_CROSSING.slice(3), B_TAN = CLIPPING_TANGENT.slice(3), B_OFF = CLIPPING_OFFSET.slice(3);
    // Crossings (1, 1.5) and (3, 1.5) at t = 1/4 and 3/4 on both curves, from 16t^2 - 16t + 3 = (4t - 1)(4t - 3).
    for (const [t, x] of [[0.25, 1], [0.75, 3]] as const) {
        for (const net of [A_NET, B_CROSS]) {
            const p = quadraticAt(net, t);
            expect(p[0]).toBeCloseTo(x, 12);
            expect(p[1]).toBeCloseTo(1.5, 12);
        }
        expect(16 * t * t - 16 * t + 3).toBeCloseTo(0, 12);
    }
    // The tangent pair touches at (2, 2) at t = 1/2, with 16t^2 - 16t + 4 = 16 (t - 1/2)^2 >= 0, a double root.
    for (const net of [A_NET, B_TAN]) expect(quadraticAt(net, 0.5)).toEqual([2, 2]);
    let minTangentGap = Infinity;
    for (let i = 0; i <= 10000; i++) minTangentGap = Math.min(minTangentGap, quadraticAt(B_TAN, i / 10000)[1] - quadraticAt(A_NET, i / 10000)[1]);
    expect(minTangentGap).toBeCloseTo(0, 12);
    // The offset pair: y_B - y_A = 4.5 - 16t + 16t^2 >= 0.5 with the minimum at t = 1/2, so no intersection.
    let minGap = Infinity, argmin = 0;
    for (let i = 0; i <= 10000; i++) {
        const t = i / 10000, gap = quadraticAt(B_OFF, t)[1] - quadraticAt(A_NET, t)[1];
        expect(gap).toBeCloseTo(4.5 - 16 * t + 16 * t * t, 12);
        if (gap < minGap) { minGap = gap; argmin = t; }
    }
    expect([minGap, argmin]).toEqual([0.5, 0.5]);
});

test('a scene looks the same fresh, after any earlier scene, backward and by jump; the tolerance and pair are restored by the next scene', () => {
    const fresh = new Map<string, ReturnType<typeof snapshot>>();
    for (const step of lesson.steps) {
        const h = mount();
        try {
            h.scene(step);
            fresh.set(step.id, snapshot(h));
        } finally {
            h.mounted.view.unmount();
        }
    }
    expect(fresh.size).toBe(8);
    const h = mount();
    try {
        const s = lesson.steps;
        const order = [...s, ...[...s].reverse(), s[4], s[1], s[6], s[0], s[5], s[3], s[2], s[7], s[5], s[4]];
        for (const step of order) {
            // Without restoring the checkpoint: the scene's own actions must set everything it depends on.
            h.apply(...actionsOf(step));
            expect(snapshot(h), step.id).toEqual(fresh.get(step.id));
        }
        // The tangent step is at 10^-10, the offset step after it at 10^-6 on the half-unit grid, and the crossing after that on grid 0.
        h.apply(...actionsOf(stepOf('clipping-tangent')));
        expect(h.graph.clipToleranceExponent).toBe(10);
        h.apply(...actionsOf(stepOf('clipping-offset')));
        expect([h.graph.clipToleranceExponent, h.graph.model.gridStepExponent]).toEqual([6, -1]);
        h.apply(...actionsOf(stepOf('clipping-repeat')));
        expect([h.graph.clipToleranceExponent, h.graph.model.gridStepExponent]).toEqual([6, 0]);
        // A student drag-like change between scenes does not leak: a loaded pair and tolerance are set again.
        h.apply(loadModel(CLIPPING_OFFSET, -1), setTolerance(3), traceStep(2));
        h.apply(...actionsOf(stepOf('clipping-hulls')));
        expect(snapshot(h)).toEqual(fresh.get('clipping-hulls'));
    } finally {
        h.mounted.view.unmount();
    }
});

test('missing or malformed scene data fails: an off-grid point, a bad tolerance and a wrong point count are rejected', () => {
    const h = mount();
    try {
        const reject = (action: LessonAction) => expect(() => act(() => { h.capabilities.apply(action); })).toThrow();
        reject(loadModel([[0, 0], [2, 4], [4, 0], [0, 4.5], [2, 0.5], [4, 4.5]], 0));
        reject(loadModel(CLIPPING_OFFSET.slice(0, 5), -1));
        reject(setTolerance(11));
        reject(setTolerance(2));
    } finally {
        h.mounted.view.unmount();
    }
});

const definition = (): LessonDefinition => ({
    id: 'bezier-clipping-guided', demonstrationId: 'bezier-clipping', title: lesson.title, summary: lesson.summary,
    steps: lesson.steps.map(step => ({
        id: step.id, title: step.title, body: step.explanation, notation: [], prompt: step.observationPrompt,
        scene: {actions: actionsOf(step)},
    })),
});

test('a real session walks the steps, goes back, and closing returns the pair, tolerance, overlays, step and view to the opening state', () => {
    const h = mount();
    try {
        const open = snapshot(h);
        const box = h.graph.board.getBoundingBox();
        const session = new LessonSession(definition(), h.capabilities);
        act(() => session.start());
        const target = lesson.steps.findIndex(step => step.id === 'clipping-tangent');
        for (let guard = 0; session.snapshot().stepIndex < target && guard < 40; guard++) act(() => session.next());
        expect(session.snapshot().stepIndex).toBe(target);
        expect([h.graph.clipToleranceExponent, status(h), h.graph.clipState.clipCount]).toEqual([10, 'limit', 200]);
        // Back one step: the crossing at the end of its run, at 10^-6.
        for (let guard = 0; session.snapshot().stepIndex >= target && guard < 40; guard++) act(() => session.back());
        expect(session.snapshot().stepIndex).toBe(target - 1);
        expect([h.graph.clipToleranceExponent, status(h), h.graph.clipState.clipCount]).toEqual([6, 'found', 21]);
        act(() => session.close());
        expect(snapshot(h)).toEqual(open);
        h.graph.board.getBoundingBox().forEach((edge, index) => expect(edge).toBeCloseTo(box[index], 9));
    } finally {
        h.mounted.view.unmount();
    }
});

// ---- Text against the checked values -----------------------------------------------------------------------------------------

/** Every decimal number the lesson prints is one the checks above verified, so one mistyped copy of a value cannot hide behind a correct one. */
const VERIFIED_DECIMALS = new Set([
    '0.25', '0.75', // the crossing parameters
    '0.5', // the tangency parameter and the minimum vertical gap of the offset pair
    '1.5', // the crossing height
    '4.5', // the offset pair and its vertical gap
    '5.4', // 113 / 21
]);

test('every decimal number in the lesson text is a verified value, in both languages', () => {
    const texts: Record<Language, string[]> = {sl: [], en: []};
    const collect = (value: unknown, language?: Language): void => {
        if (typeof value === 'string') { if (language) texts[language].push(value); }
        else if (Array.isArray(value)) value.forEach(item => collect(item, language));
        else if (value && typeof value === 'object') {
            for (const [key, item] of Object.entries(value)) collect(item, key === 'sl' || key === 'en' ? key : language);
        }
    };
    collect(lesson);
    for (const l of LANGUAGES) {
        const found = new Set<string>();
        for (const text of texts[l]) for (const match of text.matchAll(/-?\d+(?:\{,\}|\.)\d+/g)) found.add(match[0].replace('{,}', '.'));
        expect([...found].filter(value => !VERIFIED_DECIMALS.has(value)), l).toEqual([]);
        expect(found.size, l).toBeGreaterThanOrEqual(VERIFIED_DECIMALS.size);
    }
});

test('every whole number a step quotes in its own math is one of that step\'s verified readouts, in both languages', () => {
    const ALLOWED: Record<string, readonly string[]> = {
        'clipping-hulls': ['0'], 'clipping-fat-line': ['0'], 'clipping-clip-a': [], 'clipping-swap': [],
        'clipping-repeat': ['21', '17', '0'], 'clipping-tangent': ['53', '113', '21', '200', '28', '26', '1'], 'clipping-offset': ['17'], 'clipping-explore': ['3'],
    };
    for (const step of lesson.steps) {
        for (const l of LANGUAGES) {
            const quoted = [...prose(step, l).matchAll(/\\\((\d+)\\\)/g)].map(match => match[1]);
            expect(quoted.filter(n => !ALLOWED[step.id].includes(n)), `${step.id} ${l}`).toEqual([]);
        }
    }
    // The clip counts are the readouts of the scenes the text sits on (CONTRACT is checked against the live graph above).
    const countOf = (id: string) => CONTRACT.find(c => c.id === id)!.clips;
    for (const l of LANGUAGES) {
        // The 26 near the double root, the width 1 and the 5e-7 gap are the verified readouts of the numbers test above.
        expect(prose(stepOf('clipping-tangent'), l)).toContain('\\(26\\)');
        expect(prose(stepOf('clipping-tangent'), l)).toContain('\\(5\\cdot10^{-7}\\)');
        expect(prose(stepOf('clipping-repeat'), l)).toContain(`\\(${countOf('clipping-repeat')}\\)`);
        expect(prose(stepOf('clipping-tangent'), l)).toContain(`\\(${countOf('clipping-tangent')}\\)`);
        expect(prose(stepOf('clipping-offset'), l)).toContain(`\\(${countOf('clipping-offset')}\\)`);
    }
});
