/**
 * F1 and F3 (fourier-series): every scene lands in the state the text states (real graph, one synchronous sequence of actions), and every
 * number the lesson quotes is a value of the scene it belongs to. The values are recomputed here by a direct sum of the series and by
 * quadrature, never by the kernel in `src/analysis/fourierSeriesModel.ts`.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {fourierSeriesGuidedLessons} from './fourierSeriesGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import type {FourierSeriesGraph} from '../../graphs/functions/FourierSeriesGraph';
import {fourierPartialSum} from '../../analysis/fourierSeriesModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = fourierSeriesGuidedLessons.find(entry => entry.demonstrationId === 'fourier-series')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = value.toFixed(decimals);
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

// ---- Independent values: the series summed term by term, the peak at pi/(N+1), Si(pi) by Simpson quadrature -------------------------
/** S_N for the square wave, 4/pi times the sum of sin(kx)/k over odd k up to N (even k have b_k = 0). */
const square = (n: number, x: number) => {
    let sum = 0;
    for (let k = 1; k <= n; k += 1) if (k % 2 === 1) sum += Math.sin(k * x) / k;
    return 4 / Math.PI * sum;
};
/** S_N for the sawtooth f(x) = x, the sum of 2 (-1)^(k+1) sin(kx)/k. */
const sawtooth = (n: number, x: number) => {
    let sum = 0;
    for (let k = 1; k <= n; k += 1) sum += 2 * (k % 2 === 1 ? 1 : -1) * Math.sin(k * x) / k;
    return sum;
};
const sineIntegralPi = () => {
    const m = 2000;
    const h = Math.PI / m;
    const g = (t: number) => (t === 0 ? 1 : Math.sin(t) / t);
    let sum = g(0) + g(Math.PI);
    for (let i = 1; i < m; i += 1) sum += (i % 2 === 1 ? 4 : 2) * g(i * h);
    return sum * h / 3;
};
const peakX = (n: number) => Math.PI / (n + 1);

/** Per scene: the example, N, x and epsilon (the state the text states) and the numbers the text quotes (value, decimals). */
type Scene = {example: 'square' | 'sawtooth'; n: number; x: number; epsilon: number; quoted: [number, number][]};
const SCENES: Record<string, Scene> = {
    'fourier-wave': {example: 'square', n: 1, x: 1.57, epsilon: 0.1, quoted: [[square(1, 1.57), 5]]},
    'fourier-third': {example: 'square', n: 3, x: 1.57, epsilon: 0.1, quoted: [[square(3, 1.57), 5], [1 - square(3, 1.57), 5]]},
    'fourier-more': {example: 'square', n: 11, x: 1.57, epsilon: 0.1, quoted: [[square(11, 1.57), 5], [square(101, 1.57), 5]]},
    'fourier-error': {example: 'square', n: 101, x: 0.5, epsilon: 0.1, quoted: [[Math.abs(1 - square(11, 0.5)), 5], [Math.abs(1 - square(101, 0.5)), 5], [Math.abs(1 - square(1001, 0.5)), 5]]},
    'fourier-jump': {example: 'square', n: 11, x: 0, epsilon: 0.1, quoted: []},
    'fourier-sawtooth': {example: 'sawtooth', n: 11, x: 1, epsilon: 0.1, quoted: [[sawtooth(11, 1), 5], [1 - sawtooth(11, 1), 5]]},
    'fourier-gibbs-predict': {example: 'square', n: 11, x: 0.5, epsilon: 0.1, quoted: []},
    'fourier-gibbs-peak': {example: 'square', n: 11, x: 0.26, epsilon: 0.1, quoted: [
        [square(11, peakX(11)), 5], [peakX(11), 4], [square(11, peakX(11)) - 1, 5], [(square(11, peakX(11)) - 1) / 2 * 100, 2]]},
    'fourier-gibbs-narrow': {example: 'square', n: 101, x: 0.03, epsilon: 0.1, quoted: [
        [square(101, peakX(101)), 5], [peakX(101), 4], [(square(101, peakX(101)) - 1) / 2 * 100, 2], [square(11, peakX(11)), 5], [square(1001, peakX(1001)), 5]]},
    'fourier-gibbs-fixed': {example: 'square', n: 101, x: 0.5, epsilon: 0.1, quoted: [[Math.abs(1 - square(11, 0.5)), 5], [Math.abs(1 - square(101, 0.5)), 5], [Math.abs(1 - square(1001, 0.5)), 5]]},
    'fourier-gibbs-band': {example: 'square', n: 1001, x: 0.5, epsilon: 0.1, quoted: [[square(1001, peakX(1001)), 5], [1 - square(101, 1e-6), 5]]},
    'fourier-gibbs-sawtooth': {example: 'sawtooth', n: 101, x: 1, epsilon: 0.1, quoted: [
        [sawtooth(101, Math.PI - peakX(101)), 5], [(sawtooth(101, Math.PI - peakX(101)) - Math.PI) / (2 * Math.PI) * 100, 2], [sawtooth(101, 1) - 1, 5]]},
    'fourier-explore': {example: 'square', n: 11, x: 0.5, epsilon: 0.1, quoted: [[square(1001, peakX(1001)), 5]]},
};

