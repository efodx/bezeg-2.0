/**
 * MC1 and MC2 (mechanics-descent): every scene lands in the state the text states (the real graph, one synchronous sequence of actions from a restored
 * checkpoint, out of order and twice), and every number a step quotes is bound to its step. The expected values are computed here with integrals and closed
 * forms written for this test (the line and cycloid times in closed form; the circular arc and the Bezier tracks by a midpoint rule after the substitution
 * that removes the 1/sqrt singularity at the start; the cycloid through B by bisection), not with the descent kernel or the graph, and compared with the real
 * readouts; the quoted numbers are generated from the same values and looked up in the sl and en prose. The changes the text asks the learner to make are
 * applied as actions and the readouts checked.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {mechanicalCurvesRaceLesson, mechanicalCurvesTrackLesson, mechanicalTautochroneLesson, MC1_END, MC3_END, MC3_END_ARC} from './mechanicalCurvesGuidedLessons';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {GuidedLesson} from './guidedLessons';
import type {LessonAction} from '../model';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import {DescentGraph} from '../../graphs/mechanics/DescentGraph';
import {beadParameter, DEFAULT_DESCENT_STATE, deriveDescent} from '../../mechanics/trackModel';
import {setLanguage, t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- independent integrals and closed forms ----------------------------------------------------------------------------------------------

const g = 9.81;
type V = readonly [number, number];
const PI = Math.PI;
/** Midpoint rule on [a, b] with n nodes. */
function midpoint(f: (x: number) => number, a: number, b: number, n: number): number {
    const h = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += f(a + (i + 0.5) * h);
    return sum * h;
}
/** The time along the line from A = (0, 0) to B = (x, y): uniform acceleration g y / L along L. */
const lineTime = (x: number, y: number) => Math.sqrt((2 * (x * x + y * y)) / (g * y));
const raceCycloidTime = (r: number) => PI * Math.sqrt(r / g);
const raceLineTime = (r: number) => lineTime(PI * r, 2 * r);
/** The circle through A with a vertical tangent there and through B = (pi r, 2r): centre (c, 0). */
const arcCentre = (r: number) => (r * (PI * PI + 4)) / (2 * PI);
/** Time from A along the arc to the angle pi - s^2 (the substitution removes the singularity): ds / v with v = sqrt(2 g c sin(angle)). */
const arcTimeTo = (r: number, s: number) => {
    const c = arcCentre(r);
    return midpoint(sigma => (2 * sigma * c) / Math.sqrt(2 * g * c * Math.sin(sigma * sigma)), 0, s, 4000);
};
const arcSweepRoot = (r: number) => Math.sqrt(PI - Math.atan2(2 * r, PI * r - arcCentre(r)));
const raceArcTime = (r: number) => arcTimeTo(r, arcSweepRoot(r));
const raceTimes = (r: number) => ({line: raceLineTime(r), arc: raceArcTime(r), cycloid: raceCycloidTime(r)});
/** Depth of the bead on each race track after `time` seconds. */
const lineDepth = (r: number, time: number) => 0.5 * g * (2 * r / Math.hypot(PI * r, 2 * r)) ** 2 * time * time;
const cycloidDepth = (r: number, time: number) => r * (1 - Math.cos(time * Math.sqrt(g / r)));
function arcDepth(r: number, time: number): number {
    let lo = 0;
    let hi = arcSweepRoot(r);
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if (arcTimeTo(r, mid) < time) lo = mid; else hi = mid;
    }
    return arcCentre(r) * Math.sin(((lo + hi) / 2) ** 2);
}

/** The Bezier track from A = (0, 0) through P1, P2 to B: the time with the substitution u = w^2 (admissible tracks only: P1 below A). */
function bezierTime(p1: V, p2: V, b: V, nodes = 20000): number {
    const point = (u: number, k: 0 | 1) => 3 * u * (1 - u) ** 2 * p1[k] + 3 * u * u * (1 - u) * p2[k] + u ** 3 * b[k];
    const derivative = (u: number, k: 0 | 1) => 3 * (1 - u) ** 2 * p1[k] + 6 * u * (1 - u) * (p2[k] - p1[k]) + 3 * u * u * (b[k] - p2[k]);
    return midpoint(w => {
        const u = w * w;
        return (2 * w * Math.hypot(derivative(u, 0), derivative(u, 1))) / Math.sqrt(2 * g * point(u, 1));
    }, 0, 1, nodes);
}
/** The cycloid x = r (th - sin th), y = r (1 - cos th) through A and B: th by bisection on (th - sin th) / (1 - cos th) = x / y. */
function cycloidThrough(x: number, y: number): {theta: number; r: number; time: number} {
    let lo = 1e-6;
    let hi = 2 * PI - 1e-6;
    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if ((mid - Math.sin(mid)) / (1 - Math.cos(mid)) < x / y) lo = mid; else hi = mid;
    }
    const theta = (lo + hi) / 2;
    const r = y / (1 - Math.cos(theta));
    return {theta, r, time: theta * Math.sqrt(r / g)};
}
const ceilToCentisecond = (time: number) => Math.ceil(time * 100 - 1e-9) / 100;

// ---- number formats -----------------------------------------------------------------------------------------------------------------

