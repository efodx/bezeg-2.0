# 03 State models and Presets (F2a)

Spec: Implementation Decisions (graph state, derived values never trusted from a Preset); TR1–TR5 acceptance "Reset, Preset, restore". Decisions: ADR 0044 §1–3. Precedent: `src/linear/` state model of the linear-maps family ([task 03](../linear-maps/03-state-model.md)).

Scope: new `src/trig/trigModel.ts` (unit-circle state; triangle state with mode, data type and inputs) with parse and validate functions and tests. No graph, no route. Edit no existing file.

Acceptance:

1. Each state has a default matching the spec's default example. Parsing a Preset snaps or rejects every field: angles to half-degrees, sides to quarters within range, vertices to the integer grid. Non-finite, missing or out-of-range fields give an actionable error naming the field.
2. Derived values (solutions, ratios, readouts) are never read from a Preset. They are recomputed from the validated state.
3. Round trip: serialize, then parse, gives the same state for every default and for a property-test sample.

Checks: `just unit src/trig`.
