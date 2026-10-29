# T13 mesh-framing production smoke

**Result:** selected production-preview framing checks passed. Read-only browser smoke against the handler-owned preview at http://127.0.0.1:4392/bezeg-2.0/. Browser execution began against the assigned dirty worktree snapshot at 8a933a7c3342aebe355ce037ada6730c2cfc6c9a; this worktree’s branch later advanced to 17e95183462652d7b6633a7ff51a4a8c71f52991 before this note was written. The handler confirmed the preview retained the staged original snapshot and stopped it after the run. Chromium/Playwright 1.64.0, headless; base viewport 1440×1000, resized to 1180×900 and 390×844.

| Check | Evidence |
|---|---|
| Six patch routes | Tensor, de Casteljau, derivatives, subdivision, joins, and triangular returned HTTP 200; each published finite ordered, in-frame mesh bounds and non-empty owner samples. Owners: tensor-patch-0 on the first four, join-patch-a/b, triangular-patch-0. |
| Point-free subdivision | Default scene had zero control points. validateSurfaceEvidence passed against expected geometry independently derived from authored preset/source scene. Actual-browser prepareSurfaceCaptureFrame passed at 420×260 and returned three in-frame labels. |
| Utah teapot | Starting scene “Čajnik iz Utaha (32 krp, samo ogled)” produced 32 finite-sampled teapot owners with boundaries hidden. Source-derived validateSurfaceEvidence and actual-browser frame preparation at 420×260 passed. |
| Camera, resize, narrow viewport | Resize and ArrowRight changed projected bounds/camera as expected. At 390×844, host width was 364px, page had no horizontal overflow, and keyboard movement worked. |
| Shading and SPA navigation | Hiding shading cleared framing/owner evidence; restoring it republished valid evidence. Tensor→triangular→tensor navigation restored the expected tensor owner/camera evidence without stale bounds. |
| Crop fail-safe | Zooming until projected bounds exceeded the frame made inFrustum=false; both validation and capture preparation rejected with “projected full-mesh bounds are cropped or behind the camera.” |

No console/page errors were observed in the main route/camera/shading/crop and teapot runs. The SPA runner passed but did not print a separate error-buffer summary. Browser scripts, logs, and spot-check screenshots are retained under C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\bezier-patches-r2\.claude\scratch; artifacts are worktree-local, not in the primary checkout scratch. I visually inspected the teapot screenshot only for visible teapot geometry and hidden boundary curves, not for full-route visual acceptance. Artifacts are diagnostic only; no manifest or publication media was created.

**Gaps:** no authored inventory exists, so this does not establish end-to-end guided capture or lesson/media export. A dedicated legacy curve drag/parameter-slider pass, full visual review across all routes, and physical-device/GitHub Pages acceptance were not done. Build/test/type/lint evidence is tracked separately by the handler.
