/**
 * KN1 and KN2 (curve-kinematics): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), and every number a step quotes is bound to its step. The expected values are computed here from the closed-form
 * motion formulas (the cycloid r = (t - sin t; 1 - cos t) and the circle of radius 1 with the angle t + b sin t), not from the kinematics kernel or the
 * graph, and compared with the real readouts; the quoted numbers are generated from the same values and looked up in the sl and en prose. The changes the
 * text asks the learner to make are applied as actions and the readouts checked. KN3 (projectile) and KN4 (uniform circle) follow the same pattern with
 * their own closed forms (g = 9,81; R = 2, omega = 1,5) at the end of the file.
 */
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {kinematicsCircularLesson, kinematicsProjectileLesson, kinematicsSpeedLesson, kinematicsVectorsLesson} from './kinematicsGuidedLessons';
import {kinematicsGuidedExampleLesson} from './kinematicsChapterRegistry';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {KinematicsGraph} from '../../graphs/curves/kinematics/KinematicsGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- closed-form motions (independent of the graph and the kernel) ------------------------------------------------------------------

type V = readonly [number, number];
interface Motion { readonly r: V; readonly v: V; readonly a: V }
const cycloid = (t: number): Motion => ({r: [t - Math.sin(t), 1 - Math.cos(t)], v: [1 - Math.cos(t), Math.sin(t)], a: [Math.sin(t), Math.cos(t)]});
/** Circle of radius R with the angle theta(t) = w t + b sin(w t); here w = 1. */
function circle(t: number, b: number, radius = 1): Motion {
    const theta = t + b * Math.sin(t);
    const rate = 1 + b * Math.cos(t);
    const rateDot = -b * Math.sin(t);
    const tangent: V = [-Math.sin(theta), Math.cos(theta)];
    const outward: V = [Math.cos(theta), Math.sin(theta)];
    return {
        r: [radius * outward[0], radius * outward[1]],
        v: [radius * rate * tangent[0], radius * rate * tangent[1]],
        a: [radius * rateDot * tangent[0] - radius * rate * rate * outward[0], radius * rateDot * tangent[1] - radius * rate * rate * outward[1]],
    };
}
const uniform = (t: number) => circle(t, 0);
const norm2 = (v: V) => Math.hypot(v[0], v[1]);
const cross = (u: V, w: V) => u[0] * w[1] - u[1] * w[0];
const dot = (u: V, w: V) => u[0] * w[0] + u[1] * w[1];
/** The moment at which theta(t) = t + b sin t reaches pi/2, by bisection (theta is increasing for b < 1). */
function quarterTurn(b: number): number {
    let lo = 0;
    let hi = Math.PI;
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (mid + b * Math.sin(mid) < Math.PI / 2) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
}

// ---- number formats --------------------------------------------------------------------------------------------------------------------

const MINUS = '−';
/** A readout number: up to `digits` decimals, no trailing zeros, decimal comma, true minus sign, no negative zero. */
function readoutNumber(value: number, digits = 3): string {
    const text = Number(value.toFixed(digits)).toString();
    return (text === '-0' ? '0' : text).replace('-', MINUS).replace('.', ',');
}
const vectorText = (v: V, unit: string) => `(${readoutNumber(v[0])}; ${readoutNumber(v[1])}) ${unit}`;
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
/** The prose spelling of a number in `language`: ASCII minus, `{,}` for the Slovenian comma before the prose is normalized to a plain comma. */
function proseNumber(value: number, digits: number, language: 'sl' | 'en'): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
/** Prose with the LaTeX spacing and the decimal-comma braces removed, so that `-1{,}218` reads -1,218 and `1.12\ \mathrm{s}` reads 1.12. */
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ').replace(/\\mathrm\{([^}]*)\}/g, ' $1 ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));

// ---- the graph -----------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mountKinematics() {
    const graph = createGraph('curve-kinematics');
    if (!(graph instanceof KinematicsGraph)) throw new Error('curve-kinematics must be the kinematics graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const scene = (lesson: GuidedLesson, stepId: string, ...extra: LessonAction[]) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
        for (const action of extra) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    return {graph, mounted, capabilities, checkpoint, scene, learner};
}
const time = (value: number): LessonAction => ({kind: 'kinematics', operation: 'set-time', t: value});
const params = (patch: Omit<Extract<LessonAction, {kind: 'kinematics'; operation: 'set-params'}>, 'kind' | 'operation'>): LessonAction => ({kind: 'kinematics', operation: 'set-params', ...patch});

/** The readout rows the closed-form motion gives for the time `t` (position, velocity, speed, acceleration and, off a standstill, the four derived rows). */
function expectedRows(motion: Motion, t: number, readoutTime = t): Record<string, string> {
    const speed = norm2(motion.v);
    const rows: Record<string, string> = {
        time: `${readoutNumber(readoutTime, 2)} s`,
        position: vectorText(motion.r, 'm'),
        velocity: vectorText(motion.v, 'm/s'),
        speed: `${readoutNumber(speed)} m/s`,
        acceleration: vectorText(motion.a, 'm/s²'),
    };
    if (speed > 1e-9) {
        rows['a-t'] = `${readoutNumber(dot(motion.a, motion.v) / speed)} m/s²`;
        rows['a-n'] = `${readoutNumber(cross(motion.v, motion.a) / speed)} m/s²`;
        rows.kappa = `${readoutNumber(cross(motion.v, motion.a) / speed ** 3)} 1/m`;
        rows['kappa-v2'] = `${readoutNumber(cross(motion.v, motion.a) / speed)} m/s²`;
    }
    return rows;
}

