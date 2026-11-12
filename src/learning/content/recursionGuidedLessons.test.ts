/**
 * RG1 and RG3 (recursion, batch A): every scene lands in the state the text states (the real growth graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), and every number a step quotes is bound to its step. The expected values are computed here with closed forms written for
 * this test (a1 + (n-1) d, n (a1 + an) / 2, a1 q^(n-1), a1 (q^n - 1) / (q - 1), a1 / (1 - q), P (1 + p t), P (1 + p)^t, P (1 + p / m)^(m t), P exp(p t),
 * (1 + p)^(1/m) - 1, ln 2 / ln (1 + p), 72 / (100 p), (1 + 1/n)^n), not with the graph, and compared with the real readouts; the quoted numbers are generated from the
 * same values and looked up in the sl and en prose. The changes the text asks the learner to make are applied as actions and the readouts checked.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {recursionInterestLesson, recursionSequenceLesson} from './recursionGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {GrowthGraph} from '../../graphs/recursion/GrowthGraph';
import {setLanguage} from '../../localization';
import {arithmetic, geometric, geometricLimit, partialSum} from '../../recursion/sequences';
import {compound, conformalRate, eApprox, relative, simple} from '../../recursion/interest';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- independent closed forms ----------------------------------------------------------------------------------------------------------

const arithTerm = (a1: number, d: number, n: number) => a1 + (n - 1) * d;
const arithSum = (a1: number, d: number, n: number) => (n * (a1 + arithTerm(a1, d, n))) / 2;
const geomTerm = (a1: number, q: number, n: number) => a1 * Math.pow(q, n - 1);
const geomSum = (a1: number, q: number, n: number) => (a1 * (Math.pow(q, n) - 1)) / (q - 1);
const limitOf = (a1: number, q: number) => a1 / (1 - q);
const simpleK = (P: number, p: number, t: number) => P * (1 + p * t);
const compoundK = (P: number, p: number, t: number) => P * Math.pow(1 + p, t);
const relativeK = (P: number, p: number, m: number, t: number) => P * Math.pow(1 + p / m, m * t);
const continuousK = (P: number, p: number, t: number) => P * Math.exp(p * t);
const conformal = (p: number, m: number) => Math.pow(1 + p, 1 / m) - 1;
const doublingTime = (p: number) => Math.log(2) / Math.log(1 + p);
const rule72 = (p: number) => 72 / (100 * p);
const eTerm = (n: number) => Math.pow(1 + 1 / n, n);

// ---- number formats -------------------------------------------------------------------------------------------------------------------

const MINUS = '−';
/** A readout number: up to `digits` decimals, no trailing zeros, decimal comma, true minus sign. */
const readoutNumber = (value: number, digits: number): string => Number(value.toFixed(digits)).toString().replace('-', MINUS).replace('.', ',');
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
function proseNumber(value: number, digits: number, language: 'sl' | 'en'): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
/** Prose with the LaTeX spacing and the decimal-comma braces removed, so that `1{,}5\,\%` reads 1,5 %. */
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));
/** Every number with decimals in an English text (the decimal point is the only separator there). */
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mountGrowth() {
    const graph = createGraph('recursion-growth');
    if (!(graph instanceof GrowthGraph)) throw new Error('recursion-growth must be the growth graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const scene = (lesson: GuidedLesson, stepId: string) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
type MapAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-map'}>;
type ParamsAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-params'}>;
type InterestAction = Extract<LessonAction, {kind: 'recursion'; operation: 'set-interest'}>;
const setMap = (fields: Omit<MapAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-map', ...fields});
const setParams = (fields: Omit<ParamsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-params', ...fields});
const setInterest = (fields: Omit<InterestAction, 'kind' | 'operation'>): LessonAction => ({kind: 'recursion', operation: 'set-interest', ...fields});

// ---- rows of the two panels ------------------------------------------------------------------------------------------------------------

interface SeqSetup { readonly kind: 'arithmetic' | 'geometric'; readonly a1: number; readonly r: number; readonly n: number }
/** The sequence panel rows; `r` is d (arithmetic) or q (geometric, as a number, not stored x10). */
function seqRows(c: SeqSetup): Record<string, string> {
    const term = c.kind === 'arithmetic' ? arithTerm(c.a1, c.r, c.n) : geomTerm(c.a1, c.r, c.n);
    const sum = c.kind === 'arithmetic' ? arithSum(c.a1, c.r, c.n) : c.r === 1 ? c.n * c.a1 : geomSum(c.a1, c.r, c.n);
    return {nth: readoutNumber(term, 6), sum: readoutNumber(sum, 6)};
}
interface InterestSetup { readonly P: number; readonly p: number; readonly t: number; readonly m: number }
const DEFAULT_INTEREST: InterestSetup = {P: 1000, p: 0.05, t: 10, m: 12};
const withInterest = (patch: Partial<InterestSetup>): InterestSetup => ({...DEFAULT_INTEREST, ...patch});
/** The interest panel rows (all of them; a test picks what it needs). */
function interestRows(c: InterestSetup): Record<string, string> {
    return {
        simple: readoutNumber(simpleK(c.P, c.p, c.t), 2), compound: readoutNumber(compoundK(c.P, c.p, c.t), 2),
        relative: readoutNumber(relativeK(c.P, c.p, c.m, c.t), 2), continuous: readoutNumber(continuousK(c.P, c.p, c.t), 2),
        conformal: `${readoutNumber(100 * conformal(c.p, c.m), 6)}%`, 'conformal-value': readoutNumber(compoundK(c.P, c.p, c.t), 2),
        doubling: `${readoutNumber(doublingTime(c.p), 4)}let`, rule72: `${readoutNumber(rule72(c.p), 4)}let`,
        'e-1': readoutNumber(eTerm(1), 6), 'e-10': readoutNumber(eTerm(10), 6), 'e-100': readoutNumber(eTerm(100), 6), 'e-1000': readoutNumber(eTerm(1000), 6),
        'e-1000000': readoutNumber(eTerm(1_000_000), 6), e: readoutNumber(Math.E, 6),
    };
}
const only = (rows: Record<string, string>, ...ids: string[]) => Object.fromEntries(Object.entries(rows).filter(([id]) => ids.includes(id)));

interface Quote { readonly value: number; readonly digits: number }
const q = (value: number, digits: number): Quote => ({value, digits});

interface Expected {
    readonly state: Readonly<Record<string, unknown>>;
    readonly rows: Record<string, string>;
    /** Numbers the step's expected-state text quotes. */
    readonly quotes: readonly Quote[];
    /** Numbers quoted by the step's explanation, observations or worked example but not by its expected-state text. */
    readonly also?: readonly Quote[];
}
const SEQ_DEFAULT = {panel: 'sequence', kind: 'arithmetic', a1: 3, d: 2, q: 20, n: 10} as const;
const seqStep = (state: Record<string, unknown>, c: SeqSetup, rows: Record<string, string>, quotes: readonly Quote[], also: readonly Quote[] = []): Expected =>
    ({state: {...SEQ_DEFAULT, ...state}, rows: {...seqRows(c), ...rows}, quotes, also});
const INTEREST_DEFAULT = {panel: 'interest', capital: 1000, rate: 10, years: 10, parts: 12} as const;
const interestStep = (state: Record<string, unknown>, c: InterestSetup, quotes: readonly Quote[], also: readonly Quote[] = []): Expected =>
    ({state: {...INTEREST_DEFAULT, ...state}, rows: interestRows(c), quotes, also});

const int = (value: number) => q(value, 0);
const dec6 = (value: number) => q(value, 6);
const money = (value: number) => q(value, 2);

const HALF: SeqSetup = {kind: 'geometric', a1: 3, r: 0.5, n: 10};
const RG1: Record<string, Expected> = {
    'rg1-first-terms': seqStep({n: 6}, {kind: 'arithmetic', a1: 3, r: 2, n: 6}, {terms: '3;5;7;9;11;13'}, [int(arithTerm(3, 2, 6))], [int(arithTerm(3, 2, 10))]),
    'rg1-arithmetic-closed': seqStep({}, {kind: 'arithmetic', a1: 3, r: 2, n: 10}, {}, [int(arithTerm(3, 2, 10)), int(arithSum(3, 2, 10))]),
    'rg1-geometric': seqStep({kind: 'geometric', n: 3}, {kind: 'geometric', a1: 3, r: 2, n: 3}, {terms: '3;6;12'}, [int(geomTerm(3, 2, 1)), int(geomTerm(3, 2, 2)), int(geomTerm(3, 2, 3))], [int(geomTerm(3, 2, 10)), int(arithTerm(3, 2, 10))]),
    'rg1-compare': seqStep({kind: 'geometric'}, {kind: 'geometric', a1: 3, r: 2, n: 10}, {}, [int(geomTerm(3, 2, 10)), int(arithTerm(3, 2, 10))]),
    'rg1-sums': seqStep({kind: 'geometric'}, {kind: 'geometric', a1: 3, r: 2, n: 10}, {}, [int(geomTerm(3, 2, 10)), int(geomSum(3, 2, 10))], [int(arithSum(3, 2, 10))]),
    'rg1-halving': seqStep({kind: 'geometric', q: 5}, HALF, {limit: '6'}, [dec6(geomTerm(3, 0.5, 10)), dec6(geomSum(3, 0.5, 10)), int(limitOf(3, 0.5))], [q(geomSum(3, 0.5, 3), 2)]),
    'rg1-explore': seqStep({kind: 'geometric', a1: 2, q: 15, n: 12}, {kind: 'geometric', a1: 2, r: 1.5, n: 12}, {}, [dec6(geomTerm(2, 1.5, 12)), dec6(geomSum(2, 1.5, 12))],
        [int(geomSum(3, 2, 10)), int(arithTerm(10, -3, 8)), int(arithSum(10, -3, 8))]),
};
const RG3: Record<string, Expected> = {
    'rg3-predict': interestStep({years: 1, parts: 1}, withInterest({t: 1, m: 1}), [int(simpleK(1000, 0.05, 1)), int(compoundK(1000, 0.05, 1))], [int(simpleK(1000, 0.05, 10)), money(compoundK(1000, 0.05, 10))]),
    'rg3-curves': interestStep({years: 10, parts: 1}, withInterest({m: 1}), [int(simpleK(1000, 0.05, 10)), money(compoundK(1000, 0.05, 10))], [int(1000 * 0.05)]),
    'rg3-parts': interestStep({}, withInterest({}), [money(compoundK(1000, 0.05, 10)), money(relativeK(1000, 0.05, 12, 10)), money(continuousK(1000, 0.05, 10))],
        [1, 2, 4, 365].map(m => money(relativeK(1000, 0.05, m, 10)))),
    'rg3-conformal': interestStep({}, withInterest({}), [q(100 * conformal(0.05, 12), 6), money(compoundK(1000, 0.05, 10))],
        [q(100 * 0.05 / 12, 6), q(100 * conformal(0.05, 4), 6), money(relativeK(1000, 0.05, 12, 10))]),
    'rg3-e': interestStep({years: 10, parts: 365}, withInterest({m: 365}), [money(relativeK(1000, 0.05, 365, 10)), money(continuousK(1000, 0.05, 10)), dec6(Math.E)],
        [eTerm(1), eTerm(10), eTerm(100), eTerm(1000), eTerm(1_000_000)].map(dec6)),
    'rg3-doubling': interestStep({years: 14, parts: 1}, withInterest({t: 14, m: 1}), [money(compoundK(1000, 0.05, 14)), q(doublingTime(0.05), 4), q(rule72(0.05), 4)],
        [money(compoundK(1000, 0.05, 15)), q(doublingTime(0.1), 4), q(rule72(0.1), 4)]),
    'rg3-explore': interestStep({capital: 2000, rate: 6, years: 20, parts: 4}, {P: 2000, p: 0.03, t: 20, m: 4},
        [int(simpleK(2000, 0.03, 20)), money(compoundK(2000, 0.03, 20)), money(relativeK(2000, 0.03, 4, 20)), money(continuousK(2000, 0.03, 20))],
        [q(100 * conformal(0.03, 4), 6), money(compoundK(1000, 0.1, 10)), money(compoundK(1000, 0.05, 15))]),
};

const lessons = [
    ['RG1', recursionSequenceLesson, RG1, 'sequences', 7],
    ['RG3', recursionInterestLesson, RG3, 'compound-interest', 7],
] as const;

/** Decimals that name an input, a rate or a term of the shown sequence rather than a readout (English spelling). */
const NEUTRAL: Record<string, string[]> = {
    RG1: ['1.5', '0.75', '0.375', '0.1875', '0.09375', '0.5'],
    RG3: ['0.05', '1.05', '0.03', '1.5', '0.5'],
};

describe.each(lessons)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('recursion')!.lesson(section)!;
        expect(owned.steps).toHaveLength(count);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test(`${name}: the numbers each step quotes are those of its scene, in both languages, and no other number with decimals is quoted`, () => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
            const calculations = examples.map(example => (example.check ? [example.check.sl, example.check.en] : [])).flat();
            const formulas = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id)).map(block => [block.explanation.en, block.notation.en]).flat();
            for (const language of ['sl', 'en'] as const) {
                const state = step.scene!.expectedState[language];
                const everything = [state, step.explanation[language], ...step.expectedObservations.map(o => o[language]), ...calculations].join(' ');
                for (const quote of expected.quotes) {
                    const value = proseNumber(quote.value, quote.digits, language);
                    expect({id: step.id, language, value, inState: hasNumber(state, value)}).toEqual({id: step.id, language, value, inState: true});
                }
                for (const quote of [...expected.quotes, ...(expected.also ?? [])]) {
                    const value = proseNumber(quote.value, quote.digits, language);
                    expect({id: step.id, language, value, inText: hasNumber(everything, value)}).toEqual({id: step.id, language, value, inText: true});
                }
                if (language === 'sl') {
                    const slTexts = [step.title.sl, step.purpose.sl, step.explanation.sl, step.observationPrompt.sl, state, ...step.expectedObservations.map(o => o.sl), ...calculations.filter((_, i) => i % 2 === 0)];
                    const english = slTexts.flatMap(decimalsIn);
                    expect({id: step.id, english}).toEqual({id: step.id, english: []});
                }
            }
            const allowed = new Set([...expected.quotes, ...(expected.also ?? [])].map(quote => proseNumber(Math.abs(quote.value), quote.digits, 'en')).concat(NEUTRAL[name]));
            const texts = [step.title.en, step.purpose.en, step.explanation.en, step.observationPrompt.en, step.scene!.expectedState.en, ...step.expectedObservations.map(o => o.en), ...calculations, ...formulas];
            const unaccounted = texts.flatMap(decimalsIn).filter(value => !allowed.has(value));
            expect({id: step.id, unaccounted}).toEqual({id: step.id, unaccounted: []});
        }
    });
});

