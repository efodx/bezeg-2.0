/**
 * LS5 (level sets, batch A): every scene lands in the state, readouts and status line the text states (the real linear-program graph, scenes applied in one synchronous `act`
 * from a restored checkpoint, out of order and twice). The mathematics is recomputed here independently of `src/optimization`: vertices as exact fractions (Cramer's rule for
 * every pair of boundary lines, then a feasibility test in exact integers), objective values, tight rows, the neighbours along a boundary line, the walk (to the strictly better
 * neighbour), the optimal edge, the recession direction of the unbounded region and the empty region. The numbers each step quotes are generated from those values and looked up
 * in the sl and en prose of the step (the lesson has no decimals, so no decimal comma occurs); the learner actions the text asks for are applied and the readouts checked.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {linearProgrammingLesson, LS5_DEGENERATE, LS5_LINE_SIX, LS5_LINE_TWELVE, LS5_PARALLEL, LS5_REGION, LS5_UNBOUNDED, LS5_WALK, type LevelSetsSceneSpec, type LpSceneRow} from './levelSetsGuidedLessons';
import {levelSetsChapter} from './levelSetsChapter';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {LinearProgramGraph} from '../../graphs/levelsets/LinearProgramGraph';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- exact arithmetic ---------------------------------------------------------------------------------------------------------------------

interface Q { readonly n: bigint; readonly d: bigint }
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const frac = (n: bigint, d: bigint): Q => {
    const g = gcd(n, d) || 1n;
    const s = d < 0n ? -1n : 1n;
    return {n: (s * n) / g, d: (s * d) / g};
};
const big = (v: number): Q => frac(BigInt(v), 1n);
const add = (a: Q, b: Q) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => frac(a.n * b.n, a.d * b.d);
const cmp = (a: Q, b: Q) => { const l = a.n * b.d; const r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; };
const eq = (a: Q, b: Q) => cmp(a, b) === 0;
const show = (a: Q) => (a.d === 1n ? a.n.toString() : `${a.n}/${a.d}`);

interface Row { readonly a: number; readonly b: number; readonly c: number }
interface Vertex { readonly x: Q; readonly y: Q }
const AXES: readonly Row[] = [{a: -1, b: 0, c: 0}, {a: 0, b: -1, c: 0}];
const DEFAULT_ROWS: readonly Row[] = [{a: 1, b: 2, c: 8}, {a: 3, b: 1, c: 9}];
/** c - a x - b y: zero on the boundary line, >= 0 inside the half-plane. */
const slackOf = (row: Row, v: Vertex) => add(add(big(row.c), mul(big(-row.a), v.x)), mul(big(-row.b), v.y));

