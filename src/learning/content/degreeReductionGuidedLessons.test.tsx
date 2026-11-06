import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {LessonSession} from '../runtime/LessonSession';
import {degreeReductionGuidedLessons, REDUCTION_LESSON_ELEVATED, REDUCTION_LESSON_P, REDUCTION_LESSON_P2} from './degreeReductionGuidedLessons';
import type {LessonAction, LessonDefinition} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type DegreeReductionGraph from '../../graphs/curves/reduction/DegreeReductionGraph';
import {REDUCTION_ELEVATED_POINTS, REDUCTION_P2_POINTS, REDUCTION_P_POINTS} from '../../graphs/curves/reduction/DegreeReductionGraph';
import {setLanguage} from '../../localization';
import {formatNumber} from '../../analysis/format';
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
type Drawn = {elType: string; dataX?: number[]; dataY?: number[]; X?: () => number; Y?: () => number; plaintext?: string; evalVisProp: (name: string) => unknown};

const lesson = degreeReductionGuidedLessons.find(entry => entry.demonstrationId === 'reduction')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: Language) =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const num = (text: string, language: Language) => (language === 'sl' ? text.replace('.', '{,}') : text);

// ---- An independent evaluation of the reduction (no kernel code): sampling and Simpson integration --------------------------

type Pt = readonly [number, number];
const cubicAt = (b: readonly Pt[], t: number): Pt => {
    const w = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];
    return [0, 1].map(k => b.reduce((sum, p, i) => sum + w[i] * p[k], 0)) as unknown as Pt;
};
const quadraticAt = (q: readonly Pt[], t: number): Pt => {
    const w = [(1 - t) ** 2, 2 * (1 - t) * t, t * t];
    return [0, 1].map(k => q.reduce((sum, p, i) => sum + w[i] * p[k], 0)) as unknown as Pt;
};
const gap = (b: readonly Pt[], q: readonly Pt[], t: number) => {
    const u = cubicAt(b, t), v = quadraticAt(q, t);
    return Math.hypot(u[0] - v[0], u[1] - v[1]);
};
const sampledMax = (b: readonly Pt[], q: readonly Pt[]) => Math.max(...Array.from({length: 20001}, (_, i) => gap(b, q, i / 20000)));
const simpsonL2 = (b: readonly Pt[], q: readonly Pt[]) => {
    const n = 4000, h = 1 / n;
    let sum = 0;
    for (let i = 0; i <= n; i++) sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * gap(b, q, i * h) ** 2;
    return Math.sqrt(sum * h / 3);
};
const third = (b: readonly Pt[]): Pt => [b[3][0] - 3 * b[2][0] + 3 * b[1][0] - b[0][0], b[3][1] - 3 * b[2][1] + 3 * b[1][1] - b[0][1]];

