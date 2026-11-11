import type {GraphLoader} from '../../projective/runtime';
import type {WavesDemonstrationId} from './registration';

/**
 * Executable surfaces of the waves row: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const wavesGraphLoaders = {
    'waves': () => import('../WavesGraph').then(m => () => new m.WavesGraph()),
} as const satisfies Record<WavesDemonstrationId, GraphLoader>;
