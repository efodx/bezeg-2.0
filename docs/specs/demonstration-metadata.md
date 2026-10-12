# Demonstration metadata module

Status: implemented and verified on 2026-10-08. The implementation evidence and remaining verification limits are recorded below; current ownership is described in [current architecture](../current-architecture.md).

Agreed with the owner on 2026-10-08. Implement a behavior-preserving deepening of the Demonstration metadata module.

## Scope and design

Use two queries: an ordered catalog and an exact-path Demonstration lookup. A private explicit table owns identity, literal path, family, localized catalog and graph-heading titles, two learning prompts, and available graph navigation actions. Resolve translations at query time through existing localization; retain display subscriptions. The catalog also resolves the three existing starting selections and their distinct copy.

The routing adapter binds Demonstration identities to graph implementations. Displays import metadata rather than the router. Illustrations and layout remain with their displays. Preset storage, board ownership, graph descriptions, controls, geometry, and localization infrastructure retain their existing owners. No new registration mechanism, dependency, deployment, or external ticket is required.

## Acceptance criteria

- Preserve all 26 graph paths, including `/bezeg/param/param/...`, their order, six-family order, and three starting selections. Exclude home and catalog from graph metadata.
- Preserve catalog/navigation wording separately from actual graph headings: general Bézier and cubic PH have heading overrides; quintic PH and splines already have distinct display titles. Move the two graph title overrides into metadata.
- Preserve every active Demonstration's prompt pair, including repeated subdivision at fixed t = 1/2. Replace pathname inference with explicit assignments.
- Preserve ordered pan/zoom actions and omit point-fit only for Bernstein.
- Preserve live Slovenian/English updates without remounting controls or resetting the prompt index. Do not cache localized strings at module initialization.
- Unknown exact paths return absence. The existing router retains unknown-route behavior; isolated prompt displays use neutral fallback copy rather than inventing a Demonstration.
- Preserve routes, Preset keys/data, selection, Presentation mode, illustrative assets, layout, keyboard labels, and all numerical behavior. No user migration is needed.
- Graph imports remain in the routing adapter; display modules must not import the routing implementation. Bind all metadata identities to graphs with a typed exhaustive map.

## Verification

Test through the two-query interface against independently recorded route, family, title, prompt, action, and starting-selection expectations. Retain router/catalog/workspace/localization interaction checks, and check exact lookup absence and language changes. Run TypeScript and the production build. Exercise production entry, navigation, query/hash retention, and unknown routes where local browser tools are available. Review changed code for mathematical, engineering, and UI/accessibility constraints. Commit only task-owned changes; do not push or deploy.

## Alternatives considered

A composable registry with family defaults adds extension machinery and hides effective values in inheritance. A single display snapshot simplifies rendering but ties the interface to particular layouts. Two queries provide sufficient depth and locality for the fixed catalog without those costs.

## Implementation verification

Implemented on 2026-10-08. All 71 checks across 10 focused suites passed, including metadata expectations in both languages, every route-to-graph binding, catalog navigation/back, query/hash preservation, unknown routes, persistent controls/prompt index, localization, preset import, and existing Bézier numerical checks. TypeScript and the production build passed; the build retains existing lint and toolchain warnings. The obsolete starter `App.test.tsx` remains outside this focused run.

Production browser checks confirmed all 26 catalog links and nine loaded illustrations, keyboard entry into cubic PH, preserved PH/Bézier headings, live translation without resetting the current prompt, browser back, direct Bézier entry and refresh with query/hash retained, Bernstein's omission of point-fit, and the existing unknown-route error view. Mathematical, engineering, and UI/accessibility parallel reviews found no code regressions; architecture/capability/UI documentation now describes metadata ownership and the renamed routing adapter. Remote hosting, physical-device, and projector checks were not repeated because layout, numerical behavior, and hosting configuration are unchanged.
