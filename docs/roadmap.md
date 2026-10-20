# Roadmap

This roadmap defines order and completion evidence, without invented dates or performance numbers. Each implementation task needs a bounded spec. Breaking changes are allowed and must describe their impact.

## 1. Establish the baseline

Review every active demonstration using the [capability map](capabilities.md), and record which controls, exports, and presets actually work. Curate representative saved examples. Inspect the remote GitHub Pages configuration and document the real release process. Replace the stale starter-test assumption with relevant mathematical and interaction checks in separately scoped implementation work.

Collect the [performance baseline](performance-plan.md) for dragging and sliders before changing evaluation or rendering. Review known TODOs against current behavior rather than assuming historical priorities still apply.

**Done when:** active demonstrations have reviewed workflows, relevant correctness checks exist, hosting behavior is documented, and representative interaction measurements are reproducible.

## 2. Modernize the foundation in bounded changes

Done on 2026-10-13: Create React App was replaced by Vite and Vitest ([ADR 0009](adr/0009-vite-build-and-vitest.md), [spec](specs/vite-migration.md)); ESLint restoration remains open. The original evaluation brief follows.

Evaluate React + TypeScript + Vite as the first build-tool candidate. Create React App is deprecated, and React documents Vite as a build-tool migration option. This warrants evaluation, rather than selecting a whole application rewrite. [React's announcement](https://react.dev/blog/2025/02/14/sunsetting-create-react-app).

Compare keeping the current build temporarily against a Vite migration and a static-compatible framework approach. Prefer the smallest change that gives an understandable, maintained build and reusable hosting process. Record supported runtime versions, JSXGraph integration, MathJax loading, Sass imports, type checking, test tooling, and production output. A Vite build alone does not replace type checks or application tests.

Separately evaluate publishing through GitHub Actions instead of a local `gh-pages` command, using the [SPA playbook](github-pages-spa-playbook.md). Keep JSXGraph and Bootstrap initially so build-tool results are not confused with renderer or design changes. These are recommendations for evaluation, not accepted migration decisions.

**Done when:** a candidate produces a working static build, representative routes/exports/math behave as expected, and a documented cost-benefit decision selects the next implementation step. If the candidate is unsuitable, retain the baseline and record why.

## 3. Improve tools and visual design

The accepted Bézier and PH pilots established a graph-centered workspace with contextual controls and presentation access. The shared shell has now been applied to every active demonstration route while retaining route-specific commands. Continue reviewing desktop, projection, narrow-screen, touch, and keyboard journeys, and apply consistent spacing, typography, icons, contrast, and curve styling while retaining the elderflower identity.

Apply consistent spacing, typography, icons, contrast, and curve styling while retaining the elderflower identity. Explain local saving and import/export. Decide intentionally how to simplify confusing routes or preset formats, including release communication for any break.

**Done when:** representative journeys in [product direction](product-direction.md) work through the redesigned controls, active routes use the shared pattern, and the visual/accessibility review is recorded. The route rollout is implemented; the broader device and classroom review remains open.

## 3A. Add bounded guided lessons — implemented draft

Add an optional, content-first Guided lesson flow to selected existing demonstrations. Keep the graph as the central exploration surface and preserve direct graph links, browser-local Presets, and static hosting. Store lesson content separately from route metadata, invoke only typed demonstration-owned Graph actions, and keep Lesson scenes and progress in memory. Start with the ordinary Bézier curve, De Casteljau construction, and cubic PH curve.

The [runtime task](tasks/guided-lessons/implement-guided-lesson-runtime.md) and independent [pilot content task](tasks/guided-lessons/study-and-fill-pilot-content.md) are implemented from the [bounded spec](specs/guided-lessons.md). The runtime consumes static content through typed graph capabilities and keeps scenes/progress in memory. Do not expand this into a curriculum, authoring system, assessment engine, new route family, or preset migration. Browser/device, owner/subject-matter, and classroom review remain open; existing mobile responsiveness remains unresolved.

**Done when:** the three pilots have supported, reviewed lessons; the feature/runtime checks pass; Slovenian and English content are complete; route/preset behavior is unchanged; keyboard, touch, projection, and narrow-screen flows are reviewed; and mathematical examples and prepared scenes match the implementation. Current state: runtime and draft content are implemented, focused checks pass, and the remaining review gates are explicit in the task files.

## 3B. Roll out reviewed lessons by cohort

Do not expose Guided lessons uniformly across the catalog. Build the [capability matrix](specs/guided-lessons-rollout.md), review and allowlist the three pilots, then proceed through Foundations/polynomial Bézier, rational Bézier, PH/parameterization, and spline cohorts. The current implementation also contains capability-aligned drafts for rational De Casteljau, degree elevation, base rational Bézier, quintic PH, affine translation/scale, (Cohort B) Bernstein polynomials and rational degree elevation, (Cohort C) weighted and PH arc-length parameterization, (Cohort D) subdivision and extrapolation, and (Cohort E, from the owner's thesis) splines, Farin points, the n-piece circle, and the alternative De Casteljau construction, so every active route now has a draft lesson; these remain subject to the same review gates and do not authorize generic lessons for the other routes. A route may remain lesson-free when its graph cannot support a coherent typed learning flow. The [rollout spec](specs/guided-lessons-rollout.md) records the matrix, gates, dependencies, and no-fit decision.

**Done when:** every active route has a reviewed lesson or an explicit no-fit decision, each released cohort passes the mathematical/content/device/accessibility gates, and the Learn entry remains an explicit reviewed-lesson allowlist.

## 3C. Add readable chapters using shared Demonstrations — specified future work

Content checkpoint, 2026-10-20: the first Bézier chapter now has [Slovenian](content/bezier-curves.sl.md) and [English](content/bezier-curves.en.md) implementation drafts, a [six-activity script](specs/bezier-study-chapter-activities.md), and a [bounded implementation handoff](tasks/standalone-learning/implement-bezier-pilot.md). See [content review and remaining gates](reviews/bezier-study-chapter-content.md). Runtime implementation, owner content/terminology approval, and browser/device/classroom acceptance remain open.

The owner accepted the [standalone learning specification](specs/standalone-learning.md), including reading/activity picture examples and independent Learning and Demonstrations entry points. Start with the [Bézier chapter](specs/bezier-study-chapter.md), supplying motivation and mathematical explanation around activities that use the existing graph implementations. Preserve standalone catalog/search entry and add related-reading links. Keep visit-scoped reading/scene restoration, static client-only hosting, and Slovenian/English content; practice and assessment are excluded. [ADR 0014](adr/0014-study-chapters-share-demonstrations.md) records the ownership decision. Specification publication does not start implementation or supersede the existing guided-lesson release gates.

**Done when:** one reviewed chapter is readable and directly navigable, all specified graph/reading/history round trips work, independent graph discovery and existing functionality remain intact, and the content, mathematical, localization, accessibility, lifecycle, and production-hosting verification in the specification passes. Expand to other families after the pilot provides evidence.

## 4. Improve interaction speed and ownership

Use the baseline to choose the smallest effective changes to numerical evaluation, cache invalidation, board update scheduling, and auxiliary object lifecycle. This work can accompany phase 3 once measurements exist; performance is not postponed until every screen has been restyled.

Work toward geometry independent of graph-global cache state. Consider alternate renderers only if the remaining measured costs justify their compatibility and export burden.

**Done when:** repeated measurements show improvement in target interactions, affected mathematical properties remain correct, final input settles accurately, and repeated navigation does not accumulate resources.

## 5. Add English and curate future capabilities

Localization implementation is now present in the working tree under the [confirmed spec](specs/localization.md). Automated checks and source review are recorded in [the implementation review](reviews/localization.md); browser/device evidence and owner translation approval remain outstanding before this phase's language work is complete.

Centralize language strings and mathematical terminology, then provide English translations while keeping Slovenian as default. Review help, accessible names, empty/error states, and exports as applicable.

Curate new mathematical features from `TODO.md` and unused implementations. Possibilities include PH arc-length display, additional construction views, and higher-dimensional geometry. Each needs an educational goal, scope, and supporting checks; none is scheduled solely because it appears in historical TODOs.

**Done when:** agreed English journeys are reviewed and future features have individual priorities and specs.

## Change workflow

Use the documentation index to choose affected constraints. Clarify the task, write its spec in `docs/specs/`, create local task files only for implementation slices intended to be carried out, implement them, review against both standards and spec, then capture lessons. Keep hosting and build modernization distinct from Bezeg's mathematics so the resulting process is reusable.
