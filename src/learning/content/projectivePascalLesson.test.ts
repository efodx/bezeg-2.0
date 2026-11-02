/**
 * K2 (projective-pascal): every scene lands in the state the text states (the real graph, one synchronous sequence of actions, out of
 * order and twice), and every number the lesson quotes is recomputed here with exact fractions of our own (the conics, the lines and the
 * determinant), without the projective kernel. The handle positions are written down by hand and checked against the graph's table.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {PASCAL_DRAG_INDEX, projectiveConicsGuidedLessons} from './projectiveConicsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {PascalGraph} from '../../graphs/projective/PascalGraph';
import {PASCAL_ORDERS, PascalConicId} from '../../graphs/projective/pascalModel';
import {DIRECTION_TABLE} from '../../projective/conicPencil';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- Exact fractions of our own (bigint), independent of src/projective ------------------------------------------------------------

interface Fr {readonly n: bigint; readonly d: bigint}
const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const fr = (n: number | bigint, d: number | bigint = 1): Fr => {
    let num = BigInt(n);
    let den = BigInt(d);
    if (den < 0n) { num = -num; den = -den; }
    const g = gcd(num, den) || 1n;
    return {n: num / g, d: den / g};
};
const add = (a: Fr, b: Fr): Fr => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Fr, b: Fr): Fr => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Fr, b: Fr): Fr => fr(a.n * b.n, a.d * b.d);
const eq = (a: Fr, b: Fr): boolean => a.n * b.d === b.n * a.d;
const isZero = (a: Fr): boolean => a.n === 0n;

type V3 = readonly [Fr, Fr, Fr];
/** A finite point (x, y, 1). */
const at = (x: Fr | number, y: Fr | number): V3 => [typeof x === 'number' ? fr(x) : x, typeof y === 'number' ? fr(y) : y, fr(1)];
const cross3 = (a: V3, b: V3): V3 => [sub(mul(a[1], b[2]), mul(a[2], b[1])), sub(mul(a[2], b[0]), mul(a[0], b[2])), sub(mul(a[0], b[1]), mul(a[1], b[0]))];
const det3 = (a: V3, b: V3, c: V3): Fr => {
    const [x, y, z] = cross3(b, c);
    return add(add(mul(a[0], x), mul(a[1], y)), mul(a[2], z));
};

/** The Pascal points of the hexagon with vertices `points[order[i]]`: s_i joins vertex i and i + 1, P_k = s_k and s_{k+3}. */
function pascalOf(points: readonly V3[], order: readonly number[]): V3[] {
    const v = order.map(h => points[h]);
    const sides = v.map((p, i) => cross3(p, v[(i + 1) % 6]));
    return [0, 1, 2].map(k => cross3(sides[k], sides[k + 3]));
}

/** Whether the homogeneous point `p` is the same point as `q` (cross product zero). */
const sameProjectivePoint = (p: V3, q: V3): boolean => cross3(p, q).every(isZero);

// Conics as coefficient lists A x^2 + B xy + C y^2 + D x + E y + F, written down here from the graph's documented definitions.
const CONICS: Record<PascalConicId, readonly [number, number, number, number, number, number]> = {
    ellipse: [9, 0, 25, 0, 0, -225],
    parabola: [1, 0, 0, 0, -4, 0],
    hyperbola: [9, 0, -16, 0, 0, -144],
    linePair: [0, 0, 1, 0, -3, 0],
};
const onConic = (id: PascalConicId, p: V3): boolean => {
    const [a, b, c, d, e, f] = CONICS[id].map(v => fr(v));
    const [x, y] = p;
    const sum = [mul(a, mul(x, x)), mul(b, mul(x, y)), mul(c, mul(y, y)), mul(d, x), mul(e, y), f].reduce(add, fr(0));
    return isZero(sum);
};

// ---- The lesson ----------------------------------------------------------------------------------------------------------------------

const lesson: GuidedLesson = projectiveConicsGuidedLessons.find(entry => entry.demonstrationId === 'projective-pascal')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');

