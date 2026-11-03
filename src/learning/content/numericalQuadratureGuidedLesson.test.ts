/**
 * N4 (quadrature): every scene lands in the state the text states (real graph, one synchronous sequence of actions), the readouts the graph
 * displays equal an independent trapezoid/Simpson loop, and every number the lesson quotes (Slovenian and English) equals the displayed value.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {quadratureGuidedLessons} from './numericalQuadratureGuidedLesson';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = quadratureGuidedLessons[0];
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
const asText = (token: string, language: 'sl' | 'en') => language === 'sl' ? token.replace('.', '{,}') : token;

// ---- The independent reference: its own composite rules and antiderivatives, nothing from the quadrature model -----------
type Fn = 'square' | 'sin';
const F: Record<Fn, (x: number) => number> = {square: x => x * x, sin: Math.sin};
const EXACT: Record<Fn, (a: number, b: number) => number> = {
    square: (a, b) => (b ** 3 - a ** 3) / 3,
    sin: (a, b) => Math.cos(a) - Math.cos(b),
};
function trapezoid(f: (x: number) => number, a: number, b: number, n: number): number {
    const h = (b - a) / n;
    let sum = (f(a) + f(b)) / 2;
    for (let i = 1; i < n; i += 1) sum += f(a + i * h);
    return sum * h;
}
function simpson(f: (x: number) => number, a: number, b: number, n: number): number {
    const h = (b - a) / n;
    let sum = f(a) + f(b);
    for (let i = 1; i < n; i += 1) sum += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
    return sum * h / 3;
}
const approx = (rule: 'trapezoid' | 'simpson', fn: Fn, a: number, b: number, n: number) => (rule === 'simpson' ? simpson : trapezoid)(F[fn], a, b, n);
const error = (rule: 'trapezoid' | 'simpson', fn: Fn, a: number, b: number, n: number) => Math.abs(approx(rule, fn, a, b, n) - EXACT[fn](a, b));
/** Four significant digits, as the graph displays an error (zero below 1e-12). */
const shown = (value: number) => Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(4));

/** Per scene: its state, and the numbers the scene text and its step quote (English spelling, converted for Slovenian). */
const SCENES: Record<string, {rule: 'trapezoid' | 'simpson'; fn: Fn; b: number; n: number; scene: string[]; step: string[]}> = {
    'trapezoid-predict': {rule: 'trapezoid', fn: 'sin', b: Math.PI, n: 2, scene: ['1.5708', '0.4292'], step: ['1.5708', '0.4292']},
    'trapezoid-halve': {rule: 'trapezoid', fn: 'sin', b: Math.PI, n: 4, scene: ['1.8961', '0.1039', '4.13'], step: ['1.8961', '0.1039', '4.13', '0.0258', '4.03']},
    'simpson-parabolas': {rule: 'simpson', fn: 'sin', b: Math.PI, n: 4, scene: ['2.0046', '0.00456', '20.7'], step: ['2.0046', '0.00456', '0.1039']},
    'simpson-halve': {rule: 'simpson', fn: 'sin', b: Math.PI, n: 8, scene: ['2.0003', '0.000269', '16.9'], step: ['2.0003', '0.000269', '16.9', '1.66\\cdot10^{-5}', '16.2']},
    'simpson-exact': {rule: 'simpson', fn: 'square', b: 3, n: 2, scene: ['9'], step: ['9', '1.125']},
    'simpson-even': {rule: 'simpson', fn: 'sin', b: Math.PI, n: 2, scene: ['2.0944', '0.0944'], step: ['2.0944', '0.0944']},
    'quadrature-explore': {rule: 'trapezoid', fn: 'sin', b: Math.PI, n: 2, scene: [], step: ['0.4292']},
};

const decimalsOf = (token: string) => token.includes('.') ? token.split('.')[1].length : 0;
/** The displayed value equals the quoted token to the quoted digits. */
const matchesQuoted = (displayed: number, token: string) => Math.abs(displayed - Number(token)) <= 0.5 * 10 ** -decimalsOf(token) * 1.0001;
const parse = (text: string) => Number(text.replace(/\s/g, '').replace(',', '.').replace('−', '-'));

function mount() {
    const graph = createGraph('quadrature');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        mounted, scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
    };
}
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '';

