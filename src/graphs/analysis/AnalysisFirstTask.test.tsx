/**
 * First task leads the Edit panel on the analysis routes (graph-control first use, batch 2): on a fresh desktop visit each route's
 * own first task is the first control of `#inspector-edit`, ahead of the setup the plan groups after it.
 */
import {act, within} from '@testing-library/react';
import {allGraphFactories as graphFactories} from '../allGraphFactories';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {t} from '../../localization';

vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => appStorage.clear());

const FOCUSABLE = 'button, input, select, textarea, [role="slider"], [role="combobox"], [role="switch"], [role="checkbox"]';

type Find = (root: HTMLElement) => HTMLElement;
const button = (name: string): Find => root => within(root).getByRole('button', {name});
const labelled = (label: string): Find => root => within(root).getAllByLabelText(label)[0];

interface Route {lead: Find; later: Find[]}
const routes: Record<string, Route> = {
    'bisection': {lead: button(t('next_step')), later: [labelled(t('bisection_example_label'))]},
    'euler-method': {lead: button(t('next_step')), later: [labelled(t('euler_ode_example_label'))]},
    'mean-value': {lead: labelled(t('mean_value_c_label')), later: [labelled(t('mean_value_example_label')), labelled(t('mean_value_a_label'))]},
    'darboux': {lead: button(t('darboux_refine')), later: [labelled(t('darboux_example_label'))]},
    'sequence': {lead: labelled(t('sequence_example_label')), later: [button(t('next_step'))]},
    'uniform-convergence': {lead: labelled(t('uniform_x_label')), later: [labelled(t('uniform_example_label')), labelled(t('uniform_r_label'))]},
    'fixed-point': {lead: button(t('next_step')), later: [labelled(t('fixed_point_example_label'))]},
    'recursion-cobweb': {lead: button(t('next_step')), later: []},
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

describe('taylor first task', () => {
    // The degree (the first task) and the centre are pucks on the board (task 05): there once, and not in Edit, whose first control is the example.
    test('the degree and the centre are pucks, Edit holds no second copy and leads with the example', async () => {
        mountGraph(graphFactories['taylor']());
        await waitForPucks('taylor-degree');
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        // A puck is named by its bare label followed by its symbol.
        for (const [label, name] of [[t('taylor_degree_label'), `${t('taylor_degree_name')} n`], [t('taylor_center_label'), `${t('taylor_center_name')} c`]]) {
            expect(within(strip).queryAllByRole('spinbutton', {name}).length + within(strip).queryAllByRole('slider', {name}).length).toBeGreaterThan(0);
            expect(within(root).queryAllByLabelText(label)).toEqual([]);
        }
        const first = root.querySelector<HTMLElement>(FOCUSABLE)!;
        const example = labelled(t('taylor_example_label'))(root);
        expect(first === example || example.contains(first) || first.closest('.inspector-group, .tools')?.contains(example)).toBe(true);
    });
});

describe('bisection endpoints', () => {
    // The endpoints a and b are pucks on the board (task 07): there once, and not in Edit, where the first task still leads.
    test('a and b are pucks, Edit holds no second copy', async () => {
        mountGraph(graphFactories['bisection']());
        await waitForPucks('bisect-a');
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const label of [t('bisection_a_label'), t('bisection_b_label')]) {
            expect(within(strip).queryAllByRole('spinbutton', {name: label}).length + within(strip).queryAllByRole('slider', {name: label}).length).toBeGreaterThan(0);
            expect(within(root).queryAllByLabelText(label)).toEqual([]);
        }
    });
});

describe('recursion cobweb setup', () => {
    // The map and the start are pucks on the board (task 08 lane L37): there once, and not in Edit, where the playback button still leads.
    test('the map and the start are pucks, Edit holds no second copy', async () => {
        mountGraph(graphFactories['recursion-cobweb']());
        await waitForPucks('cobweb-map');
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="cobweb-map"] [role="radiogroup"]')).not.toBeNull();
        expect(strip.querySelector('[data-puck-key="cobweb-x"]')).not.toBeNull();
        for (const label of [t('recursion_graph_map_label'), t('recursion_graph_x_label')]) expect(within(root).queryAllByLabelText(label)).toEqual([]);
    });
});

describe('euler step and end', () => {
    // The step (as halvings) and the end x are pucks on the board (task 08): there once, and not in Edit, where the playback button still leads.
    test('the step and the end x are pucks, Edit holds no second copy', async () => {
        mountGraph(graphFactories['euler-method']());
        await waitForPucks('euler-step');
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="euler-step"]')).not.toBeNull();
        expect(strip.querySelector('[data-puck-key="euler-end"]')).not.toBeNull();
        expect(root.querySelector('[data-puck-key="euler-step"], [data-puck-key="euler-end"]')).toBeNull();
        expect(within(root).queryAllByLabelText(t('euler_ode_end_label'))).toEqual([]);
        expect(within(root).queryAllByLabelText(t('euler_ode_step_label'))).toEqual([]);
    });
});

