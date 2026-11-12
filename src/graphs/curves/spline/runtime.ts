import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {SplineDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the splines family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const splineGraphLoaders = {
    'spline-cn': () => import('./CnSplineGraph').then(m => () => new m.default()),
    'spline-c1': () => import('./C1SplineGraph').then(m => () => new m.default()),
    'spline-c2': () => import('./C2SplineGraph').then(m => () => new m.default()),
    'spline-g1': () => import('./G1SplineGraph').then(m => () => new m.default()),
    'spline-g1-symmetric': () => import('./G1SymmetricSplineGraph').then(m => () => new m.default()),
} as const satisfies Record<SplineDemonstrationId, GraphLoader>;
