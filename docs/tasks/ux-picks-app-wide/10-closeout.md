# 10 Closeout

Source: [board workspace spec](../../specs/ux-picks-app-wide.md) acceptance 1 and 12.

## Goal

Nothing of the old workspace paths or the prototype scaffolding remains, and the documents describe what the app does.

## Steps

1. Remove the old tools column layout, per-graph readout and legend render paths, the undeclared-graph fallback of task 04, the visible-points fit, and the parity tool with its golden recordings.
2. Search for leftovers: pick flags, the param registry mirror, `setRaw`, prototype storage keys, inline Slovenian UI text outside the catalogs.
3. Documentation: architecture, capabilities, DESIGN.md, the controls catalogue, the smoke checklist, GLOSSARY entries for new domain terms (puck, board card, sweep, if they count as domain vocabulary), localization table for new Slovenian terms.
4. Full checks: `just check`, the full smoke checklist (shared shell, workspace and lesson runtime all changed), fuzzer at the spec's seed counts, probe table on the pilots against the `master` baseline from task 01.
5. Retire the reference: stop the 4460 preview and its watchdog; the `ux-picks` branch and worktree stay or go as the owner decides (unlink the `node_modules` junction with PowerShell before removing the worktree).

## Acceptance

- Spec acceptance 1 to 12 all hold and the evidence is linked from this file.
- The record of breaking changes (layout for every graph, new browser-local layout record, no route or preset change) is in the capabilities or release notes.
