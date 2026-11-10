# Step 7 slice 1b browser smoke

Target: production preview http://localhost:4327/bezeg-2.0/ (commit 32946b93, same subject as checkout HEAD 408766bf; revision of the served build not independently verified). Chromium (Playwright) only, headless, 1280x800 (390x800 for the narrow row), Slovenian, fresh context per scenario. Scripts, logs and screens: `.command-logs/s7-1b-smoke/`. No console errors or page errors in any scenario.

## Possible failure (needs handler judgement; no comparison build)

Guided lesson exit (Baseline row): on /bezier/curve drag point 0 to (-3.242,-3.568), press "Spoznaj to demonstracijo" (lesson shows its own scene (-3,-2),(-3,2),(3,2),(3,-2)), Naprej x2, Nazaj, Končaj. After Končaj the points are still the lesson scene, not the edited entry scene; URL stays `?learn=1&learnChapter=bezier-curves&learnSection=control-points`. Possibly the lesson already replaced the scene at entry (then the entry scene was never captured) or Končaj only leaves the guide. Not linked to Preset code; unverified against another revision. Scripts: b8.cjs, b9.log.

## Scenarios

| # | Scenario | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Save/reopen, /bezier/curve and /functions/linear | Passed, with a design note | Saved after drag, changed scene, re-selected Preset via the list: saved points returned on both routes. Keys `bezeg-2.0:preset-bezier-curve`, `bezeg-2.0:preset-linear-function`. A hard reload drops the selection (selection lives in the graph instance), so the default scene showed, no notice, no errors. A reload "with it selected" is therefore not reachable. |
| 2 | File exchange | Passed | Export gave `presets.txt`; import into a fresh context showed "Datoteka je veljavna. Zbirke:1." and brought back both Presets. Point x set to "x": "Datoteka ni podprta: zbirka bezier-curve, prednastavitev smoke-b, polje data: kontrolne točke morajo biti pari končnih števil..."; bounding box `[5,-5,-5,5]`: "...polje boardState: neveljavne meje grafa...". Both name collection, Preset and field; localStorage identical before and after. |
| 3 | Malformed stored value | Passed | Collection with one valid and one bad Preset (point `["x",2]`): list shows only "Privzeta", notice "Shranjenih prednastavitev ni mogoče prebrati, zato je prikazana samo privzeta. Podatki v brskalniku so ostali nespremenjeni, shranjevanje in brisanje pa sta onemogočena...". Point drag worked (-4,-3 to -3.242,-3.568). The Save button was disabled, and the raw value was unchanged. The valid Preset is also hidden (whole collection unreadable). |
| 4 | Page opened with refused selected Preset | Blocked (not reachable) | Selection survives none of: hard reload, in-app route change (graph recreated), language switch (keeps the live scene, no reload from the Preset). Corrupted a stored Preset after selecting and remounted by route round trip: selection cleared, scene default, collection-unreadable notice shown. The per-Preset `preset_entry_refused_default_shown` text was never seen. |
| 5 | Figure export | Passed | Dialog lists the Presets; Zapri leaves the scene unchanged; generating with two checked gave `slike.zip` with `fig-a.png`, `fig-b.png` (one per Preset); live points after equal those before, and a further drag worked; no notice. |
| 6 | Baseline | Passed except lesson row (see above) | See below. |

## Baseline (Slovenian)

| Check | Result |
| --- | --- |
| Entry and families | Passed: home, then /bezier/curve, /rational/base, /spline/c1spline, /ph/cubic each had heading, one board, curves drawn, tabs Uredi/Prikaz/Shrani. |
| Point and slider | Passed: point 1 dragged (-3,2) to (-1.977,2.682), path changed; De Casteljau slider 0.5 to 0.25, t = 0,25, path changed. |
| Family controls | Passed: "Povečaj utež" changed the rational curve; PH curve selection added the child board `#hodograph-input-box` (2 boards). Its controls were not exercised beyond presence. |
| Navigation and lifecycle | Passed: polynomial to PH and back twice, via history navigation (not the picker): 1 board, 1 workspace each time; edit afterwards worked. |
| Language retains scene | Passed: SL to EN to SL kept points and selection. |
| Preset save/reopen | Passed (scenario 1). |
| Guided lesson | Entry, Naprej, Nazaj, Skrij and Končaj responded; exit restore not as expected (see above). |
| Narrow viewport and keyboard | Partly: 390 px had no horizontal overflow, board 364x280 px; focus reached the language select and Tab moved to the Demonstracije link. Inspector controls were not operated by keyboard. |

## Coverage gaps and cleanup

Other collections (curves with Blossom/NURBS) not tried; Preset clash/confirm dialog not exercised; PNG content only counted, not inspected. Cleanup: all contexts were closed by the scripts; temporary Presets lived in throwaway contexts only. The preview was not started or stopped by this run.
