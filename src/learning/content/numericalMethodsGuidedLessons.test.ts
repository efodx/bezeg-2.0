/**
 * N1 and N2 (root-finding): every scene lands in the state the text states (real graph, one synchronous sequence of actions), and every
 * number the lesson quotes is a value of the kernel or of the scene it belongs to.
 */
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {numericalMethodsGuidedLessons} from './numericalMethodsGuidedLessons';
import type {LessonAction} from '../model';
import type {GuidedLessonStep} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {RootFindingGraph} from '../../graphs/functions/RootFindingGraph';
import {newtonHistory, ROOT_FINDING_EXAMPLES, rootFindingExample} from '../../analysis/rootFinding';
import {rootFindingHistoryOf} from '../../analysis/rootFindingModel';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

const lesson = numericalMethodsGuidedLessons.find(entry => entry.demonstrationId === 'root-finding')!;
const stepOf = (stepId: string): GuidedLessonStep => lesson.steps.find(step => step.id === stepId)!;
const actionsOf = (step: GuidedLessonStep): LessonAction[] => sceneActions(step.scene!);
const prose = (step: GuidedLessonStep, language: 'sl' | 'en') =>
    [step.explanation[language], step.scene!.expectedState[language], ...step.expectedObservations.map(o => o[language]),
        ...lesson.workedExamples.filter(example => example.id === step.workedExampleId).map(example => example.check[language])].join(' ');
/** A decimal as the prose writes it: `{,}` in Slovenian and a point in English; negative values keep the ASCII minus. */
const num = (value: number, decimals: number, language: 'sl' | 'en') => {
    const text = value.toFixed(decimals);
    return language === 'sl' ? text.replace('.', '{,}') : text;
};
/** An error as the prose writes it: `8.6\cdot10^{-2}`. */
const sci = (value: number, language: 'sl' | 'en') => {
    const [mantissa, exponent] = value.toExponential(1).split('e');
    return `${num(Number(mantissa), 1, language)}\\cdot10^{${Number(exponent)}}`;
};

function mount() {
    const graph = createGraph('root-finding');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    return {
        graph: graph as unknown as RootFindingGraph, mounted, capabilities,
        /** The scene of a step the way a lesson session applies it: restore the checkpoint, then every action, in one act. */
        scene: (step: GuidedLessonStep) => act(() => {
            capabilities.restoreState(checkpoint);
            for (const action of actionsOf(step)) capabilities.apply(action);
        }),
    };
}

/** Per scene: the example, the start, the revealed steps, the termination and the iterates the text quotes (value, decimals). */
const SCENES: Record<string, {example: string; x0: number; step: number; termination: string; quoted: [number, number][]}> = {
    'newton-predict': {example: 'square-minus-two', x0: 1, step: 0, termination: 'running', quoted: []},
    'newton-tangent': {example: 'square-minus-two', x0: 1, step: 1, termination: 'running', quoted: [[1.5, 1]]},
    'newton-iterates': {example: 'square-minus-two', x0: 1, step: 3, termination: 'running', quoted: [[1.5, 1], [1.4166667, 5], [1.4142157, 7]]},
    'newton-vs-bisection': {example: 'square-minus-two', x0: 1, step: 4, termination: 'running', quoted: [[1.4142136, 7]]},
    'newton-start': {example: 'cubic-three-roots', x0: 0.5, step: 1, termination: 'root-found', quoted: [[-1, 0]]},
    'newton-explore': {example: 'square-minus-two', x0: 1, step: 0, termination: 'running', quoted: []},
    'newton-fail-predict': {example: 'cubic-two-cycle', x0: 0, step: 0, termination: 'running', quoted: []},
    'newton-fail-cycle': {example: 'cubic-two-cycle', x0: 0, step: 2, termination: 'repeated-iterate', quoted: [[1, 0], [0, 0]]},
    'newton-fail-why': {example: 'cubic-two-cycle', x0: 0, step: 1, termination: 'running', quoted: [[1, 0]]},
    'newton-fail-converge': {example: 'cubic-two-cycle', x0: -2, step: 4, termination: 'running', quoted: [[-1.8, 1], [-1.76995, 5], [-1.7692927, 7], [-1.7692924, 7]]},
    'newton-fail-flat': {example: 'cubic-two-cycle', x0: 0.8, step: 1, termination: 'running', quoted: [[12.2, 1]]},
    'newton-fail-bisection': {example: 'cubic-two-cycle', x0: -2, step: 0, termination: 'running', quoted: []},
    'newton-fail-explore': {example: 'cubic-two-cycle', x0: 0, step: 0, termination: 'running', quoted: []},
};

