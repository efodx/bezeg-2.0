import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {BsplineDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the B-spline family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const bsplineGraphLoaders = {
    'bspline-basis': () => import('./BSplineBasisGraph').then(m => () => new m.default()),
    'bspline-deboor': () => import('./DeBoorGraph').then(m => () => new m.default()),
    'bspline-insertion': () => import('./BSplineInsertionGraph').then(m => () => new m.default()),
    'bspline-extraction': () => import('./BSplineExtractionGraph').then(m => () => new m.default()),
    'bspline-nurbs': () => import('./BSplineNurbsGraph').then(m => () => new m.BSplineNurbsGraph()),
    'bspline-blossom': () => import('./BSplineBlossomGraph').then(m => () => new m.BSplineBlossomGraph()),
} as const satisfies Record<BsplineDemonstrationId, GraphLoader>;
