/**
 * WV1, WV2 and WV3 (waves): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored checkpoint, out of
 * order and twice), and every number a step quotes is bound to its step. The expected values are computed here with closed forms written for this test
 * (A = sqrt(A1^2 + A2^2 + 2 A1 A2 cos dphi), the phase by atan2, the beat frequency |f1 - f2|, the mean (f1 + f2) / 2, the envelope 2 |cos(pi df t)| and the
 * heights of the phasors), not with the waves model or the graph, and compared with the real readouts; the quoted numbers are generated from the same values and
 * looked up in the sl and en prose. The changes the text asks the learner to make are applied as actions and the readouts checked.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {wavesBeatsLesson, wavesStandingLesson, wavesSuperpositionLesson} from './wavesGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {WavesGraph} from '../../graphs/functions/WavesGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- independent closed forms ----------------------------------------------------------------------------------------------------------

const PI = Math.PI;
const rad = (degrees: number) => (degrees * PI) / 180;
const deg = (radians: number) => (radians * 180) / PI;
/** A cos(2 pi f t + phase) with the phase in degrees. */
const height = (a: number, f: number, phase: number, time: number) => a * Math.cos(2 * PI * f * time + rad(phase));
/** The height of the sum of two phasors written out in coordinates: the x components of the rotated arrows. */
const phasorHeight = (a1: number, p1: number, a2: number, p2: number, f: number, time: number) => {
    const angle1 = 2 * PI * f * time + rad(p1);
    const angle2 = 2 * PI * f * time + rad(p2);
    return a1 * Math.cos(angle1) + a2 * Math.cos(angle2);
};
const sumAmplitude = (a1: number, a2: number, delta: number) => Math.sqrt(a1 * a1 + a2 * a2 + 2 * a1 * a2 * Math.cos(rad(delta)));
const sumPhase = (a1: number, p1: number, a2: number, delta: number) => p1 + deg(Math.atan2(a2 * Math.sin(rad(delta)), a1 + a2 * Math.cos(rad(delta))));
const beatFrequency = (f1: number, f2: number) => Math.abs(f1 - f2);
const meanFrequency = (f1: number, f2: number) => (f1 + f2) / 2;
const envelopeAt = (f1: number, f2: number, time: number) => 2 * Math.abs(Math.cos(PI * beatFrequency(f1, f2) * time));
const beatsHeight = (f1: number, f2: number, time: number) => Math.cos(2 * PI * f1 * time) + Math.cos(2 * PI * f2 * time);

// ---- number formats -------------------------------------------------------------------------------------------------------------------

