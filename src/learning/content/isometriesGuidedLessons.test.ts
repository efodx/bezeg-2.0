/**
 * L1 and L2 (isometries): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), every number a scene text quotes is bound to its step and sign, and the images of the first vertex, the
 * class of the composite, the rotation angle, the centre and the glide vector are recomputed here with plain exact arithmetic on integers (a
 * numerator pair over one denominator), not with the isometry kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isometryClassifyLesson, isometryDilationLesson, isometryTwoMirrorsLesson} from './isometriesGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {IsometryGraph} from '../../graphs/isometry/IsometryGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Mirror = readonly [number, number, number, number];
/** One scene: the mode, the mirrors it names (the others keep the default), the readout rows the text relies on and the LaTeX it quotes. */
interface Expected {
    readonly mode: 'mirrors' | 'classify';
    readonly count?: 1 | 2 | 3;
    readonly mirrors: readonly Mirror[];
    /** Readout rows other than the two images (Unicode minus, decimal comma); the images are recomputed. */
    readonly rows: Readonly<Record<string, string>>;
    /** LaTeX the expected-state text quotes (`{,}` is a decimal comma in Slovenian and a point in English). */
    readonly quotes: readonly string[];
}

const ROTATION = 'vrtež';
const TRANSLATION = 'vzporedni premik';
const REFLECTION = 'zrcaljenje';
const GLIDE = 'zrcalni zdrs (zrcaljenje in premik vzdolž osi)';

const L1: Record<string, Expected> = {
    'l1-first-image': {mode: 'mirrors', mirrors: [[0, 0, 1, 0], [0, 0, 2, 1]], rows: {composite: ROTATION}, quotes: ['(3,-1)']},
    'l1-second-image': {mode: 'mirrors', mirrors: [[0, 0, 1, 0], [0, 0, 2, 1]],
        rows: {composite: ROTATION, centre: '(0; 0)', angle: '53,13°', 'half-angle': '26,57°', fixed: 'ena', orientation: 'ohranjena'},
        quotes: ['(0,0)', '53{,}13^\\circ', '26{,}57^\\circ', '(1,3)']},
    'l1-turn-mirror': {mode: 'mirrors', mirrors: [[0, 0, 1, 0], [0, 0, 1, 1]],
        rows: {composite: ROTATION, centre: '(0; 0)', angle: '90°', 'half-angle': '45°'}, quotes: ['90^\\circ', '45^\\circ', '(-1,3)']},
    'l1-parallel': {mode: 'mirrors', mirrors: [[0, 0, 0, 1], [3, 0, 3, 1]],
        rows: {composite: TRANSLATION, vector: '(6; 0)', fixed: 'nobene', orientation: 'ohranjena'}, quotes: ['(6,0)', '(9,1)']},
    'l1-free': {mode: 'mirrors', mirrors: [[0, 0, 2, 1], [0, 0, 1, 0]],
        rows: {composite: ROTATION, centre: '(0; 0)', angle: '−53,13°', 'half-angle': '−26,57°'}, quotes: ['-53{,}13^\\circ']},
};
const L2: Record<string, Expected> = {
    'l2-reflection': {mode: 'classify', count: 1, mirrors: [[1, 0, 2, 1]],
        rows: {composite: REFLECTION, axis: 'x − y = 1', fixed: 'vse točke na eni premici', orientation: 'obrnjena'}, quotes: ['x-y=1', '(2,2)']},
    'l2-two-mirrors': {mode: 'classify', count: 2, mirrors: [[1, 2, 2, 2], [1, 2, 2, 3]],
        rows: {composite: ROTATION, centre: '(1; 2)', angle: '90°', fixed: 'ena', orientation: 'ohranjena'}, quotes: ['(1,2)', '90^\\circ', '(2,4)']},
    'l2-three-mirrors': {mode: 'classify', count: 3, mirrors: [[0, 0, 1, -1], [1, 1, 2, 0], [0, 0, 1, 1]],
        rows: {composite: GLIDE, axis: 'x − y = 0', vector: '(2; 2)', fixed: 'nobene', orientation: 'obrnjena'}, quotes: ['x-y=0', '(2,2)', '(3,5)']},
    'l2-fixed-points': {mode: 'classify', count: 2, mirrors: [[0, 0, 1, 0], [0, 2, 1, 2]],
        rows: {composite: TRANSLATION, vector: '(0; 4)', fixed: 'nobene', orientation: 'ohranjena'}, quotes: ['(0,4)', '(3,5)']},
    'l2-free': {mode: 'classify', count: 3, mirrors: [[0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1]],
        rows: {composite: REFLECTION, axis: 'x − y = 0', fixed: 'vse točke na eni premici', orientation: 'obrnjena'}, quotes: ['x-y=0', '(1,3)']},
};

