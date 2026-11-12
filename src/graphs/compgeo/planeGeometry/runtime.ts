import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {PlaneGeometryDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the plane-geometry family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const planeGeometryGraphLoaders = {
    'triangle-centres': () => import('../NotablePointsGraph').then(m => () => new m.NotablePointsGraph()),
    'inscribed-angle': () => import('../InscribedAngleGraph').then(m => () => new m.InscribedAngleGraph()),
    'euler-line': () => import('../EulerLineGraph').then(m => () => new m.EulerLineGraph()),
    'simson-line': () => import('../SimsonLineGraph').then(m => () => new m.SimsonLineGraph()),
    'inversion': () => import('../InversionGraph').then(m => () => new m.InversionGraph()),
} as const satisfies Record<PlaneGeometryDemonstrationId, GraphLoader>;
