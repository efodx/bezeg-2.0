import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the descent row of the curve-geometry family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The row ships without a guided lesson (`lesson: false`) until the mechanical-curves lessons land (families-prep F3).
 * It sits in its own directory because `src/graphs/curves` is a legacy-registered directory.
 */
export const mechanicsFamilyId = 'mechanics';

/** The Demonstration rows, in catalog order; `demonstrations.ts` places them at the end of the curve-geometry family, after `curve-kinematics`. */
export const mechanicsDemonstrationRows = [
    {id: 'mechanics-descent', path: '/bezeg-2.0/curve-geometry/descent', family: '/bezeg-2.0/curve-geometry', title: 'mechanics_descent_title', prompts: ['mechanics_descent_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type MechanicsDemonstrationId = typeof mechanicsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const mechanicsCollectionKeys = {
    'mechanics-descent': 'mechanics-descent',
} as const satisfies Record<MechanicsDemonstrationId, string>;
