---
status: accepted
---

# Add capability-aligned Guided lesson drafts ahead of cohort completion

The Guided lesson rollout is intentionally staged, but the first audit found two routes whose graph behavior already fits the existing typed runtime: rational De Casteljau and degree elevation. The owner asked to add actual lessons where the graph seam is ready rather than wait for unrelated routes to complete their discovery work.

## Decision

Add implementation drafts for `rational-decasteljau` and `elevation` to the exact lesson availability allowlist.

- Rational De Casteljau reuses the inherited construction, parameter, animation, and prepared-scene behavior. Its lesson reveals graph-owned weight labels but does not automate weight editing.
- Degree elevation adds one typed `degree-elevation` action owned by `ElevationGraph`. The graph reapplies its route-specific disabled-control attributes after a prepared scene is imported.
- Both lessons remain explicitly marked as drafts and retain the same Slovenian/English, mathematical, restoration, accessibility, and classroom review gates as the pilots.
- No generic lesson fallback or route-family inference is added.

## Alternatives considered

### Wait for the planned cohort order

Rejected for these two routes because their existing seams can support bounded lessons without inventing controls, while several polynomial routes still require lifecycle work.

### Automate rational weight editing

Rejected because the current weight controls are interactive JSXGraph auxiliaries without a typed lesson action; the draft teaches the fixed prepared weighted scene instead.

### Add lessons to every remaining route

Rejected because the capability audit found unsupported or unverified actions, generated-object ownership risks, and route-specific mathematical review gaps.

## Consequences

The catalog now has five explicit Learn entries and 21 normal exploration-only routes. The availability list is no longer a proxy for the three pilots, and each future addition must still be added by exact ID after its own graph and content review. The rational weight-label lifecycle is now owned and disposed with its curve so scene replacement cannot leave stale labels or Farin sliders behind.