const MINUS = '−';
/** A readout number: up to `digits` decimals, no trailing zeros, decimal comma, true minus sign. */
const readoutNumber = (value: number, digits: number): string => Number(value.toFixed(digits)).toString().replace('-', MINUS).replace('.', ',');
const stripped = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, '');
function proseNumber(value: number, digits: number, language: 'sl' | 'en'): string {
    const text = Number(value.toFixed(digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
}
/** Prose with the LaTeX spacing and the decimal-comma braces removed, so that `1{,}189\ \mathrm{s}` reads 1,189 s. */
const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ').replace(/\\mathrm\{([^}]*)\}/g, ' $1 ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`).test(prose(text));
/** Every number with decimals in an English text (the decimal point is the only separator there). */
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);

// ---- the graph -----------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;

function mountDescent() {
    const graph = createGraph('mechanics-descent');
    if (!(graph instanceof DescentGraph)) throw new Error('mechanics-descent must be the descent graph.');
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
type ParamsAction = Extract<LessonAction, {kind: 'descent'; operation: 'set-params'}>;
const time = (value: number): LessonAction => ({kind: 'descent', operation: 'set-time', t: value});
const params = (patch: Omit<ParamsAction, 'kind' | 'operation'>): LessonAction => ({kind: 'descent', operation: 'set-params', ...patch});
const mode = (value: 'race' | 'track' | 'tautochrone'): LessonAction => ({kind: 'descent', operation: 'set-mode', mode: value});

const s = (value: number) => `${readoutNumber(value, 4)} s`;
const point = (x: number, y: number) => `(${readoutNumber(x, 2)}; ${readoutNumber(y, 2)}) m`;

/** The readout rows of the race with radius r at the slider time `elapsed`, from the independent times. */
function raceRows(r: number, elapsed: number): Record<string, string> {
    const times = raceTimes(r);
    return {
        time: `${readoutNumber(Math.min(elapsed, ceilToCentisecond(Math.max(times.line, times.arc, times.cycloid))), 2)} s`,
        end: point(PI * r, 2 * r), 'time-line': s(times.line), 'time-arc': s(times.arc), 'time-cycloid': s(times.cycloid),
        winner: 'Cikloida', 'line-slower': `${readoutNumber((times.line / times.cycloid - 1) * 100, 1)} %`, radius: `${readoutNumber(r, 2)} m`,
    };
}
interface Controls { readonly p1: V; readonly p2: V; readonly b: V }
/** The readout rows of the Track experiment (all of these tracks are admissible and have the cycloid shown). */
function trackRows(c: Controls, elapsed: number): Record<string, string> {
    const track = bezierTime(c.p1, c.p2, c.b);
    const line = lineTime(c.b[0], c.b[1]);
    const cycloid = cycloidThrough(c.b[0], c.b[1]);
    const difference = track - cycloid.time;
    return {
        time: `${readoutNumber(Math.min(elapsed, ceilToCentisecond(Math.max(track, cycloid.time))), 2)} s`,
        'point-b': point(c.b[0], c.b[1]), 'point-p1': point(c.p1[0], c.p1[1]), 'point-p2': point(c.p2[0], c.p2[1]),
        'time-track': s(track), 'time-line': s(line), 'time-cycloid': s(cycloid.time),
        'cycloid-theta': `${readoutNumber(cycloid.theta, 4)} rad`, 'cycloid-radius': `${readoutNumber(cycloid.r, 4)} m`,
        difference: `${readoutNumber(difference, 4)} s (${readoutNumber((difference / cycloid.time) * 100, 1)} %)`,
    };
}

interface Quote { readonly value: number; readonly digits: number }
const q = (value: number, digits: number): Quote => ({value, digits});

interface Expected {
    readonly state: Readonly<Record<string, unknown>>;
    readonly t: number;
    readonly rows: Record<string, string>;
    /** Numbers the step's expected-state text quotes. */
    readonly quotes: readonly Quote[];
    /** Numbers quoted by the step's explanation, observations or worked example but not by its expected-state text. */
    readonly also?: readonly Quote[];
    /** Numbers with decimals the text asks the learner to set or that name an input (English spelling). */
    readonly inputs?: readonly string[];
}

const raceStep = (r: number, t: number, quotes: readonly Quote[], also: readonly Quote[] = [], inputs: readonly string[] = [], radius = r): Expected =>
    ({state: {mode: 'race', radius}, t, rows: raceRows(r, t), quotes, also, inputs});
const R1 = raceTimes(1);
const ARC_SLOWER = (R1.arc / R1.cycloid - 1) * 100;
const LINE_SLOWER = (R1.line / R1.cycloid - 1) * 100;
const R025 = raceTimes(0.25);
const R3 = raceTimes(3);

const DEFAULT_CONTROLS: Controls = {p1: [0.5, 2], p2: [2, 2.5], b: [3.25, 2]};
const trackStep = (c: Controls, t: number, quotes: readonly Quote[], also: readonly Quote[] = [], inputs: readonly string[] = []): Expected =>
    ({state: {mode: 'track', endX: c.b[0], endY: c.b[1], p1x: c.p1[0], p1y: c.p1[1], p2x: c.p2[0], p2y: c.p2[1], showCycloid: true}, t, rows: trackRows(c, t), quotes, also, inputs});
const DRAGGED: Controls = {p1: [0.25, 1.5], p2: [1.5, 2.5], b: [3.25, 2]};
const SHORT_B: V = [3, 1.5];
const LINE: Controls = {p1: [1, 0.5], p2: [2, 1], b: SHORT_B};
const BENT: Controls = {p1: [0.5, 1], p2: [2, 1.75], b: SHORT_B};
const CLOSE: Controls = {p1: [0.25, 1], p2: [1.5, 1.75], b: SHORT_B};
const trackTime = (c: Controls) => bezierTime(c.p1, c.p2, c.b);
const cycloidOf = (c: Controls) => cycloidThrough(c.b[0], c.b[1]);

const MC1: Record<string, Expected> = {
    'mc1-start': raceStep(1, 0, [q(PI, 2)]),
    'mc1-release': raceStep(1, 0.4, [], [], ['0.4', '1.19']),
    'mc1-readouts': raceStep(1, MC1_END, [q(R1.cycloid, 3), q(R1.arc, 4), q(R1.line, 3), q(LINE_SLOWER, 1)], [q(R1.line / R1.cycloid, 3)], ['1.1890', '1.0030']), // the worked example's two times to four decimals (checked in the reference test)
    'mc1-why': raceStep(1, 0.5, [], [q((Math.atan(2 / PI) * 180) / PI, 1)], ['0.5']),
    'mc1-arc': raceStep(1, 1.1, [q(R1.arc, 4), q(R1.cycloid, 3)], [q(arcCentre(1), 2), q(ARC_SLOWER, 1)], ['1.1']),
    'mc1-explore': raceStep(0.25, 0.6, [q(R025.cycloid, 4), q(R025.arc, 4), q(R025.line, 4)], [q(R3.cycloid, 4), q(R3.arc, 4), q(R3.line, 4), q(LINE_SLOWER, 1)], ['0.25'], 0.25),
};
const MC2: Record<string, Expected> = {
    'mc2-track': trackStep(DEFAULT_CONTROLS, 0, [q(trackTime(DEFAULT_CONTROLS), 4), q(lineTime(3.25, 2), 4), q(cycloidOf(DEFAULT_CONTROLS).time, 4)]),
    'mc2-drag': trackStep(DRAGGED, 1.04, [q(trackTime(DRAGGED), 4), q(trackTime(DRAGGED) - cycloidOf(DRAGGED).time, 4), q(((trackTime(DRAGGED) - cycloidOf(DRAGGED).time) / cycloidOf(DRAGGED).time) * 100, 1)], [], ['0.25', '1.5', '2.5']),
    'mc2-line': trackStep(LINE, 1.24, [q(trackTime(LINE), 4), q(cycloidOf(LINE).time, 4)], [q(trackTime(BENT), 3)], ['0.5', '1.5', '1.75']),
    'mc2-cycloid': trackStep(DEFAULT_CONTROLS, 1.04, [q(cycloidOf(DEFAULT_CONTROLS).theta, 4), q(cycloidOf(DEFAULT_CONTROLS).r, 4), q(cycloidOf(DEFAULT_CONTROLS).time, 4)]),
    'mc2-beat': trackStep(CLOSE, 0.99, [q(trackTime(CLOSE), 4), q(cycloidOf(CLOSE).time, 4), q(trackTime(CLOSE) - cycloidOf(CLOSE).time, 4), q(((trackTime(CLOSE) - cycloidOf(CLOSE).time) / cycloidOf(CLOSE).time) * 100, 1)], [], ['0.25', '1.5', '1.75']),
    'mc2-horizontal': {
        state: {mode: 'track', endX: 3.25, endY: 2, p1x: 1, p1y: 0, p2x: 2, p2y: 2.5, showCycloid: true}, t: 1.03,
        rows: {
            ...Object.fromEntries(Object.entries(trackRows(DEFAULT_CONTROLS, 1.03)).filter(([key]) => ['time', 'point-b', 'point-p2', 'time-line', 'time-cycloid', 'cycloid-theta', 'cycloid-radius'].includes(key))),
            'point-p1': point(1, 0), 'time-track': 'brez časa', difference: 'brez časa',
        },
        quotes: [q(lineTime(3.25, 2), 4), q(cycloidOf(DEFAULT_CONTROLS).time, 4)], also: [], inputs: ['0.5'],
    },
    'mc2-explore': trackStep(DEFAULT_CONTROLS, 1.04, [q(trackTime(DEFAULT_CONTROLS), 4)], [], ['0.5']),
};

// ---- MC3: the tautochrone ------------------------------------------------------------------------------------------------------------

/** The cycloid time from theta0 to the lowest point by a midpoint rule with theta = theta0 + (pi - theta0) s^2 (the substitution removes the 1/sqrt singularity at the start). */
function tautCycloidTime(r: number, theta0: number): number {
    return midpoint(u => {
        const angle = theta0 + (PI - theta0) * u * u;
        const half = Math.sin(angle / 2) ** 2; // (1 - cos angle) / 2, and cos(theta0) - cos(angle) = 2 sin((angle + theta0) / 2) sin((angle - theta0) / 2) with angle - theta0 = (pi - theta0) u^2
        const gap = Math.sin((angle + theta0) / 2) * Math.sin(((PI - theta0) * u * u) / 2);
        return Math.sqrt((r * half) / (g * gap)) * 2 * (PI - theta0) * u;
    }, 0, 1, 400000);
}
/** The circular arc of radius 4r through the lowest point: the time from the cycloid's height at theta0 is sqrt(R/g) K(sin(phi/2)) (complete elliptic integral by the AGM). */
function tautArcTime(r: number, theta0: number): number {
    const radius = 4 * r;
    const phi = Math.acos(1 - (r * (1 + Math.cos(theta0))) / radius);
    const k = Math.sin(phi / 2);
    let a = 1;
    let b = Math.sqrt(1 - k * k);
    for (let i = 0; i < 40; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
    return Math.sqrt(radius / g) * (PI / (2 * a));
}
const tautClosed = (r: number) => PI * Math.sqrt(r / g);
const TH = [0.3, 1, 2] as const;
const tautEnd = (r: number, thetas: readonly number[], arc: boolean) =>
    ceilToCentisecond(Math.max(tautClosed(r), ...(arc ? thetas.map(theta => tautArcTime(r, theta)) : [])));

/** The readout rows of the tautochrone (sl format; the English rows only differ in the decimal separator) at the slider time `elapsed`. */
function tautRows(r: number, thetas: readonly number[], arc: boolean, elapsed: number): Record<string, string> {
    const rows: Record<string, string> = {time: `${readoutNumber(Math.min(elapsed, tautEnd(r, thetas, arc)), 2)} s`, radius: `${readoutNumber(r, 2)} m`, 'closed-form': s(tautClosed(r))};
    thetas.forEach((theta, i) => {
        rows[`bead-${i + 1}`] = `θ = ${readoutNumber(theta, 2)} rad: ${s(tautCycloidTime(r, theta))}`;
        if (arc) rows[`arc-${i + 1}`] = s(tautArcTime(r, theta));
    });
    return rows;
}
const tautStep = (t: number, quotes: readonly Quote[], also: readonly Quote[] = [], inputs: readonly string[] = [], arc = false, r = 1, thetas: readonly number[] = TH): Expected =>
    ({state: {mode: 'tautochrone', radius: r, theta1: thetas[0], theta2: thetas[1], theta3: thetas[2], showArc: arc}, t, rows: tautRows(r, thetas, arc, t), quotes, also, inputs});
const TC = tautClosed(1);
const MC3: Record<string, Expected> = {
    'mc3-start': tautStep(0, [q(0.3, 1)], [0.3, 1, 2].map(theta => q(1 - Math.cos(theta), 2))),
    'mc3-release': tautStep(0.5, [q(0.5, 1), q(tautEnd(1, TH, false), 2)], [], ['0.01']),
    'mc3-readouts': tautStep(tautEnd(1, TH, false), [q(TC, 3), q(tautEnd(1, TH, false), 2)]),
    'mc3-theorem': tautStep(0.8, [q(0.8, 1), q(TC, 3)], [q(tautClosed(0.25), 4), q(0.25, 2)]),
    'mc3-arc': tautStep(tautEnd(1, TH, true), [q(TC, 3), ...TH.map(theta => q(tautArcTime(1, theta), 4)), q(tautEnd(1, TH, true), 2)], [], [], true),
    'mc3-starts': tautStep(0, [q(0.3, 1)], [q(TC, 3), ...[0.5, 1.5, 2.5].map(theta => q(tautArcTime(1, theta), 4))], ['0.05', '0.5', '1.5', '2.5', '3.1'], true),
    'mc3-explore': tautStep(0, [q(0.3, 1)], [q(tautClosed(3), 4)], ['0.25', '3'], false),
};

const lessons = [
    ['MC1', mechanicalCurvesRaceLesson, MC1, 'race-the-tracks', 6],
    ['MC2', mechanicalCurvesTrackLesson, MC2, 'drag-the-track', 7],
    ['MC3', mechanicalTautochroneLesson, MC3, 'tautochrone', 7],
] as const;

const NEUTRAL = ['9.81', '0.25', '3.25'];
describe.each(lessons)('%s', (name, lesson, scenes, section, count) => {
    test('has ordered steps with a scene each, and the chapter owns it', () => {
        expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: count}, (_, i) => i + 1));
        expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(scenes));
        expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(count);
        const owned = getChapterOwnedLessons('mechanical-curves')!.lesson(section)!;
        expect(owned.steps).toHaveLength(count);
        expect(owned.steps.every(step => step.scene)).toBe(true);
    });

    test(`${name}: the numbers each step quotes are those of its scene, in both languages, and no other number with decimals is quoted`, () => {
        for (const step of lesson.steps) {
            const expected = scenes[step.id];
            const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
            const calculations = examples.map(example => (example.check ? [example.check.sl, example.check.en] : [])).flat();
            const formulas = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id)).map(block => [block.explanation.en, block.notation.en]).flat();
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
            const allowed = new Set([...expected.quotes, ...(expected.also ?? [])].map(quote => proseNumber(quote.value, quote.digits, 'en')).concat(expected.inputs ?? [], NEUTRAL));
            const texts = [step.title.en, step.purpose.en, step.explanation.en, step.observationPrompt.en, step.scene!.expectedState.en, ...step.expectedObservations.map(o => o.en), ...calculations, ...formulas];
            const unaccounted = texts.flatMap(decimalsIn).filter(value => !allowed.has(value));
            expect({id: step.id, unaccounted}).toEqual({id: step.id, unaccounted: []});
        }
    });
});

function checkScenes(lesson: GuidedLesson, scenes: Record<string, Expected>) {
    const m = mountDescent();
    try {
        const ids = Object.keys(scenes);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = scenes[id];
            m.scene(lesson, id);
            m.scene(lesson, id);
            const state = m.graph.state as unknown as Record<string, unknown>;
            expect({id, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, state[key]]))}).toEqual({id, ...expected.state});
            expect({id, time: m.graph.time, playing: m.graph.playing}).toEqual({id, time: expected.t, playing: false});
            for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(text)});
            if (expected.state.mode === 'track' && id !== 'mc2-horizontal') expect({id, status: readout('status')}).toEqual({id, status: t('descent_graph_status_track_ok')});
        }
    } finally {
        m.mounted.view.unmount();
    }
}

test('MC1: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    checkScenes(mechanicalCurvesRaceLesson, MC1);
});

test('MC2: every scene lands in the stated state and readouts, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    checkScenes(mechanicalCurvesTrackLesson, MC2);
});

test('the independent integrals reproduce the quoted reference values', () => {
    expect(raceCycloidTime(1)).toBeCloseTo(1.0030, 4);
    expect(Math.hypot(PI, 2)).toBeCloseTo(3.7242, 4);
    expect(raceLineTime(1)).toBeCloseTo(1.1890, 4);
    expect(raceArcTime(1)).toBeCloseTo(1.0285, 4);
    expect(arcCentre(1)).toBeCloseTo(2.2074, 4);
    expect([raceLineTime(1), raceCycloidTime(1)].map(value => value.toFixed(4))).toEqual(['1.1890', '1.0030']);
    expect((Math.atan(2 / PI) * 180) / PI).toBeCloseTo(32.48, 2);
    expect(raceArcTime(2)).toBeCloseTo(Math.sqrt(2) * raceArcTime(1), 6); // lengths scale with r, times with sqrt(r)
    expect(cycloidOf(DEFAULT_CONTROLS).theta).toBeCloseTo(3.1947, 4);
    expect(cycloidOf(DEFAULT_CONTROLS).r).toBeCloseTo(1.0007, 4);
    // A track along the line has the closed-form line time, and a Bezier curve with the cycloid's own shape cannot be cheaper than the cycloid.
    expect(trackTime(LINE)).toBeCloseTo(lineTime(3, 1.5), 6);
    // The kernel (not used for the expected values above) agrees: the rounded-up slider ends the scenes name.
    expect(ceilToCentisecond(Math.max(R1.line, R1.arc, R1.cycloid))).toBe(MC1_END);
    expect(deriveDescent(DEFAULT_DESCENT_STATE).tEnd).toBe(MC1_END);
});

test('the scene times are the slider end of their run (or 0, or the time the text names), and the radius scene sets the slider end of r = 0,25', () => {
    const endOf = (c: Controls) => ceilToCentisecond(Math.max(trackTime(c), cycloidOf(c).time));
    expect(endOf(DEFAULT_CONTROLS)).toBe(MC2['mc2-explore'].t);
    expect(endOf(DRAGGED)).toBe(MC2['mc2-drag'].t);
    expect(endOf(LINE)).toBe(MC2['mc2-line'].t);
    expect(endOf(CLOSE)).toBe(MC2['mc2-beat'].t);
    expect(ceilToCentisecond(cycloidOf(DEFAULT_CONTROLS).time)).toBe(MC2['mc2-horizontal'].t); // no track time: the cycloid alone sets the run
    expect(ceilToCentisecond(Math.max(R025.line, R025.arc, R025.cycloid))).toBe(MC1['mc1-explore'].t);
    for (const [id, expected] of Object.entries({...MC1, ...MC2})) {
        const graphState = {...DEFAULT_DESCENT_STATE, ...expected.state} as typeof DEFAULT_DESCENT_STATE;
        if (id !== 'mc2-horizontal') expect({id, atEnd: expected.t === deriveDescent(graphState).tEnd || expected.t < deriveDescent(graphState).tEnd}).toEqual({id, atEnd: true});
    }
    expect(deriveDescent({...DEFAULT_DESCENT_STATE, mode: 'track', p1x: 1, p1y: 0}).tEnd).toBe(MC2['mc2-horizontal'].t);
    expect(deriveDescent({...DEFAULT_DESCENT_STATE, radius: 0.25}).tEnd).toBe(0.6);
});

test('MC1 step 2 and 4: where the beads are at 0,4 s and 0,5 s (independent models, and the graph kernel)', () => {
    for (const elapsed of [0.4, 0.5]) {
        const line = lineDepth(1, elapsed);
        const arc = arcDepth(1, elapsed);
        const cycloid = cycloidDepth(1, elapsed);
        expect({elapsed, lineHighest: line < arc && line < cycloid}).toEqual({elapsed, lineHighest: true});
        if (elapsed === 0.4) expect({arcDeeper: arc > 2 * line, cycloidDeeper: cycloid > 2 * line}).toEqual({arcDeeper: true, cycloidDeeper: true}); // "much deeper"
        const tracks = deriveDescent(DEFAULT_DESCENT_STATE);
        if (tracks.mode !== 'race') throw new Error('the default is the race');
        for (const [id, expectedDepth] of [['line', line], ['arc', arc], ['cycloid', cycloid]] as const) {
            const track = tracks.tracks[id];
            expect({elapsed, id, depth: Number(track.y(beadParameter(track, 0, elapsed)).toFixed(3))}).toEqual({elapsed, id, depth: Number(expectedDepth.toFixed(3))});
        }
    }
    // At 1,1 s the arc and the cycloid have arrived and the line has not.
    expect(R1.arc).toBeLessThan(1.1);
    expect(R1.cycloid).toBeLessThan(1.1);
    expect(R1.line).toBeGreaterThan(1.1);
});

test('MC1 step 5: the arc dips below B (to 2,21 m, B is 2 m deep) and is about 2,5 % slower than the cycloid', () => {
    expect(arcCentre(1)).toBeGreaterThan(2);
    expect(Number(arcCentre(1).toFixed(2))).toBe(2.21);
    expect(Number(ARC_SLOWER.toFixed(1))).toBe(2.5);
});

test('MC1: the changes the text asks the learner to make (the time slider, every radius from 0,25 to 3) give the closed-form readouts', () => {
    const m = mountDescent();
    try {
        m.scene(mechanicalCurvesRaceLesson, 'mc1-release');
        for (let step = 0; step <= 119; step += 7) {
            m.learner(time(step / 100));
            expect({step, time: stripped(readout('time'))}).toEqual({step, time: stripped(`${readoutNumber(step / 100, 2)} s`)});
        }
        m.scene(mechanicalCurvesRaceLesson, 'mc1-explore');
        for (let quarter = 1; quarter <= 12; quarter++) {
            const r = quarter / 4;
            m.learner(params({radius: r}));
            const rows = raceRows(r, 0);
            for (const row of ['end', 'time-line', 'time-arc', 'time-cycloid', 'winner', 'line-slower', 'radius']) expect({r, row, text: stripped(readout(row))}).toEqual({r, row, text: stripped(rows[row])});
            expect({r, order: raceTimes(r).cycloid < raceTimes(r).arc && raceTimes(r).arc < raceTimes(r).line}).toEqual({r, order: true});
            expect(Number((raceTimes(r).cycloid / raceTimes(1).cycloid).toFixed(9))).toBe(Number(Math.sqrt(r).toFixed(9))); // all times scale with sqrt(r)
        }
        // Step 6 quotes the readouts of r = 3 (slider end 2,06) and of r = 0,25.
        m.learner(params({radius: 3}), time(2.06));
        expect(stripped(readout('time-cycloid'))).toBe(stripped('1,7373 s'));
        expect(stripped(readout('time-arc'))).toBe(stripped('1,7814 s'));
        expect(stripped(readout('time-line'))).toBe(stripped('2,0595 s'));
        expect(stripped(readout('time'))).toBe(stripped('2,06 s'));
    } finally {
        m.mounted.view.unmount();
    }
});

test('MC2: the changes the text asks the learner to make (drag P1 and P2, move B, switch the cycloid, P1 to the start height and above it) give the stated readouts', () => {
    const m = mountDescent();
    try {
        // Step 3: from the track that is the line, drag P1 to (0,5; 1) and P2 to (2; 1,75).
        m.scene(mechanicalCurvesTrackLesson, 'mc2-line');
        expect(stripped(readout('time-track'))).toBe(stripped(readout('time-line')));
        m.learner(params({p1x: 0.5, p1y: 1, p2x: 2, p2y: 1.75}));
        const bent = trackRows(BENT, m.graph.time);
        for (const row of ['point-p1', 'point-p2', 'time-track', 'time-line', 'time-cycloid', 'difference']) expect({row, text: stripped(readout(row))}).toEqual({row, text: stripped(bent[row])});
        expect(stripped(readout('time-track'))).toBe(stripped('1,002 s'));
        // Step 5: the close track, the learner moves B and the points, the cycloid switch only hides the cycloid (the track readouts stay).
        m.scene(mechanicalCurvesTrackLesson, 'mc2-beat');
        m.learner(params({showCycloid: false}));
        expect(stripped(readout('time-track'))).toBe(stripped(s(trackTime(CLOSE))));
        // Step 6: P1 at the height of A: no time; then above A: the status names the control point.
        m.scene(mechanicalCurvesTrackLesson, 'mc2-horizontal');
        expect(readout('status')).toBe(t('descent_graph_status_never_starts'));
        m.learner(params({p1x: 1, p1y: -0.5}));
        expect(readout('status')).toBe(t('descent_graph_status_above_start'));
        expect(readout('time-track')).toBe(t('descent_graph_not_timed'));
        // Step 1/7: the whole default scene repeated after the learner moved everything returns to the stated readouts.
        m.scene(mechanicalCurvesTrackLesson, 'mc2-explore');
        for (const [row, text] of Object.entries(MC2['mc2-explore'].rows)) expect({row, text: stripped(readout(row))}).toEqual({row, text: stripped(text)});
    } finally {
        m.mounted.view.unmount();
    }
});

test('MC2 step 5 and 7: no admissible Bezier track from A to B = (3; 1,5) is faster than the cycloid (a grid of 400 tracks, independent integrals)', () => {
    const cycloid = cycloidThrough(3, 1.5).time;
    let tracks = 0;
    let smallest = Infinity;
    for (const p1x of [0, 0.5, 1, 2, 3]) for (const p1y of [0.25, 1, 2, 3.5]) for (const p2x of [0.5, 1.5, 3, 5]) for (const p2y of [0, 1, 2, 3, 4]) {
        for (const endY of [1.5]) {
            smallest = Math.min(smallest, bezierTime([p1x, p1y], [p2x, p2y], [3, endY], 4000) - cycloid);
            tracks++;
        }
    }
    expect(tracks).toBe(400);
    expect(smallest).toBeGreaterThan(-1e-6);
    // The readouts of the close track are above the cycloid by 0,2 %: below 0,5 % as step 7 asks for.
    expect((trackTime(CLOSE) / cycloid - 1) * 100).toBeLessThan(0.5);
});

test('the worked examples state the closed forms to the digits the graph reads out', () => {
    const [race] = mechanicalCurvesRaceLesson.workedExamples!;
    const lat = (value: number, digits: number) => readoutNumber(value, digits).replace(',', '{,}');
    expect(race.resultLatex).toContain(`T_c=${lat(R1.cycloid, 4)}`);
    expect(race.resultLatex).toContain(`L=${lat(Math.hypot(PI, 2), 4)}`);
    expect(race.resultLatex).toContain(`T_l=${lat(R1.line, 4)}`);
    const [track] = mechanicalCurvesTrackLesson.workedExamples!;
    const cycloid = cycloidOf(DEFAULT_CONTROLS);
    expect(track.calculationLatex).toContain(`\\theta_B=${lat(cycloid.theta, 4)}`);
    expect(track.calculationLatex).toContain(`=${lat(cycloid.r, 4)}`);
    expect(track.resultLatex).toBe(`T=${lat(cycloid.time, 4)}`);
});

test('the line time formula in the lesson holds for every radius, not only for r = 1', () => {
    const text = mechanicalCurvesRaceLesson.formulaBlocks!.find(block => block.id === 'closed-forms')!;
    expect(text.latex).toContain('T_{l}=\\frac{L}{\\sqrt{gr}}');
    for (const r of [0.25, 1, 3]) expect(Math.hypot(PI * r, 2 * r) / Math.sqrt(g * r)).toBeCloseTo(raceLineTime(r), 12);
});

test('restoring the checkpoint on leaving a lesson returns the free state', () => {
    const m = mountDescent();
    try {
        const free = JSON.stringify({state: m.graph.state, time: m.graph.time});
        const freeReadouts = [...document.querySelectorAll('[data-readout]')].map(node => node.textContent);
        for (const [lesson, scenes] of [[mechanicalCurvesRaceLesson, MC1], [mechanicalCurvesTrackLesson, MC2]] as const) {
            for (const id of Object.keys(scenes)) m.scene(lesson, id);
            m.learner(mode('race'), time(0.3));
            expect(JSON.stringify({state: m.graph.state, time: m.graph.time})).not.toBe(free);
            act(() => { m.capabilities.restoreState(m.checkpoint); });
            expect(JSON.stringify({state: m.graph.state, time: m.graph.time})).toBe(free);
            expect([...document.querySelectorAll('[data-readout]')].map(node => node.textContent)).toEqual(freeReadouts);
        }
    } finally {
        m.mounted.view.unmount();
    }
});

// ---- MC3 tests -----------------------------------------------------------------------------------------------------------------------

const inLanguage = (language: 'sl' | 'en', text: string) => (language === 'sl' ? text : text.replace(/,/g, '.'));
const BOTTOM = {sl: 'že v najnižji točki', en: 'already at the lowest point'} as const;

describe('MC3 on the real graph', () => {
    test.each(['sl', 'en'] as const)('every scene lands in the stated state and readouts (%s), in one synchronous sequence, out of order and twice', language => {
        setLanguage(language);
        const m = mountDescent();
        try {
            const ids = Object.keys(MC3);
            for (const id of [...ids, ...ids.slice().reverse()]) {
                const expected = MC3[id];
                m.scene(mechanicalTautochroneLesson, id);
                m.scene(mechanicalTautochroneLesson, id);
                const state = m.graph.state as unknown as Record<string, unknown>;
                expect({id, ...Object.fromEntries(Object.keys(expected.state).map(key => [key, state[key]]))}).toEqual({id, ...expected.state});
                expect({id, time: m.graph.time, playing: m.graph.playing}).toEqual({id, time: expected.t, playing: false});
                for (const [row, text] of Object.entries(expected.rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(inLanguage(language, text))});
                if (!(expected.state.showArc as boolean)) for (const row of ['arc-1', 'arc-2', 'arc-3']) expect(readout(row), `${id} ${row}`).toBeNull();
            }
        } finally {
            m.mounted.view.unmount();
        }
    });

    test.each(['sl', 'en'] as const)('the changes the text asks for give the quoted readouts (%s)', language => {
        setLanguage(language);
        const m = mountDescent();
        const check = (id: string, rows: Record<string, string>) => {
            for (const [row, text] of Object.entries(rows)) expect({id, row, text: stripped(readout(row))}).toEqual({id, row, text: stripped(inLanguage(language, text))});
        };
        try {
            // step 4: the radius 0,25 m
            m.scene(mechanicalTautochroneLesson, 'mc3-theorem');
            m.learner(params({radius: 0.25}));
            check('mc3-theorem', tautRows(0.25, TH, false, 0.8));
            // step 6: the angles 0,5; 1,5; 2,5 (arc shown), then bead 1 at 0 and bead 3 at pi
            m.scene(mechanicalTautochroneLesson, 'mc3-starts');
            m.learner(params({theta1: 0.5, theta2: 1.5, theta3: 2.5}));
            check('mc3-starts', tautRows(1, [0.5, 1.5, 2.5], true, 0));
            m.learner(params({theta1: 0, theta3: PI}));
            const edge = tautRows(1, [0, 1.5, PI], true, 0);
            delete edge['arc-3'];
            check('mc3-starts edge', {...edge, 'bead-3': `θ = π: ${BOTTOM[language]}`});
            expect(readout('arc-3')).toBeNull();
            // step 7: the radius 3 m
            m.scene(mechanicalTautochroneLesson, 'mc3-explore');
            m.learner(params({radius: 3}));
            check('mc3-explore', tautRows(3, TH, false, 0));
        } finally {
            m.mounted.view.unmount();
        }
    });
});

test('MC3 reference values: closed forms, the cycloid quadrature and the elliptic arc times, and the slider ends the scenes name', () => {
    expect(tautClosed(1)).toBeCloseTo(1.003, 3);
    expect(tautClosed(0.25)).toBeCloseTo(tautClosed(1) / 2, 12);
    expect(tautClosed(3)).toBeCloseTo(1.7373, 4);
    for (const theta of [0, 0.3, 1, 2, 0.5, 1.5, 2.5]) expect(tautCycloidTime(1, theta)).toBeCloseTo(tautClosed(1), 4);
    expect(TH.map(theta => tautArcTime(1, theta).toFixed(4))).toEqual(['1.0745', '1.0574', '1.0221']);
    expect([0.5, 1.5, 2.5].map(theta => tautArcTime(1, theta).toFixed(4))).toEqual(['1.0712', '1.0394', '1.0094']);
    expect(Math.min(...TH.map(theta => tautArcTime(1, theta)))).toBeGreaterThan(tautClosed(1)); // the arc is slower at every start tried
    expect(tautArcTime(1, 0)).toBeGreaterThan(tautArcTime(1, 0.3));
    expect(tautEnd(1, TH, false)).toBe(MC3_END);
    expect(tautEnd(1, TH, true)).toBe(MC3_END_ARC);
    expect(deriveDescent({...DEFAULT_DESCENT_STATE, mode: 'tautochrone'}).tEnd).toBe(MC3_END);
    expect(deriveDescent({...DEFAULT_DESCENT_STATE, mode: 'tautochrone', showArc: true}).tEnd).toBe(MC3_END_ARC);
});

describe('MC3 text', () => {
    const lesson = mechanicalTautochroneLesson;
    const everyText = () => {
        const out: {where: string; language: 'sl' | 'en'; text: string}[] = [];
        for (const language of ['sl', 'en'] as const) {
            const add = (where: string, text: string) => out.push({where, language, text});
            add('title', lesson.title[language]);
            add('summary', lesson.summary[language]);
            lesson.prerequisites.forEach((x, i) => add(`prerequisite ${i}`, x[language]));
            lesson.learningGoals.forEach((x, i) => add(`goal ${i}`, x[language]));
            lesson.edgeCases.forEach((x, i) => add(`edge ${i}`, x[language]));
            for (const f of lesson.formulaBlocks!) { add(`${f.id} latex`, f.latex); add(`${f.id} notation`, f.notation[language]); add(`${f.id} explanation`, f.explanation[language]); }
            for (const e of lesson.workedExamples!) { add(`${e.id} title`, e.title[language]); add(`${e.id} calc`, e.calculationLatex); add(`${e.id} result`, e.resultLatex); add(`${e.id} check`, e.check![language]); }
            for (const step of lesson.steps) {
                add(`${step.id} title`, step.title[language]);
                add(`${step.id} purpose`, step.purpose[language]);
                add(`${step.id} explanation`, step.explanation[language]);
                add(`${step.id} prompt`, step.observationPrompt[language]);
                step.expectedObservations.forEach((o, i) => add(`${step.id} observation ${i}`, o[language]));
                add(`${step.id} state`, step.scene!.expectedState[language]);
            }
        }
        return out;
    };

    test('ownership: the chapter owns the tautochrone section with its lesson id and this content, after the two earlier sections', () => {
        const owned = getChapterOwnedLessons('mechanical-curves')!;
        expect(owned.rows().map(row => row[0])).toEqual(['race-the-tracks', 'drag-the-track', 'tautochrone']);
        const adapted = owned.lesson('tautochrone')!;
        expect(adapted.id).toBe('mechanics-descent-tautochrone');
        expect(adapted.demonstrationId).toBe('mechanics-descent');
        expect(owned.lesson('drag-the-track')!.id).toBe('mechanics-descent-track');
    });

    test('a worked example is present, bound to the theorem step and its formula, and its result is the closed form to four decimals', () => {
        expect(lesson.workedExamples).toHaveLength(1);
        const [example] = lesson.workedExamples!;
        const bound = lesson.steps.filter(step => step.workedExampleId === example.id);
        expect(bound.map(step => step.id)).toEqual(['mc3-theorem']);
        expect(bound[0].formulaIds).toContain('tautochrone-time');
        expect(example.resultLatex).toBe(`T=${tautClosed(1).toFixed(4).replace('.', '{,}')}`);
        expect(example.calculationLatex).toContain('9{,}81');
    });

    test('sl and en quote the same numbers in every field', () => {
        const numbers = (text: string) => text.replace(/\{,\}/g, '.').replace(/,/g, '.').match(/\d+(?:\.\d+)?/g) ?? [];
        const bySl = new Map<string, string>();
        for (const {where, language, text} of everyText()) {
            if (language === 'sl') bySl.set(where, text);
            else expect({where, numbers: numbers(text)}).toEqual({where, numbers: numbers(bySl.get(where)!)});
        }
    });

    test('math is delimited: no control characters, no doubled backslashes after the TS string is read, balanced delimiters, no {,} in English', () => {
        for (const {where, language, text} of everyText()) {
            expect({where, language, control: /[\u0000-\u001f]/.test(text)}).toEqual({where, language, control: false});
            expect({where, language, doubled: /\\\\/.test(text)}).toEqual({where, language, doubled: false});
            expect({where, language, balanced: (text.match(/\\\(/g) ?? []).length === (text.match(/\\\)/g) ?? []).length}).toEqual({where, language, balanced: true});
            if (language === 'en' && !/latex|calc|result/.test(where)) expect({where, comma: text.includes('{,}')}).toEqual({where, comma: false});
        }
    });

    test('no step reveals its prediction in its title, purpose, explanation, prompt, formulas or worked example', () => {
        const forbidden = (id: string, language: 'sl' | 'en'): RegExp[] => {
            const sl = language === 'sl';
            switch (id) {
                case 'mc3-start':
                case 'mc3-release': return [sl ? /ob istem času|istočasno|enak/ : /same time|simultaneous|equal|identical/];
                case 'mc3-readouts': return [/1[.,]003/, sl ? /enak|isti čas/ : /equal|identical|same/];
                case 'mc3-theorem': return [/0[.,]50/, sl ? /polovic/ : /half/];
                case 'mc3-arc': return [/1[.,]0[0-9]{3}/, sl ? /daljš|počasnej|ni tavtohron/ : /longer|slower|not a tautochrone/];
                case 'mc3-starts': return [/1[.,]0[0-9]{3}/, sl ? /krajš|hitrej/ : /shorter|faster/];
                case 'mc3-explore': return [/1[.,]73/, sl ? /ne obstaja|ni hitrejš|enak času/ : /no start|not faster|equals the time/];
                default: return [];
            }
        };
        for (const step of lesson.steps) {
            for (const language of ['sl', 'en'] as const) {
                const formulas = (lesson.formulaBlocks ?? []).filter(block => step.formulaIds.includes(block.id));
                const example = (lesson.workedExamples ?? []).find(item => item.id === step.workedExampleId);
                const shown = prose([step.title[language], step.purpose[language], step.explanation[language], step.observationPrompt[language],
                    ...formulas.flatMap(f => [f.latex, f.notation[language], f.explanation[language]]), ...(example ? [example.title[language], example.check![language]] : [])].join(' '));
                for (const pattern of forbidden(step.id, language)) {
                    expect({id: step.id, language, pattern: String(pattern), leaked: pattern.test(shown)}).toEqual({id: step.id, language, pattern: String(pattern), leaked: false});
                }
            }
        }
    });

    test('the summary no longer carries the theorem, the step titles are the reviewed ones, and the prompts and field names are the real ones', () => {
        expect({sl: /izrek|tavtohron/i.test(lesson.summary.sl), en: /theorem/i.test(lesson.summary.en)}).toEqual({sl: false, en: false});
        expect(lesson.steps[4].title).toEqual({sl: 'Krožni lok za primerjavo', en: 'The circular arc for comparison'});
        expect(lesson.steps[0].explanation.sl).toContain('Pred branjem odčitkov in stanja grafa napovej');
        expect(lesson.steps[0].explanation.en).toContain('Before reading the readouts and the status line, predict');
        expect(lesson.steps[6].explanation.sl).toContain('Preveri, ali obstaja začetek');
        expect(lesson.steps[6].explanation.en).toContain('Test whether there is a start');
        expect(lesson.steps[5].explanation.sl).toContain('Kroglica 1: kot θ');
        expect(lesson.steps[5].explanation.en).toContain('Bead 1: angle θ');
        expect(t('descent_graph_theta1_label')).toBe('Kroglica 1: kot θ');
    });
});
