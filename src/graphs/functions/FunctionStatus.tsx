import React from "react";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";

export interface FunctionStatusLine {
    id: string;
    text: string;
}

/**
 * A function graph's visible status group and its one announcement region (spec C21, decision 18). The visible lines carry no
 * live role, so a change is not re-read line by line; the hidden {@link LiveReadout} announces all lines as one sentence once
 * the edit has settled, because the lines also change on every frame of a board drag. Pass `muted={playing}` on a graph with
 * a run. `dataAttribute` names the per-line marker (`data-<name>={line.id}`) the graph's tests read.
 */
export function FunctionStatus({className, lines, dataAttribute, muted = false}: {
    className?: string;
    lines: readonly FunctionStatusLine[];
    dataAttribute?: string;
    muted?: boolean;
}) {
    const readout = useStatusReadout(lines.map(line => line.text).join("\n"), true);
    return <>
        <div className={["inspector-group", "function-status", className].filter(Boolean).join(" ")}>
            {lines.map(line => <p key={line.id} className="inspector-help" {...(dataAttribute ? {[`data-${dataAttribute}`]: line.id} : {})}>
                {line.text}
            </p>)}
        </div>
        <LiveReadout readout={readout} muted={muted}/>
    </>;
}
