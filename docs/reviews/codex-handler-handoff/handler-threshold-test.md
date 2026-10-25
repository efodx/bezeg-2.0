# Automatic threshold-to-successor probe

User authorization: on 2026-10-26 (Europe/Ljubljana), the user requested testing automatic triggering at the context threshold. This bounded test permits one controller chat and at most one successor chat in the saved local Bezeg project. Source contract: [Codex handler handoff](../../specs/codex-handler-handoff.md). It changes no production thresholds, model configuration or application files.

## Controller

Use the current checkout `C:/Users/NonFriedMotherBoard/IdeaProjects/bezeg` and follow AGENTS.md. Parent owns this document, evidence and Git; controller owns only `.command-logs/codex-handler-threshold-state.json`. No subagents, commits, pushes, background CLI models or messages to other chats. The user has authorized the single conditional successor creation below. Keep shell/tool outputs bounded; no padding, fabricated token records or repeated large reads.

1. Run the production self snapshot with `--self --once --until 190000`. Let initial observed request input be B. Fix the test threshold **T = B + 1000**, once, before additional investigation. Record controller thread ID, B, T, checkout and original parent ID `01a17539-0dac-78f3-ac58-92c05d419bc1` in the owned JSON evidence file. If telemetry is unavailable/error, stop with a failed test and no successor.
2. Run the snapshot with `--self --once --until T` immediately in the same shell execution as step 1, so it uses the same completed request sample. Require `below_threshold`; record its entire event as `control`. No successor may exist in this arm.
3. Perform useful, bounded verification: inspect up to 80 lines of `tools/agent-usage/codex_worker_watch.cjs` and run its 17 Node tests with compact output. At each subsequent tool boundary check the production snapshot with the unchanged T. Up to four useful steps are allowed (monitor tests, focused lint, spec acceptance review, test-file review), with no unrelated work or artificial context growth. If none reaches T, record `not_crossed` and stop without launching.
4. On the first actual `handoff_required` event, stop further investigation and record that event as `trigger` in the JSON, along with remaining acceptance: verify the successor reads this evidence and starts fresh. Confirm observed or crossing input is at least T, while the earlier control is below T. Resolve the saved project and verify its local path matches this checkout.
5. Only if step 4 succeeded, call desktop `create_thread` exactly once, local project environment, default model settings. Supply this note's absolute path and the evidence-file path; ask the new chat to perform **Successor** below. Do not use a fork or transfer parent history. Record the returned successor ID in the JSON; stop all other writes except that evidence record. Observe completion through bounded `wait_threads` calls, rather than messaging the successor. Record its final response and status, then stop with a concise result (B/T/crossing, identities, control/trigger states and successor outcome) and the required created-thread directive. Do not launch another successor after a failure.

## Successor

Read this note and `.command-logs/codex-handler-threshold-state.json`. Report marker `BEZEG-AUTO-HANDOFF-20261026-B`, controller ID, fixed T and observed crossing value from disk. Confirm your actual `CODEX_THREAD_ID` differs from the controller and original parent, and that your checkout matches the path above. Run the production self snapshot once; report input count and status. Return at most 120 words and stop. No edits, commits, pushes, delegation, additional chats or cross-chat messages. The controller will observe your completion.

## Interpretation

This exercises a real below-to-above transition in recorded request input, the handler's conditional response and fresh desktop successor creation. It does not test an unattended watcher waking an idle model, the exact 150k/190k production levels, a hard 272k cap, worker cancellation or compaction reload. Passing the fixed low-threshold test must not be described as proof of those properties.

## Retry ownership

The initial controller `01a17550-5b04-7391-b64d-ebf690361d29` stopped after missing the same-execution control requirement. It launched no successor. Its evidence is preserved as `.command-logs/codex-handler-threshold-failed-controller.json`. The original parent is executing the retry directly, so the controller ID and original parent ID are the same for this arm. It fixes a new threshold from its current baseline in one shell execution with the control; the original 150k/190k production settings remain unchanged. The successor must differ from this controller ID. All remaining acceptance and launch limits apply to this retry.

## Observed result

The retry passed. The production monitor returned `below_threshold` at B = **172150**, with fixed T = **173150**, in the same shell execution. A later boundary remained below at **172842**, and its conditional launch branch exited without creating a chat. After the 17 monitor tests and focused lint passed, the next boundary reported `handoff_required` at **174768** (1618 above T). Only that event opened the conditional `create_thread` branch. Neither production thresholds nor the fixed trial T changed.

Successor `01a17552-4ba7-7680-a810-d96c3b0b874f` completed in 15002ms according to `wait_threads`. It returned the disk-only marker, fixed T, exact crossing, correct checkout, distinct thread identity, and a production self snapshot of **31251** input (`below_threshold` against 150000). It changed no files and created no further chats. The initial failed arm remains part of the evidence; no saving comparison excludes its cost. No artificial context or telemetry was generated.

This validates the cooperative handler's observed-input-to-conditional-launch path with a fixed override in a real active chat. Unattended wakeup, exact production trigger levels, hard cap enforcement, background-worker cancellation and auto-compaction reload remain unverified.
