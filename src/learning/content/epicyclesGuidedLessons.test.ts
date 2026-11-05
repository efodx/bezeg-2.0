/**
 * F5 (epicycles): every scene lands in the state the text states (real graph, one synchronous sequence of actions), and every number
 * the lesson quotes is a value of the scene it belongs to. The values are recomputed here from the loops written out in this file (de Casteljau
 * evaluation plus Simpson quadrature on each span, a direct partial sum on the 2000 trace samples, closed forms for the diamond), never by the
 * kernels in `src/analysis/closedSpline.ts` or `epicycleModel.ts`; the kernel is cross-checked once per quoted value at the end.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {epicyclesGuidedLessons} from './epicyclesGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {analyzeEpicycle, epicycleTerms, maxTraceError} from '../../analysis/epicycleModel';
import type {EpicycleModel} from '../../analysis/epicycleModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = epicyclesGuidedLessons.find(entry => entry.demonstrationId === 'epicycles')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.observationPrompt[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = value.toFixed(decimals);
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

// ---- Independent values -----------------------------------------------------------------------------------------------------------------
const PI = Math.PI;
type P = [number, number];
/** A closed loop: vertices and, per span, its two control points (null for a straight span). */
interface Loop {v: P[]; s: (P[] | null)[]}
const KAPPA = 4 / 3 * (Math.SQRT2 - 1);
const CORNERS: P[] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const circleLoop = (): Loop => ({
    v: CORNERS.map(p => [...p] as P),
    s: CORNERS.map((a, i) => {
        const b = CORNERS[(i + 1) % 4];
        return [[a[0] - KAPPA * a[1], a[1] + KAPPA * a[0]], [b[0] + KAPPA * b[1], b[1] - KAPPA * b[0]]] as P[];
    }),
});
const diamondLoop = (): Loop => ({v: CORNERS.map(p => [...p] as P), s: CORNERS.map(() => null)});
const unevenLoop = (): Loop => ({
    v: [[-2, -1], [-1.5, -0.5], [-1, 1.5], [1, 2], [2, 0], [0.5, -1.5]],
    s: [[[-2.15, -0.65], [-1.95, -0.45]], [[-1.25, 0.45], [-1.05, 1.15]], [[-0.15, 1.95], [0.55, 2.15]],
        [[1.65, 1.15], [1.95, 0.45]], [[1.4, -0.9], [0.9, -1.4]], [[-0.65, -1.55], [-1.45, -1.35]]],
});
const movedLoop = (): Loop => { const loop = circleLoop(); loop.s[0]![0] = [1.5, 0.55]; return loop; };

const spanPoints = (loop: Loop, i: number): P[] => {
    const a = loop.v[i];
    const b = loop.v[(i + 1) % loop.v.length];
    return loop.s[i] ? [a, ...loop.s[i]!, b] : [a, b];
};
const casteljau = (points: P[], u: number): P => {
    let q = points;
    while (q.length > 1) q = q.slice(1).map((p, i) => [(1 - u) * q[i][0] + u * p[0], (1 - u) * q[i][1] + u * p[1]] as P);
    return q[0];
};
type Kind = 'equal' | 'chord';
const spanEnds = (loop: Loop, kind: Kind): number[] => {
    const m = loop.v.length;
    if (kind === 'equal') return Array.from({length: m + 1}, (_, j) => 2 * PI * j / m);
    const chords = loop.v.map((a, i) => Math.hypot(loop.v[(i + 1) % m][0] - a[0], loop.v[(i + 1) % m][1] - a[1]));
    const total = chords.reduce((x, y) => x + y, 0);
    let acc = 0;
    return [0, ...chords.map((c, j) => { acc += c; return j === m - 1 ? 2 * PI : 2 * PI * acc / total; })];
};
/** z(t) from the loop and the span ends. */
const evaluate = (loop: Loop, ends: number[], t: number): P => {
    let j = 0;
    while (j < loop.v.length - 1 && t >= ends[j + 1]) j += 1;
    return casteljau(spanPoints(loop, j), (t - ends[j]) / (ends[j + 1] - ends[j]));
};
type Coefficients = Map<number, P>;
/** c_k = 1/(2 pi) times the integral of z e^{-ikt}, Simpson with 2000 intervals on each span. */
const coefficients = (loop: Loop, kind: Kind, kMax = 15): Coefficients => {
    const ends = spanEnds(loop, kind);
    const result: Coefficients = new Map();
    for (let k = -kMax; k <= kMax; k += 1) {
        let re = 0;
        let im = 0;
        for (let j = 0; j < loop.v.length; j += 1) {
            const points = spanPoints(loop, j);
            const M = 2000;
            const h = (ends[j + 1] - ends[j]) / M;
            for (let i = 0; i <= M; i += 1) {
                const t = ends[j] + i * h;
                const w = (i === 0 || i === M ? 1 : i % 2 ? 4 : 2) * h / 3;
                const z = casteljau(points, i / M);
                re += w * (z[0] * Math.cos(k * t) + z[1] * Math.sin(k * t));
                im += w * (z[1] * Math.cos(k * t) - z[0] * Math.sin(k * t));
            }
        }
        result.set(k, [re / (2 * PI), im / (2 * PI)]);
    }
    return result;
};
const modulus = (c: Coefficients, k: number) => Math.hypot(...c.get(k)!);
/** The largest |z(t_j) - S_N(t_j)| over the 2000 samples t_j = 2 pi j / 2000: the sampled error the readout shows. */
const sampledError = (loop: Loop, kind: Kind, c: Coefficients, N: number) => {
    const ends = spanEnds(loop, kind);
    let worst = 0;
    for (let j = 0; j < 2000; j += 1) {
        const t = 2 * PI * j / 2000;
        const z = evaluate(loop, ends, t);
        let re = 0;
        let im = 0;
        for (let k = -N; k <= N; k += 1) {
            const [a, b] = c.get(k)!;
            re += a * Math.cos(k * t) - b * Math.sin(k * t);
            im += a * Math.sin(k * t) + b * Math.cos(k * t);
        }
        worst = Math.max(worst, Math.hypot(z[0] - re, z[1] - im));
    }
    return worst;
};

