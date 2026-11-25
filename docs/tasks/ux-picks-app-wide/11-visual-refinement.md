# 11 Visual refinement of the board workspace

Owner, 2026-11-25: visual refinement becomes a task now, beside the 08 lanes: "we want this to look beautiful. The prototype
cards looked better than this!" Run by a Fable worker at max effort (owner's choice).

## Goal

The pucks, the puck strip, the board cards (readouts, legend, Orodja/tools, lesson), their headers, folds, grips and
highlight states look finished and beautiful on desktop, at least as good as the prototype's cards, within the elderflower
identity (`docs/guardrails.md`, the app's existing palette and type). The graph stays the hero: cards are quiet, legible
and light on the board.

## Scope

- Presenter styling and markup only: `src/workspace/**` (components and CSS) and shared input styles the pucks use. Behaviour,
  layout rules (`docs/reviews/ux-picks-app-wide/03-layout-design.md`, strip rules 2a-2i), the contract and graph files are out of
  scope; a change that needs a layout-rule change is listed for the owner, not made.
- Desktop and touch at desktop widths (1024-1920). Phones are task 09.
- Accessibility kept: roles, names, focus rings, contrast at least WCAG AA for text, hit targets at least 32 px for pucks.

## References

- Prototype (owner prefers its cards): branch `ux-picks` frozen at `aff6df6c`; read its workspace CSS/components with
  `git show aff6df6c:<path>` (find them with `git ls-tree -r --name-only aff6df6c | grep -i -E "card|puck|workspace"`). Take what
  made them look better (spacing, typography, header treatment, shadows/borders, swatches), not its behaviour.
- Current: `src/workspace/cards/cards.css`, the puck components under `src/workspace/pucks/`, `BoardCards.tsx`.
- Known visual defects to fix on the way: a single readout group shows a redundant fold title "Odčitki" under the card title
  (`ReadoutsBody.tsx:170`); Orodja opens on an empty tab when its controls are all in another tab (exponential); legends start
  collapsed with truncated titles ("Lege…").

## Acceptance

1. Before/after screenshots (`just shot`, 1440x900 and 1280x720, board crop) of: Taylor (free and lesson), transformations,
   De Casteljau, linear map, phase portrait, exponential, function-inverse, polygon-area, bezier; plus the prototype's
   equivalent cards where it has them. Stored under `docs/reviews/ux-picks-app-wide/feel/11/`, one contact sheet per set.
2. Inspector-width check of each card type: `just shot --width 310 --selector <card>`.
3. No behaviour change: `just unit src/workspace` and the presenter tests pass unchanged (a test asserting a class name or DOM
   shape may be updated with one line of reason); `npx tsc --noEmit --pretty false`; `just lint <changed files>`.
4. Owner sign-off on a tailnet preview (handler serves it). The task closes only on his word.
