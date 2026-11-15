/**
 * LS1 and LS2 (level sets, batch B), part A: every scene lands, in both languages, in the state and readouts the text states (the real contour graph, one synchronous sequence of
 * actions from a restored checkpoint, out of order and twice in one act); no opening is already the state the prompt asks the learner to produce; every control or readout the
 * prompts name exists in the graph strings; and the learner actions the text asks for (the mode and function choosers, the level field and count buttons, the probe fields, the
 * numeric checkbox) give the readouts the text quotes. Expected values are computed here from the closed forms of the five functions, not with the graph.
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
import {levelSetsGradientLesson, levelSetsSurfaceLesson} from './levelSetsContourGuidedLessons';
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
interface ContourState { readonly fn: Fn; readonly level: number; readonly levelCount: number; readonly probe: readonly [number, number]; readonly mode: 'level-sets' | 'gradient'; readonly numeric: boolean }
const DEFAULT_STATE: ContourState = {fn: 'bowl', level: 8, levelCount: 1, probe: [12, 16], mode: 'level-sets', numeric: false};
const state = (patch: Partial<ContourState>): ContourState => ({...DEFAULT_STATE, ...patch});

const F: Record<Fn, (x: number, y: number) => number> = {
    bowl: (x, y) => x * x + y * y,
    saddle: (x, y) => x * x - y * y,
    valley: (x, y) => x * x + 10 * y * y,
    hills: (x, y) => Math.sin(x) * Math.sin(y),
    product: (x, y) => x * y,
};
const GRAD: Record<Fn, (x: number, y: number) => readonly [number, number]> = {
    bowl: (x, y) => [2 * x, 2 * y],
    saddle: (x, y) => [2 * x, -2 * y],
    valley: (x, y) => [2 * x, 20 * y],
    hills: (x, y) => [Math.cos(x) * Math.sin(y), Math.sin(x) * Math.cos(y)],
    product: (x, y) => [y, x],
};
/** The central difference at h = 0,01 of every partial derivative. */
const centralGradient = (fn: Fn, x: number, y: number, h = 0.01): readonly [number, number] =>
    [(F[fn](x + h, y) - F[fn](x - h, y)) / (2 * h), (F[fn](x, y + h) - F[fn](x, y - h)) / (2 * h)];
