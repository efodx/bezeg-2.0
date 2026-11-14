/**
 * CG1 to CG4 (circle-construction; CG3 and CG4 are tested in the last two sections): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a
 * restored checkpoint, out of order and twice), every number a scene text quotes is bound to its step against the real readout, and the powers,
 * tangent lengths, contact points, radical axes and the radical centre are recomputed here with exact integer and rational arithmetic (not the
 * circle kernel). Numbers the text asks the learner to produce are checked by applying that change as an action and reading the readout.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {circleApolloniusLesson, circleCommonTangentsLesson, circleRadicalLesson, circleTangentsLesson} from './circleGeometryGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {CircleConstructionGraph} from '../../graphs/compgeo/CircleConstructionGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- exact arithmetic -------------------------------------------------------------------------------------------------------------

type Pt = readonly [number, number];
type Circle = readonly [x: number, y: number, r: number];
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
interface Frac {readonly n: number; readonly d: number}
const frac = (n: number, d = 1): Frac => {
    const g = gcd(n, d) || 1;
    return d < 0 ? {n: -n / g + 0, d: -d / g} : {n: n / g + 0, d: d / g}; // + 0 turns -0 into 0
};
const minus = (text: string) => text.replace('-', '−');
const decimal = (f: Frac) => minus((f.n / f.d).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')).replace('.', ',');
/** The readout format of a rational: an integer, or `p/q ≈ decimal` with a decimal comma and a Unicode minus. */
const ratText = (f: Frac) => (f.d === 1 ? minus(String(f.n)) : `${minus(`${f.n}/${f.d}`)} ≈ ${decimal(f)}`);
const intText = (n: number) => minus(String(n));

/** The power of a point with respect to a circle (all the lesson circles have integer radii). */
const power = (p: Pt, c: Circle) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 - c[2] ** 2;
/** The radical axis of two circles: 2 (O2 - O1) . X = |O2|^2 - |O1|^2 - r2^2 + r1^2, as [a, b, c]. */
const axis = (c1: Circle, c2: Circle): [number, number, number] =>
    [2 * (c2[0] - c1[0]), 2 * (c2[1] - c1[1]), c2[0] ** 2 + c2[1] ** 2 - c1[0] ** 2 - c1[1] ** 2 - c2[2] ** 2 + c1[2] ** 2];
const axisText = ([a, b, c]: [number, number, number]) => {
    const lead = (k: number, v: string, first: boolean) => (k === 0 ? '' : `${first ? (k < 0 ? '−' : '') : (k < 0 ? ' − ' : ' + ')}${Math.abs(k)} ${v}`);
    return `${lead(a, 'x', true)}${lead(b, 'y', a === 0)} = ${intText(c)}`;
};
/** The intersection of two lines by Cramer's rule. */
const meet = ([a1, b1, c1]: number[], [a2, b2, c2]: number[]): [Frac, Frac] => {
    const det = a1 * b2 - a2 * b1;
    return [frac(c1 * b2 - c2 * b1, det), frac(a1 * c2 - a2 * c1, det)];
};

const O: Circle = [0, 0, 5];
const C2: Circle = [6, 0, 3];
const C3: Circle = [3, 6, 2];

// ---- the graph ---------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mount() {
    const graph = createGraph('circle-construction');
    if (!(graph instanceof CircleConstructionGraph)) throw new Error('circle-construction must be the circle graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted, capabilities, checkpoint,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (lesson: GuidedLesson, stepId: string, ...extra: LessonAction[]) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
            for (const action of extra) capabilities.apply(action);
        }),
    };
}

interface Expected {
    readonly mode: 'tangents' | 'radical';
    readonly c1: Circle;
    readonly c2?: Circle;
    readonly c3?: Circle;
    readonly p: Pt;
    /** Readout rows (Unicode minus, decimal comma) the scene must show. */
    readonly rows: Readonly<Record<string, string>>;
    /** LaTeX the expected-state text quotes (whitespace ignored), each in both languages. */
    readonly quotes: readonly string[];
}

const CHORD = '13 x = 25';
const CG1: Record<string, Expected> = {
    'cg1-predict': {mode: 'tangents', c1: O, p: [13, 0], rows: {power: '144', count: '2'}, quotes: ['(13,0)', '144']},
    'cg1-count': {mode: 'tangents', c1: O, p: [3, 0], rows: {power: '−16', count: '0'}, quotes: ['(3,0)', '-16']},
    'cg1-thales': {mode: 'tangents', c1: O, p: [13, 0],
        rows: {thales: 'središče (13/2 ≈ 6,5; 0), kvadrat polmera 169/4 ≈ 42,25', chord: CHORD, 'contact-1': '(1,9231; −4,6154)', 'contact-2': '(1,9231; 4,6154)'},
        quotes: ['\\tfrac{13}{2}', '\\tfrac{169}{4}', '13x=25']},
    'cg1-right-angle': {mode: 'tangents', c1: O, p: [13, 0], rows: {'contact-1': '(1,9231; −4,6154)', 'contact-2': '(1,9231; 4,6154)'}, quotes: ['T_{1,2}']},
    'cg1-lengths': {mode: 'tangents', c1: O, p: [13, 0], rows: {power: '144', length: '12', chord: CHORD}, quotes: ['144', '12', '13x=25']},
    'cg1-explore': {mode: 'tangents', c1: O, p: [13, 0], rows: {power: '144', count: '2'}, quotes: ['(13,0)']},
};
const CG2: Record<string, Expected> = {
    'cg2-predict': {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2], rows: {'power-1': '−5', 'power-2': '−1'}, quotes: ['(4,2)', '-5', '-1']},
    'cg2-probe': {mode: 'radical', c1: O, c2: C2, c3: C3, p: [5, 2], rows: {'power-1': '4', 'power-2': '−4'}, quotes: ['(5,2)', '4', '-4']},
    'cg2-line': {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2], rows: {'axis-12': '12 x = 52', 'on-axis': 'ne'}, quotes: ['12x=52', '(4,2)']},
    'cg2-common': {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2], rows: {meet: 'dve skupni točki', 'axis-12': '12 x = 52'}, quotes: ['12x=52']},
    'cg2-apart': {mode: 'radical', c1: O, c2: [8, 0, 3], c3: C3, p: [4, 2], rows: {meet: 'ena skupna točka (dotik)', 'axis-12': '16 x = 80'}, quotes: ['(5,0)', '16x=80']},
    'cg2-centre': {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2],
        rows: {centre: '(13/3 ≈ 4,3333; 10/3 ≈ 3,3333)', 'centre-power': '44/9 ≈ 4,8889', orthogonal: '44/9 ≈ 4,8889', 'axis-13': '6 x + 12 y = 66', 'axis-23': '−6 x + 12 y = 14'},
        quotes: ['\\tfrac{13}{3}', '\\tfrac{10}{3}', '\\tfrac{44}{9}', '6x+12y=66', '-6x+12y=14']},
    'cg2-explore': {mode: 'radical', c1: O, c2: C2, c3: C3, p: [4, 2], rows: {'power-1': '−5'}, quotes: ['(0,0)', '(6,0)', '(3,6)', '(4,2)']},
};