/** A number as the prose writes it: `-\tfrac75`, a bare single digit or a braced group. */
const group = (value: bigint): string => (value < 10n ? `${value}` : `{${value}}`);
const tex = (value: Fr): string => {
    const sign = value.n < 0n ? '-' : '';
    const n = value.n < 0n ? -value.n : value.n;
    return value.d === 1n ? `${sign}${n}` : `${sign}\\tfrac${group(n)}${group(value.d)}`;
};
const texOrder = (hexagon: string): string => hexagon.replace(/([₁₂₃])/g, digit => `_${'₁₂₃'.indexOf(digit) + 1}`).replace(/ /g, '\\,');
const pointTex = (p: V3): string => `(${tex(p[0])},${tex(p[1])})`;
/** The readout's text for a fraction: a Unicode minus and `n/d`. */
const shown = (value: Fr) => (value.d === 1n ? `${value.n}` : `${value.n}/${value.d}`).replace('-', '−');
const shownPoint = (p: V3) => `(${shown(p[0])}, ${shown(p[1])})`;

interface Expected {
    readonly conic: PascalConicId;
    readonly order: readonly number[];
    /** The six points by handle. */
    readonly handles: readonly V3[];
    /** The hexagon as the readout writes it. */
    readonly hexagon: string;
    /** The three Pascal points the text quotes; an ideal one is its direction. */
    readonly pascal: readonly ({readonly at: V3} | {readonly direction: readonly [number, number]})[];
    /** Handles and Pascal points the prose quotes (indices into `pascal` for Pascal points). */
    readonly quotedHandles: readonly number[];
    readonly quotedPascal: readonly number[];
    /** Pascal points the readout marks as outside the visible area. */
    readonly off: readonly number[];
}

const ELLIPSE: readonly V3[] = [at(5, 0), at(3, fr(12, 5)), at(0, 3), at(-3, fr(12, 5)), at(0, -3), at(4, fr(-9, 5))];
const ELLIPSE_DRAGGED: readonly V3[] = ELLIPSE.map((p, i) => (i === 3 ? at(fr(-7, 5), fr(72, 25)) : p));
const PAPPUS: readonly V3[] = [at(0, 0), at(2, 0), at(5, 0), at(1, 3), at(4, 3), at(6, 3)];
const INFINITY: readonly V3[] = [at(0, 0), at(1, 0), at(6, 0), at(4, 3), at(3, 3), at(8, 3)];
// Written down by hand from the direction table: the hyperbola 9x^2 - 16y^2 = 144 through the vertex (4, 0) and the default directions.
const HYPERBOLA: readonly V3[] = [at(fr(20, 3), 4), at(4, 0), at(fr(20, 3), -4), at(-5, fr(-9, 4)), at(-5, fr(9, 4)), at(fr(-388, 65), fr(216, 65))];

/** The scenes whose text names the order of the vertices. */
const STATES_ORDER = ['pascal-predict', 'pascal-order', 'pascal-pappus', 'pascal-infinity', 'pascal-explore'];
const P = (x: number | Fr, y: number | Fr) => ({at: at(x, y)});
const SCENES: Record<string, Expected> = {
    'pascal-predict': {
        conic: 'ellipse', order: PASCAL_ORDERS.natural, handles: ELLIPSE, hexagon: 'A B C D E F',
        pascal: [P(-15, 24), P(12, fr(3, 5)), P(fr(15, 2), fr(9, 2))], quotedHandles: [0, 1, 2, 3, 4, 5], quotedPascal: [], off: [0],
    },
    'pascal-points': {
        conic: 'ellipse', order: PASCAL_ORDERS.natural, handles: ELLIPSE, hexagon: 'A B C D E F',
        pascal: [P(-15, 24), P(12, fr(3, 5)), P(fr(15, 2), fr(9, 2))], quotedHandles: [], quotedPascal: [0, 1, 2], off: [0],
    },
    'pascal-drag': {
        conic: 'ellipse', order: PASCAL_ORDERS.natural, handles: ELLIPSE_DRAGGED, hexagon: 'A B C D E F',
        pascal: [P(-3, fr(48, 5)), P(12, fr(3, 5)), P(7, fr(18, 5))], quotedHandles: [3], quotedPascal: [0, 1, 2], off: [],
    },
    'pascal-order': {
        conic: 'ellipse', order: PASCAL_ORDERS.pappus, handles: ELLIPSE, hexagon: 'A E C D B F',
        pascal: [P(9, fr(12, 5)), P(0, 15), P(fr(15, 2), fr(9, 2))], quotedHandles: [], quotedPascal: [0, 1, 2], off: [1],
    },
    'pascal-pappus': {
        conic: 'linePair', order: PASCAL_ORDERS.pappus, handles: PAPPUS, hexagon: 'A₁ B₂ A₃ B₁ A₂ B₃',
        pascal: [P(fr(8, 5), fr(6, 5)), P(fr(22, 5), fr(9, 5)), P(3, fr(3, 2))], quotedHandles: [0, 1, 2, 3, 4, 5], quotedPascal: [0, 1, 2], off: [],
    },
    'pascal-infinity': {
        conic: 'linePair', order: PASCAL_ORDERS.pappus, handles: INFINITY, hexagon: 'A₁ B₂ A₃ B₁ A₂ B₃',
        pascal: [{direction: [1, 1]}, P(fr(9, 2), fr(3, 2)), P(fr(24, 5), fr(9, 5))], quotedHandles: [0, 1, 2, 3, 4, 5], quotedPascal: [1, 2], off: [],
    },
    'pascal-explore': {
        conic: 'hyperbola', order: PASCAL_ORDERS.natural, handles: HYPERBOLA, hexagon: 'A B C D E F',
        pascal: [], quotedHandles: [], quotedPascal: [], off: [],
    },
};

