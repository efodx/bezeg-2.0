/**
 * RG2 and RG4 (recursion, batch B), part A: every scene lands, in both languages, in the state and readouts the text states (the real cobweb graph, one synchronous sequence of
 * actions from a restored checkpoint, out of order and twice); no opening is already the state the prompt asks the learner to produce; every control or readout the prompts name
 * exists in the graph strings; and the learner actions the text asks for (typed m, c, x0, r, the map list, Next step, a drawn step) give the readouts the text quotes.
 * The expected fixed points, slopes and iterates are computed here from closed forms and a direct loop, not with the graph.
 */
import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {chooseOnPuck, installBoardShims, REAL_GRAPH_TEST_TIMEOUT, typePuck, waitForPucks} from '../../graphs/base/realGraphTestHarness';
import {RecursionCobwebGraph} from '../../graphs/recursion/RecursionCobwebGraph';
import {setLanguage, t} from '../../localization';
import {sceneActions} from '../runtime/lessonCatalog';
import {recursionCobwebLesson, recursionLogisticLesson} from './recursionCobwebGuidedLessons';
import type {GuidedLesson} from './guidedLessons';

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

const MINUS = '−';
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** A readout number as the graph shows it: up to 6 decimals, no trailing zeros, true minus, the decimal comma in Slovenian. */
const fmt = (value: number, language: Language): string => {
    const text = Number(value.toFixed(6)).toString().replace('-', MINUS);
    return language === 'sl' ? text.replace('.', ',') : text;
};
/** A slovenian-written number (decimal comma) in the given language. */
const loc = (text: string, language: Language) => (language === 'sl' ? text : text.replace(',', '.'));
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
/** A fixed point as the readout shows it: a whole number, or the reduced fraction with its decimal value. */
function fixedText(numerator: number, denominator: number, language: Language): string {
    const g = gcd(numerator, denominator) || 1;
    const n = numerator / g;
    const d = denominator / g;
    if (n === 0) return '0';
    if (d === 1) return fmt(n, language);
    return t('recursion_graph_r_fixed_fraction', {value0: `${n}/${d}`, value1: fmt(numerator / denominator, language)});
}

interface CobwebState { readonly map: 'affine' | 'cosine' | 'logistic'; readonly M: number; readonly C: number; readonly R: number; readonly X: number; readonly step: number }
const DEFAULT_STATE: CobwebState = {map: 'affine', M: 10, C: 10, R: 15, X: 0, step: 0};
const state = (patch: Partial<CobwebState>): CobwebState => ({...DEFAULT_STATE, ...patch});
const logistic = (R: number, patch: Partial<CobwebState> = {}): CobwebState => state({map: 'logistic', X: 10, R, ...patch});

/** The iterate x_n by a direct loop, not by the closed form. */
function iterate(current: CobwebState, n: number): number {
    let x = current.X / 100;
    for (let i = 0; i < n; i++) {
        if (current.map === 'affine') x = (current.M / 20) * x + current.C / 10;
        else if (current.map === 'cosine') x = Math.cos(x);
        else x = (current.R / 10) * x * (1 - x);
    }
    return x;
}

/** The rows the text quotes for a scene, from closed forms: the fixed point 2C/(20 - M) or (R - 10)/R, the slope m or 2 - r, the shape from the slope's sign. */
function expectedRows(current: CobwebState, language: Language): Record<string, string> {
    const shape = (slope: number) => (slope === -1 ? 'square' : slope > 0 ? 'staircase' : 'spiral');
    const shapeText = (kind: string) => t(`recursion_graph_shape_${kind}` as 'recursion_graph_shape_square');
    if (current.map === 'affine') {
        const slope = current.M / 20;
        return {
            start: fmt(current.X / 100, language), iterate: fmt(iterate(current, current.step), language), decisive: fmt(slope, language),
            fixed: fixedText(2 * current.C, 20 - current.M, language), shape: shapeText(shape(slope)),
        };
    }
    if (current.map === 'logistic') {
        const slope = 2 - current.R / 10;
        return {
            start: fmt(current.X / 100, language), iterate: fmt(iterate(current, current.step), language), decisive: fmt(slope, language),
            fixed: fixedText(current.R - 10, current.R, language), rate: fmt(current.R / 10, language), shape: shapeText(shape(slope)),
        };
    }
    return {start: fmt(current.X / 100, language), iterate: fmt(iterate(current, current.step), language), shape: shapeText('spiral')};
}

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const status = () => document.querySelector('[data-recursion-status]')?.textContent ?? '';
/** A readout without its "(computed)" suffix. */
const shown = (id: string) => stripped(readout(id)).replace(/\((izračunano|computed)\)$/, '');

