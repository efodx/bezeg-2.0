import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the patches family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const patchesFamilyId = '/bezeg-2.0/patches';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. Every row opens the surface view. */
export const patchesDemonstrationRows = [
    {id: 'patch-tensor', path: '/bezeg-2.0/patches/tensor', family: '/bezeg-2.0/patches', title: 'tensor_product_bezier_patch', prompts: ['prompt_patch_net', 'prompt_patch_degree'], view: 'surface'},
    {id: 'patch-decasteljau', path: '/bezeg-2.0/patches/decasteljau', family: '/bezeg-2.0/patches', title: 'patch_decasteljau_algorithm', prompts: ['prompt_patch_decasteljau_order', 'prompt_patch_decasteljau_levels'], view: 'surface'},
    {id: 'patch-derivatives', path: '/bezeg-2.0/patches/derivatives', family: '/bezeg-2.0/patches', title: 'patch_derivatives_title', prompts: ['prompt_patch_derivatives_tangents', 'prompt_patch_derivatives_normal'], view: 'surface'},
    {id: 'patch-subdivision', path: '/bezeg-2.0/patches/subdivision', family: '/bezeg-2.0/patches', title: 'patch_subdivision_title', prompts: ['prompt_patch_subdivision_pieces', 'prompt_patch_subdivision_elevation'], view: 'surface'},
    {id: 'patch-joins', path: '/bezeg-2.0/patches/joins', family: '/bezeg-2.0/patches', title: 'patch_joins_title', prompts: ['prompt_patch_joins_c1', 'prompt_patch_joins_g1'], view: 'surface'},
    {id: 'patch-triangular', path: '/bezeg-2.0/patches/triangular', family: '/bezeg-2.0/patches', title: 'triangular_bezier_patch', prompts: ['prompt_patch_triangular_net', 'prompt_patch_barycentric'], view: 'surface'},
    {id: 'patch-coons', path: '/bezeg-2.0/patches/coons', family: '/bezeg-2.0/patches', title: 'coons_patch_title', prompts: ['prompt_coons_boundaries', 'prompt_coons_blend'], view: 'surface'},
] as const satisfies readonly Definition[];

export type PatchesDemonstrationId = typeof patchesDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const patchesCollectionKeys = {
    'patch-tensor': 'patch-tensor',
    'patch-decasteljau': 'patch-decasteljau',
    'patch-derivatives': 'patch-derivatives',
    'patch-subdivision': 'patch-subdivision',
    'patch-joins': 'patch-joins',
    'patch-triangular': 'patch-triangular',
    'patch-coons': 'patch-coons',
} as const satisfies Record<PatchesDemonstrationId, string>;
