import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {MapsDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the maps family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const mapsGraphLoaders = {
    'linear-map': () => import('../linear/LinearMapGraph').then(m => () => new m.LinearMapGraph()),
    'complex-reciprocal': () => import('../complex/ComplexReciprocalGraph').then(m => () => new m.ComplexReciprocalGraph()),
    'complex-roots': () => import('../complex/ComplexRootsGraph').then(m => () => new m.ComplexRootsGraph()),
} as const satisfies Record<MapsDemonstrationId, GraphLoader>;