const MINUS = '−';
/** A readout number: up to `digits` decimals, no trailing zeros, decimal comma, true minus sign. */
const readoutNumber = (value: number, digits: number): string => Number(value.toFixed(digits)).toString().replace('-', MINUS).replace('.', ',');
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
function proseNumber(value: number, digits: number, language: 'sl' | 'en'): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
/** Prose with the LaTeX spacing and the decimal-comma braces removed, so that `1{,}189\ \mathrm{s}` reads 1,189 s. */
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ').replace(/\\mathrm\{([^}]*)\}/g, ' $1 ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));
/** Every number with decimals in an English text (the decimal point is the only separator there). */
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mountWaves() {
    const graph = createGraph('waves');
    if (!(graph instanceof WavesGraph)) throw new Error('waves must be the waves graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify({state: graph.state, time: graph.time, playing: graph.playing});
    const scene = (lesson: GuidedLesson, stepId: string, ...extra: LessonAction[]) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
        for (const action of extra) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
type ComponentsAction = Extract<LessonAction, {kind: 'waves'; operation: 'set-components'}>;
const components = (fields: Omit<ComponentsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'waves', operation: 'set-components', ...fields});
const setTime = (value: number): LessonAction => ({kind: 'waves', operation: 'set-time', t: value});

interface SumSetup { readonly a1: number; readonly p1: number; readonly a2: number; readonly p2: number; readonly f: number }
/** The Demonstration default of the sum picture: two waves of amplitude 1 at 3 Hz, phases 0 and 120 degrees. */
const SUM_DEFAULT: SumSetup = {a1: 1, p1: 0, a2: 1, p2: 120, f: 3};
const withSum = (patch: Partial<SumSetup>): SumSetup => ({...SUM_DEFAULT, ...patch});

/** The readout rows of the sum picture at time `time`, from the closed forms. */
function sumRows(c: SumSetup, time: number): Record<string, string> {
    const delta = c.p2 - c.p1;
    const cancels = c.a1 === c.a2 && delta % 360 === 180;
    const noWave = c.a1 === 0 && c.a2 === 0;
    const wrapped = (angle: number) => ((((angle + 180) % 360) + 360) % 360) - 180;
    const first = height(c.a1, c.f, c.p1, time);
    const second = height(c.a2, c.f, c.p2, time);
    return {
        time: `${readoutNumber(time, 2)} s`, frequency: `${c.f} Hz`, 'phase-difference': `${delta}°`,
        'sum-amplitude': cancels ? '0 (izničenje)' : readoutNumber(sumAmplitude(c.a1, c.a2, delta), 3),
        'sum-phase': cancels || noWave ? 'ni določeno' : `${readoutNumber(wrapped(sumPhase(c.a1, c.p1, c.a2, delta)), 2)}°`,
        'amplitude-range': `od ${readoutNumber(Math.abs(c.a1 - c.a2), 2)} do ${readoutNumber(c.a1 + c.a2, 2)}`,
        wave1: readoutNumber(first, 3), wave2: readoutNumber(second, 3), sum: readoutNumber(phasorHeight(c.a1, c.p1, c.a2, c.p2, c.f, time), 3),
    };
}
interface BeatsSetup { readonly f1: number; readonly f2: number }
/** The readout rows of the beats picture (amplitude 1) at time `time`. */
function beatsRows(c: BeatsSetup, time: number): Record<string, string> {
    const difference = beatFrequency(c.f1, c.f2);
    return {
        time: `${readoutNumber(time, 2)} s`, f1: `${c.f1} Hz`, f2: `${c.f2} Hz`, 'beat-frequency': `${difference} Hz`, 'mean-frequency': `${readoutNumber(meanFrequency(c.f1, c.f2), 1)} Hz`,
        'beat-period': difference === 0 ? 'ni utripanja' : `${readoutNumber(1 / difference, 3)} s`,
        envelope: readoutNumber(envelopeAt(c.f1, c.f2, time), 3), sum: readoutNumber(beatsHeight(c.f1, c.f2, time), 3),
    };
}

interface Quote { readonly value: number; readonly digits: number }
const q = (value: number, digits: number): Quote => ({value, digits});

interface Expected {
    readonly state: Readonly<Record<string, unknown>>;
    readonly t: number;
    readonly rows: Record<string, string>;
    /** Numbers the step's expected-state text quotes. */
    readonly quotes: readonly Quote[];
    /** Numbers quoted by the step's explanation, observations or worked example but not by its expected-state text. */
    readonly also?: readonly Quote[];
    /** Numbers with decimals the text asks the learner to set or that name an input (English spelling). */
    readonly inputs?: readonly string[];
}
const sumStep = (c: SumSetup, t: number, quotes: readonly Quote[], also: readonly Quote[] = [], inputs: readonly string[] = []): Expected =>
    ({state: {mode: 'sum', a1: c.a1, p1: c.p1, a2: c.a2, p2: c.p2, f1: c.f}, t, rows: sumRows(c, t), quotes, also, inputs});
const beatsStep = (c: BeatsSetup, t: number, quotes: readonly Quote[], also: readonly Quote[] = [], inputs: readonly string[] = [], showEnvelope = true): Expected =>
    ({state: {mode: 'beats', a1: 1, f1: c.f1, f2: c.f2, showEnvelope}, t, rows: beatsRows(c, t), quotes, also, inputs});

const UNEQUAL = withSum({a1: 3, a2: 2, p2: 90});
const WV1: Record<string, Expected> = {
    'wv1-one-wave': sumStep(withSum({a2: 0, p2: 0}), 0, []),
    'wv1-phase': sumStep(withSum({p2: 60}), 0, [q(sumAmplitude(1, 1, 60), 3)], [], []),
    'wv1-extremes': sumStep(withSum({p2: 180}), 0, []),
    'wv1-same-frequency': sumStep(withSum({}), 0, [q(phasorHeight(1, 0, 1, 120, 3, 0), 1)]),
    'wv1-arrows': sumStep(withSum({}), 0.1, [q(height(1, 3, 0, 0.1), 3), q(height(1, 3, 120, 0.1), 3), q(phasorHeight(1, 0, 1, 120, 3, 0.1), 3)], [], ['0.1']),
    'wv1-amplitudes': sumStep(UNEQUAL, 0, [q(sumAmplitude(3, 2, 90), 3), q(sumPhase(3, 0, 2, 90), 2)], [q(sumAmplitude(3, 2, 60), 3), q(sumPhase(3, 0, 2, 60), 2)]),
    'wv1-explore': sumStep(withSum({f: 5}), 0, []),
};
const BEATS_10_12: BeatsSetup = {f1: 10, f2: 12};
const WV2: Record<string, Expected> = {
    'wv2-close': beatsStep(BEATS_10_12, 0, [], [], [], false),
    'wv2-swell': beatsStep(BEATS_10_12, 0.25, [q(0.25, 2)], [q(0.5, 1)], [], false),
    'wv2-envelope': beatsStep(BEATS_10_12, 0.25, [q(0.25, 2), q(1 / beatFrequency(10, 12), 1)]),
    'wv2-difference': beatsStep({f1: 10, f2: 13}, 0, [q(meanFrequency(10, 13), 1), q(1 / beatFrequency(10, 13), 3)], [q(1 / beatFrequency(10, 14), 2)]),
    'wv2-predict': beatsStep({f1: 10, f2: 11}, 0.5, [q(0.5, 1)], [q(meanFrequency(10, 11), 1)]),
    'wv2-identity': beatsStep(BEATS_10_12, 0.1, [q(0.1, 1), q(beatsHeight(10, 12, 0.1), 3), q(envelopeAt(10, 12, 0.1), 3)], [], ['2.2', '0.2']),
    'wv2-explore': beatsStep({f1: 10, f2: 16}, 0, [q(meanFrequency(10, 16), 0), q(1 / beatFrequency(10, 16), 3)]),
};

const lessons = [
    ['WV1', wavesSuperpositionLesson, WV1, 'superposition-and-phase', 7],
    ['WV2', wavesBeatsLesson, WV2, 'beats', 7],
] as const;

const NEUTRAL: string[] = [];
describe.each(lessons)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('waves')!.lesson(section)!;
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
            }
            const allowed = new Set([...expected.quotes, ...(expected.also ?? [])].map(quote => proseNumber(Math.abs(quote.value), quote.digits, 'en')).concat(expected.inputs ?? [], NEUTRAL));
            const texts = [step.title.en, step.purpose.en, step.explanation.en, step.observationPrompt.en, step.scene!.expectedState.en, ...step.expectedObservations.map(o => o.en), ...calculations, ...formulas];
            const unaccounted = texts.flatMap(decimalsIn).filter(value => !allowed.has(value));
            expect({id: step.id, unaccounted}).toEqual({id: step.id, unaccounted: []});
        }
    });
});