/** The values of the level sets: c = L / 8, spread upward in steps of 1 (0,125 on the hills). */
const levelValues = (current: ContourState): number[] => {
    const step = current.fn === 'hills' ? 0.125 : 1;
    return Array.from({length: current.levelCount}, (_, i) => current.level / 8 + i * step);
};

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const readoutIds = () => [...document.querySelectorAll('[data-readout]')].map(node => node.getAttribute('data-readout'));
const status = () => document.querySelector('[data-contour-status]')?.textContent ?? '';
/** The numbers of a readout: true minus, the decimal comma of Slovenian. */
const nums = (text: string | null, language: Language): number[] =>
    ((language === 'sl' ? (text ?? '').replace(/,/g, '.') : text ?? '').replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const near = (actual: readonly number[], expected: readonly number[], tolerance = 1.5e-6) =>
    ({length: actual.length, close: actual.length === expected.length && actual.every((value, i) => Math.abs(value - expected[i]) <= tolerance)});
const expectNums = (what: string, actual: readonly number[], expected: readonly number[], tolerance?: number) =>
    expect({what, actual, ...near(actual, expected, tolerance)}).toEqual({what, actual, length: expected.length, close: true});

/** Compare the readouts and the status with the closed forms for a state. */
function expectReadouts(label: string, current: ContourState, language: Language) {
    const p = [current.probe[0] / 20, current.probe[1] / 20] as const;
    const values = levelValues(current);
    expectNums(`${label} level`, nums(readout('level'), language), current.levelCount === 1 ? [values[0]] : [values[0], values[values.length - 1], values[1] - values[0]]);
    expectNums(`${label} probe-f`, nums(readout('probe-f'), language), [F[current.fn](...p)]);
    if (current.mode !== 'gradient') {
        expect({label, ids: readoutIds().filter(id => ['gradient', 'norm', 'tangent', 'dot', 'numeric'].includes(id ?? ''))}).toEqual({label, ids: []});
        return;
    }
    const [gx, gy] = GRAD[current.fn](...p);
    const norm = Math.hypot(gx, gy);
    if (norm < 1e-12) {
        expect({label, gradient: readout('gradient'), tangent: readout('tangent'), dot: readout('dot')})
            .toEqual({label, gradient: t('levelsets_graph_gradient_zero'), tangent: t('levelsets_graph_tangent_none'), dot: t('levelsets_graph_tangent_none')});
        expectNums(`${label} norm`, nums(readout('norm'), language), [0]);
    } else {
        expectNums(`${label} gradient`, nums(readout('gradient'), language), [gx, gy]);
        expectNums(`${label} norm`, nums(readout('norm'), language), [norm]);
        const tangent = [-gy / norm, gx / norm];
        expectNums(`${label} tangent`, nums(readout('tangent'), language), tangent);
        expect(Math.abs(gx * tangent[0] + gy * tangent[1])).toBeLessThan(1e-12);
        expectNums(`${label} dot`, nums(readout('dot'), language), [0]);
        const inStatus = nums(status(), language);
        for (const value of [gx, gy]) expect({label, value, inStatus: inStatus.some(found => Math.abs(found - value) < 5e-5)}).toEqual({label, value, inStatus: true});
    }
    if (current.numeric) {
        const estimate = centralGradient(current.fn, ...p);
        expectNums(`${label} numeric`, nums(readout('numeric'), language), estimate);
        expectNums(`${label} numeric-error`, nums(readout('numeric-error'), language), [Math.max(Math.abs(estimate[0] - gx), Math.abs(estimate[1] - gy))], 2e-6);
    } else expect({label, numeric: readout('numeric')}).toEqual({label, numeric: null});
}

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

const plain = (graph: TestGraph): ContourState => {
    const {fn, level, levelCount, probe, mode, numeric} = graph.state as unknown as ContourState;
    return {fn, level, levelCount, probe: [probe[0], probe[1]], mode, numeric};
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
    return {graph, capabilities, scene, sceneTwice, restore, free};
}

// ---- learner controls ------------------------------------------------------------------------------------------------------------------

const loc = (value: string, language: Language) => (language === 'sl' ? value : value.replace(',', '.'));
const choose = (label: string, value: string) => act(() => { fireEvent.change(screen.getByLabelText(label), {target: {value}}); });
const typeInto = (name: string, value: string, language: Language) => act(() => { enterNumber(screen.getByRole('spinbutton', {name}) as HTMLInputElement, loc(value, language)); });
const press = (label: string) => act(() => { fireEvent.click(screen.getByRole('button', {name: label})); });
const toggleNumeric = () => act(() => { fireEvent.click(screen.getByRole('checkbox', {name: t('levelsets_graph_numeric')})); });
const chooseMode = (mode: 'level-sets' | 'gradient') => choose(t('levelsets_graph_mode'), mode);
const chooseFunction = (fn: Fn) => choose(t('levelsets_graph_fn'), fn);
const typeLevel = (value: string, language: Language) => typeInto(t('number_field_label', {value0: t('levelsets_graph_level')}), value, language);
const typeProbe = (x: string, y: string, language: Language) => { typeInto('P, x', x, language); typeInto('P, y', y, language); };
const morePlus = () => press(t('levelsets_graph_count_plus'));

// ---- steps: the opening state and the learner actions the text asks for -----------------------------------------------------------------

interface Plan {
    readonly lesson: GuidedLesson;
    readonly id: string;
    readonly opening: ContourState;
    /** The learner's actions, each with the state the text then describes. */
    readonly asks: readonly {readonly label: string; readonly act: (language: Language) => void; readonly after: ContourState}[];
}
const VALLEY_PROBE = state({levelCount: 3, probe: [20, 10]});
const PLANS: readonly Plan[] = [
    // LS1: every step opens in level-sets mode
    {lesson: levelSetsSurfaceLesson, id: 'ls1-bowl', opening: state({}), asks: [
        {label: 'More level sets once', act: () => morePlus(), after: state({levelCount: 2})},
        {label: 'More level sets twice', act: () => morePlus(), after: state({levelCount: 3})},
    ]},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-probe', opening: state({levelCount: 3}), asks: [
        {label: 'probe (1; 0,5)', act: language => typeProbe('1', '0,5', language), after: state({levelCount: 3, probe: [20, 10]})},
    ]},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-valley', opening: VALLEY_PROBE, asks: [
        {label: 'choose Valley', act: () => chooseFunction('valley'), after: state({fn: 'valley', levelCount: 3, probe: [20, 10]})},
    ]},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-saddle', opening: state({fn: 'valley', levelCount: 3, probe: [20, 10]}), asks: [
        {label: 'choose Saddle', act: () => chooseFunction('saddle'), after: state({fn: 'saddle', levelCount: 3, probe: [20, 10]})},
        {label: 'c = 0', act: language => typeLevel('0', language), after: state({fn: 'saddle', level: 0, levelCount: 3, probe: [20, 10]})},
    ]},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-hills', opening: state({fn: 'saddle', level: 0, levelCount: 3, probe: [20, 10]}), asks: [
        {label: 'choose Hills', act: () => chooseFunction('hills'), after: state({fn: 'hills', level: 0, levelCount: 3, probe: [20, 10]})},
        {label: 'c = 0,625', act: language => typeLevel('0,625', language), after: state({fn: 'hills', level: 5, levelCount: 3, probe: [20, 10]})},
        {label: 'c = -0,875', act: language => typeLevel('-0,875', language), after: state({fn: 'hills', level: -7, levelCount: 3, probe: [20, 10]})},
        {label: 'c = 1', act: language => typeLevel('1', language), after: state({fn: 'hills', level: 8, levelCount: 3, probe: [20, 10]})},
    ]},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-explore', opening: state({}), asks: [
        {label: 'choose Product', act: () => chooseFunction('product'), after: state({fn: 'product'})},
        {label: 'three level sets', act: () => { morePlus(); morePlus(); }, after: state({fn: 'product', levelCount: 3})},
    ]},
    // LS2: steps 1 to 4 open in level-sets mode, so that the gradient is hidden until the learner switches
    {lesson: levelSetsGradientLesson, id: 'ls2-bowl', opening: state({}), asks: [
        {label: 'mode Gradient', act: () => chooseMode('gradient'), after: state({mode: 'gradient'})},
    ]},
    {lesson: levelSetsGradientLesson, id: 'ls2-tangent', opening: state({fn: 'saddle', level: 0, probe: [20, 20]}), asks: [
        {label: 'mode Gradient', act: () => chooseMode('gradient'), after: state({fn: 'saddle', level: 0, probe: [20, 20], mode: 'gradient'})},
    ]},
    {lesson: levelSetsGradientLesson, id: 'ls2-valley', opening: state({fn: 'valley', probe: [20, 0]}), asks: [
        {label: 'mode Gradient', act: () => chooseMode('gradient'), after: state({fn: 'valley', probe: [20, 0], mode: 'gradient'})},
        {label: 'probe (0; 1)', act: language => typeProbe('0', '1', language), after: state({fn: 'valley', probe: [0, 20], mode: 'gradient'})},
    ]},
    {lesson: levelSetsGradientLesson, id: 'ls2-hills', opening: state({fn: 'hills', level: 5, probe: [31, 31]}), asks: [
        {label: 'mode Gradient', act: () => chooseMode('gradient'), after: state({fn: 'hills', level: 5, probe: [31, 31], mode: 'gradient'})},
        {label: 'probe (0; 0)', act: language => typeProbe('0', '0', language), after: state({fn: 'hills', level: 5, probe: [0, 0], mode: 'gradient'})},
    ]},
    {lesson: levelSetsGradientLesson, id: 'ls2-numeric', opening: state({fn: 'hills', level: 5, probe: [20, 20], mode: 'gradient'}), asks: [
        {label: 'tick the numeric estimate', act: () => toggleNumeric(), after: state({fn: 'hills', level: 5, probe: [20, 20], mode: 'gradient', numeric: true})},
    ]},
    {lesson: levelSetsGradientLesson, id: 'ls2-explore', opening: state({}), asks: [
        {label: 'choose Product', act: () => chooseFunction('product'), after: state({fn: 'product'})},
        {label: 'probe (1; 1)', act: language => typeProbe('1', '1', language), after: state({fn: 'product', probe: [20, 20]})},
        {label: 'mode Gradient', act: () => chooseMode('gradient'), after: state({fn: 'product', probe: [20, 20], mode: 'gradient'})},
    ]},
];
const LESSONS = [levelSetsSurfaceLesson, levelSetsGradientLesson] as const;

