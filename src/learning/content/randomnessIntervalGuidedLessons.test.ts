/**
 * RS6 (randomness, batch C): the confidence interval lesson, tested on the real simulation graph in sl and en.
 * Part A: every step opening lands in the stated state, readouts and status line (applied out of order and twice in one synchronous act, restore on leaving returns the
 * free state); the labels and buttons the prompts name exist in the graph; no opening is already the state its prompt asks the learner to produce; the edits and
 * playback presses the prompts ask for give the readouts the text quotes; a predicting step does not render the answer it asks for.
 * The expected readouts are recomputed here from the kernel (`runIntervals`, `intervalCoverage`), not read from the graph.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {rs6Lesson} from './randomnessIntervalGuidedLessons';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, puckControl, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {SimulationGraph} from '../../graphs/random/SimulationGraph';
import {setLanguage, t} from '../../localization';
import {formatNumber, withDecimalSeparator} from '../../analysis/format';
import {enterNumber} from '../../inputs/testEntry';
import {puckKeyOf, typeControl} from '../../graphs/random/simulationTestPucks';
import {intervalCoverage, missCountLaw} from '../../random/exact';
import {SAMPLE_SIZE_MIN} from '../../random/randomModel';
import {intervalCoverLimit, runIntervals} from '../../random/runners';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- the expected readouts, recomputed from the kernel ------------------------------------------------------------------------------------

interface Run { readonly seed: number; readonly sample: number; readonly n: number; readonly shown: number }
const DEFAULT_RUN: Run = {seed: 42, sample: 36, n: 100, shown: 100};

/** The intervals of the first `shown` that miss, from the kernel runner (a prefix of the run is the run of that length). */
function missesOf(run: Run): number {
    return runIntervals(run.seed, run.shown, run.sample, new Uint8Array(Math.max(run.shown, 1))).misses;
}
const fmt = (value: number, language: Language, digits: number) => formatNumber(value, language, digits);
const percent = (fraction: number, language: Language) => `${fmt(fraction * 100, language, 2)} %`;
const coverageOf = (sample: number) => intervalCoverage(99, sample, 1.96);
const halfWidthOf = (sample: number) => 1.96 * Math.sqrt((100 * 100 - 1) / 12 / sample);

/** The readouts and the status line of a run, in the given language. */
function expectedOf(run: Run, language: Language) {
    const misses = missesOf(run);
    const coverage = coverageOf(run.sample);
    const miss = 1 - coverage;
    return {
        rows: {
            shown: language === 'sl' ? `${run.shown} od ${run.n}` : `${run.shown} of ${run.n}`,
            seed: String(run.seed),
            misses: language === 'sl' ? `${misses} od ${run.shown}` : `${misses} of ${run.shown}`,
            'miss-share': percent(run.shown > 0 ? misses / run.shown : 0, language),
            'exact-miss': percent(miss, language),
            'exact-coverage': withDecimalSeparator(coverage.toFixed(5), language),
            expected: `${fmt(miss * run.shown, language, 1)} ± ${fmt(Math.sqrt(run.shown * miss * (1 - miss)), language, 1)}`,
            'half-width': fmt(halfWidthOf(run.sample), language, 4),
        } as Record<string, string>,
        status: language === 'sl' ? `Intervalov ${run.shown} od ${run.n}, zgrešenih ${misses}.` : `Intervals ${run.shown} of ${run.n}, missed ${misses}.`,
    };
}

const stateOfRun = (run: Run) => ({mode: 'interval', seed: run.seed, n: run.n, shown: run.shown, sampleSize: run.sample});

// ---- the graph ---------------------------------------------------------------------------------------------------------------------------

const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent ?? null;
const status = () => document.querySelector('[data-random-status]')?.textContent ?? null;
const notes = () => [...document.querySelectorAll('[data-random-note]')].map(node => node.textContent);

function mountSimulation() {
    const graph = createGraph('prob-simulation');
    if (!(graph instanceof SimulationGraph)) throw new Error('prob-simulation must be the simulation graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const stepOf = (lesson: GuidedLesson, stepId: string) => lesson.steps.find(step => step.id === stepId)!;
    /** The scene's actions in one synchronous `act` from the restored checkpoint, `times` times in a row. */
    const scene = (lesson: GuidedLesson, stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of sceneActions(stepOf(lesson, stepId).scene!)) capabilities.apply(action);
    });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, scene, restore, free};
}

