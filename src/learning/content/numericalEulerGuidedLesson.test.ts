/**
 * N5 (Euler): every scene lands in the state the text states (real graph, one synchronous sequence of actions, out of order and twice), the
 * readouts the graph displays equal an independent Euler loop, and every decimal the lesson quotes (Slovenian and English) equals a displayed
 * value of its scene, a value of a named change (step 5) or a node, slope or factor of the Euler loop itself.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {eulerGuidedLessons} from './numericalEulerGuidedLesson';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = eulerGuidedLessons[0];
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
const asText = (token: string, language: 'sl' | 'en') => language === 'sl' ? token.replace('.', '{,}') : token;
const parse = (text: string) => Number(text.replace(/\s/g, '').replace(',', '.').replace('−', '-'));

// ---- The independent reference: its own Euler loop and closed forms, nothing from odeEuler or eulerModel -------------------------------
type Example = 'exponential' | 'linear-relaxation';
const F: Record<Example, (x: number, y: number) => number> = {exponential: (_x, y) => y, 'linear-relaxation': (x, y) => x - y};
/** Exact solution through (x0, y0): y' = y gives y0 e^(x-x0); y' = x - y gives x - 1 + (y0 - x0 + 1) e^(x0-x). */
const EXACT: Record<Example, (x0: number, y0: number, x: number) => number> = {
    exponential: (x0, y0, x) => y0 * Math.exp(x - x0),
    'linear-relaxation': (x0, y0, x) => x - 1 + (y0 - x0 + 1) * Math.exp(x0 - x),
};
function euler(example: Example, x0: number, y0: number, h: number, end: number) {
    const nodes = [{x: x0, y: y0, slope: F[example](x0, y0)}];
    let x = x0;
    let y = y0;
    // The last step is shortened to land on the end x, as the graph does when the step does not divide the interval.
    while (x < end - 1e-12) {
        const width = Math.min(h, end - x);
        y += width * F[example](x, y);
        x = Math.abs(end - (x + width)) < 1e-12 ? end : x + width;
        nodes.push({x, y, slope: F[example](x, y)});
    }
    return {n: nodes.length - 1, nodes, value: y};
}
/** Four significant digits, as the graph displays an error (zero below 1e-12). */
const shown = (value: number) => Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(4));
const fixed4 = (value: number) => Number(value.toFixed(4));
function reference(example: Example, x0: number, y0: number, h: number, end: number) {
    const run = euler(example, x0, y0, h, end);
    const exact = EXACT[example](x0, y0, end);
    const error = shown(Math.abs(exact - run.value));
    // A ratio needs a 2h run of at least one full step: with 2h longer than [x0, end] it would be one shortened step.
    const doubleStep = [1, 0.5, 0.25, 0.125].includes(2 * h) && end - x0 >= 2 * h ? 2 * h : undefined;
    const doubleError = doubleStep === undefined ? undefined : shown(Math.abs(exact - euler(example, x0, y0, doubleStep, end).value));
    const ratio = doubleError !== undefined && error !== 0 ? Number((doubleError / error).toPrecision(3)) : undefined;
    const doubleValue = doubleStep === undefined ? undefined : euler(example, x0, y0, doubleStep, end).value;
    return {...run, exact, error, doubleStep, doubleError, doubleValue, ratio};
}

