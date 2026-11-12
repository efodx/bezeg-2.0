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
import { BisectionGraph } from './functions/BisectionGraph';
import { RootFindingGraph } from './functions/RootFindingGraph';
import { QuadratureGraph } from './functions/QuadratureGraph';
import { EulerGraph } from './functions/EulerGraph';
import { FourierSeriesGraph } from './functions/FourierSeriesGraph';
import { FourierCoefficientsGraph } from './functions/FourierCoefficientsGraph';
import { EpicycleGraph } from './functions/EpicycleGraph';
import { MeanValueGraph } from './functions/MeanValueGraph';
import { AccumulationGraph } from './functions/AccumulationGraph';
import { DarbouxGraph } from './functions/DarbouxGraph';
import { ExtremaGraph } from './functions/ExtremaGraph';
import { ConvexityGraph } from './functions/ConvexityGraph';
import { TaylorGraph } from './functions/TaylorGraph';
import { SequenceGraph } from './functions/SequenceGraph';
import { UniformConvergenceGraph } from './functions/UniformConvergenceGraph';
import { ComplexReciprocalGraph } from './complex/ComplexReciprocalGraph';
import { ComplexRootsGraph } from './complex/ComplexRootsGraph';
import { NotablePointsGraph } from './compgeo/NotablePointsGraph';
import { InscribedAngleGraph } from './compgeo/InscribedAngleGraph';
import { EulerLineGraph } from './compgeo/EulerLineGraph';
import { SimsonLineGraph } from './compgeo/SimsonLineGraph';
import { InversionGraph } from './compgeo/InversionGraph';
import { LinearMapGraph } from './linear/LinearMapGraph';
import { FixedPointGraph } from './functions/FixedPointGraph';
import DensityAreaGraph from './functions/DensityAreaGraph';
import BinomialNormalGraph from './functions/BinomialNormalGraph';
import CltGraph from './functions/CltGraph';
import SummaryStatisticsGraph from './functions/SummaryStatisticsGraph';
import CorrelationGraph from './functions/CorrelationGraph';
import type BaseGraph from './base/BaseGraph';
import type {BaseGraphState} from './base/BaseGraph';
import type {DemonstrationId} from '../demonstrations';
import type {RegisteredDemonstrationId} from './graphLoaders';

/** Executable graph constructors of the legacy families, behind graph-route lazy imports; registered families load via `graphLoaders.ts`. */
export const graphFactories: Record<Exclude<DemonstrationId, RegisteredDemonstrationId>, () => BaseGraph<BaseGraphState>> = {
    'bisection': () => new BisectionGraph(),
    'root-finding': () => new RootFindingGraph(),
    'quadrature': () => new QuadratureGraph(),
    'euler-method': () => new EulerGraph(),
    'mean-value': () => new MeanValueGraph(),
    'accumulation': () => new AccumulationGraph(),
    'darboux': () => new DarbouxGraph(),
    'extrema': () => new ExtremaGraph(),
    'convexity': () => new ConvexityGraph(),
    'taylor': () => new TaylorGraph(),
    'sequence': () => new SequenceGraph(),
    'uniform-convergence': () => new UniformConvergenceGraph(),
    'fourier-series': () => new FourierSeriesGraph(),
    'fourier-coefficients': () => new FourierCoefficientsGraph(),
    'epicycles': () => new EpicycleGraph(),
    'fixed-point': () => new FixedPointGraph(),
    'prob-density': () => new DensityAreaGraph(),
    'prob-binomial-normal': () => new BinomialNormalGraph(),
    'prob-clt': () => new CltGraph(),
    'prob-summary': () => new SummaryStatisticsGraph(),
    'prob-correlation': () => new CorrelationGraph(),
    'linear-map': () => new LinearMapGraph(),
    'complex-reciprocal': () => new ComplexReciprocalGraph(),
    'complex-roots': () => new ComplexRootsGraph(),
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
