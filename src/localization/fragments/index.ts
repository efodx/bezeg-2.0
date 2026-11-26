import {arcLength} from "./arc-length";
import {areaBetweenCurves} from "./area-between-curves";
import {continuity} from "./continuity";
import {definiteIntegral} from "./definite-integral";
import {derivative} from "./derivative";
import {bezier} from "./bezier";
import {bezierClipping} from "./bezier-clipping";
import {bisection} from "./bisection";
import {bsplineBlossom} from "./bspline-blossom";
import {bsplineExtraction} from "./bspline-extraction";
import {bsplineInsertion} from "./bspline-insertion";
import {bsplineNurbs} from "./bspline-nurbs";
import {circleConstruction} from "./circle-construction";
import {curves} from "./curves";
import {dynamics} from "./dynamics";
import {eulerMethod} from "./euler-method";
import {functionInverse} from "./function-inverse";
import {interpLeastSquares} from "./interp-least-squares";
import {linear} from "./linear";
import {linearFunction} from "./linear-function";
import {trigonometricFunctions} from "./trigonometric-functions";
import {patches} from "./patches";
import {projective} from "./projective";
import {reduction} from "./reduction";
import {rootFinding} from "./root-finding";
import {taylor} from "./taylor";
import {transformations} from "./transformations";
import {workspaceShell} from "./workspace-shell";
import {workspace} from "./workspace";
import {workspacePucks} from "./workspace-pucks";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {arcLength, areaBetweenCurves, continuity, definiteIntegral, derivative, bezier, bezierClipping, bisection, bsplineBlossom, bsplineExtraction, bsplineInsertion, bsplineNurbs, circleConstruction, curves, dynamics, eulerMethod, functionInverse, interpLeastSquares, linear, linearFunction, patches, projective, reduction, rootFinding, taylor, transformations, trigonometricFunctions, workspace, workspacePucks, workspaceShell};

export const fragmentSl = {...arcLength.sl, ...areaBetweenCurves.sl, ...continuity.sl, ...definiteIntegral.sl, ...derivative.sl, ...bezier.sl, ...bezierClipping.sl, ...bisection.sl, ...bsplineBlossom.sl, ...bsplineExtraction.sl, ...bsplineInsertion.sl, ...bsplineNurbs.sl, ...circleConstruction.sl, ...curves.sl, ...dynamics.sl, ...eulerMethod.sl, ...functionInverse.sl, ...interpLeastSquares.sl, ...linear.sl, ...linearFunction.sl, ...patches.sl, ...projective.sl, ...reduction.sl, ...rootFinding.sl, ...taylor.sl, ...transformations.sl, ...trigonometricFunctions.sl,...workspace.sl, ...workspacePucks.sl, ...workspaceShell.sl};
export const fragmentEn = {...arcLength.en, ...areaBetweenCurves.en, ...continuity.en, ...definiteIntegral.en, ...derivative.en, ...bezier.en, ...bezierClipping.en, ...bisection.en, ...bsplineBlossom.en, ...bsplineExtraction.en, ...bsplineInsertion.en, ...bsplineNurbs.en, ...circleConstruction.en, ...curves.en, ...dynamics.en, ...eulerMethod.en, ...functionInverse.en, ...interpLeastSquares.en, ...linear.en, ...linearFunction.en, ...patches.en, ...projective.en, ...reduction.en, ...rootFinding.en, ...taylor.en, ...transformations.en, ...trigonometricFunctions.en,...workspace.en, ...workspacePucks.en, ...workspaceShell.en};
