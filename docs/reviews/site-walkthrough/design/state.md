# State: site walkthrough, design session (package C)

Rewritten 2026-11-14 by handler 1, after the owner's picks.

## For the owner

**Ready to look at:** the mockup gallery you picked from, <http://desktop-a0j72sv.tail2032db.ts.net:4332/> (standalone page, no app base path). It will be replaced on the same port by a preview of the changed pages once the slices below pass review.

**Choices only you can make:** none open. One thing to confirm when you see the preview: the presets list is headed "Shranjena stanja" while the tab and the file actions keep "prednastavitve"; say if you want one word throughout.

## Owner decisions, 2026-11-14

Recorded in full in `docs/specs/site-walkthrough-design.md` under "Owner decisions".

- H02: label "Izbor demonstracij"; six at random per visit; the pool is the handler's wider choice across families (18 ids in the spec), drawn with no two from one family.
- H03: option A (picture cards, no arrows or counter), with nicer card text and a full ring as the selected accent.
- H04: option A, a second button to the learning overview.
- L01: numbers everywhere. L04: outline only. L05: as elsewhere.
- P01 option B together with the P02 list panel.
- **G07, decided:** the epicycles example gets the outline of Slovenia and the cat; the treble clef and the elderflower blossom too if adding examples is easy. Owner's words: "For epicycles, add slovenia and cat. If adding examples is easy, you can add all you've shown." The `graphs` session implements it; the candidate generator is `docs/reviews/site-walkthrough/design/epicycles-subjects.html`, and its Slovenia outline is a rough sketch to be replaced by real border data.

## Work in the tree (not committed, not pushed)

- L04: `src/learning/runtime/GuidedLesson.css`, by the handler.
- L01 and L05: worker returned; unit tests and lint pass; browser check outstanding. Notes: `notes/chapters.md` if written.
- H02 and H03: worker returned; unit tests, typecheck and lint pass; browser check outstanding. `tests/home.smoke.spec.cjs` (old six ids, `bezier` first) and `tests/demonstration-motion.smoke.spec.cjs` (lines 227 to 291) need updating before publish.
- P01 and P02: worker still running in `src/graphs/base/PresetSelector.tsx`, `Presets.ts`, `BaseGraph.tsx`, `sl.ts`, `en.ts`.

## Next

1. When the presets worker returns: review its diff, then one worker updates the browser smoke specs under `tests/` for the carousel and the presets panel.
2. `just build`, screenshots (home at 1440, 1024 and 390; chapter at 2560 and 1920; lesson panel; presets panel at 310 px), then `just smoke` for the affected specs.
3. Publish in separate commits: L04; L01 with L05; presets; carousel. Use `just publish --background --recipe runtime`.
4. Homepage label and second button (H02 label, H04) after `polish` slice 3 is on `master`: rename `starting_demonstrations`, add the link in `src/WelcomePage.tsx`, update `homepage-carousel-and-demonstrations-catalogue.md`.
5. Replace the gallery on port 4332 with `just preview 4332` of the changed pages and update "For the owner".

## Running processes

- `node docs/reviews/site-walkthrough/design/serve.mjs 4332` serves the gallery; `tailscale serve --http=4332` publishes it.
- This worktree's `node_modules` is a junction to the main checkout's.

## Session rule

The owner chooses design options; the handler does not implement a design choice ahead of his pick. Routine engineering choices inside a picked option stay with the handler. No successor is launched while the work waits on the owner.
