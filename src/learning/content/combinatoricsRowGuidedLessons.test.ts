/**
 * CB5 (row sums, alternating sums, the hockey stick, the weights; `counting-tree` view `row`): every scene opens the real CountingTreeGraph in the state the
 * text states (both languages, out of order and twice, one synchronous sequence from a restored checkpoint), the learner actions the text asks for give the
 * readouts the text quotes, and no step shows the answer of its own prediction. Counts are recomputed here with BigInt (Pascal's rule), not with the kernel.
 */
import {act, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {CB5_CHANGES, CB5_SCENES, ROW_SUMS_LESSON_ID, rowSceneActions, rowSumsLesson} from './combinatoricsRowGuidedLessons';
import type {RowSceneSpec} from './combinatoricsRowGuidedLessons';
import type {GuidedLesson} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {CountingTreeGraph} from '../../graphs/combinatorics/CountingTreeGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- exact arithmetic (BigInt, Pascal's rule) ---------------------------------------------------------------------------------------

function pascal(n: number): bigint[] {
    let row = [1n];
    for (let i = 0; i < n; i++) row = Array.from({length: row.length + 1}, (_, j) => (row[j - 1] ?? 0n) + (row[j] ?? 0n));
    return row;
}
const choose = (n: number, k: number): bigint => pascal(n)[k];
/** C(n, k) t^k (1 - t)^(n - k), from the exact coefficient and doubles. */
const weight = (n: number, k: number, t: number): number => Number(choose(n, k)) * t ** k * (1 - t) ** (n - k);
const hockey = (n: number, k: number): bigint => { let sum = 0n; for (let j = k; j <= n; j++) sum += choose(j, k); return sum; };

// ---- the graph ------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '';
const status = () => document.querySelector('[data-combinatorics-status]')?.textContent ?? '';
const allReadouts = () => [...document.querySelectorAll('[data-readout]')].map(node => node.textContent);
/** The integers of a text, with the thousands separators (NBSP, thin space, an English comma) removed first. */
const tokens = (text: string): string[] =>
    text.replace(/(?<=\d)[    ](?=\d{3}(?!\d))/g, '').replace(/(?<=\d),(?=\d{3}(?!\d))/g, '').match(/(?<![0-9])[0-9]+(?![0-9])/g) ?? [];
/** The decimal number of a weight readout ("0,3087 (izračunano)" or "0.3087 (computed)"). */
const decimal = (text: string): number => Number(text.replace(/\(.*\)/, '').replace(/[   \s]/g, '').replace(',', '.'));
const decimalText = (value: number, language: Language) => String(value).replace('.', language === 'sl' ? ',' : '.');

function pick(state: object, keys: string[]): Record<string, unknown> {
    const record = state as Record<string, unknown>;
    return Object.fromEntries(keys.map(key => [key, record[key]]));
}

/** The graph in `language`, a restored-checkpoint scene runner and the learner's field entries (a label, typed and confirmed). */
function mountRow(language: Language) {
    setLanguage(language);
    const graph = new CountingTreeGraph();
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const scene = (stepId: string) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(rowSumsLesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
    });
    /** A slider's exact field is named "<label>, vrednost"; a count's field is named by its label. */
    const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
    const type = (label: string, value: string) => act(() => { enterNumber(field(label), value); });
    const nLabel = t('combinatorics_counting_row_n_label');
    const kLabel = t('combinatorics_counting_row_k_label');
    const tLabel = t('combinatorics_counting_t_label');
    return {graph, mounted, capabilities, checkpoint, scene, type, nLabel, kLabel, tLabel, field, language};
}
type Row = ReturnType<typeof mountRow>;
const done = (m: Row) => m.mounted.view.unmount();

const STEP_OF: Record<string, keyof typeof CB5_SCENES> = {
    'cb5-sum': 'sum', 'cb5-alternating': 'alternating', 'cb5-hockey': 'hockey', 'cb5-weights': 'weights', 'cb5-bridge': 'bridge', 'cb5-explore': 'explore',
};

