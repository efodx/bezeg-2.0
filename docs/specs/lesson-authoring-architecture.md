# Lesson-authoring architecture

**Status:** scheduled, 2026-11-07. Workstream 2 is implemented and accepted (2026-11-07, [task 02](../tasks/lesson-authoring-architecture/02-lesson-lookup.md#acceptance-2026-11-07)); the other workstreams are unstarted. The owner authorized workstreams 2, 3 and 4 on 2026-11-07, after workstream 5 was approved for [Controls](../tasks/feature-streams/controls.md) step 7 and workstream 1 joined [shared graph controls](shared-graph-controls.md). Workstream 2 runs in [Contracts](../tasks/feature-streams/contracts.md) step 4, workstream 4 in Controls step 8 and workstream 3 in Controls step 9. Each stream writes its task file from this spec first. This is the canonical specification for five bounded workstreams.

Source: [architecture review of the lesson-family expansion](../reviews/lesson-authoring-architecture-2026-11-03.md), inspected against `d18dc06c9a0c7c1c756e19dc5963839969c6cb7b` and rechecked against `619cd657` during Git integration. The review's findings refer to its pinned historical snapshot; the planning review checked the current seams below, including the newly registered Blossom route. [ADR 0039](../adr/0039-lesson-authoring-module-ownership.md) records the architectural decisions and alternatives. The final section records substantive corrections to three unaccepted worker proposals.

## Problem and intended outcome

Adding a lesson family currently repeats inspector control mechanics, standalone-scene lifecycle hooks and model projection rules, while integration facts are spread across graph, chapter, Preset and preview registrations. Lesson ownership lookup also discovers identity by evaluating lesson getters, through a catalog/registry import cycle. Complete persisted-Preset validation differs between file and graph entry paths.

The outcome is a controlled authoring path using deeper existing modules. A graph author supplies domain values and commands, one scene declaration where applicable, and one persistence projection where needed. A lesson author supplies definitions and explicit ownership identities. Family composition connects them through small typed declarations. Callers lose shared editing, lookup, replacement and projection knowledge; moving existing boilerplate into another large configuration does not satisfy this specification.

The observed issues are markup/style and editing duplication, eager getter traversal, opposing imports, scattered registration, and unequal validation. Lifecycle drift and stale-model failures are preventive concerns: no leak, crash, latency improvement or rendering speedup has been demonstrated. Mathematical correctness and lesson-content quality are outside this investigation; implementation must preserve existing mathematical meaning and relevant checks.

## Scope and shared contracts

- Keep the static, client-only app, existing stack, Slovenian default, bilingual localization, elderflower identity and current inspector organization. No UI framework, renderer, build-tool, curriculum, authoring platform or plugin-system migration.
- Preserve current routes, Demonstration IDs, chapter/section/example identities, Preset keys and supported file shapes. The explicit persistence behavior changes below do not introduce a new file format. Any further break needs its own recorded reason and user impact.
- Preserve the [chapter-owned learning contract](chapter-owned-guided-learning.md): catalog guidance and chapter guidance reach the same activity; exact-section entry/return, reading position and focus survive. Several lessons may share one Demonstration.
- `SceneStore` remains authoritative. A state write is visible to the next scene action in the same tick. Ordinary drawing effects remain at the host commit; lesson replacement retains its existing synchronous drawing/rollback exception. Do not introduce graph-field mirrors or defer scene actions through promises.
- Extend [completed graph contracts](graph-contract-deepening.md) and [architecture deepening](architecture-deepening-backlog.md), especially its completed registration and scene-replacement work. Keep `GraphSession`, `SceneReplacement`, family-owned `PresetCollection` definitions and transient-state declarations as the existing owners.
- Geometry/domain modules retain mathematical rules. Generic controls, metadata and persisted-envelope code must not acquire domain evaluation or board ownership. Do not create graph objects during React render.

### Responsibility and dependency map

| Module | Owns | Must not acquire |
| --- | --- | --- |
| Shared inputs | Field markup, local appearance/accessibility, draft protocol | Geometry, lesson navigation, family-specific numeric domains |
| Lesson metadata/index | Identity, owner order, selected-provider key and navigation associations | Lesson construction, graph loaders, runtime catalog imports |
| Lesson providers and adapter | Authored definitions and selected-definition adaptation | Ownership discovery by constructing other lessons |
| Family composition | Typed connections among its metadata, runtime loaders and collection references | Lesson prose, model algorithms, preview expected values |
| Graph host/session | One live owned-scene slot and lifetime integration | A second replacement scheduler or duplicate model state |
| Persistence module and family projection | Complete persisted checks, pure consumer preparation and data/state reconstruction | Checkpoint serialization, transient state, board mutation during checking/preparation |

Cheap family metadata has no executable graph/content dependencies. Runtime family exports and learning providers import cheap metadata and lower-level contracts. App, learning, persistence and tooling composition import only the exports they need. Features must not import a root index that imports them back. Type-only references use type-only imports; shared identity types must not require evaluating the root catalog.

## 1. Shared inspector controls

The owner widened this workstream to all panels on 2026-11-06. [Shared graph controls](shared-graph-controls.md) is the draft scope and takes precedence where the two differ.

### Existing seam and target

`src/inputs/{OnOffSwitch,NumberInput,Slider,ChoiceSelect}.tsx` already provide shared inputs. Raw fields in `PointSetControls.tsx:58-76,181-184` and `ThreeViewsControls.tsx:35-57` bypass them; numeric drafts also recur in FivePoint and PolePolar panels. Switch appearance depends on ancestors in `WorkspaceControls.css:65-72,147-158` and `FunctionReadout.css:24-30`.

Deepen the existing inputs so each field emits its own presentation classes and owns label, help/error association, focus treatment, row wrapping and usable hit area. The inspector owns grouping, tab order and disclosures. Graph callers provide localized text, authoritative values, bounds, units, conversion, enabled state and commands. Reuse existing action/readout/group patterns where two real consumers justify sharing; no universal inspector schema is required.

Boolean fields have explicit checkbox and switch variants with native checked/change/Space behavior. Checkbox is the default for inclusion or model choices, including polygon closure. Use the switch variant for immediate display/visibility settings. Keep accessible names stable and expose whichever native semantics the variant actually implements; a visual variant does not justify an unrelated interaction protocol. No role is added solely for styling.

### Numeric contract

Preserve each field's current domain and immediate versus confirmation policy. PointSet's `IntegerField` edits integer coordinates and segment/interval endpoints, not just counts. ThreeViews stores its parameter in tenths and its angle as a discrete index. Callers provide explicit conversions and representability checks; shared draft/parse/commit behavior stays in the input module. Display precision must never round an untouched model value. Do not infer every numeric domain from the slider's step or clamp arbitrary typed input into validity.

A valid no-op edit is accepted without refusal or an unnecessary model write. Command adapters must distinguish a result meaning "changed" from one meaning "accepted": ThreeViews commands return false for an unchanged valid model, while `NumberInput` interprets false as rejection. Preserve the existing void wrappers or explicitly adapt those meanings; do not mechanically forward the boolean.

The shared contract must cover these cases:

| Event | Required behavior |
| --- | --- |
| Incomplete, empty or invalid draft | Retain local text while editing; do not write zero, NaN or a rejected value to the model |
| Valid draft in an immediate field | Commit through the domain command as today; preserve its refusal feedback |
| Enter in a confirmation field | Commit a valid edited draft; retain and explain refusal; an untouched field causes no rounding/write |
| Enter in an immediate field | Do not submit/reload an enclosing form; keep the accepted value |
| Escape | Discard the draft and field error, show the current model; do not undo already committed immediate edits |
| Blur | For confirmation fields, attempt a valid edited draft, then show the accepted model with any refusal explanation; for immediate fields, show the current model and clear abandoned draft errors |
| Arrow/slider/stepper edit | Preserve existing valid step and bounds, native range Home/End/Page behavior, and immediate graph updates; reject unrepresentable domain conversions explicitly |
| Unrelated rerender | Preserve focus and draft when this field's value, identity and replacement revision are unchanged |
| Authoritative value/identity replacement, Reset, lesson/preset restore | Replace stale drafts/errors with the authoritative value, even if replacement restores the same number; expose a replacement/reset signal where value comparison alone is insufficient |
| Language change | Reformat from the authoritative value and discard an uncommitted draft; do not write a newly formatted value back to the model |

First migrate `PointSetControls` and `ThreeViewsControls`, including PointSet integer coordinate/end-point fields, boolean overlays/closure and both ThreeViews sliders. Preserve constrained editing, dependent angle disabling, selection, command meanings and readouts. FivePoint/PolePolar draft conversion is a later bounded migration, after the shared contract works; it is not required to finish this pilot.

Add a test-only rendered fixture for both boolean variants, choice, numeric/slider, help/error, disabled states and long bilingual labels. It is not a public app route. Protect new inspector code from bypassing shared boolean/range/numeric fields or using Bootstrap controls directly. Use a narrow lint restriction with explicit existing-file/specialized-editor exemptions; ratchet exemptions down as consumers migrate. Exemptions name their reason and affected paths and cannot hide new bypasses in migrated panels.

### Acceptance

- **I1:** The two migrated panels contain domain values/conversions/commands without generic field chrome or duplicate draft protocols. Control-specific CSS no longer requires a tab ID or function-inspector ancestor; remove superseded rules without breaking unmigrated consumers.
- **I2:** Unit/component tests exercise the numeric event table, explicit conversion edges, valid no-op edits, names/descriptions/errors, disabled behavior and external replacement. Deliberately invalid drafts and rejected commands demonstrably leave graph state intact.
- **I3:** The fixture and real consumers pass bilingual browser review at 1440×900, 1024×768, approximately 724 CSS px, 390×844 and 200% text enlargement: no clipped labels/values/errors, visible focus, reachable controls, and the existing UX spec's touch-target guidance. Check both Edit and Display placement.
- **I4:** Direct keyboard/touch edits, dragging, Reset, synchronous multi-action lessons, preset restore and language change keep field/slider/board consistent. UI-only focus, tab and disclosure changes preserve the mathematical scene; explicit model/visibility commands still perform their intended changes. No automatic curve selection or new reveal shortcut.
- **I5:** An intentional unapproved raw inspector input fails lint, while named legacy/specialized exceptions pass. Rendered checks establish presentation; graph-state tests alone do not.

## 2. Lesson definitions, ownership and adaptation

### Existing seam and target

`lessonCatalog.ts:175-186` asks ownership before adapting fallback content. `chapterOwnedLessons.ts:38-44,75-80` enumerates registry values; enumerable getters such as `bsplineChapterRegistry.ts:25-34` execute unrelated adaptation. Registry imports back into the runtime catalog create the documented cycle. Caching adaptation does not eliminate scans.

Separate three concerns:

1. Cheap rows identify chapter, section, Demonstration and a stable lesson/provider key. Build indexes once for exact owner identity and Demonstration-to-ordered-owners. Enumerating identities or generating a path constructs no lessons.
2. Providers resolve a requested authored definition. A lower-level content adapter adapts raw content without importing chapter ownership or the public runtime catalog. Chapter providers reusing catalog-authored content call that lower-level adapter, never ownership-aware lookup.
3. Learning composition connects indexes to provider lookup and caching. Only after identity selection does it resolve/adapt that definition. Missing references identify the offending chapter/section/lesson key; unknown user destinations retain current actionable fallback/error behavior.

Preserve the current default precedence explicitly as ordered metadata: chapter table order, then teaching order within a chapter. Exact-section queries select that row; catalog guidance selects the first owner; Demonstrations without a chapter owner retain their catalog fallback; explicitly lessonless entries stay unavailable. Do not deduplicate lessons by Demonstration ID or collapse linear-map L1/L2. Cache by the definition/owner identity that actually varies, not solely by Demonstration ID when distinct section lessons share a graph.

The index also serves identity-only navigation consumers in `guidedLessonOwnership.ts` and `guidedExamples.ts`: listing owners, identifying a section's Demonstration, generating launch paths and selecting a destination must not enumerate lesson definitions. Distinguish authored-definition ownership/default precedence from a navigation home or retained legacy alias; a section linking to an activity need not supply another authored definition. Derive navigation associations from the same owner rows where they agree, and preserve explicit historical associations/canonicalization where their meaning differs. This does not authorize a catalog-wide alias rewrite or a second independent owner catalog. Resolve the destination identity before requesting the selected provider.

Prove the interface with B-spline section lookup and both linear-map owners, then mechanically migrate every registry participating in the opposing catalog import. Keep existing lookup/export adapters only where callers need them; adapters may enumerate definitions on explicit request, but ordinary lookup and metadata enumeration must not do so. Completion requires removing the whole catalog/ownership cycle and its getter/thunk workaround. A B-spline-only pilot is an intermediate milestone, not completion. No lesson prose/action rewrite or dynamic content loading project is included.

### Acceptance

- **L1:** Instrumented selected-chapter, fallback-only and missing-ID lookups prove unrelated provider/adaptation calls remain zero. Exercise catalog lookup and `resolveGuidedExample` for canonical `learn`/`example` and supported legacy identities. Identity/path consumers `getGuidedLessonOwners`, `authoredGuidedLessonIds`, `getGuidedLessonOwnerForSection` and `guidedLessonLaunchPath` make zero provider calls. The selected lesson has nonempty expected identity/content; a lookup returning nothing must not pass the isolation assertion.
- **L2:** Integrity checks detect duplicate owner identities, missing referenced providers/sections, conflicting mappings and invalid default order with exact IDs. Multiple owners sharing one Demonstration are valid. Metadata enumeration makes zero provider calls.
- **L3:** Every formerly cyclic registry follows the one-way dependency rules. An import-graph check covers transitive opposing imports, rather than merely searching one file for a symbol. Remove enumerable lesson getters and cycle-specific thunks.
- **L4:** Existing catalog/availability coverage remains. B-spline direct entries, linear-map L1/L2 exact selection, catalog default order, fallback guidance, chapter navigation and return focus/reading position retain their behavior and IDs. Pin current primary navigation paths and retained alias destinations independently of authored-definition default order.

## 3. Feature-local registration

### Existing seam and target

Keep derived routes in `Routes.tsx` and availability from `demonstrations.ts`/`lessonAvailability.ts`. The remaining constructor table in `graphFactories.ts`, collection composition in `PresetImport.ts`, ownership composition and the two preview-tool chapter tables repeat related integration knowledge. The current lazy route loads a table that statically imports all graphs; narrower loading is an ownership improvement, with no performance claim yet.

Use explicit family-local exports with three separate loading surfaces:

- Cheap metadata contains typed catalog/route identity, lesson-support intent and owner identities from workstream 2. It supplies existing catalog and teaching order explicitly so moving files cannot reorder the app.
- Runtime composition supplies lazy graph loaders and references existing family-owned collection definitions. Persistence composition can load collection checks without importing graph constructors, React views or lesson providers. Several Demonstrations can reference one canonical collection key/definition.
- Tooling composition connects owner identities to inventory providers, destination metadata and independently authored preview recipes/expectations. Expected graph values, rendered-owner checks, capture policy and provenance remain in their tooling owners.

The root keeps explicit family imports and composes typed indexes; no directory discovery, generated family manifest or second pending/published ledger. Derive `DemonstrationId` and published coverage from the metadata source without broadening them to `string`; do not retain a second hand-written union. Runtime composition cannot be imported by cheap metadata. A production route resolves its selected loader without loading the legacy all-graph factory table. Existing all-graph test consumers may use a derived eager test adapter so their contract coverage is retained.

Use **projective conics** as the first full registration migration: its five graph entries already have chapter ownership, Preset definitions and chapter inventory/capture support. This exercises the actual CJS seam without creating a new preview family. Move its catalog rows, loader references, owner rows and collection references to the respective family exports; preserve root ordering. Delete replaced projective rows from central registrations and redundant preview route/identity selectors, including primary navigation-map rows whose destinations are derived from those owner rows. Other families can remain on explicit legacy composition during this pilot, with a disjointness check preventing dual registration.

CJS tooling uses the generator's existing Vite `ssrLoadModule` bridge to consume typed metadata/tooling exports; it must not `require()` TypeScript directly. The capture tool consumes the same destination identity through a bounded metadata load and closes any temporary Vite server in `finally`. Content is resolved only for the selected inventory. Keep independent expected values outside descriptors. Do not introduce a generated JSON mirror unless a separately evidenced tooling constraint justifies it.

Adding a Demonstration to a migrated family requires local metadata, its implementation/loader, family collection mapping if needed, and the existing bilingual/content/preview artifacts required by its behavior. Adding a section lesson requires its definition/provider, an ownership row and independently authored expectations where that preview workflow is supported. Existing family composition should require no central per-Demonstration switch edits. A new family still requires one explicit root inclusion per loading surface; this is the documented composition point.

### Acceptance

- **R1:** Integrity tests reject missing loaders, duplicate IDs/paths, missing providers, unknown collection references and missing required preview mappings, naming the affected family/ID. Repeated references to the same canonical collection are valid; competing definitions for one storage key fail. Preserve documented legacy collections.
- **R2:** Home/catalog metadata import evaluates no graph implementation or lesson provider. Selecting a projective route does not load unrelated family graph modules or the legacy all-graph table. Observe module evaluation, not merely constructor calls or guessed bundle savings.
- **R3:** Derived routes/availability and all existing route-to-graph tests remain complete; order, direct deep links, refresh, search/hash, unknown routes and exact-section return behavior are preserved in the production build. Intentionally unregistered source code does not fail publication coverage merely by existing.
- **R4:** Inventory and capture consume shared destination identities, with no duplicate projective family route/section lists. Independently expected nonempty scene evidence still rejects a deliberately wrong scene/first-frame expectation. Existing capture destinations, manifests, fingerprint/freshness and retained-image protections remain effective.
- **R5:** A short contributor example lists the local edit set above. The deletion test identifies removed central projective entries, including derivable primary navigation rows; a new shallow wrapper around every old table does not pass. Adding a Demonstration in the migrated family requires no central primary-navigation edit.

## 4. Owned standalone scenes

### Existing seam and target

`BSplineBlossomGraph.tsx:104-143` and `BSplineNurbsGraph.tsx:131-169` repeat creation/removal, replacement sync, figure disposal, unmount and shape-sensitive sync. Their scenes already own their elements; inspected cleanup works. `SceneReplacement.ts` already owns replacement ordering and `GraphSession` owns board lifetime and cleanup.

Choose one typed, graph-owned scene declaration consumed by a **BaseGraph-owned slot scoped to its current GraphSession**. The declaration supplies domain scene creation, synchronization, idempotent disposal and reuse compatibility, which the host treats opaquely. Reuse is valid only when synchronization accounts for every changed creation input; degree/point count alone does not establish this. It is obtained during mount/lifecycle work, never by creating resources in render. The slot has at most one live instance, reads current scene-store state and is released by the session's registered cleanup before the board is freed. `GraphSession` does not keep a competing scene registry or model copy.

Wire that slot into existing host hooks: mount initialization creates it; ordinary committed state changes synchronize or rebuild when the family cannot synchronize the current instance; replacement sync reconciles it after imported data, scene state and transient restore; figure disposal releases it; session disposal releases any remaining instance once. A release clears the slot before disposal so repeated teardown paths are harmless. Construction failure must release any partially acquired resources through the construction/scene cleanup contract and must never publish a half-built scene.

Preserve the distinction between ordinary commits and replacement. NURBS imports currently rebuild even when degree/point count are unchanged; its scene synchronization updates points/weights but not knots. Keep that replacement behavior in the pilot unless the family proves complete synchronization. Blossom already synchronizes knots; preserve that behavior. Do not teach BaseGraph about knots, introduce a generic host key for domain fields or silently turn this ownership change into a reuse optimization.

Keep `SceneReplacement` as the sole order: dispose when the plan requires it, import, replace state according to the existing sync/deferred policy, restore transient state, initialize only where already allowed, sync, finish. Lesson replacement does not re-run non-idempotent initialization and still draws synchronously for same-tick rollback. Ordinary commands do not draw by subscribing a second imperative listener to the store. Deferred figure callbacks remain guarded by the session signal/current generation; disposed scenes cannot be synchronized later.

Migrate only Blossom and NURBS. Delete their repeated `scene`/`ensureScene`/`removeScene` ownership and lifecycle overrides when the slot supplies each behavior. Keep their domain scene implementations, markers, readouts and state commands. Blossom is now registered at `/bezeg-2.0/bspline/blossom` with `lesson: false`; retain that route and lessonless status. Exercise same-tick actions/checkpoints through the real-graph harness without inventing a public Blossom lesson. Do not migrate older curve adapters or other view types for uniformity.

### Acceptance

- **S1:** Both real consumers pass repeated reset/import/checkpoint/figure entry-and-return, structural changes and StrictMode-style mount/unmount/remount sequences. Include synchronous multi-action scenes and rollback; the later action reads the earlier write immediately.
- **S2:** Capture actual old element/listener identities, including drag handlers and Blossom's language subscription; prove disposal makes them inactive, each old scene is released once, and new objects respond correctly. Object counts alone are insufficient. After every replacement, dragging updates the authoritative state and dependent drawings.
- **S3:** Tests cover unchanged-structure sync, structural rebuild, repeated release, construction failure and late deferred work after cancellation/unmount. No stale scene receives sync or callbacks; the board and unrelated session resources remain valid until their owner disposes them.
- **S4:** Existing replacement/transient-state/session checks remain without weakened assertions or new exclusions. The graph declaration replaces the repeated hook protocol; it does not add another scheduler, store mirror or all-graph migration.
- **S5:** Distinguish ordinary same-shape commits from import/lesson/checkpoint replacements with equal degree/point count but different valid knots. Inspect the actual curve's knots and independently expected evaluation after replacement; matching SceneStore fields alone is insufficient. Existing ordinary synchronization and replacement rebuild behavior remain unless an explicitly verified family implementation replaces them.

## 5. Persisted scene validation and projection

### Complete checking before application

Extend the existing Preset module with one side-effect-free complete collection check. It validates collection identity, record/name, optional data through `PresetCollection.check`, optional board bounds and optional graph state through the collection's checker or shared state rule. Collection envelopes also validate nonblank unique names. Return a checked normalized value or the existing localized diagnostic with collection/Preset/field context; never construct a graph/board or mutate storage during checking.

File preflight/commit, stored collection selection, initial mount, explicit graph import and stored-Preset figure entry use this same collection definition. Revalidate at a mutation boundary where a value may have changed since preflight. Before graph application, a side-effect-free, graph-owned preparation step also applies existing consumer-specific guards and resolves deterministic inputs/defaults. A collection-valid curve can still be unsupported by one graph sharing that collection: Blossom accepts only degrees 2/3, while the shared B-spline collection accepts other valid degrees. Do not narrow file/storage acceptance to the intersection of all consumers.

Preparation returns plain checked inputs/defaults or an actionable refusal, not executable replacement callbacks or a second transaction manager. Reuse existing pure domain guards; every predictable input refusal belongs before mutation, but nonpilot import/replacement hooks may retain their existing runtime reconstruction afterward. Full shared projection/reconstruction remains the two-graph pilot. Only prepared persisted input reaches the existing SceneReplacement application path; internal Reset/default/checkpoint paths remain separately identified. No caller may change selected Preset identity, apply bounds, write scene state or dispose a scene before collection checking and consumer preparation both succeed.

Preserve file-import conflict confirmation, atomic storage writes/rollback and unreadable raw-value preservation. A collection containing invalid names or Presets reports its problem and stays untouched; saving/deleting must not silently overwrite that unreadable collection. A valid file may explicitly replace it through the existing confirmation flow. Backup retains existing skipped-collection reporting and must not label a fully invalid collection as a checked export. Reuse the current user-visible notice/error surfaces rather than console-only warnings.

On refusal while a live scene exists, keep its data, state, view, selected Preset identity and owned resources unchanged and usable. Preflight collection checks and consumer preparation for all selected persisted figure scenes before starting a batch; retain per-entry checking if input can change afterward. Abort/refusal after a batch starts restores the trusted entry snapshot through the existing transaction. On a fresh mount, initialize the safe default scene and display the actionable refusal; there is no prior live scene to preserve. Never merge a rejected envelope's view/state into that default. This refusal guarantee concerns rejected persisted input; it does not introduce a general rollback framework for arbitrary board/construction failures.

**Implemented, slice 1 (2026-11-10, controls step 7):** `checkPreset`/`checkPresetCollection` in `src/graphs/base/presets/PresetImport.ts` decide for file import, stored collections, `importPreset`, Preset selection/reset and figure entry ([evidence](../reviews/feature-streams/controls/s7-1b.md)). User impact, no format change: a stored collection that holds an invalid Preset (bad data, view or state, blank or duplicate name) is now reported as unreadable and left untouched instead of loading with a silent default; selecting or importing a malformed Preset is refused with a notice and the live scene, view and selection stay; a page opened on such a Preset shows the default scene and the notice; file errors name the collection, Preset and field. Consumer refusals after mutation (Blossom degree 1, NURBS point limit) and omitted-field defaults remain for slices 2 and 3.

**Implemented, slice 3 (2026-11-10, controls step 7):** `BaseGraph.importPreset` and the figure entry start an omitted part from graph defaults instead of the preceding scene ([evidence](../reviews/feature-streams/controls/s7-3.md)): no `boardState` is the initial view, no `graphState` the fresh initial scene state, no `data` the graph's fixed default data (`persistedDefaultData`, which the example-following B-spline families NURBS, Insertion and Extraction pin to their first example; their `defaultPreset()` and so Reset still follow the chosen example). The NURBS figure state holds the Preset's own parameter `t` in the new domain instead of the live one. A present but partial `graphState` is applied over the graph's fresh initial state, never over the live scene (`BaseGraph.importPreset`), so fields it omits take their defaults. User impact, no format change: importing or selecting a partial Preset (for example one without a view or without data) shows the same scene as a fresh page would for that part, not whatever was open before; files, stored Presets and Reset behave as before.

**Implemented, slice 4 (2026-11-10, controls step 7):** FivePoint and ThreeViews declare `ScenePersistence` companions (`src/graphs/base/presets/ScenePersistence.ts`, `src/graphs/projective/projectivePersistence.ts`); export, Preset application and fresh lesson/figure scenes use them, and their `PRESET_DATA_STATE_KEYS` entries and model-stripping overrides are gone ([evidence](../reviews/feature-streams/controls/s7-4.md)). No user-visible change: exported files keep their shape and old files import.

### Compatibility and optional fields — decided policy

- Supported optional data/view/state fields remain optional. Missing `data` means the graph's default data, missing `graphState` means fresh initial scene state, and missing `boardState` means the graph's initial view. The decoder may return absence; the graph prepares these defaults without mutation before applying one checked scene.
- Fresh persisted-import defaults are independent of the preceding live scene, including data, parameters and view. They are distinct from contextual Reset targets: `BSplineNurbsGraph.defaultPreset()` currently follows the chosen example, and its importer clamps the current `t`. Do not use those live values as omitted persisted fields. Reuse fixed defaults where already pure; audit state-dependent defaults/reconstruction and override only the affected family preparation. Ordinary Reset retains its chosen-example/selected-Preset behavior, and trusted checkpoints retain their captured values.
- This deliberately makes persisted application deterministic. An explicit partial `importPreset` currently can retain live data/view when fields are omitted; after this change it starts those omitted parts from graph defaults, matching a fresh scene rather than the user's incidental preceding scene. Files remain accepted and unchanged in shape; no stored value is silently rewritten. Trusted checkpoints retain their full captured-scene semantics.
- Explicit invalid/null values are not omission unless the current family contract accepts them. Malformed stored data that currently falls back with a console warning will instead be refused visibly before application; initial mount uses the safe-default behavior above.
- Keep each existing family state rule and acceptance of legacy redundant fields. Projective collections already reject a `model` field in persisted `graphState`, so such files do not gain a new legacy exemption. B-spline redundant state remains accepted where its checker permits it, with checked `data` authoritative for the curve fields it represents. Preserve independent permitted Blossom state, including segment, arguments and the Bézier visibility switch, during Preset/figure restore as established by `619cd657`. No new stricter B-spline format or weight rule is introduced.
- Unknown fields follow the existing family/shared checker: projective state permits only its existing fields; the shared primitive-state rule remains its existing contract. Do not turn this work into a catalog-wide strict-schema migration. Unknown envelope extensions are ignored for application and preserved in untouched raw storage/backups; they cannot bypass checking of known fields.
- Shared collection keys are valid references. Each decode uses the canonical collection definition, then graph entry uses that consumer's preparation/reconstruction policy. Collection-valid data unsupported by one consumer remains valid in the shared collection and for compatible consumers. Keep documented legacy collection support and all existing valid route/file/key fixtures.

### One projection/reconstruction declaration

Pilot FivePoint and ThreeViews. Add a small typed, graph-family-owned projection companion to the existing collection rules: it projects runtime state to persisted data/state and reconstructs runtime scene state from checked data, permitted state and graph defaults. Runtime `model` is represented once in `data`; the permitted persisted state remains as currently exported. Derive/recompute geometry through existing domain functions, without serializing board objects or derived caches.

The graph application path, export and fresh lesson/figure scene reconstruction consume that declaration. Trusted checkpoints still capture full runtime scene state and transient/display state and restore them directly; do not project away checkpoint fields or send them through the persisted decoder. A declaration may be shared by trusted fresh-scene preparation when it needs the same data-to-runtime reconstruction, without treating the trusted checkpoint as external data.

Remove FivePoint/ThreeViews model-stripping export overrides and separate figure/default-lesson reconstruction knowledge where the declaration replaces them. Remove their entries from `PRESET_DATA_STATE_KEYS`. Shared contract tests should use the public projection behavior for persisted round trips, while retaining independently authored expected runtime models/board observations; the same incorrect projection must not manufacture its own expected answer. Other graphs keep their current declarations/inventory until a separate bounded migration.

Complete-envelope checking is independent of this two-graph projection pilot and must cover every persisted entry path and current registered collection. Do not wait for all graphs to adopt projection or move the collection registry to ship validation parity.

### Acceptance

- **P1:** Parameterized valid/malformed samples produce the same underlying collection-decode decision at file, storage, mount/import and persisted figure entry. Consumer applicability is a separate decision; the same consumer refuses unsupported input consistently at every graph entry. Include invalid model data, bounds, state types/forbidden fields, collection envelopes and blank/duplicate names, plus collection-valid data exceeding a consumer's existing point limit; exercise interpolation's custom state checker, generic state, projective strict state, and the shared B-spline collection.
- **P2:** Spies and real-graph observations prove refusal precedes import, state writes, bounding-box changes, disposal and drawing. Include a collection-valid degree-1 B-spline accepted by file/storage and a compatible graph but refused by Blossom, and an unsupported later figure-batch entry refused before the batch mutates any scene. Live-scene refusals preserve selection and allow continued dragging; fresh-mount refusal shows a usable default plus a notice. Corrupt raw storage is not overwritten.
- **P3:** Catalog-wide default export/check/import and representative existing file/storage fixtures pass. Apply the same supported partial Preset after two different NURBS examples/parameters/views and obtain independently expected identical fresh imported data/state/view. Omit `data`, `graphState` and `boardState` separately and together, and retain representative partial-Preset cases outside NURBS; separately prove contextual Reset still follows the chosen example. Cover extension-field behavior, representative consumers of a shared collection, atomic import rollback and batch cancellation/return. Record the planned partial-import and malformed-storage behavior changes above in release evidence.
- **P4:** FivePoint and ThreeViews export/check/reconstruct round trips preserve independently expected model, scene state and visible board state. Duplicate/forbidden model state cannot override checked data. A deliberate projection omission fails a test, rather than being hidden by the generic harness's own projection.
- **P5:** Lesson/checkpoint and figure-return round trips preserve full trusted state, transient values and display settings. No transient/checkpoint data enters files, URLs or storage. SceneReplacement ordering and same-tick scene-action behavior remain covered.

## Workstream order and integration ownership

Recommended implementation order is controls, complete persisted validation, lesson lookup, registration, then the owned-scene pilot; the two-graph projection pilot can follow validation independently. This is sequencing guidance, not authorization to implement all five together. As scheduled, workstream 2 may finish before workstream 5, because neither depends on the other; workstream 3 still follows both. Workstream 3 sits in Controls rather than Contracts so that Contracts need not wait for Controls step 7.

| Workstream | First proof and completion scope | Dependency / shared edit owner |
| --- | --- | --- |
| 1 — controls | PointSet and ThreeViews, then stop; later coordinate editors are follow-up | Independent of the other workstreams; owns input/CSS/lint edits |
| 2 — learning | B-spline plus linear-map proof, then all cyclic identity/provider links | Owns owner identity/index and content-adapter contract; no registration rewrite first |
| 3 — registration | Full projective-conics integration pilot, then stop | Consumes workstream 2 identities; owns root composition and tooling metadata integration |
| 4 — scene ownership | Blossom and NURBS only | Extends existing replacement/session seams; shared BaseGraph changes serialize with workstream 5 |
| 5 — persistence | All collection checks and consumer preparation, plus FivePoint/ThreeViews projection only | Owns decode/preparation/projection semantics and pure import defaults; registration references its collections without moving their rules |

One implementer owns a shared interface/file at a time. In particular, workstreams 4/5 must not concurrently change BaseGraph replacement hooks, and workstreams 2/3 must not independently invent lesson descriptors. Before implementation, reconcile each bounded slice against then-current HEAD and retain ongoing feature work; a planned deletion must not erase newer behavior.

## Verification and completion evidence

Start implementation with `just --list` and use [the command guide](../commands.md). Each slice runs focused `just unit <affected paths>`, typecheck, lint and the production build; the completed integrated change runs `just check` once. Localization edits additionally satisfy the required `npx tsc --noEmit --pretty false` and production build. Keep all lesson mathematical-notation/content contract checks; no weakening or exclusions.

| Scope | Existing checks to extend and observed evidence required |
| --- | --- |
| Controls | `NumberInput.test.tsx`, `Slider.test.tsx`, focused real consumer tests, rendered fixture and lint mutation; I1–I5 |
| Learning | `lessonCatalog.test.ts`, exact-owner/entry/return tests, import-graph and unrelated-provider assertions; L1–L4 |
| Registration | `demonstrations.test.ts`, `Routes.test.tsx`, `PresetCatalog.test.tsx`; existing preview generator/capture Node test suites using their current Node runner (these lightweight tooling suites are separate from Vitest); R1–R5 |
| Scene ownership | `GraphSession.test.ts`, existing real-graph reload/transient/lesson-restore and figure-batch tests, two-consumer object/listener and changed-knot assertions; S1–S5 |
| Persistence | `PresetImport.test.ts`, `Presets.test.ts`, `GraphPresetsAndDisplay.test.tsx`, catalog/family collection and figure-batch checks, projection mutation; P1–P5 |

For new regression assertions, demonstrate a pre-change failure or deliberate mutation failure. Preserve independent expected outcomes and nonempty scene evidence. Add mathematical checks only where affected domain parsing/evaluation/control wiring requires them; do not reopen lesson-prose review. Measure representative dragging/sliders before selecting any rendering optimization, and before/after when changing their execution paths, per [the performance plan](../performance-plan.md); this spec selects no optimization.

Use `$smoke-tester` and [the browser checklist](../smoke-tests.md) during implementation. Controls need fixture and affected point-set/projective routes; shared styles need a representative legacy function/curve inspector. Learning and BaseGraph/session changes require the full shared workspace/lesson-runtime checklist, including the registered Blossom and NURBS routes for the scene pilot. Registration needs production route/asset and preview-tool checks, including direct links, refresh, query/hash and unknown routes. Persistence needs save/reopen, file exchange, malformed-value refusal, figure export/return and continued editing. Keep Blossom's synthetic lesson/checkpoint coverage in the real-graph harness. Report failures and incomplete coverage; physical projector/device/classroom observation is optional under current guardrails.

Large implementation diffs receive independent engineering review; controls/visual changes add UI/accessibility review, and actual mathematics changes add mathematical review under [review routing](../agent-workflow.md#review-routing). Update current architecture, relevant contributor/preview commands and ADR consequences when implementation changes their described behavior. No current-behavior guide should claim this planned architecture is already implemented.

## Lead review and planning evidence

Three fresh workers supplied unaccepted controls, learning/registration and scene/persistence proposals. The lead checked their source claims and retained the five workstreams in one specification, making these substantive decisions:

| Proposal item | Lead disposition and reason |
| --- | --- |
| Shared fields and two-consumer pilot | Accepted; corrected PointSet's scope to integer coordinates/endpoints and distinguished UI-only actions from intentional visibility/model commands |
| Numeric policies and gallery | Accepted with explicit event/external-replacement rules above; Escape cancels only uncommitted text; gallery stays test-only; existing raw fields use staged lint exemptions |
| B-spline-only ownership migration | Accepted as first proof, insufficient as completion: every opposing registry import/getter workaround must be removed; linear-map multiplicity is a required second case |
| B-spline registration pilot | Replaced with projective conics, which already exercises both CJS preview registration tables; avoids inventing preview support as incidental work |
| One descriptor containing loaders and metadata | Narrowed to separate cheap/runtime/tooling exports, explicit root composition and one identity source; no universal config or generated family manifest |
| Optional generated JSON bridge | Not selected; reuse Vite SSR loading with bounded lifetime and independent tooling expectations |
| Scene registration location | Settled on one BaseGraph slot scoped to GraphSession, integrated into existing SceneReplacement hooks; rejected a second scene registry/lifecycle manager |
| Complete validation plus projection | Accepted as separate milestones; validation covers all entry paths, projection migrates two graphs; trusted checkpoints retain full captured state |
| Legacy/unknown/missing fields | Settled explicitly above: existing family acceptance, deterministic omitted-field defaults, visible refusal for malformed persistence, no new projective legacy model exemption |
| Shared collection and generic test inventories | Shared keys remain valid; remove only pilot inventory rows and retain independent expected models so shared declarations cannot make tests vacuous |

Temporary worker drafts and the completed handler handoff are consolidated here and removed after their unique decisions/evidence are retained. The source review remains the historical diagnosis. Planning verification consists of source/contract review, local Markdown target/anchor checks and Git whitespace/diff review. No application tests, production build, browser smoke or performance measurements were run for this documentation-only task; all implementation criteria above remain unverified until implemented.

### Fresh-context design review — 2026-11-03

One fresh-context reviewer, requested as GPT-6.1 Sol at max effort, reviewed this plan against `5b796fbe21bf0830f460873d183cbbc76f33e55f`. The handler independently checked its source claims, challenged the proposed interfaces and discussed the tradeoffs with the reviewer. The resulting decisions are incorporated above and in ADR 0039:

| Finding or alternative | Disposition and reason |
| --- | --- |
| Common collection validation cannot prove every consumer can apply a value | Accepted: reuse pure consumer guards before selection/view/disposal changes, while preserving shared file/storage acceptance; degree-1 data versus Blossom and consumer point limits distinguish the decisions |
| Missing-field defaults can depend on the live scene | Accepted: separate fresh persisted-import defaults from contextual Reset; NURBS's chosen example and current parameter demonstrate why data, state and view need independent omission checks |
| Degree/point count does not prove scene synchronization is complete | Accepted: domain-owned reuse compatibility with conservative NURBS replacement rebuilds; inspect actual knots/evaluation, preserving Blossom's existing knot synchronization |
| Navigation still discovers identity by constructing lessons | Accepted: migrate the named public identity/path consumers to the index, preserve distinct navigation/default-definition semantics and remove derivable central projective navigation rows |
| A command's false result can mean unchanged rather than rejected | Retained as a narrow numeric-contract clarification, not another workstream; preserve/adapt the existing void wrappers and test valid no-op edits |
| Mandatory host knot keys or mandatory incremental NURBS synchronization | Not selected: the host must not learn domain dependencies, and the ownership pilot need not optimize existing replacement behavior |
| Pure full-runtime reconstruction for every family, or rewriting all historical aliases | Not selected after reviewer pushback: universal preparation checks applicability/default inputs; existing nonpilot reconstruction and distinct historical navigation associations remain |

The reviewer checked the amended spec and supported it with the final narrowing of preparation scope and separate/combined omitted-field cases. This review changes planning documents only; it authorizes no application implementation. Application acceptance, including the new distinguishing cases, remains unverified.
