/**
 * KN1 and KN2 (curve-kinematics): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), and every number a step quotes is bound to its step. The expected values are computed here from the closed-form
 * motion formulas (the cycloid r = (t - sin t; 1 - cos t) and the circle of radius 1 with the angle t + b sin t), not from the kinematics kernel or the
 * graph, and compared with the real readouts; the quoted numbers are generated from the same values and looked up in the sl and en prose. The changes the
 * text asks the learner to make are applied as actions and the readouts checked.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {kinematicsSpeedLesson, kinematicsVectorsLesson} from './kinematicsGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
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
const params = (patch: Omit<Extract<LessonAction, {operation: 'set-params'}>, 'kind' | 'operation'>): LessonAction => ({kind: 'kinematics', operation: 'set-params', ...patch});

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