function checkScenes(lesson: GuidedLesson, scenes: Record<string, Expected>) {
    const m = mountWaves();
    try {
        const ids = Object.keys(scenes);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = scenes[id];
            m.scene(lesson, id);
            m.scene(lesson, id);
            const state = m.graph.state as unknown as Record<string, unknown>;
            expect({id, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, state[key]]))}).toEqual({id, ...expected.state});
            expect({id, time: m.graph.time, playing: m.graph.playing}).toEqual({id, time: expected.t, playing: false});
            for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
        }
        m.restore();
        expect(JSON.stringify({state: m.graph.state, time: m.graph.time, playing: m.graph.playing})).toBe(m.free);
    } finally {
        m.mounted.view.unmount();
    }
}

test('WV1: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(wavesSuperpositionLesson, WV1);
});

test('WV2: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(wavesBeatsLesson, WV2);
});

/** Runs the learner's changes after a scene and checks the readouts against the closed forms. */
function learnerChanges(lesson: GuidedLesson, stepId: string, changes: readonly {actions: LessonAction[]; rows: Record<string, string>}[]) {
    const m = mountWaves();
    try {
        m.scene(lesson, stepId);
        for (const change of changes) {
            m.learner(...change.actions);
            for (const [row, text] of Object.entries(change.rows)) expect({stepId, row, text: stripped(readout(row))}).toEqual({stepId, row, text: stripped(text)});
        }
    } finally {
        m.mounted.view.unmount();
    }
}