interface Quote { readonly value: number; readonly digits: number }
const q = (value: number, digits = 3): Quote => ({value, digits});

interface Expected {
    readonly motion: 'cycloid' | 'circular';
    readonly state: Readonly<Record<string, unknown>>;
    readonly t: number;
    readonly rows: Record<string, string>;
    /** Rows that read "not defined" (a standstill). */
    readonly undefinedRows?: readonly string[];
    /** Numbers the step's expected-state text quotes. */
    readonly quotes: readonly Quote[];
    /** Numbers quoted by the step's explanation, observations or worked example but not by its expected-state text. */
    readonly also?: readonly Quote[];
}

const OFF = {showVelocity: false, showAcceleration: false};
const kn1 = (motionAt: number, state: Record<string, unknown>, quotes: readonly Quote[], also: readonly Quote[] = [], undefinedRows?: readonly string[]): Expected =>
    ({motion: 'cycloid', state, t: motionAt, rows: expectedRows(cycloid(motionAt), motionAt), undefinedRows, quotes, also});
const circ = (t: number, state: Record<string, unknown>, quotes: readonly Quote[], also: readonly Quote[] = [], readoutTime = t): Expected =>
    ({motion: 'circular', state: {radius: 1, omega: 1, b: 0.5, ...state}, t, rows: expectedRows(circle(t, 0.5), t, readoutTime), quotes, also});

const HALF_PI = Math.PI / 2;
const TOP = quarterTurn(0.5);
const KN1: Record<string, Expected> = {
    'kn1-start': kn1(0, OFF, [], [], ['a-t', 'a-n', 'kappa', 'kappa-v2']),
    'kn1-trace': kn1(HALF_PI, OFF, [q(cycloid(HALF_PI).r[0]), q(cycloid(HALF_PI).r[1])], [q(HALF_PI, 2)]),
    'kn1-velocity': kn1(HALF_PI, {showVelocity: true, showAcceleration: false}, [q(cycloid(HALF_PI).v[0]), q(norm2(cycloid(HALF_PI).v))]),
    'kn1-acceleration': kn1(Math.PI, {showVelocity: true, showAcceleration: true}, [q(cycloid(Math.PI).v[0]), q(cycloid(Math.PI).a[1])]),
    'kn1-cusp': kn1(0, {showVelocity: true, showAcceleration: true}, [q(cycloid(0).a[1])], [], ['a-t', 'a-n', 'kappa', 'kappa-v2']),
    'kn1-explore': kn1(HALF_PI, {showVelocity: true, showAcceleration: true}, []),
};
const KN2: Record<string, Expected> = {
    'kn2-race': circ(0, OFF, [q(circle(0, 0.5).r[0])]),
    'kn2-top': circ(TOP, OFF, [q(TOP, 4), q(TOP, 2), q(circle(TOP, 0.5).r[1])], [q(HALF_PI, 4)], TOP),
    'kn2-speed': circ(0, {showVelocity: true, showAcceleration: false}, [q(norm2(circle(0, 0.5).v))], [q(norm2(uniform(1).v))]),
    'kn2-tangent': circ(TOP, {showVelocity: true, showAcceleration: false}, [q(circle(TOP, 0.5).v[0])], [q(uniform(HALF_PI).v[0])]),
    'kn2-acceleration': circ(HALF_PI, {split: true}, [
        q(dot(circle(HALF_PI, 0.5).a, circle(HALF_PI, 0.5).v) / norm2(circle(HALF_PI, 0.5).v)),
        q(cross(circle(HALF_PI, 0.5).v, circle(HALF_PI, 0.5).a) / norm2(circle(HALF_PI, 0.5).v)),
        q(1),
    ]),
    'kn2-invariant': circ(Math.PI, {split: true}, [
        q(norm2(circle(Math.PI, 0.5).v)),
        q(cross(circle(Math.PI, 0.5).v, circle(Math.PI, 0.5).a) / norm2(circle(Math.PI, 0.5).v)),
        q(1),
    ], [q(norm2(circle(0, 0.5).v) ** 2), q(2 * Math.PI)]),
    'kn2-explore': circ(HALF_PI, {showVelocity: true, showAcceleration: true}, []),
};

const lessons = [
    ['KN1', kinematicsVectorsLesson, KN1, 'position-velocity-acceleration', 6],
    ['KN2', kinematicsSpeedLesson, KN2, 'speed-and-parametrization', 7],
] as const;

