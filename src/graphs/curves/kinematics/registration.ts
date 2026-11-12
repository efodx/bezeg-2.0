import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the kinematics row of the curve-geometry family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The row has its guided lessons (KN1 and KN2, chapter-owned by the kinematics chapter).
 * It sits in its own directory because `src/graphs/curves` is a legacy-registered directory.
 */
export const kinematicsFamilyId = 'kinematics';

/** The Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy curve-geometry rows. */
export const kinematicsDemonstrationRows = [
    {id: 'curve-kinematics', path: '/bezeg-2.0/curve-geometry/kinematics', family: '/bezeg-2.0/curve-geometry', title: 'curve_kinematics_title', prompts: ['curve_kinematics_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type KinematicsDemonstrationId = typeof kinematicsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const kinematicsCollectionKeys = {
    'curve-kinematics': 'curve-kinematics',
} as const satisfies Record<KinematicsDemonstrationId, string>;
