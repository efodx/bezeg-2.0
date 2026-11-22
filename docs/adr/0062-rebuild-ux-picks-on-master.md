# The kept UX picks are rebuilt on master, not merged

Accepted on 2026-11-22 (owner decision in the planning session for [the board workspace spec](../specs/ux-picks-app-wide.md)).

## Context

The `ux-picks` branch holds nine prototypes the owner kept. At its frozen commit `628dd1f3` it is 201 commits ahead of `master`: 190 files, about 12,400 added lines, 34 files outside `src/uxPicks/` gated on a pick flag, 28 of 116 graphs converted. It was built under the rule "works enough so I can see if I like it", so it has almost no unit or smoke coverage. Its parameter write paths are known to be unsound ([parameter writes](../specs/parameter-writes.md)), and its layout is measured after paint by several observers.

## Decision

Rebuild each pick from `master`'s code in slices, with tests, using the prototype as the behavioural reference and its handler logs as the list of problems to solve structurally. Slices are built on a work branch cut from `master`; a stage is carried to `master` when it is finished and accepted, and is live there. There is no feature switch, because the site has no users besides the owner at present. The prototype code on `ux-picks` is frozen and does not reach `master`; planning files live on `ux-picks` and are carried over as documentation.

## Alternatives

- **Merge the branch and harden it in place.** Fastest to "everything visible on master". Rejected: the write paths and the layout observers would have to be replaced under 28 converted graphs and a flag in 34 files, and every later fix would again be a patch on the prototype's structure.
- **Rebuild behind a switch and release everything at once.** Keeps `master` unchanged for visitors until the set is complete. Rejected by the owner: nobody else uses the site, and a switch doubles every graph's UI path, which was one cause of the slow conversion on the prototype.

## Consequences

- For some weeks `master` shows a mixed workspace: board cards and pucks on converted graphs, the present panels inside the tools card on the rest.
- Phones are redesigned last. Until then the phone layout is not a target and phone checks broken by the new workspace are skipped, with the list kept in the phone task.
- The prototype's storage keys and inline Slovenian text are not carried over; text enters the catalogs.
- The preview on port 4460 stays available as the reference until the closeout task.
