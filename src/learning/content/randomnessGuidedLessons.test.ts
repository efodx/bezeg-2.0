/**
 * RS1 and RS2 (randomness, batch A): every scene lands in the state, readouts and status line the text states (the real simulation graph, scenes applied in one synchronous
 * `act` from a restored checkpoint, out of order and twice), and every number a step or the chapter quotes is bound to a scene. Exact values (binomial masses, the exact 95 %
 * bands, tails, band coverage) are computed here by BigInt sums written for this test, not with the graph. A simulated tally (the counts of one run with its seed) cannot be
 * recomputed without the generator, so it is pinned here as the real readout; everything derived from a tally (the largest gap, the share of a slot, the typical deviation,
 * the frequency, the number of heads above half) is recomputed from it independently and compared with the real readout, and the quoted numbers are generated from the same values
 * and looked up in the sl (decimal comma) and en (decimal point) prose. The changes the text asks the learner to make are applied as actions and the readouts checked.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {randomnessGaltonLesson, randomnessLargeNumbersLesson} from './randomnessGuidedLessons';
import {randomnessChapter} from './randomnessChapter';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {SimulationGraph} from '../../graphs/random/SimulationGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- exact values, by BigInt sums -------------------------------------------------------------------------------------------------------

/** Binomial coefficients C(n, k0) ... C(n, k1) by the exact recurrence C(n, k + 1) = C(n, k) (n - k) / (k + 1). */
function binomialRun(n: number, k0: number, k1: number): bigint[] {
    let c = 1n;
    for (let i = 0; i < k0; i += 1) c = (c * BigInt(n - i)) / BigInt(i + 1);
    const run: bigint[] = [];
    for (let k = k0; k <= k1; k += 1) {
        run.push(c);
        c = (c * BigInt(n - k)) / BigInt(k + 1);
    }
    return run;
}
const ratio = (numerator: bigint, denominator: bigint): number => Number((numerator * 10n ** 18n) / denominator) / 1e18;
/** P(heads = k) for a fair coin, or the Galton slot k with p = 1/2. */
const halfMass = (n: number, k: number) => ratio(binomialRun(n, k, k)[0], 1n << BigInt(n));
/** The Galton slot k with n rows and chance p (floating point, as the quoted decimals are). */
const mass = (n: number, k: number, p: number) => (p === 0.5 ? halfMass(n, k) : Number(binomialRun(n, k, k)[0]) * Math.pow(p, k) * Math.pow(1 - p, n - k));
/** P(|2H - n| <= w) for n tosses. */
function coverage(n: number, w: number): number {
    const k0 = Math.ceil((n - w) / 2);
    const k1 = Math.floor((n + w) / 2);
    return ratio(binomialRun(n, k0, k1).reduce((a, b) => a + b, 0n), 1n << BigInt(n));
}
/** The smallest w of the parity of n with coverage at least 95 %, decided exactly: 20 sum >= 19 2^n. */
function bandWidth(n: number): number {
    for (let w = n % 2; w <= n; w += 2) {
        const k0 = Math.ceil((n - w) / 2);
        const sum = binomialRun(n, k0, Math.floor((n + w) / 2)).reduce((a, b) => a + b, 0n);
        if (20n * sum >= 19n * (1n << BigInt(n))) return w;
    }
    return n;
}
/** P(|H - n/2| >= t) for an even n. */
const tail = (n: number, t: number) => 1 - coverage(n, 2 * t - 2);

// ---- number formats ---------------------------------------------------------------------------------------------------------------------

const MINUS = '−';
/** A readout number: up to `digits` decimals, no trailing zeros, decimal comma, true minus sign. */
const readoutNumber = (value: number, digits: number): string => Number(value.toFixed(digits)).toString().replace('-', MINUS).replace('.', ',');
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
function proseNumber(value: number, digits: number, language: 'sl' | 'en'): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
/** Prose with the LaTeX spacing and the decimal-comma braces removed, so that `0{,}25\,\%` reads 0,25 %. */
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));
/** Every number with decimals in an English text (the decimal point is the only separator there). */
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);

