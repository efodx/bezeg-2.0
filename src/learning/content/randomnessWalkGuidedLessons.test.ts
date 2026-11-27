/**
 * RS4 (randomness, batch B: the random walk and the root of n). Part A: every scene lands in the state, readouts and status line the text states (the real simulation graph, scenes
 * applied in one synchronous `act` from a restored checkpoint, out of order and twice, in sl and en), the labels a prompt names are labels of the graph, no step opens on the state
 * its prompt asks the learner to produce, the actions the text asks for (typing a field, pressing the playback buttons) give the readouts the text quotes, and a predicting step does
 * not print its own answer. The expected readouts are computed here from the kernel runner `runWalks` (the sums over the first `shown` walks of a seed) and the exact law `walkLaw`,
 * not with the graph. Part B (the quoted numbers) follows below.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {rs4Lesson} from './randomnessWalkGuidedLessons';
import type {GuidedLesson} from './guidedLessons';
import {installBoardShims, mountGraph, puckControl, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {SimulationGraph} from '../../graphs/random/SimulationGraph';
import type {AnimationScheduler} from '../runtime/animation';
import {enterNumber} from '../../inputs/testEntry';
import {chooseControl, puckKeyOf, typeControl} from '../../graphs/random/simulationTestPucks';
import {setLanguage, t} from '../../localization';
import {runWalks} from '../../random/runners';
import {walkLaw} from '../../random/exact';
import {playbackStops} from '../../random/randomModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- expected readouts, from the kernel runner and the exact law ------------------------------------------------------------------------

/** A readout number as the graph prints it: rounded to `digits`, trailing zeros dropped, a decimal comma in sl. */
function fmt(value: number, digits: number, language: Language): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');

interface Run {readonly seed: number; readonly n: number; readonly shown: number; readonly steps: number}

/** The sums of the first `shown` walks of the seed (the kernel runner, not the graph). */
function sumsOf(seed: number, shown: number, steps: number) {
    const out = new Uint32Array(steps + 1);
    const {sumSquares, sumAbs, zeros} = runWalks(seed, shown, steps, out);
    return {sumSquares, sumAbs, zeros};
}
/** The exact law of the end after `steps` steps: the mean distance and the mass at 0 (sums over the shifted binomial, not the graph). */
function lawOf(steps: number) {
    const {positions, masses} = walkLaw(steps);
    return {meanAbs: positions.reduce((total, position, k) => total + Math.abs(position) * masses[k], 0), zeroMass: masses[positions.indexOf(0)] ?? 0};
}

function walkRows(run: Run, language: Language): Record<string, string> {
    const {seed, n, shown, steps} = run;
    const {sumSquares, sumAbs, zeros} = sumsOf(seed, shown, steps);
    const law = lawOf(steps);
    const of = language === 'sl' ? 'od' : 'of';
    const byLaw = language === 'sl' ? 'po zakonu' : 'by the law';
    const expected = language === 'sl' ? 'pričakovano' : 'expected';
    const odd = language === 'sl' ? '(pri lihem številu korakov se ne morejo končati v izhodišču)' : '(with an odd number of steps a walk cannot end at the origin)';
    return {
        shown: `${shown} ${of} ${n}`,
        seed: String(seed),
        rms: `${fmt(shown > 0 ? Math.sqrt(sumSquares / shown) : 0, 2, language)}, ${byLaw} ${fmt(Math.sqrt(steps), 2, language)}`,
        'mean-abs': `${fmt(shown > 0 ? sumAbs / shown : 0, 3, language)}, ${byLaw} ${fmt(law.meanAbs, 4, language)}`,
        zeros: steps % 2 === 1 ? `${zeros} ${odd}` : `${zeros}, ${expected} ${fmt(law.zeroMass * shown, 1, language)}`,
    };
}

