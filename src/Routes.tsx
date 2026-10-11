import {useLanguage} from "./localization";
import { ErrorPage } from './ErrorPage';
import App from './App';
import { WelcomePage } from './WelcomePage';
import { DemonstrationsPage } from './DemonstrationsPage';
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
import { LinearFunctionGraph } from './graphs/functions/LinearFunctionGraph';
import { ExponentialFunctionGraph } from './graphs/functions/ExponentialFunctionGraph';
import { TrigonometricFunctionsGraph } from './graphs/functions/TrigonometricFunctionsGraph';
import { RefreshContext } from './graphs/context/react/RefreshContext';
import { useState } from 'react';
import RationalSubdivisionGraph2
  from './graphs/curves/rational/RationalSubdivisionGraph2';
import RationalBezierCurveGraph
  from './graphs/curves/rational/RationalBezierCurveGraph';

import React, {ReactNode} from 'react';
import {DemonstrationId, getDemonstrationCatalog} from './demonstrations';

// The routing adapter owns executable graphs; metadata owns identity and paths.
const graphElements: Record<DemonstrationId, ReactNode> = {
    'bernstein': <BernsteinGraph/>,
    'bezier': <BezierCurveGraph/>,
    'decasteljau': <DecasteljauGraph/>,
    'decasteljau-alternative': <DecasteljauGraph2/>,
    'affine': <AffineTransformBezierCurveGraph/>,
    'subdivision': <DecasteljauGraph3/>,
    'repeated-subdivision': <SubdivisionGraph/>,
    'extrapolation': <ExtrapolationGraph/>,
    'elevation': <ElevationGraph/>,
    'rational': <RationalBezierCurveGraph/>,
    'rational-decasteljau': <RationalDecasteljauGraph/>,
    'rational-elevation': <RationalElevationGraph/>,
    'rational-extrapolation': <RationalExtrapolationGraph/>,
    'rational-subdivision': <RationalSubdivisionGraph2/>,
    'farin': <FarinPointsCurveGraph/>,
    'circle': <RationalBezierCurveCircleGraphN/>,
    'spline-cn': <CnSplineGraph/>,
    'spline-c1': <C1SplineGraph/>,
    'spline-c2': <C2SplineGraph/>,
    'spline-g1': <G1SplineGraph/>,
    'spline-g1-symmetric': <G1SymmetricSplineGraph/>,
    'ph-cubic': <CubicPhBezierCurveGraph/>,
    'ph-quintic': <QuinticPhBezierCurve/>,
    'spline-parameterization': <SplineAlphaParametrizationGraph/>,
    'weighted-parameterization': <AlphaParamBezierCurveGraph/>,
    'uniform-parameterization': <UniformParamBezierCurveGraph/>,
    'linear-function': <LinearFunctionGraph/>,
    'exponential-function': <ExponentialFunctionGraph/>,
    'trigonometric-functions': <TrigonometricFunctionsGraph/>,
};

function Refresher({children}: {children: ReactNode}) {
    useLanguage();
    const [key, setKey] = useState(1);
    return <RefreshContext.Provider value={() => {setKey(current => current + 1); return undefined;}}>
        <div key={key}>{children}</div>
    </RefreshContext.Provider>;
}

const routes = [{
    path: '/bezeg-2.0', element: <App/>, errorElement: <ErrorPage/>,
    children: [
        {index: true, element: <Refresher><WelcomePage/></Refresher>},
        {path: '/bezeg-2.0/demonstrations', element: <Refresher><DemonstrationsPage/></Refresher>},
        ...getDemonstrationCatalog().demonstrations.map(({id, path}) => ({
            path, element: <Refresher>{graphElements[id]}</Refresher>,
        })),
    ],
}];

export default routes;
