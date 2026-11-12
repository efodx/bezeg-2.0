import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the splines family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const splineFamilyId = '/bezeg-2.0/spline';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const splineDemonstrationRows = [
    {id: 'spline-cn', path: '/bezeg-2.0/spline/spline', family: '/bezeg-2.0/spline', title: 'onesided_cn_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-c1', path: '/bezeg-2.0/spline/c1spline', family: '/bezeg-2.0/spline', title: 'symmetric_c1_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-c2', path: '/bezeg-2.0/spline/c2spline', family: '/bezeg-2.0/spline', title: 'symmetric_c2_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-g1', path: '/bezeg-2.0/spline/g1spline', family: '/bezeg-2.0/spline', title: 'onesided_g1_spline', prompts: ['prompt_spline', 'prompt_compare']},
    {id: 'spline-g1-symmetric', path: '/bezeg-2.0/spline/g1-sym-spline', family: '/bezeg-2.0/spline', title: 'symmetric_g1_spline', prompts: ['prompt_spline', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type SplineDemonstrationId = typeof splineDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const splineCollectionKeys = {
    'spline-cn': 'cn-spline',
    'spline-c1': 'c1-spline-graph',
    'spline-c2': 'c2-spline',
    'spline-g1': 'g1-spline-graph',
    'spline-g1-symmetric': 'g1-symmetric-spline-graph',
} as const satisfies Record<SplineDemonstrationId, string>;

/**
 * Explicit primary lesson owners: the `splines` chapter owns no lesson rows, so `chapterOwnerRows()` cannot derive them.
 * No id of this family derives its owner (R-owners).
 */
export const splinePrimaryOwners = {
    'spline-cn': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-c1': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-c2': {chapterId: 'splines', sectionId: 'continuity-levels'},
    'spline-g1': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
    'spline-g1-symmetric': {chapterId: 'splines', sectionId: 'geometric-vs-parametric'},
} as const satisfies Record<SplineDemonstrationId, {chapterId: string; sectionId: string}>;
