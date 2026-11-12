import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the B-spline family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value, so the home page and catalog can read it without loading the family. Executable surfaces live in
 * `runtime.ts`, which this file never imports; the shared Preset collection lives in `collections.ts`.
 */
export const bsplineFamilyId = '/bezeg-2.0/bspline';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const bsplineDemonstrationRows = [
    {id: 'bspline-basis', path: '/bezeg-2.0/bspline/basis', family: '/bezeg-2.0/bspline', title: 'bspline_basis_title', prompts: ['prompt_bspline_basis', 'prompt_compare']},
    {id: 'bspline-deboor', path: '/bezeg-2.0/bspline/deboor', family: '/bezeg-2.0/bspline', title: 'bspline_deboor_title', prompts: ['prompt_bspline_deboor', 'prompt_compare']},
    {id: 'bspline-insertion', path: '/bezeg-2.0/bspline/insertion', family: '/bezeg-2.0/bspline', title: 'bspline_insertion_title', prompts: ['prompt_bspline_insertion', 'prompt_compare']},
    {id: 'bspline-extraction', path: '/bezeg-2.0/bspline/extraction', family: '/bezeg-2.0/bspline', title: 'bspline_extraction_title', prompts: ['prompt_bspline_extraction', 'prompt_compare']},
    {id: 'bspline-nurbs', path: '/bezeg-2.0/bspline/nurbs', family: '/bezeg-2.0/bspline', title: 'bspline_nurbs_title', prompts: ['prompt_bspline_nurbs', 'prompt_compare']},
    {id: 'bspline-blossom', path: '/bezeg-2.0/bspline/blossom', family: '/bezeg-2.0/bspline', title: 'bspline_blossom_title', prompts: ['prompt_bspline_blossom', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type BsplineDemonstrationId = typeof bsplineDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract): all six share `bspline-curve`. */
export const bsplineCollectionKeys = {
    'bspline-basis': 'bspline-curve',
    'bspline-deboor': 'bspline-curve',
    'bspline-insertion': 'bspline-curve',
    'bspline-extraction': 'bspline-curve',
    'bspline-nurbs': 'bspline-curve',
    'bspline-blossom': 'bspline-curve',
} as const satisfies Record<BsplineDemonstrationId, string>;
