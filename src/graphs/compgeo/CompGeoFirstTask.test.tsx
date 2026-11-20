/**
 * First task leads the Edit panel on the computational-geometry routes (graph-control first use, batch 2): on a fresh desktop visit
 * each route's own first task is the first control of `#inspector-edit`, ahead of the setup the plan groups after it.
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
    'hull-robustness': {lead: button(t('next_step')), later: [labelled(t('hullrobust_pop_label')), labelled(t('hullrobust_mode_label'))]},
    'ear-clipping': {lead: button(t('next_step')), later: [labelled(t('earclip_example_group'))]},
    'delaunay': {lead: button(t('next_step')), later: [labelled(t('del_example_group'))]},
    'point-set-triangulation': {lead: labelled(t('tri_edge_select')), later: [button(t('tri_flip')), labelled(t('pointset_overlay_grid'))]},
    'voronoi': {lead: button(t('vor_site_item', {value0: 1})), later: [button(t('vor_construct_next')), button(t('reset_example')), labelled(t('pointset_overlay_grid'))]},
    'voronoi-degenerate': {lead: labelled(t('deg_example_group')), later: [labelled(t('deg_mode_group')), button(t('vor_construct_next')), button(t('reset_example'))]},
};

describe.each(Object.keys(routes))('%s first task', id => {
    test('the first task is the first Edit control, before its setup', () => {
        mountGraph(graphFactories[id as keyof typeof graphFactories]());
        const root = document.querySelector('#inspector-edit') as HTMLElement;
        const {lead, later} = routes[id];
        const found = lead(root);
        const controls = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
        const first = controls.includes(found) ? found : found.querySelector<HTMLElement>(FOCUSABLE) ?? found;
        const group = first.closest('.inspector-group, .tools') ?? first.parentElement!;
        // Nothing unrelated ahead of it: whatever precedes the control belongs to the same group.
        for (const control of controls.slice(0, controls.indexOf(first))) expect(group.contains(control)).toBe(true);
        for (const find of later) {
            expect(first.compareDocumentPosition(find(root)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
    });
});
