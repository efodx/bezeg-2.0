set positional-arguments
set shell := ["node", "--eval"]

# Show the available Bezeg workflows.
default:
    @console.log('Bezeg developer commands: just check | check-changed [ref] | typecheck | lint [args...] | unit [args...] | check-localization | build | smoke [args...] | smoke-built [args...] | smoke-lesson <id>... [args...] | controls-fixture [args...] | clip <id> | preview [port] | loc <pattern> | test-cost [--save] [--top N] | ci [sha] | tooling-test | publish --recipe <docs|tooling|runtime> --base <commit> --commits <id,...> | eval <list|setup|grade|calibrate> [args...]')

# Run typecheck, lint, all unit tests, then a provenance-recorded production build.
check:
    @require('./scripts/commands.cjs').cli(['check'])

# Like check, but run only the unit tests affected by changes since a ref (default origin/master); CI runs them all.
check-changed *args:
    @require('./scripts/commands.cjs').cli(['check-changed', ...process.argv.slice(2)])

# Typecheck once with the local compiler.
typecheck:
    @require('./scripts/commands.cjs').cli(['typecheck'])

# Lint app code, tests, and tooling with the local ESLint; arguments replace the default `.` target.
lint *args:
    @require('./scripts/commands.cjs').cli(['lint', ...process.argv.slice(2)])

# Run unit tests once and forward all arguments to Vitest.
unit *args:
    @require('./scripts/commands.cjs').cli(['unit', ...process.argv.slice(2)])

# Run typecheck and a provenance-recorded production build.
check-localization:
    @require('./scripts/commands.cjs').cli(['check-localization'])

# Build the production app and record local provenance.
build:
    @require('./scripts/commands.cjs').cli(['build'])

# Build the app, then run Playwright smoke checks.
smoke *args:
    @require('./scripts/commands.cjs').cli(['smoke', ...process.argv.slice(2)])

# Run smoke checks against a provenance-validated existing build.
smoke-built *args:
    @require('./scripts/commands.cjs').cli(['smoke-built', ...process.argv.slice(2)])

# Run the rendered shared-controls fixture checks (clipping, focus, touch targets) on the Vite dev server, port 4328.
controls-fixture *args:
    @require('./scripts/commands.cjs').cli(['controls-fixture', ...process.argv.slice(2)])

# Run guided-lesson smoke rows for the given lesson ids against the existing build.
smoke-lesson +args:
    @require('./scripts/commands.cjs').cli(['smoke-lesson', ...process.argv.slice(2)])

# Recapture one Demonstration clip against a running preview (default port 4319).
clip id:
    @require('./scripts/commands.cjs').cli(['clip', ...process.argv.slice(2)])

# Show localization keys whose key or sl/en text matches a case-insensitive regex.
loc pattern:
    @require('./scripts/commands.cjs').cli(['loc', ...process.argv.slice(2)])

# Show recent workflow runs for master or a commit, with a short excerpt of a failed run.
ci *args:
    @require('./scripts/commands.cjs').cli(['ci', ...process.argv.slice(2)])

# Serve the provenance-validated production build in the foreground.
preview *args:
    @require('./scripts/commands.cjs').cli(['preview', ...process.argv.slice(2)])

# Set up, grade or calibrate a repeatable workflow-evaluation sandbox (see tools/agent-eval/README.md).
eval *args:
    @require('./tools/agent-eval/agent_eval.cjs').cli(process.argv.slice(2))

# Rebase the declared commits onto origin/master, verify that revision, and fast-forward push it. Handler only.
publish *args:
    @require('./scripts/publish-gate.cjs').cli(process.argv.slice(2))

# Run the focused Node tests for this command runner.
tooling-test:
    @require('./scripts/commands.cjs').cli(['tooling-test'])

# Build and run the linear-map grid drawing benchmark (scripts/linear-map-benchmark/README.md); no test slot.
linear-map-bench repeats="5" out="":
    @for (const s of ["build", "run"]) require("child_process").execFileSync(process.execPath, ["scripts/linear-map-benchmark/" + s + ".cjs", ...(s === "run" ? [process.argv.slice(2)[0] || "5", ...process.argv.slice(3, 4)] : [])], {stdio: "inherit"});

# Build and run the collision playground step-cost benchmark (scripts/collision-step-benchmark/README.md); no test slot.
collision-step-bench out="":
    @for (const s of ["build", "run"]) require("child_process").execFileSync(process.execPath, ["scripts/collision-step-benchmark/" + s + ".cjs", ...(s === "run" ? process.argv.slice(2, 3) : [])], {stdio: "inherit"});

# Measure collision playground containment, switch latency, smoothness and lifecycle on a built page (scripts/collision-containment/README.md); serves a copy of build/, no test slot.
collision-containment path json="" md="":
    @require("child_process").execFileSync(process.execPath, ["scripts/collision-containment/run.cjs", ...process.argv.slice(2, 5).filter(Boolean)], {stdio: "inherit"});

# Build and run the projective conic constants benchmark (scripts/projective-conic-benchmark/README.md); Node only, no test slot.
projective-conic-bench json="" md="":
    @for (const s of ["build", "run"]) require("child_process").execFileSync(process.execPath, ["scripts/projective-conic-benchmark/" + s + ".cjs", ...(s === "run" ? process.argv.slice(2, 4) : [])], {stdio: "inherit"});

# Build and run the school function zero-drag benchmark (scripts/school-function-drag-benchmark/README.md); Node only, no test slot.
school-function-drag-bench json="" md="":
    @for (const s of ["build", "run"]) require("child_process").execFileSync(process.execPath, ["scripts/school-function-drag-benchmark/" + s + ".cjs", ...(s === "run" ? process.argv.slice(2, 4) : [])], {stdio: "inherit"});

# Show the slowest unit test files and total time from Vitest's cached results; --save records a baseline to compare against.
test-cost *args:
    @process.exitCode = require('./scripts/test-cost.cjs').cli(process.argv.slice(2))
