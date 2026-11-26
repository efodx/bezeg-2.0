import {arcLength} from "./arc-length";
import {areaBetweenCurves} from "./area-between-curves";
import {continuity} from "./continuity";
import {definiteIntegral} from "./definite-integral";
import {derivative} from "./derivative";
import {bezier} from "./bezier";
import {bezierClipping} from "./bezier-clipping";
import {bisection} from "./bisection";
import {bsplineBlossom} from "./bspline-blossom";
import {curves} from "./curves";
import {dynamics} from "./dynamics";
import {functionInverse} from "./function-inverse";
import {linear} from "./linear";
import {patches} from "./patches";
import {projective} from "./projective";
import {rootFinding} from "./root-finding";
import {taylor} from "./taylor";
import {transformations} from "./transformations";
import {workspaceShell} from "./workspace-shell";
import {workspace} from "./workspace";
import {workspacePucks} from "./workspace-pucks";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {arcLength, areaBetweenCurves, continuity, definiteIntegral, derivative, bezier, bezierClipping, bisection, bsplineBlossom, curves, dynamics, functionInverse, linear, patches, projective, rootFinding, taylor, transformations, workspace, workspacePucks, workspaceShell};

export const fragmentSl = {...arcLength.sl, ...areaBetweenCurves.sl, ...continuity.sl, ...definiteIntegral.sl, ...derivative.sl, ...bezier.sl, ...bezierClipping.sl, ...bisection.sl, ...bsplineBlossom.sl, ...curves.sl, ...dynamics.sl, ...functionInverse.sl, ...linear.sl, ...patches.sl, ...projective.sl, ...rootFinding.sl, ...taylor.sl, ...transformations.sl, ...workspace.sl, ...workspacePucks.sl, ...workspaceShell.sl};
export const fragmentEn = {...arcLength.en, ...areaBetweenCurves.en, ...continuity.en, ...definiteIntegral.en, ...derivative.en, ...bezier.en, ...bezierClipping.en, ...bisection.en, ...bsplineBlossom.en, ...curves.en, ...dynamics.en, ...functionInverse.en, ...linear.en, ...patches.en, ...projective.en, ...rootFinding.en, ...taylor.en, ...transformations.en, ...workspace.en, ...workspacePucks.en, ...workspaceShell.en};
