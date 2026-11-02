# posters-t2 handoff (partial, blocked)
Recipes for point-set-triangulation and delaunay added to scripts/demonstration-preview-recipes.cjs (evidence passes in a real capture: 20 and 17 framed objects).
Capture aborts at scripts/capture-demonstration-previews.cjs:776 (exhaustive-order deepEqual): retained manifest lacks bspline-basis, bspline-deboor, euler-line, so a selective recapture of two ids cannot publish. bspline ids have no recipes.
Flags needed: PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1 and PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 (only the recipes file changed among fingerprinted files since fe8be6b0). Windows also needs a preload (git diff ENAMETOOLONG at capture script line 550).
POSTER_PENDING reverted to unchanged; no assets written.
