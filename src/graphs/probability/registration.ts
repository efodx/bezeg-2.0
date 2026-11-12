import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the probability family: the five probability and statistics Demonstrations that `BaseFunctionGraph` draws (spec
 * lesson-authoring-architecture R1, task 06 batch 13). Imports no graph, React, lesson provider or localization value; executable
 * surfaces live in `runtime.ts`, Preset collections in `collections.ts`. The graphs stay in `../functions/`, which they share with
 * the functions and analysis families. The simulation row of the same catalog family is registered by `../random/`.
 */
export const probabilityFamilyId = 'probability';

/**
 * The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them before `randomDemonstrationRows`, so the five
 * still lead the catalog family `/bezeg-2.0/probability` as they did as legacy rows.
 */
export const probabilityDemonstrationRows = [
    {id: 'prob-density', path: '/bezeg-2.0/probability/density', family: '/bezeg-2.0/probability', title: 'prob_density_title', prompts: ['prompt_prob_density', 'prompt_compare']},
    {id: 'prob-binomial-normal', path: '/bezeg-2.0/probability/binomial-normal', family: '/bezeg-2.0/probability', title: 'prob_binomial_title', prompts: ['prompt_prob_binomial_normal', 'prompt_compare']},
    {id: 'prob-clt', path: '/bezeg-2.0/probability/clt', family: '/bezeg-2.0/probability', title: 'prob_clt_title', prompts: ['prompt_prob_clt', 'prompt_compare']},
    {id: 'prob-summary', path: '/bezeg-2.0/probability/summary', family: '/bezeg-2.0/probability', title: 'prob_summary_title', prompts: ['prompt_prob_summary', 'prompt_compare']},
    {id: 'prob-correlation', path: '/bezeg-2.0/probability/correlation', family: '/bezeg-2.0/probability', title: 'prob_correlation_title', prompts: ['prompt_prob_correlation', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type ProbabilityDemonstrationId = typeof probabilityDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); every key equals the id. */
export const probabilityCollectionKeys = {
    'prob-density': 'prob-density',
    'prob-binomial-normal': 'prob-binomial-normal',
    'prob-clt': 'prob-clt',
    'prob-summary': 'prob-summary',
    'prob-correlation': 'prob-correlation',
} as const satisfies Record<ProbabilityDemonstrationId, string>;
