import {bezier} from "./bezier";
import {dynamics} from "./dynamics";
import {linear} from "./linear";
import {projective} from "./projective";
import {taylor} from "./taylor";
import {transformations} from "./transformations";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {bezier, dynamics, linear, projective, taylor, transformations};

export const fragmentSl = {...bezier.sl, ...dynamics.sl, ...linear.sl, ...projective.sl, ...taylor.sl, ...transformations.sl};
export const fragmentEn = {...bezier.en, ...dynamics.en, ...linear.en, ...projective.en, ...taylor.en, ...transformations.en};
