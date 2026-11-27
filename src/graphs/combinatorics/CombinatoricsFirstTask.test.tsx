/**
 * Combinatorics routes, first task first (graph-control first use, batch 2): the view chooser stays first, the route's own
 * inputs follow it directly and the example chooser is last.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {LatticePathGraph} from './LatticePathGraph';
import {CountingTreeGraph} from './CountingTreeGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

/** The Edit panel's controls in document order, by accessible name. */
const editControls = (): string[] => {
    const edit = document.querySelector('#inspector-edit')!;
    return [...edit.querySelectorAll('input:not([type="hidden"]), select, button, [role="slider"]')].map(element => {
        const labelled = element.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
        const action = element.getAttribute('data-action'); if (action) return 'action:' + action;
        return element.getAttribute('aria-label') ?? labelled ?? (element.id && document.querySelector(`label[for="${element.id}"]`)?.textContent) ?? element.textContent ?? '';
    });
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it, in order. */
const checkOrder = (graph: BaseGraph<BaseGraphState>, first: Label, later: Label[]) => {
    mountGraph(graph);
    const names = editControls();
    const at = (label: Label) => names.findIndex(name => name.startsWith(label()));
    expect(at(first)).toBe(0);
    expect(at(later[0]), 'the task inputs follow the view chooser directly').toBe(1);
    expect(names.length - 1, 'the example chooser is last').toBe(at(later[later.length - 1]));
    let previous = 0;
    for (const label of later) {
        const index = at(label);
        expect(index, label()).toBeGreaterThan(previous);
        previous = index;
    }
};

const plan: Record<string, {make: () => BaseGraph<BaseGraphState>; first: Label; later: Label[]}> = {
    'lattice-paths': {make: () => new LatticePathGraph(), first: () => t('combinatorics_view_label'),
        later: [() => 'T, a', () => 'T, b', () => t('combinatorics_lattice_route_label'), () => t('combinatorics_lattice_page_label'), () => t('combinatorics_example_label')]},
    // The view chooser leads in every view; n, k and the two switches of the counting tree are pucks on the strip, so only the example follows it.
    counting: {make: () => new CountingTreeGraph(), first: () => t('combinatorics_view_label'),
        later: [() => t('combinatorics_example_label')]},
};

describe('counting: the lesson controls are pucks, not Edit controls', () => {
    test('n, k and the two switches sit on the puck strip and are absent from the Edit panel', async () => {
        mountGraph(new CountingTreeGraph());
        await waitForPucks('counting-n');
        for (const key of ['counting-n', 'counting-k', 'ordered', 'repetition']) {
            expect(document.querySelector(`.puck-strip [data-puck-key="${key}"]`), key).not.toBeNull();
            expect(document.querySelector(`#inspector-edit [data-puck-key="${key}"]`), key).toBeNull();
        }
        const edit = editControls();
        for (const label of ['combinatorics_counting_n_label', 'combinatorics_counting_k_label', 'combinatorics_counting_ordered', 'combinatorics_counting_repetition'] as const) {
            expect(edit.filter(name => name.startsWith(t(label))), label).toEqual([]);
        }
    });
});

describe.each(Object.keys(plan))('%s', key => {
    test('the first task leads the Edit panel', () => {
        checkOrder(plan[key].make(), plan[key].first, plan[key].later);
    });
});
