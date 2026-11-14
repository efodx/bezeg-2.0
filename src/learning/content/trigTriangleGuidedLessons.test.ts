/**
 * TR3 and TR4 (trigonometry, batch B): every scene lands in the state and readouts the text states (the real triangle-solver graph, scenes applied in one synchronous `act` from a
 * restored checkpoint, out of order and twice, in sl and en). The mathematics is recomputed here from the vertices alone, without `src/trig` (side squares, dot products, angles by
 * atan2, the circumcentre by the determinant formula, exact fractions by integer arithmetic). The numbers each step quotes, the vertices it prompts, the worked examples and the
 * chapter prose are checked against those values in sl (decimal comma) and en (decimal point); no step shows the answer to its prediction before the observation; the lesson sources
 * are scanned for single-backslash math delimiters.
 */
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {cosineRuleLesson, sineRuleLesson} from './trigTriangleGuidedLessons';
import {trigonometryChapter} from './trigonometryChapter';
import {familyChapters} from './familyChapters';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, LocalizedText} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {TriangleSolverGraph} from '../../graphs/trig/TriangleSolverGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- the independent mathematics --------------------------------------------------------------------------------------------------------

type P = readonly [number, number];
interface Tri { readonly A: P; readonly B: P; readonly C: P }
type Mode = 'sides' | 'circle';
const tri = (A: P, B: P, C: P): Tri => ({A, B, C});

const sq = (p: P, q: P) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
const dotOf = (o: P, p: P, q: P) => (p[0] - o[0]) * (q[0] - o[0]) + (p[1] - o[1]) * (q[1] - o[1]);
const crossOf = (o: P, p: P, q: P) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
const angleAt = (o: P, p: P, q: P) => Math.atan2(Math.abs(crossOf(o, p, q)), dotOf(o, p, q)) * 180 / Math.PI;
const gcd = (a: number, b: number): number => b === 0 ? Math.abs(a) : gcd(b, a % b);
interface Frac { readonly n: number; readonly d: number }
const frac = (n: number, d: number): Frac => { const g = gcd(n, d) || 1; const s = d < 0 ? -1 : 1; return {n: s * n / g, d: s * d / g}; };

function measures(t: Tri) {
    const {A, B, C} = t;
    const a2 = sq(B, C), b2 = sq(C, A), c2 = sq(A, B);
    const dotC = dotOf(C, A, B);
    const cross = crossOf(A, B, C);
    const angleA = angleAt(A, B, C), angleB = angleAt(B, C, A), angleC = angleAt(C, A, B);
    const twoR = Math.sqrt(a2) / Math.sin(angleA * Math.PI / 180);
    // circumcentre by the determinant formula, exactly, with integer vertices
    const D = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
    const ux = ((A[0] ** 2 + A[1] ** 2) * (B[1] - C[1]) + (B[0] ** 2 + B[1] ** 2) * (C[1] - A[1]) + (C[0] ** 2 + C[1] ** 2) * (A[1] - B[1]));
    const uy = ((A[0] ** 2 + A[1] ** 2) * (C[0] - B[0]) + (B[0] ** 2 + B[1] ** 2) * (A[0] - C[0]) + (C[0] ** 2 + C[1] ** 2) * (B[0] - A[0]));
    const O = [frac(ux, D), frac(uy, D)] as const;
    const antipode = [frac(2 * ux - B[0] * D, D), frac(2 * uy - B[1] * D, D)] as const;
    const r2 = frac(a2 * b2 * c2, 4 * cross * cross);
    const ap: P = [antipode[0].n / antipode[0].d, antipode[1].n / antipode[1].d];
    const thales = dotOf(C, B, ap);
    const apexDegenerate = sq(ap, C) < 1e-12;
    const apexAngle = apexDegenerate ? NaN : angleAt(ap, B, C);
    return {a2, b2, c2, a: Math.sqrt(a2), b: Math.sqrt(b2), c: Math.sqrt(c2), dotC, correction: 2 * dotC, angleA, angleB, angleC, twoR, cross, O, antipode, r2, thales, apexAngle, apexDegenerate,
        sinA: Math.sin(angleA * Math.PI / 180), cosC: dotC / Math.sqrt(a2 * b2)};
}
const val = (f: Frac) => f.n / f.d;

// ---- formats ------------------------------------------------------------------------------------------------------------------------------

