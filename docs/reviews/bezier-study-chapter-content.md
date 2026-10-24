# Bézier chapter content review — 2026-10-20

Historical content-preparation record. The pilot was subsequently implemented and released; see [runtime and hosted evidence](standalone-learning/implementation.md). The [current release policy](../guardrails.md#release-policy--owner-decision-2026-10-24) supersedes the owner wording/classroom gates below; original checks and coverage limitations retain their historical scope.

## Delivered scope

The owner's “Do it” accepted the recommendation to complete/review the Bézier chapter copy and activity script, then prepare an implementation handoff. The result is a complete [Slovenian draft](../content/bezier-curves.sl.md), [English counterpart](../content/bezier-curves.en.md), [six-activity script](../specs/bezier-study-chapter-activities.md), and [bounded pilot task](lesson-implementation-history.md#standalone-learning-pilot). The parent [standalone learning specification](../specs/standalone-learning.md) remains authoritative for runtime behavior.

This is content and implementation preparation. No routes, graph code, localization catalogs, preset storage, or deployed app behavior changed. The activity URLs in the drafts describe future contexts, visibly labeled as such. Chapter runtime implementation has not started.

## Content and source review

The handler checked the complete bilingual drafts against the outline, prerequisites, source notes, and six-activity registry. An independent reviewer checked mathematical statements, worked examples, identities/routes, and capability claims against the current graph sources at `8f8aed4`. Both languages contain the same eight stable section identities and six activities. The derivation uses a quadratic; the worked curve is cubic; both De Casteljau activities visibly retain the separate quartic default. The Bernstein activity starts with degree two and three functions. The affine example is explicitly different.

The chapter introduces coordinatewise point combinations, interpolation, summation, binomial coefficients, and the affine notation it uses. It distinguishes observations from mathematical justification, states convex-hull containment on the unit parameter interval, includes degenerate hulls, and explains global interior-control influence without claiming local support. Activities are optional investigations with return interpretations; there are no exercises or completion gates.

Source attribution follows the already reviewed thesis map in [the outline](../specs/bezier-study-chapter.md#source-map-and-editorial-cautions). The thesis PDF was not re-extracted in this task. The opening and learner prose are original editorial wording; exact examples were independently calculated. Agent review does not establish owner approval of terminology or final wording.

## Checks and repairs

- Ran `just --list` before selecting documentation-focused checks.
- Recomputed the cubic's three midpoint rows, quartic midpoint, quadratic midpoint weights, and affine midpoint/translation using Node assertions. All inputs and intermediate results in these checks are exactly representable dyadic rationals, with exact equality assertions.
- Compared independent Bernstein evaluation with repeated interpolation at five parameters for each of the three authored control lists: 15 comparisons passed. Nonnegativity and sum-to-one checks passed at the same five parameters for degrees zero through five: 30 cases. These finite computations check the examples, not the general theorem; the chapter supplies the mathematical reasoning separately.
- The affine check caught the handler's incorrect midpoint before publication. Correct values are \((3/8,0)\), translated to \((7/8,0)\) by adding \(1/2\) horizontally. Independent review also identified this discrepancy while the correction was being applied.
- Repaired missing prerequisite explanations, changed the Slovenian straight-segment heading to “Daljica”, made hull terminology cover degenerate cases, and supplied actual related-demonstration links. Corrected both `shape-control` prompts to include moving an endpoint as well as an interior control. Repaired a sentence fragment after the interpolation formula in both languages.
- Clarified that the new handoff request permits preparing an intended implementation task beyond the earlier specification-only request, while the present task ends at that handoff.
- Checked eight anchors and six activities per language, ten matching display formulas and sixty distinct math expressions, balanced math delimiters, and fifty relative/canonical route links. Repeated inline symbols may appear in a different order/count in translated prose; display formulas match in sequence after normalizing translated row labels. Git whitespace checks pass.

The system Python launcher was unavailable; numerical checks used the installed Node runtime. This did not block the document checks. Application tests/build/browser smoke were not run because this change adds documentation and static copy only. The lesson notation test does not currently scan these Markdown drafts; delimiter/parity checks here do not claim future content-renderer coverage.

## Remaining acceptance

The content/handoff deliverable is complete with agent mathematical/source review. Final owner/subject-matter wording and Slovenian/English terminology approval remain open. The implementation task must establish real-board scene consistency, non-drag/keyboard activity access, accessible change descriptions, focus/scroll restoration, snapshot/lesson ownership, reset/Back/Forward/failure behavior, and production routing.

Desktop, narrow-screen, enlarged text, formulas, touch, projection, browser exports/presets, and classroom readiness are unverified for the future chapter. Follow the parent spec's full implementation acceptance table before calling the chapter released or expanding to other families.
