# Botanical studio visual refinement

## Intent and authorization

The owner requested an ambitious implementation of the visual improvement discussed on 2026-11-13, covering Home and the shared Demonstration workspace. The annotated problem areas were detached ochre heading marks and heavy colored panel caps. Preserve the recognizable elderflower, cream and forest identity while making composition, typography and controls feel deliberate.

This is a visual refinement of the established product, with creative direction delegated to the handler. Existing factual copy, mathematical content, routes, presets, lessons, carousel timing and renderer stay intact. No new product claims or dependencies are required.

## Direction

- Home (Persuade): an editorial, botanical mathematics studio. A self-hosted scholarly display serif gives the headline and featured title character; a quiet sans voice keeps actions and supporting text easy to scan. Give real curve previews more presence and preserve complete media containment. Keep the existing elderflower as a restrained brand detail.
- Workspace (Operate): a precise mathematical instrument on warm paper. A clear title, quiet breadcrumbs and a compact action group lead into the graph. The graph and inspector align, with light continuous frames instead of colored caps. Use a coherent inset segmented tab group, clear form labels and spacious control groups.
- Shared header: an elegant brand wordmark and quiet navigation with unmistakable current/focus/hover states. Do not add navigation or promotional copy.
- Remove standalone heading dashes and redundant inspector eyebrow. Keep graph labels and all accessible control names. No new decorative illustration or gratuitous motion; existing previews remain the signature movement and respect reduced motion.

## Acceptance

1. Home and workspace no longer render the annotated gold heading dashes or colored panel caps. Their hierarchy is evident through typography, alignment and spacing.
2. At desktop widths (1440 and 1024), Home has an intentional headline composition, unobstructed copy/actions and complete selected curve artwork. Featured actions, keyboard selector navigation and rail scrolling work.
3. At 390 and 724 CSS px, Home and workspace have no document overflow, obscured text or clipped controls. Text enlargement to 200% remains usable. Keyboard focus is visible; coarse-pointer controls retain essential 44px touch targets.
4. On complex multiplication and a representative curve workspace, graph and inspector stay aligned on desktop; graph pan/zoom, field changes, inspector tabs, collapse/reopen, Presentation mode and lesson navigation remain usable. Shared inspector scrolling retains its one-owner model.
5. Slovenian and English remain readable using existing copy. Self-hosted display font supports Slovenian diacritics; its license is stored with the asset. Production requires no external font requests.
6. Existing routes, presets, graph state/lifecycle and mathematical output remain compatible. No geometry, scene action or persistence implementation is changed.
7. DESIGN.md records the final visual system. Focused type/lint/unit checks, production build, independent engineering/UI review and delegated browser smoke document observed coverage and gaps.

## Verification and ownership

The handler owns the shared font/header, workspace refinement, integration, review, acceptance and Git. A bounded worker owns Home and its carousel styles. Browser acceptance uses a production build of this checkout, not the supplied preview whose source revision is unknown. Evidence belongs in `docs/reviews/botanical-studio-refinement/`.

## Later owner decisions (2026-11-13)

- **Display face.** The owner chose Literata as the site's one display face on this layout; the Newsreader of the first pass is removed with its files. Home headline, featured title, workspace title and wordmark read `--bezeg-font-display`. Reason: one title voice across Home, workspace, Learn and chapters instead of two serifs. Details: [elder identity, title typography](elder-identity.md#title-typography-literata) and [DESIGN.md](../../DESIGN.md#title-typography-literata).
- **Home drawing.** The outlined elderflower in the Home intro ("keep the existing elderflower as a restrained brand detail" above) was removed in the typography polish round that the owner asked an independent critic to lead: at 18 to 32% opacity it read as a watermark beside the headline and its outline style differed from the filled side botanicals. User impact: below 1600px the Home hero shows no elder drawing; the header mark stays, and the side botanicals show at 1600px and wider.

## Narrow layout repair (2026-11-13)

The first pass (`4e844f56`) failed eight browser smoke tests on `master`, so nothing deployed. Cause: `DemonstrationWorkspaceIdentity.css` loads after `DemonstrationWorkspace.css`, so its base grid, padding and gap overrode the older phone rules, and its own replacement collapsed the workspace to one column at 900px with a taller board and a visible learning prompt. Guided lessons and Presentation on phones and short landscape screens depend on the earlier arrangement (board width 0 in short landscape Presentation, lesson controls outside the viewport, board points outside the lesson view).

Decision (elder identity handler, with the tests left untouched): restore the earlier narrow arrangement inside the identity stylesheet and keep the refinement's desktop look.

- One column only at 700px and below, with the earlier padding (`16px 12px 70px`), gap (12px), board height (`35vh`, at least 260px) and graph heading padding. The learning prompt is hidden on phones again, as before the first pass. Between 701 and 900px the two columns stay.
- The inspector column is 310px again (the first pass made it 320px). User impact: none intended beyond 10px more board.
- Rejected: keeping the 900px one-column layout and changing the lesson and Presentation layouts or their tests to fit it. That is a product change to guided lessons on small screens, outside a repair.
- Follow-up, not fixed: `tests/curve-ownership.smoke.spec.cjs:194` compares exported SVG path strings exactly and fails on floating-point noise at some board widths (888px fails, 898px passes). The 310px column makes it pass; a later change to the desktop board width can break it again. The comparison needs a tolerance, which is a test change for its owner to decide.

The image study in the chat is an exploratory composition reference, not a source of new copy or shipping pixels. The existing mathematical preview media remains the content authority.