test('WV1: the phases the text asks to type give the amplitudes and phases it quotes', () => {
    const only = (c: SumSetup, time: number, ...ids: string[]) => Object.fromEntries(Object.entries(sumRows(c, time)).filter(([id]) => ids.includes(id)));
    const cases = [0, 60, 120].map(p2 => ({actions: [components({p2})], rows: only(withSum({p2}), 0, 'sum-amplitude', 'sum-phase')}));
    learnerChanges(wavesSuperpositionLesson, 'wv1-phase', cases);
    expect(sumAmplitude(1, 1, 0)).toBeCloseTo(2, 12);
    expect(sumAmplitude(1, 1, 120)).toBeCloseTo(1, 12);
    learnerChanges(wavesSuperpositionLesson, 'wv1-extremes', [{actions: [components({p2: 0})], rows: only(withSum({p2: 0}), 0, 'sum-amplitude', 'sum-phase')}]);
    learnerChanges(wavesSuperpositionLesson, 'wv1-amplitudes', [60, 0, 180].map(p2 => ({actions: [components({p2})], rows: only(withSum({a1: 3, a2: 2, p2}), 0, 'sum-amplitude', 'sum-phase', 'amplitude-range')})));
    learnerChanges(wavesSuperpositionLesson, 'wv1-arrows', [0.1, 0.2, 0.37].map(time => ({actions: [setTime(time)], rows: only(SUM_DEFAULT, time, 'time', 'sum-amplitude', 'wave1', 'wave2', 'sum', 'phase-difference')})));
    expect(sumAmplitude(3, 2, 0)).toBeCloseTo(5, 12);
    expect(sumAmplitude(3, 2, 180)).toBeCloseTo(1, 12);
});

test('WV2: the frequencies and times the text asks to set give the readouts it quotes', () => {
    const only = (c: BeatsSetup, time: number, ...ids: string[]) => Object.fromEntries(Object.entries(beatsRows(c, time)).filter(([id]) => ids.includes(id)));
    learnerChanges(wavesBeatsLesson, 'wv2-swell', [0, 0.25, 0.5].map(time => ({actions: [setTime(time)], rows: only(BEATS_10_12, time, 'sum', 'time')})));
    learnerChanges(wavesBeatsLesson, 'wv2-envelope', [0, 0.25, 0.5].map(time => ({actions: [setTime(time)], rows: only(BEATS_10_12, time, 'envelope', 'beat-period')})));
    learnerChanges(wavesBeatsLesson, 'wv2-difference', [13, 14].map(f2 => ({actions: [components({f2})], rows: only({f1: 10, f2}, 0, 'beat-frequency', 'mean-frequency', 'beat-period')})));
    learnerChanges(wavesBeatsLesson, 'wv2-predict', [0.5, 1].map(time => ({actions: [setTime(time)], rows: only({f1: 10, f2: 11}, time, 'envelope', 'beat-period', 'beat-frequency')})));
    learnerChanges(wavesBeatsLesson, 'wv2-explore', [{actions: [components({f1: 10, f2: 10})], rows: only({f1: 10, f2: 10}, 0, 'beat-period', 'envelope', 'sum')}]);
    expect(beatsRows({f1: 10, f2: 10}, 0)['beat-period']).toBe('ni utripanja');
    expect(beatFrequency(10, 16)).toBeGreaterThan(5);
});

test('the closed forms reproduce the quoted reference values', () => {
    expect(sumAmplitude(3, 2, 90)).toBeCloseTo(Math.sqrt(13), 12);
    expect(sumPhase(3, 0, 2, 90)).toBeCloseTo(33.69, 2);
    expect(sumAmplitude(3, 2, 60)).toBeCloseTo(4.359, 3);
    expect(sumPhase(3, 0, 2, 60)).toBeCloseTo(23.41, 2);
    expect(sumAmplitude(1, 1, 60)).toBeCloseTo(1.732, 3);
    expect(height(1, 3, 0, 0.1)).toBeCloseTo(-0.309, 3);
    expect(height(1, 3, 120, 0.1)).toBeCloseTo(-0.669, 3);
    expect(beatsHeight(10, 12, 0.1)).toBeCloseTo(1.309, 3);
    expect(envelopeAt(10, 12, 0.1)).toBeCloseTo(1.618, 3);
    // the identity of the formula block: the product of the slow and the fast factor equals the sum at any time
    for (const time of [0, 0.013, 0.1, 0.37]) expect(2 * Math.cos(PI * 2 * time) * Math.cos(PI * 22 * time)).toBeCloseTo(beatsHeight(10, 12, time), 12);
});

