/**
 * TR5 (trigonometry, batch C, solving a triangle): Part A. Every step opening lands, on the real triangle-solver graph, in the data, status and readout rows the text states (scenes applied in
 * one synchronous `act` from a restored checkpoint, out of order and twice, in sl and en); leaving restores the free state. Every control and readout label a prompt names is in the graph's
 * sl/en strings and in the rendered controls; no opening is already the state its prompt asks the learner to produce; the learner actions the text asks for, done through the real controls,
 * give the statuses and rows the text quotes; no step shows the answer to its prediction before the observation.
 */
import {act, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {triangleSolveLesson} from './trigSolveGuidedLessons';
import type {GuidedLessonStep} from './guidedLessons';
import {chooseOnPuck, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {TriangleSolverGraph} from '../../graphs/trig/TriangleSolverGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage} from '../../localization';
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
const catalog = {sl, en};
const steps = triangleSolveLesson.steps;
const stepOf = (id: string): GuidedLessonStep => steps.find(step => step.id === id)!;
const STEP_IDS = ['tr5-exists', 'tr5-inequality', 'tr5-sas', 'tr5-asa', 'tr5-ssa', 'tr5-cases', 'tr5-explore'] as const;
type StepId = typeof STEP_IDS[number];

// ---- text helpers ----------------------------------------------------------------------------------------------------------------------

const prose = (text: string) => text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,/])${escapeRegExp(value)}(?![0-9]|[.,/][0-9])`).test(prose(text));
/** A number as the text writes it: a decimal comma in sl, a point in en. */
const shown = (value: number, digits: number, language: Language) => { const s = String(Number(value.toFixed(digits))); return language === 'sl' ? s.replace('.', ',') : s; };
const catalogText = (key: keyof typeof sl, language: Language, ...values: string[]) =>
    values.reduce((text, value, index) => text.replace(`{value${index}}`, value), catalog[language][key]);

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const statusText = () => document.querySelector('[data-triangle-status]')?.textContent ?? '';
const numbersOf = (text: string | null, language: Language): number[] => {
    const normal = (text ?? '').replace(/−/g, '-').replace(language === 'sl' ? /(\d),(\d)/g : /$^/g, '$1.$2');
    return [...normal.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
};
/** The solver rows currently rendered (solutions and height), as id -> text. */
const solverRows = () => Object.fromEntries([...document.querySelectorAll('[data-readout]')]
    .map(node => [node.getAttribute('data-readout') ?? '', node.querySelector('dd')?.textContent ?? ''] as const)
    .filter(([id]) => id.startsWith('solved-') || id === 'height'));
const snapshot = () => JSON.stringify({status: statusText(), rows: solverRows()});

function mountTriangle() {
    const graph = createGraph('triangle-solver');
    if (!(graph instanceof TriangleSolverGraph)) throw new Error('triangle-solver must be the triangle solver graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const scene = (stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of sceneActions(stepOf(stepId).scene!)) capabilities.apply(action);
    });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, scene, restore, free};
}

const fieldLabel = (kind: 'side' | 'angle', name: string, language: Language) => catalogText(kind === 'side' ? 'triangle_solver_side_label' : 'triangle_solver_angle_label', language, name);
const numberField = (label: string) => (screen.queryByRole('spinbutton', {name: new RegExp(`^${escapeRegExp(label)}(,|$)`)}) ?? screen.getByLabelText(label)) as HTMLInputElement;
/** The learner types `value` (a number in the language's notation) into the field and presses Enter. */
const type = (label: string, value: number, language: Language) => act(() => { enterNumber(numberField(label), shown(value, 4, language)); });
/** The segment of the data type puck for an option: the data type is a puck on the board, not a select in Orodja. */
const dataOption = (_language: Language, key: 'sss' | 'sas' | 'asa' | 'ssa') => {
    const segment = document.querySelector<HTMLElement>(`.puck-strip [data-puck-key="triangle-data"] [role="radio"][data-value="${key}"]`);
    if (!segment) throw new Error(`The data type puck has no option "${key}".`);
    return {segment, value: key};
};
const choose = (_language: Language, key: 'sss' | 'sas' | 'asa' | 'ssa') => chooseOnPuck('triangle-data', key);

// ---- expected openings and readouts ---------------------------------------------------------------------------------------------------

type Data = {readonly type: 'sss' | 'sas' | 'asa' | 'ssa'} & Record<string, number | string>;
const SSS_5_6_7: Data = {type: 'sss', a: 5, b: 6, c: 7};
const OPENING: Record<StepId, Data> = {
    'tr5-exists': SSS_5_6_7,
    'tr5-inequality': {type: 'sss', a: 2, b: 3, c: 6},
    'tr5-sas': SSS_5_6_7,
    'tr5-asa': {type: 'sas', b: 5, c: 7, angleA: 60},
    'tr5-ssa': {type: 'ssa', a: 8, b: 8, angleA: 30},
    'tr5-cases': {type: 'ssa', a: 5, b: 8, angleA: 30},
    'tr5-explore': SSS_5_6_7,
};

interface Solution { readonly sides: readonly number[]; readonly angles: readonly number[]; readonly area?: number }
interface Expected {
    readonly status: (language: Language) => string;
    readonly solutions: readonly Solution[];
    readonly height?: number;
}
const SIDES_ANGLES_SSS_5_6_7: Solution = {sides: [5, 6, 7], angles: [44.4153, 57.1217, 78.463], area: 14.69694};
const status = (key: keyof typeof sl, ...values: number[]) => (language: Language) => catalogText(key, language, ...values.map(value => shown(value, 5, language)));
const E_SSS_5_6_7: Expected = {status: status('triangle_solver_status_one'), solutions: [SIDES_ANGLES_SSS_5_6_7]};
const E_NONE = (key: keyof typeof sl, ...values: number[]): Expected => ({status: status(key, ...values), solutions: []});
const E_SAS_5_7_60: Expected = {status: status('triangle_solver_status_one'), solutions: [{sides: [6.245, 5, 7], angles: [60, 43.8979, 76.1021], area: 15.15544}]};
const E_ASA_40_60_8: Expected = {status: status('triangle_solver_status_one'), solutions: [{sides: [5.22163, 7.03508, 8], angles: [40, 60, 80]}]};
const E_SSA_A8: Expected = {status: status('triangle_solver_status_one_ssa'), solutions: [{sides: [8, 8, 13.85641], angles: [30, 30, 120]}], height: 4};
const E_SSA_A5: Expected = {
    status: status('triangle_solver_status_two', 9.9282, 3.9282),
    solutions: [{sides: [5, 8, 9.9282], angles: [30, 53.1301, 96.8699]}, {sides: [5, 8, 3.9282], angles: [30, 126.8699, 23.1301]}], height: 4,
};
const E_TANGENT: Expected = {status: status('triangle_solver_status_tangent', 4), solutions: [{sides: [4, 8, 6.9282], angles: [30, 90, 60]}], height: 4};
const OPENING_EXPECTED: Record<StepId, Expected> = {
    'tr5-exists': E_SSS_5_6_7, 'tr5-inequality': E_NONE('triangle_solver_status_inequality'), 'tr5-sas': E_SSS_5_6_7, 'tr5-asa': E_SAS_5_7_60,
    'tr5-ssa': E_SSA_A8, 'tr5-cases': E_SSA_A5, 'tr5-explore': E_SSS_5_6_7,
};

const close = (what: string, actual: number | undefined, expected: number, tolerance: number) =>
    expect({what, ok: actual !== undefined && Math.abs(actual - expected) <= tolerance, actual, expected}).toEqual({what, ok: true, actual, expected});

/** The graph's status and solver rows against an expected state; sides and angles are compared as numbers, a zero side or empty angle list is not compared. */
function checkState(id: string, expected: Expected, language: Language) {
    expect({id, status: statusText()}).toEqual({id, status: expected.status(language)});
    const rows = solverRows();
    expect({id, solved: Object.keys(rows).filter(key => key.startsWith('solved-sides-')).length}).toEqual({id, solved: expected.solutions.length});
    expected.solutions.forEach((solution, index) => {
        const sides = numbersOf(rows[`solved-sides-${index + 1}`], language);
        const angles = numbersOf(rows[`solved-angles-${index + 1}`], language);
        if (solution.angles.length > 0) {
            solution.sides.forEach((side, i) => close(`${id} side ${i}`, sides[i], side, 2e-5));
            solution.angles.forEach((angle, i) => close(`${id} angle ${i}`, angles[i], angle, 2e-4));
        } else {
            close(`${id} side a`, sides[0], solution.sides[0], 2e-5);
            close(`${id} side b`, sides[1], solution.sides[1], 2e-5);
        }
        if (solution.area !== undefined) close(`${id} area`, numbersOf(rows[`solved-area-${index + 1}`], language)[0], solution.area, 2e-4);
    });
    if (expected.height === undefined) expect({id, height: rows.height}).toEqual({id, height: undefined});
    else close(`${id} height`, numbersOf(rows.height, language)[0], expected.height, 1e-6);
}

const dataOf = (graph: TriangleSolverGraph) => ({...graph.state.data}) as unknown as Data;

// ---- Part A: scenes ----------------------------------------------------------------------------------------------------------------------

for (const language of LANGUAGES) {
    test(`${language}: every opening lands in the data, status and rows its text states, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
        setLanguage(language);
        const m = mountTriangle();
        try {
            for (const id of [...STEP_IDS, ...STEP_IDS.slice().reverse()]) {
                m.scene(id, 2);
                expect({id, mode: m.graph.state.mode, data: dataOf(m.graph)}).toEqual({id, mode: 'solve', data: OPENING[id]});
                checkState(id, OPENING_EXPECTED[id], language);
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    });
}

