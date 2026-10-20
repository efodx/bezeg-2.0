# Give each Demonstration its Preset collection

**Source spec:** [Graph contract deepening, section 2](../../specs/graph-contract-deepening.md#2-preset-collection-ownership)
**Status:** planned.
**Priority:** strong; after task 01 or coordinated with it, since both change the `BaseGraph` Preset seam.

## Goal

Move per-collection Preset knowledge out of the central lists in `PresetImport.ts` and into a static definition owned by each Demonstration or graph family. File import and graph import then validate with the same rules, and the file importer keeps only the file envelope, conflict reporting and storage writes.

## Scope and sequence

1. Read the source spec's six acceptance criteria, ADR 0006, the [localization guide](../../localization.md) and the Preset sections of [capabilities](../../capabilities.md). Inspect `PresetImport.ts`, `PresetImport.test.ts`, `Presets.ts`, `ClassMapper.ts`, `BaseCurveGraph.importPresetData`, `BaseFunctionGraph.importPresetData`/`parseModel`, and each graph's `presets()` and `defaultPreset()`.
2. Add the catalog-wide test first: for every Demonstration in `graphFactories`, export its default Preset, preflight it and import it. Add a cross-check that every graph's collection key has file-import rules and vice versa. Note the result for the undeclared `g1-spline` key.
3. Decide `g1-spline` from git history and any exported files it may have produced: keep it as a documented legacy key or remove it and record the user impact.
4. Design the Preset collection definition. It must be usable by preflight without creating a graph or board. Consider whether rules belong per Demonstration or per graph family (for example one rule for all plain Bézier collections), and keep shared rules shared. Give Preset data a type per family if stored formats stay unchanged.
5. Move function-model parsing with its diagnostics, curve type and count rules, and graph-state checks into the definitions. Make graph import use the same definition. Shrink `PresetImport.ts` to the envelope, conflicts and atomic writes.
6. Move rejection tests beside the definitions they exercise where that improves locality; keep every existing rejection case covered.

## Verification and completion

- Start with `just --list`; run the Preset, graph-preset, function-model and analysis suites, then `just typecheck` and `just build`. Localized diagnostics follow AGENTS.md: `sl.ts` and `en.ts` in lockstep, no casts to silence key errors.
- Check that collection keys and DTO names are unchanged, previously exported files still import, unsupported files fail with an actionable localized error, and a failed storage write rolls back.
- Preset save, import and export are user workflows, so smoke-test the Preset rows of the [browser checklist](../../smoke-tests.md) with `$smoke-tester`, plus a file round trip on one curve, one rational, one spline, one PH and one function Demonstration.
- Review the diff with parallel subagents for mathematical validation and engineering constraints.
- Record the definition shape, the `g1-spline` decision and any compatibility impact in this file and in [current architecture](../../current-architecture.md). Commit and push under AGENTS.md.