describe.each(lessons)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('kinematics')!.lesson(section)!;
        expect(owned.steps).toHaveLength(count);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test(`${name}: the numbers each step quotes are those of its scene, in both languages`, () => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            const calculations = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId).map(example => example.check ? [example.check.sl, example.check.en] : []).flat();
            for (const language of ['sl', 'en'] as const) {
                const state = step.scene!.expectedState[language];
                const everything = [state, step.explanation[language], ...step.expectedObservations.map(o => o[language]), ...calculations].join(' ');
                for (const quote of expected.quotes) {
                    const value = proseNumber(quote.value, quote.digits, language);
                    expect({id: step.id, language, value, inState: hasNumber(state, value)}).toEqual({id: step.id, language, value, inState: true});
                }
                for (const quote of [...expected.quotes, ...(expected.also ?? [])]) {
                    const value = proseNumber(quote.value, quote.digits, language);
                    expect({id: step.id, language, value, inText: hasNumber(everything, value)}).toEqual({id: step.id, language, value, inText: true});
                }
            }
        }
    });
});

function checkScenes(lesson: GuidedLesson, scenes: Record<string, Expected>) {
    const m = mountKinematics();
    try {
        const ids = Object.keys(scenes);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = scenes[id];
            m.scene(lesson, id);
            m.scene(lesson, id);
            expect({id, motion: m.graph.state.motion, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, (m.graph.state as unknown as Record<string, unknown>)[key]]))})
                .toEqual({id, motion: expected.motion, ...expected.state});
            expect({id, timeOff: Math.abs(m.graph.time - expected.t) < 5e-5}).toEqual({id, timeOff: true}); // the text quotes the moment to four decimals
            for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
            for (const row of expected.undefinedRows ?? []) expect({id, row, text: readout(row)}).toEqual({id, row, text: expect.stringMatching(/ni določen/)});
        }
    } finally {
        m.mounted.view.unmount();
    }
}

test('KN1: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    checkScenes(kinematicsVectorsLesson, KN1);
});

test('KN2: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    checkScenes(kinematicsSpeedLesson, KN2);
});

test('the closed-form formulas reproduce the quoted reference values (cusp, top of the arch, the quarter turn)', () => {
    expect(cycloid(0).v).toEqual([0, 0]);
    expect(cycloid(Math.PI).v[0]).toBeCloseTo(2, 12);
    expect(cycloid(Math.PI).a[1]).toBeCloseTo(-1, 12);
    expect(TOP).toBeCloseTo(1.1206, 4);
    expect(circle(TOP, 0.5).r[0]).toBeCloseTo(0, 12);
    expect(circle(TOP, 0.5).r[1]).toBeCloseTo(1, 12);
    expect(norm2(uniform(1.234).v)).toBeCloseTo(1, 12);
});

test('KN2: the changes the text asks the learner to make give the stated readouts', () => {
    const m = mountKinematics();
    try {
        // Step 3: the time slider at 1,57 and 3,14, then (the text predicts t = pi) the speed there.
        m.scene(kinematicsSpeedLesson, 'kn2-speed');
        expect(stripped(readout('speed'))).toBe(stripped(`${readoutNumber(norm2(circle(0, 0.5).v))} m/s`));
        for (const seconds of [1.57, 3.14, Math.PI]) {
            m.learner(time(seconds));
            expect({seconds, speed: stripped(readout('speed'))}).toEqual({seconds, speed: stripped(`${readoutNumber(norm2(circle(seconds, 0.5).v))} m/s`)});
        }
        expect(norm2(circle(1.57, 0.5).v)).toBeCloseTo(1, 3);
        expect(norm2(circle(3.14, 0.5).v)).toBeCloseTo(0.5, 3);
        m.learner(time(3.14));
        expect(stripped(readout('speed'))).toBe(stripped('0,5 m/s'));
        // Step 7: b from 0 to 0,9 in steps of 0,05; at b = 0 the readouts are those of the uniform motion.
        m.scene(kinematicsSpeedLesson, 'kn2-explore');
        for (let step = 0; step <= 18; step++) {
            const b = step * 0.05;
            m.learner(params({b: Number(b.toFixed(2))}), time(Math.PI));
            const expected = expectedRows(circle(Math.PI, b), Math.PI, 3.14);
            expect({b, speed: stripped(readout('speed')), kappa: stripped(readout('kappa'))})
                .toEqual({b, speed: stripped(expected.speed), kappa: stripped(expected.kappa)});
            expect({b, position: stripped(readout('position'))}).toEqual({b, position: stripped(expected.position)});
        }
        expect(stripped(readout('speed'))).toBe(stripped('0,1 m/s'));
        m.learner(params({b: 0}));
        expect(stripped(readout('a-t'))).toBe(stripped('0 m/s²'));
        // The kappa v^2 row equals the normal acceleration on the split scenes (kn2-invariant).
        m.scene(kinematicsSpeedLesson, 'kn2-invariant');
        expect(stripped(readout('kappa-v2'))).toBe(stripped('0,25 m/s²'));
        expect(stripped(readout('a-t'))).toBe(stripped('0 m/s²'));
    } finally {
        m.mounted.view.unmount();
    }
});

