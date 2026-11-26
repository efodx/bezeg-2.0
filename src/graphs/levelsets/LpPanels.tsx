import React, {useSyncExternalStore} from "react";
import {useT} from "../../localization";
import {LiveReadout} from "../base/controls/LiveReadout";
import {ReadoutHeading, ReadoutList} from "../base/controls/ReadoutParts";
import type LinearProgramGraph from "./LinearProgramGraph";

/** The status sentence, the labelled readout rows. */
export function LpReadout(props: {graph: LinearProgramGraph}) {
    const text = useT();
    const {graph} = props;
    useSyncExternalStore(graph.subscribeHost, graph.hostSnapshot);
    return <div className="inspector-group">
        <ReadoutHeading>{text("levelsets_graph_lp_readout_title")}</ReadoutHeading>
        <p data-lp-status="">{graph.statusText()}</p>
        <ReadoutList label={text("levelsets_graph_lp_readout_title")} rows={graph.readoutRows()}/>
        <LiveReadout readout={graph.status}/>
    </div>;
}
