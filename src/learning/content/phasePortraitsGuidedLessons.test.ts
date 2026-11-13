/**
 * PP4 and PP5 (phase portraits, batch C): every scene lands in the state and readouts the text states (the real logistic-map graph, scenes applied in one synchronous `act` from a
 * restored checkpoint, out of order and twice). The mathematics is recomputed here independently of `src/dynamics`: the orbit, the fixed point and its multiplier 2 - r, the 2-cycle
 * and its multiplier 4 + 2r - r^2, the period (smallest p up to 64 with f^p(x) = x to 1e-9 after a long burn-in), the doubling points r3 and r4 (two-dimensional Newton on
 * f^p(x) = x and (f^p)'(x) = -1) and the diagram column (400 columns from 2,5 to 4). The numbers each step quotes are generated from those values and looked up in the sl
 * (decimal comma) and en (decimal point) prose of the step; the learner actions the text asks for are applied and the readouts checked.
 */
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {act, cleanup, fireEvent, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {bifurcationLesson, linearSystemLesson, logisticMapLesson, pendulumLesson, PP1_CENTRE, PP1_FOUR_SEEDS, PP1_NEAR_CENTRE, PP1_NODE, PP1_ON_FAST_LINE, PP1_FREE, PP1_UNSTABLE, PP2_FREE, PP2_LARGE, PP2_LINEAR_CENTRE, PP2_ROTATION, PP2_SMALL} from './phasePortraitsGuidedLessons';
import {phasePortraitsChapter} from './phasePortraitsChapter';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import LogisticMapGraph from '../../graphs/dynamics/LogisticMapGraph';
import PhasePortraitGraph from '../../graphs/dynamics/PhasePortraitGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- the independent mathematics --------------------------------------------------------------------------------------------------------

const f = (r: number, x: number) => r * x * (1 - x);
const orbit = (r: number, x0: number, n: number) => { let x = x0; for (let i = 0; i < n; i += 1) x = f(r, x); return x; };
/** f^p and its derivative in x at x (chain rule). */
const iterate = (r: number, x: number, p: number) => { let v = x; let d = 1; for (let i = 0; i < p; i += 1) { d *= r * (1 - 2 * v); v = f(r, v); } return {v, d}; };
const fixedPoint = (r: number) => 1 - 1 / r;
const fixedMultiplier = (r: number) => 2 - r;
const twoCycle = (r: number): [number, number] => { const s = Math.sqrt((r + 1) * (r - 3)); return [(r + 1 - s) / (2 * r), (r + 1 + s) / (2 * r)]; };
const cycleMultiplier = (r: number) => 4 + 2 * r - r * r;
const ONSET = 3.56995;
/** Smallest p up to 64 with f^p(x) = x to 1e-9 on the long-run orbit; null above the onset (the graph makes no claim there), 'none' when no p is found. */
function periodOf(r: number, x0: number): number | 'none' | null {
    if (r > ONSET) return null;
    const x = orbit(r, x0, 300000);
    for (let p = 1; p <= 64; p += 1) if (Math.abs(iterate(r, x, p).v - x) < 1e-9) return p;
    return 'none';
}
/** The doubling point of the cycle of period p: Newton on (r, x) for f^p(x) = x, (f^p)'(x) = -1, from a long-run orbit point at r0. */
function doublingPoint(p: number, r0: number): number {
    let r = r0;
    let x = orbit(r, 0.2, 200000);
    const g = (rr: number, xx: number) => { const it = iterate(rr, xx, p); return [it.v - xx, it.d + 1]; };
    for (let k = 0; k < 60; k += 1) {
        const h = 1e-7;
        const [a, b] = g(r, x);
        const [ar, br] = [(g(r + h, x)[0] - g(r - h, x)[0]) / (2 * h), (g(r + h, x)[1] - g(r - h, x)[1]) / (2 * h)];
        const [ax, bx] = [(g(r, x + h)[0] - g(r, x - h)[0]) / (2 * h), (g(r, x + h)[1] - g(r, x - h)[1]) / (2 * h)];
        const det = ar * bx - ax * br;
        const dr = (a * bx - ax * b) / det;
        const dx = (ar * b - a * br) / det;
        r -= dr;
        x -= dx;
        if (Math.abs(dr) + Math.abs(dx) < 1e-14) break;
    }
    return r;
}
/** The diagram column nearest to r: 400 columns from 2,5 to 4; 0-based index and its r. */
const column = (r: number) => { const index = Math.round(((r - 2.5) / 1.5) * 399); return {index, r: 2.5 + (index * 1.5) / 399}; };

const R2 = 1 + Math.sqrt(6);
const R3 = doublingPoint(4, 3.54);
const R4 = doublingPoint(8, 3.56);

// ---- formats ------------------------------------------------------------------------------------------------------------------------------

type Language = 'sl' | 'en';
/** A value rounded to `digits` decimals, trailing zeros dropped, the decimal sign of the language. */
const q = (value: number, digits: number, language: Language) => { const s = String(Number(value.toFixed(digits))); return language === 'sl' ? s.replace('.', ',') : s; };
const prose = (text: string) => text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,/])${escapeRegExp(value)}(?![0-9]|[.,/][0-9])`).test(prose(text));
/** The quote with trailing zeros dropped or kept (`3,449490` is written with all six decimals in the prose). */
const hasQuote = (text: string, value: number, digits: number, language: Language) =>
    hasNumber(text, q(value, digits, language)) || hasNumber(text, language === 'sl' ? value.toFixed(digits).replace('.', ',') : value.toFixed(digits));
const numbersIn = (text: string | null) => [...(text ?? '').replace(/−/g, '-').matchAll(/-?\d+(?:[.,]\d+)?/g)].map(match => Number(match[0].replace(',', '.')));

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const lessons: Record<string, GuidedLesson> = {pp4: logisticMapLesson, pp5: bifurcationLesson};

function mountLogistic() {
    const graph = createGraph('logistic-map');
    if (!(graph instanceof LogisticMapGraph)) throw new Error('logistic-map must be the logistic-map graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const actionsOf = (stepId: string) => sceneActions(allSteps().find(step => step.id === stepId)!.scene!);
    const scene = (stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of actionsOf(stepId)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
type Mounted = ReturnType<typeof mountLogistic>;
const allSteps = () => [...logisticMapLesson.steps, ...bifurcationLesson.steps];
const stepOf = (id: string) => allSteps().find(step => step.id === id)!;
const setR = (R: number): LessonAction => ({kind: 'phase', operation: 'set-r', R});
const setSeed = (X: number): LessonAction => ({kind: 'phase', operation: 'set-seed', X});
const setStep = (step: number): LessonAction => ({kind: 'phase', operation: 'set-step', step});

/** The scene of each step: r, start and drawn steps (the scene constants of the lesson file are what the actions set; the state is checked below). */
const SCENES: Record<string, {R: number; X: number; step: number}> = {
    'pp4-settles': {R: 290, X: 20, step: 20},
    'pp4-neutral': {R: 300, X: 20, step: 20},
    'pp4-two-cycle': {R: 310, X: 20, step: 59},
    'pp4-four-cycle': {R: 350, X: 20, step: 56},
    'pp4-eight-cycle': {R: 355, X: 20, step: 52},
    'pp4-chaos': {R: 400, X: 20, step: 5},
    'pp4-free': {R: 350, X: 20, step: 0},
    'pp5-branch': {R: 290, X: 20, step: 0},
    'pp5-first-split': {R: 300, X: 20, step: 0},
    'pp5-faster': {R: 345, X: 20, step: 0},
    'pp5-window': {R: 383, X: 20, step: 54},
    'pp5-free': {R: 390, X: 20, step: 0},
};
const stepIds = Object.keys(SCENES);

/** The readouts of the current state as the independent recomputation gives them (language-independent numbers, compared within the graph's rounding). */
function checkReadouts(language: Language, id: string, state: {R: number; X: number; step: number}) {
    const r = state.R / 100;
    const x0 = state.X / 100;
    const within = (what: string, actual: number | undefined, expected: number, tolerance: number) => expect({id, what, ok: actual !== undefined && Math.abs(actual - expected) <= tolerance}).toEqual({id, what, ok: true});
    within('r', numbersIn(readout('r'))[0], r, 5e-3);
    within('x0', numbersIn(readout('x0'))[0], x0, 5e-3);
    within('iterate', numbersIn(readout('iterate')).slice(-1)[0], orbit(r, x0, state.step), 5e-7);
    within('fixed', numbersIn(readout('fixed')).slice(-1)[0], fixedPoint(r), 5e-7);
    within('fixed-multiplier', numbersIn(readout('fixed-multiplier')).slice(-1)[0], fixedMultiplier(r), 5e-5);
    if (r > 3) {
        const [a, b] = twoCycle(r);
        const [shownA, shownB] = numbersIn(readout('cycle'));
        within('cycle a', shownA, a, 5e-7);
        within('cycle b', shownB, b, 5e-7);
        within('cycle-multiplier', numbersIn(readout('cycle-multiplier')).slice(-1)[0], cycleMultiplier(r), 5e-5);
    } else {
        expect({id, cycle: readout('cycle')}).toEqual({id, cycle: t('phase_graph_logistic_cycle_none')});
    }
    const period = periodOf(r, x0);
    const shown = readout('period') ?? '';
    if (typeof period === 'number') expect({id, period: shown}).toEqual({id, period: t('phase_graph_logistic_period_value', {value0: String(period)})});
    else if (period === 'none') expect({id, period: shown}).toEqual({id, period: t('phase_graph_logistic_period_none_value', {value0: '64'})});
    else expect({id, claimless: shown.startsWith(t('phase_graph_logistic_period_claimless_value', {value0: q(ONSET, 5, language)}).split(' ')[0])}).toEqual({id, claimless: true});
    const col = column(r);
    within('column', numbersIn(readout('column'))[0], col.r, 5e-5);
    expect({id, column: numbersIn(readout('column')).slice(1, 3)}).toEqual({id, column: [col.index + 1, 400]});
    void language;
}

for (const language of ['sl', 'en'] as const) {
    test(`${language}: every scene lands in the state, readouts and period the independent recomputation gives, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
        setLanguage(language);
        const m = mountLogistic();
        try {
            for (const id of [...stepIds, ...stepIds.slice().reverse()]) {
                m.scene(id, 2);
                expect({id, state: {R: m.graph.state.R, X: m.graph.state.X, step: m.graph.state.step}}).toEqual({id, state: SCENES[id]});
                checkReadouts(language, id, SCENES[id]);
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    });
}

