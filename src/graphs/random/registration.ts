import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the simulation row of the probability family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The row ships without a guided lesson (`lesson: false`) until the randomness lessons land (families-prep F3).
 */
export const randomFamilyId = 'random';

/** The Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the probability rows. */
export const randomDemonstrationRows = [
    {id: 'prob-simulation', path: '/bezeg-2.0/probability/simulation', family: '/bezeg-2.0/probability', title: 'prob_simulation_title', prompts: ['prob_simulation_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type RandomDemonstrationId = typeof randomDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const randomCollectionKeys = {
    'prob-simulation': 'prob-simulation',
} as const satisfies Record<RandomDemonstrationId, string>;
