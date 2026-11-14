import React, {useId} from "react";
import {NumberInput, type NumberInputProps} from "./NumberInput";
import {joinIds} from "./describedBy";
import "./NumberGrid.css";

/** One cell: the NumberInput props of the field it replaces, with its accessible name as `label`. */
export type NumberGridCell = Omit<NumberInputProps, "label" | "compact" | "hideLabel" | "describedBy" | "help"> & {
    /** The cell's accessible name; no visible label is drawn (the grid's own label says what the cells are). */
    label: string;
};

interface NumberGridProps {
    /** The visible caption and the accessible name of the group, for example "Matrika A". */
    label: string;
    /** A number of equal columns (a matrix: 2), or "wrap" for one row that wraps into equal-width cells. */
    columns: number | "wrap";
    /** The cells in row-major order. */
    cells: readonly NumberGridCell[];
    /** Id(s) of elements that explain every cell (for example a help text or a notice); joined with `help`. */
    describedBy?: string;
    /** A short explanation shown under the grid; it describes the group and each cell. */
    help?: string;
}

/**
 * Typed number cells laid out in the rows and columns of the thing they edit (a matrix, a knot vector). The cells are compact
 * NumberInputs with hidden labels, so each keeps its own commit timing, refusal hint, keyboard steps and range; the grid adds only the
 * caption, the layout and the group. A refusal hint appears on its own line under the row of its cell.
 */
export function NumberGrid(props: NumberGridProps) {
    const id = useId();
    const captionId = `${id}-caption`;
    const helpId = `${id}-help`;
    const describedBy = joinIds(props.describedBy, props.help && helpId);
    const style = props.columns === "wrap" ? undefined : {"--number-grid-columns": props.columns} as React.CSSProperties;
    return <div className="number-grid" role="group" aria-labelledby={captionId} aria-describedby={describedBy}>
        <div id={captionId} className="number-grid-caption">{props.label}</div>
        <div className="number-grid-cells" data-columns={props.columns === "wrap" ? "wrap" : "fixed"} style={style}>
            {props.cells.map((cell, index) => <NumberInput key={index} {...cell} compact hideLabel describedBy={describedBy}/>)}
        </div>
        {props.help && <p id={helpId} className="number-grid-help">{props.help}</p>}
    </div>;
}
