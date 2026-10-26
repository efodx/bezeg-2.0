# Independent calculus review

Compared the uncommitted calculus-only diff with `HEAD` `9fef4d92d1dd4a5c00926d200b895d426d4c194e`, and read §6f and the worker evidence.

## Standards findings

No actionable source finding. The content remains within `familyChapters.ts` and its test. Source wording uses the required doubled TypeScript escapes and delimited prose/caption math; all three figure alts are natural language. Slovenian-first wording is equivalent in English. The three figures are associated with the continuity, derivative, and integral sections and their captions describe the captured examples. Existing graph links and section IDs remain intact.

The new regression test has pre-change failure evidence: `calculus-worker.md` reports it failed on the tracked content because the first graph destination lacked its Slovenian prompt, then passed after implementation. Its prompt loop checks every destination occurrence, both languages, change/observe/interpret/question form, and control-specific vocabulary. Worker verification records focused chapter/notation/reader tests, exact TypeScript, and focused lint. Browser interaction and render review remain for handler acceptance.

## Spec findings

- **P2 — Lock the continuity implication into the regression assertion.** Current prose is mathematically correct: for (c\in D), it states the order \(\forall\varepsilon>0\;\exists\delta>0\;\forall x\in D\), then correctly conditions \(|f(x)-f(c)|<\varepsilon\) on \(|x-c|<\delta\); it also disclaims differentiability and finite-graph proof ([familyChapters.ts:326](/C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/src/learning/content/familyChapters.ts:326), [familyChapters.ts:327](/C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/src/learning/content/familyChapters.ts:327)). But the new test asserts only the quantifier prefix and English paraphrase ([familyChapters.test.ts:260](/C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/src/learning/content/familyChapters.test.ts:260)); it would pass if the antecedent/conclusion were reversed or the input/output distances were swapped. Assert that the rendered math includes \(c\in D\), \(|x-c|<\delta\), and the implication to \(|f(x)-f(c)|<\varepsilon\), alongside the existing order check. This improves regression coverage; current content itself needs no repair.

Mathematical spot-checks: the square quotient reduces to \(2x+h\) only for \(h\ne0\), then tends to \(2x\) ([familyChapters.ts:330](/C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/src/learning/content/familyChapters.ts:330)); \(\int_0^2 x\,dx=2\) under the stated continuity/nonnegativity assumptions. The six left rectangles for \(x^2\) give \(55/27\approx2.037\), while the exact signed integral is \(8/3\approx2.6667\), also the geometric area because \(x^2\ge0\) ([familyChapters.ts:335](/C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/src/learning/content/familyChapters.ts:335), [familyChapters.ts:336](/C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg/src/learning/content/familyChapters.ts:336)).

Handler disposition: the optional P2 test expansion is deferred. The current implication is correct and independently reviewed; additional substring assertions would mirror prose without guaranteeing its semantic relationship. This is a suggested test improvement, not missing §6f behavior. No current source defect remains open.