// ---- Part A: the controls and readouts the prompts name -----------------------------------------------------------------------------------

describe('every control and readout a prompt names exists in the graph strings and the rendered controls', () => {
    const named: Record<StepId, (language: Language) => string[]> = {
        'tr5-exists': language => [catalog[language].triangle_solver_mode_solve, ...['c', 'b', 'a'].map(name => fieldLabel('side', name, language))],
        'tr5-inequality': language => [fieldLabel('side', 'a', language)],
        'tr5-sas': language => [catalog[language].triangle_solver_data_label, catalog[language].triangle_solver_data_sas],
        'tr5-asa': language => [catalog[language].triangle_solver_data_label, catalog[language].triangle_solver_data_asa, fieldLabel('angle', 'B', language)],
        'tr5-ssa': language => [fieldLabel('side', 'a', language), catalog[language].triangle_solver_readout_height.split(' ').slice(0, 2).join(' ')],
        'tr5-cases': language => [fieldLabel('side', 'a', language)],
        'tr5-explore': () => [],
    };
    for (const language of LANGUAGES) {
        test(`${language}: the data type puck is named by its label, not as a field, and the frames that ask for it use it`, () => {
            const label = catalog[language].triangle_solver_data_label;
            for (const id of ['tr5-sas', 'tr5-asa'] as const) {
                const explanation = prose(stepOf(id).explanation[language]);
                expect({id, label: explanation.includes(label), field: /polju Podani|field Given/.test(explanation)}).toEqual({id, label: true, field: false});
            }
            for (const id of ['tr5-sas', 'tr5-asa', 'tr5-explore'] as const) {
                expect({id, uses: stepOf(id).frames.find(frame => frame.kind === 'explanation')?.declare?.uses}).toEqual({id, uses: ['triangle-data']});
            }
        });
        test(`${language}: the names in the explanation are catalog strings`, () => {
            for (const id of STEP_IDS) {
                const explanation = prose(stepOf(id).explanation[language]);
                for (const name of named[id](language)) expect({id, name, found: explanation.includes(name)}).toEqual({id, name, found: true});
            }
            // the chooser the step 7 prompt names
            expect(prose(stepOf('tr5-explore').observationPrompt[language])).toContain(language === 'sl' ? 'SSK' : 'SSA');
        });
        test(`${language}: the controls exist in the rendered solve mode and the row label the text names is rendered`, async () => {
            setLanguage(language);
            const m = mountTriangle();
            try {
                m.scene('tr5-ssa');
                await waitForPucks('triangle-data');
                expect(numberField(fieldLabel('side', 'a', language))).toBeTruthy();
                for (const key of ['sss', 'sas', 'asa', 'ssa'] as const) expect(dataOption(language, key).value.length).toBeGreaterThan(0);
                const height = document.querySelector('[data-readout="height"]')?.textContent ?? '';
                expect(height.startsWith(catalog[language].triangle_solver_readout_height.split(' ').slice(0, 2).join(' '))).toBe(true);
                m.scene('tr5-asa');
                await choose(language, 'asa');
                expect(numberField(fieldLabel('angle', 'B', language))).toBeTruthy();
                m.scene('tr5-exists');
                for (const name of ['c', 'b', 'a']) expect(numberField(fieldLabel('side', name, language))).toBeTruthy();
                m.restore();
            } finally {
                m.mounted.view.unmount();
            }
        });
    }
});