interface Quote { readonly value: number; readonly digits: number }
const q = (value: number, digits: number): Quote => ({value, digits});
const int = (value: number) => q(value, 0);
const list = (values: readonly number[], digits: number): Quote[] => values.map(value => q(value, digits));
const listText = (quotes: readonly Quote[], language: 'sl' | 'en') => quotes.map(quote => proseNumber(quote.value, quote.digits, language)).join('; ');

// ---- the pinned tallies (one run each, seed 42 unless named; slots 0 ... 10 of 10 rows) ---------------------------------------------------

const TALLY_1 = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const TALLY_10 = [0, 1, 0, 3, 0, 3, 1, 2, 0, 0, 0];
const TALLY_100 = [0, 1, 2, 12, 27, 25, 18, 11, 2, 2, 0];
const TALLY_1000 = [0, 12, 38, 118, 218, 229, 207, 125, 42, 11, 0];
const TALLY_1000_SEED_43 = [1, 12, 49, 126, 220, 241, 211, 97, 33, 10, 0];
const TALLY_1000_P30 = [31, 121, 223, 273, 206, 104, 28, 14, 0, 0, 0];
const TALLY_100000 = [102, 1009, 4439, 11765, 20395, 24547, 20586, 11636, 4422, 1003, 96];
/** Heads of the seeds in 10, 100, 1000 and 10000 tosses (the run of a seed is a prefix of its longer run). */
const HEADS: Record<number, Record<number, number>> = {
    42: {10: 1, 100: 45, 1000: 493, 10000: 5011},
    43: {10: 3, 100: 53, 1000: 462, 10000: 4872},
    7: {10000: 5037},
};

// ---- rows of the Galton board and the coin ----------------------------------------------------------------------------------------------

interface Expected {
    readonly state: Readonly<Record<string, unknown>>;
    readonly rows: Record<string, string>;
    readonly status: string;
    /** Numbers the step's expected-state text quotes (each must be in that text in both languages). */
    readonly quotes: readonly Quote[];
    /** Numbers quoted by the step's explanation, observations or worked example but not by its expected-state text. */
    readonly also?: readonly Quote[];
    /** Lists quoted by the expected-state text (joined by "; "), and lists quoted elsewhere in the step. */
    readonly stateLists?: readonly (readonly Quote[])[];
    readonly textLists?: readonly (readonly Quote[])[];
}

interface GaltonRun { readonly counts: readonly number[]; readonly shown: number; readonly p: number }
/** The readouts of the Galton board, recomputed from a tally and the exact masses. */
function galtonRows(run: GaltonRun) {
    const rowsN = run.counts.length - 1;
    expect(run.counts.reduce((a, b) => a + b, 0)).toBe(run.shown);
    const masses = run.counts.map((_, k) => mass(rowsN, k, run.p));
    const top = masses.indexOf(Math.max(...masses));
    const largest = Math.max(...run.counts.map((count, k) => Math.abs(count / run.shown - masses[k])));
    const sd = Math.sqrt(masses[top] * (1 - masses[top]) / run.shown);
    return {
        top, masses, largest, share: run.counts[top] / run.shown, sd,
        rows: {
            counts: run.counts.join('; '),
            expected: masses.map(m => readoutNumber(m * run.shown, 1)).join('; '),
            largest: readoutNumber(largest, 4),
            middle: `delež ${readoutNumber(run.counts[top] / run.shown, 4)}, po zakonu ${readoutNumber(masses[top], 4)}, običajno odstopanje ± ${readoutNumber(sd, 4)}`,
        },
    };
}
const galtonStep = (state: Record<string, unknown>, run: GaltonRun, quotes: readonly Quote[], also: readonly Quote[] = [], stateLists: readonly (readonly Quote[])[] = [], textLists: readonly (readonly Quote[])[] = []): Expected => {
    const g = galtonRows(run);
    return {
        state: {mode: 'galton', n: 1000, shown: run.shown, seed: 42, rows: 10, pPercent: 50, overlay: 0, ...state},
        rows: {shown: `${run.shown} od ${state.n ?? 1000}`, seed: String(state.seed ?? 42), ...g.rows},
        status: `Kroglic ${run.shown} od ${state.n ?? 1000}. Največji razmik med deležem in zakonom: ${readoutNumber(g.largest, 4)}.`,
        quotes, also, stateLists, textLists,
    };
};

