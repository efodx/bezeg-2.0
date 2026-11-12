import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the PH family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or localization
 * value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const phFamilyId = '/bezeg-2.0/ph';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const phDemonstrationRows = [
    {id: 'ph-cubic', path: '/bezeg-2.0/ph/cubic', family: '/bezeg-2.0/ph', title: 'degree_3', heading: 'degree_3_ph_curve', prompts: ['prompt_ph', 'prompt_compare']},
    {id: 'ph-quintic', path: '/bezeg-2.0/ph/quintic', family: '/bezeg-2.0/ph', title: 'degree_5_ph_curve', prompts: ['prompt_ph', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type PhDemonstrationId = typeof phDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const phCollectionKeys = {
    'ph-cubic': 'cubic-ph',
    'ph-quintic': 'quintic-ph-graph',
} as const satisfies Record<PhDemonstrationId, string>;

/** Explicit primary lesson owners: the `ph-curves` chapter owns no lesson rows, so `chapterOwnerRows()` cannot derive them. */
export const phPrimaryOwners = {
    'ph-cubic': {chapterId: 'ph-curves', sectionId: 'arc-length-problem'},
    'ph-quintic': {chapterId: 'ph-curves', sectionId: 'offsets'},
} as const satisfies Record<PhDemonstrationId, {chapterId: string; sectionId: string}>;
