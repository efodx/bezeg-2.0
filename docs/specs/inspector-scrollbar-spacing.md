# Inspector scrollbar spacing

Remove the empty scrollbar gutter that makes the tools inspector's right inset larger than its left inset when its content fits. Use the browser's automatic scrollbar allocation, retaining overflow scrolling when content exceeds the panel height. Keep the existing symmetric page padding and all other workspace styling.

Acceptance: a non-overflowing inspector uses equal content insets; overflowing tools remain scrollable and reachable; the narrow-screen and presentation layouts retain their controls. Verify the reported Bézier route in the browser in fitting and overflowing states. This is a CSS-only correction with no mathematical, localization, route, or preset changes.
