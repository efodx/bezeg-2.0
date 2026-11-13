# Main views polish: state note

Owner request (2026-11-13, verbatim): "/impeccable I want you to polish the page and its main views. So homepage, demonstrations, learn". Later, verbatim: "if you'll be spawning any workers/successors for this session chain, you should be using Fable 5.2 instead of opus."

## Status: implemented 2026-11-13

Handler 1 did the rendered evidence pass and wrote the fix list; handler 2 implemented all 17 items itself (tightly coupled CSS, no workers dispatched). Nothing remains queued for a successor.

Commits, in order (branch `worktree-polish-main-views`, rebased onto `origin/master` at publish):

1. `refactor: remove the eyebrow above the page heading on Home, Demonstrations and Learn`: revert this commit alone to restore the eyebrows.
2. `fix: demonstrations catalogue reachability, contrast and shell tokens`.
3. `fix: home action under the intro copy, steady phone carousel height, rail to the card edge`: revert this commit to put the home action back beside the headline (it also carries the carousel and phantom-scroll fixes).
4. `fix: Learn thumbnails take the row hover tint; focus colour from the shell token`.
5. `docs: record the home intro layout and catalogue token roles in DESIGN.md`.

## Decisions made without asking (owner may overrule)

- **Eyebrows removed** on all three views. They repeated the header brand and active navigation item and were styled inconsistently. Rejected: keep and unify. Recorded in `docs/specs/learn-landing-visual-alignment.md`, `docs/specs/homepage-carousel-and-demonstrations-catalogue.md` and `DESIGN.md`.
- **Home catalog action under the intro copy at every width.** Rejected: anchor it at the right edge under the botanical (overlaps the stem at 820–1000px). Recorded in `docs/specs/homepage-visual-flair.md`.
- **Catalogue summary wording**: "{n} tem · {m} demonstracij" / "{n} topics · {m} demonstrations", matching the rest of the page. The `demonstration_count_*` keys still say "prikaz"; they are used elsewhere and were left alone.
- **Phone carousel**: the prompt reserves 2 lines at ≤700px, 3 at ≤560px and 4 at ≤380px; the title drops to 19px at ≤360px.

## Measured after the edits (dev server, sl and en)

- Topic list at 1366×768: top 18, bottom 750 of 768, scrolls internally. Picker dialog still bounds its own list (405px box, scrolls).
- Featured card height equal across all six slides at 360, 375, 390, 414, 430, 480, 560, 600 and 700px in both languages. Known gap: at 320px in Slovenian one slide's title still wraps to two lines (24px taller).
- `scrollWidth == clientWidth` on all three views at 1920, 1366, 900, 390 and 320px. Home `scrollHeight` is 1080 at 1920×1080.
- Typed search text is `rgb(25, 55, 47)` (was `rgb(169, 181, 194)` from the global `input[type]` rule in `bootstrap-overrides.scss`); placeholder is the `label` token; "Odpri" label and card copy both start at the same x.
- Detector (`impeccable detect`): remaining findings are the recorded 5px rail, the grid backdrop and existing mask/radius literals, all kept on purpose.

## Left alone on purpose

The scarab glyphs in the footer, the 5px rail, border-plus-shadow cards, unicode arrows, the full-width search field, the header wrapping to two rows at 320px, `DemonstrationPicker.css` literals.

## Outside this task

In the dev server only, `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js` returns 404: a `%BASE_URL%` doubling in `index.html:22` that predates this work.