test('KN1: the changes the text asks the learner to make (the time slider, another motion) leave consistent readouts', () => {
    const m = mountKinematics();
    try {
        m.scene(kinematicsVectorsLesson, 'kn1-trace');
        for (const seconds of [0.5, 1.5, 2.5, 2 * Math.PI]) {
            m.learner(time(seconds));
            const expected = expectedRows(cycloid(seconds), seconds, seconds);
            expect({seconds, position: stripped(readout('position')), velocity: stripped(readout('velocity'))})
                .toEqual({seconds, position: stripped(expected.position), velocity: stripped(expected.velocity)});
        }
        // Step 6: another curve from the Motion list resets the time; the cusp readout still holds (the cardioid and spiral have a cusp at t = 0).
        m.scene(kinematicsVectorsLesson, 'kn1-explore');
        for (const motion of ['cardioid', 'rose', 'spiral', 'projectile', 'circular', 'cycloid'] as const) {
            m.learner({kind: 'kinematics', operation: 'set-motion', motion});
            expect({motion, time: m.graph.time}).toEqual({motion, time: 0});
            expect(readout('speed')).toMatch(/m\/s/);
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test('restoring the checkpoint on leaving a lesson returns the free state', () => {
    const m = mountKinematics();
    try {
        const free = JSON.stringify({state: m.graph.state, time: m.graph.time});
        const freeReadouts = [...document.querySelectorAll('[data-readout]')].map(node => node.textContent);
        for (const [lesson, scenes] of [[kinematicsVectorsLesson, KN1], [kinematicsSpeedLesson, KN2]] as const) {
            for (const id of Object.keys(scenes)) m.scene(lesson, id);
            m.learner(time(1));
            expect(JSON.stringify({state: m.graph.state, time: m.graph.time})).not.toBe(free);
            act(() => { m.capabilities.restoreState(m.checkpoint); });
            expect(JSON.stringify({state: m.graph.state, time: m.graph.time})).toBe(free);
            expect([...document.querySelectorAll('[data-readout]')].map(node => node.textContent)).toEqual(freeReadouts);
        }
    } finally {
        m.mounted.view.unmount();
    }
});

// ======================================================================================================================================
// KN3 projectile motion and KN4 uniform circular motion. Every expected value below is recomputed here (g = 9,81; the circle of radius R with
// the angular velocity w), not read from the kernel or the graph, and compared with the real readouts and with the rounded values the prose quotes.
// ======================================================================================================================================

const G = 9.81;
const DEG = Math.PI / 180;
/** A throw from the ground with the speed v0 at alpha degrees, no air resistance. */
function toss(v0: number, alphaDeg: number) {
    const sin = Math.sin(alphaDeg * DEG);
    const cos = Math.cos(alphaDeg * DEG);
    return {
        T: 2 * v0 * sin / G, R: v0 * v0 * Math.sin(2 * alphaDeg * DEG) / G, H: v0 * v0 * sin * sin / (2 * G),
        vx: v0 * cos, vy: (t: number) => v0 * sin - G * t, x: (t: number) => v0 * cos * t, y: (t: number) => v0 * sin * t - G * t * t / 2,
        /** y = x tan(alpha) - k x^2 */
        k: G / (2 * v0 * v0 * cos * cos), slope: sin / cos,
        speed: (t: number) => Math.hypot(v0 * cos, v0 * sin - G * t),
    };
}
/** The uniform circle r = R (cos wt; sin wt). */
function spin(radius: number, w: number) {
    return {
        r: (t: number): V => [radius * Math.cos(w * t), radius * Math.sin(w * t)],
        v: (t: number): V => [-w * radius * Math.sin(w * t), w * radius * Math.cos(w * t)],
        a: (t: number): V => [-w * w * radius * Math.cos(w * t), -w * w * radius * Math.sin(w * t)],
        speed: w * radius, accel: w * w * radius, period: 2 * Math.PI / w,
    };
}
const P45 = toss(20, 45);
const P30 = toss(20, 30);
const P60 = toss(20, 60);
const P40 = toss(20, 40);
const P50 = toss(20, 50);
const C = spin(2, 1.5);
const C_QUARTER = Math.PI / 3;
const T_HALF = Number((P45.T / 2).toFixed(2));

interface Scene {
    readonly state: Readonly<Record<string, unknown>>;
    readonly t: number;
    readonly rows: Record<string, string>;
    /** Numbers the scene's expected-state text quotes (and so must the explanation or observations of the step). */
    readonly quotes: readonly Quote[];
    /** Numbers quoted by the explanation, observations or worked example only. */
    readonly also: readonly Quote[];
}
const projectileRows = (v0: number, alpha: number, t: number): Record<string, string> => {
    const p = toss(v0, alpha);
    return {
        time: `${readoutNumber(t, 2)} s`, position: vectorText([p.x(t), p.y(t)], 'm'), velocity: vectorText([p.vx, p.vy(t)], 'm/s'), speed: `${readoutNumber(p.speed(t))} m/s`,
        acceleration: vectorText([0, -G], 'm/s²'), flight: `${readoutNumber(p.T)} s`, range: `${readoutNumber(p.R)} m`, height: `${readoutNumber(p.H)} m`,
    };
};
const circleRows = (radius: number, w: number, t: number): Record<string, string> => {
    const c = spin(radius, w);
    return {
        time: `${readoutNumber(t, 2)} s`, position: vectorText(c.r(t), 'm'), velocity: vectorText(c.v(t), 'm/s'), speed: `${readoutNumber(c.speed)} m/s`,
        acceleration: vectorText(c.a(t), 'm/s²'), 'a-t': '0 m/s²', 'a-n': `${readoutNumber(c.accel)} m/s²`, kappa: `${readoutNumber(1 / radius)} 1/m`, period: `${readoutNumber(c.period)} s`,
    };
};
type Arrows = {readonly showVelocity: boolean; readonly showAcceleration: boolean};
const proj = (alpha: number, t: number, arrows: Arrows, quotes: readonly Quote[], also: readonly Quote[] = []): Scene =>
    ({state: {motion: 'projectile', v0: 20, alpha, ...arrows}, t, rows: projectileRows(20, alpha, t), quotes, also});
const circ4 = (t: number, arrows: Arrows, quotes: readonly Quote[], also: readonly Quote[] = []): Scene =>
    ({state: {motion: 'circular', radius: 2, omega: 1.5, ...arrows}, t, rows: circleRows(2, 1.5, t), quotes, also});
const BOTH: Arrows = {showVelocity: true, showAcceleration: true};
const VELOCITY: Arrows = {showVelocity: true, showAcceleration: false};

const KN3: Record<string, Scene> = {
    'kn3-throw': proj(45, 0, OFF, [q(P45.T), q(P45.R), q(P45.H)], [q(T_HALF, 2), q(P45.x(T_HALF)), q(P45.y(T_HALF))]),
    'kn3-velocity': proj(45, 1, VELOCITY, [q(P45.vx), q(P45.vy(1))],
        [q(P45.vy(T_HALF)), q(P45.vy(2)), q(P45.vy(2.88)), q(P45.speed(2.88)), q(2.88, 2), q(T_HALF, 2)]),
    'kn3-acceleration': proj(45, 1, BOTH, [q(-G, 2)], [q(P45.vx), q(P45.vy(2))]),
    'kn3-path': proj(45, 1, OFF, [q(P45.x(1)), q(P45.y(1))], [q(P45.k, 6), q(P45.x(1) - P45.k * P45.x(1) ** 2), q(P45.R / 2)]),
    'kn3-angles': proj(30, 0, OFF, [q(P30.R)], [q(P30.H), q(P60.H), q(P30.T), q(P60.T), q(P40.R), q(P45.R)]),
    'kn3-explore': proj(45, 0, BOTH, [q(P45.R)], [q(toss(30, 45).R), q(toss(30, 30).R)]),
};
const KN4: Record<string, Scene> = {
    'kn4-circle': circ4(0, OFF, [q(C.speed, 0), q(C.period)], [q(C.v(0)[1], 0)]),
    'kn4-velocity': circ4(C_QUARTER, VELOCITY, [q(-3, 0)], [q(C.v(0)[1], 0), q(C_QUARTER, 2), q(2.09, 2)]),
    'kn4-acceleration': circ4(C_QUARTER, BOTH, [q(-4.5, 1)], [q(C.accel, 1), q(2 * Math.PI / 3, 2)]),
    'kn4-omega': circ4(C_QUARTER, BOTH, [q(C.speed, 0), q(C.accel, 1)], [q(spin(2, 3).speed, 0), q(spin(2, 3).accel, 0), q(spin(2, 3).period)]),
    'kn4-radius': circ4(C_QUARTER, BOTH, [q(C.speed, 0), q(C.accel, 1)], [q(spin(4, 1.5).speed, 0), q(spin(4, 1.5).accel, 0), q(spin(4, 1.5).period)]),
    'kn4-speed': circ4(C_QUARTER, BOTH, [q(C.speed, 0), q(C.accel, 1)], [q(0.75, 2), q(spin(4, 0.75).accel, 2), q(spin(4, 0.75).period), q(0.25, 2)]),
    'kn4-explore': circ4(C_QUARTER, BOTH, [], [q(Math.PI / 4, 2)]),
};
const lessons34 = [
    ['KN3', kinematicsProjectileLesson, KN3, 'projectile-motion', 'curve-kinematics-projectile', 6],
    ['KN4', kinematicsCircularLesson, KN4, 'circular-motion', 'curve-kinematics-circular', 7],
] as const;

function checkScenes34(lesson: GuidedLesson, scenes: Record<string, Scene>) {
    const m = mountKinematics();
    try {
        const ids = Object.keys(scenes);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = scenes[id];
            m.scene(lesson, id);
            m.scene(lesson, id);
            expect({id, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, (m.graph.state as unknown as Record<string, unknown>)[key]]))}).toEqual({id, ...expected.state});
            expect({id, timeOff: Math.abs(m.graph.time - expected.t) < 5e-5}).toEqual({id, timeOff: true});
            for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
        }
    } finally {
        m.mounted.view.unmount();
    }
}

