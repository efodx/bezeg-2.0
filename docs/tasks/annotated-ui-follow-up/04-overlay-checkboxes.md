# 04 Overlay checkboxes

Source: [browser annotation 6](../../specs/annotated-ui-follow-up.md). Builds on Look underneath in [playground interaction](../../specs/bezier-drawing-playground.md#interaction).

Align the four checkbox indicators and labels in the Look underneath fieldset. Use the existing control palette, comfortable label spacing and a layout that wraps whole choices. Keep native checkbox semantics and make the whole label clickable. Show a distinct checked state and visible keyboard focus. Give each row a 44px touch target on coarse pointers.

Search for comparable standalone checkboxes and compare them in the browser. Start with the bounce checkbox in the collision playground and the checkboxes in the Five Point and Three Views projective demonstrations. Check label alignment and wrapping, checked and focus states, and label hit targets. Compare the existing `BooleanField` checkbox variant before adding styles. Reuse it where it fits. Apply the same fix to confirmed matches within Learn and record confirmed workspace matches for the [Controls stream](../feature-streams/controls.md).

At desktop and 390px in both languages, toggle each overlay with its label and with the keyboard and confirm the matching visual layer appears or disappears. Confirm that the four choices fit at enlarged text and the segment and parameter controls remain reachable. For each comparable control, record the route, whether the defect reproduced, and the fix or owning task. Verify the existing behavior of each changed control with keyboard and touch.