// ---- WV3: standing waves ----------------------------------------------------------------------------------------------------------------
// Closed forms written for this test: the sum of a sin(kx - wt) and a sin(kx + wt) with k = m pi / 2 (m half waves on the length 2) and w = 2 pi, summed term by
// term, never through the product; the nodes 2n/m, the antinodes (2n+1)/m, the wavelength 4/m, the amplitude 2a. The graph's readouts are compared with them.

const standingK = (m: number) => (m * PI) / 2;
const standingW = 2 * PI;
const termSum = (m: number, a: number, x: number, t: number) => a * Math.sin(standingK(m) * x - standingW * t) + a * Math.sin(standingK(m) * x + standingW * t);
const nodePositions = (m: number) => Array.from({length: m + 1}, (_, n) => (2 * n) / m);
const antinodePositions = (m: number) => Array.from({length: m}, (_, n) => (2 * n + 1) / m);
const wavelengthOf = (m: number) => 4 / m;
const joined = (values: readonly number[]) => values.map(value => readoutNumber(value, 3)).join('; ');

interface StandingSetup { readonly m: number; readonly a: number }
const STANDING_DEFAULT: StandingSetup = {m: 2, a: 1};
function standingRows(c: StandingSetup, time: number): Record<string, string> {
    return {
        time: `${readoutNumber(time, 2)} s`, 'half-waves': `${c.m}`, wavelength: readoutNumber(wavelengthOf(c.m), 3), period: '1 s',
        nodes: joined(nodePositions(c.m)), antinodes: joined(antinodePositions(c.m)), 'antinode-amplitude': readoutNumber(2 * c.a, 3),
    };
}
const standingStep = (c: StandingSetup, t: number): Expected => ({state: {mode: 'standing', halfWaves: c.m, a1: c.a}, t, rows: standingRows(c, t), quotes: []});

/** Every scene starts from the default (m = 2, a = 1): what the learner is asked to produce is not already on the graph. Only step 3 starts at another time. */
const WV3: Record<string, Expected> = {
    'wv3-two-waves': standingStep(STANDING_DEFAULT, 0),
    'wv3-move': standingStep(STANDING_DEFAULT, 0),
    'wv3-identity': standingStep(STANDING_DEFAULT, 0.5),
    'wv3-nodes': standingStep(STANDING_DEFAULT, 0),
    'wv3-half-waves': standingStep(STANDING_DEFAULT, 0),
    'wv3-explore': standingStep(STANDING_DEFAULT, 0),
};

/** The numbers each WV3 step quotes (explanation, observations, worked example, expected-state text) with the digits the text writes, from the closed forms. */
const WV3_QUOTES: Record<string, readonly Quote[]> = {
    'wv3-two-waves': [q(2, 0)],
    'wv3-move': [q(0.25, 2), q(wavelengthOf(2) * 0.25, 1)],
    'wv3-identity': [q(0.25, 2), q(0.75, 2), q(0.5, 1), q(termSum(2, 1, 0.5, 0.5), 0)],
    'wv3-nodes': [q(0.1, 1), q(termSum(2, 1, 0.5, 0.1), 3)],
    'wv3-half-waves': [q(nodePositions(3)[1], 3), q(nodePositions(3)[2], 3), q(antinodePositions(3)[0], 3), q(antinodePositions(3)[2], 3), q(wavelengthOf(3), 3)],
    'wv3-explore': [q(wavelengthOf(4), 0), q(nodePositions(4)[1], 1), q(nodePositions(4)[3], 1), q(2 * 1.5, 0), q(1.5, 1)],
};
/** Decimals a step writes that are inputs or formula arguments, not readouts. */
const WV3_INPUTS: Record<string, readonly string[]> = {'wv3-nodes': ['0.2', '0.5', '1.5']};
const only3 = (c: StandingSetup, time: number, ...ids: string[]) => Object.fromEntries(Object.entries(standingRows(c, time)).filter(([id]) => ids.includes(id)));
const WV3_SPACE = ['half-waves', 'wavelength', 'nodes', 'antinodes', 'antinode-amplitude'];