// ---- the recomputed mathematics ---------------------------------------------------------------------------------------------------------------

test('the independent recomputation: fixed point, 2-cycle and multipliers, the doubling points r2, r3, r4, the gaps and ratios, the orbit values quoted', () => {
    expect(fixedPoint(2.9)).toBeCloseTo(0.6551724, 6);
    expect(fixedMultiplier(2.9)).toBeCloseTo(-0.9, 12);
    expect(fixedPoint(3.1)).toBeCloseTo(0.677419, 6);
    const [a, b] = twoCycle(3.1);
    expect([a, b].map(v => v.toFixed(6))).toEqual(['0.558014', '0.764567']);
    expect(f(3.1, a)).toBeCloseTo(b, 12);
    expect(f(3.1, b)).toBeCloseTo(a, 12);
    expect(cycleMultiplier(3.1)).toBeCloseTo(0.59, 12);
    // the 2-cycle multiplier is the product of the two derivatives, and it is -1 exactly at 1 + sqrt 6
    expect(3.1 * (1 - 2 * a) * 3.1 * (1 - 2 * b)).toBeCloseTo(0.59, 12);
    expect(cycleMultiplier(R2)).toBeCloseTo(-1, 12);
    expect(R2.toFixed(6)).toBe('3.449490');
    expect(R3.toFixed(6)).toBe('3.544090');
    expect(R4.toFixed(6)).toBe('3.564407');
    const gaps = [R2 - 3, R3 - R2, R4 - R3];
    expect(gaps.map(v => v.toFixed(6))).toEqual(['0.449490', '0.094601', '0.020317']);
    expect([gaps[0] / gaps[1], gaps[1] / gaps[2]].map(v => v.toFixed(2))).toEqual(['4.75', '4.66']);
    expect(R4).toBeLessThan(ONSET);
    // the orbit values the lessons quote
    const quoted: [number, number, number, string][] = [
        [2.9, 0.2, 20, '0.663830'], [2.9, 0.2, 60, '0.655302'], [3, 0.2, 20, '0.709631'], [3, 0.2, 60, '0.694147'],
        [3.1, 0.2, 59, '0.558014'], [3.1, 0.2, 60, '0.764567'], [3.5, 0.2, 56, '0.826941'], [3.5, 0.2, 57, '0.500884'], [3.5, 0.2, 58, '0.874997'], [3.5, 0.2, 59, '0.382820'],
        [3.5, 0.2, 60, '0.826941'], [3.55, 0.2, 52, '0.812682'], [3.55, 0.2, 60, '0.812668'], [4, 0.2, 5, '0.585421'], [4, 0.21, 5, '0.209062'], [4, 0.2, 1, '0.640000'],
        [4, 0.21, 1, '0.663600'], [4, 0.2, 2, '0.921600'], [4, 0.21, 2, '0.892940'], [4, 0.2, 8, '0.401974'], [4, 0.21, 8, '0.373450'],
        [3.83, 0.2, 54, '0.504667'], [3.83, 0.2, 55, '0.957417'], [3.83, 0.2, 56, '0.156149'], [3.83, 0.8, 60, '0.504667'], [3.82, 0.2, 57, '0.862600'], [3.82, 0.2, 60, '0.193532'],
    ];
    for (const [r, x0, n, value] of quoted) expect({r, x0, n, value: orbit(r, x0, n).toFixed(6)}).toEqual({r, x0, n, value});
    // the period readouts the lesson quotes: 4 at 3,54; 8 at 3,55 and 3,56; no claim at 3,57; 16 begins at r4, between the grid points 3,56 and 3,57
    expect([3.54, 3.55, 3.56, 3.57].map(r => periodOf(r, 0.2))).toEqual([4, 8, 8, null]);
    expect(R4 > 3.56 && R4 < 3.57).toBe(true);
    for (let R = 250; R <= 357; R += 1) expect({R, sixteen: periodOf(R / 100, 0.2) === 16}).toEqual({R, sixteen: false});
    expect(periodOf(3.1, 0.2)).toBe(2);
    expect(periodOf(3, 0.2)).toBe('none');
    expect(periodOf(2.9, 0.2)).toBe(1);
    expect(periodOf(3.44, 0.2)).toBe(2);
    expect(periodOf(3.45, 0.2)).toBe(4);
    expect(periodOf(3.5, 0.2)).toBe(4);
    expect(cycleMultiplier(3.44).toFixed(4)).toBe('-0.9536');
    expect(cycleMultiplier(3.45).toFixed(4)).toBe('-1.0025');
    expect(cycleMultiplier(3.46).toFixed(4)).toBe('-1.0516');
    expect(cycleMultiplier(3.5)).toBeCloseTo(-1.25, 12);
    expect([column(2.9), column(3), column(3.1), column(3.44), column(3.45), column(3.9)].map(c => c.r.toFixed(4))).toEqual(['2.8985', '3.0000', '3.1015', '3.4398', '3.4511', '3.8985']);
    expect(column(2.9).index + 1).toBe(107);
    // r = 4: the starts 0,2 and 0,21 differ by about 0,38 after five steps (and by more than 0,37, as the chapter says)
    expect(Math.abs(orbit(4, 0.2, 5) - orbit(4, 0.21, 5))).toBeGreaterThan(0.37);
    expect(Math.abs(orbit(4, 0.2, 5) - orbit(4, 0.21, 5)).toFixed(2)).toBe('0.38');
    expect(fixedMultiplier(4)).toBe(-2);
    expect(cycleMultiplier(4)).toBe(-4);
    // at 3,55 the values at the steps 52 and 60 differ by about 1,4 10^-5
    expect((Math.abs(orbit(3.55, 0.2, 52) - orbit(3.55, 0.2, 60)) * 1e5).toFixed(1)).toBe('1.4');
});

// ---- the learner actions ------------------------------------------------------------------------------------------------------------------

