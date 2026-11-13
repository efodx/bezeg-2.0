import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the dynamics rows of the analysis family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. Both rows have guided lessons, chapter-owned by the phase-portraits chapter (phase-portrait: PP1, PP2; logistic-map: PP4, PP5).
 */
export const dynamicsFamilyId = 'dynamics';

/** The Demonstration rows, in catalog order; `demonstrations.ts` places them right after the recursion rows in the analysis family. */
export const dynamicsDemonstrationRows = [
    {id: 'phase-portrait', path: '/bezeg-2.0/analysis/phase-portrait', family: 'analysis', title: 'phase_portrait_title', prompts: ['phase_portrait_prompt', 'prompt_compare']},
    {id: 'logistic-map', path: '/bezeg-2.0/analysis/logistic-map', family: 'analysis', title: 'logistic_map_title', prompts: ['logistic_map_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type DynamicsDemonstrationId = typeof dynamicsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const dynamicsCollectionKeys = {
    'phase-portrait': 'phase-portrait',
    'logistic-map': 'logistic-map',
} as const satisfies Record<DynamicsDemonstrationId, string>;
