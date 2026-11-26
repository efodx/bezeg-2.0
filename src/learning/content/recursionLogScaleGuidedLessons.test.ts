/**
 * RG5 (recursion, batch C, exponential data and their natural logarithm), part A: every scene opens on the real growth graph in the state the text states (one synchronous
 * sequence of actions from a restored checkpoint, out of order and twice, in both languages), the controls and readouts a prompt names exist in the graph's strings, no step
 * opens on the state its prompt asks the learner to produce, the learner's typed values and chosen options give the readouts the text quotes, and a prediction step does
 * not show the answer to its own prediction. The expected values are computed here from closed forms (ln of 1000 q^n, difference quotients), not with the graph.
 */
import {act, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {recursionLogScaleLesson} from './recursionLogScaleGuidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {GrowthGraph} from '../../graphs/recursion/GrowthGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';
import type {MessageKey} from '../../localization';
import {sl} from '../../localization/sl';
import {en} from '../../localization/en';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
const lesson = recursionLogScaleLesson;
const STEP_IDS = ['rg5-ordinary', 'rg5-predict-log', 'rg5-line', 'rg5-slope', 'rg5-power', 'rg5-explore'] as const;
const stepOf = (id: string) => lesson.steps.find(step => step.id === id)!;

// ---- independent closed forms ----------------------------------------------------------------------------------------------------------

/** ln of y_n = y0 q^n, written as ln y0 + n ln q is the claim under test, so it is computed from the value itself. */
const lnOf = (y0: number, q: number, n: number) => Math.log(y0 * Math.pow(q, n));
/** The exact difference quotient of ln y over the plotted points n = first..last. */
const lnSlope = (y0: number, q: number, first: number, last: number) => (lnOf(y0, q, last) - lnOf(y0, q, first)) / (last - first);
const compoundK = (P: number, p: number, t0: number) => P * Math.pow(1 + p, t0);

const MINUS = '−';
/** A readout number in the language: up to `digits` decimals, no trailing zeros, decimal separator of the language, true minus sign. */
const fmt = (value: number, digits: number, language: Language): string => {
    const text = Number(value.toFixed(digits)).toString().replace('-', MINUS);
    return language === 'sl' ? text.replace('.', ',') : text;
};
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const status = () => document.querySelector('[data-recursion-status]')?.textContent ?? '';

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

let growth: GrowthGraph;
function mountGrowth() {
    const graph = createGraph('recursion-growth');
    if (!(graph instanceof GrowthGraph)) throw new Error('recursion-growth must be the growth graph.');
    growth = graph;
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const scene = (stepId: string) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(stepOf(stepId).scene!)) capabilities.apply(action);
    });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    const state = () => graph.state as unknown as Record<string, unknown>;
    return {graph, mounted, scene, restore, free, state};
}
type ControlKey = 'recursion_graph_growth_panel_label' | 'recursion_graph_growth_model_label' | 'recursion_graph_growth_y0_label' | 'recursion_graph_growth_logq_label';
/** The typed field of a slider: the exact field is named "<label>, vrednost" and shares the label with its range input. */
const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
/** The panel, the model and the growth factor are pucks on the board: the learner's entry reaches the graph through its writes; the starting value stays a typed Orodja field. */
const PUCKS: Partial<Record<ControlKey, string>> = {
    recursion_graph_growth_panel_label: 'growth-panel', recursion_graph_growth_model_label: 'growth-model', recursion_graph_growth_logq_label: 'growth-logq',
};
const type = (key: ControlKey, value: string) => act(() => {
    const puck = PUCKS[key];
    if (puck) growth.parameters!.write(puck, Number(value.replace(',', '.').replace('\u2212', '-')), 'learner');
    else enterNumber(field(t(key)), value);
});
const choose = (key: ControlKey, value: string) => act(() => { growth.parameters!.write(PUCKS[key]!, value, 'learner'); });
const typed = (value: number, language: Language) => fmt(value, 4, language);

// ---- the openings ----------------------------------------------------------------------------------------------------------------------

