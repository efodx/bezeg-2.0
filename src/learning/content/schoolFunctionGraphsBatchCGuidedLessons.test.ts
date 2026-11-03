/**
 * S5 (geometric-series): every scene lands in the state the text states (real graph, one synchronous sequence of actions, out of order and
 * twice), and every number the lesson quotes is recomputed here by adding terms, without the series kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {schoolFunctionGraphsBatchCGuidedLessons} from './schoolFunctionGraphsBatchCGuidedLessons';
import {FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES, type LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {GeometricSeriesModel} from '../../analysis/geometricSeriesModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const series = schoolFunctionGraphsBatchCGuidedLessons.find(entry => entry.demonstrationId === 'geometric-series')!;
const stepOf = (stepId: string): GuidedLessonStep => series.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]),
        ...series.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = String(Number(value.toFixed(decimals)));
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

/** Per step: the series the text states (a, q, shown terms n, tolerance). */
const SCENES: Record<string, {a: number; q: number; terms: number; tolerance: number}> = {
    'series-bars': {a: 1, q: 0.5, terms: 3, tolerance: 0},
    'series-predict': {a: 1, q: 0.5, terms: 4, tolerance: 0},
    'series-reveal': {a: 1, q: 0.5, terms: 5, tolerance: 0},
    'series-limit': {a: 1, q: 0.5, terms: 5, tolerance: 0},
    'series-alternating': {a: 1, q: -0.5, terms: 4, tolerance: 0},
    'series-divergence': {a: 1, q: -1, terms: 6, tolerance: 0},
    'series-decimals': {a: 0.3, q: 0.1, terms: 4, tolerance: 0},
    'series-explore': {a: 1, q: 0.5, terms: 8, tolerance: 0.01},
};

/** S_n by adding the first n terms, without the closed form or the kernel. */
const partialSum = (a: number, q: number, n: number) => {
    let sum = 0;
    let term = a;
    for (let k = 0; k < n; k++) { sum += term; term *= q; }
    return sum;
};

function mount() {
    const graph = createGraph('geometric-series');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as {model: GeometricSeriesModel; controller: {isPlaying(): boolean}}, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}

test('S5 has eight ordered steps, each with a scene of its own', () => {
    expect(series.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(series.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(series.steps.map(step => step.scene!.id)).size).toBe(8);
});

test('S5: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice, and never plays', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            m.scene(id);
            m.scene(id);
            const {a, q, terms, tolerance} = m.graph.model;
            expect({id, a, q, terms, tolerance}).toEqual({id, ...SCENES[id]});
            expect({id, playing: m.graph.controller.isPlaying()}).toEqual({id, playing: false});
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S5: the checked numbers of the spec, recomputed by adding terms', () => {
    // Default a = 1, q = 1/2: S1..S5 = 1, 1.5, 1.75, 1.875, 1.9375 (= 31/16); the limit is 2.
    expect([1, 2, 3, 4, 5].map(n => partialSum(1, 0.5, n))).toEqual([1, 1.5, 1.75, 1.875, 1.9375]);
    expect(partialSum(1, 0.5, 5)).toBe(31 / 16);
    expect(1 / (1 - 0.5)).toBe(2);
    expect(2 - partialSum(1, 0.5, 4)).toBe(0.125);
    expect(2 - partialSum(1, 0.5, 5)).toBe(0.0625);
    expect(0.5 ** 4).toBe(0.0625); // the fifth term
    // The closed form agrees with adding.
    for (const n of [1, 3, 5, 8, 20]) expect(partialSum(1, 0.5, n)).toBeCloseTo((1 - 0.5 ** n) / (1 - 0.5), 12);
    // Alternating q = -1/2: S1..S4 = 1, 0.5, 0.75, 0.625, limit 2/3, S odd above it and S even below it.
    expect([1, 2, 3, 4].map(n => partialSum(1, -0.5, n))).toEqual([1, 0.5, 0.75, 0.625]);
    expect(1 / (1 + 0.5)).toBeCloseTo(2 / 3, 15);
    for (const n of [1, 3]) expect(partialSum(1, -0.5, n)).toBeGreaterThan(2 / 3);
    for (const n of [2, 4]) expect(partialSum(1, -0.5, n)).toBeLessThan(2 / 3);
    // q = -1: S1..S6 = 1, 0, 1, 0, 1, 0 (oscillation between a and 0, no limit).
    expect([1, 2, 3, 4, 5, 6].map(n => partialSum(1, -1, n))).toEqual([1, 0, 1, 0, 1, 0]);
    // 0.333... = 0.3 + 0.03 + ...: a = 3/10, q = 1/10, S4 = 0.3333, limit (3/10)/(1 - 1/10) = 1/3; 0.999...: (9/10)/(9/10) = 1.
    expect(partialSum(0.3, 0.1, 4)).toBeCloseTo(0.3333, 12);
    expect(0.3 / (1 - 0.1)).toBeCloseTo(1 / 3, 15);
    expect(0.9 / (1 - 0.1)).toBeCloseTo(1, 15);
    expect(partialSum(0.9, 0.1, 8)).toBeLessThan(1);
    // Band: the error 2 * 2^-n is below 0.01 exactly from n = 8 on (2^7 = 128 < 200 < 256 = 2^8).
    const errors = [6, 7, 8, 9, 10].map(n => 2 - partialSum(1, 0.5, n));
    expect(errors.map(error => error < 0.01)).toEqual([false, false, true, true, true]);
    expect(2 - partialSum(1, 0.5, 8)).toBe(1 / 128);
    expect(2 - partialSum(1, 0.5, 7)).toBe(1 / 64);
    expect(1 / 128).toBeCloseTo(0.0078, 4);
    expect(1 / 64).toBeCloseTo(0.0156, 4);
});