test('WV3: ordered steps, ownership of the two new sections and lesson ids, and a worked example', () => {
    expect(wavesStandingLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(wavesStandingLesson.steps.map(step => step.id)).toEqual(Object.keys(WV3));
    expect(new Set(wavesStandingLesson.steps.map(step => step.scene!.id)).size).toBe(6);
    const owned = getChapterOwnedLessons('waves')!;
    expect(owned.rows().find(([section]) => section === 'standing-waves')).toEqual(['standing-waves', 'waves']);
    const lesson = owned.lesson('standing-waves')!;
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps.every(step => step.scene)).toBe(true);
    expect(lesson.id).toBe('waves-standing');
    expect(owned.lesson('superposition-and-phase')!.id).toBe('waves-superposition');
    expect(owned.lesson('beats')!.id).toBe('waves-beats');
    expect(wavesStandingLesson.workedExamples).toHaveLength(1);
    expect(wavesStandingLesson.steps.filter(step => step.workedExampleId).map(step => step.workedExampleId)).toEqual(['wv3-product-check']);
});

test('WV3: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice; leaving restores the free state', () => {
    checkScenes(wavesStandingLesson, WV3);
});

test('WV3: the changes the text asks the learner to make give the readouts it quotes, and the scene does not already hold them', () => {
    // step 2: the slider moves to 0.25 (the scene is at 0)
    learnerChanges(wavesStandingLesson, 'wv3-move', [0, 0.25, 0.5, 1].map(time => ({actions: [setTime(time)], rows: only3(STANDING_DEFAULT, time, 'time', ...WV3_SPACE)})));
    // step 4: the time is set to 0.1; the nodes and antinodes do not move
    learnerChanges(wavesStandingLesson, 'wv3-nodes', [0.1, 0.3, 0.9].map(time => ({actions: [setTime(time)], rows: only3(STANDING_DEFAULT, time, 'time', 'nodes', 'antinodes')})));
    // step 5: three half waves are typed
    learnerChanges(wavesStandingLesson, 'wv3-half-waves', [{actions: [components({halfWaves: 3})], rows: only3({m: 3, a: 1}, 0, ...WV3_SPACE)}]);
    // step 6: four half waves, then amplitude 1.5 of each wave
    learnerChanges(wavesStandingLesson, 'wv3-explore', [
        {actions: [components({halfWaves: 4})], rows: only3({m: 4, a: 1}, 0, ...WV3_SPACE)},
        {actions: [components({a1: 1.5})], rows: only3({m: 4, a: 1.5}, 0, ...WV3_SPACE)},
    ]);
    // whatever m the learner tries (1 to 6) the readouts agree with the closed forms
    for (const m of [1, 2, 3, 4, 5, 6]) learnerChanges(wavesStandingLesson, 'wv3-explore', [{actions: [components({halfWaves: m})], rows: only3({m, a: 1}, 0, ...WV3_SPACE)}]);
    // the scenes of steps 2, 5 and 6 hold neither the time nor the numbers asked for
    expect(WV3['wv3-move'].t).not.toBe(0.25);
    expect(WV3['wv3-half-waves'].state.halfWaves).not.toBe(3);
    expect(WV3['wv3-explore'].state).toEqual({mode: 'standing', halfWaves: 2, a1: 1});
});

test('WV3: the status text after the scenes applied one after another without a restore (recorded, the graph is not changed)', () => {
    const m = mountWaves();
    try {
        const seen: string[] = [];
        for (const step of wavesStandingLesson.steps) {
            m.learner(...sceneActions(step.scene!));
            seen.push(`${step.id} t=${m.graph.time}: ${document.querySelector('[data-waves-status]')?.textContent ?? ''}`);
        }
        console.info(`WV3-STATUS\n${seen.join('\n')}`);
        expect(seen).toHaveLength(6);
    } finally {
        m.mounted.view.unmount();
    }
});