function walkStatus(run: Run, language: Language): string {
    const {seed, n, shown, steps} = run;
    const {zeros} = sumsOf(seed, shown, steps);
    return language === 'sl' ? `Sprehodov ${shown} od ${n}, končanih v izhodišču ${zeros}.` : `Walks ${shown} of ${n}, ending at the origin ${zeros}.`;
}

const run = (seed: number, n: number, shown: number, steps: number): Run => ({seed, n, shown, steps});
/** The opening of each step: seed 42 and 100 steps are the walk defaults; the steps differ in the number of walks, the playback position and (the exploration) seed and steps. */
const SCENES: Record<string, Run> = {
    'rs4-one-walk': run(42, 1, 0, 100),
    'rs4-ten-walks': run(42, 1, 1, 100),
    'rs4-law': run(42, 10, 10, 100),
    'rs4-parity': run(42, 1000, 1000, 100),
    'rs4-doubling': run(42, 1000, 1000, 100),
    'rs4-explore': run(7, 1000, 1000, 400),
};

// ---- the graph --------------------------------------------------------------------------------------------------------------------------

/** A frame clock the test fires by hand: each firing is one animation frame at the given time. */
class FakeClock implements AnimationScheduler {
    private callback?: FrameRequestCallback;
    private handle = 0;
    private time = 0;
    request(callback: FrameRequestCallback) { this.callback = callback; return ++this.handle; }
    cancel() { this.callback = undefined; }
    /** One frame, a long time after the last one, so the next playback stop is always due. */
    frame() { const callback = this.callback; this.callback = undefined; this.time += 1_000_000; callback?.(this.time); }
    get waiting() { return this.callback !== undefined; }
}
class ClockedSimulation extends SimulationGraph {
    readonly clock = new FakeClock();
    protected override animationScheduler() { return this.clock; }
}

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutLabels = () => [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
const status = () => document.querySelector('[data-random-status]')?.textContent ?? null;
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;

function mountSimulation() {
    const graph = new ClockedSimulation();
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
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    const type = (label: string, value: string) => typeControl(label, value, (name, text) => act(() => { enterNumber(field(name), text); }));
    const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
    /** Presses Play and fires frames until the playback ends; returns the positions it stopped at. */
    const playToEnd = (): number[] => {
        press(t('play'));
        const stops = [graph.state.shown];
        for (let guard = 0; guard < 40 && graph.clock.waiting; guard += 1) {
            act(() => { graph.clock.frame(); });
            if (stops[stops.length - 1] !== graph.state.shown) stops.push(graph.state.shown);
        }
        return stops;
    };
    return {graph, mounted, capabilities, scene, restore, free, type, press, playToEnd};
}
type Mounted = ReturnType<typeof mountSimulation>;

function expectRows(id: string, rows: Record<string, string>) {
    for (const [row, text] of Object.entries(rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
}
const stateOf = (m: Mounted) => m.graph.state as unknown as Record<string, unknown>;
const withMounted = (body: (m: Mounted) => void) => {
    const m = mountSimulation();
    try { body(m); } finally { m.mounted.view.unmount(); }
};

describe.each(LANGUAGES)('RS4 scenes (%s)', language => {
    test('every scene lands in the stated state, readouts and status, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
        setLanguage(language);
        withMounted(m => {
            const ids = Object.keys(SCENES);
            expect(rs4Lesson.steps.map(step => step.id)).toEqual(ids);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const opening = SCENES[id];
                m.scene(rs4Lesson, id, 2);
                expect({id, mode: stateOf(m).mode, seed: stateOf(m).seed, n: stateOf(m).n, shown: stateOf(m).shown, walkSteps: stateOf(m).walkSteps})
                    .toEqual({id, mode: 'walk', seed: opening.seed, n: opening.n, shown: opening.shown, walkSteps: opening.steps});
                expectRows(id, walkRows(opening, language));
                expect({id, status: status()}).toEqual({id, status: walkStatus(opening, language)});
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        });
    });

    test('the controls, buttons and readouts a step names (prompt or explanation) are the labels of the graph', () => {
        setLanguage(language);
        const normal = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[()]/g, '').replace(/\s+/g, ' ');
        const caption = t('random_graph_cap_walks', {value0: '@'}).split('@')[0].replace(/:\s*$/, '');
        const named: Record<string, string[]> = {
            'rs4-one-walk': [t('random_graph_r_mean_abs'), t('play'), t('next_step')],
            'rs4-ten-walks': [t('random_graph_r_mean_abs'), caption, t('random_graph_cap_funnel'), t('random_name_walks'), t('random_graph_r_rms'), t('random_graph_r_zeros')],
            'rs4-law': [t('random_graph_r_rms'), t('random_graph_r_mean_abs'), t('random_graph_r_zeros'), t('random_name_walks'), t('random_graph_cap_funnel'), t('random_graph_cap_walk_exact'), t('random_graph_cap_walk_heap')],
            'rs4-parity': [t('random_graph_r_rms'), t('random_graph_r_mean_abs'), t('random_graph_r_zeros'), t('random_name_walk_steps')],
            'rs4-doubling': [t('random_graph_r_rms'), t('random_graph_r_mean_abs'), t('random_name_walk_steps')],
            'rs4-explore': [t('random_graph_r_rms'), t('random_graph_seed_label'), t('random_name_walk_steps'), t('random_name_walks')],
        };
        expect(Object.keys(named)).toEqual(rs4Lesson.steps.map(step => step.id));
        for (const step of rs4Lesson.steps) {
            const prompt = normal(`${step.explanation[language]} ${step.observationPrompt[language]}`);
            for (const label of named[step.id]) expect({id: step.id, label, named: prompt.includes(label)}).toEqual({id: step.id, label, named: true});
        }
        // the worked example names the readout it explains
        expect(normal(rs4Lesson.workedExamples![0].check![language])).toContain(t('random_graph_r_zeros'));
        // the graph itself has those labels: readout names, fields, the playback buttons, and the captions of the drawn lines
        withMounted(m => {
            m.scene(rs4Lesson, 'rs4-law');
            const labels = readoutLabels();
            for (const label of [t('random_graph_r_shown'), t('random_graph_r_rms'), t('random_graph_r_mean_abs'), t('random_graph_r_zeros')]) {
                expect({label, present: labels.includes(label)}).toEqual({label, present: true});
            }
            for (const label of [t('random_graph_n_walk'), t('random_graph_seed_label'), t('random_graph_steps_label')]) expect(puckControl(puckKeyOf(label)!)).toBeTruthy();
            for (const label of [t('play'), t('replay'), t('next_step')]) expect(screen.getByRole('button', {name: label})).toBeTruthy();
        });
        for (const key of ['random_graph_cap_funnel', 'random_graph_cap_walk_exact', 'random_graph_cap_walk_heap'] as const) expect(t(key).length).toBeGreaterThan(0);
        expect(caption.length).toBeGreaterThan(0);
    });

    test('no step opens on the state its prompt asks the learner to produce, and each asked change moves the state and the readouts', () => {
        setLanguage(language);
        withMounted(m => {
            const snapshot = () => ({...stateOf(m), rows: [readout('shown'), readout('rms'), readout('mean-abs'), readout('zeros')], status: status()});
            const opening = (id: string) => { m.scene(rs4Lesson, id); return stateOf(m); };
            // step 1 asks to play the walk: it opens on nothing drawn
            expect(opening('rs4-one-walk').shown).toBe(0);
            // step 2 asks 10 walks, step 3 asks 1000, step 4 asks 99 steps, step 5 asks 200 steps
            expect(opening('rs4-ten-walks').n).toBe(1);
            expect(opening('rs4-law').n).toBe(10);
            expect(opening('rs4-parity').walkSteps).toBe(100);
            expect(opening('rs4-doubling').walkSteps).toBe(100);
            m.scene(rs4Lesson, 'rs4-one-walk'); const before1 = snapshot(); m.press(t('next_step')); expect(snapshot()).not.toEqual(before1);
            m.scene(rs4Lesson, 'rs4-ten-walks'); const before2 = snapshot(); m.type(t('random_graph_n_walk'), '10'); expect(snapshot()).not.toEqual(before2);
            m.scene(rs4Lesson, 'rs4-law'); const before3 = snapshot(); m.type(t('random_graph_n_walk'), '1000'); expect(snapshot()).not.toEqual(before3);
            m.scene(rs4Lesson, 'rs4-parity'); const before4 = snapshot(); m.type(t('random_graph_steps_label'), '99'); expect(snapshot()).not.toEqual(before4);
            m.scene(rs4Lesson, 'rs4-doubling'); const before5 = snapshot(); m.type(t('random_graph_steps_label'), '200'); expect(snapshot()).not.toEqual(before5);
        });
    });

    test('the changes the text asks for give the readouts it quotes: playback of one walk, typed walk counts and step counts, and the explore setting', () => {
        setLanguage(language);
        withMounted(m => {
            const at = (seed: number, n: number, shown: number, steps: number) => walkRows(run(seed, n, shown, steps), language);
            // step 1: Next step shows the one walk (stops of n = 1), then, from the opening again, Play to the end
            expect(playbackStops(1)).toEqual([0, 1]);
            m.scene(rs4Lesson, 'rs4-one-walk'); m.press(t('next_step'));
            expect(stateOf(m).shown).toBe(1); expectRows('rs4-one-walk', at(42, 1, 1, 100));
            expect({status: status()}).toEqual({status: walkStatus(run(42, 1, 1, 100), language)});
            m.scene(rs4Lesson, 'rs4-one-walk');
            expect(m.playToEnd()).toEqual([0, 1]);
            expectRows('rs4-one-walk', at(42, 1, 1, 100));
            // step 2: 10 typed, everything shown at once
            m.scene(rs4Lesson, 'rs4-ten-walks'); m.type(t('random_graph_n_walk'), '10');
            expect(stateOf(m).shown).toBe(10); expectRows('rs4-ten-walks', at(42, 10, 10, 100));
            // step 3: 1000 typed
            m.scene(rs4Lesson, 'rs4-law'); m.type(t('random_graph_n_walk'), '1000');
            expect(stateOf(m).shown).toBe(1000); expectRows('rs4-law', at(42, 1000, 1000, 100));
            expect({status: status()}).toEqual({status: walkStatus(run(42, 1000, 1000, 100), language)});
            // step 4: 99 steps typed keeps the walks and the position; no walk ends at 0 (the readout says why)
            m.scene(rs4Lesson, 'rs4-parity'); m.type(t('random_graph_steps_label'), '99');
            expect([stateOf(m).n, stateOf(m).shown, stateOf(m).walkSteps]).toEqual([1000, 1000, 99]);
            expectRows('rs4-parity', at(42, 1000, 1000, 99));
            expect(sumsOf(42, 1000, 99).zeros).toBe(0);
            // step 5: 200 steps typed
            m.scene(rs4Lesson, 'rs4-doubling'); m.type(t('random_graph_steps_label'), '200');
            expect([stateOf(m).n, stateOf(m).shown, stateOf(m).walkSteps]).toEqual([1000, 1000, 200]);
            expectRows('rs4-doubling', at(42, 1000, 1000, 200));
            // step 6: the explore scene, then another seed, another count of steps and walks of the learner's choice
            m.scene(rs4Lesson, 'rs4-explore'); m.type(t('random_graph_seed_label'), '43'); expectRows('rs4-explore', at(43, 1000, 1000, 400));
            m.type(t('random_graph_steps_label'), '100'); expectRows('rs4-explore', at(43, 1000, 1000, 100));
            m.type(t('random_graph_n_walk'), '100'); expectRows('rs4-explore', at(43, 100, 100, 100));
        });
    });
});

// ---- a predicting step does not print its own answer ---------------------------------------------------------------------------------------

const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));