const sameVertex = (u: Vertex, v: Vertex) => eq(u.x, v.x) && eq(u.y, v.y);
/** All vertices: Cramer on every pair of boundary lines, kept when every row (user rows and the two axes) is satisfied. */
function verticesOf(user: readonly Row[]): Vertex[] {
    const rows = [...user, ...AXES];
    const found: Vertex[] = [];
    for (let i = 0; i < rows.length; i += 1) {
        for (let j = i + 1; j < rows.length; j += 1) {
            const r = rows[i];
            const s = rows[j];
            const det = BigInt(r.a * s.b - s.a * r.b);
            if (det === 0n) continue;
            const v: Vertex = {x: frac(BigInt(r.c * s.b - s.c * r.b), det), y: frac(BigInt(r.a * s.c - s.a * r.c), det)};
            if (rows.every(row => slackOf(row, v).n >= 0n) && !found.some(u => sameVertex(u, v))) found.push(v);
        }
    }
    return found;
}
const tightCount = (user: readonly Row[], v: Vertex) => [...user, ...AXES].filter(row => slackOf(row, v).n === 0n).length;
const valueAt = (p: number, q: number, v: Vertex) => add(mul(big(p), v.x), mul(big(q), v.y));
/** Counter-clockwise order from the vertex nearest the origin (floating point is only used to order the display). */
function polygonOrder(vertices: readonly Vertex[]): Vertex[] {
    if (vertices.length < 3) return [...vertices].sort((u, v) => cmp(u.x, v.x));
    const f = (q: Q) => Number(q.n) / Number(q.d);
    const cx = vertices.reduce((s, v) => s + f(v.x), 0) / vertices.length;
    const cy = vertices.reduce((s, v) => s + f(v.y), 0) / vertices.length;
    const angle = (v: Vertex) => Math.atan2(f(v.y) - cy, f(v.x) - cx);
    const sorted = [...vertices].sort((u, v) => angle(u) - angle(v));
    const origin = sorted.findIndex(v => v.x.n === 0n && v.y.n === 0n);
    return [...sorted.slice(origin), ...sorted.slice(0, origin)];
}
/** Neighbours along a boundary line: the vertices sharing a tight row, consecutive along that line. */
function neighbours(user: readonly Row[], vertices: readonly Vertex[], v: Vertex): Vertex[] {
    const result: Vertex[] = [];
    for (const row of [...user, ...AXES]) {
        if (slackOf(row, v).n !== 0n) continue;
        const along = vertices.filter(u => slackOf(row, u).n === 0n);
        // position along the line: the coordinate that is not constant
        const key = (u: Vertex) => (row.b !== 0 ? u.x : u.y);
        along.sort((u, w) => cmp(key(u), key(w)));
        const at = along.findIndex(u => sameVertex(u, v));
        for (const k of [at - 1, at + 1]) if (k >= 0 && k < along.length && !result.some(u => sameVertex(u, along[k]))) result.push(along[k]);
    }
    return result;
}
/** From the origin, always to the strictly best neighbour, until no neighbour is strictly better. */
function walkOf(user: readonly Row[], p: number, q: number): Vertex[] {
    const vertices = verticesOf(user);
    let here = vertices.find(v => v.x.n === 0n && v.y.n === 0n)!;
    const path = [here];
    for (;;) {
        const better = neighbours(user, vertices, here).filter(u => cmp(valueAt(p, q, u), valueAt(p, q, here)) > 0);
        if (better.length === 0) return path;
        better.sort((u, w) => cmp(valueAt(p, q, w), valueAt(p, q, u)));
        here = better[0];
        path.push(here);
    }
}
/** Recession directions of the region: a nonzero d with a.d <= 0 for every row lies along a boundary line, so the candidates are +-(-b, a). */
function recession(user: readonly Row[]): Array<[number, number]> {
    const rows = [...user, ...AXES];
    const candidates: Array<[number, number]> = rows.flatMap(r => [[-r.b, r.a], [r.b, -r.a]] as Array<[number, number]>).filter(([u, w]) => u !== 0 || w !== 0);
    return candidates.filter(([u, w]) => rows.every(r => r.a * u + r.b * w <= 0));
}
const rowsOf = (spec: LevelSetsSceneSpec): readonly Row[] => spec.constraints ?? DEFAULT_ROWS;
const objectiveOf = (spec: LevelSetsSceneSpec) => spec.objective ?? {p: 3, q: 2};

// ---- the model of a scene ---------------------------------------------------------------------------------------------------------------------

interface Model {
    readonly vertices: Vertex[];
    readonly values: Q[];
    readonly tight: number[];
    readonly best: Q;
    readonly optimal: Vertex[];
    readonly walk: Vertex[];
}
function modelOf(spec: LevelSetsSceneSpec): Model {
    const rows = rowsOf(spec);
    const {p, q} = objectiveOf(spec);
    const vertices = polygonOrder(verticesOf(rows));
    const values = vertices.map(v => valueAt(p, q, v));
    const best = values.reduce((m, v) => (cmp(v, m) > 0 ? v : m));
    const optimal = vertices.filter((_, i) => eq(values[i], best));
    return {vertices, values, tight: vertices.map(v => tightCount(rows, v)), best, optimal, walk: walkOf(rows, p, q)};
}

// ---- formats ------------------------------------------------------------------------------------------------------------------------------