type Language = 'sl' | 'en';
const q = (value: number, digits: number, language: Language) => { const s = String(Number(value.toFixed(digits))); return language === 'sl' ? s.replace('.', ',') : s; };
const prose = (text: string) => text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,/])${escapeRegExp(value)}(?![0-9]|[.,/][0-9])`).test(prose(text));
const hasQuote = (text: string, value: number, digits: number, language: Language) =>
    hasNumber(text, q(value, digits, language)) || hasNumber(text, language === 'sl' ? value.toFixed(digits).replace('.', ',') : value.toFixed(digits));
/** The TeX of an exact fraction as the lessons write it: \tfrac{n}{d}, or \tfrac nd for single digits, or the integer. */
const fracForms = (f: Frac): string[] => f.d === 1 ? [String(f.n)] : [`\\tfrac{${f.n}}{${f.d}}`, `\\tfrac${f.n}${f.d}`];
const hasFrac = (text: string, f: Frac) => fracForms(f).some(form => text.includes(form));
const hasPoint = (text: string, x: Frac, y: Frac) => fracForms(x).some(fx => fracForms(y).some(fy => text.includes(`(${fx},${fy})`)));
const pt = (p: P) => `(${p[0]},${p[1]})`;
const hasVertex = (text: string, p: P) => prose(text).includes(`=${pt(p)}`) || prose(text).includes(pt(p));

// ---- the lessons and their scenes ---------------------------------------------------------------------------------------------------------

const lessons: readonly GuidedLesson[] = [sineRuleLesson, cosineRuleLesson];
const allSteps = () => lessons.flatMap(lesson => lesson.steps);
const stepOf = (id: string) => allSteps().find(step => step.id === id)!;

const T0 = tri([0, 0], [7, 0], [2, 4]);
const TR3_SCENES: Record<string, {mode: Mode; t: Tri}> = {
    'tr3-ratios': {mode: 'sides', t: T0},
    'tr3-drag': {mode: 'sides', t: tri([0, 0], [7, 0], [6, 5])},
    'tr3-circle': {mode: 'circle', t: T0},
    'tr3-argument': {mode: 'circle', t: T0},
    'tr3-obtuse': {mode: 'circle', t: tri([0, 0], [7, 0], [-2, 2])},
    'tr3-explore': {mode: 'circle', t: T0},
};
const TR4_SCENES: Record<string, {mode: Mode; t: Tri}> = {
    'tr4-squares': {mode: 'sides', t: T0},
    'tr4-right': {mode: 'sides', t: tri([4, 0], [0, 3], [0, 0])},
    'tr4-dot': {mode: 'sides', t: T0},
    'tr4-integers': {mode: 'sides', t: tri([0, 0], [6, 2], [1, 4])},
    'tr4-formula': {mode: 'sides', t: T0},
    'tr4-numeric': {mode: 'sides', t: tri([6, 0], [0, 0], [2, 3])},
    'tr4-explore': {mode: 'sides', t: tri([0, 0], [4, 0], [1, 2])},
};
const SCENES: Record<string, {mode: Mode; t: Tri}> = {...TR3_SCENES, ...TR4_SCENES};
const stepIds = Object.keys(SCENES);

/** The placements the text prompts besides the scenes (all vertices on the control grid). */
const PROMPTED: Record<string, readonly {mode: Mode; t: Tri}[]> = {
    'tr3-drag': [{mode: 'sides', t: tri([0, 0], [7, 0], [6, 5])}],
    'tr3-explore': [{mode: 'circle', t: tri([0, 0], [4, 0], [0, 3])}],
    'tr4-right': [{mode: 'sides', t: tri([4, 0], [0, 3], [1, 1])}, {mode: 'sides', t: tri([4, 0], [0, 3], [-1, -1])}],
    'tr4-explore': [{mode: 'sides', t: tri([0, 0], [4, 0], [2, 2])}, {mode: 'sides', t: tri([0, 0], [4, 0], [2, -2])}, {mode: 'sides', t: tri([0, 0], [4, 0], [1, 2])}],
};
const allPrompted = Object.entries(PROMPTED).flatMap(([id, placements]) => placements.map(placement => ({id, ...placement})));
const GRID = {xMin: -2, xMax: 8, yMin: -7, yMax: 11};
const onGrid = (p: P) => Number.isInteger(p[0]) && Number.isInteger(p[1]) && p[0] >= GRID.xMin && p[0] <= GRID.xMax && p[1] >= GRID.yMin && p[1] <= GRID.yMax;

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const readoutText = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
/** The numbers of a readout (fractions evaluated, the typographic minus read as a minus, a decimal comma as a point). */
const numbersOf = (text: string | null, language: Language): number[] => {
    const normal = (text ?? '').replace(/−/g, '-').replace(language === 'sl' ? /(\d),(\d)/g : /$^/g, '$1.$2');
    return [...normal.matchAll(/-?\d+(?:\.\d+)?(?:\/\d+)?/g)].map(match => match[0].includes('/') ? Number(match[0].split('/')[0]) / Number(match[0].split('/')[1]) : Number(match[0]));
};

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
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
const setUp = (mode: Mode, t: Tri): LessonAction[] => [
    {kind: 'triangle', operation: 'set-mode', mode},
    {kind: 'triangle', operation: 'set-vertex', vertex: 'A', x: t.A[0], y: t.A[1]},
    {kind: 'triangle', operation: 'set-vertex', vertex: 'B', x: t.B[0], y: t.B[1]},
    {kind: 'triangle', operation: 'set-vertex', vertex: 'C', x: t.C[0], y: t.C[1]},
];

/** The readouts of the current graph state against the recomputation from the vertices. */
function checkReadouts(id: string, mode: Mode, t: Tri, language: Language) {
    const m = measures(t);
    const close = (what: string, actual: number, expected: number, tolerance: number) => expect({id, what, ok: Math.abs(actual - expected) <= tolerance, actual, expected}).toEqual({id, what, ok: true, actual, expected});
    const last = (readout: string) => { const found = numbersOf(readoutText(readout), language); return found[found.length - 1]; };
    for (const [key, side2, side] of [['a', m.a2, m.a], ['b', m.b2, m.b], ['c', m.c2, m.c]] as const) {
        close(`side-${key}`, last(`side-${key}`), side, 6e-6);
        if ((readoutText(`side-${key}`) ?? '').includes('√')) close(`side-${key} square`, numbersOf(readoutText(`side-${key}`), language)[0], side2, 0);
    }
    for (const [key, angle] of [['A', m.angleA], ['B', m.angleB], ['C', m.angleC]] as const) close(`angle-${key}`, last(`angle-${key}`), angle, 6e-5);
    for (const key of ['a', 'b', 'c']) close(`ratio-${key}`, last(`ratio-${key}`), m.twoR, 6e-6);
    if (mode === 'sides') {
        close('dot', last('dot'), m.dotC, 0);
        close('correction', last('correction'), m.correction, 0);
        const identity = numbersOf(readoutText('identity'), language);
        expect({id, identity}).toEqual({id, identity: [m.c2, m.a2, m.b2, m.correction]});
    } else {
        close('two-r', last('two-r'), m.twoR, 6e-6);
        close('r-squared', last('r-squared'), val(m.r2), 1e-12);
        expect({id, centre: numbersOf(readoutText('centre'), language)}).toEqual({id, centre: [val(m.O[0]), val(m.O[1])]});
        expect({id, antipode: numbersOf(readoutText('antipode'), language)}).toEqual({id, antipode: [val(m.antipode[0]), val(m.antipode[1])]});
        close('thales', last('thales'), 0, 0);
        expect({id, thales: m.thales}).toEqual({id, thales: 0});
        if (!m.apexDegenerate) close('apex-angle', last('apex-angle'), m.apexAngle, 6e-5);
    }
}

for (const language of ['sl', 'en'] as const) {
    test(`${language}: every scene lands in the state and readouts the independent recomputation gives, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
        setLanguage(language);
        const m = mountTriangle();
        try {
            for (const id of [...stepIds, ...stepIds.slice().reverse()]) {
                m.scene(id, 2);
                const {mode, t} = SCENES[id];
                const {A, B, C} = m.graph.state;
                expect({id, state: {mode: m.graph.state.mode, A: [A.x, A.y], B: [B.x, B.y], C: [C.x, C.y]}}).toEqual({id, state: {mode, A: [...t.A], B: [...t.B], C: [...t.C]}});
                checkReadouts(id, mode, t, language);
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    });

    test(`${language}: the prompted placements are on the control grid, and the graph readouts equal the recomputation there`, () => {
        setLanguage(language);
        const m = mountTriangle();
        try {
            for (const {id, mode, t} of allPrompted) {
                expect({id, grid: [t.A, t.B, t.C].map(onGrid)}).toEqual({id, grid: [true, true, true]});
                m.learner(...setUp(mode, t));
                checkReadouts(id, mode, t, language);
            }
            // three vertices on a line: no triangle, no quotients, no correction
            m.learner(...setUp('circle', tri([0, 0], [2, 2], [4, 4])));
            expect(document.querySelector('[data-readout="ratio-a"]')).toBeNull();
            expect(document.querySelector('[data-readout="correction"]')).toBeNull();
            expect((document.querySelector('[data-triangle-status]')?.textContent ?? '').length).toBeGreaterThan(10);
            m.learner(...setUp('sides', tri([0, 0], [2, 2], [4, 4])));
            expect(document.querySelector('[data-readout="correction"]')).toBeNull();
            m.restore();
        } finally {
            m.mounted.view.unmount();
        }
    });
}

