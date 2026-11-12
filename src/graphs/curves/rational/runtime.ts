import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {RationalDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the rational Bezier family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const rationalGraphLoaders = {
    'rational': () => import('./RationalBezierCurveGraph').then(m => () => new m.default()),
    'rational-decasteljau': () => import('./RationalDecasteljauGraph').then(m => () => new m.default()),
    'rational-elevation': () => import('./RationalElevationGraph').then(m => () => new m.default()),
    'rational-extrapolation': () => import('./RationalExtrapolationGraph').then(m => () => new m.default()),
    'rational-subdivision': () => import('./RationalSubdivisionGraph2').then(m => () => new m.default()),
    'farin': () => import('./FarinPointsCurveGraph').then(m => () => new m.default()),
    'circle': () => import('./RationalBezierCurveCircleGraphN').then(m => () => new m.default()),
} as const satisfies Record<RationalDemonstrationId, GraphLoader>;