interface CoinRun { readonly n: number; readonly seed: number; readonly second?: number }
/** The readouts of the fair coin: the heads of a seed are pinned, the frequency, the heads above half, the exact band and the typical deviation are recomputed. */
function coinRows(run: CoinRun) {
    const h = HEADS[run.seed][run.n];
    const w = bandWidth(run.n);
    const d = h - run.n / 2;
    const f = h / run.n;
    return {
        h, w, d, f,
        rows: {
            shown: `${run.n} od ${run.n}`, seed: String(run.seed), heads: `${h} od ${run.n}`, frequency: readoutNumber(f, 4),
            band: `od ${run.n / 2 - w / 2} do ${run.n / 2 + w / 2} (± ${w / 2})`, typical: `± ${readoutNumber(0.5 / Math.sqrt(run.n), 4)}`,
            ...(run.second !== undefined ? {seed2: `${HEADS[run.second][run.n]} od ${run.n}`} : {}),
        } as Record<string, string>,
        status: `Metov ${run.n} od ${run.n}, grbov ${h}, relativna frekvenca ${readoutNumber(f, 4)}, grbov več kot pol metov ${readoutNumber(d, 0)}.`,
    };
}
const coinStep = (run: CoinRun, quotes: readonly Quote[], also: readonly Quote[] = []): Expected => {
    const c = coinRows(run);
    return {
        state: {mode: 'frequency', n: run.n, shown: run.n, seed: run.seed, overlay: run.second !== undefined ? 1 : 0, ...(run.second !== undefined ? {seed2: run.second} : {})},
        rows: c.rows, status: c.status, quotes, also,
    };
};

/** The quotes the readouts of a coin run give (heads, frequency, heads above half, band ends, half width). */
function coinQuotes(run: CoinRun): Quote[] {
    const c = coinRows(run);
    return [int(c.h), q(c.f, 4), int(c.d), int(run.n / 2 - c.w / 2), int(run.n / 2 + c.w / 2)];
}

// ---- the expected values of each step ---------------------------------------------------------------------------------------------------

const g100 = galtonRows({counts: TALLY_100, shown: 100, p: 0.5});
const g1000 = galtonRows({counts: TALLY_1000, shown: 1000, p: 0.5});
const g1000b = galtonRows({counts: TALLY_1000_SEED_43, shown: 1000, p: 0.5});
const g10 = galtonRows({counts: TALLY_10, shown: 10, p: 0.5});
const g1000p = galtonRows({counts: TALLY_1000_P30, shown: 1000, p: 0.3});
const g100000 = galtonRows({counts: TALLY_100000, shown: 100000, p: 0.5});
const P5 = halfMass(10, 5);
/** One ball: the largest gap is the whole ball against the mass of its slot. */
const oneBallGap = 1 - halfMass(10, 1);

