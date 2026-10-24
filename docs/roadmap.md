# Roadmap

This roadmap defines order and completion evidence, without invented dates or performance numbers. Each implementation task needs a bounded spec. Breaking changes are allowed and must describe their impact.

Current queue and status corrections: [planning cleanup, 2026-10-24](reviews/planning-cleanup-2026-10-24.md). Prioritize the observed lesson keyboard-focus defect, then bounded lesson interaction improvements and the existing example-improvement batches. The phases below describe direction rather than a list of unstarted tasks.

## 1. Establish the baseline

Review every active demonstration using the [capability map](capabilities.md), and record which controls, exports, and presets actually work. Curate representative saved examples. Inspect the remote GitHub Pages configuration and document the real release process. Replace the stale starter-test assumption with relevant mathematical and interaction checks in separately scoped implementation work.

Collect the [performance baseline](performance-plan.md) for dragging and sliders before changing evaluation or rendering. Review known TODOs against current behavior rather than assuming historical priorities still apply.

**Done when:** active demonstrations have reviewed workflows, relevant correctness checks exist, hosting behavior is documented, and representative interaction measurements are reproducible.

## 2. Modernize the foundation in bounded changes

Done on 2026-10-13: Create React App was replaced by Vite and Vitest ([ADR 0009](adr/0009-vite-build-and-vitest.md), [spec](specs/vite-migration.md)); ESLint restoration remains open. The original evaluation brief follows.

