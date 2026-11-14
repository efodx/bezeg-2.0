/**
 * L1 to L4 (line-geometry; L3 and L4 are the second half of this file): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), every number a scene text quotes is bound to its step and sign against the real readout, and the
 * implicit forms, normals, cross and dot products are recomputed here with plain integer arithmetic (not the line kernel).
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {lineAngleLesson, lineDistanceLesson, lineFormsLesson, lineNormalLesson} from './analyticLinesGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {LineGeometryGraph} from '../../graphs/lines/LineGeometryGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Pt = readonly [number, number];
interface Expected {
    readonly mode: 'forms' | 'normal';
    readonly P: Pt;
    readonly Q: Pt;
    readonly R?: Pt;
    readonly S?: Pt;
    /** Readout rows (Unicode minus) the scene must show. */
    readonly rows: Readonly<Record<string, string>>;
    /** LaTeX the expected-state text quotes, each in both languages. */
    readonly quotes: readonly string[];
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** The reduced implicit coefficients of the line through two points: a = qy - py, b = px - qx, c = a px + b py, divided by gcd, first nonzero positive. */
const implicitOf = (p: Pt, q: Pt) => {
    const a = q[1] - p[1];
    const b = p[0] - q[0];
    const c = a * p[0] + b * p[1];
    const g = gcd(gcd(a, b), c) || 1;
    const sign = (a !== 0 ? a : b) < 0 ? -1 : 1;
    return {raw: [a, b, c], reduced: [sign * a / g, sign * b / g, sign * c / g]};
};
const sgn = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const term = (coefficient: number, variable: string, first: boolean) => {
    if (coefficient === 0) return '';
    const magnitude = Math.abs(coefficient) === 1 ? '' : String(Math.abs(coefficient));
    const sign = coefficient < 0 ? (first ? '−' : ' − ') : (first ? '' : ' + ');
    return `${sign}${magnitude}${variable}`;
};
const implicitText = ([a, b, c]: number[]) => `${term(a, 'x', true)}${term(b, 'y', a === 0)} = ${sgn(c)}`;

const L1: Record<string, Expected> = {
    'l1-predict': {mode: 'forms', P: [-2, 1], Q: [4, 4], rows: {'implicit-raw': '3x − 6y = −12', implicit: 'x − 2y = −4', explicit: 'y = (1/2)x + 2', intercept: 'x/(−4) + y/2 = 1'},
        quotes: ['3x-6y=-12', 'x-2y=-4', 'y=\\tfrac12x+2', '-4', '2']},
    'l1-drag': {mode: 'forms', P: [-2, 1], Q: [4, -1], rows: {'implicit-raw': '−2x − 6y = −2', implicit: 'x + 3y = 1', explicit: 'y = −(1/3)x + 1/3', intercept: 'x/1 + y/(1/3) = 1'},
        quotes: ['-2x-6y=-2', 'x+3y=1', 'y=-\\tfrac13x+\\tfrac13']},
    'l1-vertical': {mode: 'forms', P: [3, -1], Q: [3, 5], rows: {implicit: 'x = 3', explicit: 'ni določena (navpična premica)', vertical: 'da, x = 3'},
        quotes: ['x=3']},
    'l1-origin': {mode: 'forms', P: [-2, 1], Q: [4, -2], rows: {implicit: 'x + 2y = 0', explicit: 'y = −(1/2)x', intercept: 'je ni (premica gre skozi izhodišče)'},
        quotes: ['x+2y=0', 'y=-\\tfrac12x']},
    'l1-free': {mode: 'forms', P: [-4, 0], Q: [4, 4], rows: {'implicit-raw': '4x − 8y = −16', implicit: 'x − 2y = −4'},
        quotes: ['4x-8y=-16', 'x-2y=-4']},
};
const L2: Record<string, Expected> = {
    'l2-predict': {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [3, -2], S: [5, -2],
        rows: {'implicit-1': 'x − 2y = −4', 'implicit-2': 'y = −2', 'normal-1': '(1; −2)', 'normal-2': '(0; 1)', cross: '1', dot: '−2', relation: 'ne vzporedni ne pravokotni'},
        quotes: ['x-2y=-4', '(1,-2)', 'y=-2', '(0,1)', 'a_1b_2-a_2b_1=1', 'a_1a_2+b_1b_2=-2']},
    'l2-perpendicular': {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [3, -2], S: [2, 0],
        rows: {'implicit-2': '2x + y = 4', 'normal-2': '(2; 1)', cross: '5', dot: '0', slopes: '−1', relation: 'pravokotni'},
        quotes: ['2x+y=4', '(2,1)', 'a_1b_2-a_2b_1=5', 'a_1a_2+b_1b_2=0', '-1']},
    'l2-vertical-horizontal': {mode: 'normal', P: [3, -1], Q: [3, 5], R: [-2, 2], S: [4, 2],
        rows: {'implicit-1': 'x = 3', 'implicit-2': 'y = 2', 'normal-1': '(1; 0)', 'normal-2': '(0; 1)', cross: '1', dot: '0', slopes: 'ni določen (navpična premica)', relation: 'pravokotni'},
        quotes: ['x=3', '(1,0)', 'y=2', '(0,1)', 'a_1a_2+b_1b_2=0']},
    'l2-parallel': {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [3, 0], S: [5, 1],
        rows: {'implicit-2': 'x − 2y = 3', 'normal-2': '(1; −2)', cross: '0', dot: '5', slopes: '1/4', relation: 'vzporedni'},
        quotes: ['x-2y=3', '(1,-2)', 'a_1b_2-a_2b_1=0', 'a_1a_2+b_1b_2=5', '\\tfrac14']},
    'l2-free': {mode: 'normal', P: [-2, 1], Q: [4, 4], R: [0, 2], S: [2, 3],
        rows: {'implicit-2': 'x − 2y = −4', cross: '0', dot: '5', relation: 'premici sovpadata'},
        quotes: ['x-2y=-4', 'a_1b_2-a_2b_1=0', 'a_1a_2+b_1b_2=5']},
};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mount() {
    const graph = createGraph('line-geometry');
    if (!(graph instanceof LineGeometryGraph)) throw new Error('line-geometry must be the line graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (lesson: GuidedLesson, stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
        }),
    };
}

