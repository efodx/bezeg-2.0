# JSXGraph upgrade browser follow-up

The incomplete interaction rows below describe this supplemental run only. A later full production smoke passed 243/243 and closed PH child-board editing, lesson restoration, Presentation and keyboard coverage; see [release audit](jsxgraph-upgrade.md).

Captured 2026-10-26, 17:05–17:14 UTC, in `C:\Users\NonFriedMotherBoard\IdeaProjects\bezeg\.worktrees\jsxgraph-upgrade` at HEAD `819f737bba74497be3a0ef72948ca34dea33b971`. This checkout had pre-existing dependency, area-option, documentation, and review changes. The baseline preview was `http://127.0.0.1:4398/bezeg-2.0` (JSXGraph 1.9.2); the upgrade preview was `http://127.0.0.1:4396/bezeg-2.0` (1.14.1). Both returned HTTP 200. Baseline entry JS/CSS hashes matched `../jsxgraph-baseline/build`; upgraded JS/CSS hashes matched `build`. Playwright Chromium 156.0.8078.4 on Windows x64, headless, 1440×960, Slovenian locale, reduced motion. Touch used a fresh 390×844 mobile context. Existing previews were reused and left running; browser contexts were closed.

| Check | Result and evidence |
| --- | --- |
| SVG export, `/bezier/curve` and `/bezier/decasteljau` | **Passed.** Opened the inspector’s Save tab, waited for MathJax, downloaded the SVG, decoded and rendered it in Chromium. Bézier had 22 `div.JXGtext` labels / 8 MathJax nodes; De Casteljau had 33 / 30. Pairwise rendered PNGs were byte-identical: Bézier SHA-256 `040b9475d53937b3a43d420362beace46ba66c4be1afa3d30c67eee33adc5730`; De Casteljau `11fe0de12c0ab59d63c0147f0ec84d5c393fa009d1a059505726abf0fea2d442`. Initial visual reading of one image was mistaken; the re-opened screenshot and hash confirm labels and geometry are present in both builds. |
| Point drag / touch / narrow viewport | **Passed.** Emulated touch moved p₀ from (−4,−3) to (−2.98305,−2.38983), with 12 touch pointer events. At 390px, document and viewport widths both remained 390px. See `browser-parity/followup/upgrade-touch-drag.png`. |
| Pan and zoom | **Passed.** Upgrade `/bezier/curve` bounding box changed from `[-7.9022,5,7.9022,-5]` to `[-6.3218,4,6.3218,-4]` after zoom, then to `[-8.2183,4,4.4252,-4]` after pan. An initial assertion used signed width and falsely marked this failed. |
| Lesson enter/exit | **Partial.** “Preberi razlago” entered `/learn/bezier-curves#control-points`; “Nazaj na graf” returned to `/bezier/curve`. The post-exit point lookup returned no object under its old JSXGraph ID, so scene restoration was not confirmed. |
| PH generating-point editor | **Incomplete.** Route mounted with only the main board; the auxiliary editor appears after selecting the curve. The bounded attempt did not complete the editor selection and child-board drag. |
| Presentation mode / keyboard | **Incomplete.** A pointer click reached the Presentation button, which then disappeared from its original selector; post-toggle mode state was not captured. Keyboard operation was not checked. |

Raw SVGs, route screenshots, rendered export screenshots, asset-provenance notes, and per-label DOM data are in `browser-parity/followup/`; the export measurements are in `browser-followup.json`. No page errors occurred in export contexts. These results do not establish performance, physical-device behavior, or GitHub Pages behavior.

Served entry asset SHA-256 values (all matched their local `build/assets` files):

- Baseline `index-9pAhOL_0.js`: `d2ee23ef79519c3cb386a73c97a74e6dcf8bd50823bb924edd9ac2f841479b22`; `index-Ci6_9flY.css`: `c32f7f6f027dbe437387305e008514ec49836ad23fee9d44714af05bcf7b9819`.
- Upgrade `index-DhvbKgcv.js`: `20ae38f8057d4f00e567c1c88666daa5211b162287b7999461f97c635f33b8b7`; `index-3PxAN9kg.css`: `e4575c48cd4045b8fb53cea20ebc4d98c7b2db4fb8614756fd58e90eab739a05`.
