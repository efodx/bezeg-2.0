/**
 * LS3 and LS4 (level sets, batch C), part A: every scene lands, in both languages, in the state and readouts the text states (the real contour graph, one synchronous sequence of
 * actions from a restored checkpoint, out of order and twice in one act); the descent step counter is 0 at every opening; no opening is already the state the prompt asks the
 * learner to produce (LS4 steps 1 and 4 open in level-sets mode, where the constraint is not shown); every control or readout the prompts name exists in the graph strings; and the
 * learner actions the text asks for (Naslednji korak, the function chooser, the step slider H, the start field y, the mode chooser, the line x and the circle angle) give the readouts
 * the text quotes. Expected values are computed here (the descent iteration and the closed forms of the line and the circle), not with the graph.
 */
import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import type {SurfaceScene, SurfaceView} from '../../graphs/patches/surface-view/surfaceScene';
import ContourMapGraph from '../../graphs/levelsets/ContourMapGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';
import {sceneActions} from '../runtime/lessonCatalog';
import {levelSetsDescentLesson, levelSetsLagrangeLesson} from './levelSetsOptimizationGuidedLessons';
import type {GuidedLesson} from './guidedLessons';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
type Language = 'sl' | 'en';
const LANGUAGES: readonly Language[] = ['sl', 'en'];
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});
afterEach(cleanup);

// ---- independent expectations ----------------------------------------------------------------------------------------------------------

type Fn = 'bowl' | 'saddle' | 'valley' | 'hills' | 'product';
type Mode = 'level-sets' | 'gradient' | 'descent' | 'lagrange';
type Pair = readonly [number, number];
interface OptState {
    readonly fn: Fn; readonly level: number; readonly levelCount: number; readonly probe: Pair; readonly mode: Mode;
    readonly start: Pair; readonly step: number; readonly constraint: 'line' | 'circle'; readonly lineParam: number; readonly circleParam: number;
    /** The descent step counter (graph.step), not part of the stored state. */
    readonly index: number;
}
const DEFAULT_STATE: OptState = {fn: 'bowl', level: 8, levelCount: 1, probe: [12, 16], mode: 'level-sets', start: [8, 4], step: 3, constraint: 'line', lineParam: 4, circleParam: 6, index: 0};
const state = (patch: Partial<OptState>): OptState => ({...DEFAULT_STATE, ...patch});

const VALUE: Record<Fn, (x: number, y: number) => number> = {
    bowl: (x, y) => x * x + y * y,
    saddle: (x, y) => x * x - y * y,
    valley: (x, y) => x * x + 10 * y * y,
    hills: (x, y) => Math.sin(x) * Math.sin(y),
    product: (x, y) => x * y,
};
const GRADIENT: Record<Fn, (x: number, y: number) => Pair> = {
    bowl: (x, y) => [2 * x, 2 * y],
    saddle: (x, y) => [2 * x, -2 * y],
    valley: (x, y) => [2 * x, 20 * y],
    hills: (x, y) => [Math.cos(x) * Math.sin(y), Math.sin(x) * Math.cos(y)],
    product: (x, y) => [y, x],
};
/** The iterates p_0 .. p_n of p_{k+1} = p_k - h grad f(p_k) with h = H / 100. */
const descent = (fn: Fn, start: Pair, H: number, n: number): Pair[] => {
    const path: Pair[] = [start];
    for (let k = 0; k < n; k++) {
        const [x, y] = path[k];
        const [gx, gy] = GRADIENT[fn](x, y);
        path.push([x - (H / 100) * gx, y - (H / 100) * gy]);
    }
    return path;
};
/** The first step k with f(p_k) < 0,000001, or null within 200 steps. */
const settledAt = (fn: Fn, start: Pair, H: number): number | null => descent(fn, start, H, 200).findIndex(p => VALUE[fn](...p) < 1e-6) >= 0 ? descent(fn, start, H, 200).findIndex(p => VALUE[fn](...p) < 1e-6) : null;

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutIds = () => [...document.querySelectorAll('[data-readout]')].map(node => node.getAttribute('data-readout') ?? '');
/** The numbers of a readout: true minus, the decimal comma of Slovenian. */
const nums = (text: string | null, language: Language): number[] =>
    ((language === 'sl' ? (text ?? '').replace(/,/g, '.') : text ?? '').replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const expectNums = (what: string, actual: readonly number[], expected: readonly number[], tolerance = 1.5e-6) =>
    expect({what, actual, close: actual.length === expected.length && actual.every((value, i) => Math.abs(value - expected[i]) <= Math.max(tolerance, 1e-9 * Math.abs(expected[i])))})
        .toEqual({what, actual, close: true});

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

class FakeView implements SurfaceView {
    attach() { return Promise.resolve(); }
    reconcile(_scene: SurfaceScene) {}
    onEdit() { return () => {}; }
    setAriaLabel() {}
    onLayout() { return () => {}; }
    capture(): never { throw new Error('unused'); }
    fitCamera() {}
    dispose() {}
}
class TestGraph extends ContourMapGraph {
    override createSurfaceView() { return new FakeView(); }
}

const plain = (graph: TestGraph): OptState => {
    const s = graph.state as unknown as OptState;
    return {fn: s.fn, level: s.level, levelCount: s.levelCount, probe: [s.probe[0], s.probe[1]], mode: s.mode, start: [s.start[0], s.start[1]], step: s.step,
        constraint: s.constraint, lineParam: s.lineParam, circleParam: s.circleParam, index: graph.step};
};

function mountContour() {
    const graph = new TestGraph();
    render(React.createElement(MemoryRouter, null, React.createElement(GraphHost, {create: () => graph})));
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const run = (lesson: GuidedLesson, stepId: string) => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(lesson.steps.find(step => step.id === stepId)!.scene!)) capabilities.apply(action);
    };
    const scene = (lesson: GuidedLesson, stepId: string) => act(() => { run(lesson, stepId); });
    /** The scene run twice inside one act. */
    const sceneTwice = (lesson: GuidedLesson, stepId: string) => act(() => { run(lesson, stepId); run(lesson, stepId); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, scene, sceneTwice, restore, free};
}

