/**
 * L1 and L2 (isometries): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), every number a scene text quotes is bound to its step and sign, and the images of the first vertex, the
 * class of the composite, the rotation angle, the centre and the glide vector are recomputed here with plain exact arithmetic on integers (a
 * numerator pair over one denominator), not with the isometry kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {isometryClassifyLesson, isometryTwoMirrorsLesson} from './isometriesGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
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