test('WV3: the identity, nodes, antinodes, wavelength, amplitude and flat times recomputed on a grid, and the quoted values', () => {
    for (const m of [1, 2, 3, 4, 5, 6]) {
        const k = standingK(m);
        let worst = 0;
        for (let i = 0; i <= 200; i++) for (let j = 0; j <= 200; j++) {
            const x = i / 100, t = j / 200;
            worst = Math.max(worst, Math.abs(termSum(m, 1, x, t) - 2 * Math.sin(k * x) * Math.cos(standingW * t)));
        }
        expect(worst).toBeLessThan(1e-12);
        expect(2 * PI / k).toBeCloseTo(wavelengthOf(m), 12);
        for (const x of nodePositions(m)) for (const t of [0, 0.13, 0.5, 0.77]) expect(Math.abs(termSum(m, 1, x, t))).toBeLessThan(1e-12);
        for (const x of antinodePositions(m)) expect(Math.abs(Math.sin(k * x))).toBeCloseTo(1, 12);
        let top = 0;
        for (let i = 0; i <= 2048; i++) top = Math.max(top, termSum(m, 1.5, i / 1024, 0));
        expect(top).toBeCloseTo(3, 4);
    }
    // the times at which the sum is zero everywhere on the length, for m = 2: exactly 1/4 and 3/4
    const flat: number[] = [];
    for (let j = 0; j <= 400; j++) {
        const t = j / 400;
        let worst = 0;
        for (let i = 0; i <= 2048; i++) worst = Math.max(worst, Math.abs(termSum(2, 1, i / 1024, t)));
        if (worst < 1e-9) flat.push(t);
    }
    expect(flat).toEqual([0.25, 0.75]);
    // each wave moves by (lambda / T) t: a quarter of the wavelength, 0.5, at t = 1/4
    expect(wavelengthOf(2) * 0.25).toBeCloseTo(0.5, 12);
    // the worked example at k = pi, w = 2 pi, x = 1/2, t = 1/2
    expect(Math.sin(PI / 2 - PI)).toBeCloseTo(-1, 12);
    expect(Math.sin(PI / 2 + PI)).toBeCloseTo(-1, 12);
    expect(2 * Math.sin(PI / 2) * Math.cos(PI)).toBeCloseTo(-2, 12);
    expect(termSum(2, 1, 0.5, 0.5)).toBeCloseTo(-2, 12);
    // step 4: the antinodes at time 0.1
    expect(termSum(2, 1, 0.5, 0.1)).toBeCloseTo(1.618, 3);
    expect(termSum(2, 1, 1.5, 0.1)).toBeCloseTo(-1.618, 3);
    const example = wavesStandingLesson.workedExamples![0];
    expect(example.resultLatex).toBe('-2');
    expect(example.calculationLatex).toContain('-1+(-1)');
    expect(example.calculationLatex).toContain('2\\cdot1\\cdot(-1)');
});

type Step = GuidedLesson['steps'][number];
const wv3Texts = (step: Step, language: 'sl' | 'en') => {
    const example = (wavesStandingLesson.workedExamples ?? []).find(e => e.id === step.workedExampleId);
    return [step.explanation[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language], ...(example ? [example.check[language]] : [])];
};

test('WV3: quoted numbers are bound to their step in both languages, sl and en carry the same numbers, and no other decimal is quoted', () => {
    const lesson = wavesStandingLesson;
    for (const step of lesson.steps) {
        const quotes = WV3_QUOTES[step.id];
        for (const language of ['sl', 'en'] as const) {
            const everything = wv3Texts(step, language).join(' ');
            for (const quote of quotes) {
                const value = proseNumber(quote.value, quote.digits, language);
                expect({id: step.id, language, value, found: hasNumber(everything, value)}).toEqual({id: step.id, language, value, found: true});
            }
        }
        const formulas = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id)).flatMap(block => [block.explanation.en, block.notation.en]);
        const allowed = new Set(quotes.map(quote => proseNumber(Math.abs(quote.value), quote.digits, 'en')).concat(WV3_INPUTS[step.id] ?? []));
        const texts = [step.title.en, step.purpose.en, step.observationPrompt.en, ...wv3Texts(step, 'en'), ...formulas];
        const unaccounted = [...new Set(texts.flatMap(decimalsIn))].filter(value => !allowed.has(value));
        expect({id: step.id, unaccounted}).toEqual({id: step.id, unaccounted: []});
    }
    // sl and en parity over the whole lesson: the same decimal numbers (the Slovenian comma written as a point)
    const every = (language: 'sl' | 'en') => [lesson.title, lesson.summary, ...lesson.steps.flatMap(step => [step.title, step.purpose, step.explanation, step.observationPrompt, ...step.expectedObservations, step.scene!.expectedState]),
        ...(lesson.workedExamples ?? []).flatMap(e => [e.title, e.check]), ...(lesson.formulaBlocks ?? []).flatMap(b => [b.notation, b.explanation])].map(t => prose(t[language]));
    const numbers = (language: 'sl' | 'en') => [...new Set(every(language).flatMap(t => [...t.matchAll(/(?<![0-9.,])[0-9]+[.,][0-9]+/g)].map(match => match[0].replace(',', '.'))))].sort();
    expect(numbers('sl')).toEqual(numbers('en'));
    expect(numbers('sl').length).toBeGreaterThan(0);
});

