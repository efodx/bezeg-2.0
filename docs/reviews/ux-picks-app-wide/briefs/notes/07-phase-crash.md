# 07 phase-portrait Back/Next crash: cause and fix

Cause: native EXCEPTION_STACK_OVERFLOW (seen with DEBUG=pw:browser), not memory. GuidedLesson typesets the whole lesson element on every snapshot change (GuidedLesson.tsx:430-443 via typesetMath). React keeps unchanged prose (the step title), so MathJax's MathML input re-finds the `<math>` inside each formula's mjx-assistive-mml and wraps it in a new formula: DOM depth grows by 2 per click (25 -> 65 after 35 clicks) until layout recurses off the stack. Same family as 8ac2ac68 (measure layer).
Second leak: MathJax's math list kept formulas of removed steps (Nodes 2.5k -> 22k after 11 cycles).

Fix (src/mathjax/loadMathJax.ts): hideAssistiveMathMl around typesetPromise in typesetMath; pruneDetachedMath before typesetClear.
Tests: src/mathjax/typesetMath.nesting.test.ts (both fail on the old file, pass now).
Before: Nodes +1.8k/cycle, crash after 11 cycles (about 35 clicks). After: DOM depth 24-32 bounded, Nodes 2.3-3.2k flat, 66-click walk without crash.
Not verified: master's production site; npx tsc has one error in BisectionGraph.declaration.test.tsx (TS4114, not touched).
Scripts: smoke/07-phase-mem.cjs, 07-phase-seq.cjs (logs 07-phase-mem-*.log).