/** The numbers the learner is asked to produce in each step (unsigned); step 6 asks none. */
const ANSWERS: Record<string, readonly number[]> = {
    'rs4-one-walk': [10],
    'rs4-ten-walks': [10.68, 9.4],
    'rs4-law': [68, 79.6, 10.31, 8.218],
    'rs4-parity': [10.15, 8.19, 9.95],
    'rs4-doubling': [13.78, 14.14, 11.086, 11.2697, 56, 56.3],
};
const proseNumber = (value: number, language: Language) => (language === 'sl' ? String(value).replace('.', ',') : String(value));

test('a predicting step does not render, in its explanation, formula blocks or worked example, the answer its own expected observation quotes', () => {
    for (const step of rs4Lesson.steps) {
        const answers = ANSWERS[step.id];
        if (!answers) continue;
        const formulas = (rs4Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
        const examples = (rs4Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
        for (const language of LANGUAGES) {
            const rendered = [
                step.explanation[language], step.purpose[language],
                ...formulas.flatMap(block => [block.latex, block.notation[language], block.explanation[language]]),
                ...examples.flatMap(example => [example.calculationLatex, example.resultLatex, example.check?.[language] ?? '']),
            ].join(' ');
            // each answer is quoted by the step's own expected observation (so the list above is the right one) and absent from everything rendered before the prediction
            const observation = step.expectedObservations.map(o => o[language]).join(' ');
            for (const answer of answers) {
                const value = proseNumber(answer, language);
                expect({id: step.id, language, value, quotedByObservation: hasNumber(observation, value)}).toEqual({id: step.id, language, value, quotedByObservation: true});
                expect({id: step.id, language, value, rendered: hasNumber(rendered, value)}).toEqual({id: step.id, language, value, rendered: false});
            }
        }
    }
});

// ---- Part B: every number the text quotes, from the kernel runner at the stated seed or from exact arithmetic ----------------------------------

interface Quote {readonly value: number; readonly digits: number; readonly sign?: '-' | '+'}
const q = (value: number, digits = 0, sign?: '-' | '+'): Quote => ({value, digits, sign});

/** The position where the first walk of a seed ends (from the kernel runner: the walk with k up-steps ends at 2k - steps). */
function firstEnd(seed: number, steps: number): number {
    const out = new Uint32Array(steps + 1);
    runWalks(seed, 1, steps, out);
    return 2 * out.findIndex(count => count === 1) - steps;
}

type Which = 'rms' | 'lawRms' | 'mean' | 'lawMean' | 'zeros' | 'expZeros';
/** The quoted readouts of a run (walks `n`, all shown, `steps` per walk), recomputed from `runWalks` and the exact law. */
function walkQuotes(seed: number, walks: number, steps: number, which: readonly Which[]): Quote[] {
    const {sumSquares, sumAbs, zeros} = sumsOf(seed, walks, steps);
    const law = lawOf(steps);
    const all: Record<Which, Quote> = {
        rms: q(Math.sqrt(sumSquares / walks), 2), lawRms: q(Math.sqrt(steps), 2), mean: q(sumAbs / walks, 3), lawMean: q(law.meanAbs, 4),
        zeros: q(zeros), expZeros: q(law.zeroMass * walks, 1),
    };
    return which.map(key => all[key]);
}
const textOf = (quote: Quote, language: Language) => proseNumber(Number(quote.value.toFixed(quote.digits)), language);
const hasSigned = (text: string, quote: Quote, language: Language) => hasNumber(text, `${quote.sign ?? ''}${textOf(quote, language)}`);
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);

// exact arithmetic by BigInt: C(100, 50) / 2^100 and the mean |S_n| of the shifted binomial law
const binom = (n: number, k: number): bigint => { let result = 1n; for (let i = 1; i <= k; i += 1) result = result * BigInt(n - k + i) / BigInt(i); return result; };
const P100 = Number(binom(100, 50) * 10n ** 12n / 2n ** 100n) / 1e12;
function exactMeanAbs(n: number): number {
    let sum = 0n;
    for (let k = 0; k <= n; k += 1) sum += BigInt(Math.abs(2 * k - n)) * binom(n, k);
    return Number(sum * 10n ** 12n / 2n ** BigInt(n)) / 1e12;
}
const EXPECTED_ZEROS_1000 = 1000 * P100;
const SD_ZEROS_1000 = Math.sqrt(1000 * P100 * (1 - P100));
const RATIO_RUN = Number(sumsOf(42, 1000, 200).sumSquares) > 0 ? Math.sqrt(sumsOf(42, 1000, 200).sumSquares / 1000) / Math.sqrt(sumsOf(42, 1000, 100).sumSquares / 1000) : 0;

const STEP_QUOTES: Record<string, readonly Quote[]> = {
    'rs4-one-walk': [q(firstEnd(42, 100), 0, '+'), ...walkQuotes(42, 1, 100, ['rms', 'mean', 'zeros']), q(42), q(100)],
    'rs4-ten-walks': [q(firstEnd(42, 100), 0, '+'), ...walkQuotes(42, 1, 100, ['mean', 'lawMean', 'lawRms']), ...walkQuotes(42, 10, 100, ['rms', 'lawRms', 'mean', 'lawMean', 'zeros', 'expZeros']), q(42), q(100)],
    'rs4-law': [...walkQuotes(42, 10, 100, ['rms', 'mean', 'zeros', 'lawRms', 'lawMean', 'expZeros']), ...walkQuotes(42, 1000, 100, ['rms', 'lawRms', 'mean', 'lawMean', 'zeros', 'expZeros']), q(Math.sqrt(100)), q(Math.sqrt(2 / Math.PI), 1)],
    'rs4-parity': [...walkQuotes(42, 1000, 100, ['rms', 'lawRms', 'mean', 'lawMean', 'zeros', 'expZeros']), ...walkQuotes(42, 1000, 99, ['rms', 'lawRms', 'mean', 'lawMean', 'zeros']), q(P100, 4), q(Math.round(P100 * 100)), q(EXPECTED_ZEROS_1000, 1), q(SD_ZEROS_1000, 1)],
    'rs4-doubling': [...walkQuotes(42, 1000, 99, ['rms', 'lawRms', 'zeros']), ...walkQuotes(42, 1000, 100, ['rms', 'lawRms', 'mean', 'lawMean']), ...walkQuotes(42, 1000, 200, ['rms', 'lawRms', 'mean', 'lawMean', 'zeros', 'expZeros'])],
    'rs4-explore': [...walkQuotes(42, 1000, 200, ['rms', 'lawRms', 'mean', 'lawMean']), ...walkQuotes(42, 1000, 100, ['rms']), q(RATIO_RUN, 2), q(Math.SQRT2, 2), ...walkQuotes(7, 1000, 400, ['rms', 'lawRms', 'mean', 'lawMean', 'zeros', 'expZeros']), q(Math.sqrt(400))],
};
/** Decimals that are constants of the argument (the worked example and the shares), not readouts. */
const ARITHMETIC = [q(P100, 4), q(1 - P100, 4), q(EXPECTED_ZEROS_1000, 1), q(SD_ZEROS_1000, 1), q(Math.sqrt(2 / Math.PI), 1), q(Math.sqrt(99), 2), q(10 * Math.SQRT2, 2), q(Math.SQRT2, 2)];
const allowedFor = (step: string) => new Set([...STEP_QUOTES[step], ...ARITHMETIC].map(quote => textOf(q(Math.abs(quote.value), quote.digits), 'en')));

describe('RS4 quoted numbers (kernel runner and exact arithmetic)', () => {
    test('every readout a step quotes is the kernel run at the stated seed, with its sign, in sl (decimal comma) and en (decimal point); no sl text has an English decimal; no en decimal is unaccounted', () => {
        for (const step of rs4Lesson.steps) {
            const examples = (rs4Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
            const formulas = (rs4Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
            for (const language of LANGUAGES) {
                const everything = [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language],
                    ...step.expectedObservations.map(o => o[language]), ...examples.map(example => example.check?.[language] ?? ''), ...formulas.flatMap(block => [block.explanation[language], block.notation[language]])].join(' ');
                for (const quote of STEP_QUOTES[step.id]) {
                    const found = quote.sign ? hasSigned(everything, quote, language) : hasNumber(everything, textOf(quote, language));
                    const label = `${quote.sign ?? ''}${textOf(quote, language)}`;
                    expect({id: step.id, language, value: label, found}).toEqual({id: step.id, language, value: label, found: true});
                }
                if (language === 'sl') expect({id: step.id, english: decimalsIn(everything)}).toEqual({id: step.id, english: []});
                else expect({id: step.id, unaccounted: decimalsIn(everything).filter(value => !allowedFor(step.id).has(value))}).toEqual({id: step.id, unaccounted: []});
            }
        }
    });

    test('the quoted readouts of every run are the runner values at the stated seeds', () => {
        const rounded = (seed: number, walks: number, steps: number) => {
            const {sumSquares, sumAbs, zeros} = sumsOf(seed, walks, steps);
            return [Number(Math.sqrt(sumSquares / walks).toFixed(2)), Number((sumAbs / walks).toFixed(3)), zeros];
        };
        expect(rounded(42, 1, 100)).toEqual([10, 10, 0]);
        expect(rounded(42, 10, 100)).toEqual([10.68, 9.4, 0]);
        expect(rounded(42, 1000, 100)).toEqual([10.31, 8.218, 68]);
        expect(rounded(42, 1000, 99)).toEqual([10.15, 8.19, 0]);
        expect(rounded(42, 1000, 200)).toEqual([13.78, 11.086, 56]);
        expect(rounded(7, 1000, 400)).toEqual([18.99, 15.174, 45]);
        expect(firstEnd(42, 100)).toBe(10);
    });

    test('the arithmetic of the argument: C(100, 50)/2^100 by BigInt, the exact mean |S_n|, sqrt n, sqrt 2 times 10, zero walks at odd n, the worked example', () => {
        expect(binom(100, 50)).toBe(100891344545564193334812497256n);
        expect(Number(P100.toFixed(4))).toBe(0.0796);
        expect(Number((1000 * P100).toFixed(1))).toBe(79.6);
        expect(Number(SD_ZEROS_1000.toFixed(1))).toBe(8.6);
        expect(Number((1 - P100).toFixed(4))).toBe(0.9204);
        expect(Math.round(P100 * 100)).toBe(8);
        // the exact mean distance of the law: the BigInt sum agrees with the shifted binomial law of the graph's comparator and with the quoted values
        expect([100, 99, 200, 400].map(n => Number(exactMeanAbs(n).toFixed(4)))).toEqual([7.9589, 7.9589, 11.2697, 15.9477]);
        expect([100, 99, 200, 400].map(n => Number(lawOf(n).meanAbs.toFixed(4)))).toEqual([7.9589, 7.9589, 11.2697, 15.9477]);
        // the mean distance is below the root mean square, about sqrt(2n/pi) = 0.8 sqrt n
        expect(Number(Math.sqrt(2 / Math.PI).toFixed(1))).toBe(0.8);
        expect(Math.sqrt(2 * 100 / Math.PI)).toBeGreaterThan(7.95);
        expect(Math.sqrt(2 * 100 / Math.PI)).toBeLessThan(8);
        expect(exactMeanAbs(100)).toBeLessThan(Math.sqrt(100));
        // sqrt n: 10, 9.95, 14.14, 20, and the ratio of the law is exactly sqrt 2, while the quoted run ratio 13.78/10.31 is smaller
        expect([100, 99, 200, 400].map(n => Number(Math.sqrt(n).toFixed(2)))).toEqual([10, 9.95, 14.14, 20]);
        expect(Math.sqrt(200) / Math.sqrt(100)).toBeCloseTo(Math.SQRT2, 12);
        expect(Number((10 * Math.SQRT2).toFixed(2))).toBe(14.14);
        expect(Number(Math.SQRT2.toFixed(2))).toBe(1.41);
        expect(Number((13.78 / 10.31).toFixed(2))).toBe(1.34);
        expect(RATIO_RUN).toBeLessThan(Math.SQRT2);
        // no walk with an odd number of steps ends at 0: no position 0 in the law, and none in any run of the runner
        expect(walkLaw(99).positions).not.toContain(0);
        for (let seed = 0; seed < 10; seed += 1) expect({seed, zeros: sumsOf(seed, 50, 99).zeros}).toEqual({seed, zeros: 0});
        expect(lawOf(99).zeroMass).toBe(0);
        // the worked example: the quoted stages in the latex, and the zero mass of the exact law equals the BigInt ratio
        expect(lawOf(100).zeroMass).toBeCloseTo(P100, 10);
        const example = rs4Lesson.workedExamples![0];
        expect(example.calculationLatex).toContain('\\binom{100}{50}2^{-100}\\approx0{,}0796');
        expect(example.calculationLatex).toContain('1000\\cdot0{,}0796\\approx79{,}6');
        expect(example.calculationLatex).toContain('\\sqrt{1000\\cdot0{,}0796\\cdot0{,}9204}\\approx8{,}6');
        expect(example.resultLatex).toContain('79{,}6\\pm8{,}6');
        // edge case: one walk, the rms is the distance of its end
        expect(Math.sqrt(sumsOf(42, 1, 100).sumSquares)).toBe(Math.abs(firstEnd(42, 100)));
    });

    test('rounded numbers carry an approximation word or sign in sl and en', () => {
        const all = (language: Language) => [rs4Lesson.formulaBlocks!.map(block => block.explanation[language]), rs4Lesson.steps.flatMap(step => [step.explanation[language], ...step.expectedObservations.map(o => o[language])]),
            rs4Lesson.workedExamples!.map(example => example.check![language])].flat().join(' ');
        const latex = rs4Lesson.workedExamples![0].calculationLatex;
        expect(latex).toContain('\\approx79{,}6');
        for (const [sl, en] of [
            ['približno \\(8\\,\\%\\)', 'about \\(8\\,\\%\\)'],
            ['\\(P\\approx0{,}0796\\)', '\\(P\\approx0.0796\\)'],
            ['približno \\(8{,}6\\)', 'about \\(8.6\\)'],
            ['\\sqrt{99}\\approx9{,}95', '\\sqrt{99}\\approx9.95'],
            ['10\\sqrt2\\approx14{,}14', '10\\sqrt2\\approx14.14'],
            ['\\approx1{,}34', '\\approx1.34'],
            ['\\sqrt2\\approx1{,}41', '\\sqrt2\\approx1.41'],
            ['približno \\(\\sqrt{2n/\\pi}\\approx0{,}8\\sqrt n\\)', 'about \\(\\sqrt{2n/\\pi}\\approx0.8\\sqrt n\\)'],
        ] as const) {
            if (!all('sl').includes(sl)) expect({language: 'sl', missing: sl}).toEqual({language: 'sl', missing: null});
            if (!all('en').includes(en)) expect({language: 'en', missing: en}).toEqual({language: 'en', missing: null});
        }
    });

    test('lesson-level text: no English decimal in sl, no decimal point in the en text that is not a quoted number', () => {
        const texts = [...rs4Lesson.learningGoals, ...rs4Lesson.prerequisites, ...rs4Lesson.edgeCases, rs4Lesson.summary, rs4Lesson.title];
        expect(texts.flatMap(text => decimalsIn(text.sl))).toEqual([]);
        expect(texts.flatMap(text => decimalsIn(text.en))).toEqual([]);
    });
});
