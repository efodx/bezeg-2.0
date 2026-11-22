# Coons patch: placement (task 02, slice 8)

No parameter is bound in the arbiter (`CoonsPatchGraph` has no `parameterBindings`), so nothing is declared as a parameter; the controls below are actions with `pressed`.

- **Shown surface (`shown-lc`, `shown-ld`, `shown-b`, `shown-s`), board.** The lesson asks the learner to switch between the four surfaces while looking at the shape, and there are only four named options. Each option is one action, pressed when shown.
- **Linked corners (`linked-corners`), board.** The corner-break step turns it off and on while reading the corner status, so it belongs next to the surface.
- **Control net, shading (`control-net`, `shading`), Orodja section `display`.** They are display switches set once, not changed while watching a value.
- **Move points by height (`height-mode`), Orodja section `display`.** It is a drag mode of the view, set once and unrelated to any readout.
- **Not declared:** the camera (az/el, presets, reset view, projection) and the selected-point editor (boundary, index, x, y, z). They are not bound; the camera is the view (a surface needs a `ViewAdapter`), and the points are drags on the legend entry `points`.
