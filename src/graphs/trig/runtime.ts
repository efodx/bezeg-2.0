import type {GraphLoader} from '../projective/runtime';
import type {TrigDemonstrationId} from './registration';

/**
 * Executable surfaces of the trigonometry family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const trigGraphLoaders = {
    'unit-circle': () => import('./UnitCircleGraph').then(m => () => new m.UnitCircleGraph()),
    'triangle-solver': () => import('./TriangleSolverGraph').then(m => () => new m.TriangleSolverGraph()),
} as const satisfies Record<TrigDemonstrationId, GraphLoader>;