test('S5: the quoted values are in the prose of the scene they belong to, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        const say = (value: number, decimals = 4) => num(value, decimals, language);
        const text = (id: string) => prose(stepOf(id), language);
        const sum = (id: string) => say(partialSum(SCENES[id].a, SCENES[id].q, SCENES[id].terms));
        // The partial sum a scene displays is the one its text quotes.
        for (const id of ['series-bars', 'series-predict', 'series-reveal', 'series-limit', 'series-alternating', 'series-divergence', 'series-decimals']) {
            expect(stepOf(id).scene!.expectedState[language], `${id} ${language}`).toContain(`S_${SCENES[id].terms}=${sum(id)}`);
        }
        expect(stepOf('series-limit').scene!.expectedState[language]).toContain(`=${say(2, 0)}`);
        expect(text('series-limit')).toContain(`2-S_5=${say(2 - partialSum(1, 0.5, 5))}`);
        expect(text('series-reveal')).toContain('1-(1/2)^5');
        expect(text('series-alternating')).toContain('\\dfrac23');
        expect(text('series-divergence')).toContain('S_6=0');
        expect(text('series-decimals')).toContain('\\dfrac13');
        expect(text('series-decimals')).toContain(`0${language === 'sl' ? '{,}' : '.'}999\\dots=1`);
        expect(text('series-explore')).toContain(say(0.01, 2));
        expect(text('series-explore')).toContain('n=8');
        expect(stepOf('series-explore').scene!.expectedState[language]).toContain(say(1 / 128, 4));
    }
});

test('S5: the scene actions are the registered names; an unknown name, an unknown example and an out-of-range value are rejected, not rounded', () => {
    expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['series-a', 'series-q', 'series-n', 'series-tolerance']));
    expect(FUNCTION_PARAMETER_NAMES as readonly string[]).not.toContain('series-bogus');
    expect(FUNCTION_CHOICE_VALUES['series-example']).toEqual(['default', 'alternating', 'repeating-three', 'repeating-nine', 'divergent']);
    const m = mount();
    try {
        const apply = (action: unknown) => act(() => { m.capabilities.apply(action as LessonAction); });
        expect(() => apply({kind: 'function-parameter', name: 'series-bogus', value: 1})).toThrow();
        expect(() => apply({kind: 'function-choice', name: 'series-example', value: 'bogus'})).toThrow();
        for (const [name, value] of [['series-a', 6], ['series-q', 2.5], ['series-n', 51], ['series-n', 0], ['series-n', 2.5], ['series-tolerance', 1.5]] as const) {
            expect(() => apply({kind: 'function-parameter', name, value}), `${name}=${value}`).toThrow();
        }
        expect(m.graph.model).toEqual({a: 1, q: 0.5, terms: 1, tolerance: 0});
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
