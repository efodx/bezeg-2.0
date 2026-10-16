# 06 Review and release the complete set

Source: [spec](../../specs/representative-demonstration-previews.md), all acceptance criteria. Depends on: [03](03-representative-stills.md), [04](04-motion-pilots.md) and [05](05-catalog-player.md).

## Goal and scope

Integrate and accept representative posters plus the six motion loops at one stable source/build checkpoint. The handler owns acceptance and Git; independent reviewers return findings without editing or pushing.

## Deliverables and acceptance

- Record source revision and relevant dirty-state fingerprint, current shipped/genuine-preview counts, and exhaustive recipe/poster/motion/manifest agreement. No placeholders or unaccounted targets are accepted.
- Run parallel mathematical/engineering and visual/accessibility reviews against the source spec. Include curve invariance, supported scene actions, unchanged defaults, fixed-camera motion, graph-free playback, lifecycle/loading, card-size readability and keyboard navigation without playback controls. Resolve findings or record explicit owner-approved deferrals with impact.
- Use `$smoke-tester` and the [browser checklist](../../smoke-tests.md) on a stable production build. Cover full catalog and shared picker at desktop and 390px, normal/reduced motion, automatic visible looping, concurrent visible clips, shared carousel assets, offscreen/document-hide cleanup, filtering, picker reopen, delayed/failed media, asset requests, no overflow and unchanged destination starting scenes. Include codec coverage and fallback; record physical-device/projector review gaps.
- Keep regression checks for existing decoded-poster loading and links. Run focused capture/manifest/player/catalog tests, relevant mathematical tests, `npx tsc --noEmit --pretty false` and `npm run build`. Full lesson-runtime testing is unnecessary if lessons/runtime remain unchanged; shared picker changes require the applicable workspace smoke coverage.
- Update capture/regeneration instructions and the architecture's preview description for the actual delivered behavior. Record encoder prerequisites, measured budgets and browser/coverage limits. Add an ADR only if the implemented format/delivery choice warrants a consequential decision record.
- Give each spec criterion observed evidence or an explicit gap. Implementation completion is not full acceptance while a required check remains missing. Record this task's results and delegation evaluation under the current workflow.
- Commit only task-owned changes in logical slices. Fetch, rebase only new commits onto `origin/master`, recheck against master's code and fast-forward push under repository rules; stop on rebase conflicts. Report commits and verification results. Do not deploy unfinished unrelated route work.

## Results — 2026-10-16

See [release verification](release-results.md) for final revised checks and [capture results](capture-results.md) for per-scene evidence and explicit limitations.
