# AB-A-5: chapter cards and posters

Curves handler 61, 2026-11-06. Spec: [advanced-bezier-lessons.md](../../specs/advanced-bezier-lessons.md). **Status: accepted; the browser view of the chapter page is left to the AB-A-6 gate.**

## Chapter cards

Chapter mode can mix board and surface cards. The capture runner dispatches each entry on its Demonstration's view, so the family needed only a route, and `assertExpectation` now accepts an `expected.surface` entry.

| Card | First frame | Authored check |
| --- | --- | --- |
| `advanced-bezier.reduction.reduction` | The elevated quadratic, reduced curve and elevated net | 3 curves, 11 points, 5 distinct positions |
| `advanced-bezier.arc-length-param.arc-length-param` | \(Q\), 9 equal-\(t\) points, the mover at \(t=\tfrac14\) | 1 curve, 14 points; \(Q(t)\) in Bernstein form in the script |
| `advanced-bezier.patch-coons.patch-coons` | \(S\) of the default boundaries, linked corners | Camera and owner `tensor-patch-0`; net from the blend formula in the script |

The script's Coons net is tested against all four boundaries and the lesson's centre \(z=0{,}75\).

- `/patches/coons` also matches the `patches` family route, so `advanced-bezier` is listed first: a retained run then names the right family.
- The lesson camera is the default Preset's fit at aspect 0.45 (distance 18.32), not the catalog recipe's refit (8.62).
- **The Coons card is correct but small:** the patch is about 180 px wide in the 840 px frame. Chapter capture accepts only the opening frame. Students open the lesson with the same small view. Polish item: a better opening camera for `patch-coons`.

## Preview copy

Compared with the images. The `arc-length-param` copy named equal-arc points that the first frame hides; it now describes \(Q\), its \(8\) steps and the point at \(t=0{,}25\). The other two match. The chapter's copy reuses the lesson copy, so the two cannot drift.

## Posters

Viewed by eye, nothing clipped. Recipes unchanged; `POSTER_PENDING` is empty.

| Id | Shows |
| --- | --- |
| `reduction` | The elevated quadratic, its reduced curve and net, with *Točno nižljiva* |
| `arc-length-param` | \(Q\) with equal-\(t\) circles and equal-arc squares, so the spacing difference is visible |

Flags: `PREVIEW_RECAPTURE_IDS=reduction,arc-length-param`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1`, `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`. No capture script or recipe changed for the posters. Manifest delta by script: 115 to 117 captures, none changed, all 51 motions identical.

The chapter thumbnail stays on `patch-coons`: the new posters do not clearly beat it.

## Checks

| Check | Result |
| --- | --- |
| `node --test` on the inventory and capture scripts | 36 of 36 |
| `node --test scripts/demonstration-preview-capture.test.cjs` | 36 of 36 |
| `just typecheck`, lint on the touched scripts and files | Passed |
| `just unit` on previews, preview copy, notation, poster assets, catalog page | Passed |

Not run: `just check`, a browser view of the chapter page, and independent review. The diff is tooling, one copy line and media, reviewed by the handler.
