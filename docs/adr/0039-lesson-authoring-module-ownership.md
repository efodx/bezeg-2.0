---
status: accepted
---

# Deepen existing modules for lesson-family authoring

Accepted for the planned architecture on 2026-11-03. Implementation is unstarted. The [canonical specification](../specs/lesson-authoring-architecture.md) owns scope, compatibility policy, sequencing and acceptance; this decision does not authorize app implementation.

## Context

The [lesson-family expansion review](../reviews/lesson-authoring-architecture-2026-11-03.md) found bypassable shared controls, executable ownership discovery through an import cycle, scattered feature registration and unequal persisted-Preset checking. Standalone-scene lifecycle and persistence projection also require repeated caller choreography. Existing GraphSession, SceneReplacement, synchronous SceneStore and family Preset definitions already provide useful owners. Inspected cleanup works; no leak or performance improvement is claimed.

## Decision

Deepen those owners through five bounded workstreams in one specification. Shared inputs own field presentation and editing mechanics while domain callers retain numeric meaning. Cheap lesson identities and ownership indexes select a definition before adaptation; providers and the lower-level content adapter do not import ownership-aware catalog lookup. Family-local metadata, runtime loaders and tooling exports remain separate loading surfaces, composed explicitly at the root.

A BaseGraph-owned scene slot is scoped to the current GraphSession and follows the existing SceneReplacement order. Family scene declarations supply creation, synchronization, structural identity and disposal; they do not establish a second scheduler or state mirror. Family-owned persistence rules support complete checking before application and a small projection/reconstruction declaration. Trusted checkpoints remain distinct from persisted values.

Retain routes, identities, collection keys and supported file shapes. Unify omitted persisted fields on graph defaults and refuse malformed persisted values visibly before mutation; preserve raw corrupt storage. This changes partial explicit import behavior that previously retained incidental live fields, and replaces console-only malformed-data fallback. The spec records exact fresh-mount and live-scene behavior. This planned validation decision extends [ADR 0016](0016-preset-collections-owned-by-graph-families.md); its historical implementation description remains accurate for current code until the change lands. [ADR 0015](0015-graph-transient-state-declaration.md) remains in force for transient/checkpoint ownership.

## Alternatives

- **Five independent specifications:** independently editable, but prone to competing owner descriptors, replacement hooks and persistence rules. One canonical spec preserves shared decisions while keeping five separately verifiable workstreams.
- **Patch individual panels and keep getter scans:** fewer initial edits, but authors still reproduce hidden control/lifecycle protocols and lesson identity lookup still executes unrelated adaptation. Rejected because the diagnosed knowledge stays distributed.
- **One universal feature schema/plugin registry:** centralizes configuration, but couples cheap catalog imports to executable lessons/graphs and preview oracles, weakens locality and introduces a new authoring framework. Use small typed family exports and explicit composition instead.
- **A new scene/persistence manager:** offers a clean surface at the cost of competing lifetime/replacement owners. Extend current modules and retain their deliberate synchronous/deferred path differences.
- **Strict new persisted format or blanket legacy acceptance:** either breaks valid current samples unnecessarily or admits state the existing family contract already rejects. Reuse current family rules, preserve supported shapes and record the targeted behavior corrections.

## Consequences

Implementation proceeds in bounded slices with concrete deletion and two-consumer evidence. The first registration pilot is projective conics, whose existing preview tooling exercises the complete seam. Full lookup-cycle removal includes all participating registries after the B-spline/linear-map proof. Scene ownership and projection pilots remain limited to their specified consumers; this is not a BaseGraph rewrite.

Explicit metadata adds small identity declarations whose agreement with providers is checked automatically. Multiple owners per Demonstration and multiple Demonstrations per collection remain supported. Tooling keeps independent expected scenes so it can detect incorrect registration or projection. No runtime speedup is promised without measurement. Current architecture and command guides change when implementation, rather than this planning record, changes behavior.