/** The typed field of a control: a slider's exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const type = (label: string, value: string) => typeControl(label, value, (name, text) => act(() => { enterNumber(field(name), text); }));
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const typeN = (value: number) => type(t('random_graph_n_interval'), String(value));
const typeSeed = (value: number) => type(t('random_graph_seed_label'), String(value));
const typeSample = (value: number) => type(t('random_graph_sample_label'), String(value));

/** Checks the state, readouts, status line and the absence of notes against the kernel values of `run`. */
function expectRun(id: string, graph: SimulationGraph, run: Run, language: Language) {
    const expected = expectedOf(run, language);
    const state = graph.state as unknown as Record<string, unknown>;
    const wanted = stateOfRun(run);
    expect({id, ...Object.fromEntries(Object.keys(wanted).map(key => [key, state[key]]))}).toEqual({id, ...wanted});
    for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
    expect({id, status: status()}).toEqual({id, status: expected.status});
    expect({id, notes: notes()}).toEqual({id, notes: []});
}

// ---- the openings ------------------------------------------------------------------------------------------------------------------------

const D = DEFAULT_RUN;
const OPENINGS: Record<string, Run> = {
    'rs6-one-interval-scene': {...D, n: 1, shown: 0},
    'rs6-twenty-scene': {...D, n: 20, shown: 0},
    'rs6-hundred-scene': {...D, n: 100, shown: 0},
    'rs6-long-scene': D,
    'rs6-sample-size-scene': {...D, n: 10000, shown: 10000},
    'rs6-explore-scene': {...D, seed: 7, sample: 25},
};
const stepOfScene = (sceneId: string) => rs6Lesson.steps.find(step => step.scene!.id === sceneId)!;

