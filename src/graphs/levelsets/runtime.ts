import type {GraphLoader} from '../projective/runtime';
import type {LevelSetsDemonstrationId} from './registration';

/**
 * Executable surfaces of the level-set rows: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const levelSetsGraphLoaders = {
    'contour-map': () => import('./ContourMapGraph').then(m => () => new m.ContourMapGraph()),
    'linear-program': () => import('./LinearProgramGraph').then(m => () => new m.LinearProgramGraph()),
} as const satisfies Record<LevelSetsDemonstrationId, GraphLoader>;
