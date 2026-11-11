import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the circle-construction family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson
 * provider or localization value, so the home page and catalog can read it without loading the family. Executable surfaces
 * live in `runtime.ts`, which this file never imports; preset collections live in `collections.ts`.
 * The row ships without a guided lesson (`lesson: false`) until the circle-geometry lessons land (families-prep F3).
 * The family sits in its own directory because `src/graphs/compgeo` is a legacy-registered directory.
 */
export const circleConstructionFamilyId = 'circle-construction';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the isometry rows. */
export const circleConstructionDemonstrationRows = [
    {id: 'circle-construction', path: '/bezeg-2.0/circle-constructions', family: 'plane-geometry', title: 'circle_construction_title', prompts: ['circle_construction_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type CircleConstructionDemonstrationId = typeof circleConstructionDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const circleConstructionCollectionKeys = {
    'circle-construction': 'circle-construction',
} as const satisfies Record<CircleConstructionDemonstrationId, string>;