test('every vertex a scene sets or the text prompts is on the control grid (integers, x from -2 to 8, y from -7 to 11)', () => {
    for (const {t} of Object.values(SCENES)) for (const p of [t.A, t.B, t.C]) expect(onGrid(p)).toBe(true);
    for (const step of allSteps()) {
        const actions = sceneActions(step.scene!);
        const written = actions.filter((action): action is Extract<LessonAction, {kind: 'triangle'; operation: 'set-vertex'}> => action.kind === 'triangle' && action.operation === 'set-vertex');
        expect({id: step.id, vertices: written.map(action => action.vertex)}).toEqual({id: step.id, vertices: ['A', 'B', 'C']});
        for (const action of written) expect({id: step.id, ok: onGrid([action.x, action.y])}).toEqual({id: step.id, ok: true});
        const sceneSpec = SCENES[step.id];
        const state = Object.fromEntries(written.map(action => [action.vertex, [action.x, action.y]]));
        expect({id: step.id, state}).toEqual({id: step.id, state: {A: [...sceneSpec.t.A], B: [...sceneSpec.t.B], C: [...sceneSpec.t.C]}});
    }
});

test('tr4-explore: on the grid with A = (0,0), B = (4,0) exactly C = (2,2) and C = (2,-2) give a right angle at C', () => {
    const right: P[] = [];
    for (let x = GRID.xMin; x <= GRID.xMax; x += 1) for (let y = GRID.yMin; y <= GRID.yMax; y += 1) {
        if (crossOf([x, y], [0, 0], [4, 0]) !== 0 && dotOf([x, y], [0, 0], [4, 0]) === 0) right.push([x, y]);
    }
    expect(right).toEqual([[2, -2], [2, 2]]);
});

