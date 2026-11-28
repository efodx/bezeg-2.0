/**
 * Probability routes, first task first (graph-control first use, batch 2): each route's own first task is the first control of the
 * Edit panel on a fresh visit; the controls the plan places after it follow, the example chooser among them.
 */
import {within} from '@testing-library/react';
import {installBoardShims, mountGraph, openTools, REAL_GRAPH_TEST_TIMEOUT, waitForPucks} from '../base/realGraphTestHarness';
import {appStorage} from '../../storage/appStorage';
import {setLanguage, t} from '../../localization';
import DensityAreaGraph from './DensityAreaGraph';
import BinomialNormalGraph from './BinomialNormalGraph';
import CltGraph from './CltGraph';
import SummaryStatisticsGraph from './SummaryStatisticsGraph';
import CorrelationGraph from './CorrelationGraph';
import BaseGraph, {BaseGraphState} from '../base/BaseGraph';

// The cards hold formulas; jsdom never loads MathJax, so the layout would wait for it forever and the pucks stay hidden.
vi.mock('../../mathjax/loadMathJax', () => ({typesetMath: () => Promise.resolve(), loadMathJax: () => Promise.resolve({})}));
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
    let previous = 0;
    for (const label of later) {
        const index = at(label);
        expect(index, label()).toBeGreaterThan(previous);
        previous = index;
    }
};

const plan: Record<string, {make: () => BaseGraph<BaseGraphState>; first: Label; later: Label[]}> = {
    // The ends, the mean and the deviation are board pucks (task 08 lane L47): Edit holds the example chooser alone.
    density: {make: () => new DensityAreaGraph(), first: () => t('prob_density_example_label'), later: []},
    // n, p, k and the two switches are board pucks (task 08 lane L47): Edit holds the example chooser alone.
    'binomial-normal': {make: () => new BinomialNormalGraph(), first: () => t('prob_binomial_example_label'), later: []},
    // The first control is the "Add another copy" action of the playback group; n and the distribution function are board pucks (task 08 lane L47).
    clt: {make: () => new CltGraph(), first: () => 'action:next-step',
        later: [() => t('prob_clt_example_label')]},
    summary: {make: () => new SummaryStatisticsGraph(), first: () => t('prob_summary_value_name', {value0: 1}),
        later: [() => 'action:add-value', () => t('prob_summary_example_label')]},
    // The count's own decrease button, then the exact point fields (keyboard entry) directly after it; the two switches are board pucks (task 08 lane L47).
    correlation: {make: () => new CorrelationGraph(), first: () => t('decrease_count'),
        later: [() => t('increase_count'), () => t('prob_correlation_point_name', {value0: 1}), () => t('prob_correlation_example_label')]},
};

describe.each(Object.keys(plan))('%s', key => {
    test('the first task leads the Edit panel', () => {
        checkOrder(plan[key].make(), plan[key].first, plan[key].later);
    });
});

describe('density pucks', () => {
    // The ends a and b, the mean and the deviation are pucks on the board: there once, and not in Orodja, which keeps the example chooser.
    test('a, b, mu and sigma are pucks and Orodja holds no second copy', async () => {
        mountGraph(new DensityAreaGraph());
        await waitForPucks('density-a');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['density-a', 'density-b', 'density-mu', 'density-sigma']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('prob_density_a_label'), t('prob_density_b_label'), t('prob_density_mu_label'), t('prob_density_sigma_label')]) {
            expect(within(root).queryAllByLabelText(label), label).toEqual([]);
        }
    });
});

describe('binomial-normal pucks', () => {
    // n, p and k are range pucks and the correction and the Poisson bars switch pucks: there once, and not in Orodja, which keeps the example chooser.
    test('n, p, k, the correction and the Poisson bars are pucks and Orodja holds no second copy', async () => {
        mountGraph(new BinomialNormalGraph());
        await waitForPucks('binomial-n');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['binomial-n', 'binomial-p', 'binomial-k', 'correction', 'poisson']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('prob_binomial_n_label'), t('prob_binomial_p_label'), t('prob_binomial_k_label'), t('prob_binomial_correction_label'), t('prob_binomial_poisson_label')]) {
            expect(within(root).queryAllByLabelText(label), label).toEqual([]);
        }
        expect(within(root).queryAllByLabelText(t('prob_binomial_example_label')).length).toBeGreaterThan(0);
    });
});

describe('summary pucks', () => {
    // The quartile rule and the kind of deviation are choice pucks, the box plot and the band switch pucks: there once, and not in Orodja, which keeps the values and the example chooser.
    test('the rule, the deviation, the box plot and the band are pucks and Orodja holds no second copy', async () => {
        mountGraph(new SummaryStatisticsGraph());
        await waitForPucks('summary-rule');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['summary-rule', 'summary-sigma', 'box-plot', 'sigma-band']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('prob_summary_rule_label'), t('prob_summary_sigma_label'), t('prob_summary_box_label'), t('prob_summary_band_label')]) {
            expect(within(root).queryAllByLabelText(label), label).toEqual([]);
        }
        expect(within(root).queryAllByLabelText(t('prob_summary_example_label')).length).toBeGreaterThan(0);
    });
});

describe('correlation pucks', () => {
    // The residuals and the line of x on y are switch pucks: there once, and not in Orodja, which keeps the count, the point list and the example chooser.
    test('the residuals and the line of x on y are pucks and Orodja holds no second copy', async () => {
        mountGraph(new CorrelationGraph());
        await waitForPucks('residuals');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['residuals', 'x-on-y']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('prob_correlation_residuals_label'), t('prob_correlation_xony_label')]) {
            expect(within(root).queryAllByLabelText(label), label).toEqual([]);
        }
        expect(within(root).queryAllByLabelText(t('prob_correlation_example_label')).length).toBeGreaterThan(0);
    });
});

describe('clt pucks', () => {
    // n is a count puck and the distribution function a switch puck: there once, and not in Orodja, which keeps the heights and the example chooser.
    test('n and the distribution function are pucks and Orodja holds no second copy', async () => {
        mountGraph(new CltGraph());
        await waitForPucks('clt-n');
        await openTools();
        const root = document.querySelector('#board-card-tools') as HTMLElement;
        const strip = document.querySelector('.puck-strip') as HTMLElement;
        for (const key of ['clt-n', 'cdf']) expect(strip.querySelector(`[data-puck-key="${key}"]`), key).not.toBeNull();
        for (const label of [t('prob_clt_n_label'), t('prob_clt_cdf_label')]) expect(within(root).queryAllByLabelText(label), label).toEqual([]);
        expect(within(root).queryAllByLabelText(t('prob_clt_example_label')).length).toBeGreaterThan(0);
    });
});
