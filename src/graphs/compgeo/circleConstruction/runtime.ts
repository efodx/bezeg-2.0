import type {GraphLoader} from '../../projective/runtime';
import type {CircleConstructionDemonstrationId} from './registration';

/**
 * Executable surfaces of the circle-construction family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const circleConstructionGraphLoaders = {
    'circle-construction': () => import('../CircleConstructionGraph').then(m => () => new m.CircleConstructionGraph()),
} as const satisfies Record<CircleConstructionDemonstrationId, GraphLoader>;
