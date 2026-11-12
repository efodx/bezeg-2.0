import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {BezierDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the polynomial Bezier family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const bezierGraphLoaders = {
    'bezier': () => import('./BezierCurveGraph').then(m => () => new m.default()),
    'decasteljau': () => import('./DecasteljauGraph').then(m => () => new m.default()),
    'decasteljau-alternative': () => import('./DecasteljauGraph2').then(m => () => new m.default()),
    'affine': () => import('./AffineTransformsBezierCurveGraph').then(m => () => new m.default()),
    'subdivision': () => import('./SubdivisionGraph1').then(m => () => new m.default()),
    'repeated-subdivision': () => import('./SubdivisionGraph').then(m => () => new m.default()),
    'extrapolation': () => import('./ExtrapolationGraph').then(m => () => new m.default()),
    'elevation': () => import('./ElevationGraph').then(m => () => new m.default()),
    'reduction': () => import('../reduction/DegreeReductionGraph').then(m => () => new m.default()),
    'arc-length-param': () => import('../arclength/ArcLengthParametrizationGraph').then(m => () => new m.default()),
    'bezier-clipping': () => import('../../compgeo/BezierClippingGraph').then(m => () => new m.BezierClippingGraph()),
} as const satisfies Record<BezierDemonstrationId, GraphLoader>;
