import type {Definition} from '../../demonstrations';

/**
 * Cheap metadata of the analysis family: the sixteen calculus and analysis Demonstrations of the catalog family `analysis` that
 * `BaseFunctionGraph` draws (spec lesson-authoring-architecture R1, task 06 batches 12a and 12b). Imports no graph, React, lesson provider or
 * localization value; executable surfaces live in `runtime.ts`, Preset collections in `collections.ts`. The graphs stay in
 * `../functions/`, which they share with the functions family.
 */
export const analysisFamilyId = 'analysis';

/**
 * The family's Demonstration rows, in catalog order; `demonstrations.ts` spreads them before the other registered rows of the
 * catalog family `analysis` (dynamics, levelsets, recursion, solids), so the sixteen still lead the family as they did as legacy rows.
 */
export const analysisDemonstrationRows = [
    {id: 'bisection', path: '/bezeg-2.0/analysis/bisection', family: 'analysis', title: 'bisection', prompts: ['prompt_bisection', 'prompt_compare']},
    {id: 'root-finding', path: '/bezeg-2.0/analysis/root-finding', family: 'analysis', title: 'root_finding_title', prompts: ['prompt_root_finding', 'prompt_compare']},
    {id: 'quadrature', path: '/bezeg-2.0/analysis/quadrature', family: 'analysis', title: 'quadrature_title', prompts: ['prompt_quadrature', 'prompt_compare']},
    {id: 'euler-method', path: '/bezeg-2.0/analysis/euler-method', family: 'analysis', title: 'euler_ode_title', prompts: ['prompt_euler_ode', 'prompt_compare']},
    {id: 'mean-value', path: '/bezeg-2.0/analysis/mean-value', family: 'analysis', title: 'mean_value', prompts: ['prompt_mean_value', 'prompt_compare']},
    {id: 'accumulation', path: '/bezeg-2.0/analysis/accumulation', family: 'analysis', title: 'accumulation', prompts: ['prompt_accumulation', 'prompt_compare']},
    {id: 'darboux', path: '/bezeg-2.0/analysis/darboux', family: 'analysis', title: 'darboux', prompts: ['prompt_darboux', 'prompt_compare']},
    {id: 'extrema', path: '/bezeg-2.0/analysis/extrema', family: 'analysis', title: 'extrema', prompts: ['prompt_extrema', 'prompt_compare']},
    {id: 'convexity', path: '/bezeg-2.0/analysis/convexity', family: 'analysis', title: 'convexity', prompts: ['prompt_convexity', 'prompt_compare']},
    {id: 'taylor', path: '/bezeg-2.0/analysis/taylor', family: 'analysis', title: 'taylor', prompts: ['prompt_taylor', 'prompt_compare']},
    {id: 'sequence', path: '/bezeg-2.0/analysis/sequence', family: 'analysis', title: 'sequence', prompts: ['prompt_sequence', 'prompt_compare']},
    {id: 'uniform-convergence', path: '/bezeg-2.0/analysis/uniform-convergence', family: 'analysis', title: 'uniform_convergence', prompts: ['prompt_uniform_convergence', 'prompt_compare']},
    {id: 'fourier-series', path: '/bezeg-2.0/analysis/fourier-series', family: 'analysis', title: 'fourier_series_title', prompts: ['prompt_fourier_series', 'prompt_compare']},
    {id: 'fourier-coefficients', path: '/bezeg-2.0/analysis/fourier-coefficients', family: 'analysis', title: 'fourier_coefficients_title', prompts: ['prompt_fourier_coefficients', 'prompt_compare']},
    {id: 'epicycles', path: '/bezeg-2.0/analysis/epicycles', family: 'analysis', title: 'epicycles_title', prompts: ['prompt_epicycles', 'prompt_compare']},
    {id: 'fixed-point', path: '/bezeg-2.0/analysis/fixed-point', family: 'analysis', title: 'fixed_point', prompts: ['prompt_fixed_point', 'prompt_compare']},
] as const satisfies readonly Definition[];

export type AnalysisDemonstrationId = typeof analysisDemonstrationRows[number]['id'];

/** The Preset storage collection key of each Demonstration (the file contract); two differ from the id. */
export const analysisCollectionKeys = {
    'bisection': 'bisection',
    'root-finding': 'root-finding',
    'quadrature': 'quadrature',
    'euler-method': 'euler',
    'mean-value': 'mean-value',
    'accumulation': 'accumulation',
    'darboux': 'darboux',
    'extrema': 'extrema',
    'convexity': 'convexity',
    'taylor': 'taylor',
    'sequence': 'sequence',
    'uniform-convergence': 'uniform-convergence',
    'fourier-series': 'fourier-series',
    'fourier-coefficients': 'fourier-coefficients',
    'epicycles': 'epicycle',
    'fixed-point': 'fixed-point',
} as const satisfies Record<AnalysisDemonstrationId, string>;

/**
 * Explicit primary lesson owners: the ten whose lesson section cannot be derived from a chapter-owned section naming them (the
 * `analysis` chapter and `accumulation`'s functions-and-calculus section are not chapter-owned lessons). `root-finding`,
 * `quadrature` and `euler-method` (numerical-methods) and the three Fourier Demonstrations derive theirs.
 */
export const analysisPrimaryOwners = {
    'bisection': {chapterId: 'analysis', sectionId: 'existence'},
    'mean-value': {chapterId: 'analysis', sectionId: 'derivative-results'},
    'accumulation': {chapterId: 'functions-and-calculus', sectionId: 'integrals'},
    'darboux': {chapterId: 'analysis', sectionId: 'integrability'},
    'extrema': {chapterId: 'analysis', sectionId: 'derivative-results'},
    'convexity': {chapterId: 'analysis', sectionId: 'derivative-results'},
    'taylor': {chapterId: 'analysis', sectionId: 'taylor'},
    'sequence': {chapterId: 'analysis', sectionId: 'convergence'},
    'uniform-convergence': {chapterId: 'analysis', sectionId: 'convergence'},
    'fixed-point': {chapterId: 'analysis', sectionId: 'convergence'},
} as const satisfies Partial<Record<AnalysisDemonstrationId, {chapterId: string; sectionId: string}>>;
