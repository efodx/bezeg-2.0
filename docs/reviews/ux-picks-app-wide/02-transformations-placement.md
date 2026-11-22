# Function transformations placement reasoning (input to the conversion guide)

`FunctionTransformationGraph.declaration()` places controls by Taylor's rule: what the learner changes while watching the graph goes on the board; a choice with a few named options goes on the board; everything else stays in Orodja.

- **Shifts `c` and `d`, stretches `a` and `b` (`transform-c/d/a/b`, board ranges).** The whole lesson is "change one parameter and watch the graph move, stretch or reflect", so each is changed repeatedly with the transformed curve in view and belongs next to it. They lead in the order `c, d, a, b` (translations first), as in the present panel.
- **Tracked abscissa `u` (`transform-u`, board range).** The two markers are dragged along their graphs and the readout shows the image of the point, so the control and the thing it moves are the same object on the board.
- **Base function `f` (`transform-base`, board choice).** Seven named shapes, and choosing one replaces the whole curve while keeping `a`, `b`, `c`, `d`; the learner compares shapes while watching, so a choice beside the graph beats a select in Orodja.
- **Ghost of the base graph (`toggle-ghost`, Orodja action, `pressed` follows the toggle).** It is a display setting: every lesson scene switches the ghost on itself and the learner rarely turns it off, so it is not changed while watching and stays in Orodja.

Contract note: the rule row ("y = -2 f(0,5(x - 3)) + 1") is math text with letters, which `FormattedValue` refuses, so it is the catalog template `transformations_rule_value` filled with the three numeric pieces of the rule (strings the graph formatted). The order-of-operations list is a section card `order`: its first block is the existing help paragraph, the rest are the step sentences.