test('every LS1 and LS2 step has a plan', () => {
    expect(new Set(PLANS.map(plan => plan.id))).toEqual(new Set(LESSONS.flatMap(lesson => lesson.steps.map(step => step.id))));
    expect(LESSONS.map(lesson => lesson.steps.length)).toEqual([6, 6]);
});

describe.each(LANGUAGES)('LS1 and LS2 scenes in %s', language => {
    // out of order: reversed, then every third step, then the in-order pass, so that no scene depends on the one before it
    const order = [...PLANS].reverse().concat(PLANS.filter((_, i) => i % 3 === 0), PLANS);

    test('every scene opens in the stated state and readouts, out of order and twice in one act', () => {
        setLanguage(language);
        const m = mountContour();
        expect(plain(m.graph)).toEqual(DEFAULT_STATE);
        for (const plan of order) {
            m.scene(plan.lesson, plan.id);
            expect({id: plan.id, state: plain(m.graph)}).toEqual({id: plan.id, state: plan.opening});
            expectReadouts(plan.id, plan.opening, language);
            m.sceneTwice(plan.lesson, plan.id);
            expect({id: plan.id, again: plain(m.graph)}).toEqual({id: plan.id, again: plan.opening});
            expectReadouts(`${plan.id} twice`, plan.opening, language);
        }
    });

    test('restoring the checkpoint on exit returns the free state', () => {
        setLanguage(language);
        const m = mountContour();
        for (const plan of PLANS) {
            m.scene(plan.lesson, plan.id);
            m.restore();
            expect({id: plan.id, free: JSON.stringify(m.graph.state)}).toEqual({id: plan.id, free: m.free});
        }
        expect(plain(m.graph)).toEqual(DEFAULT_STATE);
    });

    test('no opening is already the state the prompt asks for; LS2 predicting steps open in level-sets mode', () => {
        setLanguage(language);
        const m = mountContour();
        for (const plan of PLANS) {
            m.scene(plan.lesson, plan.id);
            const opening = JSON.stringify(m.graph.state);
            const last = plan.asks[plan.asks.length - 1];
            if (last) expect({id: plan.id, finalIsOpening: JSON.stringify(last.after) === JSON.stringify(plan.opening)}).toEqual({id: plan.id, finalIsOpening: false});
            expect({id: plan.id, opening: JSON.stringify(plain(m.graph))}).toEqual({id: plan.id, opening: JSON.stringify(plan.opening)});
            expect(opening.length).toBeGreaterThan(0);
        }
        for (const id of ['ls2-bowl', 'ls2-tangent', 'ls2-valley', 'ls2-hills']) {
            const plan = PLANS.find(candidate => candidate.id === id)!;
            m.scene(plan.lesson, id);
            expect({id, mode: plain(m.graph).mode}).toEqual({id, mode: 'level-sets'});
            expect({id, hidden: readoutIds().filter(name => ['gradient', 'norm', 'tangent', 'dot'].includes(name ?? ''))}).toEqual({id, hidden: []});
        }
    });

    test('the learner actions the text asks for give the state and readouts it quotes', () => {
        setLanguage(language);
        const m = mountContour();
        for (const plan of PLANS) {
            m.scene(plan.lesson, plan.id);
            let before = JSON.stringify(plain(m.graph));
            for (const ask of plan.asks) {
                ask.act(language);
                const now = JSON.stringify(plain(m.graph));
                expect({id: plan.id, ask: ask.label, changed: now !== before}).toEqual({id: plan.id, ask: ask.label, changed: true});
                expect({id: plan.id, ask: ask.label, state: plain(m.graph)}).toEqual({id: plan.id, ask: ask.label, state: ask.after});
                expectReadouts(`${plan.id}: ${ask.label}`, ask.after, language);
                before = now;
            }
        }
    });

    test('the quoted readouts after the actions: hills levels, the length at c = 1, the valley and saddle level ranges', () => {
        setLanguage(language);
        const m = mountContour();
        const hills = PLANS.find(plan => plan.id === 'ls1-hills')!;
        m.scene(hills.lesson, hills.id);
        for (const ask of hills.asks) ask.act(language);
        // c = 1 on the hills: the set f = 1 is isolated points, the drawn length is 0
        expectNums('length at c = 1', nums(readout('length'), language), [0]);
        typeLevel('0,625', language);
        expectNums('hills c = 0,625', nums(readout('level'), language), [0.625, 0.875, 0.125]);
        expect(nums(readout('length'), language)[0]).toBeGreaterThan(0);
        typeLevel('-0,875', language);
        expectNums('hills c = -0,875', nums(readout('level'), language), [-0.875, -0.625, 0.125]);
        const saddle = PLANS.find(plan => plan.id === 'ls1-saddle')!;
        m.scene(saddle.lesson, saddle.id);
        for (const ask of saddle.asks) ask.act(language);
        expectNums('saddle c = 0', nums(readout('level'), language), [0, 2, 1]);
    });
});

