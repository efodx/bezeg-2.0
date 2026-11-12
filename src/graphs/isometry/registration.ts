import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the isometry family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson
 * provider or localization value, so the home page and catalog can read it without loading the family. Executable surfaces
 * live in `runtime.ts`, which this file never imports; preset collections live in `collections.ts`.
 * The row has its guided lessons (L1, L2, chapter-owned by the isometries chapter).
 */
export const isometryFamilyId = 'isometries';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the line-geometry rows. */
export const isometryDemonstrationRows = [
    {id: 'isometries', path: '/bezeg-2.0/isometries', family: 'maps', title: 'isometry_graph_title', prompts: ['isometry_graph_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type IsometryDemonstrationId = typeof isometryDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const isometryCollectionKeys = {
    'isometries': 'isometries',
} as const satisfies Record<IsometryDemonstrationId, string>;
