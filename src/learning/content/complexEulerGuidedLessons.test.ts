/**
 * M7 (Euler's formula as uniform circular motion, complex maps batch D), part A: every scene lands, in both languages, in the state and readouts the text states (the real
 * EulerCircleGraph, one synchronous sequence of actions from a restored checkpoint, out of order and twice in one act); no opening is already the state the prompt asks the learner to
 * produce or shows a value a later prediction asks for; every control or readout the prompts name exists in the graph strings; and the learner actions the text asks for (the angle
 * field, omega, the velocity and acceleration switches, the mode and second angle, the series degree N) give the readouts the text quotes. Expected values are computed here with
 * Math.cos and Math.sin and the term recurrence t(k+1) = t(k) * i * theta / (k + 1), not with the graph; part B (below) recomputes every number the text quotes.
 */
import React from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {GraphHost} from '../../graphs/base/GraphHost';
import {installBoardShims, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import {EulerCircleGraph} from '../../graphs/complex/EulerCircleGraph';
import {enterNumber} from '../../inputs/testEntry';
import {setLanguage, t} from '../../localization';
import {sceneActions} from '../runtime/lessonCatalog';
import {complexEulerLesson} from './complexEulerGuidedLessons';

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

interface S { readonly degrees: number; readonly omega: number; readonly degree: number; readonly velocity: boolean; readonly acceleration: boolean; readonly mode: 'motion' | 'product'; readonly b: number }
const DEFAULT_STATE: S = {degrees: 30, omega: 2, degree: 5, velocity: true, acceleration: false, mode: 'motion', b: 45};
const state = (patch: Partial<S>): S => ({...DEFAULT_STATE, ...patch});
type C = readonly [number, number];

/** The partial sum of degree N at theta by the term recurrence t(k+1) = t(k) * (i theta) / (k + 1), starting with t(0) = 1. */
const partialSum = (theta: number, degree: number): C => {
    let term: C = [1, 0];
    let sum: C = [1, 0];
    for (let k = 0; k < degree; k++) {
        term = [-(term[1] * theta) / (k + 1), (term[0] * theta) / (k + 1)];
        sum = [sum[0] + term[0], sum[1] + term[1]];
    }
    return sum;
};
const radians = (degrees: number) => (degrees * Math.PI) / 180;

const rowOf = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const rowIds = () => [...document.querySelectorAll('[data-readout]')].map(node => node.getAttribute('data-readout') ?? '');
const status = () => document.querySelector('[data-euler-status]')?.textContent ?? '';
/** The numbers of a readout: true minus, the decimal comma of Slovenian. */
const nums = (text: string | null, language: Language): number[] =>
    ((language === 'sl' ? (text ?? '').replace(/,/g, '.') : text ?? '').replace(/−/g, '-').match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
/** A complex number printed as "a + bi", "-4i" or "-2". */
const complexOf = (text: string | null, language: Language): C | undefined => {
    const flat = (language === 'sl' ? (text ?? '').replace(/,/g, '.') : text ?? '').replace(/−/g, '-').replace(/\s/g, '');
    const m = flat.match(/^(.*?)([+-]?[\d.]*)i$/);
    if (!m) return Number.isFinite(Number(flat)) && flat !== '' ? [Number(flat), 0] : undefined;
    const im = m[2] === '' || m[2] === '+' ? 1 : m[2] === '-' ? -1 : Number(m[2]);
    return [m[1] === '' ? 0 : Number(m[1]), im];
};
const SUPERSCRIPT: Record<string, string> = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9'};
/** A distance readout: a plain decimal or "7,64·10⁻¹¹". */
const distanceOf = (text: string | null, language: Language): number | undefined => {
    const sci = (text ?? '').match(/^(\d+[.,]?\d*)·10⁻([⁰¹²³⁴⁵⁶⁷⁸⁹]+)$/);
    if (sci) return Number(sci[1].replace(',', '.')) * 10 ** -Number([...sci[2]].map(char => SUPERSCRIPT[char]).join(''));
    return nums(text, language)[0];
};
const loc = (value: string, language: Language) => (language === 'sl' ? value : value.replace(/(?<=\d),(?=\d)/g, '.'));
const closeTo = (actual: number | undefined, want: number, tolerance: number) => actual !== undefined && Math.abs(actual - want) <= tolerance;

/** The readouts that follow from a state alone, compared with the closed values (not with the graph's kernel). */
function expectNumeric(label: string, s: S, language: Language) {
    const theta = radians(s.degrees);
    const [px, py] = [Math.cos(theta), Math.sin(theta)];
    const check = (what: string, ok: boolean, got: unknown) => expect({label, what, ok, got}).toEqual({label, what, ok: true, got});
    check('time', closeTo(nums(rowOf('time'), language).pop(), theta / s.omega, 6e-4), rowOf('time'));
    check('period', closeTo(nums(rowOf('period'), language).pop(), (2 * Math.PI) / s.omega, 6e-4), rowOf('period'));
    check('omega', closeTo(nums(rowOf('omega'), language)[0], s.omega, 0), rowOf('omega'));
    if (!(rowOf('point') ?? '').includes('√')) {
        const [x, y] = (rowOf('point') ?? '').endsWith('i') ? complexOf(rowOf('point'), language)! : nums(rowOf('point'), language);
        const tolerance = (rowOf('point') ?? '').endsWith('i') ? 1e-4 : 1e-6;
        check('point', closeTo(x, px, tolerance) && closeTo(y, py, tolerance), rowOf('point'));
    }
    if (s.velocity) {
        const v = complexOf(rowOf('velocity'), language);
        check('velocity', v !== undefined && closeTo(v[0], -s.omega * py, 1e-6) && closeTo(v[1], s.omega * px, 1e-6), rowOf('velocity'));
        check('speed', closeTo(nums(rowOf('speed'), language)[0], s.omega, 1e-9), rowOf('speed'));
        check('between', closeTo(nums(rowOf('between'), language)[0], 90, 1e-9), rowOf('between'));
    }
    if (s.acceleration) {
        const a = complexOf(rowOf('acceleration'), language);
        check('acceleration', a !== undefined && closeTo(a[0], -(s.omega ** 2) * px, 1e-6) && closeTo(a[1], -(s.omega ** 2) * py, 1e-6), rowOf('acceleration'));
    }
    if (s.mode === 'product') {
        const total = radians(s.degrees + s.b);
        const text = rowOf('product') ?? '';
        if (!text.includes('√')) {
            const [x, y] = nums(text, language);
            check('product', closeTo(x, Math.cos(total), 1e-6) && closeTo(y, Math.sin(total), 1e-6), text);
        }
        check('sum angle', nums(rowOf('sum-angle'), language).slice(0, 3).join() === [s.degrees, s.b, s.degrees + s.b].join(), rowOf('sum-angle'));
    }
    const sum = partialSum(theta, s.degree);
    const shown = complexOf(rowOf('sum'), language);
    check('partial sum', shown !== undefined && closeTo(shown[0], sum[0], 1e-4) && closeTo(shown[1], sum[1], 1e-4), rowOf('sum'));
    const distance = Math.hypot(sum[0] - px, sum[1] - py);
    const error = distanceOf(rowOf('error'), language);
    check('distance', error !== undefined && (distance < 1e-12 ? error === 0 : Math.abs(error - distance) <= 0.01 * distance), rowOf('error'));
}

// ---- the graph -------------------------------------------------------------------------------------------------------------------------

const plain = (graph: EulerCircleGraph): S => {
    const {degrees, omega, degree, velocity, acceleration, mode, b} = graph.state as unknown as S;
    return {degrees, omega, degree, velocity, acceleration, mode, b};
};

function mountEuler() {
    const graph = new EulerCircleGraph();
    render(React.createElement(MemoryRouter, null, React.createElement(GraphHost, {create: () => graph})));
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const run = (id: string) => {
        capabilities.restoreState(checkpoint);
        for (const action of sceneActions(complexEulerLesson.steps.find(step => step.id === id)!.scene!)) capabilities.apply(action);
    };
    const scene = (id: string) => act(() => { run(id); });
    /** The scene run twice inside one act. */
    const sceneTwice = (id: string) => act(() => { run(id); run(id); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, scene, sceneTwice, restore, free};
}

// ---- learner controls ------------------------------------------------------------------------------------------------------------------

const field = (label: string) => (screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)})[0] ?? screen.getByLabelText(label)) as HTMLInputElement;
const typeInto = (label: string, value: number) => act(() => { enterNumber(field(label), String(value)); });
const toggle = (label: string) => act(() => { fireEvent.click(screen.getByLabelText(label)); });
const press = (name: string) => act(() => { fireEvent.click(screen.getByRole('button', {name})); });
const typeAngle = (value: number) => typeInto(t('euler_circle_graph_angle_label'), value);
const typeOmega = (value: number) => typeInto(t('euler_circle_graph_omega_label'), value);
const typeDegree = (value: number) => typeInto(t('euler_circle_graph_degree_label'), value);
const typeSecond = (value: number) => typeInto(t('euler_circle_graph_b_label'), value);
const toggleMode = () => toggle(t('euler_circle_graph_mode_label'));
const toggleVelocity = () => toggle(t('euler_circle_graph_velocity_label'));
const toggleAcceleration = () => toggle(t('euler_circle_graph_acceleration_label'));

