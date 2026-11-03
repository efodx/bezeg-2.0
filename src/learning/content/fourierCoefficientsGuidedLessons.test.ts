/**
 * F2 and F4 (fourier-coefficients): every scene lands in the state the text states (real graph, one synchronous sequence of actions), and
 * every number the lesson quotes is a value of the scene it belongs to. The values are recomputed here by Simpson quadrature on each linear
 * piece, by the closed forms of the three decay examples and by a direct partial sum on the 20001-node grid, never by the kernels in
 * `src/analysis/fourierCoefficientsModel.ts` or `fourierDecay.ts` (the supremum error is cross-checked against the kernel once).
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {fourierCoefficientsGuidedLessons} from './fourierCoefficientsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {FourierCoefficientsModel} from '../../analysis/fourierCoefficientsModel';
import {fourierSupError} from '../../analysis/fourierDecay';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = fourierCoefficientsGuidedLessons.find(entry => entry.demonstrationId === 'fourier-coefficients')!;
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

// ---- Independent values: Simpson quadrature on each linear piece, closed forms, a direct sum on the grid -----------------------------
const PI = Math.PI;
type Piece = {a: number; b: number; fa: number; fb: number};
const simpson = (g: (x: number) => number, a: number, b: number, m = 4000) => {
    const h = (b - a) / m;
    let sum = g(a) + g(b);
    for (let i = 1; i < m; i += 1) sum += (i % 2 === 1 ? 4 : 2) * g(a + i * h);
    return sum * h / 3;
};
const lineOn = (piece: Piece) => (x: number) => piece.fa + (piece.fb - piece.fa) * (x - piece.a) / (piece.b - piece.a);
/** (1/pi) times the integral of f times the harmonic, split at every breakpoint (the pieces are the intervals between breakpoints). */
const coefficient = (pieces: Piece[], term: 'a' | 'b', k: number) =>
    pieces.reduce((sum, piece) => sum + simpson(x => lineOn(piece)(x) * (term === 'a' ? Math.cos(k * x) : Math.sin(k * x)), piece.a, piece.b), 0) / PI;
const squareIntegral = (pieces: Piece[]) => pieces.reduce((sum, piece) => sum + simpson(x => lineOn(piece)(x) ** 2, piece.a, piece.b), 0) / PI;
const parseval = (pieces: Piece[], K: number) => {
    let sum = coefficient(pieces, 'a', 0) ** 2 / 2;
    for (let k = 1; k <= K; k += 1) sum += coefficient(pieces, 'a', k) ** 2 + coefficient(pieces, 'b', k) ** 2;
    return sum;
};
/** |x| with the tip at t and f(+-pi) = pi: two pieces. */
const absPieces = (tip: number): Piece[] => [{a: -PI, b: 0, fa: PI, fb: tip}, {a: 0, b: PI, fa: tip, fb: PI}];
/** sgn(x - 1): two constant pieces split at the jump. */
const jumpPieces: Piece[] = [{a: -PI, b: 1, fa: -1, fb: -1}, {a: 1, b: PI, fa: 1, fb: 1}];