/** The state fields and the readouts a (n, k, t) row must show, from the independent arithmetic. */
function expectRow(m: Row, id: string, spec: RowSceneSpec): void {
    const {n, k, t: weightT} = spec;
    const sum = 2n ** BigInt(n);
    const alternating = n === 0 ? 1n : 0n;
    expect({id, ...pick(m.graph.state, ['view', 'n', 'k'])}).toEqual({id, view: 'row', n, k});
    expect({id, t: Number((m.graph.state as unknown as {t: number}).t) / 100}).toEqual({id, t: weightT});
    expect({id, status: tokens(status()).slice(0, 3)}).toEqual({id, status: [String(n), String(sum), String(alternating)]});
    expect({id, rowSum: tokens(readout('row-sum'))}).toEqual({id, rowSum: [String(sum), '2']});
    expect({id, alternating: tokens(readout('alternating'))}).toEqual({id, alternating: [String(alternating)]});
    const terms: string[] = [];
    for (let j = k; j <= n; j++) terms.push(String(j), String(k));
    const shown = n - k + 1 <= 5 ? terms : [...terms.slice(0, 4), ...terms.slice(-2)];
    expect({id, hockey: tokens(readout('hockey'))}).toEqual({id, hockey: [...shown, String(hockey(n, k)), String(n + 1), String(k + 1)]});
    expect({id, hockeyIdentity: hockey(n, k) === choose(n + 1, k + 1)}).toEqual({id, hockeyIdentity: true});
    expect({id, weight: decimal(readout('weight'))}).toEqual({id, weight: Number(weight(n, k, weightT).toFixed(6))});
    expect({id, weightSum: decimal(readout('weight-sum'))}).toEqual({id, weightSum: 1});
}

// ---- Part A: scenes ------------------------------------------------------------------------------------------------------------------

describe('CB5 structure', () => {
    test('has six ordered steps with one scene each, built from rowSceneActions of its CB5_SCENES entry, in both languages', () => {
        expect(rowSumsLesson.demonstrationId).toBe('counting-tree');
        expect(ROW_SUMS_LESSON_ID).toBe('counting-tree-cb5');
        expect(rowSumsLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(rowSumsLesson.steps.map(step => step.id)).toEqual(Object.keys(STEP_OF));
        for (const step of rowSumsLesson.steps) {
            const entry = CB5_SCENES[STEP_OF[step.id]];
            expect(step.scene!.id).toBe(entry.id);
            expect(step.scene!.actions).toEqual(rowSceneActions(entry.id, entry.spec));
            for (const language of LANGUAGES) {
                expect(step.scene!.expectedState[language].length).toBeGreaterThan(10);
                expect(step.explanation[language].length).toBeGreaterThan(10);
            }
        }
    });
});

test.each(LANGUAGES)('every scene lands in the stated state, status and readouts on the real graph (%s), out of order and twice', language => {
    const m = mountRow(language);
    try {
        const ids = rowSumsLesson.steps.map(step => step.id);
        for (const id of [...ids, ...ids.slice().reverse(), ...ids]) {
            m.scene(id);
            m.scene(id);
            expectRow(m, id, CB5_SCENES[STEP_OF[id]].spec);
        }
    } finally {
        done(m);
    }
});

test.each(LANGUAGES)('restoring the checkpoint on leaving returns the free state and its readouts (%s)', language => {
    const m = mountRow(language);
    try {
        const free = JSON.stringify(m.graph.state);
        const freeReadouts = allReadouts();
        const freeStatus = status();
        for (const step of rowSumsLesson.steps) m.scene(step.id);
        m.type(m.nLabel, '9');
        expect(JSON.stringify(m.graph.state)).not.toEqual(free);
        act(() => { m.capabilities.restoreState(m.checkpoint); });
        expect(JSON.stringify(m.graph.state)).toEqual(free);
        expect(allReadouts()).toEqual(freeReadouts);
        expect(status()).toEqual(freeStatus);
    } finally {
        done(m);
    }
});

// ---- Part A: names the prompts use ---------------------------------------------------------------------------------------------------

const QUOTED: Record<Language, RegExp> = {sl: /»([^«]+)«/g, en: /"([^"]+)"/g};
/** Existing lessons the bridge step names in quotes: not controls. */
const LESSON_NAMES = ['Bernsteinove bazne funkcije', 'Od binomske k normalni porazdelitvi', 'Bernstein basis functions', 'From binomial to normal'];

