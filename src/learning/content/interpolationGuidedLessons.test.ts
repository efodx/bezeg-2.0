import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {interpolationGuidedLessons} from './interpolationGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {InterpolationGraph} from '../../graphs/curves/interpolation/InterpolationGraph';
import {DEFAULT_INTERPOLATION_PRESET, insideHull, readoutAt, readoutLines} from '../../graphs/curves/interpolation/interpolationModel';
import {bezierCurvePoint, INTERPOLATION_ERROR_GRID, interpolationNodes, lagrangeCurvePoint} from '../../analysis/interpolation';
import {formatNumber, formatSignificant} from '../../analysis/format';
import {setLanguage} from '../../localization';
import type {HermiteGraph} from '../../graphs/curves/hermite/HermiteGraph';
import {chainBezier, chainPoint, DEFAULT_HERMITE_PRESET, hermiteChain} from '../../graphs/curves/hermite/hermiteModel';
import {statusLine} from '../../graphs/curves/hermite/HermiteScene';
import {catmullRomSegments, catmullRomTangents, hermiteDerivative, hermitePoint} from '../../analysis/hermite';
import type {RungeInterpolationGraph} from '../../graphs/functions/RungeInterpolationGraph';
import {rungeData} from '../../analysis/rungeInterpolationModel';
import type {LeastSquaresGraph} from '../../graphs/functions/LeastSquaresGraph';
import {DEFAULT_LEAST_SQUARES_MODEL, leastSquaresView, normalEquations} from '../../analysis/leastSquaresModel';
import type {LeastSquaresView} from '../../analysis/leastSquaresModel';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = interpolationGuidedLessons.find(entry => entry.demonstrationId === 'interp-lagrange')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A number as the prose writes it: `{,}` in Slovenian math, a decimal point in English. */
const proseForm = (value: string, language: 'sl' | 'en') => (language === 'sl' ? value.replace(',', '{,}') : value.replace(',', '.'));

const POINTS = [[0, 0], [1, 2], [3, 3], [4, 0]] as const;
const FOUR: readonly [number, number][] = POINTS.map(p => [p[0], p[1]] as [number, number]);

function mount() {
    const graph = createGraph('interp-lagrange');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as InterpolationGraph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        /** The actions of a step only, in one synchronous tick, without restoring first. */
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
    };
}

/** [step id, kernel value, the number as the Slovenian readout and the prose write it]: the quoted numbers of the lesson. */
const QUOTED: ReadonlyArray<readonly [string, number, string]> = (() => {
    const at = (s: number) => readoutAt(FOUR, 'uniform', s);
    const rows: Array<[string, number, string]> = [];
    const L = at(0.5).lagrange;
    ['-0,0625', '0,5625', '0,5625', '-0,0625'].forEach((text, j) => rows.push(['interp-bezier', L.weights[j], text]));
    rows.push(['interp-bezier', L.point[0], '2'], ['interp-bezier', L.point[1], '2,8125']);
    const B = at(0.5).bezier;
    rows.push(['interp-bezier', B.point[1], '1,875']);
    const basis = at(1 / 6).lagrange;
    ['0,3125', '0,9375', '-0,3125', '0,0625'].forEach((text, j) => rows.push(['interp-basis', basis.weights[j], text]));
    const out = at(5 / 6).lagrange;
    ['0,0625', '-0,3125', '0,9375', '0,3125'].forEach((text, j) => rows.push(['interp-hull-reveal', out.weights[j], text]));
    rows.push(['interp-hull-reveal', out.point[0], '3,75'], ['interp-hull-reveal', out.point[1], '2,1875']);
    return rows;
})();

test('every number the lesson quotes is the kernel readout of its scene', () => {
    for (const [stepId, value, quoted] of QUOTED) {
        expect(formatNumber(value, 'sl', 4).replace('−', '-'), `${stepId} kernel value for ${quoted}`).toBe(quoted);
        const step = stepOf(stepId);
        for (const language of ['sl', 'en'] as const) {
            expect(prose(step, language), `${stepId} ${language} quotes ${quoted}`).toContain(proseForm(quoted, language));
        }
    }
    // The Bernstein weights are quoted as 1/8, 3/8, 3/8, 1/8 and are the kernel's 0.125, 0.375, 0.375, 0.125.
    expect(readoutAt(FOUR, 'uniform', 0.5).bezier.weights).toEqual([0.125, 0.375, 0.375, 0.125]);
    expect(prose(stepOf('interp-bezier'), 'en')).toContain('\\tfrac18,\\tfrac38,\\tfrac38,\\tfrac18');
});