// ---- Exact arithmetic, independent of the isometry kernel --------------------------------------------------------------------------

/** The default motif's first vertex (the demonstration's triangle, whose first vertex is (3, 1)). */
const VERTEX: readonly [number, number] = [3, 1];
/** A point with rational coordinates: numerators over one positive denominator. */
interface Q { readonly x: number; readonly y: number; readonly d: number }
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lowest = (value: Q): Q => {
    const g = gcd(gcd(value.x, value.y), value.d) || 1;
    return {x: value.x / g, y: value.y / g, d: value.d / g};
};
/** The reflection of a rational point in the line through the grid points p and q: p + (2 (w.u) / (u.u)) u - w with w = v - p and u = q - p. */
function reflect([px, py, qx, qy]: Mirror, v: Q): Q {
    const ux = qx - px;
    const uy = qy - py;
    const uu = ux * ux + uy * uy;
    const wx = v.x - px * v.d;
    const wy = v.y - py * v.d;
    const wu = wx * ux + wy * uy;
    const d = v.d * uu;
    return lowest({x: 2 * wu * ux + px * d - wx * uu, y: 2 * wu * uy + py * d - wy * uu, d});
}
const images = (mirrors: readonly Mirror[]): Q[] => {
    const result: Q[] = [];
    let current: Q = {x: VERTEX[0], y: VERTEX[1], d: 1};
    for (const mirror of mirrors) {
        current = reflect(mirror, current);
        result.push(current);
    }
    return result;
};
const minus = (n: number) => (n < 0 ? `−${-n}` : `${n}`);
const coord = (numerator: number, d: number) => (d === 1 ? minus(numerator) : `${minus(numerator)}/${d} ≈ ${minus(Number((numerator / d).toFixed(1)))}`.replace('.', ','));
const pointText = (p: Q) => `(${coord(p.x, p.d)}; ${coord(p.y, p.d)})`;
const degrees = (radians: number) => minus(Number(((radians * 180) / Math.PI).toFixed(2))).replace('.', ',') + '°';
/** The signed angle between the mirrors' directions, from their cross and dot products. */
const halfAngle = (a: Mirror, b: Mirror) => {
    const [ax, ay, bx, by] = [a[2] - a[0], a[3] - a[1], b[2] - b[0], b[3] - b[1]];
    return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mount() {
    const graph = createGraph('isometries');
    if (!(graph instanceof IsometryGraph)) throw new Error('isometries must be the isometry graph.');
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
    ['L1', isometryTwoMirrorsLesson, L1, 'two-mirrors'],
    ['L2', isometryClassifyLesson, L2, 'classifying-a-motion'],
] as const)('%s', (name, lesson, scenes, section) => {
    test('has five ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(5);
        const owned = getChapterOwnedLessons('isometries')!.lesson(section)!;
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
                expect({id, mode: state.mode}).toEqual({id, mode: expected.mode});
                if (expected.count) expect({id, count: state.motionLength}).toEqual({id, count: expected.count});
                const named = expected.mirrors.map((_, i) => [state.mirrors[i].p.x, state.mirrors[i].p.y, state.mirrors[i].q.x, state.mirrors[i].q.y]);
                expect({id, mirrors: named}).toEqual({id, mirrors: expected.mirrors.map(mirror => [...mirror])});
                for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: readout(row)}).toEqual({id, row, text});
                // The images of the first vertex: after the first mirror and at the end, recomputed.
                const chain = images(expected.mirrors);
                expect({id, first: readout('first-image'), last: readout('last-image')})
                    .toEqual({id, first: pointText(chain[0]), last: pointText(chain[chain.length - 1])});
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
                for (const quote of expected.quotes) {
                    const wanted = language === 'sl' ? quote : quote.replace(/\{,\}/g, '.');
                    expect({id: step.id, language, quote: wanted, found: state.includes(wanted)}).toEqual({id: step.id, language, quote: wanted, found: true});
                }
            }
        }
    });
});

