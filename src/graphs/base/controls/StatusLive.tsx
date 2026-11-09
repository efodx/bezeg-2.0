import React, {useLayoutEffect, useState} from "react";
import {LiveReadout, SettledReadout} from "./LiveReadout";

/**
 * The announcement region for a status sentence that React already renders as visible text: the shared hidden `LiveReadout`,
 * fed with `text`. The visible sentence carries no live role of its own, so it is announced once, here. A change is published
 * at once (`replace`): these sentences change on a discrete edit, not on every drag frame of a board readout.
 */
export function StatusLive({text, dataAttribute}: {text: string; dataAttribute?: string}) {
    const [readout] = useState(() => new SettledReadout());
    useLayoutEffect(() => { readout.replace(text); }, [readout, text]);
    return <LiveReadout readout={readout} dataAttribute={dataAttribute}/>;
}
