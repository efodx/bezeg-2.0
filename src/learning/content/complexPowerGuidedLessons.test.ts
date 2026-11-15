/**
 * M6 (de Moivre, complex maps batch D), part A: every scene lands, in both languages, in the state and readouts the text states (the real ComplexPowerGraph, one synchronous
 * sequence of actions from a restored checkpoint, out of order and twice in one act); no opening is already the state the prompt asks the learner to produce or shows a value a
 * later prediction asks for; every control or readout the prompts name exists in the graph strings; and the learner actions the text asks for (the exponent field and steppers,
 * the typed Re and Im of z) give the readouts the text quotes. Expected values are computed here by repeated complex multiplication on whole numbers, not with the graph.
 */
import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {ComplexPowerGraph} from '../../graphs/complex/ComplexPowerGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';
import {sceneActions} from '../runtime/lessonCatalog';
import {complexPowerLesson} from './complexPowerGuidedLessons';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

// ---- independent expectations ----------------------------------------------------------------------------------------------------------

interface S { readonly A: number; readonly B: number; readonly n: number }
const DEFAULT_STATE: S = {A: 20, B: 20, n: 5};
const state = (A: number, B: number, n: number): S => ({A, B, n});

/** (A + Bi)^n by repeated multiplication on whole numbers (BigInt, exact); z^n = that / 20^n. */
const gridPower = (A: number, B: number, n: number): {re: bigint; im: bigint} => {
    let re = BigInt(A);
    let im = BigInt(B);
    for (let k = 1; k < n; k++) [re, im] = [re * BigInt(A) - im * BigInt(B), re * BigInt(B) + im * BigInt(A)];
    return {re, im};
};
const DEG = 180 / Math.PI;
interface Expected { readonly re: number; readonly im: number; readonly modulus: number; readonly angle: number; readonly principal: number; readonly real: boolean; readonly unit: boolean; readonly one: boolean }
const expected = (s: S): Expected => {
    const {re, im} = gridPower(s.A, s.B, s.n);
    const scale = 20 ** s.n;
    const reN = Number(re) / scale;
    const imN = Number(im) / scale;
    return {
        re: reN, im: imN, modulus: Math.hypot(reN, imN), angle: s.n * Math.atan2(s.B, s.A) * DEG, principal: Math.atan2(imN, reN) * DEG,
        real: im === 0n, unit: BigInt(s.A) ** 2n + BigInt(s.B) ** 2n === 400n, one: im === 0n && re === BigInt(20) ** BigInt(s.n),
    };
};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutTexts = () => [...document.querySelectorAll('[data-readout] dd')].map(node => node.textContent ?? '');
const status = () => document.querySelector('[data-complex-power-status]')?.textContent ?? '';
const counter = () => document.querySelector('[data-step-counter]')?.textContent ?? '';
/** The numbers of a readout: true minus, the decimal comma of Slovenian. */
const nums = (text: string | null, language: Language): number[] =>
    ((language === 'sl' ? (text ?? '').replace(/,/g, '.') : text ?? '').replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** The value a readout shows: its last number (a whole value, or the decimal after "≈"). */
const shown = (id: string, language: Language): number | undefined => nums(readout(id), language).pop();
const closeTo = (actual: number | undefined, want: number, tolerance: number) => actual !== undefined && Math.abs(actual - want) <= tolerance;
const relTol = (value: number) => Math.max(1e-9, Math.abs(value) * 2e-6);
const yes = () => t('complex_power_graph_value_yes');
const no = () => t('complex_power_graph_value_no');

/** Compare the state of the graph, the readouts and the status with the closed values for a state. */
function expectReadouts(label: string, graph: ComplexPowerGraph, s: S, language: Language) {
    const e = expected(s);
    expect({label, state: {A: graph.state.A, B: graph.state.B, n: graph.state.n}}).toEqual({label, state: s});
    expect({label, n: readout('n')}).toEqual({label, n: String(s.n)});
    const checks: [string, number | undefined, number, number][] = [
        ['re', shown('re', language), e.re, relTol(e.re)], ['im', shown('im', language), e.im, relTol(e.im)], ['modulus', shown('modulus', language), e.modulus, relTol(e.modulus)],
        ['angle', shown('angle', language), e.angle, 6e-5], ['principal', shown('principal', language), e.principal, 6e-5],
    ];
    for (const [id, actual, want, tolerance] of checks) expect({label, id, actual, close: closeTo(actual, want, tolerance)}).toEqual({label, id, actual, close: true});
    expect({label, real: readout('real'), unit: readout('unit'), one: readout('one')})
        .toEqual({label, real: e.real ? yes() : no(), unit: e.unit ? yes() : no(), one: e.one ? yes() : no()});
    expect({label, status: status().includes(`n = ${s.n}`)}).toEqual({label, status: true});
}

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

function mountPower() {
    const graph = new ComplexPowerGraph();
    render(React.createElement(MemoryRouter, null, React.createElement(GraphHost, {create: () => graph})));
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const run = (id: string) => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(complexPowerLesson.steps.find(step => step.id === id)!.scene!)) capabilities.apply(action);
    };
    const scene = (id: string) => act(() => { run(id); });
    /** The scene run twice inside one act. */
    const sceneTwice = (id: string) => act(() => { run(id); run(id); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, scene, sceneTwice, restore, free};
}