test('L1: two mirrors through a point turn by twice their angle, parallel mirrors translate by twice their distance, and the order flips the sign', () => {
    const rotation = (mirrors: readonly Mirror[]) => 2 * halfAngle(mirrors[0], mirrors[1]);
    expect(degrees(rotation(L1['l1-second-image'].mirrors))).toBe(L1['l1-second-image'].rows.angle);
    expect(degrees(halfAngle(...(L1['l1-second-image'].mirrors as [Mirror, Mirror])))).toBe(L1['l1-second-image'].rows['half-angle']);
    expect(degrees(rotation(L1['l1-turn-mirror'].mirrors))).toBe(L1['l1-turn-mirror'].rows.angle);
    expect(degrees(rotation(L1['l1-free'].mirrors))).toBe(L1['l1-free'].rows.angle);
    expect(degrees(halfAngle(...(L1['l1-free'].mirrors as [Mirror, Mirror])))).toBe(L1['l1-free'].rows['half-angle']);
    // The rotation centre is fixed by both reflections and the image of the vertex stays at its distance (squared, in integers).
    const [first, last] = images(L1['l1-second-image'].mirrors);
    expect({first, last}).toEqual({first: {x: 3, y: -1, d: 1}, last: {x: 1, y: 3, d: 1}});
    expect(VERTEX[0] ** 2 + VERTEX[1] ** 2).toBe(last.x ** 2 + last.y ** 2);
    // Parallel mirrors x = 0 and x = 3: the translation is twice the distance, perpendicular to the mirrors, and equals last - vertex.
    const [, translated] = images(L1['l1-parallel'].mirrors);
    expect([translated.x - VERTEX[0], translated.y - VERTEX[1]]).toEqual([2 * 3, 0]);
    // Swapping the mirrors of step 2 gives the images of step 5 (13/5, 9/5), then (13/5, -9/5).
    const [swappedFirst, swappedLast] = images(L1['l1-free'].mirrors);
    expect({swappedFirst, swappedLast}).toEqual({swappedFirst: {x: 13, y: 9, d: 5}, swappedLast: {x: 13, y: -9, d: 5}});
});

test('L2: the class follows from the parity of the mirrors, the fixed points and the glide vector, recomputed', () => {
    // One mirror x - y = 1 maps (x, y) to (y + 1, x - 1): the vertex (3, 1) goes to (2, 2), a fixed point of the map.
    expect(images(L2['l2-reflection'].mirrors)).toEqual([{x: 2, y: 2, d: 1}]);
    // Two mirrors y = 2 and y = x + 1 through (1, 2) meet at 45 degrees: a rotation by 90 degrees about (1, 2), (3, 1) to (3, 3) to (2, 4).
    expect(images(L2['l2-two-mirrors'].mirrors)).toEqual([{x: 3, y: 3, d: 1}, {x: 2, y: 4, d: 1}]);
    expect(degrees(2 * halfAngle(L2['l2-two-mirrors'].mirrors[0], L2['l2-two-mirrors'].mirrors[1]))).toBe('90°');
    expect(2 ** 2 + 1 ** 2).toBe(1 ** 2 + 2 ** 2);
    // Three mirrors y = -x, x + y = 2, y = x: a glide along y = x by (2, 2); the vertex goes (3, 1) -> (-1, -3) -> (3, 5), and its reflection in y = x is (1, 3).
    const glide = images(L2['l2-three-mirrors'].mirrors);
    expect(glide.map(p => [p.x, p.y])).toEqual([[-1, -3], [5, 3], [3, 5]]);
    const reflected = reflect([0, 0, 1, 1], {x: 3, y: 1, d: 1});
    expect([reflected.x, reflected.y]).toEqual([1, 3]);
    expect([glide[2].x - reflected.x, glide[2].y - reflected.y]).toEqual([2, 2]);
    // Parallel mirrors y = 0 and y = 2 translate by (0, 4); no point is fixed because the vector is nonzero.
    const shifted = images(L2['l2-fixed-points'].mirrors);
    expect([shifted[1].x - VERTEX[0], shifted[1].y - VERTEX[1]]).toEqual([0, 2 * 2]);
    // Three mirrors through the origin at 0, 45 and 90 degrees compose to the reflection in the line at 0 - 45 + 90 = 45 degrees, y = x: (3, 1) -> (1, 3).
    const free = images(L2['l2-free'].mirrors);
    expect([free[2].x, free[2].y]).toEqual([1, 3]);
    // The parity of the number of mirrors fixes the orientation: odd reverses it (reflection, glide), even keeps it (rotation, translation).
    expect(Object.values(L2).map(scene => [scene.mirrors.length, scene.rows.orientation])).toEqual([[1, 'obrnjena'], [2, 'ohranjena'], [3, 'obrnjena'], [2, 'ohranjena'], [3, 'obrnjena']]);
});

