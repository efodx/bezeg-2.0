# Compact chapter exploration

Owner request, 2026-10-26: consolidate the exploration blocks in all eight chapters around a compact version of the illustrated Bézier activity. This refines the readers described in [Unified Learn](unified-learning.md) and the [standalone learning visual direction](standalone-learning.md#visual-direction-and-picture-examples).

## Scope and acceptance

- Inventory all eight chapters' exploration destinations and their prepared-activity, guided-lesson or free-exploration behavior.
- Use one shared presentation component and content contract in both chapter readers. Preserve specific titles, instructions describing what to change and notice, and useful static figures. Do not introduce placeholder previews or live boards.
- Reduce a representative Bézier card's desktop height, including “Move a control point,” at identical viewport and text size. Record before/after screenshots and dimensions. Keep text readable and diagrams proportional and uncropped.
- Give each block one clear primary launch action. Keep existing guided lessons and free exploration accessible with distinct labels and secondary emphasis where appropriate. Ordinary links must not acquire prepared-scene or Bézier return semantics.
- Preserve routes, section/activity anchors, launch scenes, reading return state, scroll/focus restoration and browser navigation. No storage, graph runtime, mathematical evaluation, scene or lesson changes.
- Treat Slovenian and English equivalently. Keep visible keyboard focus and usable narrow layouts and enlarged text without new clipping or document overflow.

## Implementation boundary

Own shared reader presentation and migration, reusing current assets and subject-specific prompts. New figures, scene runtimes, broad chapter prose rewrites and reader-wide typography changes belong to separate work. Keep the cream/green reading identity.

## Verification

Run focused reader, content and navigation tests, notation checks for any changed mathematical prose, typecheck, lint and production build. Delegate browser smoke across the affected chapters and launch/return paths, covering desktop, narrow screens, enlarged text, both languages, keyboard and Back/Forward. Record observed coverage and gaps with before/after evidence in `docs/reviews/compact-chapter-exploration/`.
