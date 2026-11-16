/**
 * WV4 (waves, sampling and aliasing): every scene lands in the state the text states on the real graph (one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice, in both languages), and the changes the text asks the learner to make give the readouts the text quotes. The expected readouts
 * are computed here by integer arithmetic (the alias f - k fs in [-fs/2, fs/2], ambiguous at 2f = fs, the last sample floor(t fs), the instant n/fs), not with the
 * waves model or the graph.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {wavesAliasingLesson} from './wavesSamplingGuidedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {WavesGraph} from '../../graphs/functions/WavesGraph';
import {setLanguage} from '../../localization';
import {sl} from '../../localization/sl';
import {en} from '../../localization/en';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Lang = 'sl' | 'en';
const LANGUAGES: readonly Lang[] = ['sl', 'en'];
const MINUS = '−';
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutLabel = (id: string) => document.querySelector(`[data-readout="${id}"] dt`)?.textContent ?? null;
const status = () => document.querySelector('[data-waves-status]')?.textContent ?? '';

// ---- independent arithmetic -------------------------------------------------------------------------------------------------------------

type Alias = {kind: 'ambiguous'} | {kind: 'rest'} | {kind: 'turn'; signed: number};
/** f - k fs in [-fs/2, fs/2] on integers: the remainder r of f modulo fs, then r or r - fs, whichever is nearer to 0; ambiguous when 2r = fs. */
function aliasOf(f: number, fs: number): Alias {
    const r = ((f % fs) + fs) % fs;
    if (2 * r === fs) return {kind: 'ambiguous'};
    if (r === 0) return {kind: 'rest'};
    return {kind: 'turn', signed: 2 * r < fs ? r : r - fs};
}
const relationOf = (f: number, fs: number): 'above' | 'at' | 'below' => (fs > 2 * f ? 'above' : fs === 2 * f ? 'at' : 'below');
/** The last sample at time t: floor(t fs), guarded against the representation error of 0.05 * 24 and the like. */
const lastSample = (t: number, fs: number) => Math.floor(t * fs + 1e-9);

/** A decimal number as the graph writes it: at most `digits` decimals, no trailing zeros, true minus sign, comma in Slovenian. */
function num(value: number, digits: number, lang: Lang): string {
    const text = Number(value.toFixed(digits)).toString().replace('-', MINUS);
    return lang === 'sl' ? text.replace('.', ',') : text;
}

interface Setup { readonly f: number; readonly fs: number; readonly t: number; readonly alias: boolean }

const WORDS = {
    sl: {
        rev: 'obr/s', none: 'ni določeno', resolution: '2048 točk na sekundo', ambiguous: 'Pri 2f = fs smeri vrtenja ni mogoče določiti.', rest: 'Kolo navidezno miruje.',
        forward: (m: number) => `Kolo se navidezno vrti naprej s frekvenco ${m} Hz.`, backward: (m: number) => `Kolo se navidezno vrti nazaj s frekvenco ${m} Hz.`,
        nyquist: {above: (fs: number, f2: number) => `2f = ${f2} Hz; fs = ${fs} Hz je nad njo`, at: (fs: number, f2: number) => `2f = ${f2} Hz; fs = ${fs} Hz je enaka njej`,
            below: (fs: number, f2: number) => `2f = ${f2} Hz; fs = ${fs} Hz je pod njo (pojav lažne frekvence)`},
        frame: (n: number, fs: number, instant: string) => `n = ${n}, trenutek n/fs = ${n}/${fs} = ${instant} s`,
        pair: (a: string, b: string, m: string) => `${a} in ${b} (navidezna amplituda ${m})`,
        statusHead: (f: number, fs: number) => `Ton s frekvenco ${f} Hz, vzorčen s ${fs} Hz.`,
    },
    en: {
        rev: 'rev/s', none: 'not defined', resolution: '2048 points per second', ambiguous: 'At 2f = fs the direction of turning cannot be determined.', rest: 'The wheel seems to stand still.',
        forward: (m: number) => `The wheel seems to turn forwards at ${m} Hz.`, backward: (m: number) => `The wheel seems to turn backwards at ${m} Hz.`,
        nyquist: {above: (fs: number, f2: number) => `2f = ${f2} Hz; fs = ${fs} Hz is above it`, at: (fs: number, f2: number) => `2f = ${f2} Hz; fs = ${fs} Hz equals it`,
            below: (fs: number, f2: number) => `2f = ${f2} Hz; fs = ${fs} Hz is below it (aliasing)`},
        frame: (n: number, fs: number, instant: string) => `n = ${n}, instant n/fs = ${n}/${fs} = ${instant} s`,
        pair: (a: string, b: string, m: string) => `${a} and ${b} (apparent amplitude ${m})`,
        statusHead: (f: number, fs: number) => `A tone of ${f} Hz sampled at ${fs} Hz.`,
    },
} as const;