const RS1: Record<string, Expected> = {
    'rs1-one-ball': galtonStep({shown: 1}, {counts: TALLY_1, shown: 1, p: 0.5}, [], [q(halfMass(10, 1), 4)]),
    'rs1-ten-balls': galtonStep({shown: 10}, {counts: TALLY_10, shown: 10, p: 0.5}, [q(g10.largest, 4)], [q(g10.masses[4] * 10, 1)], [list(TALLY_10, 0)]),
    'rs1-bars': galtonStep({shown: 100}, {counts: TALLY_100, shown: 100, p: 0.5}, [q(g100.largest, 4)],
        [q(g100.share, 2), q(P5, 8), q(P5, 4)], [list(TALLY_100, 0)], [list(g100.masses.map(m => m * 100), 1)]),
    'rs1-thousand': galtonStep({}, {counts: TALLY_1000, shown: 1000, p: 0.5}, [q(g1000.share, 3), q(P5, 4), q(g1000.sd, 4), q(g1000.largest, 4)],
        [q(g1000.masses[5] * 1000, 1), q(g1000.largest / g1000.sd, 1), q(g100.largest, 4), q(0.0079, 4), q(0.0011, 4)], [list(TALLY_1000, 0)]),
    'rs1-seed': galtonStep({seed: 43}, {counts: TALLY_1000_SEED_43, shown: 1000, p: 0.5}, [q(g1000b.share, 3), q(g1000b.largest, 4)], [], [list(TALLY_1000_SEED_43, 0)]),
    'rs1-p': galtonStep({pPercent: 30}, {counts: TALLY_1000_P30, shown: 1000, p: 0.3}, [q(g1000p.share, 3), q(g1000p.masses[3], 4), q(g1000p.largest, 4)],
        [q(mass(10, 3, 0.35), 4), q(mass(10, 7, 0.7), 4), q(0.258, 3), q(0.266, 3)], [list(TALLY_1000_P30, 0)], [list(g1000p.masses.map(m => m * 1000), 1)]),
    'rs1-explore': galtonStep({n: 100000, shown: 100000}, {counts: TALLY_100000, shown: 100000, p: 0.5}, [q(g100000.largest, 4)],
        [q(g100000.share, 4), q(P5, 4)], [list(TALLY_100000, 0)]),
};

const RS2: Record<string, Expected> = {
    'rs2-ten': coinStep({n: 10, seed: 42}, coinQuotes({n: 10, seed: 42})),
    'rs2-hundred': coinStep({n: 100, seed: 42}, [...coinQuotes({n: 100, seed: 42}), q(0.5 / 10, 2)], [int(bandWidth(100) / 2), q(bandWidth(100) / 2 / 100, 1), q(tail(100, 10), 4), int(1 / tail(100, 10))]),
    'rs2-thousand': coinStep({n: 1000, seed: 42}, [...coinQuotes({n: 1000, seed: 42}), q(0.5 / Math.sqrt(1000), 4)],
        [int(bandWidth(1000) / 2), q(tail(1000, 100) * 1e10, 1), q(bandWidth(1000) / 2 / 1000, 3), q(bandWidth(100) / 2 / 100, 1), q(bandWidth(10) / 2 / 10, 1)]),
    'rs2-count': coinStep({n: 10000, seed: 42}, [...coinQuotes({n: 10000, seed: 42}), q(0.5 / 100, 3)],
        [...[10, 100, 1000, 10000].map(n => int(bandWidth(n) / 2)), int(Math.sqrt(10000) / 2), int(Math.sqrt(100) / 2), q(0.5 / 10, 2), ...coinQuotes({n: 10000, seed: 7}), ...coinQuotes({n: 10000, seed: 43})]),
    'rs2-seeds': coinStep({n: 10000, seed: 42, second: 43}, [int(5011), int(4872), int(4902), int(5098)],
        [q(5011 / 10000, 4), q(4872 / 10000, 4), int(HEADS[42][10]), int(HEADS[43][10]), int(98), int(Math.abs(4872 - 5000))]),
    'rs2-explore': coinStep({n: 10000, seed: 7}, coinQuotes({n: 10000, seed: 7})),
};

const lessons = [
    ['RS1', randomnessGaltonLesson, RS1, 'galton-board', 7],
    ['RS2', randomnessLargeNumbersLesson, RS2, 'law-of-large-numbers', 6],
] as const;

/** Decimals that name an input, a rate or a fixed mass of the law rather than a readout (English spelling). */
const NEUTRAL: Record<string, string[]> = {
    RS1: ['0.3', '0.7', '0.5', '0.35'],
    RS2: ['0.5', '0.95', '0.03', '0.3'],
};

