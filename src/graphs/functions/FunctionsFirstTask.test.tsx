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
    'geometric-series': {first: () => t('series_q_label'), later: [() => t('series_a_label'), () => t('series_tolerance_label'), () => t('series_example_label')]},
    conics: {first: () => t('conic_phi_label'), later: [() => t('conic_epsilon_label'), () => t('conic_ell_label'), () => t('conic_example_label')]},
    derivative: {first: () => t('derivative_h_label'), later: [() => t('derivative_function_label'), () => t('derivative_x0_label')]},
    integral: {first: () => t('integral_n_label'), later: [() => t('integral_method_label'), () => t('integral_a_label'), () => t('integral_function_label')]},
    'area-between': {first: () => t('area_a_label'), later: [() => t('area_mode_label')]},
    'arc-length': {first: () => t('arc_n_label'), later: [() => t('arc_a_label'), () => t('arc_b_label')]},
    waves: {first: () => 'action:play-pause', later: [() => t('waves_graph_mode_label'), () => t('waves_graph_a1_sum_label'), () => t('waves_graph_p1_label')]},
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
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.startsWith(label()));
        const {first, later} = plan[key];
        expect(at(first)).toBe(0);
        for (const label of later) expect(at(label), label()).toBeGreaterThan(0);
    });
});