interface Opening {
    readonly state: Readonly<Record<string, unknown>>;
    /** Row id to the expected text of the readout in the language (a prefix, for rows with a trailing "(izračunano)"). */
    readonly rows: (language: Language) => Record<string, string>;
    readonly status: (language: Language) => string;
}
const INTEREST_STATE = {panel: 'interest', capital: 1000, rate: 10, years: 10, parts: 1, y0: 1000, logQ: 105} as const;
const LOG_STATE = {panel: 'log', y0: 1000, logQ: 105, logModel: 'exponential'} as const;
const interestOpening: Opening = {
    state: INTEREST_STATE,
    rows: language => ({compound: fmt(compoundK(1000, 0.05, 10), 2, language)}),
    status: language => fmt(compoundK(1000, 0.05, 10), 2, language),
};
const logRows = (language: Language) => ({
    slope: fmt(lnSlope(1000, 1.05, 0, 10), 6, language),
    'last-ln': fmt(lnOf(1000, 1.05, 10), 6, language),
    'ln-q': fmt(Math.log(1.05), 6, language),
    'q-from-slope': fmt(Math.exp(lnSlope(1000, 1.05, 0, 10)), 6, language),
    start: '1000', factor: fmt(1.05, 6, language),
});
const logOpening: Opening = {
    state: LOG_STATE,
    rows: logRows,
    status: language => fmt(lnSlope(1000, 1.05, 0, 10), 6, language),
};
const OPENINGS: Record<(typeof STEP_IDS)[number], Opening> = {
    'rg5-ordinary': interestOpening, 'rg5-predict-log': interestOpening,
    'rg5-line': logOpening, 'rg5-slope': logOpening, 'rg5-power': logOpening, 'rg5-explore': logOpening,
};

function checkOpenings(language: Language) {
    setLanguage(language);
    const m = mountGrowth();
    try {
        for (const id of [...STEP_IDS, ...STEP_IDS.slice().reverse()]) {
            const opening = OPENINGS[id];
            m.scene(id);
            m.scene(id);
            const state = m.state();
            expect({id, language, ...Object.fromEntries(Object.keys(opening.state).map(key => [key, state[key]]))}).toEqual({id, language, ...opening.state});
            for (const [row, text] of Object.entries(opening.rows(language))) {
                expect({id, language, row, ok: stripped(readout(row)).startsWith(stripped(text))}).toEqual({id, language, row, ok: true});
            }
            expect({id, language, status: stripped(status()).includes(stripped(opening.status(language)))}).toEqual({id, language, status: true});
        }
        m.restore();
        expect(JSON.stringify(m.graph.state)).toBe(m.free);
    } finally {
        m.mounted.view.unmount();
    }
}

test('RG5: every step opens in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice, in both languages; leaving restores the free state', () => {
    expect(lesson.steps.map(step => step.id)).toEqual([...STEP_IDS]);
    for (const language of LANGUAGES) checkOpenings(language);
});

// ---- controls and readouts the prompts name --------------------------------------------------------------------------------------------

/** Per step, the labels its prompt names (sl, en) and the graph string keys they must be found in. */
const NAMED: Record<string, readonly {readonly sl: string; readonly en: string; readonly keys: readonly MessageKey[]}[]> = {
    'rg5-ordinary': [{sl: 'Obrestno obrestovanje', en: 'Compound interest', keys: ['recursion_graph_growth_r_compound']}],
    'rg5-predict-log': [
        {sl: 'Prikaz', en: 'View', keys: ['recursion_graph_growth_panel_label']},
        {sl: 'Logaritem y', en: 'Logarithm of y', keys: ['recursion_graph_growth_panel_log']},
    ],
    'rg5-line': [{sl: 'Začetna vrednost', en: 'Starting value', keys: ['recursion_graph_growth_y0_label', 'recursion_graph_growth_r_y0']}],
    'rg5-slope': [
        {sl: 'Faktor rasti q', en: 'Growth factor q', keys: ['recursion_graph_growth_logq_label', 'recursion_graph_growth_r_factor']},
        {sl: 'q iz naklona', en: 'q from the slope', keys: ['recursion_graph_growth_r_q_from_slope']},
    ],
    'rg5-power': [
        {sl: 'Model', en: 'Model', keys: ['recursion_graph_growth_model_label']},
        {sl: 'Potenčni', en: 'Power', keys: ['recursion_graph_growth_model_power']},
        {sl: 'Naklon prvega koraka', en: 'Slope of the first step', keys: ['recursion_graph_growth_r_slope_first']},
        {sl: 'Naklon zadnjega koraka', en: 'Slope of the last step', keys: ['recursion_graph_growth_r_slope_last']},
        {sl: 'Točke na premici?', en: 'Points on a line?', keys: ['recursion_graph_growth_r_line']},
    ],
};

