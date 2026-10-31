# Drive lesson iteration through a typed scene action, not frame controls

Accepted on 2026-10-15. The bisection Guided lesson reveals iteration steps with one typed scene action, `run-bisection-command` (`src/learning/content/guidedLessons.ts`), whose value is `'next-step'` (one revealed step) or `'reset'` (back to step 0); any other value is rejected. `sceneAction()` in `src/learning/runtime/lessonCatalog.ts` maps it to the existing `animation` lesson action for the id `bisection` (ADR 0012), which `BisectionGraph` registers through the `LessonActionRegistry`. A scene that shows k steps repeats `next-step` k times in one synchronous tick; each call runs the same transition as playback, and the scene store makes every earlier step visible to the next. Play and Pause stay graph controls in the inspector and the learner's choice: no lesson scene starts or stops playback, playback is initially stopped, and it pauses on scene changes, lesson frame transitions, exit, import and figure capture (the spec's rule). The lesson frame UI is unchanged: `GuidedLesson` still shows only Play, Pause and Replay, and only for lessons whose frames declare an animation (De Casteljau).

The alternatives were these:

- Extend the `GuidedLesson` frame controls with Next step, Play and Reset. This puts iteration buttons in every iterative lesson's overlay and makes `GuidedLesson` know which animation ids are iterative. It would duplicate the inspector's controls on top of the graph, which the product wants kept prominent, and give the frame UI a second, command-specific control set to localize, label and test on narrow and touch screens. Scenes would still need to reach the revealed step for Back navigation, so the scene action would be needed anyway.
- Make Play and Pause scene actions. A scene would then start motion by itself, against the spec: playback must be optional and initially stopped, and must pause on scene and frame changes. Making a scene wait for timed steps would also need a hidden simulation of the learner pressing the control, which the spec rejects in favor of declared operations.
- A typed `run-bisection-command` scene action limited to `next-step` and `reset`, chosen. It reuses the declared action vocabulary and the closed command unions, keeps scenes deterministic and synchronous, and leaves timing to the controller and the learner.

Consequences:

- Batch C iterations (sequence convergence, fixed-point iteration) can reuse the pattern: one scene action per graph that maps to the `animation` action and the shared `IterationController`, with no change to `GuidedLesson`.
- Back navigation reapplies an earlier scene as a restore followed by `next-step` repeated to its step; scene checkpoints keep the iteration index (the model's `step`) but never running status.
- The graph's registry still accepts `play`, `pause` and `replay` for `bisection`, so tests and future content may use them; today's lesson content does not.
- Each iterative graph adds its own scene action name to `SUPPORTED_SCENE_ACTION_NAMES`, a deliberate cost: the closed list keeps content and runtime in lockstep at compile time.
- Lesson authors must repeat `next-step` once per step shown; there is no "go to step k" action, so a long iteration in a scene is written as a generated list of `next-step` actions.

Amendment 2026-10-31 (A9): content now authors the runtime `LessonAction` union directly, so the iteration commands are written as typed `animation` actions. The string names above (`run-bisection-command` and siblings, `SUPPORTED_SCENE_ACTION_NAMES`) are a legacy vocabulary that remains only until A9b migrates the remaining content; the decision itself is unchanged.
