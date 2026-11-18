/**
 * RS3 (randomness, batch B: Monte Carlo area and the number pi). Part A: every scene lands in the state, readouts and status line the text states (the real simulation graph, scenes
 * applied in one synchronous `act` from a restored checkpoint, out of order and twice, in sl and en), the labels a prompt names are labels of the graph, no step opens on the state
 * its prompt asks the learner to produce, the actions the text asks for (typing a field, pressing the playback buttons, a seed, the shape) give the readouts the text quotes, and a
 * predicting step does not print its own answer. The expected readouts are computed here from the kernel runner `runArea` (the inside count of the first `shown` points of a seed)
 * and the exact formulas, not with the graph. Part B (the quoted numbers) follows below.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {rs3Lesson} from './randomnessAreaGuidedLessons';
import type {GuidedLesson} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {SimulationGraph} from '../../graphs/random/SimulationGraph';
import type {AnimationScheduler} from '../runtime/animation';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';
import {runArea} from '../../random/runners';
import {nextStop, playbackStops} from '../../random/randomModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- expected readouts, from the kernel runner and exact formulas -----------------------------------------------------------------------

const MINUS = '−';
/** A readout number as the graph prints it: rounded to `digits`, trailing zeros dropped, the true minus sign, a decimal comma in sl. */
function fmt(value: number, digits: number, language: Language): string {
    const text = Number(value.toFixed(digits)).toString().replace('-', MINUS);
    return language === 'sl' ? text.replace('.', ',') : text;
}
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');

/** The points inside the quarter circle among the first `shown` points of the seed (the kernel runner, not the graph). */
function insideOf(seed: number, shown: number): number {
    const out = new Uint32Array(1);
    runArea(seed, shown, out);
    return out[0];
}
const P = Math.PI / 4;
const standardError = (shown: number) => (shown > 0 ? 4 * Math.sqrt(P * (1 - P) / shown) : 0);

interface Run {readonly seed: number; readonly n: number; readonly shown: number}

function areaRows(run: Run, language: Language): Record<string, string> {
    const {seed, n, shown} = run;
    const inside = shown > 0 ? insideOf(seed, shown) : 0;
    const of = language === 'sl' ? 'od' : 'of';
    const estimate = shown > 0 ? 4 * inside / shown : 0;
    const none = language === 'sl' ? 'ni na voljo' : 'unavailable';
    return {
        shown: `${shown} ${of} ${n}`,
        seed: String(seed),
        inside: `${inside} ${of} ${shown}`,
        share: shown > 0 ? fmt(inside / shown, 4, language) : none,
        estimate: shown > 0 ? fmt(estimate, 4, language) : none,
        error: shown > 0 ? fmt(estimate - Math.PI, 4, language) : none,
        typical: shown > 0 ? `± ${fmt(standardError(shown), 4, language)}` : none,
    };
}

function areaStatus(run: Run, language: Language): string {
    const {seed, n, shown} = run;
    if (shown <= 0) return language === 'sl' ? `Točk 0 od ${n}: opazovanj še ni, zato ocene števila π ni.` : `Points 0 of ${n}: no observations yet, so there is no estimate of π.`;
    const inside = shown > 0 ? insideOf(seed, shown) : 0;
    const estimate = fmt(shown > 0 ? 4 * inside / shown : 0, 4, language);
    return language === 'sl'
        ? `Točk ${shown} od ${n}, v krogu ${inside}, ocena števila π ${estimate}.`
        : `Points ${shown} of ${n}, inside the circle ${inside}, estimate of π ${estimate}.`;
}