describe.each([
    ['CG1', circleTangentsLesson, CG1, 'tangents-from-a-point', 6],
    ['CG2', circleRadicalLesson, CG2, 'radical-axis-and-centre', 7],
] as const)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('circle-geometry')!.lesson(section)!;
        expect(owned.steps).toHaveLength(count);
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
                const circle = (c: {x: number; y: number; r: number}): Circle => [c.x, c.y, c.r];
                expect({id, mode: state.mode, p: [state.p.x, state.p.y]}).toEqual({id, mode: expected.mode, p: expected.p});
                expect({id, c1: circle(state.c1)}).toEqual({id, c1: expected.c1});
                if (expected.c2) expect({id, c2: circle(state.c2)}).toEqual({id, c2: expected.c2});
                if (expected.c3) expect({id, c3: circle(state.c3)}).toEqual({id, c3: expected.c3});
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
                const state = step.scene!.expectedState[language].replace(/\s+/g, '');
                for (const quote of expected.quotes) expect({id: step.id, language, quote, found: state.includes(quote)}).toEqual({id: step.id, language, quote, found: true});
            }
        }
    });

    test(`${name}: restoring the checkpoint on leaving returns the free state`, () => {
        const m = mount();
        try {
            const free = JSON.stringify(m.graph.state);
            const freeReadouts = [...document.querySelectorAll('[data-readout]')].map(node => node.textContent);
            for (const step of lesson.steps) m.scene(lesson, step.id);
            m.scene(lesson, lesson.steps[1].id); // not the Demonstration default (CG1's last scene is the default)
            expect(JSON.stringify(m.graph.state)).not.toEqual(free);
            act(() => { m.capabilities.restoreState(m.checkpoint); });
            expect(JSON.stringify(m.graph.state)).toEqual(free);
            expect([...document.querySelectorAll('[data-readout]')].map(node => node.textContent)).toEqual(freeReadouts);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

// ---- CG1: recomputed with exact arithmetic ------------------------------------------------------------------------------------------

test('CG1: power, tangent length, contact points and chord equal the exact arithmetic', () => {
    const m = mount();
    try {
        // P = (13, 0): power 169 - 25 = 144, length 12 (12^2 = 144), contacts x = rho^2/d = 25/13, y = +-60/13 (25^2 + 60^2 = 65^2 = 25 * 13^2).
        const p: Pt = [13, 0];
        expect(power(p, O)).toBe(144);
        expect(12 * 12).toBe(144);
        expect(25 ** 2 + 60 ** 2).toBe(O[2] ** 2 * 13 ** 2);
        // (T - O) . (T - P) = 0 with T = (25/13, 60/13), multiplied by 169: 25 (25 - 169) + 60 * 60 = -3600 + 3600.
        expect(25 * (25 - 13 * p[0]) + 60 * 60).toBe(0);
        expect(power([3, 0], O)).toBe(-16);
        expect(power([5, 0], O)).toBe(0);
        m.scene(circleTangentsLesson, 'cg1-lengths');
        expect(readout('power')).toBe(intText(power(p, O)));
        expect(readout('length')).toBe('12');
        expect(readout('contact-1')).toBe(`(${decimal(frac(25, 13))}; ${decimal(frac(-60, 13))})`);
        expect(readout('contact-2')).toBe(`(${decimal(frac(25, 13))}; ${decimal(frac(60, 13))})`);
        expect(readout('chord')).toBe('13 x = 25'); // the chord of contact: d x = rho^2
        expect(ratText(frac(169, 4))).toBe('169/4 ≈ 42,25');
        m.scene(circleTangentsLesson, 'cg1-count');
        expect(readout('power')).toBe(intText(power([3, 0], O)));
        expect(readout('count')).toBe('0');
    } finally {
        m.mounted.view.unmount();
    }
});

test('CG1: the point the learner moves to, (5, 0), has power 0 and exactly one tangent (the learner change applied as an action)', () => {
    const m = mount();
    try {
        m.scene(circleTangentsLesson, 'cg1-count', {kind: 'circle', operation: 'set-point', x: 5, y: 0});
        expect(power([5, 0], O)).toBe(0);
        expect(readout('power')).toBe('0');
        expect(readout('count')).toBe('1');
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- CG2: recomputed with exact arithmetic ------------------------------------------------------------------------------------------

test('CG2: powers, axes, common points and the radical centre equal the exact arithmetic', () => {
    const m = mount();
    try {
        m.scene(circleRadicalLesson, 'cg2-predict');
        const p: Pt = [4, 2];
        expect([power(p, O), power(p, C2), power(p, C3)]).toEqual([-5, -1, 13]);
        expect([readout('power-1'), readout('power-2'), readout('power-3')]).toEqual(['−5', '−1', '13']);
        m.scene(circleRadicalLesson, 'cg2-probe');
        expect([power([5, 2], O), power([5, 2], C2)]).toEqual([4, -4]);
        expect([readout('power-1'), readout('power-2')]).toEqual(['4', '−4']);

        // The axis of c1, c2 is 12 x = 52, that is x = 13/3.
        const a12 = axis(O, C2);
        const a13 = axis(O, C3);
        const a23 = axis(C2, C3);
        expect(a12).toEqual([12, 0, 52]);
        expect(frac(a12[2], a12[0])).toEqual({n: 13, d: 3});
        m.scene(circleRadicalLesson, 'cg2-line');
        expect(readout('axis-12')).toBe(axisText(a12));
        expect(readout('on-axis')).toBe('ne'); // 12 * 4 = 48 differs from 52
        expect(12 * p[0]).not.toBe(52);

        // Common points: x = 13/3, y^2 = 25 - 169/9 = 56/9, and the same point is on c2: (13/3 - 6)^2 + 56/9 = 9 (times 9: 25 + 56 = 81).
        expect(9 * 25 - 13 * 13).toBe(56);
        expect((13 - 18) ** 2 + 56).toBe(9 * 9);
        expect((Math.sqrt(56) / 3).toFixed(4)).toBe('2.4944');
        m.scene(circleRadicalLesson, 'cg2-common');
        expect(readout('meet')).toBe('dve skupni točki');

        // Touching: the centres are at distance 8 = 5 + 3, the axis is 16 x = 80, x = 5.
        expect(axis(O, [8, 0, 3])).toEqual([16, 0, 80]);
        expect(8).toBe(O[2] + 3);
        m.scene(circleRadicalLesson, 'cg2-apart');
        expect(readout('axis-12')).toBe('16 x = 80');
        expect(readout('meet')).toBe('ena skupna točka (dotik)');

        // The radical centre: the axes 1,3 and 2,3 meet at (13/3, 10/3); the power there is 44/9 with respect to all three circles.
        expect(a13).toEqual([6, 12, 66]);
        expect(a23).toEqual([-6, 12, 14]);
        const [cx, cy] = meet(a13, a23);
        expect([cx, cy]).toEqual([frac(13, 3), frac(10, 3)]);
        for (const c of [O, C2, C3]) {
            // (cx - c.x)^2 + (cy - c.y)^2 - r^2 over the denominator 9, with cx = 13/3 and cy = 10/3.
            const dx = cx.n - 3 * c[0];
            const dy = cy.n - 3 * c[1];
            expect(frac(dx * dx + dy * dy - 9 * c[2] ** 2, 9)).toEqual(frac(44, 9));
        }
        expect(Math.sqrt(44 / 9).toFixed(4)).toBe('2.2111');
        m.scene(circleRadicalLesson, 'cg2-centre');
        expect(readout('centre')).toBe(`(${ratText(cx)}; ${ratText(cy)})`);
        expect(readout('centre-power')).toBe(ratText(frac(44, 9)));
        expect(readout('orthogonal')).toBe(ratText(frac(44, 9)));
        expect(readout('axis-13')).toBe(axisText(a13));
        expect(readout('axis-23')).toBe(axisText(a23));
    } finally {
        m.mounted.view.unmount();
    }
});

test('CG2: the circle the learner types in step 5, c2 = (10, 0) with radius 2, has the axis 20 x = 121 and no common points (the learner change applied as an action)', () => {
    const m = mount();
    try {
        const apart: Circle = [10, 0, 2];
        expect(axis(O, apart)).toEqual([20, 0, 121]);
        expect(apart[0] - (O[2] + apart[2])).toBeGreaterThan(0); // the distance 10 exceeds the sum of the radii 7
        expect(121 / 20).toBe(6.05);
        expect(O[2]).toBeLessThan(121 / 20); // c1 reaches to x = 5, c2 starts at x = 8
        expect(apart[0] - apart[2]).toBeGreaterThan(121 / 20);
        m.scene(circleRadicalLesson, 'cg2-apart', {kind: 'circle', operation: 'set-circle', circle: 'c2', x: 10, y: 0, r: 2});
        expect(readout('axis-12')).toBe(axisText(axis(O, apart)));
        expect(readout('meet')).toBe('ni skupnih točk');
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- prose ---------------------------------------------------------------------------------------------------------------------

test('the prose quotes the decimals with a comma in Slovenian and a point in English, equal to the exact rationals', () => {
    const everything = (language: 'sl' | 'en') => [circleTangentsLesson, circleRadicalLesson].flatMap(lesson => [
        ...lesson.steps.flatMap(step => [step.explanation[language], step.scene!.expectedState[language]]),
        ...lesson.workedExamples.map(example => example.check[language]),
    ]).join('\n');
    const pairs: [string, string][] = [
        ['1{,}9231', '1.9231'], ['4{,}6154', '4.6154'], ['4{,}3333', '4.3333'], ['3{,}3333', '3.3333'],
        ['4{,}8889', '4.8889'], ['2{,}2111', '2.2111'], ['2{,}4944', '2.4944'], ['6{,}05', '6.05'],
    ];
    const sl = everything('sl');
    const en = everything('en');
    for (const [comma, point] of pairs) {
        expect({comma, found: sl.includes(comma)}).toEqual({comma, found: true});
        expect({point, found: en.includes(point)}).toEqual({point, found: true});
    }
    // The decimals are the exact rationals rounded to four places.
    expect([frac(25, 13), frac(60, 13), frac(13, 3), frac(10, 3), frac(44, 9)].map(f => (f.n / f.d).toFixed(4)))
        .toEqual(['1.9231', '4.6154', '4.3333', '3.3333', '4.8889']);
    expect((169 / 4).toFixed(2)).toBe('42.25');
    expect(sl).not.toMatch(/\d\.\d{2,}/);
});

// ---- CG3 and CG4: shared helpers -----------------------------------------------------------------------------------------------------

type Lang = 'sl' | 'en';
const LANGS: readonly Lang[] = ['sl', 'en'];
const fadd = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const fsub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fmul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const fdiv = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
/** A rational the way the readout writes it in a language: an integer, or `p/q ≈ decimal`. */
const ratIn = (f: Frac, lang: Lang) => (lang === 'sl' ? ratText(f) : ratText(f).replace(',', '.'));
const pointIn = (x: Frac, y: Frac, lang: Lang) => (lang === 'sl' ? `(${ratIn(x, lang)}; ${ratIn(y, lang)})` : `(${ratIn(x, lang)}, ${ratIn(y, lang)})`);
const cleanText = (value: string) => value.replace(/\s+/g, '');

function mountIn(lang: Lang) {
    setLanguage(lang);
    return mount();
}

/** Every string of a lesson, per language, as [label, text] pairs; the guard for prose-wide scans. */
const strings = (lesson: GuidedLesson, lang: Lang): (readonly [string, string])[] => [
    ['summary', lesson.summary[lang]],
    ...lesson.steps.flatMap((step): (readonly [string, string])[] => [
        [`${step.id}:title`, step.title[lang]], [`${step.id}:purpose`, step.purpose[lang]], [`${step.id}:explanation`, step.explanation[lang]],
        [`${step.id}:prompt`, step.observationPrompt[lang]], [`${step.id}:scene`, step.scene!.expectedState[lang]],
        ...step.expectedObservations.map((o, i): readonly [string, string] => [`${step.id}:obs${i}`, o[lang]]),
    ]),
    ...lesson.formulaBlocks.flatMap((f): (readonly [string, string])[] => [[`${f.id}:latex`, f.latex], [`${f.id}:notation`, f.notation[lang]], [`${f.id}:explanation`, f.explanation[lang]]]),
    ...lesson.workedExamples.flatMap((e): (readonly [string, string])[] => [[`${e.id}:title`, e.title[lang]], [`${e.id}:calc`, e.calculationLatex], [`${e.id}:result`, e.resultLatex], [`${e.id}:check`, e.check[lang]]]),
];

describe.each([
    ['CG3', circleApolloniusLesson, 'apollonius-circle', 'circle-construction-apollonius', 'cg3'],
    ['CG4', circleCommonTangentsLesson, 'common-tangents', 'circle-construction-common-tangents', 'cg4'],
] as const)('%s: structure and prose', (_name, lesson, section, lessonId, prefix) => {
    test('has seven ordered steps with a scene each, a worked example, and the chapter owns it under its lesson id', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(lesson.steps.every(step => step.id.startsWith(`${prefix}-`))).toBe(true);
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
        expect(lesson.workedExamples.length).toBeGreaterThanOrEqual(1);
        expect(lesson.steps.filter(step => step.workedExampleId).every(step => lesson.workedExamples.some(e => e.id === step.workedExampleId))).toBe(true);
        const owned = getChapterOwnedLessons('circle-geometry')!;
        expect(owned.rows().map(([id]) => id)).toContain(section);
        expect(owned.lesson(section)!.demonstrationId).toBe('circle-construction');
        expect(owned.lesson(section)!.steps).toHaveLength(7);
        expect(owned.lesson(section)!.id).toBe(lessonId);
        expect(owned.path(section)).toContain(`lesson.circle-geometry.${section}.`);
    });

    test('every math delimiter is a single backslash in memory (no doubled backslash left) and balanced, in both languages', () => {
        for (const lang of LANGS) {
            for (const [label, value] of strings(lesson, lang)) {
                if (label.endsWith(':latex') || label.endsWith(':calc') || label.endsWith(':result')) {
                    expect({label, delimited: /\\[()[\]]/.test(value)}).toEqual({label, delimited: false});
                    continue;
                }
                expect({label, doubled: /\\\\[()[\]]/.test(value)}).toEqual({label, doubled: false});
                expect({label, open: (value.match(/\\\(/g) ?? []).length}).toEqual({label, open: (value.match(/\\\)/g) ?? []).length});
            }
        }
    });

    test('Slovenian and English quote the same numbers in the same order, per string', () => {
        const numbers = (value: string) => value.replace(/\{,\}/g, '.').match(/\d+(?:\.\d+)?/g) ?? [];
        const sl = strings(lesson, 'sl');
        const en = strings(lesson, 'en');
        expect(sl.map(([label]) => label)).toEqual(en.map(([label]) => label));
        sl.forEach(([label, value], i) => expect({label, numbers: numbers(value)}).toEqual({label, numbers: numbers(en[i][1])}));
    });
});

// ---- CG3 -----------------------------------------------------------------------------------------------------------------------------

const A3: Pt = [0, 0];
const B3: Pt = [6, 0];
/** The scene table: the point P and the ratio k each step names (A and B are the mode's example points). */
const CG3: Readonly<Record<string, {readonly p: Pt; readonly k: number}>> = {
    'cg3-predict': {p: [8, 4], k: 1}, 'cg3-ratio': {p: [5, 0], k: 1}, 'cg3-division': {p: [8, 4], k: 2}, 'cg3-circle': {p: [8, 4], k: 2},
    'cg3-points': {p: [8, 4], k: 2}, 'cg3-inverse': {p: [8, 4], k: 2}, 'cg3-explore': {p: [8, 4], k: 2},
};

/** The set |PA|^2 = m |PB|^2 from A, B, k with exact rationals: the centre (A - m B)/(1 - m) and the squared radius |C|^2 - (|A|^2 - m |B|^2)/(1 - m). */
function apolloniusExact(a: Pt, b: Pt, k: Frac) {
    const m = fmul(k, k);
    const oneMinusM = fsub(frac(1), m);
    const centre: [Frac, Frac] = [fdiv(fsub(frac(a[0]), fmul(m, frac(b[0]))), oneMinusM), fdiv(fsub(frac(a[1]), fmul(m, frac(b[1]))), oneMinusM)];
    const norm = (p: Pt) => p[0] ** 2 + p[1] ** 2;
    const c2 = fadd(fmul(centre[0], centre[0]), fmul(centre[1], centre[1]));
    const r2 = fsub(c2, fdiv(fsub(frac(norm(a)), fmul(m, frac(norm(b)))), oneMinusM));
    // The inverse of A: O + rho^2 (A - O) / |A - O|^2.
    const ax = fsub(frac(a[0]), centre[0]);
    const ay = fsub(frac(a[1]), centre[1]);
    const oa2 = fadd(fmul(ax, ax), fmul(ay, ay));
    const inverse: [Frac, Frac] = [fadd(centre[0], fdiv(fmul(r2, ax), oa2)), fadd(centre[1], fdiv(fmul(r2, ay), oa2))];
    return {m, centre, r2, inverse};
}
const onSet = (p: Pt, a: Pt, b: Pt, m: number) => (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2 === m * ((p[0] - b[0]) ** 2 + (p[1] - b[1]) ** 2);

describe('CG3: the Apollonius scenes on the real graph', () => {
    for (const lang of LANGS) {
        test(`${lang}: every scene lands in the stated state and the readouts equal exact rational arithmetic (in order, out of order and twice)`, () => {
            const m = mountIn(lang);
            try {
                const ids = Object.keys(CG3);
                expect(circleApolloniusLesson.steps.map(step => step.id)).toEqual(ids);
                for (const id of [...ids, ...ids.slice().reverse(), ...ids]) {
                    const {p, k} = CG3[id];
                    m.scene(circleApolloniusLesson, id);
                    m.scene(circleApolloniusLesson, id);
                    const state = m.graph.state;
                    expect({id, a: [state.a.x, state.a.y], b: [state.b.x, state.b.y], p: [state.p.x, state.p.y], k: state.k, mode: state.mode})
                        .toEqual({id, a: A3, b: B3, p, k, mode: 'apollonius'});
                    const exact = apolloniusExact(A3, B3, frac(k));
                    const ratioSquared = (p[0] ** 2 + p[1] ** 2) / ((p[0] - 6) ** 2 + p[1] ** 2);
                    expect({id, ratio: readout('ratio')}).toEqual({id, ratio: String(Math.sqrt(ratioSquared))});
                    expect({id, on: readout('on-locus')}).toEqual({id, on: onSet(p, A3, B3, k * k) ? (lang === 'sl' ? 'da' : 'yes') : (lang === 'sl' ? 'ne' : 'no')});
                    if (k === 1) {
                        // The set is the line 2 (B - A) . X = |B|^2 - |A|^2: 12 x = 36.
                        expect({id, set: readout('locus')}).toEqual({id, set: axisText([12, 0, 36])});
                    } else {
                        expect({id, set: readout('locus')}).toEqual({id, set: lang === 'sl'
                            ? `središče ${pointIn(exact.centre[0], exact.centre[1], lang)}, kvadrat polmera ${ratIn(exact.r2, lang)}`
                            : `centre ${pointIn(exact.centre[0], exact.centre[1], lang)}, squared radius ${ratIn(exact.r2, lang)}`});
                        expect({id, inverse: readout('inverse')}).toEqual({id, inverse: pointIn(exact.inverse[0], exact.inverse[1], lang)});
                        // The division points (A + k B)/(1 + k) and (A - k B)/(1 - k).
                        const kf = frac(k);
                        const internal = pointIn(fdiv(fadd(frac(A3[0]), fmul(kf, frac(B3[0]))), fadd(frac(1), kf)), frac(0), lang);
                        const external = pointIn(fdiv(fsub(frac(A3[0]), fmul(kf, frac(B3[0]))), fsub(frac(1), kf)), frac(0), lang);
                        expect({id, internal: readout('internal')}).toEqual({id, internal});
                        expect({id, external: readout('external')}).toEqual({id, external});
                    }
                }
            } finally {
                m.mounted.view.unmount();
            }
        });
    }

    test('the quoted numbers are the exact ones: k = 2 gives centre (8, 0), squared radius 16, inverse of A at B, division points 4 and 12', () => {
        const exact = apolloniusExact(A3, B3, frac(2));
        expect({centre: exact.centre, r2: exact.r2, inverse: exact.inverse, m: exact.m}).toEqual({centre: [frac(8), frac(0)], r2: frac(16), inverse: [frac(6), frac(0)], m: frac(4)});
        // |OA| |OB| = rho^2: 8 * 2 = 16, with B the inverse of A on the same ray.
        expect(8 * 2).toBe(16);
        expect(fdiv(fadd(frac(0), fmul(frac(2), frac(6))), frac(3))).toEqual(frac(4)); // (A + 2 B)/3
        expect(fdiv(fsub(frac(0), fmul(frac(2), frac(6))), frac(-1))).toEqual(frac(12)); // (A - 2 B)/(1 - 2)
        // k = 1/2: centre (-2, 0), squared radius 16.
        const half = apolloniusExact(A3, B3, frac(1, 2));
        expect({centre: half.centre, r2: half.r2}).toEqual({centre: [frac(-2), frac(0)], r2: frac(16)});
        // The expansion of the worked example: 3 x^2 + 3 y^2 - 48 x + 144 = 0 divided by 3 is (x - 8)^2 + y^2 = 64 - 48 = 16.
        expect([3 * 16, 3 * 48, 3 * 144 / 3]).toEqual([48, 144, 144]);
        expect(64 - 48).toBe(16);
        // The general formulas of the text: centre m b / (m - 1), squared radius m b^2 / (m - 1)^2, |OA| |OB| = rho^2.
        for (const kk of [frac(1, 2), frac(3, 2), frac(2), frac(3), frac(4)]) {
            const e = apolloniusExact(A3, B3, kk);
            const mm = e.m;
            const mMinus1 = fsub(mm, frac(1));
            expect(e.centre[0]).toEqual(fdiv(fmul(mm, frac(6)), mMinus1));
            expect(e.r2).toEqual(fdiv(fmul(mm, frac(36)), fmul(mMinus1, mMinus1)));
            const oa = Math.abs(e.centre[0].n / e.centre[0].d);
            const ob = Math.abs(6 - e.centre[0].n / e.centre[0].d);
            expect(oa * ob).toBeCloseTo(e.r2.n / e.r2.d, 12);
        }
    });

    test('the points the text asks the learner to try: the on-set test |PA|^2 = m |PB|^2 (exact) and the readout agree, P at B is not defined', () => {
        for (const lang of LANGS) {
            const m = mountIn(lang);
            try {
                const row = (p: Pt, k: number, base: string) => {
                    m.scene(circleApolloniusLesson, base, {kind: 'circle', operation: 'set-apollonius', k}, {kind: 'circle', operation: 'set-apollonius', p: {x: p[0], y: p[1]}});
                    return {on: readout('on-locus'), ratio: readout('ratio')};
                };
                const yes = lang === 'sl' ? 'da' : 'yes';
                const no = lang === 'sl' ? 'ne' : 'no';
                // k = 2 (m = 4), the step 5 points.
                for (const [p, ratio, expectedOn] of [[[8, 4], '2', true], [[8, -4], '2', true], [[4, 0], '2', true], [[12, 0], '2', true], [[5, 0], '5', false]] as const) {
                    expect(onSet(p, A3, B3, 4)).toBe(expectedOn);
                    expect(row(p, 2, 'cg3-points')).toEqual({on: expectedOn ? yes : no, ratio});
                }
                // k = 1 (m = 1), the step 2 points.
                expect(onSet([5, 0], A3, B3, 1)).toBe(false);
                expect(row([5, 0], 1, 'cg3-ratio')).toEqual({on: no, ratio: '5'});
                expect(onSet([3, 3], A3, B3, 1)).toBe(true);
                expect(row([3, 3], 1, 'cg3-ratio')).toEqual({on: yes, ratio: '1'});
                // P = B: the squared distance to B is 0, so the ratio is not defined (the readout shows no number).
                const atB = row([6, 0], 1, 'cg3-ratio');
                expect(atB.ratio).not.toMatch(/\d/);
                expect(atB.on).toBe(no);
            } finally {
                m.mounted.view.unmount();
            }
        }
    });

    test('the settings the text asks the learner to make in step 7: k = 1/2 and A = B', () => {
        const m = mountIn('sl');
        try {
            m.scene(circleApolloniusLesson, 'cg3-explore', {kind: 'circle', operation: 'set-apollonius', k: 0.5});
            const half = apolloniusExact(A3, B3, frac(1, 2));
            expect(readout('locus')).toBe(`središče ${pointIn(half.centre[0], half.centre[1], 'sl')}, kvadrat polmera ${ratIn(half.r2, 'sl')}`);
            m.scene(circleApolloniusLesson, 'cg3-explore', {kind: 'circle', operation: 'set-apollonius', b: {x: 0, y: 0}});
            expect(readout('locus')).not.toMatch(/središče/);
            expect(document.body.textContent).toMatch(/ni določena/);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

// ---- CG4 -----------------------------------------------------------------------------------------------------------------------------

const CG4: Readonly<Record<string, readonly [Circle, Circle]>> = {
    'cg4-predict': [[0, 0, 5], [13, 0, 3]], 'cg4-count': [[0, 0, 5], [8, 0, 3]], 'cg4-external': [[0, 0, 3], [10, 0, 1]], 'cg4-internal': [[0, 0, 3], [10, 0, 1]],
    'cg4-equal': [[0, 0, 3], [10, 0, 3]], 'cg4-touching': [[0, 0, 3], [4, 0, 1]], 'cg4-explore': [[0, 0, 3], [10, 0, 1]],
};

/** The number of common tangents from the squared distance of the centres against (r1 +- r2)^2, with integers only; `Infinity` for coincident circles. */
function tangentCount(c1: Circle, c2: Circle) {
    const d2 = (c2[0] - c1[0]) ** 2 + (c2[1] - c1[1]) ** 2;
    const sum2 = (c1[2] + c2[2]) ** 2;
    const diff2 = (c1[2] - c2[2]) ** 2;
    if (d2 === 0 && diff2 === 0) return Infinity;
    return d2 > sum2 ? 4 : d2 === sum2 ? 3 : d2 > diff2 ? 2 : d2 === diff2 ? 1 : 0;
}
/** The external centre (r2 O1 - r1 O2)/(r2 - r1) (absent for equal radii) and the internal centre (r2 O1 + r1 O2)/(r1 + r2). */
function similarityCentres(c1: Circle, c2: Circle) {
    const at = (sign: 1 | -1, denominator: number): [Frac, Frac] | null => denominator === 0 ? null
        : [frac(c2[2] * c1[0] - sign * c1[2] * c2[0], denominator), frac(c2[2] * c1[1] - sign * c1[2] * c2[1], denominator)];
    return {external: at(1, c2[2] - c1[2]), internal: at(-1, c1[2] + c2[2])};
}

describe('CG4: the common-tangent scenes on the real graph', () => {
    for (const lang of LANGS) {
        test(`${lang}: every scene lands in the stated state; counts and the centres of similarity equal the exact arithmetic (in order, out of order and twice)`, () => {
            const m = mountIn(lang);
            try {
                const ids = Object.keys(CG4);
                expect(circleCommonTangentsLesson.steps.map(step => step.id)).toEqual(ids);
                for (const id of [...ids, ...ids.slice().reverse(), ...ids]) {
                    const [c1, c2] = CG4[id];
                    m.scene(circleCommonTangentsLesson, id);
                    m.scene(circleCommonTangentsLesson, id);
                    const state = m.graph.state;
                    expect({id, mode: state.mode, c1: [state.c1.x, state.c1.y, state.c1.r], c2: [state.c2.x, state.c2.y, state.c2.r]}).toEqual({id, mode: 'common', c1, c2});
                    expect({id, count: readout('count')}).toEqual({id, count: String(tangentCount(c1, c2))});
                    const centres = similarityCentres(c1, c2);
                    expect({id, internal: readout('internal-centre')}).toEqual({id, internal: pointIn(centres.internal![0], centres.internal![1], lang)});
                    if (centres.external) expect({id, external: readout('external-centre')}).toEqual({id, external: pointIn(centres.external[0], centres.external[1], lang)});
                    else expect({id, external: readout('external-centre')}).toEqual({id, external: lang === 'sl' ? 'ni' : 'none'});
                    expect({id, d2: readout('distance2')}).toEqual({id, d2: String((c2[0] - c1[0]) ** 2 + (c2[1] - c1[1]) ** 2)});
                }
            } finally {
                m.mounted.view.unmount();
            }
        });
    }

    test('the tangent counts the text quotes follow d against r1 + r2 and |r1 - r2| (exact), and the readout agrees for each distance of step 2 and the prediction step', () => {
        const m = mountIn('sl');
        try {
            // The counts by d for radii 5 and 3: 13 -> 4, 8 -> 3, 7 -> 2, 2 -> 1, 1 -> 0.
            for (const [d, count] of [[13, 4], [8, 3], [7, 2], [2, 1], [1, 0]] as const) {
                expect({d, count: tangentCount([0, 0, 5], [d, 0, 3])}).toEqual({d, count});
                m.scene(circleCommonTangentsLesson, 'cg4-predict', {kind: 'circle', operation: 'set-circle', circle: 'c2', x: d, y: 0, r: 3});
                expect({d, count: readout('count')}).toEqual({d, count: String(count)});
            }
            // The radii 3 and 1: d = 4 = r1 + r2 gives 3 tangents, internal centre 3 (the contact point), external 6; d = 2 = r1 - r2 gives 1, external centre 3.
            for (const [x, count, internal, external] of [[4, 3, 3, 6], [2, 1, null, 3]] as const) {
                const c2: Circle = [x, 0, 1];
                expect(tangentCount([0, 0, 3], c2)).toBe(count);
                const centres = similarityCentres([0, 0, 3], c2);
                if (internal !== null) expect(centres.internal![0]).toEqual(frac(internal));
                expect(centres.external![0]).toEqual(frac(external));
                m.scene(circleCommonTangentsLesson, 'cg4-touching', {kind: 'circle', operation: 'set-circle', circle: 'c2', x, y: 0, r: 1});
                expect(readout('count')).toBe(String(count));
                expect(readout('external-centre')).toBe(pointIn(centres.external![0], centres.external![1], 'sl'));
                if (internal !== null) expect(readout('internal-centre')).toBe(pointIn(centres.internal![0], centres.internal![1], 'sl'));
            }
            // The contact point of both touching cases is (3, 0): on the first circle (3^2 = 9) and on the second ((3 - 4)^2 = 1, (3 - 2)^2 = 1).
            expect([3 ** 2, (3 - 4) ** 2, (3 - 2) ** 2]).toEqual([9, 1, 1]);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the cases the text asks the learner to set: radius of the second circle 2 and 3 in step 5, concentric and coincident in step 7', () => {
        const m = mountIn('sl');
        try {
            m.scene(circleCommonTangentsLesson, 'cg4-equal', {kind: 'circle', operation: 'set-circle', circle: 'c2', x: 10, y: 0, r: 2});
            expect(similarityCentres([0, 0, 3], [10, 0, 2]).external).toEqual([frac(30), frac(0)]); // |XO1| : |XO2| = 3 : 2 and the difference is 10
            expect(readout('external-centre')).toBe('(30; 0)');
            m.scene(circleCommonTangentsLesson, 'cg4-equal');
            expect(similarityCentres([0, 0, 3], [10, 0, 3]).external).toBeNull();
            expect(readout('external-centre')).toBe('ni');
            expect(readout('internal-centre')).toBe('(5; 0)');
            m.scene(circleCommonTangentsLesson, 'cg4-explore',
                {kind: 'circle', operation: 'set-circle', circle: 'c1', x: 0, y: 0, r: 5}, {kind: 'circle', operation: 'set-circle', circle: 'c2', x: 0, y: 0, r: 3});
            expect(tangentCount([0, 0, 5], [0, 0, 3])).toBe(0);
            expect(readout('count')).toBe('0');
            m.scene(circleCommonTangentsLesson, 'cg4-explore',
                {kind: 'circle', operation: 'set-circle', circle: 'c1', x: 0, y: 0, r: 5}, {kind: 'circle', operation: 'set-circle', circle: 'c2', x: 0, y: 0, r: 5});
            expect(tangentCount([0, 0, 5], [0, 0, 5])).toBe(Infinity);
            expect(document.body.textContent).toMatch(/neskončno/);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quoted contact distances, angles and centres are the exact ones, and the prose carries them', () => {
        // Tangent segments from X = (15, 0): 15^2 - 3^2 = 216 and 5^2 - 1^2 = 24; sqrt(216) - sqrt(24) = 6 sqrt 6 - 2 sqrt 6 = 4 sqrt 6 = sqrt 96.
        expect([15 ** 2 - 3 ** 2, 5 ** 2 - 1 ** 2]).toEqual([216, 24]);
        expect([216, 24, 96]).toEqual([36 * 6, 4 * 6, 16 * 6]);
        expect(Math.sqrt(216) - Math.sqrt(24)).toBeCloseTo(Math.sqrt(96), 12);
        expect(Math.sqrt(96).toFixed(3)).toBe('9.798');
        // Internal: I = (15/2, 0), segments sqrt(7.5^2 - 9) = sqrt(47.25) and sqrt(2.5^2 - 1) = sqrt(5.25); the sum is 4 sqrt(5.25) = sqrt(84).
        expect([7.5 ** 2 - 9, 2.5 ** 2 - 1]).toEqual([47.25, 5.25]);
        expect(47.25).toBe(9 * 5.25);
        expect(Math.sqrt(47.25) + Math.sqrt(5.25)).toBeCloseTo(Math.sqrt(84), 12);
        expect(16 * 5.25).toBe(84);
        expect(Math.sqrt(84).toFixed(3)).toBe('9.165');
        // The centres of similarity of radii 3 and 1, centres 10 apart: |XO1| = 15 (3 : 1 outside) and |IO1| = 7.5 (3 : 1 inside, sum 10).
        const centres = similarityCentres([0, 0, 3], [10, 0, 1]);
        expect(centres.external).toEqual([frac(15), frac(0)]);
        expect(centres.internal).toEqual([frac(15, 2), frac(0)]);
        // The angles arcsin(r1 / |XO1|), arcsin(r1 / |IO1|) and, for equal radii, arcsin(3/5) at the midpoint (distance 5).
        const deg = (x: number) => ((Math.asin(x) * 180) / Math.PI).toFixed(2);
        expect([deg(3 / 15), deg(3 / 7.5), deg(3 / 5)]).toEqual(['11.54', '23.58', '36.87']);
        const sl = strings(circleCommonTangentsLesson, 'sl').map(([, value]) => value).join('\n');
        const en = strings(circleCommonTangentsLesson, 'en').map(([, value]) => value).join('\n');
        for (const [comma, point] of [['9{,}798', '9.798'], ['9{,}165', '9.165'], ['11{,}54', '11.54'], ['23{,}58', '23.58'], ['36{,}87', '36.87']]) {
            expect({comma, found: sl.includes(comma)}).toEqual({comma, found: true});
            expect({point, found: en.includes(point)}).toEqual({point, found: true});
        }
        // The text calls the rounded numbers approximate, never exact.
        for (const text of [sl, en]) expect(text).toMatch(/\\approx/);
    });
});

// ---- predictions come before their answers --------------------------------------------------------------------------------------------

/** Per step, the answer to its prediction: patterns that must not occur in the step's explanation, worked example or formulas (the observation holds the answer). */
const ANSWERS: readonly (readonly [lesson: GuidedLesson, stepId: string, patterns: readonly RegExp[]])[] = [
    [circleApolloniusLesson, 'cg3-predict', [/12x=36/, /x=3\b/, /simetral|bisector|premica|\bline\b/i]],
    [circleApolloniusLesson, 'cg3-division', [/\(4,0\)/, /\(12,0\)/, /\|(?:NB|IB)\|=2/, /\|(?:ZB|EB)\|=6/, /=12\b/]],
    [circleApolloniusLesson, 'cg3-inverse', [/\(6,0\)/, /\|OA\|=8/, /\|OB\|=2/, /=16\b/]],
    [circleCommonTangentsLesson, 'cg4-predict', [/štiri|\btri\b|nobene/, /\b(?:four|three|none)\b/]],
    [circleCommonTangentsLesson, 'cg4-equal', [/\b30\b/, /vzporedn|parallel/, /ni zunanjega|zunanjega središča raztega ni|no external/, /\(5,0\)/, /y=3|y=-3/]],
    [circleCommonTangentsLesson, 'cg4-touching', [/\(3,0\)/, /dotikališče|point of contact/, /\bthree\b/]],
];

describe('predictions: no answer in the explanation, worked example or formulas of the step that asks', () => {
    test.each(ANSWERS)('step %#', (lesson, stepId, patterns) => {
        const step = lesson.steps.find(s => s.id === stepId)!;
        expect(step.expectedObservations.length).toBeGreaterThan(0);
        for (const lang of LANGS) {
            const raw = [
                step.explanation[lang],
                ...(step.workedExampleId ? lesson.workedExamples.filter(e => e.id === step.workedExampleId).flatMap(e => [e.check[lang], e.calculationLatex, e.resultLatex]) : []),
                ...step.formulaIds.flatMap(id => lesson.formulaBlocks.filter(f => f.id === id).flatMap(f => [f.latex, f.explanation[lang]])),
            ];
            // Each pattern is tried on the text as written and on the text without whitespace (the formula patterns are written without it).
            for (const source of [...raw, ...raw.map(cleanText)]) for (const pattern of patterns) {
                expect({stepId, lang, pattern: String(pattern), found: pattern.test(source)}).toEqual({stepId, lang, pattern: String(pattern), found: false});
            }
        }
    });

    test('CG3: the summary states no answer of a prediction', () => {
        for (const lang of LANGS) expect(circleApolloniusLesson.summary[lang]).not.toMatch(/simetral|bisector|krožnic|circle|premic|\bline\b/i);
        expect(circleApolloniusLesson.steps[0].explanation.sl).toMatch(/napovej/);
        expect(circleApolloniusLesson.steps[0].explanation.en).toMatch(/predict/);
    });

    test('CG4: the summary states no answer of a prediction', () => {
        for (const lang of LANGS) expect(circleCommonTangentsLesson.summary[lang]).not.toMatch(/\b(?:štiri|tri|ena|nobene)\b|\b(?:four|three|none)\b|\d/i);
        expect(circleCommonTangentsLesson.steps[0].explanation.sl).toMatch(/napovej/);
        expect(circleCommonTangentsLesson.steps[0].explanation.en).toMatch(/predict/);
    });

    test('CG4 step 1 asks for the two touching cases separately, CG3 step 1 asks for the side', () => {
        const cg4 = circleCommonTangentsLesson.steps[0].explanation;
        expect(cg4.sl).toMatch(/od zunaj/);
        expect(cg4.sl).toMatch(/od znotraj/);
        expect(cg4.en).toMatch(/touch externally/);
        expect(cg4.en).toMatch(/touch internally/);
        const cg3 = circleApolloniusLesson.steps[0].explanation;
        expect(cg3.sl).toMatch(/strani točk/);
        expect(cg3.en).toMatch(/which side/);
    });

    test('CG3 step 2 says the on-set test is exact and the readout ratio is rounded when it is not an integer', () => {
        const step = circleApolloniusLesson.steps[1].explanation;
        expect(step.sl).toMatch(/natančno/);
        expect(step.sl).toMatch(/zaokroženo/);
        expect(step.en).toMatch(/exact/);
        expect(step.en).toMatch(/rounded/);
    });
});