describe.each(lessons34)('%s content', (name, lesson, scenes, section, lessonId, count) => {
    const everyText = () => {
        const out: {where: string; language: 'sl' | 'en'; text: string}[] = [];
        const add = (where: string, value: {readonly sl: string; readonly en: string}) => { for (const language of ['sl', 'en'] as const) out.push({where, language, text: value[language]}); };
        add('title', lesson.title); add('summary', lesson.summary);
        lesson.prerequisites.forEach((t, i) => add(`prerequisite ${i}`, t)); lesson.learningGoals.forEach((t, i) => add(`goal ${i}`, t)); lesson.edgeCases.forEach((t, i) => add(`edge ${i}`, t));
        for (const f of lesson.formulaBlocks) { add(`${f.id} notation`, f.notation); add(`${f.id} explanation`, f.explanation); }
        for (const e of lesson.workedExamples ?? []) { add(`${e.id} title`, e.title); if (e.check) add(`${e.id} check`, e.check); }
        for (const step of lesson.steps) {
            add(`${step.id} title`, step.title); add(`${step.id} purpose`, step.purpose); add(`${step.id} explanation`, step.explanation); add(`${step.id} prompt`, step.observationPrompt);
            step.expectedObservations.forEach((t, i) => add(`${step.id} observation ${i}`, t));
            add(`${step.id} state`, step.scene!.expectedState);
        }
        return out;
    };

    test('has ordered steps with a scene each, the chapter owns the section and the lesson id, and the worked example is shown', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('kinematics')!.lesson(section)!;
        expect(owned.steps).toHaveLength(count);
        expect(owned.steps.every(step => step.scene)).toBe(true);
        expect(kinematicsGuidedExampleLesson(section).id).toBe(lessonId);
        expect((lesson.workedExamples ?? []).length).toBeGreaterThan(0);
        for (const example of lesson.workedExamples ?? []) expect({id: example.id, used: lesson.steps.some(step => step.workedExampleId === example.id)}).toEqual({id: example.id, used: true});
    });

    test(`${name}: the numbers each step quotes are those of its scene, in both languages`, () => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            const calculations = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId).map(example => example.check ? [example.check.sl, example.check.en] : []).flat();
            for (const language of ['sl', 'en'] as const) {
                const state = step.scene!.expectedState[language];
                const everything = [state, step.explanation[language], ...step.expectedObservations.map(o => o[language]), ...calculations].join(' ');
                for (const quote of expected.quotes) {
                    const value = proseNumber(quote.value, quote.digits, language);
                    expect({id: step.id, language, value, inState: hasNumber(state, value)}).toEqual({id: step.id, language, value, inState: true});
                }
                for (const quote of [...expected.quotes, ...expected.also]) {
                    const value = proseNumber(quote.value, quote.digits, language);
                    expect({id: step.id, language, value, inText: hasNumber(everything, value)}).toEqual({id: step.id, language, value, inText: true});
                }
            }
        }
    });

    test('every decimal number in the lesson is a recomputed value or a named input of the graph; sl and en quote the same numbers', () => {
        const rounded = (value: number, digits = 3) => String(Math.abs(Number(value.toFixed(digits))));
        const allowed = new Set<string>([
            '9.81', '0.5', '1.5', '0.25', '0.75', '2.25', '0.79', '1.05', '2.09', '2.094', '4.189', '4.5', '8.378', '1.44', '2.88', '0.016', '1.4416',
            ...[P45.T, P45.R, P45.H, P45.vx, P45.vy(1), P45.vy(2), P45.vy(2.88), P45.speed(2.88), P45.x(T_HALF), P45.y(1), P45.R / 2, P30.R, P30.H, P60.H, P30.T, P60.T, P40.R,
                toss(30, 45).R, toss(30, 30).R].map(value => rounded(value)),
            rounded(P45.k, 6), rounded(spin(2, 1.5).period), rounded(spin(2, 3).period), rounded(spin(4, 0.75).period),
        ]);
        const numbers = (text: string) => text.replace(/\{,\}/g, '.').match(/\d+(?:\.\d+)?/g) ?? [];
        const bySl = new Map<string, string>();
        for (const {where, language, text} of everyText()) {
            if (language === 'sl') {
                bySl.set(where, text);
                for (const n of numbers(text).filter(n => n.includes('.'))) expect({where, n, known: allowed.has(n)}).toEqual({where, n, known: true});
            } else {
                expect({where, numbers: numbers(text).sort()}).toEqual({where, numbers: numbers(bySl.get(where)!).sort()});
            }
        }
    });

    test('math is delimited: no control characters, balanced delimiters, no doubled backslashes after unescaping, no {,} in English', () => {
        for (const {where, language, text} of everyText()) {
            expect({where, language, control: /[\u0000-\u001f]/.test(text)}).toEqual({where, language, control: false});
            expect({where, language, doubled: /\\\\/.test(text)}).toEqual({where, language, doubled: false});
            expect({where, language, balanced: (text.match(/\\\(/g) ?? []).length === (text.match(/\\\)/g) ?? []).length}).toEqual({where, language, balanced: true});
            if (language === 'en') expect({where, comma: text.includes('{,}')}).toEqual({where, comma: false});
        }
    });

    test('no step reveals its prediction in its title, purpose, explanation, prompt, formulas or worked example', () => {
        const forbidden = (id: string, language: 'sl' | 'en'): RegExp[] => {
            const sl = language === 'sl';
            switch (id) {
                case 'kn3-throw': return [/1(\{,\}|[.,])44/, sl ? /polovic/ : /half/];
                case 'kn3-velocity': return [/14(\{,\}|[.,])111/, /5(\{,\}|[.,])478/, /19(\{,\}|[.,])978/, /0(\{,\}|[.,])016/];
                case 'kn3-acceleration': return [/9(\{,\}|[.,])81/, sl ? /navzdol|stalen/ : /downward|constant/];
                case 'kn3-path': return [/0(\{,\}|[.,])024525/, /20(\{,\}|[.,])387/, sl ? /negativn|navzdol|parabol/ : /negative|downwards|parabol/];
                case 'kn3-angles': return [/35(\{,\}|[.,])312/, /40(\{,\}|[.,])155/, /90\^/, sl ? /komplement|seštej/ : /complement|add up|sum/];
                case 'kn4-circle': return [/4(\{,\}|[.,])189/, /omega R/];
                case 'kn4-velocity': return [sl ? /spreminja samo smer|tangent/ : /only the direction|tangent/, /\(-3/];
                case 'kn4-acceleration': return [/4(\{,\}|[.,])5/, sl ? /središč|centripetal/ : /centre|centripetal/];
                case 'kn4-omega': return [/(?<![\d,.{}])18(?!\d)/, /(?<![\d,.{}])6\\ /];
                case 'kn4-radius': return [/(?<![\d,.{}])9\\ /, /(?<![\d,.{}])6\\ /];
                case 'kn4-speed': return [/0(\{,\}|[.,])75/, /2(\{,\}|[.,])25/, /8(\{,\}|[.,])378/];
                default: return [];
            }
        };
        for (const step of lesson.steps) {
            for (const language of ['sl', 'en'] as const) {
                const formulas = step.formulaIds.map(id => lesson.formulaBlocks.find(f => f.id === id)!);
                const example = (lesson.workedExamples ?? []).find(e => e.id === step.workedExampleId);
                const shown = [step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language],
                    ...formulas.flatMap(f => [f.latex, f.notation[language], f.explanation[language]]), ...(example ? [example.title[language], example.calculationLatex ?? '', example.resultLatex ?? '', example.check?.[language] ?? ''] : [])].join(' ');
                for (const pattern of forbidden(step.id, language)) {
                    expect({id: step.id, language, pattern: String(pattern), leaked: pattern.test(shown)}).toEqual({id: step.id, language, pattern: String(pattern), leaked: false});
                }
            }
        }
    });

    test('the lesson source contains no single-backslash math delimiters', () => {
        const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'kinematicsGuidedLessons.ts'), 'utf8');
        expect((source.match(/(^|[^\\])\\[()[\]]/gm) ?? []).length).toBe(0);
    });
});

