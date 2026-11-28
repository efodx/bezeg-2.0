/**
 * Plane-geometry routes, first task first (graph-control first use, batch 2): each changed route's own first task is the first control of the
 * Edit panel on a fresh visit; the controls the plan places after it follow.
 */
import {installBoardShims, mountGraph, puckControl, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import {InscribedAngleGraph} from './InscribedAngleGraph';
import {SimsonLineGraph} from './SimsonLineGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';
import {allGraphFactories} from '../allGraphFactories';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

const routes: Record<string, () => BaseGraph<BaseGraphState>> = {
    'inscribed-angle': () => new InscribedAngleGraph(),
    'simson-line': () => new SimsonLineGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    // The glider moved to the puck strip on the board; the example select now leads the Edit panel.
    'inscribed-angle': {first: () => t('inscribed_example_label'), later: []},
    'simson-line': {first: () => t('simson_example_label'), later: [() => t('simson_mode_label')]},
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

describe('inscribed-angle glider', () => {
    test('the first task is a puck on the board strip, not a control of the Edit panel', async () => {
        mountGraph(new InscribedAngleGraph());
        await waitForPucks('inscribed-t');
        expect(puckControl('inscribed-t').getAttribute('aria-label')).toMatch(/^Lega točke P/);
        expect(document.querySelector('#inspector-edit [data-inscribed-t]')).toBeNull();
    });
});

describe('simson-line glider', () => {
    test('the first task is a puck on the board strip, not a control of the Edit panel', async () => {
        mountGraph(new SimsonLineGraph());
        await waitForPucks('simson-t');
        expect(puckControl('simson-t').getAttribute('aria-label')).toMatch(/^Lega točke P/);
        expect(document.querySelector('#inspector-edit [data-simson-t]')).toBeNull();
    });
});

/**
 * Exact point entry follows the first task (graph-control first use, batch 4): the first-task group, then the route's exact entry,
 * then the choosers and the rest. Each entry lists label prefixes in the order they must appear.
 */
const exactEntryOrder: Record<string, Label[]> = {
    inversion: [() => t('inversion_radius_label'), () => 'X, x', () => t('inversion_example_label'), () => t('inversion_focus_label')],
};

/**
 * Point-set routes: `pointsFirst` puts the exact point rows before the overlay checkboxes (graph-control first use, batch 4);
 * a route that did not opt in keeps the overlays first. Scoped to `#inspector-edit`.
 */
const follows = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
const editParts = (key: string) => {
    mountGraph(allGraphFactories[key as keyof typeof allGraphFactories]());
    const edit = document.querySelector('#inspector-edit')!;
    const rows = edit.querySelector('.point-list')!;
    const overlay = edit.querySelector('input[type="checkbox"]')!;
    expect(rows, 'point rows').toBeTruthy();
    expect(overlay, 'overlay checkbox').toBeTruthy();
    return {first: edit.querySelector('.inspector-group')!, rows, overlay};
};

describe.each(['triangle-centres', 'euler-line'])('%s point rows', key => {
    test('the first task leads, then the point rows, then the overlays', () => {
        const {first, rows, overlay} = editParts(key);
        expect(follows(first, rows)).toBe(true);
        expect(follows(rows, overlay)).toBe(true);
    });
});

describe.each([['triangle-centres', 'notable'], ['euler-line', 'euler']])('%s control order (D31)', (key, prefix) => {
    test('readouts, point rows, the Primer chooser, then the settings group', () => {
        const {rows, overlay} = editParts(key);
        const edit = document.querySelector('#inspector-edit')!;
        const readouts = edit.querySelector(`[data-${prefix}-state]`)!;
        const primer = edit.querySelector(`[data-${prefix}-example]`)!;
        const settings = overlay.closest('.inspector-group')!;
        expect(primer, 'Primer chooser').toBeTruthy();
        expect(follows(readouts, rows)).toBe(true);
        expect(follows(rows, primer)).toBe(true);
        expect(follows(primer, settings)).toBe(true);
    });
});

describe('convex-hull point rows', () => {
    test('a route that did not opt in keeps the overlays before the point rows', () => {
        const {rows, overlay} = editParts('convex-hull');
        expect(follows(overlay, rows)).toBe(true);
    });
});

describe.each(Object.keys(exactEntryOrder))('%s', key => {
    test('the exact point entry directly follows the first task, before the examples', () => {
        mountGraph(allGraphFactories[key as keyof typeof allGraphFactories]());
        const names = editControls();
        const positions = exactEntryOrder[key].map(label => names.findIndex(name => name.startsWith(label())));
        expect(positions, names.join(' | ')).not.toContain(-1);
        expect(positions, names.join(' | ')).toEqual([...positions].sort((a, b) => a - b));
    });
});
