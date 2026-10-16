# Preview smoke assertions on master

## Scope and cause

Update production browser smoke coverage for the approved [catalog loading](catalog-preview-loading.md) and [carousel crossfade](carousel-preview-transition.md) behavior. CI retained assertions from before those changes: every catalog preview was expected to be lazy, and carousel image locators assumed only one mounted image.

## Acceptance criteria

- Catalog smoke coverage checks eager loading for the first three cards and lazy loading for subsequent cards, retaining asset, dimensions, decorative alt, order, and destination checks.
- Homepage smoke coverage identifies exactly one selected image among the six mounted previews, checks its loaded asset and full opacity before and after manual selection, and checks the selected preview across both languages at 390, 724, and 1440 pixels.
- The three reported CI failures reproduce before the correction; both complete affected smoke files pass after it against a clean production build of master.
- Application behavior, routes, and stored data are unchanged. Preserve unrelated work in the original checkout.

## Verification

Run the three reported Playwright cases to reproduce, then both complete affected smoke files against the isolated master production build. Review the small test-only diff in the handler.

## Verification results (2026-10-16)

Reproduced all three pasted CI failures on isolated origin/master at ebf148a with the original assertions. After correction, npm run test:smoke:built -- tests/home.smoke.spec.cjs tests/demonstrations.smoke.spec.cjs --workers=3 passed all 51 tests against that production build in 1.0 minute. Production build and git diff --check passed; existing Sass, JSXGraph eval, and bundle warnings remain. Both languages and all three specified widths passed. No application code changed; the remaining smoke files were not rerun locally. The handler reviewed the bounded diff.
