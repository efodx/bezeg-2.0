# 2. Figure export operation

Status: planned. Lane: Host. Source: [specification §2](../../specs/architecture-deepening-backlog.md#2-figure-export-operation).

## Scope and entry points

- BaseGraph export state: 111-123, 337-352, 743-755, 839-921.
- The global lock in `src/localization/index.ts:17-18, 43-49`, which `SaveImage.tsx`, `PresetSelector.tsx` and `LanguageSelector.tsx` read.
- `export/FigureCapture.ts:258-268, 312-321` and `export/PresetFigureBatch.ts:66-82`.

## Implementation and acceptance

- Deepen one figure export operation module that owns:
  - admission: single versus batch exclusion;
  - busy state;
  - completion and failure reporting;
  - language stability during capture;
  - release of a deferred reload.
- Keep graph-local scope and app-global scope distinct inside the module.
- SVG and PNG no longer duplicate acquisition and release. Localization no longer houses export state; it collaborates explicitly at the seam.
- Export failure is visible where the learner exported, not only in the language selector.
- Replace the tests that cast to private methods (`BisectionGraph.test.ts:584`, `FixedPointGraph.test.ts:744`, `SequenceGraph.test.ts:726`, `GraphTransientState.test.tsx`) with tests through the module's interface. Cover:
  - batch versus single exclusion;
  - teardown mid-export;
  - deferred import;
  - failed preparation;
  - the language lock.
- Keep the existing capture, typesetting and batch restoration tests.

## Verification

Run the export tests, typecheck and build. In the browser, export SVG, PNG and a Preset figure batch in both languages, and try switching language mid-export.