// ---- learner controls ------------------------------------------------------------------------------------------------------------------

const loc = (value: string, language: Language) => (language === 'sl' ? value : value.replace(',', '.'));
const typeInto = (name: string, value: string, language: Language) => act(() => { enterNumber(screen.getByRole('spinbutton', {name}) as HTMLInputElement, loc(value, language)); });
const typeN = (value: number) => (language: Language) => typeInto(t('complex_power_graph_n_label'), String(value), language);
const stepUp = () => act(() => { fireEvent.click(screen.getByRole('button', {name: t('increase_count')})); });
const typeRe = (value: string) => (language: Language) => typeInto('z, Re', value, language);
const typeIm = (value: string) => (language: Language) => typeInto('z, Im', value, language);

// ---- steps: the opening state and the learner actions the text asks for ----------------------------------------------------------------

interface Ask {
    readonly label: string;
    /** Alternatives the text offers (the field or the stepper); each is tried from a fresh scene. */
    readonly acts: readonly ((language: Language) => void)[];
    readonly after: S;
    /** Values the prompt asks to predict before this action; none may already be shown in the rows just before it. */
    readonly predicted: readonly number[];
}
interface Plan { readonly id: string; readonly opening: S; readonly asks: readonly Ask[] }
const PLANS: readonly Plan[] = [
    {id: 'm6-third-power', opening: state(20, 20, 2), asks: [
        {label: 'n = 3 (field or Increase count)', acts: [typeN(3), stepUp], after: state(20, 20, 3), predicted: [-2, 2 * Math.SQRT2, 135]},
    ]},
    {id: 'm6-rule', opening: state(20, 20, 3), asks: [
        {label: 'n = 4 (Increase count or field)', acts: [stepUp, typeN(4)], after: state(20, 20, 4), predicted: [-4, 4, 180]},
    ]},
    {id: 'm6-unit-modulus', opening: state(16, 12, 1), asks: [
        {label: 'n = 3', acts: [typeN(3)], after: state(16, 12, 3), predicted: [110.6097]},
        {label: 'n = 8', acts: [typeN(8)], after: state(16, 12, 8), predicted: [294.9592]},
    ]},
    {id: 'm6-inside-outside', opening: state(10, 10, 1), asks: [
        {label: 'n = 8', acts: [typeN(8)], after: state(10, 10, 8), predicted: [0.0625, 360]},
        {label: 'Re z = 1,5 (Im stays 0,5)', acts: [typeRe('1,5')], after: state(30, 10, 8), predicted: [39.0625, 147.4796]},
    ]},
    {id: 'm6-wrapped-argument', opening: state(20, 20, 4), asks: [
        {label: 'n = 5', acts: [typeN(5)], after: state(20, 20, 5), predicted: [225, -135]},
    ]},
    {id: 'm6-triple-angle', opening: state(16, 12, 2), asks: [
        {label: 'n = 3', acts: [typeN(3)], after: state(16, 12, 3), predicted: [-0.352, 0.936]},
    ]},
    {id: 'm6-explore', opening: DEFAULT_STATE, asks: []},
];

