# Handler successor launch test

User request on 2026-10-26 (Europe/Ljubljana): test a fresh Codex desktop successor launch after implementing the handler context workflow.

## Current state

- Checkout: `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg`, local `master`.
- Accepted implementation: `1727cc3`, pushed to `origin/master`; 17 monitor tests and focused lint passed.
- Source contract: `docs/specs/codex-handler-handoff.md`; procedure: Codex handler context budget in `docs/agent-workflow.md`.
- Original parent chat: `01a17539-0dac-78f3-ac58-92c05d419bc1`. Last input before launch testing: 158263; 190000 closeout threshold not reached.
- No implementation work remains. This is a bounded, read-only launch probe. Parent owns this note, evidence updates and Git; successor owns no files and must not commit, push, create chats or delegate. No active implementation workers or preview processes need inheriting. Follow AGENTS.md's relevant read-only and context instructions.

## Successor acceptance

1. Read this note from disk. Report marker `BEZEG-HANDOFF-PROBE-20261026-A` and accepted commit `1727cc3` in your final response.
2. Confirm actual working directory and `CODEX_THREAD_ID` differ from the parent chat ID above, while the checkout matches the path above.
3. Run `node tools/agent-usage/codex_worker_watch.cjs --self --once` and `node --test tools/agent-usage/codex_worker_watch.test.cjs`. Summarize the JSON input count/status and test count; avoid full test output in your response. Read the first local token-count sample if readily available to report starting input; otherwise omit it.
4. Report completion in this new chat's final response, at most 120 words, with results and any limitations. Send no message to the parent. Parent will observe completion using `wait_threads`.

No app build, browser smoke, runtime compaction, paid API or artificial token growth is part of this test. A passed launch does not demonstrate a hard context cap, cancellation of old processes, or identical model/permissions across chats; defaults may differ. After returning your result, stop.

## Observed result

Passed. Fresh successor `01a1754d-2d32-7f22-8d45-d3b6d802eda6` completed all four acceptance steps, reporting the marker, original commit, matching checkout, distinct chat ID, `below_threshold` at 31242 input and 17 passed tests. Parent inspection of the successor's local rollout confirmed the first input count and checkout. See the source specification's launch-probe section for evidence and limits. The successor stopped without editing files or starting another chat.
