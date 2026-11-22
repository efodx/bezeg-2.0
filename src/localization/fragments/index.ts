import {bezier} from "./bezier";
import {dynamics} from "./dynamics";
import {taylor} from "./taylor";
import {transformations} from "./transformations";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {bezier, dynamics, taylor, transformations};

export const fragmentSl = {...bezier.sl, ...dynamics.sl, ...taylor.sl, ...transformations.sl};
export const fragmentEn = {...bezier.en, ...dynamics.en, ...taylor.en, ...transformations.en};
