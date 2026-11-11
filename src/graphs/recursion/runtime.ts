import type {GraphLoader} from '../projective/runtime';
import type {RecursionDemonstrationId} from './registration';

/**
 * Executable surfaces of the recursion rows: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const recursionGraphLoaders = {
    'recursion-cobweb': () => import('./RecursionCobwebGraph').then(m => () => new m.RecursionCobwebGraph()),
    'recursion-growth': () => import('./GrowthGraph').then(m => () => new m.GrowthGraph()),
} as const satisfies Record<RecursionDemonstrationId, GraphLoader>;
