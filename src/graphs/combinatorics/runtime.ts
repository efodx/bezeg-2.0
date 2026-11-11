import type {GraphLoader} from '../projective/runtime';
import type {CombinatoricsDemonstrationId} from './registration';

/**
 * Executable surfaces of the combinatorics family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const combinatoricsGraphLoaders = {
    'lattice-paths': () => import('./LatticePathGraph').then(m => () => new m.LatticePathGraph()),
    'counting-tree': () => import('./CountingTreeGraph').then(m => () => new m.CountingTreeGraph()),
} as const satisfies Record<CombinatoricsDemonstrationId, GraphLoader>;
