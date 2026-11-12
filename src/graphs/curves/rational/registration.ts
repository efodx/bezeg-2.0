import type {Definition} from '../../../demonstrations';
import type {NoPresetCollection} from '../../registrationIntegrity';

/**
 * Cheap metadata of the rational Bezier family (spec lesson-authoring-architecture R1). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`.
 */
export const rationalFamilyId = '/bezeg-2.0/rational';

/** The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them after the legacy rows. */
export const rationalDemonstrationRows = [
    {id: 'rational', path: '/bezeg-2.0/rational/base', family: '/bezeg-2.0/rational', title: 'rational_bezier_curve', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'rational-decasteljau', path: '/bezeg-2.0/rational/rational-decasteljau', family: '/bezeg-2.0/rational', title: 'rational_de_casteljau', prompts: ['prompt_decasteljau', 'prompt_compare']},
    {id: 'rational-elevation', path: '/bezeg-2.0/rational/rational-elevation', family: '/bezeg-2.0/rational', title: 'degree_elevation', prompts: ['prompt_elevation', 'prompt_compare']},
    {id: 'rational-extrapolation', path: '/bezeg-2.0/rational/rational-extrapolation', family: '/bezeg-2.0/rational', title: 'extrapolation', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'rational-subdivision', path: '/bezeg-2.0/rational/rational-subdivision', family: '/bezeg-2.0/rational', title: 'subdivision', prompts: ['prompt_subdivision', 'prompt_compare']},
    {id: 'farin', path: '/bezeg-2.0/rational/farin-points', family: '/bezeg-2.0/rational', title: 'farin_points', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
    {id: 'circle', path: '/bezeg-2.0/rational/circlen', family: '/bezeg-2.0/rational', title: 'circle_from_n_pieces', prompts: ['change_the_settings_and_observe_their_effect_on_the_graph', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type RationalDemonstrationId = typeof rationalDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract), or the explicit, reasoned absence of one (R-circle). */
export const rationalCollectionKeys = {
    'rational': 'rational-bezier',
    'rational-decasteljau': 'rational-decasteljau',
    'rational-elevation': 'rational-bezier-elevation',
    'rational-extrapolation': 'rational-bezier-extrapolation',
    'rational-subdivision': 'rational-bezier-subdivision',
    'farin': 'rational-bezier-farin',
    'circle': {none: 'The circle from n pieces keeps no browser-local Preset, so nothing is imported or exported.'},
} as const satisfies Record<RationalDemonstrationId, string | NoPresetCollection>;

/**
 * Explicit primary lesson owners: the `rational-curves` chapter owns no lesson rows, so `chapterOwnerRows()` cannot derive them.
 * No id of this family derives its owner (R-owners).
 */
export const rationalPrimaryOwners = {
    'rational': {chapterId: 'rational-curves', sectionId: 'why-rational'},
    'rational-decasteljau': {chapterId: 'rational-curves', sectionId: 'operations'},
    'rational-elevation': {chapterId: 'rational-curves', sectionId: 'operations'},
    'rational-subdivision': {chapterId: 'rational-curves', sectionId: 'operations'},
    'rational-extrapolation': {chapterId: 'rational-curves', sectionId: 'investigate-rational'},
    'farin': {chapterId: 'rational-curves', sectionId: 'operations'},
    'circle': {chapterId: 'rational-curves', sectionId: 'worked-conic'},
} as const satisfies Record<RationalDemonstrationId, {chapterId: string; sectionId: string}>;