interface Scene {
    readonly loop: () => Loop;
    readonly example: 'circle' | 'diamond' | 'uneven';
    readonly kind: Kind;
    readonly N: number;
    readonly time: number;
    /** [value, decimals] pairs the scene's text quotes. */
    readonly quoted: (c: Coefficients, loop: Loop) => [number, number][];
}
const sampled = (loop: Loop, kind: Kind, c: Coefficients, N: number, decimals: number): [number, number] => [sampledError(loop, kind, c, N), decimals];
const SCENES: Record<string, Scene> = {
    'epi-loop': {loop: circleLoop, example: 'circle', kind: 'equal', N: 1, time: 0,
        quoted: (c, l) => [[modulus(c, 1), 4], sampled(l, 'equal', c, 1, 5)]},
    'epi-radius': {loop: circleLoop, example: 'circle', kind: 'equal', N: 1, time: PI / 2,
        quoted: c => [[modulus(c, 1), 4]]},
    'epi-add': {loop: circleLoop, example: 'circle', kind: 'equal', N: 5, time: 0,
        quoted: (c, l) => [[modulus(c, 1), 4], [modulus(c, 5), 4], [modulus(c, -3), 4], sampled(l, 'equal', c, 5, 5), sampled(l, 'equal', c, 3, 5)]},
    'epi-trace': {loop: circleLoop, example: 'circle', kind: 'equal', N: 9, time: PI,
        quoted: (c, l) => [sampled(l, 'equal', c, 9, 5), sampled(l, 'equal', c, 1, 5)]},
    'epi-diamond': {loop: diamondLoop, example: 'diamond', kind: 'equal', N: 9, time: 0,
        quoted: (c, l) => [[modulus(c, 1), 4], [modulus(c, -3), 4], [modulus(c, 5), 4], sampled(l, 'equal', c, 9, 5), [8 / (PI * PI), 5]]},
    'epi-uneven-equal': {loop: unevenLoop, example: 'uneven', kind: 'equal', N: 9, time: 0,
        quoted: (c, l) => [[modulus(c, -1), 4], sampled(l, 'equal', c, 9, 5)]},
    'epi-uneven-chord': {loop: unevenLoop, example: 'uneven', kind: 'chord', N: 9, time: 0,
        quoted: (c, l) => [[modulus(c, -1), 4], sampled(l, 'chord', c, 9, 5), sampled(l, 'equal', coefficients(l, 'equal'), 9, 5)]},
    'epi-drag': {loop: movedLoop, example: 'circle', kind: 'equal', N: 9, time: 0,
        quoted: (c, l) => [[modulus(c, 1), 4], [modulus(c, 0), 4], sampled(l, 'equal', c, 9, 5), [KAPPA, 4]]},
    'epi-explore': {loop: unevenLoop, example: 'uneven', kind: 'equal', N: 15, time: 0, quoted: () => []},
};
const coefficientCache = new Map<string, Coefficients>();
const coefficientsOf = (id: string) => {
    const scene = SCENES[id];
    if (!coefficientCache.has(id)) coefficientCache.set(id, coefficients(scene.loop(), scene.kind));
    return coefficientCache.get(id)!;
};

