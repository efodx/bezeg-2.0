import type {GraphLoader} from '../projective/runtime';
import type {RandomDemonstrationId} from './registration';

/**
 * Executable surfaces of the simulation row: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const randomGraphLoaders = {
    'prob-simulation': () => import('./SimulationGraph').then(m => () => new m.SimulationGraph()),
} as const satisfies Record<RandomDemonstrationId, GraphLoader>;