function textsOf(lesson: GuidedLesson, language: Language): string[] {
    return lesson.steps.flatMap(step => [
        step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]),
        ...(step.workedExampleId ? lesson.workedExamples!.filter(e => e.id === step.workedExampleId).map(e => e.check[language]) : []),
    ]);
}

test.each(LANGUAGES)('every control and readout name a prompt quotes exists in the graph strings (%s)', language => {
    setLanguage(language);
    const names = [
        t('combinatorics_counting_row_n_label'), t('combinatorics_counting_row_k_label'), t('combinatorics_counting_t_label'),
        t('combinatorics_counting_readout_row_sum'), t('combinatorics_counting_readout_alternating'), t('combinatorics_counting_readout_hockey'),
        t('combinatorics_counting_readout_weight'), t('combinatorics_counting_readout_weight_sum'),
    ];
    const quoted = new Set<string>();
    for (const text of textsOf(rowSumsLesson, language)) for (const match of text.matchAll(QUOTED[language])) if (!LESSON_NAMES.includes(match[1])) quoted.add(match[1]);
    expect(quoted.size).toBeGreaterThanOrEqual(7);
    // A readout label may be quoted without the trailing "(na 6 decimalk)" / "(rounded to 6 decimals)" part.
    for (const name of quoted) expect({name, exists: names.some(label => label === name || label.startsWith(`${name} (`))}).toEqual({name, exists: true});
});

// ---- Part A: openings are not the answers --------------------------------------------------------------------------------------------

test('no predicting step opens on the state its prompt asks the learner to produce; the prompt names the target values', () => {
    const same = (a: RowSceneSpec, b: RowSceneSpec) => a.n === b.n && a.k === b.k && a.t === b.t;
    const stepFor: Record<keyof typeof CB5_CHANGES, string> = {sum: 'cb5-sum', alternating: 'cb5-alternating', hockey: 'cb5-hockey', weights: 'cb5-weights', bridge: 'cb5-bridge'};
    for (const key of Object.keys(CB5_CHANGES) as (keyof typeof CB5_CHANGES)[]) {
        const step = rowSumsLesson.steps.find(s => s.id === stepFor[key])!;
        const opening = CB5_SCENES[key].spec;
        for (const change of CB5_CHANGES[key]) {
            expect({key, opensOnTarget: same(opening, change)}).toEqual({key, opensOnTarget: false});
            // Each target value that differs from the opening appears in the observation prompt (sl comma and en point decimals).
            const prompt = (language: Language) => step.observationPrompt[language].replace(/\\\(|\\\)/g, '').replace('{,}', ',');
            for (const language of LANGUAGES) {
                const changed: [string, number][] = [];
                if (change.n !== opening.n) changed.push(['n', change.n]);
                // Lowering n below k lowers k by itself (the status says so): the prompt need not name it.
                if (change.k !== opening.k && change.n >= opening.n) changed.push(['k', change.k]);
                for (const [name, value] of changed) expect({key, language, name, found: new RegExp(`${name}=${value}(?![0-9])`).test(prompt(language))}).toEqual({key, language, name, found: true});
                if (change.t !== opening.t) expect({key, language, t: prompt(language).includes(decimalText(change.t, language))}).toEqual({key, language, t: true});
            }
        }
    }
    // The free step needs no change; its scene is the neutral start.
    expect(CB5_SCENES.explore.spec).toEqual({n: 6, k: 3, t: 0.5});
});