// ---- learner controls ------------------------------------------------------------------------------------------------------------------

const loc = (value: string, language: Language) => (language === 'sl' ? value : value.replace(',', '.'));
const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value}}); });
const typeInto = (name: string, value: string, language: Language) => act(() => { enterNumber(screen.getByRole('spinbutton', {name}) as HTMLInputElement, loc(value, language)); });
const typeField = (label: string, value: string, language: Language) => typeInto(t('number_field_label', {value0: label}), value, language);
const nextStep = () => act(() => { fireEvent.click(screen.getByRole('button', {name: t('next_step')})); });
const chooseMode = (mode: Mode) => choose(t('levelsets_graph_mode'), mode);
const chooseFunction = (fn: Fn) => choose(t('levelsets_graph_fn'), fn);
const typeH = (value: string, language: Language) => typeField(t('levelsets_graph_step'), value, language);
const typeIndex = (value: string, language: Language) => typeField(t('levelsets_graph_steps_label'), value, language);
const typeLineX = (value: string, language: Language) => typeField(t('levelsets_graph_line_x'), value, language);
const typeAngle = (value: string, language: Language) => typeField(t('levelsets_graph_circle_angle'), value, language);

/** The readouts of the descent at step k of the path. */
function expectIterate(label: string, fn: Fn, start: Pair, H: number, k: number, language: Language) {
    const p = descent(fn, start, H, k)[k];
    expectNums(`${label} steps`, nums(readout('steps'), language).slice(0, 1), [k]);
    expectNums(`${label} p${k}`, nums(readout('iterate'), language), p);
    expectNums(`${label} f(p${k})`, nums(readout('iterate-f'), language), [VALUE[fn](...p)]);
}
/** Press Naslednji korak three times, reading the iterate after each press. */
function threeSteps(label: string, fn: Fn, start: Pair, H: number, language: Language) {
    for (let k = 1; k <= 3; k++) { nextStep(); expectIterate(`${label} press ${k}`, fn, start, H, k, language); }
}
/** The line x + 2y = 5 at x: the point, f = x^2 + ((5 - x) / 2)^2, grad f = (2x, 5 - x), grad g = (1, 2), det = 5x - 5. */
function expectLine(label: string, x: number, language: Language) {
    const y = (5 - x) / 2;
    expectNums(`${label} point`, nums(readout('point'), language), [x, y], 5e-5);
    expectNums(`${label} f`, nums(readout('point-f'), language), [x * x + y * y]);
    expectNums(`${label} grad f`, nums(readout('grad-f'), language), [2 * x, 2 * y]);
    expectNums(`${label} grad g`, nums(readout('grad-g'), language), [1, 2]);
    const det = 2 * x * 2 - 2 * y * 1;
    expectNums(`${label} tangency`, nums(readout('tangency'), language), det === 0 ? [(2 * x) / 1] : [det]);
    expectNums(`${label} tangent point`, nums(readout('tangent-points'), language), [1, 2]);
}
/** The circle x^2 + y^2 = 2 at K (angle 2 pi K / 48) for f = xy: f = sin 2 theta, |sin| = |det| / (|grad f| |grad g|) with det = 2 (y^2 - x^2). */
function expectCircle(label: string, K: number, language: Language) {
    const theta = (2 * Math.PI * K) / 48;
    const [x, y] = [Math.SQRT2 * Math.cos(theta), Math.SQRT2 * Math.sin(theta)];
    expectNums(`${label} point`, nums(readout('point'), language), [x, y], 5e-5);
    expectNums(`${label} f`, nums(readout('point-f'), language), [x * y], 2e-6);
    expectNums(`${label} sin`, nums(readout('tangency'), language), [Math.abs(2 * (y * y - x * x)) / 4], 2e-6);
    expectNums(`${label} count`, nums(readout('tangent-points'), language), [4, 48]);
}

// ---- steps: the opening state and the learner actions the text asks for -----------------------------------------------------------------

