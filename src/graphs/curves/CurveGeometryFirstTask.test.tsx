/**
 * Geometry-of-curves routes, first task first (graph-control first use, batch 2): each changed route's own first task is the first
 * control of the Edit panel on a fresh visit; the controls the plan places after it follow.
 */
import {within} from '@testing-library/react';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitForPucks, waitUntil} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import CurveCombGraph from './comb/CurveCombGraph';
import CurvatureBezierCurveGraph from './bezier/CurvatureBezierCurveGraph';
import CurveEvoluteGraph from './bezier/CurveEvoluteGraph';
import CurveOffsetGraph from './offset/CurveOffsetGraph';
import CurveEnvelopeGraph from './envelope/CurveEnvelopeGraph';
import KinematicsGraph from './kinematics/KinematicsGraph';
import DescentGraph from '../mechanics/DescentGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => { appStorage.clear(); setLanguage('sl'); });

type Label = () => string;

const routes: Record<string, () => BaseGraph<BaseGraphState>> = {
    comb: () => new CurveCombGraph(),
    offset: () => new CurveOffsetGraph(),
    evolute: () => new CurveEvoluteGraph(),
    envelope: () => new CurveEnvelopeGraph(),
    kinematics: () => new KinematicsGraph(),
    descent: () => new DescentGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    // The comb switch and the gain are pucks on the board (task 08): Orodja opens with the count of teeth.
    comb: {first: () => t('comb_count'), later: [() => t('parametric_curve_label')]},
    offset: {first: () => t('offset_distance'), later: [() => t('offset_shown'), () => t('parametric_curve_label')]},
    // t is a puck on the board (task 08): Orodja opens with the trace choice.
    evolute: {first: () => t('evolute_trace_label'), later: [() => t('evolute_normal_label')]},
    // The line count, the curve switch and t are pucks on the board (task 08): Orodja opens with the family switch.
    envelope: {first: () => t('envelope_lines_shown'), later: [() => t('envelope_touch_shown')]},
    kinematics: {first: () => 'action:play-pause', later: [() => t('kinematics_graph_time_label'), () => t('kinematics_graph_motion_label')]},
    descent: {first: () => 'action:play-pause', later: [() => t('descent_graph_time_label'), () => t('descent_graph_mode_label')]},
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

describe('curve-comb pucks', () => {
    // The comb switch and the gain are pucks on the board (task 08): there once, and not in Orodja, which keeps the count and the curve choice.
    test('the comb switch and the gain are pucks and Orodja holds no second copy', async () => {
        mountGraph(new CurveCombGraph());
        await waitForPucks('comb-gain');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['comb-shown', 'comb-gain']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('comb_shown')}`))).toEqual([]);
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('comb_gain')}`))).toEqual([]);
        expect(within(root).getAllByLabelText(new RegExp(`^${t('comb_count')}`)).length).toBeGreaterThan(0);
    });
});

describe('curve-curvature pucks', () => {
    // The parameter t is a puck on the board (task 08): there once, and not in Orodja, which keeps the structured point editing.
    test('the parameter t is a puck and Orodja holds no second copy', async () => {
        mountGraph(new CurvatureBezierCurveGraph());
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="curvature-t"]') !== null); // the strip stays hidden without a board layout in this jsdom
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="curvature-t"]')).not.toBeNull();
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('curvature_parameter_t')}`))).toEqual([]);
    });
});

describe('curve-evolute pucks', () => {
    // The parameter t is a puck on the board (task 08): there once, and not in Orodja, which keeps the trace choice and the normal switch.
    test('the parameter t is a puck and Orodja holds no second copy', async () => {
        mountGraph(new CurveEvoluteGraph());
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="curvature-t"]') !== null); // the strip stays hidden without a board layout in this jsdom
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        expect(strip.querySelector('[data-puck-key="curvature-t"]')).not.toBeNull();
        expect(within(root).queryAllByLabelText(new RegExp(`^${t('curvature_parameter_t')}`))).toEqual([]);
        expect(within(root).getAllByLabelText(new RegExp(`^${t('evolute_trace_label')}`)).length).toBeGreaterThan(0);
    });
});

describe('curve-envelope pucks', () => {
    // The line count, the curve switch and t are pucks on the board (task 08): there once, and not in Orodja, which keeps the family and touching-line switches.
    test('the line count, the curve switch and t are pucks and Orodja holds no second copy', async () => {
        mountGraph(new CurveEnvelopeGraph());
        await waitUntil(() => document.querySelector('.puck-strip [data-puck-key="envelope-t"]') !== null); // the strip stays hidden without a board layout in this jsdom
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['envelope-t', 'envelope-lines', 'envelope-curve']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of ['envelope_line_count', 'envelope_curve_shown', 'envelope_parameter_t'] as const) {
            expect(within(root).queryAllByLabelText(new RegExp(`^${t(label)}`)), label).toEqual([]);
        }
        expect(within(root).getAllByLabelText(new RegExp(`^${t('envelope_lines_shown')}`)).length).toBeGreaterThan(0);
    });
});
