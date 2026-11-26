/**
 * Arc-length parametrization, first task first (batch 2): the equal-parameter and equal-length comparison
 * (sample count and the two marker switches) leads the Edit panel; the curve choice and the mover follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {allGraphFactories} from '../allGraphFactories';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;
interface Plan {mount: () => ReturnType<typeof mountGraph>; first: Label; later: Label[]; pucks: Label[]}

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
    'arc-length-param': {mount: () => mountGraph(allGraphFactories['arc-length-param']()), first: () => t('arcparam_equal_t_shown'),
        later: [() => t('arcparam_equal_arc_shown'), () => t('parametric_curve_label')],
        pucks: [() => t('arcparam_pieces_name'), () => t('arcparam_mover_mode')]},
};

describe.each(Object.keys(plan))('%s', key => {
    test('the first task leads the Edit panel', () => {
        plan[key].mount();
        const names = editControls();
        const at = (label: Label) => names.findIndex(name => name.includes(label()));
        expect(at(plan[key].first), names.join(' | ')).toBe(0);
        for (const label of plan[key].later) expect(at(label), label()).toBeGreaterThan(0);
        // The pieces count and the mover mode are declared board pucks: on the puck strip, absent from Edit.
        const strip = document.querySelector('[data-puck-strip]');
        expect(strip, 'puck strip').not.toBeNull();
        for (const label of plan[key].pucks) {
            expect(at(label), names.join(' | ')).toBe(-1);
            expect(strip!.textContent).toContain(label());
        }
    });
});