function mountCobweb() {
    const graph = new RecursionCobwebGraph();
    render(React.createElement(MemoryRouter, null, React.createElement(GraphHost, {create: () => graph})));
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const scene = (lesson: GuidedLesson, stepId: string) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
    });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, capabilities, scene, restore, free};
}
const current = (graph: RecursionCobwebGraph): CobwebState => {
    const {map, M, C, R, X, step} = graph.state as unknown as CobwebState;
    return {map, M, C, R, X, step};
};

type Action =
    | {readonly type: 'm' | 'c' | 'r' | 'x'; readonly value: string}
    | {readonly next: number}
    | {readonly step: number}
    | {readonly map: 'cosine'};
type Rows = Readonly<Record<string, string>>;
interface Check { readonly act: Action; readonly rows?: Rows; readonly status?: () => string }

/** The learner types on the puck of the control; its strip appears once the board has laid out. */
const typeInto = async (key: 'm' | 'c' | 'r' | 'x', value: string) => {
    const puck = {m: 'cobweb-m', c: 'cobweb-c', r: 'cobweb-r', x: 'cobweb-x'}[key];
    await waitForPucks(puck);
    typePuck(puck, value);
};
async function perform(graph: RecursionCobwebGraph, action: Action, language: Language) {
    if ('type' in action) await typeInto(action.type, loc(action.value, language));
    else if ('next' in action) for (let i = 0; i < action.next; i++) act(() => { fireEvent.click(screen.getByRole('button', {name: t('next_step')})); });
    else if ('step' in action) act(() => { graph.getLessonCapabilities().apply({kind: 'recursion', operation: 'set-step', step: action.step}); });
    else await chooseOnPuck('cobweb-map', action.map);
}
const T = (type: 'm' | 'c' | 'r' | 'x', value: string, rows?: Rows, statusText?: () => string): Check => ({act: {type, value}, rows, status: statusText});
const NEXT = (rows?: Rows): Check => ({act: {next: 1}, rows});
const STEP = (step: number, rows?: Rows): Check => ({act: {step}, rows});
const MAP = (rows?: Rows): Check => ({act: {map: 'cosine'}, rows});
const it_ = (value: string): Rows => ({iterate: value});

// ---- steps: opening state and the learner actions the text asks for -------------------------------------------------------------------

interface Plan { readonly id: string; readonly opening: CobwebState; readonly asks: readonly Check[]; readonly label?: string }
const SHAPE = {staircase: '@staircase', spiral: '@spiral', square: '@square'};

