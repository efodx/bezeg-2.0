import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the recursion rows of the analysis family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The rows ship without a guided lesson (`lesson: false`) until the recursion lessons land (families-prep F3).
 */
export const recursionFamilyId = 'recursion';

/** The Demonstration rows, in catalog order; `demonstrations.ts` places them right after `fixed-point` in the analysis family. */
export const recursionDemonstrationRows = [
    {id: 'recursion-cobweb', path: '/bezeg-2.0/analysis/recursion', family: 'analysis', title: 'recursion_cobweb_title', prompts: ['recursion_cobweb_prompt', 'prompt_compare'], lesson: false},
    {id: 'recursion-growth', path: '/bezeg-2.0/analysis/growth', family: 'analysis', title: 'recursion_growth_title', prompts: ['recursion_growth_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type RecursionDemonstrationId = typeof recursionDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const recursionCollectionKeys = {
    'recursion-cobweb': 'recursion-cobweb',
    'recursion-growth': 'recursion-growth',
} as const satisfies Record<RecursionDemonstrationId, string>;
