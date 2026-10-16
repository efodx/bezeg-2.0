# Just verification workflow

Status: implemented and locally verified on Windows, 2026-10-16. Hosted Linux/Windows checks are pending at the implementation commit boundary. Source: [session analysis and frozen forecast](../research/justfile-session-opportunities-2026-10-16.md).

## Scope

Add a small justfile and a Node command runner for developer verification. Existing npm scripts remain authoritative and usable. No app/runtime, rendering, route, preset, deployment, or dependency migration. Initial delivery covers verification and foreground production preview; background process management, capture, Git publishing recipes, and automatic measurement collection are excluded. Preserve the original forecast.

## Acceptance

- `just` lists commands; expose `check` (typecheck, all units once, build), `unit [args...]`, `check-localization` (typecheck, build), `build`, `smoke [args...]` (build, smoke), `smoke-built [args...]` (no rebuild), `preview [port]` (foreground), and `tooling-test` (Node runner tests).
- Use existing npm scripts for build, unit (`npm test -- --run`), and smoke-built. TypeScript uses the local installed compiler. No installs, retries, hidden Git writes, process killing, or automatic dependency changes. Bundle execution is sequential and fail-fast.
- Arguments reach children as discrete values, including spaces, quotes, regex alternation, dollar signs and shell metacharacters on Windows and Unix. Use Node as just's recipe interpreter to avoid interpolating arguments into shell command text. Node helpers spawn without shell interpolation. Document minimum just version and installation.
- Complete stdout/stderr is stored in unique ignored per-run logs. Default success output is short, includes scope/status/duration/revision/dirty state/log path, and points to warnings without silently treating failures as passes. Failure output includes bounded useful diagnostics and preserves the original exit code. `BEZEG_VERBOSE=1` streams full output while retaining logs. Do not buffer unbounded output in memory. Handle missing executable and signals as failures.
- Port is supplied through inherited `SMOKE_PORT` or an explicit helper option `--port <number>` stripped before forwarding smoke args. Validate ports. Playwright retains ownership of its server and occupied-port failure. Foreground preview uses the existing production server and does not start an extra Playwright server.
- Successful runner builds record revision/dirty state and a digest of relevant build inputs and output. Built-only smoke/preview must detect changed source, changed/missing build output, or missing provenance and fail with an actionable build command. Hash inputs such as src/, public/ and root build/dependency/config files; exclude docs, logs, and unrelated scratch files. Refuse to stamp if inputs change during the build. Existing direct npm builds remain supported directly; they do not establish runner provenance.
- Meaningful Node tests exercise exit propagation/fail-fast, real argument forwarding, quiet/full logging, failure excerpts, missing tools, port validation and provenance invalidation using temporary fixtures. Test the actual justfile on Windows, including a quoted grep; arrange Linux just/runner coverage in CI without changing app verification/deployment gates. Production app tests/build plus a focused production smoke run establish integration; no application UI change requires manual browser smoke.
- Add a short AGENTS.md command-discovery pointer and contributor command documentation. Do not expand always-loaded guidance into a full recipe catalog. Preserve unrelated changes.

## Verification ownership

Worker implements runner, justfile, focused tests and command guide; handler reviews, updates discovery/CI, installs a local just executable for validation, runs real recipes, records outcomes and limitations, and commits/pushes under AGENTS.md. Engineering review covers subprocess/platform handling and verification/provenance semantics; mathematical/UI review is inapplicable because no geometry or interface changes.

## Local evidence (2026-10-16)

- Checkout: `batch-c`, application revision `d3c7eeb` plus this tooling change; unrelated scratch files preserved. Official just 1.59.0 installed with winget; Node 24.21.0. Node syntax, recipe listing, relative guide/spec links, and diff whitespace checks passed.
- `just check`: TypeScript passed, all 138 unit files / 2,428 tests passed, production build passed. Existing Sass/JSXGraph/bundle warnings remain in the full build log. The test run's snapshot line-ending-only side effect was restored; no application files belong to this change.
- `just unit src/learning/content/lessonMathNotation.test.ts -t "scans every lesson|lesson prose wraps"`: passed. Real just-to-npm argument and exit-code tests additionally cover quotes, spaces, metacharacters, and exit 23 from the final child.
- Final runner suite covers fail-fast, complete/bounded logs, verbose streaming and sink failures, missing executable, signals, port validation, stamp/config/source/output invalidation, unstable build rejection, compiler/build sequencing, and Unix npm layout. Windows skips the Unix symlink case; the CI matrix exercises it on Linux.
- `just smoke-built --port 4196 tests/home.smoke.spec.cjs --grep "homepage owns|homepage fits" --workers=1`: 2 passed against the stamped production build. The final `just smoke` build-and-test recipe passed the same 2 cases after the npm resolver changes. Smoke is a focused wrapper integration check, not the full browser checklist or a hosted-site check.
- `just preview 4197`: printed handoff metadata, served a production deep link with HTTP 200, and terminated on Ctrl+C with underlying exit 130. Both task-owned ports were confirmed released. Default sandbox loopback checks were blocked (`EACCES`); the initial smoke attempt was stopped by its specific process tree and repeated successfully with loopback access.
- Two independent reviewers covered platform/CI and runner correctness. Corrections cover real compiler location, downstream argument assertions, log/console sink failure disposal, bounded Git capture, provenance checks, and Linux npm resolution. The existing Browser smoke workflow and deployment gates are unchanged. No app UI/rendering behavior changed, so delegated manual browser smoke was inapplicable.

Local evidence establishes Windows behavior. Hosted results belong to the separate Developer tools workflow; its configuration alone is not evidence of a passing Linux run. No token-saving measurement or change to the frozen forecast was made during implementation.
