# B8d worker note
Done: all 8 ids, No text except bspline-basis (keeps knot numbers). Verdict changes: bspline-blossom Keep -> Remove (label on dashed polygon, away from its point); projective-cross-ratio Keep in part -> Remove (names not on the poster); projective-pascal Keep -> Remove (triage).
Tooling repair: scripts/demonstration-clip-rows/projective.cjs:33 label "Točka O: x" -> "Točka O, x" (the app's field name, PointListInput.tsx:131).
Manifest captures and motions changed only for the 8 ids (pascal has no clip). node --test scripts/demonstration-preview-text.test.cjs: 10 pass.