test('every M6 step has a plan, in the order of the lesson', () => {
    expect(PLANS.map(plan => plan.id)).toEqual(complexPowerLesson.steps.map(step => step.id));
    expect(complexPowerLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(complexPowerLesson.steps.every(step => step.scene !== undefined)).toBe(true);
});

describe.each(LANGUAGES)('M6 scenes in %s', language => {
    // out of order: reversed, then every third step, then the in-order pass, so that no scene depends on the one before it
    const order = [...PLANS].reverse().concat(PLANS.filter((_, i) => i % 3 === 0), PLANS);

    test('every scene opens in the stated state and readouts, out of order and twice in one act', () => {
        setLanguage(language);
        const m = mountPower();
        expectReadouts('free state', m.graph, DEFAULT_STATE, language);
        for (const plan of order) {
            m.scene(plan.id);
            expectReadouts(plan.id, m.graph, plan.opening, language);
            m.sceneTwice(plan.id);
            expectReadouts(`${plan.id} twice`, m.graph, plan.opening, language);
        }
    });

    test('the last step opens on the Demonstration default, the board counter reads 5 of 8', () => {
        setLanguage(language);
        const m = mountPower();
        m.scene('m6-explore');
        expect(JSON.stringify(m.graph.state)).toEqual(m.free);
        expect({counter: nums(counter(), language)}).toEqual({counter: [5, 8]});
    });

    test('restoring the checkpoint on exit returns the free state', () => {
        setLanguage(language);
        const m = mountPower();
        for (const plan of PLANS) {
            m.scene(plan.id);
            m.restore();
            expect({id: plan.id, free: JSON.stringify(m.graph.state)}).toEqual({id: plan.id, free: m.free});
        }
        expectReadouts('restored', m.graph, DEFAULT_STATE, language);
    });

    test('no opening is already the state the prompt asks for, and no row just before an action shows a value it asks to predict', () => {
        setLanguage(language);
        const m = mountPower();
        for (const plan of PLANS) {
            m.scene(plan.id);
            const last = plan.asks[plan.asks.length - 1];
            if (last) expect({id: plan.id, finalIsOpening: JSON.stringify(last.after) === JSON.stringify(plan.opening)}).toEqual({id: plan.id, finalIsOpening: false});
            let before: S = plan.opening;
            for (const ask of plan.asks) {
                // the exponent asked for exceeds the one shown, or the number changes (step 4b)
                expect({id: plan.id, ask: ask.label, moves: ask.after.n > before.n || ask.after.A !== before.A}).toEqual({id: plan.id, ask: ask.label, moves: true});
                const rows = readoutTexts().flatMap(text => nums(text, language)).concat(nums(status(), language));
                for (const value of ask.predicted) {
                    expect({id: plan.id, ask: ask.label, value, alreadyShown: rows.some(found => closeTo(found, value, Math.max(5e-4, Math.abs(value) * 1e-3)))})
                        .toEqual({id: plan.id, ask: ask.label, value, alreadyShown: false});
                }
                ask.acts[0](language);
                before = ask.after;
            }
        }
    });

    test('the learner actions the text asks for, by the field or the stepper, give the state and readouts it quotes', () => {
        setLanguage(language);
        const m = mountPower();
        for (const plan of PLANS) {
            const variants = Math.max(1, ...plan.asks.map(ask => ask.acts.length));
            for (let variant = 0; variant < variants; variant++) {
                m.scene(plan.id);
                for (const ask of plan.asks) {
                    ask.acts[Math.min(variant, ask.acts.length - 1)](language);
                    expectReadouts(`${plan.id}: ${ask.label} (variant ${variant})`, m.graph, ask.after, language);
                }
            }
        }
    });

    test('step 2 raises n to 4: the status sentence names z^4 and its modulus 4 (outside the view)', () => {
        setLanguage(language);
        const m = mountPower();
        m.scene('m6-rule');
        stepUp();
        expect({status: status().includes('⁴'), four: nums(status(), language).includes(4)}).toEqual({status: true, four: true});
    });

    test('step 4 keeps Im at 0,5 when Re 1,5 is typed, and lists the powers from z^3 on outside the view', () => {
        setLanguage(language);
        const m = mountPower();
        m.scene('m6-inside-outside');
        typeN(8)(language);
        typeRe('1,5')(language);
        expect({A: m.graph.state.A, B: m.graph.state.B, n: m.graph.state.n}).toEqual({A: 30, B: 10, n: 8});
        for (const sup of ['³', '⁴', '⁵', '⁶', '⁷', '⁸']) expect({sup, listed: status().includes(sup)}).toEqual({sup, listed: true});
    });

    test('step 7: z = i returns after four powers, 0,6 + 0,8i has every power on the circle, 1 + i has a real eighth power', () => {
        setLanguage(language);
        const m = mountPower();
        m.scene('m6-explore');
        typeRe('0')(language);
        typeIm('1')(language);
        expect({A: m.graph.state.A, B: m.graph.state.B}).toEqual({A: 0, B: 20});
        const i = [[0, 1], [-1, 0], [0, -1], [1, 0], [0, 1]];
        i.forEach(([re, im], k) => {
            typeN(k + 1)(language);
            expect({k: k + 1, re: shown('re', language), im: shown('im', language)}).toEqual({k: k + 1, re, im});
            expect({k: k + 1, angle: shown('angle', language)}).toEqual({k: k + 1, angle: 90 * (k + 1)});
        });
        typeRe('0,6')(language);
        typeIm('0,8')(language);
        for (let k = 1; k <= 4; k++) {
            typeN(k)(language);
            expect({k, unit: readout('unit')}).toEqual({k, unit: yes()});
        }
        typeRe('1')(language);
        typeIm('1')(language);
        typeN(8)(language);
        expect({real: readout('real'), re: shown('re', language), im: shown('im', language)}).toEqual({real: yes(), re: 16, im: 0});
        typeN(2)(language);
        expect({re: shown('re', language), im: shown('im', language)}).toEqual({re: 0, im: 2});
        typeN(4)(language);
        expect({re: shown('re', language), im: shown('im', language)}).toEqual({re: -4, im: 0});
    });
});

// ---- the controls and readouts the prompts name ----------------------------------------------------------------------------------------

type Label = () => string;
const L = {
    n: () => t('complex_power_graph_n_label'), up: () => t('increase_count'), reset: () => t('reset'),
    modulus: (power: string): Label => () => t('complex_power_graph_r_modulus', {value0: power}),
    angle: (n: string): Label => () => t('complex_power_graph_r_angle', {value0: n}),
    principal: (power: string): Label => () => t('complex_power_graph_r_principal', {value0: power}),
    unit: (power: string): Label => () => t('complex_power_graph_r_unit', {value0: power}),
    re: (power: string): Label => () => t('complex_power_graph_r_re', {value0: power}),
    im: (power: string): Label => () => t('complex_power_graph_r_im', {value0: power}),
};
const NAMED: Record<string, readonly Label[]> = {
    'm6-third-power': [L.n, L.up, L.modulus('^3'), L.angle('3')],
    'm6-rule': [L.up, L.modulus('^4'), L.angle('4')],
    'm6-unit-modulus': [L.n, L.unit('^n'), L.angle('n')],
    'm6-inside-outside': [L.n],
    'm6-wrapped-argument': [L.n, L.angle('5'), L.principal('^5')],
    'm6-triple-angle': [L.n, L.re('^3'), L.im('^3')],
    'm6-explore': [L.reset],
};
/** Prose as read in the app: no math delimiters, no spaces, the symbols of the label spelled as in the prose. */
const flat = (text: string) => text.replace(/\\\(|\\\)/g, '').replace(/\\lvert|\\rvert/g, '|').replace(/\\cdot/g, '·').replace(/\\arg/g, 'arg').replace(/\\text\{(\w+)\}/g, '$1')
    .replace(/\\[ ,]/g, '').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => `^${'⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)}`).replace(/\s+/g, '');