Evaluate React + TypeScript + Vite as the first build-tool candidate. Create React App is deprecated, and React documents Vite as a build-tool migration option. This warrants evaluation, rather than selecting a whole application rewrite. [React's announcement](https://react.dev/blog/2025/02/14/sunsetting-create-react-app).

Compare keeping the current build temporarily against a Vite migration and a static-compatible framework approach. Prefer the smallest change that gives an understandable, maintained build and reusable hosting process. Record supported runtime versions, JSXGraph integration, MathJax loading, Sass imports, type checking, test tooling, and production output. A Vite build alone does not replace type checks or application tests.

GitHub Actions publication is also implemented, activated and verified; see [continuous deployment](specs/continuous-deployment.md) and the [SPA playbook](github-pages-spa-playbook.md). The earlier technology comparison above is historical. JSXGraph and Bootstrap remain; renderer and UI-library migrations are separate decisions.

**Done when:** a candidate produces a working static build, representative routes/exports/math behave as expected, and a documented cost-benefit decision selects the next implementation step. If the candidate is unsuitable, retain the baseline and record why.

## 3. Improve tools and visual design

The accepted Bézier and PH pilots established a graph-centered workspace with contextual controls and presentation access. The shared shell has now been applied to every active demonstration route while retaining route-specific commands. Continue reviewing desktop, projection, narrow-screen, touch, and keyboard journeys, and apply consistent spacing, typography, icons, contrast, and curve styling while retaining the elderflower identity.

Apply consistent spacing, typography, icons, contrast, and curve styling while retaining the elderflower identity. Explain local saving and import/export. Decide intentionally how to simplify confusing routes or preset formats, including release communication for any break.

**Done when:** representative journeys in [product direction](product-direction.md) work through the redesigned controls, active routes use the shared pattern, and the visual/accessibility review is recorded. The route rollout is released; physical-device and classroom observations are optional follow-up evidence under the 2026-10-24 release policy.

## 3A. Guided lessons — released

The [runtime](reviews/lesson-implementation-history.md#guided-lesson-runtime-and-pilot-content), pilot content and available cohort lessons are released under the [owner decision, 2026-10-24](guardrails.md#release-policy--owner-decision-2026-10-24). Existing Slovenian terminology and English wording are approved. Separate owner language and physical-device/projector/classroom sign-offs are not standing gates.

The [rollout specification](specs/guided-lessons-rollout.md) and [content blueprint](specs/guided-lessons-content-expansion.md) record implemented capability-aligned lessons. Keep supported availability explicit; do not invent generic lessons for unsupported graphs. Preserve typed graph actions, transient scenes/progress, existing routes and browser-local Presets.

**Remaining work:** consolidate capability/evidence ownership and restore the eight missing per-lesson smoke rows. Track concrete mathematical, functional or verification gaps individually rather than keeping every available lesson in draft status.

## 3B. Improve released lesson interactions and examples

The [lesson experience improvement](specs/lesson-experience-improvements.md) is released, including reading/navigation changes, safe early exit and the Taylor pacing pilot. Its formative and physical-device gates are removed; historical coverage limits remain recorded without implying failed or passed tests.

The [2026-10-24 UX audit](reviews/guided-lessons-ux-audit-2026-10-24.md) identifies current follow-ups, led by focus entering obscured graph objects. Address that concrete accessibility defect, then navigation/state clarity and viewport budgeting. Carry out the [example-improvement plan](tasks/lesson-example-improvements/README.md) in bounded batches, reconciling Taylor against the later pilot before editing.

**Done when:** scoped fixes and example changes satisfy their mathematical, functional, automated and affected-browser criteria. Physical-device, actual-projector and classroom observations are optional follow-up evidence.

## 3C. Readable chapters using shared Demonstrations — released pilot

The bilingual Bézier chapter, Learning index and six activities reuse four existing graph implementations. Visit-scoped reading/activity/ordinary-scene memory and typed actions implement the [bounded handoff](reviews/lesson-implementation-history.md#standalone-learning-pilot). [Implementation and hosted verification](reviews/standalone-learning/implementation.md) records real-board checks, deep links, refresh and history return. Existing wording is approved and separate physical-device/projector/classroom gates are removed.

The [standalone learning specification](specs/standalone-learning.md) and [ADR 0014](adr/0014-study-chapters-share-demonstrations.md) own the independent Learning/Demonstrations entry points and shared graph behavior. Keep static client-only hosting, bilingual content and transient state; practice and assessment remain excluded.

**Remaining work:** track concrete missing requirements and accessibility defects. Expansion to another chapter needs its own bounded scope; the pilot is no longer waiting on general terminology or classroom approval.

## 4. Improve interaction speed and ownership

Use the baseline to choose the smallest effective changes to numerical evaluation, cache invalidation, board update scheduling, and auxiliary object lifecycle. This work can accompany phase 3 once measurements exist; performance is not postponed until every screen has been restyled.

Work toward geometry independent of graph-global cache state. Consider alternate renderers only if the remaining measured costs justify their compatibility and export burden.

**Done when:** repeated measurements show improvement in target interactions, affected mathematical properties remain correct, final input settles accurately, and repeated navigation does not accumulate resources.

## 5. Add English and curate future capabilities

Localization is implemented and committed under the [confirmed spec](specs/localization.md). The [original review](reviews/localization.md) and later chapter/lesson verification record automated, source and bilingual-browser evidence. Existing terminology and wording are approved; separate language and physical-device/projector/classroom gates are removed. Concrete original cases not covered by later evidence remain verification follow-ups.

Centralize language strings and mathematical terminology, then provide English translations while keeping Slovenian as default. Review help, accessible names, empty/error states, and exports as applicable.

Curate new mathematical features from `TODO.md` and unused implementations. Possibilities include PH arc-length display, additional construction views, and higher-dimensional geometry. Each needs an educational goal, scope, and supporting checks; none is scheduled solely because it appears in historical TODOs.

**Done when:** agreed English journeys are reviewed and future features have individual priorities and specs.

## Change workflow

Use the documentation index to choose affected constraints. Clarify the task, write its spec in `docs/specs/`, create local task files only for implementation slices intended to be carried out, implement them, review against both standards and spec, then capture lessons. Keep hosting and build modernization distinct from Bezeg's mathematics so the resulting process is reusable.
