/**
 * Functions routes, first task first (graph-control first use, batch 2): each route's own first task is the first control of the
 * Edit panel on a fresh visit; the controls the plan places after it follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import FunctionTransformationGraph from './FunctionTransformationGraph';
import RationalFunctionGraph from './RationalFunctionGraph';
import GeometricSeriesGraph from './GeometricSeriesGraph';
import ConicFocalGraph from './ConicFocalGraph';
import DerivativeGraph from './DerivativeGraph';
import DefiniteIntegralGraph from './DefiniteIntegralGraph';
import AreaBetweenCurvesGraph from './AreaBetweenCurvesGraph';
import ArcLengthGraph from './ArcLengthGraph';
import WavesGraph from './WavesGraph';
import FunctionInverseGraph from './FunctionInverseGraph';
import PolynomialZerosGraph from './PolynomialZerosGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

const routes: Record<string, () => BaseGraph<BaseGraphState>> = {
    transformations: () => new FunctionTransformationGraph(),
    'rational-functions': () => new RationalFunctionGraph(),
    'geometric-series': () => new GeometricSeriesGraph(),
    conics: () => new ConicFocalGraph(),
    derivative: () => new DerivativeGraph(),
    integral: () => new DefiniteIntegralGraph(),
    'area-between': () => new AreaBetweenCurvesGraph(),
    'arc-length': () => new ArcLengthGraph(),
    waves: () => new WavesGraph(),
    'function-inverse': () => new FunctionInverseGraph(),
    'polynomial-zeros': () => new PolynomialZerosGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    transformations: {first: () => t('function_transformation_c_label'), later: [() => t('function_transformation_a_label'), () => t('function_transformation_b_label'), () => t('function_transformation_base_label')]},
    'rational-functions': {first: () => t('rational_function_numerator'), later: [() => t('rational_function_k_label'), () => t('rational_function_probe_label'), () => t('rational_function_example_label')]},
    'geometric-series': {first: () => t('series_terms_label'), later: [() => t('series_a_label'), () => t('series_example_label')]},
    conics: {first: () => t('conic_phi_label'), later: [() => t('conic_ell_label'), () => t('conic_example_label')]},
    waves: {first: () => 'action:play-pause', later: [() => t('waves_graph_mode_label')]},
    'function-inverse': {first: () => t('function_inverse_x0_label'), later: [() => 'action:toggle-inverse', () => 'action:toggle-tangent', () => t('function_inverse_restriction_label')]},
    'polynomial-zeros': {first: () => t('zero_list_position_label', {value0: 1}), later: [() => t('zero_list_multiplicity_label', {value0: 1}), () => 'action:add-zero', () => t('polynomial_zeros_example_label'), () => t('polynomial_zeros_k_label'), () => 'action:toggle-derivative']},
};

/** The Edit panel's controls in document order, by accessible name. */
const editControls = (): string[] => {
    const edit = document.querySelector('#inspector-edit')!;
    return [...edit.querySelectorAll('input:not([type="hidden"]), select, button, [role="slider"]')].map(element => {
        const labelled = element.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
        const action = element.getAttribute('data-action'); if (action) return 'action:' + action;
        return element.getAttribute('aria-label') ?? labelled ?? (element.id && document.querySelector(`label[for="${element.id}"]`)?.textContent) ?? element.textContent ?? '';
    });
};

/** The puck strip's parameters in order, by key (a parameter with a puck leaves the Orodja panel, task 05). */
const puckOrder = (): string[] => [...document.querySelectorAll('.puck-strip [data-puck-key]')].map(element => element.getAttribute('data-puck-key')!);

