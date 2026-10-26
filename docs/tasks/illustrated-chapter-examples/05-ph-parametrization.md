# 05 — Rewrite PH and parametrization chapter sequences

Status: implemented; final media and browser acceptance in progress. See the [acceptance record](../../reviews/illustrated-chapter-examples/acceptance.md). Source: [spec A1–A8](../../specs/illustrated-chapter-examples.md). Dependencies: 00–02 accepted. Role: chapter content/scene implementation worker; handler assigns shared-file ownership.

Scope: `ph-curves` and `parametrization`. Start at their audited sections in `content/familyChapters.ts`, PH/parameterization definitions, prepared scenes and example mappings. Coordinate shared registry changes with its owner.

1. Apply audit decisions to overlapping short/long examples while preserving distinct PH construction, speed/arc-length/offset and parameter-versus-trace goals. Sharing a demonstration or a picture does not establish identical learning goals.
2. Rewrite/split Slovenian and English prose into authored explanation/example/reflection sequences. Keep regularity, offset and speed claims tied to their actual assumptions. Distinguish illustrative catalog curves from any separately derived curve and its origin/parameter values.
3. Finalize retained guidance and compatibility mappings, then capture every retained example's exact initial graph. Include relevant constructions, labels and readable framing; provide bilingual captions explaining the observation without claiming a picture proves a general result.
4. Reconcile final placement, scene, entry and preview mappings with the audit. Coordinate any shared capture/manifest edits and preserve unrelated catalog media.

Completion: every source entry and concept in both chapters has a disposition; every retained card has authored placement and verified media. Run relevant PH/parameterization mathematical and scene tests, chapter/registry checks, unchanged notation test, exact TypeScript check and production build. Validate affected speed/length/offset claims against actual prepared geometry and show new assertions fail before changes or under mutation. Delegate smoke in both languages for both chapters, image readability, launch/return/focus, keyboard and narrow touch flow. Hand evidence and gaps to task 07.
