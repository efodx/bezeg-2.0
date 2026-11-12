import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the interpolation family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const interpolationFamilyId = '/bezeg-2.0/interpolation';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const interpolationDemonstrationRows = [
    {id: 'interp-lagrange', path: '/bezeg-2.0/interpolation/lagrange', family: '/bezeg-2.0/interpolation', title: 'interp_lagrange_title', prompts: ['prompt_interp_lagrange', 'prompt_compare']},
    {id: 'interp-hermite', path: '/bezeg-2.0/interpolation/hermite', family: '/bezeg-2.0/interpolation', title: 'interp_hermite_title', prompts: ['prompt_interp_hermite', 'prompt_compare']},
    {id: 'interp-runge', path: '/bezeg-2.0/interpolation/runge', family: '/bezeg-2.0/interpolation', title: 'interp_runge_title', prompts: ['prompt_interp_runge', 'prompt_compare']},
    {id: 'interp-least-squares', path: '/bezeg-2.0/interpolation/least-squares', family: '/bezeg-2.0/interpolation', title: 'interp_lsq_title', prompts: ['prompt_interp_least_squares', 'prompt_compare']},
    {id: 'interp-subdivision', path: '/bezeg-2.0/interpolation/subdivision', family: '/bezeg-2.0/interpolation', title: 'interp_subdivision_title', prompts: ['prompt_interp_subdivision', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type InterpolationDemonstrationId = typeof interpolationDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const interpolationCollectionKeys = {
    'interp-lagrange': 'interp-lagrange',
    'interp-hermite': 'interp-hermite',
    'interp-runge': 'interp-runge',
    'interp-least-squares': 'interp-least-squares',
    'interp-subdivision': 'interp-subdivision',
} as const satisfies Record<InterpolationDemonstrationId, string>;