// ---- Part A: the learner actions the text asks for ------------------------------------------------------------------------------------------

for (const language of LANGUAGES) {
    test(`${language}: the learner actions through the real controls give the statuses and rows the text quotes, and no opening is already the state its prompt asks for`, async () => {
        setLanguage(language);
        const m = mountTriangle();
        const produced = (id: StepId) => { const snap = snapshot(); expect({id, differsFromOpening: snap !== openings[id]}).toEqual({id, differsFromOpening: true}); };
        const openings = {} as Record<StepId, string>;
        try {
            for (const id of STEP_IDS) { m.scene(id); openings[id] = snapshot(); }

            // step 1: typing c, b, a in this order from SSS 5, 6, 7
            const text1 = prose(stepOf('tr5-exists').explanation[language]);
            expect([text1.indexOf('c=6'), text1.indexOf('b=3'), text1.indexOf('a=2')].every((position, i, all) => position > 0 && (i === 0 || position > all[i - 1]))).toBe(true);
            m.scene('tr5-exists');
            type(fieldLabel('side', 'c', language), 6, language);
            expect(dataOf(m.graph)).toEqual({type: 'sss', a: 5, b: 6, c: 6});
            expect(statusText()).toBe(catalogText('triangle_solver_status_one', language));
            expect(solverRows()['solved-sides-1']).toBeDefined();
            type(fieldLabel('side', 'b', language), 3, language);
            expect(dataOf(m.graph)).toEqual({type: 'sss', a: 5, b: 3, c: 6});
            expect(statusText()).toBe(catalogText('triangle_solver_status_one', language));
            type(fieldLabel('side', 'a', language), 2, language);
            expect(dataOf(m.graph)).toEqual({type: 'sss', a: 2, b: 3, c: 6});
            checkState('tr5-exists typed', OPENING_EXPECTED['tr5-inequality'], language);
            produced('tr5-exists');

            // step 2: from SSS 2, 3, 6 type a = 3 and then a = 4
            m.scene('tr5-inequality');
            type(fieldLabel('side', 'a', language), 3, language);
            checkState('tr5-inequality a=3', E_NONE('triangle_solver_status_flat'), language);
            type(fieldLabel('side', 'a', language), 4, language);
            expect(dataOf(m.graph)).toEqual({type: 'sss', a: 4, b: 3, c: 6});
            checkState('tr5-inequality a=4', {status: status('triangle_solver_status_one'), solutions: [{sides: [4, 3, 6], angles: [36.3361, 26.3843, 117.2796]}]}, language);
            produced('tr5-inequality');

            // step 3: the chooser to SKS loads b = 5, c = 7, A = 60
            m.scene('tr5-sas');
            await choose(language, 'sas');
            expect(dataOf(m.graph)).toEqual({type: 'sas', b: 5, c: 7, angleA: 60});
            checkState('tr5-sas chooser', E_SAS_5_7_60, language);
            produced('tr5-sas');

            // step 4: the chooser to KSK, then B = 150
            m.scene('tr5-asa');
            await choose(language, 'asa');
            expect(dataOf(m.graph)).toEqual({type: 'asa', angleA: 40, angleB: 60, c: 8});
            checkState('tr5-asa chooser', E_ASA_40_60_8, language);
            expect(numbersOf(solverRows()['solved-sides-1'], language)[1]).toBeCloseTo(7.03508, 4);
            type(fieldLabel('angle', 'B', language), 150, language);
            expect(dataOf(m.graph)).toEqual({type: 'asa', angleA: 40, angleB: 150, c: 8});
            checkState('tr5-asa B=150', E_NONE('triangle_solver_status_angle_sum'), language);
            produced('tr5-asa');

            // step 5: from SSA a = 8 type a = 5
            m.scene('tr5-ssa');
            type(fieldLabel('side', 'a', language), 5, language);
            checkState('tr5-ssa a=5', E_SSA_A5, language);
            produced('tr5-ssa');

            // step 6: a = 4, 3,5, 9 one after another from the default SSA
            m.scene('tr5-cases');
            type(fieldLabel('side', 'a', language), 4, language);
            checkState('tr5-cases a=4', E_TANGENT, language);
            type(fieldLabel('side', 'a', language), 3.5, language);
            expect(dataOf(m.graph)).toEqual({type: 'ssa', a: 3.5, b: 8, angleA: 30});
            expect(statusText()).toBe(catalogText('triangle_solver_status_below_height', language, shown(4, 5, language)));
            expect(Object.keys(solverRows()).filter(key => key.startsWith('solved-'))).toEqual([]);
            type(fieldLabel('side', 'a', language), 9, language);
            expect(dataOf(m.graph)).toEqual({type: 'ssa', a: 9, b: 8, angleA: 30});
            expect(statusText()).toBe(catalogText('triangle_solver_status_one_ssa', language));
            expect(Object.keys(solverRows()).filter(key => key.startsWith('solved-sides-'))).toEqual(['solved-sides-1']);
            produced('tr5-cases');

            // step 7: the chooser to SSK loads A = 30, b = 8, a = 5; the range ends and their neighbours
            m.scene('tr5-explore');
            await choose(language, 'ssa');
            expect(dataOf(m.graph)).toEqual({type: 'ssa', a: 5, b: 8, angleA: 30});
            const solutionCount = () => Object.keys(solverRows()).filter(key => key.startsWith('solved-sides-')).length;
            const counts: Record<string, number> = {};
            for (const a of [4.25, 7.75, 4, 8, 8.25]) { type(fieldLabel('side', 'a', language), a, language); counts[String(a)] = solutionCount(); }
            expect(counts).toEqual({'4.25': 2, '7.75': 2, '4': 1, '8': 1, '8.25': 1});
            expect(statusText()).toBe(catalogText('triangle_solver_status_one_ssa', language));
            produced('tr5-explore');
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    });
}

// ---- Part A: a predicting step does not show its answer before the change ---------------------------------------------------------------------

describe('a step whose prompt asks a prediction does not show the answer of its own observations before the change', () => {
    /** What the step renders before the change: explanation, its formula blocks (latex, notation, explanation), prompt and scene text (no worked examples in TR5). */
    const before = (step: GuidedLessonStep, language: Language) => [
        step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language],
        ...step.formulaIds.flatMap(id => { const block = triangleSolveLesson.formulaBlocks!.find(candidate => candidate.id === id)!; return [block.latex, block.notation[language], block.explanation[language]]; }),
    ].join(' ');
    const ANSWERS: Record<StepId, (language: Language) => string[]> = {
        'tr5-exists': language => [catalogText('triangle_solver_status_inequality', language)],
        'tr5-inequality': language => [shown(117.2796, 4, language), catalogText('triangle_solver_status_flat', language)],
        'tr5-sas': language => [shown(6.245, 3, language), shown(43.8979, 4, language), shown(76.1021, 4, language), shown(0.7206, 4, language)],
        'tr5-asa': language => [shown(5.22163, 5, language), shown(7.03508, 5, language), catalogText('triangle_solver_status_angle_sum', language)],
        'tr5-ssa': language => [shown(9.9282, 4, language), shown(3.9282, 4, language), shown(53.1301, 4, language), shown(126.8699, 4, language), catalogText('triangle_solver_status_two', language, '', '').split(':')[0]],
        'tr5-cases': language => [shown(6.9282, 4, language), catalogText('triangle_solver_status_tangent', language, '4').split(':')[0], catalogText('triangle_solver_status_below_height', language, '4').split(':')[0]],
        'tr5-explore': language => [shown(4.25, 2, language), shown(7.75, 2, language)],
    };
    for (const language of LANGUAGES) {
        test(`${language}: no step renders an answer of its own expected observations before the change (steps 3 and 4 in particular)`, () => {
            for (const id of STEP_IDS) {
                const rendered = before(stepOf(id), language);
                for (const answer of ANSWERS[id](language)) {
                    if (answer.length === 0) continue;
                    // the answer is in the observations of the same step, and not before the change
                    const inObservation = stepOf(id).expectedObservations.some(observation => prose(observation[language]).includes(answer) || /^\d/.test(answer) === false);
                    expect({id, answer, inObservation}).toEqual({id, answer, inObservation: true});
                    expect({id, answer, shownBefore: /^[0-9,.]+$/.test(answer) ? hasNumber(rendered, answer) : prose(rendered).includes(answer)}).toEqual({id, answer, shownBefore: false});
                }
            }
            // steps 3 and 4 explicitly
            expect(hasNumber(before(stepOf('tr5-sas'), language), shown(6.245, 3, language))).toBe(false);
            expect(hasNumber(before(stepOf('tr5-asa'), language), shown(5.22163, 5, language))).toBe(false);
        });
    }
});

