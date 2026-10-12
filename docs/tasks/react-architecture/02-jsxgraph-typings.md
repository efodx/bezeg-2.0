# 2. Type JSXGraph members and remove `@ts-ignore`

Spec: [React architecture refactor](../../specs/react-architecture-refactor.md), finding 14. Depends on [task 1](01-remove-dead-code.md).

## Goal

Replace `@ts-ignore` (66 on `master` before task 1) with real types.

## Scope

- Add `src/types/jsxgraph-augment.d.ts` declaring the JSXGraph members the code uses but the bundled typings lack (for example `Board.defaultAxes`, `Board.infobox`, `Board.inUpdate`, `renderer.svgRoot`, `GeometryElement.hasPoint`, attribute shapes used in `AxisStyles`/`PointStyles`). Augment through module/namespace merging; do not redeclare the library.
- Remove each `@ts-ignore` by fixing the type: augmentation, a precise local type, a type guard, or a corrected call. `BaseCurveGraph.importPreset` must stop mutating its argument: build a new preset object.
- `AxisSelect`: use stable identifiers (`none`, `axes`, `axes-major`, `axes-minor`, `all`) and translate labels at render through the localization catalog (add keys to `sl.ts` and `en.ts` in lockstep, reusing the existing Slovenian strings). The enum value is not stored in presets; verify that before changing it.
- `as any` casts touched by these fixes should become typed too; do not add new ones.

## Out of scope

Behavior changes. Any remaining `@ts-ignore` needs a one-line justification comment explaining why it cannot be typed.

## Acceptance

1. `@ts-ignore` count in `src/` (excluding tests) is zero or each remaining one is justified in place.
2. No new `any`, `as unknown as`, or `@ts-expect-error` introduced to replace them.
3. Axis selector labels render in Slovenian and English; switching language updates them.
4. `tsc`, build and Jest pass.
