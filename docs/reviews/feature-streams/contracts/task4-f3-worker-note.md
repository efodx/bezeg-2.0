# Task 4 F3 worker note

F3 done (Derivative, Continuity, Convexity, Extrema, MeanValue, Taylor, Euler).
Production: this.state reads and destructures became this.model (DerivativeGraph.tsx:143,162,168; ContinuityGraph.tsx:122,130; ConvexityGraph.tsx:359; ExtremaGraph.tsx:361; MeanValueGraph.tsx:296; TaylorGraph.tsx:311; EulerGraph.tsx:271); section comments reworded.
Tests: six multi-action tests dropped the projection assertion (a toEqual on graph.model sits on the line before); titles lose "with the flat state following it".
Checks: grep empty; 13 files, 211 passed; lint passed; typecheck shows no F3-file errors (only F2 host tests, other worker).