test('RG5: every control and readout label a prompt names exists in the sl and en strings of the graph, and the step text names it', () => {
    const catalogs = {sl: sl as Record<MessageKey, string>, en: en};
    for (const [id, names] of Object.entries(NAMED)) {
        const step = stepOf(id);
        for (const language of LANGUAGES) {
            const prompt = [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language])].join(' ');
            for (const name of names) {
                const label = name[language];
                expect({id, language, label, inText: prompt.includes(label)}).toEqual({id, language, label, inText: true});
                const found = name.keys.some(key => catalogs[language][key].includes(label));
                expect({id, language, label, inGraph: found}).toEqual({id, language, label, inGraph: true});
            }
        }
    }
});

test('RG5: no step opens in the state its prompt asks the learner to produce', () => {
    const targets: Record<string, Readonly<Record<string, unknown>>[]> = {
        'rg5-predict-log': [{panel: 'log'}],
        'rg5-line': [{y0: 100}],
        'rg5-slope': [{logQ: 200}, {logQ: 50}],
        'rg5-power': [{logModel: 'power'}],
        'rg5-explore': [{logQ: 200}, {logQ: 50}],
    };
    const m = mountGrowth();
    try {
        for (const [id, goals] of Object.entries(targets)) {
            m.scene(id);
            const state = m.state();
            for (const goal of goals) {
                const alreadyThere = Object.entries(goal).every(([key, value]) => state[key] === value);
                expect({id, goal, alreadyThere}).toEqual({id, goal, alreadyThere: false});
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- learner actions -------------------------------------------------------------------------------------------------------------------

test('RG5: the panel chosen, the values typed and the model chosen give the readouts the text quotes, in both languages', () => {
    for (const language of LANGUAGES) {
        setLanguage(language);
        const m = mountGrowth();
        try {
            const rowsNow = (rows: Record<string, string>, id: string) => {
                for (const [row, text] of Object.entries(rows)) expect({id, language, row, text: stripped(readout(row)).startsWith(stripped(text))}).toEqual({id, language, row, text: true});
            };
            // step 2: the chooser from the interest opening to the logarithm panel keeps y0 = 1000 and q = 1,05
            m.scene('rg5-predict-log');
            choose('recursion_graph_growth_panel_label', 'log');
            expect(m.state()).toEqual(expect.objectContaining({panel: 'log', y0: 1000, logQ: 105, logModel: 'exponential'}));
            rowsNow(logRows(language), 'rg5-predict-log');
            expect(stripped(status())).toContain(stripped(fmt(Math.log(1.05), 6, language)));
            expect(stripped(status())).toContain(stripped(fmt(1.05, 6, language)));
            // step 3: y0 = 100 moves the line by ln 10 and leaves the slope
            m.scene('rg5-line');
            type('recursion_graph_growth_y0_label', '100');
            expect(m.state()).toEqual(expect.objectContaining({y0: 100}));
            rowsNow({'last-ln': fmt(lnOf(100, 1.05, 10), 6, language), slope: fmt(lnSlope(100, 1.05, 0, 10), 6, language), start: '100'}, 'rg5-line');
            expect(lnOf(1000, 1.05, 10) - lnOf(100, 1.05, 10)).toBeCloseTo(Math.log(10), 12);
            // step 4: q = 2 and q = 0,5
            m.scene('rg5-slope');
            type('recursion_graph_growth_logq_label', typed(2, language));
            expect(m.state()).toEqual(expect.objectContaining({logQ: 200}));
            rowsNow({slope: fmt(Math.log(2), 6, language), 'q-from-slope': fmt(2, 6, language)}, 'rg5-slope');
            type('recursion_graph_growth_logq_label', typed(0.5, language));
            expect(m.state()).toEqual(expect.objectContaining({logQ: 50}));
            rowsNow({slope: fmt(Math.log(0.5), 6, language), 'q-from-slope': fmt(0.5, 6, language)}, 'rg5-slope');
            // step 5: the model chooser to Power
            m.scene('rg5-power');
            choose('recursion_graph_growth_model_label', 'power');
            expect(m.state()).toEqual(expect.objectContaining({logModel: 'power'}));
            rowsNow({'slope-first': fmt(2 * Math.log(2 / 1), 6, language), 'slope-last': fmt(2 * Math.log(11 / 10), 6, language), line: language === 'sl' ? 'ne' : 'no'}, 'rg5-power');
            expect(stripped(status())).toContain(stripped(fmt(2 * Math.log(2), 6, language)));
            expect(stripped(status())).toContain(stripped(fmt(2 * Math.log(1.1), 6, language)));
        } finally {
            m.mounted.view.unmount();
        }
    }
});

// ---- a prediction step does not show its own answer ------------------------------------------------------------------------------------

/** Everything a step shows before the reveal: title, purpose, explanation, prompt, scene text, the formula blocks and the worked example it carries. */
function shown(stepId: string, language: Language): string {
    const step = stepOf(stepId);
    const blocks = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id)).flatMap(block => [block.latex, block.notation[language], block.explanation[language]]);
    const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId)
        .flatMap(example => [example.title[language], example.calculationLatex, example.resultLatex, example.check?.[language] ?? '']);
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language], ...blocks, ...examples].join(' ');
}
/** The answers of a prediction step, as they appear in text (sl and en spellings). */
const ANSWERS: Record<string, Record<Language, readonly string[]>> = {
    'rg5-power': {
        sl: ['1,386294', '0,19062', 'ne ležijo na premici', 'ne leži'],
        en: ['1.386294', '0.19062', 'do not lie on a line', 'not on a line'],
    },
    'rg5-slope': {sl: ['0,693147', '−0,693147'], en: ['0.693147', '−0.693147']},
    'rg5-predict-log': {sl: ['0,04879'], en: ['0.04879']},
};