const SPIRAL_OPENING = state({M: -16, C: 90, X: 100});
const OUT_OPENING = state({M: -24, C: 100, X: 460});
const RG2: readonly Plan[] = [
    {id: 'rg2-line-diagonal', opening: state({}), asks: [NEXT(it_('1')), NEXT(it_('1,5')), NEXT(it_('1,75'))]},
    {id: 'rg2-play', opening: state({}), asks: [STEP(11, it_('1,999023'))]},
    {id: 'rg2-negative-slope', opening: state({}), asks: [
        T('m', '-0,8'), T('c', '9'), T('x', '1', {fixed: '5', decisive: '−0,8', start: '1'}),
        NEXT(it_('8,2')), NEXT(it_('2,44')), NEXT(it_('7,048')), NEXT(it_('3,3616')), STEP(11, it_('5,343597')), STEP(38, it_('4,999169')), STEP(60, it_('4,999994')),
    ]},
    {id: 'rg2-repelling', opening: SPIRAL_OPENING, asks: [
        T('m', '-1,2'), T('c', '10'), T('x', '4,6', {fixed: '50/11 ≈ 4,545455', start: '4,6'}),
        NEXT(it_('4,48')), NEXT(it_('4,624')), NEXT(it_('4,4512')), NEXT(it_('4,65856')), STEP(60, it_('3078,046237')),
    ]},
    {id: 'rg2-borderline', opening: OUT_OPENING, asks: [
        T('m', '-1', {fixed: '5', decisive: '−1'}, () => t('recursion_graph_status_two_cycle', {value0: '5'})),
        NEXT(it_('5,4')), NEXT(it_('4,6')), NEXT(it_('5,4')),
        T('m', '1', {decisive: '1'}, () => t('recursion_graph_status_none', {value0: '10'})),
        T('c', '0', {decisive: '1'}, () => t('recursion_graph_status_all_fixed')),
    ]},
    {id: 'rg2-cosine', opening: state({}), asks: [
        MAP({fixed: '0,739085', decisive: '−0,673612'}), NEXT(), NEXT(), NEXT(), NEXT(), NEXT(), NEXT(), NEXT(), NEXT(it_('0,722102')), STEP(11, it_('0,744237')), STEP(60, it_('0,739085')),
    ]},
    {id: 'rg2-explore', opening: state({}), label: 'closed square', asks: [
        T('m', '-1'), T('c', '6'), T('x', '1', {fixed: '3', start: '1'}), NEXT(it_('5')), NEXT(it_('1')), NEXT(it_('5')),
    ]},
    {id: 'rg2-explore', opening: state({}), label: 'moving away', asks: [
        T('m', '1,5'), T('c', '-1'), T('x', '2,1', {fixed: '2', start: '2,1'}), NEXT(it_('2,15')), NEXT(it_('2,225')),
    ]},
    {id: 'rg2-explore', opening: state({}), label: 'cosine from 0,5', asks: [MAP({fixed: '0,739085'}), T('x', '0,5', {start: '0,5'}), STEP(4, it_('0,694778'))]},
];
const RG4: readonly Plan[] = [
    {id: 'rg4-rule', opening: logistic(12), asks: [T('r', '1,5', {fixed: '1/3 ≈ 0,333333', decisive: '0,5', rate: '1,5'})]},
    {id: 'rg4-staircase', opening: logistic(15), asks: [
        NEXT(it_('0,135')), NEXT(it_('0,175163')), NEXT(it_('0,216721')), NEXT(it_('0,254629')), STEP(11, {iterate: '0,332305', shape: SHAPE.staircase}),
    ]},
    {id: 'rg4-spiral', opening: logistic(15), asks: [
        T('r', '2,5', {fixed: '3/5 ≈ 0,6', decisive: '−0,5', shape: SHAPE.spiral}),
        NEXT(it_('0,225')), NEXT(it_('0,435938')), NEXT(it_('0,61474')), NEXT(it_('0,592087')), STEP(11, it_('0,60006')),
    ]},
    {id: 'rg4-slow-spiral', opening: logistic(25), asks: [
        T('r', '2,9', {fixed: '19/29 ≈ 0,655172', decisive: '−0,9'}), STEP(11, it_('0,678306')), STEP(38, it_('0,653811')), STEP(60, it_('0,655039')),
    ]},
    {id: 'rg4-extinction', opening: logistic(29), asks: [
        T('r', '0,8', {fixed: '0', decisive: '0,8'}, () => t('recursion_graph_status_extinction')),
        NEXT(it_('0,072')), STEP(4, it_('0,031071')), STEP(11, it_('0,00579')), STEP(60, it_('0')),
        T('r', '1', {fixed: '0', decisive: '1'}, () => t('recursion_graph_status_extinction_one')), STEP(11, it_('0,045851')), STEP(60, it_('0,013885')),
    ]},
    {id: 'rg4-slope', opening: logistic(15), asks: [
        T('r', '2,2', {fixed: '6/11 ≈ 0,545455', decisive: '−0,2', shape: SHAPE.spiral}),
        T('r', '1,1', {fixed: '1/11 ≈ 0,090909', decisive: '0,9', shape: SHAPE.staircase}),
    ]},
    {id: 'rg4-explore', opening: logistic(15), asks: [
        T('r', '1,1', {decisive: '0,9', shape: SHAPE.staircase}), T('r', '2,9', {decisive: '−0,9', shape: SHAPE.spiral}),
    ]},
];
const ALL: readonly {lesson: GuidedLesson; plans: readonly Plan[]}[] = [{lesson: recursionCobwebLesson, plans: RG2}, {lesson: recursionLogisticLesson, plans: RG4}];
const STEP_IDS = (lesson: GuidedLesson) => lesson.steps.map(step => step.id);

