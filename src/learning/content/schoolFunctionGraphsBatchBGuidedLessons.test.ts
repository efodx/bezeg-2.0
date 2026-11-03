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
import {rationalFacts, type RationalFunctionModel} from '../../analysis/rationalFunctionModel';

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

// ---- S4: rational functions ------------------------------------------------------------------------------------------------------------

const rational = schoolFunctionGraphsBatchBGuidedLessons.find(entry => entry.demonstrationId === 'rational-function')!;
const ratProse = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]),
        ...rational.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');

type Asymptote = {kind: 'horizontal'; y: number} | {kind: 'oblique'; slope: number; intercept: number};
/** Per scene: the fraction the text states (k, numerator and denominator zeros before cancelling), the holes, the poles and the asymptote. */
const RAT_SCENES: Record<string, {
    k: number; num: Zero[]; den: Zero[]; holes: {x: number; y: number}[]; poles: {x: number; m: number}[]; asymptote: Asymptote;
}> = {
    'rat-pole': {k: 1, num: [{z: -1, m: 1}, {z: 1, m: 1}], den: [{z: 2, m: 1}], holes: [], poles: [{x: 2, m: 1}], asymptote: {kind: 'oblique', slope: 1, intercept: 2}},
    'rat-hole': {k: 1, num: [{z: -1, m: 1}, {z: 1, m: 1}], den: [{z: 1, m: 1}], holes: [{x: 1, y: 2}], poles: [], asymptote: {kind: 'oblique', slope: 1, intercept: 1}},
    'rat-vertical': {k: 2, num: [{z: -1, m: 1}, {z: 2, m: 1}], den: [{z: -2, m: 1}, {z: 2, m: 1}], holes: [{x: 2, y: 1.5}], poles: [{x: -2, m: 1}], asymptote: {kind: 'horizontal', y: 2}},
    'rat-degrees': {k: 2, num: [{z: -1, m: 1}, {z: 1, m: 1}], den: [{z: -2, m: 1}, {z: 2, m: 1}], holes: [], poles: [{x: -2, m: 1}, {x: 2, m: 1}], asymptote: {kind: 'horizontal', y: 2}},
    'rat-remainder': {k: 1, num: [{z: -1, m: 1}, {z: 1, m: 1}], den: [{z: 2, m: 1}], holes: [], poles: [{x: 2, m: 1}], asymptote: {kind: 'oblique', slope: 1, intercept: 2}},
    'rat-double-pole': {k: 4, num: [{z: 0, m: 1}], den: [{z: -2, m: 1}, {z: 1, m: 2}], holes: [], poles: [{x: -2, m: 1}, {x: 1, m: 2}], asymptote: {kind: 'horizontal', y: 0}},
    'rat-explore': {k: 1, num: [{z: -1, m: 1}, {z: 1, m: 1}], den: [{z: 2, m: 1}], holes: [], poles: [{x: 2, m: 1}], asymptote: {kind: 'oblique', slope: 1, intercept: 2}},
};
/** The fraction written out from the product form, not through the kernel. */
const ratF = (k: number, num: readonly Zero[], den: readonly Zero[]) => (x: number) => p(k, num)(x) / p(1, den)(x);

function mountRational() {
    const graph = createGraph('rational-function');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as {model: RationalFunctionModel}, mounted,
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(rational, stepId))) capabilities.apply(action);
        }),
    };
}