test('the lesson is N1 then N2 on root-finding: thirteen ordered steps, each with a scene of its own', () => {
    expect(lesson.steps.map(step => step.order)).toEqual(Array.from({length: 13}, (_, i) => i + 1));
    expect(lesson.steps.map(step => step.id)).toEqual(Object.keys(SCENES));
    expect(new Set(lesson.steps.map(step => step.scene!.id)).size).toBe(13);
});

test('every scene lands in the stated state, run in one synchronous sequence from a restored checkpoint', () => {
    const m = mount();
    try {
        for (const [id, expected] of Object.entries(SCENES)) {
            // Apply the scenes out of order and twice: a scene never depends on the one before it.
            m.scene(stepOf(id));
            m.scene(stepOf(id));
            const {state} = m.graph;
            expect({id, method: state.method, example: state.example, x0: state.x0, step: state.step})
                .toEqual({id, method: 'newton', example: expected.example, x0: expected.x0, step: expected.step});
            const history = rootFindingHistoryOf(state);
            expect({id, termination: history.termination}).toEqual({id, termination: expected.termination});
            expect(history.stepsTaken).toBe(expected.step);
            expected.quoted.forEach(([value], index) => {
                if (id === 'newton-iterates' || id === 'newton-fail-converge') expect(history.iterates[index + 1], `${id} iterate ${index + 1}`).toBeCloseTo(value, id === 'newton-iterates' ? 6 : 5);
            });
        }
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);

test('N1: the iterates for x^2-2 from 1 and their errors are the values the text quotes', () => {
    const iterates = newtonHistory('square-minus-two', 1, 4).iterates;
    const reference = rootFindingExample('square-minus-two').referenceRoot;
    expect(reference).toBeCloseTo(Math.SQRT2, 15);
    [1.5, 1.4166667, 1.4142157, 1.4142136].forEach((value, i) => expect(iterates[i + 1]).toBeCloseTo(value, 7));
    const errors = iterates.slice(1).map(x => Math.abs(x - Math.SQRT2));
    expect(errors.map(e => sci(e, 'en'))).toEqual(['8.6\\cdot10^{-2}', '2.5\\cdot10^{-3}', '2.1\\cdot10^{-6}', '1.6\\cdot10^{-12}']);
    // Bisection from [1,2]: the width 2^-n first drops below 1e-10 at n = 34.
    expect(2 ** -33).toBeGreaterThan(1e-10);
    expect(2 ** -34).toBeLessThan(1e-10);
    expect(sci(2 ** -34, 'en')).toBe('5.8\\cdot10^{-11}');
    // x^3 - x from 0.5 lands exactly on the root -1 in one step; from 2 it reaches 1.
    expect(newtonHistory('cubic-three-roots', 0.5, 1).iterates).toEqual([0.5, -1]);
    expect(newtonHistory('cubic-three-roots', 0.5, 2).termination).toBe('root-found');
    expect(newtonHistory('cubic-three-roots', 2, 40).iterates.at(-1)).toBeCloseTo(1, 12);
    // x^2 - 2 from 0 has a horizontal tangent.
    expect(newtonHistory('square-minus-two', 0, 3).termination).toBe('flat-tangent');
});

test('N2: the cycle 0, 1, 0 is exact, the tangent slopes are -2 and 1, and the start -2 reaches the root', () => {
    const f = (x: number) => x * x * x - 2 * x + 2;
    const fp = (x: number) => 3 * x * x - 2;
    expect([f(0), fp(0), f(1), fp(1)]).toEqual([2, -2, 1, 1]);
    expect(0 - f(0) / fp(0)).toBe(1);
    expect(1 - f(1) / fp(1)).toBe(0);
    const cycle = newtonHistory('cubic-two-cycle', 0, 6);
    expect(cycle.iterates).toEqual([0, 1, 0]);
    expect(cycle.termination).toBe('repeated-iterate');
    expect(newtonHistory('cubic-two-cycle', 1, 6).iterates).toEqual([1, 0, 1]);
    const converged = newtonHistory('cubic-two-cycle', -2, 8);
    const reference = ROOT_FINDING_EXAMPLES['cubic-two-cycle'].referenceRoot;
    expect(Math.abs(newtonHistory('cubic-two-cycle', -2, 4).iterates[4] - reference)).toBeLessThan(1e-10);
    expect(converged.iterates.at(-1)).toBeCloseTo(reference, 12);
    // The flat-tangent step: f'(0.8) = -0.08, x1 = 12.2; the critical points are +-sqrt(2/3).
    expect(f(0.8)).toBeCloseTo(0.912, 12);
    expect(fp(0.8)).toBeCloseTo(-0.08, 12);
    expect(newtonHistory('cubic-two-cycle', 0.8, 1).iterates[1]).toBeCloseTo(12.2, 10);
    expect(Math.sqrt(2 / 3)).toBeCloseTo(0.8165, 4);
    expect(fp(Math.sqrt(2 / 3))).toBeCloseTo(0, 12);
    // The bisection bracket: f(-2) = -2, f(-1) = 3, f(-1.5) = 1.625, so the root lies in [-2, -1.5].
    expect([f(-2), f(-1), f(-1.5)]).toEqual([-2, 3, 1.625]);
    expect(reference).toBeGreaterThan(-2);
    expect(reference).toBeLessThan(-1.5);
});

test('the numbers the prose quotes are the scene values, in Slovenian and in English', () => {
    for (const language of ['sl', 'en'] as const) {
        for (const [id, expected] of Object.entries(SCENES)) {
            const text = prose(stepOf(id), language);
            for (const [value, decimals] of expected.quoted) expect(text, `${id} ${language} ${value}`).toContain(num(value, decimals, language));
        }
        const errors = newtonHistory('square-minus-two', 1, 4).iterates.slice(1).map(x => sci(Math.abs(x - Math.SQRT2), language));
        expect(prose(stepOf('newton-tangent'), language)).toContain(errors[0]);
        for (const quoted of errors.slice(0, 3)) expect(prose(stepOf('newton-iterates'), language)).toContain(quoted);
        expect(prose(stepOf('newton-vs-bisection'), language)).toContain(errors[3]);
        expect(prose(stepOf('newton-vs-bisection'), language)).toContain(sci(2 ** -34, language));
        expect(prose(stepOf('newton-vs-bisection'), language)).toContain('n=34');
        expect(prose(stepOf('newton-iterates'), language)).toContain(num(1.4166667, 5, language));
        expect(prose(stepOf('newton-fail-bisection'), language)).toContain(num(1.625, 3, language));
        expect(prose(stepOf('newton-fail-flat'), language)).toContain(num(0.912, 3, language));
        expect(prose(stepOf('newton-fail-flat'), language)).toContain(num(-0.08, 2, language).replace('-', '-'));
        expect(prose(stepOf('newton-fail-cycle'), language)).toContain('0,1,0,1');
    }
});

test('the prose does not claim the doubling for the whole run, and names the failures without claiming they are the only ones', () => {
    const lower = (step: string, language: 'sl' | 'en') => prose(stepOf(step), language).toLowerCase();
    expect(lower('newton-iterates', 'en')).toContain('near a simple root and not for the whole run');
    expect(lower('newton-iterates', 'en')).toContain('illustrates');
    expect(lower('newton-iterates', 'sl')).toContain('ne za ves potek');
    expect(lesson.formulaBlocks.find(block => block.id === 'newton-cycle')!.explanation.en).toContain('not all the ways');
    expect(lower('newton-fail-converge', 'en')).toContain('not a property of cubic functions');
});

test('Reset returns the scene state: restoring the checkpoint undoes a revealed cycle', () => {
    const m = mount();
    try {
        m.scene(stepOf('newton-fail-cycle'));
        expect(m.graph.state.step).toBe(2);
        act(() => { m.capabilities.restoreState(m.capabilities.captureState()); });
        m.scene(stepOf('newton-fail-predict'));
        expect(m.graph.state.step).toBe(0);
        expect(m.graph.state.x0).toBe(0);
    } finally {
        m.mounted.view.unmount();
    }
}, REAL_GRAPH_TEST_TIMEOUT);