// ---- the controls and readouts the prompts name ----------------------------------------------------------------------------------------

const L = {
    count: () => t('levelsets_graph_count'), plus: () => t('levelsets_graph_count_plus'), level: () => t('levelsets_graph_level'), rLevel: () => t('levelsets_graph_r_level'),
    probeF: () => t('levelsets_graph_r_probe_f'), probe: () => t('levelsets_graph_probe_title'), fn: () => t('levelsets_graph_fn'), mode: () => t('levelsets_graph_mode'),
    gradientMode: () => t('levelsets_graph_mode_gradient'), gradient: () => t('levelsets_graph_r_gradient'), norm: () => t('levelsets_graph_r_norm'), tangent: () => t('levelsets_graph_r_tangent'),
    dot: () => t('levelsets_graph_r_dot'), numericLabel: () => t('levelsets_graph_numeric'), numeric: () => t('levelsets_graph_r_numeric'), error: () => t('levelsets_graph_r_numeric_error'),
    length: () => t('levelsets_graph_r_length'), scale: () => t('levelsets_graph_r_scale'),
    valley: () => t('levelsets_graph_fn_valley'), saddle: () => t('levelsets_graph_fn_saddle'), hills: () => t('levelsets_graph_fn_hills'), product: () => t('levelsets_graph_fn_product'),
};
const NAMED: Record<string, readonly (() => string)[]> = {
    'ls1-bowl': [L.plus, L.count, L.rLevel],
    'ls1-probe': [L.probeF, L.probe],
    'ls1-valley': [L.fn, L.valley],
    'ls1-saddle': [L.fn, L.saddle, L.level, L.rLevel],
    'ls1-hills': [L.fn, L.hills, L.level, L.rLevel, L.length],
    'ls1-explore': [L.product, L.count, L.probeF],
    'ls2-bowl': [L.mode, L.gradientMode, L.gradient, L.tangent, L.dot],
    'ls2-tangent': [L.mode, L.gradient, L.tangent, L.dot],
    'ls2-valley': [L.mode, L.gradient, L.probe],
    'ls2-hills': [L.mode, L.norm, L.probe, L.probeF],
    'ls2-numeric': [L.numericLabel, L.numeric, L.error, L.gradient],
    'ls2-explore': [L.product, L.probe],
};
/** Prose as read in the app: no math delimiters, no spaces. */
const flat = (text: string) => text.replace(/\\\(|\\\)/g, '').replace(/\s+/g, '');
/** The forms in which a label is written in prose: whole, without the trailing parenthesis, and with Slovenian "Dolžina" in the accusative. */
const forms = (label: string) => {
    const bare = label.replace(/\s*\([^)]*\)$/, '');
    const headless = label.replace(/\s*\(.*$/, '');
    return [label, bare, headless, label.replace('Dolžina', 'Dolžino'), bare.replace('Dolžina', 'Dolžino')].map(flat);
};