/** The sentence of the apparent motion. */
function aliasSentence(setup: Setup, lang: Lang): string {
    const words = WORDS[lang];
    const alias = aliasOf(setup.f, setup.fs);
    return alias.kind === 'ambiguous' ? words.ambiguous : alias.kind === 'rest' ? words.rest : alias.signed < 0 ? words.backward(-alias.signed) : words.forward(alias.signed);
}
/** Every readout row of the sampling picture (amplitude 1, phase 0, no join, no sinc) and the status, from the arithmetic. */
function samplingRows(setup: Setup, lang: Lang): {rows: Record<string, string>; status: string} {
    const words = WORDS[lang];
    const alias = aliasOf(setup.f, setup.fs);
    const n = lastSample(setup.t, setup.fs);
    const rows: Record<string, string> = {
        frequency: `${setup.f} Hz`, rate: `${setup.fs} Hz`, 'samples-per-period': num(setup.fs / setup.f, 2, lang),
        nyquist: words.nyquist[relationOf(setup.f, setup.fs)](setup.fs, 2 * setup.f), alias: aliasSentence(setup, lang),
        'alias-frequency': alias.kind === 'ambiguous' ? words.none : `${alias.kind === 'rest' ? 0 : num(alias.signed, 0, lang)} ${words.rev}`,
        frame: words.frame(n, setup.fs, num(n / setup.fs, 4, lang)), resolution: words.resolution,
    };
    if (alias.kind === 'ambiguous') rows['ambiguous-samples'] = words.pair('1', `${MINUS}1`, '1');
    return {rows, status: `${words.statusHead(setup.f, setup.fs)} ${aliasSentence(setup, lang)}`};
}

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