describe.each(lessons)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('randomness')!.lesson(section)!;
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
                for (const items of expected.stateLists ?? []) {
                    const value = listText(items, language);
                    expect({id: step.id, language, value, inState: hasNumber(state, value)}).toEqual({id: step.id, language, value, inState: true});
                }
                for (const items of [...(expected.stateLists ?? []), ...(expected.textLists ?? [])]) {
                    const value = listText(items, language);
                    expect({id: step.id, language, value, inText: hasNumber(everything, value)}).toEqual({id: step.id, language, value, inText: true});
                }
                if (language === 'sl') {
                    const slTexts = [step.title.sl, step.purpose.sl, step.explanation.sl, step.observationPrompt.sl, state, ...step.expectedObservations.map(o => o.sl), ...calculations.filter((_, i) => i % 2 === 0)];
                    expect({id: step.id, english: slTexts.flatMap(decimalsIn)}).toEqual({id: step.id, english: []});
                }
            }
            const quoted = [...expected.quotes, ...(expected.also ?? []), ...(expected.stateLists ?? []).flat(), ...(expected.textLists ?? []).flat()];
            const allowed = new Set(quoted.map(quote => proseNumber(Math.abs(quote.value), quote.digits, 'en')).concat(NEUTRAL[name]));
            const texts = [step.title.en, step.purpose.en, step.explanation.en, step.observationPrompt.en, step.scene!.expectedState.en, ...step.expectedObservations.map(o => o.en), ...calculations, ...formulas];
            expect({id: step.id, unaccounted: texts.flatMap(decimalsIn).filter(value => !allowed.has(value))}).toEqual({id: step.id, unaccounted: []});
        }
    });
});

// ---- the graph --------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const status = () => document.querySelector('[data-random-status]')?.textContent ?? null;

function mountSimulation() {
    const graph = createGraph('prob-simulation');
    if (!(graph instanceof SimulationGraph)) throw new Error('prob-simulation must be the simulation graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const actionsOf = (lesson: GuidedLesson, stepId: string) => sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!);
    /** The scene's actions in one synchronous `act` from the restored checkpoint, `times` times in a row. */
    const scene = (lesson: GuidedLesson, stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of actionsOf(lesson, stepId)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
type RunAction = Extract<LessonAction, {kind: 'random'; operation: 'set-run'}>;
const setRun = (fields: Omit<RunAction, 'kind' | 'operation'>): LessonAction => ({kind: 'random', operation: 'set-run', ...fields});
const setPosition = (shown: number): LessonAction => ({kind: 'random', operation: 'set-position', shown});

function expectRows(id: string, rows: Record<string, string>, prefixRows: readonly string[] = []) {
    for (const [row, text] of Object.entries(rows)) {
        const actual = stripped(readout(row));
        if (prefixRows.includes(row)) expect({id, row, text: actual.startsWith(stripped(text))}).toEqual({id, row, text: true});
        else expect({id, row, text: actual}).toEqual({id, row, text: stripped(text)});
    }
}

function checkScenes(lesson: GuidedLesson, scenes: Record<string, Expected>) {
    const m = mountSimulation();
    try {
        const ids = Object.keys(scenes);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = scenes[id];
            m.scene(lesson, id, 2);
            const state = m.graph.state as unknown as Record<string, unknown>;
            expect({id, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, state[key]]))}).toEqual({id, ...expected.state});
            expectRows(id, expected.rows);
            expect({id, status: status()}).toEqual({id, status: expected.status});
        }
        m.restore();
        expect(JSON.stringify(m.graph.state)).toBe(m.free);
    } finally {
        m.mounted.view.unmount();
    }
}

test('RS1: every scene lands in the stated state, readouts and status, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(randomnessGaltonLesson, RS1);
});

test('RS2: every scene lands in the stated state, readouts and status, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(randomnessLargeNumbersLesson, RS2);
});

