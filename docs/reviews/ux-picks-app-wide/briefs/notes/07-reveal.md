# Task 07 slice 3b: scene reveal, worker note

Done per 07-reveal-design.md. Files: `src/workspace/view/sceneReveal.ts` (+ `.test.ts`), `BaseGraph.tsx` (`morphStep`, `sceneRevealer()`, dispose in `unmount`), probes `smoke/07-reveal-spot.cjs`, `07-reveal-count.cjs`.

Key logic: `capture` (clones visible nodes, 8 ms budget), `reveal` (diff, 0 inline opacity, ghost overlay `.scene-reveal` at 0.5 fading linearly, press/Esc listeners on document, `finish` restores), `SceneReveal` owner (`begin` finishes previous; `commit` after the host flush).

Deviation: the board is read in a `requestRender` callback (runs in GraphHost's layout effect, before paint), not right after `apply()`, because board updates run in `onStateChange` after the commit. `reveal` takes no overlay argument: the overlay is created per reveal in `board.containerObj` and removed on finish (nothing left at rest).

Spot-check (1440x900, 6 Next + 6 Back each): taylor, decasteljau, phase: no page errors; ghostLeft 0 and inline-opacity count unchanged 500 ms after every step; first sampled frame with fade has min opacity 0 and ghost 1 (taylor 23, decasteljau 40 nodes; phase 3 steps with fades, others nothing appears). Phase: 41 visible objects, capture+clone 0.3 ms, so the budget does not skip it.

Not verified: frame-gap comparison with 3a (probe not rerun), visual feel, touch.