describe.each(Object.keys(routes))('%s', key => {
    test('the first task leads the Edit panel', async () => {
        mountGraph(routes[key]());
        if (key === 'transformations') {
            // c, a and b are pucks: the horizontal shift leads the strip, a and b follow; the base function stays in Edit
            await waitForPucks('transform-c');
            const order = puckOrder();
            expect(order.indexOf('transform-c')).toBe(0);
            for (const param of ['transform-a', 'transform-b']) expect(order.indexOf(param), param).toBeGreaterThan(0);
            const names = editControls();
            expect(names.some(name => name.startsWith(t('function_transformation_base_label')))).toBe(true);
            for (const label of [t('function_transformation_c_label'), t('function_transformation_a_label'), t('function_transformation_b_label')]) {
                expect(names.some(name => name.startsWith(label)), label).toBe(false);
            }
            return;
        }
        if (key === 'function-inverse') {
            // x0 is a board puck: it lives on the puck strip, not in Edit; the inverse and tangent toggles are pucks too, the restriction stays in Edit
            await waitForPucks('inverse-x0');
            const order = puckOrder();
            expect(order.indexOf('inverse-x0'), order.join(' | ')).toBe(0);
            const names = editControls();
            expect(names.some(name => name.startsWith(t('function_inverse_x0_label'))), names.join(' | ')).toBe(false);
            expect(names.some(name => name.startsWith(t('function_inverse_restriction_label'))), names.join(' | ')).toBe(true);
            return;
        }
        if (key === 'area-between' || key === 'arc-length') {
            // every control is a board puck: they lead the puck strip in declaration order and nothing is left in Edit
            const params = key === 'area-between' ? ['a', 'b', 'area-mode'] : ['n', 'a', 'b'];
            await waitForPucks(params[0]);
            expect(puckOrder().slice(0, params.length), puckOrder().join(' | ')).toEqual(params);
            const names = editControls();
            const labels = key === 'area-between' ? [t('area_a_label'), t('area_b_label'), t('area_mode_label')] : [t('arc_n_label'), t('arc_a_label'), t('arc_b_label')];
            for (const label of labels) expect(names.some(name => name.startsWith(label)), names.join(' | ')).toBe(false);
            return;
        }
        if (key === 'derivative' || key === 'integral') {
            // the step, point and tangent (derivative) or the count, bounds and sum type (integral) are board pucks leading the strip; the function choice stays in Edit
            const params = key === 'derivative' ? ['h', 'x0', 'tangent'] : ['n', 'a', 'b', 'sum-method'];
            await waitForPucks(params[0]);
            expect(puckOrder().slice(0, params.length), puckOrder().join(' | ')).toEqual(params);
            const names = editControls();
            const labels = key === 'derivative' ? [t('derivative_h_label'), t('derivative_x0_label'), t('derivative_show_tangent')]
                : [t('integral_n_label'), t('integral_method_label'), t('integral_a_label'), t('integral_b_label')];
            for (const label of labels) expect(names.some(name => name.startsWith(label)), names.join(' | ')).toBe(false);
            expect(names.some(name => name.startsWith(t(key === 'derivative' ? 'derivative_function_label' : 'integral_function_label'))), names.join(' | ')).toBe(true);
            return;
        }
        if (key === 'geometric-series') {
            // the ratio and the tolerance are board pucks leading the strip; the shown terms lead Edit, then a, playback and the example
            await waitForPucks('series-q');
            expect(puckOrder().slice(0, 2), puckOrder().join(' | ')).toEqual(['series-q', 'series-tolerance']);
            const names = editControls();
            for (const label of [t('series_q_label'), t('series_tolerance_label')]) expect(names.some(name => name.startsWith(label)), names.join(' | ')).toBe(false);
            for (const label of [t('series_terms_label'), t('series_a_label'), t('series_example_label')]) expect(names.some(name => name.startsWith(label)), label).toBe(true);
            return;
        }
        if (key === 'conics') {
            // the eccentricity is a board puck: on the strip, not in Edit; the angle still leads Edit
            await waitForPucks('conic-epsilon');
            expect(puckOrder(), puckOrder().join(' | ')).toContain('conic-epsilon');
            expect(editControls().some(name => name.startsWith(t('conic_epsilon_label')))).toBe(false);
        }
        if (key === 'waves') {
            // the amplitudes, phases and frequency and the phasor switch are board pucks leading the strip; play, pause and the mode stay in Edit
            const params = ['waves-a1', 'waves-p1', 'waves-a2', 'waves-p2', 'waves-f1', 'show-phasors'];
            await waitForPucks(params[0]);
            expect(puckOrder().slice(0, params.length), puckOrder().join(' | ')).toEqual(params);
            const edit = editControls();
            for (const label of [t('waves_graph_a1_sum_label'), t('waves_graph_p1_label'), t('waves_graph_a2_label'), t('waves_graph_p2_label'), t('waves_graph_f_both_label'), t('waves_graph_show_phasors')]) {
                expect(edit.some(name => name.startsWith(label)), edit.join(' | ')).toBe(false);
            }
        }
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.startsWith(label()));
        const {first, later} = plan[key];
        expect(at(first)).toBe(0);
        for (const label of later) expect(at(label), label()).toBeGreaterThan(0);
    });
});
