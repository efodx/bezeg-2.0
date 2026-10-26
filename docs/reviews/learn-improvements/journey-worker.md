# Task 7 journey implementation evidence

The seven family readers now distinguish free exploration from guided lessons. Free links carry a small `explore=<chapter>.<section>.<demo>` token; the workspace accepts it only when the authored chapter section includes that demonstration, the destination route matches, and no Bézier `chapter`/`activity` context is present. The bilingual setup prompt and exact-section return are loaded from authored chapter content. Invalid or duplicate tokens are removed with replacement while retaining unrelated query values and the hash. Guided links retain `learn=1` and carry the same family context. Switching demonstrations drops the token. Family context does not alter graph state or overlap the Bézier visit protocol.

Before same-tab exploration navigation, the reader replaces its current history entry with the clicked section hash. Modified clicks and middle-clicks keep native link behavior. The workspace uses the existing activity-context surface with a one-column family layout and a 44px return target. It suppresses stale Bézier read-about/return actions while family context is active.

Evidence:

- Focused unit tests passed: `just unit src/learning/chapter/familyInvestigation.test.ts src/learning/LearningPage.test.tsx src/graphs/base/DemonstrationWorkspace.test.tsx` (`.command-logs/2026-10-26T03-23-32-411Z-75072-977767e4.log`). Coverage includes allowlisted route/section resolution, all authored family links resolving bilingual prompts, duplicate/mismatched/Bézier-conflicting token rejection, cleanup preservation, guided exit, and free/guided link separation.
- TypeScript passed with `just typecheck` (`.command-logs/2026-10-26T03-23-32-334Z-84588-d511eb70.log`). Focused lint passed (`.command-logs/2026-10-26T03-23-32-319Z-90824-3eff8772.log`).
- Deliberate mutation removing duplicate-token rejection caused the duplicate query case to fail, then the guard was restored (`.command-logs/2026-10-26T03-22-31-652Z-75932-38bd4e0f.log`).

The handler owns production build and browser smoke. Back/Forward behavior with a reader that entered without a hash, refresh/direct entry, language switching, narrow/enlarged text, keyboard/touch, control availability, and rendered output remain for that browser pass. No mathematical, scene, preset, or storage changes were made.
