import type {GraphLoader} from '../projective/runtime';
import type {LineDemonstrationId} from './registration';

/**
 * Executable surfaces of the line-geometry family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const lineGraphLoaders = {
    'line-geometry': () => import('./LineGeometryGraph').then(m => () => new m.LineGeometryGraph()),
} as const satisfies Record<LineDemonstrationId, GraphLoader>;