interface Plan {
    readonly lesson: GuidedLesson;
    readonly id: string;
    readonly opening: OptState;
    /** The learner's actions with the readouts the text then quotes (expectations inside). */
    readonly learn: (language: Language) => void;
}
const START: Pair = [8, 4];
const AXIS: Pair = [8, 0];
const VALLEY_AT = (H: number) => state({fn: 'valley', mode: 'descent', step: H});
const LINE = {levelCount: 3, constraint: 'line', lineParam: 0} as const;
const CIRCLE = {fn: 'product', level: 0, levelCount: 3, constraint: 'circle', circleParam: 0} as const;
const P0: Pair = [2, 1];
const PLANS: readonly Plan[] = [
    {lesson: levelSetsDescentLesson, id: 'ls3-bowl', opening: state({mode: 'descent'}), learn: language => {
        expectIterate('bowl p0', 'bowl', P0, 3, 0, language);
        threeSteps('bowl', 'bowl', P0, 3, language);
    }},
    {lesson: levelSetsDescentLesson, id: 'ls3-valley', opening: state({mode: 'descent'}), learn: language => {
        chooseFunction('valley');
        expect(plain(graphOf())).toEqual(state({fn: 'valley', mode: 'descent'}));
        expectIterate('valley p0', 'valley', P0, 3, 0, language);
        expectNums('valley p0 f = 14', nums(readout('iterate-f'), language), [14]);
        threeSteps('valley H3', 'valley', P0, 3, language);
        expectNums('valley settled', nums(readout('settled'), language), [settledAt('valley', P0, 3)!]);
    }},
    {lesson: levelSetsDescentLesson, id: 'ls3-step-9', opening: VALLEY_AT(3), learn: language => {
        typeH('9', language);
        expect(plain(graphOf())).toEqual(VALLEY_AT(9));
        threeSteps('H9', 'valley', P0, 9, language);
        expect({settled: nums(readout('settled'), language), claim: readout('claim')}).toEqual({settled: [settledAt('valley', P0, 9)], claim: t('levelsets_graph_behaviour_converges')});
    }},
    {lesson: levelSetsDescentLesson, id: 'ls3-step-10', opening: VALLEY_AT(9), learn: language => {
        typeH('10', language);
        expect(plain(graphOf())).toEqual(VALLEY_AT(10));
        threeSteps('H10', 'valley', P0, 10, language);
        typeIndex('200', language);
        expectIterate('H10 p200', 'valley', P0, 10, 200, language);
        expect({settled: readout('settled'), claim: readout('claim')}).toEqual({settled: t('levelsets_graph_settled_never', {value0: '200'}), claim: t('levelsets_graph_behaviour_oscillates')});
        expect(settledAt('valley', P0, 10)).toBeNull();
    }},
    {lesson: levelSetsDescentLesson, id: 'ls3-step-11', opening: VALLEY_AT(10), learn: language => {
        typeH('11', language);
        expect(plain(graphOf())).toEqual(VALLEY_AT(11));
        threeSteps('H11', 'valley', P0, 11, language);
        typeIndex('75', language);
        expectIterate('H11 p75', 'valley', P0, 11, 75, language);
        expect({stop: readout('stop'), claim: readout('claim')}).toEqual({stop: t('levelsets_graph_stop_escaped', {value0: '75'}), claim: t('levelsets_graph_behaviour_diverges')});
    }},
    {lesson: levelSetsDescentLesson, id: 'ls3-threshold', opening: VALLEY_AT(11), learn: language => {
        typeInto('P0, y', '0', language);
        expect(plain(graphOf())).toEqual(state({fn: 'valley', mode: 'descent', step: 11, start: AXIS}));
        threeSteps('axis', 'valley', [2, 0], 11, language);
        expect({settled: nums(readout('settled'), language), claim: readout('claim')}).toEqual({settled: [settledAt('valley', [2, 0], 11)], claim: t('levelsets_graph_behaviour_converges')});
    }},
    {lesson: levelSetsDescentLesson, id: 'ls3-explore', opening: state({}), learn: language => {
        chooseFunction('hills');
        chooseMode('descent');
        const hills = plain(graphOf());
        expect({fn: hills.fn, mode: hills.mode, start: hills.start, step: hills.step}).toEqual({fn: 'hills', mode: 'descent', start: START, step: 3});
        threeSteps('hills', 'hills', P0, 3, language);
        typeIndex('200', language);
        expectIterate('hills p200', 'hills', P0, 3, 200, language);
        expect(readout('claim')).toBe(t('levelsets_graph_claim_none'));
    }},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-line', opening: state({...LINE, mode: 'level-sets'}), learn: language => {
        chooseMode('lagrange');
        expect(plain(graphOf())).toEqual(state({...LINE, mode: 'lagrange'}));
        for (const x of [0, 1, 2]) { typeLineX(String(x), language); expectLine(`line x = ${x}`, x, language); }
    }},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-touch', opening: state({...LINE, mode: 'level-sets'}), learn: language => {
        chooseMode('lagrange');
        expectLine('line x = 0', 0, language);
        typeLineX('1', language);
        expect(plain(graphOf())).toEqual(state({...LINE, lineParam: 4, mode: 'lagrange'}));
        expectLine('line x = 1', 1, language);
    }},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-gradients', opening: state({...LINE, mode: 'lagrange'}), learn: language => {
        expectLine('line x = 0', 0, language);
        typeLineX('1', language);
        expectLine('line x = 1', 1, language);
        expect(readout('tangency')).toBe(t('levelsets_graph_tangency_line_yes', {value0: '2'}));
        typeLineX('2', language);
        expect(plain(graphOf()).lineParam).toBe(8);
        expectLine('line x = 2', 2, language);
        expect(readout('tangency')).toBe(t('levelsets_graph_tangency_line_no', {value0: loc('5', language)}));
    }},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-circle', opening: state({...CIRCLE, mode: 'level-sets'}), learn: language => {
        chooseMode('lagrange');
        expect(plain(graphOf())).toEqual(state({...CIRCLE, mode: 'lagrange'}));
        expectCircle('K = 0', 0, language);
        for (const K of [6, 12, 18, 24, 30, 36, 42]) { typeAngle(String(K), language); expectCircle(`K = ${K}`, K, language); }
    }},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-explore', opening: state({}), learn: language => {
        chooseMode('lagrange');
        expect(plain(graphOf()).mode).toBe('lagrange');
        expectLine('explore line', 1, language);
        chooseFunction('product');
        expect(readout('tangent-points')).not.toBeNull();
    }},
];
const LESSONS = [levelSetsDescentLesson, levelSetsLagrangeLesson] as const;