interface SceneExpectation {readonly run: Run; readonly shape: 'quarter' | 'disc'}
const SCENES: Record<string, SceneExpectation> = {
    'rs3-square': {run: {seed: 42, n: 100, shown: 0}, shape: 'quarter'},
    'rs3-more-points': {run: {seed: 42, n: 100, shown: 100}, shape: 'quarter'},
    'rs3-error-scale': {run: {seed: 42, n: 10000, shown: 10000}, shape: 'quarter'},
    'rs3-replay-seeds': {run: {seed: 42, n: 10000, shown: 10000}, shape: 'quarter'},
    'rs3-whole-circle': {run: {seed: 42, n: 1000, shown: 1000}, shape: 'quarter'},
    'rs3-explore': {run: {seed: 7, n: 1000, shown: 1000}, shape: 'disc'},
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
    const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
    const choose = (label: string, value: string) => act(() => { fireEvent.change(field(label), {target: {value}}); });
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
    return {graph, mounted, capabilities, scene, restore, free, type, choose, press, playToEnd};
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

describe.each(LANGUAGES)('RS3 scenes (%s)', language => {
    test('every scene lands in the stated state, readouts and status, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
        setLanguage(language);
        withMounted(m => {
            const ids = Object.keys(SCENES);
            expect(rs3Lesson.steps.map(step => step.id)).toEqual(ids);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const {run, shape} = SCENES[id];
                m.scene(rs3Lesson, id, 2);
                expect({id, mode: stateOf(m).mode, seed: stateOf(m).seed, n: stateOf(m).n, shown: stateOf(m).shown, areaShape: stateOf(m).areaShape})
                    .toEqual({id, mode: 'area', seed: run.seed, n: run.n, shown: run.shown, areaShape: shape});
                expectRows(id, areaRows(run, language));
                expect({id, status: status()}).toEqual({id, status: areaStatus(run, language)});
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        });
    });

    test('the controls, buttons and readouts a step names (prompt or explanation) are the labels of the graph', () => {
        setLanguage(language);
        const normal = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[()]/g, '').replace(/\\pi/g, 'π').replace(/\s+/g, ' ');
        const named: Record<string, string[]> = {
            'rs3-square': [t('random_graph_cap_truth'), t('random_graph_r_shown'), t('random_graph_r_inside'), t('random_graph_r_pi_estimate'), t('play'), t('next_step')],
            'rs3-more-points': [t('random_graph_r_se'), t('random_graph_n_area'), t('random_graph_r_pi_estimate'), t('random_graph_r_pi_error')],
            'rs3-error-scale': [t('random_graph_r_se'), t('random_graph_n_area')],
            'rs3-replay-seeds': [t('replay'), t('play'), t('random_graph_r_shown'), t('random_graph_seed_label')],
            'rs3-whole-circle': [t('random_graph_r_inside'), t('random_graph_r_pi_estimate'), t('random_graph_shape_label'), t('random_graph_shape_disc')],
            'rs3-explore': [t('random_graph_r_se')],
        };
        for (const step of rs3Lesson.steps) {
            const prompt = normal(`${step.explanation[language]} ${step.observationPrompt[language]}`);
            for (const label of named[step.id]) expect({id: step.id, label, named: prompt.includes(label)}).toEqual({id: step.id, label, named: true});
        }
        // the graph itself has those labels: readout names, fields, the shape list and its options, the playback buttons
        withMounted(m => {
            m.scene(rs3Lesson, 'rs3-whole-circle');
            const labels = readoutLabels();
            for (const label of [t('random_graph_r_shown'), t('random_graph_r_inside'), t('random_graph_r_pi_estimate'), t('random_graph_r_pi_error'), t('random_graph_r_se')]) {
                expect({label, present: labels.includes(label)}).toEqual({label, present: true});
            }
            for (const label of [t('random_graph_n_area'), t('random_graph_seed_label'), t('random_graph_shape_label')]) expect(field(label)).toBeTruthy();
            const options = [...field(t('random_graph_shape_label')).querySelectorAll('option')].map(option => option.textContent);
            expect(options).toContain(t('random_graph_shape_disc'));
            for (const label of [t('play'), t('replay'), t('next_step')]) expect(screen.getByRole('button', {name: label})).toBeTruthy();
        });
        // the labels of the drawn line and of the caption exist in the catalogue of this language
        expect(t('random_graph_cap_truth')).toContain('π/4');
        expect(t('random_graph_cap_circle_whole').length).toBeGreaterThan(0);
    });

    test('no step opens on the state its prompt asks the learner to produce', () => {
        setLanguage(language);
        withMounted(m => {
            const opening = (id: string) => { m.scene(rs3Lesson, id); return stateOf(m); };
            const snapshot = () => ({...stateOf(m), rows: [readout('inside'), readout('estimate'), readout('typical'), readout('shown')]});
            // step 1 asks to play to the end: it opens on nothing drawn
            expect(opening('rs3-square').shown).toBe(0);
            // step 2 asks 10000 points, step 3 asks 1000, step 4 asks a replay and another seed, step 5 asks the whole circle
            const second = opening('rs3-more-points'); expect(second.n).toBe(100);
            const third = opening('rs3-error-scale'); expect(third.n).toBe(10000);
            const fourth = opening('rs3-replay-seeds'); expect([fourth.seed, fourth.shown]).toEqual([42, 10000]);
            const fifth = opening('rs3-whole-circle'); expect([fifth.areaShape, fifth.n]).toEqual(['quarter', 1000]);
            // and each asked change really moves the state and the readouts away from the opening
            m.scene(rs3Lesson, 'rs3-more-points'); const before2 = snapshot(); m.type(t('random_graph_n_area'), '10000'); expect(snapshot()).not.toEqual(before2);
            m.scene(rs3Lesson, 'rs3-error-scale'); const before3 = snapshot(); m.type(t('random_graph_n_area'), '1000'); expect(snapshot()).not.toEqual(before3);
            m.scene(rs3Lesson, 'rs3-replay-seeds'); const before4 = snapshot(); m.press(t('replay')); expect(snapshot()).not.toEqual(before4);
            m.type(t('random_graph_seed_label'), '7'); expect(snapshot()).not.toEqual(before4);
            m.scene(rs3Lesson, 'rs3-whole-circle'); const before5 = snapshot(); m.choose(t('random_graph_shape_label'), 'disc'); expect(snapshot()).not.toEqual(before5);
        });
    });

    test('the changes the text asks for give the readouts it quotes: playback to 100, typed point counts, replay, seeds, the shape, and the explore seed', () => {
        setLanguage(language);
        withMounted(m => {
            const at = (seed: number, n: number, shown: number) => areaRows({seed, n, shown}, language);
            // step 1: Next step at every stop of n = 100, then (from the opening again) Play to the end
            m.scene(rs3Lesson, 'rs3-square');
            const stops = playbackStops(100);
            expect(stops).toEqual([0, 1, 2, 5, 10, 20, 50, 100]);
            for (const stop of stops.slice(1)) { m.press(t('next_step')); expect(stateOf(m).shown).toBe(stop); expectRows('rs3-square', at(42, 100, stop)); }
            expect(stripped(readout('inside'))).toBe(stripped(language === 'sl' ? '76 od 100' : '76 of 100'));
            m.scene(rs3Lesson, 'rs3-square');
            expect(m.playToEnd()).toEqual(stops);
            expectRows('rs3-square', at(42, 100, 100));
            // step 2: 10000 typed, everything shown at once
            m.scene(rs3Lesson, 'rs3-more-points'); m.type(t('random_graph_n_area'), '10000');
            expect(stateOf(m).shown).toBe(10000); expectRows('rs3-more-points', at(42, 10000, 10000));
            // step 3: 1000 typed, then back to 10000
            m.scene(rs3Lesson, 'rs3-error-scale'); m.type(t('random_graph_n_area'), '1000');
            expectRows('rs3-error-scale', at(42, 1000, 1000));
            m.type(t('random_graph_n_area'), '10000'); expectRows('rs3-error-scale', at(42, 10000, 10000));
            // step 4: Replay empties the run (Play is not pressed by it), Play brings back the same readouts, then seed 7 and seed 43 keep all 10000 shown
            m.scene(rs3Lesson, 'rs3-replay-seeds'); m.press(t('replay'));
            expectRows('rs3-replay-seeds', at(42, 10000, 0));
            const played = m.playToEnd();
            expect(played[0]).toBe(0); expect(played[played.length - 1]).toBe(10000); expect(played).toEqual(playbackStops(10000));
            expectRows('rs3-replay-seeds', at(42, 10000, 10000));
            m.type(t('random_graph_seed_label'), '7'); expect(stateOf(m).shown).toBe(10000); expectRows('rs3-replay-seeds', at(7, 10000, 10000));
            m.type(t('random_graph_seed_label'), '43'); expect(stateOf(m).shown).toBe(10000); expectRows('rs3-replay-seeds', at(43, 10000, 10000));
            // step 5: the shape changes nothing in the readouts (the same sample quarter is mirrored) and keeps the position
            m.scene(rs3Lesson, 'rs3-whole-circle'); const quarter = areaRows({seed: 42, n: 1000, shown: 1000}, language);
            m.choose(t('random_graph_shape_label'), 'disc');
            expect(stateOf(m).areaShape).toBe('disc'); expect(stateOf(m).shown).toBe(1000); expectRows('rs3-whole-circle', quarter);
            expect({status: status()}).toEqual({status: areaStatus({seed: 42, n: 1000, shown: 1000}, language)});
            // step 6: the explore scene, then another seed and another count of the learner's choice
            m.scene(rs3Lesson, 'rs3-explore'); m.type(t('random_graph_seed_label'), '43'); expectRows('rs3-explore', at(43, 1000, 1000));
            m.type(t('random_graph_n_area'), '100'); expectRows('rs3-explore', at(43, 100, 100));
            expect(stateOf(m).areaShape).toBe('disc');
        });
    });
});

