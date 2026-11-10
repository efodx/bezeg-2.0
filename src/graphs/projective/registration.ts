import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the projective conics family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson
 * provider or localization value, so the home page and catalog can read it without loading the family. Executable surfaces
 * live in `runtime.ts`, which this file never imports; preset collections live in `collections.ts`.
 */
export const projectiveFamilyId = 'projective';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them last. */
export const projectiveDemonstrationRows = [
    {id: 'projective-cross-ratio', path: '/bezeg-2.0/projective/cross-ratio', family: 'projective', title: 'projective_cross_ratio_title', prompts: ['prompt_projective_cross_ratio_preserved', 'prompt_projective_cross_ratio_infinity']},
    {id: 'projective-pascal', path: '/bezeg-2.0/projective/pascal', family: 'projective', title: 'projective_pascal_title', prompts: ['prompt_projective_pascal_collinear', 'prompt_projective_pascal_degenerate']},
    {id: 'projective-pole-polar', path: '/bezeg-2.0/projective/pole-polar', family: 'projective', title: 'projective_pole_polar_title', prompts: ['prompt_projective_pole_polar_tangents', 'prompt_projective_pole_polar_infinity']},
    {id: 'projective-five-point', path: '/bezeg-2.0/projective/five-point', family: 'projective', title: 'projective_five_point_title', prompts: ['prompt_projective_five_point_unique', 'prompt_compare']},
    {id: 'projective-three-views', path: '/bezeg-2.0/projective/three-views', family: 'projective', title: 'projective_three_views_title', prompts: ['prompt_projective_three_views_type', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type ProjectiveDemonstrationId = typeof projectiveDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const projectiveCollectionKeys = {
    'projective-cross-ratio': 'projective-cross-ratio',
    'projective-pascal': 'projective-pascal',
    'projective-pole-polar': 'projective-pole-polar',
    'projective-five-point': 'projective-five-point',
    'projective-three-views': 'projective-three-views',
} as const satisfies Record<ProjectiveDemonstrationId, string>;
