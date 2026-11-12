# Batch 3 smoke: polynomial Bézier family registration

Production build from `32038517` (clean). Command: `just build` (log `.command-logs/batch3-build.log`), then `just smoke-built --port 4331 --workers=2 --grep "$G"`. The grep is saved in `.command-logs/batch3-grep.txt`:

`(^| )(bezier|decasteljau|decasteljau-alternative|affine|subdivision|repeated-subdivision|extrapolation|elevation|reduction|arc-length-param|bezier-clipping)( |$)|the catalogue shows every demonstration|catalog filters combine|generated preview mapping and provenance`

Run log: `.command-logs/2026-11-12T10-12-43-154Z-27988-0b756f89.log`; wrapper log: `.command-logs/batch3-smoke.log`.

Result: 41 passed, 0 failed, 0 skipped. Build reused for the same revision (clean).

Selected rows:
- Demonstrations (11): `bezier`, `decasteljau`, `decasteljau-alternative`, `affine`, `subdivision`, `repeated-subdivision`, `extrapolation`, `elevation`, `reduction`, `arc-length-param`, `bezier-clipping` each render heading, graph and inspector. All pass.
- Lesson walks (22): Slovenian `?learn=1` walk and English 390x844 walk for each of the 11 lessons. All pass.
- Lesson exit tests (2): `decasteljau` and `repeated-subdivision`, English exit and re-entry. Both pass.
- Catalog (3): "the catalogue shows every demonstration in teaching order...", "catalog filters combine topic and forgiving search...", "generated preview mapping and provenance...". All pass.
- Unrelated rows also selected (3): the "Rational elevation outside lessons" and "Rational elevation extras" tests, matched by the word `elevation`. All pass. `interp-subdivision` and `patch-subdivision` were not selected because the anchor excludes hyphenated prefixes.

Catalog order: `src/graphs/curves/bezier/registration.ts` lists the 11 IDs in the required order, with `bezier-clipping` last. The rendered card order was not asserted separately; the passing catalogue test covers teaching order, but I did not confirm that it checks this exact sequence.

No page or console errors in the run. Demonstration load tests do not capture console errors (as in batch 2); lesson walks fail on runtime errors.

Not covered: drag or slider on these routes; Preset menu and preset save/load for the family; A-B-A route lifecycle; keyboard-only and touch-only navigation beyond the 390px lesson walks; explicit rendered-order check for the 11 catalog cards; the full checklist (not required, since only the registration path changed).
