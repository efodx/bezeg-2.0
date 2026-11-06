# Curves stream: handler handoff 74

Handler 74 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-06. It replaces [handoff 73](handler-handoff-73.md) and closes the stream: the low-priority list is empty and only owner decisions remain, so **no successor was launched** and `Run state` is `complete`.

## State

- **On `origin/master`:** everything through this note. All five families are complete.
- No preview or worker of this handler should be running. Port 4387 is free.
- To reopen the stream, set `Run state: active` and start from this note. Settings then: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k.
- **Run `just` from PowerShell here, not Git Bash.** Git Bash's `PATH` stops near 4 KB, so npm scripts fail with `'vitest' is not recognized`. The install is fine.
- A bash heredoc halved the backslashes in a script this session. Check doubled backslashes after writing lesson text through a heredoc, or build them with `String.fromCharCode`.

## Done this session

| Commit | Work | Evidence |
| --- | --- | --- |
| `8f24de20` | **D2 step 6:** the prompt plays the 10⁻³ run, the 53-clip run the explanation already quotes, not the 134-step, 54 s run at 10⁻⁶ | A test bounds that playback under 30 s and pins the prompt in both languages |
| `3a190db6` | **Coons step 6** says the corner moves the interior net: all four points drop, by \(\tfrac19\), \(\tfrac1{18}\), \(\tfrac29\), \(\tfrac19\). The linked corners help says a press at overlapping end points takes the top one and how to choose the other | A kernel test pins the four changes against \(\tfrac12\cdot\tfrac i3(1-\tfrac j3)\); it failed first on the missing prose |
| `7ec37d5b` | **New finding, fixed:** at 700 px and below the collapsed lesson tab covered board captions, including the first line of D1's at 390 px. `.workspace-graph` gains 36 px of top padding in a lesson | Smoke test failed first (board at 12.5, tab to 42.5). Measured at 390: board stays 364×295, a drag still tracks |

**Closed with no change:**

| Item | Reason |
| --- | --- |
| Pointer drag stops at the board edge | Measured on `/bezier/clipping`: the point stops at the edge, follows again when the pointer returns, and a release outside ends the drag. A held point stays reachable, whereas a drag past the edge would lose it |
| D1's and D2's curves small at 390 px | The tall view leaves room for the desktop panel. *Prilagodi točkam*, directly below the board, fills it with the curves in one tap (viewed in D1). A phone-only view box would add a shared lesson field for two lessons |
| Step 5, frame 1 at 1280×720 hidden until the panel moves | Not a defect of one lesson: the first frame of a step shows the reading panel over the board until *Opazuj na grafu*, in every lesson. AB-B-6's smoke report says the same. Changing it is a shared panel design decision |
| Raw float in the Coons \(z\) field | Already fixed by `1da0fc5e`: the Coons panel uses the shared `PointEditor` |
| `probability/summary` legend 1 px past the panel at 1440 | Does not reproduce: a scan of the inspector's children finds none past its right edge |
| Closed native select truncates long values at 200% text | Native control behaviour; the open list shows them whole. Replacing it is out of proportion for a closed-state truncation |
| `prob-correlation` poster label 5 px from the residual | No overlap, and a recapture is not worth 5 px. Move the window if that poster is recaptured for another reason |

**Behaviour change.** During a lesson at 700 px and below the page is 36 px longer. D2's step 6 asks for a different tolerance. No route or stored format changed.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| Hosted CI and deploy | `984b4b88` (handoff 73's push) | Success. Handoff 73's work is deployed |
| `just check` | `7ec37d5b`, clean | Exit 0 |
| Full `just smoke-built` | `7ec37d5b`, clean | **Exit 1: 490 passed, 1 failed.** See below |
| `just smoke-built -g "on farin" --repeat-each=3` | `7ec37d5b`, clean | Exit 0: 18 passed |
| Hosted CI | This push | **Not read when this note was written** |

**The one smoke failure.** "header language switch re-titles the open lesson" on `farin` never saw the lesson panel, and the page logged `net::ERR_NO_BUFFER_SPACE`, a local socket error. It passed three times of three on the rerun, so it is treated as a load failure of this machine, not of the change. The cause was not investigated further. A second full run was not made.

## Open for the owner

Unchanged from [handoff 68](handler-handoff-68.md#open-for-the-owner): worked examples that never show, step 6 of L6, Slovenian-only card images, no performance budget for weak devices, chapter `investigationPrompts` displayed nowhere, `expectedObservations` rendered by nothing.

Added by this session, only if the owner wants them: a phone-only lesson view box, and a first frame that leaves the board visible.

## Risks and notes

Handoffs 61 to 73's "Risks and notes" still apply, and those they inherit.

- The tab check is one smoke test on `reduction`. It measures the board against the tab, so it covers the shared layout, not each lesson's own text.
- At widths above 700 px the tab still reaches about 8 px into the board. D1's caption clears it at 1440 and 1024; other lessons' board text at those widths was not swept.
