# T13 lesson framing fix

- Scoped to the two evaluation and advanced patch lesson modules and their focused tests.
- De Casteljau's degree-2 interior control at height 4 now uses a camera centered on the net and pulled back to include it.
- The properties example's first high-control net uses that framing too; projection checks now cover all three properties scenes, including the saddle scene between them.
- The affine-image fixture uses a higher target and longer distance to frame the transformed control height 9 and full mesh.
- Both triangular examples use one camera that contains the cubic net's height-4.5 interior control as well as the mesh.
- Fixture geometry and mathematical checks are unchanged.
- Regression checks project the actual rendered points and mesh vertices with Three's perspective camera at portrait and desktop aspects; they require every coordinate to remain within the clip volume.
- `just unit src/learning/content/patchGuidedExamplesEvaluation.test.tsx src/learning/content/patchGuidedExamplesAdvanced.test.tsx` passed (revision `e917d2c`, dirty worktree).
- `just lint` on the four scoped source and test files passed (same revision).
- Production browser smoke is owned by the handler and remains to be rerun after integration.
