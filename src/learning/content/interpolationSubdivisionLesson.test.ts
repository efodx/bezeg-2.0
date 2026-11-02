/**
 * I5 (interp-subdivision): every number the lesson quotes is checked against the real graph or the imported kernels, the scenes run
 * in one synchronous sequence, and Reset / checkpoint restore behave. Kept next to `interpolationGuidedLessons.test.ts` (I1, I3).
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {interpolationGuidedLessons} from './interpolationGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {SubdivisionCurveGraph} from '../../graphs/curves/subdivisionCurves/SubdivisionCurveGraph';
import {statusLine} from '../../graphs/curves/subdivisionCurves/SubdivisionScene';
import {DEFAULT_SUBDIVISION_PRESET, MAX_SUBDIVISION_ROUNDS, stageOf} from '../../graphs/curves/subdivisionCurves/subdivisionModel';
import {fourPointStep, subdivisionRounds} from '../../analysis/subdivision';
import {chaikinStep, uniformQuadraticSegment} from '../../bezeg/impl/curve/bspline';
import {formatNumber} from '../../analysis/format';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = interpolationGuidedLessons.find(entry => entry.demonstrationId === 'interp-subdivision')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
const num = (value: number, language: 'sl' | 'en') => {
    const text = formatNumber(value, 'sl', 4).replace('−', '-');
    return language === 'sl' ? text.replace(',', '{,}') : text.replace(',', '.');
};
/** A point as the prose writes it: (a; b), `{,}` in Slovenian and decimal points in English. */
const pair = (value: readonly number[], language: 'sl' | 'en') => `(${num(value[0], language)};\\ ${num(value[1], language)})`;

const POINTS: [number, number][] = [[0, 0], [1, 2], [3, 3], [4, 0]];

function mount() {
    const graph = createGraph('interp-subdivision');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as SubdivisionCurveGraph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
        run: (step: GuidedLessonStep) => act(() => { for (const action of actionsOf(step)) capabilities.apply(action); }),
    };
}

const near = (a: readonly number[], b: readonly number[]) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 12));

test('the quoted points are the kernel values: four-point (2; 2.8125), Chaikin (1.5; 2.25) and (2.5; 2.75), end midpoints', () => {
    const four = fourPointStep(POINTS, false);
    expect(four).toHaveLength(7);
    expect(four[3]).toEqual([2, 2.8125]);
    expect(four[1]).toEqual([0.5, 1]);
    expect(four[5]).toEqual([3.5, 1.5]);
    // Every old vertex stays, at every round.
    const stages = subdivisionRounds(POINTS, false, 'four-point', MAX_SUBDIVISION_ROUNDS);
    for (let k = 1; k < stages.length; k++) stages[k - 1].forEach((p, i) => expect(stages[k][2 * i], `round ${k} vertex ${i}`).toEqual(p));
    const chaikin = chaikinStep(POINTS, false);
    expect(chaikin[3]).toEqual([1.5, 2.25]);
    expect(chaikin[4]).toEqual([2.5, 2.75]);
    expect(chaikin[2]).toEqual([0.75, 1.5]);
    expect(chaikin[0]).toEqual([0, 0]);
    expect(chaikin[chaikin.length - 1]).toEqual([4, 0]);
    // The midpoint identity against the B-spline kernel.
    const [p0, p1, p2] = POINTS;
    const [a, b] = chaikinStep([p0, p1, p2], false).slice(2, 4);
    const midpoint = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    near(midpoint, [1.125, 1.875]);
    near(uniformQuadraticSegment(p0, p1, p2, 0.5), [1.125, 1.875]);
    near(uniformQuadraticSegment(p0, p1, p2, 0.5), midpoint);
    near(a, [0.75, 1.5]);
    near(b, [1.5, 2.25]);
});

