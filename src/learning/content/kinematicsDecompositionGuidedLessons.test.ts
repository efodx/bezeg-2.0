/**
 * KN5 (curve-kinematics, tangential and normal acceleration with curvature). Part A: every step opening lands in the state and readouts the lesson states,
 * on the real graph, in sl and en, out of order and twice in one synchronous sequence; the controls and readout labels a prompt names exist; no opening
 * already holds what the prompt asks the learner to produce; the learner's actions give the readouts the text quotes; a predicting step does not show
 * its own answer. Part B (below): values independent of the graph.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {kinematicsDecompositionLesson as lesson} from './kinematicsDecompositionGuidedLessons';
import type {GuidedLessonStep} from './guidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {KinematicsGraph} from '../../graphs/curves/kinematics/KinematicsGraph';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];

// ---- closed-form motions (independent of the graph and the kernel) ------------------------------------------------------------------

type V = readonly [number, number];
interface Motion { readonly r: V; readonly v: V; readonly a: V }
const cycloid = (t: number): Motion => ({r: [t - Math.sin(t), 1 - Math.cos(t)], v: [1 - Math.cos(t), Math.sin(t)], a: [Math.sin(t), Math.cos(t)]});
/** Uniform circular motion of radius R and angular velocity w, counter-clockwise from (R; 0). */
const spin = (radius: number, w: number) => (t: number): Motion => ({
    r: [radius * Math.cos(w * t), radius * Math.sin(w * t)],
    v: [-radius * w * Math.sin(w * t), radius * w * Math.cos(w * t)],
    a: [-radius * w * w * Math.cos(w * t), -radius * w * w * Math.sin(w * t)],
});
const norm2 = (v: V) => Math.hypot(v[0], v[1]);
const cross = (u: V, w: V) => u[0] * w[1] - u[1] * w[0];
const dot = (u: V, w: V) => u[0] * w[0] + u[1] * w[1];

// ---- number formats --------------------------------------------------------------------------------------------------------------------

const MINUS = '−';
/** A readout number: up to `digits` decimals, no trailing zeros, decimal comma, true minus sign, no negative zero. */
function readoutNumber(value: number, digits = 3): string {
    const text = Number(value.toFixed(digits)).toString();
    return (text === '-0' ? '0' : text).replace('-', MINUS).replace('.', ',');
}
const vectorText = (v: V, unit: string) => `(${readoutNumber(v[0])}; ${readoutNumber(v[1])}) ${unit}`;
/** Whitespace removed, decimal comma and true minus as in English readouts: the sl and en readouts of one state must agree on this form. */
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
const numeric = (text: string | null | undefined) => stripped(text).replace(/,/g, '.').replace(/−/g, '-');
/** The prose spelling of a number in `language`: `{,}` for the Slovenian comma before the prose is normalized to a plain comma. */
function proseNumber(value: number, digits: number, language: Language): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
/** Prose with the LaTeX spacing and the decimal-comma braces removed, so that `-1{,}218` reads -1,218 and `1.12\ \mathrm{s}` reads 1.12. */
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ').replace(/\\mathrm\{([^}]*)\}/g, ' $1 ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));
/** True minus in prose is the ASCII minus after `prose`; accept both spellings of a negative number. */
const hasSigned = (text: string, value: string) => hasNumber(text, value) || (value.startsWith('-') && hasNumber(text, value.slice(1)));

// ---- the graph -----------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const statusLine = () => document.querySelector('[data-kinematics-status]')?.textContent ?? null;

/** Exposes the board, to check that a drawn circle lies inside it. */
class ObservedKinematics extends KinematicsGraph {
    liveBoard() { return this.board; }
}

function mountKinematics(observed = false) {
    const graph = observed ? new ObservedKinematics() : createGraph('curve-kinematics');
    if (!(graph instanceof KinematicsGraph)) throw new Error('curve-kinematics must be the kinematics graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const scene = (stepId: string) => act(() => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const snapshot = () => ({
        state: JSON.parse(JSON.stringify(graph.state)) as Record<string, unknown>,
        time: graph.time,
        readouts: [...document.querySelectorAll('[data-readout]')].map(node => `${node.getAttribute('data-readout')}=${numeric(node.querySelector('dd')?.textContent)}`),
        status: statusLine(),
    });
    return {graph, mounted, capabilities, checkpoint, scene, learner, snapshot};
}
const time = (value: number): LessonAction => ({kind: 'kinematics', operation: 'set-time', t: value});
const params = (patch: Omit<Extract<LessonAction, {kind: 'kinematics'; operation: 'set-params'}>, 'kind' | 'operation'>): LessonAction => ({kind: 'kinematics', operation: 'set-params', ...patch});
const motionAction = (motion: 'cycloid' | 'cardioid' | 'rose' | 'spiral' | 'projectile' | 'circular'): LessonAction => ({kind: 'kinematics', operation: 'set-motion', motion});