test('playback uses the stops of the run and the next stop is the one Next step shows', () => {
    expect([0, 1, 2, 5, 10, 20, 50].map(shown => nextStop(shown, 100))).toEqual([1, 2, 5, 10, 20, 50, 100]);
});

// ---- a predicting step does not print its own answer ---------------------------------------------------------------------------------------

const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));

/** The numbers the learner is asked to produce in each step (unsigned); step 5 asks for no new number (the answer there is the sameness of the readouts) and step 6 asks none. */
const ANSWERS: Record<string, readonly number[]> = {
    'rs3-square': [76, 0.76, 3.04, 0.1016],
    'rs3-more-points': [7833, 0.7833, 3.1332, 0.0084, 0.0164],
    'rs3-error-scale': [779, 3.116, 0.0519],
    'rs3-replay-seeds': [7858, 3.1432, 0.0016, 7741, 3.0964, 0.0452],
};
const proseNumber = (value: number, language: Language) => (language === 'sl' ? String(value).replace('.', ',') : String(value));

test('a predicting step does not render, in its explanation, formula blocks or worked example, the answer its own expected observation quotes', () => {
    for (const step of rs3Lesson.steps) {
        const answers = ANSWERS[step.id];
        if (!answers) continue;
        const formulas = (rs3Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
        const examples = (rs3Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
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
/** The quoted readouts of a run: the inside count, the share, the estimate, the error (signed) and the typical deviation, all recomputed from `runArea` and the formulas. */
function runQuotes(seed: number, shown: number, which: readonly ('inside' | 'share' | 'estimate' | 'error' | 'typical')[]): Quote[] {
    const inside = insideOf(seed, shown);
    const estimate = 4 * inside / shown;
    const all = {
        inside: q(inside), share: q(inside / shown, 4), estimate: q(estimate, 4),
        error: q(Math.abs(estimate - Math.PI), 4, estimate - Math.PI < 0 ? '-' : '+'), typical: q(standardError(shown), 4),
    };
    return which.map(key => all[key]);
}
const textOf = (quote: Quote, language: Language) => proseNumber(Number(quote.value.toFixed(quote.digits)), language);
const hasSigned = (text: string, quote: Quote, language: Language) => hasNumber(text, `${quote.sign ?? ''}${textOf(quote, language)}`);
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);

const SQRT10 = q(Math.sqrt(10), 2);
const STEP_QUOTES: Record<string, readonly Quote[]> = {
    'rs3-square': [...runQuotes(42, 100, ['inside', 'share', 'estimate', 'error', 'typical']), q(42), q(100)],
    'rs3-more-points': [...runQuotes(42, 10000, ['inside', 'share', 'estimate', 'error', 'typical']), ...runQuotes(42, 100, ['inside', 'share', 'estimate', 'error', 'typical']), q(300)],
    'rs3-error-scale': [...runQuotes(42, 1000, ['inside', 'estimate', 'typical']), ...runQuotes(42, 100, ['typical']), ...runQuotes(42, 10000, ['typical', 'estimate']), SQRT10, q(10), q(100)],
    'rs3-replay-seeds': [...runQuotes(7, 10000, ['inside', 'estimate', 'error']), ...runQuotes(43, 10000, ['inside', 'estimate', 'error']), ...runQuotes(42, 10000, ['inside', 'estimate', 'error', 'typical']), ...runQuotes(42, 1000, ['typical']), q(2.8, 1), q(100)],
    'rs3-whole-circle': [...runQuotes(42, 1000, ['inside', 'estimate', 'error', 'typical']), ...runQuotes(7, 10000, ['estimate']), ...runQuotes(43, 10000, ['estimate', 'error']), q(2.8, 1)],
    'rs3-explore': runQuotes(7, 1000, ['inside', 'share', 'estimate', 'error', 'typical']),
};
/** Decimals that are constants of the argument (areas and the stages of the worked example), not readouts. */
const ARITHMETIC = [q(P, 4), q(1 - P, 4), q(P * (1 - P) / 100, 7), q(Math.sqrt(P * (1 - P) / 100), 5), q(4 * 0.04105, 4), q(standardError(100), 4)];
const allowedFor = (step: string) => new Set([...STEP_QUOTES[step], ...ARITHMETIC].map(quote => textOf(q(Math.abs(quote.value), quote.digits), 'en')));

describe('RS3 quoted numbers (kernel runner and exact arithmetic)', () => {
    test('every readout a step quotes is the kernel run at the stated seed, with its sign, in sl (decimal comma) and en (decimal point); no sl text has an English decimal; no en decimal is unaccounted', () => {
        for (const step of rs3Lesson.steps) {
            const examples = (rs3Lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
            const formulas = (rs3Lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
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

    test('the quoted counts and readouts of every run are the runner values at the stated seeds', () => {
        expect([insideOf(42, 100), insideOf(42, 1000), insideOf(42, 10000)]).toEqual([76, 779, 7833]);
        expect([insideOf(7, 10000), insideOf(43, 10000), insideOf(7, 1000)]).toEqual([7858, 7741, 774]);
        expect([4 * 76 / 100, 4 * 779 / 1000, 4 * 7833 / 10000, 4 * 7858 / 10000, 4 * 7741 / 10000, 4 * 774 / 1000].map(v => Number(v.toFixed(4)))).toEqual([3.04, 3.116, 3.1332, 3.1432, 3.0964, 3.096]);
        const error = (inside: number, shown: number) => Number((4 * inside / shown - Math.PI).toFixed(4));
        expect([error(76, 100), error(7833, 10000), error(779, 1000), error(7858, 10000), error(7741, 10000), error(774, 1000)]).toEqual([-0.1016, -0.0084, -0.0256, 0.0016, -0.0452, -0.0456]);
    });

    test('the arithmetic of the argument: pi/4, 4 sqrt(p(1-p)/n) at the quoted n, the ratio 10 for 100 times the points, sqrt(10), the worked example, 2.8 deviations', () => {
        expect(Number(P.toFixed(4))).toBe(0.7854);
        expect(Number((1 - P).toFixed(4))).toBe(0.2146);
        expect([100, 1000, 10000].map(n => Number(standardError(n).toFixed(4)))).toEqual([0.1642, 0.0519, 0.0164]);
        expect(standardError(100) / standardError(10000)).toBeCloseTo(10, 12);
        expect(standardError(100) / standardError(1000)).toBeCloseTo(Math.sqrt(10), 12);
        expect(standardError(1000) / standardError(10000)).toBeCloseTo(Math.sqrt(10), 12);
        expect(Number(Math.sqrt(10).toFixed(2))).toBe(3.16);
        // the worked example: the rounded stages the latex prints
        expect(Number((0.7854 * 0.2146 / 100).toFixed(7))).toBe(0.0016855);
        expect(Number(Math.sqrt(0.0016855).toFixed(5))).toBe(0.04105);
        expect(Number((4 * 0.04105).toFixed(4))).toBe(0.1642);
        const example = rs3Lesson.workedExamples![0];
        expect(example.calculationLatex).toContain('0{,}7854\\cdot0{,}2146');
        expect(example.calculationLatex).toContain('0{,}0016855');
        expect(example.calculationLatex).toContain('0{,}04105');
        expect(example.resultLatex).toContain('0{,}1642');
        // seed 43 at 10000 points is about 2.8 typical deviations off (a rare run, as the text says)
        const deviations = Math.abs(4 * 7741 / 10000 - Math.PI) / standardError(10000);
        expect(Number(deviations.toFixed(1))).toBe(2.8);
        // edge cases: one point gives a deviation above 1; seed 43 gives the same count as seed 42 at 100 points
        expect(standardError(1)).toBeGreaterThan(1);
        expect(insideOf(43, 100)).toBe(insideOf(42, 100));
    });

    test('rounded numbers carry an approximation word or sign in sl and en', () => {
        const all = (language: Language) => [rs3Lesson.formulaBlocks!.map(block => block.explanation[language]), rs3Lesson.steps.flatMap(step => [step.explanation[language], ...step.expectedObservations.map(o => o[language])])].flat().join(' ');
        expect(all('sl')).toContain('približno \\(0{,}7854\\)');
        expect(all('en')).toContain('about \\(0.7854\\)');
        expect(all('sl')).toContain('\\approx3{,}16');
        expect(all('en')).toContain('\\approx3.16');
        expect(all('sl')).toContain('približno \\(2{,}8\\)');
        expect(all('en')).toContain('about \\(2.8\\)');
    });

    test('lesson-level text: no English decimal in sl, no decimal point in the en text that is not a quoted number', () => {
        const texts = [...rs3Lesson.learningGoals, ...rs3Lesson.prerequisites, ...rs3Lesson.edgeCases, rs3Lesson.summary, rs3Lesson.title];
        expect(texts.flatMap(text => decimalsIn(text.sl))).toEqual([]);
        expect(texts.flatMap(text => decimalsIn(text.en))).toEqual([]);
    });
});