/** Runs the learner's changes after a scene and checks the readouts against values recomputed from the tally and the exact law. */
function learnerChanges(lesson: GuidedLesson, stepId: string, changes: readonly {actions: LessonAction[]; rows: Record<string, string>; prefix?: readonly string[]}[]) {
    const m = mountSimulation();
    try {
        m.scene(lesson, stepId);
        for (const change of changes) {
            m.learner(...change.actions);
            expectRows(stepId, change.rows, change.prefix);
        }
    } finally {
        m.mounted.view.unmount();
    }
}

test('RS1: the balls, counts, seeds and percents the text asks for give the tallies, gaps and shares it quotes', () => {
    const only = (run: GaltonRun, ...ids: string[]) => Object.fromEntries(Object.entries(galtonRows(run).rows).filter(([id]) => ids.includes(id)));
    const all = (run: GaltonRun) => galtonRows(run).rows;
    learnerChanges(randomnessGaltonLesson, 'rs1-one-ball', [{actions: [setPosition(0), setPosition(1)], rows: {...all({counts: TALLY_1, shown: 1, p: 0.5}), largest: readoutNumber(oneBallGap, 4)}}]);
    learnerChanges(randomnessGaltonLesson, 'rs1-ten-balls', [{actions: [setPosition(2), setPosition(5), setPosition(10)], rows: all({counts: TALLY_10, shown: 10, p: 0.5})}]);
    learnerChanges(randomnessGaltonLesson, 'rs1-thousand', [
        {actions: [setRun({n: 100})], rows: all({counts: TALLY_100, shown: 100, p: 0.5})},
        {actions: [setRun({n: 10000})], rows: {largest: '0,0079'}},
        {actions: [setRun({n: 100000})], rows: all({counts: TALLY_100000, shown: 100000, p: 0.5})},
        {actions: [setRun({n: 1000})], rows: all({counts: TALLY_1000, shown: 1000, p: 0.5})},
    ]);
    learnerChanges(randomnessGaltonLesson, 'rs1-seed', [
        {actions: [setPosition(0), setPosition(1000)], rows: all({counts: TALLY_1000_SEED_43, shown: 1000, p: 0.5})},
        {actions: [setRun({seed: 42})], rows: all({counts: TALLY_1000, shown: 1000, p: 0.5})},
    ]);
    // the percents the text suggests: the tallies are read from the graph, the law values are exact (shares are checked against the quoted ones)
    learnerChanges(randomnessGaltonLesson, 'rs1-p', [
        {actions: [setRun({pPercent: 35})], rows: {middle: `delež 0,258, po zakonu ${readoutNumber(mass(10, 3, 0.35), 4)}`}, prefix: ['middle']},
        {actions: [setRun({pPercent: 70})], rows: {middle: `delež 0,266, po zakonu ${readoutNumber(mass(10, 7, 0.7), 4)}`}, prefix: ['middle']},
    ]);
    learnerChanges(randomnessGaltonLesson, 'rs1-explore', [{actions: [setRun({n: 100000})], rows: only({counts: TALLY_100000, shown: 100000, p: 0.5}, 'counts', 'largest', 'middle')}]);
});

test('RS2: the tosses and seeds the text asks for give the heads, frequencies, bands and second runs it quotes', () => {
    const rows = (run: CoinRun) => coinRows(run).rows;
    learnerChanges(randomnessLargeNumbersLesson, 'rs2-thousand', [10, 100, 1000].map(n => ({actions: [setRun({n})], rows: rows({n, seed: 42})})));
    learnerChanges(randomnessLargeNumbersLesson, 'rs2-count', [
        {actions: [setRun({seed: 7})], rows: rows({n: 10000, seed: 7})},
        {actions: [setRun({seed: 43})], rows: rows({n: 10000, seed: 43})},
    ]);
    // the second run, read as the text asks (the row Seed 43) at each number of tosses, then another second seed replaces it
    learnerChanges(randomnessLargeNumbersLesson, 'rs2-seeds', [
        ...[10, 100, 1000, 10000].map(n => ({actions: [setRun({n})], rows: rows({n, seed: 42, second: 43})})),
        {actions: [{kind: 'random', operation: 'set-overlay', overlay: true, seed2: 7} as const, setRun({n: 10000})], rows: rows({n: 10000, seed: 42, second: 7})},
    ]);
});

