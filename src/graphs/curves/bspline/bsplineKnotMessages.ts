import {message, Message} from "../../../localization";
import type {KnotVectorError} from "../../../bezeg/impl/curve/bspline";

/**
 * The localized refusal for a kernel knot-vector failure of `knots` (degree `degree`, `n + 1` control points or basis functions).
 * Shared by the Preset collection and the knot editor, so an import and a typed knot give the same wording.
 */
export function knotRejectionMessage(reason: KnotVectorError, knots: readonly number[], degree: number, n: number): Message {
    switch (reason) {
        case "not_finite": return message("bspline_knots_not_finite");
        case "wrong_length": return message("bspline_knots_wrong_length", {value0: n + degree + 2, value1: knots.length});
        case "decreasing": return message("bspline_knots_decreasing", {value0: knots.findIndex((knot, i) => i > 0 && knot < knots[i - 1]) + 1});
        case "multiplicity_too_high": return message("bspline_knots_multiplicity_too_high", {value0: degree + 1});
        case "empty_domain": return message("bspline_knots_empty_domain");
    }
}
