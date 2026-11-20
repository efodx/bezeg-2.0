/**
 * Maps-of-the-plane routes, first task first (graph-control first use, batch 2): each changed route's own first task is the first control of the
 * Edit panel on a fresh visit; the controls the plan places after it follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {ComplexRootsGraph} from './ComplexRootsGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';
import {allGraphFactories} from '../allGraphFactories';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

const routes: Record<string, () => BaseGraph<BaseGraphState>> = {
    'complex-roots': () => new ComplexRootsGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    'complex-roots': {first: () => 'w, Re', later: [() => t('complex_roots_degree_label'), () => t('complex_roots_example_label')]},
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
        expect(at(first)).toBe(0);
        for (const label of later) expect(at(label), label()).toBeGreaterThan(0);
    });
});

/**
 * Exact point entry follows the first task (graph-control first use, batch 4): the first-task group, then the route's exact entry,
 * then the choosers and the rest. Each entry lists label prefixes in the order they must appear.
 */
const exactEntryOrder: Record<string, Label[]> = {
    'complex-multiplication': [() => 'z, Re', () => 'w, Re', () => t('complex_example_label')],
};

describe.each(Object.keys(exactEntryOrder))('%s', key => {
    test('the exact point entry directly follows the first task, before the examples', () => {
        mountGraph(allGraphFactories[key as keyof typeof allGraphFactories]());
        const names = editControls();
        const positions = exactEntryOrder[key].map(label => names.findIndex(name => name.startsWith(label())));
        expect(positions, names.join(' | ')).not.toContain(-1);
        expect(positions, names.join(' | ')).toEqual([...positions].sort((a, b) => a - b));
    });
});
