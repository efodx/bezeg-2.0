# Taylor placement reasoning (input to the conversion guide)

Taylor's declaration (`TaylorGraph.declaration()`) places controls by the guide's rule: what the learner changes while watching the graph goes on the board; what is chosen once, or is only a setting, goes to Orodja.

- **Centre `c` (`taylor-center`, board range).** The learner drags it along the axis and watches `T_n` rebuild around it, so it belongs on the board, where the dragged point already is. It is a fixed value for the flat function, where the graph declares no centre parameter at all (see the contract note below).
- **Degree `n` (`taylor-degree`, board count).** The whole lesson is "what happens to the error when n grows", so n is changed repeatedly while the curve and the error bar are in view; a count on the board keeps the reading and the changing together.
- **Evaluation point `x` (`taylor-x`, board range).** It is dragged to see the error at different places, and its error bar is drawn at x, so the control and the thing it moves are the same object on the board.
- **Example function (`taylor-example`, board choice).** It has four named options and choosing one replaces the whole scene (centre, point, degree, view), so the learner needs it next to the graph it changes. A few named options is the case where a choice beats a Slider or a select hidden in Orodja.
- **Pokaži oceno napake (`show-error`, board action, `pressed` follows the toggle).** The prediction-then-reveal step is a deliberate moment in the lesson, made while looking at the error bar, so it is an action on the board and not a setting. The label stays "Pokaži oceno napake" and `pressed` carries the state.

Nothing is placed in Orodja: Taylor has no setting that is not changed while watching.
