import {bezier} from "./bezier";
import {bisection} from "./bisection";
import {curves} from "./curves";
import {dynamics} from "./dynamics";
import {functionInverse} from "./function-inverse";
import {linear} from "./linear";
import {patches} from "./patches";
import {projective} from "./projective";
import {taylor} from "./taylor";
import {transformations} from "./transformations";
import {workspaceShell} from "./workspace-shell";
import {workspace} from "./workspace";
import {workspacePucks} from "./workspace-pucks";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {bezier, bisection, curves, dynamics, functionInverse, linear, patches, projective, taylor, transformations, workspace, workspacePucks, workspaceShell};

export const fragmentSl = {...bezier.sl, ...bisection.sl, ...curves.sl, ...dynamics.sl, ...functionInverse.sl, ...linear.sl, ...patches.sl, ...projective.sl, ...taylor.sl, ...transformations.sl, ...workspace.sl, ...workspacePucks.sl, ...workspaceShell.sl};
export const fragmentEn = {...bezier.en, ...bisection.en, ...curves.en, ...dynamics.en, ...functionInverse.en, ...linear.en, ...patches.en, ...projective.en, ...taylor.en, ...transformations.en, ...workspace.en, ...workspacePucks.en, ...workspaceShell.en};