/** The mounted graph of the current test (set by `mountContour` users through `use`). */
let current: TestGraph | null = null;
const graphOf = (): TestGraph => current!;
const use = () => { const m = mountContour(); current = m.graph; return m; };

test('every LS3 and LS4 step has a plan', () => {
    expect(new Set(PLANS.map(plan => plan.id))).toEqual(new Set(LESSONS.flatMap(lesson => lesson.steps.map(step => step.id))));
    expect(LESSONS.map(lesson => lesson.steps.length)).toEqual([7, 5]);
});

describe.each(LANGUAGES)('LS3 and LS4 scenes in %s', language => {
    // out of order: reversed, then every third step, then the in-order pass, so that no scene depends on the one before it
    const order = [...PLANS].reverse().concat(PLANS.filter((_, i) => i % 3 === 0), PLANS);

    test('every scene opens in the stated state, with the step counter at 0, out of order and twice in one act', () => {
        setLanguage(language);
        const m = use();
        expect(plain(m.graph)).toEqual(DEFAULT_STATE);
        for (const plan of order) {
            m.scene(plan.lesson, plan.id);
            expect({id: plan.id, state: plain(m.graph)}).toEqual({id: plan.id, state: plan.opening});
            expect({id: plan.id, index: m.graph.step}).toEqual({id: plan.id, index: 0});
            m.sceneTwice(plan.lesson, plan.id);
            expect({id: plan.id, again: plain(m.graph)}).toEqual({id: plan.id, again: plan.opening});
            expect({id: plan.id, steps: plan.opening.mode === 'descent' ? nums(readout('steps'), language).slice(0, 1) : null}).toEqual({id: plan.id, steps: plan.opening.mode === 'descent' ? [0] : null});
        }
    });

    test('restoring the checkpoint on exit returns the free state', () => {
        setLanguage(language);
        const m = use();
        for (const plan of PLANS) {
            m.scene(plan.lesson, plan.id);
            nextStepIfDescent(m.graph);
            m.restore();
            expect({id: plan.id, free: JSON.stringify(m.graph.state), index: m.graph.step}).toEqual({id: plan.id, free: m.free, index: 0});
        }
        expect(plain(m.graph)).toEqual(DEFAULT_STATE);
    });

    test('no opening is already the state the prompt asks for; LS4 steps 1 and 4 do not show the constraint', () => {
        setLanguage(language);
        const m = use();
        for (const plan of PLANS.filter(candidate => candidate.id !== 'ls3-explore' && candidate.id !== 'ls4-explore')) {
            m.scene(plan.lesson, plan.id);
            const before = JSON.stringify(plain(m.graph));
            plan.learn(language);
            expect({id: plan.id, changed: JSON.stringify(plain(m.graph)) !== before}).toEqual({id: plan.id, changed: true});
        }
        for (const id of ['ls4-line', 'ls4-circle']) {
            const plan = PLANS.find(candidate => candidate.id === id)!;
            m.scene(plan.lesson, id);
            expect({id, mode: plain(m.graph).mode}).toEqual({id, mode: 'level-sets'});
            expect({id, hidden: readoutIds().filter(name => ['constraint', 'point', 'point-f', 'grad-f', 'grad-g', 'tangency', 'tangent-points'].includes(name))}).toEqual({id, hidden: []});
            expect({id, legend: [...document.querySelectorAll('[data-legend]')].map(node => node.getAttribute('data-legend')).filter(name => /constraint|point|tangent/.test(name ?? ''))}).toEqual({id, legend: []});
        }
    });

    test('the learner actions the text asks for give the state and readouts it quotes (each step from its own scene)', () => {
        setLanguage(language);
        const m = use();
        for (const plan of order) {
            m.scene(plan.lesson, plan.id);
            plan.learn(language);
        }
    });
});

function nextStepIfDescent(graph: TestGraph) {
    if (graph.state.mode === 'descent') nextStep();
}

// ---- the controls and readouts the prompts name ----------------------------------------------------------------------------------------