// ---- Part A: the learner's actions give the quoted readouts ------------------------------------------------------------------------------

describe.each(LANGUAGES)('learner actions give the quoted readouts (%s)', language => {
    const run = (stepId: string, body: (m: Row) => void) => {
        const m = mountRow(language);
        try {
            m.scene(stepId);
            body(m);
        } finally {
            done(m);
        }
    };
    const rowShows = (m: Row, id: string, spec: RowSceneSpec) => expectRow(m, id, spec);

    test('step 1: n = 7 shows 128 = 2^7, then n = 10 shows 1024 = 2^10; k stays 2', () => {
        run('cb5-sum', m => {
            m.type(m.nLabel, '7');
            expect(tokens(readout('row-sum')).slice(0, 2)).toEqual(['128', '2']);
            rowShows(m, 'sum n7', CB5_CHANGES.sum[0]);
            m.type(m.nLabel, '10');
            expect(tokens(readout('row-sum')).slice(0, 2)).toEqual(['1024', '2']);
            rowShows(m, 'sum n10', CB5_CHANGES.sum[1]);
        });
    });

    test('step 2: n = 0 shows sum 1, alternating sum 1 and lowers k to 0 (the status says so)', () => {
        run('cb5-alternating', m => {
            expect(tokens(readout('alternating'))).toEqual(['0']);
            m.type(m.nLabel, '0');
            rowShows(m, 'alternating n0', CB5_CHANGES.alternating[0]);
            expect(tokens(readout('row-sum')).slice(0, 2)).toEqual(['1', '2']);
            expect(tokens(readout('alternating'))).toEqual(['1']);
            expect(tokens(status()).slice(-1)).toEqual(['0']);
            expect(status().length).toBeGreaterThan(tokens(status()).join('').length + 10);
        });
    });

    test('step 3: n and k in either order; the intermediate readouts are the other diagonals, the end is 70 = C(8, 4)', () => {
        run('cb5-hockey', m => {
            expect(tokens(readout('hockey'))).toEqual(['1', '1', '2', '1', '3', '1', '4', '1', '10', '5', '2']);
            m.type(m.kLabel, '3');
            expect({n: m.graph.state.n, k: m.graph.state.k}).toEqual({n: 4, k: 3});
            expect(tokens(readout('hockey'))).toEqual(['3', '3', '4', '3', '5', '5', '4']);
            m.type(m.nLabel, '7');
            rowShows(m, 'hockey k then n', CB5_CHANGES.hockey[0]);
            expect(tokens(readout('hockey')).slice(-3)).toEqual(['70', '8', '4']);
        });
        run('cb5-hockey', m => {
            m.type(m.nLabel, '7');
            expect({n: m.graph.state.n, k: m.graph.state.k}).toEqual({n: 7, k: 1});
            expect(tokens(readout('hockey')).slice(-3)).toEqual(['28', '8', '2']);
            m.type(m.kLabel, '3');
            rowShows(m, 'hockey n then k', CB5_CHANGES.hockey[0]);
            expect(tokens(readout('hockey')).slice(-3)).toEqual(['70', '8', '4']);
        });
    });

    test('step 4: the weight is 0.3087 at the opening and 10/32 = 0.3125 after the slider is moved to 0.5; the sum stays 1', () => {
        run('cb5-weights', m => {
            expect(decimal(readout('weight'))).toBe(0.3087);
            expect(readout('weight')).toContain(decimalText(0.3087, language));
            m.type(m.tLabel, decimalText(0.5, language));
            rowShows(m, 'weights t.5', CB5_CHANGES.weights[0]);
            expect(readout('weight')).toContain(decimalText(0.3125, language));
            expect(decimal(readout('weight-sum'))).toBe(1);
        });
    });

    test('step 5: the weight of place 6 in row 8 grows from 0.003845 to 0.148803 as t goes 0.25 -> 0.9; the sum stays 1', () => {
        run('cb5-bridge', m => {
            expect(readout('weight')).toContain(decimalText(0.003845, language));
            m.type(m.tLabel, decimalText(0.9, language));
            rowShows(m, 'bridge t.9', CB5_CHANGES.bridge[0]);
            expect(readout('weight')).toContain(decimalText(0.148803, language));
            expect(decimal(readout('weight-sum'))).toBe(1);
        });
    });

    test('step 6: n = 20, k = 10, t = 0.5 gives 0.176197 and 2^20 = 1048576', () => {
        run('cb5-explore', m => {
            m.type(m.nLabel, '20');
            m.type(m.kLabel, '10');
            rowShows(m, 'explore n20 k10', {n: 20, k: 10, t: 0.5});
            expect(readout('weight')).toContain(decimalText(0.176197, language));
            expect(tokens(readout('row-sum')).slice(0, 2)).toEqual(['1048576', '2']);
        });
    });
});