test('RG5: a step that asks a prediction does not show the answer to its own prediction in its explanation, formulas, worked example or scene text', () => {
    for (const [id, answers] of Object.entries(ANSWERS)) {
        for (const language of LANGUAGES) {
            const text = shown(id, language).replace(/\{,\}/g, ',').replace(/-(?=0[.,])/g, '−');
            const leaked = answers[language].filter(answer => text.includes(answer));
            expect({id, language, leaked}).toEqual({id, language, leaked: []});
        }
    }
    // step 5 shows neither the contrast formula nor the two-slope example; step 6 (after the reveal) carries both
    expect(stepOf('rg5-power').formulaIds).toEqual([]);
    expect(stepOf('rg5-power').workedExampleId).toBeUndefined();
    expect(stepOf('rg5-explore').formulaIds).toEqual(['power-contrast']);
    expect(stepOf('rg5-explore').workedExampleId).toBe('rg5-power');
});

// ---- part B: every quoted number recomputed independently of the graph ------------------------------------------------------------------

const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));
/** Every number with decimals written with a point (English), and every number written with a comma (Slovenian). */
const pointDecimals = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);
const commaDecimals = (text: string) => [...prose(text).matchAll(/(?<![0-9,])[0-9]+,[0-9]+/g)].map(match => match[0]);
/** A number as the prose writes it: `digits` decimals, trailing zeros kept when `keep` (money), separator of the language. */
const written = (value: number, digits: number, language: Language, keep = false): string => {
    const text = keep ? value.toFixed(digits) : Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
};