// ---- L3: central dilation and similarity -----------------------------------------------------------------------------------------

/** An exact fraction: lowest terms, positive denominator. */
interface Fr { readonly n: number; readonly d: number }
const fr = (n: number, d = 1): Fr => {
    const g = gcd(n, d) || 1;
    const s = d < 0 ? -1 : 1;
    return {n: (s * n) / g, d: (s * d) / g};
};
const add = (a: Fr, b: Fr) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a: Fr, b: Fr) => fr(a.n * b.n, a.d * b.d);
const sub = (a: Fr, b: Fr) => add(a, fr(-b.n, b.d));
type Pt = readonly [Fr, Fr];
const MOTIF: readonly Pt[] = [[fr(0), fr(0)], [fr(4), fr(0)], [fr(0), fr(3)]];
/** The signed area of a polygon by the shoelace formula; the sign is the orientation. */
const signedArea = (p: readonly Pt[]): Fr => {
    let total = fr(0);
    for (let i = 0; i < p.length; i++) {
        const [a, b] = [p[i], p[(i + 1) % p.length]];
        total = add(total, sub(mul(a[0], b[1]), mul(b[0], a[1])));
    }
    return mul(total, fr(1, 2));
};

interface Dilation {
    readonly centre: readonly [number, number];
    readonly k: Fr;
    /** The rotation about the centre: identity, or the Pythagorean turn with cosine 3/5 and sine 4/5. */
    readonly turn: 'r0' | 'pythagorean';
    /** The quantities the scene text states. */
    readonly states: readonly ('image' | 'side' | 'area' | 'areas' | 'fixed' | 'isometry' | 'orientation')[];
}
const L3: Record<string, Dilation> = {
    'l3-image': {centre: [1, 1], k: fr(3, 2), turn: 'r0', states: ['image', 'fixed']},
    'l3-ratio': {centre: [1, 1], k: fr(3), turn: 'r0', states: ['side', 'area', 'areas', 'isometry']},
    'l3-negative': {centre: [1, 1], k: fr(-1, 2), turn: 'r0', states: ['image', 'side', 'areas', 'orientation']},
    'l3-similarity': {centre: [1, 1], k: fr(3, 2), turn: 'pythagorean', states: ['image', 'fixed', 'areas']},
    'l3-free': {centre: [1, 1], k: fr(2), turn: 'r0', states: ['image', 'fixed', 'areas', 'isometry']},
};

/** P' = C + k R (P - C) with exact fractions, independent of the isometry kernel. */
const dilate = (spec: Dilation, p: Pt): Pt => {
    const [cx, cy] = [fr(spec.centre[0]), fr(spec.centre[1])];
    const [dx, dy] = [sub(p[0], cx), sub(p[1], cy)];
    const [c, s] = spec.turn === 'r0' ? [fr(1), fr(0)] : [fr(3, 5), fr(4, 5)];
    return [add(cx, mul(spec.k, sub(mul(c, dx), mul(s, dy)))), add(cy, mul(spec.k, add(mul(s, dx), mul(c, dy))))];
};
const abs = (a: Fr) => fr(Math.abs(a.n), a.d);
const figures = (spec: Dilation) => {
    const image = MOTIF.map(p => dilate(spec, p));
    const [before, after] = [signedArea(MOTIF), signedArea(image)];
    const side = abs(spec.k);
    return {
        image, area: abs(before), imageArea: abs(after), areaRatio: fr(after.n * before.d, after.d * before.n), side,
        orientationKept: after.n * before.n > 0, isometry: side.n === 1 && side.d === 1,
        fixedAll: spec.k.n === 1 && spec.k.d === 1 && spec.turn === 'r0',
    };
};

