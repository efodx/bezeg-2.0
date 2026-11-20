/**
 * Bezier clipping, first task first (batch 2): Next step leads the Edit panel; the tolerance setup follows.
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
    'bezier-clipping': {mount: () => mountGraph(allGraphFactories['bezier-clipping']()), first: () => 'action:next-step', later: [() => t('bezierclipping_tolerance_label')]},
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