test('every semicolon pair of the I5 text is one of the kernel values, and each step quotes its own', () => {
    const quoted: Record<string, number[][]> = {
        'subdivision-chaikin-rounds': [[1.5, 2.25], [2.5, 2.75]],
        'subdivision-limit': [[0.75, 1.5], [1.5, 2.25], [1.125, 1.875]],
        'subdivision-four-point': [[2, 2.8125], [0.5, 1], [3.5, 1.5]],
    };
    const known = [[1.5, 2.25], [2.5, 2.75], [0.75, 1.5], [1.125, 1.875], [2, 2.8125], [0.5, 1], [3.5, 1.5]];
    for (const language of ['sl', 'en'] as const) {
        for (const [id, values] of Object.entries(quoted)) {
            for (const value of values) expect(prose(stepOf(id), language), `${id} ${language} ${value}`).toContain(pair(value, language));
        }
        const allowed = new Set(known.map(v => pair(v, language)));
        const text = [
            ...lesson.steps.flatMap(step => [step.explanation, step.scene!.expectedState, ...step.expectedObservations]),
            ...lesson.workedExamples.map(example => example.check), ...lesson.formulaBlocks.map(block => block.explanation),
        ].map(entry => entry[language]).join(' ');
        const found = text.match(/\(-?[0-9{},.]+;\\ -?[0-9{},.]+\)/g) ?? [];
        expect(found.length).toBeGreaterThan(10);
        for (const found1 of found) expect(allowed.has(found1), `${language} ${found1}`).toBe(true);
    }
});

test('vertex counts are exact: 2^k n for a closed polygon (both rules), 2^k n open Chaikin, 2^k (n-1)+1 open four-point; the cap is 6', () => {
    expect(MAX_SUBDIVISION_ROUNDS).toBe(6);
    const m = mount();
    try {
        const square: [number, number][] = [[0, 0], [4, 0], [4, 4], [0, 4]];
        for (const [rule, closed, count] of [
            ['chaikin', true, (k: number) => 2 ** k * 4], ['four-point', true, (k: number) => 2 ** k * 4],
            ['chaikin', false, (k: number) => 2 ** k * 4], ['four-point', false, (k: number) => 2 ** k * 3 + 1],
        ] as const) {
            const stages = subdivisionRounds(square, closed, rule, MAX_SUBDIVISION_ROUNDS);
            stages.forEach((stage, k) => expect(stage.length, `${rule} closed=${closed} k=${k}`).toBe(count(k)));
        }
        // Through the graph: the lesson's closed scene, then Next step up to the cap and one more (refused).
        m.scene(stepOf('subdivision-explore'));
        for (let k = 3; k <= MAX_SUBDIVISION_ROUNDS; k++) {
            expect(m.graph.state.round).toBe(k);
            expect(stageOf(m.graph.state)).toHaveLength(2 ** k * 4);
            act(() => { m.graph.nextStep(); });
        }
        expect(m.graph.state.round).toBe(MAX_SUBDIVISION_ROUNDS);
        expect(m.graph.isComplete()).toBe(true);
        let advanced = true;
        act(() => { advanced = m.graph.nextStep(); });
        expect(advanced).toBe(false);
        expect(m.graph.state.round).toBe(MAX_SUBDIVISION_ROUNDS);
        for (const language of ['sl', 'en'] as const) expect(prose(stepOf('subdivision-chaikin-rounds'), language)).toContain('\\(6\\)');
        // The vertex counts the prose quotes.
        const counts: ReadonlyArray<readonly [string, string[]]> = [
            ['subdivision-chaikin-rounds', ['\\(4\\)', '\\(8\\)', '\\(16\\)', '\\(32\\)']],
            ['subdivision-four-point', ['\\(7\\)']], ['subdivision-compare', ['\\(13\\)']], ['subdivision-explore', ['\\(32\\)']],
        ];
        for (const [id, values] of counts) for (const language of ['sl', 'en'] as const) for (const value of values) expect(prose(stepOf(id), language), `${id} ${language}`).toContain(value);
        expect([4, 8, 16, 32].map((n, k) => stageOf({points: POINTS, closed: false, rule: 'chaikin', round: k}).length)).toEqual([4, 8, 16, 32]);
        expect([0, 1, 2].map(k => stageOf({points: POINTS, closed: false, rule: 'four-point', round: k}).length)).toEqual([4, 7, 13]);
    } finally {
        m.mounted.view.unmount();
    }
});

