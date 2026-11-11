import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the combinatorics family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson
 * provider or localization value, so the home page and catalog can read it without loading the family. Executable surfaces
 * live in `runtime.ts`, which this file never imports; preset collections live in `collections.ts`.
 * The rows ship without a guided lesson (`lesson: false`) until the combinatorics lessons land (families-prep F3).
 */
export const combinatoricsFamilyId = 'combinatorics';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the circle-construction row. */
export const combinatoricsDemonstrationRows = [
    {id: 'lattice-paths', path: '/bezeg-2.0/combinatorics/lattice-paths', family: 'combinatorics', title: 'combinatorics_lattice_title', prompts: ['combinatorics_lattice_prompt', 'prompt_compare'], lesson: false},
    {id: 'counting-tree', path: '/bezeg-2.0/combinatorics/counting', family: 'combinatorics', title: 'combinatorics_counting_title', prompts: ['combinatorics_counting_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type CombinatoricsDemonstrationId = typeof combinatoricsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const combinatoricsCollectionKeys = {
    'lattice-paths': 'lattice-paths',
    'counting-tree': 'counting-tree',
} as const satisfies Record<CombinatoricsDemonstrationId, string>;
