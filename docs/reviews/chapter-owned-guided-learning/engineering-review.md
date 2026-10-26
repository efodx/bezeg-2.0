# Engineering review: chapter-owned guided learning

## Finding

- **P2 — legacy guided entry can lose its authored section return.** `DemonstrationWorkspace` resolves ownership only from `learnChapter`/`learnSection`, then its normalization effect deletes `explore` (`src/graphs/base/DemonstrationWorkspace.tsx:64-67,117-124`). For a valid legacy URL such as `/bezeg-2.0/bernstein?learn=1&explore=bezier-curves.bernstein-form.bernstein`, the requested section is an authored additional owner, but the resolver falls back to `foundations#why-weights` and removes the only evidence of `bezier-curves#bernstein-form`. When a valid explore triple matches one of the lesson's authored owners, use it to resolve the owner before normalizing. If it does not match, the explicit compatibility requirement does not require retaining it.

## Coverage and scope

The new ownership test checks every available lesson resolves to a real chapter section and checks authored listings. The workspace regression checks one instructional surface, prevents the prepared Bézier activity action from replaying, and observes `restore:ordinary` after return. However, it mounts directly at a URL containing `chapter`, `activity`, and `learn=1`; it does not first prepare an activity and then launch guided instruction through the workspace control, so it does not exercise the reported lifecycle transition itself. There is no new hide/show, confirmed exit, or browser Back/Forward lifecycle coverage in the inspected regression. The changed code does not alter equations or graph mathematics; no mathematical-meaning issue found.

## Final disposition

The legacy-owner P2 was repaired and rechecked by the independent reviewer. Valid legacy section/demo membership and the Bézier Bernstein override are covered by ownership tests. A second workspace regression now launches from an active prepared activity, checks capture before lesson application, and observes restoration. Final staged focused tests and all 27 standalone/unified production browser checks passed; the latter include confirmed exit, saved prepared activity restoration and history. See [acceptance](acceptance.md) and [browser evidence](smoke.md) for final coverage.
