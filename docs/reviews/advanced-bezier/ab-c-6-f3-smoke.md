# AB-C-6 F3 smoke: does closing an in-page lesson return the Coons scene?

- **Revision:** `44da1664`, production preview `http://127.0.0.1:4314/bezeg-2.0` (not rebuilt or stopped by this worker).
- **Brief:** [ab-c-6-f3-brief.md](ab-c-6-f3-brief.md). Gate: [F3](ab-c-6-gate.md#open-f3-closing-the-lesson).
- **Setup:** Playwright (Chromium), 1440×900, `sl-SI` locale, no page errors, no console errors, no failed requests in any run.
- **Scripts and captures:** `C:/Users/1337Hacker/.claude/jobs/754e998b/tmp/f3/` (`f3.cjs`, `f3-run.log`, screenshots `run1-*.png`, `run5-*.png`, `run6-after.png`). First attempt (`f3-run-attempt1.log`) had a control-URL error (see note 3); runs 1 and 5 in it matched the final run.
- **Interior-net readout compared:** the full text of the panel that holds the `[data-corner-status]` readout (includes the interior-net value). Compared as whole strings.

## Result

**The scene returned in both in-page runs.** Shown surface stayed \(B\), the `c0-1` point kept its coordinates, the corner status stayed `met`, and the interior-net readout string was identical before and after. The `window` marker set before the lesson click survived in both runs, so no document reload happened. The control reproduces the gate's observation: a new load of the `?learn=1` URL starts from the default scene, and closing it leaves the default scene in place.

## Values

| Run | Stage | Shown surface | Status | `c0-1` (px) | Interior readout | URL (after stage) |
| --- | --- | --- | --- | --- | --- | --- |
| 5 (walk to end) | before | \(B\) (`b`) | met | (556, 271) | X | `/patches/coons` then `?learnChapter=advanced-bezier&learnSection=patch-coons` |
| 5 | after close | \(B\) (`b`) | met | (556, 271) | X, identical | `?learnChapter=advanced-bezier&learnSection=patch-coons` |
| 1 (two frames) | before | \(B\) (`b`) | met | (606, 231) | Y | `/patches/coons` |
| 1 | after close | \(B\) (`b`) | met | (606, 231) | Y, identical | `?learnChapter=advanced-bezier&learnSection=patch-coons` |
| 6 (control) | before new load | \(B\) (`b`) | met | (606, 231) | Y | `/patches/coons` |
| 6 | after new `?learn=1` load, lesson open | Coons \(S\) (`s`) | met | (546, 261) | default | `?learn=1&learnChapter=advanced-bezier&learnSection=patch-coons` |
| 6 | after close | Coons \(S\) (`s`) | met | (546, 261) | default | `?learnChapter=advanced-bezier&learnSection=patch-coons` |

X and Y are the readout strings from `f3-run.log`; they differ between the two runs only because each run dragged the point to a different place.

## Notes

1. **Opened in the page.** Each in-page run used the page's own *Spoznaj to demonstracijo* button, with no `goto` after the first load. The URL became `…?learn=1&learnChapter=advanced-bezier&learnSection=patch-coons` (run 1) or `…&learn=1` appended (run 5). The marker `window.__f3marker` survived both runs. Playwright's `framenavigated` counted 2 events per run. These are same-document history updates, not reloads, since the marker survived.
2. **Close.** Run 1 (close from the middle of the lesson) raised the confirm dialog *"Zapustiti vodeni primer?"* with the text *"Graf se bo povrnil v stanje pred začetkom vodenega primera. Vaš napredek v vodenem primeru ni shranjen."* I clicked *"Zapusti in povrni graf"*. Run 5 walked to the last frame, pressed *"Zaključi vodeni primer"*, then *"Končaj vodeni primer"*, and no dialog appeared.
3. **Control URL.** The first attempt reused the post-close URL (which had dropped `learn=1`), so the lesson did not open and the script timed out at close. The final run uses the URL the lesson actually opened with. Control loaded that URL as a new page load (after the scene change on the base URL), so the result is a load of the `?learn=1` URL as the brief specifies.
4. **URL after close.** After close in every run, the `learn=1` parameter is gone, leaving `?learnChapter=…&learnSection=…`. The gate note said the URL kept `?learn=1&…`. I did not check whether this is a change in behaviour or was already the case before the gate pass. This is a difference from the gate note, not a failure of the scene return.
5. **Coverage not included.** Only the shown \(B\) surface and the `c0-1` point were checked. Other surfaces, other points, the linked-corner switch, and Firefox were not run. Screenshots were captured but not viewed.

## Verdict for F3

Closing a lesson opened in the page **returns** the Coons scene (shown surface, point position, corner status, interior readout). Per the gate's rule, this is recorded as "returns" and does not block release on F3. Note 4 (URL drops `learn=1` on close) is outside the F3 question and is for the handler to decide.
