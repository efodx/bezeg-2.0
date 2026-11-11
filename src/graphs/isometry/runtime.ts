import type {GraphLoader} from '../projective/runtime';
import type {IsometryDemonstrationId} from './registration';

/**
 * Executable surfaces of the isometry family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const isometryGraphLoaders = {
    'isometries': () => import('./IsometryGraph').then(m => () => new m.IsometryGraph()),
} as const satisfies Record<IsometryDemonstrationId, GraphLoader>;