test('the lesson is N4 on quadrature: seven ordered steps, each with a scene of its own', () => {
    expect(lesson.demonstrationId).toBe('quadrature');
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('every scene lands in the stated state and the displayed readouts equal the independent loop and the quoted numbers', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        // Out of order (reversed, then in order) and twice each: a scene never depends on the one before it.
        for (const id of [...ids].reverse().flatMap(x => [x, x]).concat(ids.flatMap(x => [x, x]))) {
            const expected = SCENES[id];
            m.scene(stepOf(id));
            const step = stepOf(id);
            const rows = {n: readout('n'), approximation: readout('approximation'), exact: readout('exact'), error: readout('error'), half: readout('half-error'), ratio: readout('ratio')};
            expect(parse(rows.n), id).toBe(expected.n);
            const exact = EXACT[expected.fn](0, expected.b);
            const shownError = shown(error(expected.rule, expected.fn, 0, expected.b, expected.n));
            expect(parse(rows.approximation), `${id} approximation`).toBeCloseTo(approx(expected.rule, expected.fn, 0, expected.b, expected.n), 4);
            expect(parse(rows.exact), `${id} exact`).toBeCloseTo(exact, 4);
            expect(parse(rows.error), `${id} error`).toBeCloseTo(shownError, 12);
            // The ratio is the quotient of the two displayed errors (or none).
            const half = expected.n / 2;
            const validHalf = expected.rule === 'simpson' ? half >= 2 && half % 2 === 0 : half >= 1;
            if (validHalf && shownError !== 0) {
                const quotient = shown(error(expected.rule, expected.fn, 0, expected.b, half)) / shownError;
                expect(parse(rows.half), `${id} half error`).toBeCloseTo(shown(error(expected.rule, expected.fn, 0, expected.b, half)), 12);
                expect(parse(rows.ratio), `${id} ratio`).toBeCloseTo(Number(quotient.toPrecision(3)), 6);
            } else {
                expect(Number.isNaN(parse(rows.ratio)), `${id} no ratio`).toBe(true);
            }
            // Every quoted scene number equals its displayed value to the quoted digits, in both languages.
            const displayed = [parse(rows.approximation), parse(rows.exact), parse(rows.error), parse(rows.ratio)];
            for (const token of expected.scene) {
                expect(displayed.some(value => matchesQuoted(value, token)), `${id} quotes ${token}`).toBe(true);
                for (const language of ['sl', 'en'] as const) expect(step.scene!.expectedState[language], `${id} ${language} scene ${token}`).toContain(asText(token, language));
            }
            for (const token of expected.step) for (const language of ['sl', 'en'] as const) {
                expect(prose(step, language), `${id} ${language} step ${token}`).toContain(asText(token, language));
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('N4: trapezoid and Simpson errors and ratios on sin over [0, pi] are the values the text quotes', () => {
    const errors = (rule: 'trapezoid' | 'simpson', ns: number[]) => ns.map(n => shown(error(rule, 'sin', 0, Math.PI, n)));
    expect(errors('trapezoid', [2, 4, 8])).toEqual([0.4292, 0.1039, 0.02577]);
    // The text quotes 0.0258, the displayed 0.02577 to three digits (n = 8 is a named change of n, not a scene)
    expect(Number(0.02577.toPrecision(3))).toBe(0.0258);
    expect(errors('simpson', [2, 4, 8])).toEqual([0.0944, 0.00456, 0.0002692]);
    expect(Number(0.0002692.toPrecision(3))).toBe(0.000269);
    const ratio = (rule: 'trapezoid' | 'simpson', n: number) => Number((shown(error(rule, 'sin', 0, Math.PI, n / 2)) / shown(error(rule, 'sin', 0, Math.PI, n))).toPrecision(3));
    expect([ratio('trapezoid', 4), ratio('trapezoid', 8)]).toEqual([4.13, 4.03]);
    expect([ratio('simpson', 4), ratio('simpson', 8), ratio('simpson', 16)]).toEqual([20.7, 16.9, 16.2]);
    expect(error('trapezoid', 'sin', 0, Math.PI, 16)).toBeCloseTo(0.00643, 5);
    expect(Number(error('trapezoid', 'sin', 0, Math.PI, 16).toPrecision(3))).toBe(0.00643);
    expect(Number(error('simpson', 'sin', 0, Math.PI, 16).toPrecision(3))).toBe(1.66e-5);
    // The quoted quotients are the quotients of the quoted errors.
    expect(Number((0.4292 / 0.1039).toPrecision(3))).toBe(4.13);
    expect(Number((0.00456 / 0.0002692).toPrecision(3))).toBe(16.9);
    // Simpson is exact for x^2 on [0, 3]; the trapezoid rule at n = 2 is off by 1.125.
    expect(Math.abs(approx('simpson', 'square', 0, 3, 2) - 9)).toBeLessThan(1e-12);
    expect(error('trapezoid', 'square', 0, 3, 2)).toBeCloseTo(1.125, 12);
    // The worked examples: T_2 = pi/2 and S_2 = 2 pi / 3.
    expect(approx('trapezoid', 'sin', 0, Math.PI, 2)).toBeCloseTo(Math.PI / 2, 12);
    expect(approx('simpson', 'sin', 0, Math.PI, 2)).toBeCloseTo(2 * Math.PI / 3, 12);
});