describe('contour-map level and mode', () => {
    // The level c and the mode are pucks on the board (task 08 lane L29): there once, and not in Edit, which keeps the function.
    test('the level and the mode are pucks, Edit holds no second copy and keeps the function', async () => {
        mountGraph(graphFactories['contour-map']());
        await waitForPucks('contour-level');
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="contour-level"]')).not.toBeNull();
        expect(strip.querySelector('[data-puck-key="contour-mode"]')).not.toBeNull();
        expect(root.querySelector('[data-puck-key="contour-level"], [data-puck-key="contour-mode"]')).toBeNull();
        expect(within(root).queryAllByLabelText(t('levelsets_graph_level'))).toEqual([]);
        expect(within(root).queryAllByLabelText(t('levelsets_graph_mode'))).toEqual([]);
        expect(within(root).getAllByLabelText(t('levelsets_graph_fn')).length).toBeGreaterThan(0);
    });
});

describe('solids chooser', () => {
    // The mode/solid chooser leads every mode, so it does not move; in section mode the plane offset is the next control after it.
    test.each(['section', 'revolve', 'volume', 'stack'] as const)('leads the Edit panel in %s mode', mode => {
        const graph = graphFactories['solids']() as unknown as {setMode(mode: string): void};
        mountGraph(graph as never);
        act(() => graph.setMode(mode));
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const controls = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const modeSelect = labelled(t('solids_graph_mode'))(root);
        const solidSelect = labelled(t('solids_graph_solid'))(root);
        expect(controls.slice(0, 2)).toEqual([modeSelect, solidSelect]);
        if (mode === 'section') {
            const offset = labelled(t('solids_graph_offset'))(root);
            // A slider's own value box comes before its handle, so the controls between the chooser and the offset belong to the offset.
            const slider = offset.closest('.slider-field') ?? offset.parentElement!;
            for (const control of controls.slice(2, controls.indexOf(offset))) expect(slider.contains(control)).toBe(true);
            expect(slider.contains(controls[2])).toBe(true);
        }
    });
});

describe('extrema pucks', () => {
    // The endpoints and the classification switch are pucks on the board (task 08): there once, and not in Edit, which keeps the example choice.
    test('a, b and the classification switch are pucks and Edit holds no second copy', async () => {
        mountGraph(graphFactories['extrema']());
        await waitForPucks('show-classification');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['extrema-a', 'extrema-b', 'show-classification']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('extrema_a_label'), t('extrema_b_label')]) expect(within(root).queryAllByLabelText(new RegExp(`^${label}`))).toEqual([]);
        expect(within(root).queryAllByRole('button', {name: t('extrema_show_classification')})).toEqual([]);
        expect(within(root).getAllByLabelText(t('extrema_example_label'))).not.toEqual([]);
    });
});

describe('fixed-point pucks', () => {
    // The start x0 and the error-bound switch are pucks on the board (task 08): there once, and not in Edit, which keeps the example and the
    // playback buttons (the example select is found there first, so the container really holds the graph's controls).
    test('x0 and the error bound are pucks and Edit holds no second copy', async () => {
        mountGraph(graphFactories['fixed-point']());
        await waitForPucks('show-error-bound');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(within(root).getAllByLabelText(t('fixed_point_example_label'))).not.toEqual([]);
        for (const key of ['fixed-point-x0', 'show-error-bound']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        expect(within(root).queryAllByLabelText(t('fixed_point_x0_label'))).toEqual([]);
        expect(within(root).queryAllByRole('button', {name: t('show_error_bound')})).toEqual([]);
        expect(within(root).queryAllByRole('button', {name: t('hide_error_bound')})).toEqual([]);
    });
});

describe('sequence pucks', () => {
    // The band width, the candidate limit, the threshold and the certificate switch are pucks on the board (task 08): there once, and not in
    // Orodja, which keeps the example and the playback buttons (the example select is found there first, so the container really holds the graph's controls).
    test('epsilon, L, N and the certificate are pucks and Orodja holds no second copy', async () => {
        mountGraph(graphFactories['sequence']());
        await waitForPucks('show-certificate');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(within(root).getAllByLabelText(t('sequence_example_label'))).not.toEqual([]);
        for (const key of ['sequence-epsilon', 'sequence-limit', 'sequence-threshold', 'show-certificate']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('sequence_epsilon_label'), t('sequence_limit_label'), t('sequence_threshold_label')]) expect(within(root).queryAllByLabelText(label), label).toEqual([]);
        expect(within(root).queryAllByRole('button', {name: t('sequence_show_certificate')})).toEqual([]);
        expect(within(root).queryAllByRole('button', {name: t('sequence_hide_certificate')})).toEqual([]);
    });
});

describe('darboux pucks', () => {
    // The count, the endpoints and the two sum switches are pucks on the board (task 08): there once, and not in Edit, which leads with Refine.
    test('n, a, b and the sum switches are pucks and Edit holds no second copy', async () => {
        mountGraph(graphFactories['darboux']());
        await waitForPucks('show-upper-sum');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['darboux-n', 'darboux-a', 'darboux-b', 'show-lower-sum', 'show-upper-sum']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('darboux_n_label'), t('darboux_a_label'), t('darboux_b_label')]) expect(within(root).queryAllByLabelText(label)).toEqual([]);
    });
});
