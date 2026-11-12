/**
 * L1 and L2 (line-geometry): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), every number a scene text quotes is bound to its step and sign against the real readout, and the
 * implicit forms, normals, cross and dot products are recomputed here with plain integer arithmetic (not the line kernel).
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {lineFormsLesson, lineNormalLesson} from './analyticLinesGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
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