test('the learner actions the text asks for give the quoted readouts: Next step to 60, the r typed, the start typed (the step is kept), Reset, the r values of the free steps', () => {
    const m = mountLogistic();
    try {
        const iterateNow = () => numbersIn(readout('iterate')).slice(-1)[0];
        const check = (what: string, value: number, expected: number) => expect({what, ok: Math.abs(value - expected) < 5e-7}).toEqual({what, ok: true});
        // PP4 step 1 and 2: Next step up to 60
        m.scene('pp4-settles');
        m.learner(setStep(60));
        check('x60 at 2,9', iterateNow(), orbit(2.9, 0.2, 60));
        m.scene('pp4-neutral');
        m.learner(setStep(60));
        check('x60 at 3', iterateNow(), orbit(3, 0.2, 60));
        // step 3: one more Next step from 59
        m.scene('pp4-two-cycle');
        m.learner(setStep(60));
        check('x60 at 3,1', iterateNow(), twoCycle(3.1)[1]);
        // step 4: x57 to x60, then r typed 3,46
        m.scene('pp4-four-cycle');
        for (let n = 57; n <= 60; n += 1) { m.learner(setStep(n)); check(`x${n} at 3,5`, iterateNow(), orbit(3.5, 0.2, n)); }
        m.learner(setR(346));
        expect(m.graph.state.step).toBe(60);
        check('multiplier at 3,46', numbersIn(readout('cycle-multiplier')).slice(-1)[0], -1.0516);
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: '4'}));
        // step 5: r typed 3,54, 3,55, 3,57
        m.scene('pp4-eight-cycle');
        for (const [R, period] of [[354, 4], [355, 8], [356, 8]] as const) { m.learner(setR(R)); expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: String(period)})); }
        m.learner(setR(357));
        expect(readout('period')).toContain(t('phase_graph_logistic_period_claimless_value', {value0: '3,56995'}).split(' ')[0]);
        expect(readout('note')).not.toBeNull();
        m.scene('pp4-eight-cycle');
        m.learner(setStep(60));
        check('x60 at 3,55', iterateNow(), orbit(3.55, 0.2, 60));
        // step 6: x5 for 0,2, the start 0,21 typed (the step stays 5), Reset, Next step twice, the start 0,2 typed again
        m.scene('pp4-chaos');
        check('x5, start 0,2', iterateNow(), orbit(4, 0.2, 5));
        m.learner(setSeed(21));
        expect(m.graph.state.step).toBe(5);
        check('x5, start 0,21', iterateNow(), orbit(4, 0.21, 5));
        m.learner(setStep(0));
        for (const n of [1, 2]) { m.learner(setStep(n)); check(`x${n}, start 0,21`, iterateNow(), orbit(4, 0.21, n)); }
        m.learner(setSeed(20));
        expect(m.graph.state.step).toBe(2);
        check('x2, start 0,2', iterateNow(), orbit(4, 0.2, 2));
        m.learner(setStep(1));
        check('x1, start 0,2', iterateNow(), orbit(4, 0.2, 1));
        m.learner(setStep(8));
        check('x8, start 0,2', iterateNow(), orbit(4, 0.2, 8));
        m.learner(setSeed(21));
        check('x8, start 0,21', iterateNow(), orbit(4, 0.21, 8));
        // PP5 step 2: r typed 3,1; step 3: 3,44 and 3,45; step 4: Next step six times from 54, the start 0,8, r = 3,82 and the start 0,2
        m.scene('pp5-first-split');
        m.learner(setR(310));
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: '2'}));
        expect(numbersIn(readout('column'))[0]).toBeCloseTo(3.1015, 4);
        m.scene('pp5-faster');
        m.learner(setR(344));
        check('multiplier at 3,44', numbersIn(readout('cycle-multiplier')).slice(-1)[0], cycleMultiplier(3.44));
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: '2'}));
        m.learner(setR(345));
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: '4'}));
        m.scene('pp5-window');
        for (let n = 54; n <= 60; n += 1) { m.learner(setStep(n)); check(`x${n} at 3,83`, iterateNow(), orbit(3.83, 0.2, n)); }
        m.learner(setSeed(80));
        check('x60 at 3,83, start 0,8', iterateNow(), orbit(3.83, 0.8, 60));
        m.learner(setR(382), setSeed(20));
        check('x60 at 3,82', iterateNow(), orbit(3.82, 0.2, 60));
        m.learner(setStep(57));
        check('x57 at 3,82', iterateNow(), orbit(3.82, 0.2, 57));
        // PP5 step 5: r = 3,5 (period 4) and 3,9 (no claim, column 3,8985)
        m.scene('pp5-free');
        expect(numbersIn(readout('column'))[0]).toBeCloseTo(3.8985, 4);
        m.learner(setR(350));
        expect(readout('period')).toBe(t('phase_graph_logistic_period_value', {value0: '4'}));
        m.restore();
        expect(JSON.stringify(m.graph.state)).toBe(m.free);
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- the text ---------------------------------------------------------------------------------------------------------------------------------

