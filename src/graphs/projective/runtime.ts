import type BaseGraph from '../base/BaseGraph';
import type {BaseGraphState} from '../base/BaseGraph';
import type {ProjectiveDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the projective family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const projectiveGraphLoaders = {
    'projective-cross-ratio': () => import('./CrossRatioGraph').then(m => () => new m.CrossRatioGraph()),
    'projective-pascal': () => import('./PascalGraph').then(m => () => new m.PascalGraph()),
    'projective-pole-polar': () => import('./PolePolarGraph').then(m => () => new m.PolePolarGraph()),
    'projective-five-point': () => import('./FivePointGraph').then(m => () => new m.FivePointGraph()),
    'projective-three-views': () => import('./ThreeViewsGraph').then(m => () => new m.ThreeViewsGraph()),
} as const satisfies Record<ProjectiveDemonstrationId, GraphLoader>;
