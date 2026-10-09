# Workspace improvement prototypes

Question: how should the remaining UI improvements fit around the accepted quiet header and the live curve demonstrations?

Decision on 2026-10-08: implement variant B, the learning workspace and its matching home page. The complete throwaway comparison is preserved on `codex/workspace-prototypes` at `375d453`. Production implementation is specified in [Learning workspace](../specs/learning-workspace.md); the prototype switcher and losing implementations are removed from that branch. The descriptions below refer to the archived comparison, run with `npm start` on the prototype branch.

## Compare

- `/bezeg/bezier/curve?prototype=workspace&variant=A`: compact inspector, grouped topic families, collapsible operations, active editing mode in the help disclosure.
- Variant B: framed learning workspace with short exploration prompts and a separate topic rail.
- Variant C: wide graph with a bottom control dock; on phones the dock stays above the prototype switcher and can collapse.
- `/bezeg?prototype=workspace&variant=A`: three corresponding home-page approaches with a clear starting action and representative demonstration links. A uses example cards; B a learning sequence; C a large illustrative graph.

Use the floating arrows or keyboard Left/Right to switch. Header and topic links retain prototype context. Input/select/slider arrow keys are not intercepted. Switching retains one live board, selection, parameter controls, and draft save form.

## Scope and limits

The live demonstrations retain their existing mathematical controls. A temporary wrapper groups the general Bézier operations into collapsible sections; PH keeps its own hodograph. Fit view invokes JSXGraph's existing point-fit operation and only changes the viewport. CSS strengthens the existing blue curve and labels without changing evaluation. This is not a general solution for all curve colors, label collisions, or mathematical fit bounds.

The save panel is an in-memory illustration: save, copy, import/export, reset, and recovery only show explanatory status messages. The unsaved indicator is a proposed state, not a real dirty-state detector. No preset files or browser presets are written by these controls. Existing graph controls and the accepted language selector remain real. New prototype copy is Slovenian; full localization belongs to a selected implementation.

The home graph is explicitly an illustration. Rational weight/count-control refinements and remaining hover-only previews need a separate interaction exploration; these layouts do not claim to fix them. No production UI, rendering algorithm, hosting, or preset contract is being migrated. Reference direction: [product direction](../product-direction.md).

Acceptance for this exploration: three structurally different layouts on existing routes, desktop/390px review, stable board and form while switching, reachable mobile dock controls, and no production switcher. Save the eventual decision here before creating an implementation spec.

Verification: TypeScript and production build passed. Browser review covered all three workspace variants at 1440px and 390px, the three home variants, selected Bézier controls, and PH hodograph access. All three workspace variants had no horizontal overflow at 390px. The selected SVG curve ID stayed the same across switching; the typed save name and preview status also remained. Mobile C dock collapse/reopen and fit-view were exercised. The production JavaScript bundle contained none of the prototype switcher or home copy. Physical touch, projector readability, export fidelity, and formal accessibility review remain unverified.

Captures: [compact editing](workspace-A.jpg), [save panel](workspace-save.jpg), [phone dock](workspace-mobile-C.jpg), [home A](workspace-home-A.jpg).
