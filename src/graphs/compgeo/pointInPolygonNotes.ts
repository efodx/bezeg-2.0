import {message, type Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import type {PointSetModel} from "../../compgeo/pointSetModel";
import {pointInPolygonReadout} from "./pointInPolygonReadout";

export type PointInPolygonNoteId =
    | "hidden" | "open" | "too-few" | "location" | "boundary-note" | "crossings" | "even-odd" | "winding" | "nonzero" | "not-simple";

const windingText = (winding: number): string => (winding < 0 ? `−${-winding}` : String(winding));

/**
 * The readout sentences of the point-in-polygon graph as catalog messages: the one source of the Orodja panel's text and of the
 * declaration's notes (task 08). The first note is the live one (where q is, or why that is unknown).
 */
export function pointInPolygonNotes(model: PointSetModel, query: GridPoint, valuesShown: boolean): {id: PointInPolygonNoteId; text: Message}[] {
    if (!valuesShown) return [{id: "hidden", text: message("pointinpolygon_values_hidden")}];
    const readout = pointInPolygonReadout(model, query);
    if (readout.kind === "message") {
        return [readout.reason === "open" ? {id: "open", text: message("pointinpolygon_open")}
            : {id: "too-few", text: message("pointinpolygon_too_few", {value0: readout.missing})}];
    }
    if (readout.kind === "boundary") {
        return [{id: "location", text: message("pointinpolygon_location_boundary")}, {id: "boundary-note", text: message("pointinpolygon_boundary_note")}];
    }
    return [
        {id: "location", text: message(readout.location === "inside" ? "pointinpolygon_location_inside"
            : readout.location === "outside" ? "pointinpolygon_location_outside" : "pointinpolygon_location_rules_differ")},
        {id: "crossings", text: message("pointinpolygon_crossings", {value0: readout.crossings})},
        {id: "even-odd", text: message(readout.evenOdd === "inside" ? "pointinpolygon_even_odd_inside" : "pointinpolygon_even_odd_outside")},
        {id: "winding", text: message("pointinpolygon_winding", {value0: windingText(readout.winding)})},
        {id: "nonzero", text: message(readout.nonzero === "inside" ? "pointinpolygon_nonzero_inside" : "pointinpolygon_nonzero_outside")},
        ...(readout.simple ? [] : [{id: "not-simple" as const, text: message("pointinpolygon_not_simple")}]),
    ];
}
