import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the level-set rows of the analysis family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The rows ship without a guided lesson (`lesson: false`) until the level-set lessons land (families-prep F3).
 * The contour map has a 3D panel, but its main view is the pannable contour board.
 */
export const levelSetsFamilyId = 'levelsets';

/** The Demonstration rows, in catalog order; `demonstrations.ts` places them right after the solids row in the analysis family. */
export const levelSetsDemonstrationRows = [
    {id: 'contour-map', path: '/bezeg-2.0/analysis/contours', family: 'analysis', title: 'contour_map_title', prompts: ['contour_map_prompt', 'prompt_compare'], lesson: false},
    {id: 'linear-program', path: '/bezeg-2.0/analysis/linear-program', family: 'analysis', title: 'linear_program_title', prompts: ['linear_program_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type LevelSetsDemonstrationId = typeof levelSetsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const levelSetsCollectionKeys = {
    'contour-map': 'contour-map',
    'linear-program': 'linear-program',
} as const satisfies Record<LevelSetsDemonstrationId, string>;
