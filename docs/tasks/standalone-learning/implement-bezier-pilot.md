# Implement the standalone Bézier chapter pilot

**Status:** released under the [owner decision, 2026-10-24](../../guardrails.md#release-policy--owner-decision-2026-10-24). Existing wording is approved; separate language and physical-device/projector/classroom gates are removed. Concrete missing functionality, defects and verification gaps remain follow-ups. This supersedes conflicting historical release criteria below.

Source: [standalone learning specification](../../specs/standalone-learning.md). Content inputs: [chapter outline/source map](../../specs/bezier-study-chapter.md), [Slovenian chapter](../../content/bezier-curves.sl.md), [English chapter](../../content/bezier-curves.en.md), and [six-activity script](../../specs/bezier-study-chapter-activities.md). See [implementation and hosted evidence](../../reviews/standalone-learning/implementation.md).

## Outcome and boundaries

Deliver one readable, directly navigable Bézier chapter with six focused activities using the existing four Demonstrations. Both Learning and the independent Demonstrations catalog remain accessible. The chapter provides its own mathematical explanation; activities illustrate it without quizzes or completion tracking. The copy is a reviewed implementation draft; owner terminology/content approval and classroom/device evidence remain release gates.

The parent specification owns routes, transient memory, navigation semantics, invalid-context handling, failure rollback, and acceptance. Its 2026-10-16 restriction on creating task files applied to that earlier specification-only request. On 2026-10-20 the owner accepted the recommendation to “complete and review the Bézier chapter copy and activity script, then turn that into an implementation handoff.” That newer request authorizes creating this handoff for intended implementation. The current content task ends with this prepared handoff; it does not start application implementation. Use this assignment when the owner starts the pilot implementation.

Keep Slovenian default and English in lockstep. Preserve existing graph URLs, Guided lessons, inspector capabilities, presets/file formats, exports, and static client-only hosting. Reading/catalog pages mount no live boards; an activity mounts at most one board set using the existing graph implementation. Use the accepted reading/activity pictures for layout direction, rather than mathematical or interaction evidence.

## Implementation sequence

1. **Audit and establish seams.** Inspect current master and the four graphs named in the activity script. Map existing Guided lesson copy to chapter references; retain useful standalone lesson explanations. Identify the minimum chapter-content, activity-registry, navigation-memory, and graph-session interfaces. Keep mathematical evaluation independent of the chapter. Record which existing checkpoints cover view/selection and where they need a narrow extension. Done when every scene field and transition has one owner and each of the six authored scenes has a capability mapping.
2. **Prepare typed activities.** Implement the registry and only the missing graph-owned capabilities. In particular, add a typed De Casteljau full-curve visibility action. Verify authored defaults, independent activity identity, synchronous multi-action preparation, paused snapshots, reset, and rollback on action/capture/restore failure. Keep query strings limited to validated chapter/activity IDs. Done when all six scene contracts pass meaningful unit/math checks and real-board state matches the authored script.
3. **Build reading and navigation.** Implement the Learning index, chapter sections, and activities on canonical graph routes under the existing Pages base. Render static bilingual copy with typeset math and stable section IDs. Use existing content-rendering infrastructure where suitable; choose a static typed representation without a new runtime Markdown engine unless justified. Provide direct contents links, purposeful activity entry, named return, and related reading for the four pilot graphs. Done when every row of the parent's navigation table is implemented, including Back/Forward, fresh activity links, free exploration, ordinary graph restoration, lesson suspension/exit, and language switching.
4. **Verify and repair.** Exercise the complete pilot against a stable production build, independently review mathematics/content and engineering/accessibility, and close findings. Done when the evidence table below has observed results or a clearly identified unmet release gate. Do not describe an incomplete gate as passed.
5. **Publish the reviewed pilot.** Update architecture, capabilities, UI guidance, roadmap, and hosting documentation for actual changes. Record additive routes and visit-scoped state loss on reload. Commit logically separate work; fetch, rebase only new commits onto `origin/master`, recheck, and fast-forward push under AGENTS.md. A rebase conflict stops publication for handler review.

Delegate bounded implementation slices under [the agent workflow](../../agent-workflow.md). The handler owns scope, shared interfaces, integration, verification, and Git; workers own their assigned paths and report evidence without further delegation or Git publication. Serialize graph/session interface changes before dependent routing/UI work.

## Verification and release evidence

Start with `just --list` and [the command guide](../../commands.md). The following checks supplement the parent specification; they do not replace its full acceptance table.

| Area | Required result |
| --- | --- |
| Copy and mathematics | Both languages have the same eight sections and six activity identities; notation is delimited, examples match exact calculations, cubic/quartic/quadratic examples remain labeled. Confirm owner terminology/content review separately from agent source review. |
| Scenes and ownership | Unit tests cover synchronous action sequences and independent snapshots, reset/reopen, failure rollback, and exclusive activity/Guided lesson ownership. Real boards confirm the six starting scenes, controls, capture/restore, and disposal. |
| Navigation | Test every row in the parent's navigation table, plus invalid/missing/mismatched IDs, direct sections, unknown sections, and preserved unrelated query/hash values. Ordinary exploration and its snapshot remain separate from chapter activity snapshots. |
| Accessibility | Desktop and 390px reading/activity layouts, 200% text, formula overflow, keyboard focus/scroll restoration, assistive descriptions of essential changes, non-drag point editing, reduced motion, and presentation. Report physical touch/projector coverage explicitly. |
| Regression | Run TypeScript, full unit suite, and production build; preserve lesson notation tests and existing lesson smoke rows. After localization changes run `npx tsc --noEmit --pretty false` and production build. |
| Browser and hosting | Use the repository smoke-tester workflow and full browser checklist because shared routing/shell/lifecycle change. Include six-activity round trips, catalog/search/direct graphs, presets/file exchange/exports, both languages, and production Pages direct links/refresh under `/bezeg-2.0`. Locate the smoke skill before browser work; report missing tooling and dependent coverage honestly. |

Save a bounded evidence report under `docs/reviews/standalone-learning/` with build revision, commands/results, content review findings, observed viewports/workflows, repairs, and remaining owner/device gates. Link to bulky logs or screenshots instead of pasting them into worker reports. Expand to other chapters only after this pilot's evidence has been reviewed.

## Copyable assignment

Implement `docs/tasks/standalone-learning/implement-bezier-pilot.md` from fresh master, using its source specification, bilingual chapter copy, and six-activity script. Preserve static client-only hosting and the independent Demonstrations catalog. Reuse the existing graphs with typed scene actions, one active owner, and visit-scoped reading/activity memory. Keep the differently labeled default examples and all existing graph functionality. Follow AGENTS.md delegation, verification, commit, and publication requirements; report unmet owner/device review gates explicitly.