// ---- Part B: the quoted numbers recomputed independently of the graph and of src/trig ------------------------------------------------------------

const RAD = Math.PI / 180;
const degOf = (radians: number) => radians / RAD;
/** The angle opposite `opp` in a triangle with sides `opp`, `s1`, `s2`, by the law of cosines. */
const angleByCosines = (opp: number, s1: number, s2: number) => degOf(Math.acos((s1 * s1 + s2 * s2 - opp * opp) / (2 * s1 * s2)));
/** Heron's formula. */
const heron = (a: number, b: number, c: number) => { const s = (a + b + c) / 2; return Math.sqrt(s * (s - a) * (s - b) * (s - c)); };
/** SSA with A in degrees, side b and the side a opposite A: the positive roots c of c^2 - 2 b c cos A + b^2 - a^2 = 0 (exact decisions by the discriminant and the product). */
function ssaRoots(angleADeg: number, b: number, a: number): number[] {
    const cosA = Math.cos(angleADeg * RAD);
    // the tangent case a = h is exact on the grid, so a floating residue below 1e-9 counts as zero
    const raw = a * a - (b * Math.sin(angleADeg * RAD)) ** 2;
    const quarterDisc = Math.abs(raw) < 1e-9 ? 0 : raw;
    if (quarterDisc < -1e-12) return [];
    const root = Math.sqrt(Math.max(quarterDisc, 0));
    return [b * cosA + root, b * cosA - root].filter((c, index, all) => c > 1e-9 && (index === 0 || Math.abs(c - all[0]) > 1e-9)).sort((x, y) => y - x);
}

