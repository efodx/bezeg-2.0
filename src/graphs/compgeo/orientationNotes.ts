import {currentLanguage, message, type Message} from "../../localization";
import type {GridPoint} from "../../compgeo/grid";
import {formatBoardSigned, orientationReadout, type OrientationTurn} from "./orientationReadout";

/** The ids of the one sentence of the orientation readout: the turn, the missing points, or the hidden values. */
export type OrientationNoteId = "turn" | "missing" | "hidden";

/** The turn in words ("levi zavoj"), so colour is never the only signal. */
export function turnMessage(turn: OrientationTurn): Message {
    return turn === "left" ? message("pointset_orientation_left")
        : turn === "right" ? message("pointset_orientation_right") : message("pointset_orientation_collinear");
}

/**
 * The readout sentence of the orientation graph as a catalog message: the one source of the Orodja panel's text and of the
 * declaration's note (task 08). `exponent` is the grid step exponent: the grid-unit determinant is shown in board units.
 */
export function orientationNotes(points: readonly GridPoint[], exponent: number, valuesShown: boolean): {id: OrientationNoteId; text: Message}[] {
    if (!valuesShown) return [{id: "hidden", text: message("pointset_values_hidden")}];
    const readout = orientationReadout(points);
    if (readout.kind === "missing") return [{id: "missing", text: message("pointset_orientation_missing", {value0: 3 - readout.have})}];
    return [{id: "turn", text: message("pointset_orientation_readout", {
        value0: formatBoardSigned(readout.value, 2 * exponent, currentLanguage()), value1: turnMessage(readout.turn),
    })}];
}