// ---- steps: the opening state, the readouts and the learner actions the text asks for --------------------------------------------------

const OUT = '<out>';
/** Expected readout texts in Slovenian (English: the decimal comma becomes a point); `absent` rows must not exist. */
interface Expect { readonly rows: Readonly<Record<string, string>>; readonly absent?: readonly string[]; readonly status?: string }
interface Ask { readonly label: string; readonly act: () => void; readonly after: S; readonly expect: Expect }
interface Plan { readonly id: string; readonly opening: S; readonly expect: Expect; readonly asks: readonly Ask[] }
const MOTION_ROWS = ['velocity', 'speed', 'between', 'acceleration', 'b', 'sum-angle', 'second', 'product'] as const;
const without = (...keep: string[]) => MOTION_ROWS.filter(id => !keep.includes(id));
const S1 = {degrees: 30, degree: 1, omega: 2};

const PLANS: readonly Plan[] = [
    {id: 'm7-circle', opening: state({degrees: 0, velocity: false, degree: 1}), expect: {rows: {angle: '0°, 0 rad', time: '0', period: 'π ≈ 3,142', point: '(1; 0)', sum: '1', error: '0'}, absent: [...without(), 'out'], status: 'θ = 0°: e^(iθ) = (1; 0).'}, asks: [
        {label: 'theta 90', act: () => typeAngle(90), after: state({degrees: 90, velocity: false, degree: 1}), expect: {rows: {point: '(0; 1)', cos: '0', sin: '1', sum: '1 + 1,5708i'}, absent: ['out']}},
        {label: 'theta 180', act: () => typeAngle(180), after: state({degrees: 180, velocity: false, degree: 1}), expect: {rows: {point: '(−1; 0)', cos: '−1', sin: '0', sum: '1 + 3,1416i', out: OUT}}},
        {label: 'theta 270', act: () => typeAngle(270), after: state({degrees: 270, velocity: false, degree: 1}), expect: {rows: {point: '(0; −1)', cos: '0', sin: '−1', out: OUT}}},
    ]},
    {id: 'm7-uniform-motion', opening: state({degrees: 90, omega: 1, velocity: false, degree: 1}), expect: {rows: {omega: '1', time: 'π/2 ≈ 1,571', period: '2π ≈ 6,283'}, absent: without()}, asks: [
        {label: 'omega 2', act: () => typeOmega(2), after: state({degrees: 90, omega: 2, velocity: false, degree: 1}), expect: {rows: {time: 'π/4 ≈ 0,785', period: 'π ≈ 3,142'}}},
        {label: 'omega 4', act: () => typeOmega(4), after: state({degrees: 90, omega: 4, velocity: false, degree: 1}), expect: {rows: {time: 'π/8 ≈ 0,393', period: 'π/2 ≈ 1,571'}}},
    ]},
    {id: 'm7-velocity', opening: state({...S1, velocity: false}), expect: {rows: {time: 'π/12 ≈ 0,262', point: '(√3/2; 1/2)'}, absent: without()}, asks: [
        {label: 'velocity on', act: () => toggleVelocity(), after: state({...S1, velocity: true}), expect: {rows: {velocity: '−1 + 1,7320508i', speed: '2', between: '90°'}, absent: ['acceleration']}},
    ]},
    {id: 'm7-acceleration', opening: state({degrees: 90, degree: 1}), expect: {rows: {velocity: '−2', speed: '2', between: '90°', point: '(0; 1)'}, absent: without('velocity', 'speed', 'between')}, asks: [
        {label: 'acceleration on', act: () => toggleAcceleration(), after: state({degrees: 90, degree: 1, acceleration: true}), expect: {rows: {acceleration: '−4i'}}},
    ]},
    {id: 'm7-product', opening: state({...S1, velocity: false}), expect: {rows: {point: '(√3/2; 1/2)'}, absent: without()}, asks: [
        {label: 'product on (phi 45)', act: () => toggleMode(), after: state({...S1, velocity: false, mode: 'product'}), expect: {rows: {b: '45°', 'sum-angle': '30° + 45° = 75°', product: '(0,258819; 0,9659258)', second: '(√2/2; √2/2)'}}},
        {label: 'theta 90, phi 90', act: () => { typeAngle(90); typeSecond(90); }, after: state({degrees: 90, degree: 1, velocity: false, mode: 'product', b: 90}), expect: {rows: {b: '90°', 'sum-angle': '90° + 90° = 180°', product: '(−1; 0)', second: '(0; 1)'}}},
    ]},
    {id: 'm7-series', opening: state({degrees: 180, velocity: false, degree: 1}), expect: {rows: {sum: '1 + 3,1416i', error: '3,72', out: OUT, point: '(−1; 0)'}, absent: without(), status: 'θ = 180°: e^(iθ) = (−1; 0).'}, asks: [
        {label: 'N 3', act: () => typeDegree(3), after: state({degrees: 180, velocity: false, degree: 3}), expect: {rows: {sum: '−3,9348 − 2,0261i', error: '3,57', out: OUT}}},
        {label: 'N 5', act: () => typeDegree(5), after: state({degrees: 180, velocity: false, degree: 5}), expect: {rows: {sum: '0,1239 + 0,524i', error: '1,24'}, absent: ['out']}},
        {label: 'N 9', act: () => typeDegree(9), after: state({degrees: 180, velocity: false, degree: 9}), expect: {rows: {sum: '−0,976 + 0,0069i', error: '0,025'}, absent: ['out']}},
        {label: 'N 13', act: () => typeDegree(13), after: state({degrees: 180, velocity: false, degree: 13}), expect: {rows: {sum: '−0,9999', error: '0,000103'}, absent: ['out']}},
        {label: 'N 21', act: () => typeDegree(21), after: state({degrees: 180, velocity: false, degree: 21}), expect: {rows: {sum: '−1', error: '7,64·10⁻¹¹'}, absent: ['out']}},
    ]},
    {id: 'm7-explore', opening: state({}), expect: {rows: {time: 'π/12 ≈ 0,262', period: 'π ≈ 3,142', velocity: '−1 + 1,7320508i', point: '(√3/2; 1/2)'}, absent: without('velocity', 'speed', 'between')}, asks: [
        {label: 'theta 45', act: () => typeAngle(45), after: state({degrees: 45}), expect: {rows: {point: '(√2/2; √2/2)'}}},
        {label: 'theta 30, product, phi 330', act: () => { typeAngle(30); toggleMode(); typeSecond(330); }, after: state({mode: 'product', b: 330}), expect: {rows: {product: '(1; 0)'}}},
        {label: 'back to motion, omega 3', act: () => { toggleMode(); typeOmega(3); }, after: state({omega: 3, b: 330}), expect: {rows: {period: '2π/3 ≈ 2,094'}, absent: ['product']}},
        {label: 'one playback step', act: () => press(t('next_step')), after: state({omega: 3, b: 330, degrees: 35}), expect: {rows: {}}},
    ]},
];

