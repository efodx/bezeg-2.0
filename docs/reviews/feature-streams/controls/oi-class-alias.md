# graphClassFiles alias fix (worker note)

- Only consumer of `graphClassFiles` is `familyClassNames` (via `sweepScope`). Its `changedNames` are matched by the sweeps against real class names (`classNames(createGraph(id))`), plus file stems of changed files.
- `graphClassFiles` entries now are `{name, dir, stem}`: `name` unchanged (import alias / `m.X`), `stem` = `path.posix.basename` of the import path (scripts/transient-state-scope.cjs:75, :84).
- `familyClassNames` skips a changed file when its stem is a class file stem (was: when it equalled a `name`), :96-100. Emitted names unchanged (alias `name`), so non-aliased behaviour is identical.
- Before: a change to `curves/bezier/SubdivisionGraph1.tsx` (imported as `DecasteljauGraph3`) was treated as a helper and selected all 12 classes of the directory. After: selects none beyond its own file stem.
- Test fixture classes in the test file gained `stem`.
- New test: "a change to the file of an aliased graph class is a class file ..." failed before, passes after.
- Not done: the drift-guard `noFile` check still checks the directory; a strict `<stem>.tsx` check was not added.
- Logs: .command-logs/alias-before.log, alias-after.log.
