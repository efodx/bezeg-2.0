/**
 * L5 (line-geometry, intersect mode): every step opening lands in the stated state on the real LineGeometryGraph (one synchronous sequence of actions from a
 * restored checkpoint, out of order and twice, both languages), the learner actions the text asks for give the statuses and rows the text quotes, no opening
 * is already the state its prompt asks the learner to produce, no prediction step renders its own answer, and the controls and readouts the prompts name exist.
 * Part B (below) recomputes every quoted number with plain integer arithmetic, independently of the graph and the line kernel.
 */
import {act, fireEvent, screen} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {lineIntersectionsLesson} from './analyticLinesIntersectGuidedLessons';
import type {LocalizedText} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {LineGeometryGraph} from '../../graphs/lines/LineGeometryGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t, type MessageKey} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
type Pt = readonly [number, number];
const lesson = lineIntersectionsLesson;
const STEP_IDS = ['l5-meeting', 'l5-parallel-same', 'l5-line-circle', 'l5-tangent', 'l5-free'] as const;
type StepId = (typeof STEP_IDS)[number];

interface Spec {readonly target: 'lines' | 'circle'; readonly P: Pt; readonly Q: Pt; readonly R: Pt; readonly S: Pt; readonly O: Pt; readonly B: Pt}
const FIRST = {P: [-4, 0], Q: [0, 2], O: [1, 0]} as const;
const spec = (o: Pick<Spec, 'target' | 'R' | 'S' | 'B'>): Spec => ({...FIRST, ...o});
/** The state each step opening states (typed here, independent of the L5_* constants). */
const OPENING: Record<StepId, Spec> = {
    'l5-meeting': spec({target: 'lines', R: [0, 0], S: [2, 2], B: [3, 2]}),
    'l5-parallel-same': spec({target: 'lines', R: [2, 0], S: [0, 4], B: [3, 2]}),
    'l5-line-circle': spec({target: 'lines', R: [2, 0], S: [0, 4], B: [3, 2]}),
    'l5-tangent': spec({target: 'circle', R: [2, 0], S: [0, 4], B: [3, 2]}),
    'l5-free': {target: 'lines', P: [-2, 1], Q: [4, 4], R: [3, -2], S: [2, 0], O: [1, 0], B: [3, 1]},
};

const sgn = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
type Pair = readonly [sl: string, en: string];
const pt = (x: number, y: number): Pair => [`(${sgn(x)}; ${sgn(y)})`, `(${sgn(x)}, ${sgn(y)})`];
/** What the graph must show: the status line and rows (a string is the same in both languages). */
interface Obs {readonly status: Pair; readonly rows: Readonly<Record<string, Pair | string>>; readonly absent?: readonly string[]}
const meets = (point: Pair, approx: Pair, second: string): Obs => ({
    status: [`Presečišče premic je ${point[0]}.`, `The lines meet at ${point[1]}.`],
    rows: {'implicit-1': 'x − 2y = −4', 'implicit-2': second, point, 'point-approx': approx},
});
const STATUS_PARALLEL: Pair = ['Premici sta vzporedni in se ne sekata.', 'The lines are parallel and do not meet.'];
const STATUS_SAME: Pair = ['Premici sovpadata, skupnih točk je neskončno mnogo.', 'The lines coincide, they share infinitely many points.'];
const MEET_FINAL = meets(['(4/5; 12/5)', '(4/5, 12/5)'], ['(0,8; 2,4)', '(0.8, 2.4)'], '2x + y = 4');
const circleRows = (r2: number, disc: number, count: number): Record<string, Pair | string> =>
    ({implicit: 'x − 2y = −4', 'r-squared': String(r2), s: '5', norm: '5', discriminant: sgn(disc), count: String(count)});
const CIRCLE_TWO: Obs = {
    status: ['Premica seka krožnico v dveh točkah (diskriminanta 15).', 'The line meets the circle in two points (discriminant 15).'],
    rows: {...circleRows(8, 15, 2), 'points-1': ['≈ (−1,5492; 1,2254)', '≈ (−1.5492, 1.2254)'], 'points-2': ['≈ (1,5492; 2,7746)', '≈ (1.5492, 2.7746)']},
};
const CIRCLE_TANGENT: Obs = {
    status: ['Premica je tangenta krožnice v točki (0; 2).', 'The line is tangent to the circle at (0, 2).'],
    rows: {...circleRows(5, 0, 1), points: pt(0, 2)}, absent: ['points-1', 'points-2'],
};
const CIRCLE_NONE: Obs = {
    status: ['Premica ne seka krožnice (diskriminanta −5).', 'The line does not meet the circle (discriminant −5).'],
    rows: circleRows(4, -5, 0), absent: ['points', 'points-1', 'points-2'],
};
/** The observation of each opening. */
const OPENING_OBS: Record<StepId, Obs> = {
    'l5-meeting': {...meets(pt(4, 4), pt(4, 4), 'x − y = 0'), absent: ['discriminant']},
    'l5-parallel-same': {...MEET_FINAL, absent: ['discriminant']},
    'l5-line-circle': {...MEET_FINAL, absent: ['discriminant', 'r-squared', 'count']},
    'l5-tangent': CIRCLE_TWO,
    'l5-free': {...MEET_FINAL, absent: ['discriminant']},
};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const status = () => document.querySelector('[data-line-status]')?.textContent ?? '';
const type = (label: string, value: string) => act(() => { enterNumber(screen.getByRole('spinbutton', {name: label}), value); });
const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByRole('combobox', {name: label}), {target: {value}}); });
/** The scene's own state: mode, target and the six handles (T and the init flag are not part of an L5 scene). */
const stateOf = (graph: LineGeometryGraph) => {
    const {T: _t, initialized: _i, ...scene} = JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>;
    return scene;
};
const toSpecState = (s: Spec) => ({mode: 'intersect', target: s.target, ...Object.fromEntries((['P', 'Q', 'R', 'S', 'O', 'B'] as const).map(h => [h, {x: s[h][0], y: s[h][1]}]))});
const pick = (p: Pair | string, language: Language) => (typeof p === 'string' ? p : p[language === 'sl' ? 0 : 1]);