const L = {
    mode: () => t('levelsets_graph_mode'), descent: () => t('levelsets_graph_mode_descent'), lagrange: () => t('levelsets_graph_mode_lagrange'), levelSets: () => t('levelsets_graph_mode_level_sets'),
    fn: () => t('levelsets_graph_fn'), valley: () => t('levelsets_graph_fn_valley'), step: () => t('levelsets_graph_step'), next: () => t('next_step'), playStep: () => t('levelsets_graph_steps_label'),
    point: () => t('levelsets_graph_r_iterate', {value0: '_k'}), valueF: () => t('levelsets_graph_r_iterate_f'), first: () => t('levelsets_graph_r_settled'), behaviour: () => t('levelsets_graph_r_claim'),
    end: () => t('levelsets_graph_r_stop'), lineX: () => t('levelsets_graph_line_x'), circleAngle: () => t('levelsets_graph_circle_angle'), tangent: () => t('levelsets_graph_r_tangent_points'),
    touch: () => t('levelsets_graph_r_tangency'), gradF: () => t('levelsets_graph_r_grad_f'), gradG: () => t('levelsets_graph_r_grad_g'), angles: () => t('levelsets_graph_r_tangent_count'),
    constraint: () => t('levelsets_graph_constraint'), pointC: () => t('levelsets_graph_r_point'),
};
const NAMED: Record<string, readonly (() => string)[]> = {
    'ls3-bowl': [L.next, L.point, L.valueF, L.descent],
    'ls3-valley': [L.fn, L.valley, L.next, L.point, L.valueF, L.first],
    'ls3-step-9': [L.step, L.next, L.point, L.valueF, L.behaviour, L.first],
    'ls3-step-10': [L.step, L.next, L.point, L.valueF, L.playStep, L.first, L.behaviour],
    'ls3-step-11': [L.step, L.next, L.point, L.valueF, L.playStep, L.end, L.behaviour],
    'ls3-threshold': [L.next, L.first, L.behaviour],
    'ls3-explore': [L.descent, L.levelSets, L.first],
    'ls4-line': [L.mode, L.lagrange, L.lineX, L.valueF, L.tangent, L.levelSets],
    'ls4-touch': [L.mode, L.lagrange, L.lineX, L.pointC, L.valueF, L.tangent],
    'ls4-gradients': [L.lineX, L.gradF, L.gradG, L.touch],
    'ls4-circle': [L.mode, L.lagrange, L.circleAngle, L.pointC, L.valueF, L.touch, L.angles, L.levelSets],
    'ls4-explore': [L.lagrange, L.fn, L.constraint, L.touch, L.levelSets],
};
/** Prose as read in the app: no math delimiters, no spaces, no subscripts, "x²" as "x^2", the decimal comma as a plain comma. */
const flat = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\\(|\\\)/g, '').replace(/²/g, '^2').replace(/[_\s]/g, '');
const forms = (label: string) => {
    const bare = label.replace(/\s*\([^)]*\)$/, '');
    const headless = label.replace(/\s*\(.*$/, '');
    return [label, bare, headless].map(flat);
};