/** Every text a step shows or carries, per language: its own fields, the scene text, the formula blocks and the worked example it carries. */
function stepTexts(stepId: string, language: Language, latex = true): string[] {
    const step = stepOf(stepId);
    const blocks = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id)).flatMap(block => [...(latex ? [block.latex] : []), block.notation[language], block.explanation[language]]);
    const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId)
        .flatMap(example => [example.title[language], ...(latex ? [example.calculationLatex, example.resultLatex] : []), example.check?.[language] ?? '']);
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language],
        ...step.expectedObservations.map(o => o[language]), ...blocks, ...examples];
}
/** Every text of the lesson in the language, with the lesson-level fields. */
function lessonTexts(language: Language, latex = true): string[] {
    return [...STEP_IDS.flatMap(id => stepTexts(id, language, latex)), lesson.title[language], lesson.summary[language],
        ...lesson.prerequisites.map(p => p[language]), ...lesson.learningGoals.map(g => g[language]), ...lesson.edgeCases.map(e => e[language])];
}

interface Quoted { readonly what: string; readonly value: number; readonly digits: number; readonly keep?: boolean; readonly steps: readonly (typeof STEP_IDS)[number][] }
// the data of the lesson, computed from the rule y_n = 1000 * 1.05^n (and y_n = 1000 n^2 for the power data), not from the graph
const Y = (n: number) => 1000 * Math.pow(1.05, n);
const POWER = (n: number) => 1000 * n * n;
const QUOTED: readonly Quoted[] = [
    {what: 'y10 = 1000 * 1.05^10', value: Y(10), digits: 2, steps: ['rg5-ordinary']},
    {what: 'growth in the first year (50)', value: Y(1) - Y(0), digits: 2, steps: ['rg5-ordinary']},
    {what: 'growth in the second year (52.50)', value: Y(2) - Y(1), digits: 2, keep: true, steps: ['rg5-ordinary']},
    {what: 'slope = ln 1.05', value: Math.log(1.05), digits: 5, steps: ['rg5-predict-log', 'rg5-line', 'rg5-slope', 'rg5-explore']},
    {what: 'slope as the difference quotient of ln y over the plotted points', value: (Math.log(Y(10)) - Math.log(Y(0))) / 10, digits: 5, steps: ['rg5-predict-log', 'rg5-line']},
    {what: 'ln y10, y0 = 1000', value: Math.log(Y(10)), digits: 6, steps: ['rg5-line']},
    {what: 'ln y10, y0 = 100', value: Math.log(100 * Math.pow(1.05, 10)), digits: 6, steps: ['rg5-line']},
    {what: 'ln 1000', value: Math.log(1000), digits: 6, steps: ['rg5-line']},
    {what: 'ln 10', value: Math.log(10), digits: 6, steps: ['rg5-line']},
    {what: '10 ln 1.05', value: 10 * Math.log(1.05), digits: 6, steps: ['rg5-line']},
    {what: 'log10 1.05', value: Math.log10(1.05), digits: 7, steps: ['rg5-line']},
    {what: 'log10 y10', value: Math.log10(Y(10)), digits: 6, steps: ['rg5-line']},
    {what: 'ln 2 (q = 2)', value: Math.log(2), digits: 6, steps: ['rg5-slope', 'rg5-explore']},
    {what: 'ln 0.5 in absolute value (q = 0.5)', value: Math.abs(Math.log(0.5)), digits: 6, steps: ['rg5-slope', 'rg5-explore']},
    {what: '2 ln 2, the first slope of the power data', value: Math.log(POWER(2)) - Math.log(POWER(1)), digits: 6, steps: ['rg5-power', 'rg5-explore']},
    {what: '2 ln 1.1, the last slope of the power data', value: Math.log(POWER(11)) - Math.log(POWER(10)), digits: 5, steps: ['rg5-power', 'rg5-explore']},
];
/** Values the text writes as rounded results: the first occurrence in a text must follow an approximation sign or word (ln 10, ln 1000, 10 ln 1.05, log10 1.05). */
const APPROXIMATE = [{value: Math.log(10), digits: 6}, {value: Math.log(1000), digits: 6}, {value: 10 * Math.log(1.05), digits: 6}, {value: Math.log10(1.05), digits: 7}];