test('KN3: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    checkScenes34(kinematicsProjectileLesson, KN3);
});

test('KN4: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    checkScenes34(kinematicsCircularLesson, KN4);
});

test('KN3 and KN4: the closed forms reproduce the quoted reference values (flight, range, height, path, complementary angles, v = wR, a = w^2 R = v^2/R, T = 2 pi/w)', () => {
    expect(P45.T).toBeCloseTo(2.8832, 4);
    expect(P45.R).toBeCloseTo(40.7747, 4);
    expect(P45.H).toBeCloseTo(10.1937, 4);
    expect(P45.k).toBeCloseTo(0.024525, 6);
    expect(P45.x(P45.T)).toBeCloseTo(P45.R, 9);
    expect(P45.y(P45.T)).toBeCloseTo(0, 9);
    expect(P45.x(P45.T / 2)).toBeCloseTo(P45.R / 2, 9);
    expect(P45.y(P45.T / 2)).toBeCloseTo(P45.H, 9);
    expect(P30.R).toBeCloseTo(P60.R, 9);
    expect(P40.R).toBeCloseTo(P50.R, 9);
    expect(P45.R).toBeGreaterThan(P40.R);
    expect(P30.H).not.toBeCloseTo(P60.H, 1);
    expect(P45.slope * P45.x(1) - P45.k * P45.x(1) ** 2).toBeCloseTo(P45.y(1), 9);
    for (const [radius, w] of [[2, 1.5], [2, 3], [4, 1.5], [4, 0.75]] as const) {
        const c = spin(radius, w);
        expect(c.speed).toBeCloseTo(w * radius, 12);
        expect(c.accel).toBeCloseTo(c.speed ** 2 / radius, 12);
        expect(Math.hypot(...c.a(1.234))).toBeCloseTo(c.accel, 12);
        expect(c.period).toBeCloseTo(2 * Math.PI / w, 12);
    }
});