describe.each(LANGUAGES)('LS3 and LS4 prompt labels in %s', language => {
    test.each(LESSONS.flatMap(lesson => lesson.steps.map(step => [step.id, step] as const)))('%s: every control and readout the prompt names exists in the graph strings', (id, step) => {
        setLanguage(language);
        const prompt = flat(`${step.explanation[language]} ${step.observationPrompt[language]} ${step.expectedObservations.map(entry => entry[language]).join(' ')} ${step.scene!.expectedState[language]}`);
        for (const label of NAMED[id]) expect({id, label: label(), named: forms(label()).some(form => prompt.includes(form))}).toEqual({id, label: label(), named: true});
    });

    test('the labels exist in the mounted graph: the controls and the readout rows of both modes', () => {
        setLanguage(language);
        const m = use();
        m.scene(levelSetsDescentLesson, 'ls3-bowl');
        const descentRows = [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
        for (const label of [L.valueF, L.first, L.behaviour, L.end]) expect({label: label(), shown: descentRows.includes(label())}).toEqual({label: label(), shown: true});
        for (const label of [L.fn, L.mode]) expect({label: label(), control: screen.queryAllByLabelText(label()).length > 0}).toEqual({label: label(), control: true});
        expect(screen.queryByRole('button', {name: t('next_step')})).not.toBeNull();
        expect(screen.queryByRole('spinbutton', {name: t('number_field_label', {value0: L.step()})})).not.toBeNull();
        expect(screen.queryByRole('spinbutton', {name: t('number_field_label', {value0: L.playStep()})})).not.toBeNull();
        expect(screen.queryByRole('spinbutton', {name: 'P0, y'})).not.toBeNull();
        m.scene(levelSetsLagrangeLesson, 'ls4-gradients');
        const lagrangeRows = [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
        for (const label of [L.pointC, L.valueF, L.gradF, L.gradG, L.touch, L.tangent]) expect({label: label(), shown: lagrangeRows.includes(label())}).toEqual({label: label(), shown: true});
        expect(screen.queryByRole('spinbutton', {name: t('number_field_label', {value0: L.lineX()})})).not.toBeNull();
        m.scene(levelSetsLagrangeLesson, 'ls4-circle');
        chooseMode('lagrange');
        expect(screen.queryByRole('spinbutton', {name: t('number_field_label', {value0: L.circleAngle()})})).not.toBeNull();
        expect([...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '')).toContain(L.angles());
    });
});

// ---- part B: every quoted number, recomputed independently of the graph ----------------------------------------------------------------

/** A quote: its value, the decimals the text prints, and `shown` for a readout the graph prints verbatim (a copy of the display, no claim of exactness). */
interface Quote { readonly value: number; readonly digits: number; readonly shown?: true }
const Q = (value: number, digits = 6): Quote => ({value, digits});
const S = (value: number): Quote => ({value, digits: 6, shown: true});
const quoteText = (quote: Quote, language: Language) => {
    const text = Number(Math.abs(quote.value).toFixed(quote.digits)).toString();
    return language === 'sl' ? text.replace('.', ',') : text;
};
/** A quote that is not exactly its printed decimal. */
const isRounded = (quote: Quote) => Math.abs(Number(quote.value.toFixed(quote.digits)) - quote.value) > 1e-12 * Math.max(1, Math.abs(quote.value));

const prose = (text: string) => text.replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const numberPattern = (value: string) => new RegExp(`(?<![0-9.,])${escapeRegExp(value)}(?![0-9]|[.,][0-9])`, 'g');
const decimalsIn = (text: string) => [...prose(text).matchAll(/(?<![0-9.])[0-9]+\.[0-9]+/g)].map(match => match[0]);
const HEDGE = /približno|approximately|about|izračunano|computed|\\approx/;
/** True when some occurrence of the number has a hedge word or \approx shortly before it or the "(computed)" mark right after it. */
const hedged = (text: string, value: string) => [...prose(text).matchAll(numberPattern(value))].some(match => {
    const at = match.index ?? 0;
    return HEDGE.test(prose(text).slice(Math.max(0, at - 45), at + value.length + 28));
});
const stepTexts = (lesson: GuidedLesson, id: string, language: Language): string[] => {
    const step = lesson.steps.find(candidate => candidate.id === id)!;
    const formulas = lesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.title, step.purpose, step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations, ...formulas.flatMap(block => [block.notation, block.explanation])].map(entry => entry[language]);
};

/** The shown iterates p_1..p_n and their f values as quotes (the integers among them have no decimals to find; the decimal check ignores them). */
const shownPath = (fn: Fn, start: Pair, H: number, n: number): Quote[] =>
    descent(fn, start, H, n).slice(1).flatMap(p => [S(p[0]), S(p[1]), S(VALUE[fn](...p))]);
const h = (H: number) => H / 100;
const bowlPath = shownPath('bowl', P0, 3, 3);
const SQRT2 = Math.SQRT2;
const hillsP3 = descent('hills', P0, 3, 3)[3];
const hillsP200 = descent('hills', P0, 3, 200)[200];
const p75 = descent('valley', P0, 11, 75)[75];

interface Spec { readonly lesson: GuidedLesson; readonly id: string; readonly quotes: readonly Quote[]; readonly extra?: readonly string[] }
/** The decimals a step may show besides its quotes: the label threshold of "First step with f < 0.000001", the step h and coordinates of the prose (written in the English form). */
const SPECS: readonly Spec[] = [
    {lesson: levelSetsDescentLesson, id: 'ls3-bowl', quotes: [...bowlPath, Q(h(3), 2), Q(1 - 2 * h(3), 2), Q((1 - 2 * h(3)) ** 2, 4)], extra: ['0.000001']},
    {lesson: levelSetsDescentLesson, id: 'ls3-valley', quotes: [...shownPath('valley', P0, 3, 3), Q(1 - 2 * h(3), 2), Q(1 - 20 * h(3), 1)], extra: ['0.000001']},
    {lesson: levelSetsDescentLesson, id: 'ls3-step-9', quotes: [...shownPath('valley', P0, 9, 3), Q(h(3), 2), Q(h(9), 2), Q(1 - 2 * h(9), 2), Q(1 - 20 * h(9), 1), Q(-(1 - 20 * h(9)), 1)], extra: ['0.000001']},
    {lesson: levelSetsDescentLesson, id: 'ls3-step-10', quotes: [...shownPath('valley', P0, 10, 3), Q(h(10), 1), Q(1 - 2 * h(10), 1)], extra: ['0.000001']},
    {lesson: levelSetsDescentLesson, id: 'ls3-step-11', quotes: [...shownPath('valley', P0, 11, 3), S(p75[1]), Q(h(11), 2), Q(1 - 20 * h(11), 1), Q(1.2 ** 75 / 1e5, 2), Q(1.2, 1)], extra: ['0.000001']},
    {lesson: levelSetsDescentLesson, id: 'ls3-threshold', quotes: [...shownPath('valley', [2, 0], 11, 3), Q(2 / 20, 1), Q(1 - 2 * h(11), 2)], extra: ['0.000001']},
    {lesson: levelSetsDescentLesson, id: 'ls3-explore', quotes: [S(hillsP3[0]), S(hillsP3[1]), S(VALUE.hills(...hillsP3)), S(hillsP200[0]), S(hillsP200[1]), S(VALUE.hills(...hillsP200))], extra: ['0.000001', '0.6', '0.8']},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-line', quotes: [Q(1.25, 2), Q(2.5, 1), Q(1.5, 1), Q(0 ** 2 + 2.5 ** 2, 2)], extra: []},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-touch', quotes: [Q(2.5, 1), Q(1.5, 1), Q(6.25, 2)], extra: []},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-gradients', quotes: [], extra: []},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-circle', quotes: [Q(SQRT2, 2), Q(0.01, 2)], extra: []},
    {lesson: levelSetsLagrangeLesson, id: 'ls4-explore', quotes: [], extra: ['0.6', '0.8']},
];
/** Rounded quotes the text does not hedge: findings, pinned so that the test stays green and the list shrinks when the text is fixed. */
const KNOWN_UNHEDGED: Readonly<Record<string, readonly string[]>> = {};