type Language = 'sl' | 'en';
const MINUS = '−';
const pointText = (v: Vertex, language: Language) => `(${show(v.x)}${language === 'sl' ? '; ' : ', '}${show(v.y)})`.replace('-', MINUS);
const termText = (coefficient: number, name: string, first: boolean) => {
    if (coefficient === 0) return '';
    const sign = coefficient < 0 ? (first ? MINUS : ' − ') : (first ? '' : ' + ');
    const magnitude = Math.abs(coefficient) === 1 ? '' : String(Math.abs(coefficient));
    return `${sign}${magnitude}${name}`;
};
const lineText = (p: number, q: number, k: Q) => `${termText(p, 'x', true)}${termText(q, 'y', p === 0)} = ${show(k)}`;
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
/** Prose with the math delimiters, the LaTeX spacing and the decimal-comma braces removed. */
const prose = (text: string) => text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,/])${escapeRegExp(value)}(?![0-9]|[.,/][0-9])`).test(prose(text));
const hasText = (text: string, quote: string) => prose(text).replace(/\s+/g, ' ').includes(quote);

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutIds = () => [...document.querySelectorAll('[data-readout]')].map(node => node.getAttribute('data-readout')!);
const status = () => document.querySelector('[data-lp-status]')?.textContent ?? null;

function mountLp() {
    const graph = createGraph('linear-program');
    if (!(graph instanceof LinearProgramGraph)) throw new Error('linear-program must be the linear-program graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const actionsOf = (stepId: string) => sceneActions(linearProgrammingLesson.steps.find(step => step.id === stepId)!.scene!);
    const scene = (stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of actionsOf(stepId)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}

/** The graph's vertex, optimum and walk readouts as sets of strings (their order is the graph's). */
function readVertices(language: Language) {
    const count = Number(readout('vertex-count'));
    const rows = Array.from({length: count}, (_, i) => stripped(readout(`vertex-${i}`)));
    const walk = readoutIds().filter(id => /^walk-\d+$/.test(id)).sort((a, b) => Number(a.slice(5)) - Number(b.slice(5))).map(id => stripped(readout(id)));
    const optimal = readoutIds().filter(id => /^optimal-\d+$/.test(id)).map(id => stripped(readout(id)));
    void language;
    return {count, rows, walk, optimal};
}

function expectedReadouts(spec: LevelSetsSceneSpec, language: Language) {
    const model = modelOf(spec);
    const {p, q} = objectiveOf(spec);
    const point = (v: Vertex) => pointText(v, language);
    const rows = model.vertices.map((v, i) => stripped(t('levelsets_graph_lp_vertex_value', {value0: point(v), value1: show(model.values[i]), value2: String(model.tight[i])})));
    const walk = model.walk.map(v => stripped(t('levelsets_graph_lp_walk_step', {value0: point(v), value1: show(valueAt(p, q, v))})));
    return {model, rows, walk};
}

// ---- the scenes ---------------------------------------------------------------------------------------------------------------------------

const SPECS: Record<string, LevelSetsSceneSpec> = {
    'ls5-region': LS5_REGION,
    'ls5-line': LS5_LINE_SIX,
    'ls5-last-touch': LS5_LINE_TWELVE,
    'ls5-walk': LS5_WALK,
    'ls5-parallel': LS5_PARALLEL,
    'ls5-degenerate': LS5_DEGENERATE,
    'ls5-unbounded': LS5_UNBOUNDED,
};
const stepIds = Object.keys(SPECS);
const lesson = linearProgrammingLesson;
const stepOf = (id: string) => lesson.steps.find(step => step.id === id)!;
const sweepOf = (spec: LevelSetsSceneSpec) => spec.sweep ?? 9;

function checkScene(language: Language, id: string, m: ReturnType<typeof mountLp>) {
    const spec = SPECS[id];
    const rows = rowsOf(spec);
    const {p, q} = objectiveOf(spec);
    const expected = expectedReadouts(spec, language);
    const state = m.graph.state as unknown as Record<string, unknown>;
    expect({id, constraints: state.constraints}).toEqual({id, constraints: rows});
    expect({id, objective: state.objective}).toEqual({id, objective: {p, q}});
    expect({id, sweep: state.sweep}).toEqual({id, sweep: sweepOf(spec)});
    expect({id, line: stripped(readout('sweep'))}).toEqual({id, line: stripped(lineText(p, q, big(sweepOf(spec))))});
    const unbounded = recession(rows).length > 0;
    const bounded = expected.model.vertices.length > 0 && !unbounded;
    expect({id, region: readout('region')}).toEqual({id, region: t(bounded ? 'levelsets_graph_lp_region_polygon' : 'levelsets_graph_lp_region_unbounded')});
    const read = readVertices(language);
    expect({id, count: read.count}).toEqual({id, count: expected.model.vertices.length});
    expect({id, rows: [...read.rows].sort()}).toEqual({id, rows: [...expected.rows].sort()});
    if (bounded) {
        expect({id, walk: read.walk}).toEqual({id, walk: expected.walk});
        expect({id, optimum: stripped(readout('optimum'))}).toEqual({id, optimum: show(expected.model.best)});
        expect({id, optimal: [...read.optimal].sort()}).toEqual({id, optimal: expected.model.optimal.map(v => stripped(pointText(v, language))).sort()});
        expect({id, through: stripped(readout('through'))}).toEqual({id, through: stripped(lineText(p, q, expected.model.best))});
        expect({id, status: readout('status')}).toEqual({id, status: t(expected.model.optimal.length === 1 ? 'levelsets_graph_lp_status_unique' : 'levelsets_graph_lp_status_segment')});
    } else {
        expect({id, status: readout('status')}).toEqual({id, status: t('levelsets_graph_lp_status_unbounded')});
        const [direction] = recession(rows);
        expect({id, ray: stripped(readout('ray'))}).toEqual({id, ray: stripped(pointText({x: big(direction[0]), y: big(direction[1])}, language))});
        expect({id, walk: readout('walk')}).toEqual({id, walk: t('levelsets_graph_lp_walk_none')});
    }
    expect({id, line: status()}).not.toEqual({id, line: null});
}

for (const language of ['sl', 'en'] as const) {
    test(`${language}: every scene lands in the exact state, readouts and status the independent recomputation gives, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
        setLanguage(language);
        const m = mountLp();
        try {
            for (const id of [...stepIds, ...stepIds.slice().reverse()]) {
                m.scene(id, 2);
                checkScene(language, id, m);
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    });
}

