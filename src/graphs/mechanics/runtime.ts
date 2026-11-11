import type {GraphLoader} from '../projective/runtime';
import type {MechanicsDemonstrationId} from './registration';

/**
 * Executable surfaces of the descent row: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const mechanicsGraphLoaders = {
    'mechanics-descent': () => import('./DescentGraph').then(m => () => new m.DescentGraph()),
} as const satisfies Record<MechanicsDemonstrationId, GraphLoader>;
