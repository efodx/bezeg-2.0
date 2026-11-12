import type BaseGraph from '../../base/BaseGraph';
import type {BaseGraphState} from '../../base/BaseGraph';
import type {ComputationalGeometryDemonstrationId} from './registration';

/** Resolves, after loading the graph module, to the synchronous constructor of one graph. */
export type GraphLoader = () => Promise<() => BaseGraph<BaseGraphState>>;

/**
 * Executable surfaces of the computational-geometry family: one lazy loader per Demonstration, so a route evaluates only its own graph.
 * Never imported by `registration.ts`, `collections.ts` or the catalog; composed in `src/graphs/graphLoaders.ts`.
 */
export const computationalGeometryGraphLoaders = {
    'orientation': () => import('../OrientationGraph').then(m => () => new m.OrientationGraph()),
    'polygon-area': () => import('../PolygonAreaGraph').then(m => () => new m.PolygonAreaGraph()),
    'convex-hull': () => import('../HullTraceGraph').then(m => () => new m.HullTraceGraph()),
    'point-in-polygon': () => import('../PointInPolygonGraph').then(m => () => new m.PointInPolygonGraph()),
    'hull-robustness': () => import('../HullRobustnessGraph').then(m => () => new m.HullRobustnessGraph()),
    'bezier-hulls': () => import('../BezierHullsGraph').then(m => () => new m.BezierHullsGraph()),
    'ear-clipping': () => import('../EarClippingGraph').then(m => () => new m.EarClippingGraph()),
    'point-set-triangulation': () => import('../TriangulationGraph').then(m => () => new m.TriangulationGraph()),
    'delaunay': () => import('../DelaunayGraph').then(m => () => new m.DelaunayGraph()),
    'voronoi': () => import('../VoronoiGraph').then(m => () => new m.VoronoiGraph()),
    'voronoi-degenerate': () => import('../DegenerateSitesGraph').then(m => () => new m.DegenerateSitesGraph()),
    'interval-sweep': () => import('../IntervalSweepGraph').then(m => () => new m.IntervalSweepGraph()),
    'segment-intersections': () => import('../BentleyOttmannGraph').then(m => () => new m.BentleyOttmannGraph()),
    'monotone-partition': () => import('../MonotonePartitionGraph').then(m => () => new m.MonotonePartitionGraph()),
    'monotone-triangulation': () => import('../MonotoneTriangulationGraph').then(m => () => new m.MonotoneTriangulationGraph()),
    'fortune': () => import('../FortuneGraph').then(m => () => new m.FortuneGraph()),
} as const satisfies Record<ComputationalGeometryDemonstrationId, GraphLoader>;