describe.each(LANGUAGES)('LS1 and LS2 prompt labels in %s', language => {
    test.each(LESSONS.flatMap(lesson => lesson.steps.map(step => [step.id, step] as const)))('%s: every control and readout the prompt names exists in the graph strings', (id, step) => {
        setLanguage(language);
        // the readout names appear in the prompt or in the expected observation ("Odčitek Vrednost c kaže ...")
        const prompt = flat(`${step.explanation[language]} ${step.observationPrompt[language]} ${step.expectedObservations.map(entry => entry[language]).join(' ')}`);
        for (const label of NAMED[id]) expect({id, label: label(), named: forms(label()).some(form => prompt.includes(form))}).toEqual({id, label: label(), named: true});
    });

    test('the labels exist in the mounted graph: control labels and readout labels', () => {
        setLanguage(language);
        const m = mountContour();
        const gradientPlan = PLANS.find(plan => plan.id === 'ls2-numeric')!;
        m.scene(gradientPlan.lesson, gradientPlan.id);
        toggleNumeric();
        const dts = [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
        for (const label of [L.rLevel, L.probeF, L.gradient, L.norm, L.tangent, L.dot, L.numeric, L.error, L.length]) expect({label: label(), shown: dts.includes(label())}).toEqual({label: label(), shown: true});
        for (const label of [L.fn, L.mode]) expect({label: label(), control: screen.queryAllByLabelText(label()).length > 0}).toEqual({label: label(), control: true});
        expect(screen.queryByRole('checkbox', {name: L.numericLabel()})).not.toBeNull();
        expect(screen.queryByRole('button', {name: L.plus()})).not.toBeNull();
    });
});

// ---- part B: every quoted number, recomputed independently of the graph ----------------------------------------------------------------

/** A quote: its value, the decimals the text prints, and `shown` for a readout the graph prints verbatim (a copy of the display, no claim of exactness). */
interface Quote { readonly value: number; readonly digits: number; readonly shown?: true }
const Q = (value: number, digits = 6): Quote => ({value, digits});
const R = (value: number, digits = 7): Quote => ({value, digits, shown: true});
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

const SQRT2 = Math.SQRT2;
const SQRT3 = Math.sqrt(3);
const SQRT10 = Math.sqrt(10);
const at = (fn: Fn, x: number, y: number) => F[fn](x, y);
const g = (fn: Fn, x: number, y: number) => GRAD[fn](x, y);
const hillsNear = g('hills', 1.55, 1.55);
const hillsOne = g('hills', 1, 1);
const hillsEstimate = centralGradient('hills', 1, 1);

interface Spec { readonly lesson: GuidedLesson; readonly id: string; readonly quotes: readonly Quote[]; readonly extra?: readonly string[] }
/** The decimals a step may show besides its quotes: coordinates the learner types or sees and thresholds of the arithmetic (written in the English form). */
const SPECS: readonly Spec[] = [
    {lesson: levelSetsSurfaceLesson, id: 'ls1-bowl', quotes: [Q(SQRT2, 3), Q(SQRT3, 3), Q(SQRT2 - 1, 3), Q(SQRT3 - SQRT2, 3)], extra: ['0.6', '0.8']},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-probe', quotes: [Q(at('bowl', 1, 0.5), 2), Q(Math.sqrt(1.25), 3), Q(at('bowl', 0.6, 0.8), 0)], extra: ['0.6', '0.8', '0.5']},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-valley', quotes: [Q(1 / SQRT10, 3), Q(SQRT10, 3), Q(at('bowl', 1, 0.5), 2)], extra: ['0.5']},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-saddle', quotes: [Q(at('valley', 1, 0.5), 1)], extra: ['0.5']},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-hills', quotes: [Q(0.625, 3), Q(0.875, 3), Q(0.125, 3), Q(at('saddle', 1, 0.5), 2)], extra: ['0.5']},
    {lesson: levelSetsSurfaceLesson, id: 'ls1-explore', quotes: [], extra: ['0.6', '0.8']},
    {lesson: levelSetsGradientLesson, id: 'ls2-bowl', quotes: [Q(g('bowl', 0.6, 0.8)[0], 1), Q(g('bowl', 0.6, 0.8)[1], 1), Q(0.8, 1), Q(0.6, 1)], extra: []},
    {lesson: levelSetsGradientLesson, id: 'ls2-tangent', quotes: [Q(Math.hypot(...g('saddle', 1, 1)), 4), R(SQRT2 / 2)], extra: []},
    {lesson: levelSetsGradientLesson, id: 'ls2-valley', quotes: [], extra: []},
    {lesson: levelSetsGradientLesson, id: 'ls2-hills', quotes: [R(at('hills', 1.55, 1.55), 6), Q(hillsNear[0], 4), Q(Math.hypot(...hillsNear), 4), Q(1.55, 2), Q(0.05, 2)], extra: ['0.625']},
    {lesson: levelSetsGradientLesson, id: 'ls2-numeric', quotes: [R(hillsOne[0]), R(hillsEstimate[0]), R(hillsOne[0] - hillsEstimate[0]), Q(hillsOne[0], 4), Q(0.01, 2)], extra: ['0.45464', '7.6', '0.625']},
    {lesson: levelSetsGradientLesson, id: 'ls2-explore', quotes: [Q(Math.hypot(...g('product', 1, 1)), 4), R(SQRT2 / 2)], extra: ['0.6', '0.8']},
];
/**
 * Rounded quotes the text does not hedge with a "približno"/"approximately" word, \approx or a "(izračunano)" mark. These are findings, pinned so that the test stays green and
 * the list shrinks when the text is fixed: the lesson text prints a 4-digit rounding of a 7-digit readout, or of an exact value, as if it were equal to it.
 */
