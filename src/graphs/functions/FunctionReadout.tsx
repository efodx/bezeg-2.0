import React from "react";
import {useT} from "../../localization";
import {ReadoutHeading, ReadoutHelp, ReadoutList} from "../base/controls/ReadoutParts";
import "./FunctionReadout.css";

export interface ReadoutRow {
    /** Stable key and test hook (data-readout). */
    id: string;
    label: React.ReactNode;
    /** Already formatted with formatNumber; must never contain Infinity or NaN. */
    value: string;
}

/**
 * Inspector readout for numeric results of a function demonstration. Values are formatted by the caller with
 * `formatNumber` from src/analysis/format so the board and the inspector agree.
 */
export function FunctionReadout(props: { title: string; rows: readonly ReadoutRow[]; note?: string | readonly string[] }) {
    useT();
    const notes = props.note === undefined ? [] : typeof props.note === "string" ? [props.note] : props.note;
    return <div className="inspector-group function-readout">
        <ReadoutHeading>{props.title}</ReadoutHeading>
        <ReadoutList label={props.title} rows={props.rows}/>
        {notes.map(note => <ReadoutHelp key={note} hooks={{"data-readout-note": ""}}>{note}</ReadoutHelp>)}
    </div>;
}

export interface LegendItem {
    /** Stable key and test hook (data-legend). */
    id: string;
    color: string;
    /** The meaning in words: colour is never the only cue. */
    label: string;
    /** `line` for a curve, `area` (default) for a shaded region, `dashed` for a lightly shaded region with a dashed outline,
     * `dashed-line` and `dotted-line` for a dashed or short-dashed line, `ring` for an open circular marker, `dot` for a filled
     * circular marker, `diamond` and `triangle` for filled markers, `plus` for + and `cross` for an x-shaped marker. */
    kind?: "area" | "line" | "dashed" | "dashed-line" | "dotted-line" | "ring" | "dot" | "cross" | "plus" | "diamond" | "triangle";
}

/** The kinds drawn with a coloured border instead of a filled background. */
const LINE_BORDER_KINDS: readonly string[] = ["dashed", "dashed-line", "dotted-line", "ring"];

/** The swatch colour: a border for the outline kinds, the text colour for the cross (drawn from two strokes), a background otherwise. */
function swatchStyle(item: LegendItem): React.CSSProperties {
    const kind = item.kind ?? "area";
    if (LINE_BORDER_KINDS.includes(kind)) return {borderColor: item.color};
    return kind === "cross" || kind === "plus" ? {color: item.color} : {backgroundColor: item.color};
}

/** A key of colour swatches with words, for shaded regions and curves that the board distinguishes only by colour. */
export function FunctionLegend(props: { items: readonly LegendItem[] }) {
    const t = useT();
    return <div className="inspector-group function-legend">
        <h3>{t("function_legend")}</h3>
        <ul>
            {props.items.map(item => <li key={item.id} data-legend={item.id}>
                <span className={`function-legend-swatch function-legend-${item.kind ?? "area"}`} style={swatchStyle(item)} aria-hidden="true"/>
                <span>{item.label}</span>
            </li>)}
        </ul>
    </div>;
}
