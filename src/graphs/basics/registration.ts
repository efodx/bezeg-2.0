import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the basics family (spec lesson-authoring-architecture R1). The family spans two implementation directories
 * (`bernstein`, `complex`) and neither owns it, so its module lives here. Imports no graph, React, lesson provider or localization
 * value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const basicsFamilyId = 'basics';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const basicsDemonstrationRows = [
    {id: 'bernstein', path: '/bezeg-2.0/bernstein', family: 'basics', title: 'bernstein_polynomials', prompts: ['prompt_bernstein', 'prompt_compare'], fit: false},
    {id: 'complex-multiplication', path: '/bezeg-2.0/complex-multiplication', family: 'basics', title: 'complex_multiplication', prompts: ['prompt_complex_multiplication', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type BasicsDemonstrationId = typeof basicsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract). */
export const basicsCollectionKeys = {
    bernstein: 'bernstein-graph',
    'complex-multiplication': 'complex-multiplication',
} as const satisfies Record<BasicsDemonstrationId, string>;

/** Explicit primary lesson owners: both chapters own no lesson rows, so `chapterOwnerRows()` cannot derive them. */
export const basicsPrimaryOwners = {
    bernstein: {chapterId: 'foundations', sectionId: 'why-weights'},
    'complex-multiplication': {chapterId: 'foundations', sectionId: 'complex-plane'},
} as const satisfies Record<BasicsDemonstrationId, {chapterId: string; sectionId: string}>;

/** Further lesson owners, listed after the primary. */
export const basicsAdditionalOwners = {
    bernstein: [{chapterId: 'bezier-curves', sectionId: 'bernstein-form'}],
} as const satisfies Partial<Record<BasicsDemonstrationId, readonly {chapterId: string; sectionId: string}[]>>;
