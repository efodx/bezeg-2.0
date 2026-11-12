import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the parameterization family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const parameterizationFamilyId = '/bezeg-2.0/param';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const parameterizationDemonstrationRows = [
    {id: 'spline-parameterization', path: '/bezeg-2.0/param/param/alphaparam2', family: '/bezeg-2.0/param', title: 'parametrizations_233', prompts: ['prompt_parameterization', 'prompt_compare']},
    {id: 'weighted-parameterization', path: '/bezeg-2.0/param/param/alphaparam', family: '/bezeg-2.0/param', title: 'weighted_parametrization_234', prompts: ['prompt_parameterization', 'prompt_compare']},
    {id: 'uniform-parameterization', path: '/bezeg-2.0/param/param/uniform', family: '/bezeg-2.0/param', title: 'uniform_parametrization_235', prompts: ['prompt_parameterization', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type ParameterizationDemonstrationId = typeof parameterizationDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const parameterizationCollectionKeys = {
    'spline-parameterization': 'alfaparametrizacije',
    'weighted-parameterization': 'alpha-param',
    'uniform-parameterization': 'uniform-graph',
} as const satisfies Record<ParameterizationDemonstrationId, string>;

/** Explicit primary lesson owners: the `parametrization` chapter owns no lesson rows, so `chapterOwnerRows()` cannot derive them. */
export const parameterizationPrimaryOwners = {
    'spline-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
    'weighted-parameterization': {chapterId: 'parametrization', sectionId: 'weighted-knot'},
    'uniform-parameterization': {chapterId: 'parametrization', sectionId: 'uniform-timing'},
} as const satisfies Record<ParameterizationDemonstrationId, {chapterId: string; sectionId: string}>;