function mount() {
    const graph = createGraph('line-geometry');
    if (!(graph instanceof LineGeometryGraph)) throw new Error('line-geometry must be the line graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, checkpoint,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (id: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(lesson.steps.find(step => step.id === id)!.scene!)) capabilities.apply(action);
        }),
    };
}

/** The graph shows this observation now: status, every named row, and none of the absent rows. */
function expectObs(where: string, obs: Obs, language: Language) {
    expect({where, status: status()}).toEqual({where, status: pick(obs.status, language)});
    for (const [row, value] of Object.entries(obs.rows)) expect({where, row, value: readout(row)}).toEqual({where, row, value: pick(value, language)});
    for (const row of obs.absent ?? []) expect({where, row, value: readout(row)}).toEqual({where, row, value: null});
}

test('has five ordered steps with a scene each, ids as the tests assume', () => {
    expect(lesson.steps.map(step => step.id)).toEqual([...STEP_IDS]);
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
    expect(lesson.steps.every(step => step.scene)).toBe(true);
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(5);
    expect(lesson.demonstrationId).toBe('line-geometry');
});

describe.each(LANGUAGES)('L5 scenes (%s)', language => {
    test('every step opening lands in the stated state, status and rows, in one synchronous sequence from a restored checkpoint, out of order and twice; restoring returns the free state', () => {
        setLanguage(language);
        const m = mount();
        try {
            const free = stateOf(m.graph);
            for (const id of [...STEP_IDS, ...STEP_IDS.slice().reverse()]) {
                m.scene(id);
                m.scene(id);
                expect({id, state: stateOf(m.graph)}).toEqual({id, state: toSpecState(OPENING[id])});
                expectObs(id, OPENING_OBS[id], language);
            }
            act(() => { m.capabilities.restoreState(m.checkpoint); });
            expect(stateOf(m.graph)).toEqual(free);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('step 1: the three coordinate edits in the stated order give the quoted statuses and rows after each', () => {
        setLanguage(language);
        const m = mount();
        try {
            m.scene('l5-meeting');
            type('R, x', '2');
            expectObs('R,x=2', {status: [`Presečišče premic je (2; 3).`, 'The lines meet at (2, 3).'], rows: {'implicit-2': 'x = 2', point: pt(2, 3)}}, language);
            type('S, x', '0');
            expectObs('S,x=0', {status: ['Presečišče premic je (0; 2).', 'The lines meet at (0, 2).'], rows: {'implicit-2': 'x + y = 2', point: pt(0, 2)}}, language);
            type('S, y', '4');
            expectObs('S,y=4', MEET_FINAL, language);
            expect(stateOf(m.graph)).toEqual(toSpecState({...OPENING['l5-meeting'], R: [2, 0], S: [0, 4]}));
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('step 2: S,y -1 then R,x -4 then S,x -6 give parallel, a meeting point, then the same line, with the quoted rows', () => {
        setLanguage(language);
        const m = mount();
        try {
            m.scene('l5-parallel-same');
            type('S, y', '-1');
            expectObs('S,y=-1', {status: STATUS_PARALLEL, rows: {'implicit-1': 'x − 2y = −4', 'implicit-2': 'x − 2y = 2', point: ['ni', 'none']}, absent: ['point-approx']}, language);
            type('R, x', '-4');
            expectObs('R,x=-4', {status: ['Presečišče premic je (−4; 0).', 'The lines meet at (−4, 0).'], rows: {'implicit-2': 'x + 4y = −4', point: pt(-4, 0)}}, language);
            type('S, x', '-6');
            expectObs('S,x=-6', {status: STATUS_SAME, rows: {'implicit-1': 'x − 2y = −4', 'implicit-2': 'x − 2y = −4', point: ['neskončno mnogo', 'infinitely many']}, absent: ['point-approx']}, language);
            expect(stateOf(m.graph)).toEqual(toSpecState({...OPENING['l5-parallel-same'], R: [-4, 0], S: [-6, -1]}));
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('step 3: choosing the circle in the target select gives the quoted two-point readout', () => {
        setLanguage(language);
        const m = mount();
        try {
            m.scene('l5-line-circle');
            choose(t('line_geometry_target_label'), 'circle');
            expectObs('circle', CIRCLE_TWO, language);
            expect(stateOf(m.graph)).toEqual(toSpecState({...OPENING['l5-line-circle'], target: 'circle'}));
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('step 4: B(3,1) is tangent, then B(3,0) misses; the other grid points the text names (2,2) and (0,2) are tangent too', () => {
        setLanguage(language);
        const m = mount();
        try {
            m.scene('l5-tangent');
            type('B, y', '1');
            expectObs('B(3,1)', CIRCLE_TANGENT, language);
            type('B, y', '0');
            expectObs('B(3,0)', CIRCLE_NONE, language);
            expect(stateOf(m.graph)).toEqual(toSpecState({...OPENING['l5-tangent'], B: [3, 0]}));
            m.scene('l5-tangent');
            type('B, x', '2');
            expectObs('B(2,2)', CIRCLE_TANGENT, language);
            m.scene('l5-tangent');
            type('B, x', '0');
            expectObs('B(0,2)', CIRCLE_TANGENT, language);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('step 5: the suggested horizontal line y = 3 with B(4,0) is tangent at (1;3) with the quoted rows', () => {
        setLanguage(language);
        const m = mount();
        try {
            m.scene('l5-free');
            choose(t('line_geometry_target_label'), 'circle');
            type('P, x', '-2'); type('P, y', '3'); type('Q, x', '2'); type('Q, y', '3');
            type('B, x', '4'); type('B, y', '0');
            expectObs('free', {
                status: ['Premica je tangenta krožnice v točki (1; 3).', 'The line is tangent to the circle at (1, 3).'],
                rows: {implicit: 'y = 3', 'r-squared': '9', s: '−3', norm: '1', discriminant: '0', count: '1', points: pt(1, 3)},
            }, language);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

// ---- the openings are not the answers; predictions are not rendered -----------------------------------------------------------------------

/** What the learner is asked to produce, as the made state: the opening must differ from it, in state and in what the graph shows. */
const MADE: Partial<Record<StepId, readonly {state: Spec; status: Pair}[]>> = {
    'l5-meeting': [{state: spec({target: 'lines', R: [2, 0], S: [0, 4], B: [3, 2]}), status: MEET_FINAL.status}],
    'l5-parallel-same': [
        {state: spec({target: 'lines', R: [2, 0], S: [0, -1], B: [3, 2]}), status: STATUS_PARALLEL},
        {state: spec({target: 'lines', R: [-4, 0], S: [-6, -1], B: [3, 2]}), status: STATUS_SAME},
    ],
    'l5-line-circle': [{state: spec({target: 'circle', R: [2, 0], S: [0, 4], B: [3, 2]}), status: CIRCLE_TWO.status}],
    'l5-tangent': [
        {state: spec({target: 'circle', R: [2, 0], S: [0, 4], B: [3, 1]}), status: CIRCLE_TANGENT.status},
        {state: spec({target: 'circle', R: [2, 0], S: [0, 4], B: [3, 0]}), status: CIRCLE_NONE.status},
    ],
    'l5-free': [{state: {...OPENING['l5-free'], target: 'circle', P: [-2, 3], Q: [2, 3], B: [4, 0]}, status: ['Premica je tangenta krožnice v točki (1; 3).', 'The line is tangent to the circle at (1, 3).']}],
};

test.each(LANGUAGES)('no step opening is already the state its prompt asks the learner to produce (%s)', language => {
    setLanguage(language);
    const m = mount();
    try {
        for (const id of STEP_IDS) {
            m.scene(id);
            for (const made of MADE[id]!) {
                expect({id, sameState: JSON.stringify(stateOf(m.graph)) === JSON.stringify(toSpecState(made.state))}).toEqual({id, sameState: false});
                expect({id, sameStatus: status() === pick(made.status, language)}).toEqual({id, sameStatus: false});
            }
        }
    } finally {
        m.mounted.view.unmount();
    }
});

/** Everything the learner reads before the observation reveals the answer: title, purpose, explanation, prompt, the step's formulas and its worked example. */
const renderedBeforeAnswer = (stepId: StepId, language: Language): string => {
    const step = lesson.steps.find(candidate => candidate.id === stepId)!;
    const parts: LocalizedText[] = [step.title, step.purpose, step.explanation, step.observationPrompt];
    for (const id of step.formulaIds) {
        const formula = lesson.formulaBlocks.find(block => block.id === id)!;
        parts.push(formula.notation, formula.explanation);
    }
    const strings = parts.map(part => part[language]);
    for (const id of step.formulaIds) strings.push(lesson.formulaBlocks.find(block => block.id === id)!.latex);
    const example = lesson.workedExamples.find(candidate => candidate.id === step.workedExampleId);
    if (example) strings.push(example.title[language], example.calculationLatex, example.resultLatex, example.check[language]);
    return strings.join('\n');
};
/** Each prediction step: the strings that are the answer of its own expectedObservations (never in the text before it). */
const ANSWERS: Record<StepId, readonly (readonly [label: string, pattern: RegExp])[]> = {
    'l5-meeting': [['4/5', /4\/5|tfrac45/], ['12/5', /12\/5|tfrac\{12\}\{5\}/], ['0,8', /0[.,]8|0\{,\}8/], ['2,4', /2[.,]4|2\{,\}4/], ['(2,3) meet', /\(2,\s*3\)|\(2;\s*3\)/], ['x+y=2', /x\+y=2|x \+ y = 2/]],
    'l5-parallel-same': [['S=(0,-1)', /\(0,\s*-1\)/], ['m: x-2y=2', /x-2y=2(?!\d)/], ['R=(-4,0)', /\(-4,\s*0\)/], ['S=(-6,-1)', /\(-6,\s*-1\)/], ['x+4y', /x\+4y/]],
    'l5-line-circle': [['r^2=8', /r\^2=8(?!\d)/], ['D=60', /D=60/], ['15', /sqrt\{15\}|D=15|=\s*15(?!\d)|(?:diskriminanta|discriminant) 15/], ['1,5492', /1[.,]5492|1\{,\}5492/], ['2,7746', /2[.,]7746|2\{,\}7746/], ['s^2=3/5', /tfrac35/]],
    'l5-tangent': [['r^2=5', /r\^2=5(?!\d)/], ['sqrt5', /sqrt5|sqrt\{5\}/], ['(0,2) foot', /\(0,\s*2\)|\(0;\s*2\)/], ['B=(3,1)', /\(3,\s*1\)/], ['(2,2)', /\(2,\s*2\)/], ['r^2=4', /r\^2=4(?!\d)/], ['-5', /(?:−|-)5(?!\d)/]],
    'l5-free': [['r^2=9', /r\^2=9(?!\d)/], ['B=(4,0)', /\(4,\s*0\)/], ['(1,3) tangent point', /\(1,\s*3\)|\(1;\s*3\)/]],
};

describe.each(LANGUAGES)('predictions are not rendered before the observation (%s)', language => {
    test.each(STEP_IDS)('%s: the explanation, prompt, formulas and worked example do not contain the answer of its own expectedObservations', id => {
        const shown = renderedBeforeAnswer(id, language);
        for (const [label, pattern] of ANSWERS[id]) expect({id, label, leaked: pattern.test(shown)}).toEqual({id, label, leaked: false});
    });

    test('the guard patterns do match the answer in the observation itself (they are not vacuous)', () => {
        for (const id of STEP_IDS) {
            const observed = lesson.steps.find(step => step.id === id)!.expectedObservations.map(o => o[language]).join('\n');
            for (const [label, pattern] of ANSWERS[id]) {
                // "x+y=2" etc. are quoted in step 1's observation; every pattern of a step must match at least one of its observations, except the intermediate-only ones noted.
                expect({id, label, matches: pattern.test(observed)}).toEqual({id, label, matches: true});
            }
        }
    });
});

// ---- the controls and readouts the prompts name exist -------------------------------------------------------------------------------------

/** The text of a lesson string with its math delimiters and sub/superscripts written as the graph's strings write them. */
const asLabel = (s: string) => s.replace(/\\\(|\\\)/g, '').replace(/ax_0\+by_0-c/g, 'a·x₀ + b·y₀ − c').replace(/a\^2\+b\^2/g, 'a² + b²');

/** Every control or readout label a step names, by catalogue key: the lesson quotes it (Slovenian »…«, English "…") and the graph's catalogue has it. */
const NAMED: readonly {step: StepId; field: 'explanation' | 'observationPrompt'; key: MessageKey; params?: Record<string, string>}[] = [
    {step: 'l5-meeting', field: 'explanation', key: 'line_geometry_group_second'},
    {step: 'l5-meeting', field: 'observationPrompt', key: 'line_geometry_row_point'},
    {step: 'l5-meeting', field: 'observationPrompt', key: 'line_geometry_row_point_approx'},
    {step: 'l5-line-circle', field: 'explanation', key: 'line_geometry_target_label'},
    {step: 'l5-line-circle', field: 'explanation', key: 'line_geometry_target_circle'},
    {step: 'l5-line-circle', field: 'observationPrompt', key: 'line_geometry_row_point_n', params: {value0: '1'}},
    {step: 'l5-line-circle', field: 'observationPrompt', key: 'line_geometry_row_point_n', params: {value0: '2'}},
    {step: 'l5-tangent', field: 'explanation', key: 'line_geometry_row_s'},
    {step: 'l5-tangent', field: 'explanation', key: 'line_geometry_group_circle'},
    {step: 'l5-free', field: 'explanation', key: 'line_geometry_target_label'},
];
/** The label as the graph writes it (sl.ts / en.ts); the circle group and the select option are written there with plain letters. */
const catalogue = (language: Language, key: MessageKey, params?: Record<string, string>) => {
    setLanguage(language);
    return (t as (key: MessageKey, params?: Record<string, string>) => string)(key, params);
};

test.each(LANGUAGES)('every label a prompt names is quoted in the lesson exactly as the graph\'s catalogue writes it (%s)', language => {
    for (const named of NAMED) {
        const step = lesson.steps.find(candidate => candidate.id === named.step)!;
        const label = catalogue(language, named.key, named.params);
        const quote = language === 'sl' ? `»${label}«` : `"${label}"`;
        expect({step: named.step, key: named.key, quoted: asLabel(step[named.field][language]).includes(quote)}).toEqual({step: named.step, key: named.key, quoted: true});
    }
});

test.each(LANGUAGES)('the row and field controls the steps ask the learner to read or edit exist on the graph when the scene is open (%s)', language => {
    setLanguage(language);
    const m = mount();
    try {
        m.scene('l5-meeting');
        for (const name of ['R, x', 'R, y', 'S, x', 'S, y']) expect({name, found: screen.queryByRole('spinbutton', {name}) !== null}).toEqual({name, found: true});
        expect(screen.queryByRole('combobox', {name: catalogue(language, 'line_geometry_target_label')})).not.toBeNull();
        expect(screen.queryByText(catalogue(language, 'line_geometry_group_second'))).not.toBeNull();
        m.scene('l5-tangent');
        for (const name of ['B, x', 'B, y', 'O, x', 'O, y']) expect({name, found: screen.queryByRole('spinbutton', {name}) !== null}).toEqual({name, found: true});
        expect(screen.queryByText(catalogue(language, 'line_geometry_group_circle'))).not.toBeNull();
        // The two rows the step 4 text names are in the readout.
        expect(readout('s')).not.toBeNull();
        expect(readout('norm')).not.toBeNull();
        expect(document.querySelector('[data-readout="s"] dt')?.textContent).toBe(catalogue(language, 'line_geometry_row_s'));
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- Part B: every quoted number recomputed with plain integer arithmetic (no graph, no line kernel) -------------------------------------

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
interface Frac {readonly n: number; readonly d: number}
const frac = (n: number, d: number): Frac => { const g = gcd(n, d) || 1; const s = d < 0 ? -1 : 1; return {n: s * n / g, d: s * d / g}; };
/** The LaTeX the lessons use for a fraction: \tfrac45 or \tfrac{12}{5}, whole numbers plain, negative with a leading minus. */
const fracTex = (f: Frac) => {
    if (f.d === 1) return String(f.n);
    const body = Math.abs(f.n) < 10 && f.d < 10 ? `\\tfrac${Math.abs(f.n)}${f.d}` : `\\tfrac{${Math.abs(f.n)}}{${f.d}}`;
    return `${f.n < 0 ? '-' : ''}${body}`;
};
/** The decimal as the text writes it in math: `1{,}5492` in Slovenian, `1.5492` in English. */
const mathDecimal = (n: number, language: Language) => {
    const text = String(Number(n.toFixed(4)));
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

/** ax + by = c through two points, unreduced: a = qy - py, b = px - qx, c = a px + b py. Reduced by the gcd with a positive first non-zero coefficient. */
const lineThrough = (p: Pt, q: Pt) => {
    const a = q[1] - p[1];
    const b = p[0] - q[0];
    const c = a * p[0] + b * p[1];
    const g = gcd(gcd(a, b), c) || 1;
    const sign = (a !== 0 ? a : b) < 0 ? -1 : 1;
    return {a: sign * a / g + 0, b: sign * b / g + 0, c: sign * c / g + 0}; // + 0 turns -0 into 0
};
type Line = ReturnType<typeof lineThrough>;
/** Exact rational elimination (Cramer). */
const meetOf = (l: Line, m: Line) => {
    const D = l.a * m.b - m.a * l.b;
    if (D !== 0) return {kind: 'point' as const, D, x: frac(l.c * m.b - m.c * l.b, D), y: frac(l.a * m.c - m.a * l.c, D)};
    const proportional = l.a * m.c === m.a * l.c && l.b * m.c === m.b * l.c;
    return {kind: proportional ? 'same' as const : 'parallel' as const, D};
};
const pointTex = (x: Frac, y: Frac) => `(${fracTex(x)},${fracTex(y)})`;

const allText = (language: Language): string => {
    const out: string[] = [lesson.title[language], lesson.summary[language]];
    for (const goal of lesson.learningGoals) out.push(goal[language]);
    for (const edge of lesson.edgeCases) out.push(edge[language]);
    for (const step of lesson.steps) {
        out.push(step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language]);
        for (const o of step.expectedObservations) out.push(o[language]);
    }
    for (const f of lesson.formulaBlocks) out.push(f.latex, f.notation[language], f.explanation[language]);
    for (const e of lesson.workedExamples) out.push(e.title[language], e.calculationLatex, e.resultLatex, e.check[language]);
    return out.join('\n');
};
const stepText = (id: StepId, language: Language): string => {
    const step = lesson.steps.find(candidate => candidate.id === id)!;
    return [step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])].join('\n');
};
const expectQuoted = (where: string, haystack: string, quotes: readonly string[]) => {
    for (const quote of quotes) expect({where, quote, found: haystack.includes(quote)}).toEqual({where, quote, found: true});
};

const ELL = lineThrough([-4, 0], [0, 2]);

test('lines: the meeting points and relations of every step are the exact elimination of the handle pairs, and the text quotes them', () => {
    expect(ELL).toEqual({a: 1, b: -2, c: -4});
    const cases: {step: StepId; m: readonly [Pt, Pt]; kind: 'point' | 'parallel' | 'same'; eq: string; x?: Frac; y?: Frac}[] = [
        {step: 'l5-meeting', m: [[0, 0], [2, 2]], kind: 'point', eq: 'x-y=0', x: frac(4, 1), y: frac(4, 1)},
        {step: 'l5-meeting', m: [[2, 0], [2, 2]], kind: 'point', eq: 'x=2', x: frac(2, 1), y: frac(3, 1)},
        {step: 'l5-meeting', m: [[2, 0], [0, 2]], kind: 'point', eq: 'x+y=2', x: frac(0, 1), y: frac(2, 1)},
        {step: 'l5-meeting', m: [[2, 0], [0, 4]], kind: 'point', eq: '2x+y=4', x: frac(4, 5), y: frac(12, 5)},
        {step: 'l5-parallel-same', m: [[2, 0], [0, -1]], kind: 'parallel', eq: 'x-2y=2'},
        {step: 'l5-parallel-same', m: [[-4, 0], [0, -1]], kind: 'point', eq: 'x+4y=-4', x: frac(-4, 1), y: frac(0, 1)},
        {step: 'l5-parallel-same', m: [[-4, 0], [-6, -1]], kind: 'same', eq: 'x-2y=-4'},
    ];
    for (const c of cases) {
        const m = lineThrough(c.m[0], c.m[1]);
        const result = meetOf(ELL, m);
        expect({c: c.eq, kind: result.kind}).toEqual({c: c.eq, kind: c.kind});
        if (result.kind === 'point') {
            expect({c: c.eq, x: result.x, y: result.y}).toEqual({c: c.eq, x: c.x, y: c.y});
            // The meeting point lies on both lines (exact).
            expect(ELL.a * result.x.n * result.y.d + ELL.b * result.y.n * result.x.d).toBe(ELL.c * result.x.d * result.y.d);
            expect(m.a * result.x.n * result.y.d + m.b * result.y.n * result.x.d).toBe(m.c * result.x.d * result.y.d);
        }
        for (const language of LANGUAGES) {
            const text = stepText(c.step, language);
            expectQuoted(`${c.step} ${c.eq} ${language}`, text, [c.eq]);
            if (result.kind === 'point') expectQuoted(`${c.step} ${c.eq} ${language}`, text, [pointTex(result.x, result.y)]);
        }
    }
    // The opening of step 1 quotes (4,4) with both equations; the made state is the second line 2x + y = 4 in the opening text of the steps after it.
    for (const language of LANGUAGES) {
        expectQuoted('step 1 opening', lesson.steps[0].scene!.expectedState[language], ['x-2y=-4', 'x-y=0', '(4,4)']);
        for (const id of ['l5-parallel-same', 'l5-line-circle', 'l5-free'] as const) expectQuoted(id, lesson.steps.find(s => s.id === id)!.scene!.expectedState[language], ['2x+y=4']);
        expectQuoted('l5-parallel-same', lesson.steps[1].scene!.expectedState[language], ['x-2y=-4']);
    }
    // Parallel: equal reduced normals, different right-hand sides (2 against -4); same: equal triples. D = 0 for both.
    const parallel = lineThrough([2, 0], [0, -1]);
    const same = lineThrough([-4, 0], [-6, -1]);
    expect({D: ELL.a * parallel.b - parallel.a * ELL.b, normals: [parallel.a, parallel.b], c: [ELL.c, parallel.c]}).toEqual({D: 0, normals: [1, -2], c: [-4, 2]});
    expect(same).toEqual(ELL);
    // The step 2 prediction: S = (0, y) parallel to l needs the normal (2, y... ) proportional to (1, -2): through R = (2, 0) that is y = -1.
    const candidates = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8].filter(y => meetOf(ELL, lineThrough([2, 0], [0, y])).kind !== 'point');
    expect(candidates).toEqual([-1]);
    // The same line by a horizontal move of both points by t = -6: x - 2y changes by t at every point, from 2 to -4.
    expect({shift: -4 - 2, valueBefore: 2, valueAfter: 2 + (-6)}).toEqual({shift: -6, valueBefore: 2, valueAfter: -4});
});

test('lines: the elimination worked example and the formula of step 1 check by integer arithmetic', () => {
    // (x - y) - (x - 2y) = 0 - (-4): the x coefficients cancel, y = 4, then x = y = 4.
    expect({xCoefficient: 1 - 1, yCoefficient: -1 - (-2), rightSide: 0 - (-4)}).toEqual({xCoefficient: 0, yCoefficient: 1, rightSide: 4});
    expect({check1: 4 - 2 * 4, check2: 4 - 4}).toEqual({check1: -4, check2: 0});
    const example = lesson.workedExamples.find(e => e.id === 'l5-elimination')!;
    expectQuoted('l5-elimination', example.calculationLatex, ['(x-y)-(x-2y)=0-(-4)', 'y=4', 'x=y=4']);
    expect(example.resultLatex).toBe('(4,4)');
    for (const language of LANGUAGES) expectQuoted(`elimination ${language}`, example.check[language], ['y=4', 'x=4', '4-2\\cdot4=-4', '4-4=0']);
    // Cramer: the made state of step 1 has D = 1 * 1 - 2 * (-2) = 5, x = (-4 * 1 - 4 * (-2)) / 5 = 4/5, y = (1 * 4 - 2 * (-4)) / 5 = 12/5.
    expect({D: 1 * 1 - 2 * (-2), xNumerator: -4 * 1 - 4 * (-2), yNumerator: 1 * 4 - 2 * (-4)}).toEqual({D: 5, xNumerator: 4, yNumerator: 12});
});

interface CircleCase {readonly r2: number; readonly alpha: number; readonly beta: number; readonly gamma: number; readonly D: number; readonly s: number; readonly n: number; readonly readoutDiscriminant: number}
/** The circle (x - 1)^2 + y^2 = r^2 against x - 2y = -4, with x = 2y - 4 substituted: (2y - 5)^2 + y^2 = r^2. */
const circleCase = (B: Pt): CircleCase => {
    const O: Pt = [1, 0];
    const r2 = (B[0] - O[0]) ** 2 + (B[1] - O[1]) ** 2;
    const k = 2;
    const m = -4; // x = k y + m
    const alpha = k * k + 1;
    const beta = 2 * k * (m - O[0]) - 2 * O[1];
    const gamma = (m - O[0]) ** 2 + O[1] ** 2 - r2;
    const s = ELL.a * O[0] + ELL.b * O[1] - ELL.c;
    const n = ELL.a ** 2 + ELL.b ** 2;
    return {r2, alpha, beta, gamma, D: beta * beta - 4 * alpha * gamma, s, n, readoutDiscriminant: n * r2 - s * s};
};
const quadTex = (c: CircleCase) => `${c.alpha}y^2${c.beta < 0 ? '-' : '+'}${Math.abs(c.beta)}y${c.gamma < 0 ? '-' : '+'}${Math.abs(c.gamma)}=0`;

test('circle: the substituted quadratic, its discriminant, the readout (a squared plus b squared) r squared minus s squared and the common points, recomputed', () => {
    const cases: [string, Pt, number][] = [['B(3,2)', [3, 2], 2], ['B(3,1)', [3, 1], 1], ['B(2,2)', [2, 2], 1], ['B(0,2)', [0, 2], 1], ['B(3,0)', [3, 0], 0]];
    const expected: Record<string, {r2: number; D: number}> = {'B(3,2)': {r2: 8, D: 60}, 'B(3,1)': {r2: 5, D: 0}, 'B(2,2)': {r2: 5, D: 0}, 'B(0,2)': {r2: 5, D: 0}, 'B(3,0)': {r2: 4, D: -20}};
    for (const [name, B, count] of cases) {
        const c = circleCase(B);
        expect({name, r2: c.r2, D: c.D}).toEqual({name, r2: expected[name].r2, D: expected[name].D});
        // The readout is a quarter of the quadratic's discriminant (the text says so for step 3 and uses it in steps 3 and 4).
        expect({name, quarter: 4 * c.readoutDiscriminant}).toEqual({name, quarter: c.D});
        expect({name, count: c.D > 0 ? 2 : c.D === 0 ? 1 : 0}).toEqual({name, count});
        expect({name, s: c.s, n: c.n}).toEqual({name, s: 5, n: 5});
    }
    expect({quadratic: quadTex(circleCase([3, 2])), readout: circleCase([3, 2]).readoutDiscriminant, disc: circleCase([3, 0]).readoutDiscriminant}).toEqual({quadratic: '5y^2-20y+17=0', readout: 15, disc: -5});
    // Step 3: the two points by the quadratic formula, y = (20 +- sqrt 60) / 10 = 2 +- s with s = sqrt 15 / 5, and x = 2y - 4 = +-2s.
    const c = circleCase([3, 2]);
    const s = Math.sqrt(c.D) / (2 * c.alpha);
    expect(s).toBeCloseTo(Math.sqrt(15) / 5, 12);
    expect(frac(15, 25)).toEqual(frac(3, 5)); // s^2 = 3/5
    expect(5 * 3 / 5 + 5).toBe(8); // 5 s^2 + 5 = r^2
    const points = [-1, 1].map(sign => ({x: 2 * (2 + sign * s) - 4, y: 2 + sign * s}));
    for (const p of points) {
        expect(p.x - 2 * p.y).toBeCloseTo(-4, 12);
        expect((p.x - 1) ** 2 + p.y ** 2).toBeCloseTo(8, 12);
    }
    for (const language of LANGUAGES) {
        const text = stepText('l5-line-circle', language);
        expectQuoted(`step 3 ${language}`, text, ['r^2=8', quadTex(c), `D=${c.D}`, `\\(${c.readoutDiscriminant}\\)`, 's^2=\\tfrac35', '5s^2+5=8', 's=\\tfrac{\\sqrt{15}}5',
            `(${mathDecimal(points[0].x, language)}`, `${mathDecimal(points[0].y, language)})`, `(${mathDecimal(points[1].x, language)}`, `${mathDecimal(points[1].y, language)})`]);
        expect({language, rounded: points.map(p => [mathDecimal(p.x, language), mathDecimal(p.y, language)])}).toEqual({language, rounded: language === 'sl' ? [['-1{,}5492', '1{,}2254'], ['1{,}5492', '2{,}7746']] : [['-1.5492', '1.2254'], ['1.5492', '2.7746']]});
    }
    // The worked example: r^2 = 10 gives 5y^2 - 20y + 15 = 0, D = 100, y = 1 and 3, the points (-2, 1) and (2, 3), both on the circle and on the line.
    const example = circleCase([4, 3]); // |OB|^2 = 9 + 9 = 18 is not the example; r^2 = 10 is built directly below
    expect(example.r2).toBe(18);
    const gamma10 = (-4 - 1) ** 2 - 10;
    const D10 = (-20) ** 2 - 4 * 5 * gamma10;
    expect({gamma10, D10, ys: [(20 - Math.sqrt(D10)) / 10, (20 + Math.sqrt(D10)) / 10]}).toEqual({gamma10: 15, D10: 100, ys: [1, 3]});
    expect({first: [2 * 1 - 4, 1], second: [2 * 3 - 4, 3], onCircle: [(-2 - 1) ** 2 + 1 ** 2, (2 - 1) ** 2 + 3 ** 2], onLine: [-2 - 2 * 1, 2 - 2 * 3]}).toEqual({first: [-2, 1], second: [2, 3], onCircle: [10, 10], onLine: [-4, -4]});
    const worked = lesson.workedExamples.find(e => e.id === 'l5-line-circle')!;
    expectQuoted('l5-line-circle calc', worked.calculationLatex, ['x=2y-4', '(2y-5)^2+y^2=10', '5y^2-20y+15=0', 'y^2-4y+3=0']);
    expect(worked.resultLatex).toBe('(-2,1),\\ (2,3)');
    for (const language of LANGUAGES) expectQuoted(`worked ${language}`, worked.check[language], ['D=(-20)^2-4\\cdot5\\cdot15=100', 'y=1', 'y=3', '(-2,1)', '(2,3)', '(-2-1)^2+1^2=10', '(2-1)^2+3^2=10', '-2-2\\cdot1=-4', '2-2\\cdot3=-4']);
});

test('tangent: the distance, r squared, the foot and the grid points of step 4, and the line y = 3 of step 5, recomputed', () => {
    const s = ELL.a * 1 + ELL.b * 0 - ELL.c;
    const n = ELL.a ** 2 + ELL.b ** 2;
    expect({s, n, dSquared: frac(s * s, n)}).toEqual({s: 5, n: 5, dSquared: {n: 5, d: 1}});
    expect(5 / Math.sqrt(5)).toBeCloseTo(Math.sqrt(5), 12); // d = 5 / sqrt 5 = sqrt 5
    // The foot of the perpendicular from O: O - (s / n) (a, b) = (1, 0) - (5/5)(1, -2) = (0, 2); it is on the line.
    const foot: Pt = [1 - (s / n) * ELL.a, 0 - (s / n) * ELL.b];
    expect(foot).toEqual([0, 2]);
    expect(ELL.a * foot[0] + ELL.b * foot[1]).toBe(ELL.c);
    // Every grid point B with |OB|^2 = 5 is on the tangent circle; the three the text names are among them, each one field change from (3, 2).
    const grid: Pt[] = [];
    for (let x = -8; x <= 8; x++) for (let y = -8; y <= 8; y++) if ((x - 1) ** 2 + y ** 2 === 5) grid.push([x, y]);
    for (const named of [[3, 1], [2, 2], [0, 2]] as const) {
        expect({named, inGrid: grid.some(p => p[0] === named[0] && p[1] === named[1]), changes: Number(named[0] !== 3) + Number(named[1] !== 2)}).toEqual({named, inGrid: true, changes: 1});
    }
    expect({atThreeZero: (3 - 1) ** 2 + 0 ** 2, disc: n * 4 - s * s, lessThan: 4 < 5}).toEqual({atThreeZero: 4, disc: -5, lessThan: true});
    for (const language of LANGUAGES) {
        const text = stepText('l5-tangent', language);
        expectQuoted(`step 4 ${language}`, text, ['d=\\tfrac{5}{\\sqrt5}=\\sqrt5', 'r^2=5', '(1,0)-\\tfrac55(1,-2)=(0,2)', '(3,1)', '(2,2)', '(0,2)', 'r^2=4<5', '−5']);
    }
    // Step 5: the horizontal line through (-2, 3) and (2, 3) is y = 3, the centre (1, 0) is at distance 3, r^2 = 9 gives B = (4, 0), the tangent point is (1, 3).
    const horizontal = lineThrough([-2, 3], [2, 3]);
    expect(horizontal).toEqual({a: 0, b: 1, c: 3});
    const s5 = horizontal.a * 1 + horizontal.b * 0 - horizontal.c;
    const n5 = horizontal.a ** 2 + horizontal.b ** 2;
    const r2 = (4 - 1) ** 2 + 0 ** 2;
    expect({s5, n5, r2, disc: n5 * r2 - s5 * s5, foot: [1 - (s5 / n5) * horizontal.a, 0 - (s5 / n5) * horizontal.b]}).toEqual({s5: -3, n5: 1, r2: 9, disc: 0, foot: [1, 3]});
    for (const language of LANGUAGES) expectQuoted(`step 5 ${language}`, stepText('l5-free', language), ['y=3', '\\(3\\)', 'r^2=9', 'B=(4,0)', 'O=(1,0)', 'P=(-2,3)', 'Q=(2,3)']);
});

test('every handle pair the text names lies on the line it claims, and the circle points on the circle', () => {
    const named: {where: string; p: Pt; q: Pt; a: number; b: number; c: number}[] = [
        {where: 'l (P, Q)', p: [-4, 0], q: [0, 2], a: 1, b: -2, c: -4},
        {where: 'm opening (R, S)', p: [0, 0], q: [2, 2], a: 1, b: -1, c: 0},
        {where: 'm R,x=2', p: [2, 0], q: [2, 2], a: 1, b: 0, c: 2},
        {where: 'm S,x=0', p: [2, 0], q: [0, 2], a: 1, b: 1, c: 2},
        {where: 'm made', p: [2, 0], q: [0, 4], a: 2, b: 1, c: 4},
        {where: 'm parallel', p: [2, 0], q: [0, -1], a: 1, b: -2, c: 2},
        {where: 'm R,x=-4', p: [-4, 0], q: [0, -1], a: 1, b: 4, c: -4},
        {where: 'm same', p: [-4, 0], q: [-6, -1], a: 1, b: -2, c: -4},
        {where: 'step 5 line', p: [-2, 3], q: [2, 3], a: 0, b: 1, c: 3},
    ];
    for (const {where, p, q, a, b, c} of named) {
        expect({where, p: a * p[0] + b * p[1], q: a * q[0] + b * q[1]}).toEqual({where, p: c, q: c});
        expect({where, reduced: lineThrough(p, q)}).toEqual({where, reduced: {a, b, c}});
    }
    // The circle point B lies on the circle of the stated r^2 about O = (1, 0); the stated points of the tangent and the worked example on line and circle.
    const onCircle: [string, Pt, number][] = [['B(3,2)', [3, 2], 8], ['B(3,1)', [3, 1], 5], ['B(3,0)', [3, 0], 4], ['B(4,0)', [4, 0], 9], ['(0,2)', [0, 2], 5], ['(-2,1)', [-2, 1], 10], ['(2,3)', [2, 3], 10]];
    for (const [where, p, r2] of onCircle) expect({where, d2: (p[0] - 1) ** 2 + p[1] ** 2}).toEqual({where, d2: r2});
});

// ---- the numbers the text quotes: the language of them -----------------------------------------------------------------------------------

/** Every decimal number (a point or a `{,}`) of the text with the 80 characters before it. */
const decimalsIn = (text: string): {token: string; before: string}[] => [...text.matchAll(/\d+(?:\{,\}|\.)\d+/g)].map(m => ({token: m[0], before: text.slice(Math.max(0, m.index - 80), m.index)}));

describe.each(LANGUAGES)('quoted numbers in the %s text', language => {
    const text = allText(language);

    test('Slovenian has no English decimals and English no decimal-comma braces', () => {
        if (language === 'sl') expect({english: [...text.matchAll(/\d\.\d/g)].map(m => m[0])}).toEqual({english: []});
        else expect({braces: text.includes('{,}')}).toEqual({braces: false});
    });

    test('every rounded number carries "približno"/"about"/\\approx before it, and is the rounding of the recomputed value', () => {
        const mark = /približno|\\approx|approximately|about/;
        const found = decimalsIn(text);
        expect(found.length).toBeGreaterThan(0);
        for (const {token, before} of found) expect({token, marked: mark.test(before)}).toEqual({token, marked: true});
        // The decimals of the text are exactly the roundings of the recomputed values 4/5, 12/5 and the two points of step 3, each as often as the text quotes it.
        const s = Math.sqrt(60) / 10;
        const recomputed = [4 / 5, 12 / 5, 2 * (2 - s) - 4, 2 - s, 2 * (2 + s) - 4, 2 + s].map(v => mathDecimal(Math.abs(v), language));
        expect([...new Set(found.map(f => f.token))].sort()).toEqual([...new Set(recomputed)].sort());
    });

    test('every number of two or more digits (or fraction part) the text mentions is one of the recomputed values', () => {
        // Strip index and exponent digits and the digit pairs of \tfrac45; what is left of two digits or more must come from the arithmetic above.
        const stripped = text.replace(/\\tfrac\d\d/g, '').replace(/[_^]\d/g, '').replace(/\\tfrac\{(\d+)\}\{(\d+)\}/g, ' $1 $2 ').replace(/[\\](?:sqrt)\{(\d+)\}/g, ' $1 ');
        const decimalFree = stripped.replace(/\d+(?:\{,\}|\.)\d+/g, ' ');
        const multi = new Set(decimalFree.match(/\d{2,}/g) ?? []);
        // 12 (12/5), 15 (the readout and the factor of the example), 17 and 20 (the quadratic), 60 and 100 (the discriminants), 10 (r^2 of the example, 5 d / ...).
        const allowed = new Set(['10', '12', '15', '17', '20', '60', '100']);
        expect({unexpected: [...multi].filter(n => !allowed.has(n))}).toEqual({unexpected: []});
        expect([...multi].sort()).toEqual([...allowed].sort());
    });
});