const KNOWN_UNHEDGED: Readonly<Record<string, readonly string[]>> = {};

describe.each(LANGUAGES)('LS1 and LS2 quoted numbers in %s', language => {
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
});

test('the closed forms: f values, gradients, tangents perpendicular to the gradient, radii and axes of the level sets', () => {
    // f at the probes the text quotes
    expect([at('bowl', 0.6, 0.8), at('bowl', 1, 0.5), at('valley', 1, 0.5), at('saddle', 1, 0.5), at('saddle', 1, 1), at('valley', 1, 0)]).toEqual([expect.closeTo(1, 12), 1.25, 3.5, 0.75, 0, 1]);
    expect(at('hills', 1.55, 1.55)).toBeCloseTo(0.999568, 6);
    // gradients: bowl (2x, 2y), saddle (2x, -2y), valley (2x, 20y), product (y, x), hills (cos x sin y, sin x cos y)
    expect(g('bowl', 0.6, 0.8)).toEqual([expect.closeTo(1.2, 12), expect.closeTo(1.6, 12)]);
    expect(g('saddle', 1, 1)).toEqual([2, -2]);
    expect(g('valley', 1, 0)).toEqual([2, 0]);
    expect(g('valley', 0, 1)).toEqual([0, 20]);
    expect(g('product', 1, 1)).toEqual([1, 1]);
    expect(Math.hypot(...g('valley', 0, 1)) / Math.hypot(...g('valley', 1, 0))).toBeCloseTo(10, 12);
    for (const [fn, x, y] of [['bowl', 0.6, 0.8], ['saddle', 1, 1], ['valley', 1, 0], ['valley', 0, 1], ['product', 1, 1], ['hills', 1.55, 1.55], ['hills', 1, 1]] as const) {
        // the tangent is the gradient turned by a quarter and normalized; its dot product with the gradient is 0
        const [gx, gy] = g(fn, x, y);
        const norm = Math.hypot(gx, gy);
        const tangent = [-gy / norm, gx / norm];
        expect(Math.abs(gx * tangent[0] + gy * tangent[1])).toBeLessThan(1e-12);
        expect(Math.hypot(...tangent)).toBeCloseTo(1, 12);
        // the chain rule on a small arc of the level set: f changes only to second order when moving along the tangent
        const eps = 1e-5;
        expect(Math.abs(F[fn](x + eps * tangent[0], y + eps * tangent[1]) - F[fn](x, y))).toBeLessThan(10 * eps * eps * Math.max(1, norm));
    }
    expect([g('bowl', 0.6, 0.8)].map(([gx, gy]) => [-gy / Math.hypot(gx, gy), gx / Math.hypot(gx, gy)])[0]).toEqual([expect.closeTo(-0.8, 12), expect.closeTo(0.6, 12)]);
    expect(Math.hypot(...g('bowl', 0.6, 0.8))).toBeCloseTo(2, 12);
    expect(Math.hypot(...g('saddle', 1, 1))).toBeCloseTo(2 * SQRT2, 12);
    expect(Math.hypot(...g('product', 1, 1))).toBeCloseTo(SQRT2, 12);
    // the bowl: the level set x^2 + y^2 = c is a circle of radius sqrt(c); the gaps shrink
    for (const c of [1, 2, 3]) expect(Math.hypot(Math.sqrt(c), 0)).toBeCloseTo(Math.sqrt(c), 12);
    expect([SQRT2 - 1, SQRT3 - SQRT2]).toEqual([expect.closeTo(0.414, 3), expect.closeTo(0.318, 3)]);
    expect(SQRT3 - SQRT2).toBeLessThan(SQRT2 - 1);
    expect(Math.sqrt(1.25)).toBeCloseTo(1.118, 3);
    // the valley: x^2 + 10 y^2 = c meets the axes at sqrt(c) and sqrt(c / 10); the ratio of the semi-axes is sqrt(10)
    for (const c of [1, 2, 3]) {
        expect(F.valley(Math.sqrt(c), 0)).toBeCloseTo(c, 12);
        expect(F.valley(0, Math.sqrt(c / 10))).toBeCloseTo(c, 12);
        expect(Math.sqrt(c) / Math.sqrt(c / 10)).toBeCloseTo(SQRT10, 12);
    }
    expect([1 / SQRT10, SQRT10]).toEqual([expect.closeTo(0.316, 3), expect.closeTo(3.162, 3)]);
    // the saddle at c = 0 is y = x or y = -x; the hills reach the value 1 only at the peaks (pi/2, pi/2) etc., where the gradient is 0
    for (const x of [-1.3, 0.4, 2.2]) { expect(F.saddle(x, x)).toBe(0); expect(F.saddle(x, -x)).toBe(0); }
    expect(Math.max(...Array.from({length: 161}, (_, i) => F.hills(-4 + i * 0.05, Math.PI / 2)))).toBeLessThanOrEqual(1);
    expect(Math.abs(g('hills', Math.PI / 2, Math.PI / 2)[0])).toBeLessThan(1e-15);
    expect(Math.abs(g('hills', Math.PI / 2, Math.PI / 2)[1])).toBeLessThan(1e-15);
    expect(g('hills', 0, 0)).toEqual([0, 0]);
    // the peak is not on the 0,05 grid of the probe, and the gradient next to it is short but not zero
    expect(Math.PI / 2 / 0.05).not.toBeCloseTo(Math.round(Math.PI / 2 / 0.05), 1);
    expect(Math.PI / 2).toBeCloseTo(1.571, 3);
    expect([hillsNear[0], hillsNear[1], Math.hypot(...hillsNear)]).toEqual([expect.closeTo(0.0208, 4), expect.closeTo(0.0208, 4), expect.closeTo(0.0294, 4)]);
    expect(Math.hypot(...hillsNear)).toBeGreaterThan(0);
});

