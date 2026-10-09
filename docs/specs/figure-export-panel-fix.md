# Figure export panel cleanup

The browser comment on De Casteljau highlights a figure export section with duplicate “Izvoz slike” labels and excess nested panel spacing.

## Scope and acceptance

- Render one localized figure export heading in the shared Save inspector.
- Present SVG and PNG actions compactly in the existing inspector surface, without an extra nested form panel or redundant label.
- Preserve both download callbacks, accessible button names, keyboard access, and responsive control sizes.
- Preserve routes, mathematical behavior, and stored presets.

Verify TypeScript and production build, then check the Save inspector on De Casteljau and a second graph family at desktop and narrow widths. Exercise both figure downloads and keyboard access. This is a shared presentation fix, not a change to export data.

## Completion evidence (2026-10-09)

- The shared inspector hides the export component's redundant label; the legacy tools path retains its label. A wrapping action row supplies consistent button spacing.
- TypeScript and production build passed, with existing unrelated build warnings.
- Delegated smoke checks passed against the local production build in Chrome on De Casteljau and PH cubic at 1440×900, 724×1004, and 390×844: one localized heading, no nested panel or horizontal overflow, and 34px/44px button heights as appropriate.
- Slovenian/English copy, visible keyboard focus, SVG/PNG keyboard downloads, and navigation between the two routes passed without page errors. The SVG contained geometry; the PNG had a valid signature and measured 794×594 pixels.
- The handler reviewed desktop and screenshot-width images. This bounded shared-panel smoke run does not establish physical-device, classroom, or live-hosted deployment acceptance.
