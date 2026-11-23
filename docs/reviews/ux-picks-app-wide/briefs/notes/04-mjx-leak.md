# 04 MathJax leak on card fold

Cause: `src/workspace/layout/useMeasuredCards.ts` (old line 52) `waitForFontsAndMath` called `typesetPromise([layer])` on the measure layer on every measure pass (each fold changes contentKey). The layer's Tex spans already hold MathJax output; typesetting it again turns each assistive MathML into a nested formula (+4 mjx-container per pass in the layer, +~70 nodes). Not from 1b1983b6 (the call dates from 49f4bb6c); the fold-driven re-measure exposes it.
Fix: typeset only elements with raw delimiters and no output (`rawMathElements`), then `typesetPromise([])` as a queue barrier.
Test: src/workspace/layout/waitForFontsAndMath.test.ts (fails before, passes after).
Browser: 04-mjx-leak-toggles.log (40 toggles per card, nodes 813 / mjx 10 constant), free-play logs 04-mjx-leak-freeplay-*.log.
