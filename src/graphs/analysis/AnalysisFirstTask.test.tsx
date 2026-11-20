/**
 * First task leads the Edit panel on the analysis routes (graph-control first use, batch 2): on a fresh desktop visit each route's
 * own first task is the first control of `#inspector-edit`, ahead of the setup the plan groups after it.
 */
import {within} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../allGraphFactories';
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {t} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const FOCUSABLE = 'button, input, select, textarea, [role="slider"], [role="combobox"], [role="switch"], [role="checkbox"]';

type Find = (root: HTMLElement) => HTMLElement;
const button = (name: string): Find => root => within(root).getByRole('button', {name});
const labelled = (label: string): Find => root => within(root).getAllByLabelText(label)[0];

interface Route {lead: Find; later: Find[]}
const routes: Record<string, Route> = {
    'bisection': {lead: button(t('next_step')), later: [labelled(t('bisection_example_label')), labelled(t('bisection_a_label'))]},
    'euler-method': {lead: button(t('next_step')), later: [labelled(t('euler_ode_example_label')), labelled(t('euler_ode_end_label'))]},
    'mean-value': {lead: labelled(t('mean_value_c_label')), later: [labelled(t('mean_value_example_label')), labelled(t('mean_value_a_label'))]},
    'darboux': {lead: labelled(t('darboux_n_label')), later: [labelled(t('darboux_example_label')), labelled(t('darboux_a_label'))]},
    'taylor': {lead: labelled(t('taylor_degree_label')), later: [labelled(t('taylor_example_label')), labelled(t('taylor_center_label'))]},
    'sequence': {lead: labelled(t('sequence_epsilon_label')), later: [labelled(t('sequence_example_label'))]},
    'uniform-convergence': {lead: labelled(t('uniform_x_label')), later: [labelled(t('uniform_example_label')), labelled(t('uniform_r_label'))]},
    'fixed-point': {lead: button(t('next_step')), later: [labelled(t('fixed_point_example_label')), labelled(t('fixed_point_x0_label'))]},
    'recursion-cobweb': {lead: button(t('next_step')), later: [labelled(t('recursion_graph_map_label')), labelled(t('recursion_graph_x_label'))]},
    'solids': {lead: labelled(t('solids_graph_offset')), later: [labelled(t('solids_graph_mode')), labelled(t('solids_graph_solid'))]},
    'contour-map': {lead: labelled(t('levelsets_graph_level')), later: [labelled(t('levelsets_graph_mode')), labelled(t('levelsets_graph_fn'))]},
    'linear-program': {lead: labelled(t('levelsets_graph_lp_objective_p')), later: [labelled(t('levelsets_graph_lp_count'))]},
};

describe.each(Object.keys(routes))('%s first task', id => {
    test('the first task is the first Edit control, before its setup', () => {
        mountGraph(graphFactories[id as keyof typeof graphFactories]());
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const {lead, later} = routes[id];
        const found = lead(root);
        const controls = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
        // A composite control (a count setter) is found by its group; its own first control is the anchor.
        const first = controls.includes(found) ? found : found.querySelector<HTMLElement>(FOCUSABLE) ?? found;
        const group = first.closest('.inspector-group, .tools') ?? first.parentElement!;
        // Nothing unrelated ahead of it: whatever precedes the control belongs to the same group (its own field or steppers).
        for (const control of controls.slice(0, controls.indexOf(first))) expect(group.contains(control)).toBe(true);
        for (const find of later) {
            expect(first.compareDocumentPosition(find(root)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
    });
});
