import {chooseOnPuckNow, typePuck} from '../base/realGraphTestHarness';
import {t} from '../../localization';

/**
 * Test helper of the prob-simulation tests: the learner's controls for the run (trials, seeds, the mode's parameters) are pucks on the board,
 * and the tests still name them by the label the Orodja control carried before. `puckKeyOf` is that label's parameter key; `typeControl` types
 * into the puck while the parameter has one on the strip, else into the Orodja field the caller supplies.
 */
export const puckKeyOf = (label: string): string | undefined => ([
    [t('random_graph_n_galton'), 'random-n'],
    [t('random_graph_n_frequency'), 'random-n'],
    [t('random_graph_n_area'), 'random-n'],
    [t('random_graph_n_walk'), 'random-n'],
    [t('random_graph_n_markov'), 'random-n'],
    [t('random_graph_n_interval'), 'random-n'],
    [t('random_graph_seed_label'), 'random-seed'],
    [t('random_graph_seed2_label'), 'random-seed2'],
    [t('random_graph_rows_label'), 'random-rows'],
    [t('random_graph_p_label'), 'random-p'],
    [t('random_graph_steps_label'), 'random-steps'],
    [t('random_graph_a_label'), 'random-a'],
    [t('random_graph_b_label'), 'random-b'],
    [t('random_graph_sample_label'), 'random-sample'],
    [t('random_graph_shape_label'), 'random-shape'],
    [t('random_graph_start_label'), 'random-start'],
] as [string, string][]).find(([text]) => text === label)?.[1];

const onStrip = (key: string): boolean => document.querySelector(`.puck-strip [data-puck-key="${key}"]`) !== null;

export function typeControl(label: string, value: string, fallback: (label: string, value: string) => void): void {
    const key = puckKeyOf(label);
    if (key && onStrip(key)) typePuck(key, value);
    else fallback(label, value);
}

/** Chooses an option of the shape or the starting-state choice (pucks), else through the Orodja select the caller supplies. */
export function chooseControl(label: string, value: string, fallback: (label: string, value: string) => void): void {
    const key = puckKeyOf(label);
    if (key && onStrip(key)) chooseOnPuckNow(key, value);
    else fallback(label, value);
}
