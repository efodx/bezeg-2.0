/**
 * RS5 (randomness, batch C): the two-state Markov chain lesson, tested on the real simulation graph in sl and en.
 * Part A: every step opening lands in the stated state, readouts, note and status line (applied out of order and twice in one synchronous act, restore on leaving
 * returns the free state); the labels and buttons the prompts name exist in the graph; no opening is already the state its prompt asks the learner to produce; the
 * edits and playback presses the prompts ask for give the readouts the text quotes; a predicting step does not render the answer it asks for.
 * The expected readouts are recomputed here from the kernel (`runMarkov`, `markovStationary`, `markovDistribution`), not read from the graph.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {rs5Lesson} from './randomnessMarkovGuidedLessons';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {chooseOnPuckNow, installBoardShims, mountGraph, puckControl, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {SimulationGraph} from '../../graphs/random/SimulationGraph';
import {setLanguage, t} from '../../localization';
import {formatNumber} from '../../analysis/format';
import {enterNumber} from '../../inputs/testEntry';
import {puckKeyOf, typeControl} from '../../graphs/random/simulationTestPucks';
import {markovDistribution, markovStationary} from '../../random/exact';
import {runMarkov} from '../../random/runners';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- the expected readouts, recomputed from the kernel ------------------------------------------------------------------------------------

interface Run { readonly seed: number; readonly a: number; readonly b: number; readonly start: 0 | 1; readonly n: number; readonly shown: number }
const DEFAULT_RUN: Run = {seed: 42, a: 30, b: 60, start: 0, n: 10000, shown: 10000};

/** Steps spent in A over the first `shown` steps of the run, from the kernel runner. */
function stepsInA(run: Run): number {
    const out = new Uint32Array(2);
    runMarkov(run.seed, run.a, run.b, run.start, run.shown, out);
    return out[0];
}
const fmt = (value: number, language: Language, digits: number) => formatNumber(value, language, digits);

/** The five readouts, the playback readout, the note and the status line of a run, in the given language. */
function expectedOf(run: Run, language: Language) {
    const stationary = markovStationary(run.a / 100, run.b / 100);
    const lambda = 1 - run.a / 100 - run.b / 100;
    const inA = stepsInA(run);
    const share = run.shown > 0 ? inA / run.shown : 0;
    const sd = stationary === null ? null : Math.sqrt((stationary[0] * stationary[1] * (1 + lambda)) / (1 - lambda) / Math.max(run.shown, 1));
    return {
        rows: {
            share: fmt(share, language, 4),
            stationary: stationary === null ? (language === 'sl' ? 'ni enolična' : 'not unique') : `${fmt(stationary[0], language, 4)}; ${fmt(stationary[1], language, 4)}`,
            lambda: fmt(lambda, language, 4),
            typical: sd === null ? '—' : `± ${fmt(sd, language, 4)}`,
            'exact-a': run.shown > 0 ? fmt(markovDistribution(run.a / 100, run.b / 100, run.start, run.shown)[0], language, 5) : '—',
            shown: language === 'sl' ? `${run.shown} od ${run.n}` : `${run.shown} of ${run.n}`,
            seed: String(run.seed),
        } as Record<string, string>,
        note: stationary === null ? (language === 'sl' ? 'Veriga ostane v začetnem stanju, zato stacionarna porazdelitev ni enolična.' : 'The chain stays in its starting state, so the stationary distribution is not unique.')
            : lambda === -1 ? (language === 'sl' ? 'Veriga izmenjuje stanji, zato se delež časa ustali, verjetnost stanja A po k korakih pa ne (perioda 2).' : 'The chain alternates between the states, so the share of time settles but the probability of state A after k steps does not (period 2).')
                : null,
        status: language === 'sl' ? `Korakov ${run.shown} od ${run.n}, v stanju A ${inA}, delež ${fmt(share, language, 4)}.` : `Steps ${run.shown} of ${run.n}, in state A ${inA}, share ${fmt(share, language, 4)}.`,
    };
}

const stateOfRun = (run: Run) => ({mode: 'markov', seed: run.seed, n: run.n, shown: run.shown, markovA: run.a, markovB: run.b, markovStart: run.start});

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
const chooseStart = (start: 0 | 1) => chooseOnPuckNow('random-start', String(start));
const typeA = (value: number) => type(t('random_graph_a_label'), String(value));
const typeB = (value: number) => type(t('random_graph_b_label'), String(value));
const typeN = (value: number) => type(t('random_graph_n_markov'), String(value));
const typeSeed = (value: number) => type(t('random_graph_seed_label'), String(value));

