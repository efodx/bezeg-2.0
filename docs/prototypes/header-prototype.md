# Header prototype

Question: which header belongs with Bezeg's graph-centered workspace?

The owner selected A for the whole app on 2026-10-08. The comparison is preserved at commit `1a90bf1` on `codex/header-prototype`; current code replaces it with the shared production header. See [the implementation scope](../specs/header.md).

To revisit the original comparison, use the captured prototype commit in an isolated checkout. Its `npm start` preview uses `/bezeg/bezier/curve?variant=A` with floating arrows or keyboard Left/Right. In the implemented app, `variant` no longer changes the header.

- A: quiet brand row, one demonstration menu, language at the right; matches the workspace background.
- B: white two-row header separating brand from topic families. Family links open a representative demonstration; the Demonstracije menu provides the full topic list.
- C: dark compact workspace bar with brand, workspace context, and a demonstration menu.

The existing graph and inspector remain live. Header language selection is an in-memory visual illustration and does not translate the workspace or save a preference. Variant changes only update the URL. No geometry, presets, storage formats, or production routes change.

Review at desktop and 390px widths. Judge brand visibility, navigation hierarchy, workspace continuity, and how much space the header uses. Reference direction: [product direction](../product-direction.md). Keep the winner decision here before a separately scoped implementation.

Verification: TypeScript passed. Production build passed with existing repository warnings after clearing the stale generated TypeScript build cache. Browser navigation timed out, so desktop/mobile visual review and interaction verification remain pending. The local development ports were already occupied; no existing server was stopped.
