/**
 * S5 (geometric-series) and S6 (conic-focal): every scene lands in the state the text states (real graph, one synchronous sequence of actions, out of order and
 * twice), and every number the lesson quotes is recomputed here by adding terms, without the series kernel.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {schoolFunctionGraphsBatchCGuidedLessons} from './schoolFunctionGraphsBatchCGuidedLessons';
import {FUNCTION_CHOICE_VALUES, FUNCTION_PARAMETER_NAMES, type LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {GeometricSeriesModel} from '../../analysis/geometricSeriesModel';
import {setLanguage} from '../../localization';
import {conicFocalView, type ConicFocalModel} from '../../analysis/conicFocalModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const series = schoolFunctionGraphsBatchCGuidedLessons.find(entry => entry.demonstrationId === 'geometric-series')!;
const stepOf = (stepId: string): GuidedLessonStep => series.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]),
        ...series.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = String(Number(value.toFixed(decimals)));
    return language === 'sl' ? text.replace('.', '{,}') : text;
};

/** Per step: the series the text states (a, q, shown terms n, tolerance). */
const SCENES: Record<string, {a: number; q: number; terms: number; tolerance: number}> = {
    'series-bars': {a: 1, q: 0.5, terms: 3, tolerance: 0},
    'series-predict': {a: 1, q: 0.5, terms: 4, tolerance: 0},
    'series-reveal': {a: 1, q: 0.5, terms: 5, tolerance: 0},
    'series-limit': {a: 1, q: 0.5, terms: 5, tolerance: 0},
    'series-alternating': {a: 1, q: -0.5, terms: 4, tolerance: 0},
    'series-divergence': {a: 1, q: -1, terms: 6, tolerance: 0},
    'series-decimals': {a: 0.3, q: 0.1, terms: 4, tolerance: 0},
    'series-explore': {a: 1, q: 0.5, terms: 8, tolerance: 0.01},
};

/** S_n by adding the first n terms, without the closed form or the kernel. */
const partialSum = (a: number, q: number, n: number) => {
    let sum = 0;
    let term = a;
    for (let k = 0; k < n; k++) { sum += term; term *= q; }
    return sum;
};

function mount() {
    const graph = createGraph('geometric-series');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as {model: GeometricSeriesModel; controller: {isPlaying(): boolean}}, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(stepOf(stepId))) capabilities.apply(action);
        }),
    };
}