// ---- the scene sweep -------------------------------------------------------------------------------------------------------------------

function expectRows(id: string, rows: Rows | Record<string, string>, language: Language) {
    for (const [row, text] of Object.entries(rows)) {
        const wanted = text.startsWith('@') ? t(`recursion_graph_shape_${text.slice(1)}` as 'recursion_graph_shape_square') : row === 'shape' ? text : loc(text, language);
        expect({id, row, text: shown(row)}).toEqual({id, row, text: stripped(wanted)});
    }
}

describe.each(LANGUAGES)('RG2 and RG4 scenes in %s', language => {
    test.each(ALL.map(({lesson}) => lesson))('$title: every opening lands in the stated state and readouts, out of order and twice; leaving restores the free state', lesson => {
        setLanguage(language);
        const m = mountCobweb();
        const openings = new Map(ALL.flatMap(({plans}) => plans).map(plan => [plan.id, plan.opening]));
        const ids = STEP_IDS(lesson);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = openings.get(id)!;
            m.scene(lesson, id);
            m.scene(lesson, id);
            expect({id, ...current(m.graph)}).toEqual({id, ...expected});
            expectRows(id, expectedRows(expected, language), language);
        }
        m.restore();
        expect(JSON.stringify(m.graph.state)).toBe(m.free);
    });

    test.each(ALL.map(({lesson, plans}) => [lesson.title.en, lesson, plans] as const))('%s: the learner actions the text asks for give the readouts it quotes', async (_title, lesson, plans) => {
        setLanguage(language);
        const m = mountCobweb();
        for (const plan of plans) {
            m.scene(lesson, plan.id);
            const opening = JSON.stringify(m.graph.state);
            let first = true;
            for (const check of plan.asks) {
                await perform(m.graph, check.act, language);
                if (first) expect({id: plan.id, label: plan.label, sameAsOpening: JSON.stringify(m.graph.state) === opening}).toEqual({id: plan.id, label: plan.label, sameAsOpening: false});
                first = false;
                if (check.rows) expectRows(plan.id, check.rows, language);
                if (check.status) expect({id: plan.id, status: status()}).toEqual({id: plan.id, status: expect.stringContaining(check.status())});
            }
            expect({id: plan.id, label: plan.label, sameAsOpening: JSON.stringify(m.graph.state) === opening}).toEqual({id: plan.id, label: plan.label, sameAsOpening: false});
        }
    });
});

test('every RG2 and RG4 step has an opening plan and an ask plan', () => {
    for (const {lesson, plans} of ALL) expect(new Set(plans.map(plan => plan.id))).toEqual(new Set(STEP_IDS(lesson)));
});

// ---- the controls and readouts the prompts name ----------------------------------------------------------------------------------------