// ---- The real graph -----------------------------------------------------------------------------------------------------------------------
interface EpicycleHost {model: EpicycleModel; time: number; playing: boolean}
function mount() {
    const graph = createGraph('epicycles');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const host = graph as unknown as EpicycleHost;
    return {
        host, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        /** The same actions without the restore: the scene must not depend on the one before it. */
        chained: (step: GuidedLessonStep) => act(() => {
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
    };
}
const flatten = (loop: Loop): number[] => [
    ...loop.v.flat(), ...loop.s.flatMap(span => span ? span.flat() : [Number.NaN]),
];
const modelNumbers = (model: EpicycleModel): number[] => [
    ...model.vertices.flatMap(p => [p.x, p.y]), ...model.spans.flatMap(span => span.kind === 'line' ? [Number.NaN] : [span.c1.x, span.c1.y, span.c2.x, span.c2.y]),
];
/** The state the text states, compared with the graph: loop, N, parametrization, time and a stopped animation. */
const expectSceneState = (m: ReturnType<typeof mount>, id: string) => {
    const scene = SCENES[id];
    const model = m.host.model;
    const got = modelNumbers(model);
    const want = flatten(scene.loop());
    expect({id, n: got.length}).toEqual({id, n: want.length});
    got.forEach((value, i) => (Number.isNaN(want[i]) ? expect(Number.isNaN(value), `${id} ${i}`).toBe(true) : expect(value, `${id} ${i}`).toBeCloseTo(want[i], 12)));
    expect({id, N: model.N, parametrization: model.parametrization, spanKinds: model.spans.map(span => span.kind)})
        .toEqual({id, N: scene.N, parametrization: scene.kind, spanKinds: scene.loop().s.map(span => span ? 'cubic' : 'line')});
    expect(m.host.time, id).toBeCloseTo(scene.time, 12);
    expect(m.host.playing, id).toBe(false);
};

test('the lesson is F5 on epicycles: nine ordered steps, each with a scene of its own, starting with the closed curve and ending in free exploration', () => {
    expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: 9}, (_, i) => i + 1));
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(9);
});