test('S5 has eight ordered steps, each with a scene of its own', () => {
    expect(series.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(series.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(series.steps.map(step => step.scene!.id)).size).toBe(8);
});

test('S5: every scene lands in the stated state, in one synchronous sequence from a restored checkpoint, out of order and twice, and never plays', () => {
    const m = mount();
    try {
        const ids = Object.keys(SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            m.scene(id);
            m.scene(id);
            const {a, q, terms, tolerance} = m.graph.model;
            expect({id, a, q, terms, tolerance}).toEqual({id, ...SCENES[id]});
            expect({id, playing: m.graph.controller.isPlaying()}).toEqual({id, playing: false});
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S5: the checked numbers of the spec, recomputed by adding terms', () => {
    // Default a = 1, q = 1/2: S1..S5 = 1, 1.5, 1.75, 1.875, 1.9375 (= 31/16); the limit is 2.
    expect([1, 2, 3, 4, 5].map(n => partialSum(1, 0.5, n))).toEqual([1, 1.5, 1.75, 1.875, 1.9375]);
    expect(partialSum(1, 0.5, 5)).toBe(31 / 16);
    expect(1 / (1 - 0.5)).toBe(2);
    expect(2 - partialSum(1, 0.5, 4)).toBe(0.125);
    expect(2 - partialSum(1, 0.5, 5)).toBe(0.0625);
    expect(0.5 ** 4).toBe(0.0625); // the fifth term
    // The closed form agrees with adding.
    for (const n of [1, 3, 5, 8, 20]) expect(partialSum(1, 0.5, n)).toBeCloseTo((1 - 0.5 ** n) / (1 - 0.5), 12);
    // Alternating q = -1/2: S1..S4 = 1, 0.5, 0.75, 0.625, limit 2/3, S odd above it and S even below it.
    expect([1, 2, 3, 4].map(n => partialSum(1, -0.5, n))).toEqual([1, 0.5, 0.75, 0.625]);
    expect(1 / (1 + 0.5)).toBeCloseTo(2 / 3, 15);
    for (const n of [1, 3]) expect(partialSum(1, -0.5, n)).toBeGreaterThan(2 / 3);
    for (const n of [2, 4]) expect(partialSum(1, -0.5, n)).toBeLessThan(2 / 3);
    // q = -1: S1..S6 = 1, 0, 1, 0, 1, 0 (oscillation between a and 0, no limit).
    expect([1, 2, 3, 4, 5, 6].map(n => partialSum(1, -1, n))).toEqual([1, 0, 1, 0, 1, 0]);
    // 0.333... = 0.3 + 0.03 + ...: a = 3/10, q = 1/10, S4 = 0.3333, limit (3/10)/(1 - 1/10) = 1/3; 0.999...: (9/10)/(9/10) = 1.
    expect(partialSum(0.3, 0.1, 4)).toBeCloseTo(0.3333, 12);
    expect(0.3 / (1 - 0.1)).toBeCloseTo(1 / 3, 15);
    expect(0.9 / (1 - 0.1)).toBeCloseTo(1, 15);
    expect(partialSum(0.9, 0.1, 8)).toBeLessThan(1);
    // Band: the error 2 * 2^-n is below 0.01 exactly from n = 8 on (2^7 = 128 < 200 < 256 = 2^8).
    const errors = [6, 7, 8, 9, 10].map(n => 2 - partialSum(1, 0.5, n));
    expect(errors.map(error => error < 0.01)).toEqual([false, false, true, true, true]);
    expect(2 - partialSum(1, 0.5, 8)).toBe(1 / 128);
    expect(2 - partialSum(1, 0.5, 7)).toBe(1 / 64);
    expect(1 / 128).toBeCloseTo(0.0078, 4);
    expect(1 / 64).toBeCloseTo(0.0156, 4);
});

test('S5: the quoted values are in the prose of the scene they belong to, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        const say = (value: number, decimals = 4) => num(value, decimals, language);
        const text = (id: string) => prose(stepOf(id), language);
        const sum = (id: string) => say(partialSum(SCENES[id].a, SCENES[id].q, SCENES[id].terms));
        // The partial sum a scene displays is the one its text quotes.
        for (const id of ['series-bars', 'series-predict', 'series-reveal', 'series-limit', 'series-alternating', 'series-divergence', 'series-decimals']) {
            expect(stepOf(id).scene!.expectedState[language], `${id} ${language}`).toContain(`S_${SCENES[id].terms}=${sum(id)}`);
        }
        expect(stepOf('series-limit').scene!.expectedState[language]).toContain(`=${say(2, 0)}`);
        expect(text('series-limit')).toContain(`2-S_5=${say(2 - partialSum(1, 0.5, 5))}`);
        expect(text('series-reveal')).toContain('1-(1/2)^5');
        expect(text('series-alternating')).toContain('\\dfrac23');
        expect(text('series-divergence')).toContain('S_6=0');
        expect(text('series-decimals')).toContain('\\dfrac13');
        expect(text('series-decimals')).toContain(`0${language === 'sl' ? '{,}' : '.'}999\\dots=1`);
        expect(text('series-explore')).toContain(say(0.01, 2));
        expect(text('series-explore')).toContain('n=8');
        expect(stepOf('series-explore').scene!.expectedState[language]).toContain(say(1 / 128, 4));
    }
});

test('S5: the scene actions are the registered names; an unknown name, an unknown example and an out-of-range value are rejected, not rounded', () => {
    expect(FUNCTION_PARAMETER_NAMES).toEqual(expect.arrayContaining(['series-a', 'series-q', 'series-n', 'series-tolerance']));
    expect(FUNCTION_PARAMETER_NAMES as readonly string[]).not.toContain('series-bogus');
    expect(FUNCTION_CHOICE_VALUES['series-example']).toEqual(['default', 'alternating', 'repeating-three', 'repeating-nine', 'divergent']);
    const m = mount();
    try {
        const apply = (action: unknown) => act(() => { m.capabilities.apply(action as LessonAction); });
        expect(() => apply({kind: 'function-parameter', name: 'series-bogus', value: 1})).toThrow();
        expect(() => apply({kind: 'function-choice', name: 'series-example', value: 'bogus'})).toThrow();
        for (const [name, value] of [['series-a', 6], ['series-q', 2.5], ['series-n', 51], ['series-n', 0], ['series-n', 2.5], ['series-tolerance', 1.5]] as const) {
            expect(() => apply({kind: 'function-parameter', name, value}), `${name}=${value}`).toThrow();
        }
        expect(m.graph.model).toEqual({a: 1, q: 0.5, terms: 1, tolerance: 0});
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);


// ---- S6 (conic-focal) ---------------------------------------------------------------------------------------------------------------------

const conic = schoolFunctionGraphsBatchCGuidedLessons.find(entry => entry.demonstrationId === 'conic-focal')!;
const conicStep = (stepId: string): GuidedLessonStep => conic.steps.find(step => step.id === stepId)!;
const conicProse = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]),
        ...conic.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');

/** Per step: the example, the bridge switch and the middle weight (null: matched) the scene states. */
const CONIC_SCENES: Record<string, {example: string; bridge: boolean; weight: number | null}> = {
    'conic-ellipse-sum': {example: 'ellipse', bridge: false, weight: null},
    'conic-ratio-reveal': {example: 'ellipse', bridge: false, weight: null},
    'conic-parabola': {example: 'parabola', bridge: false, weight: null},
    'conic-hyperbola': {example: 'hyperbola', bridge: false, weight: null},
    'conic-circle': {example: 'circle', bridge: false, weight: null},
    'conic-bridge': {example: 'ellipse', bridge: true, weight: null},
    'conic-weight': {example: 'ellipse', bridge: true, weight: 1},
};
/** The hand-set geometry of each example: focus, second focus (if any) and the directrix x (if any), from the spec, not from the model. */
const CONIC_GEOMETRY: Record<string, {focus: [number, number]; second: [number, number] | null; directrixX: number | null; p: [number, number]}> = {
    ellipse: {focus: [4, 0], second: [-4, 0], directrixX: 6.25, p: [0, 3]},
    parabola: {focus: [1, 0], second: null, directrixX: -1, p: [1, 2]},
    hyperbola: {focus: [5, 0], second: [-5, 0], directrixX: 1.8, p: [6, Math.sqrt(48)]},
    circle: {focus: [0, 0], second: null, directrixX: null, p: [3 * Math.cos(Math.PI / 3), 3 * Math.sin(Math.PI / 3)]},
};

function mountConic() {
    const graph = createGraph('conic-focal');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as {model: ConicFocalModel}, mounted, capabilities,
        scene: (stepId: string) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(conicStep(stepId))) capabilities.apply(action);
        }),
    };
}