test('KN3: the changes the text asks the learner to make give the stated readouts', () => {
    const m = mountKinematics();
    try {
        // Step 2: the time slider at the start, at the top, at 2 s and at the end of the flight.
        m.scene(kinematicsProjectileLesson, 'kn3-velocity');
        for (const seconds of [0, 1, 1.44, 2, 2.88]) {
            m.learner(time(seconds));
            expect({seconds, velocity: stripped(readout('velocity')), speed: stripped(readout('speed'))})
                .toEqual({seconds, velocity: stripped(vectorText([P45.vx, P45.vy(seconds)], 'm/s')), speed: stripped(`${readoutNumber(P45.speed(seconds))} m/s`)});
        }
        // Step 1: the position at the quoted time of the top.
        m.scene(kinematicsProjectileLesson, 'kn3-throw');
        m.learner(time(1.44));
        expect(stripped(readout('position'))).toBe(stripped(vectorText([P45.x(1.44), P45.y(1.44)], 'm')));
        // Step 5: the angle in steps of five degrees; complementary angles share the range, not the height or the flight time.
        m.scene(kinematicsProjectileLesson, 'kn3-angles');
        const ranges: Record<number, string | null> = {};
        for (const alpha of [30, 60, 40, 50, 45]) {
            m.learner(params({alpha}));
            const p = toss(20, alpha);
            expect({alpha, range: stripped(readout('range')), height: stripped(readout('height')), flight: stripped(readout('flight'))})
                .toEqual({alpha, range: stripped(`${readoutNumber(p.R)} m`), height: stripped(`${readoutNumber(p.H)} m`), flight: stripped(`${readoutNumber(p.T)} s`)});
            ranges[alpha] = readout('range');
        }
        expect(ranges[30]).toBe(ranges[60]);
        expect(ranges[40]).toBe(ranges[50]);
        expect(ranges[45]).not.toBe(ranges[40]);
        // Step 6: the worked example with v0 = 30 m/s.
        m.scene(kinematicsProjectileLesson, 'kn3-explore');
        for (const [alpha, range] of [[45, 91.743], [30, 79.452]] as const) {
            m.learner(params({v0: 30, alpha}));
            expect({alpha, range: stripped(readout('range'))}).toEqual({alpha, range: stripped(`${readoutNumber(toss(30, alpha).R)} m`)});
            expect(toss(30, alpha).R).toBeCloseTo(range, 3);
        }
    } finally {
        m.mounted.view.unmount();
    }
});

