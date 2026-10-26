# Browser specification update

Updated `tests/standalone-learning.smoke.spec.cjs`, `tests/history-entry-bridge.smoke.spec.cjs`, and `tests/unified-learning.smoke.spec.cjs` for chapter-owned Guided examples.

The standalone coverage now launches all six prepared Bézier examples through their `example=activity...` links and checks the prepared graph geometry, including parameter evaluation and Bernstein degree. It exercises a short example return with scroll and focus restoration plus Back/Forward, advances and returns from a multi-frame authored lesson, checks keyboard access at 390px and 200% text, and confirms that a completed graph can be edited before Continue in chapter restores the owner section. Legacy `chapter`/`activity`, `?learn=1`, and `?explore=` links remain covered, alongside independent free exploration.

The hosting bridge case now refreshes a canonical guided-example URL with unrelated query values and a hash. It checks exact URL preservation, continued example entry, absence of graph snapshots and obsolete activity markers in router state, and chapter-section return. The unified-learning case checks Learn-to-chapter entry, Guided example naming and exact-section return, plus guidance launched from the Demonstrations catalog and ordinary graph entry.

The removed investigation/context banners, `activity-*` launch IDs, activity reset button and special `chapterActivity` marker are no longer treated as learner-facing behavior. Their useful coverage was replaced with checks against the shared guided surface and its graph/session lifecycle.

JavaScript syntax checks and focused lint passed for all three specs. These browser checks have not run against a stable provenance-validated production build; the handler must run the assigned production browser suite and repair any observed locator or behavior failures.

Final integrated outcomes and remaining limits: [acceptance](acceptance.md). Earlier unperformed checks above describe this worker's bounded run.
