# Student usability review — Taylor lesson

Date: 2026-10-21
Target: https://efodx.github.io/bezeg-2.0/analysis/taylor?learn=1

## What I did

I followed the seven-step guided lesson in Slovenian from the initial Taylor polynomial explanation through the final “Učna pot je končana” state. I used “Naprej” to move through explanation, calculation, and observation frames; “Opazuj na grafu” to enter graph mode; and “Nadaljuj učno pot” to return to the lesson. In graph mode I raised the degree for eˣ at x=1 from 1 to 3 and 6, revealed the estimate, then lowered it to 3 and observed the estimate rise. For sin x at x=2 I revealed the estimate, tried n=5 and c=1, then compared the result. For 1/(1−x) I raised n from 1 to 3 and 5 at x=−1.5, then moved x to 0.5. For the flat Taylor series of e^(−1/x) at c=0, I raised n from 3 to 6 and revealed the unavailable-estimate explanation. At the end I hid the estimate, switched to sin x, predicted the estimate at n=3, x=2, and revealed it.

The numerical changes were legible in the reported readouts and matched the lesson’s explanations: for eˣ at x=1 the absolute error fell from about 0.7183 to 0.05162 at n=3 and 0.0002263 at n=6, while the n=6 estimate was 0.0005393. For 1/(1−x), error grew from 0.9 to 2.025 and 4.556 outside the interval, then was 0.03125 at x=0.5,n=5 inside it. The final sin x estimate matched my prediction: 0.6667 over an actual error of 0.2426.

## Usability findings

I could follow the lesson without getting stuck. The repeated “Opazuj na grafu” and “Nadaljuj učno pot” actions made the transition between reading and experimenting understandable. The instruction to predict before revealing the error estimate was clear, and the feedback explained that the Lagrange estimate is a bound rather than the actual error. The final example made the distinction between a smooth function and its Taylor series convergence concrete. I reached the completion message and the app indicated that the graph was ready for free exploration.

I observed no material usability problem in the lesson flow. I made no navigation mistakes and needed no recovery actions. I have no severity-rated issue to report.

## Suggestions

No change is necessary based on this run. As an optional improvement, the observation prompts could make the transition into graph mode even more explicit by saying that “Opazuj na grafu” enables the controls; I understood this from the label and the state change, so this was not a blocker.

## Limits

My subagent browser could not open a tab directly. The parent relayed visible accessibility snapshots and carried out the specific clicks and field changes I requested. This let me follow the labels and numerical readouts, but I did not directly manipulate the UI, inspect the rendered layout, assess pointer dragging, or capture screenshots. I did not test keyboard-only operation, touch, English, or navigation away from the lesson and back. The deployed revision was not established.

## Handler method and acceptance note

The reviewer started with fresh context and a neutral student brief. It was not told about the owner's usability concern, the restore-graph-access task, its acceptance criteria, or previous review conclusions. The handler selected the Taylor lesson to cover the reported long-prompt example. Browser setup failed for visible IAB, hidden IAB, and the parent's numeric browser ID; the reviewer then chose every action through a browser relay. The handler relayed page labels, control states, prompts, and readouts, condensing repeated mathematical accessibility nodes and the general introduction. The reviewer received no navigation recommendations.

This is a completed lesson-flow review with limited acceptance scope, not full verification of [restore-graph-access](../lesson-implementation-history.md#lesson-graph-access). The reviewer exercised Observation → graph experiment → Continue, including the higher-degree/Lagrange prompt, but did not choose Hide instructions or Back to instructions. Preservation across hide/reopen, explicit Exit restoration, responsive layout, Presentation mode, enlarged text, direct graph dragging, and focus behavior therefore remain unverified by this run. The handler saw the completion screen in the browser; that observation is separate from the independent reviewer's verdict. No app code changed.