/** Per step: points, mode, switches, the reduced quadratic the text describes, reducibility, and the numbers the readout shows (as strings, 4 and 6 decimals). */
const FIXED_P_Q: readonly Pt[] = [[0, 0], [2, 4.5], [4, 0]];
const FREE_P_Q: readonly Pt[] = [[-0.1, 0], [2, 4.5], [4.1, 0]];
const CONTRACT: ReadonlyArray<{
    id: string; points: readonly Pt[]; mode: 'fixed' | 'free'; quadratic: boolean; elevation: boolean; q: readonly Pt[]; reducible: boolean;
    third: Pt; max: string; l2: string; bound: string; quoted: readonly string[];
}> = [
    {id: 'reduction-elevated', points: REDUCTION_LESSON_ELEVATED, mode: 'fixed', quadratic: true, elevation: true, q: [[0, 0], [2, 4], [4, 0]], reducible: true,
        third: [0, 0], max: '0', l2: '0', bound: '0', quoted: ['(0;\\ 0)']},
    {id: 'reduction-predict', points: REDUCTION_LESSON_P, mode: 'fixed', quadratic: false, elevation: false, q: FIXED_P_Q, reducible: false,
        third: [-2, 0], max: '0.0962', l2: '0.069007', bound: '0.3333', quoted: ['(-2;\\ 0)']},
    {id: 'reduction-third-difference-step', points: REDUCTION_LESSON_P, mode: 'fixed', quadratic: true, elevation: false, q: FIXED_P_Q, reducible: false,
        third: [-2, 0], max: '0.0962', l2: '0.069007', bound: '0.3333', quoted: ['(-2;\\ 0)']},
    {id: 'reduction-fixed', points: REDUCTION_LESSON_P, mode: 'fixed', quadratic: true, elevation: true, q: FIXED_P_Q, reducible: false,
        third: [-2, 0], max: '0.0962', l2: '0.069007', bound: '0.3333', quoted: ['4.5', '0.0962', '0.069007']},
    {id: 'reduction-free', points: REDUCTION_LESSON_P, mode: 'free', quadratic: true, elevation: true, q: FREE_P_Q, reducible: false,
        third: [-2, 0], max: '0.1', l2: '0.037796', bound: '0.3', quoted: ['-0.1', '4.1', '4.5', '0.037796', '0.069007', '0.1', '0.0962']},
    {id: 'reduction-bound', points: REDUCTION_LESSON_P, mode: 'fixed', quadratic: true, elevation: true, q: FIXED_P_Q, reducible: false,
        third: [-2, 0], max: '0.0962', l2: '0.069007', bound: '0.3333', quoted: ['0.3333', '0.0962']},
    {id: 'reduction-explore', points: REDUCTION_LESSON_P2, mode: 'fixed', quadratic: true, elevation: true, q: [[0, 0], [2, 3], [4, 3]], reducible: false,
        third: [-2, 12], max: '0.5853', l2: '0.41975', bound: '2.0276', quoted: ['0.5853', '0.41975', '2.0276', '12']},
];

