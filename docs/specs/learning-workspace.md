# Learning workspace

Status: implemented and reviewed. Physical touch and projector review remain open; see the [implementation review](../reviews/learning-workspace.md).

Implement workspace prototype B, selected on 2026-10-08. The comparison is preserved on `codex/workspace-prototypes` at `375d453`; see [prototype notes](../prototypes/workspace-improvements.md).

## Scope and acceptance

- Apply the learning layout to all 26 demonstrations and the matching starting page, without a prototype parameter or switcher.
- Group the topic sidebar by mathematical family; expand the current family and preserve all existing routes.
- Keep the graph prominent, provide point-fit navigation, and show two short, localized exploration prompts appropriate to each topic.
- Collapse structured editing modes and operations into keyboard-accessible disclosures. Preserve mounted controls, operation semantics, selection, and auxiliary boards.
- Use the real browser-local preset and figure-export controls. The prototype's simulated unsaved/recovery controls are excluded because no corresponding persistence behavior exists.
- Preserve real presentation mode with accessible tool open/close controls and essential narrow-screen interactions.
- Support Slovenian and English. Preserve the elderflower header, preset formats, mathematical evaluation, and client-only hosting.
- Remove throwaway implementation and losing variants; retain the comparison branch and documentation pointer.

## Verification

Run TypeScript, the production build, localization and workspace interaction tests. Review desktop and narrow layouts, grouped navigation, prompts, disclosures, real save controls, PH auxiliary controls, and presentation mode in the browser. Verify all graph routes still mount their boards. No numerical algorithm changes are intended.