const dist = (a: readonly [number, number], b: readonly [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('S6 has seven ordered steps, each with a scene of its own', () => {
    expect(conic.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(conic.steps.map(step => step.id)).toEqual(Object.keys(CONIC_SCENES));
    expect(new Set(conic.steps.map(step => step.scene!.id)).size).toBe(7);
});

test('S6: every scene lands in the stated state, out of order and twice, and P is the spec point', () => {
    const m = mountConic();
    try {
        const ids = Object.keys(CONIC_SCENES);
        for (const id of [...ids, ...ids.slice().reverse()]) {
            m.scene(id);
            m.scene(id);
            const wanted = CONIC_SCENES[id];
            const model = m.graph.model;
            expect({id, bridge: model.bridge, weight: model.weight}).toEqual({id, bridge: wanted.bridge, weight: wanted.weight});
            const view = conicFocalView(model);
            const geometry = CONIC_GEOMETRY[wanted.example];
            // The scene's state is the example's: its focus, its eccentricity and P at the hand-set point.
            expect({id, focus: [model.focusX, 0]}).toEqual({id, focus: geometry.focus});
            expect({id, p: [view.p.x, view.p.y]}).toEqual({id, p: [expect.closeTo(geometry.p[0], 9), expect.closeTo(geometry.p[1], 9)]});
            expect(model.epsilon).toBeCloseTo({ellipse: 0.8, parabola: 1, hyperbola: 5 / 3, circle: 0}[wanted.example]!, 12);
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S6: the checked numbers of the spec, recomputed from the hand-set foci and directrices, and read off the scene state', () => {
    const m = mountConic();
    try {
        const read = (id: string) => {
            m.scene(id);
            const view = conicFocalView(m.graph.model);
            const g = CONIC_GEOMETRY[CONIC_SCENES[id].example];
            const p: [number, number] = [view.p.x, view.p.y];
            return {view, g, p, pf: dist(p, g.focus), pf2: g.second ? dist(p, g.second) : null, pd: g.directrixX === null ? null : Math.abs(g.directrixX - p[0])};
        };
        // Ellipse x^2/25 + y^2/9 = 1: a = 5, c = 4, P = (0, 3): 5 and 5, sum 10 = 2a; directrix a^2/c = 6.25; ratio 0.8 = c/a.
        for (const id of ['conic-ellipse-sum', 'conic-ratio-reveal']) {
            const {view, pf, pf2, pd} = read(id);
            expect(pf).toBeCloseTo(5, 9);
            expect(pf2).toBeCloseTo(5, 9);
            expect(pf! + pf2!).toBeCloseTo(10, 9);
            expect(pd).toBeCloseTo(6.25, 9);
            expect(pf / pd!).toBeCloseTo(0.8, 9);
            // The displayed readouts are the recomputed values.
            expect([view.pf, view.pf2, view.focalSum, view.pd, view.ratio]).toEqual([5, 5, 10, 6.25, 0.8].map(v => expect.closeTo(v, 9)));
            expect(view.kind).toBe('ellipse');
        }
        // Parabola y^2 = 4x: P = (1, 2), both distances 2.
        {
            const {view, pf, pd} = read('conic-parabola');
            expect([pf, pd]).toEqual([expect.closeTo(2, 9), expect.closeTo(2, 9)]);
            expect([view.pf, view.pd, view.ratio]).toEqual([2, 2, 1].map(v => expect.closeTo(v, 9)));
            expect(view.kind).toBe('parabola');
        }
        // Hyperbola x^2/9 - y^2/16 = 1: P = (6, sqrt 48): 7, 4.2, 5/3, 13, difference 6 = 2a.
        {
            const {view, pf, pf2, pd} = read('conic-hyperbola');
            expect([pf, pd, pf2]).toEqual([expect.closeTo(7, 9), expect.closeTo(4.2, 9), expect.closeTo(13, 9)]);
            expect(pf / pd!).toBeCloseTo(5 / 3, 9);
            expect(pf2! - pf).toBeCloseTo(6, 9);
            expect([view.pf, view.pd, view.pf2, view.focalDifference]).toEqual([7, 4.2, 13, 6].map(v => expect.closeTo(v, 9)));
            expect(view.kind).toBe('hyperbola');
        }
        // Circle: |PF| = 3 everywhere, no directrix, ratio undefined.
        {
            const {view, pf} = read('conic-circle');
            expect(pf).toBeCloseTo(3, 9);
            expect([view.pd, view.ratio, view.foot]).toEqual([null, null, null]);
            expect(view.kind).toBe('circle');
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S6: the bridge arc passes (3.5355, 2.1213) at t = 1/2 by the rational Bezier formula, lies on the ellipse at w1 = sqrt2/2 and leaves it at w1 = 1', () => {
    // Independent rational quadratic Bezier at t = 1/2: control points (5,0), (5,3), (0,3), weights 1, sqrt2/2, 1.
    const w1 = Math.SQRT2 / 2;
    const t = 0.5;
    const b = [(1 - t) ** 2, 2 * t * (1 - t) * w1, t * t];
    const denominator = b[0] + b[1] + b[2];
    const point: [number, number] = [(b[0] * 5 + b[1] * 5 + b[2] * 0) / denominator, (b[0] * 0 + b[1] * 3 + b[2] * 3) / denominator];
    expect(point[0]).toBeCloseTo(3.5355, 4);
    expect(point[1]).toBeCloseTo(2.1213, 4);
    expect(point[0] ** 2 / 25 + point[1] ** 2 / 9).toBeCloseTo(1, 12);
    const m = mountConic();
    try {
        m.scene('conic-bridge');
        const bridge = conicFocalView(m.graph.model).bridge!;
        expect(bridge.weights[1]).toBeCloseTo(w1, 9);
        expect(bridge.weights).toHaveLength(3);
        expect(bridge.weights[0]).toBe(1);
        expect(bridge.weights[2]).toBe(1);
        expect(bridge.weightKind).toBe('ellipse');
        expect(Math.min(...bridge.samples.map(s => dist([s.x, s.y], point)))).toBeLessThan(0.02);
        expect(bridge.deviation).toBeLessThan(1e-9);
        m.scene('conic-weight');
        const off = conicFocalView(m.graph.model).bridge!;
        expect(off.weights[1]).toBe(1);
        expect(off.weightKind).toBe('parabola');
        expect(off.deviation).toBeGreaterThan(0.05);
        // The weight classification: below 1 ellipse, 1 parabola, above 1 hyperbola.
        act(() => { m.capabilities.apply({kind: 'function-parameter', name: 'conic-weight', value: 0.5}); });
        expect(conicFocalView(m.graph.model).bridge!.weightKind).toBe('ellipse');
        act(() => { m.capabilities.apply({kind: 'function-parameter', name: 'conic-weight', value: 2}); });
        expect(conicFocalView(m.graph.model).bridge!.weightKind).toBe('hyperbola');
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('S6: the quoted values are in the prose of the scene they belong to, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        const say = (value: number, decimals: number) => num(value, decimals, language);
        const state = (id: string) => conicStep(id).scene!.expectedState[language];
        const text = (id: string) => conicProse(conicStep(id), language);
        expect(state('conic-ellipse-sum'), language).toContain('|PF|=5');
        expect(state('conic-ellipse-sum')).toContain('|PF_2|=5');
        expect(state('conic-ellipse-sum')).toContain('\\(10\\)');
        expect(state('conic-ratio-reveal')).toContain(`|Pd|=${say(6.25, 2)}`);
        expect(state('conic-ratio-reveal')).toContain(`${say(0.8, 1)}=\\varepsilon`);
        expect(text('conic-ratio-reveal')).toContain(`\\dfrac5{${say(6.25, 2)}}=${say(0.8, 1)}`);
        expect(state('conic-parabola')).toContain('|PF|=2');
        expect(state('conic-parabola')).toContain('|Pd|=2');
        expect(state('conic-hyperbola')).toContain('|PF|=7');
        expect(state('conic-hyperbola')).toContain(`|Pd|=${say(4.2, 1)}`);
        expect(state('conic-hyperbola')).toContain(say(5 / 3, 4));
        expect(state('conic-hyperbola')).toContain('|PF_2|=13');
        expect(state('conic-hyperbola')).toContain('\\(6\\)');
        expect(state('conic-circle')).toContain('|PF|=3');
        expect(state('conic-bridge')).toContain(say(Math.SQRT2 / 2, 4));
        expect(text('conic-bridge')).toContain(`(${say(3.5355, 4)}${language === 'sl' ? ';\\ ' : ',\\ '}${say(2.1213, 4)})`);
        expect(state('conic-weight')).toContain('w_1=1');
        // Quoted symbolic numerator and denominator at t = 1/2, scaled by 4: P0 + sqrt2·P1 + P2 over 1 + sqrt2 + 1.
        expect(text('conic-bridge')).toContain('\\((5+5\\sqrt2,\\ 3+3\\sqrt2)\\)');
        expect(text('conic-bridge')).toContain('\\(2+\\sqrt2\\)');
    }
    const [p0, p1, p2] = [[5, 0], [5, 3], [0, 3]];
    const numerator = [0, 1].map((k) => p0[k] + Math.SQRT2 * p1[k] + p2[k]);
    expect(numerator[0]).toBeCloseTo(5 + 5 * Math.SQRT2, 12);
    expect(numerator[1]).toBeCloseTo(3 + 3 * Math.SQRT2, 12);
    expect(numerator[0] / (2 + Math.SQRT2)).toBeCloseTo(3.5355, 4);
    expect(numerator[1] / (2 + Math.SQRT2)).toBeCloseTo(2.1213, 4);
});

test('S6: the scene actions are the registered names; an unknown name, an unknown example and an out-of-range weight are rejected, not rounded', () => {
    expect(FUNCTION_PARAMETER_NAMES).toContain('conic-weight');
    expect(FUNCTION_PARAMETER_NAMES as readonly string[]).not.toContain('conic-bogus');
    expect(FUNCTION_CHOICE_VALUES['conic-example']).toEqual(['ellipse', 'parabola', 'hyperbola', 'circle', 'bridge']);
    const m = mountConic();
    try {
        const apply = (action: unknown) => act(() => { m.capabilities.apply(action as LessonAction); });
        expect(() => apply({kind: 'function-parameter', name: 'conic-bogus', value: 1})).toThrow();
        expect(() => apply({kind: 'function-visibility', target: 'conic-bogus', visible: true})).toThrow();
        expect(() => apply({kind: 'function-choice', name: 'conic-example', value: 'bogus'})).toThrow();
        apply({kind: 'function-visibility', target: 'conic-bridge', visible: true});
        for (const value of [0.05, 6]) expect(() => apply({kind: 'function-parameter', name: 'conic-weight', value}), `weight ${value}`).toThrow();
        expect(m.graph.model.weight).toBeNull();
        expect(m.graph.model.bridge).toBe(true);
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