describe.each(LANGUAGES)('LS3 and LS4 quoted numbers in %s', language => {
    test.each(SPECS.map(spec => [spec.id, spec] as const))('%s: every quote is recomputed and appears, rounded ones are hedged, nothing else has decimals', (_id, spec) => {
        const text = stepTexts(spec.lesson, spec.id, language).join(' ');
        const missing = spec.quotes.filter(quote => !numberPattern(quoteText(quote, language)).test(prose(text))).map(quote => quoteText(quote, language));
        expect({id: spec.id, missing}).toEqual({id: spec.id, missing: []});
        const unhedged = spec.quotes.filter(quote => !quote.shown && isRounded(quote) && !hedged(text, quoteText(quote, language))).map(quote => quoteText(quote, 'sl'));
        expect({id: spec.id, unhedged}).toEqual({id: spec.id, unhedged: KNOWN_UNHEDGED[spec.id] ?? []});
        if (language === 'sl') expect({id: spec.id, english: decimalsIn(text)}).toEqual({id: spec.id, english: []});
        else {
            const allowed = new Set([...spec.quotes.map(quote => quoteText(quote, 'en')), ...(spec.extra ?? [])]);
            expect({id: spec.id, unaccounted: decimalsIn(text).filter(value => !allowed.has(value))}).toEqual({id: spec.id, unaccounted: []});
        }
    });

    test('the integer readouts the text quotes: first steps below 0,000001 and the end of the computation', () => {
        const text = (lesson: GuidedLesson, id: string) => prose(stepTexts(lesson, id, language).join(' '));
        const inText = (lesson: GuidedLesson, id: string, value: number) => numberPattern(String(value)).test(text(lesson, id));
        const found = {
            bowl125: inText(levelSetsDescentLesson, 'ls3-valley', settledAt('bowl', P0, 3)!),
            valley123: inText(levelSetsDescentLesson, 'ls3-valley', settledAt('valley', P0, 3)!),
            h9: inText(levelSetsDescentLesson, 'ls3-step-9', settledAt('valley', P0, 9)!),
            axis31: inText(levelSetsDescentLesson, 'ls3-threshold', settledAt('valley', [2, 0], 11)!),
            last75: inText(levelSetsDescentLesson, 'ls3-step-11', 75),
            cap200: inText(levelSetsDescentLesson, 'ls3-step-10', 200),
        };
        expect(found).toEqual({bowl125: true, valley123: true, h9: true, axis31: true, last75: true, cap200: true});
        expect([settledAt('bowl', P0, 3), settledAt('valley', P0, 3), settledAt('valley', P0, 9), settledAt('valley', [2, 0], 11)]).toEqual([125, 123, 40, 31]);
    });
});

test('descent: the iterates, the factors 1 - 2h and 1 - 20h, the threshold h < 2/L with L = 20, the H = 10 and H = 11 cases', () => {
    // the bowl: p_{k+1} = (1 - 2h) p_k, a straight line to the origin; f is multiplied by (1 - 2h)^2
    const bowl = descent('bowl', P0, 3, 3);
    bowl.forEach((p, k) => expect([p[0], p[1]]).toEqual([expect.closeTo(2 * 0.94 ** k, 12), expect.closeTo(0.94 ** k, 12)]));
    expect(VALUE.bowl(...bowl[1]) / VALUE.bowl(...bowl[0])).toBeCloseTo(0.8836, 12);
    // the valley: x_k = (1 - 2h)^k x_0, y_k = (1 - 20h)^k y_0 at every step and every H of the text
    for (const H of [3, 9, 10, 11]) {
        const path = descent('valley', P0, H, 12);
        path.forEach((p, k) => expect([p[0], p[1]]).toEqual([expect.closeTo(2 * (1 - 2 * h(H)) ** k, 9), expect.closeTo((1 - 20 * h(H)) ** k, 9)]));
    }
    expect(descent('valley', P0, 3, 3).map(p => p[1])).toEqual([1, expect.closeTo(0.4, 12), expect.closeTo(0.16, 12), expect.closeTo(0.064, 12)]);
    expect(VALUE.valley(...P0)).toBe(14);
    expect(descent('valley', P0, 9, 3).map(p => p[1])).toEqual([1, expect.closeTo(-0.8, 12), expect.closeTo(0.64, 12), expect.closeTo(-0.512, 12)]);
    expect(descent('valley', P0, 9, 3).map(p => p[0])).toEqual([2, expect.closeTo(1.64, 12), expect.closeTo(1.3448, 12), expect.closeTo(1.102736, 12)]);
    // the threshold: |1 - 20h| < 1 exactly for 0 < h < 2/L = 0,1 (H = 1..9), |1 - 2h| < 1 for all H of the graph (L of the x factor is 2)
    const L20 = 20;
    for (let H = 1; H <= 30; H++) {
        expect({H, y: Math.abs(1 - 20 * h(H)) < 1 - 1e-12}).toEqual({H, y: h(H) < 2 / L20 - 1e-12});
        expect({H, x: Math.abs(1 - 2 * h(H)) < 1}).toEqual({H, x: true});
    }
    expect(2 / L20).toBeCloseTo(0.1, 15);
    expect(Math.abs(1 - 20 * h(10))).toBeCloseTo(1, 12);
    // H = 10: y is +1 and -1 alternately, x goes to 0, and after 200 steps p = (0; 1) with f = 10 (never below 0,000001)
    const ten = descent('valley', P0, 10, 200);
    expect(ten.slice(0, 4).map(p => p[1])).toEqual([1, expect.closeTo(-1, 12), expect.closeTo(1, 12), expect.closeTo(-1, 12)]);
    expect(Math.abs(ten[200][0])).toBeLessThan(5e-7);
    expect(ten[200][1]).toBeCloseTo(1, 12);
    expect(VALUE.valley(...ten[200])).toBeCloseTo(10, 6);
    expect(settledAt('valley', P0, 10)).toBeNull();
    // H = 11: |y| grows by 1,2 every step; the graph stops when the point leaves the radius 10^6, so the last accepted step is 75
    const eleven = descent('valley', P0, 11, 76);
    expect(Math.hypot(...eleven[75])).toBeLessThanOrEqual(1e6);
    expect(Math.hypot(...eleven[76])).toBeGreaterThan(1e6);
    expect(Math.abs(eleven[75][1])).toBeCloseTo(1.2 ** 75, 3);
    expect(1.2 ** 75).toBeCloseTo(868147.369314, 3);
    expect(1.2 ** 75 / 1e5).toBeCloseTo(8.68, 2);
    // H = 11 from the axis: y_0 = 0 stays 0 and x has the factor 0,78
    const axis = descent('valley', [2, 0], 11, 3);
    expect(axis.map(p => p[1])).toEqual([0, 0, 0, 0]);
    expect(axis.map(p => p[0])).toEqual([2, expect.closeTo(1.56, 12), expect.closeTo(1.2168, 12), expect.closeTo(0.949104, 12)]);
});