/** The forms in which a label is written in prose: whole, without the trailing parenthesis, up to the first comma, and its last comma segment. */
const forms = (label: string) => {
    const bare = label.replace(/\s*\([^)]*\)\??$/, '');
    const head = label.replace(/\s*[,(].*$/, '');
    const tail = label.split(', ').pop() ?? label;
    return [label, bare, head, tail].map(flat);
};

describe.each(LANGUAGES)('M6 prompt labels in %s', language => {
    test.each(complexPowerLesson.steps.map(step => [step.id, step] as const))('%s: every control and readout the prompt names exists in the graph strings', (id, step) => {
        setLanguage(language);
        const prompt = flat(`${step.explanation[language]} ${step.observationPrompt[language]} ${step.expectedObservations.map(entry => entry[language]).join(' ')}`);
        for (const label of NAMED[id]) expect({id, label: label(), named: forms(label()).some(form => prompt.includes(form))}).toEqual({id, label: label(), named: true});
    });

    test('the labels exist in the mounted graph: control labels and readout labels', () => {
        setLanguage(language);
        const m = mountPower();
        m.scene('m6-third-power');
        const dts = [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
        for (const label of [L.re('²'), L.im('²'), L.modulus('²'), L.angle('2'), L.principal('²'), L.unit('²')]) expect({label: label(), shown: dts.includes(label())}).toEqual({label: label(), shown: true});
        expect(screen.queryByRole('spinbutton', {name: L.n()})).not.toBeNull();
        expect(screen.queryByRole('button', {name: L.up()})).not.toBeNull();
        expect(screen.queryByRole('button', {name: L.reset()})).not.toBeNull();
        expect(screen.queryByRole('spinbutton', {name: 'z, Re'})).not.toBeNull();
        expect(screen.queryByRole('spinbutton', {name: 'z, Im'})).not.toBeNull();
    });
});

// ---- part B: every quoted number, recomputed independently of the graph ----------------------------------------------------------------

/** A quote: its value, the decimals the text prints, and `shown` for a computed readout the graph prints verbatim (the row label says "computed"; a copy of the display). */
interface Quote { readonly value: number; readonly digits: number; readonly shown?: true }
const Q = (value: number, digits = 6): Quote => ({value, digits});
const R = (value: number, digits = 4): Quote => ({value, digits, shown: true});
const quoteText = (quote: Quote, language: Language) => {
    const text = Number(Math.abs(quote.value).toFixed(quote.digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
};
/** A quote that is not exactly its printed decimal. */
const isRounded = (quote: Quote) => Math.abs(Number(quote.value.toFixed(quote.digits)) - quote.value) > 1e-12 * Math.max(1, Math.abs(quote.value));

const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numberPattern = (value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`, 'g');
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);
const HEDGE = /približno|approximately|about|izračunano|computed|\\approx/;
/** True when some occurrence of the number has a hedge word or \approx shortly before it or the "(computed)" mark right after it. */
const hedged = (text: string, value: string) => [...prose(text).matchAll(numberPattern(value))].some(match => {
    const at = match.index ?? 0;
    return HEDGE.test(prose(text).slice(Math.max(0, at - 45), at + value.length + 28));
});

const stepTexts = (id: string, language: Language): string[] => {
    const step = complexPowerLesson.steps.find(candidate => candidate.id === id)!;
    const formulas = complexPowerLesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.title, step.purpose, step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations, ...formulas.flatMap(block => [block.notation, block.explanation])].map(entry => entry[language]);
};

const at = (A: number, B: number, n: number) => expected(state(A, B, n));
const SQRT_HALF = Math.hypot(0.5, 0.5);
const c = 0.8;
const s = 0.6;
const cos3 = 4 * c ** 3 - 3 * c;
const sin3 = 3 * s - 4 * s ** 3;

interface Spec { readonly id: string; readonly quotes: readonly Quote[]; readonly extra: readonly string[] }
/** The decimals a step may show besides its quotes: coordinates of z the learner sees or types (written in the English form). */
const SPECS: readonly Spec[] = [
    {id: 'm6-third-power', extra: [], quotes: [Q(at(20, 20, 2).modulus, 0), Q(at(20, 20, 2).angle, 0), Q(at(20, 20, 3).angle, 0), Q(at(20, 20, 1).angle, 0), Q(at(20, 20, 3).modulus)]},
    {id: 'm6-rule', extra: [], quotes: [Q(at(20, 20, 4).re, 0), Q(at(20, 20, 4).modulus, 0), Q(at(20, 20, 4).angle, 0)]},
    {id: 'm6-unit-modulus', extra: ['0.8', '0.6'], quotes: [Q(at(16, 12, 3).re, 3), Q(at(16, 12, 3).im, 3), Q(at(16, 12, 3).modulus, 0), R(at(16, 12, 3).angle), R(at(16, 12, 8).angle)]},
    {id: 'm6-inside-outside', extra: ['0.5', '1.5'], quotes: [
        Q(SQRT_HALF, 4), Q(at(10, 10, 1).angle, 0), Q(at(10, 10, 8).re, 4), Q(at(10, 10, 8).angle, 0), Q(at(10, 10, 8).principal, 0), Q(at(10, 10, 4).re, 2),
        Q((30 ** 2 + 10 ** 2) / 400, 1), Q(at(30, 10, 8).modulus, 4), Q(at(30, 10, 8).re, 2), Q(at(30, 10, 8).im, 0), R(at(30, 10, 8).angle),
    ]},
    {id: 'm6-wrapped-argument', extra: [], quotes: [Q(at(20, 20, 4).angle, 0), Q(at(20, 20, 4).principal, 0), Q(at(20, 20, 5).angle, 0), Q(at(20, 20, 5).principal, 0), Q(at(20, 20, 5).re, 0), Q(at(20, 20, 5).im, 0), Q(at(20, 20, 5).modulus)]},
    {id: 'm6-triple-angle', extra: ['0.8', '0.6'], quotes: [Q(c ** 3, 3), Q(4 * c ** 3, 3), Q(3 * c, 1), Q(cos3, 3), Q(s ** 3, 3), Q(3 * s, 1), Q(4 * s ** 3, 3), Q(sin3, 3), Q(at(16, 12, 3).re, 3), Q(at(16, 12, 3).im, 3), Q(at(16, 12, 2).re, 2), Q(at(16, 12, 2).im, 2)]},
    {id: 'm6-explore', extra: ['0.6', '0.8'], quotes: [Q(at(20, 20, 2).modulus, 0), Q(at(20, 20, 4).re, 0), Q(at(20, 20, 8).re, 0), Q(at(0, 20, 2).re, 0), Q(90, 0)]},
];
/** Rounded quotes the text does not hedge with a "približno"/"approximately" word, \approx or a "(izračunano)" mark: findings, pinned so the list shrinks when the text is fixed. */
const KNOWN_UNHEDGED: Readonly<Record<string, readonly string[]>> = {};

describe.each(LANGUAGES)('M6 quoted numbers in %s', language => {
    test.each(SPECS.map(spec => [spec.id, spec] as const))('%s: every quote is recomputed and appears, rounded ones are hedged, nothing else has decimals', (_id, spec) => {
        const text = stepTexts(spec.id, language).join(' ');
        const missing = spec.quotes.filter(quote => !numberPattern(quoteText(quote, language)).test(prose(text))).map(quote => quoteText(quote, language));
        expect({id: spec.id, missing}).toEqual({id: spec.id, missing: []});
        const unhedged = spec.quotes.filter(quote => !quote.shown && isRounded(quote) && !hedged(text, quoteText(quote, language))).map(quote => quoteText(quote, 'sl'));
        expect({id: spec.id, unhedged}).toEqual({id: spec.id, unhedged: KNOWN_UNHEDGED[spec.id] ?? []});
        if (language === 'sl') expect({id: spec.id, english: decimalsIn(text)}).toEqual({id: spec.id, english: []});
        else {
            const allowed = new Set([...spec.quotes.map(quote => quoteText(quote, 'en')), ...spec.extra]);
            expect({id: spec.id, unaccounted: decimalsIn(text).filter(value => !allowed.has(value))}).toEqual({id: spec.id, unaccounted: []});
        }
    });
});

test('repeated multiplication gives modulus r^n and argument n·phi (mod 360), exact integers where the text says exact', () => {
    for (let A = -40; A <= 40; A += 7) for (let B = -40; B <= 40; B += 9) {
        if (A === 0 && B === 0) continue;
        for (let n = 1; n <= 8; n++) {
            const e = at(A, B, n);
            expect({A, B, n, modulus: Math.abs(e.modulus / Math.hypot(A / 20, B / 20) ** n - 1) < 1e-9}).toEqual({A, B, n, modulus: true});
            const turns = (e.angle - e.principal) / 360;
            expect({A, B, n, wholeTurns: Math.abs(turns - Math.round(turns)) < 1e-9, inRange: e.principal > -180 - 1e-9 && e.principal <= 180 + 1e-9}).toEqual({A, B, n, wholeTurns: true, inRange: true});
        }
    }
    // exact integer arithmetic in grid units: (20 + 20i)^2 = 800i, ^3 = -16000 + 16000i, ^4 = -640000, ^5 = -12800000 - 12800000i
    expect(gridPower(20, 20, 2)).toEqual({re: 0n, im: 800n});
    expect(gridPower(20, 20, 3)).toEqual({re: -16000n, im: 16000n});
    expect(gridPower(20, 20, 4)).toEqual({re: -640000n, im: 0n});
    expect(gridPower(20, 20, 5)).toEqual({re: -12800000n, im: -12800000n});
    expect(gridPower(20, 20, 8)).toEqual({re: 409600000000n, im: 0n});
    // z = 0,8 + 0,6i (16 + 12i): z^3 = -44/125 + 117/125 i exactly, in grid units (-44 / 125) * 8000
    expect(gridPower(16, 12, 3)).toEqual({re: -2816n, im: 7488n});
    expect(Number(gridPower(16, 12, 3).re) / 8000).toBe(-44 / 125);
    expect(Number(gridPower(16, 12, 3).im) / 8000).toBe(117 / 125);
    expect(gridPower(16, 12, 2)).toEqual({re: 112n, im: 384n});
    // z = 1,5 + 0,5i (30 + 10i): z^8 = -527/16 + 21 i
    const big = gridPower(30, 10, 8);
    expect(Number(big.re) / 20 ** 8).toBeCloseTo(-527 / 16, 10);
    expect(Number(big.im) / 20 ** 8).toBeCloseTo(21, 10);
    expect(at(30, 10, 8).modulus).toBeCloseTo(625 / 16, 10);
    expect(2.5 ** 4).toBe(625 / 16);
    // z = 0,5 + 0,5i: z^4 = -0,25, z^8 = 1/16, an exact full turn
    expect(at(10, 10, 4).re).toBeCloseTo(-0.25, 12);
    expect(at(10, 10, 8)).toEqual(expect.objectContaining({re: 0.0625, im: 0, real: true}));
    expect(at(10, 10, 8).angle).toBeCloseTo(360, 9);
    expect(at(10, 10, 8).principal).toBeCloseTo(0, 9);
    // z = i and z = 0,6 + 0,8i
    expect(gridPower(0, 20, 4)).toEqual({re: 160000n, im: 0n});
    expect(gridPower(12, 16, 3).re ** 2n + gridPower(12, 16, 3).im ** 2n).toBe(8000n ** 2n);
});

test('the moduli and arguments by Math.hypot and Math.atan2 at the points the text names', () => {
    expect(Math.hypot(1, 1)).toBeCloseTo(Math.SQRT2, 15);
    expect(Math.atan2(1, 1) * DEG).toBeCloseTo(45, 12);
    expect(at(20, 20, 2).modulus).toBeCloseTo(2, 12);
    expect(at(20, 20, 3).modulus).toBeCloseTo(2 * Math.SQRT2, 12);
    expect(Math.atan2(2, -2) * DEG).toBeCloseTo(135, 12);
    expect(Math.atan2(0, -4) * DEG).toBe(180);
    expect(at(20, 20, 5).modulus).toBeCloseTo(4 * Math.SQRT2, 12);
    expect(Math.atan2(-4, -4) * DEG).toBeCloseTo(-135, 12);
    expect(at(20, 20, 5).angle).toBeCloseTo(225, 12);
    expect(at(20, 20, 5).principal).toBeCloseTo(225 - 360, 12);
    // the principal argument is in (-180, 180]: 180 is included
    expect(at(20, 20, 4).principal).toBe(180);
    expect(at(20, 20, 4).angle).toBeCloseTo(180, 12);
    expect(at(10, 10, 1).modulus).toBeCloseTo(SQRT_HALF, 15);
    expect(SQRT_HALF).toBeCloseTo(0.7071, 4);
    expect(at(16, 12, 3).angle).toBeCloseTo(110.6097, 4);
    expect(at(16, 12, 8).angle).toBeCloseTo(294.9592, 4);
    expect(at(16, 12, 8).principal).toBeCloseTo(294.9592 - 360, 4);
    expect(at(16, 12, 8).modulus).toBeCloseTo(1, 12);
    expect(at(30, 10, 8).angle).toBeCloseTo(147.4796, 4);
    expect(at(30, 10, 8).re).toBeCloseTo(-32.9375, 10);
    for (let n = 1; n <= 8; n++) expect(at(16, 12, n).unit).toBe(true);
    expect(at(10, 10, 8).unit).toBe(false);
});

test('the triple angle formulas at z = 0,8 + 0,6i: cos 3phi = -0,352, sin 3phi = 0,936, equal to Re z^3 and Im z^3', () => {
    expect(cos3).toBeCloseTo(-0.352, 14);
    expect(sin3).toBeCloseTo(0.936, 14);
    expect(c ** 3).toBeCloseTo(0.512, 14);
    expect(s ** 3).toBeCloseTo(0.216, 14);
    expect(4 * 0.512 - 3 * 0.8).toBeCloseTo(2.048 - 2.4, 14);
    expect(3 * 0.6 - 4 * 0.216).toBeCloseTo(1.8 - 0.864, 14);
    const phi = Math.atan2(12, 16);
    expect(Math.cos(3 * phi)).toBeCloseTo(cos3, 12);
    expect(Math.sin(3 * phi)).toBeCloseTo(sin3, 12);
    expect(at(16, 12, 3).re).toBeCloseTo(cos3, 12);
    expect(at(16, 12, 3).im).toBeCloseTo(sin3, 12);
    for (let k = -12; k <= 12; k++) {
        const angle = k * 0.37;
        const cc = Math.cos(angle);
        const ss = Math.sin(angle);
        expect(Math.cos(3 * angle)).toBeCloseTo(4 * cc ** 3 - 3 * cc, 12);
        expect(Math.sin(3 * angle)).toBeCloseTo(3 * ss - 4 * ss ** 3, 12);
        // the expansion in the derivation: (c + is)^3 = c^3 - 3cs^2 + i (3c^2 s - s^3)
        expect(Math.cos(3 * angle)).toBeCloseTo(cc ** 3 - 3 * cc * ss ** 2, 12);
        expect(Math.sin(3 * angle)).toBeCloseTo(3 * cc ** 2 * ss - ss ** 3, 12);
    }
    // z^2 = 0,28 + 0,96i
    expect(at(16, 12, 2).re).toBeCloseTo(0.28, 14);
    expect(at(16, 12, 2).im).toBeCloseTo(0.96, 14);
});