const L = {
    m: () => t('recursion_graph_m_label'), c: () => t('recursion_graph_c_label'), r: () => t('recursion_graph_r_label'), x: () => t('recursion_graph_x_label'),
    fixed: () => t('recursion_graph_r_fixed'), shape: () => t('recursion_graph_r_shape'), decisive: () => t('recursion_graph_r_decisive'), map: () => t('recursion_graph_map_label'),
    cosine: () => t('recursion_graph_map_cosine'), next: () => t('next_step'), play: () => t('play'), pause: () => t('pause'), reset: () => t('reset'), zoom: () => t('zoom_in'),
    iterate: (n: string) => () => t('recursion_graph_r_iterate', {value0: n}).replace(/\s*\([^)]*\)$/, ''),
};
const NAMED: Record<string, readonly (() => string)[]> = {
    'rg2-line-diagonal': [L.next, L.iterate('3')],
    'rg2-play': [L.next, L.play, L.pause, L.reset, L.iterate('n')],
    'rg2-negative-slope': [L.m, L.c, L.x, L.fixed, L.shape, L.next, L.play, L.iterate('1'), L.iterate('60')],
    'rg2-repelling': [L.m, L.c, L.x, L.fixed, L.next, L.play, L.iterate('1'), L.iterate('60')],
    'rg2-borderline': [L.m, L.shape, L.next],
    'rg2-cosine': [L.zoom, L.map, L.cosine, L.fixed, L.decisive, L.next],
    'rg2-explore': [L.next, L.play],
    'rg4-rule': [L.r, L.fixed],
    'rg4-staircase': [L.next, L.play, L.shape, L.iterate('4'), L.iterate('11')],
    'rg4-spiral': [L.r, L.fixed, L.shape, L.next, L.play, L.iterate('1'), L.iterate('11')],
    'rg4-slow-spiral': [L.r, L.fixed, L.decisive, L.play, L.iterate('11')],
    'rg4-extinction': [L.r, L.fixed, L.decisive, L.play, L.iterate('60')],
    'rg4-slope': [L.r, L.decisive],
    'rg4-explore': [],
};
/** Prose as read in the app: no math delimiters, no spaces, subscripts and x^* written the way the graph writes them. */
const flat = (text: string) => text
    .replace(/\\\(|\\\)/g, '').replace(/\\mapsto/g, '↦').replace(/\\cos/g, 'cos').replace(/\^\*/g, '*').replace(/_\{?([0-9a-z]+)\}?/g, '$1')
    .replace(/[₀-₉]/g, digit => String(digit.charCodeAt(0) - 0x2080)).replace(/\s+/g, '');

describe.each(LANGUAGES)('RG2 and RG4 prompt labels in %s', language => {
    test.each(ALL.flatMap(({lesson}) => lesson.steps.map(step => [step.id, step] as const)))('%s: every control and readout the prompt names exists in the graph strings', (id, step) => {
        setLanguage(language);
        const prompt = flat(`${step.explanation[language]} ${step.observationPrompt[language]}`);
        // the Slovenian text declines the readout name in the sentence ("preberi Obliko mreže")
        const forms = (label: string) => [flat(label), flat(label.replace('Oblika', 'Obliko'))];
        for (const label of NAMED[id]) expect({id, label: label(), named: forms(label()).some(form => prompt.includes(form))}).toEqual({id, label: label(), named: true});
    });
});

// ---- part B: every quoted number, recomputed independently of the graph ----------------------------------------------------------------