describe('the numbers each step quotes are those of its scene, in sl and en', () => {
    const stepTexts = (id: string, language: Language) => {
        const lesson = id.startsWith('pp4') ? logisticMapLesson : bifurcationLesson;
        const step = stepOf(id);
        const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
        return {
            scene: step.scene!.expectedState[language],
            all: [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language],
                ...examples.map(example => example.check?.[language] ?? '')].join(' '),
        };
    };
    /** The numbers each step must quote, from the recomputation: [value, decimals]. */
    const quotes = (id: string): readonly (readonly [number, number])[] => {
        const six = (value: number) => [value, 6] as const;
        const o = (r: number, x0: number, n: number) => six(orbit(r, x0, n));
        switch (id) {
            case 'pp4-settles': return [o(2.9, 0.2, 20), o(2.9, 0.2, 60), six(fixedPoint(2.9)), [fixedMultiplier(2.9), 1]];
            case 'pp4-neutral': return [o(3, 0.2, 20), o(3, 0.2, 60), six(fixedPoint(3)), [fixedMultiplier(3), 0]];
            case 'pp4-two-cycle': return [o(3.1, 0.2, 59), o(3.1, 0.2, 60), six(twoCycle(3.1)[0]), six(twoCycle(3.1)[1]), six(fixedPoint(3.1)), [cycleMultiplier(3.1), 2], [fixedMultiplier(3.1), 1]];
            case 'pp4-four-cycle': return [o(3.5, 0.2, 56), o(3.5, 0.2, 57), o(3.5, 0.2, 58), o(3.5, 0.2, 59), o(3.5, 0.2, 60), [cycleMultiplier(3.5), 2], [cycleMultiplier(3.46), 4], [R2, 6]];
            case 'pp4-eight-cycle': return [o(3.55, 0.2, 52), o(3.55, 0.2, 60), [(orbit(3.55, 0.2, 52) - orbit(3.55, 0.2, 60)) * 1e5, 1], [ONSET, 5]];
            case 'pp4-chaos': return [o(4, 0.2, 5), o(4, 0.21, 5), o(4, 0.2, 1), o(4, 0.21, 1), o(4, 0.2, 2), o(4, 0.21, 2), o(4, 0.2, 8), o(4, 0.21, 8), [Math.abs(orbit(4, 0.2, 5) - orbit(4, 0.21, 5)), 2],
                [fixedMultiplier(4), 0], [cycleMultiplier(4), 0], [ONSET, 5]];
            case 'pp4-free': return [[R4, 6], [3.55, 2], [3.56, 2], [3.57, 2], [8, 0], [16, 0]];
            case 'pp5-branch': return [six(fixedPoint(2.9)), [column(2.9).r, 4], [column(2.9).index + 1, 0], [400, 0]];
            case 'pp5-first-split': return [[fixedMultiplier(3), 0], [column(3).r, 0], [64, 0], six(twoCycle(3.1)[0]), six(twoCycle(3.1)[1]), [column(3.1).r, 4]];
            case 'pp5-faster': return [[R2, 6], [cycleMultiplier(3.44), 4], [column(3.44).r, 4], [cycleMultiplier(3.45), 4], [column(3.45).r, 4], [R3, 6], [R4, 6],
                [(R2 - 3) / (R3 - R2), 2], [(R3 - R2) / (R4 - R3), 2]];
            case 'pp5-window': return [o(3.83, 0.2, 54), o(3.83, 0.2, 55), o(3.83, 0.2, 56), o(3.83, 0.8, 60), [orbit(3.82, 0.2, 57), 4], o(3.82, 0.2, 60), [ONSET, 5]];
            case 'pp5-free': return [[column(3.9).r, 4], [3.9, 1]];
            default: throw new Error(`no quotes for ${id}`);
        }
    };
    for (const language of ['sl', 'en'] as const) {
        test(`${language}: the numbers of each scene, recomputed, appear in the text of its step (scene line, or the whole step)`, () => {
            for (const id of stepIds) {
                const {all} = stepTexts(id, language);
                for (const [value, digits] of quotes(id)) expect({id, quote: q(value, digits, language), found: hasQuote(all, value, digits, language)}).toEqual({id, quote: q(value, digits, language), found: true});
            }
            // the scene lines of the steps with a drawn orbit quote the readout of the last drawn step
            for (const id of ['pp4-settles', 'pp4-neutral', 'pp4-two-cycle', 'pp4-four-cycle', 'pp4-eight-cycle', 'pp4-chaos', 'pp5-window']) {
                const {R, X, step} = SCENES[id];
                expect({id, found: hasQuote(stepTexts(id, language).scene, orbit(R / 100, X / 100, step), 6, language)}).toEqual({id, found: true});
            }
        });
    }

    test('the quoted period of the free step: 8 at 3,55 and 3,56, no claim at 3,57, the largest grid r with a number is 3,56, and the text no longer asks for a period 16 on the grid', () => {
        for (const language of ['sl', 'en'] as const) {
            const {all} = stepTexts('pp4-free', language);
            for (const r of [3.55, 3.56, 3.57]) expect(hasNumber(all, q(r, 2, language))).toBe(true);
            expect(hasNumber(all, '8')).toBe(true);
            expect(hasNumber(all, '16')).toBe(true);
            expect(all).not.toMatch(language === 'sl' ? /najmanjši \\\\?\(?r/ : /smallest \\\(r/);
        }
        const largest = Math.max(...Array.from({length: 108}, (_, i) => 250 + i).filter(R => typeof periodOf(R / 100, 0.2) === 'number'));
        expect(largest).toBe(356);
    });

    test('the terms of the cycles are used consistently and no single backslash is left in the lesson and chapter prose', () => {
        const everything = JSON.stringify([logisticMapLesson, bifurcationLesson]);
        expect(everything).not.toMatch(/\d-cikel|štiri-|osem-cikel|\\\\\(\d\\\\\)-cikel/);
        // the sources: a backslash before a parenthesis, bracket or letter must be doubled (String.raw lines excepted)
        const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
        for (const file of ['src/learning/content/phasePortraitsGuidedLessons.ts', 'src/learning/content/phasePortraitsChapter.ts']) {
            const lines = readFileSync(resolve(repoRoot, file), 'utf8').split('\n').filter(line => !line.includes('String.raw'));
            for (const [index, line] of lines.entries()) expect({file, line: index, single: /(?<!\\)\\[()[\]a-zA-Z]/.test(line.replace(/\\\\/g, '@@'))}).toEqual({file, line: index, single: false});
        }
    });

    test('the worked examples compute the same numbers as the recomputation', () => {
        const two = logisticMapLesson.workedExamples![0];
        const [a, b] = twoCycle(3.1);
        expect(two.resultLatex).toBe(`x_1\\approx${q(a, 6, 'sl')},\\quad x_2\\approx${q(b, 6, 'sl')},\\quad m=${q(cycleMultiplier(3.1), 2, 'sl')}`.replace(/(\d),(\d)/g, '$1{,}$2'));
        expect(two.calculationLatex).toContain(`${q(Math.sqrt((3.1 + 1) * (3.1 - 3)), 7, 'sl').replace(',', '{,}')}`);
        // the doubling formula block quotes the ratios, the cited limit and the computed r3, r4 as approximate
        const doublings = bifurcationLesson.formulaBlocks.find(block => block.id === 'logistic-doublings')!;
        for (const language of ['sl', 'en'] as const) {
            const explanation = doublings.explanation[language];
            for (const [value, digits] of [[(R2 - 3) / (R3 - R2), 2], [(R3 - R2) / (R4 - R3), 2], [4.669, 3]] as const) expect({value, found: hasQuote(explanation, value, digits, language)}).toEqual({value, found: true});
        }
        const ratios = bifurcationLesson.workedExamples![0];
        const text = (language: Language) => `${ratios.calculationLatex} ${ratios.resultLatex} ${ratios.check![language]}`;
        for (const language of ['sl', 'en'] as const) {
            for (const [value, digits] of [[R2 - 3, 6], [R3 - R2, 6], [R4 - R3, 6], [R3, 6], [R4, 6], [R2, 6]] as const) expect({value, found: hasQuote(text(language).replace(/\{,\}/g, language === 'sl' ? ',' : '.'), value, digits, language)}).toEqual({value, found: true});
        }
        expect(ratios.resultLatex).toContain(`${q((R2 - 3) / (R3 - R2), 2, 'sl').replace(',', '{,}')}`);
        expect(ratios.resultLatex).toContain(`${q((R3 - R2) / (R4 - R3), 2, 'sl').replace(',', '{,}')}`);
    });

    test('the chapter prose quotes the numbers the recomputation gives', () => {
        const sections = phasePortraitsChapter.sections;
        const prosePart = (index: number, language: Language) => [...sections[index].paragraphs, ...Object.values(sections[index].investigationPrompts ?? {})].map(paragraph => paragraph[language]).join(' ');
        const [pp4, pp5] = [0, 1];
        for (const language of ['sl', 'en'] as const) {
            const first = prosePart(pp4, language);
            const second = prosePart(pp5, language);
            const quoted: [string, number, number][] = [['pp4', fixedPoint(2.9), 6], ['pp4', fixedMultiplier(2.9), 1], ['pp4', fixedMultiplier(3.1), 1], ['pp4', twoCycle(3.1)[0], 6], ['pp4', twoCycle(3.1)[1], 6],
                ['pp4', cycleMultiplier(3.1), 2], ['pp4', 0.37, 2],
                ['pp5', cycleMultiplier(3.44), 4], ['pp5', cycleMultiplier(3.45), 4], ['pp5', R2, 3], ['pp5', R3, 3], ['pp5', R4, 3], ['pp5', ONSET, 5], ['pp5', 4.669, 3],
                ['pp5', orbit(3.83, 0.2, 54), 4], ['pp5', orbit(3.83, 0.2, 55), 4], ['pp5', orbit(3.83, 0.2, 56), 4]];
            for (const [where, value, digits] of quoted) {
                const shown = q(value, digits, language);
                expect({where, shown, found: hasQuote(where === 'pp4' ? first : second, value, digits, language)}).toEqual({where, shown, found: true});
            }
            // the prose says "more than 0,37": the real difference is above it
            expect(Math.abs(orbit(4, 0.2, 5) - orbit(4, 0.21, 5))).toBeGreaterThan(0.37);
            // the same values written for the Slovenian language use the decimal comma and the English ones the point
            expect(first).toContain(language === 'sl' ? '0{,}655172' : '0.655172');
        }
    });

    test('the chapter owns both lessons and they are the ones the test checks', () => {
        const owned = getChapterOwnedLessons('phase-portraits')!;
        expect(owned.lesson('logistic-map')!.steps.map(step => step.id)).toEqual(logisticMapLesson.steps.map(step => step.id));
        expect(owned.lesson('bifurcation')!.steps.map(step => step.id)).toEqual(bifurcationLesson.steps.map(step => step.id));
        expect(logisticMapLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(bifurcationLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
        expect(new Set(allSteps().map(step => step.scene!.id)).size).toBe(12);
        expect(allSteps().every(step => step.scene)).toBe(true);
        expect(Object.keys(lessons)).toEqual(['pp4', 'pp5']);
        void ((m: Mounted | undefined) => m);
    });
});

// ---- PP1 and PP2 on a real PhasePortraitGraph ------------------------------------------------------------------------------------------

const LANGS: readonly Language[] = ['sl', 'en'];
const ppSteps = () => [...linearSystemLesson.steps, ...pendulumLesson.steps];
const ppStepOf = (id: string) => ppSteps().find(step => step.id === id)!;
type PlaneSpec = {readonly system?: string; readonly matrix?: {readonly A: number; readonly B: number; readonly C: number; readonly D: number}; readonly seeds?: readonly {readonly X: number; readonly Y: number}[]};
/** The scene constants of the lesson file by step; a scene sets them on top of the Demonstration default. */
const PP_SPECS: Record<string, PlaneSpec> = {
    'pp1-reverse': PP1_UNSTABLE, 'pp1-slow': PP1_ON_FAST_LINE, 'pp1-saddle': PP1_FOUR_SEEDS, 'pp1-parabola': PP1_NODE, 'pp1-centre': PP1_NEAR_CENTRE, 'pp1-euler': PP1_CENTRE, 'pp1-free': PP1_FREE,
    'pp2-small': PP2_LINEAR_CENTRE, 'pp2-larger': PP2_SMALL, 'pp2-cross': PP2_LARGE, 'pp2-separatrix': PP2_ROTATION, 'pp2-free': PP2_FREE,
};
const ppOpenState = (id: string) => {
    const spec = PP_SPECS[id];
    return {system: spec.system ?? 'linear', ...(spec.matrix ?? {A: -16, B: -4, C: -8, D: -12}), seeds: spec.seeds ?? [{X: 20, Y: 0}]};
};

function mountPhase(language: Language) {
    setLanguage(language);
    const graph = createGraph('phase-portrait');
    if (!(graph instanceof PhasePortraitGraph)) throw new Error('phase-portrait must be the phase portrait graph.');
    mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const stateOf = () => JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
    const open = (id: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of sceneActions(ppStepOf(id).scene!)) capabilities.apply(action);
    });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    const picked = () => { const s = stateOf(); return {system: s.system, A: s.A, B: s.B, C: s.C, D: s.D, seeds: s.seeds}; };
    const readouts = () => [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${node.querySelector('dd')?.textContent}`);
    const status = () => document.querySelector('[data-phase-status]')?.textContent ?? null;
    const inset = () => document.querySelector('[data-phase-inset]')?.getAttribute('aria-label') ?? null;
    const snap = () => JSON.stringify({state: stateOf(), readouts: readouts(), status: status(), inset: inset()});
    const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
    const dec = (value: string) => (language === 'sl' ? value.replace('.', ',') : value);
    const typeIn = (label: string, value: string) => act(() => { enterNumber(field(label), dec(value)); });
    const ui = {
        entry: (name: 'a' | 'b' | 'c' | 'd', value: string) => typeIn(t(`phase_graph_matrix_${name}_label`), value),
        /** The first (x or theta) or second (y or omega) coordinate of seed n, by the system on the board. */
        seed: (n: number, axis: 1 | 2, value: string) => {
            const pendulum = stateOf().system === 'pendulum';
            const label = axis === 1
                ? (pendulum ? t('phase_graph_seed_theta_label', {value0: String(n)}) : t('phase_graph_seed_x_label', {value0: String(n)}))
                : (pendulum ? t('phase_graph_seed_omega_label', {value0: String(n)}) : t('phase_graph_seed_y_label', {value0: String(n)}));
            typeIn(label, value);
        },
        plus: () => act(() => { fireEvent.click(screen.getByRole('button', {name: t('phase_graph_seeds_plus')})); }),
        system: (value: string) => act(() => { fireEvent.change(field(t('phase_graph_system_label')), {target: {value}}); }),
        time: (value: string) => act(() => { enterNumber(field(t('phase_graph_time_label')), value); }),
    };
    return {graph, open, restore, free, stateOf, picked, readouts, status, inset, snap, field, ui};
}
type PhaseMount = ReturnType<typeof mountPhase>;
type Ui = PhaseMount['ui'];

/** The learner changes each step's prompt asks for, as control edits: each variant is applied to a fresh opening of the step. */
const PP_VARIANTS: Record<string, ((ui: Ui) => void)[]> = {
    'pp1-reverse': [ui => { ui.entry('a', '-4'); ui.entry('b', '-1'); ui.entry('c', '-2'); ui.entry('d', '-3'); }],
    'pp1-slow': [ui => {
        ui.seed(1, 1, '1'); ui.seed(1, 2, '0');
        ui.plus(); ui.plus(); ui.plus();
        ui.seed(2, 1, '0'); ui.seed(2, 2, '1'); ui.seed(3, 1, '-1'); ui.seed(3, 2, '0'); ui.seed(4, 1, '0'); ui.seed(4, 2, '-1');
    }],
    'pp1-saddle': [ui => { ui.entry('a', '1'); ui.entry('b', '0'); ui.entry('c', '0'); ui.entry('d', '-1'); }],
    'pp1-parabola': [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].map(c => (ui: Ui) => ui.entry('c', String(c))),
    'pp1-centre': [ui => ui.entry('d', '0')],
    'pp1-euler': [ui => ui.time('6.28')],
    'pp1-free': [
        ui => { ui.entry('a', '1'); ui.entry('b', '0'); ui.entry('c', '0'); ui.entry('d', '-1'); },
        ui => { ui.entry('a', '1'); ui.entry('b', '0'); ui.entry('c', '0'); ui.entry('d', '0'); },
        ui => { ui.entry('a', '0.5'); ui.entry('b', '-1'); ui.entry('c', '1'); ui.entry('d', '0'); },
    ],
    'pp2-small': [ui => ui.system('pendulum')],
    'pp2-larger': [ui => { ui.plus(); ui.plus(); ui.seed(2, 1, '2'); ui.seed(2, 2, '0'); ui.seed(3, 1, '0'); ui.seed(3, 2, '1.9'); }],
    'pp2-cross': [ui => ui.seed(1, 2, '2'), ui => ui.seed(1, 2, '2.25')],
    'pp2-separatrix': [ui => { ui.seed(1, 2, '2'); ui.time('10'); }],
    'pp2-free': [
        ui => { ui.plus(); ui.seed(2, 1, '-1'); ui.seed(2, 2, '0'); },
        ui => { ui.plus(); ui.seed(2, 1, '0.05'); ui.seed(2, 2, '2'); },
    ],
};

/** The graph strings a prompt names (the label up to the symbol that follows it, the status up to its colon), by step. */
const nm = (name: () => string) => () => name().replace(/ [τδΔ].*$| H = 1$/, '');
const statusName = (name: () => string) => () => name().split(':')[0];
const PP_NAMES: Record<string, (() => string)[]> = {
    'pp1-reverse': [() => t('phase_graph_matrix_a_label'), nm(() => t('phase_graph_r_type_linear')), nm(() => t('phase_graph_r_tau')), nm(() => t('phase_graph_r_delta')), nm(() => t('phase_graph_r_discriminant')), () => t('phase_graph_r_eigen'), () => t('phase_graph_r_seed', {value0: '1'})],
    'pp1-slow': [() => t('phase_graph_r_seed', {value0: '1'}), () => t('phase_graph_seeds_plus')],
    'pp1-saddle': [() => t('phase_graph_matrix_a_label').split(':')[0], nm(() => t('phase_graph_r_type_linear')), nm(() => t('phase_graph_r_tau')), nm(() => t('phase_graph_r_delta')), () => t('phase_graph_r_eigen'), () => t('phase_graph_r_seed', {value0: '1'})],
    'pp1-parabola': [() => t('phase_graph_matrix_c_label'), nm(() => t('phase_graph_r_type_linear')), nm(() => t('phase_graph_r_delta')), nm(() => t('phase_graph_r_discriminant')), () => t('phase_graph_r_eigen'), () => t('phase_graph_inset_title')],
    'pp1-centre': [() => t('phase_graph_matrix_d_label'), nm(() => t('phase_graph_r_type_linear')), nm(() => t('phase_graph_r_tau')), nm(() => t('phase_graph_r_delta')), nm(() => t('phase_graph_r_discriminant')), () => t('phase_graph_r_eigen'), () => t('phase_graph_r_seed', {value0: '1'})],
    'pp1-euler': [() => t('phase_graph_time_label'), () => t('phase_graph_r_seed', {value0: '1'})],
    'pp1-free': [nm(() => t('phase_graph_r_type_linear'))],
    'pp2-small': [() => t('phase_graph_system_label'), () => t('phase_graph_system_pendulum').split(' θ')[0], () => t('phase_graph_r_energy', {value0: '1'}), statusName(() => t('phase_graph_status_type_linearization', {value0: '#', value1: '#', value2: '#'}))],
    'pp2-larger': [() => t('phase_graph_seeds_plus'), () => t('phase_graph_seed_theta_label', {value0: '2'}), () => t('phase_graph_seed_theta_label', {value0: '3'}), () => t('phase_graph_r_energy', {value0: '1'})],
    'pp2-cross': [() => t('phase_graph_seed_omega_label', {value0: '1'}), () => t('phase_graph_r_energy', {value0: '1'}), () => t('phase_graph_r_seed', {value0: '1'}), nm(() => t('phase_graph_cap_separatrix'))],
    'pp2-separatrix': [() => t('phase_graph_seed_omega_label', {value0: '1'}), () => t('phase_graph_time_label'), () => t('phase_graph_r_seed', {value0: '1'}), statusName(() => t('phase_graph_status_ended', {value0: '#'}))],
    'pp2-free': [() => t('phase_graph_seeds_plus')],
};
const ppText = (id: string, language: Language) => {
    const step = ppStepOf(id);
    return prose([step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language])].join(' ')).replace(/\s+/g, ' ');
};

describe('PP1 and PP2 open on a real PhasePortraitGraph, in sl and en', () => {
    it('every step opens its scene out of order and twice in one act, and restore returns the free state', () => {
        const ids = ppSteps().map(step => step.id);
        expect(ids).toHaveLength(12);
        for (const language of LANGS) {
            const m = mountPhase(language);
            for (let i = 0; i < ids.length; i += 1) {
                const id = ids[(i * 7) % ids.length];
                m.open(id);
                const once = m.snap();
                expect({language, id, state: m.picked()}).toEqual({language, id, state: ppOpenState(id)});
                m.open(id, 2);
                expect({language, id, twice: m.snap() === once}).toEqual({language, id, twice: true});
            }
            m.restore();
            expect(JSON.stringify(m.stateOf())).toBe(m.free);
            cleanup();
        }
    });

    it('every control and readout a prompt names exists in the graph, with the graph string of the language', () => {
        const missing: string[] = [];
        for (const language of LANGS) {
            const m = mountPhase(language);
            for (const step of ppSteps()) {
                m.open(step.id);
                const text = ppText(step.id, language);
                missing.push(...PP_NAMES[step.id].map(name => name()).filter(name => !text.includes(name)).map(name => `${language} ${step.id}: ${name}`));
                const pendulum = m.stateOf().system === 'pendulum';
                if (!pendulum) for (const letter of ['a', 'b', 'c', 'd'] as const) expect(m.field(t(`phase_graph_matrix_${letter}_label`))).toBeTruthy();
                expect(m.field(t('phase_graph_system_label'))).toBeTruthy();
                expect(m.field(t('phase_graph_time_label'))).toBeTruthy();
                expect(screen.getByRole('button', {name: t('phase_graph_seeds_plus')})).toBeTruthy();
                expect(document.querySelector('[data-readout="seed-1"] dt')?.textContent).toBe(t('phase_graph_r_seed', {value0: '1'}));
                expect(document.querySelector('[data-readout="energy-1"] dt')?.textContent ?? null).toBe(pendulum ? t('phase_graph_r_energy', {value0: '1'}) : null);
                expect(m.field(pendulum ? t('phase_graph_seed_theta_label', {value0: '1'}) : t('phase_graph_seed_x_label', {value0: '1'}))).toBeTruthy();
                if (!pendulum) for (const [id, label] of [['tau', t('phase_graph_r_tau')], ['delta', t('phase_graph_r_delta')], ['discriminant', t('phase_graph_r_discriminant')], ['eigen', t('phase_graph_r_eigen')], ['type', t('phase_graph_r_type_linear')]]) expect(document.querySelector(`[data-readout="${id}"] dt`)?.textContent).toBe(label);
                expect(document.querySelector('[data-phase-inset]')).toBeTruthy();
            }
            cleanup();
        }
        expect(missing).toEqual([]);
    });

    it('no step opens in the state its prompt asks the learner to produce', () => {
        for (const language of LANGS) {
            const m = mountPhase(language);
            for (const step of ppSteps()) {
                m.open(step.id);
                const opening = m.snap();
                for (const [index, change] of PP_VARIANTS[step.id].entries()) {
                    m.open(step.id);
                    change(m.ui);
                    expect({language, id: step.id, variant: index, changed: m.snap() !== opening}).toEqual({language, id: step.id, variant: index, changed: true});
                }
            }
            cleanup();
        }
    });
});

// ---- PP1 and PP2: the numbers quoted, recomputed independently of the graph ----------------------------------------------------------------

type Field = (x: number, y: number) => [number, number];
const linearField = (a: number, b: number, c: number, d: number): Field => (x, y) => [a * x + b * y, c * x + d * y];
const pendulumField: Field = (theta, omega) => [omega, -Math.sin(theta)];
/** An own RK4 (step 0,02) along the field in time direction `sign`: the exit time (the first step whose point has |x| or |y| above 4, null for all 10 s) and the path. */
function flowOf(field: Field, x0: number, y0: number, sign: 1 | -1) {
    const g: Field = (x, y) => { const [u, v] = field(x, y); return [sign * u, sign * v]; };
    const h = 0.02;
    let x = x0;
    let y = y0;
    const path: [number, number][] = [[x, y]];
    for (let k = 1; k <= 500; k += 1) {
        const [a1, b1] = g(x, y);
        const [a2, b2] = g(x + h / 2 * a1, y + h / 2 * b1);
        const [a3, b3] = g(x + h / 2 * a2, y + h / 2 * b2);
        const [a4, b4] = g(x + h * a3, y + h * b3);
        x += h / 6 * (a1 + 2 * a2 + 2 * a3 + a4);
        y += h / 6 * (b1 + 2 * b2 + 2 * b3 + b4);
        path.push([x, y]);
        if (Math.abs(x) > 4 || Math.abs(y) > 4) return {exit: k * h, path, end: [x, y] as [number, number]};
    }
    return {exit: null, path, end: [x, y] as [number, number]};
}
/** tau, delta, Delta and the eigenvalues (the quadratic formula, the larger real part first; a complex pair as [real, imaginary]). */
function matrixInfo(a: number, b: number, c: number, d: number) {
    const tau = a + d;
    const delta = a * d - b * c;
    const disc = tau * tau - 4 * delta;
    const l: [number, number] = disc >= 0 ? [(tau + Math.sqrt(disc)) / 2, (tau - Math.sqrt(disc)) / 2] : [tau / 2, Math.sqrt(-disc) / 2];
    return {tau, delta, disc, l};
}
const matrixType = (a: number, b: number, c: number, d: number): (() => string) => {
    const {tau, delta, disc} = matrixInfo(a, b, c, d);
    if (delta < 0) return () => t('phase_graph_type_saddle');
    if (delta === 0) return () => t('phase_graph_type_line_of_equilibria');
    if (tau === 0) return () => t('phase_graph_type_centre');
    if (disc > 0) return tau < 0 ? () => t('phase_graph_type_node_stable') : () => t('phase_graph_type_node_unstable');
    if (disc === 0) return tau < 0 ? () => t('phase_graph_type_degenerate_stable') : () => t('phase_graph_type_degenerate_unstable');
    return tau < 0 ? () => t('phase_graph_type_spiral_stable') : () => t('phase_graph_type_spiral_unstable');
};
const norm = (text: string | null | undefined) => (text ?? '').replace(/−/g, '-');
const energyOf = (theta: number, omega: number) => omega * omega / 2 - Math.cos(theta);
const ppRaw = (id: string, language: Language) => {
    const step = ppStepOf(id);
    return [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]].join(' ');
};
const E_M: [number, number, number, number] = [4, 1, 2, 3];
const N_M: [number, number, number, number] = [-4, -1, -2, -3];

describe('PP1 and PP2: every number the text quotes is recomputed independently of the graph', () => {
    it('the independent integrator agrees with the closed forms it is used to confirm', () => {
        // x(1) from (1,0) for N: x = 2/3 e^-5t (1,1) + 1/3 e^-2t (1,-2)
        const exact = (t1: number): [number, number] => [2 / 3 * Math.exp(-5 * t1) + Math.exp(-2 * t1) / 3, 2 / 3 * Math.exp(-5 * t1) - 2 / 3 * Math.exp(-2 * t1)];
        const rk = flowOf(linearField(...N_M), 1, 0, 1).path[50];
        expect(Math.abs(rk[0] - exact(1)[0]) + Math.abs(rk[1] - exact(1)[1])).toBeLessThan(1e-6);
        expect(exact(1).map(v => Number(v.toFixed(4)))).toEqual([0.0496, -0.0857]);
        expect(Math.cos(6.28).toFixed(4)).toBe('1.0000');
        expect(Math.sin(6.28).toFixed(4)).toBe('-0.0032');
        const centre = flowOf(linearField(0, -1, 1, 0), 1, 0, 1).path[314];
        expect([centre[0].toFixed(3), centre[1].toFixed(3)]).toEqual(['1.000', '-0.003']);
        // Euler on the centre: the iteration radius (1 + h^2)^(n/2), by closed form and by iterating the step
        const euler = (h: number, n: number) => { let x = 1; let y = 0; for (let i = 0; i < n; i += 1) { [x, y] = [x - h * y, y + h * x]; } return Math.hypot(x, y); };
        expect([euler(0.1, 63), euler(0.05, 126)].map(v => v.toFixed(4))).toEqual(['1.3681', '1.1704']);
        expect([(1 + 0.1 ** 2) ** 31.5, (1 + 0.05 ** 2) ** 63].map(v => v.toFixed(4))).toEqual(['1.3681', '1.1704']);
        expect([Math.log(1.3681), Math.log(1.1704)].map(v => v.toFixed(4))).toEqual(['0.3134', '0.1573']);
        // the separatrix end after 10 s: theta = 2 asin tanh t, omega = 2 / cosh t
        const end = [2 * Math.asin(Math.tanh(10)), 2 / Math.cosh(10)];
        expect(end.map(v => v.toFixed(4))).toEqual(['3.1414', '0.0002']);
        const flow = flowOf(pendulumField, 0, 2, 1).end;
        expect(Math.abs(flow[0] - end[0])).toBeLessThan(5e-4);
        expect(Math.abs(flow[1] - end[1])).toBeLessThan(5e-4);
        // omega max and the extreme theta of PP2 step 2, with an RK4 cross-check over the 10 s
        expect([Math.sqrt(2 * (energyOf(1, 0) + 1)), Math.sqrt(2 * (energyOf(2, 0) + 1)), Math.acos(-energyOf(0, 1.9))].map(v => v.toFixed(4))).toEqual(['0.9589', '1.6829', '2.5065']);
        const maxOmega = (theta: number) => Math.max(...flowOf(pendulumField, theta, 0, 1).path.map(p => Math.abs(p[1])));
        expect(Math.abs(maxOmega(1) - 0.9589)).toBeLessThan(1e-3);
        expect(Math.abs(maxOmega(2) - 1.683)).toBeLessThan(1e-3);
        expect(Math.abs(Math.max(...flowOf(pendulumField, 0, 1.9, 1).path.map(p => p[0])) - 2.5065)).toBeLessThan(5e-3);
    });

    /** [step, value, digits]: each value must appear in the sl and en text of the step in the format of the language. */
    const info = (a: number, b: number, c: number, d: number) => matrixInfo(a, b, c, d);
    const exits = (field: Field, x: number, y: number) => [flowOf(field, x, y, 1).exit, flowOf(field, x, y, -1).exit];
    const seedExit = (field: Field, x: number, y: number, sign: 1 | -1) => flowOf(field, x, y, sign).exit!;
    const E = info(...E_M);
    const N = info(...N_M);
    const dn = (c: number) => info(-4, -1, c, -3);
    const nearCentre = info(0, -1, 1, -0.25);
    const centre = info(0, -1, 1, 0);
    const saddle = info(1, 0, 0, -1);
    const unstableSpiral = info(0.5, -1, 1, 0);
    const QUOTES: [string, string, number, number][] = [
        ['pp1-reverse', 'tau N', N.tau, 0], ['pp1-reverse', 'delta N', N.delta, 0], ['pp1-reverse', 'Delta N', N.disc, 0], ['pp1-reverse', 'lambda N 1', N.l[0], 0], ['pp1-reverse', 'lambda N 2', N.l[1], 0],
        ['pp1-reverse', 'lambda E 1', E.l[0], 0], ['pp1-reverse', 'lambda E 2', E.l[1], 0], ['pp1-reverse', 'tau E', E.tau, 0], ['pp1-reverse', 'delta E', E.delta, 0], ['pp1-reverse', 'Delta E', E.disc, 0],
        ['pp1-reverse', 'E forward exit', seedExit(linearField(...E_M), 1, 0, 1), 2], ['pp1-reverse', '-E backward exit', seedExit(linearField(...N_M), 1, 0, -1), 2],
        ['pp1-slow', 'A(1,-2) first', -2, 0], ['pp1-slow', 'A(1,-2) second', 4, 0], ['pp1-slow', 'x(1) first', 2 / 3 * Math.exp(-5) + Math.exp(-2) / 3, 4], ['pp1-slow', 'x(1) second', 2 / 3 * Math.exp(-5) - 2 / 3 * Math.exp(-2), 4],
        ['pp1-saddle', 'tau', saddle.tau, 0], ['pp1-saddle', 'delta', saddle.delta, 0], ['pp1-saddle', 'Delta', saddle.disc, 0], ['pp1-saddle', 'lambda 1', saddle.l[0], 0], ['pp1-saddle', 'lambda 2', saddle.l[1], 0],
        ['pp1-saddle', '(1;0,05) forward', seedExit(linearField(1, 0, 0, -1), 1, 0.05, 1), 2], ['pp1-saddle', '(1;0,05) backward', seedExit(linearField(1, 0, 0, -1), 1, 0.05, -1), 2],
        ['pp1-saddle', '(0,05;1) forward', seedExit(linearField(1, 0, 0, -1), 0.05, 1, 1), 2], ['pp1-saddle', '(0,05;1) backward', seedExit(linearField(1, 0, 0, -1), 0.05, 1, -1), 2], ['pp1-saddle', 'ln 4', Math.log(4), 2],
        ['pp1-parabola', 'tau', dn(0).tau, 0], ['pp1-parabola', 'delta c=0', dn(0).delta, 0], ['pp1-parabola', 'Delta c=0', dn(0).disc, 0], ['pp1-parabola', 'delta c=1/4', dn(0.25).delta, 2], ['pp1-parabola', 'Delta c=1/4', dn(0.25).disc, 0],
        ['pp1-parabola', 'lambda c=1/4', dn(0.25).l[0], 1], ['pp1-parabola', 'delta c=1/2', dn(0.5).delta, 1], ['pp1-parabola', 'Delta c=1/2', dn(0.5).disc, 0], ['pp1-parabola', 'lambda re c=1/2', dn(0.5).l[0], 1], ['pp1-parabola', 'lambda im c=1/2', dn(0.5).l[1], 1],
        ['pp1-centre', 'tau near', nearCentre.tau, 2], ['pp1-centre', 'delta near', nearCentre.delta, 0], ['pp1-centre', 'Delta near', nearCentre.disc, 4],
        ['pp1-centre', 'tau', centre.tau, 0], ['pp1-centre', 'delta', centre.delta, 0], ['pp1-centre', 'Delta', centre.disc, 0], ['pp1-centre', 'lambda re', centre.l[0], 0], ['pp1-centre', 'lambda im', centre.l[1], 0],
        ['pp1-euler', 'cos 6,28', Math.cos(6.28), 4], ['pp1-euler', 'sin 6,28', Math.sin(6.28), 4], ['pp1-euler', 'radius h=0,1', (1 + 0.1 ** 2) ** 31.5, 4], ['pp1-euler', 'radius h=0,05', (1 + 0.05 ** 2) ** 63, 4],
        ['pp1-euler', 'ln 1,3681', Math.log(1.3681), 4], ['pp1-euler', 'ln 1,1704', Math.log(1.1704), 4],
        ['pp1-free', 'saddle delta', saddle.delta, 0], ['pp1-free', 'spiral tau', unstableSpiral.tau, 1], ['pp1-free', 'spiral delta', unstableSpiral.delta, 0],
        ['pp2-small', 'H', energyOf(1, 0), 6], ['pp2-small', 'omega max', Math.sqrt(2 * (energyOf(1, 0) + 1)), 4],
        ['pp2-larger', 'H(1,0)', energyOf(1, 0), 6], ['pp2-larger', 'H(2,0)', energyOf(2, 0), 6], ['pp2-larger', 'H(0;1,9)', energyOf(0, 1.9), 3], ['pp2-larger', 'omega max', Math.sqrt(2 * (energyOf(2, 0) + 1)), 3], ['pp2-larger', 'theta max', Math.acos(-energyOf(0, 1.9)), 2],
        ['pp2-cross', 'H omega 2', energyOf(0, 2), 0], ['pp2-cross', 'H omega 2,25', energyOf(0, 2.25), 5], ['pp2-cross', 'exit', seedExit(pendulumField, 0, 2.25, 1), 2], ['pp2-cross', 'exit backward', seedExit(pendulumField, 0, 2.25, -1), 2],
        ['pp2-separatrix', 'theta end', 2 * Math.asin(Math.tanh(10)), 4], ['pp2-separatrix', 'omega end', 2 / Math.cosh(10), 4], ['pp2-separatrix', 'pi', Math.PI, 4],
        ['pp2-free', 'H(1,0)', energyOf(1, 0), 6], ['pp2-free', 'H(-1,0)', energyOf(-1, 0), 6], ['pp2-free', 'H(0,05;2)', energyOf(0.05, 2), 5],
        ['pp2-free', 'forward exit', seedExit(pendulumField, 0.05, 2, 1), 2], ['pp2-free', 'backward exit', seedExit(pendulumField, 0.05, 2, -1), 2],
    ];

    it('each quoted value is in the sl and en text of its step (red evidence: change one quoted number)', () => {
        const missing: string[] = [];
        for (const language of LANGS) {
            setLanguage(language);
            for (const [id, what, value, digits] of QUOTES) if (!hasQuote(ppRaw(id, language), value, digits, language)) missing.push(`${language} ${id} ${what}: ${q(value, digits, language)}`);
        }
        expect(missing).toEqual([]);
    });

    it('the claims about which half-trajectory is stopped and which is complete follow from the independent flow', () => {
        expect(exits(linearField(...E_M), 1, 0).map(v => v && v.toFixed(2))).toEqual(['0.34', null]);
        expect(exits(linearField(...N_M), 1, 0).map(v => v && v.toFixed(2))).toEqual([null, '0.34']);
        for (const [x, y] of [[1, 1], [1, 0], [0, 1], [1, 0.05], [0.05, 1]]) expect(exits(linearField(...N_M), x, y)[0], `N forward from (${x}, ${y})`).toBeNull();
        expect(exits(linearField(1, 0, 0, -1), 0, 1).map(v => v && v.toFixed(2))).toEqual([null, '1.40']);
        expect(exits(linearField(1, 0, 0, -1), 1, 0).map(v => v && v.toFixed(2))).toEqual(['1.40', null]);
        expect(exits(linearField(0, -1, 1, 0), 1, 0)).toEqual([null, null]);
        expect(exits(pendulumField, 0, 2)).toEqual([null, null]);
        expect(exits(pendulumField, 1, 0)).toEqual([null, null]);
        expect(exits(pendulumField, 0, 2.25).map(v => v && v.toFixed(2))).toEqual(['2.76', '2.76']);
        expect(exits(pendulumField, 0.05, 2).map(v => v && v.toFixed(2))).toEqual(['8.62', '8.66']);
    });
});

describe('PP1 and PP2: the readouts after the learner change show the quoted numbers, in sl and en', () => {
    it('the readouts of the graph match the independent recomputation for every step', () => {
        const bad: string[] = [];
        for (const language of LANGS) {
            const m = mountPhase(language);
            const dd = (id: string) => norm(document.querySelector(`[data-readout="${id}"] dd`)?.textContent);
            const has = (what: string, id: string, value: number, digits: number) => {
                if (!hasQuote(dd(id), value, digits, language)) bad.push(`${language} ${what} ${id}: wants ${q(value, digits, language)} in "${dd(id)}"`);
            };
            const includes = (what: string, id: string, part: string) => { if (!dd(id).includes(part)) bad.push(`${language} ${what} ${id}: wants "${part}" in "${dd(id)}"`); };
            const run = (id: string, variant: number) => { m.open(id); PP_VARIANTS[id][variant](m.ui); };
            const linear = (id: string, variant: number, a: number, b: number, c: number, d: number) => {
                run(id, variant);
                const i = matrixInfo(a, b, c, d);
                has(`${id}#${variant} tau`, 'tau', i.tau, 4); has(`${id}#${variant} delta`, 'delta', i.delta, 4); has(`${id}#${variant} Delta`, 'discriminant', i.disc, 4);
                has(`${id}#${variant} eigen`, 'eigen', i.l[0], 4); has(`${id}#${variant} eigen`, 'eigen', i.l[1], 4);
                includes(`${id}#${variant} type`, 'type', matrixType(a, b, c, d)());
            };
            const suffixOf = (text: string) => text.split('#')[1];
            const seedExit = (field: Field, x: number, y: number, sign: 1 | -1) => flowOf(field, x, y, sign).exit!;

            linear('pp1-reverse', 0, ...N_M);
            has('pp1-reverse -E backward', 'seed-1', seedExit(linearField(...N_M), 1, 0, -1), 2); has('pp1-reverse -E forward', 'seed-1', 10, 0);
            run('pp1-slow', 0);
            for (const n of [1, 2, 3, 4]) has(`pp1-slow seed ${n} forward`, `seed-${n}`, 10, 0);
            linear('pp1-saddle', 0, 1, 0, 0, -1);
            const sd = linearField(1, 0, 0, -1);
            has('saddle (1;0,05) forward', 'seed-3', seedExit(sd, 1, 0.05, 1), 2); has('saddle (1;0,05) backward', 'seed-3', seedExit(sd, 1, 0.05, -1), 2);
            has('saddle (0,05;1) forward', 'seed-4', seedExit(sd, 0.05, 1, 1), 2); has('saddle (0,05;1) backward', 'seed-4', seedExit(sd, 0.05, 1, -1), 2);
            has('saddle (0;1) forward', 'seed-2', 10, 0); has('saddle (1;0) backward', 'seed-1', 10, 0);
            [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].forEach((c, variant) => linear('pp1-parabola', variant, -4, -1, c, -3));
            linear('pp1-centre', 0, 0, -1, 1, 0);
            has('pp1-centre seed 1 forward', 'seed-1', 10, 0);
            run('pp1-euler', 0);
            has('pp1-euler time', 'time', 6.28, 2);
            linear('pp1-free', 0, 1, 0, 0, -1); linear('pp1-free', 1, 1, 0, 0, 0); linear('pp1-free', 2, 0.5, -1, 1, 0);

            run('pp2-small', 0);
            has('pp2-small H', 'energy-1', energyOf(1, 0), 6);
            includes('pp2-small hyperbolic', 'hyperbolic', t('phase_graph_no'));
            if (!(document.querySelector('[data-phase-status]')?.textContent ?? '').includes(t('phase_graph_type_centre'))) bad.push(`${language} pp2-small status lacks the centre`);
            run('pp2-larger', 0);
            has('pp2-larger H1', 'energy-1', energyOf(1, 0), 6); has('pp2-larger H2', 'energy-2', energyOf(2, 0), 6); has('pp2-larger H3', 'energy-3', energyOf(0, 1.9), 6);
            for (const n of [1, 2, 3]) includes(`pp2-larger swing ${n}`, `energy-${n}`, suffixOf(t('phase_graph_energy_swing', {value0: '#'})));
            run('pp2-cross', 0);
            has('pp2-cross omega 2 H', 'energy-1', 1, 0); includes('pp2-cross exact', 'energy-1', suffixOf(t('phase_graph_energy_separatrix_exact', {value0: '#'})));
            has('pp2-cross omega 2 seed', 'seed-1', 10, 0);
            run('pp2-cross', 1);
            has('pp2-cross omega 2,25 H', 'energy-1', energyOf(0, 2.25), 5); includes('pp2-cross rotation', 'energy-1', suffixOf(t('phase_graph_energy_rotation', {value0: '#'})));
            has('pp2-cross omega 2,25 seed', 'seed-1', 2.76, 2);
            run('pp2-separatrix', 0);
            has('pp2-separatrix seed', 'seed-1', 10, 0);
            if (!(document.querySelector('[data-phase-status]')?.textContent ?? '').includes(t('phase_graph_status_ended', {value0: '10'}))) bad.push(`${language} pp2-separatrix status lacks the end of the computed trajectories`);
            run('pp2-free', 0);
            has('pp2-free H(1,0)', 'energy-1', energyOf(1, 0), 6); has('pp2-free H(-1,0)', 'energy-2', energyOf(-1, 0), 6);
            run('pp2-free', 1);
            has('pp2-free H(0,05;2)', 'energy-2', energyOf(0.05, 2), 5); includes('pp2-free rotation', 'energy-2', suffixOf(t('phase_graph_energy_rotation', {value0: '#'})));
            has('pp2-free forward', 'seed-2', 8.62, 2); has('pp2-free backward', 'seed-2', 8.66, 2);
            cleanup();
        }
        expect(bad).toEqual([]);
    });
});
