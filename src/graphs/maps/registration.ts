import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the maps family: the linear map and the two complex-map Demonstrations that were legacy rows (spec
 * lesson-authoring-architecture R1, task 06 batch 14). Imports no graph, React, lesson provider or localization value; executable
 * surfaces live in `runtime.ts`, Preset collections in `collections.ts`. The graphs stay in `../linear/` and `../complex/`.
 * The rows of the same catalog family registered by `../complex/batchD/` and `../isometry/` follow these.
 */
export const mapsFamilyId = 'maps';

/**
 * The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them before `complexBatchDDemonstrationRows`, so the
 * three still lead the catalog family `maps` as they did as legacy rows.
 */
export const mapsDemonstrationRows = [
    {id: 'linear-map', path: '/bezeg-2.0/linear-map', family: 'maps', title: 'linear_map_title', prompts: ['linear_map_prompt', 'prompt_compare']},
    {id: 'complex-reciprocal', path: '/bezeg-2.0/complex-reciprocal', family: 'maps', title: 'complex_reciprocal_title', prompts: ['complex_reciprocal_prompt', 'prompt_compare']},
    {id: 'complex-roots', path: '/bezeg-2.0/complex-roots', family: 'maps', title: 'complex_roots_title', prompts: ['complex_roots_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type MapsDemonstrationId = typeof mapsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); every key equals the id. */
export const mapsCollectionKeys = {
    'linear-map': 'linear-map',
    'complex-reciprocal': 'complex-reciprocal',
    'complex-roots': 'complex-roots',
} as const satisfies Record<MapsDemonstrationId, string>;
