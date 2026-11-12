import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the solids row of the analysis family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The row ships without a guided lesson (`lesson: false`) until the solids lessons land (families-prep F3).
 */
export const solidsFamilyId = 'solids';

/** The Demonstration rows, in catalog order; `demonstrations.ts` places them right after the dynamics rows in the analysis family. The main view is orbited. */
export const solidsDemonstrationRows = [
    {id: 'solids', path: '/bezeg-2.0/analysis/solids', family: 'analysis', title: 'solids_title', prompts: ['solids_prompt', 'prompt_compare'], view: 'surface', lesson: false},
] as const satisfies readonly Definition[];

export type SolidsDemonstrationId = typeof solidsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const solidsCollectionKeys = {
    solids: 'solids',
} as const satisfies Record<SolidsDemonstrationId, string>;
