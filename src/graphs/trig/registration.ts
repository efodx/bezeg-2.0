import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the trigonometry family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson
 * provider or localization value, so the home page and catalog can read it without loading the family. Executable surfaces
 * live in `runtime.ts`, which this file never imports; preset collections live in `collections.ts`.
 * The rows ship without a guided lesson (`lesson: false`) until the trigonometry lessons land (families-prep F3).
 */
export const trigFamilyId = 'trigonometry';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the projective rows. */
export const trigDemonstrationRows = [
    {id: 'unit-circle', path: '/bezeg-2.0/functions/unit-circle', family: '/bezeg-2.0/functions', title: 'unit_circle_title', prompts: ['unit_circle_prompt', 'prompt_compare'], lesson: false},
    {id: 'triangle-solver', path: '/bezeg-2.0/triangle-solver', family: 'plane-geometry', title: 'triangle_solver_title', prompts: ['triangle_solver_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type TrigDemonstrationId = typeof trigDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const trigCollectionKeys = {
    'unit-circle': 'unit-circle',
    'triangle-solver': 'triangle-solver',
} as const satisfies Record<TrigDemonstrationId, string>;
