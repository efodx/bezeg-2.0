import {bezier} from "./bezier";
import {dynamics} from "./dynamics";
import {linear} from "./linear";
import {patches} from "./patches";
import {projective} from "./projective";
import {taylor} from "./taylor";
import {transformations} from "./transformations";
import {workspaceShell} from "./workspace-shell";
import {workspace} from "./workspace";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {bezier, dynamics, linear, patches, projective, taylor, transformations, workspace, workspaceShell};

export const fragmentSl = {...bezier.sl, ...dynamics.sl, ...linear.sl, ...patches.sl, ...projective.sl, ...taylor.sl, ...transformations.sl, ...workspace.sl, ...workspaceShell.sl};
export const fragmentEn = {...bezier.en, ...dynamics.en, ...linear.en, ...patches.en, ...projective.en, ...taylor.en, ...transformations.en, ...workspace.en, ...workspaceShell.en};