test('the kernel reproduces the spec numbers independently of the graph readout', () => {
    const parameters = [0, 1, 2, 3];
    const lagrange = lagrangeCurvePoint(FOUR, parameters, 1.5);
    expect(lagrange.weights).toEqual([-0.0625, 0.5625, 0.5625, -0.0625]);
    expect(lagrange.point).toEqual([2, 2.8125]);
    const bezier = bezierCurvePoint(FOUR, 0.5);
    expect(bezier.weights).toEqual([0.125, 0.375, 0.375, 0.125]);
    expect(bezier.point).toEqual([2, 1.875]);
    const early = lagrangeCurvePoint(FOUR, parameters, 0.5);
    expect(early.weights).toEqual([0.3125, 0.9375, -0.3125, 0.0625]);
    expect(early.weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(1, 14);
    // The hull claim of step 2: the Lagrange point at t = 5/2 is outside, the Bezier point at the same s is inside.
    expect(insideHull(lagrangeCurvePoint(FOUR, parameters, 2.5).point, FOUR)).toBe(false);
    expect(insideHull(bezierCurvePoint(FOUR, 5 / 6).point, FOUR)).toBe(true);
});

test('each scene shows the readout and the overlays its text quotes, in one synchronous sequence', () => {
    const h = mount();
    try {
        const expected: ReadonlyArray<readonly [string, number, boolean, boolean, boolean, number, string]> = [
            // [step, s, hull, bezier, basis, point count, a line of the Slovenian readout]
            ['interp-predict-hull', 0.5, false, false, false, 4, 'točka (2, 2,8125)'],
            ['interp-hull-reveal', 5 / 6, true, false, false, 4, 'točka (3,75, 2,1875)'],
            ['interp-bezier', 0.5, true, true, false, 4, 'Bézier: t = 0,5 (na [0, 1]), uteži 0,125; 0,375; 0,375; 0,125, točka (2, 1,875)'],
            ['interp-basis', 1 / 6, true, true, true, 4, 'uteži 0,3125; 0,9375; −0,3125; 0,0625'],
            ['interp-global', 0.5, true, true, false, 4, 'Lagrange: t = 1,5 (na [0, 3]), uteži −0,0625; 0,5625; 0,5625; −0,0625'],
            ['interp-fifth-point', 0.5, true, true, false, 5, 'Lagrange: t = 2 (na [0, 4])'],
            ['interp-explore', 0.5, false, true, false, 4, 'točka (2, 2,8125)'],
        ];
        for (const [stepId, s, hull, bezier, basis, count, line] of expected) {
            const step = stepOf(stepId);
            h.scene(step);
            const state = h.graph.state;
            expect(state.t, stepId).toBeCloseTo(s, 12);
            expect([state.showHull, state.showBezier, state.showBasis], stepId).toEqual([hull, bezier, basis]);
            expect(state.points.length, stepId).toBe(count);
            expect(state.parameterRule, stepId).toBe('uniform');
            expect(readoutLines(state.points, state.parameterRule, state.t, state.showBezier, 'sl').join('\n'), stepId).toContain(line);
        }
        // The fifth point is the Add button's: one unit right of the last point.
        h.scene(stepOf('interp-fifth-point'));
        expect(h.graph.state.points[4]).toEqual([5, 0]);
        // Free exploration is the default scene: Reset after step 6 returns to the four default points, in one tick.
        h.run(stepOf('interp-explore'));
        expect(h.graph.state.points).toEqual(POINTS);
        expect(h.graph.state.t).toBe(DEFAULT_INTERPOLATION_PRESET.t);
    } finally {
        h.mounted.view.unmount();
    }
});

test('actions of consecutive steps run without a restore and the default scene resets the fifth point', () => {
    const h = mount();
    try {
        h.run(stepOf('interp-bezier'));
        h.run(stepOf('interp-fifth-point'));
        expect(h.graph.state.points).toHaveLength(5);
        h.run(stepOf('interp-predict-hull'));
        expect(h.graph.state.points).toEqual(POINTS);
        expect([h.graph.state.showHull, h.graph.state.showBezier]).toEqual([false, false]);
        // A lesson checkpoint taken at five points restores five points, and the Reset action returns to four.
        h.run(stepOf('interp-fifth-point'));
        const checkpoint = h.capabilities.captureState();
        act(() => h.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(h.graph.state.points).toEqual(POINTS);
        act(() => h.capabilities.restoreState(checkpoint));
        expect(h.graph.state.points).toHaveLength(5);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the lesson has seven steps, the last one free exploration, and every guided step asks for a prediction in both languages', () => {
    expect(lesson.steps).toHaveLength(7);
    expect(lesson.steps[6].id).toBe('interp-explore');
    for (const step of lesson.steps.slice(0, 6)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    expect(JSON.stringify(lesson)).toContain('interpolacijsk');
});

// ---- I3: Hermite and Catmull-Rom (interp-hermite) --------------------------------------------------------------------

const hermiteLesson = interpolationGuidedLessons.find(entry => entry.demonstrationId === 'interp-hermite')!;
const hermiteStepOf = (stepId: string): GuidedLessonStep => hermiteLesson.steps.find(step => step.id === stepId)!;
const hermiteProse = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...hermiteLesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A point as the prose writes it: (a; b) with decimal commas as `{,}` in Slovenian and points in English. */
const pairProse = (value: readonly number[], language: 'sl' | 'en') => {
    const [a, b] = value.map(v => proseForm(formatNumber(v, 'sl', 4).replace('−', '-'), language));
    return `(${a};\\ ${b})`;
};
const hermiteInput = (graph: HermiteGraph) => graph.state;

function mountHermite() {
    const graph = createGraph('interp-hermite');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as HermiteGraph, mounted, capabilities,
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
    };
}

const DEFAULT_TANGENTS = [[1, 2], [1.5, 1.5], [1.5, -1], [1, -3]];

test('the Catmull-Rom tangents, the Bezier points, the midpoint and the second derivatives quoted by the lesson are the kernel values', () => {
    const tangents = catmullRomTangents(FOUR, 'uniform', 1);
    expect(tangents).toEqual(DEFAULT_TANGENTS);
    expect(DEFAULT_HERMITE_PRESET.tangents).toEqual(DEFAULT_TANGENTS);
    // The segment from P1 to P2.
    const chain = hermiteChain({points: FOUR, mode: 'catmull-rom', tangents: [], parameterRule: 'uniform', tension: 1});
    const midpoint = chainPoint(chain, 1.5);
    expect(midpoint).toEqual([2, 2.8125]);
    const [p1, p2] = [FOUR[1], FOUR[2]];
    expect([0, 1].map(k => (p1[k] + p2[k]) / 2 + (tangents[1][k] - tangents[2][k]) / 8)).toEqual([2, 2.8125]);
    // The same point as the Lagrange curve: the uniform Catmull-Rom midpoint weights are -1/16, 9/16, 9/16, -1/16.
    const weights = [-1 / 16, 9 / 16, 9 / 16, -1 / 16];
    expect([0, 1].map(k => FOUR.reduce((sum, p, j) => sum + weights[j] * p[k], 0))).toEqual([2, 2.8125]);
    expect(lagrangeCurvePoint(FOUR, [0, 1, 2, 3], 1.5).point).toEqual(midpoint);
    // Bezier control points P1 + m1/3 and P2 - m2/3 (h = 1), which give the same midpoint by de Casteljau.
    const [q0, q1, q2, q3] = chainBezier(chain)[1];
    expect(q0).toEqual([1, 2]);
    expect(q3).toEqual([3, 3]);
    expect(q1).toEqual([1.5, 2.5]);
    expect(q2[0]).toBeCloseTo(2.5, 14);
    expect(q2[1]).toBeCloseTo(10 / 3, 14);
    expect([0, 1].map(k => (q0[k] + 3 * q1[k] + 3 * q2[k] + q3[k]) / 8)[1]).toBeCloseTo(2.8125, 14);
    // Second derivatives at P1 from both sides (uniform): second differences of the two cubic pieces.
    const segments = catmullRomSegments(FOUR, 'uniform', 1);
    const e = 1e-5;
    const second = (segment: typeof segments[number], u: number, dir: 1 | -1) => {
        const f = [0, 1, 2].map(k => hermitePoint(segment, u + dir * k * e));
        return [0, 1].map(c => (f[0][c] - 2 * f[1][c] + f[2][c]) / (e * e));
    };
    const left = second(segments[0], 1, -1);
    const right = second(segments[1], 0, 1);
    expect(left[0]).toBeCloseTo(2, 2);
    expect(left[1]).toBeCloseTo(-2, 2);
    expect(right[0]).toBeCloseTo(3, 2);
    expect(right[1]).toBeCloseTo(2, 2);
    // C^1: the first derivatives agree at every interior point, the second ones do not.
    for (const i of [1, 2]) {
        const a = hermiteDerivative(segments[i - 1], 1);
        const b = hermiteDerivative(segments[i], 0);
        expect([a[0] - b[0], a[1] - b[1]].map(Math.abs)).toEqual([0, 0]);
    }
    // The text quotes exactly these numbers, in both languages.
    for (const language of ['sl', 'en'] as const) {
        const one = hermiteProse(hermiteStepOf('hermite-predict-segment'), language);
        for (const m of tangents) expect(one, `step 1 ${language} tangent ${m}`).toContain(pairProse(m, language));
        const handle = hermiteProse(hermiteStepOf('hermite-handle'), language);
        for (const point of [q1, [q2[0], Math.round(q2[1] * 1000) / 1000], midpoint]) expect(handle, `step 2 ${language} ${point}`).toContain(pairProse(point, language));
        const catmull = hermiteProse(hermiteStepOf('hermite-catmull-rom'), language);
        for (const point of [tangents[1], tangents[2], tangents[0], tangents[3], midpoint]) expect(catmull, `step 3 ${language} ${point}`).toContain(pairProse(point, language));
        const c1 = hermiteProse(hermiteStepOf('hermite-c1-only'), language);
        for (const value of [left, right]) expect(c1, `step 5 ${language} ${value}`).toContain(pairProse([Math.round(value[0]), Math.round(value[1])], language));
    }
});

test('every semicolon pair the I3 text quotes is one of the kernel values, in every place it appears', () => {
    const [, q1, q2] = chainBezier(hermiteChain({points: FOUR, mode: 'catmull-rom', tangents: [], parameterRule: 'uniform', tension: 1}))[1];
    const values: (readonly number[])[] = [...catmullRomTangents(FOUR, 'uniform', 1), q1, [q2[0], Math.round(q2[1] * 1000) / 1000], [2, 2.8125], [2, -2], [3, 2]];
    for (const language of ['sl', 'en'] as const) {
        const allowed = new Set(values.map(v => pairProse(v, language)));
        const text = [
            ...hermiteLesson.steps.flatMap(step => [step.explanation, step.scene!.expectedState, ...step.expectedObservations]),
            ...hermiteLesson.workedExamples.map(example => example.check), ...hermiteLesson.formulaBlocks.map(block => block.explanation),
        ].map(entry => entry[language]).join(' ');
        const found = text.match(/\(-?[0-9{},.]+;\\ -?[0-9{},.]+\)/g) ?? [];
        expect(found.length).toBeGreaterThan(20);
        for (const pair of found) expect(allowed.has(pair), `${language} ${pair}`).toBe(true);
    }
});

test('a rule switch in Hermite mode rescales the local tangents and changes the shape; tension 0 gives straight segments', () => {
    const base = {points: FOUR, mode: 'hermite' as const, tangents: DEFAULT_TANGENTS as never, tension: 1};
    const uniform = hermiteChain({...base, parameterRule: 'uniform'});
    const chord = hermiteChain({...base, parameterRule: 'chord'});
    const a = hermitePoint(uniform.segments[1], 0.5);
    const b = hermitePoint(chord.segments[1], 0.5);
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(1e-3);
    // The Bezier handle is P + h m / 3 with h the parameter length, equal to P + m / 3 only when h = 1.
    const h = chord.parameters[2] - chord.parameters[1];
    expect(h).not.toBe(1);
    expect(chainBezier(chord)[1][1][0]).toBeCloseTo(1 + (h * 1.5) / 3, 12);
    expect(chainBezier(uniform)[1][1][0]).toBeCloseTo(1 + 1.5 / 3, 12);
    const flat = hermiteChain({points: FOUR, mode: 'catmull-rom', tangents: [], parameterRule: 'uniform', tension: 0});
    expect(chainPoint(flat, 1.5)).toEqual([2, 2.5]);
});

test('moving one point changes at most four Catmull-Rom segments, and the lesson scene has the points that show it', () => {
    const six: [number, number][] = [...FOUR, [5, 0], [6, 0]];
    const changed = (index: number, rule: 'uniform' | 'chord') => {
        const moved = six.map((p, i) => i === index ? [p[0], p[1] + 1.5] as [number, number] : p);
        const before = catmullRomSegments(six, rule, 1);
        const after = catmullRomSegments(moved, rule, 1);
        return before.filter((s, i) => JSON.stringify(s) !== JSON.stringify(after[i])).length;
    };
    for (const rule of ['uniform', 'chord'] as const) expect(six.map((_, i) => changed(i, rule)), rule).toEqual([2, 3, 4, 4, 3, 2]);
    const h = mountHermite();
    try {
        h.scene(hermiteStepOf('hermite-locality'));
        expect(h.graph.state.points).toEqual(six);
        const before = hermiteChain(hermiteInput(h.graph));
        act(() => { h.graph.movePoint(2, 3, 4.5); });
        const after = hermiteChain(hermiteInput(h.graph));
        expect(before.segments.map((s, i) => JSON.stringify(s) !== JSON.stringify(after.segments[i]))).toEqual([true, true, true, true, false]);
    } finally {
        h.mounted.view.unmount();
    }
});

test('each hermite scene sets the mode, tension, overlays and points its text describes, in one synchronous sequence', () => {
    const h = mountHermite();
    try {
        const expected: ReadonlyArray<readonly [string, 'hermite' | 'catmull-rom', boolean, number, string]> = [
            // [step, mode, Bezier overlay, point count, status line]
            ['hermite-predict-segment', 'hermite', false, 4, 'Hermiteova krivulja z izbranimi tangentami'],
            ['hermite-handle', 'hermite', true, 4, 'Hermiteova krivulja z izbranimi tangentami'],
            ['hermite-catmull-rom', 'catmull-rom', false, 4, 'Catmull-Romov zlepek, napetost 1'],
            ['hermite-locality', 'catmull-rom', false, 6, 'Catmull-Romov zlepek, napetost 1'],
            ['hermite-c1-only', 'catmull-rom', true, 4, 'Catmull-Romov zlepek, napetost 1'],
            ['hermite-explore', 'catmull-rom', false, 4, 'Catmull-Romov zlepek, napetost 1'],
        ];
        for (const [stepId, mode, bezier, count, status] of expected) {
            h.scene(hermiteStepOf(stepId));
            const state = h.graph.state;
            expect([state.mode, state.showBezier, state.showTangents, state.parameterRule, state.tension], stepId).toEqual([mode, bezier, true, 'uniform', 1]);
            expect(state.points.length, stepId).toBe(count);
            expect(state.tangents.length, stepId).toBe(count);
            expect(statusLine(state, 'sl'), stepId).toBe(status);
        }
        // Hermite mode starts from the Catmull-Rom tangents, so step 1 shows the quoted arrows.
        h.scene(hermiteStepOf('hermite-predict-segment'));
        expect(h.graph.state.tangents).toEqual(DEFAULT_TANGENTS);
        // Reset after a modified step returns to the default: step 4 (six points) then the default scene, without a restore.
        h.run(hermiteStepOf('hermite-locality'));
        expect(h.graph.state.points).toHaveLength(6);
        act(() => { h.graph.movePoint(2, 3, 4.5); h.graph.setTension(1.5); });
        act(() => h.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(h.graph.state.points).toEqual(POINTS);
        expect([h.graph.state.mode, h.graph.state.tension, h.graph.state.showBezier]).toEqual(['catmull-rom', 1, false]);
        // Consecutive steps without a restore end in the last step's state.
        h.run(hermiteStepOf('hermite-handle'));
        h.run(hermiteStepOf('hermite-locality'));
        h.run(hermiteStepOf('hermite-c1-only'));
        expect(h.graph.state.points).toEqual(POINTS);
        expect([h.graph.state.mode, h.graph.state.showBezier]).toEqual(['catmull-rom', true]);
        // A lesson checkpoint taken in a modified state keeps it.
        h.run(hermiteStepOf('hermite-locality'));
        act(() => { h.graph.setTension(0.5); });
        const checkpoint = h.capabilities.captureState();
        act(() => h.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(h.graph.state.points).toEqual(POINTS);
        act(() => h.capabilities.restoreState(checkpoint));
        expect(h.graph.state.points).toHaveLength(6);
        expect(h.graph.state.tension).toBe(0.5);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the hermite action rejects invalid inputs with a clear error', () => {
    const h = mountHermite();
    try {
        const bad: unknown[] = [
            {kind: 'hermite', operation: 'set-mode', mode: 'spline'},
            {kind: 'hermite', operation: 'set-rule', rule: 'centripetal'},
            {kind: 'hermite', operation: 'set-tension', value: 3},
            {kind: 'hermite', operation: 'set-tension', value: Number.NaN},
            {kind: 'hermite', operation: 'set-overlay', overlay: 'hull', visible: true},
            {kind: 'hermite', operation: 'set-overlay', overlay: 'bezier', visible: 'yes'},
            {kind: 'hermite', operation: 'remove-point'},
        ];
        for (const action of bad) expect(() => h.capabilities.apply(action as LessonAction), JSON.stringify(action)).toThrow(/hermite|tension|mode|rule|overlay/i);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the I3 lesson has six steps with predictions, a free last step, the required caveats and the one-shot terms', () => {
    expect(hermiteLesson.steps).toHaveLength(6);
    expect(hermiteLesson.steps[5].id).toBe('hermite-explore');
    for (const step of hermiteLesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    const all = JSON.stringify(hermiteLesson);
    for (const term of ['Hermiteova interpolacija', 'Catmull-Romov zlepek', 'interpolacijsk']) expect(all, term).toContain(term);
    for (const language of ['sl', 'en'] as const) {
        const handle = hermiteLesson.steps.map(step => hermiteProse(step, language)).join(' ');
        expect(handle).toContain('P_i+\\tfrac13 h_i m_i');
        expect(handle).toContain('h_i=1');
        expect(handle).toContain('C^1');
        expect(handle).toMatch(language === 'sl' ? /največ štiri odseke, ne dveh/ : /at most four segments, not two/);
        expect(handle).toMatch(language === 'sl' ? /enostransk/ : /one-sided/);
        expect(handle).toMatch(language === 'sl' ? /preoblikuje lokalne tangente/ : /rescales the local tangents/);
    }
});

// ---- I2: the Runge phenomenon and Chebyshev nodes (interp-runge) ---------------------------------------------------------

const rungeLesson = interpolationGuidedLessons.find(entry => entry.demonstrationId === 'interp-runge')!;
const rungeStepOf = (stepId: string): GuidedLessonStep => rungeLesson.steps.find(step => step.id === stepId)!;
const rungeProse = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])].join(' ');
const rungeStepIds = ['runge-predict', 'runge-raise-degree', 'runge-error-curve', 'runge-chebyshev', 'runge-compare', 'runge-explore'];

function mountRunge() {
    const graph = createGraph('interp-runge');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as RungeInterpolationGraph, mounted, capabilities,
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
    };
}

/** What the graph readout shows for the grid maximum and its place, as text with the minus sign replaced. */
const readoutText = (id: string) => (document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '').replace('−', '-');
/** The kernel's grid maximum as the Slovenian readout prints it (four significant figures). */
const gridMaxText = (functionId: 'runge' | 'abs' | 'sine', degree: number, rule: 'equispaced' | 'chebyshev') =>
    formatSignificant(rungeData(functionId, degree, rule).gridMax, 'sl', 4);

/** [step id, function, degree, rule, quoted grid maxima] for every number the lesson quotes. */
const RUNGE_QUOTED: ReadonlyArray<readonly [string, 10 | 15 | 20, 'equispaced' | 'chebyshev', string]> = [
    ['runge-error-curve', 10, 'equispaced', '1,916'],
    ['runge-chebyshev', 10, 'chebyshev', '0,1092'],
    ['runge-compare', 10, 'equispaced', '1,916'], ['runge-compare', 15, 'equispaced', '2,108'], ['runge-compare', 20, 'equispaced', '59,82'],
    ['runge-compare', 10, 'chebyshev', '0,1092'], ['runge-compare', 15, 'chebyshev', '0,08311'], ['runge-compare', 20, 'chebyshev', '0,01533'],
];

test('every grid maximum the I2 lesson quotes is the kernel value and appears in the prose in both languages', () => {
    for (const [stepId, degree, rule, quoted] of RUNGE_QUOTED) {
        expect(gridMaxText('runge', degree, rule), `${stepId} kernel n=${degree} ${rule}`).toBe(quoted);
        for (const language of ['sl', 'en'] as const) {
            expect(rungeProse(rungeStepOf(stepId), language), `${stepId} ${language} quotes ${quoted}`).toContain(proseForm(quoted, language));
        }
    }
    // The place of the n = 10 equispaced maximum: the readout prints 0,9402 and the prose quotes exactly that.
    expect(formatNumber(rungeData('runge', 10, 'equispaced').gridMaxAt, 'sl', 4).replace('−', '-')).toBe('0,9402');
    for (const language of ['sl', 'en'] as const) {
        expect(rungeProse(rungeStepOf('runge-error-curve'), language)).toContain(proseForm('0,9402', language));
    }
});

test('the claims of the I2 prose hold on the kernel: node polynomial maximum 2^-n, sine contrast, grid size', () => {
    // The Chebyshev nodes of the first kind give max |prod (x - x_j)| = 2^-n on [-1, 1]; equally spaced nodes give a larger one.
    const maxNodePolynomial = (nodes: readonly number[]) => {
        let max = 0;
        for (let i = 0; i <= 20000; i++) {
            const x = -1 + (2 * i) / 20000;
            max = Math.max(max, Math.abs(nodes.reduce((product, node) => product * (x - node), 1)));
        }
        return max;
    };
    for (const n of [10, 15, 20]) {
        const chebyshev = maxNodePolynomial(interpolationNodes('chebyshev', n, -1, 1));
        expect(chebyshev, `n=${n}`).toBeCloseTo(2 ** -n, 12);
        expect(maxNodePolynomial(interpolationNodes('equispaced', n, -1, 1)), `n=${n}`).toBeGreaterThan(chebyshev);
    }
    // The sine contrast: already degree 6 equispaced is within 1e-3, and degree 10 is far better.
    expect(rungeData('sine', 6, 'equispaced').gridMax).toBeLessThan(1e-3);
    expect(rungeData('sine', 10, 'equispaced').gridMax).toBeLessThan(rungeData('sine', 6, 'equispaced').gridMax);
    // The readout is a grid maximum on 20001 points.
    expect(INTERPOLATION_ERROR_GRID).toBe(20001);
    expect(rungeProse(rungeStepOf('runge-error-curve'), 'en')).toContain('20001');
    expect(rungeProse(rungeStepOf('runge-error-curve'), 'sl')).toContain('20001');
});

test('each Runge scene sets the function, degree, rule and switches its text describes and shows the quoted readout, in one synchronous sequence', () => {
    const h = mountRunge();
    try {
        const expected: ReadonlyArray<readonly [string, number, 'equispaced' | 'chebyshev', boolean, boolean, string, string]> = [
            // [step, degree, rule, error curve, semicircle, grid maximum readout, place readout]
            ['runge-predict', 6, 'equispaced', false, false, gridMaxText('runge', 6, 'equispaced'), ''],
            ['runge-raise-degree', 10, 'equispaced', false, false, '1,916', ''],
            ['runge-error-curve', 10, 'equispaced', true, false, '1,916', '0,9402'],
            ['runge-chebyshev', 10, 'chebyshev', true, true, '0,1092', ''],
            ['runge-compare', 20, 'equispaced', true, false, '59,82', ''],
            ['runge-explore', 10, 'equispaced', true, false, '1,916', '0,9402'],
        ];
        for (const [stepId, degree, rule, error, semicircle, max, at] of expected) {
            h.scene(rungeStepOf(stepId));
            const state = h.graph.state.model;
            expect([state.functionId, state.degree, state.nodeRule, state.showError, state.showSemicircle], stepId).toEqual(['runge', degree, rule, error, semicircle]);
            expect(readoutText('degree'), stepId).toBe(String(degree));
            expect(readoutText('grid-max'), stepId).toBe(max);
            if (at) expect(readoutText('grid-max-at'), stepId).toBe(at);
        }
        // Reset after a modified step returns to the default, in one tick and without a restore.
        h.run(rungeStepOf('runge-chebyshev'));
        act(() => {
            h.capabilities.apply({kind: 'runge', operation: 'set-degree', value: 15});
            h.capabilities.apply({kind: 'runge', operation: 'set-function', function: 'sine'});
        });
        expect(h.graph.state.model.degree).toBe(15);
        act(() => h.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect([h.graph.state.model.functionId, h.graph.state.model.degree, h.graph.state.model.nodeRule, h.graph.state.model.showError, h.graph.state.model.showSemicircle]).toEqual(['runge', 10, 'equispaced', true, false]);
        expect(readoutText('grid-max')).toBe('1,916');
        // Consecutive steps without a restore end in the last step's state.
        h.run(rungeStepOf('runge-chebyshev'));
        h.run(rungeStepOf('runge-compare'));
        expect([h.graph.state.model.degree, h.graph.state.model.nodeRule, h.graph.state.model.showSemicircle]).toEqual([20, 'equispaced', false]);
        // A lesson checkpoint taken in a modified state keeps it.
        act(() => {
            h.capabilities.apply({kind: 'runge', operation: 'set-rule', rule: 'chebyshev'});
            h.capabilities.apply({kind: 'runge', operation: 'set-function', function: 'abs'});
        });
        const checkpoint = h.capabilities.captureState();
        act(() => h.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(h.graph.state.model.degree).toBe(10);
        act(() => h.capabilities.restoreState(checkpoint));
        expect([h.graph.state.model.functionId, h.graph.state.model.degree, h.graph.state.model.nodeRule]).toEqual(['abs', 20, 'chebyshev']);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the runge action rejects invalid inputs with a clear error and leaves the state alone', () => {
    const h = mountRunge();
    try {
        const before = {...h.graph.state.model};
        const bad: unknown[] = [
            {kind: 'runge', operation: 'set-function', function: 'cosine'},
            {kind: 'runge', operation: 'set-degree', value: 0},
            {kind: 'runge', operation: 'set-degree', value: 41},
            {kind: 'runge', operation: 'set-degree', value: 10.5},
            {kind: 'runge', operation: 'set-degree', value: Number.NaN},
            {kind: 'runge', operation: 'set-degree', value: '10'},
            {kind: 'runge', operation: 'set-rule', rule: 'second-kind'},
            {kind: 'runge', operation: 'set-overlay', overlay: 'nodes', visible: true},
            {kind: 'runge', operation: 'set-overlay', overlay: 'error', visible: 'yes'},
            {kind: 'runge', operation: 'remove-node'},
        ];
        for (const action of bad) expect(() => h.capabilities.apply(action as LessonAction), JSON.stringify(action)).toThrow(/./);
        expect([h.graph.state.model.functionId, h.graph.state.model.degree, h.graph.state.model.nodeRule]).toEqual([before.functionId, before.degree, before.nodeRule]);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the I2 lesson has six steps with predictions, a free last step, the required caveats and the one-shot terms', () => {
    expect(rungeLesson.steps.map(step => step.id)).toEqual(rungeStepIds);
    for (const step of rungeLesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    const all = JSON.stringify(rungeLesson);
    for (const term of ['Rungejev pojav', 'Čebiševe točke', 'interpolacijski polinom', 'vozliščni polinom', 'mreži']) expect(all, term).toContain(term);
    for (const language of ['sl', 'en'] as const) {
        const prose = rungeLesson.steps.map(step => rungeProse(step, language)).join(' ') + rungeLesson.formulaBlocks.map(block => block.explanation[language]).join(' ');
        expect(prose, language).toMatch(language === 'sl' ? /ne za vsako funkcijo|ne dokazuje/ : /nor for every function|not a proof/);
        expect(prose, language).toMatch(language === 'sl' ? /ne napake pri vsaki stopnji/ : /not the error at every degree/);
        expect(prose, language).toMatch(language === 'sl' ? /ne prava zgornja meja/ : /not the true supremum/);
        expect(prose, language).toMatch(language === 'sl' ? /pravokotne projekcije enakomerno razporejenih točk na polkrogu/ : /projections onto the .{0,40}axis of equally spaced points on a semicircle/);
    }
    // The prerequisites name the Taylor lesson and the Lagrange lesson (I1).
    expect(rungeLesson.prerequisites.map(entry => entry.en).join(' ')).toMatch(/Taylor/);
    expect(rungeLesson.prerequisites.map(entry => entry.en).join(' ')).toMatch(/Lagrange/);
    // No degree-5 comparison: there Chebyshev nodes are worse in the maximum norm.
    for (const step of rungeLesson.steps) {
        for (const action of actionsOf(step)) if (action.kind === 'runge' && action.operation === 'set-degree') expect(action.value, step.id).not.toBe(5);
    }
});

test('every decimal number with three or more fractional digits in the I2 prose is a quoted kernel value, in every place it appears', () => {
    const allowed = [...RUNGE_QUOTED.map(row => row[3]), '0,9402'];
    for (const language of ['sl', 'en'] as const) {
        const allowedForms = new Set(allowed.map(value => proseForm(value, language)));
        const text = rungeLesson.steps.map(step => rungeProse(step, language)).join(' ');
        const found = text.match(/-?\d+(?:\{,\}|\.)\d{3,}/g) ?? [];
        expect(found.length).toBeGreaterThan(20);
        for (const value of found) expect(allowedForms.has(value.replace(/^-/, '')), `${language} ${value}`).toBe(true);
    }
});

// ---- I4: least squares (interp-least-squares) ----------------------------------------------------------------------------

const lsqLesson = interpolationGuidedLessons.find(entry => entry.demonstrationId === 'interp-least-squares')!;
const lsqStepOf = (stepId: string): GuidedLessonStep => lsqLesson.steps.find(step => step.id === stepId)!;
const lsqProse = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language])].join(' ');
const lsqStepIds = ['lsq-predict', 'lsq-manual', 'lsq-outlier', 'lsq-normal', 'lsq-degree', 'lsq-explore'];

function mountLsq() {
    const graph = createGraph('interp-least-squares');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as LeastSquaresGraph, mounted, capabilities,
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
        apply: (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); }),
    };
}
type LsqHarness = ReturnType<typeof mountLsq>;

/** What the graph's own readout rows say, with the minus sign replaced. */
const lsqReadout = (id: string) => (document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? '').replace(/−/g, '-');
/** The kernel's view of the graph's current model. */
const lsqView = (h: LsqHarness) => leastSquaresView(h.graph.state.model);
const fitOfView = (view: LeastSquaresView) => {
    if (!view.fit.ok) throw new Error('The scene has no fit.');
    return view.fit.fit;
};
const lsqFit = (h: LsqHarness) => fitOfView(lsqView(h));
const lsqFitCoefficients = (h: LsqHarness) => lsqView(h).drawn!;
/** A number as the Slovenian readout prints it, the way the graph writes it. */
const lsqText = (value: number) => formatSignificant(value, 'sl', 4).replace('−', '-');
const lsqPlain = (value: number) => formatNumber(value, 'sl', 3).replace('−', '-');
const lsqProseHas = (stepId: string, quoted: string, language: 'sl' | 'en') => lsqProse(lsqStepOf(stepId), language).includes(proseForm(quoted, language));

/** The sum of the products of the residuals with the columns 1 and x of the design matrix (orthogonality of the residuals). */
const lsqOrthogonality = (h: LsqHarness) => {
    const view = lsqView(h);
    const points = h.graph.state.model.points;
    return [view.residuals.reduce((a, r) => a + r, 0), view.residuals.reduce((a, r, i) => a + r * points[i][0], 0)];
};

test('each least-squares scene sets the data, degree, mode, line and switches its text describes and shows the quoted readout, in one synchronous sequence', () => {
    const h = mountLsq();
    try {
        // Step 1: the start (horizontal manual line, best line and squares hidden), then the reveal a learner makes.
        h.scene(lsqStepOf('lsq-predict'));
        expect([h.graph.state.model.manualLine, h.graph.state.model.slope, h.graph.state.model.intercept, h.graph.state.model.showSquares, h.graph.state.model.showNormalEquations]).toEqual([true, 0, 2, false, false]);
        expect(lsqReadout('equation')).toBe('y = 2');
        expect(lsqReadout('sum')).toBe('5');
        h.apply({kind: 'lsq', operation: 'set-mode', mode: 'best'}, {kind: 'lsq', operation: 'set-overlay', overlay: 'squares', visible: true});
        expect(lsqReadout('equation')).toBe('y = 0,9x + 0,9');
        expect(lsqReadout('sum')).toBe('0,7');
        expect(lsqReadout('residuals')).toBe('0,1; 0,2; -0,7; 0,4');
        expect(lsqView(h).residuals.map(lsqPlain)).toEqual(['0,1', '0,2', '-0,7', '0,4']);
        expect(lsqView(h).sumOfSquares).toBeCloseTo(0.7, 12);
        expect(lsqView(h).residuals.reduce((a, r) => a + r, 0)).toBeCloseTo(0, 12);

        // Step 2: the manual line y = x + 1 has sum 1 beside the minimum 0,7; the sliders' optimum 0,9 / 0,9 reaches it.
        h.scene(lsqStepOf('lsq-manual'));
        expect([h.graph.state.model.manualLine, h.graph.state.model.slope, h.graph.state.model.intercept, h.graph.state.model.showSquares]).toEqual([true, 1, 1, true]);
        expect(lsqReadout('equation')).toBe('y = x + 1');
        expect(lsqReadout('sum')).toBe('1');
        expect(lsqReadout('optimal-sum')).toBe('0,7');
        h.apply({kind: 'lsq', operation: 'set-line', slope: 0.9, intercept: 0.9});
        expect(lsqReadout('sum')).toBe('0,7');
        expect(lsqReadout('optimal-sum')).toBe('0,7');
        // No line has a smaller sum: a grid of lines around the optimum never beats the readout's minimum.
        for (const [slope, intercept] of [[0.8, 0.9], [1, 0.9], [0.9, 0.8], [0.9, 1], [0.85, 0.95]]) {
            h.apply({kind: 'lsq', operation: 'set-line', slope, intercept});
            expect(lsqView(h).sumOfSquares!, `${slope} ${intercept}`).toBeGreaterThan(lsqView(h).optimalSumOfSquares!);
        }

        // Step 3: (3,4) replaced by (3,8).
        h.scene(lsqStepOf('lsq-outlier'));
        expect(h.graph.state.model.points).toEqual([[0, 1], [1, 2], [2, 2], [3, 8]]);
        expect([h.graph.state.model.manualLine, h.graph.state.model.degree, h.graph.state.model.showSquares]).toEqual([false, 1, true]);
        expect(lsqReadout('equation')).toBe('y = 2,1x + 0,1');
        expect(lsqReadout('sum')).toBe('8,7');
        // The residuals grow at most points (stated as "most of the other points").
        const before = [0.1, 0.2, -0.7, 0.4].map(Math.abs);
        const after = lsqView(h).residuals.map(Math.abs);
        expect(after.filter((r, i) => i < 3 && r > before[i]).length).toBeGreaterThanOrEqual(2);

        // Step 4: the normal equations of the original data.
        h.scene(lsqStepOf('lsq-normal'));
        expect(h.graph.state.model.points).toEqual([[0, 1], [1, 2], [2, 2], [3, 4]]);
        expect([h.graph.state.model.manualLine, h.graph.state.model.degree, h.graph.state.model.showNormalEquations]).toEqual([false, 1, true]);
        const equations = normalEquations(lsqFit(h))!;
        expect(equations.matrix.map(row => row.map(lsqPlain))).toEqual([['4', '6'], ['6', '14']]);
        expect(equations.rhs.map(lsqPlain)).toEqual(['9', '18']);
        expect(equations.coefficients.map(lsqPlain)).toEqual(['0,9', '0,9']);
        const latex = document.querySelector('[data-lsq="normal-latex"]')?.textContent ?? '';
        expect(latex).toContain('4 & 6');
        expect(latex).toContain('6 & 14');
        expect(latex).toContain('9 ');
        expect(lsqReadout('equation')).toBe('y = 0,9x + 0,9');
        expect(lsqReadout('sum')).toBe('0,7');
        const [sumOfResiduals, sumWithX] = lsqOrthogonality(h);
        expect(Math.abs(sumOfResiduals)).toBeLessThan(1e-10);
        expect(Math.abs(sumWithX)).toBeLessThan(1e-10);

        // Step 5: the quadratic, then the cubic a learner reaches by raising the degree.
        h.scene(lsqStepOf('lsq-degree'));
        expect([h.graph.state.model.degree, h.graph.state.model.manualLine, h.graph.state.model.showSquares]).toEqual([2, false, true]);
        expect(lsqReadout('equation')).toBe('y = 1,15 + 0,15x + 0,25x²');
        expect(lsqReadout('sum')).toBe('0,45');
        expect(lsqFitCoefficients(h).map(lsqPlain)).toEqual(['1,15', '0,15', '0,25']);
        h.apply({kind: 'lsq', operation: 'set-degree', value: 3});
        expect(lsqReadout('equation')).toBe('y = 1 + 2,5x - 2x² + 0,5x³');
        expect(lsqFitCoefficients(h).map(lsqPlain)).toEqual(['1', '2,5', '-2', '0,5']);
        expect(lsqView(h).sumOfSquares!).toBeLessThan(1e-12);
        expect(lsqView(h).residuals.every(r => Math.abs(r) < 1e-10)).toBe(true);
        expect(lsqReadout('sum')).toBe('≈ 0');

        // Step 6: the default.
        h.scene(lsqStepOf('lsq-explore'));
        expect(h.graph.state.model).toMatchObject({...DEFAULT_LEAST_SQUARES_MODEL});
        expect(lsqReadout('equation')).toBe('y = 0,9x + 0,9');
        expect(lsqReadout('sum')).toBe('0,7');
    } finally {
        h.mounted.view.unmount();
    }
});

test('every number the least-squares prose quotes is the kernel value of its scene, in both languages', () => {
    const h = mountLsq();
    try {
        const sum = () => lsqText(lsqView(h).sumOfSquares!);
        const rows: Array<[string, string, string]> = [];
        const row = (stepId: string, kernel: string, quoted: string) => rows.push([stepId, kernel, quoted]);
        // Step 1 reveal (the best line of the default data), reused by steps 2 and 4.
        h.scene(lsqStepOf('lsq-normal'));
        const best = lsqView(h);
        const coefficients = lsqFitCoefficients(h).map(lsqPlain);
        row('lsq-predict', coefficients[1], '0,9'); row('lsq-predict', coefficients[0], '0,9');
        best.residuals.map(lsqPlain).forEach((value, i) => row('lsq-predict', value, ['0,1', '0,2', '-0,7', '0,4'][i]));
        row('lsq-predict', sum(), '0,7');
        row('lsq-manual', lsqText(best.optimalSumOfSquares!), '0,7');
        row('lsq-normal', coefficients[0], '0,9'); row('lsq-normal', coefficients[1], '0,9');
        row('lsq-normal', sum(), '0,7');
        const eq = normalEquations(fitOfView(best))!;
        row('lsq-normal', lsqPlain(eq.matrix[0][0]), '4'); row('lsq-normal', lsqPlain(eq.matrix[0][1]), '6');
        row('lsq-normal', lsqPlain(eq.matrix[1][0]), '6'); row('lsq-normal', lsqPlain(eq.matrix[1][1]), '14');
        row('lsq-normal', lsqPlain(eq.rhs[0]), '9'); row('lsq-normal', lsqPlain(eq.rhs[1]), '18');
        // Step 2 start.
        h.scene(lsqStepOf('lsq-manual'));
        row('lsq-manual', lsqText(lsqView(h).sumOfSquares!), '1');
        // Step 3.
        h.scene(lsqStepOf('lsq-outlier'));
        const outlier = lsqFitCoefficients(h).map(lsqPlain);
        row('lsq-outlier', outlier[1], '2,1'); row('lsq-outlier', outlier[0], '0,1'); row('lsq-outlier', sum(), '8,7');
        row('lsq-outlier', coefficients[1], '0,9');
        // Step 5.
        h.scene(lsqStepOf('lsq-degree'));
        const quadratic = lsqFitCoefficients(h).map(lsqPlain);
        row('lsq-degree', quadratic[0], '1,15'); row('lsq-degree', quadratic[1], '0,15'); row('lsq-degree', quadratic[2], '0,25');
        row('lsq-degree', sum(), '0,45');
        h.apply({kind: 'lsq', operation: 'set-degree', value: 3});
        const cubic = lsqFitCoefficients(h).map(lsqPlain);
        row('lsq-degree', cubic[0], '1'); row('lsq-degree', cubic[1], '2,5'); row('lsq-degree', cubic[2], '-2'); row('lsq-degree', cubic[3], '0,5');
        expect(rows.length).toBeGreaterThan(25);
        for (const [stepId, kernel, quoted] of rows) {
            expect(kernel, `${stepId} kernel value for ${quoted}`).toBe(quoted);
            for (const language of ['sl', 'en'] as const) {
                const magnitude = quoted.replace(/^-/, '');
                expect(lsqProseHas(stepId, magnitude, language), `${stepId} ${language} quotes ${quoted}`).toBe(true);
            }
        }
        // The step 3 residuals of the outlier line the prose does not quote are not asserted; the outlier sum of residuals still vanishes.
        h.scene(lsqStepOf('lsq-outlier'));
        expect(Math.abs(lsqOrthogonality(h)[0])).toBeLessThan(1e-10);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the lsq lesson state survives Reset, a restored checkpoint and a language switch', () => {
    const h = mountLsq();
    try {
        h.run(lsqStepOf('lsq-outlier'));
        expect(lsqReadout('sum')).toBe('8,7');
        const checkpoint = h.capabilities.captureState();
        act(() => h.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(h.graph.state.model).toMatchObject({...DEFAULT_LEAST_SQUARES_MODEL});
        expect(lsqReadout('sum')).toBe('0,7');
        act(() => h.capabilities.restoreState(checkpoint));
        expect(h.graph.state.model.points[3]).toEqual([3, 8]);
        expect(lsqReadout('sum')).toBe('8,7');
        act(() => { setLanguage('en'); });
        expect(h.graph.state.model.points[3]).toEqual([3, 8]);
        expect(lsqReadout('equation')).toBe('y = 2.1x + 0.1');
        expect(lsqReadout('sum')).toBe('8.7');
        // Consecutive steps without a restore end in the last step's state, because each scene starts from the default.
        h.run(lsqStepOf('lsq-degree'));
        h.run(lsqStepOf('lsq-predict'));
        expect([h.graph.state.model.manualLine, h.graph.state.model.degree, h.graph.state.model.slope, h.graph.state.model.intercept, h.graph.state.model.showSquares]).toEqual([true, 1, 0, 2, false]);
        expect(h.graph.state.model.points[3]).toEqual([3, 4]);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the lsq action rejects invalid inputs with a clear error and leaves the state alone', () => {
    const h = mountLsq();
    try {
        const before = JSON.stringify(h.graph.state);
        const bad: unknown[] = [
            {kind: 'lsq', operation: 'set-point', index: 4, x: 1, y: 1},
            {kind: 'lsq', operation: 'set-point', index: 0, x: 'a', y: 1},
            {kind: 'lsq', operation: 'set-point', index: 0, x: 100, y: 1},
            {kind: 'lsq', operation: 'set-degree', value: 0},
            {kind: 'lsq', operation: 'set-degree', value: 4},
            {kind: 'lsq', operation: 'set-degree', value: 1.5},
            {kind: 'lsq', operation: 'set-degree', value: '2'},
            {kind: 'lsq', operation: 'set-mode', mode: 'both'},
            {kind: 'lsq', operation: 'set-line', slope: 11, intercept: 0},
            {kind: 'lsq', operation: 'set-line', slope: 1, intercept: 'x'},
            {kind: 'lsq', operation: 'set-overlay', overlay: 'residuals', visible: true},
            {kind: 'lsq', operation: 'set-overlay', overlay: 'squares', visible: 'yes'},
            {kind: 'lsq', operation: 'remove-point'},
        ];
        for (const action of bad) expect(() => h.capabilities.apply(action as LessonAction), JSON.stringify(action)).toThrow(/./);
        expect(JSON.stringify(h.graph.state)).toBe(before);
    } finally {
        h.mounted.view.unmount();
    }
});

test('the I4 lesson has six steps with predictions, a free last step, the required caveats and the one-shot terms', () => {
    expect(lsqLesson.steps.map(step => step.id)).toEqual(lsqStepIds);
    for (const step of [lsqStepOf('lsq-predict'), lsqStepOf('lsq-outlier'), lsqStepOf('lsq-degree')]) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    const all = JSON.stringify(lsqLesson);
    for (const term of ['najmanjših kvadratov', 'ostanek', 'osamelec', 'normalni sistem', 'ročna premica']) expect(all.toLowerCase(), term).toContain(term);
    for (const language of ['sl', 'en'] as const) {
        const prose = lsqLesson.steps.map(step => lsqProse(step, language)).join(' ') + lsqLesson.formulaBlocks.map(block => block.explanation[language]).join(' ');
        // Spec acceptance 3: squared vertical residuals are a modelling choice, not the geometric distance; what outliers do.
        expect(prose, language).toMatch(language === 'sl' ? /modelska izbira, ne geometrijska razdalja/ : /modelling choice, not the geometric distance/);
        expect(prose, language).toMatch(language === 'sl' ? /osamelec/ : /outlier/);
        expect(prose, language).toMatch(language === 'sl' ? /občutljiva na osamelce/ : /sensitive to outliers/);
    }
    // The prerequisites name the Lagrange lesson (I1); the degree step links to the Runge lesson (I2) and to interpolation (I1).
    expect(lsqLesson.prerequisites.map(entry => entry.en).join(' ')).toMatch(/Lagrange/);
    expect(lsqProse(lsqStepOf('lsq-degree'), 'en')).toMatch(/Lagrange/);
    expect(lsqProse(lsqStepOf('lsq-degree'), 'en')).toMatch(/Runge/);
    // Every scene action is an lsq action or the prepared scene.
    for (const step of lsqLesson.steps) for (const action of actionsOf(step)) expect(['prepared-scene', 'lsq'], step.id).toContain(action.kind);
});