test('each scene sets the rule, closed flag, limit overlay and round its text describes, in one synchronous sequence, stopped', () => {
    const m = mount();
    try {
        const expected: ReadonlyArray<readonly [string, 'chaikin' | 'four-point', boolean, boolean, number, number]> = [
            // [step, rule, closed, limit overlay, round, vertices]
            ['subdivision-predict', 'chaikin', false, false, 0, 4],
            ['subdivision-chaikin-rounds', 'chaikin', false, false, 1, 8],
            ['subdivision-limit', 'chaikin', false, true, 2, 16],
            ['subdivision-four-point', 'four-point', false, false, 0, 4],
            ['subdivision-compare', 'four-point', false, false, 2, 13],
            ['subdivision-explore', 'chaikin', true, false, 3, 32],
        ];
        const probes = new Set<string>();
        for (const [stepId, rule, closed, limit, round, vertices] of expected) {
            // A step entered while the previous one was playing must not keep playing.
            act(() => { m.graph.play(); });
            m.scene(stepOf(stepId));
            const state = m.graph.state;
            expect([state.rule, state.closed, state.showLimit, state.round], stepId).toEqual([rule, closed, limit, round]);
            expect(state.points, stepId).toEqual(DEFAULT_SUBDIVISION_PRESET.points);
            expect(stageOf(state), stepId).toHaveLength(vertices);
            expect(m.graph.isPlaying(), stepId).toBe(false);
            // The board readout is the smoke probe; it differs on every step.
            const probe = statusLine(rule, round, vertices);
            expect(probes.has(probe), `${stepId} probe ${probe}`).toBe(false);
            probes.add(probe);
            expect(stepOf(stepId).scene!.expectedState.sl).toContain(`\\(${vertices}\\)`);
            expect(stepOf(stepId).scene!.expectedState.en).toContain(`\\(${vertices}\\)`);
        }
        // Scene actions that change the polygon or the rule pause playback.
        for (const action of [
            {kind: 'subdivision', operation: 'set-rule', rule: 'four-point'}, {kind: 'subdivision', operation: 'set-closed', closed: true},
        ] as LessonAction[]) {
            act(() => { m.graph.resetRounds(); m.graph.play(); });
            expect(m.graph.isPlaying()).toBe(true);
            act(() => m.capabilities.apply(action));
            expect(m.graph.isPlaying(), JSON.stringify(action)).toBe(false);
        }
        // Playing from the animation actions and stopping again.
        act(() => m.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(m.graph.isPlaying()).toBe(false);
        act(() => m.capabilities.apply({kind: 'animation', animationId: 'interp-subdivision-rounds', command: 'play'}));
        expect(m.graph.isPlaying()).toBe(true);
        act(() => m.capabilities.apply({kind: 'animation', animationId: 'interp-subdivision-rounds', command: 'pause'}));
        expect(m.graph.isPlaying()).toBe(false);
        // Step 4 reveal: the next step keeps the four old vertices and inserts (2; 2.8125).
        m.scene(stepOf('subdivision-four-point'));
        act(() => m.capabilities.apply({kind: 'animation', animationId: 'interp-subdivision-rounds', command: 'next-step'}));
        const stage = stageOf(m.graph.state);
        expect(stage).toHaveLength(7);
        expect([stage[0], stage[2], stage[4], stage[6]]).toEqual(POINTS);
        expect(stage[3]).toEqual([2, 2.8125]);
        // Reset after a modified step returns to the default polygon and round 0, without a restore.
        m.run(stepOf('subdivision-explore'));
        act(() => { m.graph.movePoint(1, 2, 5); m.graph.addPoint(); });
        expect(m.graph.state.points).toHaveLength(5);
        act(() => m.capabilities.apply({kind: 'animation', animationId: 'interp-subdivision-rounds', command: 'reset'}));
        expect([m.graph.state.points, m.graph.state.round, m.graph.state.closed]).toEqual([DEFAULT_SUBDIVISION_PRESET.points, 0, false]);
        act(() => { m.graph.movePoint(1, 2, 5); });
        act(() => m.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect([m.graph.state.points, m.graph.state.round, m.graph.state.rule]).toEqual([DEFAULT_SUBDIVISION_PRESET.points, 0, 'chaikin']);
        // A lesson checkpoint taken in a modified state keeps it.
        m.run(stepOf('subdivision-explore'));
        act(() => { m.graph.movePoint(2, 3, 4.5); });
        const checkpoint = m.capabilities.captureState();
        act(() => m.capabilities.apply({kind: 'prepared-scene', sceneId: 'reset', source: 'demonstration-default'}));
        expect(m.graph.state.closed).toBe(false);
        act(() => m.capabilities.restoreState(checkpoint));
        expect([m.graph.state.closed, m.graph.state.round, m.graph.state.points[2]]).toEqual([true, 3, [3, 4.5]]);
        expect(m.graph.isPlaying()).toBe(false);
    } finally {
        m.mounted.view.unmount();
    }
});

test('Chaikin never leaves the hull while the four-point rule can: P0, P1, P2 on a line and P3 above it', () => {
    const m = mount();
    try {
        m.scene(stepOf('subdivision-compare'));
        act(() => { m.graph.movePoint(0, 0, 0); m.graph.movePoint(1, 1, 0); m.graph.movePoint(2, 2, 0); m.graph.movePoint(3, 3, 1); });
        const input = {points: m.graph.state.points, closed: false};
        const four = stageOf({...input, rule: 'four-point', round: 1});
        expect(four[3][1]).toBeLessThan(0);
        const chaikin = stageOf({...input, rule: 'chaikin', round: MAX_SUBDIVISION_ROUNDS});
        for (const point of chaikin) expect(point[1]).toBeGreaterThanOrEqual(0);
    } finally {
        m.mounted.view.unmount();
    }
});

test('the subdivision action rejects invalid inputs with a clear error', () => {
    const m = mount();
    try {
        const bad: unknown[] = [
            {kind: 'subdivision', operation: 'set-rule', rule: 'loop'},
            {kind: 'subdivision', operation: 'set-closed', closed: 'yes'},
            {kind: 'subdivision', operation: 'set-overlay', overlay: 'hull', visible: true},
            {kind: 'subdivision', operation: 'set-overlay', overlay: 'limit', visible: 1},
            {kind: 'subdivision', operation: 'remove-point'},
        ];
        for (const action of bad) expect(() => m.capabilities.apply(action as LessonAction), JSON.stringify(action)).toThrow(/subdivision|rule|closed|overlay/i);
    } finally {
        m.mounted.view.unmount();
    }
});

test('the I5 lesson has six steps with predictions, a free closed last step, the required caveats and the one-shot terms', () => {
    expect(lesson.steps).toHaveLength(6);
    expect(lesson.steps[5].id).toBe('subdivision-explore');
    for (const step of lesson.steps.slice(0, 5)) {
        expect(step.explanation.sl, step.id).toMatch(/[Nn]apovej/);
        expect(step.explanation.en, step.id).toMatch(/[Pp]redict/);
    }
    const all = JSON.stringify(lesson);
    for (const term of ['Subdivizijske krivulje', 'Chaikinovo pravilo', 'štiritočkovno pravilo', 'subdivizij']) expect(all, term).toContain(term);
    expect(all).not.toMatch(/to verify|C\^2/);
    for (const language of ['sl', 'en'] as const) {
        const text = lesson.steps.map(step => prose(step, language)).join(' ') + lesson.formulaBlocks.map(block => block.explanation[language]).join(' ');
        expect(text).toContain('C^1');
        expect(text).toContain('Dyn, Gregory');
        // Sources cite the C^1 range for w differently; the lesson states only the w = 1/16 case.
        expect(text).not.toContain('0<w<');
        expect(text).toContain('w=\\tfrac1{16}');
        expect(text).toMatch(language === 'sl' ? /razpolovišč/ : /midpoint/);
        expect(text).toMatch(language === 'sl' ? /prenihaj/ : /overshoot/);
    }
    expect(lesson.sources.map(source => source.citation).join(' ')).toContain('Computer Aided Geometric Design 4 (1987) 257-268');
});