function mountWaves() {
    const graph = createGraph('waves');
    if (!(graph instanceof WavesGraph)) throw new Error('waves must be the waves graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify({state: graph.state, time: graph.time, playing: graph.playing});
    const scene = (lesson: GuidedLesson, stepId: string) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
const tone = (f1: number): LessonAction => ({kind: 'waves', operation: 'set-components', f1});
const rate = (fs: number): LessonAction => ({kind: 'waves', operation: 'set-sampling', fs});
const aliasSwitch = (showAlias: boolean): LessonAction => ({kind: 'waves', operation: 'set-sampling', showAlias});
const atTime = (t: number): LessonAction => ({kind: 'waves', operation: 'set-time', t});

// ---- WV4 -------------------------------------------------------------------------------------------------------------------------------

/** One learner change the prompt asks for: the actions, the setup afterwards, and the numbers (signed apparent frequency) the observation text quotes for it. */
interface Change { readonly actions: LessonAction[]; readonly after: Partial<Setup> }
interface Step4 { readonly opening: Setup; readonly changes: readonly Change[] }
const S = (f: number, fs: number, t: number, alias: boolean): Setup => ({f, fs, t, alias});
const WV4: Record<string, Step4> = {
    'wv4-slow': {opening: S(2, 24, 0, false), changes: [{actions: [atTime(0.05)], after: {t: 0.05}}, {actions: [atTime(0.25)], after: {t: 0.25}}]},
    'wv4-fast': {opening: S(2, 24, 0, false), changes: [{actions: [tone(23)], after: {f: 23}}, {actions: [atTime(0.05)], after: {t: 0.05}}]},
    'wv4-crawl': {opening: S(23, 24, 0, false), changes: [{actions: [tone(25)], after: {f: 25}}, {actions: [atTime(0.05)], after: {t: 0.05}}]},
    'wv4-instants': {opening: S(23, 24, 0.5, false), changes: [{actions: [atTime(0.52)], after: {t: 0.52}}, {actions: [atTime(0.55)], after: {t: 0.55}}]},
    'wv4-alias-wave': {opening: S(23, 24, 0, false), changes: [{actions: [aliasSwitch(true)], after: {alias: true}}]},
    'wv4-change-fs': {opening: S(9, 24, 0, true), changes: [
        {actions: [rate(12)], after: {fs: 12}}, {actions: [tone(6)], after: {f: 6}}, {actions: [tone(13), rate(24)], after: {f: 13, fs: 24}},
    ]},
    'wv4-explore': {opening: S(23, 24, 0, true), changes: [{actions: [tone(24)], after: {f: 24}}, {actions: [tone(40)], after: {f: 40}}]},
};

const stateOf = (setup: Setup) => ({mode: 'sampling', a1: 1, p1: 0, f1: setup.f, fs: setup.fs, extra: 48, showAlias: setup.alias, showJoin: false, showSinc: false});

function expectGraphAt(m: ReturnType<typeof mountWaves>, id: string, setup: Setup, lang: Lang) {
    const state = m.graph.state as unknown as Record<string, unknown>;
    const expected = stateOf(setup);
    expect({id, lang, ...Object.fromEntries(Object.keys(expected).map(key => [key, state[key]]))}).toEqual({id, lang, ...expected});
    expect({id, lang, time: m.graph.time, playing: m.graph.playing}).toEqual({id, lang, time: setup.t, playing: false});
    const want = samplingRows(setup, lang);
    for (const [row, value] of Object.entries(want.rows)) expect({id, lang, row, value: stripped(readout(row))}).toEqual({id, lang, row, value: stripped(value)});
    // the row of the two samples at 2f = fs exists only then
    expect({id, lang, ambiguousRow: readout('ambiguous-samples') !== null}).toEqual({id, lang, ambiguousRow: 'ambiguous-samples' in want.rows});
    expect({id, lang, join: readout('join-error'), sinc: readout('sinc-error')}).toEqual({id, lang, join: null, sinc: null});
    expect({id, lang, status: stripped(status()).includes(stripped(want.status))}).toEqual({id, lang, status: true});
}
const applyChange = (setup: Setup, change: Change): Setup => ({...setup, ...change.after});

describe('WV4', () => {
    test('has seven ordered steps with a scene each, no explanation or calculation before step 7, and the formula only on step 7', () => {
        const lesson = wavesAliasingLesson;
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(WV4));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
        for (const step of lesson.steps.slice(0, 6)) {
            expect({id: step.id, formulaIds: step.formulaIds, example: step.workedExampleId}).toEqual({id: step.id, formulaIds: [], example: undefined});
        }
        const last = lesson.steps[6];
        expect({formulaIds: last.formulaIds, example: last.workedExampleId}).toEqual({formulaIds: ['alias-frequency'], example: 'wv4-wheel-40'});
    });

    test('every scene lands in the stated state, readouts and status, in one synchronous sequence from a restored checkpoint, out of order and twice, in both languages; leaving restores the free state', () => {
        for (const lang of LANGUAGES) {
            setLanguage(lang);
            const m = mountWaves();
            try {
                const ids = Object.keys(WV4);
                for (const id of [...ids, ...ids.slice().reverse()]) {
                    m.scene(wavesAliasingLesson, id);
                    m.scene(wavesAliasingLesson, id);
                    expectGraphAt(m, id, WV4[id].opening, lang);
                }
                m.restore();
                expect(JSON.stringify({state: m.graph.state, time: m.graph.time, playing: m.graph.playing})).toBe(m.free);
            } finally {
                m.mounted.view.unmount();
            }
        }
    });

    test('the changes the prompts ask for give the readouts the text quotes, in both languages', () => {
        for (const lang of LANGUAGES) {
            setLanguage(lang);
            for (const [id, step] of Object.entries(WV4)) {
                const m = mountWaves();
                try {
                    m.scene(wavesAliasingLesson, id);
                    let setup = step.opening;
                    for (const change of step.changes) {
                        m.learner(...change.actions);
                        setup = applyChange(setup, change);
                        expectGraphAt(m, id, setup, lang);
                    }
                } finally {
                    m.mounted.view.unmount();
                }
            }
        }
    });

    test('the opening of no step is already the state its prompt asks the learner to produce', () => {
        for (const [id, step] of Object.entries(WV4)) {
            let setup = step.opening;
            for (const change of step.changes) {
                const next = applyChange(setup, change);
                const differs = (Object.keys(change.after) as (keyof Setup)[]).some(key => setup[key] !== next[key]);
                expect({id, differs}).toEqual({id, differs: true});
                setup = next;
            }
            // the final state differs from the opening in the asked fields
            expect({id, same: JSON.stringify(setup) === JSON.stringify(step.opening)}).toEqual({id, same: false});
        }
    });

    test('every control and readout a prompt names exists in the graph strings, in both languages, and the readouts carry those labels', () => {
        const names: Record<Lang, string[]> = {
            sl: [sl.waves_graph_time_label, sl.waves_graph_f_tone_label, sl.waves_graph_fs_label, sl.waves_graph_show_alias, sl.waves_graph_r_alias, sl.waves_graph_r_alias_frequency,
                sl.waves_graph_r_frame],
            en: [en.waves_graph_time_label, en.waves_graph_f_tone_label, en.waves_graph_fs_label, en.waves_graph_show_alias, en.waves_graph_r_alias, en.waves_graph_r_alias_frequency,
                en.waves_graph_r_frame],
        };
        const prompts = (lang: Lang) => wavesAliasingLesson.steps.map(step => step.observationPrompt[lang]).join(' ');
        const all = (lang: Lang) => [...wavesAliasingLesson.steps.map(step => [step.explanation[lang], step.observationPrompt[lang], ...step.expectedObservations.map(o => o[lang])].join(' '))].join(' ');
        for (const lang of LANGUAGES) {
            for (const name of names[lang]) expect({lang, name, named: all(lang).includes(name)}).toEqual({lang, name, named: true});
            // the controls and readouts the prompts name by label
            for (const name of [names[lang][0], names[lang][1], names[lang][2], names[lang][3], names[lang][4], names[lang][5]]) {
                expect({lang, name, prompted: prompts(lang).includes(name)}).toEqual({lang, name, prompted: true});
            }
            // the other labels in the texts: Nyquist rate, Samples at 2f = fs, Drawing resolution
            const catalog = lang === 'sl' ? sl : en;
            for (const label of [catalog.waves_graph_r_nyquist, catalog.waves_graph_r_ambiguous_samples, catalog.waves_graph_r_resolution]) {
                expect({lang, label, named: all(lang).includes(label)}).toEqual({lang, label, named: true});
            }
        }
        for (const lang of LANGUAGES) {
            setLanguage(lang);
            const m = mountWaves();
            try {
                m.scene(wavesAliasingLesson, 'wv4-change-fs');
                m.learner(rate(12), tone(6));
                const catalog = lang === 'sl' ? sl : en;
                const labels: Record<string, string> = {
                    alias: catalog.waves_graph_r_alias, 'alias-frequency': catalog.waves_graph_r_alias_frequency, frame: catalog.waves_graph_r_frame, nyquist: catalog.waves_graph_r_nyquist,
                    'ambiguous-samples': catalog.waves_graph_r_ambiguous_samples, resolution: catalog.waves_graph_r_resolution,
                };
                for (const [id, label] of Object.entries(labels)) expect({lang, id, label: readoutLabel(id)}).toEqual({lang, id, label});
            } finally {
                m.mounted.view.unmount();
            }
        }
    });

    test('the directions and magnitudes the observation texts quote are those of the integer arithmetic, in both languages', () => {
        const direction = {sl: {forward: 'naprej', backward: 'nazaj'}, en: {forward: 'forwards', backward: 'backwards'}} as const;
        const quoted: Record<string, Setup[]> = {
            'wv4-slow': [S(2, 24, 0.25, false)], 'wv4-fast': [S(23, 24, 0.05, false)], 'wv4-crawl': [S(25, 24, 0.05, false)],
            'wv4-alias-wave': [S(23, 24, 0, true)], 'wv4-change-fs': [S(9, 12, 0, true), S(13, 24, 0, true)], 'wv4-explore': [S(40, 24, 0, true)],
        };
        for (const lang of LANGUAGES) {
            for (const [id, setups] of Object.entries(quoted)) {
                const step = wavesAliasingLesson.steps.find(s => s.id === id)!;
                const text = step.expectedObservations.map(o => o[lang]).join(' ');
                for (const setup of setups) {
                    const alias = aliasOf(setup.f, setup.fs);
                    if (alias.kind !== 'turn') continue;
                    const magnitude = Math.abs(alias.signed);
                    const word = alias.signed < 0 ? direction[lang].backward : direction[lang].forward;
                    const sign = alias.signed < 0 ? '-' : '';
                    const hertz = `\\(${magnitude}\\ \\mathrm{Hz}\\)`;
                    const after = text.indexOf(word);
                    const found = (after >= 0 && text.slice(after, after + 60).includes(hertz)) || text.includes(`\\(${sign}${magnitude}\\)`) || text.includes(`\\(${sign}${magnitude}\\ \\mathrm{Hz}\\)`);
                    expect({id, lang, f: setup.f, fs: setup.fs, found}).toEqual({id, lang, f: setup.f, fs: setup.fs, found: true});
                }
            }
        }
    });

    test('a predicting step does not render the quoted answer of its own expected observations before the learner has predicted', () => {
        // the answers each prediction step quotes in its observations and must not show in its explanation, purpose, expected state or any attached formula or example
        const answers: Record<string, {sl: string[]; en: string[]}> = {
            'wv4-slow': {sl: ['30^\\circ', '\\tfrac{1}{12}', '0{,}25\\ \\mathrm{s}'], en: ['30^\\circ', '\\tfrac{1}{12}', '0.25\\ \\mathrm{s}']},
            'wv4-fast': {sl: ['15^\\circ', '-1', '\\tfrac{23}{24}', 'nazaj'], en: ['15^\\circ', '-1', '\\tfrac{23}{24}', 'backwards']},
            'wv4-crawl': {sl: ['15^\\circ', '\\tfrac{25}{24}', 'naprej s'], en: ['15^\\circ', '\\tfrac{25}{24}', 'forwards at']},
            'wv4-instants': {sl: ['0{,}46', '12{,}48', '13{,}2', '15^\\circ'], en: ['0.46', '12.48', '13.2', '15^\\circ']},
            'wv4-alias-wave': {sl: ['\\tfrac{23n}{24}', 'periodičnost'], en: ['\\tfrac{23n}{24}', 'periodicity']},
            'wv4-change-fs': {sl: ['(-3)', '-3', '-11', '\\(3\\ \\mathrm{Hz}\\)', '\\(11\\ \\mathrm{Hz}\\)'], en: ['-3', '-11', '\\(3\\ \\mathrm{Hz}\\)', '\\(11\\ \\mathrm{Hz}\\)']},
        };
        for (const step of wavesAliasingLesson.steps.slice(0, 6)) {
            for (const lang of LANGUAGES) {
                // observationPrompt is shown with the step; the observations only after the learner has predicted
                const shown = [step.title[lang], step.purpose[lang], step.explanation[lang], step.observationPrompt[lang], step.scene!.expectedState[lang]].join(' ');
                const leaked = answers[step.id][lang].filter(answer => shown.includes(answer));
                expect({id: step.id, lang, leaked}).toEqual({id: step.id, lang, leaked: []});
            }
        }
    });

    // ---- values independent of the graph ------------------------------------------------------------------------------------------------

    const PAIRS: readonly {f: number; fs: number; alias: Alias}[] = [
        {f: 2, fs: 24, alias: {kind: 'turn', signed: 2}}, {f: 23, fs: 24, alias: {kind: 'turn', signed: -1}}, {f: 25, fs: 24, alias: {kind: 'turn', signed: 1}},
        {f: 9, fs: 24, alias: {kind: 'turn', signed: 9}}, {f: 9, fs: 12, alias: {kind: 'turn', signed: -3}}, {f: 6, fs: 12, alias: {kind: 'ambiguous'}},
        {f: 13, fs: 24, alias: {kind: 'turn', signed: -11}}, {f: 24, fs: 24, alias: {kind: 'rest'}}, {f: 40, fs: 24, alias: {kind: 'turn', signed: -8}},
    ];

    test('the alias f - k fs in [-fs/2, fs/2] of every quoted pair, by integer arithmetic (ambiguous at 2f = fs)', () => {
        for (const {f, fs, alias} of PAIRS) {
            expect({f, fs, alias: aliasOf(f, fs)}).toEqual({f, fs, alias});
            if (alias.kind === 'turn') {
                const k = (f - alias.signed) / fs;
                expect({f, fs, integerK: Number.isInteger(k), inside: 2 * Math.abs(alias.signed) < fs}).toEqual({f, fs, integerK: true, inside: true});
            }
        }
        // a few more pairs, including the odd multiples of fs / 2 that are all ambiguous
        expect(aliasOf(18, 12)).toEqual({kind: 'ambiguous'});
        expect(aliasOf(30, 12)).toEqual({kind: 'ambiguous'});
        expect(aliasOf(36, 24)).toEqual({kind: 'ambiguous'});
        expect(aliasOf(48, 24)).toEqual({kind: 'rest'});
    });

    test('the samples of cos(2 pi f n / fs + phi) and cos(2 pi f_a n / fs + phi) agree to 1e-12 for every quoted pair, at several phases', () => {
        for (const {f, fs, alias} of PAIRS) {
            const fa = alias.kind === 'turn' ? alias.signed : alias.kind === 'rest' ? 0 : fs / 2;
            for (const phi of [0, 0.4, (25 * Math.PI) / 180, -1.3]) {
                for (let n = 0; n <= 2 * fs; n++) {
                    const sampleTrue = Math.cos((2 * Math.PI * f * n) / fs + phi);
                    const sampleAlias = Math.cos((2 * Math.PI * fa * n) / fs + phi);
                    expect(Math.abs(sampleTrue - sampleAlias)).toBeLessThan(1e-12);
                }
            }
        }
        // at 2f = fs the samples alternate cos(phi), -cos(phi): the two numbers of the row Samples at 2f = fs
        for (let n = 0; n < 6; n++) expect(Math.cos(Math.PI * n)).toBeCloseTo(n % 2 === 0 ? 1 : -1, 12);
    });

    /** The numbers each step quotes (as value, decimals), computed from the setups. */
    const quotes: Record<string, readonly (readonly [number, number])[]> = {
        'wv4-slow': [[6 / 24, 2], [1 / 24, 4], [(360 * 2) / 24, 0], [0.25, 2], [0.05, 2], [6, 0], [2 / 24 * 12, 0]],
        'wv4-fast': [[(360 * 1) / 24, 0], [23 * 0.05, 2], [0.05, 2], [23, 0]],
        'wv4-crawl': [[360 / 24, 0], [0.05, 2], [25, 0]],
        'wv4-instants': [[0.52 * 24, 2], [0.55 * 24, 1], [23 * 0.02, 2], [13 / 24, 4], [12, 0], [13, 0], [360 / 24, 0], [0.52, 2], [0.55, 2], [23, 0]],
        'wv4-alias-wave': [[Math.floor(24 * 1) + 1, 0], [23, 0]],
        'wv4-change-fs': [[9 - 12, 0], [13 - 24, 0], [3, 0], [11, 0]],
        'wv4-explore': [[40 - 48, 0], [8, 0], [2048 / 40, 1], [2048, 0], [24, 0]],
    };
    const proseOf = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ').replace(/\\mathrm\{([^}]*)\}/g, ' $1 ');
    const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escape(value)}(?![0-9]|[.,][0-9])`).test(proseOf(text));
    const proseNumber = (value: number, digits: number, lang: Lang) => {
        const text = Number(value.toFixed(digits)).toString();
        return lang === 'sl' ? text.replace('.', ',') : text;
    };
    const stepText = (id: string, lang: Lang) => {
        const lesson = wavesAliasingLesson;
        const step = lesson.steps.find(s => s.id === id)!;
        const example = (lesson.workedExamples ?? []).filter(e => e.id === step.workedExampleId).map(e => e.check?.[lang] ?? '');
        return [step.explanation[lang], step.observationPrompt[lang], step.scene!.expectedState[lang], ...step.expectedObservations.map(o => o[lang]), ...example].join(' ');
    };

    test('every number the text quotes is reproduced by the arithmetic, in sl and en', () => {
        for (const lang of LANGUAGES) {
            for (const [id, list] of Object.entries(quotes)) {
                for (const [value, digits] of list) {
                    const shown = proseNumber(Math.abs(value), digits, lang);
                    expect({id, lang, shown, found: hasNumber(stepText(id, lang), shown)}).toEqual({id, lang, shown, found: true});
                }
            }
        }
        // the numbers the arithmetic gives, written once more as the quoted values
        expect(Number((1 / 24).toFixed(4))).toBe(0.0417);
        expect(Number((13 / 24).toFixed(4))).toBe(0.5417);
        expect(Number((0.52 * 24).toFixed(2))).toBe(12.48);
        expect(Number((0.55 * 24).toFixed(2))).toBe(13.2);
        expect(Number((23 * 0.02).toFixed(2))).toBe(0.46);
        expect(Number((23 * 0.05).toFixed(2))).toBe(1.15);
        expect(Number((2048 / 40).toFixed(1))).toBe(51.2);
        expect((360 * 2) / 24).toBe(30);
        expect(360 / 24).toBe(15);
        expect(lastSample(0.25, 24)).toBe(6);
        expect(lastSample(0.05, 24)).toBe(1);
        expect(lastSample(0.52, 24)).toBe(12);
        expect(lastSample(0.55, 24)).toBe(13);
    });

    test('the Slovenian text has no English decimals, the English text no decimal commas, and a rounded number carries about / approx', () => {
        for (const step of wavesAliasingLesson.steps) {
            for (const lang of LANGUAGES) {
                const texts = [step.purpose[lang], step.explanation[lang], step.observationPrompt[lang], step.scene!.expectedState[lang], ...step.expectedObservations.map(o => o[lang])];
                for (const text of texts) {
                    const english = lang === 'sl' ? [...proseOf(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(m => m[0]) : [];
                    const commas = lang === 'en' ? [...text.matchAll(/[0-9]\{,\}[0-9]/g)].map(m => m[0]) : [];
                    expect({id: step.id, lang, english, commas}).toEqual({id: step.id, lang, english: [], commas: []});
                    // the rounded 0,0417 and 0,5417 (and the English points) come after an approximation sign
                    for (const rounded of ['0,0417', '0,5417', '0.0417', '0.5417']) {
                        const source = rounded.replace(',', '{,}');
                        for (const where of [text.indexOf(source), text.indexOf(rounded)].filter(i => i >= 0)) {
                            expect({id: step.id, lang, rounded, approx: text.slice(Math.max(0, where - 8), where).includes('\\approx')}).toEqual({id: step.id, lang, rounded, approx: true});
                        }
                    }
                }
            }
        }
        const worked = (wavesAliasingLesson.workedExamples ?? []).map(e => e.check?.sl ?? '');
        for (const text of worked) expect([...proseOf(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(m => m[0])).toEqual([]);
    });
});