// The decay examples: amplitudes by their closed forms, the square wave and |x| as stated in the spec, the smooth one 2/sqrt3 r^k.
const R = 2 - Math.sqrt(3);
const squareAmplitude = (k: number) => (k % 2 === 1 ? 4 / (PI * k) : 0);
const absAmplitude = (k: number) => (k % 2 === 1 ? 4 / (PI * k * k) : 0);
const smoothAmplitude = (k: number) => 2 / Math.sqrt(3) * R ** k;
const slope = (amplitude: (k: number) => number, k1: number, k2: number) => (Math.log(amplitude(k2)) - Math.log(amplitude(k1))) / (Math.log(k2) - Math.log(k1));
/** Sup error of S_N on the 20001-node grid, skipping the jump points. */
const supError = (f: (x: number) => number, S: (x: number) => number, jumps: number[]) => {
    let best = 0;
    for (let i = 0; i <= 20000; i += 1) {
        const x = -PI + i * 2 * PI / 20000;
        if (jumps.some(jump => Math.abs(x - jump) < 1e-9)) continue;
        best = Math.max(best, Math.abs(f(x) - S(x)));
    }
    return best;
};
const squareSum = (N: number) => (x: number) => {
    let sum = 0;
    for (let k = 1; k <= N; k += 2) sum += Math.sin(k * x) / k;
    return 4 / PI * sum;
};
const absSum = (N: number) => (x: number) => {
    let sum = PI / 2;
    for (let k = 1; k <= N; k += 2) sum -= 4 / (PI * k * k) * Math.cos(k * x);
    return sum;
};
const smoothSum = (N: number) => (x: number) => {
    let sum = 1 / Math.sqrt(3);
    for (let k = 1; k <= N; k += 1) sum += smoothAmplitude(k) * Math.cos(k * x);
    return sum;
};
const supSquare = (N: number) => supError(x => (x > 0 ? 1 : -1), squareSum(N), [-PI, 0, PI]);
const supAbs = (N: number) => supError(Math.abs, absSum(N), []);
const supSmooth = (N: number) => supError(x => 1 / (2 - Math.cos(x)), smoothSum(N), []);
/** The square wave's Parseval partial sums, the sum of 16/(pi k)^2 over odd k up to N. */
const squareParseval = (N: number) => {
    let sum = 0;
    for (let k = 1; k <= N; k += 2) sum += 16 / (PI * k) ** 2;
    return sum;
};
/** A 16-point Gauss-Legendre rule over the whole interval [-pi, pi] (nodes by Newton's method), the spec's pitfall. */
const gaussLegendreUnsplit = (g: (x: number) => number) => {
    const n = 16;
    let sum = 0;
    for (let i = 0; i < n / 2; i += 1) {
        let z = Math.cos(PI * (i + 0.75) / (n + 0.5));
        let derivative = 1;
        for (let step = 0; step < 100; step += 1) {
            let p1 = 1;
            let p2 = 0;
            for (let j = 0; j < n; j += 1) {
                const p3 = p2;
                p2 = p1;
                p1 = ((2 * j + 1) * z * p2 - j * p3) / (j + 1);
            }
            derivative = n * (z * p1 - p2) / (z * z - 1);
            const next = z - p1 / derivative;
            if (Math.abs(next - z) < 1e-15) { z = next; break; }
            z = next;
        }
        const weight = 2 / ((1 - z * z) * derivative * derivative);
        sum += weight * (g(PI * z) + g(-PI * z)) * PI;
    }
    return sum;
};

/** Per scene: the model the text states and the numbers it quotes (value, decimals). */
type Scene = {
    view: 'projection' | 'decay'; layout: 'abs' | 'jump' | 'free'; values: number[]; term: 'a' | 'b'; k: number; K: number;
    selections: string[]; n: number; scale: 'linear' | 'log'; quoted: [number, number][];
};
const DEFAULT_SELECTIONS = ['square', 'abs', 'smooth'];
const projectionScene = (layout: Scene['layout'], values: number[], term: 'a' | 'b', k: number, quoted: [number, number][]): Scene =>
    ({view: 'projection', layout, values, term, k, K: 16, selections: DEFAULT_SELECTIONS, n: 11, scale: 'linear', quoted});
const decayScene = (n: number, scale: Scene['scale'], quoted: [number, number][], selections = DEFAULT_SELECTIONS): Scene =>
    ({view: 'decay', layout: 'abs', values: [PI, 0], term: 'a', k: 1, K: 16, selections, n, scale, quoted});