describe.each([
    ['L1', lineFormsLesson, L1, 'forms-of-a-line'],
    ['L2', lineNormalLesson, L2, 'normal-parallel-perpendicular'],
] as const)('%s', (name, lesson, scenes, section) => {
    test('has five ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(5);
        const owned = getChapterOwnedLessons('analytic-lines')!.lesson(section)!;
        expect(owned.steps).toHaveLength(5);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test(`${name}: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice`, () => {
        const m = mount();
        try {
            const ids = Object.keys(scenes);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const expected = scenes[id];
                m.scene(lesson, id);
                m.scene(lesson, id);
                const state = m.graph.state;
                const pt = ({x, y}: {x: number; y: number}): Pt => [x, y];
                expect({id, mode: state.mode, P: pt(state.P), Q: pt(state.Q)}).toEqual({id, mode: expected.mode, P: expected.P, Q: expected.Q});
                if (expected.R && expected.S) expect({id, R: pt(state.R), S: pt(state.S)}).toEqual({id, R: expected.R, S: expected.S});
                for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: readout(row)}).toEqual({id, row, text});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test(`${name}: the numbers each scene text quotes are those of the scene, in both languages`, () => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            for (const language of ['sl', 'en'] as const) {
                const state = step.scene!.expectedState[language];
                for (const quote of expected.quotes) expect({id: step.id, language, quote, found: state.includes(quote)}).toEqual({id: step.id, language, quote, found: true});
            }
        }
    });
});