function checkScenes(lesson: GuidedLesson, scenes: Record<string, Expected>) {
    const m = mountGrowth();
    try {
        const ids = Object.keys(scenes);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = scenes[id];
            m.scene(lesson, id);
            m.scene(lesson, id);
            const state = m.graph.state as unknown as Record<string, unknown>;
            expect({id, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, state[key]]))}).toEqual({id, ...expected.state});
            for (const [row, text] of Object.entries(expected.rows)) {
                if (row === 'limit') expect({id, row, text: stripped(readout(row)).startsWith(text)}).toEqual({id, row, text: true});
                else expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
            }
        }
        m.restore();
        expect(JSON.stringify(m.graph.state)).toBe(m.free);
    } finally {
        m.mounted.view.unmount();
    }
}

test('RG1: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(recursionSequenceLesson, RG1);
});

test('RG3: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(recursionInterestLesson, RG3);
});

/** Runs the learner's changes after a scene and checks the readouts against the closed forms. */
function learnerChanges(lesson: GuidedLesson, stepId: string, changes: readonly {actions: LessonAction[]; rows: Record<string, string>}[]) {
    const m = mountGrowth();
    try {
        m.scene(lesson, stepId);
        for (const change of changes) {
            m.learner(...change.actions);
            for (const [row, text] of Object.entries(change.rows)) {
                if (row === 'limit') expect({stepId, row, text: stripped(readout(row)).startsWith(text)}).toEqual({stepId, row, text: true});
                else expect({stepId, row, text: stripped(readout(row))}).toEqual({stepId, row, text: stripped(text)});
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
}

test('RG1: the values the text asks to type give the terms, sums and limit it quotes', () => {
    const arith = (n: number): SeqSetup => ({kind: 'arithmetic', a1: 3, r: 2, n});
    const geom = (n: number, r = 2): SeqSetup => ({kind: 'geometric', a1: 3, r, n});
    learnerChanges(recursionSequenceLesson, 'rg1-first-terms', [{actions: [setParams({n: 10})], rows: seqRows(arith(10))}]);
    learnerChanges(recursionSequenceLesson, 'rg1-geometric', [{actions: [setParams({n: 10})], rows: seqRows(geom(10))}]);
    learnerChanges(recursionSequenceLesson, 'rg1-compare', [
        {actions: [setMap({sequence: 'arithmetic'})], rows: seqRows(arith(10))},
        {actions: [setMap({sequence: 'geometric'})], rows: seqRows(geom(10))},
    ]);
    learnerChanges(recursionSequenceLesson, 'rg1-sums', [{actions: [setParams({q: 30})], rows: seqRows(geom(10, 3))}]);
    learnerChanges(recursionSequenceLesson, 'rg1-halving', [
        {actions: [setParams({n: 3})], rows: {...seqRows(geom(3, 0.5)), limit: '6'}},
        {actions: [setParams({n: 10})], rows: {...seqRows(geom(10, 0.5)), limit: '6'}},
    ]);
    learnerChanges(recursionSequenceLesson, 'rg1-explore', [{actions: [setMap({sequence: 'arithmetic'}), setParams({a1: 10, d: -3, n: 8})], rows: {...seqRows({kind: 'arithmetic', a1: 10, r: -3, n: 8})}}]);
    expect(arithTerm(10, -3, 8)).toBe(-11);
    expect(arithSum(10, -3, 8)).toBe(-4);
    expect(geomSum(3, 0.5, 3)).toBe(5.25);
});

test('RG3: the years, periods and rates the text asks to choose give the amounts and times it quotes', () => {
    learnerChanges(recursionInterestLesson, 'rg3-predict', [{actions: [setInterest({years: 10})], rows: only(interestRows(withInterest({m: 1})), 'simple', 'compound')}]);
    learnerChanges(recursionInterestLesson, 'rg3-curves', [{actions: [setInterest({years: 20})], rows: only(interestRows(withInterest({m: 1, t: 20})), 'simple', 'compound')}]);
    learnerChanges(recursionInterestLesson, 'rg3-parts', [1, 2, 4, 12, 365].map(m => ({actions: [setInterest({parts: m})], rows: only(interestRows(withInterest({m})), 'relative', 'continuous')})));
    learnerChanges(recursionInterestLesson, 'rg3-conformal', [{actions: [setInterest({parts: 4})], rows: only(interestRows(withInterest({m: 4})), 'conformal', 'conformal-value')}]);
    learnerChanges(recursionInterestLesson, 'rg3-doubling', [
        {actions: [setInterest({years: 15})], rows: only(interestRows(withInterest({m: 1, t: 15})), 'compound')},
        {actions: [setInterest({rate: 20, years: 10})], rows: only(interestRows(withInterest({m: 1, p: 0.1})), 'compound', 'doubling', 'rule72')},
    ]);
    learnerChanges(recursionInterestLesson, 'rg3-explore', [{actions: [setInterest({capital: 1000, rate: 20, years: 10, parts: 1})], rows: only(interestRows({P: 1000, p: 0.1, t: 10, m: 1}), 'compound')}]);
});

test('RG3 step 7: simple <= compound <= relative <= continuous for whole years from 1 to 40, and fails for a fraction of a year', () => {
    const chain = (P: number, p: number, m: number, t: number) => [simpleK(P, p, t), compoundK(P, p, t), relativeK(P, p, m, t), continuousK(P, p, t)];
    for (const p of [0.005, 0.01, 0.03, 0.05, 0.1, 0.5, 1]) {
        for (const m of [1, 2, 4, 12, 365]) {
            for (let t = 1; t <= 40; t += 1) {
                const [s, c, r, k] = chain(1000, p, m, t);
                const slack = 1e-9 * k;
                expect({p, m, t, ok: s <= c + slack && c <= r + slack && r <= k + slack}).toEqual({p, m, t, ok: true});
            }
        }
    }
    const [shortSimple, shortCompound] = chain(1000, 0.5, 1, 0.5);
    expect(shortSimple).toBeGreaterThan(shortCompound);
});

test('the closed forms agree with the kernel and reproduce the quoted reference values', () => {
    expect(arithmetic(3, 2, 10)).toBe(arithTerm(3, 2, 10));
    expect(partialSum('arithmetic', 3, 2, 10)).toBe(arithSum(3, 2, 10));
    expect(geometric(3, 2, 10)).toBe(geomTerm(3, 2, 10));
    expect(partialSum('geometric', 3, 2, 10)).toBe(3069);
    expect(partialSum('geometric', 3, 0.5, 10)).toBeCloseTo(geomSum(3, 0.5, 10), 12);
    expect(geometricLimit(3, 0.5)).toBe(limitOf(3, 0.5));
    expect(simple(1000, 0.05, 10)).toBeCloseTo(simpleK(1000, 0.05, 10), 9);
    expect(compound(1000, 0.05, 10)).toBeCloseTo(compoundK(1000, 0.05, 10), 9);
    expect(relative(1000, 0.05, 12, 10)).toBeCloseTo(relativeK(1000, 0.05, 12, 10), 9);
    expect(conformalRate(0.05, 12)).toBeCloseTo(conformal(0.05, 12), 15);
    expect(eApprox(1000)).toBeCloseTo(eTerm(1000), 12);
    expect(compoundK(1000, 0.05, 10)).toBeCloseTo(1628.89, 2);
    expect(relativeK(1000, 0.05, 12, 10)).toBeCloseTo(1647.01, 2);
    expect(continuousK(1000, 0.05, 10)).toBeCloseTo(1648.72, 2);
    // the conformal rate reproduces the yearly factor: (1 + r)^m = 1 + p
    for (const m of [1, 2, 4, 12, 365]) expect(Math.pow(1 + conformal(0.05, m), m)).toBeCloseTo(1.05, 12);
    expect(doublingTime(0.05)).toBeCloseTo(14.2067, 4);
    expect(rule72(0.05)).toBeCloseTo(14.4, 12);
    expect(compoundK(1000, 0.05, 14)).toBeLessThan(2000);
    expect(compoundK(1000, 0.05, 15)).toBeGreaterThan(2000);
    expect(compoundK(1000, 0.1, 10)).toBeGreaterThan(2000);
});