const abs0 = absPieces(0);
const abs1 = absPieces(1);
const SCENES: Record<string, Scene> = {
    'coef-overlap': projectionScene('jump', [-1, -1, 1, 1], 'b', 1, [[coefficient(jumpPieces, 'b', 1), 5]]),
    'coef-area': projectionScene('jump', [-1, -1, 1, 1], 'b', 2, [[coefficient(jumpPieces, 'b', 2), 5], [coefficient(jumpPieces, 'b', 1), 5]]),
    'coef-bars': projectionScene('abs', [PI, 0], 'a', 1, [[coefficient(abs0, 'a', 1), 5], [coefficient(abs0, 'a', 3), 5], [coefficient(abs0, 'a', 5), 5]]),
    'coef-drag': projectionScene('abs', [PI, 1], 'a', 1, [[coefficient(abs1, 'a', 1), 5], [coefficient(abs1, 'a', 3), 5], [coefficient(abs0, 'a', 1), 5]]),
    'coef-jump': projectionScene('jump', [-1, -1, 1, 1], 'b', 5, [
        [coefficient(jumpPieces, 'b', 1), 5], [coefficient(jumpPieces, 'b', 2), 5], [coefficient(jumpPieces, 'b', 5), 5], [coefficient(abs0, 'a', 5), 5]]),
    'coef-parseval': projectionScene('abs', [PI, 0], 'a', 1, [
        [squareIntegral(abs0), 5], [parseval(abs0, 16), 5], [parseval(jumpPieces, 16), 5]]),
    'coef-explore': projectionScene('free', [0, 1, 2, 1, 0], 'a', 1, []),
    'decay-three': decayScene(11, 'linear', []),
    'decay-square': decayScene(101, 'linear', [[squareAmplitude(11), 5], [squareAmplitude(101), 5], [101 / 11, 2]]),
    'decay-abs': decayScene(101, 'linear', [[absAmplitude(11), 5], [absAmplitude(101), 6], [(101 / 11) ** 2, 2]]),
    'decay-smooth': decayScene(11, 'linear', [[smoothAmplitude(1), 5], [smoothAmplitude(2), 5], [smoothAmplitude(5), 5], [R, 5], [smoothAmplitude(10) * 1e6, 4]]),
    'decay-log': decayScene(101, 'log', [[smoothAmplitude(14) * 1e8, 4], [smoothAmplitude(15) * 1e9, 4]]),
    'decay-sup': decayScene(11, 'linear', [[supSquare(11), 5], [supAbs(11), 5], [supSquare(101), 5]]),
    'decay-explore': decayScene(21, 'log', [], ['sawtooth', 'abs', 'smooth']),
};

function mount() {
    const graph = createGraph('fourier-coefficients');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        model: () => (graph as unknown as {model: FourierCoefficientsModel}).model,
        mounted, capabilities,
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

const stateOf = (model: FourierCoefficientsModel) => ({
    view: model.view, layout: model.layout, values: [...model.values], term: model.selected.term, k: model.selected.k, K: model.K,
    overlay: model.overlay, selections: [...model.selections], n: model.n, scale: model.scale,
});
const expectedState = (scene: Scene) => ({
    view: scene.view, layout: scene.layout, values: scene.values, term: scene.term, k: scene.k, K: scene.K,
    overlay: true, selections: scene.selections, n: scene.n, scale: scene.scale,
});

test('the lesson is F2 then F4 on fourier-coefficients: fourteen ordered steps, each with a scene of its own', () => {
    expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: 14}, (_, i) => i + 1));
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(14);
    // F2 is the projection view, F4 the decay view.
    expect(lesson.steps.map(step => SCENES[step.id].view)).toEqual([...Array(7).fill('projection'), ...Array(7).fill('decay')]);
});

