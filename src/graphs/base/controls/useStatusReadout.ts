import {useEffect, useState} from "react";
import {SettledReadout} from "./LiveReadout";

/**
 * The announcement of a trace graph's status as a {@link SettledReadout} for its `LiveReadout` (muted by the caller while Play
 * runs). By default each step is a discrete state, so a changed text is published at once. With `settled` a change is published
 * only after the quiet period, for a graph whose text also changes while a site is dragged (Fortune): a drag must not be read
 * out frame by frame. An empty text clears the region.
 */
export function useStatusReadout(text: string, settled = false): SettledReadout {
    const [readout] = useState(() => new SettledReadout());
    useEffect(() => { if (settled) readout.report(text); else readout.replace(text); }, [readout, text, settled]);
    useEffect(() => () => readout.cancel(), [readout]);
    return readout;
}
