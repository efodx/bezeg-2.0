# Smoke: controls steps 8 and 9 (commit 0f86bb78 preview, localhost:4327), Chromium, SL and EN

Evidence and scripts: `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\agent-a18d8a9709fec93af\.command-logs\s89-smoke\` (`out-sl/`, `out-en/` screenshots; `p*.out` logs; `net.txt` chunk lists). Playwright public API and DOM only.

## 1. Blossom and NURBS (step 8 scene slot)

- PASS SL+EN: drag; degree +/-; interval select; sliders; weight edit (NURBS, SL; EN run used a decimal-comma locator that found nothing, harness only); Preset save, reload, reopen, drag; figure batch export (slike.zip downloads, modal closes, live scene unchanged, drag works); language switch keeps points, labels update (Blossom `f(0; 0,5)` becomes `f(0, 0.5)`, screenshot `out-sl/blossom-lang-switched.png`); navigate to /demonstrations and back, drag works. Zero console/page errors in every scenario.
- PASS NURBS import of a same-degree Preset with 3 knot arrays rewritten (k to k^1.6): curve visibly changes versus the unit circle (`out-sl/nurbs-import-knots.png`); drag works afterwards. The point snapshot differs only because the evaluation marker moves with the knots.
- PASS NURBS/Insertion/Extraction: choose a non-first example, drag, Reset returns the chosen example and its scene (SL and EN).
- MINOR, unresolved: Blossom after reload plus Preset reopen has identical points and a visually identical graph (`blossom-before.png` vs `blossom-after.png`), but one axis-tick SVG path string differs in sub-pixel digits. A plain reload without a Preset is identical; NURBS is identical. Likely tick rounding; no old-build baseline to confirm not a regression.

## 2. Projective routes (step 9)

- PASS: all five routes render and drag, on direct load, refresh, `?x=1`, `#abc`, with no errors. Exception: three-views has no draggable points (0 visible ellipses); it is slider-only, see 3.
- PASS: /projective/nope and /nope show "Strani ni mogoče odpreti" with home/Learn/Demonstrations links.
- PASS: catalog order ends with projective (Dvorazmerje, Pascal, Pol in polara, Stožnica skozi pet točk, Trije pogledi), last after computational geometry. Home page unchanged. No old order to diff against.
- PASS: network. /projective/pole-polar loads 29 app chunks: shell + `PolePolarGraph`, `idealMarker`, `definingPoints`, `polePolarText`, no other family graph chunk, and no `graphFactories`. /bezier/curve loads 34, including `graphFactories` and `RationalBezierCurveCircleGraphN`. Both load the shared `bsplineInsertionModel`, `guidedExamples`, `bezierHandoff` and `hullTrace*` chunks. Full lists in `net.txt`.
- PASS: guided lesson from /learn/projective-conics#projective-pole-polar (also three-views) opens at `?example=lesson...`. "Nazaj v poglavje" returns to `/learn/projective-conics#projective-pole-polar` scrolled into that section (screenshot `out-sl/les-back-projective-pole-polar.png`, TOC highlights it).
- NOTE, not a failure: "Končaj" asks "Zapustiti vodeni primer?"; confirming ("Zapusti in povrni graf") leaves the lesson but stays on the demo route (`/projective/pole-polar`), it does not return to the chapter. Same for Bezier. Return to the chapter is only via "Nazaj v poglavje".

## 3. ThreeViews recheck: product behaviour, not a regression

- With the Save tab open (the state after Preset reopen) all sliders are hidden (0 visible ranges). Switching to the Uredi tab shows them; changing slider c changes the scene (paths hash changes), also after Shrani then Uredi.
- The angle slider is `aria-disabled` by design while "Točka P na krožnici in njena slika" is off, with the reason "Kot je na voljo, ko je točka P na krožnici vključena" (`aria-describedby` reason). My earlier failure was the harness filling the disabled slider and a hidden slider while Save was open.

## 4. Legacy Bezier curve: PASS

Drag moves point and curve; lesson start, Naprej advances (frame 1 to 2), Končaj plus confirm exits, `learn=1` cleared, drag works. Zero errors.

## Gaps

SL only for projective, lesson and three-views items; EN only for item 1. No touch or keyboard pass. Preset import was exercised only on NURBS.
