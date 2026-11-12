import type {GraphLoader} from '../projective/runtime';
import type {SolidsDemonstrationId} from './registration';

/**
 * Executable surfaces of the solids row: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const solidsGraphLoaders = {
    solids: () => import('./SolidsGraph').then(m => () => new m.default()),
} as const satisfies Record<SolidsDemonstrationId, GraphLoader>;
