import React from 'react';
import routes from './Routes';
import { BernsteinGraph } from './graphs/bernstein/BernsteinGraph';
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
    expect(children.filter(route => route.path && route.path !== '/bezeg/demonstrations')).toHaveLength(26);
    expect(graphFor('/bezeg/bernstein')).toBe(BernsteinGraph);
    expect(graphFor('/bezeg/bezier/curve')).toBe(BezierCurveGraph);
    expect(graphFor('/bezeg/bezier/decasteljau')).toBe(DecasteljauGraph);
    expect(graphFor('/bezeg/bezier/decasteljau2')).toBe(DecasteljauGraph2);
    expect(graphFor('/bezeg/bezier/affine')).toBe(AffineTransformBezierCurveGraph);
    expect(graphFor('/bezeg/bezier/subdivision-2')).toBe(DecasteljauGraph3);
    expect(graphFor('/bezeg/bezier/subdivision')).toBe(SubdivisionGraph);
    expect(graphFor('/bezeg/bezier/extrapolation')).toBe(ExtrapolationGraph);
    expect(graphFor('/bezeg/bezier/elevation')).toBe(ElevationGraph);
    expect(graphFor('/bezeg/rational/base')).toBe(RationalBezierCurveGraph);
    expect(graphFor('/bezeg/rational/rational-decasteljau')).toBe(RationalDecasteljauGraph);
    expect(graphFor('/bezeg/rational/rational-elevation')).toBe(RationalElevationGraph);
    expect(graphFor('/bezeg/rational/rational-extrapolation')).toBe(RationalExtrapolationGraph);
    expect(graphFor('/bezeg/rational/rational-subdivision')).toBe(RationalSubdivisionGraph2);
    expect(graphFor('/bezeg/rational/farin-points')).toBe(FarinPointsCurveGraph);
    expect(graphFor('/bezeg/rational/circlen')).toBe(RationalBezierCurveCircleGraphN);
    expect(graphFor('/bezeg/spline/spline')).toBe(CnSplineGraph);
    expect(graphFor('/bezeg/spline/c1spline')).toBe(C1SplineGraph);
    expect(graphFor('/bezeg/spline/c2spline')).toBe(C2SplineGraph);
    expect(graphFor('/bezeg/spline/g1spline')).toBe(G1SplineGraph);
    expect(graphFor('/bezeg/spline/g1-sym-spline')).toBe(G1SymmetricSplineGraph);
    expect(graphFor('/bezeg/ph/cubic')).toBe(CubicPhBezierCurveGraph);
    expect(graphFor('/bezeg/ph/quintic')).toBe(QuinticPhBezierCurve);
    expect(graphFor('/bezeg/param/param/alphaparam2')).toBe(SplineAlphaParametrizationGraph);
    expect(graphFor('/bezeg/param/param/alphaparam')).toBe(AlphaParamBezierCurveGraph);
    expect(graphFor('/bezeg/param/param/uniform')).toBe(UniformParamBezierCurveGraph);
});
