import "./ControlRow.css";

/** Class of a plain row of buttons (decision 68); playback groups use `PlaybackButtons` instead. */
export const CONTROL_ROW = "control-row";
/** The row whose direct buttons share its width equally. */
export const CONTROL_ROW_FILL = "control-row control-row--fill";
/** A row led by one compact button (a point's select toggle) with one control filling the rest, so a long value never wraps the control under the button. */
export const CONTROL_ROW_LEAD = "control-row control-row--lead";