// ---- Part A: a prediction step does not show its own answer ------------------------------------------------------------------------------

/** What the explanation, the formula blocks and the worked example of a step show: everything but the observation. */
function shownBefore(language: Language, stepId: string): string {
    const step = rowSumsLesson.steps.find(s => s.id === stepId)!;
    const formulas = rowSumsLesson.formulaBlocks.filter(f => step.formulaIds.includes(f.id)).flatMap(f => [f.latex, f.notation[language], f.explanation[language]]);
    const examples = step.workedExampleId
        ? rowSumsLesson.workedExamples.filter(e => e.id === step.workedExampleId).flatMap(e => [e.title[language], e.calculationLatex, e.resultLatex, e.check[language]])
        : [];
    return [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], ...formulas, ...examples].join(' ');
}
const squash = (text: string) => text.replace(/\\,/g, '').replace(/\{,\}/g, ',').replace(/\s+/g, '');

/** The answers each prediction step quotes in its expected observation, as substrings of the squashed LaTeX/prose. */
const ANSWERS: Record<string, string[]> = {
    'cb5-sum': ['128', '1024', '2^7', '2^{10}'],
    'cb5-alternating': ['(1-1)^0=1', '\\binom00=1'],
    'cb5-hockey': ['70', '\\binom84', '=70'],
    'cb5-weights': ['0,3125', '0.3125', '10}{32}', '10/32'],
    'cb5-bridge': ['0,148803', '0.148803', '7,2', '7.2', '=1^n=1'],
};

test.each(LANGUAGES)('a prediction step does not render the quoted answer of its own expected observation (%s)', language => {
    for (const [stepId, answers] of Object.entries(ANSWERS)) {
        const shown = squash(shownBefore(language, stepId));
        const observation = squash(rowSumsLesson.steps.find(s => s.id === stepId)!.expectedObservations.map(o => o[language]).join(' '));
        for (const answer of answers) {
            // The answer is quoted by the observation (or is the one answer string of the other language) and absent from what is shown before.
            expect({stepId, answer, shown: shown.includes(answer)}).toEqual({stepId, answer, shown: false});
        }
        expect(observation.length).toBeGreaterThan(40);
    }
    // The answers are really in the observations (so the check above is not vacuous).
    const observed = (stepId: string) => squash(rowSumsLesson.steps.find(s => s.id === stepId)!.expectedObservations.map(o => o[language]).join(' '));
    expect(observed('cb5-sum')).toContain('128');
    expect(observed('cb5-hockey')).toContain('70');
    expect(observed('cb5-weights')).toContain(language === 'sl' ? '0,3125' : '0.3125');
    expect(observed('cb5-bridge')).toContain(language === 'sl' ? '0,148803' : '0.148803');
});


// ======================================================================================================================================
// Part B: exact recomputation (BigInt and doubles), independent of the graph and of src/combinatorics/.
// ======================================================================================================================================