test('every scene lands in the stated state, applied out of order and twice in one synchronous sequence', () => {
    const m = mount();
    try {
        const order = Object.keys(SCENES).reverse();
        for (const id of [...order, ...Object.keys(SCENES)]) {
            m.scene(stepOf(id));
            m.scene(stepOf(id));
            expectSceneState(m, id);
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('every scene also works straight after any other scene, without restoring the checkpoint', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids.slice().reverse(), ...ids, ...ids.slice(4), ...ids.slice(0, 4)]) {
            m.chained(stepOf(id));
            expectSceneState(m, id);
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('F5: the checked circle and diamond coefficients, the symmetry that zeroes the others, and the step ratios the prose uses', () => {
    const circle = coefficients(circleLoop(), 'equal');
    // The spec's checked values for the four-span cubic circle.
    expect(circle.get(1)![0]).toBeCloseTo(1.000126, 6);
    expect(circle.get(5)![0]).toBeCloseTo(0.003672, 6);
    expect(circle.get(-3)![0]).toBeCloseTo(-0.003641, 6);
    expect(circle.get(-7)![0]).toBeCloseTo(-0.000662, 6);
    expect(circle.get(9)![0]).toBeCloseTo(0.000547, 6);
    expect(modulus(circle, 0)).toBeLessThan(1e-9);
    // Four-fold symmetry: only k = 1 (mod 4) occur.
    for (let k = -15; k <= 15; k += 1) if (((k % 4) + 4) % 4 !== 1) expect(modulus(circle, k), `k=${k}`).toBeLessThan(1e-9);
    // Maximum parametrized errors of the spec stay within the sampled values (the samples can only miss the maximum from below).
    const sampledCircle = [0, 1, 3, 5, 9].map(N => sampledError(circleLoop(), 'equal', circle, N));
    [1.000273, 0.007346, 0.004759, 0.001545, 0.000596].forEach((value, i) => {
        expect(sampledCircle[i]).toBeLessThanOrEqual(value + 1e-6);
        expect(sampledCircle[i]).toBeGreaterThan(value - 1e-5);
    });
    // The diamond: c_k = 8 / (pi^2 k^2) for k = 1 (mod 4), 0 otherwise, to 1e-10.
    const diamond = coefficients(diamondLoop(), 'equal');
    for (let k = -15; k <= 15; k += 1) {
        const expected = ((k % 4) + 4) % 4 === 1 ? 8 / (PI * PI * k * k) : 0;
        expect(Math.abs(diamond.get(k)![0] - expected), `k=${k}`).toBeLessThan(1e-9);
        expect(Math.abs(diamond.get(k)![1]), `k=${k} imaginary`).toBeLessThan(1e-9);
    }
    expect(8 / (PI * PI)).toBeCloseTo(0.810569, 6);
    // The diamond's sampled errors against the spec's maxima, and "more than sixty times smaller" for the circle at N = 9.
    [[1, 0.18943], [3, 0.09937], [5, 0.06694], [9, 0.0404]].forEach(([N, value]) => expect(sampledError(diamondLoop(), 'equal', diamond, N), `N=${N}`).toBeCloseTo(value, 4));
    expect(sampledError(diamondLoop(), 'equal', diamond, 9) / sampledError(circleLoop(), 'equal', circle, 9)).toBeGreaterThan(60);
    // The prose compares the circle's first circle with the next ones ("more than two hundred times smaller") and the dragged error ("more than fifty").
    expect(modulus(circle, 1) / modulus(circle, 5)).toBeGreaterThan(200);
    expect(modulus(circle, 1) / modulus(circle, -3)).toBeGreaterThan(200);
    const moved = coefficients(movedLoop(), 'equal');
    expect(sampledError(movedLoop(), 'equal', moved, 9) / sampledError(circleLoop(), 'equal', circle, 9)).toBeGreaterThan(50);
    // Dragging breaks the symmetry: coefficients outside k = 1 (mod 4) are above 0.01 for some k, and c_0 is above 0.03.
    expect(Math.max(...[-4, -2, 0, 2, 3, 4].map(k => modulus(moved, k)))).toBeGreaterThan(0.025);
    // The uneven curve: the longest chord is 3.6 times the shortest, and the curve runs clockwise (the largest circle is k = -1).
    const uneven = unevenLoop();
    const chords = uneven.v.map((a, i) => Math.hypot(uneven.v[(i + 1) % 6][0] - a[0], uneven.v[(i + 1) % 6][1] - a[1]));
    expect(Math.max(...chords) / Math.min(...chords)).toBeCloseTo(3.6, 1);
    for (const kind of ['equal', 'chord'] as const) {
        const c = coefficients(uneven, kind);
        expect(modulus(c, -1)).toBeGreaterThan(modulus(c, 1));
        for (let k = -15; k <= 15; k += 1) if (k !== -1) expect(modulus(c, -1)).toBeGreaterThan(modulus(c, k));
    }
    // The two parametrizations differ on the uneven curve and, more than 1e-3 apart, give different coefficients (here and in the error).
    const equalC = coefficients(uneven, 'equal');
    const chordC = coefficients(uneven, 'chord');
    expect(Math.abs(modulus(equalC, -1) - modulus(chordC, -1))).toBeGreaterThan(1e-2);
    expect(sampledError(uneven, 'chord', chordC, 9)).toBeGreaterThan(sampledError(uneven, 'equal', equalC, 9));
});

test('the start of the loop only rotates the coefficients: c_k(tau) = e^{ik tau} c_k, to 1e-10 (the stated claim, not shown by the graph)', () => {
    const diamond = coefficients(diamondLoop(), 'equal', 6);
    // z_tau(t) = z(t + tau) with tau = pi / 2 is the same diamond started at the next corner: the vertices rotate by one place.
    const shifted: Loop = {v: [CORNERS[1], CORNERS[2], CORNERS[3], CORNERS[0]].map(p => [...p] as P), s: CORNERS.map(() => null)};
    const c = coefficients(shifted, 'equal', 6);
    for (let k = -6; k <= 6; k += 1) {
        const [re, im] = diamond.get(k)!;
        const rotated: P = [re * Math.cos(k * PI / 2) - im * Math.sin(k * PI / 2), re * Math.sin(k * PI / 2) + im * Math.cos(k * PI / 2)];
        expect(Math.abs(c.get(k)![0] - rotated[0]), `k=${k}`).toBeLessThan(1e-9);
        expect(Math.abs(c.get(k)![1] - rotated[1]), `k=${k}`).toBeLessThan(1e-9);
    }
});

test('the numbers the prose quotes are the scene values, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const id of Object.keys(SCENES)) {
            const text = prose(stepOf(id), language);
            const scene = SCENES[id];
            for (const [value, decimals] of scene.quoted(coefficientsOf(id), scene.loop())) expect(text, `${id} ${language} ${value}`).toContain(num(value, decimals, language));
        }
        // The dragged control point is stated with its coordinates, the circle's original handle with its value.
        expect(prose(stepOf('epi-drag'), language)).toContain(num(1.5, 1, language));
        expect(prose(stepOf('epi-drag'), language)).toContain(num(0.55, 2, language));
        // The worked example is the diamond's first coefficient.
        const example = lesson.workedExamples.find(entry => entry.id === 'diamond-c1')!;
        expect(example.check[language]).toContain(num(8 / (PI * PI), 5, language));
    }
    expect(lesson.workedExamples.find(entry => entry.id === 'diamond-c1')!.resultLatex).toBe(num(8 / (PI * PI), 5, 'sl'));
});

test('the quoted values also agree with the graph\'s own kernel to the digits the readout shows', () => {
    for (const id of ['epi-loop', 'epi-add', 'epi-trace', 'epi-diamond', 'epi-uneven-equal', 'epi-uneven-chord', 'epi-drag']) {
        const m = mount();
        try {
            m.scene(stepOf(id));
            const model = m.host.model;
            const analysis = analyzeEpicycle(model);
            const scene = SCENES[id];
            const c = coefficientsOf(id);
            const {terms} = epicycleTerms(analysis, model.N);
            const largest = terms.reduce((best, term) => (term.modulus > best.modulus ? term : best));
            expect(largest.modulus, id).toBeCloseTo(Math.max(...Array.from(c.keys()).filter(k => k !== 0 && Math.abs(k) <= scene.N).map(k => modulus(c, k))), 4);
            expect(maxTraceError(analysis, model.N), id).toBeCloseTo(sampledError(scene.loop(), scene.kind, c, scene.N), 5);
        } finally {
            m.mounted.view.unmount();
        }
    }
});

test('the theorem is cited, the trace is an illustration, the error is sampled, the start is stated and not shown, and the terms are the catalogue terms', () => {
    const block = (id: string, language: 'sl' | 'en') => lesson.formulaBlocks.find(entry => entry.id === id)!.explanation[language];
    expect(block('epicycle-convergence', 'en')).toContain('cited, not opened');
    expect(block('epicycle-convergence', 'en')).toContain('illustration');
    expect(block('epicycle-convergence', 'en')).toContain('not a proof');
    expect(block('epicycle-convergence', 'en')).toContain('2000 sample points, so it is sampled');
    expect(block('epicycle-convergence', 'sl')).toContain('navedeno, ne odprto');
    expect(block('epicycle-convergence', 'sl')).toContain('ilustracija');
    expect(block('epicycle-convergence', 'sl')).toContain('ne dokaz');
    expect(block('epicycle-convergence', 'sl')).toContain('vzorčna');
    expect(block('epicycle-start-shift', 'en')).toContain('stated, not shown');
    expect(block('epicycle-start-shift', 'sl')).toContain('trdimo, ne pokažemo');
    expect(block('epicycle-coefficient', 'en')).toContain('depends on the parametrization');
    expect(block('epicycle-coefficient', 'sl')).toContain('Odvisen je od parametrizacije');
    expect(prose(stepOf('epi-uneven-chord'), 'en')).toContain('for this example and this');
    expect(prose(stepOf('epi-trace'), 'en')).toContain('only an illustration');
    expect(prose(stepOf('epi-trace'), 'sl')).toContain('le ilustracija');
    const everything = JSON.stringify(lesson);
    for (const term of ['vrteči se krog', 'epicikel', 'sled delne vsote', 'krajišče', 'kontrolna točka', 'parametrizacija']) expect(everything.toLowerCase(), term).toContain(term);
    expect(lesson.sources.map(source => source.id)).toContain('zygmund-trigonometric-series-epicycles');
});
