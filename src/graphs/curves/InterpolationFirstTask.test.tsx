/**
 * Interpolation routes, first task first (graph-control first use, batch 2): the route's own first task is the first control of the
 * Edit panel on a fresh visit; the controls the plan places after it follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import RungeInterpolationGraph from '../functions/RungeInterpolationGraph';
import SubdivisionCurveGraph from './subdivisionCurves/SubdivisionCurveGraph';
import InterpolationGraph from './interpolation/InterpolationGraph';
import LeastSquaresGraph from '../functions/LeastSquaresGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

const routes: Record<string, () => BaseGraph<BaseGraphState>> = {
    subdivision: () => new SubdivisionCurveGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    subdivision: {first: () => 'action:next', later: [() => t('subdiv_rule'), () => t('subdiv_closed'), () => t('interp_point_name', {value0: 1})]},
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

describe.each(Object.keys(routes))('%s', key => {
    test('the first task leads the Edit panel', () => {
        mountGraph(routes[key]());
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.startsWith(label()));
        const {first, later} = plan[key];
        expect(at(first), names.join(' | ')).toBe(0);
        for (const label of later) expect(at(label), label()).toBeGreaterThan(0);
    });
});

describe('exact point entry follows the first-task group', () => {
    const at = (names: string[], label: string) => names.findIndex(name => name.startsWith(label));
    const point = () => t('interp_point_name', {value0: 1});

    test('lagrange: comparison toggles, then the points; the parameter rule and position are pucks, not Edit controls', () => {
        mountGraph(new InterpolationGraph());
        const names = editControls();
        expect(at(names, point()), names.join(' | ')).toBeGreaterThanOrEqual(0);
        expect(at(names, t('interp_show_bezier')), names.join(' | ')).toBeLessThan(at(names, point()));
        expect(document.querySelector('[data-puck-strip]'), 'puck strip').not.toBeNull();
        expect(at(names, t('interp_parameter_rule')), names.join(' | ')).toBe(-1);
        expect(at(names, point()), names.join(' | ')).toBeLessThan(at(names, t('interp_show_basis')));
    });

    test('runge: the degree, node rule and function are pucks; the display switches are all that is left in Edit', () => {
        mountGraph(new RungeInterpolationGraph());
        const names = editControls();
        expect(document.querySelector('[data-puck-strip]'), 'puck strip').not.toBeNull();
        for (const label of [t('interp_runge_rule_label'), t('interp_runge_function_label'), t('decrease_count')]) {
            expect(at(names, label), names.join(' | ')).toBe(-1);
        }
        expect(at(names, t('interp_runge_show_error')), names.join(' | ')).toBe(0);
        expect(at(names, t('interp_runge_show_semicircle')), names.join(' | ')).toBe(1);
    });

    test('least squares: the points lead Edit; squares and manual line are declared pucks', () => {
        mountGraph(new LeastSquaresGraph());
        const names = editControls();
        expect(at(names, point()), names.join(' | ')).toBeGreaterThanOrEqual(0);
        expect(document.querySelector('[data-puck-strip]'), 'puck strip').not.toBeNull();
        for (const label of [t('interp_lsq_show_squares'), t('interp_lsq_manual_label')]) {
            expect(at(names, label), names.join(' | ')).toBe(-1);
        }
    });
});
