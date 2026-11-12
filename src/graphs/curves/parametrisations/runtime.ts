import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {ParameterizationDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the parameterization family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const parameterizationGraphLoaders = {
    'spline-parameterization': () => import('./SplineAlphaParametrizationGraph').then(m => () => new m.default()),
    'weighted-parameterization': () => import('./AlphaParamBezierCurveGraph').then(m => () => new m.default()),
    'uniform-parameterization': () => import('./UniformParamBezierCurveGraph').then(m => () => new m.default()),
} as const satisfies Record<ParameterizationDemonstrationId, GraphLoader>;
