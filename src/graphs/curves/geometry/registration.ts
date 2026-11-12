import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the curve geometry family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const curveGeometryFamilyId = '/bezeg-2.0/curve-geometry';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const curveGeometryDemonstrationRows = [
    {id: 'curve-parametric', path: '/bezeg-2.0/curve-geometry/parametric', family: '/bezeg-2.0/curve-geometry', title: 'parametric_curves_title', prompts: ['prompt_parametric_curve', 'prompt_compare']},
    {id: 'curve-curvature', path: '/bezeg-2.0/curve-geometry/curvature', family: '/bezeg-2.0/curve-geometry', title: 'curvature_circle_title', prompts: ['prompt_curvature', 'prompt_compare']},
    {id: 'curve-comb', path: '/bezeg-2.0/curve-geometry/comb', family: '/bezeg-2.0/curve-geometry', title: 'curve_comb_title', prompts: ['prompt_curve_comb', 'prompt_compare']},
    {id: 'curve-evolute', path: '/bezeg-2.0/curve-geometry/evolute', family: '/bezeg-2.0/curve-geometry', title: 'curve_evolute_title', prompts: ['prompt_curve_evolute', 'prompt_compare']},
    {id: 'curve-offset', path: '/bezeg-2.0/curve-geometry/offset', family: '/bezeg-2.0/curve-geometry', title: 'curve_offset_title', prompts: ['prompt_curve_offset', 'prompt_compare']},
    {id: 'curve-envelope', path: '/bezeg-2.0/curve-geometry/envelope', family: '/bezeg-2.0/curve-geometry', title: 'curve_envelope_title', prompts: ['prompt_curve_envelope', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type CurveGeometryDemonstrationId = typeof curveGeometryDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const curveGeometryCollectionKeys = {
    'curve-parametric': 'curve-parametric',
    'curve-curvature': 'curve-curvature',
    'curve-comb': 'curve-comb',
    'curve-evolute': 'curve-evolute',
    'curve-offset': 'curve-offset',
    'curve-envelope': 'curve-envelope',
} as const satisfies Record<CurveGeometryDemonstrationId, string>;
