# Architecture review of the lesson-family expansion

Reviewed on 2026-11-03. The requested last-three-days window is pinned to `d7204cedb8d6586df6d4e0c34128d84a7aec0ed8` (2026-10-31 18:47 CET), immediately before the 72-hour cutoff, through `1e19b30b11947a6532df68d9e1244a38cf810a29` (2026-11-03 18:30 CET). This contains 802 commits and 2,290 changed files. Other feature work remains ongoing; an intentionally unregistered graph core is not treated as an incomplete released feature.

This is a code and architecture review. It excludes mathematical correctness, lesson prose, curriculum coverage and translation quality. Inspection concentrates on shared integration paths and representative new families, rather than claiming a line-by-line review of the entire diff. Engineering, spec conformance and control consistency received independent read-only reviews; the handler checked the cited implementations. No application changes are proposed as already approved implementation work.

## Standards

### S1. Shared controls are optional, so new families bypass them — P2, observed

`src/graphs/compgeo/PointSetControls.tsx:181-184`, `src/graphs/projective/ThreeViewsControls.tsx:52-57` and `src/graphs/projective/FivePointControls.tsx:113-115` render native checkboxes directly. `src/inputs/OnOffSwitch.tsx:13-20` instead emits Bootstrap switch markup. The raw inputs do not receive that markup or its class-based styling. The frequently reused `pointset-check` class has no CSS definition at this snapshot.

This explains the reported inconsistency: there are multiple implementations of an inspector boolean control. A checkbox and a switch can legitimately have different semantics, but the current choice is made through unrelated markup rather than an explicit shared variant. The controls UX spec requires consistent treatment in both exploration and lessons and says not to invent family-specific styling systems ([scope and information architecture](../specs/demonstration-controls-ux.md)). Raw checkboxes in the point-set foundation predate this window; new panels reproduce and expand the pattern.

### S2. A shared input does not own its presentation — P2, observed

`src/graphs/base/WorkspaceControls.css:65-72` styles switches through `#inspector-display`, while `:147-158` gives `.workspace-inspector .tools` different row and track dimensions. `src/graphs/functions/FunctionReadout.css:24-30` repeats the Display switch rules under `.function-inspector`. `OnOffSwitch` itself supplies no semantic workspace class.

A caller must know the correct ancestor classes, tab and stylesheet imports to reproduce the established appearance. Fixing the input alone does not fix its consumers. This is a possible Duplicated Code / hidden-interface problem, amplified by the new families; it is not a claim that every current instance looks different. No browser measurements were taken.

### S3. Numeric editing behavior is being copied along with markup — P2, observed duplication

The draft/resynchronization/parse/blur protocol is separately implemented by `IntegerField` (`PointSetControls.tsx:58-76`), `CoordinateField` (`FivePointControls.tsx:40-60`) and `StepField` (`PolePolarControls.tsx:36-55`), alongside the existing `src/inputs/NumberInput.tsx:63`. The scaled integer domains are real requirements; they do not require every panel to own a fresh text-editing protocol. `ThreeViewsControls.tsx:35-37,56-57` also uses bare ranges instead of the shared slider with precise entry.

These paths differ in decimal entry, formatting, invalid drafts and available precise entry. Not every difference is a bug, but keeping Reset, lesson actions, preset restore and language changes consistent now requires changes and verification in several places. This is a possible Duplicated Code smell against the shared numeric-control behavior in the controls UX spec, rather than a finding about the underlying numeric domains.

### S4. Each new standalone scene repeats a host lifecycle protocol — P2, maintenance risk

`BSplineBlossomGraph.tsx:104-143` and `BSplineNurbsGraph.tsx:131-169`, under `src/graphs/curves/bspline/`, independently wire scene creation/removal, replacement synchronization, figure disposal, unmount disposal and shape-sensitive state synchronization. The inspected implementations dispose correctly; no leak was demonstrated.

The risk is the interface authors must remember: five related hooks rather than one owned scene declaration. This is a possible Duplicated Code smell. The existing scene replacement refactor is useful and should be deepened where necessary, not replaced with a second lifecycle system.

