import React from "react";
import {useLanguage} from "../../localization";
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
export function FunctionReadout(props: { title: string; rows: readonly ReadoutRow[]; note?: string }) {
    useLanguage();
    return <div className="inspector-group function-readout">
        <h3>{props.title}</h3>
        <dl>
            {props.rows.map(row => <div key={row.id} className="function-readout-row" data-readout={row.id}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
            </div>)}
        </dl>
        {props.note && <p className="inspector-help" role="note">{props.note}</p>}
    </div>;
}