// ---- the recomputed mathematics ---------------------------------------------------------------------------------------------------------------

test('the independent recomputation: vertices, values, tight rows, optimal edge, walk, redundant row, unbounded and empty regions', () => {
    const asText = (vs: readonly Vertex[]) => vs.map(v => pointText(v, 'en'));
    const standard = modelOf(LS5_REGION);
    expect(asText(standard.vertices)).toEqual(['(0, 0)', '(3, 0)', '(2, 3)', '(0, 4)']);
    expect(standard.values.map(show)).toEqual(['0', '9', '12', '8']);
    expect(standard.tight).toEqual([2, 2, 2, 2]);
    expect(show(standard.best)).toBe('12');
    expect(asText(standard.optimal)).toEqual(['(2, 3)']);
    expect(asText(standard.walk)).toEqual(['(0, 0)', '(3, 0)', '(2, 3)']);
    // k = 9 passes through (3; 0), k = 12 through (2; 3); k = 13 exceeds every vertex value, so the line misses the region
    expect(standard.vertices.filter(v => eq(valueAt(3, 2, v), big(9))).map(v => pointText(v, 'en'))).toEqual(['(3, 0)']);
    expect(standard.vertices.filter(v => eq(valueAt(3, 2, v), big(12))).map(v => pointText(v, 'en'))).toEqual(['(2, 3)']);
    expect(standard.values.every(v => cmp(v, big(13)) < 0)).toBe(true);
    expect(recession(DEFAULT_ROWS)).toEqual([]);

    const parallel = modelOf(LS5_PARALLEL);
    expect(parallel.values.map(show)).toEqual(['0', '3', '8', '8']);
    expect(asText(parallel.optimal).sort()).toEqual(['(0, 4)', '(2, 3)']);
    expect(asText(parallel.walk)).toEqual(['(0, 0)', '(0, 4)']);
    // the two optimal vertices are neighbours along the line x + 2y = 8, so the whole side has value 8
    const [onSide] = parallel.optimal;
    expect(neighbours(DEFAULT_ROWS, parallel.vertices, onSide).some(u => parallel.optimal.some(o => sameVertex(o, u) && !sameVertex(o, onSide)))).toBe(true);

    const degenerate = modelOf(LS5_DEGENERATE);
    expect(asText(degenerate.vertices)).toEqual(['(0, 0)', '(3, 0)', '(3, 1)', '(0, 2)']);
    expect(degenerate.values.map(show)).toEqual(['0', '9', '11', '4']);
    expect(degenerate.tight).toEqual([2, 2, 3, 2]);
    expect(show(degenerate.best)).toBe('11');
    expect(asText(degenerate.walk)).toEqual(['(0, 0)', '(3, 0)', '(3, 1)']);
    // x + y <= 4 is redundant: the region is the same without it (and with it removed (3; 1) has two tight rows)
    const without: Row[] = LS5_DEGENERATE.constraints.slice(1) as LpSceneRow[];
    expect(asText(polygonOrder(verticesOf(without)))).toEqual(asText(degenerate.vertices));
    expect(tightCount(without, degenerate.vertices[2])).toBe(2);
    // y <= (6 - x) / 3 and x <= 3 give x + y <= (2x + 6) / 3 <= 4: at x = 3 the bound is 4 exactly
    expect(show(add(mul(big(2), big(3)), big(6)))).toBe('12');

    const open = modelOf(LS5_UNBOUNDED);
    expect(asText(open.vertices)).toEqual(['(0, 0)', '(2, 0)']);
    expect(recession(LS5_UNBOUNDED.constraints)).toContainEqual([1, 1]);
    // (t, t) is feasible for every t >= 0 and x + y = 2t grows beyond every bound
    for (const t0 of [0, 1, 50, 1000]) expect(AXES.concat(LS5_UNBOUNDED.constraints).every(r => r.a * t0 + r.b * t0 <= r.c)).toBe(true);

    // after the learner types b = 1 and c = -1 into row 1: x + y <= -1 with x, y >= 0 has no point (and no vertex)
    const emptyRows: Row[] = [{a: 1, b: 1, c: -1}];
    expect(verticesOf(emptyRows)).toEqual([]);
    expect(emptyRows[0].a >= 0 && emptyRows[0].b >= 0 && emptyRows[0].c < 0).toBe(true);
});