const T_5_6_7 = {A: angleByCosines(5, 6, 7), B: angleByCosines(6, 5, 7), C: angleByCosines(7, 5, 6)};
const T_4_3_6 = {C: angleByCosines(6, 4, 3)};
const SAS_a = Math.sqrt(5 * 5 + 7 * 7 - 2 * 5 * 7 * Math.cos(60 * RAD));
const SAS_B = angleByCosines(5, SAS_a, 7);
const SAS_cosB = (SAS_a * SAS_a + 7 * 7 - 5 * 5) / (2 * SAS_a * 7);
const ASA_C = 180 - 40 - 60;
const ASA_a = 8 * Math.sin(40 * RAD) / Math.sin(ASA_C * RAD);
const ASA_b = 8 * Math.sin(60 * RAD) / Math.sin(ASA_C * RAD);
const SSA_h = 8 * Math.sin(30 * RAD);
const SSA_8 = {B: degOf(Math.asin(8 * Math.sin(30 * RAD) / 8)), c: ssaRoots(30, 8, 8)};
const SSA_5 = {c: ssaRoots(30, 8, 5), B1: degOf(Math.asin(8 * Math.sin(30 * RAD) / 5))};
const SSA_4 = {c: ssaRoots(30, 8, 4), B: degOf(Math.asin(8 * Math.sin(30 * RAD) / 4))};

