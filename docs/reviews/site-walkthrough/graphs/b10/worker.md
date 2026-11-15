Cause: surface label layout has no separation. Subdivision: S_R anchor sits on facet-hidden dome (invisible, 1 chord tol) and next to S(u,v). Joins: both arrow tips coincide at C1. Fix: SceneLabel.screenOffset px nudge; subdivision lifts anchors 2x chordTolerance + 34px drop; joins A up/B down 13px. Before: sub piece-r-label not drawn; joins A meets B. After: 63+ files pass, tsc 0.

## Worker B

Recapture of patch-subdivision, patch-joins failed at the encoder: patch-subdivision clip 254209 bytes (ok), patch-joins clip 309281 bytes, over the 300 KiB limit (assert at scripts/demonstration-preview-motion.cjs:1580). Log: .command-logs/b10-capture.log. No catalog or manifest files were written (git status clean for src and scripts). before/ copies are in place; after/, index.html and poster review not done. Needs a handler decision: patch-joins clip needs about 3% fewer bytes (higher crf or fewer frames for this id, or a simpler pose).

Rerun after CRF 41: exit 0. Clips 254209 and 286001 bytes. Manifest vs HEAD by id: only patch-subdivision and patch-joins changed in captures and motions; top-level changes are revision, fingerprints, servedBuild and selectiveRecapture only. Posters: subdivision passes; joins labels do not overlap each other but are cramped and overlap control-point markers. after/ and index.html written.