// ---- exact values and statements of the text --------------------------------------------------------------------------------------------

test('the exact values the text quotes: masses, bands, tails, coverage', () => {
    expect(P5).toBe(252 / 1024);
    expect(halfMass(10, 1)).toBeCloseTo(10 / 1024, 15);
    expect(mass(10, 3, 0.3)).toBeCloseTo(0.2668279319999998, 12);
    expect(mass(10, 3, 0.35)).toBeCloseTo(0.25221962497265626, 12);
    expect(mass(10, 7, 0.7)).toBeCloseTo(0.266827932, 12);
    expect([10, 100, 1000, 10000].map(bandWidth)).toEqual([6, 20, 62, 196]);
    expect(tail(100, 10)).toBeCloseTo(0.05688793364098078, 12);
    expect(tail(1000, 100)).toBeCloseTo(2.7284641560660173e-10, 14);
    expect(tail(1000, 100).toExponential(1)).toBe('2.7e-10');
    expect(1 / tail(100, 10)).toBeGreaterThan(17.5);
    expect(1 / tail(100, 10)).toBeLessThan(18);
    // the bands: coverage at least 95 %, the next smaller width below 95 %, and always above 95 % where the width of the same parity is the smallest
    const coverages = [10, 100, 1000, 10000].map(n => coverage(n, bandWidth(n)));
    expect(coverages.map(c => Number(c.toFixed(4)))).toEqual([0.9785, 0.9648, 0.9537, 0.9512]);
    for (const n of [10, 100, 1000, 10000]) {
        expect(coverage(n, bandWidth(n))).toBeGreaterThanOrEqual(0.95);
        expect(coverage(n, bandWidth(n) - 2)).toBeLessThan(0.95);
        // "at most about one run in twenty ends outside the band"
        expect(1 - coverage(n, bandWidth(n))).toBeLessThanOrEqual(0.05);
    }
    // the band in heads is about twice sqrt(n)/2 = the standard deviation sqrt(n)/2 times 1.96
    for (const n of [100, 1000, 10000]) expect(bandWidth(n) / 2 / (Math.sqrt(n) / 2)).toBeCloseTo(1.96, 1);
    // the typical deviation of the share of the slot 5 with 1000 balls and of the frequency with 10, 100 and 10000 tosses
    expect(Math.sqrt(P5 * (1 - P5) / 1000)).toBeCloseTo(0.0136, 4);
    expect([10, 100, 10000].map(n => Number((0.5 / Math.sqrt(n)).toFixed(4)))).toEqual([0.1581, 0.05, 0.005]);
    // the heads above half: its typical size sqrt(n)/2 grows 5 -> 50, the frequency deviation shrinks 0.05 -> 0.005
    expect([Math.sqrt(100) / 2, Math.sqrt(10000) / 2]).toEqual([5, 50]);
});

test('the quoted tallies are consistent: the heads of a seed give the frequency and the heads above half the text quotes', () => {
    expect(HEADS[42][10000] - 5000).toBe(11);
    expect(HEADS[43][10000] - 5000).toBe(-128);
    expect(Math.abs(HEADS[43][10000] - 5000)).toBeGreaterThan(bandWidth(10000) / 2);
    expect(Math.abs(HEADS[42][10000] - 5000)).toBeLessThanOrEqual(bandWidth(10000) / 2);
    expect(g1000.share - P5).toBeCloseTo(-0.0171, 3);
    expect(Math.abs(g1000.share - P5)).toBeCloseTo(g1000.largest, 3);
});

// ---- the chapter prose ------------------------------------------------------------------------------------------------------------------

