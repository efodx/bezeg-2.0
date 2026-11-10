# F1 waves task 01: kernel handoff

Status: complete, uncommitted. New files only: `src/waves/{sinusoid,beats,standing,sampling}.ts` and `.test.ts`.

Checks observed: `just unit src/waves` passed (34 tests); `just lint src/waves` passed; `npx tsc --noEmit --pretty false` has no errors outside src/levelsets and src/dynamics; no trailing whitespace.

Mutations (each failed, then restored and re-diffed):
- ambiguity test `2r === fs` -> `2r <= fs`: 3 failures (grid brute force, spec rule, WV4 defaults).
- `<` -> `<=` in the signed-alias branch only: equivalent, since ambiguity is returned first (no failure).
- beat frequency halved: 2 failures (exact integer test, sampled-envelope peak count).
- alias sign dropped (`fs - r`): 5 failures (grid, spec rule, WV4, reconstruct samples, 23/24 sign).

Decisions:
- Ranges: f 1..40, fs 2..64, halfWaves 1..6, beat frequencies 1..40, all integer, else RangeError.
- `reconstruct` returns null when ambiguous.
- `phasorSum` returns relativePhase and absolute phase.
- Sinc window: n = -E..fs+E (E = 12, 48, 192), the window [0,1] s plus E extra samples each side.

Spec issues (spec not edited):
- WV5 sinc numbers (0.0253, 0.0086, 0.0023) reproduce only with that window (all window samples plus `extra` each side); the spec does not define it.
- WV5 linear join 0.7347 is a truncation (spec to become 0.7348): actual 0.734771 (rounds to 0.7348); phase 0 gives 0.718292.
- WV5 prose in the spec has garbled math markup (lost backslashes around `\varphi`, `\cos`).
