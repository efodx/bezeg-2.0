# T13 capture destination slice

- Runner: `scripts/capture-guided-example-previews.cjs` accepts `--family patches`, validates every inventory entry has a `bezier-patches.*` ID and `/bezeg-2.0/patches` or nested patch route, then writes under `src/images/learning/examples/patches/`. Surface and graph captures receive the selected destination. The retained family rejects patch entries unless `--family patches` is explicit; ordinary captures still target `src/images/learning/examples/`.
- Regression coverage: `scripts/capture-guided-example-previews.test.cjs` checks both fixed destinations, the surface output-path helper, default and patch parsing, both canonical patch route forms, and rejection of wrong IDs, routes, mixed family selection, and family names.
- Checks: `node --test scripts/capture-guided-example-previews.test.cjs` passed (12 tests); `git diff --check` passed. `just --list` was consulted first.
- Not run: browser capture, build, or app tests; this slice changes capture destination selection only. Handler owns integration and any actual capture.
