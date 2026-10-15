# Retrospective Claude context measurements — 2026-10-16

Claude Code counterpart to the [Codex context measurements](context-usage-2026-10-16.md), as evidence for the [context follow-up](../specs/agent-workflow-evaluation.md#context-follow-up--2026-10-16). This historical snapshot does not change routing or task-size defaults.

## Source and method

Read local Claude Code transcripts under `.claude/projects/*bezeg*` in the user profile, covering the main checkout and every `.claude/worktrees/*` project directory. Workers are the `<session>/subagents/agent-*.jsonl` sidechain transcripts; agent type and dispatch description come from the adjacent `.meta.json`. Handlers are the top-level session transcripts. The in-progress session that produced this file is excluded. Dates are the UTC date of the first transcript timestamp; wall minutes run from first to last timestamp, including idle and background waiting, not active execution time.

Input per request is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens` from each assistant message's `usage`, counted once per API message ID and skipping synthetic messages. Starting input is the first positive value; peak is the maximum. These are recorded request-input measurements, not exact live occupancy or cumulative/billed usage, and include system prompt, tool definitions, and project instructions. Model is the most frequent `message.model` in the transcript.

Compactions are `system` records with subtype `compact_boundary`; trigger (`manual` or `auto`) comes from `compactMetadata`. Unlike Codex rollouts, Claude transcripts record no context-window size, so no window column is reported. Absence of a recorded compaction means none in the surviving transcript, not proof of complete session history; deleted sessions or worktree project directories are not recoverable.

## Summary

Recovered 97 workers from October 10–15: 95 `general-purpose` and 2 `Explore`; 91 ran Sonnet 5.5, 4 Opus 5.5, and 2 Haiku 5.5. Starting input ranged 20,134–39,174 (median 36,262). Peak input had median 125,607 and maximum 387,751; 43 workers peaked above 150k and 26 above 200k. No worker transcript contains a compaction record. October 15: 31 workers, 12 above 200k peak, none compacted.

Thirty handler sessions recorded three distinct compactions, all `manual` (owner-invoked `/compact`), at 548,464, 418,153, and 144,653 pre-compaction tokens. The October 15 event appears in both `f95ad336…` and its continuation `3e123ba8…` with the same record UUID; it is counted once in this summary and shown on both rows below. No automatic compaction was recorded for any handler or worker.

Workers and handlers ran past 200k input without automatic compaction, so the effective window exceeded 200k tokens; its size is not recorded and is not asserted here. Peaks are therefore not comparable to the Codex table's 258,400-token window as a fraction of capacity. No correlation with forgotten requirements, repeated reading, or repair outcomes was established.

## Per-worker measurements

Description is the dispatch `description` from metadata.

| UTC date | Worker ID / agent type — description | Model | Starting input | Peak input | Compactions | Wall minutes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 2026-10-10 | a199082ef9169165f / general-purpose — Bernstein lesson graph seam | sonnet-5-5 | 35926 | 61253 | 0 | 2.2 |
| 2026-10-10 | a19b056b419ea7dac / general-purpose — Rational elevation lesson seam | sonnet-5-5 | 35679 | 56634 | 0 | 1.8 |
| 2026-10-10 | a4ef47ad1dc44f084 / general-purpose — Cohort B lesson content | sonnet-5-5 | 36601 | 126604 | 0 | 10.9 |
| 2026-10-10 | a91e9b0d97b41e2f0 / general-purpose — Cohort B browser smoke tests | sonnet-5-5 | 35849 | 152996 | 0 | 35.9 |
| 2026-10-10 | abeec9bc0fa3ecaf6 / general-purpose — Fix lesson overflow and z-index | sonnet-5-5 | 35809 | 50541 | 0 | 8.8 |
| 2026-10-10 | a31ab9ef8c3ee2587 / general-purpose — Fix lesson inline math rendering | sonnet-5-5 | 36128 | 171984 | 0 | 14.1 |
| 2026-10-10 | a054c60d8647a5aa4 / general-purpose — Weighted parameterization lesson seam | sonnet-5-5 | 36008 | 84209 | 0 | 3.6 |
| 2026-10-10 | abff4e92e647289e3 / general-purpose — Uniform parameterization lesson seam | sonnet-5-5 | 36094 | 87630 | 0 | 4.7 |
| 2026-10-10 | a7e29211683d75b05 / general-purpose — Cohort C content and smoke | sonnet-5-5 | 36947 | 186393 | 0 | 25.6 |
| 2026-10-10 | ae09a48a59cbbdfe9 / general-purpose — Subdivision lesson seam | sonnet-5-5 | 36282 | 84616 | 0 | 3.9 |
| 2026-10-10 | a3c2947b5da988072 / general-purpose — Repeated subdivision lesson seam | sonnet-5-5 | 35827 | 81467 | 0 | 2.9 |
| 2026-10-10 | aae4459fc766f4ca1 / general-purpose — Extrapolation lesson seam | sonnet-5-5 | 35883 | 81008 | 0 | 3.3 |
| 2026-10-10 | a567b7456c4f7bfd0 / general-purpose — Data-driven lesson smoke spec | sonnet-5-5 | 35528 | 180857 | 0 | 62.1 |
| 2026-10-10 | ad8f091908eeb3f2a / general-purpose — Cohort D lesson content | sonnet-5-5 | 37251 | 172736 | 0 | 10.4 |
| 2026-10-10 | a9adc67f820bbc4bf / general-purpose — Fix Cohort D smoke findings | sonnet-5-5 | 36279 | 110075 | 0 | 16.6 |
| 2026-10-10 | a309c03081d747f27 / general-purpose — Spline core lesson seam | sonnet-5-5 | 36309 | 117861 | 0 | 6.0 |
| 2026-10-10 | aa4c674fabc6626f5 / general-purpose — G1 and spline alpha seams | sonnet-5-5 | 36063 | 125667 | 0 | 6.4 |
| 2026-10-10 | ad08f88361804280e / general-purpose — Farin and circle seams | sonnet-5-5 | 36130 | 94171 | 0 | 3.9 |
| 2026-10-10 | abf9bb2ba22e40afc / general-purpose — Alternative De Casteljau seam | sonnet-5-5 | 35644 | 82980 | 0 | 3.6 |
| 2026-10-10 | a93e719f56b723497 / general-purpose — Reorder lesson observation flow | sonnet-5-5 | 36079 | 85719 | 0 | 3.6 |
| 2026-10-10 | a7e351272749cb048 / general-purpose — Spline lesson content | sonnet-5-5 | 37008 | 261565 | 0 | 16.1 |
| 2026-10-10 | aed7178154ba9259a / general-purpose — Rational and De Casteljau content | sonnet-5-5 | 36695 | 151718 | 0 | 6.6 |
| 2026-10-10 | a9d9f88f55bb8d24a / general-purpose — Integrate Cohort E and smoke | sonnet-5-5 | 37486 | 104797 | 0 | 6.0 |
| 2026-10-10 | a7ab98e4a77aeee79 / general-purpose — Cohort E smoke rows and run | sonnet-5-5 | 36155 | 225677 | 0 | 114.6 |
| 2026-10-10 | a1275c27111121243 / general-purpose — Make Farin control points movable | sonnet-5-5 | 35679 | 60616 | 0 | 1.5 |
| 2026-10-11 | a5535c4bf8d0bea1c / general-purpose — Restructure lesson smoke suite | sonnet-5-5 | 37474 | 78891 | 0 | 15.7 |
| 2026-10-11 | a17c213691393e046 / general-purpose — Localize workspace hardcoded strings | sonnet-5-5 | 35786 | 48298 | 0 | 1.1 |
| 2026-10-11 | acd4f2c62b4ca07ee / general-purpose — Implement idempotent fit-to-points | sonnet-5-5 | 36127 | 64767 | 0 | 3.9 |
| 2026-10-11 | aa9289162f802c4d9 / general-purpose — PH arc length readout | sonnet-5-5 | 36361 | 84846 | 0 | 3.9 |
| 2026-10-11 | a51a989591d691c1e / general-purpose — Elevation overlay on polygon | sonnet-5-5 | 36400 | 71843 | 0 | 3.0 |
| 2026-10-11 | a05c979edd358f744 / general-purpose — Implement linear function concept | sonnet-5-5 | 37670 | 321691 | 0 | 22.7 |
| 2026-10-11 | a682af98a8f922036 / general-purpose — Fix arc length language refresh | sonnet-5-5 | 35530 | 52357 | 0 | 1.6 |
| 2026-10-11 | a78c1c1ba4b374c9d / general-purpose — Implement exponential function concept | sonnet-5-5 | 35730 | 170996 | 0 | 7.8 |
| 2026-10-11 | a0743738823d59459 / general-purpose — Implement trigonometric functions concept | sonnet-5-5 | 36243 | 241644 | 0 | 19.2 |
| 2026-10-11 | af1e6b754877b87c8 / general-purpose — Implement SVG export math labels | sonnet-5-5 | 37109 | 93381 | 0 | 8.2 |
| 2026-10-11 | ad7b2392c13d72ee4 / general-purpose — Implement continuity concept | sonnet-5-5 | 35823 | 210705 | 0 | 15.4 |
| 2026-10-11 | ab0995ab77a2a5aef / general-purpose — Implement derivative concept | sonnet-5-5 | 36185 | 228838 | 0 | 17.4 |
| 2026-10-11 | adcf0f706a6af0ad3 / general-purpose — Implement definite integral concept | sonnet-5-5 | 36037 | 301503 | 0 | 31.5 |
| 2026-10-11 | ad4ca42956786dca8 / general-purpose — Implement area between curves concept | sonnet-5-5 | 36262 | 265973 | 0 | 24.0 |
| 2026-10-11 | a8535175affa2fb14 / general-purpose — Implement arc length concept | sonnet-5-5 | 36239 | 228586 | 0 | 13.8 |
| 2026-10-11 | a420f35e052270fe3 / general-purpose — Math review of functions family | sonnet-5-5 | 35578 | 181352 | 0 | 704.1 |
| 2026-10-11 | a4aa7f6508241b5ea / general-purpose — Engineering review of functions family | sonnet-5-5 | 35772 | 185475 | 0 | 6.9 |
| 2026-10-11 | a0230f46c7c407832 / general-purpose — UI/a11y review of functions family | sonnet-5-5 | 35667 | 133373 | 0 | 10.3 |
| 2026-10-12 | a806946caf4c3ea7a / general-purpose — Fix review findings for functions family | sonnet-5-5 | 37158 | 319882 | 0 | 24.9 |
| 2026-10-12 | a7daa955fc75ac0aa / general-purpose — Task 1: remove dead code | sonnet-5-5 | 35976 | 99685 | 0 | 5.0 |
| 2026-10-12 | a49a66e4fc32e61eb / general-purpose — Task 6: per-curve cache | sonnet-5-5 | 36104 | 154738 | 0 | 93.9 |
| 2026-10-12 | a976c396edf52f481 / general-purpose — Task 2: JSXGraph typings | sonnet-5-5 | 35948 | 120823 | 0 | 10.3 |
| 2026-10-12 | a19bfaae4abb6b2fe / general-purpose — Measure cache perf before/after | sonnet-5-5 | 36062 | 100993 | 0 | 48.0 |
| 2026-10-12 | a4addb1da5fb13897 / general-purpose — Task 3: store and GraphHost | sonnet-5-5 | 37137 | 297405 | 0 | 43.5 |
| 2026-10-12 | a2492c7ae0bf4c947 / general-purpose — Review task 3 lifecycle semantics | sonnet-5-5 | 37169 | 120357 | 0 | 4.2 |
| 2026-10-12 | a14613e2dae55c2c2 / general-purpose — Review task 3 spec conformance | sonnet-5-5 | 36908 | 95786 | 0 | 1.8 |
| 2026-10-12 | ac72d29292c501e25 / general-purpose — Task 5: display settings, presets | sonnet-5-5 | 36420 | 297747 | 0 | 58.2 |
| 2026-10-12 | a4a505c72cef977af / general-purpose — Task 7a: lesson session store | sonnet-5-5 | 35913 | 84789 | 0 | 3.6 |
| 2026-10-12 | a90ecd3267dd2a39a / general-purpose — Review task 5 engineering | sonnet-5-5 | 37167 | 160872 | 0 | 4.3 |
| 2026-10-12 | af86f2b02150f3838 / general-purpose — Review task 5 UI and tests | sonnet-5-5 | 36923 | 136445 | 0 | 22.7 |
| 2026-10-12 | a4c92ebad1c36bc37 / general-purpose — Task 4: composition, registry | sonnet-5-5 | 36670 | 352901 | 0 | 329.7 |
| 2026-10-12 | a910a8cdc2de82f63 / general-purpose — Review task 4 engineering | sonnet-5-5 | 37048 | 170156 | 0 | 7.4 |
| 2026-10-12 | ab7c05637e2ec70c2 / general-purpose — Review task 4 browser and perf | sonnet-5-5 | 37209 | 171480 | 0 | 184.3 |
| 2026-10-12 | ac4a42d96afb611d8 / general-purpose — Task 7b: useT hook | sonnet-5-5 | 35914 | 58928 | 0 | 9.6 |
| 2026-10-13 | ab83c8680aef5d494 / general-purpose — Review CRA→Vite migration diff | sonnet-5-5 | 37236 | 82373 | 0 | 1.5 |
| 2026-10-14 | a16e487b21ece7527 / general-purpose — Review lesson/controls refactor | opus-5-5 | 35261 | 204262 | 0 | 10.5 |
| 2026-10-14 | a1da78ab1e93aa23d / general-purpose — Review Vite migration | opus-5-5 | 35439 | 75826 | 0 | 12.8 |
| 2026-10-14 | ab7a87748c06e8b0b / general-purpose — Review demonstrations commits | opus-5-5 | 35461 | 110224 | 0 | 11.4 |
| 2026-10-14 | a514ac15b62ff9de8 / general-purpose — Fix curve control state bugs | sonnet-5-5 | 36832 | 103299 | 0 | 5.3 |
| 2026-10-14 | a1556954cabfe3985 / general-purpose — Fix carousel wheel takeover | sonnet-5-5 | 35839 | 47272 | 0 | 0.9 |
| 2026-10-14 | a9ba8831eedced8f9 / general-purpose — Fix test timeout and capture regex | sonnet-5-5 | 36012 | 47790 | 0 | 0.9 |
| 2026-10-15 | a50bff8306eb5f952 / Explore — Research task 00 runtime contracts | haiku-5-5 | 20134 | 185017 | 0 | 6.3 |
| 2026-10-15 | ae6b9f9c00cfa2c85 / Explore — Research function demo patterns | haiku-5-5 | 20266 | 265492 | 0 | 6.6 |
| 2026-10-15 | a099d52fda014de3a / general-purpose — Implement task 00 family+playback | sonnet-5-5 | 37928 | 114630 | 0 | 6.0 |
| 2026-10-15 | a9a682670c285a615 / general-purpose — Part A math: bisection | sonnet-5-5 | 37148 | 66997 | 0 | 3.1 |
| 2026-10-15 | ace9d46b653684a63 / general-purpose — Part A math: mean value theorem | sonnet-5-5 | 37137 | 55728 | 0 | 1.6 |
| 2026-10-15 | a2484c2020f0d5da1 / general-purpose — Part A math: accumulation | sonnet-5-5 | 37048 | 61897 | 0 | 2.1 |
| 2026-10-15 | ac736a3171da4071e / general-purpose — Implement bisection graph+lesson | sonnet-5-5 | 39174 | 387751 | 0 | 25.8 |
| 2026-10-15 | a2e5e96d61a0ba440 / general-purpose — Implement MVT graph+lesson | sonnet-5-5 | 38419 | 301159 | 0 | 20.6 |
| 2026-10-15 | a26e55765d6f91177 / general-purpose — Implement accumulation graph+lesson | sonnet-5-5 | 38446 | 315045 | 0 | 20.8 |
| 2026-10-15 | adebcb3ce7a670e8a / general-purpose — Review: mathematical correctness | sonnet-5-5 | 36674 | 146809 | 0 | 2.8 |
| 2026-10-15 | ae1790e6a8c5b45f0 / general-purpose — Review: engineering constraints | sonnet-5-5 | 36776 | 93536 | 0 | 1.4 |
| 2026-10-15 | acbb44d6808352544 / general-purpose — Review: UI and accessibility | sonnet-5-5 | 36587 | 73436 | 0 | 1.3 |
| 2026-10-15 | a3884f9c5945c4c88 / general-purpose — Update docs for Batch A | sonnet-5-5 | 36916 | 125607 | 0 | 3.6 |
| 2026-10-15 | a3e1e913e7e8f6a50 / general-purpose — Fix review findings Batch A | sonnet-5-5 | 38697 | 169600 | 0 | 10.7 |
| 2026-10-15 | a8516c4d8d7ed949e / general-purpose — Previews and browser smoke run | sonnet-5-5 | 37672 | 207647 | 0 | 162.4 |
| 2026-10-15 | af6b6bc34541f618d / general-purpose — Fix browser-found bugs | sonnet-5-5 | 37639 | 118626 | 0 | 9.8 |
| 2026-10-15 | a9dcda326b7e0d857 / general-purpose — Extrema math module | sonnet-5-5 | 35759 | 57622 | 0 | 1.8 |
| 2026-10-15 | a979f4ab6c1cd1cf7 / general-purpose — Convexity math module | sonnet-5-5 | 35800 | 52866 | 0 | 1.7 |
| 2026-10-15 | a1c6214c8a3edf61b / general-purpose — Darboux math module | sonnet-5-5 | 35786 | 54273 | 0 | 1.7 |
| 2026-10-15 | aab920c21accdc388 / general-purpose — Taylor math module | sonnet-5-5 | 35939 | 72116 | 0 | 3.4 |
| 2026-10-15 | a42185f6d2c1fca29 / general-purpose — Darboux graph and lesson | sonnet-5-5 | 36622 | 263867 | 0 | 15.2 |
| 2026-10-15 | aad19342ec411580f / general-purpose — Extrema graph and lesson | sonnet-5-5 | 36437 | 265373 | 0 | 16.1 |
| 2026-10-15 | a2ebb70d024739775 / general-purpose — Convexity graph and lesson | sonnet-5-5 | 37445 | 308484 | 0 | 18.5 |
| 2026-10-15 | a2ebb70d024739775 / general-purpose — Convexity graph and lesson | sonnet-5-5 | 37445 | 308484 | 0 | 18.5 |
| 2026-10-15 | a342da47893eadcc5 / general-purpose — Taylor graph and lesson | sonnet-5-5 | 38612 | 301044 | 0 | 19.1 |
| 2026-10-15 | a217eb98e55032f47 / general-purpose — Maths review Batch B | opus-5-5 | 36241 | 186666 | 0 | 8.3 |
| 2026-10-15 | a9b54083fa60add27 / general-purpose — Engineering review Batch B | sonnet-5-5 | 36113 | 206614 | 0 | 13.1 |
| 2026-10-15 | a8fe1af53667793d6 / general-purpose — UI/a11y review Batch B | sonnet-5-5 | 36160 | 103260 | 0 | 2.4 |
| 2026-10-15 | a260d1fecb4980f5b / general-purpose — Batch B review fixes | sonnet-5-5 | 38015 | 220976 | 0 | 13.9 |
| 2026-10-15 | a90812a80a2f332d3 / general-purpose — Fix Batch B board layout | sonnet-5-5 | 37233 | 151397 | 0 | 15.5 |
| 2026-10-15 | a75188a55ee3d0748 / general-purpose — Fix Batch B board layout | sonnet-5-5 | 37290 | 64575 | 0 | 2.4 |

## Handler sessions

Worktree sessions show their `.claude/worktrees` directory; `bezeg` is the main checkout. Long wall times include idle periods between owner messages.

| UTC date | Session ID / project directory | Model | Starting input | Peak input | Compactions | Wall minutes |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 2026-10-10 | 0c4333df-5deb-4394-a17e-9daa414d857b / bezeg | opus-5-5 | 49060 | 225513 | 0 | 86.1 |
| 2026-10-10 | c6136871-04a2-4287-b5de-42dff585ddd9 / bezeg | opus-5-5 | 49060 | 245834 | 0 | 90.9 |
| 2026-10-10 | 903ef083-2e17-43b9-b533-adbe711b738c / bezeg | opus-5-5 | 43637 | 107598 | 0 | 3.3 |
| 2026-10-10 | b3c00bcb-c34a-40f3-9332-e853b8834720 / bezeg | opus-5-5 | 43611 | 84982 | 0 | 26.4 |
| 2026-10-10 | 02084de0-13a8-4479-89d0-69a9e29de3e5 / worktree:lesson-playback-fix | opus-5-5 | 45200 | 106797 | 0 | 14.0 |
| 2026-10-10 | a1e9181d-de6f-4270-8046-6df068a87fb7 / worktree:cohort-b-lessons | opus-5-5 | 43428 | 548131 | 1 (manual) | 1209.0 |
| 2026-10-10 | d0698b6c-83e2-46c1-878a-3c23162c5ffb / worktree:farin-movable-points | opus-5-5 | 43660 | 137809 | 0 | 24.5 |
| 2026-10-11 | 1e9df58f-779f-4562-bc5c-f70a1f6eda32 / worktree:workspace-localization-leaks | opus-5-5 | 43677 | 76566 | 0 | 10.2 |
| 2026-10-11 | a11ec890-356b-448d-add5-c80f38e2c95d / worktree:fit-points-idempotent | opus-5-5 | 45323 | 90063 | 0 | 15.0 |
| 2026-10-11 | d835b8f0-e597-47e4-b71e-64510f9ec3bc / worktree:demo-preview-mathjax | opus-5-5 | 43687 | 151852 | 0 | 137.8 |
| 2026-10-11 | 501426fe-2dc2-41d5-8161-60f6ae889db4 / bezeg | opus-5-5 | 45361 | 97273 | 0 | 17.6 |
| 2026-10-11 | eec40636-ad8d-41bd-9268-e37666d15872 / worktree:ph-arclength-elevation-overlay | opus-5-5 | 45637 | 155515 | 0 | 37.4 |
| 2026-10-11 | c6a1dfad-93e5-432e-b834-95e183664b51 / worktree:function-concepts | opus-5-5 | 44351 | 403163 | 0 | 1393.4 |
| 2026-10-11 | 242ff156-3196-412c-9926-7b77debecc3c / bezeg | opus-5-5 | 44281 | 88222 | 0 | 29.5 |
| 2026-10-12 | 2e97e522-d2b7-4248-ab3f-73fe2bdcd7f4 / worktree:fix-narrow-lesson-overflow | opus-5-5 | 44178 | 90322 | 0 | 20.5 |
| 2026-10-12 | 4c2753be-dc20-477d-b69f-5a17d271065d / worktree:function-graph-theme | opus-5-5 | 44206 | 172205 | 0 | 17.9 |
| 2026-10-12 | 98e689e1-8444-4165-befb-acbf96f3d031 / worktree:react-architecture-spec | opus-5-5 | 44371 | 418070 | 1 (manual) | 662.3 |
| 2026-10-13 | e195d7b5-ae35-49af-a3fe-69529daa12b3 / worktree:vite-migration | opus-5-5 | 43994 | 184161 | 0 | 43.7 |
| 2026-10-13 | afcbff7b-6d56-43a0-9268-681f51ccf710 / worktree:fix-carousel-autoplay | sonnet-5-5 | 44009 | 63345 | 0 | 5.0 |
| 2026-10-13 | 6d72baa0-2d9a-4ef1-be9f-1842d490756e / worktree:bezeg-cleanup | sonnet-5-5 | 44080 | 295621 | 0 | 1123.3 |
| 2026-10-13 | e70f56bc-fe18-42a3-92f5-8689836039a4 / bezeg | sonnet-5-5 | 44080 | 74305 | 0 | 2551.8 |
| 2026-10-14 | 10a88cd5-4c6a-4a0f-8fab-613a0fc527c5 / worktree:fix-review-findings | opus-5-5 | 44120 | 127752 | 0 | 31.3 |
| 2026-10-15 | 299dc0d8-5fad-44ba-9e13-dfe0b7ca7edc / worktree:analysis-batch-a | opus-5-5 | 44126 | 103899 | 0 | 22.8 |
| 2026-10-15 | a1d0a5ea-bbc8-42db-a908-0d02995ba1bd / bezeg | opus-5-5 | 43563 | 44010 | 0 | 6.7 |
| 2026-10-15 | af214c9d-2380-4807-bb87-3e99c119a4ae / worktree:analysis-batch-a | sonnet-5-5 | 45328 | 223896 | 0 | 276.9 |
| 2026-10-15 | cf0debc4-7108-4442-a48e-aecdd982f39e / worktree:backfill-claude-delegation-log | sonnet-5-5 | 45290 | 181490 | 0 | 10.1 |
| 2026-10-15 | 2445449d-4b2a-4224-8b6a-8a70653b6c2c / bezeg | sonnet-5-5 | 45884 | 49362 | 0 | 1.3 |
| 2026-10-15 | f95ad336-8ec3-440b-b158-f65ccd4a343d / bezeg | opus-5-5 | 44940 | 143667 | 1 (manual) | 56.5 |
| 2026-10-15 | 3e123ba8-48c9-4bb2-9c87-333718010516 / bezeg | opus-5-5 | 56017 | 224468 | 1 (manual) | 106.8 |
| 2026-10-15 | e814efed-1ead-473a-a329-cf9e4f67611c / bezeg | opus-5-5 | 45670 | 48511 | 0 | 2.8 |
