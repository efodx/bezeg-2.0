# Individual demonstration visual identity

Status: implemented 2026-10-15; listed checks passed, enlarged-text acceptance remains unverified.

## Scope

Bring the shared individual demonstration workspace into the homepage and catalog aesthetic: cream canvas, fading grid, restrained elderflower detail, bold sans-serif heading, forest-green graph rail, ochre inspector/lesson accents, gently rounded panels and quiet shadows. Keep the graph prominent and retain production graph colors, geometry, copy, routes, storage, controls and lesson behavior. Preserve presentation mode contrast and avoid decoration over the board. The conversation's generated mockup is directional only; existing content and proportions are authoritative.

## Acceptance

- All individual demonstrations use the visual treatment through the shared workspace, without changes to the homepage/catalog.
- Decorative content is noninteractive and hidden from assistive technology; no decorative layer obscures text, graph, focus or lesson overlays.
- At 390, 724 and 1440 CSS pixels in both languages, graph and tools remain usable without document overflow. Check enlarged text and presentation mode.
- Existing graph edits, inspector tabs, picker, lessons, navigation and keyboard controls still work. No new dependencies, assets, translations or mathematical changes.

## Verification

Run workspace component tests, TypeScript and production build. Review the small presentation diff in the handler. Delegate browser smoke because this shared workspace serves every graph family; cover representative polynomial/rational/spline/PH routes and changed layout, presentation, lessons and narrow keyboard access. Record evidence and explicit limits below.

## Implementation and evidence (2026-10-15)

Implemented in `DemonstrationWorkspace.tsx` and `DemonstrationWorkspaceIdentity.css`. The workspace alone receives the warm grid, sans-serif heading and ochre rule, local botanical SVG, green graph rail, ochre inspector rail, rounded panel edges and soft shadows. Existing board surface color remains `#fffdf5`; no geometry, localization, route, data or event logic changed. Presentation hides the botanical and retains its dark background. Handler review found no actionable issue in this small presentation diff.

Verification on HEAD `067c814` plus these workspace changes: 11 workspace component tests passed; TypeScript and production build passed (existing Bootstrap Sass/JSXGraph build warnings); `git diff --check` passed. The existing production workflow and library-picker suites passed all 9 tests, covering edited geometry across language switches, presets, fit-to-points, focus/cancel, current-route lesson checkpoint, presentation, narrow picker access and playback pause.

The smoke-tester delegated lane was used because the shared workspace affects all demonstrations. On the current checkout's production preview at `http://127.0.0.1:4188/bezeg-2.0/`, browser checks found equal document scroll/client widths at 390, 724 and 1440 CSS pixels in Slovenian and English. Graph/inspector placement remained usable, and the decorative SVG was noninteractive and assistive-technology-hidden. Representative polynomial, rational, spline C1 and cubic PH views loaded. De Casteljau parameter change 0.50 to 0.51 redrew its construction; PH controls opened the auxiliary board. Keyboard language selection, focused Display tab, inspector tabs, lesson entry/observation/continue/exit, and presentation tools/exit passed.

Acceptance limit: implementation and the listed browser checks are complete; enlarged-text acceptance remains unverified because the browser tool's zoom action timed out without applying zoom. Physical touch, actual classroom projection, comprehensive accessibility and hosted CI/deployment were not verified locally. No mathematical or performance claims are made.

