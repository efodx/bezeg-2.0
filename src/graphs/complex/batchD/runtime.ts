import type {GraphLoader} from '../../projective/runtime';
import type {ComplexBatchDDemonstrationId} from './registration';

/**
 * Executable surfaces of the Batch D rows: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const complexBatchDGraphLoaders = {
    'complex-power': () => import('../ComplexPowerGraph').then(m => () => new m.ComplexPowerGraph()),
    'complex-euler': () => import('../EulerCircleGraph').then(m => () => new m.EulerCircleGraph()),
} as const satisfies Record<ComplexBatchDDemonstrationId, GraphLoader>;
