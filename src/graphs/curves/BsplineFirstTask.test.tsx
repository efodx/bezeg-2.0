/**
 * B-spline routes, first task first (graph-control first use, batch 2): the route's own first task is the first control of the Edit
 * panel on a fresh visit; the controls the plan places after it follow.
 */
import {installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import BSplineBasisGraph from './bspline/BSplineBasisGraph';
import DeBoorGraph from './bspline/DeBoorGraph';
import BSplineInsertionGraph from './bspline/BSplineInsertionGraph';
import BSplineBlossomGraph from './bspline/BSplineBlossomGraph';
import BSplineExtractionGraph from './bspline/BSplineExtractionGraph';
import {curvePointName} from '../base/CurvePointControls';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

const routes: Record<string, () => BaseGraph<BaseGraphState>> = {
    basis: () => new BSplineBasisGraph(),
    deboor: () => new DeBoorGraph(),
    insertion: () => new BSplineInsertionGraph(),
    blossom: () => new BSplineBlossomGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    basis: {first: () => t('bsb_normalize'), later: [() => t('bsb_knot_name', {value0: 0})]},
    deboor: {first: () => 'action:next', later: [() => t('decrease_count')]},
    insertion: {first: () => t('bsi_insert_value'), later: [() => t('bsi_example')]},
    blossom: {first: () => t('bsl_arg', {value0: 'a'}), later: [() => t('bsl_segment'), () => t('decrease_count')]},
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

/** The puck strip's parameters in order, by key. */
const puckOrder = (): string[] => [...document.querySelectorAll('.puck-strip [data-puck-key]')].map(element => element.getAttribute('data-puck-key')!);

describe.each(Object.keys(routes))('%s', key => {
    test('the first task leads the Edit panel', async () => {
        mountGraph(routes[key]());
        if (key === 'blossom') {
            // the arguments a, b, c and the segment choice are board pucks: they live on the puck strip, not in Edit; the degree count leads Edit
            await waitForPucks('blossom-a');
            const order = puckOrder();
            expect(order.indexOf('blossom-a'), order.join(' | ')).toBe(0);
            expect(order.indexOf('blossom-segment'), order.join(' | ')).toBeGreaterThan(0);
            const edit = editControls();
            expect(edit.findIndex(name => name.startsWith(t('bsl_arg', {value0: 'a'}))), edit.join(' | ')).toBe(-1);
            expect(edit.findIndex(name => name.startsWith(t('bsl_segment'))), edit.join(' | ')).toBe(-1);
            expect(edit.findIndex(name => name.startsWith(t('decrease_count'))), edit.join(' | ')).toBe(0);
            return;
        }
        const names = editControls();
        if (key === 'basis') {
            // t, the degree and the clamped switch are board pucks: they live on the puck strip, not in Edit; the display toggle leads Edit
            await waitForPucks('basis-t');
            expect(puckOrder(), puckOrder().join(' | ')).toEqual(expect.arrayContaining(['basis-t', 'basis-degree', 'clamped']));
            for (const label of [() => t('bsb_slider_t'), () => t('decrease_count'), () => t('bsb_clamped')]) expect(names.findIndex(name => name.startsWith(label())), names.join(' | ')).toBe(-1);
        }
        if (key === 'deboor') {
            // the parameter t is a board puck: it lives on the puck strip, not in Edit; the playback buttons still lead Edit
            await waitForPucks('deboor-t');
            expect(puckOrder(), puckOrder().join(' | ')).toContain('deboor-t');
            expect(names.findIndex(name => name.startsWith(t('bsb_slider_t'))), names.join(' | ')).toBe(-1);
        }
        const at = (label: Label) => names.findIndex(name => name.startsWith(label()));
        const {first, later} = plan[key];
        expect(at(first), names.join(' | ')).toBe(0);
        for (const label of later) expect(at(label), label()).toBeGreaterThan(0);
    });
});

describe('extraction: exact point entry follows the first task', () => {
    test('the point entry comes before the example choice, the help-free groups and the knot editor', () => {
        mountGraph(new BSplineExtractionGraph());
        const names = editControls();
        const at = (label: string) => names.findIndex(name => name.startsWith(label));
        const point = at(curvePointName(undefined, 0));
        expect(point, names.join(' | ')).toBeGreaterThanOrEqual(0);
        expect(point, names.join(' | ')).toBeLessThan(at(t('bse_example')));
    });
});
