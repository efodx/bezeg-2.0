# 08 lane L05: elevation (done)

About 5 minutes of work from start to green (16:58 to about 17:04 by the machine clock).

- `ElevationGraph.tsx`: `declaresCurveWorkspace()` true; `declaration()` = common curve declaration plus actions `elevated-points` (overlay switch, pressed) and `elevate` (Orodja, section `elevation`); `performAction` runs them as the learner; `ElevationIds` exported.
- `additionalGuidedLessons.ts`: local `frame()` takes optional `declare`; step 4 observation `uses: ['elevate'], open: ['tools']`; step 1 observation `open: ['legend']`.
- New `ElevationGraph.declaration.test.tsx` (6 tests). Parity: n/a (no shown values), no recording.

## Placement
- Board: control polygon and hull as pucks (from the base, lone curve).
- Orodja: overlay switch (default on, set once; no lesson flips it), elevate button (a step, the existing `CurveOperation` stays; lesson step 4 uses it so the frame opens tools).
- Legend: default place; curve and control points.

## Observed
- Red: action id `elevate` -> `elevate-x`: `AssertionError: expected [ 'point-labels', …(5) ] to deeply equal [ 'point-labels', …(5) ]`, 1 failed | 5 passed. Restored.
- `just graph-check elevation --route /bezier/elevation`: PASS (contract 1, parity n/a, golden 1, declaration 6).
- Parity golden check, `just unit src/graphs/curves/bezier src/learning/content/declarationContract`, tsc (0 lines), lint: passed.
- Not run: additionalGuidedLessons.test separately beyond the bezier/content filter above (declarationContract covered frames); browser.

## Duplicate check (browser, 1440x900, smoke/08-L05-dup/dup.cjs, dup2.log)
- Orodja Uredi: one "Dvigni stopnjo"; Prikaz: one each of Oznake tock, Kontrolne tocke, Pokazi nove tocke na kontrolnem poligonu. No duplicates, no change to ElevationGraph.tsx: tools-placed actions are not rendered by the presenter (BoardCards.tsx:182 only reads them so a lesson frame opens the right Orodja section).
