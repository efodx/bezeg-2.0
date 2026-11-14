/**
 * S1 (function-transformation) and S2 (function-inverse): every scene lands in the state the text states (real graphs, one synchronous
 * sequence of actions, out of order and twice), and every number the lessons quote is recomputed here without the kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {schoolFunctionGraphsGuidedLessons} from './schoolFunctionGraphsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson, GuidedLessonStep} from './guidedLessons';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {createGraph} from '../../graphs/base/createTestGraph';
import type {FunctionTransformationGraph} from '../../graphs/functions/FunctionTransformationGraph';
import type {FunctionInverseGraph} from '../../graphs/functions/FunctionInverseGraph';
import {setTransformParameter, type FunctionTransformationModel} from '../../analysis/functionTransformationModel';
import {inverseSlopesOf, inverseX0Range, setInverseBase, moveInversePoint, type FunctionInverseModel} from '../../analysis/functionInverseModel';
import {trackedPoint} from '../../analysis/transformation';
import type {DemonstrationId} from '../../demonstrations';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lessonOf = (id: string): GuidedLesson => schoolFunctionGraphsGuidedLessons.find(entry => entry.demonstrationId === id)!;
const stepOf = (lesson: GuidedLesson, stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (lesson: GuidedLesson, step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = value.toFixed(decimals);
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

function mount<G extends object>(id: DemonstrationId, lesson: GuidedLesson) {
    const graph = createGraph(id);
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as G, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(lesson, stepId))) capabilities.apply(action);
        }),
    };
}
const modelOf = <M,>(graph: object): M => (graph as unknown as {model: M}).model;

// ---------------------------------------------------------------------------------------------------------------- S1

const transformation = lessonOf('function-transformation');
type Base = 'square' | 'cube';
const BASE_FUNCTIONS: Record<Base, (x: number) => number> = {square: x => x * x, cube: x => x * x * x};
/** The transformed function written out directly, not through the kernel. */
const transformed = (base: Base, a: number, b: number, c: number, d: number) => (x: number) => a * BASE_FUNCTIONS[base](b * (x - c)) + d;

/** Per scene: the model the text states and the image of the tracked point (u, f(u)) it quotes. */
const TRANSFORM_SCENES: Record<string, {base: Base; a: number; b: number; c: number; d: number; u: number; image: [number, number]}> = {
    'transform-original': {base: 'square', a: 1, b: 1, c: 0, d: 0, u: 2, image: [2, 4]},
    'transform-shift-d': {base: 'square', a: 1, b: 1, c: 0, d: 1, u: 2, image: [2, 5]},
    'transform-shift-c': {base: 'square', a: 1, b: 1, c: 3, d: 1, u: 2, image: [5, 5]},
    'transform-scale-a': {base: 'square', a: -2, b: 1, c: 3, d: 1, u: 2, image: [5, -7]},
    'transform-scale-b': {base: 'cube', a: 1, b: -0.5, c: 3, d: 1, u: 1, image: [1, 2]},
    'transform-combine': {base: 'square', a: -2, b: 0.5, c: 3, d: 1, u: 2, image: [7, -7]},
    'transform-explore': {base: 'square', a: -2, b: 0.5, c: 3, d: 1, u: 2, image: [7, -7]},
};