test('the chapter prose quotes only numbers that are exact values or readouts of the scenes it points to, in both languages', () => {
    const sections = Object.fromEntries(randomnessChapter.sections.map(section => [section.id, section.paragraphs]));
    const galton = sections['galton-board'];
    const large = sections['law-of-large-numbers'];
    const examples = {galton: galton[2], large: large[2]};
    const c1000 = coinRows({n: 1000, seed: 42});
    const c10000 = coinRows({n: 10000, seed: 42});
    const c43 = coinRows({n: 10000, seed: 43});
    const quotes: Record<'galton' | 'large', Quote[]> = {
        galton: [q(P5, 4), int(252), int(1024), q(g1000.share, 3), q(g1000.largest, 4), q(g1000.sd, 4), int(42), int(10)],
        large: [int(c1000.h), q(c1000.f, 3), int(c1000.d), int(1000 / 2 - c1000.w / 2), int(1000 / 2 + c1000.w / 2),
            int(c10000.h), q(c10000.f, 4), int(c10000.d), int(10000 / 2 - c10000.w / 2), int(10000 / 2 + c10000.w / 2), int(c43.h), int(Math.abs(c43.d)), int(43)],
    };
    for (const key of ['galton', 'large'] as const) {
        for (const language of ['sl', 'en'] as const) {
            const text = examples[key][language];
            for (const quote of quotes[key]) {
                const value = proseNumber(quote.value, quote.digits, language);
                expect({key, language, value, inText: hasNumber(text, value)}).toEqual({key, language, value, inText: true});
            }
        }
        const allowed = new Set(quotes[key].map(quote => proseNumber(Math.abs(quote.value), quote.digits, 'en')).concat(['0.5']));
        expect({key, unaccounted: decimalsIn(examples[key].en).filter(value => !allowed.has(value))}).toEqual({key, unaccounted: []});
        expect({key, english: decimalsIn(examples[key].sl)}).toEqual({key, english: []});
    }
    // every other paragraph of the chapter quotes no decimals except the exact bar ones, and only in the right language
    for (const paragraph of [...galton, ...large]) {
        expect(decimalsIn(paragraph.sl)).toEqual([]);
        expect(decimalsIn(paragraph.en).filter(value => !['0.5', '0.95', '0.1', '0.2461', '0.229', '0.0171', '0.0136', '0.493', '0.5011'].includes(value))).toEqual([]);
    }
    // the coverage statements: "at least 95 %" in the definition and "at most about one run in twenty" in the example
    expect(large[0].sl).toContain('vsaj \\(95\\,\\%\\)');
    expect(large[0].en).toContain('at least \\(95\\,\\%\\)');
    expect(large[2].sl).toContain('največ približno vsaki dvajseti');
    expect(large[2].en).toContain('at most about one run in twenty');
});

test('the lessons say at most about one run in twenty and gloss the seed at its first use', () => {
    for (const language of ['sl', 'en'] as const) {
        const rs2 = randomnessLargeNumbersLesson;
        const seeds = rs2.steps.find(step => step.id === 'rs2-seeds')!.explanation[language];
        expect(seeds).toContain(language === 'sl' ? 'največ približno \\(1\\) od \\(20\\) zagonov' : 'at most about \\(1\\) run in \\(20\\)');
        expect(seeds).not.toMatch(language === 'sl' ? /tretjega|največ dve semeni/ : /third|at most two seeds/);
        expect(rs2.learningGoals.map(goal => goal[language]).join(' ')).toContain(language === 'sl' ? 'največ približno enem od dvajsetih' : 'at most about one run in twenty');
        const gloss = language === 'sl' ? 'seme generatorja je število, ki določi celoten naključni potek' : 'the generator seed is a number that fixes the whole random course';
        expect(randomnessGaltonLesson.steps[0].explanation[language]).toContain(gloss);
        expect(rs2.steps[0].explanation[language]).toContain(gloss);
    }
});
