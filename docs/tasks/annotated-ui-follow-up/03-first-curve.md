# 03 First curve

Source: [browser annotation 2](../../specs/annotated-ui-follow-up.md) and the owner's choice to start with a curve to bend. Revises the initial Draw state in the [drawing playground spec](../../specs/bezier-drawing-playground.md#persistence).

Open Draw with one editable cubic and visible handles when there is no valid saved drawing. Put a short prompt beside the canvas inviting the learner to drag a handle and see the bend. After clearing, use a short prompt that shows how to start drawing. Give the canvas priority. Group drawing and history actions, and place the point type and delete controls with the selected point's editing tools. Use plain-language labels that distinguish the handle behaviors, with G1 and C1 available as mathematical names.

Keep the simple starter separate from the existing example shape. A valid saved drawing takes precedence, including an intentionally cleared canvas. Merely displaying the starter writes nothing to storage. After an edit, the existing save, undo and shared drawing behavior applies. The Inspect placement still opens its authored example when there is no usable drawing.

On fresh storage, use a pointer, touch and keyboard to change the actual curve by moving a handle. Clear it, create and close a shape, edit a selected point, and undo and redo across a drag. Reload a saved drawing and a saved empty canvas. Verify the Inspect fallback and the handoff of an edited drawing. Check both languages and 390px, including that the toolbar wraps and the page still scrolls outside the canvas. Retain the existing drawing model and mathematical checks.