test('S1 has seven ordered steps, each with a scene of its own', () => {
    expect(transformation.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(transformation.steps.map(step => step.id)).toEqual(Object.keys(TRANSFORM_SCENES));
    expect(new Set(transformation.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('S1: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mount<FunctionTransformationGraph>('function-transformation', transformation);
    try {
        const ids = Object.keys(TRANSFORM_SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = TRANSFORM_SCENES[id];
            m.scene(id);
            m.scene(id);
            const model = modelOf<FunctionTransformationModel>(m.graph);
            expect({id, ...model}).toEqual({id, base: expected.base, a: expected.a, b: expected.b, c: expected.c, d: expected.d, u: expected.u, ghostVisible: true});
            // The tracked point (u, f(u)) maps to the quoted image, and the image lies on the curve written out directly.
            const base = expected.base === 'cube' ? {kind: 'power', shape: 'cube'} as const : {kind: 'power', shape: 'square'} as const;
            const tracked = trackedPoint(base, model, model.u)!;
            expect([id, tracked.image.x, tracked.image.y]).toEqual([id, expected.image[0], expected.image[1]]);
            expect(transformed(expected.base, expected.a, expected.b, expected.c, expected.d)(expected.image[0])).toBeCloseTo(expected.image[1], 12);
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S1: the checked numbers of the spec, recomputed without the kernel', () => {
    const f = transformed('square', -2, 0.5, 3, 1);
    expect(f(3)).toBe(1); // the vertex (3, 1)
    expect(f(7)).toBe(-7); // the image of (2, 4)
    expect(f(5)).toBe(-1);
    expect(2 / 0.5 + 3).toBe(7);
    expect(-2 * 4 + 1).toBe(-7);
    // The vertex is the minimum of the base mapped to x = c: nothing on the curve is above d (a < 0).
    for (let x = -6; x <= 12; x += 0.25) expect(f(x)).toBeLessThanOrEqual(1);
    // b < 0 mirrors about x = c: the cube with b = -1/2 at c + s equals the cube with b = 1/2 at c - s.
    const mirrored = transformed('cube', 1, -0.5, 3, 1);
    const straight = transformed('cube', 1, 0.5, 3, 1);
    for (const s of [0.5, 1, 2, 3.5]) expect(mirrored(3 + s)).toBeCloseTo(straight(3 - s), 12);
    expect(2 / 0.5 + 3).toBe(7);
    expect(1 / 0.5 + 3).toBe(5); // the b = 1/2 image of (1, 1) quoted in step 5
    expect(1 / -0.5 + 3).toBe(1);
    // The inside constant of f(bx + k) with b = 1/2, c = 3: k = -bc, and the shift of the graph -k/b = c.
    expect(-(-0.5 * 3) / 0.5).toBe(3);
    // a is the reflection in y = d: the point (5, 5) goes to (5, 1 - 2*4).
    expect(transformed('square', -2, 1, 3, 1)(5)).toBe(1 - 2 * 4);
});

test('S1: b = 0 is rejected and b < 0 is accepted by the model', () => {
    const start = {base: 'square', a: 1, b: 1, c: 0, d: 0, ghostVisible: true, u: 2} as const;
    expect(setTransformParameter(start, 'b', 0).ok).toBe(false);
    expect(setTransformParameter(start, 'b', -0.5).ok).toBe(true);
});

test('S1: the quoted points are in the prose, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, expected] of Object.entries(TRANSFORM_SCENES)) {
            const text = prose(transformation, stepOf(transformation, id), language);
            if (id !== 'transform-explore') expect(text, `${id} ${language}`).toContain(`(${expected.image[0]},${expected.image[1]})`);
        }
        const step = (id: string) => prose(transformation, stepOf(transformation, id), language);
        expect(step('transform-shift-d')).toContain('(0,1)');
        expect(step('transform-shift-c')).toContain('(3,1)');
        expect(step('transform-scale-a')).toContain('(3,1)');
        expect(step('transform-scale-b')).toContain('(5,2)');
        expect(step('transform-combine')).toContain('(3,1)');
        expect(step('transform-combine')).toContain('\\(-1\\)');
        expect(step('transform-combine')).toContain('x=5');
        expect(step('transform-combine')).toContain('(7,-7)');
        // The reflection by a is stated for the line y = d, not only the x-axis.
        expect(step('transform-scale-a')).toContain('y=d=1');
        expect(step('transform-scale-b')).toContain('x=3');
    }
});

// ---------------------------------------------------------------------------------------------------------------- S2

const inverse = lessonOf('function-inverse');
const LN2 = Math.LN2;

/** Per scene: the model the text states, P and its mirror, and the two slopes it quotes (undefined where the text shows none). */
const INVERSE_SCENES: Record<string, {restriction: string; base: number; x0: number; inverseVisible: boolean; tangentVisible: boolean; p: [number, number]; mirror: [number, number]; slopes: [number, number]}> = {
    'inverse-mirror': {restriction: 'square', base: 2, x0: 2, inverseVisible: false, tangentVisible: false, p: [2, 4], mirror: [4, 2], slopes: [4, 0.25]},
    'inverse-reveal': {restriction: 'square', base: 2, x0: 2, inverseVisible: true, tangentVisible: false, p: [2, 4], mirror: [4, 2], slopes: [4, 0.25]},
    'inverse-restrict': {restriction: 'square', base: 2, x0: 2, inverseVisible: true, tangentVisible: false, p: [2, 4], mirror: [4, 2], slopes: [4, 0.25]},
    'inverse-tangent': {restriction: 'square', base: 2, x0: 2, inverseVisible: true, tangentVisible: true, p: [2, 4], mirror: [4, 2], slopes: [4, 0.25]},
    'inverse-base': {restriction: 'exp', base: 2, x0: 3, inverseVisible: true, tangentVisible: true, p: [3, 8], mirror: [8, 3], slopes: [8 * LN2, 1 / (8 * LN2)]},
    'inverse-ln': {restriction: 'natural', base: 2, x0: 1, inverseVisible: true, tangentVisible: true, p: [1, Math.E], mirror: [Math.E, 1], slopes: [Math.E, 1 / Math.E]},
    'inverse-explore': {restriction: 'square', base: 2, x0: 2, inverseVisible: true, tangentVisible: true, p: [2, 4], mirror: [4, 2], slopes: [4, 0.25]},
};

test('S2 has seven ordered steps, each with a scene of its own', () => {
    expect(inverse.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(inverse.steps.map(step => step.id)).toEqual(Object.keys(INVERSE_SCENES));
    expect(new Set(inverse.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('S2: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice', () => {
    const m = mount<FunctionInverseGraph>('function-inverse', inverse);
    try {
        const ids = Object.keys(INVERSE_SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            const expected = INVERSE_SCENES[id];
            m.scene(id);
            m.scene(id);
            const model = modelOf<FunctionInverseModel>(m.graph);
            expect({id, ...model}).toEqual({
                id, restriction: expected.restriction, base: expected.base, x0: expected.x0,
                inverseVisible: expected.inverseVisible, tangentVisible: expected.tangentVisible,
            });
            const slopes = inverseSlopesOf(model)!;
            // The mirror point is the swap of the coordinates, exactly.
            expect([id, slopes.point.x, slopes.mirror.x, slopes.mirror.y]).toEqual([id, slopes.point.x, slopes.point.y, slopes.point.x]);
            expect(slopes.point.x).toBeCloseTo(expected.p[0], 12);
            expect(slopes.point.y).toBeCloseTo(expected.p[1], 12);
            expect(slopes.mirror.x).toBeCloseTo(expected.mirror[0], 12);
            expect(slopes.mirror.y).toBeCloseTo(expected.mirror[1], 12);
            expect(slopes.forwardSlope).toMatchObject({kind: 'slope'});
            expect(slopes.inverseSlope).toMatchObject({kind: 'slope'});
            const [forward, backward] = [slopes.forwardSlope, slopes.inverseSlope].map(s => (s as {value: number}).value);
            expect(forward, `${id} forward slope`).toBeCloseTo(expected.slopes[0], 9);
            expect(backward, `${id} inverse slope`).toBeCloseTo(expected.slopes[1], 9);
            expect(Math.abs(slopes.product! - 1)).toBeLessThan(1e-9);
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S2: the checked numbers of the spec, recomputed without the kernel', () => {
    // x^2 on x >= 0 and sqrt: slope 2x = 4 at (2, 4), 1/(2 sqrt y) = 1/4 at (4, 2).
    expect([2 ** 2, 2 * 2, 1 / (2 * Math.sqrt(4))]).toEqual([4, 4, 0.25]);
    expect(Math.sqrt(4)).toBe(2);
    // The horizontal line y = 4 meets x^2 twice on R and once on x >= 0.
    expect([(-2) ** 2, 2 ** 2]).toEqual([4, 4]);
    // 2^3 = 8, log_2 8 = 3; slopes 8 ln 2 and 1/(8 ln 2).
    expect([2 ** 3, Math.log(8) / Math.log(2)].map(v => Math.round(v * 1e9) / 1e9)).toEqual([8, 3]);
    expect((2 ** 3 * Math.log(2)).toFixed(4)).toBe('5.5452');
    expect((1 / (2 ** 3 * Math.log(2))).toFixed(5)).toBe('0.18034');
    expect(Math.abs(2 ** 3 * Math.log(2) * (1 / (2 ** 3 * Math.log(2))) - 1)).toBeLessThan(1e-12);
    // e^x at (1, e) has slope e, ln at (e, 1) has slope 1/e.
    expect(Math.E.toFixed(5)).toBe('2.71828');
    expect((1 / Math.E).toFixed(5)).toBe('0.36788');
    expect(Math.log(Math.E)).toBe(1);
});

test('S2: x0 = 0 on x^2 gives a vertical mirrored tangent and no product; the x0 ranges and bases are the ones the text names', () => {
    const base: FunctionInverseModel = {restriction: 'square', base: 2, x0: 0, inverseVisible: true, tangentVisible: true};
    const slopes = inverseSlopesOf(base)!;
    expect(slopes.forwardSlope).toEqual({kind: 'slope', value: 0});
    expect(slopes.inverseSlope).toEqual({kind: 'vertical'});
    expect(slopes.product).toBeUndefined();
    expect(inverseX0Range('square', 2)).toEqual([0, 2.8]);
    expect(inverseX0Range('natural', 2)).toEqual([-3, 2]);
    expect(inverseX0Range('exp', 5)).toEqual([-3, 1.2]);
    expect(inverseX0Range('exp', 0.2)).toEqual([-1.2, 3]);
    expect(setInverseBase(base, 1).ok).toBe(false);
    expect(moveInversePoint({...base, x0: 2}, -1).ok).toBe(false);
});

test('S2: the quoted points and slopes are in the prose, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        const step = (id: string) => prose(inverse, stepOf(inverse, id), language);
        for (const id of ['inverse-mirror', 'inverse-reveal', 'inverse-tangent', 'inverse-base']) {
            const expected = INVERSE_SCENES[id];
            expect(step(id), `${id} ${language} P`).toContain(`(${expected.p[0]},${expected.p[1]})`);
            expect(step(id), `${id} ${language} P'`).toContain(`(${expected.mirror[0]},${expected.mirror[1]})`);
        }
        expect(step('inverse-ln')).toContain('(1,e)');
        expect(step('inverse-ln')).toContain('(e,1)');
        expect(step('inverse-tangent')).toContain('\\tfrac14');
        expect(step('inverse-restrict')).toContain('x=-2');
        expect(step('inverse-base')).toContain(num(8 * LN2, 4, language));
        expect(step('inverse-base')).toContain(num(1 / (8 * LN2), 5, language));
        expect(step('inverse-ln')).toContain(num(Math.E, 5, language));
        expect(step('inverse-ln')).toContain(num(1 / Math.E, 5, language));
        expect(step('inverse-ln')).toContain('x=0');
        // The slope relation is an illustration of the chain rule identity, not a proof.
        const block = inverse.formulaBlocks.find(entry => entry.id === 'inverse-slopes')!.explanation;
        expect(block[language]).toContain(language === 'sl' ? 'ne dokazuje' : 'does not prove');
        // The exponent range the edge case quotes.
        const edge = inverse.edgeCases.map(entry => entry[language]).join(' ');
        expect(edge).toContain(num(2.8, 1, language));
    }
});

test('Reset returns the scene state: restoring the checkpoint undoes a transformation and an inverse scene', () => {
    const t = mount<FunctionTransformationGraph>('function-transformation', transformation);
    try {
        t.scene('transform-scale-b');
        expect(modelOf<FunctionTransformationModel>(t.graph).base).toBe('cube');
        act(() => { t.capabilities.restoreState(t.capabilities.captureState()); });
        t.scene('transform-original');
        expect(modelOf<FunctionTransformationModel>(t.graph)).toMatchObject({base: 'square', a: 1, b: 1, c: 0, d: 0});
    } finally {
        t.mounted.view.unmount();
    }
    const i = mount<FunctionInverseGraph>('function-inverse', inverse);
    try {
        i.scene('inverse-base');
        expect(modelOf<FunctionInverseModel>(i.graph)).toMatchObject({restriction: 'exp', x0: 3});
        i.scene('inverse-mirror');
        expect(modelOf<FunctionInverseModel>(i.graph)).toMatchObject({restriction: 'square', x0: 2, inverseVisible: false});
    } finally {
        i.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
