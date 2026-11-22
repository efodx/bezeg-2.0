import {taylor} from "./taylor";

/** Every fragment by family; add a new family here and nowhere else. `sl.ts` and `en.ts` spread the merged objects. */
export const catalogFragments = {taylor};

export const fragmentSl = {...taylor.sl};
export const fragmentEn = {...taylor.en};