// ---- the learner actions ------------------------------------------------------------------------------------------------------------------

test('the learner actions the text asks for give the quoted readouts: k = 9, 12, 13; the infeasible status after b = 1, c = -1; leaving restores the free state', () => {
    const m = mountLp();
    try {
        const sweep = (k: number): LessonAction => ({kind: 'levelsets', operation: 'set-sweep', sweep: k});
        const standard = modelOf(LS5_REGION);
        m.scene('ls5-line');
        expect(stripped(readout('sweep'))).toBe(stripped('3x + 2y = 6'));
        for (const k of [9, 12, 13]) {
            m.learner(sweep(k));
            expect(stripped(readout('sweep'))).toBe(stripped(lineText(3, 2, big(k))));
            expect(stripped(readout('through'))).toBe(stripped(lineText(3, 2, standard.best)));
        }
        expect(standard.values.every(v => cmp(v, big(13)) < 0)).toBe(true);
        m.scene('ls5-unbounded');
        expect(readout('status')).toBe(t('levelsets_graph_lp_status_unbounded'));
        // row 1: x - y <= 2 becomes x + y <= -1 (b = 1, c = -1)
        m.learner({kind: 'levelsets', operation: 'set-constraints', constraints: [{a: 1, b: 1, c: -1}]});
        expect(readout('status')).toBe(t('levelsets_graph_lp_status_infeasible'));
        expect(readout('vertex-count')).toBe('0');
        m.restore();
        expect(JSON.stringify(m.graph.state)).toBe(m.free);
    } finally {
        m.mounted.view.unmount();
    }
});