/** The readout rows the closed-form motion gives for the time `t` (off a standstill all of them). */
function expectedRows(motion: Motion, t: number): Record<string, string> {
    const speed = norm2(motion.v);
    return {
        time: `${readoutNumber(t, 2)} s`,
        velocity: vectorText(motion.v, 'm/s'),
        speed: `${readoutNumber(speed)} m/s`,
        acceleration: vectorText(motion.a, 'm/s²'),
        'a-t': `${readoutNumber(dot(motion.a, motion.v) / speed)} m/s²`,
        'a-n': `${readoutNumber(cross(motion.v, motion.a) / speed)} m/s²`,
        kappa: `${readoutNumber(cross(motion.v, motion.a) / speed ** 3)} 1/m`,
        'kappa-v2': `${readoutNumber(cross(motion.v, motion.a) / speed)} m/s²`,
    };
}

const HALF_PI = Math.PI / 2;
const unitCircle = spin(1, 1);
interface Opening { readonly motion: string; readonly state: Readonly<Record<string, unknown>>; readonly t: number; readonly rows: Record<string, string> }
const OPENINGS: Record<string, Opening> = {
    'kn5-along': {motion: 'cycloid', state: {split: false, osculating: false}, t: HALF_PI, rows: expectedRows(cycloid(HALF_PI), HALF_PI)},
    'kn5-axes': {motion: 'cycloid', state: {split: false, osculating: false}, t: 3.14, rows: expectedRows(cycloid(3.14), 3.14)},
    'kn5-projection': {motion: 'cycloid', state: {split: true, osculating: false}, t: HALF_PI, rows: expectedRows(cycloid(HALF_PI), HALF_PI)},
    'kn5-speed': {motion: 'cycloid', state: {split: true, osculating: false}, t: 1, rows: expectedRows(cycloid(1), 1)},
    'kn5-circle': {motion: 'cycloid', state: {split: true, osculating: false}, t: 0.5, rows: expectedRows(cycloid(0.5), 0.5)},
    'kn5-kappa-v2': {motion: 'circular', state: {split: true, osculating: true, radius: 1, omega: 1}, t: 1, rows: expectedRows(unitCircle(1), 1)},
    'kn5-explore': {motion: 'cycloid', state: {split: true, osculating: true}, t: 2, rows: expectedRows(cycloid(2), 2)},
};
const IDS = Object.keys(OPENINGS);
const stepOf = (id: string): GuidedLessonStep => lesson.steps.find(step => step.id === id)!;
/** Everything a step shows before the learner acts: explanation, prompt, its formula blocks and its worked example. */
function shownBefore(step: GuidedLessonStep, language: Language): string {
    const formulas = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id)).flatMap(block => [block.latex, block.notation[language], block.explanation?.[language] ?? '']);
    const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId)
        .flatMap(example => [example.title[language], example.calculationLatex, example.resultLatex, example.check?.[language] ?? '']);
    return [step.explanation[language], step.observationPrompt[language], ...formulas, ...examples].join(' ');
}