interface Quote { readonly value: number; readonly digits: number }
const Q = (value: number, digits: number): Quote => ({value, digits});
/** What each step quotes (rounded) and how many digits it writes. */
const QUOTES: Record<StepId, readonly Quote[]> = {
    'tr5-exists': [Q(T_5_6_7.A, 4), Q(T_5_6_7.B, 4), Q(T_5_6_7.C, 4)],
    'tr5-inequality': [Q(T_4_3_6.C, 4)],
    'tr5-sas': [Q(SAS_a, 3), Q(SAS_cosB, 4), Q(SAS_B, 4), Q(180 - 60 - SAS_B, 4)],
    'tr5-asa': [Q(ASA_a, 5), Q(ASA_b, 5)],
    'tr5-ssa': [Q(SSA_8.c[0], 5), Q(SSA_5.c[0], 4), Q(SSA_5.c[1], 4), Q(SSA_5.B1, 4), Q(180 - SSA_5.B1, 4)],
    'tr5-cases': [Q(SSA_4.c[0], 4)],
    'tr5-explore': [],
};
const QUOTE_INTEGERS: Record<StepId, readonly number[]> = {
    'tr5-exists': [], 'tr5-inequality': [], 'tr5-sas': [39, 74, 35], 'tr5-asa': [ASA_C], 'tr5-ssa': [Math.round(SSA_h), Math.round(SSA_8.B), Math.round(180 - 30 - SSA_8.B)],
    'tr5-cases': [Math.round(SSA_4.B), Math.round(180 - 30 - SSA_4.B)], 'tr5-explore': [],
};