test('row sums are 2^n for n <= 60 and alternating sums are 0 for n >= 1 (1 at n = 0); the hockey stick holds for n <= 30', () => {
    for (let n = 0; n <= 60; n++) {
        const row = pascal(n);
        expect({n, sum: row.reduce((a, b) => a + b, 0n)}).toEqual({n, sum: 2n ** BigInt(n)});
        const alternating = row.reduce((a, b, k) => (k % 2 === 0 ? a + b : a - b), 0n);
        expect({n, alternating}).toEqual({n, alternating: n === 0 ? 1n : 0n});
    }
    for (let n = 0; n <= 30; n++) {
        for (let k = 0; k <= n; k++) expect({n, k, sum: hockey(n, k)}).toEqual({n, k, sum: pascal(n + 1)[k + 1]});
    }
});

/** Every localized string of the lesson in `language`, found by walking the object. */
function allTexts(language: Language): string[] {
    const out: string[] = [];
    const walk = (value: unknown): void => {
        if (typeof value === 'string' || value === null || typeof value !== 'object') return;
        if (Array.isArray(value)) { value.forEach(walk); return; }
        const record = value as Record<string, unknown>;
        if (typeof record.sl === 'string' && typeof record.en === 'string') { out.push(record[language] as string); return; }
        Object.values(record).forEach(walk);
    };
    walk(rowSumsLesson);
    return out;
}
const flat = (language: Language) => allTexts(language).join(' ¶ ').replace(/\\,/g, '').replace(/\{,\}/g, '.');

test.each(LANGUAGES)('every number the text quotes is recomputed (%s)', language => {
    const text = flat(language).replace(/\s+/g, '');
    const dec = (value: number) => String(value);
    const has = (needle: string) => expect({needle, found: text.includes(needle.replace(/\s+/g, ''))}).toEqual({needle, found: true});
    // Row sums: 2^7 = 128, 2^10 = 1024, 2^20 = 1048576, the opening rows 16 and 64.
    for (const [n, shown] of [[7, '128'], [10, '1024'], [20, '1048576'], [4, '16'], [6, '64']] as const) {
        expect({n, shown, exact: String(2n ** BigInt(n))}).toEqual({n, shown, exact: shown});
    }
    has(`${2n ** 7n}=2^7`);
    has(`${2n ** 10n}=2^{10}`);
    has(`${choose(20, 10)}/${2n ** 20n}`);
    has('\\binom{20}{10}');
    // Hockey stick: the terms 1 + 4 + 10 + 20 + 35 = 70 = C(8, 4); 1 + 2 + 3 + 4 = 10 = C(5, 2); C(3, 3) + C(4, 3) = 5 = C(5, 4); 28 = C(8, 2).
    const terms = [3, 4, 5, 6, 7].map(j => choose(j, 3));
    expect(terms).toEqual([1n, 4n, 10n, 20n, 35n]);
    expect(terms.reduce((a, b) => a + b, 0n)).toBe(choose(8, 4));
    has(`${terms.join('+')}=${choose(8, 4)}=\\binom84`);
    expect([1, 2, 3, 4].map(j => choose(j, 1)).reduce((a, b) => a + b, 0n)).toBe(choose(5, 2));
    has(`1+2+3+4=${choose(5, 2)}=\\binom52`);
    expect(hockey(4, 3)).toBe(choose(5, 4));
    has(`\\binom33+\\binom43=${hockey(4, 3)}=\\binom54`);
    expect(hockey(7, 1)).toBe(28n);
    has(`${hockey(7, 1)}=\\binom82`);
    // Weights: C(5, 2) 0.3^2 0.7^3 = 0.3087, 10/32 = 0.3125, row 8 place 6, the means 7.2 and 2, C(20, 10) / 2^20.
    expect(Math.abs(weight(5, 2, 0.3) - 0.3087)).toBeLessThan(1e-12);
    expect(Math.abs(weight(5, 2, 0.5) - 10 / 32)).toBeLessThan(1e-15);
    expect(Math.abs(weight(8, 6, 0.25) - 0.003845)).toBeLessThan(5e-7);
    expect(Math.abs(weight(8, 6, 0.9) - 0.148803)).toBeLessThan(5e-7);
    expect(Math.abs(weight(20, 10, 0.5) - 0.176197)).toBeLessThan(5e-7);
    expect(Math.abs(Number(choose(20, 10)) / 2 ** 20 - 184756 / 1048576)).toBeLessThan(1e-15);
    expect(choose(20, 10)).toBe(184756n);
    expect({a: 8 * 0.9, b: 8 * 0.25}).toEqual({a: 7.2, b: 2});
    expect(choose(5, 2) * 9n * 343n).toBe(30870n); // 10 * 0.09 * 0.343 = 0.3087 with the decimals scaled by 10^5
    for (const quoted of [0.3087, 0.3125, 0.003845, 0.148803, 0.176197, 7.2]) has(dec(quoted));
    has('10\\cdot0.09\\cdot0.343=0.3087');
    has('\\tfrac{10}{32}=0.3125');
    has(`${choose(20, 10)}/${2n ** 20n}`);
});

