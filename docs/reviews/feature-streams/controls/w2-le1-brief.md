# Wave 2 slice LE1: collision playground

Read `w2-le-common-brief.md` first.

**Owned:** `src/learning/playground/collisions/CollisionPlayground.tsx`, `CollisionPlayground.css`, `CollisionPlayground.test.tsx`, `CollisionInspect.tsx` only if a control there is raw, and the `collision_*` keys. Worker LE2 owns the other playground files.

**Work:** method radio group (`:397`) and overlay stage radio group (`:407`) → `ChoiceSelect` (decision 9); bounce checkbox (`:415`) → `OnOffSwitch`; Step once (`:425`, native `disabled` while playing) is part of the playback row: leave it unless it is not, and say which; the `role="status"` live div (`:452`) → `LiveReadout`, muted while playing. Write the inventory row for this playground in your evidence file. One thin wiring test per changed control kind (one select, the switch) with an observed failure by mutation.

**Evidence file:** `w2-le1.md`. **Handoff note:** `w2-le1-handoff.md` (both in `docs/reviews/feature-streams/controls/`).
