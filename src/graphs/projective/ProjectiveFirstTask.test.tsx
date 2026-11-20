/**
 * Cross-ratio, first task first (batch 2): the exact entry of the points one moves on the board leads the Edit panel,
 * ahead of the example choice (the live ratios are readouts above them).
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {allGraphFactories} from '../allGraphFactories';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;
interface Plan {mount: () => ReturnType<typeof mountGraph>; first: Label; later: Label[]}

/** The Edit panel's controls in document order, by accessible name. */
const editControls = (): string[] => {
    const edit = document.querySelector('#inspector-edit')!;
    return [...edit.querySelectorAll('input:not([type="hidden"]), select, button, [role="slider"]')].map(element => {
        const labelled = element.getAttribute('aria-labelledby')?.split(' ').map(id => document.getElementById(id)?.textContent).join(' ');
        const action = element.getAttribute('data-action'); if (action) return 'action:' + action;
        return element.getAttribute('aria-label') ?? labelled ?? (element.id && document.querySelector(`label[for="${element.id}"]`)?.textContent) ?? element.textContent ?? '';
    });
};

const plan: Record<string, Plan> = {
    'projective-cross-ratio': {mount: () => mountGraph(allGraphFactories['projective-cross-ratio']()), first: () => t('projective_point_named', {value0: 'A'}),
        later: [() => t('projective_k1_example_label')]},
};

describe.each(Object.keys(plan))('%s', key => {
    test('the first task leads the Edit panel', () => {
        plan[key].mount();
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.includes(label()));
        expect(at(plan[key].first), names.join(' | ')).toBe(0);
        for (const label of plan[key].later) expect(at(label), label()).toBeGreaterThan(0);
    });
});

/**
 * Exact point entry follows the first task (graph-control first use, batch 4): the entry of the points one moves on the board comes
 * before the example and the other choosers. Label fragments in the order they must appear.
 */
const exactEntryOrder: Record<string, Label[]> = {
    'projective-pascal': [() => 'Izberi: A', () => t('projective_k2_example_label'), () => t('projective_k2_conic_label')],
    'projective-pole-polar': [() => t('projective_k3_mode_label'), () => 'P, x', () => t('projective_k3_example_label'), () => t('projective_k3_conic_label')],
    'projective-five-point': [() => 'Točka A, x', () => t('projective_five_point_example_label'), () => t('projective_five_point_end_a')],
};

describe.each(Object.keys(exactEntryOrder))('%s', key => {
    test('the exact point entry directly follows the first task, before the examples', () => {
        mountGraph(allGraphFactories[key as keyof typeof allGraphFactories]());
        const names = editControls();
        const positions = exactEntryOrder[key].map(label => names.findIndex(name => name.includes(label())));
        expect(positions, names.join(' | ')).not.toContain(-1);
        expect(positions, names.join(' | ')).toEqual([...positions].sort((a, b) => a - b));
    });
});