test.each(LANGUAGES)('the weights at the scenes\' t are C(n, k) t^k (1 - t)^(n - k) and each row sums to 1 (%s)', language => {
    const m = mountRow(language);
    try {
        const ids = rowSumsLesson.steps.map(step => step.id);
        const specs = [...ids.map(id => CB5_SCENES[STEP_OF[id]].spec), ...Object.values(CB5_CHANGES).flat(), {n: 20, k: 10, t: 0.5}];
        for (const spec of specs) {
            const weights = Array.from({length: spec.n + 1}, (_, j) => weight(spec.n, j, spec.t));
            expect({spec, sum: Math.abs(weights.reduce((a, b) => a + b, 0) - 1) < (spec.t === 0.5 ? 1e-15 : 1e-12)}).toEqual({spec, sum: true});
            expect({spec, formula: Math.abs(weights[spec.k] - Number(choose(spec.n, spec.k)) * spec.t ** spec.k * (1 - spec.t) ** (spec.n - spec.k)) < 1e-12}).toEqual({spec, formula: true});
        }
        // The graph's rounded readout agrees with the formula to half a unit of the sixth decimal, at the scene and after the change.
        for (const id of ids) {
            m.scene(id);
            const {n, k, t: tt} = CB5_SCENES[STEP_OF[id]].spec;
            expect({id, diff: Math.abs(decimal(readout('weight')) - weight(n, k, tt)) <= 5e-7 + 1e-12}).toEqual({id, diff: true});
        }
    } finally {
        done(m);
    }
});

describe('wording of the numbers', () => {
    const ROUNDED = ['0.003845', '0.148803', '0.176197'];
    test('the Slovenian text has no English decimals and no raw thousands commas', () => {
        const sl = allTexts('sl').join(' ¶ ');
        expect({englishDecimal: /\d\.\d/.test(sl)}).toEqual({englishDecimal: false});
        expect({thousandsComma: /\d,\d{3}(?!\d)/.test(allTexts('sl').join(' '))}).toEqual({thousandsComma: false});
    });

    test.each(LANGUAGES)('every rounded number carries "približno"/"about"/\approx right before it (%s)', language => {
        const marker = language === 'sl' ? /približno|\approx/ : /about|\approx/;
        for (const text of allTexts(language)) {
            const normal = text.replace(/\\,/g, '').replace(/\{,\}/g, '.');
            for (const rounded of ROUNDED) {
                for (let at = normal.indexOf(rounded); at >= 0; at = normal.indexOf(rounded, at + 1)) {
                    const before = normal.slice(Math.max(0, at - 14), at);
                    expect({rounded, before, ok: marker.test(before)}).toEqual({rounded, before, ok: true});
                }
            }
        }
        expect(flat(language)).toContain('0.176197');
    });
});