test('RG5: the quoted numbers are the independently computed values, in the sl and en text of the steps that quote them', () => {
    for (const quoted of QUOTED) {
        for (const language of LANGUAGES) {
            const value = written(quoted.value, quoted.digits, language, quoted.keep);
            for (const id of quoted.steps) {
                const found = stepTexts(id, language).some(text => hasNumber(text, value));
                expect({what: quoted.what, language, id, value, found}).toEqual({what: quoted.what, language, id, value, found: true});
            }
        }
    }
});

test('RG5: the slope is the exact difference quotient of ln y over the plotted points, the same for every pair of neighbours', () => {
    const ns = Array.from({length: 11}, (_, n) => n);
    const differences = ns.slice(1).map(n => Math.log(Y(n)) - Math.log(Y(n - 1)));
    for (const difference of differences) expect(difference).toBeCloseTo(Math.log(1.05), 12);
    expect((Math.log(Y(10)) - Math.log(Y(0))) / 10).toBeCloseTo(Math.log(1.05), 12);
    expect(Math.exp(Math.log(1.05))).toBeCloseTo(1.05, 12);
    // moving y0 from 1000 to 100 moves ln y by ln 10 and leaves the slope
    expect(Math.log(Y(10)) - Math.log(100 * Math.pow(1.05, 10))).toBeCloseTo(Math.log(10), 12);
    expect(Math.log(1000) + 10 * Math.log(1.05)).toBeCloseTo(Math.log(Y(10)), 12);
    expect(Math.log10(Y(10))).toBeCloseTo(3 + 10 * Math.log10(1.05), 12);
    // the power data: the slope changes with n, first 2 ln 2, last 2 ln 1.1, and q = 1 gives slope 0
    expect(Math.log(POWER(2)) - Math.log(POWER(1))).toBeCloseTo(2 * Math.log(2), 12);
    expect(Math.log(POWER(11)) - Math.log(POWER(10))).toBeCloseTo(2 * Math.log(1.1), 12);
    expect(2 * Math.log(2)).toBeGreaterThan(2 * Math.log(1.1));
    expect(Math.log(1)).toBe(0);
    expect(Math.log(0.5)).toBeCloseTo(-Math.log(2), 12);
    // the rounded numbers of the text
    expect(written(Y(10), 2, 'en')).toBe('1628.89');
    expect(written(Y(2) - Y(1), 2, 'en', true)).toBe('52.50');
});

test('RG5: no English decimal in the Slovenian text, no decimal comma in the English text, and every decimal written is one of the lesson values', () => {
    const known = new Set(QUOTED.map(quoted => written(quoted.value, quoted.digits, 'en', quoted.keep)));
    for (const value of ['1.05', '0.5', '1.1', '0.0211893', '3.211893', '7.395657', '5.093072', '0.693147', '0.04879']) known.add(value);
    expect(commaDecimals(lessonTexts('sl').join(' ')).length).toBeGreaterThan(0);
    for (const language of LANGUAGES) {
        const joined = lessonTexts(language, false).join(' ');
        if (language === 'sl') expect({english: pointDecimals(joined)}).toEqual({english: []});
        else expect({slovenian: commaDecimals(joined)}).toEqual({slovenian: []});
        const decimals = (language === 'sl' ? commaDecimals(joined) : pointDecimals(joined)).map(value => value.replace(',', '.'));
        const unaccounted = [...new Set(decimals.filter(value => !known.has(value)))];
        expect({language, unaccounted}).toEqual({language, unaccounted: []});
    }
});

test('RG5: a rounded result carries an approximation sign or word before its first occurrence in every text, in both languages', () => {
    for (const language of LANGUAGES) {
        for (const approximate of APPROXIMATE) {
            const value = written(approximate.value, approximate.digits, language);
            for (const text of lessonTexts(language)) {
                const source = prose(text);
                const at = source.search(new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9])`));
                if (at < 0) continue;
                const before = source.slice(Math.max(0, at - 24), at);
                expect({language, value, approximate: /\\approx|približno|about|zaokrož|rounded/.test(before)}).toEqual({language, value, approximate: true});
            }
        }
    }
});
