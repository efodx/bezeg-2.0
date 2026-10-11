import React from 'react';
import routes from './Routes';
import { BernsteinGraph } from './graphs/bernstein/BernsteinGraph';
import { LinearFunctionGraph } from './graphs/functions/LinearFunctionGraph';
import { ExponentialFunctionGraph } from './graphs/functions/ExponentialFunctionGraph';
import { TrigonometricFunctionsGraph } from './graphs/functions/TrigonometricFunctionsGraph';
import { ContinuityGraph } from './graphs/functions/ContinuityGraph';
import { DerivativeGraph } from './graphs/functions/DerivativeGraph';
import BezierCurveGraph from './graphs/curves/bezier/BezierCurveGraph';
import DecasteljauGraph from './graphs/curves/bezier/DecasteljauGraph';
import DecasteljauGraph2 from './graphs/curves/bezier/DecasteljauGraph2';
import AffineTransformBezierCurveGraph
  from './graphs/curves/bezier/AffineTransformsBezierCurveGraph';
import DecasteljauGraph3 from './graphs/curves/bezier/SubdivisionGraph1';
import ExtrapolationGraph from './graphs/curves/bezier/ExtrapolationGraph';
import ElevationGraph from './graphs/curves/bezier/ElevationGraph';
import UniformParamBezierCurveGraph
  from './graphs/curves/parametrisations/UniformParamBezierCurveGraph';
import AlphaParamBezierCurveGraph
  from './graphs/curves/parametrisations/AlphaParamBezierCurveGraph';
import QuinticPhBezierCurve from './graphs/curves/ph/QuinticPhBezierCurveGraph';
import CubicPhBezierCurveGraph from './graphs/curves/ph/CubicPhBezierCurveGraph';
import G1SymmetricSplineGraph
  from './graphs/curves/spline/G1SymmetricSplineGraph';
import G1SplineGraph from './graphs/curves/spline/G1SplineGraph';
import C2SplineGraph from './graphs/curves/spline/C2SplineGraph';
import C1SplineGraph from './graphs/curves/spline/C1SplineGraph';
import RationalBezierCurveCircleGraphN
  from './graphs/curves/rational/RationalBezierCurveCircleGraphN';
import FarinPointsCurveGraph
  from './graphs/curves/rational/FarinPointsCurveGraph';
import RationalExtrapolationGraph
  from './graphs/curves/rational/RationalExtrapolationGraph';
import RationalElevationGraph
  from './graphs/curves/rational/RationalElevationGraph';
import RationalDecasteljauGraph
  from './graphs/curves/rational/RationalDecasteljauGraph';
import SubdivisionGraph from './graphs/curves/bezier/SubdivisionGraph';
import CnSplineGraph from './graphs/curves/spline/CnSplineGraph';
import SplineAlphaParametrizationGraph
  from './graphs/curves/parametrisations/SplineAlphaParametrizationGraph';
import RationalSubdivisionGraph2
  from './graphs/curves/rational/RationalSubdivisionGraph2';
import RationalBezierCurveGraph
  from './graphs/curves/rational/RationalBezierCurveGraph';


// Verify the observable route-to-graph contract without mounting imperative boards.
test('all existing graph URLs retain their graph implementations', () => {
    const children = routes[0].children;
    const graphFor = (path: string) => {
        const route = children.find(entry => entry.path === path)!;
        const graph = route.element.props.children as React.ReactElement;
        return graph.type;
    };
    expect(children.filter(route => route.path && route.path !== '/bezeg-2.0/demonstrations')).toHaveLength(31);
    expect(graphFor('/bezeg-2.0/bernstein')).toBe(BernsteinGraph);
    expect(graphFor('/bezeg-2.0/bezier/curve')).toBe(BezierCurveGraph);
    expect(graphFor('/bezeg-2.0/bezier/decasteljau')).toBe(DecasteljauGraph);
    expect(graphFor('/bezeg-2.0/bezier/decasteljau2')).toBe(DecasteljauGraph2);
    expect(graphFor('/bezeg-2.0/bezier/affine')).toBe(AffineTransformBezierCurveGraph);
    expect(graphFor('/bezeg-2.0/bezier/subdivision-2')).toBe(DecasteljauGraph3);
    expect(graphFor('/bezeg-2.0/bezier/subdivision')).toBe(SubdivisionGraph);
    expect(graphFor('/bezeg-2.0/bezier/extrapolation')).toBe(ExtrapolationGraph);
    expect(graphFor('/bezeg-2.0/bezier/elevation')).toBe(ElevationGraph);
    expect(graphFor('/bezeg-2.0/rational/base')).toBe(RationalBezierCurveGraph);
    expect(graphFor('/bezeg-2.0/rational/rational-decasteljau')).toBe(RationalDecasteljauGraph);
    expect(graphFor('/bezeg-2.0/rational/rational-elevation')).toBe(RationalElevationGraph);
    expect(graphFor('/bezeg-2.0/rational/rational-extrapolation')).toBe(RationalExtrapolationGraph);
    expect(graphFor('/bezeg-2.0/rational/rational-subdivision')).toBe(RationalSubdivisionGraph2);
    expect(graphFor('/bezeg-2.0/rational/farin-points')).toBe(FarinPointsCurveGraph);
    expect(graphFor('/bezeg-2.0/rational/circlen')).toBe(RationalBezierCurveCircleGraphN);
    expect(graphFor('/bezeg-2.0/spline/spline')).toBe(CnSplineGraph);
    expect(graphFor('/bezeg-2.0/spline/c1spline')).toBe(C1SplineGraph);
    expect(graphFor('/bezeg-2.0/spline/c2spline')).toBe(C2SplineGraph);
    expect(graphFor('/bezeg-2.0/spline/g1spline')).toBe(G1SplineGraph);
    expect(graphFor('/bezeg-2.0/spline/g1-sym-spline')).toBe(G1SymmetricSplineGraph);
    expect(graphFor('/bezeg-2.0/ph/cubic')).toBe(CubicPhBezierCurveGraph);
    expect(graphFor('/bezeg-2.0/ph/quintic')).toBe(QuinticPhBezierCurve);
    expect(graphFor('/bezeg-2.0/param/param/alphaparam2')).toBe(SplineAlphaParametrizationGraph);
    expect(graphFor('/bezeg-2.0/param/param/alphaparam')).toBe(AlphaParamBezierCurveGraph);
    expect(graphFor('/bezeg-2.0/param/param/uniform')).toBe(UniformParamBezierCurveGraph);
    expect(graphFor('/bezeg-2.0/functions/linear')).toBe(LinearFunctionGraph);
    expect(graphFor('/bezeg-2.0/functions/exponential')).toBe(ExponentialFunctionGraph);
    expect(graphFor('/bezeg-2.0/functions/trigonometric')).toBe(TrigonometricFunctionsGraph);
    expect(graphFor('/bezeg-2.0/functions/continuity')).toBe(ContinuityGraph);
    expect(graphFor('/bezeg-2.0/functions/derivative')).toBe(DerivativeGraph);
});