test('the infeasible status the text quotes is the graph status in both languages', () => {
    for (const language of ['sl', 'en'] as const) {
        setLanguage(language);
        const quote = language === 'sl' ? 'prazno območje, optimuma ni' : 'empty region, no optimum';
        expect(t('levelsets_graph_lp_status_infeasible')).toBe(quote);
        expect(hasText(stepOf('ls5-unbounded').expectedObservations[0][language], quote)).toBe(true);
    }
});

// ---- the text ---------------------------------------------------------------------------------------------------------------------------------

describe('the numbers each step quotes are those of its scene, in sl and en', () => {
    const stepTexts = (id: string, language: Language) => {
        const step = stepOf(id);
        const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
        return {
            scene: step.scene!.expectedState[language],
            all: [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language],
                ...examples.map(example => example.check?.[language] ?? '')].join(' '),
        };
    };
    const pointsIn = (vs: readonly Vertex[], language: Language) => vs.map(v => pointText(v, language));
    const valueList = (values: readonly Q[]) => values.map(show).join(', ');

    for (const language of ['sl', 'en'] as const) {
        test(`${language}: vertices, values, tight counts, optimum and walk of each scene appear in its text`, () => {
            const needs = (id: string) => {
                const model = modelOf(SPECS[id]);
                const {scene, all} = stepTexts(id, language);
                const points = (vs: readonly Vertex[]) => pointsIn(vs, language).map(s => s.replace(/^\(|\)$/g, ''));
                const mustHave = (text: string, items: readonly string[]) => { for (const item of items) expect({id, item, found: hasText(text, item)}).toEqual({id, item, found: true}); };
                return {model, scene, all, points, mustHave};
            };
            // 1: the four vertices, the number of vertices and of tight rows
            let n = needs('ls5-region');
            n.mustHave(n.scene, pointsIn(n.model.vertices, language));
            n.mustHave(n.all, pointsIn(n.model.vertices, language));
            expect(hasNumber(n.scene, String(n.model.vertices.length))).toBe(true);
            expect(hasNumber(n.all, String(n.model.tight[0]))).toBe(true);
            // 2: k = 6 line, k = 9 through (3; 0), k = 12 through (2; 3)
            n = needs('ls5-line');
            for (const k of [6, 9, 12]) expect(hasNumber(n.all, String(k))).toBe(true);
            n.mustHave(n.all, [pointText({x: big(3), y: big(0)}, language), pointText({x: big(2), y: big(3)}, language)]);
            // 3: the values at the vertices, the optimum and its point, k = 12 and 13
            n = needs('ls5-last-touch');
            n.mustHave(n.scene, [valueList(n.model.values)]);
            n.mustHave(n.all, [valueList(n.model.values), ...pointsIn(n.model.optimal, language)]);
            expect(hasNumber(n.scene, show(n.model.best))).toBe(true);
            expect(hasNumber(n.all, '13')).toBe(true);
            // 4: the walk and its values; the neighbours of the origin and their values
            n = needs('ls5-walk');
            n.mustHave(n.scene, pointsIn(n.model.walk, language));
            n.mustHave(n.all, [valueList(n.model.walk.map(v => valueAt(3, 2, v)))]);
            const vertices = verticesOf(DEFAULT_ROWS);
            const around = neighbours(DEFAULT_ROWS, vertices, n.model.walk[0]);
            n.mustHave(n.all, pointsIn(around, language));
            for (const v of around) expect(hasNumber(n.all, show(valueAt(3, 2, v)))).toBe(true);
            // 5: values of x + 2y, both optimal vertices, the walk
            n = needs('ls5-parallel');
            n.mustHave(n.scene, [valueList(n.model.values), ...pointsIn(n.model.optimal, language)]);
            n.mustHave(n.all, pointsIn(n.model.walk, language));
            expect(hasNumber(n.scene, show(n.model.best))).toBe(true);
            // 6: the vertices, the values, the three tight rows at (3; 1) and the optimum
            n = needs('ls5-degenerate');
            n.mustHave(n.scene, pointsIn(n.model.vertices, language));
            n.mustHave(n.all, [valueList(n.model.values), ...pointsIn(n.model.walk, language)]);
            expect(hasNumber(n.scene, String(Math.max(...n.model.tight)))).toBe(true);
            expect(hasNumber(n.scene, show(n.model.best))).toBe(true);
            expect(hasNumber(n.all, String(Math.min(...n.model.tight)))).toBe(true);
            // 7: the two vertices, the direction of growth
            n = needs('ls5-unbounded');
            n.mustHave(n.scene, pointsIn(n.model.vertices, language));
            n.mustHave(n.scene, [pointText({x: big(1), y: big(1)}, language)]);
            n.mustHave(n.all, [pointText({x: big(1), y: big(1)}, language)]);
            expect(hasNumber(n.all, String(n.model.vertices.length))).toBe(true);
            void n.points;
        });
    }

    test('the worked examples compute the same values and the same optimum as the recomputation', () => {
        const standard = modelOf(LS5_REGION);
        const vertices = lesson.workedExamples!.find(example => example.id === 'ls5-vertices')!;
        // 3 * x + 2 * y = value for the four vertices, in the order of the text
        const expectedCalculation = standard.vertices.map((v, i) => `3\\cdot${show(v.x)}+2\\cdot${show(v.y)}=${show(standard.values[i])}`).join(',\\quad ');
        expect(vertices.calculationLatex).toBe(expectedCalculation);
        expect(vertices.resultLatex).toBe(`\\max(3x+2y)=${show(standard.best)},\\quad (x,y)=(${show(standard.optimal[0].x)},${show(standard.optimal[0].y)})`);
        const edge = lesson.workedExamples!.find(example => example.id === 'ls5-edge')!;
        const parallel = modelOf(LS5_PARALLEL);
        const [start, end] = [...parallel.optimal].sort((u, v) => cmp(u.x, v.x));
        expect(edge.calculationLatex).toBe(`1\\cdot${show(end.x)}+2\\cdot${show(end.y)}=${show(parallel.best)},\\quad 1\\cdot${show(start.x)}+2\\cdot${show(start.y)}=${show(parallel.best)}`);
        expect(edge.resultLatex).toBe(`(x,y)=(${show(start.x)},${show(start.y)})+t\\,(${show(end.x.n === 0n ? big(0) : add(end.x, mul(big(-1), start.x)))},${show(add(end.y, mul(big(-1), start.y)))}),\\quad 0\\le t\\le1`);
    });

    test('the chapter prose quotes the default vertices, their values, the value 8 of x + 2y and the optimum', () => {
        const standard = modelOf(LS5_REGION);
        const parallel = modelOf(LS5_PARALLEL);
        const paragraphs = levelSetsChapter.sections[0].paragraphs;
        for (const language of ['sl', 'en'] as const) {
            const text = paragraphs.map(paragraph => paragraph[language]).join(' ');
            for (const v of standard.vertices) expect(hasText(text, pointText(v, language))).toBe(true);
            expect(hasText(text, `${standard.values.slice(0, 3).map(show).join(', ')}`) || standard.values.every(v => hasNumber(text, show(v)))).toBe(true);
            expect(hasNumber(text, show(standard.best))).toBe(true);
            expect(hasNumber(text, show(parallel.best))).toBe(true);
            expect(hasText(text, pointText(parallel.optimal.find(v => v.x.n === 0n)!, language))).toBe(true);
        }
    });

    test('the chapter owns the lesson and the lesson is the one the test checks', () => {
        const owned = getChapterOwnedLessons('level-sets')!.lesson('linear-programming')!;
        expect(owned.steps.map(step => step.id)).toEqual(stepIds);
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });
});
