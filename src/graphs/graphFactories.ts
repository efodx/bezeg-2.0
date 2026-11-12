import {OrientationGraph} from './compgeo/OrientationGraph';
import {PolygonAreaGraph} from './compgeo/PolygonAreaGraph';
import {HullTraceGraph} from './compgeo/HullTraceGraph';
import {PointInPolygonGraph} from './compgeo/PointInPolygonGraph';
import {HullRobustnessGraph} from './compgeo/HullRobustnessGraph';
import {BezierHullsGraph} from './compgeo/BezierHullsGraph';
import {EarClippingGraph} from './compgeo/EarClippingGraph';
import {TriangulationGraph} from './compgeo/TriangulationGraph';
import {DelaunayGraph} from './compgeo/DelaunayGraph';
import {VoronoiGraph} from './compgeo/VoronoiGraph';
import {DegenerateSitesGraph} from './compgeo/DegenerateSitesGraph';
import {IntervalSweepGraph} from './compgeo/IntervalSweepGraph';
import {BentleyOttmannGraph} from './compgeo/BentleyOttmannGraph';
import {MonotonePartitionGraph} from './compgeo/MonotonePartitionGraph';
import {MonotoneTriangulationGraph} from './compgeo/MonotoneTriangulationGraph';
import {FortuneGraph} from './compgeo/FortuneGraph';
import { NotablePointsGraph } from './compgeo/NotablePointsGraph';
import { InscribedAngleGraph } from './compgeo/InscribedAngleGraph';
import { EulerLineGraph } from './compgeo/EulerLineGraph';
import { SimsonLineGraph } from './compgeo/SimsonLineGraph';
import { InversionGraph } from './compgeo/InversionGraph';
import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import type {DemonstrationId} from '../demonstrations';
import type {RegisteredDemonstrationId} from './graphLoaders';

/** Executable graph constructors of the legacy families, behind graph-route lazy imports; registered families load via `graphLoaders.ts`. */
export const graphFactories: Record<Exclude<DemonstrationId, RegisteredDemonstrationId>, () => BaseGraph<BaseGraphState>> = {
    'triangle-centres': () => new NotablePointsGraph(),
    'inscribed-angle': () => new InscribedAngleGraph(),
    'euler-line': () => new EulerLineGraph(),
    'simson-line': () => new SimsonLineGraph(),
    'inversion': () => new InversionGraph(),
    'orientation': () => new OrientationGraph(),
    'polygon-area': () => new PolygonAreaGraph(),
    'convex-hull': () => new HullTraceGraph(),
    'point-in-polygon': () => new PointInPolygonGraph(),
    'hull-robustness': () => new HullRobustnessGraph(),
    'bezier-hulls': () => new BezierHullsGraph(),
    'ear-clipping': () => new EarClippingGraph(),
    'point-set-triangulation': () => new TriangulationGraph(),
    'delaunay': () => new DelaunayGraph(),
    'voronoi': () => new VoronoiGraph(),
    'voronoi-degenerate': () => new DegenerateSitesGraph(),
    'interval-sweep': () => new IntervalSweepGraph(),
    'segment-intersections': () => new BentleyOttmannGraph(),
    'monotone-partition': () => new MonotonePartitionGraph(),
    'monotone-triangulation': () => new MonotoneTriangulationGraph(),
    'fortune': () => new FortuneGraph(),
};
