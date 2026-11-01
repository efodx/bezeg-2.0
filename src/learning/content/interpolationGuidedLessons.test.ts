import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {interpolationGuidedLessons} from './interpolationGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {InterpolationGraph} from '../../graphs/curves/interpolation/InterpolationGraph';
import {DEFAULT_INTERPOLATION_PRESET, insideHull, readoutAt, readoutLines} from '../../graphs/curves/interpolation/interpolationModel';
import {bezierCurvePoint, lagrangeCurvePoint} from '../../analysis/interpolation';
import {formatNumber} from '../../analysis/format';
import {setLanguage} from '../../localization';

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
