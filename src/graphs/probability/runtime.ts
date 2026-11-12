import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {ProbabilityDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the probability family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const probabilityGraphLoaders = {
    'prob-density': () => import('../functions/DensityAreaGraph').then(m => () => new m.DensityAreaGraph()),
    'prob-binomial-normal': () => import('../functions/BinomialNormalGraph').then(m => () => new m.BinomialNormalGraph()),
    'prob-clt': () => import('../functions/CltGraph').then(m => () => new m.CltGraph()),
    'prob-summary': () => import('../functions/SummaryStatisticsGraph').then(m => () => new m.SummaryStatisticsGraph()),
    'prob-correlation': () => import('../functions/CorrelationGraph').then(m => () => new m.CorrelationGraph()),
} as const satisfies Record<ProbabilityDemonstrationId, GraphLoader>;