/** Checks the state, readouts, note and status line against the kernel values of `run`. */
function expectRun(id: string, graph: SimulationGraph, run: Run, language: Language) {
    const expected = expectedOf(run, language);
    const state = graph.state as unknown as Record<string, unknown>;
    const wanted = stateOfRun(run);
    expect({id, ...Object.fromEntries(Object.keys(wanted).map(key => [key, state[key]]))}).toEqual({id, ...wanted});
    for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
    expect({id, status: status()}).toEqual({id, status: expected.status});
    expect({id, notes: notes()}).toEqual({id, notes: expected.note === null ? [] : [expected.note]});
    expect({id, label: stripped(readoutLabel('exact-a'))}).toEqual({id, label: stripped(t('random_graph_r_exact_a', {value0: run.shown}))});
}

// ---- the openings ------------------------------------------------------------------------------------------------------------------------

const D = DEFAULT_RUN;
const OPENINGS: Record<string, Run> = {
    'rs5-two-states-scene': {...D, a: 50, b: 50, n: 100, shown: 100},
    'rs5-longer-scene': {...D, n: 100, shown: 100},
    'rs5-exact-scene': {...D, n: 100, shown: 0},
    'rs5-start-b-scene': D,
    'rs5-rates-scene': {...D, n: 100, shown: 100},
    'rs5-edges-scene': {...D, n: 100, shown: 100},
    'rs5-explore-scene': {...D, seed: 7, a: 20, b: 40, start: 1},
};
const stepOfScene = (sceneId: string) => rs5Lesson.steps.find(step => step.scene!.id === sceneId)!;

