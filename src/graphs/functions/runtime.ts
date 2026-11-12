import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {FunctionsDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the functions family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const functionsGraphLoaders = {
    'linear-function': () => import('./LinearFunctionGraph').then(m => () => new m.LinearFunctionGraph()),
    'exponential-function': () => import('./ExponentialFunctionGraph').then(m => () => new m.ExponentialFunctionGraph()),
    'trigonometric-functions': () => import('./TrigonometricFunctionsGraph').then(m => () => new m.TrigonometricFunctionsGraph()),
    'function-transformation': () => import('./FunctionTransformationGraph').then(m => () => new m.FunctionTransformationGraph()),
    'function-inverse': () => import('./FunctionInverseGraph').then(m => () => new m.FunctionInverseGraph()),
    'polynomial-zeros': () => import('./PolynomialZerosGraph').then(m => () => new m.PolynomialZerosGraph()),
    'rational-function': () => import('./RationalFunctionGraph').then(m => () => new m.RationalFunctionGraph()),
    'geometric-series': () => import('./GeometricSeriesGraph').then(m => () => new m.GeometricSeriesGraph()),
    'conic-focal': () => import('./ConicFocalGraph').then(m => () => new m.ConicFocalGraph()),
    'continuity': () => import('./ContinuityGraph').then(m => () => new m.ContinuityGraph()),
    'derivative': () => import('./DerivativeGraph').then(m => () => new m.DerivativeGraph()),
    'definite-integral': () => import('./DefiniteIntegralGraph').then(m => () => new m.DefiniteIntegralGraph()),
    'area-between-curves': () => import('./AreaBetweenCurvesGraph').then(m => () => new m.AreaBetweenCurvesGraph()),
    'arc-length': () => import('./ArcLengthGraph').then(m => () => new m.ArcLengthGraph()),
} as const satisfies Record<FunctionsDemonstrationId, GraphLoader>;