test('WV3: a prediction is not answered before the learner makes it (explanation, worked example, formulas, summary, titles), in both languages', () => {
    const lesson = wavesStandingLesson;
    const step = (id: string) => lesson.steps.find(s => s.id === id)!;
    const formulaText = (s: Step, language: 'sl' | 'en') => (lesson.formulaBlocks ?? []).filter(block => s.formulaIds.includes(block.id)).flatMap(block => [block.explanation[language], block.notation[language], block.latex]);
    const prior = (id: string, language: 'sl' | 'en') => [step(id).title[language], step(id).explanation[language],
        ...(lesson.workedExamples ?? []).filter(e => e.id === step(id).workedExampleId).flatMap(e => [e.title[language], e.calculationLatex, e.resultLatex, e.check[language]]),
        ...formulaText(step(id), language)].join(' ');
    const answers: Record<string, readonly RegExp[]> = {
        'wv3-two-waves': [/prekrivat/i, /coincide/i],
        'wv3-move': [/ravna/i, /straight line/i, /povsod nič/i, /zero everywhere/i, /ne potuje/i, /does not travel/i, /nikamor/i],
        'wv3-identity': [/0\{,\}75/, /0\.75/, /tfrac\{3\}\{4\}/, /3\/4/],
        'wv3-nodes': [/1\{,\}618/, /1\.618/, /0\{,\}2\\pi/, /0\.2\\pi/, /ostanejo/i, /stay at the same/i, /stoji/i, /stand still/i],
        'wv3-half-waves': [/0\{,\}667/, /0\.667/, /1\{,\}333/, /1\.333/, /tfrac\{4\}\{3\}/, /tfrac\{2\}\{3\}/, /štirje/i, /four nodes/i],
        'wv3-explore': [/pet vozlov/i, /five nodes/i, /1\{,\}5/, /1\.5/, /\\\(4\\\)/],
    };
    for (const [id, patterns] of Object.entries(answers)) for (const language of ['sl', 'en'] as const) for (const pattern of patterns) {
        expect({id, language, pattern: String(pattern), leaked: pattern.test(prior(id, language))}).toEqual({id, language, pattern: String(pattern), leaked: false});
    }
    // the summary is rendered before step 1: it answers nothing of steps 2 and 4
    for (const language of ['sl', 'en'] as const) {
        for (const pattern of [/ne potuje/i, /does not travel/i, /mirujo/i, /fixed nodes/i, /stand still/i, /stojijo/i, /\\cos/]) {
            expect({language, pattern: String(pattern), leaked: pattern.test(lesson.summary[language])}).toEqual({language, pattern: String(pattern), leaked: false});
        }
    }
});

test('WV3: no lesson text holds a control character (a single backslash before t, b, f, r or v turned a LaTeX command into one)', () => {
    const lesson = wavesStandingLesson;
    const every = [lesson.title, lesson.summary, ...lesson.prerequisites, ...lesson.learningGoals, ...lesson.edgeCases,
        ...lesson.steps.flatMap(step => [step.title, step.purpose, step.explanation, step.observationPrompt, ...step.expectedObservations, step.scene!.expectedState]),
        ...(lesson.workedExamples ?? []).flatMap(e => [e.title, e.check]), ...(lesson.formulaBlocks ?? []).flatMap(b => [b.notation, b.explanation])];
    for (const t of every) for (const language of ['sl', 'en'] as const) {
        expect({text: t[language].slice(0, 30), control: /[\u0008\u0009\u000b\u000c\u000d]/.test(t[language])}).toEqual({text: t[language].slice(0, 30), control: false});
    }
});
