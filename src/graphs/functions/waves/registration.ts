import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the waves row of the functions family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The row has its guided lessons (WV1 and WV2, chapter-owned by the waves chapter).
 * It sits in its own directory because `src/graphs/functions` is a legacy-registered directory; the graph file stays where it is.
 */
export const wavesFamilyId = 'waves';

/**
 * The Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. A feature-local row lands at the
 * end of its family (the catalog lists a family in definition order), so waves follows `arc-length`, not `trigonometric-functions`.
 */
export const wavesDemonstrationRows = [
    {id: 'waves', path: '/bezeg-2.0/functions/waves', family: '/bezeg-2.0/functions', title: 'waves_title', prompts: ['waves_prompt', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type WavesDemonstrationId = typeof wavesDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const wavesCollectionKeys = {
    'waves': 'waves',
} as const satisfies Record<WavesDemonstrationId, string>;
