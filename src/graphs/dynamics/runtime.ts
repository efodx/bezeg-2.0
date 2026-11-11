import type {GraphLoader} from '../projective/runtime';
import type {DynamicsDemonstrationId} from './registration';

/**
 * Executable surfaces of the dynamics rows: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const dynamicsGraphLoaders = {
    'phase-portrait': () => import('./PhasePortraitGraph').then(m => () => new m.PhasePortraitGraph()),
    'logistic-map': () => import('./LogisticMapGraph').then(m => () => new m.LogisticMapGraph()),
} as const satisfies Record<DynamicsDemonstrationId, GraphLoader>;