### S5. Persisted-state projection is a per-graph choreography — P2, maintenance risk

`src/graphs/projective/FivePointGraph.tsx:250-274` strips model fields from exported `graphState` and then restores them through separate figure and lesson state hooks. `ThreeViewsGraph.tsx:158-177` repeats that protocol. The shared transient-state tests also need an external `PRESET_DATA_STATE_KEYS` inventory (`src/graphs/base/graphTransientStateContract.tsx:65`).

Storing the model once is good. Having every graph and the generic test harness independently know which fields are omitted creates a possible Shotgun Surgery smell. No current stale-model failure was reproduced.

## Spec and contract conformance

### C1. Lesson ownership lookup performs unrelated work and depends on an import cycle — P2, observed

`src/learning/runtime/lessonCatalog.ts:175-179` searches chapter ownership before adapting the requested catalog lesson. `src/learning/content/chapterOwnedLessons.ts:44,75-80` calls `Object.entries` on each traversed chapter registry. Registries expose enumerable getters, for example `bsplineChapterRegistry.ts:25-34`; enumerating entries invokes every getter in that chapter. A match stops subsequent chapters, but a fallback-only lesson can traverse every chapter and adapt their unrelated lessons. The adaptation cache reduces repeated construction, not the repeated scan.

The same registries import the catalog that imports their ownership table. Thunks and getters explicitly work around this cycle (`chapterOwnedLessons.ts:37`, `bsplineChapterRegistry.ts:21-23`). The cycle was already documented in [the November 2 review](architecture-2026-11-02.html); this review confirms it remains and identifies the eager getter traversal. This conflicts with the intended per-Demonstration lazy adaptation described by the current lookup seam. Extra work is established by code inspection; latency and user-visible slowdown were not measured.

### C2. Persisted Preset validation still differs by entry path — P2, observed validation gap; failure impact unexecuted

`src/graphs/base/presets/PresetImport.ts:44-53` checks both `graphState` and data for files. `BaseGraph.tsx:645-660` checks stored data, then overlays stored `graphState` without the collection's `checkGraphState`; `:928-936` likewise accepts it in `importPreset`. The storage reader checks the envelope and names rather than complete graph-specific state.

For example, the interpolation collection has a graph-state checker (`src/graphs/curves/interpolation/interpolationPresetCollection.ts:41`) which the figure-state overlay does not call. Therefore equivalent malformed saved state is not held to the same rules through these entry paths. A corrupted scene reaching drawing code is a risk; no runtime crash is claimed as reproduced here. The collection's own documented contract says the file importer and stored loader use the same definition (`PresetCollection.ts:6-9`).

This is the previously documented complete-Preset-validation candidate in the November 2 review, not a newly introduced host defect. New families and their additional state shapes increase its reach. Trusted in-memory lesson checkpoints should remain distinct from persisted, untrusted values.

## Architectural changes to make next

### 1. Make the inspector control module own markup, appearance and editing behavior

Deepen the existing inputs rather than introducing another UI library. A small shared set should cover boolean fields with explicit checkbox/switch variants, choice fields, numeric fields, slider-plus-number fields, field groups, actions and readouts. Each owns its label association, help/error linkage, focus treatment, row layout and responsive hit area. CSS should target classes emitted by these modules; the enclosing tab supplies layout, not a second implementation of the control.

Keep domain conversion explicit: scaled integer coordinates need a display/parse/commit adapter, not a universal step or rounding rule. Graph modules supply values, domains and commands. They should not reproduce draft synchronization or control chrome. Custom constructions can still compose the primitives.

Start with PointSetControls and ThreeViewsControls as two different consumers. Verify normal and enlarged text, Slovenian/English, narrow/desktop layouts, keyboard use, invalid drafts and indirect state changes. A lint restriction on raw inspector inputs and direct Bootstrap control imports can prevent accidental bypass, with named exceptions for genuinely specialized editors. Add a small rendered control gallery used by browser checks; do not infer visual consistency from graph-state unit tests.

### 2. Separate lesson definitions, ownership metadata and runtime adaptation

