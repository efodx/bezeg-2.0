/**
 * CG1 and CG2 (circle-construction): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a
 * restored checkpoint, out of order and twice), every number a scene text quotes is bound to its step against the real readout, and the powers,
 * tangent lengths, contact points, radical axes and the radical centre are recomputed here with exact integer and rational arithmetic (not the
 * circle kernel). Numbers the text asks the learner to produce are checked by applying that change as an action and reading the readout.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {circleRadicalLesson, circleTangentsLesson} from './circleGeometryGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
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
    return d < 0 ? {n: -n / g, d: -d / g} : {n: n / g, d: d / g};
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