/** The line x -> m x + c from x0: the fixed point c / (1 - m), the iterates by a direct loop and by the closed form x* + m^n (x0 - x*). */
function line(m: number, c: number, x0: number) {
    const fixed = c / (1 - m);
    const loop = (n: number) => { let x = x0; for (let i = 0; i < n; i++) x = m * x + c; return x; };
    const closed = (n: number) => fixed + Math.pow(m, n) * (x0 - fixed);
    const x = (n: number) => {
        expect(Math.abs(loop(n) - closed(n))).toBeLessThan(1e-9 * Math.max(1, Math.abs(loop(n))));
        return loop(n);
    };
    /** The first n with |x_n - x*| < 1e-3 (a direct loop). */
    const within = () => { let n = 0; while (Math.abs(loop(n) - fixed) >= 1e-3) n++; return n; };
    return {fixed, x, within};
}
const logisticLoop = (r: number, x0: number) => (n: number) => { let x = x0; for (let i = 0; i < n; i++) x = r * x * (1 - x); return x; };
const cosineLoop = (x0: number) => (n: number) => { let x = x0; for (let i = 0; i < n; i++) x = Math.cos(x); return x; };
/** The root of cos x = x by bisection. */
function cosineFixedPoint(): number {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (Math.cos(mid) - mid > 0) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
}
const central = (f: (x: number) => number, at: number, h = 1e-5) => (f(at + h) - f(at - h)) / (2 * h);

interface Quote { readonly value: number; readonly digits: number }
const Q = (value: number, digits = 6): Quote => ({value, digits});
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

const stepTexts = (lesson: GuidedLesson, id: string, language: Language): string[] => {
    const step = lesson.steps.find(candidate => candidate.id === id)!;
    const formulas = lesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.title, step.purpose, step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations, ...formulas.flatMap(block => [block.notation, block.explanation])].map(entry => entry[language]);
};

const W = line(0.5, 1, 0);
const N = line(-0.8, 9, 1);
const O = line(-1.2, 10, 4.6);
const B = line(-1, 10, 4.6);
const SQ = line(-1, 6, 1);
const AWAY = line(1.5, -1, 2.1);
const cosFixed = cosineFixedPoint();
const cosSlope = -Math.sin(cosFixed);
const cosX = cosineLoop(0);
const cosHalf = cosineLoop(0.5);
const L15 = logisticLoop(1.5, 0.1);
const L25 = logisticLoop(2.5, 0.1);
const L29 = logisticLoop(2.9, 0.1);
const L08 = logisticLoop(0.8, 0.1);
const L10 = logisticLoop(1, 0.1);
const fixedLogistic = (r: number) => 1 - 1 / r;

