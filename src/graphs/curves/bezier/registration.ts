import type {Definition} from '../../../demonstrations';

/**
 * Cheap metadata of the polynomial Bezier family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const bezierFamilyId = '/bezeg-2.0/bezier';

/** The family's Demonstration rows, in catalog order (`bezier-clipping` last); `demonstrations.ts` spreads them after the legacy rows. */
export const bezierDemonstrationRows = [
    {id: 'bezier', path: '/bezeg-2.0/bezier/curve', family: '/bezeg-2.0/bezier', title: 'bezier_curve_209', heading: 'bezier_curve', prompts: ['prompt_control_points', 'prompt_control_polygon']},
    {id: 'decasteljau', path: '/bezeg-2.0/bezier/decasteljau', family: '/bezeg-2.0/bezier', title: 'de_casteljau', prompts: ['prompt_decasteljau', 'prompt_compare']},
    {id: 'decasteljau-alternative', path: '/bezeg-2.0/bezier/decasteljau2', family: '/bezeg-2.0/bezier', title: 'de_casteljau_alternative', prompts: ['prompt_decasteljau', 'prompt_compare']},
    {id: 'affine', path: '/bezeg-2.0/bezier/affine', family: '/bezeg-2.0/bezier', title: 'affine_transformations', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'subdivision', path: '/bezeg-2.0/bezier/subdivision-2', family: '/bezeg-2.0/bezier', title: 'subdivision', prompts: ['prompt_subdivision', 'prompt_compare']},
    {id: 'repeated-subdivision', path: '/bezeg-2.0/bezier/subdivision', family: '/bezeg-2.0/bezier', title: 'repeated_subdivision', prompts: ['prompt_repeated_subdivision', 'prompt_compare']},
    {id: 'extrapolation', path: '/bezeg-2.0/bezier/extrapolation', family: '/bezeg-2.0/bezier', title: 'extrapolation', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'elevation', path: '/bezeg-2.0/bezier/elevation', family: '/bezeg-2.0/bezier', title: 'degree_elevation', prompts: ['prompt_elevation', 'prompt_compare']},
    {id: 'reduction', path: '/bezeg-2.0/bezier/reduction', family: '/bezeg-2.0/bezier', title: 'reduction_title', prompts: ['prompt_reduction', 'prompt_compare']},
    {id: 'arc-length-param', path: '/bezeg-2.0/bezier/arc-length', family: '/bezeg-2.0/bezier', title: 'arcparam_title', prompts: ['prompt_arcparam', 'prompt_compare']},
    {id: 'bezier-clipping', path: '/bezeg-2.0/bezier/clipping', family: '/bezeg-2.0/bezier', title: 'bezierclipping_title', prompts: ['prompt_bezierclipping', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type BezierDemonstrationId = typeof bezierDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract; `decasteljau-alternative` keeps `decasteljau2`). */
export const bezierCollectionKeys = {
    'bezier': 'bezier-curve',
    'decasteljau': 'decasteljau',
    'decasteljau-alternative': 'decasteljau2',
    'affine': 'affine-transform',
    'subdivision': 'subdivision-1',
    'repeated-subdivision': 'bezier-subdivision',
    'extrapolation': 'bezier-extrapolation',
    'elevation': 'elevation-graph',
    'reduction': 'reduction',
    'arc-length-param': 'arc-length-param',
    'bezier-clipping': 'compgeo-bezier-clipping',
} as const satisfies Record<BezierDemonstrationId, string>;

/**
 * Explicit primary lesson owners of the eight Demonstrations of the `bezier-curves` chapter, which owns no lesson rows, so
 * `chapterOwnerRows()` cannot derive them. `reduction`, `arc-length-param` and `bezier-clipping` derive from the `advanced-bezier` chapter.
 */
export const bezierPrimaryOwners = {
    'bezier': {chapterId: 'bezier-curves', sectionId: 'control-points'},
    'decasteljau': {chapterId: 'bezier-curves', sectionId: 'interpolation'},
    'decasteljau-alternative': {chapterId: 'bezier-curves', sectionId: 'interpolation'},
    'affine': {chapterId: 'bezier-curves', sectionId: 'affine-transformations'},
    'subdivision': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    'repeated-subdivision': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    'extrapolation': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
    'elevation': {chapterId: 'bezier-curves', sectionId: 'next-ideas'},
} as const satisfies Partial<Record<BezierDemonstrationId, {chapterId: string; sectionId: string}>>;

/** The ids whose primary owner is derived from `chapterOwnerRows()` (R-owners). */
export const bezierDerivedOwnerIds = ['reduction', 'arc-length-param', 'bezier-clipping'] as const satisfies readonly BezierDemonstrationId[];
