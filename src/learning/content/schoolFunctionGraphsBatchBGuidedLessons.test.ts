/**
 * S3 (polynomial-zeros): every scene lands in the state the text states (real graph, one synchronous sequence of actions, out of order and
 * twice), and every number the lesson quotes is recomputed here from the product form, without the polynomial kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {schoolFunctionGraphsBatchBGuidedLessons} from './schoolFunctionGraphsBatchBGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {PolynomialZerosGraph} from '../../graphs/functions/PolynomialZerosGraph';
import {movePolynomialZero, polynomialExampleModel, type PolynomialZerosModel} from '../../analysis/polynomialZerosModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const polynomial = schoolFunctionGraphsBatchBGuidedLessons.find(entry => entry.demonstrationId === 'polynomial-zeros')!;
const stepOf = (lesson: GuidedLesson, stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]),
        ...polynomial.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = value.toFixed(decimals);
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

interface Zero {readonly z: number; readonly m: number}
/** Per scene: the polynomial the text states (zeros sorted by position) and whether p' is shown. */
const SCENES: Record<string, {k: number; zeros: Zero[]; derivative: boolean}> = {
    'poly-signs': {k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}], derivative: false},
    'poly-simple': {k: 1, zeros: [{z: -3, m: 1}, {z: 1, m: 2}], derivative: false},
    'poly-double': {k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}], derivative: true},
    'poly-triple': {k: 1, zeros: [{z: 1, m: 3}], derivative: true},
    'poly-degree': {k: 0.2, zeros: [{z: -3, m: 1}, {z: -1, m: 2}, {z: 2, m: 2}], derivative: false},
    'poly-intercept': {k: 1, zeros: [{z: -2, m: 1}, {z: 1, m: 2}], derivative: false},
    'poly-explore': {k: 0.2, zeros: [{z: -3, m: 1}, {z: -1, m: 2}, {z: 2, m: 2}], derivative: true},
};

/** The polynomial written out from the product form, not through the kernel. */
const p = (k: number, zeros: readonly Zero[]) => (x: number) => zeros.reduce((value, e) => value * (x - e.z) ** e.m, k);
const sign = (value: number) => Math.sign(value);
/** Central differences; the polynomials here have degree at most 5, so a step of 1e-3 is accurate to about 1e-5 for the first two derivatives. */
const d1 = (f: (x: number) => number, x: number, h = 1e-3) => (f(x + h) - f(x - h)) / (2 * h);
const d2 = (f: (x: number) => number, x: number, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);

function mount() {
    const graph = createGraph('polynomial-zeros');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as PolynomialZerosGraph, mounted,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(polynomial, stepId))) capabilities.apply(action);
        }),
    };
}
const modelOf = (graph: object) => (graph as unknown as {model: PolynomialZerosModel}).model;
const sorted = (zeros: readonly Zero[]) => zeros.map(({z, m}) => ({z, m})).sort((a, b) => a.z - b.z);