function mount() {
    const graph = createGraph('reduction');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as DegreeReductionGraph & {board: {objectsList: Drawn[]; update(): void; getBoundingBox(): number[]}}, mounted, capabilities, checkpoint,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type Mounted = ReturnType<typeof mount>;

const owned = (h: Mounted) => [...h.graph.reduction()!.ownedElements()] as unknown as Drawn[];
const visible = (h: Mounted, type: string) => owned(h).filter(e => e.elType === type && e.evalVisProp('visible')).length;
const rowsOf = (h: Mounted) => h.graph.controlRows()!;
const near = (actual: readonly (readonly number[])[], expected: readonly (readonly number[])[], tolerance = 1e-9, label = '') => {
    expect(actual, label).toHaveLength(expected.length);
    actual.forEach((row, i) => row.forEach((value, k) => expect(Math.abs(value - expected[i][k]), `${label} [${i}][${k}] ${value} vs ${expected[i][k]}`).toBeLessThan(tolerance)));
};

// ---- Lesson shape ---------------------------------------------------------------------------------------------------------

test('the lesson has seven steps with the contract order, both languages, a calculation frame per worked example and a scene each', () => {
    expect(lesson.steps.map(step => step.id)).toEqual(CONTRACT.map(c => c.id));
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
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
    expect(lesson.steps.map(step => step.workedExampleId).filter(Boolean)).toEqual(['reduction-third-difference-example', 'reduction-forrest-example']);
    // Board text under 40 characters: the scene strings are lesson prose, so the board itself only shows the graph's own captions.
});

test('the prose names the norm and constraints, says the optimum is never exact, and states the tolerance 10^-9', () => {
    const everything = (l: Language) => [lesson.summary[l], ...lesson.steps.map(step => step.explanation[l]), ...lesson.formulaBlocks.map(f => f.explanation[l] + f.notation[l])].join(' ');
    const sl = everything('sl'), en = everything('en');
    expect(sl).toContain('\\(L^2\\)');
    expect(en).toContain('\\(L^2\\)');
    expect(sl).toContain('nikoli točen');
    expect(en).toContain('never exact');
    expect(sl).toContain('\\(10^{-9}\\)');
    expect(en).toContain('\\(10^{-9}\\)');
    expect(sl).toContain('fiksnih krajiščih');
    expect(en).toContain('fixed end points');
    expect(sl).toContain('druga norma');
    expect(en).toContain('another norm');
    expect(en).toContain('only four decimals');
    // The last step quotes at most four decimals for the sampled maximum error.
    for (const l of LANGUAGES) expect(prose(stepOf('reduction-explore'), l)).not.toMatch(/\d{1,2}[.,]\d{5,}\D*maximum|največja napaka[^.]*\d[{,}.]\d{5,}/);
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

test('the lesson constants equal the graph constants', () => {
    expect(REDUCTION_LESSON_ELEVATED).toEqual(REDUCTION_ELEVATED_POINTS);
    expect(REDUCTION_LESSON_P).toEqual(REDUCTION_P_POINTS);
    expect(REDUCTION_LESSON_P2).toEqual(REDUCTION_P2_POINTS);
});

test('each scene sets the points, mode, switches, view and readouts the contract says, in one synchronous sequence', () => {
    const h = mount();
    try {
        for (const c of CONTRACT) {
            h.scene(stepOf(c.id));
            h.graph.board.update();
            const label = c.id;
            expect(h.graph.state, label).toMatchObject({reductionMode: c.mode, reductionShown: c.quadratic, reductionElevationShown: c.elevation});
            near(rowsOf(h), c.points.map(p => [...p]), 1e-12, `${label} points`);
            const result = h.graph.reduction()!.result()!;
            near(result.quadratic, c.q.map(p => [...p]), 1e-9, `${label} quadratic`);
            near([result.third], [[...c.third]], 1e-9, `${label} third`);
            expect(result.reducible, label).toBe(c.reducible);
            expect(formatNumber(result.maxError, 'en', 4), `${label} max`).toBe(c.max);
            expect(formatNumber(result.l2, 'en', 6), `${label} l2`).toBe(c.l2);
            expect(formatNumber(result.bound, 'en', 4), `${label} bound`).toBe(c.bound);
            // The objects themselves: the quadratic curve and its three points, the elevated curve and its four points.
            const curves = owned(h).filter(e => e.elType === 'curve');
            expect(curves, label).toHaveLength(2);
            expect(curves[0].evalVisProp('visible'), `${label} quadratic curve`).toBe(c.quadratic);
            expect(curves[1].evalVisProp('visible'), `${label} elevated curve`).toBe(c.elevation);
            expect(visible(h, 'point'), `${label} points`).toBe((c.quadratic ? 3 : 0) + (c.elevation ? 4 : 0));
            if (c.quadratic) expect(curves[0].dataX!.length, label).toBeGreaterThan(50);
            // The view goes through fitBoundingBox at the harness's 600 by 400 canvas, with the curves below the lesson panel.
            const expectedBox = fitBoundingBox([[-1.5, 9.5], [5.5, -1.5]], 600, 400)!;
            h.graph.board.getBoundingBox().forEach((edge, index) => expect(edge, `${label} box ${index}`).toBeCloseTo(expectedBox[index], 9));
            // The board shows only some of the readout lines; all five (third difference, reducibility, maximum error, L2, bound) are in
            // the readout text the live region speaks and the inspector lists, which is where the lesson sends the student.
            const lines = h.graph.reduction()!.readoutLines();
            expect(lines, label).toHaveLength(5);
            const captions = owned(h).filter(e => e.elType === 'text').map(e => e.plaintext ?? '').filter(Boolean);
            captions.forEach(caption => expect(lines, label).toContain(caption));
            expect(h.graph.reduction()!.readoutText(), label).toBe(lines.join(' '));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('the kernel values the scenes show agree with an independent sampling and Simpson integration', () => {
    const h = mount();
    try {
        for (const c of CONTRACT) {
            h.scene(stepOf(c.id));
            const r = h.graph.reduction()!.result()!;
            const cubic = c.points, q = r.quadratic.map(p => [p[0], p[1]] as Pt);
            expect(sampledMax(cubic, q), `${c.id} max`).toBeCloseTo(r.maxError, 4);
            expect(simpsonL2(cubic, q), `${c.id} l2`).toBeCloseTo(r.l2, 6);
            near([r.third], [[...third(cubic)]], 1e-12, `${c.id} third`);
            // The bound: the largest distance of corresponding control points of P and the elevated quadratic.
            const elevated: Pt[] = [q[0], [q[0][0] / 3 + 2 * q[1][0] / 3, q[0][1] / 3 + 2 * q[1][1] / 3], [2 * q[1][0] / 3 + q[2][0] / 3, 2 * q[1][1] / 3 + q[2][1] / 3], q[2]];
            const bound = Math.max(...cubic.map((p, i) => Math.hypot(p[0] - elevated[i][0], p[1] - elevated[i][1])));
            expect(r.bound, `${c.id} bound`).toBeCloseTo(bound, 9);
            expect(r.bound + 1e-12, `${c.id} bound is at least the error`).toBeGreaterThanOrEqual(sampledMax(cubic, q));
        }
    } finally {
        h.mounted.view.unmount();
    }
});

test('every number the steps quote is the live readout of its scene, in both languages', () => {
    const h = mount();
    try {
        for (const c of CONTRACT) {
            expect(c.quoted.length, `${c.id} quotes something`).toBeGreaterThan(0);
            h.scene(stepOf(c.id));
            h.graph.board.update();
            const lines = h.graph.reduction()!.readoutLines();
            expect(lines, c.id).toHaveLength(5);
            // The readout, as the board writes it in English: third difference, reducibility, maximum error, L2, bound.
            setLanguage('en');
            const en = h.graph.reduction()!.readoutLines().join(' ');
            setLanguage('sl');
            const r = h.graph.reduction()!.result()!;
            const minus = (text: string) => text.replace('-', '−');
            expect(en, c.id).toContain(minus(formatNumber(r.third[0], 'en', 4)));
            expect(en, c.id).toContain(`${c.max}`);
            expect(en, c.id).toContain(`${c.l2}`);
            expect(en, c.id).toContain(`${c.bound}`);
            for (const l of LANGUAGES) {
                const p = prose(stepOf(c.id), l);
                for (const q of c.quoted) expect(p, `${c.id} ${l} quotes ${q}`).toContain(num(q, l));
            }
        }
        // The rounding of the sampled maximum error: four decimals only, never the full sample.
        const fixed = CONTRACT.find(c => c.id === 'reduction-fixed')!;
        h.scene(stepOf(fixed.id));
        const exact = h.graph.reduction()!.result()!.maxError;
        expect(exact).toBeCloseTo(Math.sqrt(3) / 18, 4);
        expect(String(exact)).not.toBe('0.0962');
        for (const l of LANGUAGES) expect(prose(stepOf('reduction-fixed'), l)).not.toContain(num('0.09622', l));
    } finally {
        h.mounted.view.unmount();
    }
});

test('step 5 compares the modes: L2 smaller and the maximum error larger with free end points; step 4 matches Forrest\'s formula', () => {
    const h = mount();
    try {
        h.scene(stepOf('reduction-fixed'));
        const fixed = h.graph.reduction()!.result()!;
        h.scene(stepOf('reduction-free'));
        const free = h.graph.reduction()!.result()!;
        expect(free.l2).toBeLessThan(fixed.l2);
        expect(free.maxError).toBeGreaterThan(fixed.maxError);
        near(free.quadratic, [[-0.1, 0], [2, 4.5], [4.1, 0]], 1e-9, 'free quadratic');
        // Forrest's q1 = (3 (b1 + b2) - b0 - b3) / 4, from the points alone.
        const b = REDUCTION_LESSON_P;
        expect([(3 * (b[1][0] + b[2][0]) - b[0][0] - b[3][0]) / 4, (3 * (b[1][1] + b[2][1]) - b[0][1] - b[3][1]) / 4]).toEqual([2, 4.5]);
        expect(fixed.l2).toBeGreaterThan(0.0690065);
        expect(fixed.l2).toBeLessThan(0.0690066);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the first step is the only exactly reducible scene, with every error zero', () => {
    const h = mount();
    try {
        for (const step of lesson.steps) {
            h.scene(step);
            const r = h.graph.reduction()!.result()!;
            expect(r.reducible, step.id).toBe(step.id === 'reduction-elevated');
        }
        h.scene(stepOf('reduction-elevated'));
        const r = h.graph.reduction()!.result()!;
        expect(r.maxError).toBeLessThan(1e-12);
        expect(r.l2).toBeLessThan(1e-12);
        expect(r.bound).toBeLessThan(1e-12);
    } finally {
        h.mounted.view.unmount();
    }
});

type Live = {liveReadout: {getSnapshot(): string}};

test('the live region publishes third difference, L2 error and bound once the quiet period ends, and the lesson sends the student to the Tools panel', async () => {
    const h = mount();
    try {
        h.scene(stepOf('reduction-free'));
        h.graph.board.update();
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 1500)); });
        const published = (h.graph as unknown as Live).liveReadout.getSnapshot();
        for (const piece of ['−2', '0,1', '0,037796', '0,3']) expect(published, piece).toContain(piece);
        expect(published).toContain(h.graph.reduction()!.readoutLines()[3].replace(/\.$/, ''));
        for (const l of LANGUAGES) expect(prose(stepOf('reduction-third-difference-step'), l)).toContain(l === 'sl' ? 'Orodja' : 'Tools panel');
    } finally {
        h.mounted.view.unmount();
    }
});

// ---- Independence of scenes -----------------------------------------------------------------------------------------------

function snapshot(h: Mounted) {
    h.graph.board.update();
    const curves = owned(h).filter(e => e.elType === 'curve');
    return {
        state: {mode: h.graph.state.reductionMode, shown: h.graph.state.reductionShown, elevation: h.graph.state.reductionElevationShown},
        rows: rowsOf(h).map(r => [...r]), box: h.graph.board.getBoundingBox().map(v => Math.round(v * 1e9) / 1e9),
        readout: h.graph.reduction()!.readoutLines(), curvesVisible: curves.map(c => c.evalVisProp('visible')), points: visible(h, 'point'),
        dataX: curves.map(c => [...(c.dataX ?? [])].map(v => Math.round(v * 1e9) / 1e9)),
    };
}

test('a scene looks the same fresh, after any earlier scene, backward and by jump', () => {
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
    expect(fresh.size).toBe(7);
    const h = mount();
    try {
        const order = [...lesson.steps, ...[...lesson.steps].reverse(), lesson.steps[4], lesson.steps[1], lesson.steps[6], lesson.steps[0], lesson.steps[3], lesson.steps[2], lesson.steps[5]];
        for (const step of order) {
            // Without restoring the checkpoint: the scene's own actions must set everything it depends on.
            h.apply(...actionsOf(step));
            expect(snapshot(h), step.id).toEqual(fresh.get(step.id));
        }
        // A student drag between scenes does not leak either: after a drag the next scene sets all four points again.
        h.apply({kind: 'reduction-points', points: [[0, 0], [0, 5], [5, 5], [5, 0]]}, {kind: 'reduction-mode', mode: 'free'});
        h.apply(...actionsOf(stepOf('reduction-fixed')));
        expect(snapshot(h)).toEqual(fresh.get('reduction-fixed'));
    } finally {
        h.mounted.view.unmount();
    }
});

test('the switches are independent: hiding the quadratic keeps the elevated net, and the mode leaves the switches alone', () => {
    const h = mount();
    try {
        h.scene(stepOf('reduction-fixed'));
        h.apply({kind: 'curve-visibility', target: 'reduction-quadratic', visible: false});
        expect(visible(h, 'point')).toBe(4);
        h.apply({kind: 'reduction-mode', mode: 'free'});
        expect(visible(h, 'point')).toBe(4);
        expect(h.graph.state.reductionElevationShown).toBe(true);
    } finally {
        h.mounted.view.unmount();
    }
});

test('missing or malformed scene data fails: a wrong point count or a non-finite point is rejected', () => {
    const h = mount();
    try {
        expect(() => h.graph.setControlPoints([[0, 0], [1, 1], [2, 2]] as never)).toThrow();
        expect(() => h.graph.setControlPoints([[0, 0], [1, 1], [2, 2], [3, NaN]] as never)).toThrow();
        expect(() => h.graph.setReductionMode('both' as never)).toThrow();
        // A scene that lost its actions would leave the opening state; the contract rejects that.
        for (const step of lesson.steps) {
            const kinds = actionsOf(step).map(a => a.kind);
            expect(kinds, step.id).toEqual(expect.arrayContaining(['reduction-points', 'reduction-mode', 'curve-visibility']));
            expect(kinds.filter(kind => kind === 'curve-visibility'), step.id).toHaveLength(2);
        }
    } finally {
        h.mounted.view.unmount();
    }
});

// ---- Session ----------------------------------------------------------------------------------------------------------------

/** The lesson is not wired yet, so the session runs on a definition adapted here from the step scenes only. */
const definition = (): LessonDefinition => ({
    id: 'reduction-guided', demonstrationId: 'reduction', title: lesson.title, summary: lesson.summary,
    steps: lesson.steps.map(step => ({
        id: step.id, title: step.title, body: step.explanation, notation: [], prompt: step.observationPrompt,
        scene: {actions: actionsOf(step)},
    })),
});

test('a real session walks the steps, goes back, and closing returns state, control points, view and the one overlay to the opening state', () => {
    const h = mount();
    try {
        const objects = () => h.graph.board.objectsList as ReadonlyArray<Drawn & {labels?: readonly unknown[]}>;
        const withoutTickLabels = () => {
            const labels = new Set(objects().filter(object => object.elType === 'ticks').flatMap(ticks => ticks.labels ?? []));
            return objects().filter(object => !labels.has(object)).length;
        };
        const state = {...h.graph.state};
        const count = withoutTickLabels();
        const box = h.graph.board.getBoundingBox();
        const original = rowsOf(h).map(r => [...r]);
        const before = [...h.graph.reduction()!.ownedElements()];

        const session = new LessonSession(definition(), h.capabilities);
        act(() => session.start());
        const target = lesson.steps.findIndex(step => step.id === 'reduction-free');
        for (let guard = 0; session.snapshot().stepIndex < target && guard < 40; guard++) act(() => session.next());
        expect(session.snapshot().stepIndex).toBe(target);
        expect(h.graph.state.reductionMode).toBe('free');
        near(rowsOf(h), REDUCTION_LESSON_P.map(p => [...p]), 1e-12, 'during the lesson');
        // Back one step: the fixed-end-point scene again.
        for (let guard = 0; session.snapshot().stepIndex >= target && guard < 40; guard++) act(() => session.back());
        expect(session.snapshot().stepIndex).toBe(target - 1);
        expect(h.graph.state.reductionMode).toBe('fixed');
        const during = [...(h.graph.reduction()?.ownedElements() ?? [])];

        act(() => session.close());
        h.graph.board.update();
        expect(h.graph.state).toMatchObject(state);
        near(rowsOf(h), original, 1e-12, 'after close');
        h.graph.board.getBoundingBox().forEach((edge, index) => expect(edge).toBeCloseTo(box[index], 9));
        expect(withoutTickLabels()).toBe(count);
        const after = [...h.graph.reduction()!.ownedElements()];
        expect(after).toHaveLength(before.length);
        after.forEach(element => expect(objects().includes(element as unknown as Drawn)).toBe(true));
        [...before, ...during].filter(element => !after.includes(element)).forEach(element => expect(objects().includes(element as unknown as Drawn)).toBe(false));
    } finally {
        h.mounted.view.unmount();
    }
});
