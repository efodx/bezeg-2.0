# 01 — Capture authored highlight states

Status: planned. Source: [spec H2, H3, H4](../../specs/guided-example-highlights.md). Dependencies: 00 sample entries. Role: capture/media integration owner.

Start from `scripts/capture-guided-example-previews.cjs` and its test, `scripts/generate-guided-example-inventory.cjs`, `src/learning/chapter/guidedExamplePreviews.ts`, `src/images/learning/examples/manifest.json` and the capture section of [docs/commands.md](../../commands.md). The runner currently refuses to apply controls or actions and captures only the first settled frame; that restriction is what this task replaces.

1. Define the highlight recipe format beside each example's authored data or inventory entry: target frame plus ordered steps expressed through existing scene/lesson actions. Keep one source of truth; do not add a second registry.
2. Extend the runner to open the exact URL in a clean context, reach the frame, apply steps, wait for settled board effects, run expected-geometry checks for the highlight state and capture board-only PNGs at a higher device scale suitable for the larger card (coordinate size with task 02).
3. Record recipe, resulting scene fingerprint, checks, viewport/scale, build/source provenance and checksum per entry. Fail on unknown or unreachable frames, failed steps, a recipe that is expected to change the board but does not, empty boards, stale recipes, missing files and checksum mismatches. Keep partial recapture by `--id`.
4. Capture the task 00 samples, including the quintic PH offset highlight, and show each failure mode failing (test or deliberate mutation). The complete-inventory gate must not pass on an empty inventory.
5. Update `docs/commands.md`. Leave catalog preview and Bézier figure capture flows intact.

Completion: focused tool/manifest tests, sample captures with check evidence, typecheck and build. Write a short note to `docs/reviews/guided-example-highlights/capture-note.md` covering recipe format, sample results and any limits.