function mount() {
    const graph = createGraph('fourier-series');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as FourierSeriesGraph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
    };
}

test('the lesson is F1 then F3 on fourier-series: thirteen ordered steps, each with a scene of its own', () => {
    expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: 13}, (_, i) => i + 1));
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(13);
});

test('every scene lands in the stated state, applied out of order and twice in one synchronous sequence', () => {
    const m = mount();
    try {
        const order = Object.entries(SCENES).reverse();
        for (const [id, expected] of [...order, ...Object.entries(SCENES)]) {
            m.scene(stepOf(id));
            m.scene(stepOf(id));
            const state = m.graph.state.model;
            expect({id, example: state.example, n: state.n, x: state.x, epsilon: state.epsilon})
                .toEqual({id, example: expected.example, n: expected.n, x: expected.x, epsilon: expected.epsilon});
            // The graph's own sum agrees with the direct sum at the scene's point.
            const direct = expected.example === 'square' ? square : sawtooth;
            expect(fourierPartialSum(state.example, state.n, state.x), id).toBeCloseTo(direct(state.n, state.x), 9);
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('F1: the checked partial-sum values, the midpoint at the jump and the even-N rule', () => {
    expect(square(1, 1.57)).toBeCloseTo(1.27324, 5);
    expect(square(3, 1.57)).toBeCloseTo(0.84883, 5);
    // The spec's values at x = pi/2.
    expect(square(3, Math.PI / 2)).toBeCloseTo(0.84883, 5);
    expect(square(5, Math.PI / 2)).toBeCloseTo(1.10347, 5);
    expect(square(11, Math.PI / 2)).toBeCloseTo(0.94730, 5);
    expect(square(101, Math.PI / 2)).toBeCloseTo(1.00624, 5);
    // S_N(0) = 0 for every N, the midpoint of -1 and 1.
    for (const n of [1, 2, 3, 11, 50, 101]) expect(square(n, 0)).toBe(0);
    // Even N adds nothing: the coefficients of the even harmonics are 0.
    expect(square(12, 1.57)).toBe(square(11, 1.57));
    expect(fourierPartialSum('square', 12, 1.57)).toBeCloseTo(fourierPartialSum('square', 11, 1.57), 12);
    // Sawtooth: S_N(pi) = 0, the midpoint of -pi and pi; the sums approach x.
    expect(Math.abs(sawtooth(11, Math.PI))).toBeLessThan(1e-12);
    expect(sawtooth(11, 1)).toBeCloseTo(0.91464, 5);
    expect(sawtooth(101, 1) - 1).toBeCloseTo(0.00927, 5);
});

test('F3: the peak values and positions, the limit 2 Si(pi)/pi and the percentages the text quotes', () => {
    [[1, 1.27324], [3, 1.20042], [5, 1.18836], [11, 1.18130], [101, 1.17901], [1001, 1.17898]]
        .forEach(([n, value]) => expect(square(n, peakX(n)), `N=${n}`).toBeCloseTo(value, 5));
    // The closed-form abscissa is the maximiser: a local scan around it finds nothing higher.
    for (const n of [11, 101]) {
        const best = Array.from({length: 2001}, (_, i) => peakX(n) * (0.5 + i / 2000)).reduce((a, x) => Math.max(a, square(n, x)), 0);
        expect(best).toBeCloseTo(square(n, peakX(n)), 9);
    }
    expect(peakX(11)).toBeCloseTo(0.2618, 4);
    expect(peakX(101)).toBeCloseTo(0.0308, 4);
    expect(peakX(1001)).toBeCloseTo(0.00314, 5);
    expect(sineIntegralPi()).toBeCloseTo(1.851937052, 8);
    const limit = 2 * sineIntegralPi() / Math.PI;
    expect(limit).toBeCloseTo(1.1789797, 6);
    expect(((limit - 1) / 2 * 100).toFixed(2)).toBe('8.95');
    expect(((square(11, peakX(11)) - 1) / 2 * 100).toFixed(2)).toBe('9.07');
    // Pointwise at a fixed x the error falls; near the jump it tends to 1 for every N, so sup |S_N - f| >= 1.
    expect(1 - square(101, 1e-6)).toBeCloseTo(0.99994, 5);
    for (const n of [11, 101, 1001]) expect(1 - square(n, 1e-9)).toBeGreaterThan(0.999);
    // The band: with epsilon = 0.1 the peak is outside at every N tried.
    for (const n of [11, 101, 1001]) expect(square(n, peakX(n))).toBeGreaterThan(1 + 0.1);
    // The sawtooth marked point at N = 101.
    expect(sawtooth(101, Math.PI - peakX(101))).toBeCloseTo(3.67302, 5);
});

test('the numbers the prose quotes are the scene values, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, expected] of Object.entries(SCENES)) {
            const text = prose(stepOf(id), language);
            for (const [value, decimals] of expected.quoted) expect(text, `${id} ${language} ${value}`).toContain(num(value, decimals, language));
        }
        // The formula explanations quote the limit and the finite-N share.
        const limit = lesson.formulaBlocks.find(block => block.id === 'gibbs-limit')!.explanation[language];
        expect(limit).toContain(num(2 * sineIntegralPi() / Math.PI, 5, language));
        expect(limit).toContain(num(8.95, 2, language));
        expect(limit).toContain(num(9.07, 2, language));
        const worked = lesson.workedExamples.find(example => example.id === 'gibbs-peak-eleven')!;
        expect(worked.resultLatex).toBe(num(square(11, peakX(11)), 5, 'sl'));
        expect(lesson.workedExamples.find(example => example.id === 'square-three-terms')!.resultLatex).toBe(num(square(3, 1.57), 5, 'sl'));
    }
});

test('the theorems are stated with their sources, and the overshoot is not presented as a bug or as universal', () => {
    const lower = (id: string, language: 'sl' | 'en') => prose(stepOf(id), language).toLowerCase();
    const dirichlet = lesson.formulaBlocks.find(block => block.id === 'dirichlet-midpoint')!.explanation;
    expect(dirichlet.en).toContain('Dirichlet');
    expect(dirichlet.en).toContain('piecewise smooth');
    expect(dirichlet.en).toContain('does not hold for every continuous function');
    expect(dirichlet.sl).toContain('ne velja za vsako zvezno funkcijo');
    expect(lower('fourier-jump', 'en')).toContain('midpoint');
    expect(lower('fourier-gibbs-narrow', 'en')).toContain('does not disappear');
    expect(lower('fourier-gibbs-narrow', 'en')).toContain('illustration');
    expect(lower('fourier-gibbs-narrow', 'sl')).toContain('ponazoritev');
    expect(lower('fourier-gibbs-peak', 'en')).toContain('not a numerical or drawing error');
    expect(lower('fourier-gibbs-band', 'en')).toContain('pointwise but not uniform');
    expect(lower('fourier-gibbs-band', 'sl')).toContain('točkovna');
    expect(lower('fourier-gibbs-band', 'sl')).toContain('enakomerna');
    expect(lower('fourier-more', 'en')).toContain('n=12');
    expect(lesson.sources.map(source => source.id)).toContain('zygmund-trigonometric-series');
    expect(lesson.sources.find(source => source.id === 'bezeg-uniform-convergence-lesson')!.citation).toContain('/bezeg-2.0/analysis/uniform-convergence');
});
