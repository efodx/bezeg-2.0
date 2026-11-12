import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the functions family: the fourteen school and calculus function Demonstrations (spec
 * lesson-authoring-architecture R1). Imports no graph, React, lesson provider or localization value; executable surfaces live in
 * `runtime.ts`, Preset collections in `collections.ts`. The module sits beside the graphs it registers: the directory is
 * shared with the Analysis and probability graphs that later batches move, and with the `waves/` family module.
 */
export const functionsFamilyId = '/bezeg-2.0/functions';

/**
 * The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them before the other registered rows of the same
 * catalog family (`unit-circle`, `waves`), so the catalog order inside `/bezeg-2.0/functions` is unchanged.
 */
export const functionsDemonstrationRows = [
    {id: 'linear-function', path: '/bezeg-2.0/functions/linear', family: '/bezeg-2.0/functions', title: 'linear_function', prompts: ['prompt_linear_function', 'prompt_compare']},
    {id: 'exponential-function', path: '/bezeg-2.0/functions/exponential', family: '/bezeg-2.0/functions', title: 'exponential_function', prompts: ['prompt_exponential_function', 'prompt_compare']},
    {id: 'trigonometric-functions', path: '/bezeg-2.0/functions/trigonometric', family: '/bezeg-2.0/functions', title: 'trigonometric_functions', prompts: ['prompt_trigonometric_functions', 'prompt_compare']},
    {id: 'function-transformation', path: '/bezeg-2.0/functions/transformations', family: '/bezeg-2.0/functions', title: 'function_transformation_title', prompts: ['prompt_function_transformation', 'prompt_compare']},
    {id: 'function-inverse', path: '/bezeg-2.0/functions/inverse', family: '/bezeg-2.0/functions', title: 'function_inverse_title', prompts: ['prompt_function_inverse', 'prompt_compare']},
    {id: 'polynomial-zeros', path: '/bezeg-2.0/functions/polynomial-zeros', family: '/bezeg-2.0/functions', title: 'polynomial_zeros_title', prompts: ['prompt_polynomial_zeros', 'prompt_compare']},
    {id: 'rational-function', path: '/bezeg-2.0/functions/rational-functions', family: '/bezeg-2.0/functions', title: 'rational_function_title', prompts: ['prompt_rational_function', 'prompt_compare']},
    {id: 'geometric-series', path: '/bezeg-2.0/functions/geometric-series', family: '/bezeg-2.0/functions', title: 'geometric_series_title', prompts: ['prompt_geometric_series', 'prompt_compare']},
    {id: 'conic-focal', path: '/bezeg-2.0/functions/conics', family: '/bezeg-2.0/functions', title: 'conic_focal_title', prompts: ['prompt_conic_focal', 'prompt_compare']},
    {id: 'continuity', path: '/bezeg-2.0/functions/continuity', family: '/bezeg-2.0/functions', title: 'continuity', prompts: ['prompt_continuity', 'prompt_compare']},
    {id: 'derivative', path: '/bezeg-2.0/functions/derivative', family: '/bezeg-2.0/functions', title: 'derivative', prompts: ['prompt_derivative', 'prompt_compare']},
    {id: 'definite-integral', path: '/bezeg-2.0/functions/integral', family: '/bezeg-2.0/functions', title: 'definite_integral', prompts: ['prompt_definite_integral', 'prompt_compare']},
    {id: 'area-between-curves', path: '/bezeg-2.0/functions/area-between', family: '/bezeg-2.0/functions', title: 'area_between_curves', prompts: ['prompt_area_between_curves', 'prompt_compare']},
    {id: 'arc-length', path: '/bezeg-2.0/functions/arc-length', family: '/bezeg-2.0/functions', title: 'curve_arc_length', prompts: ['prompt_curve_arc_length', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type FunctionsDemonstrationId = typeof functionsDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); two differ from the id. */
export const functionsCollectionKeys = {
    'linear-function': 'linear-function',
    'exponential-function': 'exponential-function',
    'trigonometric-functions': 'trigonometric-function',
    'function-transformation': 'function-transformation',
    'function-inverse': 'function-inverse',
    'polynomial-zeros': 'polynomial-zeros',
    'rational-function': 'rational-function',
    'geometric-series': 'geometric-series',
    'conic-focal': 'conic-focal',
    'continuity': 'piecewise-continuity',
    'derivative': 'derivative',
    'definite-integral': 'definite-integral',
    'area-between-curves': 'area-between-curves',
    'arc-length': 'arc-length',
} as const satisfies Record<FunctionsDemonstrationId, string>;

/**
 * Explicit primary lesson owners: the eight whose section id differs from the Demonstration id (the `functions-and-calculus`
 * chapter names its sections by topic). The other six derive theirs from the first `school-function-graphs` section naming them.
 */
export const functionsPrimaryOwners = {
    'linear-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'exponential-function': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'trigonometric-functions': {chapterId: 'functions-and-calculus', sectionId: 'function-rules'},
    'continuity': {chapterId: 'functions-and-calculus', sectionId: 'continuity'},
    'derivative': {chapterId: 'functions-and-calculus', sectionId: 'derivatives'},
    'definite-integral': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
    'area-between-curves': {chapterId: 'functions-and-calculus', sectionId: 'applications'},
    'arc-length': {chapterId: 'functions-and-calculus', sectionId: 'applications'},
} as const satisfies Partial<Record<FunctionsDemonstrationId, {chapterId: string; sectionId: string}>>;