/** The Pascal points of a scene computed from the hand-written handle points with our own fractions. */
const pascalPoints = (e: Expected): V3[] => pascalOf(e.handles, e.order);

function mount() {
    const graph = createGraph('projective-pascal');
    if (!(graph instanceof PascalGraph)) throw new Error('projective-pascal must be the Pascal graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph, mounted,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}

const line = (name: string) => document.querySelector(`[data-projective-line="${name}"]`)?.textContent ?? null;
const status = () => document.querySelector('[data-projective-status]')?.getAttribute('data-projective-status');

test('K2 has seven ordered steps, each with a scene of its own that uses Pascal operations', () => {
    expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
    for (const step of lesson.steps) {
        const operations = sceneActions(step.scene!).flatMap(action => (action.kind === 'projective' ? [action.operation] : []));
        expect(operations.length, step.id).toBeGreaterThan(0);
        expect(operations.every(operation => operation.startsWith('pascal-')), step.id).toBe(true);
    }
});

test('K2: the hand-written points are on their conics and give the spec\'s Pascal points, determinants and Pappus status', () => {
    for (const [id, e] of Object.entries(SCENES)) {
        e.handles.forEach((p, i) => expect(onConic(e.conic, p), `${id} handle ${i}`).toBe(true));
        const points = pascalPoints(e);
        // Pascal's and Pappus's theorems, on these examples: the exact determinant of the three intersections is zero.
        expect(isZero(det3(points[0], points[1], points[2])), `${id} determinant`).toBe(true);
        e.pascal.forEach((entry, k) => {
            if ('at' in entry) expect(sameProjectivePoint(points[k], entry.at), `${id} P${k + 1}`).toBe(true);
            else {
                // A point at infinity: third coordinate zero, direction proportional to the quoted one.
                expect(isZero(points[k][2]), `${id} P${k + 1} at infinity`).toBe(true);
                expect(isZero(sub(mul(points[k][0], fr(entry.direction[1])), mul(points[k][1], fr(entry.direction[0])))), id).toBe(true);
            }
        });
    }
    // The spec's numbers, written directly (not taken from SCENES): default ellipse, Pappus, the point at infinity.
    const def = pascalOf(ELLIPSE, PASCAL_ORDERS.natural);
    expect(def.map(p => sameProjectivePoint(p, at(-15, 24)) || sameProjectivePoint(p, at(12, fr(3, 5))) || sameProjectivePoint(p, at(fr(15, 2), fr(9, 2))))).toEqual([true, true, true]);
    const pappus = pascalOf(PAPPUS, PASCAL_ORDERS.pappus);
    expect(pappus.map((p, k) => sameProjectivePoint(p, [at(fr(8, 5), fr(6, 5)), at(fr(22, 5), fr(9, 5)), at(3, fr(3, 2))][k]))).toEqual([true, true, true]);
    const far = pascalOf(INFINITY, PASCAL_ORDERS.pappus);
    // The direction (-9, -9, 0) of the spec, up to a nonzero scale, and the finite two on a line of slope 1.
    expect(isZero(far[0][2]) && eq(far[0][0], far[0][1]) && !isZero(far[0][0])).toBe(true);
    expect(eq(far[1][0], mul(fr(9, 2), far[1][2])) && eq(far[1][1], mul(fr(3, 2), far[1][2]))).toBe(true);
    expect(eq(far[2][0], mul(fr(24, 5), far[2][2])) && eq(far[2][1], mul(fr(9, 5), far[2][2]))).toBe(true);
    const dx = sub(mul(far[2][0], far[1][2]), mul(far[1][0], far[2][2]));
    const dy = sub(mul(far[2][1], far[1][2]), mul(far[1][1], far[2][2]));
    expect(eq(dx, dy) && !isZero(dx)).toBe(true);
});

test('K2: the drag index is the direction (5, 4), the worked examples and the line equations recompute', () => {
    expect(DIRECTION_TABLE[PASCAL_DRAG_INDEX]).toEqual([5, 4]);
    // Worked example 1: s1 = AB is 6x + 5y = 30, s4 = DE is 9x + 5y = -15, the intersection is (-15, 24).
    const [a, b, d, e] = [ELLIPSE[0], ELLIPSE[1], ELLIPSE[3], ELLIPSE[4]];
    const s1 = cross3(a, b);
    const s4 = cross3(d, e);
    // Coefficients scaled so that the x coefficient is 6 (resp. 9): compare as lines.
    expect(sameProjectivePoint(s1, [fr(6), fr(5), fr(-30)])).toBe(true);
    expect(sameProjectivePoint(s4, [fr(9), fr(5), fr(15)])).toBe(true);
    expect(sameProjectivePoint(cross3(s1, s4), at(-15, 24))).toBe(true);
    // Worked example 2: A1B2 is y = 3x/4, B1A2 is y = 6 - 3x, the intersection is (8/5, 6/5).
    const line1 = cross3(PAPPUS[0], PAPPUS[4]);
    const line4 = cross3(PAPPUS[3], PAPPUS[1]);
    expect(sameProjectivePoint(line1, [fr(3), fr(-4), fr(0)])).toBe(true);
    expect(sameProjectivePoint(line4, [fr(3), fr(1), fr(-6)])).toBe(true);
    expect(sameProjectivePoint(cross3(line1, line4), at(fr(8, 5), fr(6, 5)))).toBe(true);
    expect(eq(add(mul(fr(15, 4), fr(8, 5)), fr(0)), fr(6))).toBe(true);
});

test('K2: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const e = SCENES[id];
            m.scene(id);
            m.scene(id);
            const model = m.graph.model;
            expect({id, conic: model.conic, order: model.order}).toEqual({id, conic: e.conic, order: e.order});
            const scene = m.graph.scene();
            // The six points the text quotes are the graph's, and the hexagon list is the order the text states.
            scene.handles.forEach((h, i) => {
                const expected = e.handles[i];
                expect([id, i, h[2] !== 0n && eq(fr(h[0], h[2]), expected[0]) && eq(fr(h[1], h[2]), expected[1])]).toEqual([id, i, true]);
            });
            expect(line('hexagon'), id).toContain(e.hexagon);
            // The exact status: collinear, and the Pascal points are the ones we recomputed.
            expect([id, status()]).toEqual([id, 'collinear']);
            expect([id, scene.result.status === 'ok' && scene.result.collinear]).toEqual([id, true]);
            expect(line('status'), id).toContain('natančno kolinearna');
            expect(line('determinant'), id).toContain('0');
            e.pascal.forEach((entry, k) => {
                const point = scene.pascalPoints[k].point;
                const graphPoint: V3 = [fr(point[0]), fr(point[1]), fr(point[2])];
                if ('at' in entry) {
                    expect([id, k, sameProjectivePoint(graphPoint, entry.at), scene.pascalPoints[k].view.kind]).toEqual([id, k, true, 'finite']);
                    expect(line(`point-${k + 1}`), `${id} P${k + 1}`).toContain(shownPoint(entry.at));
                    expect([id, k, line(`point-${k + 1}`)?.includes('izven')]).toEqual([id, k, e.off.includes(k)]);
                } else {
                    // A point at infinity: the graph states a direction, never a huge finite coordinate.
                    expect([id, k, scene.pascalPoints[k].view.kind, graphPoint[2].n]).toEqual([id, k, 'ideal', 0n]);
                    expect(isZero(sub(mul(graphPoint[0], fr(entry.direction[1])), mul(graphPoint[1], fr(entry.direction[0]))))).toBe(true);
                    expect(line(`point-${k + 1}`), id).toContain('v neskončnosti');
                    expect(line(`point-${k + 1}`), id).toContain('(1, 1)');
                }
            });
            // The Pascal line is finite in these scenes, so it is not the line at infinity.
            if (e.pascal.length > 0) expect(line('line'), id).toContain('Pascalova premica');
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('K2: the readout is English on the same scene after a live language switch', () => {
    const m = mount();
    try {
        m.scene('pascal-infinity');
        act(() => { setLanguage('en'); });
        expect(line('status')).toContain('exactly collinear');
        expect(line('point-1')).toContain('at infinity');
        expect(line('point-2')).toContain(shownPoint(at(fr(9, 2), fr(3, 2))));
        expect(line('hexagon')).toContain('A₁ B₂ A₃ B₁ A₂ B₃');
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('K2: the quoted points and values are in the prose, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, e] of Object.entries(SCENES)) {
            const text = prose(stepOf(id), language);
            for (const i of e.quotedHandles) expect(text, `${id} ${language} handle ${i}`).toContain(pointTex(e.handles[i]));
            const points = pascalPoints(e);
            for (const k of e.quotedPascal) {
                const entry = e.pascal[k];
                if ('at' in entry) expect(text, `${id} ${language} P${k + 1}`).toContain(pointTex(entry.at));
                else expect(points[k][2]).toEqual(fr(0));
            }
            if (e.pascal.length > 0 && id !== 'pascal-predict') expect(text, `${id} ${language} determinant`).toContain('\\(0\\)');
            // The hexagon order is stated with the vertex names in the scenes that state it.
            if (STATES_ORDER.includes(id)) expect(text, `${id} ${language} order`).toContain(texOrder(e.hexagon));
        }
        const step = (id: string) => prose(stepOf(id), language);
        // The point at infinity is stated as a direction and a line of slope 1.
        expect(step('pascal-infinity')).toContain('(1,1)');
        expect(step('pascal-infinity')).toContain('\\(1\\)');
        expect(step('pascal-order')).toContain('(0,15)');
        // The theorem is stated with its source and the drag is called an illustration (acceptance 5).
        const theorem = lesson.formulaBlocks.find(block => block.id === 'pascal-points')!.explanation[language];
        expect(theorem).toMatch(language === 'sl' ? /Izrek \(Pascal\)[\s\S]*FMF[\s\S]*ilustracija/ : /Theorem \(Pascal\)[\s\S]*FMF[\s\S]*illustration/);
        expect(step('pascal-drag')).toMatch(language === 'sl' ? /ilustrira[\s\S]*ne dokaže/ : /illustrates[\s\S]*does not prove/);
        expect(step('pascal-pappus')).toMatch(language === 'sl' ? /Pappusov izrek/ : /Pappus's theorem/);
        // The exact-arithmetic claim and the colour-free naming of the three points.
        expect(step('pascal-points')).toContain('P_1');
        expect(step('pascal-points')).toContain('P_3');
    }
});

test('K2: every point a scene step quotes, in each text field separately, is that scene\'s point', () => {
    const handleName = (e: Expected, k: number) => (e.conic === 'linePair' ? `${k < 3 ? 'A' : 'B'}_${(k % 3) + 1}` : 'ABCDEF'[k]);
    for (const language of ['sl', 'en'] as const) {
        for (const [id, e] of Object.entries(SCENES)) {
            const step = stepOf(id);
            const fields = [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])];
            const expected = new Map<string, string>();
            e.handles.forEach((p, k) => expected.set(handleName(e, k), pointTex(p)));
            e.pascal.forEach((entry, k) => { if ('at' in entry) expected.set(`P_${k + 1}`, pointTex(entry.at)); });
            let quoted = 0;
            for (const field of fields) {
                for (const match of field.matchAll(/(?<![A-Za-z_])([A-F](?:_[123])?|P_[123])=(\([^()]*\))/g)) {
                    quoted += 1;
                    expect(match[2], `${id} ${language} ${match[1]}`).toBe(expected.get(match[1]));
                }
            }
            if (e.quotedHandles.length + e.quotedPascal.length > 0) expect(quoted, `${id} ${language} quotes some point`).toBeGreaterThan(0);
        }
    }
});

test('K2: the strict scene operations refuse an unreachable index and the other graph\'s operations', () => {
    const m = mount();
    try {
        const apply = (action: LessonAction) => () => m.graph.getLessonCapabilities().apply(action);
        expect(apply({kind: 'projective', operation: 'pascal-set-index', handle: 3, index: 256})).toThrow();
        expect(apply({kind: 'projective', operation: 'pascal-set-index', handle: 3, index: -1})).toThrow();
        expect(apply({kind: 'projective', operation: 'pascal-set-index', handle: 6, index: 0})).toThrow();
        expect(apply({kind: 'projective', operation: 'move-handle', handle: 0, x: 1})).toThrow();
        expect(apply({kind: 'projective', operation: 'load-example', exampleId: 'default'})).toThrow();
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