const fieldsOf = (step: GuidedLessonStep, language: Language) => [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language],
    ...step.expectedObservations.map(observation => observation[language]), step.scene!.expectedState[language]];
const lessonTexts = (language: Language) => [
    triangleSolveLesson.title[language], triangleSolveLesson.summary[language], ...(triangleSolveLesson.prerequisites ?? []).map(item => item[language]),
    ...(triangleSolveLesson.learningGoals ?? []).map(item => item[language]), ...(triangleSolveLesson.edgeCases ?? []).map(item => item[language]),
    ...triangleSolveLesson.formulaBlocks!.flatMap(block => [block.notation[language], block.explanation[language]]),
    ...steps.flatMap(step => fieldsOf(step, language)),
];

describe('the numbers the text quotes equal an independent recomputation, in sl and en', () => {
    test('the recomputation itself: the law of cosines, Heron, the law of sines and the SSA quadratic agree', () => {
        expect(T_5_6_7.A + T_5_6_7.B + T_5_6_7.C).toBeCloseTo(180, 10);
        expect(heron(5, 6, 7)).toBeCloseTo(Math.sqrt(216), 10);
        expect(heron(5, 6, 7)).toBeCloseTo(0.5 * 6 * 7 * Math.sin(T_5_6_7.A * RAD), 10);
        expect(SAS_a ** 2).toBeCloseTo(39, 10);
        expect(SAS_cosB).toBeCloseTo(9 / (2 * Math.sqrt(39)), 12);
        expect(SAS_B + 60 + (180 - 60 - SAS_B)).toBeCloseTo(180, 10);
        // the sine rule on the ASA example and on both SSA triangles agrees with the quadratic's roots
        expect(ASA_a / Math.sin(40 * RAD)).toBeCloseTo(8 / Math.sin(80 * RAD), 10);
        const c1 = 5 * Math.sin((180 - 30 - SSA_5.B1) * RAD) / Math.sin(30 * RAD);
        const c2 = 5 * Math.sin((180 - 30 - (180 - SSA_5.B1)) * RAD) / Math.sin(30 * RAD);
        expect(SSA_5.c).toHaveLength(2);
        expect(SSA_5.c[0]).toBeCloseTo(c1, 10);
        expect(SSA_5.c[1]).toBeCloseTo(c2, 10);
        expect(SSA_5.c[0] + SSA_5.c[1]).toBeCloseTo(2 * 8 * Math.cos(30 * RAD), 10);
        expect(SSA_5.c[0] * SSA_5.c[1]).toBeCloseTo(64 - 25, 10);
        expect(SSA_8.c).toHaveLength(1);
        expect(SSA_8.B).toBeCloseTo(30, 10);
        expect(SSA_8.c[0]).toBeCloseTo(8 * Math.sin(120 * RAD) / Math.sin(30 * RAD), 10);
        expect(SSA_4.c).toHaveLength(1);
        expect(SSA_4.B).toBeCloseTo(90, 4); // asin is ill-conditioned at 1
        expect(SSA_4.c[0]).toBeCloseTo(4 * Math.sqrt(3), 10);
        expect(ssaRoots(30, 8, 3.5)).toEqual([]);
        expect(ssaRoots(30, 8, 9)).toHaveLength(1);
        expect(SSA_h).toBeCloseTo(4, 12);
    });

    for (const language of LANGUAGES) {
        test(`${language}: every step quotes its recomputed numbers (and no step quotes another step's number as its own)`, () => {
            for (const id of STEP_IDS) {
                const text = fieldsOf(stepOf(id), language).join(' ');
                for (const {value, digits} of QUOTES[id]) expect({id, quote: shown(value, digits, language), found: hasNumber(text, shown(value, digits, language))}).toEqual({id, quote: shown(value, digits, language), found: true});
                for (const integer of QUOTE_INTEGERS[id]) expect({id, quote: String(integer), found: hasNumber(text, String(integer))}).toEqual({id, quote: String(integer), found: true});
            }
        });

        test(`${language}: the text has no decimal other than a recomputed quote or an exact input value, and the decimal separator is the language's`, () => {
            const allowed = new Set<string>();
            for (const id of STEP_IDS) for (const {value, digits} of QUOTES[id]) allowed.add(shown(value, digits, language));
            for (const value of [3.5, 4.25, 7.75, 8.25, SSA_5.B1, 180 - SSA_5.B1]) allowed.add(shown(value, value === 3.5 || value > 8 && value < 9 || value === 4.25 || value === 7.75 ? 2 : 4, language));
            allowed.add(shown(T_4_3_6.C, 4, language)); allowed.add(shown(SSA_8.c[0], 5, language));
            const decimals = lessonTexts(language).flatMap(text => [...prose(text).matchAll(/\d+[.,]\d+/g)].map(match => match[0]));
            expect(decimals.length).toBeGreaterThan(20);
            const stray = decimals.filter(decimal => !allowed.has(decimal));
            expect(stray).toEqual([]);
            const wrongSeparator = lessonTexts(language).filter(text => language === 'sl' ? /\d\.\d/.test(prose(text)) : /\d,\d/.test(prose(text)));
            expect(wrongSeparator).toEqual([]);
        });

        test(`${language}: a rounded quote is marked approximate (approx, about, or a preceding approximation in the same expression)`, () => {
            const approximate = /\\approx|≈|približno|about/;
            const unmarked: string[] = [];
            for (const id of STEP_IDS) {
                for (const text of fieldsOf(stepOf(id), language)) {
                    for (const {value, digits} of QUOTES[id]) {
                        const raw = shown(value, digits, language).replace(',', '\\{,\\}|,');
                        for (const match of text.matchAll(new RegExp(`(?<![0-9.,])(?:${language === 'sl' ? raw : escapeRegExp(shown(value, digits, language))})(?![0-9])`, 'g'))) {
                            const index = match.index ?? 0;
                            if (!approximate.test(text.slice(Math.max(0, index - 40), index)) && !/180\^\\circ-60\^\\circ/.test(text.slice(Math.max(0, index - 40), index))) unmarked.push(`${id}: ${shown(value, digits, language)} in "...${text.slice(Math.max(0, index - 40), index + 12)}"`);
                        }
                    }
                }
            }
            expect(unmarked).toEqual([]);
        });
    }

    test('the grid check: for A = 30 degrees, b = 8 exactly the values a = 4,25 .. 7,75 of the grid 1/4 have two solutions', () => {
        // exact decisions with integers: a = n/4, so a^2 - h^2 has the sign of n^2 - 256 (h = 4), and b^2 - a^2 the sign of 1024 - n^2
        const twoByInteger: number[] = [];
        const twoByQuadratic: number[] = [];
        const oneByQuadratic: number[] = [];
        for (let n = 1; n <= 48; n += 1) {
            const discriminantSign = Math.sign(n * n - 256);
            const productSign = Math.sign(1024 - n * n);
            if (discriminantSign > 0 && productSign > 0) twoByInteger.push(n / 4);
            const roots = ssaRoots(30, 8, n / 4);
            if (roots.length === 2) twoByQuadratic.push(n / 4);
            if (roots.length === 1) oneByQuadratic.push(n / 4);
        }
        expect(twoByInteger).toEqual(twoByQuadratic);
        expect(twoByInteger[0]).toBe(4.25);
        expect(twoByInteger[twoByInteger.length - 1]).toBe(7.75);
        expect(twoByInteger).toHaveLength(15);
        for (const a of [4, 8, 8.25]) expect({a, ones: oneByQuadratic.includes(a)}).toEqual({a, ones: true});
        // the text states the ends and their neighbours, in both languages
        for (const language of LANGUAGES) {
            const text = fieldsOf(stepOf('tr5-explore'), language).join(' ');
            for (const value of [4.25, 7.75, 4, 8, 8.25]) expect({language, value, found: hasNumber(text, shown(value, 2, language))}).toEqual({language, value, found: true});
        }
    });
});
