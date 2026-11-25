# 07 glide duration scales with distance (owner, 2026-11-25)

- `glideDuration(from, to)` in `src/workspace/view/motion.ts`: `clamp(250, 250 + 80 * d, 450)` ms, `d = max(pan per axis in widths/heights of the larger box, |ln width ratio|, |ln height ratio|)`. One-width pan = 330 ms, 3 widths = cap. Same ease-out cubic; reduced motion still jumps.
- The director uses it when it starts a glide. A retargeted or carried glide keeps its remaining-time rule (unchanged).
- One clock: motion.ts holds a small step clock (`setStepGlideMs`/`stepGlideMs`). The director publishes the duration of a frame glide it starts (reset to 250 when a new frame starts), the lesson morph and scene reveal read it on every tick. Chosen over a duration provider because morph and reveal are built independently of the director and may begin before its glide is known; reading per tick needs no wiring. Cost: module-level state (tests reset it).
- Bisection 1440x900 probe: step 11 one glide of 25 frames (about 420 ms), max per-frame jump 59.1 %; glides per step all <= 1.