test('RS6: every opening lands in the stated state, readouts and status in sl and en, in one synchronous act out of order and twice; leaving restores the free state', () => {
    for (const language of LANGUAGES) {
        setLanguage(language);
        const m = mountSimulation();
        try {
            const ids = Object.keys(OPENINGS);
            expect(rs6Lesson.steps.map(step => step.scene!.id)).toEqual(ids);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                m.scene(rs6Lesson, stepOfScene(id).id, 2);
                expectRun(`${language}/${id}`, m.graph, OPENINGS[id], language);
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    }
});

// ---- labels and buttons the prompts name -------------------------------------------------------------------------------------------------

/** The label keys each prompt must name, and the buttons it presses. */
const PROMPT_LABELS: Record<string, readonly string[]> = {
    'rs6-one-interval': ['next_step', 'random_graph_cap_miss', 'random_graph_r_misses'],
    'rs6-twenty': ['play', 'next_step', 'random_graph_r_misses', 'random_graph_r_expected_misses', 'random_graph_seed_label'],
    'rs6-hundred': ['play', 'next_step', 'random_graph_r_expected_misses', 'random_graph_cap_miss_law', 'random_graph_cap_miss_run'],
    'rs6-long': ['random_name_intervals', 'random_graph_r_miss_share', 'random_graph_r_exact_miss', 'random_graph_r_expected_misses'],
    'rs6-sample-size': ['random_graph_sample_label', 'random_graph_r_half_width', 'random_graph_r_exact_coverage', 'random_graph_r_exact_miss', 'random_graph_r_miss_share'],
    'rs6-explore': ['random_graph_seed_label', 'random_graph_sample_label', 'random_name_intervals', 'random_graph_r_misses', 'random_graph_r_half_width', 'random_graph_r_exact_miss'],
};
/** The labels the explanations name (readouts and captions of the graph the learner looks at). */
const EXPLANATION_LABELS: Record<string, readonly string[]> = {
    'rs6-one-interval': ['random_graph_cap_mean', 'random_graph_cap_miss', 'random_graph_r_half_width', 'random_graph_r_exact_coverage', 'random_graph_r_exact_miss'],
    'rs6-twenty': ['random_graph_r_exact_coverage', 'random_graph_r_exact_miss', 'random_graph_r_expected_misses'],
    'rs6-hundred': ['random_graph_cap_miss_run'],
    'rs6-long': ['random_graph_r_miss_share', 'random_graph_r_exact_miss'],
};
/** The catalog text of a label; a caption is quoted without its parenthesis or colon tail. */
const labelText = (key: string) => {
    const text = t(key as 'next_step');
    return key === 'random_graph_cap_miss_law' ? text.split(' (')[0] : key === 'random_graph_cap_miss_run' ? text.split(':')[0] : text;
};

test('RS6: every control, button and readout label a prompt or explanation names is a string of the graph and of the mounted controls, in sl and en', () => {
    for (const language of LANGUAGES) {
        setLanguage(language);
        const m = mountSimulation();
        try {
            m.scene(rs6Lesson, 'rs6-one-interval');
            for (const step of rs6Lesson.steps) {
                for (const [labels, text] of [[PROMPT_LABELS[step.id], step.observationPrompt[language]], [EXPLANATION_LABELS[step.id] ?? [], step.explanation[language]]] as const) {
                    for (const key of labels) {
                        const label = labelText(key);
                        expect({language, key, defined: label !== key && label.length > 0}).toEqual({language, key, defined: true});
                        expect({language, step: step.id, label, named: text.includes(label)}).toEqual({language, step: step.id, label, named: true});
                    }
                }
            }
            for (const key of ['random_graph_n_interval', 'random_graph_seed_label', 'random_graph_sample_label'] as const) {
                expect({language, key, present: puckControl(puckKeyOf(t(key))!) !== null}).toEqual({language, key, present: true});
            }
            for (const key of ['play', 'next_step', 'replay'] as const) expect(screen.getByRole('button', {name: t(key)})).toBeTruthy();
            for (const [id, key] of [['misses', 'random_graph_r_misses'], ['miss-share', 'random_graph_r_miss_share'], ['exact-miss', 'random_graph_r_exact_miss'],
                ['exact-coverage', 'random_graph_r_exact_coverage'], ['expected', 'random_graph_r_expected_misses'], ['half-width', 'random_graph_r_half_width'],
                ['shown', 'random_graph_r_shown']] as const) {
                expect({language, id, label: readoutLabel(id)}).toEqual({language, id, label: t(key)});
            }
        } finally {
            m.mounted.view.unmount();
        }
    }
});

// ---- the opening is not the state the prompt asks the learner to produce ----------------------------------------------------------------

/** The states each prompt asks the learner to produce (the first one to reach), as overrides of the opening. */
const PRODUCED: Record<string, readonly Partial<Run>[]> = {
    'rs6-one-interval': [{shown: 1}],
    'rs6-twenty': [{shown: 20}, {seed: 43}, {seed: 7}],
    'rs6-hundred': [{shown: 100}],
    'rs6-long': [{n: 10000, shown: 10000}],
    'rs6-sample-size': [{sample: 16}, {sample: 100}],
};

test('RS6: no step opens on the state its prompt asks the learner to produce', () => {
    for (const step of rs6Lesson.steps) {
        const produced = PRODUCED[step.id];
        if (produced === undefined) continue; // the exploring step asks for no particular state
        const opening = OPENINGS[step.scene!.id];
        for (const target of produced) {
            const differs = (Object.keys(target) as (keyof Run)[]).some(key => target[key] !== opening[key]);
            expect({step: step.id, target, differs}).toEqual({step: step.id, target, differs: true});
        }
    }
});

// ---- the learner's actions ---------------------------------------------------------------------------------------------------------------

function learnerSweep(language: Language, stepId: string, body: (m: ReturnType<typeof mountSimulation>, check: (run: Run) => void) => void) {
    setLanguage(language);
    const m = mountSimulation();
    try {
        m.scene(rs6Lesson, stepId);
        body(m, run => expectRun(`${language}/${stepId}`, m.graph, run, language));
    } finally {
        m.mounted.view.unmount();
    }
}
/** Next step until everything is shown, checking the run at every stop (the stops are 1, 2, 5, 10, ... n). */
function nextToEnd(check: (run: Run) => void, base: Run) {
    const stops: number[] = [];
    let shown = base.shown;
    while (shown < base.n) {
        press(t('next_step'));
        shown = Number(document.querySelector('[data-readout="shown"] dd')?.textContent?.match(/\d+/)?.[0]);
        stops.push(shown);
        check({...base, shown});
    }
    return stops;
}
/** Play with the reduced-motion setting on: nothing animates and everything is shown at once. */
function playAtOnce(m: ReturnType<typeof mountSimulation>) {
    const reduced = vi.spyOn(m.graph, 'reducedMotion').mockReturnValue(true);
    press(t('play'));
    reduced.mockRestore();
}

test('RS6: the fields and playback presses the prompts ask for give the kernel readouts the text quotes, in sl and en', () => {
    for (const language of LANGUAGES) {
        const opening = (id: string) => OPENINGS[id];
        learnerSweep(language, 'rs6-one-interval', (_, check) => {
            const base = opening('rs6-one-interval-scene');
            expect(nextToEnd(check, base)).toEqual([1]);
            expect(missesOf({...base, shown: 1})).toBe(0);
        });
        learnerSweep(language, 'rs6-twenty', (m, check) => {
            const base = opening('rs6-twenty-scene');
            expect(nextToEnd(check, base)).toEqual([1, 2, 5, 10, 20]);
            for (const [seed, misses] of [[43, 3], [7, 1], [42, 0]] as const) {
                typeSeed(seed);
                check({...base, seed, shown: 20});
                expect(missesOf({...base, seed, shown: 20})).toBe(misses);
            }
            // from the opening, Play shows everything at once (reduced motion) and a new seed afterwards keeps it shown
            m.scene(rs6Lesson, 'rs6-twenty');
            playAtOnce(m);
            check({...base, shown: 20});
        });
        learnerSweep(language, 'rs6-hundred', (m, check) => {
            const base = opening('rs6-hundred-scene');
            expect(nextToEnd(check, base)).toEqual([1, 2, 5, 10, 20, 50, 100]);
            m.scene(rs6Lesson, 'rs6-hundred');
            playAtOnce(m);
            check({...base, shown: 100});
            expect(missesOf({...base, shown: 100})).toBe(2);
        });
        learnerSweep(language, 'rs6-long', (_, check) => {
            const base = opening('rs6-long-scene');
            typeN(10000);
            check({...base, n: 10000, shown: 10000});
            expect(missesOf({...base, n: 10000, shown: 10000})).toBe(524);
        });
        learnerSweep(language, 'rs6-sample-size', (_, check) => {
            const base = opening('rs6-sample-size-scene');
            typeSample(16);
            check({...base, sample: 16});
            typeSample(100);
            check({...base, sample: 100});
        });
        learnerSweep(language, 'rs6-explore', (_, check) => {
            const base = opening('rs6-explore-scene');
            typeSeed(42);
            check({...base, seed: 42});
            typeSample(36);
            check({...base, seed: 42, sample: 36});
            typeN(20);
            check({...base, seed: 42, sample: 36, n: 20, shown: 20});
            typeSample(16);
            check({...base, seed: 42, sample: 16, n: 20, shown: 20});
        });
    }
});

// ---- a predicting step does not render the answer to its own prediction -----------------------------------------------------------------

/** The answers each predicting step asks for (as they appear in its expected observations): none may be rendered by the step's explanation, formulas or worked example. */
const ANSWERS: Record<string, Record<Language, readonly string[]>> = {
    'rs6-one-interval': {sl: ['Intervalov, ki zgrešijo \\(0\\) od \\(1\\)'], en: ['Intervals that miss \\(0\\) of \\(1\\)']},
    'rs6-twenty': {
        sl: ['Intervalov, ki zgrešijo \\(0\\) od \\(20\\)', '1 \\pm 1', '0,99', '\\(3\\) od \\(20\\)'],
        en: ['Intervals that miss \\(0\\) of \\(20\\)', '1 \\pm 1', '0.99', '\\(3\\) of \\(20\\)'],
    },
    'rs6-hundred': {sl: ['Intervalov, ki zgrešijo \\(2\\) od \\(100\\)', '\\(21\\) in \\(28\\)', '5 \\pm 2,2'], en: ['Intervals that miss \\(2\\) of \\(100\\)', '\\(21\\) and \\(28\\)', '5 \\pm 2.2']},
    'rs6-long': {sl: ['524', '5,24', '497', '21,7'], en: ['524', '5.24', '497', '21.7']},
    'rs6-sample-size': {
        sl: ['14,1444', '0,95083', '5,6577', '0,94999', '4,92', '5,44', '5,29', '544', '529'],
        en: ['14.1444', '0.95083', '5.6577', '0.94999', '4.92', '5.44', '5.29', '544', '529'],
    },
};
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = (text: string, token: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(token)}(?![0-9]|[.,][0-9])`).test(prose(text));

/** Everything the step renders besides the prompt and the observations: explanation, its formulas, its worked example. */
function renderedExplanation(step: GuidedLessonStep, language: Language): string {
    const blocks = (rs6Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
    const examples = (rs6Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
    return [
        step.explanation[language],
        ...blocks.flatMap(block => [block.latex, block.notation[language], block.explanation[language]]),
        ...examples.flatMap(example => [example.title[language], example.calculationLatex, example.resultLatex, example.check?.[language] ?? '']),
    ].join(' ');
}

test('RS6: a predicting step does not render the answer its prompt asks for (explanation, formulas, worked example), in sl and en', () => {
    for (const step of rs6Lesson.steps) {
        const answers = ANSWERS[step.id];
        if (answers === undefined) continue;
        for (const language of LANGUAGES) {
            // each answer is really what the step's expected observations quote, so the list cannot drift
            const observed = step.expectedObservations.map(o => o[language]).join(' ');
            for (const token of answers[language]) expect({step: step.id, language, token, inObservations: contains(observed, token)}).toEqual({step: step.id, language, token, inObservations: true});
            const rendered = renderedExplanation(step, language);
            for (const token of answers[language]) expect({step: step.id, language, token, leaked: contains(rendered, token)}).toEqual({step: step.id, language, token, leaked: false});
        }
    }
});

// ---- Part B: the quoted numbers, from the kernel and exact arithmetic, independent of the graph --------------------------------------------

/** Every number with decimals in an English text (the decimal point is the only separator there). */
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);
/** The text a step renders for the learner. */
const stepTexts = (step: GuidedLessonStep, language: Language) => {
    const examples = (rs6Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
    const blocks = (rs6Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language],
        ...step.expectedObservations.map(o => o[language]), ...examples.flatMap(example => [example.title[language], example.calculationLatex, example.check?.[language] ?? '']),
        ...blocks.flatMap(block => [block.latex, block.explanation[language]])].join(' ');
};
/** The numbers of a readout text: "± 21,7" is looked up without its sign; the count of a "k od n" readout is only k; the shown and seed rows are not quoted. */
const numbersOf = (row: string, rowText: string): string[] => (row === 'shown' || row === 'seed' ? [] : (rowText.match(/[0-9]+(?:[.,][0-9]+)?/g) ?? []).slice(0, row === 'misses' ? 1 : undefined));
const run = (overrides: Partial<Run> = {}): Run => ({...D, ...overrides});
const readoutsOf = (r: Run, language: Language) => expectedOf(r, language).rows;

interface Quoted {
    /** The run whose readouts are quoted and the readouts (row ids) of it that the step's text quotes. */
    readonly run: Run;
    readonly rows: readonly string[];
    /** Whether the expected-state text of the step's scene (not only the step text) must quote them. */
    readonly inState?: boolean;
}
const LAW = ['exact-miss', 'exact-coverage'];
const QUOTED: Record<string, readonly Quoted[]> = {
    'rs6-one-interval': [
        {run: run({n: 1, shown: 0}), rows: ['exact-coverage', 'half-width', 'exact-miss'], inState: true},
        {run: run({n: 1, shown: 1}), rows: ['misses', 'exact-coverage', 'half-width']},
    ],
    'rs6-twenty': [
        {run: run({n: 1, shown: 1}), rows: ['misses']},
        {run: run({n: 20, shown: 0}), rows: ['misses', 'expected', 'exact-miss'], inState: true},
        {run: run({n: 20, shown: 0}), rows: ['exact-coverage']},
        {run: run({n: 20, shown: 20}), rows: ['misses', 'expected', ...LAW]},
        {run: run({n: 20, shown: 20, seed: 43}), rows: ['misses']},
        {run: run({n: 20, shown: 20, seed: 7}), rows: ['misses']},
    ],
    'rs6-hundred': [
        {run: run({n: 100, shown: 0}), rows: ['misses', 'exact-miss'], inState: true},
        {run: run({n: 20, shown: 20}), rows: ['misses', 'expected']},
        {run: run({n: 20, shown: 20, seed: 43}), rows: ['misses']},
        {run: run({n: 20, shown: 20, seed: 7}), rows: ['misses']},
        {run: run({}), rows: ['misses', 'miss-share', 'exact-miss', 'expected']},
    ],
    'rs6-long': [
        {run: run({}), rows: ['misses', 'miss-share', 'exact-miss', 'expected'], inState: true},
        {run: run({n: 10000, shown: 10000}), rows: ['misses', 'miss-share', 'exact-miss', 'exact-coverage', 'expected']},
    ],
    'rs6-sample-size': [
        {run: run({n: 10000, shown: 10000}), rows: ['half-width', 'miss-share', 'exact-miss', 'exact-coverage'], inState: true},
        {run: run({n: 10000, shown: 10000}), rows: ['misses']},
        {run: run({n: 10000, shown: 10000, sample: 16}), rows: ['half-width', 'exact-coverage', 'exact-miss', 'miss-share', 'misses']},
        {run: run({n: 10000, shown: 10000, sample: 100}), rows: ['half-width', 'exact-coverage', 'exact-miss', 'miss-share', 'misses']},
    ],
    'rs6-explore': [
        {run: run({seed: 7, sample: 25}), rows: ['misses', 'miss-share', 'exact-miss', 'half-width'], inState: true},
        {run: run({seed: 7, sample: 25}), rows: ['exact-coverage', 'expected']},
        {run: run({n: 10000, shown: 10000, sample: 16}), rows: ['half-width', 'exact-coverage', 'exact-miss', 'miss-share']},
        {run: run({n: 10000, shown: 10000, sample: 100}), rows: ['half-width', 'exact-coverage', 'exact-miss', 'miss-share']},
        {run: run({n: 10000, shown: 10000}), rows: ['exact-miss', 'exact-coverage']},
    ],
};

test('RS6: every readout number a step quotes (kernel runner at the stated seed, exact comparators) is in its sl and en text', () => {
    for (const step of rs6Lesson.steps) {
        for (const language of LANGUAGES) {
            const text = stepTexts(step, language);
            for (const quoted of QUOTED[step.id]) {
                const rows = readoutsOf(quoted.run, language);
                for (const row of quoted.rows) {
                    for (const value of numbersOf(row, rows[row])) {
                        const where = quoted.inState ? step.scene!.expectedState[language] : text;
                        expect({step: step.id, language, row, value, quoted: contains(where, value)}).toEqual({step: step.id, language, row, value, quoted: true});
                    }
                }
            }
        }
    }
});

test('RS6: the captions the observations quote are the graph strings (first intervals drawn: 100; this run: 2 missed)', () => {
    const strip = (text: string) => text.replace(/\\\(|\\\)/g, '');
    for (const language of LANGUAGES) {
        setLanguage(language);
        const observations = (id: string) => strip(rs6Lesson.steps.find(step => step.id === id)!.expectedObservations[0][language]);
        expect(observations('rs6-long')).toContain(t('random_graph_cap_cover', {value0: 100}));
        expect(observations('rs6-hundred')).toContain(t('random_graph_cap_miss_run', {value0: 2}));
    }
});

test('RS6: exact arithmetic: mean, variance, sigma, half-width, the integer cover test and the sample-size widths', () => {
    expect(99 / 2).toBe(49.5);
    expect((100 * 100 - 1) / 12).toBe(833.25);
    const sigma = Math.sqrt(833.25);
    expect(Number(sigma.toFixed(3))).toBe(28.866);
    expect(Number(sigma.toFixed(2))).toBe(28.87);
    expect(Number(((1.96 * sigma) / 6).toFixed(4))).toBe(9.4296);
    // the interval covers 49,5 iff |S - 1782| <= 339: 36 * 49,5 = 1782 and 36 * 9,4296 = 339,465 lies between the whole numbers 339 and 340 (no tie)
    expect(36 * 49.5).toBe(1782);
    const bound = 36 * halfWidthOf(36);
    expect(Number(bound.toFixed(3))).toBe(339.465);
    expect(Math.floor(bound)).toBe(339);
    expect(intervalCoverLimit(36)).toBe(2 * 339);
    // the widths by 1 / sqrt(n): sample 16, 36, 100 and the explore sample 25
    expect([16, 36, 100, 25].map(n => Number(halfWidthOf(n).toFixed(4)))).toEqual([14.1444, 9.4296, 5.6577, 11.3155]);
    expect(Number(((1.96 * sigma) / 4).toFixed(4))).toBe(14.1444);
    expect(Number(((1.96 * sigma) / 10).toFixed(4))).toBe(5.6577);
    expect(SAMPLE_SIZE_MIN).toBe(16);
});

test('RS6: coverage by integer convolution, the miss probability q = 1 - coverage and the quoted misses of the kernel runner', () => {
    const coverage = (sample: number) => Number(coverageOf(sample).toFixed(5));
    expect([16, 36, 100, 25].map(coverage)).toEqual([0.95083, 0.9503, 0.94999, 0.95049]);
    expect(coverageOf(36).toFixed(5)).toBe('0.95030');
    const q = 1 - coverageOf(36);
    expect(Number(q.toFixed(5))).toBe(0.0497);
    expect(percent(q, 'sl')).toBe('4,97 %');
    expect([16, 36, 100, 25].map(sample => percent(1 - coverageOf(sample), 'en'))).toEqual(['4.92 %', '4.97 %', '5 %', '4.95 %']);
    // 20 * 0,0497 = 0,994 is quoted as "approximately 0,99", and the expected counts with their typical deviations
    expect(Number((20 * 0.0497).toFixed(2))).toBe(0.99);
    expect(readoutsOf(run({n: 20, shown: 20}), 'en').expected).toBe('1 ± 1');
    expect(readoutsOf(run({}), 'en').expected).toBe('5 ± 2.2');
    expect(readoutsOf(run({n: 10000, shown: 10000}), 'en').expected).toBe('497 ± 21.7');
    expect(Number(Math.sqrt(10000 * q * (1 - q)).toFixed(1))).toBe(21.7);
    // the misses of the runs, at the stated seed and sample
    expect([42, 43, 7].map(seed => missesOf(run({seed, n: 20, shown: 20})))).toEqual([0, 3, 1]);
    expect(missesOf(run({n: 1, shown: 1}))).toBe(0);
    expect(missesOf(run({}))).toBe(2);
    expect(missesOf(run({n: 10000, shown: 10000}))).toBe(524);
    expect(missesOf(run({seed: 7, sample: 25}))).toBe(6);
    expect([16, 100].map(sample => missesOf(run({n: 10000, shown: 10000, sample})))).toEqual([544, 529]);
    expect([524 / 100, 544 / 100, 529 / 100]).toEqual([5.24, 5.44, 5.29]);
    // the two missing intervals of the hundred are the 21st and the 28th (the miss flag of the interval runner)
    const flags = new Uint8Array(100);
    runIntervals(42, 100, 36, flags);
    expect([...flags].flatMap((flag, index) => (flag === 1 ? [index + 1] : []))).toEqual([21, 28]);
    // the prefix property: the run of 20 is the first 20 of the run of 100
    expect(flags.slice(0, 20).reduce((sum, flag) => sum + flag, 0)).toBe(missesOf(run({n: 20, shown: 20})));
    // 524 is (524 - 497,03) / 21,73 = 1,2 deviations above the expected count
    expect(Number(((524 - 10000 * q) / Math.sqrt(10000 * q * (1 - q))).toFixed(1))).toBe(1.2);
});

test('RS6: the binomial law of the misses: P(0), P(1), P(2), P(M <= 2) = 0,1208 for 100 intervals, about once in eight repetitions', () => {
    const law = missCountLaw(100, 1 - coverageOf(36));
    expect(law.length).toBe(101);
    expect(law.reduce((sum, mass) => sum + mass, 0)).toBeCloseTo(1, 12);
    expect([0, 1, 2].map(j => Number(law[j].toFixed(4)))).toEqual([0.0061, 0.032, 0.0827]);
    expect(Number((law[0] + law[1] + law[2]).toFixed(4))).toBe(0.1208);
    expect(Math.round(1 / (law[0] + law[1] + law[2]))).toBe(8);
    // the same by the binomial formula: C(100, j) q^j (1 - q)^(100 - j) and the mean m q
    const q = 1 - coverageOf(36);
    const binomial = (j: number) => { let c = 1; for (let i = 1; i <= j; i += 1) c = (c * (100 - j + i)) / i; return c * q ** j * (1 - q) ** (100 - j); };
    for (let j = 0; j <= 3; j += 1) expect(law[j]).toBeCloseTo(binomial(j), 12);
    expect(law.reduce((sum, mass, j) => sum + j * mass, 0)).toBeCloseTo(100 * q, 10);
});

test('RS6: sl text has no English decimals, en text has only the quoted or computed ones, and rounded numbers say so', () => {
    const q = 1 - coverageOf(36);
    // decimals of the text that are not readouts: the stated arithmetic, each computed above or in the exact tests
    const computed = new Set([
        '49.5', '833.25', '28.866', '28.87', '1.96', halfWidthOf(36).toFixed(4), (36 * halfWidthOf(36)).toFixed(3), coverageOf(36).toFixed(5), q.toFixed(5), q.toFixed(4),
        '0.95', '0.05', '0.99', ((524 - 10000 * q) / Math.sqrt(10000 * q * (1 - q))).toFixed(1), Math.sqrt(10000 * q * (1 - q)).toFixed(1), '0.1208', '1.2', '0.0061', '0.032', '0.0827',
    ]);
    for (const step of rs6Lesson.steps) {
        expect({step: step.id, english: decimalsIn(stepTexts(step, 'sl'))}).toEqual({step: step.id, english: []});
        const quoted = new Set((QUOTED[step.id] ?? []).flatMap(item => Object.keys(readoutsOf(item.run, 'en')).flatMap(row => (item.rows.includes(row) ? numbersOf(row, readoutsOf(item.run, 'en')[row]) : []))));
        const unaccounted = decimalsIn(stepTexts(step, 'en')).filter(value => !quoted.has(value) && !computed.has(value));
        expect({step: step.id, unaccounted}).toEqual({step: step.id, unaccounted: []});
    }
    const step = (id: string) => rs6Lesson.steps.find(s => s.id === id)!;
    const block = (id: string) => rs6Lesson.formulaBlocks!.find(b => b.id === id)!;
    // approximate wording at the rounded quotes
    expect(block('interval-half-width').latex).toContain('\\sigma\\approx28{,}87');
    expect(block('interval-half-width').latex).toContain('\\approx9{,}4296');
    expect(block('interval-exact').latex).toContain('\\approx339{,}465');
    expect(step('rs6-twenty').expectedObservations[0].sl).toContain('\\approx0{,}99');
    expect(step('rs6-twenty').expectedObservations[0].en).toContain('\\approx0.99');
    expect(step('rs6-long').expectedObservations[0].sl).toContain('približno \\(1{,}2\\)');
    expect(step('rs6-long').expectedObservations[0].en).toContain('about \\(1.2\\)');
    expect(step('rs6-sample-size').explanation.sl).toContain('\\pm21{,}7');
    expect(step('rs6-sample-size').explanation.en).toContain('\\pm21.7');
    expect(step('rs6-long').explanation.sl).toContain('\\approx0{,}1208');
    expect(step('rs6-long').explanation.en).toContain('\\approx0.1208');
    expect(step('rs6-long').explanation.sl).toContain('približno vsakih osem ponovitev');
    expect(step('rs6-long').explanation.en).toContain('roughly once in eight repetitions');
    const example = rs6Lesson.workedExamples![0];
    expect(example.calculationLatex).toContain('P(M\\le2)\\approx0{,}1208');
    expect(example.check!.sl).toContain('približno \\(0{,}1208\\)');
    expect(example.check!.en).toContain('about \\(0.1208\\)');
});