test('every scene lands in the stated state, applied out of order and twice in one synchronous sequence', () => {
    const m = mount();
    try {
        const order = Object.entries(SCENES).reverse();
        for (const [id, expected] of [...order, ...Object.entries(SCENES)]) {
            m.scene(stepOf(id));
            m.scene(stepOf(id));
            expect({id, ...stateOf(m.model())}, id).toEqual({id, ...expectedState(expected)});
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('every scene also works straight after any other scene, without restoring the checkpoint', () => {
    const m = mount();
    try {
        const entries = Object.entries(SCENES);
        for (const [id, expected] of [...entries.reverse(), ...entries.reverse(), ...entries.slice(5), ...entries.slice(0, 5)]) {
            m.chained(stepOf(id));
            expect({id, ...stateOf(m.model())}, id).toEqual({id, ...expectedState(expected)});
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('F2: the checked coefficients, the integral of the square and the breakpoint pitfall', () => {
    // The spec's checked values.
    expect(coefficient(abs0, 'a', 0) / 2).toBeCloseTo(PI / 2, 10);
    expect(coefficient(abs0, 'a', 1)).toBeCloseTo(-1.27324, 5);
    expect(coefficient(abs0, 'a', 2)).toBeCloseTo(0, 10);
    expect(coefficient(abs0, 'a', 3)).toBeCloseTo(-0.141471, 6);
    expect(coefficient(abs0, 'a', 5)).toBeCloseTo(-0.05093, 5);
    for (const k of [1, 3, 5, 7]) expect(coefficient(abs0, 'a', k)).toBeCloseTo(-4 / (PI * k * k), 10);
    expect(coefficient(jumpPieces, 'b', 1)).toBeCloseTo(0.9805869033, 9);
    expect(coefficient(jumpPieces, 'b', 2)).toBeCloseTo(-0.4507735384, 9);
    expect(coefficient(jumpPieces, 'b', 5)).toBeCloseTo(0.1634409457, 9);
    // The closed form of the jump's b_1 the worked example gives, and |x| a_1 = -4/pi.
    expect(2 * (1 + Math.cos(1)) / PI).toBeCloseTo(coefficient(jumpPieces, 'b', 1), 10);
    // Dragging the tip to t multiplies every a_k, k >= 1, by (pi - t)/pi: a constant does not change them.
    for (const k of [1, 3]) expect(coefficient(abs1, 'a', k)).toBeCloseTo(coefficient(abs0, 'a', k) * (PI - 1) / PI, 9);
    expect(coefficient(abs1, 'a', 0) / 2).toBeGreaterThan(coefficient(abs0, 'a', 0) / 2);
    // The integral of the square: 2 pi^2/3 for |x|, 2 for the jump; Parseval's sum approaches it from below.
    expect(squareIntegral(abs0)).toBeCloseTo(2 * PI * PI / 3, 9);
    expect(squareIntegral(jumpPieces)).toBeCloseTo(2, 9);
    for (const pieces of [abs0, jumpPieces]) {
        const K = [1, 3, 16, 32].map(K => parseval(pieces, K));
        expect(K.every((value, i) => i === 0 || value > K[i - 1])).toBe(true);
        expect(K[3]).toBeLessThan(squareIntegral(pieces));
    }
    // The pitfall: one Gauss-Legendre rule over the whole interval, not split at the jump, is wrong by more than 1e-2.
    const unsplit = gaussLegendreUnsplit(x => (x < 1 ? -1 : 1) * Math.sin(x)) / PI;
    expect(unsplit).toBeCloseTo(0.888871, 5);
    expect(Math.abs(unsplit - coefficient(jumpPieces, 'b', 1))).toBeGreaterThan(1e-2);
    // The square wave's stated Parseval partial sums.
    [[1, 1.62114], [3, 1.80127], [11, 1.93261], [101, 1.99205]].forEach(([N, value]) => expect(squareParseval(N), `N=${N}`).toBeCloseTo(value, 5));
    expect(squareParseval(100001)).toBeCloseTo(2, 4);
});

test('F4: the closed-form amplitudes, the observed slopes and the supremum errors', () => {
    // The smooth example: a_1, a_2, a_5, a_10 of the spec, and the ratio of consecutive bars is r.
    expect(smoothAmplitude(1)).toBeCloseTo(0.3094011, 7);
    expect(smoothAmplitude(2)).toBeCloseTo(0.0829038, 7);
    expect(smoothAmplitude(5)).toBeCloseTo(0.00159489, 8);
    expect(smoothAmplitude(10) * 1e6).toBeCloseTo(2.2029, 4);
    expect(R).toBeCloseTo(0.2679492, 7);
    expect(smoothAmplitude(3) / smoothAmplitude(2)).toBeCloseTo(R, 12);
    // The smooth cosine coefficient against quadrature of 1/(2 - cos x), tolerance 1e-9 at k <= 5 and a relative 1e-3 at k = 10.
    const smoothQuadrature = (k: number) => simpson(x => Math.cos(k * x) / (2 - Math.cos(x)), -PI, PI, 20000) / PI;
    for (const k of [1, 2, 5]) expect(Math.abs(smoothQuadrature(k) - smoothAmplitude(k)), `k=${k}`).toBeLessThan(1e-9);
    expect(Math.abs(smoothQuadrature(10) / smoothAmplitude(10) - 1)).toBeLessThan(1e-3);
    // Observed slopes between k = 11 and k = 101 (odd k): -1 for the square wave, -2 for |x|, steeper and still falling for the smooth one.
    expect(slope(squareAmplitude, 11, 101)).toBeCloseTo(-1, 12);
    expect(slope(absAmplitude, 11, 101)).toBeCloseTo(-2, 12);
    expect(slope(smoothAmplitude, 11, 101)).toBeLessThan(-2);
    // The log floor: below 1e-8 the bars sit on the axis floor; for the smooth example that starts at k = 15.
    expect(smoothAmplitude(14)).toBeGreaterThan(1e-8);
    expect(smoothAmplitude(15)).toBeLessThan(1e-8);
    // The even square-wave and |x| coefficients are zero.
    for (const k of [2, 4, 10]) expect([squareAmplitude(k), absAmplitude(k)]).toEqual([0, 0]);
    // Supremum errors at N = 11: |x| 0.05293 equals the tail sum, the square wave stays near 1, the smooth one is below 1e-5.
    expect(supAbs(11)).toBeCloseTo(0.05293, 5);
    let tail = 0;
    for (let k = 13; k <= 4000001; k += 2) tail += 4 / (PI * k * k);
    expect(tail).toBeCloseTo(0.05293, 5);
    expect(supSquare(11)).toBeCloseTo(0.9976, 4);
    expect(supSquare(101)).toBeCloseTo(0.9796, 4);
    expect(supSmooth(11)).toBeLessThan(1e-5);
    // The graph's own kernel agrees with the independent values to the 5 decimals the readout shows.
    expect(fourierSupError('abs', 11)).toBeCloseTo(supAbs(11), 5);
    expect(fourierSupError('square', 11)).toBeCloseTo(supSquare(11), 5);
    // The M-test: the sum of |c_k| over |x| is finite, over the square wave it grows without bound (partial sums 1e3 apart by a factor of 10).
    const partial = (amplitude: (k: number) => number, N: number) => { let sum = 0; for (let k = 1; k <= N; k += 1) sum += amplitude(k); return sum; };
    expect(partial(absAmplitude, 100000) - partial(absAmplitude, 1000)).toBeLessThan(1e-3);
    expect(partial(squareAmplitude, 100000) - partial(squareAmplitude, 1000)).toBeGreaterThan(2);
});

test('the numbers the prose quotes are the scene values, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, expected] of Object.entries(SCENES)) {
            const text = prose(stepOf(id), language);
            for (const [value, decimals] of expected.quoted) expect(text, `${id} ${language} ${value}`).toContain(num(value, decimals, language));
        }
        // The formula explanations quote the Parseval partial sums of the square wave and the pitfall.
        const parsevalText = lesson.formulaBlocks.find(block => block.id === 'parseval')!.explanation[language];
        for (const [N, decimals] of [[1, 5], [3, 5], [11, 5], [101, 5]]) expect(parsevalText).toContain(num(squareParseval(N), decimals, language));
        const pitfall = lesson.formulaBlocks.find(block => block.id === 'coefficient-projection')!.explanation[language];
        expect(pitfall).toContain(num(gaussLegendreUnsplit(x => (x < 1 ? -1 : 1) * Math.sin(x)) / PI, 2, language));
        expect(pitfall).toContain(num(coefficient(jumpPieces, 'b', 1), 2, language));
        // The integral of the square for |x| is 2 pi^2/3, and the jump's is 2 with the Parseval sum 1.95204 at K = 16 in the step text.
        expect(prose(stepOf('coef-parseval'), language)).toContain(num(2 * PI * PI / 3, 5, language));
    }
    const abs = lesson.workedExamples.find(example => example.id === 'abs-a1')!;
    expect(abs.resultLatex).toBe(num(coefficient(abs0, 'a', 1), 5, 'sl'));
    expect(lesson.workedExamples.find(example => example.id === 'jump-b1')!.resultLatex).toBe(num(coefficient(jumpPieces, 'b', 1), 5, 'sl'));
});

test('the theorems are stated with their sources, only in the forward direction, and nothing is called a mean square', () => {
    const block = (id: string, language: 'sl' | 'en') => lesson.formulaBlocks.find(entry => entry.id === id)!.explanation[language];
    const decayEn = block('decay-theorem', 'en');
    expect(decayEn).toContain('this direction only');
    expect(decayEn).toContain('The converse is not claimed');
    expect(decayEn).toContain('observation of three examples, not a law');
    expect(decayEn).toContain('Zygmund');
    expect(decayEn).toContain('Körner');
    expect(block('decay-theorem', 'sl')).toContain('Obrata ne trdimo');
    expect(block('decay-theorem', 'sl')).toContain('opažanje na treh primerih, ne zakon');
    const mTest = block('m-test', 'en');
    expect(mTest).toContain('Weierstrass M-test');
    expect(mTest).toContain('is not true in general');
    expect(mTest).toContain('does not by itself mean there is no uniform convergence');
    expect(block('m-test', 'sl')).toContain('ni splošno resničen');
    expect(block('parseval', 'en')).toContain('cited, not opened');
    expect(block('parseval', 'en')).toContain('a stated example, not what the graph shows');
    expect(block('parseval', 'sl')).toContain('navedeno, ne odprto');
    expect(prose(stepOf('decay-log'), 'en')).toContain('are not drawn');
    expect(prose(stepOf('decay-log'), 'sl')).toContain('niso narisani');
    expect(prose(stepOf('decay-log'), 'en')).toContain('\\(10^{-8}\\)');
    expect(prose(stepOf('decay-square'), 'en')).toContain('drawn as zero, not omitted');
    expect(prose(stepOf('decay-sup'), 'en')).toContain('The converse is not claimed');
    expect(prose(stepOf('decay-sup'), 'sl')).toContain('Obrata ne trdimo');
    // "Mean square" appears only in the sentence that says it is not used; the Slovenian names are the catalogue terms.
    const everything = JSON.stringify(lesson);
    expect((everything.match(/mean square/g) ?? []).length).toBe((everything.match(/not called the mean square/g) ?? []).length);
    expect((everything.match(/srednji kvadrat/g) ?? []).length).toBe((everything.match(/ne imenujemo srednji kvadrat/g) ?? []).length);
    expect(everything).toContain('Parsevalova');
    expect(everything).toContain('integral kvadrata');
    expect(everything.toLowerCase()).toContain('spekter koeficientov');
    expect(lesson.sources.map(source => source.id)).toEqual(expect.arrayContaining(['zygmund-trigonometric-series', 'koerner-fourier-analysis']));
});