test('Lagrange: the line x + 2y = 5 for f = x^2 + y^2 and the circle x^2 + y^2 = 2 for f = xy', () => {
    // the line: f(x) = x^2 + ((5 - x) / 2)^2 = 5 + 1,25 (x - 1)^2 with the single minimum 5 at (1; 2); there grad f = (2; 4) = 2 grad g
    const onLine = (x: number) => VALUE.bowl(x, (5 - x) / 2);
    for (let i = -100; i <= 100; i++) {
        const x = i / 10;
        expect(onLine(x)).toBeCloseTo(5 + 1.25 * (x - 1) ** 2, 10);
        expect(onLine(x)).toBeGreaterThanOrEqual(5 - 1e-12);
        expect({x, atMinimum: Math.abs(onLine(x) - 5) < 1e-12}).toEqual({x, atMinimum: x === 1});
    }
    expect([onLine(0), onLine(2), onLine(1)]).toEqual([6.25, 6.25, 5]);
    expect(GRADIENT.bowl(1, 2)).toEqual([2, 4]);
    expect(GRADIENT.bowl(1, 2)).toEqual([2 * 1, 2 * 2]);
    const detLine = (x: number) => GRADIENT.bowl(x, (5 - x) / 2)[0] * 2 - GRADIENT.bowl(x, (5 - x) / 2)[1] * 1;
    expect([detLine(0), detLine(1), detLine(2)]).toEqual([-5, 0, 5]);
    for (const x of [-3, 0, 1, 2, 4]) expect(detLine(x)).toBeCloseTo(5 * x - 5, 12);
    // the circle f = 6,25 through (0; 2,5) has the radius 2,5 and meets the line at x = 0 and x = 2 (1,25 (x - 1)^2 = 1,25); f = 5 meets it once; f < 5 never
    expect(Math.sqrt(6.25)).toBe(2.5);
    expect([1.25 * (0 - 1) ** 2, 1.25 * (2 - 1) ** 2]).toEqual([1.25, 1.25]);
    expect(5 + 1.25 * 0 ** 2 - 5).toBe(0);
    // the circle: the point (sqrt 2 cos t, sqrt 2 sin t) has xy = sin 2t; maxima 1 and minima -1 at the four points, det(grad f, grad g) = 2 (y^2 - x^2)
    const rows = Array.from({length: 48}, (_, K) => {
        const t = (2 * Math.PI * K) / 48;
        const [x, y] = [SQRT2 * Math.cos(t), SQRT2 * Math.sin(t)];
        const det = GRADIENT.product(x, y)[0] * 2 * y - GRADIENT.product(x, y)[1] * 2 * x;
        return {K, x, y, f: VALUE.product(x, y), det, sin: Math.abs(det) / (Math.hypot(...GRADIENT.product(x, y)) * Math.hypot(2 * x, 2 * y))};
    });
    rows.forEach(row => {
        expect(row.f).toBeCloseTo(Math.sin((2 * Math.PI * row.K) / 24), 12);
        expect(row.det).toBeCloseTo(2 * (row.y ** 2 - row.x ** 2), 12);
        expect(Math.hypot(row.x, row.y) ** 2).toBeCloseTo(2, 12);
    });
    expect(rows.filter(row => row.sin < 0.01).map(row => row.K)).toEqual([6, 18, 30, 42]);
    expect(rows.filter(row => row.f > 1 - 1e-12).map(row => row.K)).toEqual([6, 30]);
    expect(rows.filter(row => row.f < -1 + 1e-12).map(row => row.K)).toEqual([18, 42]);
    expect([rows[0].f, rows[12].f, rows[24].f, rows[36].f].map(Math.abs).every(value => value < 1e-12)).toBe(true);
    expect([0, 12, 24, 36].map(K => rows[K].sin.toFixed(6))).toEqual(['1.000000', '1.000000', '1.000000', '1.000000']);
    expect([rows[6], rows[18], rows[30], rows[42]].map(row => [Math.round(row.x), Math.round(row.y)])).toEqual([[1, 1], [-1, 1], [-1, -1], [1, -1]]);
    expect(Math.SQRT2 ** 2).toBeCloseTo(2, 12);
    // the necessary condition is not sufficient: f = x^3 on the line y = 0 has grad f = lambda grad g with lambda = 0 at the origin and no extremum there
    expect([3 * 0 ** 2, 0]).toEqual([0, 0]);
    expect(Math.min(...[-1, -0.1, 0.1, 1].map(x => x ** 3))).toBeLessThan(0);
    expect(Math.max(...[-1, -0.1, 0.1, 1].map(x => x ** 3))).toBeGreaterThan(0);
});