test('the hills gradient at (1, 1) and the central difference at h = 0,01 against the analytic value', () => {
    expect(hillsOne[0]).toBeCloseTo(0.4546487, 7);
    expect(hillsOne[1]).toBeCloseTo(0.4546487, 7);
    expect(hillsOne[0]).toBeCloseTo(Math.cos(1) * Math.sin(1), 15);
    expect(hillsEstimate[0]).toBeCloseTo(0.4546411, 7);
    expect(hillsEstimate[1]).toBeCloseTo(0.4546411, 7);
    const error = hillsOne[0] - hillsEstimate[0];
    expect(error).toBeCloseTo(0.0000076, 7);
    // the estimate is below the exact value by about h^2 / 6 |f_xxx| with f_xxx = -cos x sin y
    const h = 0.01;
    const leading = (h * h) / 6 * Math.abs(Math.cos(1) * Math.sin(1));
    expect(leading).toBeCloseTo(7.6e-6, 7);
    expect(leading).toBeCloseTo(error, 7);
    // the same estimate with a smaller step is better by about the factor 100 (order h^2)
    const finer = centralGradient('hills', 1, 1, 0.001);
    expect((hillsOne[0] - hillsEstimate[0]) / (hillsOne[0] - finer[0])).toBeCloseTo(100, 0);
    // they agree in 5 decimals (0,45464), not in 6
    const digits = (value: number, n: number) => Math.floor(value * 10 ** n) / 10 ** n;
    expect([digits(hillsOne[0], 5), digits(hillsEstimate[0], 5), digits(hillsEstimate[0], 5) === 0.45464]).toEqual([0.45464, 0.45464, true]);
    expect(digits(hillsOne[0], 6)).not.toBe(digits(hillsEstimate[0], 6));
});
