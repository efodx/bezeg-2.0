import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the plane-geometry family's five legacy rows (spec lesson-authoring-architecture R1, task 06 batch 15). Imports no
 * graph, React, lesson provider or localization value; executable surfaces live in `runtime.ts`, Preset collections in
 * `collections.ts`. The graphs stay in `../` (`compgeo/`). The registered rows of the same catalog family (`../../trig/`,
 * `../../lines/`, `../circleConstruction/`) follow these.
 */
export const planeGeometryFamilyId = 'plane-geometry';

/**
 * The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them before every other plane-geometry row, so the
 * five still lead the catalog family as they did as legacy rows.
 */
export const planeGeometryDemonstrationRows = [
    {id: 'triangle-centres', path: '/bezeg-2.0/triangle-centres', family: 'plane-geometry', title: 'triangle_centres_title', prompts: ['triangle_centres_prompt', 'prompt_compare']},
    {id: 'inscribed-angle', path: '/bezeg-2.0/inscribed-angle', family: 'plane-geometry', title: 'inscribed_angle_title', prompts: ['inscribed_angle_prompt', 'prompt_compare']},
    {id: 'euler-line', path: '/bezeg-2.0/euler-line', family: 'plane-geometry', title: 'euler_line_title', prompts: ['euler_line_prompt', 'prompt_compare']},
    {id: 'simson-line', path: '/bezeg-2.0/simson-line', family: 'plane-geometry', title: 'simson_line_title', prompts: ['simson_line_prompt', 'prompt_compare']},
    {id: 'inversion', path: '/bezeg-2.0/inversion', family: 'plane-geometry', title: 'inversion_title', prompts: ['inversion_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type PlaneGeometryDemonstrationId = typeof planeGeometryDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); these differ from the ids. */
export const planeGeometryCollectionKeys = {
    'triangle-centres': 'compgeo-notable-points',
    'inscribed-angle': 'compgeo-inscribed-angle',
    'euler-line': 'compgeo-euler-line',
    'simson-line': 'compgeo-simson-line',
    'inversion': 'compgeo-inversion',
} as const satisfies Record<PlaneGeometryDemonstrationId, string>;
