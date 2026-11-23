# Handoff 05-tests-a (done)

Files (all passing, eslint and tsc clean in them): TaylorGraph.host (2), FunctionTransformationGraph.host (5) and .writes (1), FunctionsFirstTask (11), BezierClippingControls.host (7, needed no change).

Findings
- The jsdom board starts the Orodja card folded (body `hidden`); tests needing Orodja controls open it. Added `openTools()` to realGraphTestHarness (addition only).
- Fixed Taylor centre (flat example): no puck (TaylorGraph.tsx:389 omits the declaration, :457 keeps the Orodja control with the reason). Test asserts no `[data-puck-key="taylor-center"]` and the Orodja spinbutton with its reason.
- A puck's refusal notice shows the domain error's message (b = 0: `function_transformation_b_zero_rejected`), not the old field text "Vrednost b ne sme biti 0 ...". Test asserts the new text.
- Board-object counts now ignore JSXGraph `_ticks_` labels (they appear with view changes; not graph-owned). Applied in Taylor and Transformation host tests.
- FunctionsFirstTask `transformations`: first task is now the first puck (c), a and b follow in the strip, base stays in Edit, c/a/b absent from Edit.