describe('KN5 scenes on the real graph', () => {
    test('the lesson has seven ordered steps with a scene each', () => {
        expect(lesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(lesson.steps.map(step => step.id)).toEqual(IDS);
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(7);
    });

    test.each(LANGUAGES)('%s: every opening lands in the stated state and readouts, out of order and twice, in one synchronous sequence', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            const first: Record<string, ReturnType<typeof m.snapshot>> = {};
            for (const id of IDS) {
                m.scene(id);
                first[id] = m.snapshot();
                const expected = OPENINGS[id];
                expect({id, motion: first[id].state.motion, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, first[id].state[key]]))})
                    .toEqual({id, motion: expected.motion, ...expected.state});
                expect({id, timeOff: Math.abs(first[id].time - expected.t) < 5e-5}).toEqual({id, timeOff: true});
                for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: numeric(readout(row))}).toEqual({id, row, text: numeric(text)});
            }
            for (const id of [...IDS.slice().reverse(), ...IDS.slice(2), ...IDS.slice(0, 2)]) {
                m.scene(id);
                m.scene(id);
                expect({id, ...m.snapshot()}).toEqual({id, ...first[id]});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test('the state and the numeric readouts of every opening are the same in sl and en', () => {
        const byLanguage = LANGUAGES.map(language => {
            setLanguage(language);
            const m = mountKinematics();
            try {
                return IDS.map(id => { m.scene(id); return m.snapshot(); });
            } finally {
                m.mounted.view.unmount();
            }
        });
        const numbers = (snaps: typeof byLanguage[number]) => snaps.map(({state, time: at, readouts}) => ({state, at, readouts: readouts.filter(row => !row.startsWith('scale-'))})); // the scale rows are prose
        expect(numbers(byLanguage[1])).toEqual(numbers(byLanguage[0]));
    });

    test('restoring the checkpoint on leaving the lesson returns the free state and readouts', () => {
        const m = mountKinematics();
        try {
            const free = JSON.stringify({state: m.graph.state, time: m.graph.time});
            const freeReadouts = [...document.querySelectorAll('[data-readout]')].map(node => node.textContent);
            for (const id of IDS) m.scene(id);
            m.learner(time(1));
            expect(JSON.stringify({state: m.graph.state, time: m.graph.time})).not.toBe(free);
            act(() => { m.capabilities.restoreState(m.checkpoint); });
            expect(JSON.stringify({state: m.graph.state, time: m.graph.time})).toBe(free);
            expect([...document.querySelectorAll('[data-readout]')].map(node => node.textContent)).toEqual(freeReadouts);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

describe('KN5 labels the prompts name', () => {
    const NAMED = {
        'kn5-along': ['kinematics_graph_time_label', 'kinematics_graph_r_at'],
        'kn5-axes': ['kinematics_graph_split'],
        'kn5-projection': ['kinematics_graph_time_label'],
        'kn5-speed': ['kinematics_graph_time_label'],
        'kn5-circle': ['kinematics_graph_osculating'],
        'kn5-kappa-v2': ['kinematics_graph_omega_label', 'kinematics_graph_motion_circular'],
        'kn5-explore': ['kinematics_graph_motion_label', 'kinematics_graph_motion_cardioid', 'kinematics_graph_motion_rose', 'kinematics_graph_motion_spiral',
            'kinematics_graph_motion_projectile', 'kinematics_graph_motion_circular', 'kinematics_graph_motion_cycloid'],
    } as const;

    test.each(LANGUAGES)('%s: every control or readout label a step names is the graph string and is in that step text', language => {
        setLanguage(language);
        for (const [id, keys] of Object.entries(NAMED)) {
            const step = stepOf(id);
            const everything = [step.explanation[language], step.observationPrompt[language]].join(' ');
            for (const key of keys) {
                const label = t(key);
                expect({id, key, nonEmpty: label.length > 0 && label !== key}).toEqual({id, key, nonEmpty: true});
                expect({id, key, label, named: everything.includes(label)}).toEqual({id, key, label, named: true});
            }
        }
    });

    test.each(LANGUAGES)('%s: the readout labels the steps quote are shown by the graph', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            m.scene('kn5-along');
            const rows: Record<string, string> = {'a-t': t('kinematics_graph_r_at'), 'a-n': t('kinematics_graph_r_an'), time: t('kinematics_graph_r_time'), speed: t('kinematics_graph_r_speed'),
                kappa: t('kinematics_graph_r_kappa'), 'kappa-v2': t('kinematics_graph_r_kappa_v2'), acceleration: t('kinematics_graph_r_acceleration')};
            for (const [id, label] of Object.entries(rows)) expect({id, shown: document.querySelector(`[data-readout="${id}"]`)?.textContent?.includes(label)}).toEqual({id, shown: true});
        } finally {
            m.mounted.view.unmount();
        }
    });
});

describe('KN5 openings and answers', () => {
    /** The change each predicting step asks the learner to make, as actions on the opening. */
    const CHANGES: Record<string, LessonAction[]> = {
        'kn5-along': [time(3.14)],
        'kn5-axes': [params({split: true})],
        'kn5-projection': [time(2)],
        'kn5-speed': [time(1.1)],
        'kn5-circle': [params({osculating: true})],
        'kn5-kappa-v2': [params({omega: 0.5})],
    };

    test('no opening is already the state its prompt asks the learner to produce', () => {
        const m = mountKinematics();
        try {
            for (const [id, actions] of Object.entries(CHANGES)) {
                m.scene(id);
                const before = m.snapshot();
                m.learner(...actions);
                const after = m.snapshot();
                expect({id, changed: JSON.stringify({state: after.state, time: after.time}) !== JSON.stringify({state: before.state, time: before.time})}).toEqual({id, changed: true});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    /** What the learner sets or reads is a value of the opening's state that the change moves: the named value differs before and after. */
    test('the value the learner is asked to set differs from the opening', () => {
        const m = mountKinematics();
        try {
            m.scene('kn5-along'); expect(m.graph.time).not.toBeCloseTo(3.14, 3);
            m.scene('kn5-axes'); expect(m.graph.state.split).toBe(false);
            m.scene('kn5-projection'); expect(m.graph.time).not.toBeCloseTo(2, 3);
            m.scene('kn5-speed'); expect(m.graph.time).not.toBeCloseTo(1.1, 3);
            m.scene('kn5-circle'); expect(m.graph.state.osculating).toBe(false);
            m.scene('kn5-kappa-v2'); expect(m.graph.state.omega).not.toBe(0.5);
        } finally {
            m.mounted.view.unmount();
        }
    });

    const quote = (value: number, digits = 3): readonly [number, number] => [value, digits];
    const speedingKey = 'kinematics_graph_status_speeding';

    /** After the learner's change: the readouts the text quotes (closed forms) and the numbers that must stand in the step's observation text. */
    const AFTER: Record<string, {readonly rows: Record<string, string>; readonly quotes: readonly (readonly [number, number])[]}> = {
        'kn5-along': {rows: {...expectedRows(cycloid(3.14), 3.14)}, quotes: [quote(norm2(cycloid(3.14).v), 0), quote(0.001)]},
        'kn5-axes': {rows: {...expectedRows(cycloid(3.14), 3.14)}, quotes: [quote(cycloid(3.14).v[0], 0), quote(cycloid(3.14).v[1]), quote(cycloid(3.14).a[0]), quote(cycloid(3.14).a[1], 0)]},
        'kn5-projection': {rows: expectedRows(cycloid(2), 2), quotes: [quote(cycloid(2).a[0]), quote(cycloid(2).a[1]), quote(0.54, 2), quote(-0.841)]},
        'kn5-speed': {rows: expectedRows(cycloid(1.1), 1.1), quotes: [quote(norm2(cycloid(1.1).v)), quote(dot(cycloid(1.1).a, cycloid(1.1).v) / norm2(cycloid(1.1).v))]},
        'kn5-circle': {rows: {...expectedRows(cycloid(0.5), 0.5)}, quotes: [quote(-0.247), quote(0.495)]},
        'kn5-kappa-v2': {rows: expectedRows(spin(1, 0.5)(1), 1), quotes: [quote(0.5, 1), quote(1, 0), quote(0.25, 2)]},
    };

    test.each(LANGUAGES)('%s: the learner actions give the readouts and status the text quotes', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            for (const [id, actions] of Object.entries(CHANGES)) {
                m.scene(id);
                m.learner(...actions);
                const expected = AFTER[id];
                for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: numeric(readout(row))}).toEqual({id, row, text: numeric(text)});
                const observation = stepOf(id).expectedObservations.map(o => o[language]).join(' ');
                for (const [value, digits] of expected.quotes) {
                    const spelled = proseNumber(value, digits, language);
                    expect({id, spelled, inText: hasSigned(observation, spelled)}).toEqual({id, spelled, inText: true});
                }
            }
            m.scene('kn5-along');
            m.learner(time(3.14));
            expect(statusLine()).toContain(t(speedingKey)); // not "stationary": 3,14 is less than pi
            expect(m.graph.statusText()).toBe(statusLine());
        } finally {
            m.mounted.view.unmount();
        }
    });

    test.each(LANGUAGES)('%s: the osculating circle the learner switches on has radius 1/|kappa| and its centre on the side of the turn', language => {
        setLanguage(language);
        const m = mountKinematics(true);
        try {
            m.scene('kn5-circle');
            expect(m.graph.osculatingCircleNow()).toBeUndefined();
            m.learner(params({osculating: true}));
            const circle = m.graph.osculatingCircleNow()!;
            const at = 0.5;
            const {r, v, a} = cycloid(at);
            const speed = norm2(v);
            const kappa = cross(v, a) / speed ** 3;
            const left: V = [-v[1] / speed, v[0] / speed];
            expect(circle.radius).toBeCloseTo(1 / Math.abs(kappa), 9);
            expect(circle.centre[0]).toBeCloseTo(r[0] + left[0] / kappa, 9);
            expect(circle.centre[1]).toBeCloseTo(r[1] + left[1] / kappa, 9);
            expect(circle.radius).toBeCloseTo(0.99, 2);
            expect(circle.centre[0]).toBeCloseTo(0.98, 2);
            expect(circle.centre[1]).toBeCloseTo(-0.12, 2);
            // the whole circle lies inside the board
            const [left0, top, right, bottom] = (m.graph as ObservedKinematics).liveBoard().getBoundingBox();
            expect({inside: circle.centre[0] - circle.radius >= left0 && circle.centre[0] + circle.radius <= right && circle.centre[1] + circle.radius <= top && circle.centre[1] - circle.radius >= bottom}).toEqual({inside: true});
            expect(kappa.toFixed(3)).toBe('-1.010'); // the text keeps the trailing zero: -1,010
            const spelledKappa = language === 'sl' ? '1,010' : '1.010';
            expect(prose(stepOf('kn5-circle').explanation[language])).toContain(spelledKappa);
            const observation = stepOf('kn5-circle').expectedObservations.map(o => o[language]).join(' ');
            expect(prose(observation)).toContain(language === 'sl' ? '0,990' : '0.990'); // the radius 1/|kappa| with the trailing zero
            for (const [value, digits] of [[circle.centre[0], 2], [circle.centre[1], 2], [r[0], 2], [r[1], 2], [-0.247, 3], [0.495, 3]] as const) {
                const spelled = proseNumber(value, digits, language);
                expect({spelled, inText: hasSigned(observation, spelled) || hasSigned(stepOf('kn5-circle').explanation[language], spelled)}).toEqual({spelled, inText: true});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    /** Numbers that ARE the answer of each predicting step (its expected observations) and must not stand in what the step shows first. */
    const ANSWERS: Record<string, readonly string[]> = {
        'kn5-along': ['0.001'],
        'kn5-axes': ['0.001', '0.002', '-1'],
        'kn5-projection': ['0.909', '0.416', '0.841', '0.54', '0.2916', '0.7073'],
        'kn5-speed': ['1.047', '1.045', '0.853'],
        'kn5-circle': ['0.99', '0.98', '-0.12', '0.02', '-0.247', '0.495'],
        'kn5-kappa-v2': ['0.25', '0.5'],
    };
    test.each(LANGUAGES)('%s: a predicting step does not render the answer of its own expected observations before the learner acts', language => {
        for (const [id, values] of Object.entries(ANSWERS)) {
            const step = stepOf(id);
            const shown = shownBefore(step, language);
            for (const raw of values) {
                const value = language === 'sl' ? raw.replace('.', ',') : raw;
                if (id === 'kn5-kappa-v2' && raw === '0.5') continue; // 0,5 is the omega the prompt asks for (it is also the speed answer)
                expect({id, value, shown: hasSigned(shown, value)}).toEqual({id, value, shown: false});
            }
        }
    });
});

// ======================================================================================================================================
// Part B: values independent of the graph (the closed forms below are the only source of the expected numbers).
// ======================================================================================================================================

const G = 9.81;
const DEG = Math.PI / 180;
const projectile = (t: number): Motion => ({
    r: [20 * Math.cos(45 * DEG) * t, 20 * Math.sin(45 * DEG) * t - G * t * t / 2],
    v: [20 * Math.cos(45 * DEG), 20 * Math.sin(45 * DEG) - G * t],
    a: [0, -G],
});
/** The cardioid rho = 1 + cos(theta) travelled with theta = t. */
const cardioid = (t: number): Motion => ({
    r: [Math.cos(t) + Math.cos(t) ** 2, Math.sin(t) + Math.sin(t) * Math.cos(t)],
    v: [-Math.sin(t) - Math.sin(2 * t), Math.cos(t) + Math.cos(2 * t)],
    a: [-Math.cos(t) - 2 * Math.cos(2 * t), -Math.sin(t) - 2 * Math.sin(2 * t)],
});
const speedOf = (motion: (t: number) => Motion, t: number) => norm2(motion(t).v);

describe('KN5 cycloid closed forms', () => {
    // Every time the text quotes on the cycloid (the learner's times and the openings).
    const TIMES = [HALF_PI, 3.14, 2, 1, 1.1, 0.5, 0.01];

    test('the closed forms a_T = cos(t/2), a_N = -sin(t/2), speed 2 sin(t/2), kappa = -1/(4 sin(t/2)) follow from the position r = (t - sin t; 1 - cos t)', () => {
        for (const t of TIMES) {
            const {v, a} = cycloid(t);
            const speed = norm2(v);
            expect(speed).toBeCloseTo(2 * Math.sin(t / 2), 12);
            expect(dot(a, v) / speed).toBeCloseTo(Math.cos(t / 2), 12);
            expect(cross(v, a) / speed).toBeCloseTo(-Math.sin(t / 2), 12);
            expect(cross(v, a) / speed ** 3).toBeCloseTo(-1 / (4 * Math.sin(t / 2)), 8);
            // a_N = kappa v^2 only as a consistency check
            expect(-1 / (4 * Math.sin(t / 2)) * speed ** 2).toBeCloseTo(-Math.sin(t / 2), 12);
            expect(dot(a, v) ** 2 / speed ** 2 + cross(v, a) ** 2 / speed ** 2).toBeCloseTo(norm2(a) ** 2, 12);
        }
    });

    test('a central finite difference of the speed equals a_T (step 1e-5, tolerance 1e-8)', () => {
        const h = 1e-5;
        for (const t of TIMES) {
            const difference = (speedOf(cycloid, t + h) - speedOf(cycloid, t - h)) / (2 * h);
            expect(Math.abs(difference - Math.cos(t / 2))).toBeLessThan(1e-8);
        }
    });

    test.each(LANGUAGES)('%s: the graph reads the closed forms at every quoted time', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            m.scene('kn5-explore');
            for (const t of [HALF_PI, 3.14, 2, 1, 1.1, 0.5, 0.01]) {
                m.learner(time(t));
                const at = m.graph.time;
                expect(Math.abs(at - t)).toBeLessThan(5e-5);
                const read = (id: string) => numeric(readout(id));
                expect({t, speed: read('speed')}).toEqual({t, speed: numeric(`${readoutNumber(2 * Math.sin(at / 2))} m/s`)});
                expect({t, aT: read('a-t')}).toEqual({t, aT: numeric(`${readoutNumber(Math.cos(at / 2))} m/s²`)});
                expect({t, aN: read('a-n')}).toEqual({t, aN: numeric(`${readoutNumber(-Math.sin(at / 2))} m/s²`)});
                expect({t, kappa: read('kappa')}).toEqual({t, kappa: numeric(`${readoutNumber(-1 / (4 * Math.sin(at / 2)))} 1/m`)});
                expect({t, kappaV2: read('kappa-v2')}).toEqual({t, kappaV2: read('a-n') && numeric(`${readoutNumber(-Math.sin(at / 2))} m/s²`)});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test.each(LANGUAGES)('%s: at the cusp the components read "not defined", never 0, and no osculating circle is drawn; just after it kappa = -50 and radius 0,02', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            m.scene('kn5-explore');
            m.learner(time(0));
            for (const row of ['a-t', 'a-n', 'kappa']) {
                expect({row, text: readout(row)}).toEqual({row, text: t('kinematics_graph_not_defined')});
                expect({row, zero: /^\s*[−-]?0([,.]0+)?\s/.test(readout(row) ?? '')}).toEqual({row, zero: false});
            }
            expect(m.graph.osculatingCircleNow()).toBeUndefined();
            m.learner(time(0.01));
            const kappa = -1 / (4 * Math.sin(m.graph.time / 2));
            expect(kappa).toBeCloseTo(-50, 0);
            expect(numeric(readout('kappa'))).toBe(numeric(`${readoutNumber(kappa)} 1/m`));
            expect(m.graph.osculatingCircleNow()!.radius).toBeCloseTo(1 / Math.abs(kappa), 9);
            expect(m.graph.osculatingCircleNow()!.radius).toBeCloseTo(0.02, 3);
        } finally {
            m.mounted.view.unmount();
        }
    });
});

describe('KN5 other motions', () => {
    test.each(LANGUAGES)('%s: the cardioid at t = 1 and the projectile near its apex read the closed forms, and the apex curvature is g / v_x^2', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            m.scene('kn5-explore');
            m.learner(motionAction('cardioid'), time(1));
            const card = expectedRows(cardioid(1), 1);
            for (const row of ['speed', 'a-t', 'a-n', 'kappa', 'kappa-v2', 'velocity', 'acceleration']) expect({row, text: numeric(readout(row))}).toEqual({row, text: numeric(card[row])});
            expect(readoutNumber(cross(cardioid(1).v, cardioid(1).a) / norm2(cardioid(1).v) ** 3)).toBe('0,855'); // quoted
            m.learner(motionAction('projectile'), time(1.44));
            const proj = expectedRows(projectile(1.44), 1.44);
            for (const row of ['speed', 'a-t', 'a-n', 'kappa', 'velocity', 'acceleration']) expect({row, text: numeric(readout(row))}).toEqual({row, text: numeric(proj[row])});
            const vx = 20 * Math.cos(45 * DEG);
            expect(vx).toBeCloseTo(14.142, 3);
            expect(vx ** 2).toBeCloseTo(200, 9);
            const kappa = cross(projectile(1.44).v, projectile(1.44).a) / norm2(projectile(1.44).v) ** 3;
            expect(kappa).toBeCloseTo(-G / vx ** 2, 4); // near the apex (t = 1,4415)
            expect(G / vx ** 2).toBeCloseTo(0.049, 3);
            expect(1 / Math.abs(kappa)).toBeCloseTo(20.4, 1);
            const text = stepOf('kn5-explore').expectedObservations.map(o => o[language]).join(' ');
            for (const value of ['14.142', '9.81', '0.049', '20.4', '200', '1.755', '2.633', '0.855', '-0.479']) {
                const spelled = language === 'sl' ? value.replace('.', ',') : value;
                expect({spelled, inText: hasSigned(text, spelled)}).toEqual({spelled, inText: true});
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test.each(LANGUAGES)('%s: circular motion has a_N = R omega^2 (positive, as the graph reads it), kappa = 1/R, a_T = 0, and a_N = kappa v^2 as a consistency check', language => {
        setLanguage(language);
        const m = mountKinematics();
        try {
            m.scene('kn5-kappa-v2');
            for (const [radius, omega] of [[1, 1], [1, 0.5], [2, 1.5], [0.5, 3]] as const) {
                m.learner(params({radius, omega}), time(1));
                const speed = radius * omega;
                const kappa = 1 / radius;
                expect(speed * speed * kappa).toBeCloseTo(radius * omega ** 2, 12); // consistency check only
                const rows = expectedRows(spin(radius, omega)(1), 1);
                for (const row of ['speed', 'a-t', 'a-n', 'kappa', 'kappa-v2', 'acceleration']) expect({radius, omega, row, text: numeric(readout(row))}).toEqual({radius, omega, row, text: numeric(rows[row])});
                expect({radius, omega, aN: numeric(readout('a-n'))}).toEqual({radius, omega, aN: numeric(`${readoutNumber(radius * omega ** 2)} m/s²`)});
                expect(numeric(readout('a-t'))).toBe(numeric('0 m/s²'));
                expect(m.graph.osculatingCircleNow()!.radius).toBeCloseTo(radius, 9);
            }
        } finally {
            m.mounted.view.unmount();
        }
    });
});

// ---- every number the text quotes is reproduced, and the spelling rules ----------------------------------------------------------------

type Ref = readonly [number, number];
const round = (value: number, digits = 3): Ref => [value, digits];
const REFERENCE: readonly Ref[] = [
    round(HALF_PI, 2), round(Math.PI, 4), round(3.14, 2), round(speedOf(cycloid, HALF_PI)), round(Math.cos(HALF_PI / 2)), round(Math.sin(HALF_PI / 2)),
    round(Math.cos(1.57)), round(cycloid(3.14).v[1]), round(cycloid(3.14).a[0]), round(cycloid(2).a[0]), round(cycloid(2).a[1]), round(Math.cos(1)), round(Math.sin(1)),
    round(Math.cos(1) ** 2, 4), round(0.841 ** 2, 4), round(cycloid(2).a[0] ** 2), round(cycloid(2).a[1] ** 2), round(speedOf(cycloid, 1)), round(Math.cos(0.5)), round(Math.sin(0.5)),
    round(0.1, 1), round(1.1, 1), round(speedOf(cycloid, 1) + 0.1 * Math.cos(0.5)), round(speedOf(cycloid, 1.1)), round(Math.cos(0.55)),
    round(0.5, 1), round(0.25, 2), round(0.5 * 0.5, 2), round(speedOf(cycloid, 0.5)), round(-1 / (4 * Math.sin(0.25))), round(1 / Math.abs(-1 / (4 * Math.sin(0.25)))),
    round(cycloid(0.5).r[0], 2), round(cycloid(0.5).r[1], 2), round(-Math.sin(0.25)), round(0.98, 2), round(0.12, 2), round(0.02, 2),
    round(cross(cardioid(1).v, cardioid(1).a) / speedOf(cardioid, 1) ** 3), round(speedOf(cardioid, 1)), round(cross(cardioid(1).v, cardioid(1).a) / speedOf(cardioid, 1)),
    round(dot(cardioid(1).a, cardioid(1).v) / speedOf(cardioid, 1)), round(-1 / (4 * Math.sin(0.5))), round(-1 / (4 * Math.sin(1))), round(0.54 ** 2, 4), round(1.44, 2), round(speedOf(cycloid, 2)), round(speedOf(cycloid, 2) ** 2),
    round(0.297 * 2.832), round(0.01, 2), round(0.02, 2), round(20 * Math.cos(45 * DEG)), round(G, 2), round(G / 200), round(20.4, 1),
];
const spellings = (references: readonly Ref[]) => new Set(references.flatMap(([value, digits]) => [Math.abs(value), value].map(v => Number(v.toFixed(digits)).toString())));
const ALLOWED = spellings(REFERENCE);

/** Every string of the lesson in `language`, raw. */
/** `withLatex`: also the undelimited latex fields, which are shared by both languages (decimal comma `{,}`). */
function allText(language: Language, withLatex = true): string[] {
    const out: string[] = [lesson.title[language], lesson.summary[language], ...lesson.prerequisites.map(p => p[language]), ...lesson.learningGoals.map(p => p[language]),
        ...(lesson.edgeCases ?? []).map(p => p[language])];
    for (const block of lesson.formulaBlocks ?? []) out.push(...(withLatex ? [block.latex] : []), block.notation[language], block.explanation?.[language] ?? '');
    for (const example of lesson.workedExamples ?? []) out.push(example.title[language], ...(withLatex ? [example.calculationLatex, example.resultLatex] : []), example.check?.[language] ?? '');
    for (const step of lesson.steps) out.push(step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]);
    return out;
}
const decimals = (text: string) => [...prose(text).matchAll(/(?<![\w.,])\d+[.,]\d+/g)].map(match => match[0]);

describe.each(LANGUAGES)('KN5 quoted numbers, %s', language => {
    test('every decimal the text quotes is a value of a closed form (or its rounding) used by the lesson', () => {
        const unknown = [...new Set(allText(language).flatMap(decimals).map(token => Number(token.replace(',', '.')).toString()).filter(token => !ALLOWED.has(token)))];
        expect(unknown).toEqual([]);
    });

    test('the Slovenian text has no English decimal point and the English text no decimal comma', () => {
        const wrong = allText(language, false).flatMap(text => [...prose(text).matchAll(language === 'sl' ? /\d\.\d/g : /\d,\d/g)].map(match => match[0]));
        expect(wrong).toEqual([]);
    });

    test('a rounded number carries "about" / "približno" / \\approx right before it', () => {
        const marker = /\\approx|približno|about|ocena|estimate|≈/;
        const rounded: readonly (readonly [string, string])[] = [['kn5-along', '1.57'], ['kn5-along', '1.414'], ['kn5-along', '3.1416'], ['kn5-speed', '1.047'], ['kn5-circle', '0.990'], ['kn5-circle', '0.495'],
            ['kn5-explore', '20.4'], ['kn5-explore', '14.142'], ['kn5-explore', '0.049']];
        for (const [id, value] of rounded) {
            const step = stepOf(id);
            const raw = [step.explanation[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language]].join(' | ');
            const spelled = new RegExp(`(?<![-−0-9])${escapeRegExp(value).replace('\\.', language === 'sl' ? '(?:\\{,\\}|,)' : '\\.')}`, 'g');
            const found = [...raw.matchAll(spelled)];
            expect({id, value, found: found.length > 0}).toEqual({id, value, found: true});
            for (const match of found) expect({id, value, marked: marker.test(raw.slice(Math.max(0, match.index! - 50), match.index!))}).toEqual({id, value, marked: true});
        }
    });
});