test('RS5: every opening lands in the stated state, readouts, note and status in sl and en, in one synchronous act out of order and twice; leaving restores the free state', () => {
    for (const language of LANGUAGES) {
        setLanguage(language);
        const m = mountSimulation();
        try {
            const ids = Object.keys(OPENINGS);
            expect(rs5Lesson.steps.map(step => step.scene!.id)).toEqual(ids);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                m.scene(rs5Lesson, stepOfScene(id).id, 2);
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
    'rs5-two-states': ['random_name_a', 'random_name_b', 'random_graph_r_share', 'random_graph_r_stationary'],
    'rs5-longer': ['random_name_chain_steps', 'random_graph_r_share', 'random_graph_r_share_sd'],
    'rs5-exact': ['random_graph_r_exact_a', 'random_graph_r_share', 'next_step'],
    'rs5-start-b': ['random_graph_start_label', 'random_graph_r_share', 'random_graph_r_exact_a', 'replay', 'next_step'],
    'rs5-rates': ['random_name_a', 'random_name_b', 'random_name_chain_steps', 'random_graph_r_share', 'random_graph_r_exact_a', 'replay', 'next_step'],
    'rs5-edges': ['random_graph_r_share', 'random_graph_r_stationary', 'random_graph_r_lambda', 'random_graph_r_exact_a', 'replay', 'next_step'],
    'rs5-explore': ['random_name_a', 'random_name_b', 'random_graph_start_label', 'random_graph_seed_label', 'random_name_chain_steps', 'random_graph_r_share', 'random_graph_r_stationary', 'random_graph_r_lambda'],
};
/** The catalog text of a label; the exact row's label is quoted without its "k = value" tail. */
const labelText = (key: string) => (key === 'random_graph_r_exact_a' ? t(key, {value0: 0}).split(':')[0] : t(key as 'next_step'));

test('RS5: every control, button and readout label a prompt names is a string of the graph and of the mounted controls, in sl and en', () => {
    for (const language of LANGUAGES) {
        setLanguage(language);
        const m = mountSimulation();
        try {
            m.scene(rs5Lesson, 'rs5-two-states');
            for (const step of rs5Lesson.steps) {
                for (const key of PROMPT_LABELS[step.id]) {
                    const label = labelText(key);
                    expect({language, key, defined: label !== key && label.length > 0}).toEqual({language, key, defined: true});
                    expect({language, step: step.id, label, named: step.observationPrompt[language].includes(label)}).toEqual({language, step: step.id, label, named: true});
                }
            }
            for (const key of ['random_graph_a_label', 'random_graph_b_label', 'random_graph_n_markov', 'random_graph_seed_label', 'random_graph_start_label'] as const) {
                expect({language, key, present: puckControl(puckKeyOf(t(key))!) !== null}).toEqual({language, key, present: true});
            }
            for (const key of ['replay', 'next_step'] as const) expect(screen.getByRole('button', {name: t(key)})).toBeTruthy();
            for (const id of ['share', 'stationary', 'lambda', 'typical', 'exact-a']) expect({language, id, label: readoutLabel(id) !== null}).toEqual({language, id, label: true});
            expect(readoutLabel('share')).toBe(t('random_graph_r_share'));
            expect(readoutLabel('stationary')).toBe(t('random_graph_r_stationary'));
            expect(readoutLabel('lambda')).toBe(t('random_graph_r_lambda'));
            expect(readoutLabel('typical')).toBe(t('random_graph_r_share_sd'));
        } finally {
            m.mounted.view.unmount();
        }
    }
});

// ---- the opening is not the state the prompt asks the learner to produce ----------------------------------------------------------------

/** The states each prompt asks the learner to produce (the first one to reach), as overrides of the opening. */
const PRODUCED: Record<string, readonly Partial<Run>[]> = {
    'rs5-two-states': [{a: 30, b: 60}],
    'rs5-longer': [{n: 10000, shown: 10000}, {n: 1000, shown: 1000}],
    'rs5-exact': [{shown: 1}, {shown: 2}, {shown: 5}],
    'rs5-start-b': [{start: 1}],
    'rs5-rates': [{a: 10, b: 10}, {a: 10, b: 10, n: 10000, shown: 10000}, {a: 80, b: 90, n: 10000, shown: 10000}],
    'rs5-edges': [{a: 0, b: 0}, {a: 100, b: 100}],
};

test('RS5: no step opens on the state its prompt asks the learner to produce', () => {
    for (const step of rs5Lesson.steps) {
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
        m.scene(rs5Lesson, stepId);
        body(m, run => expectRun(`${language}/${stepId}`, m.graph, run, language));
    } finally {
        m.mounted.view.unmount();
    }
}
/** Replay, then Next step `count` times, checking the run at every stop. */
function playTo(check: (run: Run) => void, base: Run, stops: readonly number[]) {
    press(t('replay'));
    check({...base, shown: 0});
    for (const shown of stops) {
        press(t('next_step'));
        check({...base, shown});
    }
}

test('RS5: the fields and playback presses the prompts ask for give the kernel readouts the text quotes, in sl and en', () => {
    for (const language of LANGUAGES) {
        const opening = (id: string) => OPENINGS[id];
        learnerSweep(language, 'rs5-two-states', (_, check) => {
            typeA(30);
            typeB(60);
            check({...opening('rs5-two-states-scene'), a: 30, b: 60});
        });
        learnerSweep(language, 'rs5-longer', (_, check) => {
            typeN(10000);
            check({...opening('rs5-longer-scene'), n: 10000, shown: 10000});
            typeN(1000);
            check({...opening('rs5-longer-scene'), n: 1000, shown: 1000});
        });
        learnerSweep(language, 'rs5-exact', (_, check) => {
            for (const shown of [1, 2, 5]) {
                press(t('next_step'));
                check({...opening('rs5-exact-scene'), shown});
            }
        });
        learnerSweep(language, 'rs5-start-b', (_, check) => {
            chooseStart(1);
            check({...opening('rs5-start-b-scene'), start: 1});
            press(t('replay'));
            press(t('next_step'));
            check({...opening('rs5-start-b-scene'), start: 1, shown: 1});
        });
        learnerSweep(language, 'rs5-rates', (_, check) => {
            const base = opening('rs5-rates-scene');
            typeA(10);
            typeB(10);
            check({...base, a: 10, b: 10});
            typeN(10000);
            check({...base, a: 10, b: 10, n: 10000, shown: 10000});
            typeA(80);
            typeB(90);
            const high = {...base, a: 80, b: 90, n: 10000, shown: 10000};
            check(high);
            playTo(check, high, [1, 2, 5]);
        });
        learnerSweep(language, 'rs5-edges', (_, check) => {
            const base = opening('rs5-edges-scene');
            typeA(0);
            typeB(0);
            check({...base, a: 0, b: 0});
            typeA(100);
            typeB(100);
            const edge = {...base, a: 100, b: 100};
            check(edge);
            playTo(check, edge, [1, 2, 5]);
        });
        learnerSweep(language, 'rs5-explore', (_, check) => {
            const base = opening('rs5-explore-scene');
            typeSeed(42);
            check({...base, seed: 42});
            typeN(100);
            check({...base, seed: 42, n: 100, shown: 100});
            chooseStart(0);
            check({...base, seed: 42, n: 100, shown: 100, start: 0});
        });
    }
});

// ---- a predicting step does not render the answer to its own prediction -----------------------------------------------------------------

/** The answers each predicting step asks for (as they appear in its expected observations): none may be rendered by the step's explanation, formulas or worked example. */
const ANSWERS: Record<string, Record<Language, readonly string[]>> = {
    'rs5-two-states': {sl: ['0,71', '0,0521', '0,6667'], en: ['0.71', '0.0521', '0.6667']},
    'rs5-longer': {sl: ['0,6713', '0,0052', '0,0165'], en: ['0.6713', '0.0052', '0.0165']},
    'rs5-exact': {sl: ['0,66667', '0,67'], en: ['0.66667', '0.67']},
    'rs5-start-b': {sl: ['0,6712', '0,6'], en: ['0.6712', '0.6']},
    'rs5-rates': {sl: ['0,8', '0,72', '0,5051', '0,5294', '0,5295', '0,76', '0,45032'], en: ['0.8', '0.72', '0.5051', '0.5294', '0.5295', '0.76', '0.45032']},
    'rs5-edges': {sl: ['ni enolična', 'perioda 2'], en: ['not unique', 'period 2']},
};
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const contains = (text: string, token: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(token)}(?![0-9]|[.,][0-9])`).test(prose(text));

/** Everything the step renders besides the prompt and the observations: explanation, its formulas, its worked example. */
function renderedExplanation(step: GuidedLessonStep, language: Language): string {
    const blocks = (rs5Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
    const examples = (rs5Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
    return [
        step.explanation[language],
        ...blocks.flatMap(block => [block.latex, block.notation[language], block.explanation[language]]),
        ...examples.flatMap(example => [example.title[language], example.calculationLatex, example.resultLatex, example.check?.[language] ?? '']),
    ].join(' ');
}

test('RS5: a predicting step does not render the answer its prompt asks for (explanation, formulas, worked example), in sl and en', () => {
    for (const step of rs5Lesson.steps) {
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
    const examples = (rs5Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language],
        ...step.expectedObservations.map(o => o[language]), ...examples.map(example => example.check?.[language] ?? '')].join(' ');
};
/** The numbers of a readout text: "± 0,0521" and "−0,7" are looked up without their sign, "0,6667; 0,3333" as two numbers. */
const numbersOf = (rowText: string): string[] => rowText.replace(/[±−-]/g, '').split(';').map(part => part.trim()).filter(part => /^[0-9]/.test(part));
const run = (overrides: Partial<Run> = {}): Run => ({...D, ...overrides});
const readoutsOf = (r: Run, language: Language) => expectedOf(r, language).rows;

interface Quoted {
    /** The run whose readouts are quoted and the readouts (row ids) of it that the step's text quotes. */
    readonly run: Run;
    readonly rows: readonly string[];
    /** Whether the expected-state text of the step's scene (not only the step text) must quote them. */
    readonly inState?: boolean;
}
const R5 = (overrides: Partial<Run>) => run({n: 100, shown: 100, ...overrides});
const QUOTED: Record<string, readonly Quoted[]> = {
    'rs5-two-states': [{run: R5({a: 50, b: 50}), rows: ['share', 'stationary', 'lambda'], inState: true}, {run: R5({}), rows: ['share', 'stationary', 'lambda', 'typical']}],
    'rs5-longer': [
        {run: R5({}), rows: ['share', 'stationary', 'typical'], inState: true},
        {run: run({}), rows: ['share', 'typical']},
        {run: run({n: 1000, shown: 1000}), rows: ['share', 'typical']},
    ],
    'rs5-exact': [
        {run: run({}), rows: ['share', 'typical']},
        {run: R5({shown: 0}), rows: ['stationary', 'lambda'], inState: true},
        {run: R5({shown: 1}), rows: ['exact-a', 'share']},
        {run: R5({shown: 2}), rows: ['exact-a']},
        {run: R5({shown: 5}), rows: ['exact-a']},
    ],
    'rs5-start-b': [
        {run: run({}), rows: ['share', 'stationary'], inState: true},
        {run: run({start: 1}), rows: ['share', 'stationary']},
        {run: R5({start: 1, shown: 1}), rows: ['exact-a', 'share']},
        {run: R5({shown: 1}), rows: ['exact-a']},
        {run: R5({shown: 2}), rows: ['exact-a']},
        {run: R5({shown: 5}), rows: ['exact-a']},
    ],
    'rs5-rates': [
        {run: R5({}), rows: ['share', 'stationary', 'lambda'], inState: true},
        {run: run({start: 1}), rows: ['share']},
        {run: run({}), rows: ['share']},
        {run: R5({a: 10, b: 10}), rows: ['share', 'stationary', 'lambda']},
        {run: run({a: 10, b: 10}), rows: ['share']},
        {run: run({a: 80, b: 90}), rows: ['share', 'stationary', 'lambda']},
        ...[1, 2, 5].map(shown => ({run: run({a: 80, b: 90, shown}), rows: ['exact-a']})),
    ],
    'rs5-edges': [
        {run: R5({}), rows: ['share', 'stationary', 'lambda'], inState: true},
        {run: R5({a: 10, b: 10}), rows: ['share', 'stationary', 'lambda']},
        {run: run({a: 10, b: 10}), rows: ['share']},
        {run: run({a: 80, b: 90}), rows: ['lambda']},
        ...[1, 2, 5].map(shown => ({run: run({a: 80, b: 90, shown}), rows: ['exact-a']})),
        {run: R5({a: 0, b: 0}), rows: ['share', 'lambda']},
        {run: R5({a: 100, b: 100}), rows: ['share', 'stationary', 'lambda']},
        ...[1, 2, 5].map(shown => ({run: R5({a: 100, b: 100, shown}), rows: ['exact-a']})),
    ],
    'rs5-explore': [
        {run: run({seed: 7, a: 20, b: 40, start: 1}), rows: ['share', 'stationary', 'lambda'], inState: true},
        {run: R5({seed: 7, a: 20, b: 40, start: 1}), rows: ['share']},
    ],
};

test('RS5: every readout number a step quotes (kernel runner at the stated seed and start, exact comparators) is in its sl and en text', () => {
    for (const step of rs5Lesson.steps) {
        for (const language of LANGUAGES) {
            const text = stepTexts(step, language);
            for (const quoted of QUOTED[step.id]) {
                const rows = readoutsOf(quoted.run, language);
                for (const row of quoted.rows) {
                    for (const value of numbersOf(rows[row])) {
                        const where = quoted.inState ? step.scene!.expectedState[language] : text;
                        expect({step: step.id, language, row, value, quoted: contains(where, value)}).toEqual({step: step.id, language, row, value, quoted: true});
                    }
                }
            }
        }
    }
});

test('RS5: the signs and the notes the text quotes are the kernel ones: lambda -0,7 and -1, the two notes, a=b=0 without a stationary distribution', () => {
    expect(readoutsOf(run({a: 80, b: 90}), 'sl').lambda).toBe('−0,7');
    expect(readoutsOf(run({a: 100, b: 100}), 'en').lambda).toBe('−1');
    const edges = rs5Lesson.steps.find(step => step.id === 'rs5-edges')!;
    for (const language of LANGUAGES) {
        const text = edges.expectedObservations[0][language];
        expect(text).toContain(expectedOf(R5({a: 0, b: 0}), language).note!.replace(/\.$/, ''));
        expect(text).toContain('\\(-1\\)');
        expect(text).toContain(expectedOf(R5({a: 100, b: 100}), language).note!.replace(/\.$/, ''));
        expect(text).toContain(language === 'sl' ? 'ni enolična' : 'not unique');
        const rates = rs5Lesson.steps.find(step => step.id === 'rs5-rates')!.expectedObservations[0][language];
        expect(rates).toContain(language === 'sl' ? '\\(-0{,}7\\)' : '\\(-0.7\\)');
    }
});

test('RS5: exact arithmetic: pi P = pi, lambda = 1 - a - b, P(A after n) by the recursion and the closed form at the quoted n', () => {
    const closed = (a: number, b: number, start: 0 | 1, k: number) => b / (a + b) + ((start === 0 ? 1 : 0) - b / (a + b)) * (1 - a - b) ** k;
    // pi P = pi for the pairs of the lesson (and the closed form agrees with the kernel recursion at k = 0, 1, 2, 5 and 10)
    for (const [a, b] of [[0.3, 0.6], [0.5, 0.5], [0.1, 0.1], [0.8, 0.9], [0.2, 0.4], [1, 1]] as const) {
        const [piA, piB] = markovStationary(a, b)!;
        expect(piA + piB).toBeCloseTo(1, 15);
        expect(piA * (1 - a) + piB * b).toBeCloseTo(piA, 14);
        expect(piA * a + piB * (1 - b)).toBeCloseTo(piB, 14);
        for (const start of [0, 1] as const) for (const k of [0, 1, 2, 5, 10]) expect(markovDistribution(a, b, start, k)[0]).toBeCloseTo(closed(a, b, start, k), 12);
    }
    expect(markovStationary(0, 0)).toBeNull();
    expect(markovStationary(0.3, 0.6)!.map(v => Number(v.toFixed(4)))).toEqual([0.6667, 0.3333]);
    // the quoted P(A after k): 0,7 / 0,67 / 0,66667 from A, 0,6 at k = 1 from B, 0,2 / 0,76 / 0,45032 for a 80 b 90, 0 / 1 / 0 for a = b = 100
    const at = (a: number, b: number, start: 0 | 1) => [1, 2, 5].map(k => Number(closed(a, b, start, k).toFixed(5)));
    expect(at(0.3, 0.6, 0)).toEqual([0.7, 0.67, 0.66667]);
    expect(Number(closed(0.3, 0.6, 1, 1).toFixed(5))).toBe(0.6);
    expect(Number((2 / 3 - (2 / 3) * 0.1).toFixed(10))).toBe(0.6);
    expect(at(0.8, 0.9, 0)).toEqual([0.2, 0.76, 0.45032]);
    expect(at(1, 1, 0)).toEqual([0, 1, 0]);
    // p_5 - 2/3 = (1/3) 0,1^5 = 3,3e-6, quoted as "3,3 · 10^-6" (kept in that form in both languages)
    expect(markovDistribution(0.3, 0.6, 0, 5)[0] - 2 / 3).toBeCloseTo(3.333e-6, 9);
    expect((1 / 3) * 0.1 ** 5).toBeCloseTo(3.3333e-6, 10);
    // the second eigenvalue, the limit 90/170 and the mean stay times of the text
    expect([1 - 0.3 - 0.6, 1 - 0.1 - 0.1, 1 - 0.8 - 0.9, 1 - 0.2 - 0.4, 1 - 1 - 1, 1 - 0 - 0].map(v => Number(v.toFixed(10)))).toEqual([0.1, 0.8, -0.7, 0.4, -1, 1]);
    expect(Number((90 / 170).toFixed(4))).toBe(0.5294);
    expect([1 / 0.3, 1 / 0.6].map(v => Number(v.toFixed(1)))).toEqual([3.3, 1.7]);
    // the worked example: (2/3) 0,7 + (1/3) 0,6 = 2/3 and (2/3) 0,3 + (1/3) 0,4 = 1/3, both numerators over 3 as written
    expect((1.4 + 0.6) / 3).toBeCloseTo(2 / 3, 15);
    expect((0.6 + 0.4) / 3).toBeCloseTo(1 / 3, 15);
    expect((2 / 3) * 0.7 + (1 / 3) * 0.6).toBeCloseTo(2 / 3, 15);
    expect((2 / 3) * 0.3 + (1 / 3) * 0.4).toBeCloseTo(1 / 3, 15);
});

test('RS5: the run shares at the stated seed and start come from the kernel runner (steps in A of the first `shown` steps), and the prefix property holds', () => {
    const share = (r: Run) => stepsInA(r) / r.shown;
    const rounded = (r: Run, digits: number) => Number(share(r).toFixed(digits));
    expect(rounded(R5({a: 50, b: 50}), 4)).toBe(0.46);
    expect(rounded(R5({}), 4)).toBe(0.71);
    expect(rounded(run({}), 4)).toBe(0.6713);
    expect(rounded(run({n: 1000, shown: 1000}), 4)).toBe(0.66);
    expect(rounded(run({start: 1}), 4)).toBe(0.6712);
    expect(rounded(R5({a: 10, b: 10}), 4)).toBe(0.72);
    expect(rounded(run({a: 10, b: 10}), 4)).toBe(0.5051);
    expect(rounded(run({a: 80, b: 90}), 4)).toBe(0.5295);
    expect(rounded(run({seed: 7, a: 20, b: 40, start: 1}), 4)).toBe(0.6765);
    expect(rounded(R5({seed: 7, a: 20, b: 40, start: 1}), 4)).toBe(0.69);
    // the first steps the playback stops at: from A the chain stays in A (share 1 at 1, 2, 5), from B the first step stays in B (share 0 at Shown 1)
    expect([1, 2, 5].map(shown => share(R5({shown})))).toEqual([1, 1, 1]);
    expect(share(R5({start: 1, shown: 1}))).toBe(0);
    // a = b = 0 never leaves the start, a = b = 100 alternates every step
    expect(share(R5({a: 0, b: 0}))).toBe(1);
    expect(share(R5({a: 100, b: 100}))).toBe(0.5);
    // the run of `shown` steps is the prefix of the longer run: the count in A after 100 steps is the count at checkpoint 100 of the 10 000 steps run
    const out = new Uint32Array(2);
    const at = new Uint32Array(1);
    runMarkov(42, 30, 60, 0, 10000, out, {at: [100], out: at});
    expect(at[0]).toBe(stepsInA(R5({})));
    // the typical deviation of the share, sqrt(pi_A pi_B (1 + lambda) / (1 - lambda) / n)
    const sd = (a: number, b: number, n: number) => Math.sqrt(((b / (a + b)) * (a / (a + b)) * (1 + 1 - a - b)) / (1 - (1 - a - b)) / n);
    expect([100, 10000, 1000].map(n => Number(sd(0.3, 0.6, n).toFixed(4)))).toEqual([0.0521, 0.0052, 0.0165]);
});

test('RS5: the share at Shown 1 is the state after the first transition, not the starting state (a = b = 100 starting in A reads 0)', () => {
    // The explanation of step 3 and the sources line say that a run counts the starting state as the first step shown, so that the share at Shown 1 "only tells where the
    // chain started". The kernel counts the state after each transition (src/random/runners.ts:190, "the start is not counted"), and the graph reads it with n = shown.
    expect(stepsInA(R5({a: 100, b: 100, shown: 1}))).toBe(0);
    expect(stepsInA(R5({a: 0, b: 0, start: 1, shown: 1}))).toBe(0);
    expect(stepsInA(R5({a: 100, b: 100, start: 1, shown: 1}))).toBe(1);
});

test('RS5: sl text has no English decimals, en text has only the quoted ones, and rounded numbers say so', () => {
    const allowed = new Set(['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9']);
    for (const step of rs5Lesson.steps) {
        expect({step: step.id, english: decimalsIn(stepTexts(step, 'sl'))}).toEqual({step: step.id, english: []});
        const quoted = new Set((QUOTED[step.id] ?? []).flatMap(q => q.rows.flatMap(row => numbersOf(readoutsOf(q.run, 'en')[row]))));
        const unaccounted = decimalsIn(stepTexts(step, 'en')).filter(value => !allowed.has(value) && !quoted.has(value) && value !== '3.3' && value !== '1.7' && value !== '0.5294' && value !== '0.6667');
        expect({step: step.id, unaccounted}).toEqual({step: step.id, unaccounted: []});
    }
    const step = (id: string) => rs5Lesson.steps.find(s => s.id === id)!;
    // approximate wording at the rounded quotes
    expect(step('rs5-longer').explanation.sl).toContain('\\approx3{,}3');
    expect(step('rs5-longer').explanation.en).toContain('\\approx3.3');
    expect(step('rs5-longer').explanation.sl).toContain('približna ocena');
    expect(step('rs5-longer').explanation.en).toContain('approximate estimate');
    expect(step('rs5-edges').explanation.sl).toContain('\\approx0{,}5294');
    expect(step('rs5-edges').explanation.en).toContain('\\approx0.5294');
    expect(step('rs5-exact').expectedObservations[0].sl).toContain('\\approx3{,}3\\cdot10^{-6}');
    expect(step('rs5-exact').expectedObservations[0].en).toContain('\\approx3.3\\cdot10^{-6}');
    expect(rs5Lesson.workedExamples![0].check!.sl).toContain('zaokrožena');
    expect(rs5Lesson.workedExamples![0].check!.en).toContain('rounded');
});
