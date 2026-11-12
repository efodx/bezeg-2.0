import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the Batch D rows of the maps family (spec lesson-authoring-architecture R1). Imports no graph, React,
 * lesson provider or localization value. Executable surfaces live in `runtime.ts`, which this file never imports; preset collections
 * live in `collections.ts`. The rows ship without a guided lesson (`lesson: false`) until the Batch D lessons land (families-prep F3).
 * They sit in their own directory because `src/graphs/complex` is a legacy-registered directory; the graph files stay where they are.
 */
export const complexBatchDFamilyId = 'complex-batch-d';

/**
 * The Demonstration rows, in catalog order; `demonstrations.ts` spreads them right after the legacy rows. The catalog lists a family in definition order, so
 * they follow `complex-roots` in the maps family, ahead of the isometry rows registered later.
 */
export const complexBatchDDemonstrationRows = [
    {id: 'complex-power', path: '/bezeg-2.0/complex-power', family: 'maps', title: 'complex_power_title', prompts: ['complex_power_prompt', 'prompt_compare'], lesson: false},
    {id: 'complex-euler', path: '/bezeg-2.0/complex-euler', family: 'maps', title: 'complex_euler_title', prompts: ['complex_euler_prompt', 'prompt_compare'], lesson: false},
] as const satisfies readonly Definition[];

export type ComplexBatchDDemonstrationId = typeof complexBatchDDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); `collections.ts` holds the definitions. */
export const complexBatchDCollectionKeys = {
    'complex-power': 'complex-power',
    'complex-euler': 'complex-euler',
} as const satisfies Record<ComplexBatchDDemonstrationId, string>;