test('S3 has seven ordered steps, each with a scene of its own', () => {
    expect(polynomial.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(polynomial.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(polynomial.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('S3: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            m.scene(id);
            m.scene(id);
            const model = modelOf(m.graph);
            const expected = SCENES[id];
            expect({id, k: model.k, zeros: sorted(model.zeros), derivative: model.derivativeVisible})
                .toEqual({id, k: expected.k, zeros: sorted(expected.zeros), derivative: expected.derivative});
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S3: every scene states the zeros that cross and those that touch, and the graph does so (the product form, without the kernel)', () => {
    for (const [id, scene] of Object.entries(SCENES)) {
        const f = p(scene.k, scene.zeros);
        for (const {z, m} of scene.zeros) {
            const before = f(z - 0.05);
            const after = f(z + 0.05);
            // Odd multiplicity: the sign changes; even: it does not.
            expect(sign(before) * sign(after), `${id}: z=${z}`).toBe(m % 2 === 1 ? -1 : 1);
            // Multiplicity at least 2: p' vanishes, and p'' too from 3 on.
            expect(Math.abs(d1(f, z)) < 1e-4, `${id}: p'(${z})`).toBe(m >= 2);
        }
    }
});

test('S3: the checked numbers of the spec, recomputed without the kernel', () => {
    const f = p(1, [{z: -2, m: 1}, {z: 1, m: 2}]);
    expect(f(0)).toBe(2); // the y-intercept: k * prod (-z)^m = 1 * 2 * 1
    expect(1 * (0 + 2) ** 1 * (0 - 1) ** 2).toBe(2);
    expect(f(1)).toBe(0);
    for (const x of [-3, -2, -1, 0, 0.5, 1, 2, 3.5]) expect(f(x)).toBeCloseTo(x ** 3 - 3 * x + 2, 12); // the expansion x^3 - 3x + 2
    expect(d1(f, 1)).toBeCloseTo(0, 5); // p'(1) = 0
    expect(d2(f, 1)).toBeCloseTo(6, 4); // p''(1) = 6 > 0
    expect(3 * 1 ** 2 - 3).toBe(0); // p'(x) = 3x^2 - 3 at 1
    expect(6 * 1).toBe(6); // p''(x) = 6x at 1
    // The derivative also vanishes at -1, where p is not zero (the local maximum quoted in step 3).
    expect(d1(f, -1)).toBeCloseTo(0, 5);
    expect(f(-1)).toBe(4);
    // The signs of step 1: negative left of -2, positive between -2 and 1 and right of 1.
    expect([-3, -2.5, -1, 0, 0.5, 2, 5].map(x => sign(f(x)))).toEqual([-1, -1, 1, 1, 1, 1, 1]);
    // Step 2: (x + 3)(x - 1)^2 crosses at -3 and stays non-negative after it.
    const moved = p(1, [{z: -3, m: 1}, {z: 1, m: 2}]);
    expect([-4, -3.5].every(x => moved(x) < 0)).toBe(true);
    expect([-2.5, 0, 0.9, 1.1, 4].every(x => moved(x) > 0)).toBe(true);
    // Step 4: (x - 1)^3 is flat at 1 and crosses, with an inflection (p'' changes sign at 1).
    const triple = p(1, [{z: 1, m: 3}]);
    expect(d1(triple, 1)).toBeCloseTo(0, 5);
    expect(d2(triple, 1)).toBeCloseTo(0, 4);
    expect(d2(triple, 0.9)).toBeLessThan(0);
    expect(d2(triple, 1.1)).toBeGreaterThan(0);
    expect(triple(0.9)).toBeLessThan(0);
    expect(triple(1.1)).toBeGreaterThan(0);
    // Step 5: degree 1 + 2 + 2 = 5, k = 0.2 > 0 and the degree is odd: the left end is down and the right end up.
    const five = p(0.2, [{z: -3, m: 1}, {z: -1, m: 2}, {z: 2, m: 2}]);
    expect(1 + 2 + 2).toBe(5);
    expect(five(-1000)).toBeLessThan(0);
    expect(five(1000)).toBeGreaterThan(0);
    expect(five(1000) / (0.2 * 1000 ** 5)).toBeCloseTo(1, 1); // the leading term 0.2 x^5 dominates
    // An even degree has both ends on one side: (x + 1)^2 (x - 2)^2.
    const four = p(1, [{z: -1, m: 2}, {z: 2, m: 2}]);
    expect(sign(four(-1000))).toBe(sign(four(1000)));
});

test('S3: a zero dragged onto another merges (the triple zero of step 4); a merge above multiplicity 3 or degree 5 is refused with its reason', () => {
    const m = mount();
    try {
        act(() => { for (const action of actionsOf(stepOf(polynomial, 'poly-signs'))) m.graph.getLessonCapabilities().apply(action); });
        act(() => { m.graph.getLessonCapabilities().apply({kind: 'function-parameter', name: 'poly-zero-1', value: 1}); });
        expect(modelOf(m.graph).zeros).toEqual([{z: 1, m: 3}]);
        expect(modelOf(m.graph).k).toBe(1);
    } finally {
        m.mounted.view.unmount();
    }
    const five = polynomialExampleModel('degree-five');
    // The two double zeros -1 and 2 would merge into multiplicity 4.
    expect(movePolynomialZero(five, 2, -1)).toEqual({ok: false, issue: {kind: 'merge', z: -1, max: 3}});
    // A simple zero onto a double one gives multiplicity 3 and keeps the degree 5.
    const merged = movePolynomialZero(five, 0, -1);
    expect(merged.ok && merged.model.zeros).toEqual([{z: -1, m: 3}, {z: 2, m: 2}]);
});

test('S3: the quoted values are in the prose of the scene they belong to, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        const step = (id: string) => prose(stepOf(polynomial, id), language);
        const zero = (value: number) => `\\(${value}\\)`;
        // Every step names each of its zeros' positions and, for the degree step, the degree and k.
        for (const [id, scene] of Object.entries(SCENES)) {
            const text = step(id);
            for (const {z} of scene.zeros) expect(text, `${id} ${language}: zero ${z}`).toContain(zero(z));
        }
        expect(step('poly-double')).toContain('p^{\\prime}(1)=0');
        expect(step('poly-double')).toContain('p^{\\prime\\prime}(1)=6>0');
        expect(step('poly-triple')).toContain('p^{\\prime}(1)=0');
        expect(step('poly-triple')).toContain('\\((x-1)^3\\)');
        const five = SCENES['poly-degree'];
        expect(step('poly-degree')).toContain(`${num(five.k, 1, language)}`);
        expect(step('poly-degree')).toContain('1+2+2=5');
        expect(step('poly-intercept')).toContain('p(0)=2');
        expect(step('poly-intercept')).toContain('1\\cdot2^1\\cdot(-1)^2=2');
        expect(step('poly-intercept')).toContain('(0,2)');
        expect(step('poly-double')).toContain('p(-1)');
    }
});