interface Spec { readonly lesson: GuidedLesson; readonly id: string; readonly quotes: readonly Quote[]; readonly fractions?: readonly (readonly [number, number])[]; readonly extra?: readonly string[] }
/** The decimals a step may show besides its quotes: the parameters the learner types or sees, thresholds and ratios of the arithmetic (written in the English form). */
const SPECS: readonly Spec[] = [
    {lesson: recursionCobwebLesson, id: 'rg2-line-diagonal', quotes: [Q(W.x(1)), Q(W.x(2)), Q(W.x(3)), Q(W.fixed, 0)], extra: ['0.5']},
    {lesson: recursionCobwebLesson, id: 'rg2-play', quotes: [Q(W.x(11)), Q(2 * Math.pow(0.5, 11)), Q(2 * Math.pow(0.5, 10)), Q(0.001, 3)], extra: ['0.5']},
    {lesson: recursionCobwebLesson, id: 'rg2-negative-slope', quotes: [Q(N.fixed, 0), Q(N.x(1)), Q(N.x(2)), Q(N.x(3)), Q(N.x(4)), Q(N.x(11)), Q(N.x(38)), Q(N.x(60)), Q(0.001, 3)], extra: ['0.8', '0.5']},
    {lesson: recursionCobwebLesson, id: 'rg2-repelling', quotes: [Q(O.fixed), Q(O.x(1)), Q(O.x(2)), Q(O.x(3)), Q(O.x(4)), Q(O.x(60)), Q(1.2, 1)], fractions: [[50, 11]], extra: ['0.8', '4.6']},
    {lesson: recursionCobwebLesson, id: 'rg2-borderline', quotes: [Q(B.fixed, 0), Q(B.x(1)), Q(B.x(2)), Q(B.x(3))], extra: ['4.6', '1.2']},
    {lesson: recursionCobwebLesson, id: 'rg2-cosine', quotes: [Q(cosFixed), Q(cosSlope), Q(cosX(8)), Q(cosX(11)), Q(cosX(60)), Q(0.8, 1)], extra: ['0.5']},
    {lesson: recursionCobwebLesson, id: 'rg2-explore', quotes: [Q(SQ.x(0), 0), Q(SQ.x(1), 0), Q(SQ.x(2), 0), Q(SQ.x(3), 0), Q(AWAY.x(0), 1), Q(AWAY.x(1), 2), Q(AWAY.x(2), 3), Q(cosHalf(4)), Q(0.5, 1)], extra: ['1.5']},
    {lesson: recursionLogisticLesson, id: 'rg4-rule', quotes: [Q(fixedLogistic(1.2)), Q(fixedLogistic(1.5))], fractions: [[1, 6], [1, 3]], extra: ['1.2', '0.1', '1.5', '0.8', '0.5']},
    {lesson: recursionLogisticLesson, id: 'rg4-staircase', quotes: [Q(L15(1)), Q(L15(2)), Q(L15(3)), Q(L15(4)), Q(L15(11)), Q(2 - 1.5, 1)], fractions: [[1, 3]], extra: ['1.5', '0.1']},
    {lesson: recursionLogisticLesson, id: 'rg4-spiral', quotes: [Q(L25(1)), Q(L25(2)), Q(L25(3)), Q(L25(4)), Q(L25(11)), Q(fixedLogistic(2.5), 1), Q(2 - 2.5, 1)], fractions: [[3, 5]], extra: ['1.5', '2.5', '0.1']},
    {lesson: recursionLogisticLesson, id: 'rg4-slow-spiral', quotes: [Q(fixedLogistic(2.9)), Q(L29(11)), Q(L29(38)), Q(L29(60)), Q(Math.abs(L29(60) - fixedLogistic(2.9)), 5), Q(2 - 2.9, 1)], fractions: [[19, 29]], extra: ['2.5', '2.9', '0.1', '0.5']},
    {lesson: recursionLogisticLesson, id: 'rg4-extinction', quotes: [Q(L08(1)), Q(L08(4)), Q(L08(11)), Q(L08(60), 0), Q(L10(11)), Q(L10(60)), Q(0.8, 1), Q(1, 0)], extra: ['2.9', '0.1', '0.9']},
    {lesson: recursionLogisticLesson, id: 'rg4-slope', quotes: [Q(fixedLogistic(2.2)), Q(fixedLogistic(1.1)), Q(2 - 2.2, 1), Q(2 - 1.1, 1)], fractions: [[6, 11]], extra: ['2.2', '1.1', '1.5', '0.1']},
    {lesson: recursionLogisticLesson, id: 'rg4-explore', quotes: [Q(2 - 1.1, 1), Q(2 - 2.9, 1)], extra: ['1.5', '0.1', '1.1', '2.9']},
];
/** Rounded quotes the text does not hedge with a "približno"/"approximately" word, \approx or a "(izračunano)" mark: none. */
const KNOWN_UNHEDGED: Readonly<Record<string, readonly string[]>> = {};

const tfrac = (n: number, d: number) => (n < 10 && d < 10 ? `\\tfrac${n}${d}` : `\\tfrac{${n}}{${d}}`);

