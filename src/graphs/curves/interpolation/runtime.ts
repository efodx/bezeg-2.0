import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {InterpolationDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the interpolation family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const interpolationGraphLoaders = {
    'interp-lagrange': () => import('./InterpolationGraph').then(m => () => new m.default()),
    'interp-hermite': () => import('../hermite/HermiteGraph').then(m => () => new m.default()),
    'interp-runge': () => import('../../functions/RungeInterpolationGraph').then(m => () => new m.default()),
    'interp-least-squares': () => import('../../functions/LeastSquaresGraph').then(m => () => new m.default()),
    'interp-subdivision': () => import('../subdivisionCurves/SubdivisionCurveGraph').then(m => () => new m.default()),
} as const satisfies Record<InterpolationDemonstrationId, GraphLoader>;