// ---- the text ---------------------------------------------------------------------------------------------------------------------------------

describe('the numbers each step quotes are those of its scene and prompts, in sl and en', () => {
    const lessonOf = (id: string) => id.startsWith('tr3') ? sineRuleLesson : cosineRuleLesson;
    const stepTexts = (id: string, language: Language) => {
        const lesson = lessonOf(id);
        const step = stepOf(id);
        const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
        return {
            scene: step.scene!.expectedState[language],
            all: [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language],
                ...examples.map(example => example.check?.[language] ?? '')].join(' '),
        };
    };
    const M = (id: string) => measures(SCENES[id].t);
    const placed = (A: P, B: P, C: P) => measures(tri(A, B, C));
    const T1 = placed([0, 0], [7, 0], [6, 5]), T2 = placed([0, 0], [7, 0], [-2, 2]), T3 = placed([0, 0], [4, 0], [0, 3]);
    const T5 = placed([4, 0], [0, 3], [1, 1]), T6 = placed([4, 0], [0, 3], [-1, -1]), T4 = M('tr4-right'), T7 = M('tr4-integers'), T8 = M('tr4-numeric');
    const T0m = measures(T0);
    /** The numbers each step must quote, from the recomputation: [value, decimals]. */
    const quotes = (id: string): readonly (readonly [number, number])[] => {
        switch (id) {
            case 'tr3-ratios': return [[T0m.a, 5], [T0m.b, 5], [T0m.c, 0], [T0m.angleA, 4], [T0m.angleB, 4], [T0m.angleC, 4], [T0m.twoR, 5]];
            case 'tr3-drag': return [[T1.twoR, 5], [T0m.twoR, 5]];
            case 'tr3-circle': return [[T0m.twoR, 5], [T0m.apexAngle, 4]];
            case 'tr3-argument': return [[T0m.a, 5], [T0m.twoR, 5]];
            case 'tr3-obtuse': return [[T2.angleA, 0], [T2.apexAngle, 0], [T2.angleA + T2.apexAngle, 0], [T2.twoR, 4]];
            case 'tr3-explore': return [[T3.twoR, 0]];
            case 'tr4-squares': return [[T0m.c2, 0], [T0m.a2 + T0m.b2, 0], [T0m.correction, 0], [T0m.a2, 0], [T0m.b2, 0]];
            case 'tr4-right': return [[T4.c2, 0], [T4.a2, 0], [T4.b2, 0], [T4.correction, 0], [T5.correction, 0], [T5.a2, 0], [T5.b2, 0], [T5.angleC, 0], [T6.correction, 0], [T6.a2, 0], [T6.b2, 0], [T6.angleC, 4]];
            case 'tr4-dot': return [[T0m.dotC, 0], [T0m.correction, 0]];
            case 'tr4-integers': return [[T7.c2, 0], [T7.a2, 0], [T7.b2, 0], [T7.dotC, 0], [T7.correction, 0], [T7.a, 5], [T7.c, 5]];
            case 'tr4-formula': return [[T0m.c2, 0], [T0m.a2, 0], [T0m.b2, 0], [T0m.correction, 0], [T0m.c, 0]];
            case 'tr4-numeric': return [[T8.a, 5], [T8.b, 0], [T8.angleC, 4], [T8.c, 0], [T8.correction, 0], [T8.c2, 0], [T8.a2, 0], [T8.b2, 0], [T8.dotC, 0]];
            case 'tr4-explore': return [[placed([0, 0], [4, 0], [1, 2]).correction, 0], [placed([0, 0], [4, 0], [2, 2]).correction, 0], [placed([0, 0], [4, 0], [2, 2]).c2, 0], [placed([0, 0], [4, 0], [2, 2]).a2, 0]];
            default: throw new Error(`no quotes for ${id}`);
        }
    };
    for (const language of ['sl', 'en'] as const) {
        test(`${language}: the numbers of each step, recomputed, appear in its text; the exact fractions, the points and the prompted vertices appear as written`, () => {
            for (const id of stepIds) {
                const {all} = stepTexts(id, language);
                for (const [value, digits] of quotes(id)) expect({id, quote: q(value, digits, language), found: hasQuote(all, value, digits, language)}).toEqual({id, quote: q(value, digits, language), found: true});
                // the vertices of the scene and of each prompted placement appear as coordinates in the step
                const placements = [SCENES[id].t, ...(PROMPTED[id] ?? []).map(placement => placement.t)];
                const examples = (lessonOf(id).workedExamples ?? []).filter(example => example.id === stepOf(id).workedExampleId).map(example => example.check?.[language] ?? '').join(' ');
                const inStep = `${all} ${examples}`;
                for (const placement of placements) for (const p of [placement.A, placement.B, placement.C]) {
                    // a vertex is named in the scene line or in the prompt/explanation, or its coordinates are the ones of a placement the text reaches by moving C alone
                    expect({id, p, named: hasVertex(inStep, p) || /^tr4-(right|explore)$|^tr3-(drag|explore)$/.test(id)}).toEqual({id, p, named: true});
                }
                for (const placement of PROMPTED[id] ?? []) {
                    const {C} = placement.t;
                    expect({id, C, named: hasVertex(inStep, C)}).toEqual({id, C, named: true});
                }
            }
            const circle = measures(T0);
            expect(hasFrac(stepTexts('tr3-circle', language).all, circle.r2)).toBe(true);
            expect(hasPoint(stepTexts('tr3-circle', language).all, circle.O[0], circle.O[1])).toBe(true);
            expect(hasPoint(stepTexts('tr3-circle', language).all, circle.antipode[0], circle.antipode[1])).toBe(true);
            expect(hasFrac(stepTexts('tr3-obtuse', language).all, measures(SCENES['tr3-obtuse'].t).r2)).toBe(true);
            expect(measures(SCENES['tr3-obtuse'].t).r2).toEqual({n: 85, d: 2});
            expect(circle.r2).toEqual({n: 205, d: 16});
            expect(circle.thales).toBe(0);
            // the scene line of each step quotes the scene's own vertices
            for (const id of stepIds) for (const p of [SCENES[id].t.A, SCENES[id].t.B, SCENES[id].t.C]) expect({id, p, found: hasVertex(stepTexts(id, language).scene, p)}).toEqual({id, p, found: true});
        });
    }

    test('every decimal number a step quotes is one of the recomputed values of the triangles of that lesson (to its own number of digits), in sl and en', () => {
        const triangles = [...Object.values(SCENES).map(spec => spec.t), ...allPrompted.map(placement => placement.t)];
        const known = triangles.flatMap(t => {
            const m = measures(t);
            return [m.a, m.b, m.c, m.angleA, m.angleB, m.angleC, m.twoR, m.sinA, m.cosC, m.apexAngle, m.a * 0 + m.twoR * m.sinA, val(m.r2)].filter(Number.isFinite);
        });
        const sl = (text: string) => prose(text).replace(/(\d),(\d)/g, '$1.$2');
        for (const step of allSteps()) for (const language of ['sl', 'en'] as const) {
            const texts = [step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations, step.purpose, step.title].map(text => text[language]);
            for (const text of texts) for (const match of (language === 'sl' ? sl(text) : prose(text)).matchAll(/(?<![0-9.\/])\d+\.\d{3,}/g)) {
                const digits = match[0].split('.')[1].length;
                const found = known.some(value => Math.abs(Number(match[0]) - Number(value.toFixed(digits))) < 1e-9);
                expect({id: step.id, language, number: match[0], found}).toEqual({id: step.id, language, number: match[0], found: true});
            }
        }
    });

    test('the sl and en texts of every lesson field quote the same numbers (decimal comma and point read alike)', () => {
        const numbers = (text: string) => prose(text).replace(/(\d),(\d)/g, '$1.$2').match(/\d+(?:\.\d+)?/g) ?? [];
        const pairs: {where: string; text: LocalizedText}[] = [];
        for (const lesson of lessons) {
            pairs.push({where: `${lesson.title.en} summary`, text: lesson.summary}, ...lesson.prerequisites.map((text, i) => ({where: `prerequisite ${i}`, text})), ...lesson.learningGoals.map((text, i) => ({where: `goal ${i}`, text})),
                ...lesson.edgeCases.map((text, i) => ({where: `edge ${i}`, text})));
            for (const block of lesson.formulaBlocks ?? []) pairs.push({where: `${block.id} notation`, text: block.notation}, {where: `${block.id} explanation`, text: block.explanation});
            for (const example of lesson.workedExamples ?? []) pairs.push({where: `${example.id} title`, text: example.title}, {where: `${example.id} check`, text: example.check!});
            for (const step of lesson.steps) {
                pairs.push({where: `${step.id} title`, text: step.title}, {where: `${step.id} purpose`, text: step.purpose}, {where: `${step.id} explanation`, text: step.explanation}, {where: `${step.id} prompt`, text: step.observationPrompt},
                    {where: `${step.id} scene`, text: step.scene!.expectedState}, ...step.expectedObservations.map((text, i) => ({where: `${step.id} observation ${i}`, text})));
            }
        }
        for (const section of trigonometryChapter.sections.filter(candidate => ['sine-rule', 'cosine-rule'].includes(candidate.id))) {
            pairs.push({where: `${section.id} title`, text: section.title}, ...section.paragraphs.map((text, i) => ({where: `${section.id} paragraph ${i}`, text})), ...Object.values(section.investigationPrompts ?? {}).map(text => ({where: `${section.id} prompt`, text})));
        }
        for (const {where, text} of pairs) expect({where, numbers: numbers(text.sl)}).toEqual({where, numbers: numbers(text.en)});
        expect(pairs.length).toBeGreaterThan(100);
    });

    test('no step reveals the answer to its prediction before the learner can make it (explanation, prompt, worked example); the answers are in the observations', () => {
        const dm = (value: number, digits: number, language: Language) => q(value, digits, language);
        // what the learner reads before the observation: the explanation, the prompt and, on argument steps only, the worked example (the argument steps derive and do not predict)
        for (const step of allSteps()) {
            if (!['tr3-argument', 'tr4-formula'].includes(step.id)) expect({id: step.id, example: step.workedExampleId}).toEqual({id: step.id, example: undefined});
        }
        const t = (id: string) => measures(SCENES[id].t);
        const answers: Record<string, (language: Language) => (string | RegExp)[]> = {
            'tr3-ratios': language => [dm(t('tr3-ratios').twoR, 5, language), dm(t('tr3-ratios').twoR, 3, language), /equal|enaka|enaki/i],
            'tr3-drag': language => [dm(measures(SCENES['tr3-drag'].t).twoR, 5, language), /still equal|še vedno/i],
            'tr3-circle': language => [dm(t('tr3-circle').apexAngle, 4, language), /205/, /Thales|Talesov/i, /right angle|pravi/i, /equal to the angle|enak kotu/i, /diameter of the circumcircle is|Premer očrtane krožnice je/],
            'tr3-obtuse': language => [dm(t('tr3-obtuse').twoR, 4, language), '45', /other arc|drugem loku|cyclic|tetivn|supplementary|dopolnjuj/i, /\\tfrac\{85\}\{2\}|\\tfrac852/],
            'tr3-explore': _language => [/2R=5/, /diameter of the circumcircle|premer očrtane krožnice/i],
            'tr4-squares': language => [dm(T0m.c2, 0, language), dm(T0m.a2 + T0m.b2, 0, language), dm(T0m.correction, 0, language), /negative|negativ|< ?0|manjš|shorter|krajš|smaller/i],
            'tr4-right': language => ['135', dm(T6.angleC, 4, language), '18', '-10', /obtuse|top\b|topi/i],
            'tr4-dot': _language => ['6', '12', /twice|double|dvakrat/i],
            'tr4-integers': _language => ['40', '29', '17', /exact|natančn/i],
            'tr4-numeric': _language => [/c=6/, '36', /exactly|natančno|integer|celo/i],
            'tr4-explore': _language => [/\(2,2\)/, /\(2,-2\)/],
        };
        for (const language of ['sl', 'en'] as const) {
            for (const [id, list] of Object.entries(answers)) {
                const step = stepOf(id);
                const before = prose([step.explanation[language], step.observationPrompt[language]].join(' ')).replace(/\s+/g, ' ');
                for (const answer of list(language)) {
                    // generic words that the question itself must use are not answers: the integers and numeric steps ask "whether" in the explanation, so only the numbers are checked there
                    if (typeof answer !== 'string' && ['tr4-integers', 'tr4-numeric', 'tr3-ratios', 'tr3-drag'].includes(id)) continue;
                    const revealed = typeof answer === 'string' ? hasNumber(before, answer) : answer.test(before);
                    expect({id, language, answer: String(answer), revealed}).toEqual({id, language, answer: String(answer), revealed: false});
                }
            }
            // sanity of the check itself: the answer of the numeric step is in its observation
            expect(prose(stepOf('tr4-numeric').expectedObservations[0][language])).toMatch(/c=6/);
            expect(prose(stepOf('tr3-obtuse').expectedObservations[0][language])).toContain('45');
        }
    });

    test('learner-facing text: no internal lesson ids, the term oglišče (not vogal), irrational values carry the approximate sign, no empty guidance', () => {
        const everything = JSON.stringify([...lessons, trigonometryChapter]);
        expect(everything).not.toMatch(/\bTR[0-9]\b/);
        expect(everything).not.toMatch(/vogal/i);
        for (const step of allSteps()) {
            for (const language of ['sl', 'en'] as const) {
                expect({id: step.id, language, ok: step.title[language].length > 3 && step.observationPrompt[language].length > 20 && step.expectedObservations.length > 0}).toEqual({id: step.id, language, ok: true});
                // every irrational decimal (4 or 5 decimals) is introduced by \approx in the sentence that quotes it, the exact square-root form, or is a rounded angle
                const texts = [step.explanation, step.scene!.expectedState, ...step.expectedObservations].map(text => text[language]);
                for (const text of texts) for (const sentence of text.split(/(?<=[.;:])\s+(?=[A-ZČŠŽ])/)) {
                    for (const match of sentence.matchAll(/\d+(?:\{,\}|\.)\d{4,5}(?![0-9])/g)) {
                        const start = sentence.indexOf(match[0]);
                        expect({id: step.id, number: match[0], approx: /\\approx|≈/.test(sentence.slice(Math.max(0, start - 40), start))}).toEqual({id: step.id, number: match[0], approx: true});
                    }
                }
            }
        }
        // the inscribed-angle lesson is named by its real title in both languages
        const inscribed = familyChapters.find(chapter => chapter.id === 'triangle-geometry')!.sections.find(section => section.id === 'inscribed-angle')!;
        expect(inscribed.title.en).toBe('The inscribed angle and Thales\' theorem');
        for (const language of ['sl', 'en'] as const) {
            expect(sineRuleLesson.prerequisites[1][language]).toContain(inscribed.title[language]);
            expect(sineRuleLesson.steps.find(step => step.id === 'tr3-argument')!.explanation[language]).toContain(inscribed.title[language]);
        }
    });

    test('the lesson and chapter sources have no single-backslash math delimiter anywhere (titles, summaries, edge cases, prerequisites included)', () => {
        const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
        for (const file of ['src/learning/content/trigTriangleGuidedLessons.ts', 'src/learning/content/trigonometryChapter.ts']) {
            const lines = readFileSync(resolve(repoRoot, file), 'utf8').split('\n').filter(line => !line.includes('String.raw'));
            for (const [index, line] of lines.entries()) expect({file, line: index, single: /(?<!\\)\\[()[\]a-zA-Z]/.test(line.replace(/\\\\/g, '@@'))}).toEqual({file, line: index, single: false});
        }
    });

    test('the worked examples compute the numbers of the recomputation', () => {
        const [sine] = sineRuleLesson.workedExamples!;
        const [cosine] = cosineRuleLesson.workedExamples!;
        const m = measures(T0);
        expect(m.twoR * m.sinA).toBeCloseTo(m.a, 12);
        for (const language of ['sl', 'en'] as const) {
            const check = sine.check![language];
            for (const [value, digits] of [[m.angleA, 4], [m.sinA, 6], [m.twoR, 5], [m.twoR * m.sinA, 5], [m.a, 5]] as const) expect({language, quote: q(value, digits, language), found: hasQuote(check, value, digits, language)}).toEqual({language, quote: q(value, digits, language), found: true});
        }
        const latex = (value: number, digits: number) => q(value, digits, 'sl').replace(',', '{,}');
        expect(sine.calculationLatex).toBe(`a=2R\\sin A\\approx${latex(m.twoR, 5)}\\cdot${latex(m.sinA, 6)}`);
        expect(sine.resultLatex).toBe(`a\\approx${latex(m.a, 5)}`);
        expect(`${m.a2}`).toBe('41');
        expect(cosine.calculationLatex).toBe(`c^2=a^2+b^2-2ab\\cos C=${m.a2}+${m.b2}-${m.correction}`);
        expect(cosine.resultLatex).toBe(`c^2=${m.c2},\\quad c=${m.c}`);
        expect(m.c2).toBe(m.a2 + m.b2 - m.correction);
        for (const language of ['sl', 'en'] as const) {
            const check = cosine.check![language];
            for (const value of [m.a2, m.b2, m.dotC, m.correction, m.c2]) expect({language, value, found: hasNumber(check, String(value))}).toEqual({language, value, found: true});
            expect({language, found: hasQuote(check, m.cosC, 4, language)}).toEqual({language, found: true});
        }
        expect(m.cosC).toBeCloseTo(6 / Math.sqrt(820), 12);
        // the formula blocks: the sine rule's ratios and the cosine rule's identity hold for the lessons' triangles
        for (const id of ['tr3-ratios', 'tr3-obtuse', 'tr4-right', 'tr4-numeric']) {
            const x = measures(SCENES[id].t);
            expect(x.a / Math.sin(x.angleA * Math.PI / 180)).toBeCloseTo(x.b / Math.sin(x.angleB * Math.PI / 180), 9);
            expect(x.c2).toBeCloseTo(x.a2 + x.b2 - 2 * x.a * x.b * Math.cos(x.angleC * Math.PI / 180), 9);
        }
    });

    test('the chapter prose quotes the numbers the recomputation gives', () => {
        const [sine, cosine] = ['sine-rule', 'cosine-rule'].map(id => trigonometryChapter.sections.find(section => section.id === id)!);
        const prosePart = (section: typeof sine, language: Language) => [...section.paragraphs, ...Object.values(section.investigationPrompts ?? {})].map(paragraph => paragraph[language]).join(' ');
        const m = measures(T0);
        const right = measures(tri([0, 0], [4, 0], [0, 3]));
        for (const language of ['sl', 'en'] as const) {
            const first = prosePart(sine, language);
            for (const [value, digits] of [[m.c, 0], [m.angleC, 4], [m.c / Math.sin(m.angleC * Math.PI / 180), 3]] as const) expect({shown: q(value, digits, language), found: hasQuote(first, value, digits, language)}).toEqual({shown: q(value, digits, language), found: true});
            expect(hasFrac(first, m.r2)).toBe(true);
            const second = prosePart(cosine, language);
            for (const [value, digits] of [[m.c2, 0], [m.a2 + m.b2, 0], [m.dotC, 0], [m.correction, 0], [m.cosC, 4], [right.a2, 0], [right.b2 + right.c2, 0]] as const) expect({shown: q(value, digits, language), found: hasQuote(second, value, digits, language)}).toEqual({shown: q(value, digits, language), found: true});
            expect(second).toContain(`\\(25=16+9\\)`);
            expect(right.angleA).toBeCloseTo(90, 9);
        }
        expect(m.c / Math.sin(m.angleC * Math.PI / 180)).toBeCloseTo(m.twoR, 12);
    });

    test('the chapter owns both lessons and they are the ones the test checks; the inscribed-angle link resolves', () => {
        const owned = getChapterOwnedLessons('trigonometry')!;
        expect(owned.lesson('sine-rule')!.steps.map(step => step.id)).toEqual(sineRuleLesson.steps.map(step => step.id));
        expect(owned.lesson('cosine-rule')!.steps.map(step => step.id)).toEqual(cosineRuleLesson.steps.map(step => step.id));
        expect(sineRuleLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(cosineRuleLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(sineRuleLesson.steps.map(step => step.id)).toEqual(Object.keys(TR3_SCENES));
        expect(cosineRuleLesson.steps.map(step => step.id)).toEqual(Object.keys(TR4_SCENES));
        expect(new Set(allSteps().map(step => step.scene!.id)).size).toBe(13);
        expect(allSteps().every(step => step.scene)).toBe(true);
        expect(owned.rows().filter(([, demonstration]) => demonstration === 'triangle-solver').map(([section]) => section)).toEqual(['sine-rule', 'cosine-rule']);
        // the link in the sine-rule section: its href names a section that exists in the triangle-geometry chapter, and its label occurs in the paragraph
        const section = trigonometryChapter.sections.find(candidate => candidate.id === 'sine-rule')!;
        const linked = (section.orderedContent ?? []).flatMap(block => block.kind === 'paragraph' ? (block.links ?? []).map(link => ({link, text: block.text})) : []);
        expect(linked.length).toBe(1);
        const [{link, text}] = linked;
        const [path, anchor] = link.href.split('#');
        expect(path).toBe('/bezeg-2.0/learn/triangle-geometry');
        expect(familyChapters.find(chapter => chapter.id === 'triangle-geometry')!.sections.map(candidate => candidate.id)).toContain(anchor);
        for (const language of ['sl', 'en'] as const) expect(text[language]).toContain(link.label[language]);
    });
});
