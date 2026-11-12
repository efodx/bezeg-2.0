import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {AnalysisDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the analysis family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const analysisGraphLoaders = {
    'bisection': () => import('../functions/BisectionGraph').then(m => () => new m.BisectionGraph()),
    'root-finding': () => import('../functions/RootFindingGraph').then(m => () => new m.RootFindingGraph()),
    'quadrature': () => import('../functions/QuadratureGraph').then(m => () => new m.QuadratureGraph()),
    'euler-method': () => import('../functions/EulerGraph').then(m => () => new m.EulerGraph()),
    'mean-value': () => import('../functions/MeanValueGraph').then(m => () => new m.MeanValueGraph()),
    'accumulation': () => import('../functions/AccumulationGraph').then(m => () => new m.AccumulationGraph()),
    'darboux': () => import('../functions/DarbouxGraph').then(m => () => new m.DarbouxGraph()),
    'extrema': () => import('../functions/ExtremaGraph').then(m => () => new m.ExtremaGraph()),
    'convexity': () => import('../functions/ConvexityGraph').then(m => () => new m.ConvexityGraph()),
    'taylor': () => import('../functions/TaylorGraph').then(m => () => new m.TaylorGraph()),
    'sequence': () => import('../functions/SequenceGraph').then(m => () => new m.SequenceGraph()),
    'uniform-convergence': () => import('../functions/UniformConvergenceGraph').then(m => () => new m.UniformConvergenceGraph()),
    'fourier-series': () => import('../functions/FourierSeriesGraph').then(m => () => new m.FourierSeriesGraph()),
    'fourier-coefficients': () => import('../functions/FourierCoefficientsGraph').then(m => () => new m.FourierCoefficientsGraph()),
    'epicycles': () => import('../functions/EpicycleGraph').then(m => () => new m.EpicycleGraph()),
    'fixed-point': () => import('../functions/FixedPointGraph').then(m => () => new m.FixedPointGraph()),
} as const satisfies Record<AnalysisDemonstrationId, GraphLoader>;
