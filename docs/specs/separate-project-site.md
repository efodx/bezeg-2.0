# Separate Bezeg 2.0 project site

Publish a snapshot of the current Bezeg source as a separate public repository `efodx/bezeg-2.0`, served at `https://efodx.github.io/bezeg-2.0/`. The original repository and published site must not be deployed or changed.

## Acceptance

- All home, catalog, graph and error links stay under `/bezeg-2.0`; assets resolve under that base.
- Keep history routing and the attributed Pages 404 restoration scripts. Direct routes and query/fragment restoration work.
- Keep mathematics and UI behavior unchanged.
- Isolate browser storage from the original app on the shared origin. Keep preset file interchange possible; document the separate storage and importing an old exported file.
- Configure the deployment command to explicitly target only `https://github.com/efodx/bezeg-2.0.git`.
- Production build, TypeScript, route checks and representative browser smoke pass.
- README and hosting guidance describe the new site and the independent original site.

Source snapshot: original local HEAD `d409cd0` plus the working-tree app and documentation changes present on 2026-10-09. Temporary attachment/smoke lock files and environment files were excluded. No deployment until authenticated GitHub access is available.