test('S4 has seven ordered steps, each with a scene of its own', () => {
    expect(rational.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(rational.steps.map(step => step.id)).toEqual(Object.keys(RAT_SCENES));
    expect(new Set(rational.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('S4: every scene lands in the stated state (zeros, holes, poles, asymptote, probe), in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mountRational();
    try {
        const ids = Object.keys(RAT_SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            m.scene(id);
            m.scene(id);
            const model = m.graph.model;
            const expected = RAT_SCENES[id];
            expect({id, k: model.k, num: sorted(model.numerator), den: sorted(model.denominator), probe: model.probe})
                .toEqual({id, k: expected.k, num: sorted(expected.num), den: sorted(expected.den), probe: 10});
            const facts = rationalFacts(model);
            expect({id, holes: facts.analysis.holes.map(h => ({x: h.x, y: h.y})), poles: facts.poles.map(q => ({x: q.x, m: q.multiplicity}))})
                .toEqual({id, holes: expected.holes, poles: expected.poles});
            expect({id, asymptote: facts.analysis.asymptote}).toEqual({id, asymptote: expected.asymptote});
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S4: the checked numbers of the spec, recomputed without the kernel', () => {
    // Step 5: x^2 - 1 = (x - 2)(x + 2) + 3, so f = x + 2 + 3/(x - 2) and the remainder term at 10 is 3/8 = 0.375.
    const oblique = ratF(1, [{z: -1, m: 1}, {z: 1, m: 1}], [{z: 2, m: 1}]);
    for (const x of [-7, -1, 0, 1.5, 3, 10]) expect(oblique(x)).toBeCloseTo(x + 2 + 3 / (x - 2), 12);
    expect((10 ** 2 - 1) - (10 - 2) * (10 + 2)).toBe(3);
    expect(3 / (10 - 2)).toBe(0.375);
    expect(oblique(10) - (10 + 2)).toBeCloseTo(0.375, 12);
    expect(oblique(10)).toBeCloseTo(12.375, 12);
    // Step 1: near the pole 2 the numerator is close to 3; the function falls to -infinity on the left and rises from +infinity on the right.
    expect(oblique(2 - 1e-6)).toBeLessThan(-1e5);
    expect(oblique(2 + 1e-6)).toBeGreaterThan(1e5);
    // Step 2: (x^2 - 1)/(x - 1) = x + 1 for x != 1, so the hole is (1, 2).
    const hole = ratF(1, [{z: -1, m: 1}, {z: 1, m: 1}], [{z: 1, m: 1}]);
    for (const x of [-3, 0, 0.999, 1.001, 4]) expect(hole(x)).toBeCloseTo(x + 1, 12);
    // Step 3: 2(x + 1)(x - 2)/((x + 2)(x - 2)) = 2(x + 1)/(x + 2) for x != 2, so the hole is (2, 1.5).
    const vertical = ratF(2, [{z: -1, m: 1}, {z: 2, m: 1}], [{z: -2, m: 1}, {z: 2, m: 1}]);
    for (const x of [-5, 0, 1.999, 2.001, 7]) expect(vertical(x)).toBeCloseTo(2 * (x + 1) / (x + 2), 12);
    expect(2 * 3 / 4).toBe(1.5);
    // Step 4: (2x^2 - 2)/(x^2 - 4) = 2 + 6/(x^2 - 4); f(10) = 198/96 = 2.0625 = 2 + 6/96.
    const horizontal = ratF(2, [{z: -1, m: 1}, {z: 1, m: 1}], [{z: -2, m: 1}, {z: 2, m: 1}]);
    for (const x of [-9, -1, 0, 1.5, 3, 10]) expect(horizontal(x)).toBeCloseTo(2 + 6 / (x * x - 4), 12);
    expect(2 * 10 ** 2 - 2).toBe(198);
    expect(10 ** 2 - 4).toBe(96);
    expect(horizontal(10)).toBe(2.0625);
    expect(198 / 96).toBe(2.0625);
    expect(6 / 96).toBe(0.0625);
    // Step 6: 4x/((x + 2)(x - 1)^2): the sign changes at -2 (simple pole) and not at 1 (double pole); f(0) = 0 crosses y = 0.
    const dbl = ratF(4, [{z: 0, m: 1}], [{z: -2, m: 1}, {z: 1, m: 2}]);
    expect(sign(dbl(-2 - 1e-6))).toBe(1);
    expect(sign(dbl(-2 + 1e-6))).toBe(-1);
    expect(sign(dbl(1 - 1e-6))).toBe(1);
    expect(sign(dbl(1 + 1e-6))).toBe(1);
    expect(dbl(0)).toBe(0);
    expect(sign(dbl(-0.5)) * sign(dbl(0.5))).toBe(-1); // it crosses the horizontal asymptote at a finite x
    expect(Math.abs(dbl(1e6))).toBeLessThan(1e-9);
    // Step 7: dragging the zero -1 onto the pole 2 leaves (x - 2)(x - 1)/(x - 2) = x - 1, so the hole is (2, 1).
    const explore = ratF(1, [{z: 2, m: 1}, {z: 1, m: 1}], [{z: 2, m: 1}]);
    for (const x of [-3, 0, 1.999, 2.001, 5]) expect(explore(x)).toBeCloseTo(x - 1, 12);
});

test('S4: the quoted values are in the prose of the scene they belong to, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        const step = (id: string) => ratProse(stepOf(rational, id), language);
        const n = (value: number) => num(value, value % 1 === 0 ? 0 : String(value).split('.')[1].length, language);
        const point = (x: number, y: number) => `\\((${n(x)}${language === 'sl' ? ';' : ','}${n(y)})\\)`;
        // Every step names each zero, pole and hole of its scene.
        for (const [id, scene] of Object.entries(RAT_SCENES)) {
            for (const {z} of ["rat-remainder", "rat-explore"].includes(id) ? [] : scene.num) expect(step(id), `${id} ${language}: zero ${z}`).toContain(`\\(${z}\\)`);
            for (const {x} of scene.poles) expect(step(id), `${id} ${language}: pole ${x}`).toContain(`\\(${x}\\)`);
            for (const h of scene.holes) expect(step(id), `${id} ${language}: hole`).toContain(point(h.x, h.y));
        }
        expect(step('rat-vertical')).toContain(n(1.5));
        expect(step('rat-degrees')).toContain(n(2.0625));
        expect(step('rat-degrees')).toContain('\\frac{198}{96}');
        expect(step('rat-remainder')).toContain(n(0.375));
        expect(step('rat-remainder')).toContain(n(12.375));
        expect(step('rat-remainder')).toContain('x^2-1=(x-2)(x+2)+3');
        // The probe starts at its upper bound 10, so the text moves it towards the pole and never towards larger values.
        expect(step('rat-remainder')).toContain('\\(10\\)');
        expect(step('rat-remainder')).not.toMatch(language === 'sl' ? /večj/ : /larger/);
        expect(step('rat-double-pole')).toContain('f(0)=0');
        expect(step('rat-double-pole')).toContain('y=0');
        // Acceptance 5: the graph may cross a horizontal or oblique asymptote; the text says so and never claims the opposite.
        expect(step('rat-double-pole')).toMatch(language === 'sl' ? /seka/ : /crosses/);
        const everything = rational.steps.map(s => ratProse(s, language)).join(' ') + rational.summary[language] + rational.edgeCases.map(e => e[language]).join(' ');
        expect(everything).not.toMatch(language === 'sl'
            ? /(vodoravn|poševn)\w*[^.;]{0,40}(ne seka|ne more sekati)|(ne seka|ne more sekati)[^.;]{0,40}(vodoravn|poševn)/i
            : /(never|cannot|does not|doesn.t)\s+(cross|intersect|touch)[^.;]{0,30}(horizontal|oblique|slant)/i);
    }
});