describe.each(LANGUAGES)('RG2 and RG4 quoted numbers in %s', language => {
    test.each(SPECS.map(spec => [spec.id, spec] as const))('%s: every quote is recomputed and appears, rounded ones are hedged, nothing else has decimals', (_id, spec) => {
        const text = stepTexts(spec.lesson, spec.id, language).join(' ');
        const missing = spec.quotes.filter(quote => !numberPattern(quoteText(quote, language)).test(prose(text))).map(quote => quoteText(quote, language));
        expect({id: spec.id, missing}).toEqual({id: spec.id, missing: []});
        const unhedged = spec.quotes.filter(quote => isRounded(quote) && !hedged(text, quoteText(quote, language))).map(quote => quoteText(quote, 'sl'));
        expect({id: spec.id, unhedged}).toEqual({id: spec.id, unhedged: KNOWN_UNHEDGED[spec.id] ?? []});
        for (const [n, d] of spec.fractions ?? []) expect({id: spec.id, fraction: `${n}/${d}`, shown: text.includes(tfrac(n, d))}).toEqual({id: spec.id, fraction: `${n}/${d}`, shown: true});
        if (language === 'sl') expect({id: spec.id, english: decimalsIn(text)}).toEqual({id: spec.id, english: []});
        else {
            const allowed = new Set([...spec.quotes.map(quote => quoteText(quote, 'en')), ...(spec.extra ?? [])]);
            expect({id: spec.id, unaccounted: decimalsIn(text).filter(value => !allowed.has(value))}).toEqual({id: spec.id, unaccounted: []});
        }
    });
});

test('the closed forms: fixed points as exact rationals, the logistic slope against a central difference, the cosine by bisection and Newton, steps to within 0,001', () => {
    // affine: x* = c / (1 - m) = 2C / (20 - M) for the stored whole numbers
    for (const [M, C, n, d] of [[10, 10, 2, 1], [-16, 90, 5, 1], [-24, 100, 50, 11], [-20, 100, 5, 1]] as const) {
        const g = gcd(2 * C, 20 - M);
        expect([2 * C / g, (20 - M) / g]).toEqual([n, d]);
        expect((2 * C) / (20 - M)).toBeCloseTo((C / 10) / (1 - M / 20), 12);
    }
    // logistic: x* = 1 - 1/r = (R - 10) / R and the slope 2 - r equals a central difference of r x (1 - x) at x*
    for (const [R, n, d] of [[12, 1, 6], [15, 1, 3], [25, 3, 5], [29, 19, 29], [22, 6, 11], [11, 1, 11]] as const) {
        const g = gcd(R - 10, R);
        expect([(R - 10) / g, R / g]).toEqual([n, d]);
        const r = R / 10;
        const slope = central(x => r * x * (1 - x), 1 - 1 / r);
        expect(slope).toBeCloseTo(2 - r, 8);
        expect(2 - r).toBeCloseTo(r * (1 - 2 * fixedLogistic(r)), 12);
    }
    // r and 4 - r have the slopes 2 - r and r - 2
    for (const r of [1.1, 1.5, 2.2, 2.9]) expect([2 - r, 2 - (4 - r)]).toEqual([2 - r, r - 2]);
    // the cosine: bisection, Newton and the central difference of cos agree with the quoted values
    let newton = 0.7;
    for (let i = 0; i < 30; i++) newton -= (Math.cos(newton) - newton) / (-Math.sin(newton) - 1);
    expect(cosFixed).toBeCloseTo(newton, 12);
    expect(cosFixed).toBeCloseTo(0.739085, 6);
    expect(cosSlope).toBeCloseTo(-0.673612, 6);
    expect(central(Math.cos, cosFixed)).toBeCloseTo(cosSlope, 8);
    expect(Math.abs(cosSlope)).toBeLessThan(0.8);
    expect(cosX(8)).toBeCloseTo(0.722102, 6);
    // steps to within 0,001: 11 for m = 0,5 and 38 for m = -0,8; the errors alternate in sign for m < 0 and grow by |m| for m = -1,2
    expect([W.within(), N.within()]).toEqual([11, 38]);
    expect(Math.abs(N.x(11) - N.fixed)).toBeGreaterThan(1e-3);
    const errors = [0, 1, 2, 3, 4].map(n => O.x(n) - O.fixed);
    for (let i = 0; i < 4; i++) { expect(errors[i] * errors[i + 1]).toBeLessThan(0); expect(Math.abs(errors[i + 1] / errors[i])).toBeCloseTo(1.2, 9); }
    expect(2 * Math.pow(0.5, 11)).toBeLessThan(1e-3);
    expect(2 * Math.pow(0.5, 10)).toBeGreaterThan(1e-3);
});
