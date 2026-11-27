/**
 * Geometry-of-curves routes, first task first (graph-control first use, batch 2): each changed route's own first task is the first
 * control of the Edit panel on a fresh visit; the controls the plan places after it follow.
 */
import {within} from '@testing-library/react';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import CurveCombGraph from './comb/CurveCombGraph';
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
    envelope: () => new CurveEnvelopeGraph(),
    kinematics: () => new KinematicsGraph(),
    descent: () => new DescentGraph(),
};

/** `first` is a label prefix of the first control; `later` are label prefixes of controls the plan places after it. */
const plan: Record<string, {first: Label; later: Label[]}> = {
    // The comb switch and the gain are pucks on the board (task 08): Orodja opens with the count of teeth.
    comb: {first: () => t('comb_count'), later: [() => t('parametric_curve_label')]},
    offset: {first: () => t('offset_distance'), later: [() => t('offset_shown'), () => t('parametric_curve_label')]},
    envelope: {first: () => t('envelope_line_count'), later: [() => t('envelope_lines_shown'), () => t('envelope_parameter_t')]},
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