Make dependencies flow from static authored definitions and cheap ownership descriptors into the runtime adapter. Descriptors identify chapter, section, Demonstration and lesson without constructing the lesson. Build an ID-to-owner index once; obtain/adapt only the chosen lesson after lookup. Preserve the explicit policy for several chapter lessons sharing one Demonstration.

Acceptance: importing or looking up one lesson must not invoke unrelated lesson factories, a missing reference must identify its own descriptor, and the catalog/ownership import cycle and `Object.defineProperties` workaround disappear. This is a small, testable interface with real lookup consumers, not a new authoring platform.

### 3. Extend existing registration with feature-local descriptors

Derived routes and authored-content-derived availability already exist; keep those gains. The remaining family integration is spread across graph factories, Preset collections, chapter ownership and preview tooling. For example, the S5/S6 registration commit `2fedc180` touches 18 files, and new chapter capture support is separately listed in `scripts/generate-guided-example-inventory.cjs:207` and `scripts/capture-guided-example-previews.cjs:53`.

Group related registration facts in a typed family descriptor and derive the relevant indexes. Keep lightweight catalog metadata separate from executable graph loaders and independently authored preview expectations. `src/Routes.tsx:7-12` currently lazily imports a factory table that statically imports all graph implementations; family loaders offer a natural narrower loading seam, although no loading-time improvement is claimed without measurement.

Acceptance: adding a Demonstration/lesson has a short, documented set of local edits; missing or duplicate routes, lessons, collections and preview mappings fail automatically. Readiness should distinguish intentionally unregistered work from published entries without another manually synchronized pending-ID list. Migrate one family first. Do not collapse domain models, runtime code and asset-generation details into one enormous configuration object.

### 4. Register one owned scene adapter with the existing host

For standalone scenes, let the existing host/session own registration, disposal and replacement ordering once. A scene adapter supplies creation, synchronization, disposal and an explicit structural identity when rebuilding is necessary. Keep the synchronous scene store as the authority; state writes remain visible to later actions in the same tick, with board effects at the existing commit point.

Prove the seam with the two B-spline scenes before considering other families. Acceptance covers repeated reset/import/checkpoint restore, figure batch entry/return, unmount/remount, structural changes and continued dragging afterward. Inspect owned objects/listeners, not just object counts. Avoid migrating older curve adapters whose ownership needs differ merely to make them look uniform.

### 5. Make one persisted-scene module own validation and projection

Extend the existing Preset collection/replacement seam to decode the complete persisted envelope into checked data, view and permitted scene state, returning an actionable refusal before mutating the graph. File import, stored selection, initial mount and figure batches should all cross it. Give each graph one explicit projection/reconstruction rule where persisted data overlaps runtime state, instead of separate export, figure, lesson and test inventories.

Acceptance uses equivalent valid and malformed file/stored Presets across all persisted entry paths and checks the graph remains usable after refusal. Keep trusted lesson checkpoints and transient state separate. Any format or route break needs a deliberate decision with recorded user impact; this review does not authorize one.

## Suggested sequence and evidence limits

First establish the control module and migrate the shared point-set panels plus one projective panel. That addresses the reported issue across several lessons and establishes the rule for ongoing work. Complete-Preset validation can be a separate bounded change. Then remove the lesson lookup cycle, reduce registration duplication, and trial the owned-scene seam. Each change needs its own bounded specification and acceptance criteria before implementation.

The review ran Git history/diff inspection, source and caller searches, and independent read-only reviews. No production build, unit suite, browser smoke, visual measurements or performance measurements were run: application behavior was not changed. Reported markup, CSS, traversal and validation-path facts are source evidence; predicted runtime failures and lifecycle drift remain identified risks. The Impeccable context launcher was unavailable, so existing PRODUCT.md, DESIGN.md and repository design constraints were read directly. Contributor-inventory staleness noted by the spec reviewer is not counted as a code finding here.

Review totals: Standards **5** findings (three observed consistency/duplication issues and two maintenance risks); Spec/contracts **2** findings (eager lookup and a persisted validation gap). The strongest Standards issue is the bypassable control module; the strongest contract gap is unequal persisted-Preset validation.