interface SceneExpectation {
    readonly h: number; readonly end: number; readonly y0: number; readonly showExact: boolean;
    /** Decimals the scene text must contain verbatim (SL and EN) beyond those checked as displayed. */
    readonly scene: string[];
    /** Decimals the step prose (explanation, observations, worked example) must contain. */
    readonly step: string[];
}
const SCENES: Record<string, SceneExpectation> = {
    'field-predict': {h: 0.5, end: 0, y0: 1, showExact: false, scene: [], step: []},
    'one-step': {h: 0.5, end: 0.5, y0: 1, showExact: false, scene: ['1.5'], step: ['1.5', '0.5']},
    'polyline': {h: 0.5, end: 1, y0: 1, showExact: false, scene: ['2.25'], step: ['2.25', '1.5']},
    'halve-h': {h: 0.25, end: 1, y0: 1, showExact: true, scene: ['2.4414', '2.7183', '0.2769', '0.4683', '1.69'], step: ['2.4414', '0.2769', '0.4683', '1.69', '2.25', '2.7183']},
    'error-ratios': {h: 0.125, end: 1, y0: 1, showExact: true, scene: ['2.5658', '2.7183', '0.1525', '0.2769', '1.82'], step: ['2.5658', '0.1525', '1.82', '1.69', '0.4683', '0.2769']},
    'initial-point': {h: 0.25, end: 1, y0: 2, showExact: true, scene: ['4.8828', '5.4366', '0.5538', '0.9366', '1.69'], step: ['4.8828', '5.4366', '0.5538', '0.9366', '1.69']},
    'euler-explore': {h: 0.5, end: 1, y0: 1, showExact: true, scene: ['2.25', '2.7183', '0.4683'], step: ['2.25', '0.4683']},
};
const ORDER = Object.keys(SCENES);

/** The decimals the text of a step may quote besides the displayed values: the Euler nodes and slopes of the scene, the factor 1 + h, and
 * the named changes of step 5 (the step h of 0.5, 0.25 and 0.125 on y' = y and on y' = x - y, whose h = 1 error 0.7358 is the exact value 2/e). */
function allowedValues(id: string): number[] {
    const s = SCENES[id];
    const values: number[] = [s.h, s.end, s.y0, 1 + s.h];
    const add = (r: ReturnType<typeof reference>) => {
        values.push(fixed4(r.value), fixed4(r.exact), r.error);
        if (r.doubleStep !== undefined) values.push(r.doubleStep, r.doubleError!, fixed4(r.doubleValue!));
        if (r.ratio !== undefined) values.push(r.ratio);
        for (const node of r.nodes) values.push(fixed4(node.x), fixed4(node.y), fixed4(node.slope));
    };
    add(reference('exponential', 0, s.y0, s.h, s.end));
    if (id === 'error-ratios') {
        for (const h of [0.5, 0.25, 0.125]) add(reference('exponential', 0, 1, h, 1));
        for (const h of [0.5, 0.25, 0.125, 1]) add(reference('linear-relaxation', 0, 1, h, 1));
    }
    if (id === 'initial-point') add(reference('exponential', 0, 1, 0.25, 1)); // "twice as much as from (0, 1)"
    return values;
}
/** The displayed value equals the quoted token to the quoted digits. */
const decimalsOf = (token: string) => token.includes('.') ? token.split('.')[1].length : 0;
const matchesQuoted = (displayed: number, token: string) => Math.abs(displayed - Number(token)) <= 0.5 * 10 ** -decimalsOf(token) * 1.0001;
const decimalTokens = (text: string) => text.replace(/\{,\}/g, '.').match(/\d+\.\d+/g) ?? [];

function mount() {
    const graph = createGraph('euler-method');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        mounted,
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
        state: () => (graph as any).state.model as {example: string; x0: number; y0: number; step: number; xEnd: number; showExact: boolean},
    };
}
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '';
const readouts = () => ({
    h: parse(readout('h')), steps: parse(readout('steps')), end: parse(readout('end')), value: parse(readout('value')), exact: parse(readout('exact')),
    error: parse(readout('error')), doubleError: parse(readout('double-error')), ratio: parse(readout('ratio')),
});