test('L1: implicit forms, raw and reduced, equal the integer arithmetic of the two points', () => {
    const m = mount();
    try {
        for (const [id, expected] of Object.entries(L1)) {
            m.scene(lineFormsLesson, id);
            const {raw, reduced} = implicitOf(expected.P, expected.Q);
            expect({id, implicit: readout('implicit')}).toEqual({id, implicit: implicitText(reduced)});
            if (expected.rows['implicit-raw']) expect({id, raw: readout('implicit-raw')}).toEqual({id, raw: implicitText(raw)});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test('L1: the explicit slope and intercepts follow from the reduced coefficients', () => {
    const [a, b, c] = implicitOf([-2, 1], [4, 4]).reduced;
    expect({k: -a / b, n: c / b, xIntercept: c / a, yIntercept: c / b}).toEqual({k: 0.5, n: 2, xIntercept: -4, yIntercept: 2});
    const [a2, b2, c2] = implicitOf([-2, 1], [4, -1]).reduced;
    expect({k: -a2 / b2, n: c2 / b2, xIntercept: c2 / a2}).toEqual({k: -1 / 3, n: 1 / 3, xIntercept: 1});
    // The worked example of step 2 quotes the same line.
    const example = lineFormsLesson.workedExamples[0];
    expect(example.calculationLatex).toContain('a=-1-1=-2');
    expect(example.resultLatex).toContain('x+3y=1');
});

test('L2: normals, cross and dot products of every scene are the integer arithmetic of the implicit coefficients', () => {
    const m = mount();
    try {
        for (const [id, expected] of Object.entries(L2)) {
            m.scene(lineNormalLesson, id);
            const [a1, b1] = implicitOf(expected.P, expected.Q).reduced;
            const [a2, b2] = implicitOf(expected.R!, expected.S!).reduced;
            expect({id, normal1: readout('normal-1'), normal2: readout('normal-2')}).toEqual({id, normal1: `(${sgn(a1)}; ${sgn(b1)})`, normal2: `(${sgn(a2)}; ${sgn(b2)})`});
            expect({id, cross: readout('cross'), dot: readout('dot')}).toEqual({id, cross: sgn(a1 * b2 - a2 * b1), dot: sgn(a1 * a2 + b1 * b2)});
        }
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- L3 and L4 (batch B) ------------------------------------------------------------------------------------------------------------------

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
const here = dirname(fileURLToPath(import.meta.url));

interface Scene34 {
    readonly mode: 'angle' | 'distance';
    readonly P: Pt;
    readonly Q: Pt;
    readonly R?: Pt;
    readonly S?: Pt;
    readonly T?: Pt;
}
const L3: Record<string, Scene34> = {
    'l3-predict': {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [0, 2], S: [1, 5]},
    'l3-other-direction': {mode: 'angle', P: [-2, 1], Q: [2, 2], R: [-2, 1], S: [-1, 4]},
    'l3-swap': {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [1, 5], S: [0, 2]},
    'l3-perpendicular': {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [0, 2], S: [-1, 4]},
    'l3-free': {mode: 'angle', P: [-2, 1], Q: [0, 2], R: [0, 2], S: [1, 5]},
};
const L4: Record<string, Scene34> = {
    'l4-predict': {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [3, -2]},
    'l4-other-side': {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [-3, 4]},
    'l4-projection': {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [3, -2]},
    'l4-on-line': {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [2, 3]},
    'l4-free': {mode: 'distance', P: [-2, 1], Q: [4, 4], T: [3, -2]},
};

/** Exact fractions by integer arithmetic. */
interface Frac {readonly n: number; readonly d: number}
const frac = (n: number, d: number): Frac => {
    const g = gcd(n, d) || 1;
    const s = d < 0 ? -1 : 1;
    return {n: s * n / g, d: s * d / g};
};
/** The LaTeX the lessons use for a fraction: -\tfrac85 or \tfrac{12}{5}, whole numbers plain. */
const fracTex = (f: Frac) => {
    if (f.d === 1) return String(f.n);
    const body = Math.abs(f.n) < 10 && f.d < 10 ? `\\tfrac${Math.abs(f.n)}${f.d}` : `\\tfrac{${Math.abs(f.n)}}{${f.d}}`;
    return `${f.n < 0 ? '-' : ''}${body}`;
};
const fracToken = (f: Frac) => (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);

const angleMeasures = (s: Scene34) => {
    const [P, Q, R, S] = [s.P, s.Q, s.R!, s.S!];
    const u: Pt = [Q[0] - P[0], Q[1] - P[1]];
    const v: Pt = [S[0] - R[0], S[1] - R[1]];
    const dot = u[0] * v[0] + u[1] * v[1];
    const cross = u[0] * v[1] - u[1] * v[0];
    const uSq = u[0] ** 2 + u[1] ** 2;
    const vSq = v[0] ** 2 + v[1] ** 2;
    const diffSq = (u[0] - v[0]) ** 2 + (u[1] - v[1]) ** 2;
    return {u, v, dot, cross, uSq, vSq, diffSq, degrees: Math.atan2(Math.abs(cross), Math.abs(dot)) * 180 / Math.PI, vectorDegrees: Math.atan2(Math.abs(cross), dot) * 180 / Math.PI};
};

const distanceMeasures = (s: Scene34) => {
    const [a, b, c] = implicitOf(s.P, s.Q).reduced;
    const T = s.T!;
    const val = a * T[0] + b * T[1] - c;
    const norm = a * a + b * b;
    // Foot F = T - (value / norm) n.
    const foot = [frac(T[0] * norm - val * a, norm), frac(T[1] * norm - val * b, norm)] as const;
    const projection = [frac(val * a, norm), frac(val * b, norm)] as const;
    const pt: Pt = [T[0] - s.P[0], T[1] - s.P[1]];
    return {a, b, c, val, norm, d2: frac(val * val, norm), foot, projection, pt, ptDotN: pt[0] * a + pt[1] * b, distance: Math.abs(val) / Math.sqrt(norm)};
};

/** The numbers of a readout text (fractions as written, a decimal comma becomes a point, the typographic minus a minus). */
const tokens = (text: string | null, language: Language): string[] =>
    ((language === 'sl' ? (text ?? '').replace(/(\d),(\d)/g, '$1.$2') : (text ?? '')).replace(/−/g, '-').match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g)) ?? [];
const asNumber = (token: string) => { const [n, d] = token.split('/'); return Number(n) / (d === undefined ? 1 : Number(d)); };
const status = () => document.querySelector('[data-line-status]')?.textContent ?? '';
const decimals = (n: number, digits: number, language: Language) => { const s = String(Number(n.toFixed(digits))); return language === 'sl' ? s.replace('.', ',') : s; };
/** Lesson text read as prose: the `{,}` of math is read as a decimal point. */
const prose = (text: string) => text.replace(/\{,\}/g, '.');
/** The decimal as the lesson text writes it in math: `4{,}9193` in Slovenian, `4.9193` in English. */
const mathDecimal = (n: number, language: Language) => (language === 'sl' ? decimals(n, 4, 'en').replace('.', '{,}') : decimals(n, 4, 'en'));

const scenesOf = (lesson: GuidedLesson) => (lesson === lineAngleLesson ? L3 : L4);
const sectionOf = (lesson: GuidedLesson) => (lesson === lineAngleLesson ? 'angle-between-lines' : 'distance-point-line');

describe.each([['L3', lineAngleLesson], ['L4', lineDistanceLesson]] as const)('%s (batch B)', (name, lesson) => {
    const scenes = scenesOf(lesson);

    test('has five ordered steps with a scene each, a worked example, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(5);
        expect(lesson.workedExamples.length).toBeGreaterThanOrEqual(1);
        expect(lesson.steps.filter(step => step.workedExampleId).every(step => lesson.workedExamples.some(example => example.id === step.workedExampleId))).toBe(true);
        const owned = getChapterOwnedLessons('analytic-lines')!.lesson(sectionOf(lesson))!;
        expect(owned.steps.map(step => step.id)).toEqual(lesson.steps.map(step => step.id));
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test.each(LANGUAGES)(`${name} (%s): every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice`, language => {
        setLanguage(language);
        const m = mount();
        try {
            const ids = Object.keys(scenes);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const expected = scenes[id];
                m.scene(lesson, id);
                m.scene(lesson, id);
                const state = m.graph.state;
                const pt = ({x, y}: {x: number; y: number}): Pt => [x, y];
                expect({id, mode: state.mode, P: pt(state.P), Q: pt(state.Q)}).toEqual({id, mode: expected.mode, P: expected.P, Q: expected.Q});
                if (expected.R && expected.S) expect({id, R: pt(state.R), S: pt(state.S)}).toEqual({id, R: expected.R, S: expected.S});
                if (expected.T) expect({id, T: pt(state.T)}).toEqual({id, T: expected.T});
                if (expected.mode === 'angle') {
                    const m3 = angleMeasures(expected);
                    expect({id, u: tokens(readout('direction-u'), language).map(asNumber), v: tokens(readout('direction-v'), language).map(asNumber)}).toEqual({id, u: [...m3.u], v: [...m3.v]});
                    expect({id, dot: readout('dot'), cross: readout('cross')}).toEqual({id, dot: sgn(m3.dot), cross: sgn(m3.cross)});
                    // The row as printed, with its typographic minus: "25 = 5 + 10 − 2 · −5".
                    expect({id, rule: readout('cosine-rule')}).toEqual({id, rule: `${sgn(m3.diffSq)} = ${sgn(m3.uSq)} + ${sgn(m3.vSq)} − 2 · ${sgn(m3.dot)}`});
                    expect({id, angleOk: Math.abs(tokens(readout('angle'), language).map(asNumber)[0] - m3.degrees) < 5e-5}).toEqual({id, angleOk: true});
                    expect(m3.diffSq).toBe(m3.uSq + m3.vSq - 2 * m3.dot);
                } else {
                    const m4 = distanceMeasures(expected);
                    expect({id, value: readout('value'), norm: readout('norm'), ptDotN: readout('pt-dot-n')}).toEqual({id, value: sgn(m4.val), norm: sgn(m4.norm), ptDotN: sgn(m4.ptDotN)});
                    expect({id, d2: tokens(readout('distance-squared'), language)}).toEqual({id, d2: [fracToken(m4.d2)]});
                    expect({id, foot: tokens(readout('foot'), language)}).toEqual({id, foot: m4.foot.map(fracToken)});
                    expect({id, projection: tokens(readout('projection'), language)}).toEqual({id, projection: m4.projection.map(fracToken)});
                    expect({id, pt: tokens(readout('pt'), language).map(asNumber)}).toEqual({id, pt: [...m4.pt]});
                    // The printed distance is rounded ("≈ 0" on the line); the exact decision is the value.
                    expect({id, distance: readout('distance')}).toEqual({id, distance: `≈ ${decimals(m4.distance, 4, language)}`});
                }
                expect({id, status: status().length > 0}).toEqual({id, status: true});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test.each(LANGUAGES)(`${name} (%s): the numbers each step quotes are those of its scene, recomputed independently`, language => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            const state = step.scene!.expectedState[language];
            const observed = step.expectedObservations.map(o => o[language]).join(' ');
            const has = (haystack: string, quote: string) => expect({id: step.id, language, quote, found: haystack.includes(quote)}).toEqual({id: step.id, language, quote, found: true});
            if (expected.mode === 'angle') {
                const m3 = angleMeasures(expected);
                has(state, `\\vec u=(${m3.u.join(',')})`);
                has(state, `\\vec v=(${m3.v.join(',')})`);
                if (step.id !== 'l3-free') {
                    has(state, `\\vec u\\cdot\\vec v=${m3.dot}`);
                    has(state, `\\vec u\\times\\vec v=${m3.cross}`);
                }
                const rounded = Math.round(m3.degrees);
                has(state, Math.abs(m3.degrees - rounded) < 1e-9 ? `${rounded}^\\circ` : `${mathDecimal(m3.degrees, language)}^\\circ`);
                if (step.id !== 'l3-free') {
                    has(observed, m3.dot === 0 ? `${m3.diffSq}=${m3.uSq}+${m3.vSq}` : `${m3.diffSq}=${m3.uSq}+${m3.vSq}-2\\cdot${m3.dot < 0 ? `(${m3.dot})` : m3.dot}`);
                    has(observed, `\\(${m3.dot}\\)`);
                }
                if (step.id === 'l3-swap') {
                    has(observed, '135^\\circ');
                    has(observed, '-\\tfrac1{\\sqrt2}');
                    has(observed, '45^\\circ');
                }
            } else {
                const m4 = distanceMeasures(expected);
                if (step.id !== 'l4-projection') has(state, `T=(${expected.T!.join(',')})`);
                if (step.id !== 'l4-on-line') has(state, `d^2=${fracTex(m4.d2)}`);
                if (step.id === 'l4-predict' || step.id === 'l4-other-side') has(state, `d\\approx${mathDecimal(m4.distance, language)}`);
                if (step.id === 'l4-predict' || step.id === 'l4-other-side') has(state, `F=(${fracTex(m4.foot[0])},${fracTex(m4.foot[1])})`);
                if (step.id === 'l4-other-side') has(state, `\\(${m4.val}\\)`);
                if (step.id === 'l4-on-line') {
                    expect(m4.val).toBe(0);
                    has(observed, `\\(${m4.val}\\)`);
                }
                if (step.id === 'l4-projection') {
                    has(state, `(${m4.pt.join(',')})`);
                    has(state, `PT\\cdot n=${m4.ptDotN}`);
                    has(state, `(${fracTex(m4.projection[0])},${fracTex(m4.projection[1])})`);
                }
            }
        }
    });

    test('sl and en quote the same numbers in every field of the lesson', () => {
        const numbers = (text: string) => prose(text).match(/\d+(?:\.\d+)?/g) ?? [];
        const pairs: {where: string; text: {sl: string; en: string}}[] = [];
        for (const step of lesson.steps) {
            pairs.push({where: `${step.id} title`, text: step.title}, {where: `${step.id} purpose`, text: step.purpose}, {where: `${step.id} explanation`, text: step.explanation},
                {where: `${step.id} prompt`, text: step.observationPrompt}, {where: `${step.id} scene`, text: step.scene!.expectedState},
                ...step.expectedObservations.map((text, i) => ({where: `${step.id} observation ${i}`, text})));
        }
        for (const formula of lesson.formulaBlocks) pairs.push({where: `${formula.id} notation`, text: formula.notation}, {where: `${formula.id} explanation`, text: formula.explanation});
        for (const example of lesson.workedExamples) pairs.push({where: `${example.id} title`, text: example.title}, {where: `${example.id} check`, text: example.check});
        for (const {where, text} of pairs) expect({where, numbers: numbers(text.sl)}).toEqual({where, numbers: numbers(text.en)});
    });

    test('math is delimited and English has no decimal comma: no control characters, balanced delimiters, no doubled backslashes, no {,} in English', () => {
        const texts: {where: string; language: Language; text: string}[] = [];
        const add = (where: string, t: {sl: string; en: string}) => LANGUAGES.forEach(language => texts.push({where, language, text: t[language]}));
        for (const step of lesson.steps) {
            add(`${step.id} title`, step.title); add(`${step.id} purpose`, step.purpose); add(`${step.id} explanation`, step.explanation);
            add(`${step.id} prompt`, step.observationPrompt); add(`${step.id} scene`, step.scene!.expectedState);
            step.expectedObservations.forEach((o, i) => add(`${step.id} observation ${i}`, o));
        }
        for (const formula of lesson.formulaBlocks) { add(`${formula.id} notation`, formula.notation); add(`${formula.id} explanation`, formula.explanation); }
        for (const example of lesson.workedExamples) { add(`${example.id} title`, example.title); add(`${example.id} check`, example.check); }
        for (const {where, language, text} of texts) {
            expect({where, language, control: /[\u0000-\u001f]/.test(text)}).toEqual({where, language, control: false});
            expect({where, language, doubled: /\\\\/.test(text)}).toEqual({where, language, doubled: false});
            expect({where, language, balanced: (text.match(/\\\(/g) ?? []).length === (text.match(/\\\)/g) ?? []).length}).toEqual({where, language, balanced: true});
            if (language === 'en') expect({where, comma: text.includes('{,}')}).toEqual({where, comma: false});
        }
    });

    test('no step reveals the answer to its prediction in its title, purpose, explanation or prompt', () => {
        const forbidden = (id: string, language: Language): RegExp[] => {
            switch (id) {
                case 'l3-predict': return [/45/, /=\s*5(?!\d)/];
                case 'l3-swap': return [/-5/, /135/, /45/];
                case 'l3-perpendicular': return [/=\s*0(?![\d.])/, /90/, /10=5\+5/, language === 'sl' ? /pravokotn|Pitagor/ : /perpendicular|Pythagor/];
                case 'l4-predict': return [/121/, language === 'sl' ? /4\{,\}9193/ : /4\.9193/, /tfrac45|tfrac\{12\}\{5\}/];
                case 'l4-other-side': return [/-7(?!\d)/, /49/, language === 'sl' ? /3\{,\}1305/ : /3\.1305/, /tfrac85/];
                case 'l4-on-line': return [/=\s*0(?![\d.])/, language === 'sl' ? /leži na premici/ : /lies on the line/];
                default: return [];
            }
        };
        for (const step of lesson.steps) {
            for (const language of LANGUAGES) {
                const shown = [step.title, step.purpose, step.explanation, step.observationPrompt].map(t => t[language]).join(' ');
                for (const pattern of forbidden(step.id, language)) expect({id: step.id, language, pattern: String(pattern), leaked: pattern.test(shown)}).toEqual({id: step.id, language, pattern: String(pattern), leaked: false});
            }
        }
    });

    test('the lesson and chapter sources contain no single-backslash math delimiters', () => {
        for (const file of ['analyticLinesGuidedLessons.ts', 'analyticLinesChapter.ts']) {
            const source = readFileSync(resolve(here, file), 'utf8');
            expect({file, single: (source.match(/(^|[^\\])\\[()[\]]/gm) ?? []).length}).toEqual({file, single: 0});
        }
    });
});

describe('L3 mathematics', () => {
    test('the exact figures of the angle scenes', () => {
        const swap = angleMeasures(L3['l3-swap']);
        expect({dot: swap.dot, cross: swap.cross, uSq: swap.uSq, vSq: swap.vSq}).toEqual({dot: -5, cross: -5, uSq: 5, vSq: 10});
        expect(swap.dot * swap.dot * 2).toBe(swap.uSq * swap.vSq); // cos² = 1/2 with a negative dot: cos = -1/√2, so 135 degrees
        expect(swap.vectorDegrees).toBeCloseTo(135, 10);
        expect(swap.degrees).toBeCloseTo(45, 10);
        const other = angleMeasures(L3['l3-other-direction']);
        expect({dot: other.dot, cross: other.cross, diffSq: other.diffSq}).toEqual({dot: 7, cross: 11, diffSq: 13});
        expect(other.degrees.toFixed(4)).toBe('57.5288');
        const right = angleMeasures(L3['l3-perpendicular']);
        expect({dot: right.dot, diffSq: right.diffSq, sum: right.uSq + right.vSq}).toEqual({dot: 0, diffSq: 10, sum: 10});
    });

    test('the worked example is the angle of the step that cites it', () => {
        expect(lineAngleLesson.workedExamples[0].resultLatex).toContain('57{,}5288');
        expect(lineAngleLesson.steps.find(step => step.workedExampleId)!.id).toBe('l3-other-direction');
    });
});

describe('L4 mathematics', () => {
    test.each(Object.entries(L4))('%s: the foot is on the line, FT is perpendicular to it, d² is the value squared over a² + b², exactly', (_id, scene) => {
        const m4 = distanceMeasures(scene);
        const [fx, fy] = m4.foot;
        // a Fx + b Fy = c, with fractions over a common denominator.
        const onLine = frac(m4.a * fx.n * fy.d + m4.b * fy.n * fx.d, fx.d * fy.d);
        expect({onLine: onLine.n === m4.c * onLine.d}).toEqual({onLine: true});
        // FT is parallel to n, so FT · (b, -a) = 0 exactly.
        const ft = [frac(scene.T![0] * fx.d - fx.n, fx.d), frac(scene.T![1] * fy.d - fy.n, fy.d)] as const;
        expect(frac(ft[0].n * m4.b * ft[1].d - ft[1].n * m4.a * ft[0].d, ft[0].d * ft[1].d).n === 0).toBe(true);
        // |FT|² = d² exactly.
        expect(frac(ft[0].n ** 2 * ft[1].d ** 2 + ft[1].n ** 2 * ft[0].d ** 2, (ft[0].d * ft[1].d) ** 2)).toEqual(m4.d2);
        expect(m4.d2.n / m4.d2.d).toBeCloseTo(m4.distance ** 2, 10);
        expect(m4.ptDotN).toBe(m4.val);
    });

    test('the worked example and the on-line scene', () => {
        const m4 = distanceMeasures(L4['l4-projection']);
        expect({val: m4.val, norm: m4.norm, d2: m4.d2, ptDotN: m4.ptDotN}).toEqual({val: 11, norm: 5, d2: frac(121, 5), ptDotN: 11});
        expect(m4.distance.toFixed(4)).toBe('4.9193');
        const on = distanceMeasures(L4['l4-on-line']);
        expect({val: on.val, d2: on.d2.n, distance: on.distance}).toEqual({val: 0, d2: 0, distance: 0});
        expect(lineDistanceLesson.steps.find(step => step.workedExampleId)!.id).toBe('l4-projection');
    });
});
