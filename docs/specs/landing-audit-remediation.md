# Landing audit remediation

Status: implemented and verified on 2026-10-24 following owner authorization; verification limits and a non-reproduced full-suite timeout are recorded below.

## Scope

Address selected category contrast, eager graph code in homepage startup, unnecessary global MathJax loading, and repeated homepage/header color literals. Preserve the approved cream/green elderflower identity and existing composition, copy, routes, graph mathematics, stored Presets, export behavior, and bilingual workflows. The owner excluded the suggested carousel pause control: retain existing timing, manual takeover, hover/focus pauses, and reduced-motion behavior.

## Acceptance criteria

1. The carousel category label meets 4.5:1 contrast in default, selected, hovered, and focused states. Consolidate the audited header/home/carousel colors into named semantic CSS variables while preserving intentional palette distinctions. Record these roles in DESIGN.md; scope that document to the incumbent web shell/homepage rather than inventing a replacement design system.
2. Homepage startup does not eagerly load executable graph controllers/JSXGraph or formula-only feature code. Compare fresh production entry bytes with the baseline: `index-Dfjdfioi.js`, 3,238,169 bytes, build-reported gzip 815.49 kB. Include all statically imported entry chunks when assessing improvement; splitting filenames alone is insufficient.
3. MathJax is requested once, on demand for graph or formula-bearing learning surfaces. Preserve asynchronous startup, repeat entry, typesetting after language/content changes, unmount safety, and figure-export readiness. Homepage/catalog-only visits do not request it. Loader failure must not hang indefinitely or leave a permanently poisoned retry cache.
4. Existing graph URLs, direct navigation, refresh, unknown-route handling, lesson query strings, route-to-controller mapping, graph mount/disposal, and persisted/imported data remain compatible. No migration or breaking change is intended.
5. Maintain meaningful focused regression coverage for async loading/readiness and the existing route-to-controller contract. For new behavioral assertions, establish that they fail on old behavior or a deliberate mutation. Run typecheck, relevant unit suites, production build, and bounded delegated smoke for shared route/loading behavior. Include homepage/learning/catalog entry, representative polynomial/rational/spline/PH graphs, manipulation, language switching, lesson entry/exit, direct loading/refresh, and formula rendering/export readiness as applicable. Report actual gaps.
6. Visually verify the homepage in both languages, 390px and desktop, keyboard focus, and selected contrast. Keep layout and carousel behavior unchanged. Source detector warnings for the owner-approved grid and rail are contextual exceptions, not redesign instructions.

## Ownership and documentation

Handler owns color tokens, DESIGN.md, spec/evidence, integration, verification, commits, and push. A bounded implementation worker owns async feature/MathJax loading and focused tests. Update architecture/capability references where route ownership changes. No dependency, renderer, or build-tool migration.

## Evidence

See [implementation and verification evidence](../reviews/landing-audit-remediation.md) and [delegated browser coverage](../reviews/landing-audit-smoke.md). Initial JavaScript including static imports decreased from 3,238,169 to 424,461 bytes (about 86.9%). Typecheck, production build, focused async/export tests, and 56 browser checks passed. The final full unit run passed 3,098/3,099 tests; a subdivision checkpoint timeout passed the unchanged focused rerun, with no assertion or timeout relaxation. Selected label contrast is approximately 5.78:1. The handler verified PH editor manipulation to close the smoke worker's gap. No route or preset migration is required. Physical-device/projector coverage and measured Core Web Vitals remain outside acceptance.