test('the lesson is N5 on euler-method: seven ordered steps, each with a scene of its own', () => {
    expect(lesson.demonstrationId).toBe('euler-method');
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson.steps.map(step => step.id)).toEqual(ORDER);
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('every scene lands in the stated state and the displayed readouts equal the independent loop, out of order and twice', () => {
    const m = mount();
    try {
        const sequence = [7, 1, 5, 3, 2, 6, 4, 7, 1, 5, 3, 2, 6, 4].map(n => ORDER[n - 1]);
        for (const id of sequence) {
            const expected = SCENES[id];
            const step = stepOf(id);
            m.scene(step);
            expect(m.state(), `${id} state`).toMatchObject({example: 'exponential', x0: 0, y0: expected.y0, step: expected.h, xEnd: expected.end, showExact: expected.showExact});
            const ref = reference('exponential', 0, expected.y0, expected.h, expected.end);
            const rows = readouts();
            expect(rows.h, `${id} h`).toBe(expected.h);
            expect(rows.steps, `${id} steps`).toBe(ref.n);
            expect(rows.end, `${id} end`).toBe(expected.end);
            expect(rows.value, `${id} value`).toBeCloseTo(fixed4(ref.value), 4);
            expect(rows.exact, `${id} exact`).toBeCloseTo(fixed4(ref.exact), 4);
            expect(rows.error, `${id} error`).toBeCloseTo(ref.error, 12);
            if (ref.doubleError === undefined || ref.error === 0) expect(Number.isNaN(rows.ratio), `${id} no ratio`).toBe(true);
            else {
                expect(rows.doubleError, `${id} double error`).toBeCloseTo(ref.doubleError, 12);
                expect(rows.ratio, `${id} ratio`).toBeCloseTo(ref.ratio!, 6);
            }
            // A quoted ratio is the quotient of the two displayed errors, rounded as shown.
            if (!Number.isNaN(rows.ratio)) expect(rows.ratio).toBeCloseTo(Number((rows.doubleError / rows.error).toPrecision(3)), 6);
            // Quoted scene numbers equal displayed values to the quoted digits, in both languages.
            const displayed = [rows.value, rows.exact, rows.error, rows.doubleError, rows.ratio, rows.h, rows.end];
            for (const token of expected.scene) {
                expect(displayed.some(value => matchesQuoted(value, token)), `${id} displays ${token}`).toBe(true);
                for (const language of ['sl', 'en'] as const) expect(step.scene!.expectedState[language], `${id} ${language} scene ${token}`).toContain(asText(token, language));
            }
            for (const token of expected.step) for (const language of ['sl', 'en'] as const) {
                expect(prose(step, language), `${id} ${language} step ${token}`).toContain(asText(token, language));
            }
            // Every decimal in the text (scene, explanation, observations, worked example) is an allowed value of this scene, to its digits.
            const allowed = allowedValues(id);
            for (const language of ['sl', 'en'] as const) for (const token of decimalTokens(prose(step, language))) {
                expect(allowed.some(value => matchesQuoted(value, token)), `${id} ${language} quotes ${token}`).toBe(true);
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('step 1 (end x = x0 = 0) shows no Euler step and the exact curve hidden', () => {
    const m = mount();
    try {
        m.scene(stepOf('field-predict'));
        expect(m.state()).toMatchObject({xEnd: 0, x0: 0, showExact: false});
        const rows = readouts();
        expect(rows.steps).toBe(0);
        expect(rows.end).toBe(0);
        expect(rows.value).toBe(1);
        expect(rows.exact).toBe(1);
        expect(rows.error).toBe(0);
        expect(Number.isNaN(rows.ratio)).toBe(true);
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('step 5 named changes: the h changes on y\' = y and the switch to y\' = x - y read the numbers the text quotes', () => {
    const m = mount();
    try {
        const step = stepOf('error-ratios');
        const texts = {sl: prose(step, 'sl'), en: prose(step, 'en')};
        const choose = (name: 'euler-example' | 'euler-step', value: string): LessonAction => ({kind: 'function-choice', name, value});
        const quote = (token: string) => { for (const language of ['sl', 'en'] as const) expect(texts[language], `${language} quotes ${token}`).toContain(asText(token, language)); };
        m.scene(step);
        const read = (example: Example, h: number, quoted: {value?: string; error: string; ratio?: string}) => {
            m.apply(choose('euler-step', String(h)));
            const rows = readouts();
            const ref = reference(example, 0, 1, h, 1);
            expect(rows.value, `${example} h=${h} value`).toBeCloseTo(fixed4(ref.value), 4);
            if (quoted.value) expect(matchesQuoted(rows.value, quoted.value), `${example} h=${h} value ${quoted.value}`).toBe(true);
            expect(matchesQuoted(rows.error, quoted.error), `${example} h=${h} error ${quoted.error}`).toBe(true);
            if (quoted.value) quote(quoted.value);
            quote(quoted.error);
            if (quoted.ratio) {
                expect(matchesQuoted(rows.ratio, quoted.ratio), `${example} h=${h} ratio ${quoted.ratio}`).toBe(true);
                expect(rows.ratio).toBeCloseTo(Number((rows.doubleError / rows.error).toPrecision(3)), 6);
                quote(quoted.ratio);
            }
        };
        read('exponential', 0.5, {error: '0.4683'}); // the text quotes the error of h = 0.5 (its value 2.25 is step 3)
        read('exponential', 0.25, {error: '0.2769', ratio: '1.69'});
        read('exponential', 0.125, {value: '2.5658', error: '0.1525', ratio: '1.82'});
        m.apply(choose('euler-example', 'linear-relaxation'), {kind: 'function-parameter', name: 'euler-x0', value: 0}, {kind: 'function-parameter', name: 'euler-y0', value: 1},
            {kind: 'function-parameter', name: 'euler-end', value: 1});
        expect(m.state()).toMatchObject({example: 'linear-relaxation', x0: 0, y0: 1, xEnd: 1});
        // y(1) = 2/e, the error of h = 1 (value 0) and the quoted exact value
        m.apply(choose('euler-step', '1'));
        expect(readouts()).toMatchObject({value: 0, steps: 1});
        expect(matchesQuoted(readouts().exact, '0.7358')).toBe(true);
        expect(matchesQuoted(readouts().error, '0.7358')).toBe(true);
        quote('0.7358');
        read('linear-relaxation', 0.5, {value: '0.5', error: '0.2358', ratio: '3.12'});
        read('linear-relaxation', 0.25, {value: '0.6328', error: '0.1029', ratio: '2.29'});
        read('linear-relaxation', 0.125, {value: '0.6872', error: '0.04854', ratio: '2.12'});
        // The quoted ratios are the quotients of the quoted errors.
        expect(Number((0.4683 / 0.2769).toPrecision(3))).toBe(1.69);
        expect(Number((0.2769 / 0.1525).toPrecision(3))).toBe(1.82);
        expect(Number((0.7358 / 0.2358).toPrecision(3))).toBe(3.12);
        expect(Number((0.2358 / 0.1029).toPrecision(3))).toBe(2.29);
        expect(Number((0.1029 / 0.04854).toPrecision(3))).toBe(2.12);
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('N5: the independent Euler loop gives the values the text quotes', () => {
    const rounded = (r: ReturnType<typeof reference>) => [fixed4(r.value), r.error, r.ratio];
    expect([1, 0.5, 0.25, 0.125].map(h => fixed4(reference('exponential', 0, 1, h, 1).value))).toEqual([2, 2.25, 2.4414, 2.5658]);
    expect(rounded(reference('exponential', 0, 1, 0.25, 1))).toEqual([2.4414, 0.2769, 1.69]);
    expect(rounded(reference('exponential', 0, 1, 0.125, 1))).toEqual([2.5658, 0.1525, 1.82]);
    expect([1, 0.5, 0.25, 0.125].map(h => fixed4(reference('linear-relaxation', 0, 1, h, 1).value))).toEqual([0, 0.5, 0.6328, 0.6872]);
    expect([0.5, 0.25, 0.125].map(h => rounded(reference('linear-relaxation', 0, 1, h, 1)))).toEqual([[0.5, 0.2358, 3.12], [0.6328, 0.1029, 2.29], [0.6872, 0.04854, 2.12]]);
    const second = reference('exponential', 0, 2, 0.25, 1);
    expect(rounded(second)).toEqual([4.8828, 0.5538, 1.69]);
    expect(fixed4(second.exact)).toBe(5.4366);
    expect(second.doubleError).toBe(0.9366);
});