/** The readout formatting: Unicode minus, a fraction with its value to at most two decimals, the decimal comma in Slovenian. */
const fmt = (a: Fr, language: 'sl' | 'en') => {
    const sign = (n: number) => (n < 0 ? '−' : '') + Math.abs(n);
    const dec = String(Number((a.n / a.d).toFixed(2))).replace('-', '−').replace('.', language === 'sl' ? ',' : '.');
    return a.d === 1 ? sign(a.n) : `${sign(a.n)}/${a.d} ≈ ${dec}`;
};
const fmtPoint = (p: Pt, language: 'sl' | 'en') => (language === 'sl' ? `(${fmt(p[0], language)}; ${fmt(p[1], language)})` : `(${fmt(p[0], language)}, ${fmt(p[1], language)})`);
/** The LaTeX a text quotes for a fraction: `3`, `\tfrac32`, `\tfrac{13}{10}`, with a leading minus. */
const tex = (a: Fr) => {
    const [n, d] = [Math.abs(a.n), a.d];
    const body = d === 1 ? `${n}` : `${n}`.length + `${d}`.length === 2 ? `\\tfrac${n}${d}` : `\\tfrac{${n}}{${d}}`;
    return (a.n < 0 ? '-' : '') + body;
};

describe('L3 (batch B)', () => {
    const lesson = isometryDilationLesson;
    const LANGS = ['sl', 'en'] as const;
    const everyText = () => {
        const texts: {where: string; language: 'sl' | 'en'; text: string}[] = [];
        const put = (where: string, t: {sl: string; en: string}) => LANGS.forEach(language => texts.push({where, language, text: t[language]}));
        put('title', lesson.title); put('summary', lesson.summary);
        lesson.prerequisites.forEach((t, i) => put(`prerequisite ${i}`, t)); lesson.learningGoals.forEach((t, i) => put(`goal ${i}`, t));
        lesson.edgeCases.forEach((t, i) => put(`edge ${i}`, t));
        for (const step of lesson.steps) {
            put(`${step.id} title`, step.title); put(`${step.id} purpose`, step.purpose); put(`${step.id} explanation`, step.explanation);
            put(`${step.id} prompt`, step.observationPrompt); put(`${step.id} scene`, step.scene!.expectedState);
            step.expectedObservations.forEach((t, i) => put(`${step.id} observation ${i}`, t));
        }
        for (const f of lesson.formulaBlocks) { put(`${f.id} notation`, f.notation); put(`${f.id} explanation`, f.explanation); }
        for (const e of lesson.workedExamples) { put(`${e.id} title`, e.title); put(`${e.id} check`, e.check); }
        return texts;
    };

    test('has five ordered steps with a scene each, a worked example, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5]);
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(L3));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(5);
        expect(lesson.workedExamples.length).toBeGreaterThan(0);
        expect(lesson.steps.find(step => step.workedExampleId)?.workedExampleId).toBe(lesson.workedExamples[0].id);
        const owned = getChapterOwnedLessons('isometries')!.lesson('dilation-similarity')!;
        expect(owned.id).toBe('isometries-dilation');
        expect(owned.steps).toHaveLength(5);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test.each(['sl', 'en'] as const)('%s: every scene lands in the stated state and readouts, in one synchronous sequence, out of order and twice', language => {
        setLanguage(language);
        const m = mount();
        try {
            const ids = Object.keys(L3);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const spec = L3[id];
                m.scene(lesson, id);
                m.scene(lesson, id);
                const f = figures(spec);
                const state = m.graph.state;
                expect({id, mode: state.mode, centre: [state.dilationCentre.x, state.dilationCentre.y], k: state.dilationK})
                    .toEqual({id, mode: 'similarity', centre: [...spec.centre], k: spec.k.n / spec.k.d});
                const wantedRows = {
                    'side-ratio': fmt(f.side, language), 'area-ratio': fmt(f.areaRatio, language),
                    area: `${fmt(f.area, language)} → ${fmt(f.imageArea, language)}`,
                    orientation: language === 'sl' ? (f.orientationKept ? 'ohranjena' : 'obrnjena') : (f.orientationKept ? 'kept' : 'reversed'),
                    isometry: language === 'sl' ? (f.isometry ? 'da' : 'ne') : (f.isometry ? 'yes' : 'no'),
                    'image-1': fmtPoint(f.image[0], language),
                    fixed: f.fixedAll ? (language === 'sl' ? 'vse točke' : 'all points') : fmtPoint([fr(spec.centre[0]), fr(spec.centre[1])], language),
                };
                for (const [row, text] of Object.entries(wantedRows)) expect({id, row, text: readout(row)}).toEqual({id, row, text});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the quantities each scene text states are the recomputed ones, in both languages', () => {
        for (const step of lesson.steps) {
            const spec = L3[step.id];
            const f = figures(spec);
            const quotes: string[] = [`k=${tex(spec.k)}`, `(${spec.centre[0]},${spec.centre[1]})`];
            if (spec.states.includes('image')) quotes.push(`(${tex(f.image[0][0])},${tex(f.image[0][1])})`);
            if (spec.states.includes('side')) quotes.push(`\\(${tex(f.side)}\\)`);
            if (spec.states.includes('areas')) quotes.push(`\\(${tex(f.areaRatio)}\\)`);
            if (spec.states.includes('area')) quotes.push(`${tex(f.area)}\\mapsto${tex(f.imageArea)}`);
            for (const language of LANGS) {
                const state = step.scene!.expectedState[language];
                for (const quote of quotes) expect({id: step.id, language, quote, found: state.includes(quote)}).toEqual({id: step.id, language, quote, found: true});
                if (spec.states.includes('isometry')) {
                    const word = language === 'sl' ? (f.isometry ? 'izometrija da' : 'izometrija ne') : (f.isometry ? 'isometry yes' : 'isometry no');
                    expect({id: step.id, language, word, found: state.includes(word)}).toEqual({id: step.id, language, word, found: true});
                }
                if (spec.states.includes('orientation')) {
                    const word = language === 'sl' ? (f.orientationKept ? 'ohranjena' : 'obrnjena') : (f.orientationKept ? 'kept' : 'reversed');
                    expect({id: step.id, language, word, found: state.includes(word)}).toEqual({id: step.id, language, word, found: true});
                }
            }
        }
    });

    test('the mathematics: images, side and area ratios, orientation, fixed point, and isometry only at |k|=1', () => {
        const at = (id: string) => figures(L3[id]);
        expect(at('l3-image').image[0]).toEqual([fr(-1, 2), fr(-1, 2)]);
        expect(at('l3-ratio').image[0]).toEqual([fr(-2), fr(-2)]);
        expect(at('l3-negative').image[0]).toEqual([fr(3, 2), fr(3, 2)]);
        expect(at('l3-similarity').image[0]).toEqual([fr(13, 10), fr(-11, 10)]);
        expect(at('l3-free').image[0]).toEqual([fr(-1), fr(-1)]);
        expect([at('l3-ratio').area, at('l3-ratio').imageArea]).toEqual([fr(6), fr(54)]);
        const sq = (p: Pt, q: Pt) => add(mul(sub(p[0], q[0]), sub(p[0], q[0])), mul(sub(p[1], q[1]), sub(p[1], q[1])));
        for (const id of Object.keys(L3)) {
            const f = at(id);
            expect(f.areaRatio).toEqual(mul(L3[id].k, L3[id].k));
            expect(f.orientationKept).toBe(true);
            // every side of the image is |k| times the side of the motif (squared lengths, exact)
            for (let i = 0; i < 3; i++) {
                expect(sq(f.image[i], f.image[(i + 1) % 3])).toEqual(mul(sq(MOTIF[i], MOTIF[(i + 1) % 3]), mul(f.side, f.side)));
            }
            expect(f.isometry).toBe(Math.abs(L3[id].k.n / L3[id].k.d) === 1);
            // the centre is fixed by the dilation and by the dilation with the rotation
            expect(dilate(L3[id], [fr(1), fr(1)])).toEqual([fr(1), fr(1)]);
        }
        // only k = 1 and k = -1 make an isometry: k = -1 is the half-turn about the centre, (0,0) -> (2,2)
        const halfTurn: Dilation = {centre: [1, 1], k: fr(-1), turn: 'r0', states: []};
        expect(figures(halfTurn).isometry).toBe(true);
        expect(dilate(halfTurn, [fr(0), fr(0)])).toEqual([fr(2), fr(2)]);
        expect(figures({...halfTurn, k: fr(1)}).fixedAll).toBe(true);
        expect(figures({...halfTurn, k: fr(1, 4)}).isometry).toBe(false);
        // the worked example: A = 3/2 * 1/5 (3 -4; 4 3) sends (-1,-1) to (3/10, -21/10); its squared length is (3/2)^2 * 2
        const ex = dilate(L3['l3-similarity'], [fr(0), fr(0)]);
        expect([sub(ex[0], fr(1)), sub(ex[1], fr(1))]).toEqual([fr(3, 10), fr(-21, 10)]);
        expect(add(mul(fr(3, 10), fr(3, 10)), mul(fr(-21, 10), fr(-21, 10)))).toEqual(mul(fr(9, 4), fr(2)));
    });

    test('sl and en quote the same numbers in every field of the lesson', () => {
        const numbers = (text: string) => text.replace(/\{,\}/g, '.').match(/\d+(?:\.\d+)?/g) ?? [];
        const bySl = new Map<string, string>();
        for (const {where, language, text} of everyText()) {
            if (language === 'sl') bySl.set(where, text);
            else expect({where, numbers: numbers(text)}).toEqual({where, numbers: numbers(bySl.get(where)!)});
        }
    });

    test('math is delimited: no control characters, balanced delimiters, no doubled backslashes outside matrices, no {,} in English', () => {
        for (const {where, language, text} of everyText()) {
            expect({where, language, control: /[\u0000-\u001f]/.test(text)}).toEqual({where, language, control: false});
            expect({where, language, doubled: /\\\\/.test(text.replace(/\\begin\{pmatrix\}.*?\\end\{pmatrix\}/g, ''))}).toEqual({where, language, doubled: false});
            expect({where, language, balanced: (text.match(/\\\(/g) ?? []).length === (text.match(/\\\)/g) ?? []).length}).toEqual({where, language, balanced: true});
            if (language === 'en') expect({where, comma: text.includes('{,}')}).toEqual({where, comma: false});
        }
    });

    test('no step reveals its prediction in its title, purpose, explanation, prompt, formulas or worked example', () => {
        const forbidden = (id: string, language: 'sl' | 'en'): RegExp[] => {
            switch (id) {
                case 'l3-image': return [/tfrac12/, /tfrac\{1\}/];
                case 'l3-ratio': return [/(?<!\d)9(?!\d)/, /54/, /k\^2/];
                case 'l3-negative': return [/tfrac14/, language === 'sl' ? /ohranj|polobrat/ : /kept|half-turn|preserv/];
                case 'l3-similarity': return [language === 'sl' ? /ostane|še vedno|ne premakne/ : /stays|still|does not move/, /tfrac\{13\}\{10\}/];
                case 'l3-free': return [/\|k\|=1/, /k=-?1(?!\d)/, /pm1/];
                default: return [];
            }
        };
        for (const step of lesson.steps) {
            for (const language of LANGS) {
                const formulas = step.formulaIds.map(id => lesson.formulaBlocks.find(f => f.id === id)!);
                const example = lesson.workedExamples.find(e => e.id === step.workedExampleId);
                const shown = [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language],
                    ...formulas.flatMap(f => [f.latex, f.notation[language], f.explanation[language]]), ...(example ? [example.title[language], example.check[language]] : [])].join(' ');
                for (const pattern of forbidden(step.id, language)) {
                    expect({id: step.id, language, pattern: String(pattern), leaked: pattern.test(shown)}).toEqual({id: step.id, language, pattern: String(pattern), leaked: false});
                }
            }
        }
    });

    test('the edge case k=0 says the field does not accept it, and the summary no longer carries the negative-ratio half-turn', () => {
        expect(lesson.edgeCases.some(t => t.sl.includes('k=0') && t.sl.includes('polje ga ne sprejme') && t.en.includes('the field does not accept it'))).toBe(true);
        expect({sl: /polobrat/.test(lesson.summary.sl), en: /half-turn/.test(lesson.summary.en)}).toEqual({sl: false, en: false});
    });

    test('the lesson and chapter sources contain no single-backslash math delimiters', () => {
        for (const file of ['isometriesGuidedLessons.ts', 'isometriesChapter.ts']) {
            const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), file), 'utf8');
            expect({file, single: (source.match(/(^|[^\\])\\[()[\]]/gm) ?? []).length}).toEqual({file, single: 0});
        }
    });
});