test('KN4: the changes the text asks the learner to make give the stated readouts', () => {
    const m = mountKinematics();
    try {
        const check = (radius: number, w: number) => {
            const c = spin(radius, w);
            expect({radius, w, speed: stripped(readout('speed')), normal: stripped(readout('a-n')), period: stripped(readout('period'))})
                .toEqual({radius, w, speed: stripped(`${readoutNumber(c.speed)} m/s`), normal: stripped(`${readoutNumber(c.accel)} m/s²`), period: stripped(`${readoutNumber(c.period)} s`)});
        };
        m.scene(kinematicsCircularLesson, 'kn4-omega');
        check(2, 1.5);
        m.learner(params({omega: 3}));
        check(2, 3);
        m.scene(kinematicsCircularLesson, 'kn4-radius');
        m.learner(params({radius: 4}));
        check(4, 1.5);
        m.scene(kinematicsCircularLesson, 'kn4-speed');
        m.learner(params({radius: 4, omega: 0.75}));
        check(4, 0.75);
        expect(spin(4, 0.75).speed).toBe(3);
        // Step 2: the velocity at the quoted times; at t = 2,09 it is approximately (0; -3).
        m.scene(kinematicsCircularLesson, 'kn4-velocity');
        for (const seconds of [0, C_QUARTER, 2.09]) {
            m.learner(time(seconds));

            expect({seconds, velocity: stripped(readout('velocity'))}).toEqual({seconds, velocity: stripped(vectorText(C.v(seconds), 'm/s'))});
        }
        expect(Math.abs(C.v(2.09)[0])).toBeLessThan(0.05);
        // Step 7: the worked example R = 3, omega = 2 at t of about 0,79: position (0; 3), velocity (-6; 0), acceleration (0; -12), to the rounding of the slider.
        m.scene(kinematicsCircularLesson, 'kn4-explore');
        m.learner(params({radius: 3, omega: 2}), time(0.79));
        const example = spin(3, 2);
        expect({velocity: stripped(readout('velocity')), speed: stripped(readout('speed')), normal: stripped(readout('a-n'))})
            .toEqual({velocity: stripped(vectorText(example.v(0.79), 'm/s')), speed: stripped('6 m/s'), normal: stripped('12 m/s²')});
        expect(Math.abs(example.r(0.79)[0])).toBeLessThan(0.05);
        expect(example.r(0.79)[1]).toBeCloseTo(3, 2);
        expect(example.v(0.79)[0]).toBeCloseTo(-6, 1);
        expect(example.a(0.79)[1]).toBeCloseTo(-12, 1);
    } finally {
        m.mounted.view.unmount();
    }
});