function expectRows(label: string, e: Expect, language: Language) {
    for (const [id, value] of Object.entries(e.rows)) {
        expect({label, id, text: rowOf(id)}).toEqual({label, id, text: value === OUT ? t('euler_circle_graph_value_out') : loc(value, language)});
    }
    expect({label, present: rowIds().filter(id => (e.absent ?? []).includes(id))}).toEqual({label, present: []});
    if (e.status !== undefined) expect({label, status: status().startsWith(e.status)}).toEqual({label, status: true});
    if (e.rows.out === OUT) expect({label, status: status().endsWith(t('euler_circle_graph_status_out'))}).toEqual({label, status: true});
}

test('every M7 step has a plan, in the order of the lesson', () => {
    expect(PLANS.map(plan => plan.id)).toEqual(complexEulerLesson.steps.map(step => step.id));
    expect(complexEulerLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

describe.each(LANGUAGES)('M7 scenes in %s', language => {
    // out of order: reversed, then every third step, then the in-order pass, so that no scene depends on the one before it
    const order = [...PLANS].reverse().concat(PLANS.filter((_, i) => i % 3 === 0), PLANS);

    test('every scene opens in the stated state and readouts, out of order and twice in one act', () => {
        setLanguage(language);
        const m = mountEuler();
        expect(plain(m.graph)).toEqual(DEFAULT_STATE);
        for (const plan of order) {
            m.scene(plan.id);
            expect({id: plan.id, state: plain(m.graph)}).toEqual({id: plan.id, state: plan.opening});
            expectRows(plan.id, plan.expect, language);
            expectNumeric(plan.id, plan.opening, language);
            m.sceneTwice(plan.id);
            expect({id: plan.id, again: plain(m.graph)}).toEqual({id: plan.id, again: plan.opening});
            expectRows(`${plan.id} twice`, plan.expect, language);
            expectNumeric(`${plan.id} twice`, plan.opening, language);
        }
    });

    test('restoring the checkpoint on exit returns the free state', () => {
        setLanguage(language);
        const m = mountEuler();
        for (const plan of PLANS) {
            m.scene(plan.id);
            m.restore();
            expect({id: plan.id, free: JSON.stringify(m.graph.state)}).toEqual({id: plan.id, free: m.free});
        }
        expect(plain(m.graph)).toEqual(DEFAULT_STATE);
    });

    test('no opening is already the state the prompt asks for or shows a value a later prediction asks for', () => {
        setLanguage(language);
        const m = mountEuler();
        const sixAnswers = ['−3,9348 − 2,0261i', '0,1239 + 0,524i', '−0,976 + 0,0069i', '−0,9999', '−1'].map(value => loc(value, language));
        const timeAnswers = ['π/4 ≈ 0,785', 'π/8 ≈ 0,393'].map(value => loc(value, language));
        const periodAnswers = ['π ≈ 3,142', 'π/2 ≈ 1,571'].map(value => loc(value, language));
        for (const plan of PLANS) {
            m.scene(plan.id);
            const last = plan.asks[plan.asks.length - 1];
            expect({id: plan.id, finalIsOpening: JSON.stringify(last.after) === JSON.stringify(plan.opening)}).toEqual({id: plan.id, finalIsOpening: false});
            // the learner's first action changes the state
            expect({id: plan.id, firstIsOpening: JSON.stringify(plan.asks[0].after) === JSON.stringify(plan.opening)}).toEqual({id: plan.id, firstIsOpening: false});
            if (plan.id !== 'm7-series' && plan.id !== 'm7-explore') {
                expect({id: plan.id, degree: plain(m.graph).degree}).toEqual({id: plan.id, degree: 1});
                expect({id: plan.id, early: sixAnswers.includes(rowOf('sum') ?? '')}).toEqual({id: plan.id, early: false});
            }
            if (plan.id === 'm7-series') {
                expect(plain(m.graph).degree).toBe(1);
                expect(sixAnswers.includes(rowOf('sum') ?? '')).toBe(false);
            }
            const asked = Object.keys(plan.asks.reduce((all, ask) => ({...all, ...ask.expect.rows}), {}));
            // a row the learner is asked to produce is absent or different at the opening
            for (const id of asked) {
                const first = plan.asks.find(ask => id in ask.expect.rows)!.expect.rows[id];
                const opened = plan.expect.rows[id];
                if (first !== OUT && opened !== undefined) expect({id: plan.id, row: id, same: opened === first && plan.asks.every(ask => ask.expect.rows[id] === undefined || ask.expect.rows[id] === opened)}).toEqual({id: plan.id, row: id, same: false});
            }
        }
        // each step opens with what it asks the learner to produce hidden or not yet set
        m.scene('m7-velocity');
        expect({velocity: plain(m.graph).velocity, rows: rowIds().filter(id => ['velocity', 'speed', 'between'].includes(id))}).toEqual({velocity: false, rows: []});
        m.scene('m7-acceleration');
        expect({acceleration: plain(m.graph).acceleration, rows: rowIds().filter(id => id === 'acceleration')}).toEqual({acceleration: false, rows: []});
        m.scene('m7-product');
        expect({mode: plain(m.graph).mode, rows: rowIds().filter(id => ['b', 'sum-angle', 'second', 'product'].includes(id))}).toEqual({mode: 'motion', rows: []});
        m.scene('m7-series');
        expect(plain(m.graph).degree).toBe(1);
        m.scene('m7-uniform-motion');
        expect(timeAnswers.includes(rowOf('time') ?? '')).toBe(false);
        expect(periodAnswers.includes(rowOf('period') ?? '')).toBe(false);
        m.scene('m7-circle');
        expect(plain(m.graph).degrees).toBe(0);
        expect(plain(m.graph).velocity).toBe(false);
    });

    test('the learner actions the text asks for give the state and readouts it quotes', () => {
        setLanguage(language);
        const m = mountEuler();
        for (const plan of PLANS) {
            m.scene(plan.id);
            let before = JSON.stringify(plain(m.graph));
            for (const ask of plan.asks) {
                ask.act();
                const now = JSON.stringify(plain(m.graph));
                expect({id: plan.id, ask: ask.label, changed: now !== before}).toEqual({id: plan.id, ask: ask.label, changed: true});
                expect({id: plan.id, ask: ask.label, state: plain(m.graph)}).toEqual({id: plan.id, ask: ask.label, state: ask.after});
                expectRows(`${plan.id}: ${ask.label}`, ask.expect, language);
                expectNumeric(`${plan.id}: ${ask.label}`, ask.after, language);
                before = now;
            }
        }
    });
});

// ---- the controls and readouts the prompts name ----------------------------------------------------------------------------------------

interface Named { readonly label: () => string; readonly short?: Record<Language, string> }
type PlainKey = 'euler_circle_graph_angle_label' | 'euler_circle_graph_omega_label' | 'euler_circle_graph_degree_label' | 'euler_circle_graph_velocity_label' | 'euler_circle_graph_acceleration_label' | 'euler_circle_graph_mode_label' | 'euler_circle_graph_b_label'
    | 'euler_circle_graph_r_time' | 'euler_circle_graph_r_period' | 'euler_circle_graph_r_velocity' | 'euler_circle_graph_r_speed' | 'euler_circle_graph_r_between' | 'euler_circle_graph_r_acceleration' | 'euler_circle_graph_r_sum_angle';
const N = (key: PlainKey): Named => ({label: () => t(key)});
const NS = (key: PlainKey, sl: string, en: string): Named => ({label: () => t(key), short: {sl, en}});
const sumLabel = () => t('euler_circle_graph_r_sum', {value0: 'N'});
const errorLabel = () => t('euler_circle_graph_r_error', {value0: 'N'});
const NAMED: Record<string, readonly Named[]> = {
    'm7-circle': [N('euler_circle_graph_angle_label')],
    'm7-uniform-motion': [N('euler_circle_graph_omega_label'), N('euler_circle_graph_r_time'), N('euler_circle_graph_r_period')],
    'm7-velocity': [N('euler_circle_graph_velocity_label'), NS('euler_circle_graph_r_velocity', 'Vektor hitrosti', 'Velocity'), N('euler_circle_graph_r_speed'), N('euler_circle_graph_r_between')],
    'm7-acceleration': [N('euler_circle_graph_acceleration_label'), NS('euler_circle_graph_r_acceleration', 'Vektor pospeška', 'Acceleration')],
    'm7-product': [N('euler_circle_graph_mode_label'), N('euler_circle_graph_b_label'), N('euler_circle_graph_angle_label'), NS('euler_circle_graph_r_sum_angle', 'Kota se seštejeta', 'Angles add'), {label: () => t('euler_circle_graph_r_product', {value0: 'x'}), short: {sl: 'Zmnožek', en: 'Product'}}],
    'm7-series': [N('euler_circle_graph_degree_label'), {label: sumLabel}, {label: errorLabel, short: {sl: 'Razdalja delne vsote', en: 'Distance of the partial sum'}}],
    'm7-explore': [],
};
const TEX_SYMBOLS: readonly (readonly [RegExp, string])[] = [[/\\theta/g, 'θ'], [/\\omega/g, 'ω'], [/\\varphi/g, 'φ'], [/\\pi/g, 'π']];
/** Prose as read in the app: no math delimiters, the symbols as letters, no spaces. */
const flat = (text: string) => TEX_SYMBOLS.reduce((all, [pattern, symbol]) => all.replace(pattern, symbol), text).replace(/\\\(|\\\)/g, '').replace(/\s+/g, '');
/** The forms in which a label is written in prose: whole, before the first comma, before the first parenthesis. */
const forms = (label: string) => [label, label.replace(/,.*$/, ''), label.replace(/\s*\(.*$/, '')].map(flat);

describe.each(LANGUAGES)('M7 prompt labels in %s', language => {
    test.each(complexEulerLesson.steps.map(step => [step.id, step] as const))('%s: every control and readout the prompt names exists in the graph strings', (id, step) => {
        setLanguage(language);
        const prompt = flat(`${step.explanation[language]} ${step.observationPrompt[language]} ${step.expectedObservations.map(entry => entry[language]).join(' ')}`);
        for (const named of NAMED[id]) {
            const label = named.label();
            if (named.short) expect({id, label, starts: flat(label).startsWith(flat(named.short[language]))}).toEqual({id, label, starts: true});
            const wanted = named.short ? [flat(named.short[language])] : forms(label);
            expect({id, label, named: wanted.some(form => prompt.includes(form))}).toEqual({id, label, named: true});
        }
    });

    test('the labels exist in the mounted graph: control labels and readout labels', () => {
        setLanguage(language);
        const m = mountEuler();
        m.scene('m7-product');
        toggleMode();
        toggleAcceleration();
        typeDegree(1);
        typeAngle(180);
        const dts = [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
        for (const key of ['euler_circle_graph_r_time', 'euler_circle_graph_r_period', 'euler_circle_graph_r_acceleration', 'euler_circle_graph_r_speed', 'euler_circle_graph_r_between', 'euler_circle_graph_r_sum_angle'] as const) {
            expect({key, shown: key === 'euler_circle_graph_r_speed' || key === 'euler_circle_graph_r_between' ? 'hidden' : dts.includes(t(key))}).toEqual({key, shown: key === 'euler_circle_graph_r_speed' || key === 'euler_circle_graph_r_between' ? 'hidden' : true});
        }
        expect({sum: dts.includes(sumLabel().replace('N', '1')), error: dts.includes(errorLabel().replace('N', '1')), out: dts.includes(t('euler_circle_graph_r_out', {value0: '1'}))}).toEqual({sum: true, error: true, out: true});
        for (const key of ['euler_circle_graph_r_velocity', 'euler_circle_graph_r_speed', 'euler_circle_graph_r_between'] as const) expect(dts.includes(t(key))).toBe(false);
        for (const label of [t('euler_circle_graph_angle_label'), t('euler_circle_graph_omega_label'), t('euler_circle_graph_degree_label'), t('euler_circle_graph_b_label')]) {
            expect({label, control: screen.queryAllByRole('spinbutton', {name: name => name === label || name.startsWith(`${label}, `)}).length > 0}).toEqual({label, control: true});
        }
        for (const label of [t('euler_circle_graph_mode_label'), t('euler_circle_graph_velocity_label'), t('euler_circle_graph_acceleration_label')]) expect({label, control: screen.queryAllByLabelText(label).length > 0}).toEqual({label, control: true});
        toggleVelocity();
        const withVelocity = [...document.querySelectorAll('[data-readout] dt')].map(node => node.textContent ?? '');
        for (const key of ['euler_circle_graph_r_velocity', 'euler_circle_graph_r_speed', 'euler_circle_graph_r_between'] as const) expect({key, shown: withVelocity.includes(t(key))}).toEqual({key, shown: true});
    });
});

// ---- part B: every quoted number, recomputed independently of the graph ----------------------------------------------------------------

/** A quote: its value and the decimals the text prints. */
interface Quote { readonly value: number; readonly digits: number }
const Q = (value: number, digits = 3): Quote => ({value, digits});
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

const stepTexts = (id: string, language: Language): string[] => {
    const step = complexEulerLesson.steps.find(candidate => candidate.id === id)!;
    const formulas = complexEulerLesson.formulaBlocks.filter(block => step.formulaIds.includes(block.id));
    return [step.title, step.purpose, step.explanation, step.observationPrompt, step.scene!.expectedState, ...step.expectedObservations, ...formulas.flatMap(block => [block.notation, block.explanation])].map(entry => entry[language]);
};

const SQRT2 = Math.SQRT2;
const SQRT3 = Math.sqrt(3);
const pointAt = (degrees: number): C => [Math.cos(radians(degrees)), Math.sin(radians(degrees))];
const S3 = partialSum(Math.PI, 3);
const S5 = partialSum(Math.PI, 5);
const S9 = partialSum(Math.PI, 9);
const S13 = partialSum(Math.PI, 13);
const S21 = partialSum(Math.PI, 21);
const away = (sum: C) => Math.hypot(sum[0] + 1, sum[1]);
/** The mantissa of the distance written as m·10^-11. */
const mantissa = away(S21) * 1e11;
const product75 = pointAt(75);

interface Spec { readonly id: string; readonly quotes: readonly Quote[]; readonly extra?: readonly string[] }
/** The decimals a step may show besides its quotes (written in the English form). */
const SPECS: readonly Spec[] = [
    {id: 'm7-circle', quotes: []},
    {id: 'm7-uniform-motion', quotes: [Q(Math.PI / 2), Q(2 * Math.PI), Q(Math.PI / 4), Q(Math.PI), Q(Math.PI / 8)]},
    {id: 'm7-velocity', quotes: [Q(SQRT3, 7)]},
    {id: 'm7-acceleration', quotes: []},
    {id: 'm7-product', quotes: [Q(product75[0], 6), Q(product75[1], 7)]},
    {id: 'm7-series', quotes: [Q(Math.PI, 4), Q(Math.hypot(2, Math.PI), 2), Q(S3[0], 4), Q(S3[1], 4), Q(away(S3), 2), Q(S5[0], 4), Q(S5[1], 4), Q(away(S5), 2), Q(S9[0], 4), Q(S9[1], 4), Q(away(S9), 3), Q(S13[0], 4), Q(away(S13), 6), Q(mantissa, 2)]},
    {id: 'm7-explore', quotes: [Q((2 * Math.PI) / 3)]},
];

describe.each(LANGUAGES)('M7 quoted numbers in %s', language => {
    test.each(SPECS.map(spec => [spec.id, spec] as const))('%s: every quote is recomputed and appears, rounded ones are hedged, nothing else has decimals', (_id, spec) => {
        const text = stepTexts(spec.id, language).join(' ');
        const missing = spec.quotes.filter(quote => !numberPattern(quoteText(quote, language)).test(prose(text))).map(quote => quoteText(quote, language));
        expect({id: spec.id, missing}).toEqual({id: spec.id, missing: []});
        const unhedged = spec.quotes.filter(quote => isRounded(quote) && !hedged(text, quoteText(quote, language))).map(quote => quoteText(quote, 'sl'));
        expect({id: spec.id, unhedged}).toEqual({id: spec.id, unhedged: []});
        if (language === 'sl') expect({id: spec.id, english: decimalsIn(text)}).toEqual({id: spec.id, english: []});
        else {
            const allowed = new Set([...spec.quotes.map(quote => quoteText(quote, 'en')), ...(spec.extra ?? [])]);
            expect({id: spec.id, unaccounted: decimalsIn(text).filter(value => !allowed.has(value))}).toEqual({id: spec.id, unaccounted: []});
        }
    });

    test('the series distance 7,64·10⁻¹¹ is printed as a mantissa times a power of ten', () => {
        const text = prose(stepTexts('m7-series', language).join(' '));
        expect(text).toContain(`${language === 'sl' ? '7,64' : '7.64'}\\cdot10^{-11}`);
        expect(Math.round(mantissa * 100) / 100).toBe(7.64);
        expect(away(S21)).toBeLessThan(1e-10);
    });
});

test('points: exact axis points and (sqrt 3 / 2; 1/2), (sqrt 2 / 2; sqrt 2 / 2) from Math.cos and Math.sin', () => {
    for (const [degrees, x, y] of [[0, 1, 0], [90, 0, 1], [180, -1, 0], [270, 0, -1], [360, 1, 0]] as const) {
        const [px, py] = pointAt(degrees);
        expect([Math.abs(px - x) < 1e-15, Math.abs(py - y) < 1e-15]).toEqual([true, true]);
        expect(px * px + py * py).toBeCloseTo(1, 15);
    }
    expect(pointAt(30)[0]).toBeCloseTo(SQRT3 / 2, 15);
    expect(pointAt(30)[1]).toBeCloseTo(0.5, 15);
    expect(pointAt(45)[0]).toBeCloseTo(SQRT2 / 2, 15);
    expect(pointAt(45)[1]).toBeCloseTo(SQRT2 / 2, 15);
    expect(SQRT3 / 2).toBeCloseTo(0.8660254, 7);
    // counterclockwise: the angle grows from the positive real axis towards the positive imaginary axis
    expect(pointAt(90)[1] > pointAt(45)[1] && pointAt(45)[1] > pointAt(0)[1]).toBe(true);
});

test('time, period and speed: t = theta / omega, T = 2 pi / omega, the arc length omega t', () => {
    const rows: readonly (readonly [number, number, number, number])[] = [[90, 1, Math.PI / 2, 2 * Math.PI], [90, 2, Math.PI / 4, Math.PI], [90, 4, Math.PI / 8, Math.PI / 2], [30, 2, Math.PI / 12, Math.PI], [45, 3, Math.PI / 12, (2 * Math.PI) / 3]];
    for (const [degrees, omega, time, period] of rows) {
        expect(radians(degrees) / omega).toBeCloseTo(time, 14);
        expect((2 * Math.PI) / omega).toBeCloseTo(period, 14);
        // after the time t = theta / omega the point has covered the arc theta = omega t; after one period it is back at 1
        expect(omega * time).toBeCloseTo(radians(degrees), 14);
        const back = [Math.cos(omega * period), Math.sin(omega * period)];
        expect([Math.abs(back[0] - 1) < 1e-14, Math.abs(back[1]) < 1e-14]).toEqual([true, true]);
    }
    expect([Math.PI / 2, 2 * Math.PI, Math.PI / 4, Math.PI, Math.PI / 8, (2 * Math.PI) / 3].map(value => Number(value.toFixed(3)))).toEqual([1.571, 6.283, 0.785, 3.142, 0.393, 2.094]);
});

test('velocity i omega z and acceleration -omega^2 z against the derivatives of z(t) = e^(i omega t)', () => {
    const z = (omega: number, time: number): C => [Math.cos(omega * time), Math.sin(omega * time)];
    const h = 1e-4;
    for (const [omega, degrees] of [[2, 30], [2, 90], [1, 45], [4, 200]] as const) {
        const t0 = radians(degrees) / omega;
        const [zx, zy] = z(omega, t0);
        const velocity: C = [(z(omega, t0 + h)[0] - z(omega, t0 - h)[0]) / (2 * h), (z(omega, t0 + h)[1] - z(omega, t0 - h)[1]) / (2 * h)];
        const acceleration: C = [(z(omega, t0 + h)[0] - 2 * zx + z(omega, t0 - h)[0]) / (h * h), (z(omega, t0 + h)[1] - 2 * zy + z(omega, t0 - h)[1]) / (h * h)];
        // i omega z = omega (-sin, cos); -omega^2 z; the speed omega; the velocity is perpendicular to the position (dot product 0)
        expect(velocity[0]).toBeCloseTo(-omega * zy, 6);
        expect(velocity[1]).toBeCloseTo(omega * zx, 6);
        expect(Math.hypot(...velocity)).toBeCloseTo(omega, 6);
        expect(velocity[0] * zx + velocity[1] * zy).toBeCloseTo(0, 6);
        expect(acceleration[0]).toBeCloseTo(-(omega ** 2) * zx, 3);
        expect(acceleration[1]).toBeCloseTo(-(omega ** 2) * zy, 3);
        expect(Math.hypot(...acceleration)).toBeCloseTo(omega ** 2, 3);
    }
    // the values the text quotes: step 3 at theta 30 degrees, omega 2: 2i (sqrt3/2 + i/2) = -1 + sqrt3 i; step 4 at z = i: velocity -2, acceleration -4i
    const [x, y] = pointAt(30);
    expect([-2 * y, 2 * x]).toEqual([expect.closeTo(-1, 15), expect.closeTo(SQRT3, 15)]);
    expect(Math.hypot(-2 * y, 2 * x)).toBeCloseTo(2, 15);
    const [i0, i1] = pointAt(90);
    expect([-2 * i1, 2 * i0]).toEqual([expect.closeTo(-2, 14), expect.closeTo(0, 14)]);
    expect([-4 * i0, -4 * i1]).toEqual([expect.closeTo(0, 14), expect.closeTo(-4, 14)]);
    expect(Math.hypot(-4 * i0, -4 * i1)).toBeCloseTo(4, 14);
    expect(Number(SQRT3.toFixed(7))).toBe(1.7320508);
});

test('the product: the angles add, by complex multiplication of the two points', () => {
    const multiply = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    const rows: readonly (readonly [number, number, number])[] = [[30, 45, 75], [90, 90, 180], [30, 330, 360]];
    for (const [first, second, total] of rows) {
        expect(first + second).toBe(total);
        const product = multiply(pointAt(first), pointAt(second));
        const [x, y] = pointAt(total);
        expect(product[0]).toBeCloseTo(x, 14);
        expect(product[1]).toBeCloseTo(y, 14);
    }
    const [x, y] = multiply(pointAt(30), pointAt(45));
    expect([Number(x.toFixed(6)), Number(y.toFixed(7))]).toEqual([0.258819, 0.9659258]);
    expect(multiply(pointAt(90), pointAt(90))[0]).toBeCloseTo(-1, 15);
    expect(Math.abs(multiply(pointAt(90), pointAt(90))[1])).toBeLessThan(1e-15);
    expect(multiply(pointAt(30), pointAt(330))[0]).toBeCloseTo(1, 14);
    expect(Math.abs(multiply(pointAt(30), pointAt(330))[1])).toBeLessThan(1e-14);
});

test('the partial sums at theta = 180 degrees by the term recurrence: S1 = 1 + i pi, the rest approach -1', () => {
    expect(partialSum(Math.PI, 1)).toEqual([1, Math.PI]);
    const near = (value: number, want: number, digits: number) => expect(Number(value.toFixed(digits))).toBe(want);
    near(S3[0], -3.9348, 4); near(S3[1], -2.0261, 4);
    near(S5[0], 0.1239, 4); near(S5[1], 0.524, 4);
    near(S9[0], -0.976, 4); near(S9[1], 0.0069, 4);
    near(S13[0], -0.9999, 4);
    near(S21[0], -1, 4);
    near(Math.hypot(2, Math.PI), 3.72, 2);
    near(away(S3), 3.57, 2);
    near(away(S5), 1.24, 2);
    near(away(S9), 0.025, 3);
    near(away(S13), 0.000103, 6);
    // the distances from -1 shrink from N = 5 on and the series converges to cos pi + i sin pi = -1
    const distances = [5, 9, 13, 21].map(degree => away(partialSum(Math.PI, degree)));
    expect(distances.every((value, i) => i === 0 || value < distances[i - 1])).toBe(true);
    expect(away(partialSum(Math.PI, 40))).toBeLessThan(1e-13);
    // the real parts are the Taylor sums of cosine: sum of (-1)^k pi^(2k) / (2k)!
    const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
    const cosine = Array.from({length: 11}, (_, k) => ((-1) ** k * Math.PI ** (2 * k)) / factorial(2 * k)).reduce((a, b) => a + b, 0);
    expect(partialSum(Math.PI, 21)[0]).toBeCloseTo(cosine, 12);
});
