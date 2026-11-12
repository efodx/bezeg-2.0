import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the line-geometry family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson
 * provider or localization value, so the home page and catalog can read it without loading the family. Executable surfaces
 * live in `runtime.ts`, which this file never imports; preset collections live in `collections.ts`.
 * The row has its guided lessons (L1, L2, chapter-owned by the analytic-lines chapter).
 */
export const lineFamilyId = 'line-geometry';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the trigonometry rows. */
export const lineDemonstrationRows = [
    {id: 'line-geometry', path: '/bezeg-2.0/line-geometry', family: 'plane-geometry', title: 'line_geometry_title', prompts: ['line_geometry_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type LineDemonstrationId = typeof lineDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const lineCollectionKeys = {
    'line-geometry': 'line-geometry',
} as const satisfies Record<LineDemonstrationId, string>;
